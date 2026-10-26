"""Strategy Lab — stint / tyre / pit-window analytics (deterministic, REPLAY)."""

from __future__ import annotations

from pathlib import Path

from .contracts import Stint, StrategyDriver, StrategyLab
from .session_store import load_dataset, load_session_data


def build_strategy(data_dir: Path, session_key: int) -> StrategyLab:
    data = load_session_data(data_dir, session_key)
    drivers = {d["driver_number"]: d for d in data.drivers}
    stints_raw = load_dataset(data_dir, session_key, "stints.json")
    pit = load_dataset(data_dir, session_key, "pit.json")

    stops_by_driver: dict[int, int] = {}
    for stop in pit:
        stops_by_driver[stop["driver_number"]] = stops_by_driver.get(stop["driver_number"], 0) + 1

    by_driver: dict[int, list[Stint]] = {}
    for s in stints_raw:
        num = s["driver_number"]
        raw_start = s.get("lap_start")
        raw_end = s.get("lap_end")
        if not isinstance(raw_start, int) or isinstance(raw_start, bool) or raw_start < 1:
            continue
        if not isinstance(raw_end, int) or isinstance(raw_end, bool):
            continue
        lap_start, lap_end = sorted((raw_start, raw_end))
        if lap_start < 1:
            continue
        by_driver.setdefault(num, []).append(
            Stint(
                driver_number=num,
                stint_number=s.get("stint_number", 0),
                compound=s.get("compound"),
                lap_start=lap_start,
                lap_end=lap_end,
                length=lap_end - lap_start + 1,
                tyre_age_at_start=s.get("tyre_age_at_start"),
            )
        )

    out: list[StrategyDriver] = []
    for num, stints in by_driver.items():
        stints.sort(key=lambda s: s.stint_number)
        d = drivers.get(num, {})
        compounds = [s.compound for s in stints if s.compound]
        out.append(
            StrategyDriver(
                driver_number=num,
                name_acronym=d.get("name_acronym", f"P{num}"),
                team_colour=d.get("team_colour", "888888"),
                stops=stops_by_driver.get(num, max(0, len(stints) - 1)),
                compounds=compounds,
                stints=stints,
            )
        )
    out.sort(key=lambda s: s.driver_number)

    hist: dict[str, int] = {}
    for sd in out:
        key = str(sd.stops)
        hist[key] = hist.get(key, 0) + 1
    most_common = None
    if hist:
        most_common = int(max(hist.items(), key=lambda kv: kv[1])[0])

    return StrategyLab(
        session_key=session_key,
        drivers=out,
        stop_histogram=hist,
        most_common_stops=most_common,
    )
