"""Integrity checks across every committed normalized session.

One parametrized test per session keeps nested structure visible while still
covering all 90 ingested sessions, plus aggregate checks for known data-quality
exceptions (cancelled event, bad grids, impossible stints, sprint windows).
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SESSIONS = json.loads((DATA_DIR / "sessions.json").read_text())
CORE_FILES = (
    "drivers.json",
    "positions.json",
    "intervals.json",
    "timing_base.json",
    "race_control.json",
)
OPTIONAL_FILES = (
    "locations.json",
    "telemetry.json",
    "grid.json",
    "session_result.json",
    "circuit.json",
    "overtakes.json",
    "weather.json",
    "pit.json",
    "stints.json",
    "team_radio.json",
)

KNOWN_CANCELLED = {9086}
KNOWN_GRID_MISMATCH = {9069, 9078, 9086, 9165, 9506, 9507, 9590, 9971, 10028, 10033}
KNOWN_DUPLICATE_GRID = {9523, 9582, 9598, 9912, 9987}


def load(key: int, name: str):
    with (DATA_DIR / str(key) / name).open() as handle:
        return json.load(handle)


def session_marks():
    marks = []
    for session in SESSIONS:
        key = session["session_key"]
        params = {}
        if key in KNOWN_CANCELLED:
            params["marks"] = pytest.mark.xfail(
                strict=True,
                reason="BUG-12: cancelled Imola 2023 (9086) is catalogued as an ingested race with zero data",
            )
        marks.append(pytest.param(session, id=str(key), **params))
    return marks


@pytest.mark.parametrize("session", session_marks())
def test_session_dataset_integrity(session):
    key = session["session_key"]
    directory = DATA_DIR / str(key)

    assert directory.is_dir()
    for name in CORE_FILES + OPTIONAL_FILES:
        assert (directory / name).exists(), name

    assert session["data_mode"] == "REPLAY"
    assert session["session_name"] in {"Race", "Sprint", "Qualifying"}
    assert session["session_type"] in {"Race", "Qualifying"}
    assert 2023 <= session["year"] <= 2025
    assert session["meeting_key"] > 0
    assert re.fullmatch(r"-?\d{2}:\d{2}:\d{2}", session["gmt_offset"])

    start = datetime.fromisoformat(session["date_start"])
    end = datetime.fromisoformat(session["date_end"])
    assert end > start
    assert start.year == session["year"]

    drivers = load(key, "drivers.json")
    assert len(drivers) >= 18
    numbers = [driver["driver_number"] for driver in drivers]
    assert len(numbers) == len(set(numbers))
    for driver in drivers:
        assert driver["name_acronym"]
        assert driver["team_name"]
        assert re.fullmatch(r"[0-9A-Fa-f]{6}", driver["team_colour"])

    positions = load(key, "positions.json")
    for entry in positions:
        assert entry["driver_number"] in numbers
        stamps = [sample[0] for sample in entry["samples"]]
        assert stamps == sorted(stamps)
        assert all(1 <= sample[1] <= len(drivers) for sample in entry["samples"])

    intervals = load(key, "intervals.json")
    for entry in intervals:
        assert entry["driver_number"] in numbers
        stamps = [sample[0] for sample in entry["samples"]]
        assert stamps == sorted(stamps)
        for sample in entry["samples"]:
            assert len(sample) == 3
            assert sample[1] is None or isinstance(sample[1], (int, float, str))
            assert sample[2] is None or isinstance(sample[2], (int, float, str))

    timing = load(key, "timing_base.json")
    for entry in timing:
        assert entry["driver_number"] in numbers
        lap_numbers = [lap["lap_number"] for lap in entry["laps"]]
        assert lap_numbers == sorted(lap_numbers)
        assert len(lap_numbers) == len(set(lap_numbers))
        for lap in entry["laps"]:
            if lap.get("lap_duration") is not None:
                assert lap["lap_duration"] > 0
            if lap.get("tyre_age") is not None:
                assert lap["tyre_age"] >= 0

    race_control = load(key, "race_control.json")
    stamps = [row["date"] for row in race_control if row.get("date")]
    assert stamps == sorted(stamps)
    for row in race_control:
        assert row["data_mode"] == "REPLAY"
        assert row["message"]
        datetime.fromisoformat(row["date"])

    weather = load(key, "weather.json")
    stamps = [row["date"] for row in weather]
    assert stamps == sorted(stamps)

    circuit = load(key, "circuit.json")
    assert len(circuit["path"]["x"]) == len(circuit["path"]["y"])
    if circuit["path"]["x"]:
        assert circuit["path"]["x"][0] == circuit["path"]["x"][-1]
        assert circuit["path"]["y"][0] == circuit["path"]["y"][-1]

    result = load(key, "session_result.json")
    finishes = [row["position"] for row in result if row.get("position") is not None]
    assert len(finishes) == len(set(finishes))

    telemetry = load(key, "telemetry.json")
    assert telemetry["grid_points"] == 180
    for driver in telemetry["drivers"]:
        for lap in driver["laps"]:
            for channel in ("speed", "throttle", "brake"):
                assert len(lap[channel]) == 180
            if lap.get("sd") is not None:
                assert lap["sd"] == sorted(lap["sd"])
                assert all(0 <= value <= telemetry["length_m"] for value in lap["sd"])


def test_catalog_and_directories_match_exactly():
    dirs = {path.name for path in DATA_DIR.iterdir() if path.is_dir()}
    keys = {str(row["session_key"]) for row in SESSIONS}
    assert dirs == keys
    assert len(SESSIONS) == 90


def test_session_keys_are_unique():
    keys = [row["session_key"] for row in SESSIONS]
    assert len(keys) == len(set(keys))


def test_no_session_claims_live_mode():
    assert all(row["data_mode"] == "REPLAY" for row in SESSIONS)


def test_no_race_control_event_claims_live_mode():
    for session in SESSIONS:
        for row in load(session["session_key"], "race_control.json"):
            assert row["data_mode"] == "REPLAY"


def test_every_session_has_all_dataset_files():
    for session in SESSIONS:
        for name in CORE_FILES + OPTIONAL_FILES:
            assert (DATA_DIR / str(session["session_key"]) / name).is_file()


def test_session_name_combinations_are_documented():
    combos = {(row["session_name"], row["session_type"]) for row in SESSIONS}
    assert combos == {("Race", "Race"), ("Sprint", "Race"), ("Qualifying", "Qualifying")}


def test_there_are_eighteen_sprints_and_one_qualifying():
    names = [row["session_name"] for row in SESSIONS]
    assert names.count("Sprint") == 18
    assert names.count("Qualifying") == 1
    assert names.count("Race") == 71


def test_sprint_session_windows_are_inconsistent():
    sprints = [row for row in SESSIONS if row["session_name"] == "Sprint"]
    durations = []
    for row in sprints:
        start = datetime.fromisoformat(row["date_start"])
        end = datetime.fromisoformat(row["date_end"])
        durations.append((end - start).total_seconds())
    assert durations.count(1800) == 7
    assert durations.count(3600) == 11


def test_seven_sprint_windows_are_below_the_frontend_clock_floor():
    sprints = [row for row in SESSIONS if row["session_name"] == "Sprint"]
    short = []
    for row in sprints:
        start = datetime.fromisoformat(row["date_start"])
        end = datetime.fromisoformat(row["date_end"])
        if (end - start).total_seconds() < 3600:
            short.append(row["session_key"])
    assert short == [9069, 9117, 9140, 9204, 9883, 9934, 10028]


@pytest.mark.xfail(
    strict=True,
    reason="BUG-12: cancelled Imola 2023 is ingested with zero drivers, laps and race control",
)
def test_cancelled_session_is_not_presented_as_playable():
    row = next(item for item in SESSIONS if item["session_key"] == 9086)
    assert row["data_mode"] != "REPLAY"


def test_cancelled_session_currently_has_empty_core_data():
    key = 9086
    assert load(key, "drivers.json") == []
    assert load(key, "positions.json") == []
    assert load(key, "timing_base.json") == []
    assert load(key, "race_control.json") == []


@pytest.mark.xfail(
    strict=True,
    reason="BUG-13: grid.json contains driver numbers from other rounds/entry lists (10 sessions)",
)
def test_grid_drivers_are_always_part_of_the_session_entry_list():
    failures = []
    for session in SESSIONS:
        key = session["session_key"]
        drivers = {row["driver_number"] for row in load(key, "drivers.json")}
        unknown = [row["driver_number"] for row in load(key, "grid.json") if row["driver_number"] not in drivers]
        if unknown:
            failures.append((key, unknown))
    assert failures == []


def test_grid_mismatch_currently_affects_ten_sessions():
    failures = []
    for session in SESSIONS:
        key = session["session_key"]
        drivers = {row["driver_number"] for row in load(key, "drivers.json")}
        unknown = [row["driver_number"] for row in load(key, "grid.json") if row["driver_number"] not in drivers]
        if unknown:
            failures.append(key)
    assert set(failures) == KNOWN_GRID_MISMATCH


@pytest.mark.xfail(
    strict=True,
    reason="BUG-16: five sessions have duplicate grid positions and missing ranks",
)
def test_grid_positions_are_unique_per_session():
    for session in SESSIONS:
        key = session["session_key"]
        positions = [row["position"] for row in load(key, "grid.json")]
        assert len(positions) == len(set(positions))


def test_duplicate_grid_positions_currently_affect_five_sessions():
    affected = set()
    for session in SESSIONS:
        key = session["session_key"]
        positions = [row["position"] for row in load(key, "grid.json")]
        if len(positions) != len(set(positions)):
            affected.add(key)
    assert affected == KNOWN_DUPLICATE_GRID


@pytest.mark.xfail(
    strict=True,
    reason="BUG-14: stints contain null lap bounds (9140) and lap_end < lap_start (7787)",
)
def test_stint_bounds_are_always_playable():
    failures = []
    for session in SESSIONS:
        key = session["session_key"]
        for stint in load(key, "stints.json"):
            start = stint.get("lap_start")
            end = stint.get("lap_end")
            if start is None or end is None or end < start:
                failures.append((key, stint["driver_number"], start, end))
    assert failures == []


def test_bad_stint_bounds_currently_affect_nineteen_sessions():
    affected = set()
    for session in SESSIONS:
        key = session["session_key"]
        for stint in load(key, "stints.json"):
            start = stint.get("lap_start")
            end = stint.get("lap_end")
            if start is None or end is None or end < start:
                affected.add(key)
    assert len(affected) == 19
    assert {7787, 9140, 9979} <= affected


def test_stint_drivers_belong_to_session():
    for session in SESSIONS:
        key = session["session_key"]
        drivers = {row["driver_number"] for row in load(key, "drivers.json")}
        for stint in load(key, "stints.json"):
            assert stint["driver_number"] in drivers


def test_result_drivers_belong_to_session():
    for session in SESSIONS:
        key = session["session_key"]
        drivers = {row["driver_number"] for row in load(key, "drivers.json")}
        for row in load(key, "session_result.json"):
            assert row["driver_number"] in drivers


def test_pit_drivers_belong_to_session():
    for session in SESSIONS:
        key = session["session_key"]
        drivers = {row["driver_number"] for row in load(key, "drivers.json")}
        for row in load(key, "pit.json"):
            assert row["driver_number"] in drivers


def test_location_samples_are_sorted_and_unique():
    for session in SESSIONS:
        key = session["session_key"]
        for entry in load(key, "locations.json"):
            stamps = [sample[0] for sample in entry["samples"]]
            assert stamps == sorted(stamps)
            assert len(stamps) == len(set(stamps))


def test_telemetry_laps_are_unique_and_sorted():
    for session in SESSIONS:
        key = session["session_key"]
        for driver in load(key, "telemetry.json")["drivers"]:
            numbers = [lap["lap_number"] for lap in driver["laps"]]
            assert numbers == sorted(numbers)
            assert len(numbers) == len(set(numbers))


def test_telemetry_speeds_are_physical():
    for session in SESSIONS:
        key = session["session_key"]
        for driver in load(key, "telemetry.json")["drivers"]:
            for lap in driver["laps"]:
                speeds = [value for value in lap["speed"] if value is not None]
                assert all(0 <= value <= 400 for value in speeds)


@pytest.mark.xfail(
    strict=True,
    reason="BUG-15: binned throttle/brake values exceed 100 in session 9558 (max 104)",
)
def test_telemetry_throttle_and_brake_are_physical():
    for session in SESSIONS:
        key = session["session_key"]
        for driver in load(key, "telemetry.json")["drivers"]:
            for lap in driver["laps"]:
                throttles = [value for value in lap["throttle"] if value is not None]
                assert all(0 <= value <= 100 for value in throttles)
                brakes = [value for value in lap["brake"] if value is not None]
                assert all(0 <= value <= 100 for value in brakes)


def test_telemetry_range_violation_is_limited_to_flagship():
    affected = set()
    peak = 0
    for session in SESSIONS:
        key = session["session_key"]
        for driver in load(key, "telemetry.json")["drivers"]:
            for lap in driver["laps"]:
                for value in lap["throttle"] + lap["brake"]:
                    if value is not None and value > 100:
                        affected.add(key)
                        peak = max(peak, value)
    assert affected == {9558}
    assert peak == 104


def test_session_year_counts_are_consistent():
    counts = {}
    for session in SESSIONS:
        if session["session_name"] == "Race":
            counts[session["year"]] = counts.get(session["year"], 0) + 1
    assert counts == {2023: 23, 2024: 24, 2025: 24}


def test_duplicate_session_names_per_circuit_never_occur():
    keys = [(row["year"], row["circuit_short_name"], row["session_name"]) for row in SESSIONS]
    assert len(keys) == len(set(keys))
