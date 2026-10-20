"""Reconstruct session state at time t from normalized datasets.

All t values are seconds since session date_start (UTC), matching normalize.py.
Position and interval samples are change-points; we forward-fill them and report
stale_seconds (t - last sample) so consumers know how fresh each value is.
Compound/tyre_age come from the most recent lap that has already started.
Flag state (red/sc/vsc) is a scan of race-control messages up to t.
"""

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .contracts import CarMarker, StateAtTime, TimingRow

# Intervals older than this are dropped rather than forward-filled.
INTERVAL_MAX_STALE_SECONDS = 30.0

# Location samples are downsampled to ~1 Hz. Lerp between neighbours when the
# next sample is within this gap (smooth track), otherwise hold the last sample
# for LOCATION_MAX_STALE_SECONDS, then drop the driver from the map.
LOCATION_MAX_LERP_GAP_SECONDS = 2.0
LOCATION_MAX_STALE_SECONDS = 5.0
# Clock jitter may seek a hair before the first sample of the session.
LOCATION_LEAD_TOLERANCE_SECONDS = 2.0


@dataclass
class StateIndex:
    """Precomputed, float-time view of a session's datasets.

    All timestamps are seconds since date_start (UTC). Building this once per
    session removes per-request datetime parsing and O(n) times-array rebuilds.
    """

    pos_times: dict[int, list[float]]
    pos_samples: dict[int, list[list[float]]]
    int_times: dict[int, list[float]]
    int_samples: dict[int, list[list[float]]]
    loc_times: dict[int, list[float]]
    loc_samples: dict[int, list[list[float]]]
    lap_starts: dict[int, list[float]]
    lap_entries: dict[int, list[dict]]
    flag_events: list[tuple[float, str, str]]
    date_start: datetime


def _seconds(stamp: str, date_start: datetime) -> float:
    return (datetime.fromisoformat(stamp) - date_start).total_seconds()


def build_index(
    drivers: list[dict],
    positions: list[dict],
    intervals: list[dict],
    timing_base: list[dict],
    race_control: list[dict],
    date_start: datetime,
    locations: list[dict] | None = None,
) -> StateIndex:
    def index_samples(entries: list[dict]) -> tuple[dict[int, list[float]], dict[int, list[list[float]]]]:
        times: dict[int, list[float]] = {}
        samples: dict[int, list[list[float]]] = {}
        for entry in entries:
            num = entry["driver_number"]
            s = entry["samples"]
            samples[num] = s
            times[num] = [sample[0] for sample in s]
        return times, samples

    pos_times, pos_samples = index_samples(positions)
    int_times, int_samples = index_samples(intervals)
    loc_times, loc_samples = index_samples(locations or [])

    lap_starts: dict[int, list[float]] = {}
    lap_entries: dict[int, list[dict]] = {}
    for entry in timing_base:
        num = entry["driver_number"]
        starts: list[float] = []
        laps: list[dict] = []
        for lap in entry["laps"]:
            stamp = lap.get("date_start")
            if not stamp:
                continue  # DNS/DSQ placeholder laps have no timestamp
            starts.append(_seconds(stamp, date_start))
            laps.append(lap)
        lap_starts[num] = starts
        lap_entries[num] = laps

    flag_events: list[tuple[float, str, str]] = []
    for e in race_control:
        stamp = e.get("date")
        if not stamp:
            continue
        flag_events.append(
            (_seconds(stamp, date_start), (e.get("message") or "").upper(), (e.get("flag") or "").upper())
        )
    flag_events.sort(key=lambda ev: ev[0])

    return StateIndex(
        pos_times=pos_times,
        pos_samples=pos_samples,
        int_times=int_times,
        int_samples=int_samples,
        loc_times=loc_times,
        loc_samples=loc_samples,
        lap_starts=lap_starts,
        lap_entries=lap_entries,
        flag_events=flag_events,
        date_start=date_start,
    )


def _fmt_gap(value: float | str | None) -> str | None:
    # gap_to_leader is sometimes a literal like "+1 LAP"/"+2 LAPS" (lapped),
    # sometimes a float gap, sometimes null — pass strings through untouched.
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return f"{value:.3f}"


def _last_at_or_before(
    samples: list[list[float]], t: float, times: list[float] | None = None
) -> tuple[list[float] | None, float]:
    """Return the last sample with sample[0] <= t and its timestamp, or (None, nan)."""
    if times is None:
        times = [s[0] for s in samples]
    i = bisect_right(times, t) - 1
    if i < 0:
        return None, float("nan")
    return samples[i], samples[i][0]


