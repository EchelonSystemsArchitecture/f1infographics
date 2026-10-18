"""Normalize backend/cache/<session_key>/ into backend/data/ datasets.

Usage (from backend/):
    .venv/bin/python -m app.ingest.normalize [--session 9558]

Outputs (matches main.py + contracts.py):
    data/sessions.json                  [SessionInfo] with data_mode="REPLAY"
    data/<key>/drivers.json             Driver rows
    data/<key>/race_control.json        RaceControlEvent rows
    data/<key>/timing_base.json         per-driver laps joined with stint compound/tyre_age
    data/<key>/positions.json           per-driver position change-points
    data/<key>/intervals.json           per-driver downsampled [t, gap_to_leader, interval]
    data/<key>/grid.json                starting grid from Jolpica qualifying
    data/<key>/circuit.json             corners + path polyline + pit-loss from MultiViewer
    data/<key>/locations.json           per-driver downsampled [t, x, y] car positions
    data/<key>/session_result.json      final classification
    data/<key>/weather.json             weather samples
    data/<key>/pit.json                 pit stops
    data/<key>/stints.json              tyre stints
    data/<key>/overtakes.json           overtake events
    data/<key>/team_radio.json          team radio index

All t values are seconds since the session's date_start (UTC).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

# Keep an interval sample when >= this many seconds elapsed since the last
# kept sample OR the gap-to-leader moved by >= 0.1 s (whichever comes first).
INTERVAL_MIN_SECONDS = 1.0
INTERVAL_MIN_GAP_DELTA = 0.1

# Location samples are ~2 Hz; keep one every LOCATION_MIN_SECONDS so a full
# 52-lap race stays ~1 s resolution (~33.9k × 19 drivers → ~104k triples ≈ 1.9 MB).
LOCATION_MIN_SECONDS = 1.0

# Circuit path polyline: keep every Nth MultiViewer point (916 → ~230 pts).
CIRCUIT_PATH_STRIDE = 4

_SESSION_STRIP = {"is_cancelled"}
_DRIVER_STRIP = {"meeting_key", "session_key", "country_code"}
_RC_STRIP = {"meeting_key", "session_key", "qualifying_phase", "scope", "sector"}
_WEATHER_STRIP = {"meeting_key", "session_key"}
_PIT_STRIP = {"meeting_key", "session_key"}
_STINT_STRIP = {"meeting_key", "session_key"}
_OVERTAKE_STRIP = {"meeting_key", "session_key"}
_RADIO_STRIP = {"meeting_key", "session_key"}
_RESULT_STRIP = {"meeting_key", "session_key"}


def _load(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Missing cache file: {path}")
    with path.open() as f:
        return json.load(f)


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(payload, f, separators=(",", ":"))
    n = len(payload) if isinstance(payload, list) else 1
    print(f"  wrote {path.name}: {n} rows", flush=True)


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _t(date_start: datetime, stamp: str) -> float:
    return (_parse_ts(stamp) - date_start).total_seconds()


def _strip(row: dict, keys: set[str]) -> dict:
    return {k: v for k, v in row.items() if k not in keys}


def normalize_session(cache_dir: Path, data_dir: Path) -> None:
    sessions = _load(cache_dir / "sessions.json")
    session = sessions[0]
    date_start = _parse_ts(session["date_start"])
    sk = session["session_key"]

    _write(
        data_dir / "sessions.json",
        [dict(_strip(s, _SESSION_STRIP), data_mode="REPLAY") for s in sessions],
    )

    _write(
        data_dir / str(sk) / "drivers.json",
        [_strip(d, _DRIVER_STRIP) for d in _load(cache_dir / "drivers.json")],
    )

    _write(
        data_dir / str(sk) / "race_control.json",
        [
            dict(_strip(r, _RC_STRIP), data_mode="REPLAY")
            for r in _load(cache_dir / "race_control.json")
        ],
    )

    laps = _load(cache_dir / "laps.json")
    stints = _load(cache_dir / "stints.json")
    _write(data_dir / str(sk) / "timing_base.json", _build_timing_base(laps, stints))

    position = _load(cache_dir / "position.json")
    _write(data_dir / str(sk) / "positions.json", _build_positions(position, date_start))

    intervals = _load(cache_dir / "intervals_all.json")
    _write(
        data_dir / str(sk) / "intervals.json",
        _build_intervals(intervals, date_start),
    )

    _write(data_dir / str(sk) / "grid.json", _build_grid(cache_dir))

    _write(data_dir / str(sk) / "circuit.json", _build_circuit(cache_dir))

    _write(
        data_dir / str(sk) / "locations.json",
        _build_locations(cache_dir, date_start),
    )

    for endpoint, strip_keys in [
        ("session_result", _RESULT_STRIP),
        ("weather", _WEATHER_STRIP),
        ("pit", _PIT_STRIP),
        ("stints", _STINT_STRIP),
        ("overtakes", _OVERTAKE_STRIP),
        ("team_radio", _RADIO_STRIP),
    ]:
        _write(
            data_dir / str(sk) / f"{endpoint}.json",
            [_strip(r, strip_keys) for r in _load(cache_dir / f"{endpoint}.json")],
        )


def _build_timing_base(laps: list[dict], stints: list[dict]) -> list[dict]:
    """Per-driver laps enriched with stint compound + tyre age at that lap."""
    by_driver: dict[int, list[dict]] = {}
    for lap in laps:
        st = _stint_for(lap["driver_number"], lap["lap_number"], stints)
        by_driver.setdefault(lap["driver_number"], []).append(
            {
                "lap_number": lap["lap_number"],
                "date_start": lap["date_start"],
                "lap_duration": lap["lap_duration"],
                "is_pit_out_lap": lap["is_pit_out_lap"],
                "compound": st["compound"] if st else None,
                "tyre_age": (
                    st["tyre_age_at_start"] + (lap["lap_number"] - st["lap_start"])
                    if st
                    else None
                ),
            }
        )
    out: list[dict] = []
    for number in sorted(by_driver):
        rows = sorted(by_driver[number], key=lambda r: r["lap_number"])
        out.append({"driver_number": number, "laps": rows})
    return out


def _stint_for(driver: int, lap_number: int, stints: list[dict]) -> dict | None:
    for st in stints:
        if st["lap_start"] is None or st["lap_end"] is None:
            continue  # DNS/DSQ stints have no lap bounds
        if (
            st["driver_number"] == driver
            and st["lap_start"] <= lap_number <= st["lap_end"]
        ):
            return st
    return None


def _build_positions(position: list[dict], date_start: datetime) -> list[dict]:
    by_driver: dict[int, list[dict]] = {}
    for row in position:
        by_driver.setdefault(row["driver_number"], []).append(row)
    out: list[dict] = []
    for number in sorted(by_driver):
        rows = sorted(by_driver[number], key=lambda r: r["date"])
        samples: list[list] = []
        last_pos: int | None = None
        for row in rows:
            if row["position"] != last_pos:
                samples.append([round(_t(date_start, row["date"]), 3), row["position"]])
                last_pos = row["position"]
        out.append({"driver_number": number, "samples": samples})
    return out


def _build_intervals(intervals: list[dict], date_start: datetime) -> list[dict]:
    by_driver: dict[int, list[dict]] = {}
    for row in intervals:
        by_driver.setdefault(row["driver_number"], []).append(row)
    out: list[dict] = []
    for number in sorted(by_driver):
        rows = sorted(by_driver[number], key=lambda r: r["date"])
        samples: list[list] = []
        last_t: float | None = None
        last_gap: float | None = None
        for row in rows:
            t = round(_t(date_start, row["date"]), 3)
            gap = row["gap_to_leader"]
            keep = last_t is None or (t - last_t) >= INTERVAL_MIN_SECONDS or (
                last_gap is not None
                and gap is not None
                and abs(gap - last_gap) >= INTERVAL_MIN_GAP_DELTA
            )
            if keep:
                samples.append([t, gap, row["interval"]])
                last_t = t
                last_gap = gap
        out.append({"driver_number": number, "samples": samples})
    return out


def _build_grid(cache_dir: Path) -> list[dict]:
    mr = _load(cache_dir / "jolpica_qualifying_r12.json")["MRData"]
    results = mr["RaceTable"]["Races"][0]["QualifyingResults"]
    grid: list[dict] = []
    for r in results:
        grid.append(
            {
                "position": int(r["position"]),
                "driver_number": int(r["number"]),
                "name_acronym": r["Driver"]["code"],
                "constructor": r["Constructor"]["name"],
                "q1": r.get("Q1"),
                "q2": r.get("Q2"),
                "q3": r.get("Q3"),
            }
        )
    grid.sort(key=lambda g: g["position"])
    return grid


def _build_circuit(cache_dir: Path) -> dict:
    mv = _load(cache_dir / "mv_circuit_2_2024.json")
    corners = [
        {
            "number": c["number"],
            "angle": c["angle"],
            "x": c["trackPosition"]["x"],
            "y": c["trackPosition"]["y"],
        }
        for c in mv["corners"]
    ]
    corners.sort(key=lambda c: c["number"])
    pit = mv["pitLoss"]
    # Real track outline from MultiViewer's racing-line polyline, strided down.
    xs = [round(float(v), 1) for v in mv["x"][::CIRCUIT_PATH_STRIDE]]
    ys = [round(float(v), 1) for v in mv["y"][::CIRCUIT_PATH_STRIDE]]
    # Close the loop so the path draws end-to-start.
    if xs and (xs[0] != xs[-1] or ys[0] != ys[-1]):
        xs.append(xs[0])
        ys.append(ys[0])
    return {
        "circuit_key": mv["circuitKey"],
        "circuit_name": mv["circuitName"],
        "rotation": mv.get("rotation"),
        "path": {"x": xs, "y": ys},
        "corners": corners,
        "pit_loss": {
            "normal": float(pit["normal"]),
            "sc": float(pit["sc"]),
            "vsc": float(pit["vsc"]),
        },
    }


def _build_locations(cache_dir: Path, date_start: datetime) -> list[dict]:
    """Per-driver [t, x, y] samples downsampled to LOCATION_MIN_SECONDS.

    Coordinate space matches MultiViewer's path polyline (same circuit frame),
    so markers plot directly on circuit.json's path without a transform.
    """
    loc_dir = cache_dir / "location"
    if not loc_dir.is_dir():
        return []
    out: list[dict] = []
    for path in sorted(loc_dir.glob("location_*.json")):
        rows = _load(path)
        if not rows:
            continue  # e.g. driver 10 Gasly DNS — no location rows
        number = int(rows[0]["driver_number"])
        samples: list[list] = []
        last_t: float | None = None
        for row in sorted(rows, key=lambda r: r["date"]):
            t = round(_t(date_start, row["date"]), 3)
            if last_t is not None and (t - last_t) < LOCATION_MIN_SECONDS:
                continue
            samples.append([t, int(row["x"]), int(row["y"])])
            last_t = t
        if samples:
            out.append({"driver_number": number, "samples": samples})
    out.sort(key=lambda d: d["driver_number"])
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=int, default=9558)
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[2]
    cache_dir = backend_dir / "cache" / str(args.session)
    data_dir = backend_dir / "data"
    started = time.time()
    print(f"Normalizing session {args.session} → {data_dir}", flush=True)
    try:
        normalize_session(cache_dir, data_dir)
    except Exception as exc:  # noqa: BLE001 - CLI boundary
        print(f"NORMALIZE FAILED: {exc}", file=sys.stderr)
        return 1
    print(f"Done in {time.time() - started:.1f}s", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
