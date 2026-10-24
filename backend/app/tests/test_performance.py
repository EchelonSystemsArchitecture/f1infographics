"""Optimization / performance regression tests.

Thresholds are deliberately generous (CI-safe) but tight enough to catch the
regressions these guard: re-parsing JSON per request, losing the precomputed
state index, unbounded payload growth, and missing transport compression.
"""

from __future__ import annotations

import gzip
import statistics
import time
import tracemalloc
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.session_store import cache_info, clear_cache, load_session_data
from app.state import build_state_at

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
KEY = 9558


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(round((pct / 100) * len(ordered))) - 1))
    return ordered[index]


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def indexed_session():
    clear_cache()
    start = time.perf_counter()
    data = load_session_data(DATA_DIR, KEY)
    cold_ms = (time.perf_counter() - start) * 1000
    yield data, cold_ms
    clear_cache()


def timed(fn, iterations: int) -> list[float]:
    values = []
    for _ in range(iterations):
        start = time.perf_counter()
        fn()
        values.append((time.perf_counter() - start) * 1000)
    return values


def state_call(data, t: float):
    return build_state_at(
        t=t,
        drivers=data.drivers,
        positions=data.positions,
        intervals=data.intervals,
        timing_base=data.timing_base,
        race_control=data.race_control,
        date_start=data.date_start,
        locations=data.locations,
        index=data.index,
    )


def test_cold_session_load_under_one_second(indexed_session):
    _, cold_ms = indexed_session
    assert cold_ms < 1000


def test_cold_load_is_a_one_time_cost(indexed_session):
    data, cold_ms = indexed_session
    start = time.perf_counter()
    again = load_session_data(DATA_DIR, KEY)
    warm_ms = (time.perf_counter() - start) * 1000
    assert again is data
    assert warm_ms < cold_ms / 5


def test_direct_state_reconstruction_p50(indexed_session):
    data, _ = indexed_session
    values = timed(lambda: state_call(data, 2400.0), 200)
    assert percentile(values, 50) < 2.0


def test_direct_state_reconstruction_p95(indexed_session):
    data, _ = indexed_session
    values = timed(lambda: state_call(data, 2400.0), 200)
    assert percentile(values, 95) < 5.0


def test_direct_state_reconstruction_max(indexed_session):
    data, _ = indexed_session
    values = timed(lambda: state_call(data, 2400.0), 100)
    assert max(values) < 25.0


def test_twenty_thousand_state_reconstructions_under_ten_seconds(indexed_session):
    data, _ = indexed_session
    start = time.perf_counter()
    for index in range(20_000):
        state_call(data, (index * 13) % 5400)
    elapsed = time.perf_counter() - start
    assert elapsed < 10.0


def test_indexed_state_is_at_least_twenty_times_faster_than_pure_path(indexed_session):
    data, _ = indexed_session

    def pure():
        build_state_at(
            t=2400.0,
            drivers=data.drivers,
            positions=data.positions,
            intervals=data.intervals,
            timing_base=data.timing_base,
            race_control=data.race_control,
            date_start=data.date_start,
            locations=data.locations,
        )

    indexed = statistics.median(timed(lambda: state_call(data, 2400.0), 20))
    unindexed = statistics.median(timed(pure, 20))
    assert unindexed > indexed * 20


def test_state_http_p95(client):
    client.get(f"/api/session/{KEY}/state", params={"t": 1000})
    values = timed(lambda: client.get(f"/api/session/{KEY}/state", params={"t": 1000}), 40)
    assert percentile(values, 95) < 50


def test_state_http_payload_stays_small(client):
    for t in (0, 1000, 3000, 5000):
        body = client.get(f"/api/session/{KEY}/state", params={"t": t}).content
        assert len(body) < 12_000


def test_sessions_payload_under_fifty_kilobytes(client):
    assert len(client.get("/api/sessions").content) < 50_000


def test_weather_payload_under_forty_kilobytes(client):
    assert len(client.get(f"/api/session/{KEY}/weather").content) < 40_000


def test_race_control_payload_under_forty_kilobytes(client):
    assert len(client.get(f"/api/session/{KEY}/race-control").content) < 40_000


def test_telemetry_single_driver_payload_under_ten_kilobytes(client):
    body = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"}).content
    assert len(body) < 10_000


def test_telemetry_twenty_drivers_payload_under_seventy_kilobytes(client):
    drivers = ",".join(
        str(row["driver_number"]) for row in client.get(f"/api/session/{KEY}/drivers").json()
    )
    body = client.get(f"/api/session/{KEY}/telemetry", params={"drivers": drivers}).content
    assert len(body) < 70_000