def _marker_at(
    driver_number: int,
    samples: list[list[float]],
    t: float,
    times: list[float] | None = None,
) -> CarMarker | None:
    """Car marker for one driver's [t, x, y] samples at time t.

    Returns None when t is outside the driver's coverage: more than
    LOCATION_LEAD_TOLERANCE_SECONDS before the first sample, or more than
    LOCATION_MAX_STALE_SECONDS after the last sample (retired / no data).
    Exact sample hits and short stale holds report interpolated=False;
    positions lerped between neighbours report interpolated=True.
    """
    if not samples:
        return None
    if times is None:
        times = [s[0] for s in samples]
    i = bisect_right(times, t) - 1
    if i < 0:
        if (samples[0][0] - t) <= LOCATION_LEAD_TOLERANCE_SECONDS:
            s = samples[0]
            return CarMarker(
                driver_number=driver_number, x=float(s[1]), y=float(s[2]), interpolated=False
            )
        return None
    a = samples[i]
    if i + 1 < len(samples):
        b = samples[i + 1]
        gap = b[0] - a[0]
        if 0 < gap <= LOCATION_MAX_LERP_GAP_SECONDS and a[0] < t < b[0]:
            frac = (t - a[0]) / gap
            return CarMarker(
                driver_number=driver_number,
                x=float(a[1]) + (float(b[1]) - float(a[1])) * frac,
                y=float(a[2]) + (float(b[2]) - float(a[2])) * frac,
                interpolated=True,
            )
    if (t - a[0]) <= LOCATION_MAX_STALE_SECONDS:
        return CarMarker(
            driver_number=driver_number, x=float(a[1]), y=float(a[2]), interpolated=False
        )
    return None


def _flag_state(flag_events: list[tuple[float, str, str]], t: float) -> tuple[bool, bool, bool]:
    """Scan precomputed race-control events up to t. Returns (red_flag, vsc, sc)."""
    red = vsc = sc = False
    for stamp, msg, flag in flag_events:
        if stamp > t:
            break
        # "CHEQUERED FLAG" contains the substring "RED FLAG" — exclude it.
        is_red = flag == "RED" or "RED LIGHT" in msg or ("RED FLAG" in msg and "CHEQUERED" not in msg)
        if is_red:
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
    locations: list[dict] | None = None,
    index: StateIndex | None = None,
) -> StateAtTime:
    """Reconstruct session state at time t.

    When `index` (a precomputed StateIndex) is supplied, all timestamps are
    already floats and no datetime parsing or times-array rebuild occurs. When
    omitted (e.g. unit tests with synthetic data), an index is built on the fly
    so the pure path shares the exact same reconstruction logic.
    """
    if index is None:
        index = build_index(
            drivers=drivers,
            positions=positions,
            intervals=intervals,
            timing_base=timing_base,
            race_control=race_control,
            date_start=date_start,
            locations=locations,
        )

    by_num = {d["driver_number"]: d for d in drivers}

    # Current lap: the highest lap number whose start time is <= t across all
    # drivers. Per-driver most recent started lap drives compound/tyre_age.
    current_lap: int | None = None
    lap_by_num: dict[int, dict] = {}
    for num, starts in index.lap_starts.items():
        laps = index.lap_entries[num]
        i = bisect_right(starts, t) - 1
        if i < 0:
            continue
        best = laps[i]
        lap_by_num[num] = best
        if current_lap is None or best["lap_number"] > current_lap:
            current_lap = best["lap_number"]

    red_flag, vsc, sc = _flag_state(index.flag_events, t)

    # Build a row per driver that has a position sample at or before t.
    rows: list[tuple[int, TimingRow]] = []
    for num, samples in index.pos_samples.items():
        pos_sample, pos_t = _last_at_or_before(samples, t, index.pos_times[num])
        if pos_sample is None:
            continue
        position = int(pos_sample[1])

        gap = interval = None
        stale = None
        int_samples = index.int_samples.get(num)
        if int_samples:
            i_sample, i_t = _last_at_or_before(int_samples, t, index.int_times[num])
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

    # Car markers: location samples are a deterministic transform of the cached
    # OpenF1 pull, so marker_mode is REPLAY whenever coverage exists.
    markers: list[CarMarker] = []
    if index.loc_samples:
        for num, samples in index.loc_samples.items():
            marker = _marker_at(num, samples, t, index.loc_times[num])
            if marker is not None:
                markers.append(marker)
        markers.sort(key=lambda m: m.driver_number)

    return StateAtTime(
        t_seconds=t,
        current_lap=current_lap,
        red_flag=red_flag,
        vsc=vsc,
        sc=sc,
        timing=[r[1] for r in rows],
        markers=markers,
        data_mode="REPLAY",
        marker_mode="REPLAY" if index.loc_samples else "UNAVAILABLE",
    )


def load_and_build_state(data_dir: Path, session_key: int, t: float) -> StateAtTime:
    from .session_store import load_session_data

    data = load_session_data(data_dir, session_key)
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
