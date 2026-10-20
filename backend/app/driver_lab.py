"""Driver Lab + Constructor Lab — per-driver / per-team race stats (REPLAY)."""

from __future__ import annotations

from pathlib import Path

from .contracts import ConstructorLab, ConstructorRow, DriverLab, DriverLabRow
from .session_store import load_dataset, load_session_data


def build_driver_lab(data_dir: Path, session_key: int) -> DriverLab:
    data = load_session_data(data_dir, session_key)
    drivers = {d["driver_number"]: d for d in data.drivers}
    result = load_dataset(data_dir, session_key, "session_result.json")
    grid = load_dataset(data_dir, session_key, "grid.json")
    pit = load_dataset(data_dir, session_key, "pit.json")

    grid_pos = {g["driver_number"]: g["position"] for g in grid}
    pits_by_driver: dict[int, int] = {}
    for stop in pit:
        pits_by_driver[stop["driver_number"]] = pits_by_driver.get(stop["driver_number"], 0) + 1

    # Best / avg race lap per driver from timing_base (exclude pit-out laps).
    best_avg: dict[int, tuple[int | None, int | None, list[str]]] = {}
    for entry in data.timing_base:
        num = entry["driver_number"]
        durations = [
            lap["lap_duration"]
            for lap in entry["laps"]
            if lap.get("lap_duration") and not lap.get("is_pit_out_lap")
        ]
        compounds = [
            lap["compound"] for lap in entry["laps"] if lap.get("compound")
        ]
        seen: list[str] = []
        for c in compounds:
            if c not in seen:
                seen.append(c)
        best = int(min(durations) * 1000) if durations else None
        avg = int((sum(durations) / len(durations)) * 1000) if durations else None
        best_avg[num] = (best, avg, seen)

    rows: list[DriverLabRow] = []
    for r in result:
        num = r["driver_number"]
        d = drivers.get(num, {})
        g = grid_pos.get(num)
        f = r.get("position")
        delta = (g - f) if (g is not None and f is not None) else None
        best, avg, compounds = best_avg.get(num, (None, None, []))
        rows.append(
            DriverLabRow(
                driver_number=num,
                name_acronym=d.get("name_acronym", f"P{num}"),
                full_name=d.get("full_name", ""),
                team_name=d.get("team_name", ""),
                team_colour=d.get("team_colour", "888888"),
                grid=g,
                finish=f,
                delta=delta,
                best_lap_ms=best,
                avg_lap_ms=avg,
                pits=pits_by_driver.get(num, 0),
                points=float(r.get("points", 0)),
                laps=int(r.get("number_of_laps", 0)),
                dnf=bool(r.get("dnf")),
                compounds=compounds,
            )
        )
    rows.sort(key=lambda x: x.finish if x.finish is not None else 999)
    return DriverLab(session_key=session_key, drivers=rows)


def build_constructor_lab(data_dir: Path, session_key: int) -> ConstructorLab:
    lab = build_driver_lab(data_dir, session_key)
    by_team: dict[str, list[DriverLabRow]] = {}
    for row in lab.drivers:
        by_team.setdefault(row.team_name or "Unknown", []).append(row)

    rows: list[ConstructorRow] = []
    for team, members in by_team.items():
        finishes = [m.finish for m in members if m.finish is not None and not m.dnf]
        grids = [m.grid for m in members if m.grid is not None]
        points = sum(m.points for m in members)
        gained = sum((m.delta or 0) for m in members)
        rows.append(
            ConstructorRow(
                team_name=team,
                team_colour=members[0].team_colour,
                driver_numbers=[m.driver_number for m in members],
                points=points,
                best_finish=min(finishes) if finishes else None,
                avg_finish=(sum(finishes) / len(finishes)) if finishes else None,
                positions_gained=gained,
            )
        )
    rows.sort(key=lambda c: (-c.points, c.best_finish if c.best_finish is not None else 999))
    return ConstructorLab(session_key=session_key, constructors=rows)
