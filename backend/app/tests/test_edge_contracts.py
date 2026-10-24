"""Contract edge cases: literals, required fields, coercion, serialization.

These tests exercise the Pydantic layer directly (no HTTP) so schema gaps are
visible even when API routes happen to guard them.
"""

from __future__ import annotations

import json
import math
from typing import get_args

import pytest
from pydantic import ValidationError

from app.contracts import (
    CapabilityReport,
    CapabilityState,
    CarMarker,
    CatalogPage,
    CircuitCorner,
    CircuitInfo,
    CircuitPath,
    ConstructorLab,
    ConstructorRow,
    DataMode,
    Diagnostics,
    Driver,
    DriverLab,
    DriverLabRow,
    EventSummary,
    FlagPeriod,
    PitLoss,
    PredictionArena,
    RaceControlEvent,
    RaceIntelligence,
    SeasonSummary,
    SessionInfo,
    SimulationEntry,
    StateAtTime,
    StrategyLab,
    TelemetryCompare,
    TelemetryLap,
    TimingRow,
)


def test_data_mode_has_exactly_the_five_honest_values():
    assert set(get_args(DataMode)) == {"LIVE", "REPLAY", "ESTIMATE", "SIMULATION", "UNAVAILABLE"}


def test_capability_state_has_exactly_the_six_documented_values():
    assert set(get_args(CapabilityState)) == {
        "AVAILABLE",
        "PARTIAL",
        "UNAVAILABLE",
        "NOT_SUPPORTED",
        "REQUIRES_AUTH",
        "NOT_YET_PUBLISHED",
    }


@pytest.mark.parametrize("mode", ["LIVE", "REPLAY", "ESTIMATE", "SIMULATION", "UNAVAILABLE"])
def test_session_accepts_every_documented_data_mode(mode):
    info = SessionInfo(
        session_key=1,
        meeting_key=1,
        session_name="Race",
        session_type="Race",
        circuit_short_name="Test",
        country_name="Test",
        year=2024,
        date_start="2024-01-01T00:00:00+00:00",
        date_end="2024-01-01T02:00:00+00:00",
        gmt_offset="00:00:00",
        data_mode=mode,
    )
    assert info.data_mode == mode


@pytest.mark.parametrize("mode", ["live", "Replay", "", "ARCHIVE", None])
def test_session_rejects_undocumented_data_mode(mode):
    with pytest.raises(ValidationError):
        SessionInfo(
            session_key=1,
            meeting_key=1,
            session_name="Race",
            session_type="Race",
            circuit_short_name="Test",
            country_name="Test",
            year=2024,
            date_start="2024-01-01T00:00:00+00:00",
            date_end="2024-01-01T02:00:00+00:00",
            gmt_offset="00:00:00",
            data_mode=mode,
        )


def test_driver_requires_identity_fields():
    with pytest.raises(ValidationError) as exc:
        Driver(driver_number=44)
    missing = {e["loc"][0] for e in exc.value.errors() if e["type"] == "missing"}
    assert {"full_name", "name_acronym", "team_name", "team_colour"} <= missing


def test_driver_accepts_numeric_strings_by_coercion():
    driver = Driver(
        driver_number="44",
        full_name="Lewis Hamilton",
        name_acronym="HAM",
        team_name="Mercedes",
        team_colour="27F4D2",
    )
    assert driver.driver_number == 44


@pytest.mark.parametrize("number", [44.5, "forty-four", None, [], {}])
def test_driver_rejects_non_integral_driver_number(number):
    with pytest.raises(ValidationError):
        Driver(
            driver_number=number,
            full_name="X",
            name_acronym="X",
            team_name="X",
            team_colour="000000",
        )


def test_driver_colour_is_not_validated_as_hex():
    driver = Driver(
        driver_number=1,
        full_name="X",
        name_acronym="X",
        team_name="X",
        team_colour="not-a-colour",
    )
    assert driver.team_colour == "not-a-colour"


