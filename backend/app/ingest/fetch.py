"""Fetch raw source payloads into backend/cache/<session_key>/.

Usage (from backend/):
    .venv/bin/python -m app.ingest.fetch [--session 9558] [--force] [--no-tracking]

--no-tracking skips per-driver location/car_data (the multi-MB pulls); session-level
data (laps/pit/stints/result/drivers/weather/radio/control) is always fetched and is
all the analytical engines need. Year/round/circuit_key are derived from the OpenF1
session + Jolpica calendar match, so any 2023+ session can be ingested.

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
    """GET JSON with retries. 404 means "no rows match the filter" on OpenF1.
    429 (rate limit) gets a longer, escalating backoff before giving up."""
    last_exc: httpx.HTTPStatusError | None = None
    for attempt in range(6):
        try:
            resp = client.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404 and empty_on_404:
                print(f"  404 (no rows) for {resp.url}", flush=True)
                return []
            if resp.status_code == 429:
                wait = min(30, 5 * (2**attempt))
                print(f"  429 rate-limited; backing off {wait}s ({resp.url})", flush=True)
                time.sleep(wait)
                continue
            last_exc = httpx.HTTPStatusError(
                f"HTTP {resp.status_code} for {resp.url}", request=resp.request, response=resp
            )
        except (httpx.HTTPError, RuntimeError) as exc:
            last_exc = exc  # type: ignore[assignment]
        time.sleep(2 * (attempt + 1))
    raise last_exc  # type: ignore[misc]


def _write(path: Path, payload: list | dict) -> None:
    path.write_text(json.dumps(payload, separators=(",", ":")))
    n = len(payload) if isinstance(payload, list) else 1
    print(f"  wrote {path.name}: {n} rows", flush=True)


def fetch_session(session_key: int, cache_dir: Path, force: bool, tracking: bool = True) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    with httpx.Client() as client:
        for endpoint in SESSION_ENDPOINTS:
            out = cache_dir / f"{endpoint}.json"
            if out.exists() and not force:
                print(f"  skip {endpoint} (cached)", flush=True)
                continue
            print(f"  GET {endpoint}?session_key={session_key}", flush=True)
            payload = _get(
                client,
                f"{OPENF1}/{endpoint}",
                {"session_key": session_key},
                empty_on_404=True,
            )
            _write(out, payload)

        drivers = json.loads((cache_dir / "drivers.json").read_text())
        numbers = sorted({d["driver_number"] for d in drivers})

        meta = _session_meta(cache_dir, session_key)
        year = meta["year"]
        short = meta["short"]
        circuit_key = meta["circuit_key"]
        rnd = meta["round"]

        out = cache_dir / "intervals_all.json"
        if out.exists() and not force:
            print("  skip intervals (cached)", flush=True)
        else:
            combined: list[dict] = []
            for n in numbers:
                print(f"  GET intervals?session_key={session_key}&driver_number={n}", flush=True)
                try:
                    rows = _get(
                        client,
                        f"{OPENF1}/intervals",
                        {"session_key": session_key, "driver_number": n},
                        empty_on_404=True,
                    )
                except Exception as exc:  # noqa: BLE001 - intervals are optional; don't fail the session
                    print(f"  intervals skipped for {n}: {exc}", flush=True)
                    rows = []
                combined.extend(rows)
                time.sleep(0.4)
            _write(out, combined)

        # Per-driver location + car_data are the large tracking pulls. Skipped
        # with --no-tracking; engines (intelligence/strategy/labs) only need
        # session-level data (laps/pit/stints/result), which is always fetched.
        if tracking:
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

        # Starting grid: Jolpica qualifying for (year, round) derived from the
        # fetched OpenF1 session + calendar match (was hardcoded to 2024/12).
        # Skipped when the round couldn't be matched (e.g. some sprint weekends)
        # — the grid is then honestly absent rather than a bogus URL.
        if rnd is None:
            print("  skip jolpica qualifying (round unmatched)", flush=True)
        else:
            out = cache_dir / f"jolpica_qualifying_r{rnd}.json"
            if out.exists() and not force:
                print("  skip jolpica qualifying (cached)", flush=True)
            else:
                print(f"  GET Jolpica /{year}/{rnd}/qualifying.json", flush=True)
                _write(out, _get(client, f"{JOLPICA}/{year}/{rnd}/qualifying.json"))

        # Circuit metadata: MultiViewer (corners, pit loss). circuit_key + year
        # derived from the OpenF1 session (was hardcoded to circuits/2/2024).
        if circuit_key is None:
            print("  skip multiviewer circuit (circuit_key missing)", flush=True)
        else:
            out = cache_dir / f"mv_circuit_{circuit_key}_{year}.json"
            if out.exists() and not force:
                print("  skip multiviewer circuit (cached)", flush=True)
            else:
                print(f"  GET MultiViewer /circuits/{circuit_key}/{year} ({short})", flush=True)
                _write(out, _get(client, f"{MULTIVIEWER}/circuits/{circuit_key}/{year}"))


def _session_meta(cache_dir: Path, session_key: int) -> dict:
    """Derive year, circuit_key, Jolpica round, and match key for a session.

    Reads the OpenF1 session already fetched into the cache, then matches the
    Jolpica calendar for that year by country (OpenF1 country_name) to get the
    round. Returns the flagship's known values (2024/12/Silverstone) as a
    fallback when the session isn't resolvable.
    """
    try:
        rows = json.loads((cache_dir / "sessions.json").read_text())
        row = next(r for r in rows if r.get("session_key") == session_key)
        year = int(row["year"])
        circuit_key = int(row["circuit_key"])
        short = str(row.get("circuit_short_name") or "").lower()
        country = str(row.get("country_name") or row.get("location") or short).lower()
    except (OSError, ValueError, StopIteration, KeyError):
        return {"year": 2024, "round": 12, "circuit_key": 2, "short": "Silverstone"}

    rnd = _match_round(year, country)
    return {"year": year, "round": rnd, "circuit_key": circuit_key, "short": short}


def _match_round(year: int, match_key: str) -> int | None:
    """Find the Jolpica round for a session by country/circuit name within a year."""
    if not match_key:
        return None
    try:
        with httpx.Client() as client:
            races = _get(client, f"{JOLPICA}/{year}/races.json", {"limit": 100}, empty_on_404=True)
        for race in (races.get("MRData", {}).get("RaceTable", {}).get("Races", []) if isinstance(races, dict) else []):
            circuit = race.get("Circuit", {})
            loc = circuit.get("Location", {})
            candidates = [
                str(loc.get("country", "")).lower(),
                str(circuit.get("circuitId", "")).lower(),
                str(circuit.get("circuitName", "")).lower(),
                str(race.get("raceName", "")).lower(),
            ]
            if any(match_key == c or match_key in c for c in candidates if c):
                return int(race["round"])
    except Exception:  # noqa: BLE001 - round derivation is best-effort
        return None
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=int, default=9558)
    parser.add_argument("--force", action="store_true", help="refetch even if cached")
    parser.add_argument(
        "--no-tracking",
        action="store_true",
        help="skip per-driver location/car_data (session-level data still fetched; powers all engines)",
    )
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[2]
    cache_dir = backend_dir / "cache" / str(args.session)
    started = time.time()
    print(f"Fetching session {args.session} → {cache_dir}", flush=True)
    try:
        fetch_session(args.session, cache_dir, args.force, tracking=not args.no_tracking)
    except Exception as exc:  # noqa: BLE001 - CLI boundary
        print(f"FETCH FAILED after {time.time() - started:.0f}s: {exc}", file=sys.stderr)
        return 1
    print(f"Done in {time.time() - started:.0f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
