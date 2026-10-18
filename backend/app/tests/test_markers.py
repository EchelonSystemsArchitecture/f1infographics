"""QA for the state.py location marker: lerp, lead tolerance, stale hold."""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.state import _marker_at, build_state_at

# [t, x, y] at 1 Hz.
SAMPLES = [
    [100.0, 0.0, 0.0],
    [101.0, 10.0, 20.0],
    [102.0, 20.0, 40.0],
    [110.0, 100.0, 200.0],  # 8 s gap: beyond lerp window
]


def test_exact_sample_hit_is_not_interpolated():
    m = _marker_at(44, SAMPLES, 101.0)
    assert m is not None
    assert (m.x, m.y) == (10.0, 20.0)
    assert m.interpolated is False


def test_midpoint_lerps_and_is_interpolated():
    m = _marker_at(44, SAMPLES, 101.5)
    assert m is not None
    assert (m.x, m.y) == (15.0, 30.0)
    assert m.interpolated is True


def test_lead_tolerance_holds_first_sample():
    m = _marker_at(44, SAMPLES, 99.0)  # 1 s before first sample
    assert m is not None
    assert (m.x, m.y) == (0.0, 0.0)
    assert m.interpolated is False


def test_before_lead_tolerance_is_dropped():
    assert _marker_at(44, SAMPLES, 97.0) is None  # 3 s before first sample


def test_stale_hold_within_window():
    m = _marker_at(44, SAMPLES, 104.0)  # 2 s after sample at 102
    assert m is not None
    assert (m.x, m.y) == (20.0, 40.0)
    assert m.interpolated is False


def test_beyond_stale_window_is_dropped():
    assert _marker_at(44, SAMPLES, 108.0) is None  # 6 s after sample at 102


def test_large_gap_holds_last_sample_instead_of_lerping():
    # Gap 102 -> 110 is 8 s: beyond LOCATION_MAX_LERP_GAP_SECONDS, so the
    # sample at 102 must be held (not lerped) until it goes stale.
    m = _marker_at(44, SAMPLES, 106.0)
    assert m is not None
    assert (m.x, m.y) == (20.0, 40.0)
    assert m.interpolated is False


def test_empty_samples_is_none():
    assert _marker_at(44, [], 101.0) is None


def _minimal_inputs():
    date_start = datetime(2024, 7, 7, 14, 0, tzinfo=timezone.utc)
    drivers = [{"driver_number": 44, "name_acronym": "HAM", "team_colour": "e80020"}]
    positions = [{"driver_number": 44, "samples": [[0.0, 1], [1.0, 1]]}]
    intervals = [{"driver_number": 44, "samples": [[100.0, 1.234, 0.5]]}]
    timing_base = [
        {
            "driver_number": 44,
            "laps": [{"lap_number": 1, "date_start": "2024-07-07T14:01:00+00:00", "lap_duration": 90.5}],
        }
    ]
    return date_start, drivers, positions, intervals, timing_base


def test_build_state_with_locations_is_replay():
    date_start, drivers, positions, intervals, timing_base = _minimal_inputs()
    locations = [{"driver_number": 44, "samples": [[0.0, 5.0, 6.0], [1.0, 7.0, 8.0]]}]
    state = build_state_at(
        t=0.5,
        drivers=drivers,
        positions=positions,
        intervals=intervals,
        timing_base=timing_base,
        race_control=[],
        date_start=date_start,
        locations=locations,
    )
    assert state.marker_mode == "REPLAY"
    assert len(state.markers) == 1
    assert state.markers[0].driver_number == 44
    assert (state.markers[0].x, state.markers[0].y) == (6.0, 7.0)
    assert state.markers[0].interpolated is True


def test_build_state_without_locations_is_unavailable():
    date_start, drivers, positions, intervals, timing_base = _minimal_inputs()
    state = build_state_at(
        t=0.5,
        drivers=drivers,
        positions=positions,
        intervals=intervals,
        timing_base=timing_base,
        race_control=[],
        date_start=date_start,
    )
    assert state.marker_mode == "UNAVAILABLE"
    assert state.markers == []
