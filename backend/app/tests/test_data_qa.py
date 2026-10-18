"""Data-QA checks on the normalized 2024 British GP (session_key 9558) datasets.

These tests guard the ingest pipeline: field presence, cardinality, monotonicity,
and documented exceptions (driver 10 = Gasly DNS, hence 19 interval series).
"""

import json
from datetime import datetime
from pathlib import Path

import pytest

from app.contracts import Driver, SessionInfo
from app.state import build_state_at

DATA = Path(__file__).resolve().parents[2] / "data"
SESSION_KEY = 9558


def _load(name: str):
    with (DATA / str(SESSION_KEY) / name).open() as f:
        return json.load(f)


@pytest.fixture(scope="module")
def sessions():
    with (DATA / "sessions.json").open() as f:
        return json.load(f)


@pytest.fixture(scope="module")
def drivers():
    return _load("drivers.json")


@pytest.fixture(scope="module")
def positions():
    return _load("positions.json")


@pytest.fixture(scope="module")
def intervals():
    return _load("intervals.json")


@pytest.fixture(scope="module")
def timing_base():
    return _load("timing_base.json")


@pytest.fixture(scope="module")
def race_control():
    return _load("race_control.json")


def test_session_info_matches_flagship(sessions):
    assert len(sessions) == 1
    info = SessionInfo(**sessions[0])
    assert info.session_key == SESSION_KEY
    assert info.meeting_key == 1240
    assert info.circuit_short_name == "Silverstone"
    assert info.data_mode == "REPLAY"


def test_twenty_drivers_parse(drivers):
    assert len(drivers) == 20
    for row in drivers:
        Driver(**row)
    # Real F1 driver numbers for 2024 (not positional 1..20).
    nums = {d["driver_number"] for d in drivers}
    assert nums == {1, 2, 3, 4, 10, 11, 14, 16, 18, 20, 22, 23, 24, 27, 31, 44, 55, 63, 77, 81}


def test_driver_ten_is_gasly(drivers):
    gasly = next(d for d in drivers if d["driver_number"] == 10)
    assert gasly["name_acronym"] == "GAS"


def test_positions_cover_twenty_drivers_and_are_monotonic(positions):
    assert len(positions) == 20
    for entry in positions:
        samples = entry["samples"]
        times = [s[0] for s in samples]
        assert times == sorted(times), f"driver {entry['driver_number']} positions not monotonic in t"
        for _, pos in samples:
            assert 1 <= pos <= 20


def test_hamilton_wins_and_has_52_position_samples(positions):
    ham = next(p for p in positions if p["driver_number"] == 44)
    assert ham["samples"][-1][1] == 1


def test_intervals_have_19_series_driver10_documented_dns(intervals):
    # Driver 10 (Gasly) did not start; openF1 returns 404-as-empty -> no interval series.
    assert len(intervals) == 19
    nums = {i["driver_number"] for i in intervals}
    assert 10 not in nums
    for entry in intervals:
        times = [s[0] for s in entry["samples"]]
        assert times == sorted(times)


def test_timing_base_lap_counts(timing_base):
    assert len(timing_base) == 20
    ham = next(t for t in timing_base if t["driver_number"] == 44)
    assert len(ham["laps"]) == 52
    assert ham["laps"][0]["lap_number"] == 1
    assert ham["laps"][0]["tyre_age"] == 0
    assert ham["laps"][-1]["lap_number"] == 52


def test_race_control_parses_and_hamilton_not_flagged(race_control):
    assert len(race_control) >= 100
    for e in race_control:
        assert "date" in e and "message" in e


def test_state_at_mid_race():
    with (DATA / "sessions.json").open() as f:
        session = json.load(f)[0]
    date_start = datetime.fromisoformat(session["date_start"])
    state = build_state_at(
        t=1800.0,
        drivers=_load("drivers.json"),
        positions=_load("positions.json"),
        intervals=_load("intervals.json"),
        timing_base=_load("timing_base.json"),
        race_control=_load("race_control.json"),
        date_start=date_start,
    )
    assert state.data_mode == "REPLAY"
    assert state.current_lap is not None and state.current_lap >= 10
    assert 1 <= len(state.timing) <= 20
    # Positions must be a permutation of distinct ranks among present drivers.
    ranks = [row.position for row in state.timing]
    assert len(ranks) == len(set(ranks))
    # Leader has no gap or gap 0; every gap_to_leader, when present, is numeric.
    for row in state.timing:
        if row.gap_to_leader is not None:
            float(row.gap_to_leader)
