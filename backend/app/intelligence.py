"""Race Intelligence — deterministic derived analytics from ingested datasets.

Everything here is a pure transformation of cached OpenF1/Jolpica data, so the
provenance is always REPLAY (historical). No simulation, no invented values.

Covers the first "disabled" app module: flag periods, pit-stop aggregates,
overtake leaders, grid→finish position movement, and lead changes.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .contracts import (
    FlagPeriod,
    OvertakerEntry,
    PitStopAggregate,
    PositionMovement,
    RaceIntelligence,
)
from .session_store import load_session_data

_OPENF1_TS = datetime.fromisoformat


def _t(stamp: str, date_start: datetime) -> float:
    return (_OPENF1_TS(stamp) - date_start).total_seconds()


def detect_flag_periods(race_control: list[dict], date_start: datetime) -> list[FlagPeriod]:
    """Pair SC / VSC / RED start events with their clear events."""
    periods: list[FlagPeriod] = []
    open_sc = open_vsc = open_red = None
    for e in race_control:
        stamp = e.get("date")
        if not stamp:
            continue
        t = _t(stamp, date_start)
        msg = (e.get("message") or "").upper()
        flag = (e.get("flag") or "").upper()

        is_red = flag == "RED" or "RED LIGHT" in msg or ("RED FLAG" in msg and "CHEQUERED" not in msg)
        is_green = "GREEN" in msg or flag == "GREEN"
        is_chequered = "CHEQUERED" in msg or flag == "CHEQUERED"
        is_vsc = "VIRTUAL SAFETY CAR" in msg or "VSC" in msg
        is_sc = "SAFETY CAR" in msg and "VIRTUAL" not in msg
        is_sc_in = "SAFETY CAR IN" in msg or ("SAFETY CAR" in msg and "ENDING" in msg)

        if is_chequered:
            # Race over — close any open periods at the chequered flag.
            if open_red is not None:
                periods.append(_period("RED", open_red, t))
                open_red = None
            if open_vsc is not None:
                periods.append(_period("VSC", open_vsc, t))
                open_vsc = None
            if open_sc is not None:
                periods.append(_period("SC", open_sc, t))
                open_sc = None
            continue

        if is_red and open_red is None:
            open_red = t
        elif open_red is not None and is_green:
            periods.append(_period("RED", open_red, t))
            open_red = None

        if is_vsc and "ENDING" not in msg and open_vsc is None:
            open_vsc = t
        elif open_vsc is not None and (is_green or is_sc_in):
            periods.append(_period("VSC", open_vsc, t))
            open_vsc = None

        if is_sc and not is_vsc and not is_sc_in and open_sc is None:
            open_sc = t
        elif open_sc is not None and (is_sc_in or is_green):
            periods.append(_period("SC", open_sc, t))
            open_sc = None

    # Close any still-open periods at the end (rare).
    for kind, start in (("RED", open_red), ("VSC", open_vsc), ("SC", open_sc)):
        if start is not None:
            periods.append(_period(kind, start, None))
    periods.sort(key=lambda p: p.start_t if p.start_t is not None else 0.0)
    return periods


def _period(kind: str, start: float, end: float | None) -> FlagPeriod:
    duration = (end - start) if end is not None else None
    return FlagPeriod(kind=kind, start_t=start, end_t=end, duration_s=duration)


def pit_aggregates(
    pit: list[dict], drivers: dict[int, dict]
) -> list[PitStopAggregate]:
    by_driver: dict[int, list[dict]] = {}
    for stop in pit:
        by_driver.setdefault(stop["driver_number"], []).append(stop)
    out: list[PitStopAggregate] = []
    for num, stops in by_driver.items():
        durations = [s.get("pit_duration") or 0.0 for s in stops]
        total = round(sum(durations), 3)
        avg = round(total / len(durations), 3) if durations else None
        d = drivers.get(num, {})
        out.append(
            PitStopAggregate(
                driver_number=num,
                name_acronym=d.get("name_acronym", f"P{num}"),
                team_colour=d.get("team_colour", "888888"),
                stops=len(stops),
                total_pit_time_s=total,
                avg_pit_time_s=avg,
            )
        )
    out.sort(key=lambda a: (-a.stops, a.driver_number))
    return out


def overtake_leaders(
    overtakes: list[dict], drivers: dict[int, dict]
) -> tuple[list[OvertakerEntry], list[OvertakerEntry], int]:
    made: dict[int, int] = {}
    received: dict[int, int] = {}
    for o in overtakes:
        made[o["overtaking_driver_number"]] = made.get(o["overtaking_driver_number"], 0) + 1
        received[o["overtaken_driver_number"]] = received.get(o["overtaken_driver_number"], 0) + 1

    def entries(counts: dict[int, int]) -> list[OvertakerEntry]:
        rows = [
            OvertakerEntry(
                driver_number=num,
                name_acronym=drivers.get(num, {}).get("name_acronym", f"P{num}"),
                team_colour=drivers.get(num, {}).get("team_colour", "888888"),
                count=c,
            )
            for num, c in counts.items()
        ]
        rows.sort(key=lambda e: (-e.count, e.driver_number))
        return rows

    return entries(made), entries(received), len(overtakes)


def position_movers(
    grid: list[dict], result: list[dict], drivers: dict[int, dict]
) -> list[PositionMovement]:
    grid_pos = {g["driver_number"]: g["position"] for g in grid}
    finish_pos = {r["driver_number"]: r["position"] for r in result if not r.get("dnf")}
    out: list[PositionMovement] = []
    for num, g in grid_pos.items():
        f = finish_pos.get(num)
        if f is None:
            continue
        out.append(
            PositionMovement(
                driver_number=num,
                name_acronym=drivers.get(num, {}).get("name_acronym", f"P{num}"),
                grid=g,
                finish=f,
                delta=g - f,  # positive = gained positions
            )
        )
    out.sort(key=lambda m: (-m.delta, m.finish if m.finish is not None else 99))
    return out


def count_lead_changes(positions: list[dict], date_start: datetime) -> int:
    """Number of times the P1 holder changed over the session."""
    leader_timeline: list[tuple[float, int]] = []
    for entry in positions:
        num = entry["driver_number"]
        for sample in entry["samples"]:
            if len(sample) >= 2 and int(sample[1]) == 1:
                leader_timeline.append((float(sample[0]), num))
    leader_timeline.sort(key=lambda x: x[0])
    changes = 0
    current: int | None = None
    for _, num in leader_timeline:
        if current is None:
            current = num
        elif num != current:
            changes += 1
            current = num
    return changes


def build_intelligence(data_dir: Path, session_key: int) -> RaceIntelligence:
    data = load_session_data(data_dir, session_key)
    drivers = {d["driver_number"]: d for d in data.drivers}

    def load_small(name: str) -> list[dict]:
        path = data_dir / str(session_key) / name
        if not path.exists():
            return []
        with path.open() as f:
            return json.load(f)

    pit = load_small("pit.json")
    overtakes = load_small("overtakes.json")
    grid = load_small("grid.json")
    result = load_small("session_result.json")

    top_overtakers, most_overtaken, overtakes_total = overtake_leaders(overtakes, drivers)

    return RaceIntelligence(
        session_key=session_key,
        flag_periods=detect_flag_periods(data.race_control, data.date_start),
        total_pit_stops=len(pit),
        pit_aggregates=pit_aggregates(pit, drivers),
        overtakes_total=overtakes_total,
        top_overtakers=top_overtakers,
        most_overtaken=most_overtaken,
        position_movers=position_movers(grid, result, drivers),
        lead_changes=count_lead_changes(data.positions, data.date_start),
    )
