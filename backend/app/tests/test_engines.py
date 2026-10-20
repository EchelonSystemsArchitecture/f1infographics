"""Feature engines: Strategy, Driver Lab, Constructor Lab, Prediction, Diagnostics.

Integration tests against the flagship session (skipped when not ingested) plus
honesty assertions (Prediction is SIMULATION, never LIVE).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.driver_lab import build_constructor_lab, build_driver_lab
from app.prediction import build_prediction
from app.session_store import clear_cache
from app.strategy import build_strategy

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
KEY = 9558


def _have() -> bool:
    return (DATA_DIR / str(KEY) / "session_result.json").exists()


@pytest.fixture(autouse=True)
def _fresh_cache():
    clear_cache()
    yield
    clear_cache()


@pytest.mark.skipif(not _have(), reason="flagship not ingested")
def test_strategy_engine():
    lab = build_strategy(DATA_DIR, KEY)
    assert lab.session_key == KEY
    assert lab.data_mode == "REPLAY"
    assert len(lab.drivers) > 0
    d = lab.drivers[0]
    assert d.stints  # every strategy driver has stints
    assert all(s.lap_end >= s.lap_start for s in d.stints)
    assert lab.most_common_stops is not None


@pytest.mark.skipif(not _have(), reason="flagship not ingested")
def test_driver_lab_engine():
    lab = build_driver_lab(DATA_DIR, KEY)
    assert lab.data_mode == "REPLAY"
    # Winner is P1.
    assert lab.drivers[0].finish == 1
    for row in lab.drivers:
        assert row.pits >= 0
        if row.best_lap_ms is not None:
            assert row.best_lap_ms > 0
            assert row.avg_lap_ms is None or row.avg_lap_ms >= row.best_lap_ms


@pytest.mark.skipif(not _have(), reason="flagship not ingested")
def test_constructor_lab_engine():
    lab = build_constructor_lab(DATA_DIR, KEY)
    assert lab.data_mode == "REPLAY"
    assert len(lab.constructors) > 0
    # Points sorted descending.
    pts = [c.points for c in lab.constructors]
    assert pts == sorted(pts, reverse=True)
    top = lab.constructors[0]
    assert top.points > 0


@pytest.mark.skipif(not _have(), reason="flagship not ingested")
def test_prediction_is_simulation_not_live():
    pred = build_prediction(DATA_DIR, KEY)
    assert pred.data_mode == "SIMULATION"  # never LIVE
    assert pred.entries
    assert "baseline_mae" in pred.accuracy_vs_baseline
    assert "model_mae" in pred.accuracy_vs_baseline
    # Predicted finishes are 1..n distinct.
    finishes = [e.predicted_finish for e in pred.entries]
    assert sorted(finishes) == list(range(1, len(finishes) + 1))
    # Every entry's actual finish matches the driver's known finish.
    lab = build_driver_lab(DATA_DIR, KEY)
    actual = {r.driver_number: r.finish for r in lab.drivers}
    for e in pred.entries:
        assert e.actual_finish == actual[e.driver_number]


def test_diagnostics_endpoint_shape():
    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    res = client.get("/api/diagnostics", params={"session_key": KEY} if _have() else {})
    assert res.status_code == 200
    body = res.json()
    assert "ingested_sessions" in body
    assert "session_store" in body
    assert body["data_mode"] == "REPLAY"
