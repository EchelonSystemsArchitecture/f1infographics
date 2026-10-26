"""Event catalog + capability detection.

Merges Jolpica calendar metadata (seasons / races) with what is actually
ingested on disk under backend/data/, and computes an honest per-channel
capability report. Two rules:

1. Never invent availability. A channel is only AVAILABLE when we can back it
   with a real source (Jolpica for calendar/results, FastF1/OpenF1 for
   timing/telemetry/locations) — or when the dataset is ingested locally.
2. Live coverage always reports REQUIRES_AUTH for recent sessions (OpenF1's
   real-time feed is a paid subscription we do not hold) and NOT_SUPPORTED for
   past sessions (the live window has closed).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .contracts import CapabilityReport, CapabilityState, DataMode, EventSummary, SeasonSummary
from .providers import jolpica

# Earliest year each channel is meaningfully available from a real provider.
_TIMING_MIN_YEAR = 2018  # FastF1 detailed lap timing
_TELEMETRY_MIN_YEAR = 2018  # FastF1 car telemetry
_LOCATIONS_MIN_YEAR = 2023  # OpenF1 car location
_RADIO_MIN_YEAR = 2023  # OpenF1 team radio

# local dataset file -> channel name
_CHANNEL_FILES: dict[str, str] = {
    "session_result.json": "RESULTS",
    "grid.json": "GRID",
    "drivers.json": "DRIVERS",
    "timing_base.json": "TIMING",
    "positions.json": "POSITIONS",
    "intervals.json": "INTERVALS",
    "telemetry.json": "TELEMETRY",
    "locations.json": "LOCATIONS",
    "race_control.json": "RACE_CONTROL",
    "team_radio.json": "RADIO",
    "weather.json": "WEATHER",
    "pit.json": "PIT_STOPS",
    "stints.json": "STINTS",
    "overtakes.json": "OVERTAKES",
    "circuit.json": "CIRCUIT",
}

_STATIC_CHANNELS = ["CALENDAR", "RESULTS", "STANDINGS"]


def _local_race_counts(data_dir: Path | None) -> dict[int, int]:
    """Count locally ingested Race sessions per season.

    Jolpica's season list carries no round counts, and fetching every season's
    calendar would turn one catalog request into dozens of upstream calls. The
    picker only needs to know which years have local replay coverage, so the
    count is the number of ingested races for that year (0 = no local coverage).
    """
    if data_dir is None:
        return {}
    counts: dict[int, int] = {}
    for meta in _load_ingested(data_dir):
        if meta.get("session_name") != "Race" or meta.get("data_mode") != "REPLAY":
            continue
        year = meta.get("year")
        if isinstance(year, int):
            counts[year] = counts.get(year, 0) + 1
    return counts


def list_seasons(data_dir: Path | None = None) -> list[SeasonSummary]:
    seasons = jolpica.fetch_seasons()
    counts = _local_race_counts(data_dir)
    return [
        SeasonSummary(year=s.year, race_count=counts.get(s.year, 0))
        for s in seasons
    ]


def list_events(season: int, data_dir: Path) -> list[EventSummary]:
    events = jolpica.fetch_events(season)
    ingested = _load_ingested(data_dir)
    enriched: list[EventSummary] = []
    for e in events:
        key = _match_ingested(e, ingested, "Race")
        enriched.append(
            e.model_copy(update={"ingested": key is not None, "session_key": key})
        )
    return enriched


def capabilities_for(
    season: int, round_: int, session_name: str, data_dir: Path
) -> CapabilityReport:
    events = jolpica.fetch_events(season)
    event = next((e for e in events if e.round == round_), None)
    year = season
    ended = True
    if event and event.date_start:
        try:
            start = datetime.fromisoformat(event.date_start)
            ended = start.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc)
        except ValueError:
            ended = True

    ingested = _load_ingested(data_dir)
    key = _match_ingested(event, ingested, session_name) if event else None

    if key is not None:
        channels = _disk_channels(data_dir, key)
        data_mode: DataMode = "REPLAY"
        note = "Ingested locally; all values are historical replay."
    else:
        channels = _coverage_channels(year, ended)
        data_mode = "UNAVAILABLE"
        note = "Not ingested. Capabilities reflect provider coverage, not loaded data."

    return CapabilityReport(
        season=season,
        round=round_,
        event_name=event.event_name if event else f"Round {round_}",
        session_name=session_name,
        session_key=key,
        ingested=key is not None,
        channels=channels,
        data_mode=data_mode,
        note=note,
    )


def _coverage_channels(year: int, ended: bool) -> dict[str, CapabilityState]:
    ch: dict[str, CapabilityState] = {}
    for name in _STATIC_CHANNELS:
        ch[name] = "AVAILABLE"
    ch["STANDINGS"] = "AVAILABLE"
    if year >= _TIMING_MIN_YEAR:
        ch["TIMING"] = "AVAILABLE"
        ch["POSITIONS"] = "AVAILABLE"
        ch["INTERVALS"] = "PARTIAL"
    else:
        ch["TIMING"] = "PARTIAL"
        ch["POSITIONS"] = "UNAVAILABLE"
        ch["INTERVALS"] = "UNAVAILABLE"
    ch["TELEMETRY"] = "AVAILABLE" if year >= _TELEMETRY_MIN_YEAR else "NOT_SUPPORTED"
    ch["LOCATIONS"] = "AVAILABLE" if year >= _LOCATIONS_MIN_YEAR else "NOT_SUPPORTED"
    ch["RADIO"] = "AVAILABLE" if year >= _RADIO_MIN_YEAR else "NOT_SUPPORTED"
    ch["RACE_CONTROL"] = "AVAILABLE" if year >= 2018 else "PARTIAL"
    ch["WEATHER"] = "AVAILABLE" if year >= 2018 else "UNAVAILABLE"
    ch["PIT_STOPS"] = "AVAILABLE" if year >= 2018 else "PARTIAL"
    ch["STINTS"] = "AVAILABLE" if year >= 2018 else "UNAVAILABLE"
    ch["OVERTAKES"] = "PARTIAL"
    # Live: never available for a session that has already ended; otherwise it
    # requires the paid OpenF1 real-time subscription we do not hold.
    ch["LIVE"] = "NOT_SUPPORTED" if ended else "REQUIRES_AUTH"
    return ch


def _disk_channels(data_dir: Path, session_key: int) -> dict[str, CapabilityState]:
    base = data_dir / str(session_key)
    ch: dict[str, CapabilityState] = {}
    for name in _STATIC_CHANNELS:
        ch[name] = "AVAILABLE"
    for filename, channel in _CHANNEL_FILES.items():
        ch[channel] = "AVAILABLE" if (base / filename).exists() else "UNAVAILABLE"
    ch["LIVE"] = "NOT_SUPPORTED"  # ingested sessions are historical replay
    return ch


def _load_ingested(data_dir: Path) -> list[dict]:
    import json

    sessions_path = data_dir / "sessions.json"
    if not sessions_path.exists():
        return []
    with sessions_path.open() as f:
        return json.load(f)


def _normalise_session_name(value: str | None) -> str:
    name = (value or "Race").strip().lower()
    if name.startswith("sprint"):
        return "Sprint"
    if name.startswith("qualif"):
        return "Qualifying"
    if name.startswith("race"):
        return "Race"
    return (value or "").strip().title()


def _match_ingested(
    event: EventSummary | None,
    ingested: list[dict],
    session_name: str | None = "Race",
) -> int | None:
    """Return the ingested session_key for this event and session type.

    Matches on season (year) plus circuit short-name against the Jolpica
    circuit name / locality / id (case-insensitive), and requires the exact
    session name so a Qualifying or Sprint file can never answer a Race
    request. OpenF1 uses a numeric circuit_key that does not map 1:1 to
    Jolpica's string circuit_id, so we match on the human circuit name instead.
    """
    if event is None:
        return None
    wanted = _normalise_session_name(session_name)
    for meta in ingested:
        if meta.get("year") != event.season:
            continue
        if _normalise_session_name(meta.get("session_name")) != wanted:
            continue
        if meta.get("data_mode", "REPLAY") != "REPLAY":
            continue
        short = (meta.get("circuit_short_name") or "").lower()
        if not short:
            continue
        name = (event.circuit_name or "").lower()
        locality = (event.locality or "").lower()
        cid = (event.circuit_id or "").lower()
        if short == locality or short in name or (cid and short in cid):
            return int(meta["session_key"])
    return None


def clear_cache() -> None:
    jolpica.clear_cache()
