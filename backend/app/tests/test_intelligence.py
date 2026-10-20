"""Race Intelligence derivations.

Pure-function tests on synthetic data plus an integration test against the
flagship session (skipped when not ingested).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.intelligence import (
    count_lead_changes,
    detect_flag_periods,
    overtake_leaders,
    pit_aggregates,
    position_movers,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
START = datetime(2024, 7, 7, 14, 0, tzinfo=timezone.utc)


def test_detect_flag_periods_sc_vsc_red():
    rc = [
        {"date": "2024-07-07T14:10:00+00:00", "message": "SAFETY CAR DEPLOYED", "flag": None},
        {"date": "2024-07-07T14:15:00+00:00", "message": "SAFETY CAR IN THIS LAP", "flag": None},
        {"date": "2024-07-07T14:20:00+00:00", "message": "VIRTUAL SAFETY CAR", "flag": None},
        {"date": "2024-07-07T14:22:00+00:00", "message": "GREEN FLAG", "flag": "GREEN"},
        {"date": "2024-07-07T14:30:00+00:00", "message": "RED FLAG", "flag": "RED"},
        {"date": "2024-07-07T14:40:00+00:00", "message": "RACE RESUMED", "flag": "GREEN"},
    ]
    periods = detect_flag_periods(rc, START)
    kinds = [p.kind for p in periods]
    assert "SC" in kinds and "VSC" in kinds and "RED" in kinds
    sc = next(p for p in periods if p.kind == "SC")
    assert sc.start_t == 600.0  # 14:10
    assert sc.end_t == 900.0  # 14:15
    assert sc.duration_s == 300.0


def test_detect_flag_periods_ignores_chequered_for_red():
    # "CHEQUERED FLAG" contains the substring "RED FLAG" — must NOT open a RED.
    rc = [{"date": "2024-07-07T15:25:39+00:00", "message": "CHEQUERED FLAG", "flag": "CHEQUERED"}]
    periods = detect_flag_periods(rc, START)
    assert all(p.kind != "RED" for p in periods)


def test_pit_aggregates():
    pit = [
        {"driver_number": 44, "pit_duration": 22.0},
        {"driver_number": 44, "pit_duration": 24.0},
        {"driver_number": 11, "pit_duration": 26.0},
    ]
    drivers = {44: {"name_acronym": "HAM", "team_colour": "00D2BE"}}
    agg = pit_aggregates(pit, drivers)
    ham = next(a for a in agg if a.driver_number == 44)
    assert ham.stops == 2
    assert ham.total_pit_time_s == 46.0
    assert ham.avg_pit_time_s == 23.0


def test_overtake_leaders():
    overtakes = [
        {"overtaking_driver_number": 55, "overtaken_driver_number": 27},
        {"overtaking_driver_number": 55, "overtaken_driver_number": 16},
        {"overtaking_driver_number": 4, "overtaken_driver_number": 27},
    ]
    made, received, total = overtake_leaders(overtakes, {})
    assert total == 3
    assert made[0].driver_number == 55 and made[0].count == 2
    assert received[0].driver_number == 27 and received[0].count == 2


def test_position_movers():
    grid = [{"driver_number": 63, "position": 1}, {"driver_number": 44, "position": 5}]
    result = [
        {"driver_number": 63, "position": 2, "dnf": False},
        {"driver_number": 44, "position": 1, "dnf": False},
    ]
    movers = position_movers(grid, result, {})
    ham = next(m for m in movers if m.driver_number == 44)
    assert ham.delta == 4  # P5 -> P1 = gained 4
    rus = next(m for m in movers if m.driver_number == 63)
    assert rus.delta == -1


def test_count_lead_changes():
    positions = [
        {
            "driver_number": 63,
            "samples": [[0.0, 1], [100.0, 2], [300.0, 1]],
        },
        {
            "driver_number": 44,
            "samples": [[0.0, 2], [100.0, 1], [300.0, 2]],
        },
    ]
    # leader: 63 -> 44 (t100) -> 63 (t300) = 2 changes
    assert count_lead_changes(positions, START) == 2


def test_intelligence_integration():
    if not (DATA_DIR / "9558").is_dir():
        import pytest

        pytest.skip("flagship session not ingested")
    from app.intelligence import build_intelligence

    intel = build_intelligence(DATA_DIR, 9558)
    assert intel.session_key == 9558
    assert intel.data_mode == "REPLAY"
    assert intel.total_pit_stops > 0
    assert intel.overtakes_total > 0
    assert len(intel.position_movers) > 0
    assert all(m.grid is not None and m.finish is not None for m in intel.position_movers)