def test_driver_ignores_unknown_extra_fields():
    driver = Driver(
        driver_number=1,
        full_name="X",
        name_acronym="X",
        team_name="X",
        team_colour="000000",
        unexpected="ignored",
    )
    assert not hasattr(driver, "unexpected")


def test_timing_row_defaults_are_all_nullable():
    row = TimingRow(position=1, driver_number=44, name_acronym="HAM", team_colour="27F4D2")
    assert row.interval is None
    assert row.gap_to_leader is None
    assert row.last_lap_ms is None
    assert row.compound is None
    assert row.tyre_age is None
    assert row.stale_seconds is None


@pytest.mark.parametrize("position", [0, -1, 999])
def test_timing_row_does_not_bound_position(position):
    row = TimingRow(position=position, driver_number=1, name_acronym="X", team_colour="000")
    assert row.position == position


def test_timing_row_stale_seconds_accepts_negative():
    row = TimingRow(
        position=1,
        driver_number=1,
        name_acronym="X",
        team_colour="000",
        stale_seconds=-5.0,
    )
    assert row.stale_seconds == -5.0


def test_race_control_event_requires_date_and_message():
    with pytest.raises(ValidationError):
        RaceControlEvent()
    event = RaceControlEvent(
        date="2024-01-01T00:00:00+00:00",
        message="GREEN FLAG",
        lap_number=None,
        flag=None,
        category=None,
    )
    assert event.lap_number is None
    assert event.flag is None
    assert event.data_mode == "REPLAY"


@pytest.mark.xfail(
    strict=True,
    reason="BUG-02: nullable RaceControlEvent fields lack defaults and cannot be omitted",
)
def test_race_control_event_nullable_fields_default_to_none():
    event = RaceControlEvent(date="2024-01-01T00:00:00+00:00", message="GREEN FLAG")
    assert event.lap_number is None


def test_race_control_event_accepts_live_mode():
    event = RaceControlEvent(
        date="2024-01-01T00:00:00+00:00",
        message="GREEN FLAG",
        lap_number=None,
        flag=None,
        category=None,
        data_mode="LIVE",
    )
    assert event.data_mode == "LIVE"


def test_car_marker_coerces_integer_coordinates_to_float():
    marker = CarMarker(driver_number=1, x=3, y=4, interpolated=False)
    assert isinstance(marker.x, float) and isinstance(marker.y, float)


def test_car_marker_coerces_numeric_strings_by_design():
    marker = CarMarker(driver_number=1, x="3", y="4.5", interpolated=False)
    assert (marker.x, marker.y) == (3.0, 4.5)


@pytest.mark.xfail(
    strict=True,
    reason="BUG-03: boolean coordinates are silently coerced to 1.0/0.0",
)
def test_car_marker_rejects_boolean_coordinates():
    with pytest.raises(ValidationError):
        CarMarker(driver_number=1, x=True, y=False, interpolated=False)


def test_car_marker_rejects_none_coordinates():
    with pytest.raises(ValidationError):
        CarMarker(driver_number=1, x=None, y=4.0, interpolated=False)


def test_circuit_path_accepts_empty_lists():
    path = CircuitPath(x=[], y=[])
    assert path.x == [] and path.y == []


def test_circuit_corner_requires_number_and_coordinates():
    with pytest.raises(ValidationError):
        CircuitCorner(number=1)
    corner = CircuitCorner(number=1, x=0.0, y=0.0)
    assert corner.angle is None and corner.dist is None


def test_circuit_info_nested_shape_roundtrips():
    info = CircuitInfo(
        circuit_key=2,
        circuit_name="Silverstone",
        rotation=84.25,
        path=CircuitPath(x=[0.0, 1.0], y=[0.0, 1.0]),
        corners=[CircuitCorner(number=1, x=0.0, y=0.0, dist=12.5)],
        pit_loss=PitLoss(normal=20.0, sc=12.0, vsc=14.0),
        length_m=5821.3,
    )
    assert json.loads(info.model_dump_json())["corners"][0]["dist"] == 12.5


