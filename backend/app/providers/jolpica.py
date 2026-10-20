"""Jolpica F1 API client (Ergast-compatible) for the historical event catalog.

Docs: https://api.jolpi.ca/ergast/f1/. Full historical coverage back to 1950
for calendar + results + standings. Detailed lap timing / telemetry are NOT
provided here (those come from OpenF1 / FastF1). This module exposes pure
parsers (unit-testable with fixtures, no network) plus a cached HTTP client
that respects rate limits and retries on 429.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request

from ..contracts import EventSummary, SeasonSummary

BASE_URL = "https://api.jolpi.ca/ergast/f1"
_TIMEOUT = 20.0
_MAX_RETRIES = 3
_BACKOFF = 1.5

_seasons_cache: dict[int, list[SeasonSummary]] = {}
_events_cache: dict[int, list[EventSummary]] = {}
_LOCK = threading.Lock()


def parse_seasons(payload: dict) -> list[SeasonSummary]:
    table = payload.get("MRData", {}).get("SeasonTable", {})
    seasons = table.get("Seasons", [])
    return [
        SeasonSummary(year=int(s["season"]), race_count=0)  # race_count filled by caller
        for s in seasons
    ]


def parse_races(payload: dict) -> list[EventSummary]:
    table = payload.get("MRData", {}).get("RaceTable", {})
    races = table.get("Races", [])
    out: list[EventSummary] = []
    for r in races:
        circuit = r.get("Circuit", {})
        loc = circuit.get("Location", {})
        circuit_id = circuit.get("circuitId")
        lat = _float_or_none(loc.get("lat"))
        long = _float_or_none(loc.get("long"))
        date_start = r.get("date")
        time_of_day = r.get("time")
        start_iso = _combine_date_time(date_start, time_of_day)
        out.append(
            EventSummary(
                season=int(r.get("season", table.get("season", 0))),
                round=int(r.get("round", 0)),
                event_name=r.get("raceName", "Unknown"),
                circuit_name=circuit.get("circuitName", "Unknown"),
                country=loc.get("country", "Unknown"),
                locality=loc.get("locality"),
                lat=lat,
                long=long,
                circuit_id=circuit_id,
                date_start=start_iso,
                date_end=None,
            )
        )
    out.sort(key=lambda e: e.round)
    return out


def _float_or_none(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _combine_date_time(date: str | None, time_str: str | None) -> str:
    if not date:
        return ""
    if time_str:
        t = time_str.replace("Z", "+00:00")
        return f"{date}T{t}"
    return f"{date}T00:00:00+00:00"


def _get_json(path: str) -> dict:
    url = f"{BASE_URL}/{path}"
    last_err: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GRIDTRACE/1.0"})
            with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < _MAX_RETRIES - 1:
                time.sleep(_BACKOFF * (attempt + 1))
                last_err = e
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            if attempt < _MAX_RETRIES - 1:
                time.sleep(_BACKOFF * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"Jolpica request failed: {url}: {last_err}")


def fetch_seasons() -> list[SeasonSummary]:
    with _LOCK:
        cached = _seasons_cache.get(0)
        if cached is not None:
            return cached
    payload = _get_json("seasons.json?limit=200")
    seasons = parse_seasons(payload)
    with _LOCK:
        _seasons_cache[0] = seasons
    return seasons


def fetch_events(season: int) -> list[EventSummary]:
    with _LOCK:
        cached = _events_cache.get(season)
        if cached is not None:
            return cached
    payload = _get_json(f"{season}/races.json?limit=100")
    events = parse_races(payload)
    with _LOCK:
        _events_cache[season] = events
    return events


def clear_cache() -> None:
    with _LOCK:
        _seasons_cache.clear()
        _events_cache.clear()
