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
    data/<key>/telemetry.json           per-lap distance-binned speed/throttle/brake (G2.1)
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
from bisect import bisect_left
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

# G2.1 Battle Lab: fixed distance grid (~33 m/bin at Silverstone) per ADR-011.
TELEMETRY_GRID_POINTS = 180

# Spatial-hash cell size for path-segment candidate lookup (raw coordinate units).
PATH_CELL_SIZE = 60.0

# OpenF1/MultiViewer local frame is decimetres: path-units per metre measured as
# median(58213 units / integral of speed over 914 flying laps) = 10.04.
PATH_UNITS_PER_METRE = 10.0

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


def _merge_sessions(path: Path, incoming: list[dict]) -> list[dict]:
    """Upsert `incoming` into any existing sessions list, keyed by session_key.

    The catalog reads this single file for all ingested sessions, so normalizing
    a second session must not clobber the first.
    """
    existing: list[dict] = []
    if path.exists():
        try:
            existing = json.loads(path.read_text())
        except (OSError, ValueError):
            existing = []
    by_key = {int(s["session_key"]): s for s in existing if "session_key" in s}
    for s in incoming:
        if "session_key" in s:
            by_key[int(s["session_key"])] = s
    return [by_key[k] for k in sorted(by_key)]


def normalize_session(cache_dir: Path, data_dir: Path) -> None:
    sessions = _load(cache_dir / "sessions.json")
    session = sessions[0]
    date_start = _parse_ts(session["date_start"])
    sk = session["session_key"]

    _write(
        data_dir / "sessions.json",
        _merge_sessions(
            data_dir / "sessions.json",
            [dict(_strip(s, _SESSION_STRIP), data_mode="REPLAY") for s in sessions],
        ),
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

    circuit = _build_circuit(cache_dir)
    _write(data_dir / str(sk) / "circuit.json", circuit)

    locations = _build_locations(cache_dir, date_start)
    _write(data_dir / str(sk) / "locations.json", locations)

    _write(
        data_dir / str(sk) / "telemetry.json",
        _build_telemetry(cache_dir, date_start, sk, circuit["path"], locations, laps),
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
    qual = sorted(cache_dir.glob("jolpica_qualifying_r*.json"))
    if not qual:
        return []
    mr = _load(qual[0])["MRData"]
    results = mr["RaceTable"]["Races"][0].get("QualifyingResults", [])
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
    mvs = sorted(cache_dir.glob("mv_circuit_*.json"))
    if not mvs:
        return {"circuit_key": 0, "circuit_name": "Unknown", "rotation": None,
                "path": {"x": [], "y": []}, "corners": [],
                "pit_loss": {"normal": 0.0, "sc": 0.0, "vsc": 0.0}, "length_m": 0.0}
    mv = _load(mvs[0])
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
    segs, total = _path_geometry(xs, ys)
    cell_index = _path_cell_index(segs)
    for c in corners:
        raw_dist = _project_on_path(c["x"], c["y"], segs, cell_index)
        c["dist"] = round(raw_dist / PATH_UNITS_PER_METRE, 1)
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
        "length_m": round(total / PATH_UNITS_PER_METRE, 1),
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


def _path_geometry(xs: list[float], ys: list[float]) -> tuple[list[list[float]], float]:
    n = len(xs)
    if n > 1 and xs[0] == xs[-1] and ys[0] == ys[-1]:
        n -= 1
    segs: list[list[float]] = []
    total = 0.0
    for i in range(n):
        x1, y1 = xs[i], ys[i]
        x2, y2 = xs[(i + 1) % n], ys[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        length = (dx * dx + dy * dy) ** 0.5
        if length == 0.0:
            continue
        segs.append([x1, y1, dx, dy, total, total + length])
        total += length
    return segs, total


def _path_cell_index(segs: list[list[float]]) -> dict[tuple[int, int], list[int]]:
    index: dict[tuple[int, int], list[int]] = {}
    for i, (x1, y1, dx, dy, _s1, _s2) in enumerate(segs):
        xmin, xmax = sorted((x1, x1 + dx))
        ymin, ymax = sorted((y1, y1 + dy))
        for cx in range(int(xmin // PATH_CELL_SIZE), int(xmax // PATH_CELL_SIZE) + 1):
            for cy in range(int(ymin // PATH_CELL_SIZE), int(ymax // PATH_CELL_SIZE) + 1):
                index.setdefault((cx, cy), []).append(i)
    return index


def _project_on_path(
    px: float,
    py: float,
    segs: list[list[float]],
    index: dict[tuple[int, int], list[int]],
) -> float:
    cx, cy = int(px // PATH_CELL_SIZE), int(py // PATH_CELL_SIZE)
    candidates: set[int] = set()
    for gx in (cx - 1, cx, cx + 1):
        for gy in (cy - 1, cy, cy + 1):
            candidates.update(index.get((gx, gy), ()))
    if not candidates:
        candidates = set(range(len(segs)))
    best_d2: float | None = None
    best_s = 0.0
    for i in candidates:
        x1, y1, dx, dy, s1, s2 = segs[i]
        denom = dx * dx + dy * dy
        frac = ((px - x1) * dx + (py - y1) * dy) / denom
        frac = 0.0 if frac < 0.0 else (1.0 if frac > 1.0 else frac)
        qx, qy = x1 + frac * dx, y1 + frac * dy
        d2 = (px - qx) ** 2 + (py - qy) ** 2
        if best_d2 is None or d2 < best_d2:
            best_d2 = d2
            best_s = s1 + frac * (s2 - s1)
    return best_s


def _unwrap_distance(raw: list[float], length: float) -> list[float]:
    if not raw:
        return []
    out = [raw[0]]
    prev_raw = raw[0]
    for value in raw[1:]:
        delta = value - prev_raw
        delta -= length * round(delta / length)
        out.append(out[-1] + delta)
        prev_raw = value
    return out


def _lerp_series(t: list[float], values: list[float], tq: float) -> float:
    if tq <= t[0]:
        return values[0]
    if tq >= t[-1]:
        return values[-1]
    i = bisect_left(t, tq)
    t0, t1 = t[i - 1], t[i]
    if t1 == t0:
        return values[i]
    frac = (tq - t0) / (t1 - t0)
    return values[i - 1] + frac * (values[i] - values[i - 1])


def _bin_means(
    rows: list[dict],
    lo: int,
    hi: int,
    s_at: list[float],
    s_start: float,
    length: float,
) -> tuple[list[int | None], list[int | None], list[int | None]]:
    speed_sum = [0.0] * TELEMETRY_GRID_POINTS
    throttle_sum = [0.0] * TELEMETRY_GRID_POINTS
    brake_sum = [0.0] * TELEMETRY_GRID_POINTS
    speed_n = [0] * TELEMETRY_GRID_POINTS
    throttle_n = [0] * TELEMETRY_GRID_POINTS
    brake_n = [0] * TELEMETRY_GRID_POINTS
    for i in range(lo, hi):
        s_adj = (s_at[i] - s_start) % length
        b = int(s_adj / length * TELEMETRY_GRID_POINTS)
        if b >= TELEMETRY_GRID_POINTS:
            b = TELEMETRY_GRID_POINTS - 1
        speed = rows[i]["speed"]
        throttle = rows[i]["throttle"]
        brake = rows[i]["brake"]
        if speed is not None:
            speed_sum[b] += speed
            speed_n[b] += 1
        if throttle is not None:
            throttle_sum[b] += throttle
            throttle_n[b] += 1
        if brake is not None:
            brake_sum[b] += brake
            brake_n[b] += 1
    speed_out: list[int | None] = [
        round(speed_sum[b] / speed_n[b]) if speed_n[b] else None
        for b in range(TELEMETRY_GRID_POINTS)
    ]
    throttle_out: list[int | None] = [
        round(throttle_sum[b] / throttle_n[b]) if throttle_n[b] else None
        for b in range(TELEMETRY_GRID_POINTS)
    ]
    brake_out: list[int | None] = [
        round(brake_sum[b] / brake_n[b]) if brake_n[b] else None
        for b in range(TELEMETRY_GRID_POINTS)
    ]
    return speed_out, throttle_out, brake_out


def _build_telemetry(
    cache_dir: Path,
    date_start: datetime,
    session_key: int,
    path: dict,
    locations: list[dict],
    laps: list[dict],
) -> dict:
    segs, length = _path_geometry(path["x"], path["y"])
    if not segs or length <= 0:
        return {
            "session_key": session_key,
            "length_m": 0.0,
            "grid_points": TELEMETRY_GRID_POINTS,
            "drivers": [],
        }
    index = _path_cell_index(segs)
    loc_by_driver = {int(d["driver_number"]): d["samples"] for d in locations}
    laps_by_driver: dict[int, list[dict]] = {}
    for lap in laps:
        if lap.get("date_start") is None or lap.get("lap_duration") is None:
            continue
        laps_by_driver.setdefault(int(lap["driver_number"]), []).append(lap)

    drivers_out: list[dict] = []
    car_dir = cache_dir / "car_data"
    if car_dir.is_dir():
        for file in sorted(car_dir.glob("car_data_*.json")):
            rows = _load(file)
            if not rows:
                continue
            number = int(rows[0]["driver_number"])
            samples = loc_by_driver.get(number)
            if not samples:
                continue
            rows.sort(key=lambda r: r["date"])
            car_t = [_t(date_start, r["date"]) for r in rows]
            loc_t = [s[0] for s in samples]
            raw_s = [_project_on_path(s[1], s[2], segs, index) for s in samples]
            loc_s = _unwrap_distance(raw_s, length)
            s_at = [_lerp_series(loc_t, loc_s, ct) for ct in car_t]
            laps_out: list[dict] = []
            for lap in sorted(
                laps_by_driver.get(number, []), key=lambda r: r["lap_number"]
            ):
                t0 = _t(date_start, lap["date_start"])
                dur = float(lap["lap_duration"])
                d1 = lap.get("duration_sector_1")
                d2 = lap.get("duration_sector_2")
                d3 = lap.get("duration_sector_3")
                s_start = _lerp_series(loc_t, loc_s, t0)
                lo = bisect_left(car_t, t0)
                hi = bisect_left(car_t, t0 + dur)
                speed, throttle, brake = _bin_means(rows, lo, hi, s_at, s_start, length)
                sd: list[float] | None = None
                parts: list[float] = []
                if d1 is not None:
                    parts.append(
                        round(
                            (
                                (_lerp_series(loc_t, loc_s, t0 + float(d1)) - s_start)
                                % length
                            )
                            / PATH_UNITS_PER_METRE,
                            1,
                        )
                    )
                    if d2 is not None:
                        parts.append(
                            round(
                                (
                                    (
                                        _lerp_series(
                                            loc_t, loc_s, t0 + float(d1) + float(d2)
                                        )
                                        - s_start
                                    )
                                    % length
                                )
                                / PATH_UNITS_PER_METRE,
                                1,
                            )
                        )
                if parts:
                    sd = parts
                laps_out.append(
                    {
                        "lap_number": int(lap["lap_number"]),
                        "duration": round(dur, 3),
                        "sectors": [
                            None if d is None else round(float(d), 3)
                            for d in (d1, d2, d3)
                        ],
                        "is_pit_out_lap": bool(lap.get("is_pit_out_lap")),
                        "sd": sd,
                        "speed": speed,
                        "throttle": throttle,
                        "brake": brake,
                    }
                )
            if laps_out:
                drivers_out.append({"driver_number": number, "laps": laps_out})
    drivers_out.sort(key=lambda d: d["driver_number"])
    return {
        "session_key": session_key,
        "length_m": round(length / PATH_UNITS_PER_METRE, 1),
        "grid_points": TELEMETRY_GRID_POINTS,
        "drivers": drivers_out,
    }


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
