"""HTTP edge cases for the FastAPI surface.

Covers validation boundaries, honest 404/503 behaviour, response shapes,
HTTP method semantics, exposed diagnostics/docs, and cross-session support.
Network-dependent catalog routes are stubbed so the suite is deterministic.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import catalog
from app.contracts import CapabilityReport, EventSummary, SeasonSummary
from app.main import app

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
KEY = 9558

pytestmark = pytest.mark.skipif(
    not (DATA_DIR / str(KEY) / "state.json").parent.exists() or not (DATA_DIR / str(KEY) / "drivers.json").exists(),
    reason="flagship session not ingested",
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"].startswith("application/json")


def test_health_rejects_post(client):
    assert client.post("/api/health").status_code == 405


def test_health_head_is_not_supported(client):
    response = client.head("/api/health")
    assert response.status_code == 405
    assert response.headers["allow"] == "GET"


def test_trailing_slash_redirects_for_health(client):
    response = client.get("/api/health/", follow_redirects=False)
    assert response.status_code in (307, 308)


def test_openapi_document_is_not_exposed_by_default(client):
    assert client.get("/openapi.json").status_code == 404


def test_swagger_docs_are_not_exposed_by_default(client):
    assert client.get("/docs").status_code == 404


def test_unknown_route_is_404(client):
    assert client.get("/api/does-not-exist").status_code == 404


def test_wrong_method_is_405(client):
    response = client.post(f"/api/session/{KEY}/drivers")
    assert response.status_code == 405


def test_sessions_catalog_is_complete_and_honest(client):
    response = client.get("/api/sessions")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 89
    keys = [row["session_key"] for row in body]
    assert len(keys) == len(set(keys))
    assert all(row["data_mode"] == "REPLAY" for row in body)
    assert all(row["session_type"] in {"Race", "Sprint", "Qualifying"} for row in body)


def test_sessions_are_sorted_by_session_key_not_date(client):
    body = client.get("/api/sessions").json()
    keys = [row["session_key"] for row in body]
    assert keys == sorted(keys)
    dates = [row["date_start"] for row in body]
    assert dates != sorted(dates)


def test_sessions_accepts_no_query_parameters(client):
    assert client.get("/api/sessions?limit=1").status_code == 200


@pytest.mark.parametrize("session_key", [-1, 0, 1, 999999999999999999999])
def test_unknown_session_drivers_is_404(client, session_key):
    response = client.get(f"/api/session/{session_key}/drivers")
    assert response.status_code == 404


def test_non_integer_session_path_is_422(client):
    assert client.get("/api/session/abc/drivers").status_code == 422
    assert client.get("/api/session/9558.5/drivers").status_code == 422


def test_integral_float_session_path_is_silently_coerced(client):
    assert client.get("/api/session/9558.0/drivers").status_code == 200


def test_drivers_are_twenty_and_valid(client):
    response = client.get(f"/api/session/{KEY}/drivers")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 20
    assert all(row["driver_number"] > 0 for row in body)
    assert all(row["team_colour"] for row in body)


def test_state_requires_time(client):
    response = client.get(f"/api/session/{KEY}/state")
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "t"]


@pytest.mark.parametrize("t", [-1, -0.001, "-inf", "nan"])
def test_state_rejects_negative_or_nan_time(client, t):
    assert client.get(f"/api/session/{KEY}/state", params={"t": t}).status_code == 422


@pytest.mark.parametrize("t", ["abc", "", "1,2", "12s"])
def test_state_rejects_non_numeric_time(client, t):
    assert client.get(f"/api/session/{KEY}/state", params={"t": t}).status_code == 422


def test_state_rejects_infinite_time(client):
    assert client.get(f"/api/session/{KEY}/state", params={"t": "inf"}).status_code == 422
    assert client.get(f"/api/session/{KEY}/state", params={"t": "1e309"}).status_code == 422


def test_state_accepts_decimal_time(client):
    response = client.get(f"/api/session/{KEY}/state", params={"t": "1.25"})
    assert response.status_code == 200
    assert response.json()["t_seconds"] == 1.25


def test_state_accepts_large_finite_time(client):
    response = client.get(f"/api/session/{KEY}/state", params={"t": "1e308"})
    assert response.status_code == 200


def test_state_at_zero_is_well_formed_even_before_running(client):
    response = client.get(f"/api/session/{KEY}/state", params={"t": 0})
    assert response.status_code == 200
    body = response.json()
    assert body["t_seconds"] == 0
    assert body["data_mode"] == "REPLAY"
    assert isinstance(body["timing"], list)
    assert isinstance(body["markers"], list)


def test_state_flagship_markers_are_replay(client):
    body = client.get(f"/api/session/{KEY}/state", params={"t": 5000}).json()
    assert body["marker_mode"] == "REPLAY"
    assert len(body["markers"]) > 0
    assert all(set(m) == {"driver_number", "x", "y", "interpolated"} for m in body["markers"])


def test_state_core_only_session_reports_unavailable_markers(client):
    body = client.get("/api/session/7779/state", params={"t": 5000}).json()
    assert body["marker_mode"] == "UNAVAILABLE"
    assert body["markers"] == []
    assert body["data_mode"] == "REPLAY"


def test_state_timing_rows_have_stable_ranking(client):
    body = client.get(f"/api/session/{KEY}/state", params={"t": 5000}).json()
    positions = [row["position"] for row in body["timing"]]
    assert positions == sorted(positions)
    assert len(positions) == len(set(positions))


def test_state_unknown_session_is_404(client):
    assert client.get("/api/session/999999/state", params={"t": 0}).status_code == 404


def test_race_control_is_non_empty_and_typed(client):
    response = client.get(f"/api/session/{KEY}/race-control")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 110
    assert all(row["data_mode"] == "REPLAY" for row in body)
    assert all("date" in row and "message" in row for row in body)


def test_race_control_unknown_session_is_404(client):
    assert client.get("/api/session/999999/race-control").status_code == 404


def test_weather_is_sorted_and_bounded(client):
    body = client.get(f"/api/session/{KEY}/weather").json()
    assert len(body) > 0
    stamps = [row["date"] for row in body]
    assert stamps == sorted(stamps)
    assert all(row["rainfall"] is None or 0 <= row["rainfall"] <= 1 for row in body)


def test_weather_unknown_session_is_404(client):
    assert client.get("/api/session/999999/weather").status_code == 404


def test_circuit_path_is_parallel_and_closed(client):
    body = client.get(f"/api/session/{KEY}/circuit").json()
    xs, ys = body["path"]["x"], body["path"]["y"]
    assert len(xs) == len(ys) > 2
    assert xs[0] == xs[-1] and ys[0] == ys[-1]
    assert body["rotation"] is not None
    assert body["corners"] == sorted(body["corners"], key=lambda c: c["number"])


def test_circuit_unknown_session_is_404(client):
    assert client.get("/api/session/999999/circuit").status_code == 404


def test_intelligence_is_replay_and_consistent(client):
    body = client.get(f"/api/session/{KEY}/intelligence").json()
    assert body["data_mode"] == "REPLAY"
    assert body["total_pit_stops"] == sum(a["stops"] for a in body["pit_aggregates"])
    assert body["overtakes_total"] >= len(body["top_overtakers"])
    assert body["lead_changes"] >= 0


def test_intelligence_unknown_session_is_404(client):
    assert client.get("/api/session/999999/intelligence").status_code == 404


def test_strategy_histogram_matches_drivers(client):
    body = client.get(f"/api/session/{KEY}/strategy").json()
    assert body["data_mode"] == "REPLAY"
    assert sum(body["stop_histogram"].values()) == len(body["drivers"])
    assert body["most_common_stops"] == int(
        max(body["stop_histogram"].items(), key=lambda kv: kv[1])[0]
    )


def test_strategy_stints_are_ordered_and_bounded(client):
    body = client.get(f"/api/session/{KEY}/strategy").json()
    for driver in body["drivers"]:
        numbers = [stint["stint_number"] for stint in driver["stints"]]
        assert numbers == sorted(numbers)
        for stint in driver["stints"]:
            assert stint["lap_end"] >= stint["lap_start"]
            assert stint["length"] == stint["lap_end"] - stint["lap_start"] + 1


def test_strategy_unknown_session_is_404(client):
    assert client.get("/api/session/999999/strategy").status_code == 404


def test_driver_lab_is_replay_and_ordered(client):
    body = client.get(f"/api/session/{KEY}/driver-lab").json()
    assert body["data_mode"] == "REPLAY"
    finishes = [row["finish"] for row in body["drivers"] if row["finish"] is not None]
    assert finishes == sorted(finishes)
    winner = next(row for row in body["drivers"] if row["finish"] == 1)
    assert winner["name_acronym"] == "HAM"


def test_driver_lab_numeric_fields_are_non_negative(client):
    body = client.get(f"/api/session/{KEY}/driver-lab").json()
    for row in body["drivers"]:
        assert row["pits"] >= 0
        assert row["laps"] >= 0
        assert row["points"] >= 0


def test_driver_lab_unknown_session_is_404(client):
    assert client.get("/api/session/999999/driver-lab").status_code == 404


def test_constructor_lab_points_descending(client):
    body = client.get(f"/api/session/{KEY}/constructor-lab").json()
    assert body["data_mode"] == "REPLAY"
    points = [row["points"] for row in body["constructors"]]
    assert points == sorted(points, reverse=True)


def test_constructor_lab_unknown_session_is_404(client):
    assert client.get("/api/session/999999/constructor-lab").status_code == 404


def test_prediction_is_never_live(client):
    body = client.get(f"/api/session/{KEY}/prediction").json()
    assert body["data_mode"] == "SIMULATION"
    assert body["data_mode"] != "LIVE"
    assert "simulation" in body["note"].lower()


def test_prediction_unknown_session_is_404(client):
    assert client.get("/api/session/999999/prediction").status_code == 404


@pytest.mark.parametrize("session_key", [9636, 9858, 9998, 10014])
def test_engines_handle_disqualified_rows(client, session_key):
    assert client.get(f"/api/session/{session_key}/driver-lab").status_code == 200
    assert client.get(f"/api/session/{session_key}/constructor-lab").status_code == 200
    assert client.get(f"/api/session/{session_key}/prediction").status_code == 200


@pytest.mark.parametrize(
    "drivers,expected",
    [
        ("44", 200),
        ("44,63", 200),
        ("44, 63", 200),
        ("44,44", 200),
        ("+44", 200),
        ("044", 200),
        ("44,", 400),
        ("", 422),
        ("44,,63", 400),
        ("44,fast", 400),
        ("44.0", 400),
        ("-44", 400),
        ("0", 400),
        ("999999999999999999999", 404),
    ],
)
def test_telemetry_driver_selectors(client, drivers, expected):
    response = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": drivers})
    assert response.status_code == expected


@pytest.mark.parametrize(
    "lap,expected",
    [
        ("best", 200),
        ("BEST", 200),
        (" best ", 200),
        ("1", 200),
        ("52", 200),
        ("53", 404),
        ("0", 400),
        ("-5", 400),
        ("1.5", 400),
        ("1e2", 400),
        ("nan", 400),
        ("inf", 400),
        ("", 400),
    ],
)
def test_telemetry_lap_selectors(client, lap, expected):
    response = client.get(
        f"/api/session/{KEY}/telemetry", params={"drivers": "44", "lap": lap}
    )
    assert response.status_code == expected


def test_telemetry_missing_drivers_is_422(client):
    assert client.get(f"/api/session/{KEY}/telemetry").status_code == 422


def test_telemetry_unknown_session_is_404_before_parsing(client):
    assert (
        client.get("/api/session/999999/telemetry", params={"drivers": "fast"}).status_code
        == 404
    )


def test_telemetry_payload_is_bounded(client):
    body = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"}).json()
    assert body["grid_points"] == 180
    lap = body["drivers"][0]["laps"][0]
    assert len(lap["speed"]) == 180
    assert len(lap["throttle"]) == 180
    assert len(lap["brake"]) == 180


def test_diagnostics_without_session(client):
    body = client.get("/api/diagnostics").json()
    assert body["session_key"] is None
    assert body["datasets_present"] == {}
    assert body["ingested_sessions"] == 89


def test_diagnostics_with_unknown_session_reports_all_absent(client):
    body = client.get("/api/diagnostics", params={"session_key": 999999}).json()
    assert body["datasets_present"]
    assert all(value is False for value in body["datasets_present"].values())


def test_diagnostics_with_flagship_reports_core_files(client):
    body = client.get("/api/diagnostics", params={"session_key": KEY}).json()
    for name in ("drivers.json", "positions.json", "intervals.json", "timing_base.json"):
        assert body["datasets_present"][name] is True


def test_diagnostics_uses_relative_data_path(client):
    body = client.get("/api/diagnostics").json()
    assert body["data_dir"] == "backend/data"
    assert not Path(body["data_dir"]).is_absolute()


def test_seasons_route_uses_catalog(client, monkeypatch):
    monkeypatch.setattr(catalog, "list_seasons", lambda _data_dir: [SeasonSummary(year=2024, race_count=24)])
    body = client.get("/api/seasons").json()
    assert body == [{"year": 2024, "race_count": 24}]


def test_seasons_route_falls_back_to_local_on_failure(client, monkeypatch):
    def boom():
        raise RuntimeError("network down")

    monkeypatch.setattr(catalog, "list_seasons", boom)
    body = client.get("/api/seasons").json()
    assert [row["year"] for row in body] == [2025, 2024, 2023]
    assert [row["race_count"] for row in body] == [24, 24, 22]


def test_local_season_counts_exclude_sprints(client, monkeypatch):
    def boom():
        raise RuntimeError("network down")

    monkeypatch.setattr(catalog, "list_seasons", boom)
    body = client.get("/api/seasons").json()
    assert [row["race_count"] for row in body] == [24, 24, 22]


def test_year_events_route_uses_catalog(client, monkeypatch):
    event = EventSummary(
        season=2024,
        round=1,
        event_name="Bahrain Grand Prix",
        circuit_name="Bahrain International Circuit",
        country="Bahrain",
        date_start="2024-03-02T15:00:00+00:00",
        ingested=True,
        session_key=9472,
    )
    monkeypatch.setattr(catalog, "list_events", lambda year, data: [event])
    body = client.get("/api/seasons/2024/events").json()
    assert body["source"] == "JOLPICA"
    assert body["events"][0]["session_key"] == 9472
    assert body["season"] == 2024


def test_year_events_route_falls_back_to_local(client, monkeypatch):
    def boom(year, data):
        raise RuntimeError("down")

    monkeypatch.setattr(catalog, "list_events", boom)
    body = client.get("/api/seasons/2024/events").json()
    assert body["source"] == "LOCAL"
    assert len(body["events"]) == 24
    assert all(event["ingested"] for event in body["events"])


def test_year_events_rejects_out_of_range_year(client):
    assert client.get("/api/seasons/1900/events").status_code == 422


def test_year_events_non_integer_year_is_422(client):
    assert client.get("/api/seasons/abc/events").status_code == 422


def test_capabilities_route_passthrough(client, monkeypatch):
    report = CapabilityReport(
        season=2024,
        round=12,
        event_name="British Grand Prix",
        session_name="Race",
        ingested=True,
        session_key=KEY,
        channels={"TIMING": "AVAILABLE", "LIVE": "NOT_SUPPORTED"},
        data_mode="REPLAY",
    )
    monkeypatch.setattr(catalog, "capabilities_for", lambda *args: report)
    body = client.get("/api/seasons/2024/rounds/12/capabilities").json()
    assert body["data_mode"] == "REPLAY"
    assert body["channels"]["LIVE"] == "NOT_SUPPORTED"


def test_capabilities_route_maps_upstream_errors_to_502(client, monkeypatch):
    def boom(*args):
        raise RuntimeError("provider down")

    monkeypatch.setattr(catalog, "capabilities_for", boom)
    response = client.get("/api/seasons/2024/rounds/12/capabilities")
    assert response.status_code == 502
    assert "Capability report unavailable" in response.json()["detail"]


def test_capabilities_route_validates_round(client):
    assert client.get("/api/seasons/2024/rounds/abc/capabilities").status_code == 422


def test_capabilities_route_matches_requested_session_type(client, monkeypatch):
    events = [
        EventSummary(
            season=2023,
            round=6,
            event_name="Monaco Grand Prix",
            circuit_name="Circuit de Monaco",
            country="Monaco",
            locality="Monte Carlo",
            date_start="2023-05-28T13:00:00+00:00",
        )
    ]
    monkeypatch.setattr(catalog.jolpica, "fetch_events", lambda year: events)
    body = client.get(
        "/api/seasons/2023/rounds/6/capabilities", params={"session": "Race"}
    ).json()
    assert body["session_key"] == 9094


def test_session_state_works_for_every_ingested_session(client):
    sessions = client.get("/api/sessions").json()
    for row in sessions:
        response = client.get(f"/api/session/{row['session_key']}/state", params={"t": 0})
        assert response.status_code == 200, row["session_key"]


@pytest.mark.parametrize("session_key", [7779, 9090, 9506, 9558, 10014])
def test_engines_work_for_live_sample_sessions(client, session_key):
    for endpoint in ("intelligence", "strategy"):
        response = client.get(f"/api/session/{session_key}/{endpoint}")
        assert response.status_code == 200, (session_key, endpoint)


def test_race_control_dates_are_iso_parsable(client):
    for row in client.get(f"/api/session/{KEY}/race-control").json():
        datetime.fromisoformat(row["date"])


def test_disallowed_cors_origin_gets_no_allow_header(client):
    response = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_security_headers_are_present(client):
    response = client.get("/api/health")
    for header in (
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "permissions-policy",
        "strict-transport-security",
    ):
        assert header in response.headers
    assert response.headers["x-content-type-options"] == "nosniff"


def test_engine_endpoint_does_not_error(client):
    response = client.get("/api/session/10014/driver-lab")
    assert response.status_code == 200
    assert "Traceback" not in response.text


def test_response_is_utf8_json(client):
    response = client.get("/api/sessions")
    assert json.loads(response.content.decode("utf-8"))
