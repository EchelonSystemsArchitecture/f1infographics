"""Session store + indexed state reconstruction.

Guards the replay-lag fix: the precomputed index must produce byte-identical
StateAtTime to the pure (index-less) path, and the store must parse each
session's JSON only once.
"""

from __future__ import annotations

import time
from pathlib import Path

from app.session_store import clear_cache, load_session_data
from app.state import build_state_at

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SESSION_KEY = 9558


def _have_flagship() -> bool:
    return (DATA_DIR / str(SESSION_KEY) / "locations.json").exists()


def test_index_matches_pure_path():
    if not _have_flagship():
        import pytest

        pytest.skip("flagship session not ingested")
    clear_cache()
    data = load_session_data(DATA_DIR, SESSION_KEY)
    for t in (0.0, 120.0, 900.0, 2400.0, 5000.0, 8000.0):
        pure = build_state_at(
            t=t,
            drivers=data.drivers,
            positions=data.positions,
            intervals=data.intervals,
            timing_base=data.timing_base,
            race_control=data.race_control,
            date_start=data.date_start,
            locations=data.locations,
        )
        indexed = build_state_at(
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
        assert pure.model_dump() == indexed.model_dump()


def test_store_parses_once():
    if not _have_flagship():
        import pytest

        pytest.skip("flagship session not ingested")
    clear_cache()
    first = load_session_data(DATA_DIR, SESSION_KEY)
    second = load_session_data(DATA_DIR, SESSION_KEY)
    assert first is second


def test_indexed_state_is_fast():
    if not _have_flagship():
        import pytest

        pytest.skip("flagship session not ingested")
    clear_cache()
    data = load_session_data(DATA_DIR, SESSION_KEY)
    ts = [i * 97.0 for i in range(100)]
    start = time.perf_counter()
    for t in ts:
        build_state_at(
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
    per_call = (time.perf_counter() - start) / len(ts)
    # Generous CI-safe bound; measured ~0.45 ms locally (vs ~130 ms before fix).
    assert per_call < 0.02
