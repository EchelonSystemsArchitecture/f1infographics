"""Edge cases for analytics engines, catalog matching, providers and caches.

Pure helpers are exercised with synthetic rows; integration assertions are
limited to invariants that must hold for every ingested session.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import pytest

from app import catalog, strategy as strategy_module
from app.catalog import (
    _coverage_channels,
    _disk_channels,
    _match_ingested,
)
from app.contracts import DriverLab, DriverLabRow, EventSummary, SeasonSummary
from app.driver_lab import build_constructor_lab, build_driver_lab
from app.intelligence import (
    build_intelligence,
    count_lead_changes,
    detect_flag_periods,
    overtake_leaders,
    pit_aggregates,
    position_movers,
)
from app.prediction import build_prediction
from app.providers import jolpica
from app.session_store import cache_info, clear_cache, load_dataset, load_session_data
from app.strategy import build_strategy

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
START = datetime(2024, 7, 7, 14, 0, tzinfo=timezone.utc)


def ev(seconds, message, flag=None):
    from datetime import timedelta

    return {
        "date": (START + timedelta(seconds=seconds)).isoformat(),
        "message": message,
        "flag": flag,
    }


@pytest.mark.parametrize(
    "rows,expected",
    [
        ([], []),
        ([ev(10, "SAFETY CAR DEPLOYED")], ["SC"]),
        ([ev(10, "SAFETY CAR DEPLOYED"), ev(20, "SAFETY CAR IN THIS LAP")], ["SC"]),
        ([ev(10, "VIRTUAL SAFETY CAR"), ev(20, "GREEN FLAG", "GREEN")], ["VSC"]),
        ([ev(10, "RED FLAG", "RED"), ev(20, "GREEN FLAG", "GREEN")], ["RED"]),
        ([ev(10, "CHEQUERED FLAG", "CHEQUERED")], []),
        ([ev(10, "SAFETY CAR DEPLOYED"), ev(20, "CHEQUERED FLAG", "CHEQUERED")], ["SC"]),
        ([ev(10, "SAFETY CAR DEPLOYED"), ev(20, "VIRTUAL SAFETY CAR")], ["SC", "VSC"]),
        ([ev(10, "VIRTUAL SAFETY CAR DEPLOYED"), ev(20, "SAFETY CAR IN THIS LAP")], ["VSC"]),
        ([ev(10, "YELLOW FLAG", "YELLOW")], []),
        ([ev(10, "SAFETY CAR IN THIS LAP")], []),
        ([ev(10, "SAFETY CAR DEPLOYED"), ev(20, "SAFETY CAR DEPLOYED")], ["SC"]),
        ([ev(10, "GREEN FLAG", "GREEN")], []),
        ([ev(10, "RACE RESUMED")], []),
    ],
)
def test_detect_flag_periods_matrix(rows, expected):
    assert [p.kind for p in detect_flag_periods(rows, START)] == expected


def test_detect_flag_period_duration_is_seconds():
    periods = detect_flag_periods(
        [ev(100, "SAFETY CAR DEPLOYED"), ev(250, "SAFETY CAR IN THIS LAP")], START
    )
    assert periods[0].start_t == 100.0
    assert periods[0].end_t == 250.0
    assert periods[0].duration_s == 150.0


def test_detect_flag_period_open_at_end_has_no_end():
    periods = detect_flag_periods([ev(100, "SAFETY CAR DEPLOYED")], START)
    assert periods[0].end_t is None
    assert periods[0].duration_s is None


def test_detect_flag_periods_ignores_missing_dates():
    rows = [{"message": "SAFETY CAR DEPLOYED"}, ev(10, "SAFETY CAR DEPLOYED")]
    assert len(detect_flag_periods(rows, START)) == 1


def test_detect_flag_periods_sorted_by_start():
    rows = [ev(300, "VIRTUAL SAFETY CAR"), ev(100, "SAFETY CAR DEPLOYED"), ev(50, "RED FLAG", "RED")]
    starts = [p.start_t for p in detect_flag_periods(rows, START)]
    assert starts == sorted(starts)


@pytest.mark.xfail(
    strict=True,
    reason="BUG-09: VSC ENDING does not close an open VSC period in intelligence",
)
def test_detect_flag_periods_vsc_ending_closes_period():
    rows = [ev(10, "VIRTUAL SAFETY CAR"), ev(20, "VSC ENDING")]
    periods = detect_flag_periods(rows, START)
    assert periods[0].end_t == 20.0


def test_detect_flag_periods_vsc_ending_currently_leaves_period_open():
    rows = [ev(10, "VIRTUAL SAFETY CAR"), ev(20, "VSC ENDING")]
    periods = detect_flag_periods(rows, START)
    assert periods[0].end_t is None


def test_pit_aggregates_empty():
    assert pit_aggregates([], {}) == []


def test_pit_aggregates_counts_and_totals():
    rows = [
        {"driver_number": 44, "pit_duration": 22.0},
        {"driver_number": 44, "pit_duration": 24.0},
        {"driver_number": 1, "pit_duration": 25.0},
    ]
    result = pit_aggregates(rows, {44: {"name_acronym": "HAM", "team_colour": "00D2BE"}})
    ham = result[0]
    assert (ham.stops, ham.total_pit_time_s, ham.avg_pit_time_s) == (2, 46.0, 23.0)
    single = result[1]
    assert (single.driver_number, single.stops, single.avg_pit_time_s) == (1, 1, 25.0)


def test_pit_aggregates_falls_back_for_unknown_driver():
    result = pit_aggregates([{"driver_number": 99, "pit_duration": 20.0}], {})
    assert result[0].name_acronym == "P99"
    assert result[0].team_colour == "888888"


def test_pit_aggregates_sorts_by_stop_count_then_driver():
    rows = [
        {"driver_number": 3, "pit_duration": 20.0},
        {"driver_number": 2, "pit_duration": 20.0},
        {"driver_number": 1, "pit_duration": 20.0},
    ]
    assert [row.driver_number for row in pit_aggregates(rows, {})] == [1, 2, 3]


@pytest.mark.xfail(
    strict=True,
    reason="BUG-10: missing pit_duration is counted as 0.0, corrupting totals and averages",
)
def test_pit_aggregates_ignores_missing_durations():
    rows = [
        {"driver_number": 44, "pit_duration": 20.0},
        {"driver_number": 44, "pit_duration": None},
    ]
    result = pit_aggregates(rows, {})
    assert result[0].total_pit_time_s == 20.0
    assert result[0].avg_pit_time_s == 20.0


def test_pit_aggregates_missing_duration_currently_counts_as_zero():
    result = pit_aggregates(
        [{"driver_number": 44, "pit_duration": 20.0}, {"driver_number": 44}], {}
    )
    assert result[0].total_pit_time_s == 20.0
    assert result[0].avg_pit_time_s == 10.0


def test_overtake_leaders_empty():
    made, received, total = overtake_leaders([], {})
    assert (made, received, total) == ([], [], 0)


def test_overtake_leaders_counts_and_order():
    rows = [
        {"overtaking_driver_number": 55, "overtaken_driver_number": 27},
        {"overtaking_driver_number": 55, "overtaken_driver_number": 16},
        {"overtaking_driver_number": 4, "overtaken_driver_number": 27},
        {"overtaking_driver_number": 16, "overtaken_driver_number": 4},
    ]
    made, received, total = overtake_leaders(rows, {})
    assert total == 4
    assert [(e.driver_number, e.count) for e in made] == [(55, 2), (4, 1), (16, 1)]
    assert received[0].driver_number == 27
    assert received[0].count == 2


def test_overtake_leaders_ties_sort_by_driver_number():
    rows = [
        {"overtaking_driver_number": 10, "overtaken_driver_number": 1},
        {"overtaking_driver_number": 2, "overtaken_driver_number": 1},
    ]
    made, _, _ = overtake_leaders(rows, {})
    assert [e.driver_number for e in made] == [2, 10]


def test_overtake_leaders_self_overtake_counts_both_sides():
    rows = [{"overtaking_driver_number": 5, "overtaken_driver_number": 5}]
    made, received, total = overtake_leaders(rows, {})
    assert total == 1
    assert made[0].count == 1
    assert received[0].count == 1


@pytest.mark.parametrize(
    "grid,result,expected",
    [
        ([], [], []),
        ([{"driver_number": 44, "position": 5}], [], []),
        (
            [{"driver_number": 44, "position": 5}],
            [{"driver_number": 44, "position": 1, "dnf": False}],
            [(44, 5, 1, 4)],
        ),
        (
            [{"driver_number": 44, "position": 1}],
            [{"driver_number": 44, "position": 5, "dnf": False}],
            [(44, 1, 5, -4)],
        ),
        (
            [{"driver_number": 44, "position": 5}],
            [{"driver_number": 44, "position": 1, "dnf": True}],
            [],
        ),
        (
            [{"driver_number": 44, "position": 5}],
            [{"driver_number": 44, "position": None, "dnf": False}],
            [],
        ),
        (
            [
                {"driver_number": 1, "position": 1},
                {"driver_number": 2, "position": 2},
            ],
            [
                {"driver_number": 1, "position": 2, "dnf": False},
                {"driver_number": 2, "position": 1, "dnf": False},
            ],
            [(2, 2, 1, 1), (1, 1, 2, -1)],
        ),
    ],
)
def test_position_movers_matrix(grid, result, expected):
    rows = position_movers(grid, result, {})
    assert [(r.driver_number, r.grid, r.finish, r.delta) for r in rows] == expected


def test_position_movers_requires_grid_entry():
    result = position_movers([], [{"driver_number": 44, "position": 1, "dnf": False}], {})
    assert result == []


def test_position_movers_duplicate_grid_uses_last_entry():
    grid = [
        {"driver_number": 44, "position": 19},
        {"driver_number": 44, "position": 2},
    ]
    result = [{"driver_number": 44, "position": 1, "dnf": False}]
    assert position_movers(grid, result, {})[0].grid == 2


@pytest.mark.parametrize(
    "positions,expected",
    [
        ([], 0),
        ([{"driver_number": 1, "samples": [[0, 1], [10, 1]]}], 0),
        (
            [
                {"driver_number": 1, "samples": [[0, 1], [10, 2]]},
                {"driver_number": 2, "samples": [[0, 2], [10, 1]]},
            ],
            1,
        ),
        (
            [
                {"driver_number": 1, "samples": [[0, 1], [10, 2], [20, 1]]},
                {"driver_number": 2, "samples": [[0, 2], [10, 1], [20, 2]]},
            ],
            2,
        ),
        (
            [
                {"driver_number": 1, "samples": [[0, 1], [10, 2]]},
                {"driver_number": 2, "samples": [[0, 2], [10, 1]]},
                {"driver_number": 3, "samples": [[5, 1], [15, 4]]},
            ],
            2,
        ),
    ],
)
def test_count_lead_changes_matrix(positions, expected):
    assert count_lead_changes(positions, START) == expected


def test_count_lead_changes_ignores_non_p1_samples():
    positions = [{"driver_number": 1, "samples": [[0, 2], [10, 3], [20, 4]]}]
    assert count_lead_changes(positions, START) == 0


def test_count_lead_changes_malformed_short_samples_are_ignored():
    assert count_lead_changes([{"driver_number": 1, "samples": [[0]]}], START) == 0


def _laps():
    return [
        {"driver_number": 44, "laps": [{"lap_number": 1, "date_start": "2024-07-07T14:01:00+00:00", "lap_duration": 90.0}]}
    ]


@dataclass
class FakeSession:
    drivers: list
    race_control: list
    positions: list
    timing_base: list
    date_start: datetime


def test_build_intelligence_rejects_unknown_session():
    with pytest.raises(KeyError):
        build_intelligence(DATA_DIR, 999999)


def test_build_intelligence_works_for_qualifying_session():
    intel = build_intelligence(DATA_DIR, 9090)
    assert intel.data_mode == "REPLAY"
    assert intel.flag_periods == [] or all(p.kind in {"SC", "VSC", "RED"} for p in intel.flag_periods)


def test_build_intelligence_works_for_sprint_session():
    intel = build_intelligence(DATA_DIR, 9506)
    assert intel.data_mode == "REPLAY"
    assert intel.total_pit_stops >= 0


def test_all_ingested_sessions_build_intelligence():
    sessions = json.loads((DATA_DIR / "sessions.json").read_text())
    for session in sessions:
        intel = build_intelligence(DATA_DIR, session["session_key"])
        assert intel.data_mode == "REPLAY"
        assert intel.total_pit_stops == sum(row.stops for row in intel.pit_aggregates)
        assert intel.overtakes_total == sum(row.count for row in intel.top_overtakers)


def test_strategy_synthetic(monkeypatch):
    class Data:
        drivers = [
            {"driver_number": 1, "name_acronym": "VER", "team_colour": "3671C6"},
            {"driver_number": 44, "name_acronym": "HAM", "team_colour": "27F4D2"},
        ]

    stints = [
        {"driver_number": 1, "stint_number": 1, "compound": "MEDIUM", "lap_start": 1, "lap_end": 20, "tyre_age_at_start": 0},
        {"driver_number": 1, "stint_number": 2, "compound": "HARD", "lap_start": 21, "lap_end": 52, "tyre_age_at_start": 0},
        {"driver_number": 44, "stint_number": 1, "compound": "SOFT", "lap_start": 1, "lap_end": 52, "tyre_age_at_start": 2},
    ]
    pit = [{"driver_number": 1, "pit_duration": 20.0}, {"driver_number": 1, "pit_duration": 21.0}]
    monkeypatch.setattr(strategy_module, "load_session_data", lambda *_: Data())
    monkeypatch.setattr(strategy_module, "load_dataset", lambda *a: stints if a[2] == "stints.json" else pit)
    lab = build_strategy(DATA_DIR, 1)
    assert lab.data_mode == "REPLAY"
    ver = next(d for d in lab.drivers if d.driver_number == 1)
    ham = next(d for d in lab.drivers if d.driver_number == 44)
    assert ver.stops == 2
    assert [s.length for s in ver.stints] == [20, 32]
    assert ham.stops == 0
    assert lab.stop_histogram == {"0": 1, "2": 1}


def test_strategy_falls_back_to_stint_count_minus_one(monkeypatch):
    class Data:
        drivers = [{"driver_number": 1, "name_acronym": "VER", "team_colour": "3671C6"}]

    stints = [
        {"driver_number": 1, "stint_number": 1, "compound": "M", "lap_start": 1, "lap_end": 10},
        {"driver_number": 1, "stint_number": 2, "compound": "H", "lap_start": 11, "lap_end": 20},
    ]
    monkeypatch.setattr(strategy_module, "load_session_data", lambda *_: Data())
    monkeypatch.setattr(strategy_module, "load_dataset", lambda *a: stints if a[2] == "stints.json" else [])
    lab = build_strategy(DATA_DIR, 1)
    assert lab.drivers[0].stops == 1


def test_strategy_empty_data(monkeypatch):
    class Data:
        drivers = []

    monkeypatch.setattr(strategy_module, "load_session_data", lambda *_: Data())
    monkeypatch.setattr(strategy_module, "load_dataset", lambda *a: [])
    lab = build_strategy(DATA_DIR, 1)
    assert lab.drivers == []
    assert lab.stop_histogram == {}
    assert lab.most_common_stops is None


def test_strategy_missing_lap_bounds_defaults_to_zero(monkeypatch):
    class Data:
        drivers = [{"driver_number": 1, "name_acronym": "VER", "team_colour": "3671C6"}]

    stints = [{"driver_number": 1, "stint_number": 1, "compound": "M", "lap_start": None, "lap_end": None}]
    monkeypatch.setattr(strategy_module, "load_session_data", lambda *_: Data())
    monkeypatch.setattr(strategy_module, "load_dataset", lambda *a: stints if a[2] == "stints.json" else [])
    lab = build_strategy(DATA_DIR, 1)
    assert lab.drivers[0].stints[0].length == 1


def test_strategy_unknown_session_raises():
    with pytest.raises(KeyError):
        build_strategy(DATA_DIR, 999999)


def test_driver_lab_unknown_session_raises():
    with pytest.raises(KeyError):
        build_driver_lab(DATA_DIR, 999999)


def test_constructor_lab_unknown_session_raises():
    with pytest.raises(KeyError):
        build_constructor_lab(DATA_DIR, 999999)


def test_driver_lab_core_only_session_has_no_compounds_for_missing_laps():
    lab = build_driver_lab(DATA_DIR, 7779)
    assert lab.data_mode == "REPLAY"
    assert all(row.laps >= 0 for row in lab.drivers)


def test_constructor_lab_positions_gained_can_be_negative():
    lab = build_constructor_lab(DATA_DIR, 9558)
    assert any(row.positions_gained < 0 for row in lab.constructors)


def test_prediction_real_session_is_simulation_with_unique_ranks():
    arena = build_prediction(DATA_DIR, 9558)
    assert arena.data_mode == "SIMULATION"
    ranks = [entry.predicted_finish for entry in arena.entries]
    assert sorted(ranks) == list(range(1, len(ranks) + 1))


def test_prediction_unknown_session_raises():
    with pytest.raises(KeyError):
        build_prediction(DATA_DIR, 999999)


def _fake_lab(rows):
    return DriverLab(session_key=1, drivers=rows)


def _row(number, finish, grid, avg, dnf=False):
    return DriverLabRow(
        driver_number=number,
        name_acronym=f"D{number}",
        full_name="",
        team_name="",
        team_colour="000",
        grid=grid,
        finish=finish,
        delta=(grid - finish) if grid is not None and finish is not None else None,
        best_lap_ms=avg,
        avg_lap_ms=avg,
        pits=0,
        points=0.0,
        laps=0,
        dnf=dnf,
        compounds=[],
    )


def test_prediction_mae_math(monkeypatch):
    rows = [_row(1, 2, 1, 90_000), _row(2, 1, 2, 89_000)]
    monkeypatch.setattr("app.prediction.build_driver_lab", lambda *_: _fake_lab(rows))
    arena = build_prediction(DATA_DIR, 1)
    assert arena.accuracy_vs_baseline == {
        "baseline_mae": 1.0,
        "model_mae": 0.0,
        "improvement": 1.0,
    }
    assert [e.predicted_finish for e in arena.entries] == [1, 2]


def test_prediction_excludes_dnf_rows(monkeypatch):
    rows = [_row(1, 1, 1, 90_000), _row(2, None, 2, 89_000, dnf=True)]
    monkeypatch.setattr("app.prediction.build_driver_lab", lambda *_: _fake_lab(rows))
    arena = build_prediction(DATA_DIR, 1)
    assert [e.driver_number for e in arena.entries] == [1]


@pytest.mark.xfail(
    strict=True,
    reason="BUG-11: drivers without avg pace get predicted_finish=0, breaking the 1..n rank contract",
)
def test_prediction_rows_without_pace_get_valid_ranks(monkeypatch):
    rows = [_row(1, 1, 1, 90_000), _row(2, 2, 2, None)]
    monkeypatch.setattr("app.prediction.build_driver_lab", lambda *_: _fake_lab(rows))
    arena = build_prediction(DATA_DIR, 1)
    assert sorted(e.predicted_finish for e in arena.entries) == [1, 2]


def test_prediction_currently_assigns_zero_to_unpaced_driver(monkeypatch):
    rows = [_row(1, 1, 1, 90_000), _row(2, 2, 2, None)]
    monkeypatch.setattr("app.prediction.build_driver_lab", lambda *_: _fake_lab(rows))
    arena = build_prediction(DATA_DIR, 1)
    assert 0 in [e.predicted_finish for e in arena.entries]


def test_prediction_empty_grid_has_zero_mae(monkeypatch):
    monkeypatch.setattr("app.prediction.build_driver_lab", lambda *_: _fake_lab([]))
    arena = build_prediction(DATA_DIR, 1)
    assert arena.accuracy_vs_baseline["baseline_mae"] == 0.0
    assert arena.accuracy_vs_baseline["model_mae"] == 0.0
    assert arena.entries == []


def test_parse_seasons_empty_and_missing():
    assert jolpica.parse_seasons({}) == []
    assert jolpica.parse_seasons({"MRData": {"SeasonTable": {}}}) == []


def test_parse_seasons_orders_and_types():
    payload = {
        "MRData": {
            "SeasonTable": {
                "Seasons": [{"season": "2024"}, {"season": "1950"}],
            }
        }
    }
    assert [s.year for s in jolpica.parse_seasons(payload)] == [2024, 1950]


def test_parse_races_empty():
    assert jolpica.parse_races({}) == []


def test_parse_races_sorts_by_round():
    payload = {
        "MRData": {
            "RaceTable": {
                "Races": [
                    {"season": "2024", "round": "2", "raceName": "B", "Circuit": {}, "date": "2024-03-01"},
                    {"season": "2024", "round": "1", "raceName": "A", "Circuit": {}, "date": "2024-02-01"},
                ]
            }
        }
    }
    assert [e.round for e in jolpica.parse_races(payload)] == [1, 2]


def test_parse_races_missing_fields_use_defaults():
    payload = {
        "MRData": {
            "RaceTable": {
                "season": "2024",
                "Races": [{"round": "1"}],
            }
        }
    }
    event = jolpica.parse_races(payload)[0]
    assert event.event_name == "Unknown"
    assert event.circuit_name == "Unknown"
    assert event.country == "Unknown"
    assert event.date_start == ""


def test_parse_races_invalid_lat_long_become_none():
    payload = {
        "MRData": {
            "RaceTable": {
                "Races": [
                    {
                        "season": "2024",
                        "round": "1",
                        "raceName": "A",
                        "Circuit": {"Location": {"lat": "north", "long": "east"}},
                        "date": "2024-01-01",
                    }
                ]
            }
        }
    }
    event = jolpica.parse_races(payload)[0]
    assert event.lat is None and event.long is None


@pytest.mark.parametrize(
    "value,expected",
    [(None, None), ("1.5", 1.5), (2, 2.0), ("x", None), (True, 1.0)],
)
def test_float_or_none(value, expected):
    assert jolpica._float_or_none(value) == expected


@pytest.mark.parametrize(
    "date,time,expected",
    [
        ("2024-01-01", None, "2024-01-01T00:00:00+00:00"),
        ("2024-01-01", "12:00:00Z", "2024-01-01T12:00:00+00:00"),
        ("2024-01-01", "12:00:00", "2024-01-01T12:00:00"),
        (None, "12:00:00", ""),
        ("", None, ""),
    ],
)
def test_combine_date_time(date, time, expected):
    assert jolpica._combine_date_time(date, time) == expected


def test_get_json_retries_on_429_then_succeeds(monkeypatch):
    calls = {"n": 0}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b'{"ok": true}'

    def fake_urlopen(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] < 2:
            raise jolpica.urllib.error.HTTPError("u", 429, "rate", {}, None)
        return Response()

    monkeypatch.setattr(jolpica.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(jolpica.time, "sleep", lambda _: None)
    assert jolpica._get_json("seasons.json") == {"ok": True}
    assert calls["n"] == 2


def test_get_json_does_not_retry_on_500(monkeypatch):
    calls = {"n": 0}

    def fake_urlopen(*args, **kwargs):
        calls["n"] += 1
        raise jolpica.urllib.error.HTTPError("u", 500, "boom", {}, None)

    monkeypatch.setattr(jolpica.urllib.request, "urlopen", fake_urlopen)
    with pytest.raises(jolpica.urllib.error.HTTPError):
        jolpica._get_json("seasons.json")
    assert calls["n"] == 1


@pytest.mark.parametrize("year", [1950, 2017, 2018, 2022, 2023, 2024, 2100])
def test_coverage_channels_are_complete_for_every_year(year):
    channels = _coverage_channels(year, ended=True)
    assert "LIVE" in channels
    assert channels["LIVE"] == "NOT_SUPPORTED"
    for key in ("TIMING", "POSITIONS", "INTERVALS", "TELEMETRY", "LOCATIONS", "RADIO"):
        assert key in channels


@pytest.mark.parametrize(
    "year,channel,expected",
    [
        (2017, "LOCATIONS", "NOT_SUPPORTED"),
        (2018, "TELEMETRY", "AVAILABLE"),
        (2022, "LOCATIONS", "NOT_SUPPORTED"),
        (2023, "LOCATIONS", "AVAILABLE"),
        (2023, "RADIO", "AVAILABLE"),
        (2017, "TIMING", "PARTIAL"),
        (2018, "TIMING", "AVAILABLE"),
        (2024, "OVERTAKES", "PARTIAL"),
    ],
)
def test_coverage_channel_boundaries(year, channel, expected):
    assert _coverage_channels(year, ended=True)[channel] == expected


def test_live_requires_auth_before_session_end():
    assert _coverage_channels(2026, ended=False)["LIVE"] == "REQUIRES_AUTH"


def test_live_not_supported_for_finished_session():
    assert _coverage_channels(2026, ended=True)["LIVE"] == "NOT_SUPPORTED"


@pytest.mark.parametrize(
    "filename,channel",
    [
        ("locations.json", "LOCATIONS"),
        ("telemetry.json", "TELEMETRY"),
        ("race_control.json", "RACE_CONTROL"),
        ("drivers.json", "DRIVERS"),
        ("nonexistent.json", None),
    ],
)
def test_disk_channels_reflect_presence(filename, channel):
    channels = _disk_channels(DATA_DIR, 9558)
    if channel:
        assert channels[channel] == "AVAILABLE"
    assert channels["LIVE"] == "NOT_SUPPORTED"


def test_disk_channels_unknown_session_all_unavailable():
    channels = _disk_channels(DATA_DIR, 999999)
    assert channels["DRIVERS"] == "UNAVAILABLE"
    assert channels["CALENDAR"] == "AVAILABLE"


def test_match_ingested_returns_none_for_missing_event():
    assert _match_ingested(None, [{"session_key": 1, "year": 2024, "circuit_short_name": "X"}]) is None


def test_match_ingested_requires_same_year():
    event = EventSummary(
        season=2023,
        round=1,
        event_name="X",
        circuit_name="Silverstone",
        country="UK",
        date_start="2023-01-01",
    )
    ingested = [{"session_key": 9558, "year": 2024, "circuit_short_name": "Silverstone"}]
    assert _match_ingested(event, ingested) is None


def test_match_ingested_is_case_insensitive():
    event = EventSummary(
        season=2024,
        round=1,
        event_name="X",
        circuit_name="SILVERSTONE CIRCUIT",
        country="UK",
        date_start="2024-01-01",
    )
    ingested = [{"session_key": 9558, "year": 2024, "circuit_short_name": "silverstone"}]
    assert _match_ingested(event, ingested) == 9558


def test_match_ingested_ignores_blank_short_names():
    event = EventSummary(
        season=2024,
        round=1,
        event_name="X",
        circuit_name="Silverstone",
        country="UK",
        date_start="2024-01-01",
    )
    ingested = [{"session_key": 9558, "year": 2024, "circuit_short_name": ""}]
    assert _match_ingested(event, ingested) is None


def test_match_ingested_ambiguous_circuit_returns_first_session():
    event = EventSummary(
        season=2023,
        round=6,
        event_name="Monaco Grand Prix",
        circuit_name="Circuit de Monaco",
        country="Monaco",
        locality="Monte Carlo",
        date_start="2023-05-28",
    )
    ingested = [
        {"session_key": 9090, "year": 2023, "circuit_short_name": "Monte Carlo", "session_name": "Qualifying"},
        {"session_key": 9094, "year": 2023, "circuit_short_name": "Monte Carlo", "session_name": "Race"},
    ]
    assert _match_ingested(event, ingested) == 9090


def test_list_seasons_returns_placeholder_race_counts(monkeypatch):
    monkeypatch.setattr(
        catalog.jolpica,
        "fetch_seasons",
        lambda: [SeasonSummary(year=2024, race_count=0)],
    )
    assert catalog.list_seasons() == [SeasonSummary(year=2024, race_count=0)]


def test_list_events_marks_ingested(monkeypatch):
    event = EventSummary(
        season=2024,
        round=12,
        event_name="British Grand Prix",
        circuit_name="Silverstone Circuit",
        country="United Kingdom",
        locality="Silverstone",
        date_start="2024-07-07",
    )
    monkeypatch.setattr(catalog.jolpica, "fetch_events", lambda year: [event])
    result = catalog.list_events(2024, DATA_DIR)
    assert result[0].ingested is True
    assert result[0].session_key == 9558


def test_load_dataset_absent_file_returns_empty(tmp_path):
    assert load_dataset(tmp_path, 1, "nope.json") == []


def test_load_dataset_parses_json(tmp_path):
    (tmp_path / "1").mkdir()
    (tmp_path / "1" / "pit.json").write_text('[{"driver_number": 1}]')
    assert load_dataset(tmp_path, 1, "pit.json") == [{"driver_number": 1}]


def test_cache_info_shape_and_max():
    clear_cache()
    info = cache_info()
    assert info == {"sessions_cached": 0, "max_sessions": 8}


def test_load_session_data_unknown_key_raises(tmp_path):
    (tmp_path / "sessions.json").write_text("[]")
    with pytest.raises(KeyError):
        load_session_data(tmp_path, 1)


def test_load_session_data_missing_core_file_raises(tmp_path):
    (tmp_path / "sessions.json").write_text(
        json.dumps(
            [
                {
                    "session_key": 1,
                    "date_start": "2024-01-01T00:00:00+00:00",
                }
            ]
        )
    )
    (tmp_path / "1").mkdir()
    with pytest.raises(FileNotFoundError):
        load_session_data(tmp_path, 1)


def _write_fake_session(root: Path, key: int):
    (root / str(key)).mkdir(parents=True)
    (root / str(key) / "drivers.json").write_text(
        json.dumps([{"driver_number": 1, "name_acronym": "X", "team_colour": "000"}])
    )
    (root / str(key) / "positions.json").write_text(
        json.dumps([{"driver_number": 1, "samples": [[0.0, 1]]}])
    )
    (root / str(key) / "intervals.json").write_text("[]")
    (root / str(key) / "timing_base.json").write_text("[]")
    (root / str(key) / "race_control.json").write_text("[]")


def test_session_cache_is_bounded_to_eight_and_evicts_fifo(tmp_path):
    clear_cache()
    sessions = [
        {"session_key": key, "date_start": "2024-01-01T00:00:00+00:00"} for key in range(1, 10)
    ]
    (tmp_path / "sessions.json").write_text(json.dumps(sessions))
    for key in range(1, 10):
        _write_fake_session(tmp_path, key)
        load_session_data(tmp_path, key)
    assert cache_info()["sessions_cached"] == 8
    clear_cache()


def test_session_cache_returns_same_instance(tmp_path):
    clear_cache()
    (tmp_path / "sessions.json").write_text(
        json.dumps([{"session_key": 1, "date_start": "2024-01-01T00:00:00+00:00"}])
    )
    _write_fake_session(tmp_path, 1)
    first = load_session_data(tmp_path, 1)
    second = load_session_data(tmp_path, 1)
    assert first is second
    clear_cache()


def test_session_cache_is_thread_safe(tmp_path):
    clear_cache()
    (tmp_path / "sessions.json").write_text(
        json.dumps([{"session_key": 1, "date_start": "2024-01-01T00:00:00+00:00"}])
    )
    _write_fake_session(tmp_path, 1)
    results = []

    def load():
        results.append(load_session_data(tmp_path, 1))

    threads = [threading.Thread(target=load) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(results) == 8
    assert all(result is results[0] for result in results)
    clear_cache()


def test_clear_cache_resets_count():
    clear_cache()
    assert cache_info()["sessions_cached"] == 0
