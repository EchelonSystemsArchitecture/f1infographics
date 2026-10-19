"""QA for the Battle Lab telemetry endpoint: selection, units, error paths."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

URL = "/api/session/9558/telemetry"


def test_best_lap_for_driver_44():
    r = client.get(URL, params={"drivers": "44"})
    assert r.status_code == 200
    body = r.json()
    assert body["session_key"] == 9558
    assert body["lap_selector"] == "best"
    assert body["grid_points"] == 180
    assert len(body["drivers"]) == 1
    lap = body["drivers"][0]["laps"][0]
    assert lap["lap_number"] == 45
    assert lap["duration"] == 89.438
    assert lap["is_pit_out_lap"] is False


def test_units_and_grid_shape():
    body = client.get(URL, params={"drivers": "44"}).json()
    assert abs(body["length_m"] - 5821.3) < 0.5
    lap = body["drivers"][0]["laps"][0]
    for channel in ("speed", "throttle", "brake"):
        assert len(lap[channel]) == 180
    assert all(v is None or isinstance(v, int) for v in lap["speed"])
    assert all(v is None or isinstance(v, int) for v in lap["throttle"])


def test_sd_is_ordered_and_inside_track_length():
    body = client.get(URL, params={"drivers": "44"}).json()
    lap = body["drivers"][0]["laps"][0]
    sd = lap["sd"]
    assert sd is not None
    assert 0 < sd[0] < sd[1] < body["length_m"]
    assert sd == [1811.3, 4235.3]


def test_sector_deltas_sum_to_duration():
    body = client.get(URL, params={"drivers": "44"}).json()
    lap = body["drivers"][0]["laps"][0]
    assert abs(sum(lap["sectors"]) - lap["duration"]) < 0.01


def test_explicit_lap_number():
    r = client.get(URL, params={"drivers": "44", "lap": "15"})
    assert r.status_code == 200
    body = r.json()
    assert body["lap_selector"] == "15"
    assert body["drivers"][0]["laps"][0]["lap_number"] == 15


def test_two_drivers_deduped_in_order():
    r = client.get(URL, params={"drivers": "63, 44,63"})
    assert r.status_code == 200
    nums = [d["driver_number"] for d in r.json()["drivers"]]
    assert nums == [63, 44]


def test_unknown_driver_404():
    r = client.get(URL, params={"drivers": "44,999"})
    assert r.status_code == 404
    assert r.json()["detail"] == "No telemetry for driver 999"


def test_driver_without_telemetry_404():
    r = client.get(URL, params={"drivers": "10"})
    assert r.status_code == 404
    assert r.json()["detail"] == "No telemetry for driver 10"


def test_missing_lap_404():
    r = client.get(URL, params={"drivers": "44", "lap": "999"})
    assert r.status_code == 404
    assert r.json()["detail"] == "Driver 44 has no lap 999"


def test_malformed_drivers_400():
    r = client.get(URL, params={"drivers": "44,fast"})
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid driver number: fast"


def test_empty_drivers_part_400():
    r = client.get(URL, params={"drivers": "44,,63"})
    assert r.status_code == 400


def test_bad_lap_selector_400():
    for value in ("abc", "0", "-3"):
        r = client.get(URL, params={"drivers": "44", "lap": value})
        assert r.status_code == 400
        assert r.json()["detail"] == "lap must be 'best' or a positive integer"


def test_missing_drivers_param_422():
    assert client.get(URL).status_code == 422


def test_non_flagship_session_404():
    assert client.get("/api/session/1/telemetry", params={"drivers": "44"}).status_code == 404