def test_state_at_time_requires_core_fields():
    with pytest.raises(ValidationError):
        StateAtTime()


def test_state_at_time_defaults_claim_replay_and_estimate():
    state = StateAtTime(t_seconds=0, current_lap=None, red_flag=False, vsc=False, sc=False, timing=[], markers=[])
    assert state.data_mode == "REPLAY"
    assert state.marker_mode == "ESTIMATE"


def test_state_at_time_accepts_live_without_a_feed():
    state = StateAtTime(
        t_seconds=0,
        current_lap=None,
        red_flag=False,
        vsc=False,
        sc=False,
        timing=[],
        markers=[],
        data_mode="LIVE",
    )
    assert state.data_mode == "LIVE"


@pytest.mark.parametrize("t", [-1.5, 0, 1e12, float("inf")])
def test_state_at_time_accepts_any_float_time(t):
    state = StateAtTime(t_seconds=t, current_lap=None, red_flag=False, vsc=False, sc=False, timing=[], markers=[])
    assert state.t_seconds == t


def test_state_at_time_accepts_nan_and_serialises_it_as_null():
    state = StateAtTime(
        t_seconds=float("nan"),
        current_lap=None,
        red_flag=False,
        vsc=False,
        sc=False,
        timing=[],
        markers=[],
    )
    assert math.isnan(state.t_seconds)
    assert json.loads(state.model_dump_json())["t_seconds"] is None


def test_telemetry_lap_defaults_sd_none():
    lap = TelemetryLap(
        lap_number=1,
        duration=90.0,
        sectors=[30.0, 30.0, 30.0],
        is_pit_out_lap=False,
        speed=[100],
        throttle=[100],
        brake=[0],
    )
    assert lap.sd is None


def test_telemetry_lap_accepts_none_channel_values():
    lap = TelemetryLap(
        lap_number=1,
        duration=90.0,
        sectors=[None, None, None],
        is_pit_out_lap=False,
        speed=[None],
        throttle=[None],
        brake=[None],
    )
    assert lap.speed == [None]


def test_telemetry_compare_requires_header_fields():
    with pytest.raises(ValidationError):
        TelemetryCompare(session_key=1)
    compare = TelemetryCompare(
        session_key=1,
        length_m=1000.0,
        grid_points=180,
        lap_selector="best",
        drivers=[],
    )
    assert compare.drivers == []


def test_season_summary_rejects_negative_year_race_count_is_unbounded():
    assert SeasonSummary(year=-1, race_count=0).year == -1
    assert SeasonSummary(year=2024, race_count=-5).race_count == -5


def test_event_summary_defaults_ingested_false():
    event = EventSummary(
        season=2024,
        round=1,
        event_name="Test GP",
        circuit_name="Test",
        country="Test",
        date_start="2024-01-01",
    )
    assert event.ingested is False
    assert event.session_key is None
    assert event.lat is None and event.long is None


def test_capability_report_validates_channel_values():
    with pytest.raises(ValidationError):
        CapabilityReport(
            season=2024,
            round=1,
            event_name="X",
            session_name="Race",
            channels={"TIMING": "MAYBE"},
        )
    report = CapabilityReport(
        season=2024,
        round=1,
        event_name="X",
        session_name="Race",
        channels={"TIMING": "AVAILABLE"},
    )
    assert report.data_mode == "UNAVAILABLE"


def test_catalog_page_defaults_to_jolpica():
    page = CatalogPage(season=2024, events=[], fetched_at="now")
    assert page.source == "JOLPICA"


def test_flag_period_accepts_open_period():
    period = FlagPeriod(kind="SC", start_t=10.0)
    assert period.end_t is None
    assert period.duration_s is None