def test_json_payloads_compress_by_at_least_five_times(client):
    for path in ("/api/sessions", f"/api/session/{KEY}/weather", f"/api/session/{KEY}/race-control"):
        raw = client.get(path).content
        compressed = gzip.compress(raw)
        assert len(compressed) < len(raw) / 5


def test_api_does_not_send_compressed_responses(client):
    response = client.get(
        f"/api/session/{KEY}/weather", headers={"Accept-Encoding": "gzip, br"}
    )
    assert response.status_code == 200
    assert "content-encoding" not in response.headers


def test_api_sends_no_cache_control(client):
    response = client.get(f"/api/session/{KEY}/state", params={"t": 1000})
    assert "cache-control" not in response.headers
    assert "etag" not in response.headers


@pytest.mark.xfail(
    strict=True,
    reason="BUG-17: /telemetry re-parses the multi-megabyte JSON file on every request instead of using the session store",
)
def test_telemetry_http_p95_under_twenty_ms(client):
    client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"})
    values = timed(lambda: client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"}), 20)
    assert percentile(values, 95) < 20


def test_telemetry_is_currently_much_slower_than_state(client):
    client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"})
    client.get(f"/api/session/{KEY}/state", params={"t": 1000})
    telemetry = statistics.median(
        timed(lambda: client.get(f"/api/session/{KEY}/telemetry", params={"drivers": "44"}), 15)
    )
    state = statistics.median(
        timed(lambda: client.get(f"/api/session/{KEY}/state", params={"t": 1000}), 15)
    )
    assert telemetry > state * 2


def test_concurrent_state_reads_are_safe_and_fast(indexed_session):
    data, _ = indexed_session

    def work(index: int) -> int:
        return len(state_call(data, (index * 31) % 5400).timing)

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(work, range(400)))
    elapsed = time.perf_counter() - start
    assert elapsed < 5.0
    assert all(isinstance(value, int) for value in results)


def test_concurrent_http_state_requests_are_consistent(client):
    def work(index: int):
        response = client.get(f"/api/session/{KEY}/state", params={"t": 1000})
        return response.status_code, response.json()["current_lap"]

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(work, range(24)))
    assert all(status == 200 for status, _ in results)
    assert len({lap for _, lap in results}) == 1


def test_session_cache_reports_bounded_size(client):
    body = client.get("/api/diagnostics", params={"session_key": KEY}).json()
    assert body["session_store"]["max_sessions"] == 8
    assert 0 <= body["session_store"]["sessions_cached"] <= 8


def test_load_memory_stays_below_two_hundred_megabytes():
    clear_cache()
    tracemalloc.start()
    try:
        load_session_data(DATA_DIR, KEY)
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
        clear_cache()
    assert peak < 200 * 1024 * 1024


def test_index_size_is_bounded(indexed_session):
    data, _ = indexed_session
    counts = {
        "positions": sum(len(samples) for samples in data.index.pos_samples.values()),
        "intervals": sum(len(samples) for samples in data.index.int_samples.values()),
        "locations": sum(len(samples) for samples in data.index.loc_samples.values()),
        "laps": sum(len(laps) for laps in data.index.lap_entries.values()),
    }
    assert counts["positions"] < 1000
    assert counts["intervals"] < 100_000
    assert counts["locations"] < 200_000
    assert counts["laps"] < 2000


def test_sessions_route_repeat_latency_under_fifty_ms(client):
    client.get("/api/sessions")
    values = timed(lambda: client.get("/api/sessions"), 20)
    assert percentile(values, 95) < 50


def test_intelligence_route_latency_under_one_hundred_ms(client):
    client.get(f"/api/session/{KEY}/intelligence")
    values = timed(lambda: client.get(f"/api/session/{KEY}/intelligence"), 20)
    assert percentile(values, 95) < 100


def test_strategy_route_latency_under_one_hundred_ms(client):
    client.get(f"/api/session/{KEY}/strategy")
    values = timed(lambda: client.get(f"/api/session/{KEY}/strategy"), 20)
    assert percentile(values, 95) < 100


def test_driver_lab_route_latency_under_one_hundred_ms(client):
    client.get(f"/api/session/{KEY}/driver-lab")
    values = timed(lambda: client.get(f"/api/session/{KEY}/driver-lab"), 20)
    assert percentile(values, 95) < 100


def test_health_route_latency_under_twenty_ms(client):
    client.get("/api/health")
    values = timed(lambda: client.get("/api/health"), 20)
    assert percentile(values, 95) < 20


def test_diagnostics_payload_is_small(client):
    assert len(client.get("/api/diagnostics", params={"session_key": KEY}).content) < 2000


def test_cache_info_does_not_leak_session_data(client):
    body = client.get("/api/diagnostics").json()
    assert set(body["session_store"]) == {"sessions_cached", "max_sessions"}
