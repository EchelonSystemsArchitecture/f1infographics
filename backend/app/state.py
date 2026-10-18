"""Reconstruct session state at time t from normalized datasets.

All t values are seconds since session date_start (UTC), matching normalize.py.
Position and interval samples are change-points; we forward-fill them and report
stale_seconds (t - last sample) so consumers know how fresh each value is.
Compound/tyre_age come from the most recent lap that has already started.
Flag state (red/sc/vsc) is a scan of race-control messages up to t.
"""

from __future__ import annotations

from bisect import bisect_right
from datetime import datetime
from pathlib import Path

from .contracts import StateAtTime, TimingRow

# Intervals older than this are dropped rather than forward-filled.
INTERVAL_MAX_STALE_SECONDS = 30.0


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _fmt_gap(value: float | None) -> str | None:
    if value is None:
        return None
    return f"{value:.3f}"


def _last_at_or_before(samples: list[list[float]], t: float) -> tuple[list[float] | None, float]:
    """Return the last sample with sample[0] <= t and its timestamp, or (None, nan)."""
    times = [s[0] for s in samples]
    i = bisect_right(times, t) - 1
    if i < 0:
        return None, float("nan")
    return samples[i], samples[i][0]


def _flag_state(rc_events: list[dict], t: float, date_start: datetime) -> tuple[bool, bool, bool]:
    """Scan race-control events up to t. Returns (red_flag, vsc, sc)."""
    red = vsc = sc = False
    for e in rc_events:
        stamp = e.get("date")
        if not stamp or (_parse_ts(stamp) - date_start).total_seconds() > t:
            continue
        msg = (e.get("message") or "").upper()
        flag = (e.get("flag") or "").upper()
        if "RED FLAG" in msg or "RED LIGHT" in msg or flag == "RED":
            red = True
        elif red and ("GREEN" in msg or flag == "GREEN"):
            red = False
        if "VIRTUAL SAFETY CAR" in msg or "VSC" in msg:
            vsc = True
        elif "SAFETY CAR IN" in msg or ("SAFETY CAR" in msg and "VIRTUAL" not in msg and "ENDING" in msg):
            sc = False
            vsc = False
        elif "SAFETY CAR" in msg and "VIRTUAL" not in msg:
            sc = True
        elif sc and ("GREEN" in msg or flag == "GREEN"):
            sc = False
        elif vsc and "GREEN" in msg:
            vsc = False
    return red, vsc, sc


def build_state_at(
    t: float,
    drivers: list[dict],
    positions: list[dict],
    intervals: list[dict],
    timing_base: list[dict],
    race_control: list[dict],
    date_start: datetime,
) -> StateAtTime:
    by_num = {d["driver_number"]: d for d in drivers}
    pos_by_num = {p["driver_number"]: p["samples"] for p in positions}
    int_by_num = {i["driver_number"]: i["samples"] for i in intervals}

    # Current lap: the highest lap number whose start time is <= t across all drivers.
    current_lap: int | None = None
    # Per-driver most recent started lap for compound/tyre_age.
    lap_by_num: dict[int, dict] = {}
    for entry in timing_base:
        num = entry["driver_number"]
        best = None
        for lap in entry["laps"]:
            stamp = lap.get("date_start")
            if not stamp:
                continue  # e.g. DNS/DSQ placeholder laps have no timestamp
            if (_parse_ts(stamp) - date_start).total_seconds() <= t:
                best = lap
            else:
                break
        if best is not None:
            lap_by_num[num] = best
            if current_lap is None or best["lap_number"] > current_lap:
                current_lap = best["lap_number"]

    red_flag, vsc, sc = _flag_state(race_control, t, date_start)

    # Build a row per driver that has a position sample at or before t.
    rows: list[tuple[int, TimingRow]] = []
    for num, samples in pos_by_num.items():
        pos_sample, pos_t = _last_at_or_before(samples, t)
        if pos_sample is None:
            continue
        position = int(pos_sample[1])

        gap = interval = None
        stale = None
        samples_i = int_by_num.get(num)
        if samples_i:
            i_sample, i_t = _last_at_or_before(samples_i, t)
            if i_sample is not None and (t - i_t) <= INTERVAL_MAX_STALE_SECONDS:
                gap = i_sample[1]
                interval = i_sample[2] if len(i_sample) > 2 else None
                stale = round(t - i_t, 3)

        lap = lap_by_num.get(num)
        driver = by_num.get(num, {})
        rows.append(
            (
                position,
                TimingRow(
                    position=position,
                    driver_number=num,
                    name_acronym=driver.get("name_acronym", f"P{num}"),
                    team_colour=driver.get("team_colour", "888888"),
                    interval=_fmt_gap(interval),
                    gap_to_leader=_fmt_gap(gap),
                    last_lap_ms=int(lap["lap_duration"] * 1000) if lap and lap.get("lap_duration") else None,
                    compound=lap.get("compound") if lap else None,
                    tyre_age=lap.get("tyre_age") if lap else None,
                    stale_seconds=stale,
                ),
            )
        )

    rows.sort(key=lambda r: r[0])
    return StateAtTime(
        t_seconds=t,
        current_lap=current_lap,
        red_flag=red_flag,
        vsc=vsc,
        sc=sc,
        timing=[r[1] for r in rows],
        markers=[],  # CarMarker positions require car_data/location — Build 3.
        data_mode="REPLAY",
        marker_mode="ESTIMATE",
    )


def load_and_build_state(data_dir: Path, session_key: int, t: float) -> StateAtTime:
    import json

    def load(name: str):
        with (data_dir / str(session_key) / name).open() as f:
            return json.load(f)

    with (data_dir / "sessions.json").open() as f:
        sessions = json.load(f)
    session = next((s for s in sessions if s["session_key"] == session_key), None)
    if session is None:
        raise KeyError(f"Unknown session_key {session_key}")
    date_start = _parse_ts(session["date_start"])

    return build_state_at(
        t=t,
        drivers=load("drivers.json"),
        positions=load("positions.json"),
        intervals=load("intervals.json"),
        timing_base=load("timing_base.json"),
        race_control=load("race_control.json"),
        date_start=date_start,
    )