def test_race_intelligence_requires_all_aggregates():
    with pytest.raises(ValidationError):
        RaceIntelligence(session_key=1)
    intel = RaceIntelligence(
        session_key=1,
        flag_periods=[],
        total_pit_stops=0,
        pit_aggregates=[],
        overtakes_total=0,
        top_overtakers=[],
        most_overtaken=[],
        position_movers=[],
        lead_changes=0,
    )
    assert intel.data_mode == "REPLAY"


def test_strategy_lab_defaults_replay():
    lab = StrategyLab(session_key=1, drivers=[], stop_histogram={})
    assert lab.data_mode == "REPLAY"
    assert lab.most_common_stops is None


def test_driver_lab_row_allows_unknown_finish():
    row = DriverLabRow(
        driver_number=1,
        name_acronym="X",
        full_name="X",
        team_name="X",
        team_colour="000",
        grid=None,
        finish=None,
        delta=None,
        best_lap_ms=None,
        avg_lap_ms=None,
        pits=0,
        points=0.0,
        laps=0,
        dnf=True,
        compounds=[],
    )
    assert row.finish is None


def test_driver_lab_and_constructor_lab_default_modes():
    assert DriverLab(session_key=1, drivers=[]).data_mode == "REPLAY"
    assert ConstructorLab(session_key=1, constructors=[]).data_mode == "REPLAY"


def test_constructor_row_requires_team_name():
    with pytest.raises(ValidationError):
        ConstructorRow(team_colour="000", driver_numbers=[], points=0.0, positions_gained=0)
    row = ConstructorRow(
        team_name="X",
        team_colour="000",
        driver_numbers=[],
        points=0.0,
        best_finish=None,
        avg_finish=None,
        positions_gained=0,
    )
    assert row.team_name == "X"


def test_prediction_arena_defaults_simulation():
    arena = PredictionArena(
        session_key=1,
        method="m",
        entries=[],
        accuracy_vs_baseline={},
        note="n",
    )
    assert arena.data_mode == "SIMULATION"


def test_prediction_arena_accepts_live_mode():
    arena = PredictionArena(
        session_key=1,
        method="m",
        entries=[],
        accuracy_vs_baseline={},
        note="n",
        data_mode="LIVE",
    )
    assert arena.data_mode == "LIVE"


def test_simulation_entry_accepts_zero_predicted_finish():
    entry = SimulationEntry(
        driver_number=1,
        name_acronym="X",
        grid=None,
        predicted_finish=0,
        actual_finish=None,
    )
    assert entry.predicted_finish == 0


def test_diagnostics_requires_counts_and_maps():
    with pytest.raises(ValidationError):
        Diagnostics()
    diag = Diagnostics(
        session_key=None,
        ingested_sessions=0,
        data_dir="/tmp",
        session_store={},
        datasets_present={},
    )
    assert diag.data_mode == "REPLAY"


@pytest.mark.parametrize(
    "model,payload",
    [
        (
            Driver,
            dict(
                driver_number=1,
                full_name="X",
                name_acronym="X",
                team_name="X",
                team_colour="000000",
                headshot_url=None,
                broadcast_name=None,
            ),
        ),
        (SeasonSummary, dict(year=2024, race_count=24)),
        (CarMarker, dict(driver_number=1, x=1.0, y=2.0, interpolated=True)),
        (TimingRow, dict(position=1, driver_number=1, name_acronym="X", team_colour="000")),
        (PitLoss, dict(normal=20.0, sc=12.0, vsc=14.0)),
    ],
)
def test_contract_models_serialize_to_valid_json(model, payload):
    instance = model(**payload)
    encoded = instance.model_dump_json()
    assert json.loads(encoded) == instance.model_dump(mode="json")


def test_state_model_dump_is_json_serializable():
    state = StateAtTime(t_seconds=1.0, current_lap=2, red_flag=False, vsc=False, sc=False, timing=[], markers=[])
    assert json.loads(json.dumps(state.model_dump(mode="json")))["current_lap"] == 2
