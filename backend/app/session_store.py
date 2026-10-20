"""In-memory, pre-indexed cache of a session's normalized datasets.

Parsing locations.json (3.1 MB) + intervals.json (538 KB) on every /state
request cost ~130–155 ms (measured, see docs/REPOSITORY_AUDIT.md). This module
loads + parses each session's JSON exactly once, precomputes every timestamp as
a float (removing per-request datetime parsing of ~1200 laps + all race-control
events), and caches the result. Subsequent state_at calls are pure in-memory
bisect lookups.

The cache is bounded (LRU-ish) and thread-safe; FastAPI may serve concurrent
requests on worker threads.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .state import StateIndex, build_index

_MAX_SESSIONS = 8


@dataclass(frozen=True)
class SessionData:
    session_key: int
    date_start: datetime
    drivers: list[dict]
    positions: list[dict]
    intervals: list[dict]
    timing_base: list[dict]
    race_control: list[dict]
    locations: list[dict]
    index: StateIndex


_LOCK = threading.Lock()
_CACHE: dict[tuple[str, int], SessionData] = {}
_ORDER: list[tuple[str, int]] = []


def load_session_data(data_dir: Path, session_key: int) -> SessionData:
    key = (str(data_dir.resolve()), session_key)
    cached = _CACHE.get(key)
    if cached is not None:
        return cached

    with _LOCK:
        cached = _CACHE.get(key)
        if cached is not None:
            return cached

        def load(name: str):
            with (data_dir / str(session_key) / name).open() as f:
                return json.load(f)

        with (data_dir / "sessions.json").open() as f:
            sessions = json.load(f)
        session = next((s for s in sessions if s["session_key"] == session_key), None)
        if session is None:
            raise KeyError(f"Unknown session_key {session_key}")
        date_start = datetime.fromisoformat(session["date_start"])

        locations: list[dict] = []
        loc_path = data_dir / str(session_key) / "locations.json"
        if loc_path.exists():
            locations = load("locations.json")

        drivers = load("drivers.json")
        positions = load("positions.json")
        intervals = load("intervals.json")
        timing_base = load("timing_base.json")
        race_control = load("race_control.json")

        index = build_index(
            drivers=drivers,
            positions=positions,
            intervals=intervals,
            timing_base=timing_base,
            race_control=race_control,
            date_start=date_start,
            locations=locations,
        )

        data = SessionData(
            session_key=session_key,
            date_start=date_start,
            drivers=drivers,
            positions=positions,
            intervals=intervals,
            timing_base=timing_base,
            race_control=race_control,
            locations=locations,
            index=index,
        )

        _CACHE[key] = data
        _ORDER.append(key)
        while len(_ORDER) > _MAX_SESSIONS:
            evict = _ORDER.pop(0)
            _CACHE.pop(evict, None)
        return data


def cache_info() -> dict:
    with _LOCK:
        return {"sessions_cached": len(_CACHE), "max_sessions": _MAX_SESSIONS}


def load_dataset(data_dir: Path, session_key: int, name: str) -> list[dict]:
    """Load a small optional dataset (pit/stints/result/grid/…) as a list.

    Returns [] when the file is absent so engines degrade honestly instead of
    raising. Larger core datasets (drivers/positions/…) come from load_session_data.
    """
    path = data_dir / str(session_key) / name
    if not path.exists():
        return []
    with path.open() as f:
        return json.load(f)


def clear_cache() -> None:
    with _LOCK:
        _CACHE.clear()
        _ORDER.clear()
