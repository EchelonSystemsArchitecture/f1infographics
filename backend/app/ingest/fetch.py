"""Fetch raw source payloads into backend/cache/<session_key>/.

Usage (from backend/):
    .venv/bin/python -m app.ingest.fetch [--session 9558] [--force]

Resumable: existing cache files are skipped unless --force.
Build 2 scope: session-level OpenF1 endpoints + per-driver intervals/location
(Build 6 added per-driver car_data).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

OPENF1 = "https://api.openf1.org/v1"
JOLPICA = "https://api.jolpi.ca/ergast/f1"
MULTIVIEWER = "https://api.multiviewer.app/api/v1"

# OpenF1 endpoints that answer with a full-session query.
SESSION_ENDPOINTS = [
    "sessions",
    "drivers",
    "laps",
    "position",
    "pit",
    "stints",
    "race_control",
    "overtakes",
    "session_result",
    "team_radio",
    "weather",
]

TIMEOUT = 60.0


def _get(
    client: httpx.Client,
    url: str,
    params: dict | None = None,
    *,
    empty_on_404: bool = False,
) -> list | dict:
    """GET JSON with 3 retries. 404 means "no rows match the filter" on OpenF1."""
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            resp = client.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404 and empty_on_404:
                print(f"  404 (no rows) for {resp.url}", flush=True)
                return []
            last_exc = RuntimeError(f"HTTP {resp.status_code} for {resp.url}")
        except (httpx.HTTPError, RuntimeError) as exc:
            last_exc = exc
        time.sleep(2 * (attempt + 1))
    raise last_exc  # type: ignore[misc]


def _write(path: Path, payload: list | dict) -> None:
    path.write_text(json.dumps(payload, separators=(",", ":")))
    n = len(payload) if isinstance(payload, list) else 1
    print(f"  wrote {path.name}: {n} rows", flush=True)


def fetch_session(session_key: int, cache_dir: Path, force: bool) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    with httpx.Client() as client:
        for endpoint in SESSION_ENDPOINTS:
            out = cache_dir / f"{endpoint}.json"
            if out.exists() and not force:
                print(f"  skip {endpoint} (cached)", flush=True)
                continue
            print(f"  GET {endpoint}?session_key={session_key}", flush=True)
            payload = _get(client, f"{OPENF1}/{endpoint}", {"session_key": session_key})
            _write(out, payload)

        drivers = json.loads((cache_dir / "drivers.json").read_text())
        numbers = sorted({d["driver_number"] for d in drivers})

        out = cache_dir / "intervals_all.json"
        if out.exists() and not force:
            print("  skip intervals (cached)", flush=True)
        else:
            combined: list[dict] = []
            for n in numbers:
                print(f"  GET intervals?session_key={session_key}&driver_number={n}", flush=True)
                rows = _get(
                    client,
                    f"{OPENF1}/intervals",
                    {"session_key": session_key, "driver_number": n},
                    empty_on_404=True,
                )
                combined.extend(rows)
            _write(out, combined)

        # Per-driver location (~2 Hz x/y/z). ~3 MB/driver, 19 drivers → ~68 MB raw.
        # Kept as one file per driver so the pull is resumable mid-way.
        loc_dir = cache_dir / "location"
        loc_dir.mkdir(exist_ok=True)
        for n in numbers:
            loc_out = loc_dir / f"location_{n}.json"
            if loc_out.exists() and not force:
                print(f"  skip location {n} (cached)", flush=True)
                continue
            print(f"  GET location?session_key={session_key}&driver_number={n}", flush=True)
            rows = _get(
                client,
                f"{OPENF1}/location",
                {"session_key": session_key, "driver_number": n},
                empty_on_404=True,
            )
            _write(loc_out, rows)

        # Per-driver car_data (~6 Hz: speed/throttle/brake/drs/rpm/n_gear).
        # ~1.6 MB/driver, 20 drivers → ~32 MB raw. One file per driver so the
        # pull is resumable mid-way (ADR-001: always per-driver).
        car_dir = cache_dir / "car_data"
        car_dir.mkdir(exist_ok=True)
        for n in numbers:
            car_out = car_dir / f"car_data_{n}.json"
            if car_out.exists() and not force:
                print(f"  skip car_data {n} (cached)", flush=True)
                continue
            print(f"  GET car_data?session_key={session_key}&driver_number={n}", flush=True)
            rows = _get(
                client,
                f"{OPENF1}/car_data",
                {"session_key": session_key, "driver_number": n},
                empty_on_404=True,
            )
            _write(car_out, rows)

        # Starting grid: Jolpica qualifying (round 12 = 2024 British GP, verified).
        out = cache_dir / "jolpica_qualifying_r12.json"
        if out.exists() and not force:
            print("  skip jolpica qualifying (cached)", flush=True)
        else:
            print("  GET Jolpica /2024/12/qualifying.json", flush=True)
            _write(out, _get(client, f"{JOLPICA}/2024/12/qualifying.json"))

        # Circuit metadata: MultiViewer (corners, pit loss). circuit_key 2 = Silverstone.
        out = cache_dir / "mv_circuit_2_2024.json"
        if out.exists() and not force:
            print("  skip multiviewer circuit (cached)", flush=True)
        else:
            print("  GET MultiViewer /circuits/2/2024", flush=True)
            _write(out, _get(client, f"{MULTIVIEWER}/circuits/2/2024"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=int, default=9558)
    parser.add_argument("--force", action="store_true", help="refetch even if cached")
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[2]
    cache_dir = backend_dir / "cache" / str(args.session)
    started = time.time()
    print(f"Fetching session {args.session} → {cache_dir}", flush=True)
    try:
        fetch_session(args.session, cache_dir, args.force)
    except Exception as exc:  # noqa: BLE001 - CLI boundary
        print(f"FETCH FAILED after {time.time() - started:.0f}s: {exc}", file=sys.stderr)
        return 1
    print(f"Done in {time.time() - started:.0f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
