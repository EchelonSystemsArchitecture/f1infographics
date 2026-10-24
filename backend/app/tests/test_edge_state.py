"""Edge cases for the replay state reconstruction engine.

Synthetic fixtures only (no dataset dependency) so each boundary is explicit:
time before/after coverage, stale intervals, marker lerp/hold/drop, flag
transitions, missing metadata, and malformed-but-accepted inputs.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.state import (
    INTERVAL_MAX_STALE_SECONDS,
    LOCATION_LEAD_TOLERANCE_SECONDS,
    LOCATION_MAX_LERP_GAP_SECONDS,
    LOCATION_MAX_STALE_SECONDS,
    _flag_state,
    _fmt_gap,
    _last_at_or_before,
    _marker_at,
    build_index,
    build_state_at,
)

START = datetime(2024, 7, 7, 14, 0, tzinfo=timezone.utc)


def iso(seconds: float) -> str:
    return (START + timedelta(seconds=seconds)).isoformat()


def drivers(*numbers):
    return [
        {"driver_number": n, "name_acronym": f"D{n}", "team_colour": "112233"} for n in numbers
    ]


def positions(mapping):
    return [
        {"driver_number": n, "samples": [[float(t), int(p)] for t, p in samples]}
        for n, samples in mapping.items()
    ]


def intervals(mapping):
    return [
        {"driver_number": n, "samples": [[float(t), gap, interval] for t, gap, interval in samples]}
        for n, samples in mapping.items()
    ]


def timing(laps_by_driver):
    return [
        {"driver_number": n, "laps": laps}
        for n, laps in laps_by_driver.items()
    ]


def lap(number, start, duration=90.0, compound="MEDIUM", age=3):
    row = {"lap_number": number, "date_start": iso(start), "lap_duration": duration}
    if compound is not None:
        row["compound"] = compound
    if age is not None:
        row["tyre_age"] = age
    return row


def state(t, drivers_=None, positions_=None, intervals_=None, timing_=None, rc=None, locations=None, **kw):
    return build_state_at(
        t=t,
        drivers=drivers_ or [],
        positions=positions_ or [],
        intervals=intervals_ or [],
        timing_base=timing_ or [],
        race_control=rc or [],
        date_start=START,
        locations=locations,
        **kw,
    )


@pytest.mark.parametrize(
    "value,expected",
    [
        (None, None),
        ("+1 LAP", "+1 LAP"),
        ("+2 LAPS", "+2 LAPS"),
        ("", ""),
        (0, "0.000"),
        (1.23456, "1.235"),
        (-2.5, "-2.500"),
        (0.0004, "0.000"),
        (1_000_000_000.0, "1000000000.000"),
        (float("nan"), "nan"),
        (float("inf"), "inf"),
        ("123", "123"),
    ],
)
def test_fmt_gap_matrix(value, expected):
    assert _fmt_gap(value) == expected


@pytest.mark.parametrize(
    "t,expected_index",
    [(0.0, 0), (0.5, 0), (1.0, 1), (1.5, 1), (99.0, 2), (-1.0, None)],
)
def test_last_at_or_before_indices(t, expected_index):
    samples = [[0.0, 10.0], [1.0, 20.0], [2.0, 30.0]]
    sample, stamp = _last_at_or_before(samples, t)
    if expected_index is None:
        assert sample is None
    else:
        assert sample == samples[expected_index]
        assert stamp == samples[expected_index][0]


def test_last_at_or_before_empty_returns_nan():
    sample, stamp = _last_at_or_before([], 10.0)
    assert sample is None
    assert stamp != stamp


def test_last_at_or_before_duplicate_timestamps_picks_last_duplicate():
    samples = [[0.0, 1], [1.0, 2], [1.0, 3]]
    sample, _ = _last_at_or_before(samples, 1.0)
    assert sample[1] == 3


def test_last_at_or_before_uses_supplied_times_cache():
    samples = [[0.0, 1], [1.0, 2]]
    times = [0.0, 1.0]
    assert _last_at_or_before(samples, 0.5, times)[0][1] == 1


SAMPLES = [
    [100.0, 0.0, 0.0],
    [101.0, 10.0, 20.0],
    [102.0, 20.0, 40.0],
    [110.0, 100.0, 200.0],
]


@pytest.mark.parametrize(
    "t,expected,interpolated",
    [
        (100.0, (0.0, 0.0), False),
        (101.0, (10.0, 20.0), False),
        (101.5, (15.0, 30.0), True),
        (102.0, (20.0, 40.0), False),
        (99.0, (0.0, 0.0), False),
        (98.0, (0.0, 0.0), False),
        (104.0, (20.0, 40.0), False),
        (107.0, (20.0, 40.0), False),
        (108.0, None, None),
        (106.0, (20.0, 40.0), False),
        (float("nan"), None, None),
        (float("-inf"), None, None),
        (float("inf"), None, None),
    ],
)
def test_marker_at_boundaries(t, expected, interpolated):
    marker = _marker_at(44, SAMPLES, t)
    if expected is None:
        assert marker is None
    else:
        assert (marker.x, marker.y) == expected
        assert marker.interpolated is interpolated
        assert marker.driver_number == 44


def test_marker_lead_tolerance_is_inclusive():
    value = SAMPLES[0][0] - LOCATION_LEAD_TOLERANCE_SECONDS
    assert _marker_at(44, SAMPLES, value) is not None


def test_marker_lead_tolerance_just_outside_is_dropped():
    value = SAMPLES[0][0] - LOCATION_LEAD_TOLERANCE_SECONDS - 0.001
    assert _marker_at(44, SAMPLES, value) is None


def test_marker_stale_window_is_inclusive():
    value = SAMPLES[2][0] + LOCATION_MAX_STALE_SECONDS
    assert _marker_at(44, SAMPLES, value) is not None


def test_marker_stale_window_just_outside_is_dropped():
    value = SAMPLES[2][0] + LOCATION_MAX_STALE_SECONDS + 0.001
    assert _marker_at(44, SAMPLES, value) is None


def test_marker_gap_at_lerp_limit_still_interpolates():
    gap = LOCATION_MAX_LERP_GAP_SECONDS
    samples = [[0.0, 0.0, 0.0], [gap, 10.0, 10.0]]
    marker = _marker_at(1, samples, gap / 2)
    assert marker is not None and marker.interpolated is True
    assert (marker.x, marker.y) == (5.0, 5.0)


def test_marker_gap_just_over_lerp_limit_holds_instead():
    gap = LOCATION_MAX_LERP_GAP_SECONDS + 0.001
    samples = [[0.0, 0.0, 0.0], [gap, 10.0, 10.0]]
    marker = _marker_at(1, samples, gap / 2)
    assert marker is not None and marker.interpolated is False
    assert (marker.x, marker.y) == (0.0, 0.0)


def test_marker_single_sample_holds_within_stale_window():
    marker = _marker_at(7, [[5.0, 1.0, 2.0]], 8.0)
    assert marker is not None and (marker.x, marker.y) == (1.0, 2.0)


def test_marker_duplicate_timestamps_do_not_divide_by_zero():
    marker = _marker_at(7, [[0.0, 1.0, 1.0], [0.0, 2.0, 2.0]], 0.5)
    assert marker is not None and not marker.interpolated


def test_marker_negative_coordinates_are_preserved():
    marker = _marker_at(1, [[0.0, -10.5, -20.25]], 0.0)
    assert (marker.x, marker.y) == (-10.5, -20.25)


def ev(seconds, message, flag=None):
    return {"date": iso(seconds), "message": message, "flag": flag}


def flag_events(rows):
    return [(seconds, (msg or "").upper(), (flag or "").upper()) for seconds, msg, flag in rows]


@pytest.mark.parametrize(
    "rows,t,expected",
    [
        ([], 0, (False, False, False)),
        ([(10, "SAFETY CAR DEPLOYED", None)], 5, (False, False, False)),
        ([(10, "SAFETY CAR DEPLOYED", None)], 15, (False, False, True)),
        ([(10, "SAFETY CAR DEPLOYED", None), (20, "SAFETY CAR IN THIS LAP", None)], 25, (False, False, False)),
        ([(10, "SAFETY CAR DEPLOYED", None), (20, "SAFETY CAR ENDING", None)], 25, (False, False, False)),
        ([(10, "VIRTUAL SAFETY CAR", None)], 15, (False, True, False)),
        ([(10, "VIRTUAL SAFETY CAR", None), (20, "GREEN FLAG", None)], 25, (False, False, False)),
        ([(10, "VIRTUAL SAFETY CAR", None), (20, "SAFETY CAR IN", None)], 25, (False, False, False)),
        ([(10, "VIRTUAL SAFETY CAR", None), (20, "GREEN FLAG", "GREEN")], 25, (False, False, False)),
        ([(10, "RED FLAG", "RED")], 15, (True, False, False)),
        ([(10, "RED FLAG", None)], 15, (True, False, False)),
        ([(10, "RED LIGHT", None)], 15, (True, False, False)),
        ([(10, "CHEQUERED FLAG", "CHEQUERED")], 15, (False, False, False)),
        ([(10, "RED FLAG", "RED"), (20, "GREEN FLAG", "GREEN")], 25, (False, False, False)),
        ([(10, "RED FLAG", "RED"), (20, "RACE RESUMED", None), (30, "GREEN FLAG", "GREEN")], 35, (False, False, False)),
        ([(10, "SAFETY CAR DEPLOYED", None), (20, "GREEN FLAG", None)], 25, (False, False, False)),
        ([(10, "VIRTUAL SAFETY CAR", None), (20, "SAFETY CAR IN THIS LAP", None)], 25, (False, False, False)),
        ([(10, "virtual safety car", None)], 15, (False, True, False)),
        ([(10, "", None)], 15, (False, False, False)),
        ([(10, "YELLOW FLAG", "YELLOW")], 15, (False, False, False)),
        ([(10, "SAFETY CAR DEPLOYED", None)], 10, (False, False, True)),
        ([(10, "SAFETY CAR DEPLOYED", None)], 9.999, (False, False, False)),
        ([(10, "SAFETY CAR IN THIS LAP", None)], 15, (False, False, False)),
        ([(10, "RED FLAG", "RED"), (20, "CHEQUERED FLAG", "CHEQUERED"), (30, "GREEN FLAG", "GREEN")], 35, (False, False, False)),
        ([(10, "VIRTUAL SAFETY CAR", None), (20, "SAFETY CAR DEPLOYED", None)], 25, (False, True, True)),
        ([(10, "RED FLAG", "RED"), (20, "SAFETY CAR DEPLOYED", None)], 25, (True, False, True)),
    ],
)
def test_flag_state_matrix(rows, t, expected):
    assert _flag_state(flag_events(rows), t) == expected


@pytest.mark.xfail(
    strict=True,
    reason="BUG-04: VSC ENDING messages set vsc=True instead of clearing it",
)
def test_flag_state_vsc_ending_clears_vsc():
    rows = [(10, "VIRTUAL SAFETY CAR", None), (20, "VSC ENDING", None)]
    assert _flag_state(flag_events(rows), 25) == (False, False, False)


@pytest.mark.xfail(
    strict=True,
    reason="BUG-04: VIRTUAL SAFETY CAR ENDING sets vsc=True instead of clearing it",
)
def test_flag_state_virtual_safety_car_ending_clears_vsc():
    rows = [(10, "VIRTUAL SAFETY CAR", None), (20, "VIRTUAL SAFETY CAR ENDING", None)]
    assert _flag_state(flag_events(rows), 25) == (False, False, False)


def test_flag_state_green_while_safety_car_clears_sc():
    rows = [(10, "SAFETY CAR DEPLOYED", None), (20, "GREEN LIGHT", None)]
    assert _flag_state(flag_events(rows), 25) == (False, False, False)


def test_build_index_empty_inputs():
    index = build_index([], [], [], [], [], START)
    assert index.pos_samples == {}
    assert index.flag_events == []
    assert index.date_start == START


def test_build_index_skips_laps_without_timestamps():
    base = timing({44: [lap(1, 10), {"lap_number": 2, "date_start": None, "lap_duration": 90.0}]})
    index = build_index([], [], [], base, [], START)
    assert index.lap_starts[44] == [10.0]
    assert len(index.lap_entries[44]) == 1


def test_build_index_skips_race_control_without_dates():
    rc = [{"message": "GREEN", "flag": "GREEN"}, ev(5, "SAFETY CAR DEPLOYED")]
    index = build_index([], [], [], [], rc, START)
    assert len(index.flag_events) == 1
    assert index.flag_events[0][0] == 5.0


def test_build_index_sorts_flag_events_by_time():
    rc = [ev(30, "RED FLAG", "RED"), ev(10, "GREEN FLAG", "GREEN"), ev(20, "SAFETY CAR DEPLOYED")]
    index = build_index([], [], [], [], rc, START)
    stamps = [row[0] for row in index.flag_events]
    assert stamps == sorted(stamps)


def test_build_index_with_no_locations_has_empty_location_maps():
    index = build_index(drivers(44), positions({44: [(0, 1)]}), [], [], [], START, locations=None)
    assert index.loc_samples == {}
    assert index.loc_times == {}


def test_build_index_preserves_sample_order():
    samples = [[0.0, 1], [5.0, 4], [8.0, 2]]
    index = build_index([], positions({44: samples}), [], [], [], START)
    assert index.pos_samples[44] == samples
    assert index.pos_times[44] == [0.0, 5.0, 8.0]


def test_empty_state_is_honest():
    result = state(0)
    assert result.timing == []
    assert result.markers == []
    assert result.current_lap is None
    assert result.data_mode == "REPLAY"
    assert result.marker_mode == "UNAVAILABLE"


@pytest.mark.parametrize("t", [-100.0, -1.0, 0.0, 5.0, 1000.0])
def test_state_never_raises_on_time_extremes(t):
    assert state(t).data_mode == "REPLAY"


def test_state_before_positions_have_no_rows():
    result = state(-1, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}))
    assert result.timing == []


def test_state_at_first_position_sample_builds_row():
    result = state(0, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}))
    assert [row.driver_number for row in result.timing] == [44]


def test_state_forward_fills_position_between_changes():
    result = state(4, drivers_=drivers(44), positions_=positions({44: [(0, 3), (10, 1)]}))
    assert result.timing[0].position == 3


def test_state_applies_position_change_at_exact_timestamp():
    result = state(10, drivers_=drivers(44), positions_=positions({44: [(0, 3), (10, 1)]}))
    assert result.timing[0].position == 1


def test_state_after_last_position_sample_holds_value():
    result = state(999, drivers_=drivers(44), positions_=positions({44: [(0, 3), (10, 1)]}))
    assert result.timing[0].position == 1


def test_state_sorts_rows_by_position():
    mapping = {1: [(0, 2)], 2: [(0, 1)], 3: [(0, 3)]}
    result = state(1, drivers_=drivers(1, 2, 3), positions_=positions(mapping))
    assert [row.position for row in result.timing] == [1, 2, 3]


def test_state_drops_duplicate_rank_collisions_without_inventing_order():
    mapping = {1: [(0, 1)], 2: [(0, 1)]}
    result = state(1, drivers_=drivers(1, 2), positions_=positions(mapping))
    assert [row.position for row in result.timing] == [1, 1]


@pytest.mark.parametrize("duration,expected", [(90.5, 90500), (0, None), (None, None)])
def test_last_lap_ms_conversion(duration, expected):
    base = timing({44: [{"lap_number": 1, "date_start": iso(0), "lap_duration": duration}]})
    row = state(1, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}), timing_=base).timing[0]
    assert row.last_lap_ms == expected


def test_state_uses_most_recent_started_lap():
    base = timing({44: [lap(1, 0, compound="SOFT", age=0), lap(2, 100, compound="HARD", age=0)]})
    row = state(150, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}), timing_=base).timing[0]
    assert row.compound == "HARD"


def test_state_before_first_lap_has_no_compound():
    base = timing({44: [lap(1, 100)]})
    row = state(50, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}), timing_=base).timing[0]
    assert row.compound is None
    assert row.tyre_age is None


def test_current_lap_is_highest_started_lap_across_drivers():
    base = timing({44: [lap(1, 0), lap(2, 10)], 1: [lap(1, 0), lap(2, 9), lap(3, 30)]})
    result = state(35, drivers_=drivers(1, 44), positions_=positions({44: [(0, 1)], 1: [(0, 2)]}), timing_=base)
    assert result.current_lap == 3


def test_current_lap_ignores_future_laps():
    base = timing({44: [lap(1, 0), lap(2, 100)]})
    result = state(50, drivers_=drivers(44), positions_=positions({44: [(0, 1)]}), timing_=base)
    assert result.current_lap == 1


def test_current_lap_uses_driver_without_position_data():
    base = timing({99: [lap(1, 0), lap(2, 10)]})
    result = state(15, timing_=base)
    assert result.current_lap == 2


def test_state_missing_driver_metadata_uses_fallbacks():
    row = state(1, drivers_=[], positions_=positions({44: [(0, 1)]})).timing[0]
    assert row.name_acronym == "P44"
    assert row.team_colour == "888888"


def test_state_ignores_unrelated_driver_metadata():
    result = state(1, drivers_=drivers(99), positions_=positions({44: [(0, 1)]}))
    assert result.timing[0].name_acronym == "P44"


def test_state_interval_within_stale_window_is_attached():
    result = state(
        20,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=intervals({44: [(0, 1.5, 1.5)]}),
    )
    row = result.timing[0]
    assert row.gap_to_leader == "1.500"
    assert row.interval == "1.500"
    assert row.stale_seconds == 20.0


def test_state_interval_exactly_at_stale_limit_is_kept():
    result = state(
        INTERVAL_MAX_STALE_SECONDS,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=intervals({44: [(0, 1.5, 1.5)]}),
    )
    assert result.timing[0].gap_to_leader == "1.500"


def test_state_interval_just_past_stale_limit_is_dropped():
    result = state(
        INTERVAL_MAX_STALE_SECONDS + 0.001,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=intervals({44: [(0, 1.5, 1.5)]}),
    )
    assert result.timing[0].gap_to_leader is None
    assert result.timing[0].stale_seconds is None


def test_state_interval_literal_lap_string_passes_through():
    result = state(
        1,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=[{"driver_number": 44, "samples": [[0.0, "+1 LAP", "+1 LAP"]]}],
    )
    assert result.timing[0].gap_to_leader == "+1 LAP"
    assert result.timing[0].interval == "+1 LAP"


def test_state_interval_short_sample_has_no_interval_value():
    result = state(
        1,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=[{"driver_number": 44, "samples": [[0.0, 2.25]]}],
    )
    assert result.timing[0].gap_to_leader == "2.250"
    assert result.timing[0].interval is None


def test_state_gap_rounds_to_three_decimals():
    result = state(
        1,
        drivers_=drivers(44),
        positions_=positions({44: [(0, 2)]}),
        intervals_=intervals({44: [(0, 1.23456, 0.5)]}),
    )
    assert result.timing[0].gap_to_leader == "1.235"


def test_state_red_flag_transitions_with_race_control():
    rc = [ev(10, "RED FLAG", "RED"), ev(20, "GREEN FLAG", "GREEN")]
    assert state(15, rc=rc).red_flag is True
    assert state(25, rc=rc).red_flag is False


def test_state_chequered_flag_does_not_set_red():
    rc = [ev(10, "CHEQUERED FLAG", "CHEQUERED")]
    assert state(15, rc=rc).red_flag is False


def test_state_safety_car_and_vsc_flags():
    rc = [ev(10, "SAFETY CAR DEPLOYED", None), ev(20, "SAFETY CAR IN THIS LAP", None), ev(30, "VIRTUAL SAFETY CAR", None)]
    assert state(15, rc=rc).sc is True
    assert state(25, rc=rc).sc is False
    assert state(35, rc=rc).vsc is True


def test_state_markers_are_sorted_by_driver_number():
    locations = [
        {"driver_number": 44, "samples": [[0.0, 1.0, 1.0]]},
        {"driver_number": 1, "samples": [[0.0, 2.0, 2.0]]},
    ]
    result = state(0, locations=locations)
    assert [m.driver_number for m in result.markers] == [1, 44]


def test_state_marker_mode_replay_when_coverage_exists():
    result = state(0, locations=[{"driver_number": 1, "samples": [[0.0, 1.0, 1.0]]}])
    assert result.marker_mode == "REPLAY"


def test_state_marker_mode_replay_even_if_every_sample_list_is_empty():
    result = state(0, locations=[{"driver_number": 1, "samples": []}])
    assert result.markers == []
    assert result.marker_mode == "REPLAY"


def test_state_marker_mode_unavailable_without_coverage():
    assert state(0, locations=None).marker_mode == "UNAVAILABLE"


def test_state_marker_dropped_before_coverage_starts():
    result = state(-10, locations=[{"driver_number": 1, "samples": [[0.0, 1.0, 1.0]]}])
    assert result.markers == []


def test_state_marker_held_within_stale_window():
    result = state(3, locations=[{"driver_number": 1, "samples": [[0.0, 1.0, 1.0]]}])
    assert len(result.markers) == 1


def test_state_marker_dropped_after_stale_window():
    result = state(6, locations=[{"driver_number": 1, "samples": [[0.0, 1.0, 1.0]]}])
    assert result.markers == []


def test_state_marker_lerp_midpoint():
    result = state(
        0.5,
        locations=[{"driver_number": 1, "samples": [[0.0, 0.0, 0.0], [1.0, 10.0, 10.0]]}],
    )
    assert (result.markers[0].x, result.markers[0].y) == (5.0, 5.0)
    assert result.markers[0].interpolated is True


@pytest.mark.xfail(strict=True, reason="BUG-01: NaN time is accepted and returns the last full state")
def test_state_nan_time_returns_empty_state():
    result = state(
        float("nan"),
        drivers_=drivers(44),
        positions_=positions({44: [(0, 1)]}),
    )
    assert result.timing == []


def test_state_infinite_time_returns_last_known_timing():
    result = state(
        float("inf"),
        drivers_=drivers(44),
        positions_=positions({44: [(0, 1), (10, 2)]}),
    )
    assert result.timing[0].position == 2


def test_state_data_mode_is_always_replay():
    assert state(0).data_mode == "REPLAY"
    assert state(100, locations=[{"driver_number": 1, "samples": [[0.0, 1.0, 1.0]]}]).data_mode == "REPLAY"


def test_state_is_deterministic_for_same_inputs():
    kwargs = dict(
        drivers_=drivers(1, 44),
        positions_=positions({1: [(0, 2), (10, 1)], 44: [(0, 1), (10, 2)]}),
        intervals_=intervals({1: [(0, 1.0, 1.0)], 44: [(0, 0.0, 0.0)]}),
        timing_=timing({1: [lap(1, 0)], 44: [lap(1, 0)]}),
        rc=[ev(10, "RED FLAG", "RED")],
        locations=[{"driver_number": 1, "samples": [[0.0, 0.0, 0.0], [10.0, 5.0, 5.0]]}],
    )
    assert state(12.5, **kwargs).model_dump() == state(12.5, **kwargs).model_dump()


def test_state_t_seconds_echoes_unrounded_input():
    assert state(12.3456).t_seconds == 12.3456
