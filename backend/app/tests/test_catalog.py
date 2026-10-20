"""Catalog parsing, ingest matching, and capability detection.

Uses fixture payloads (no network) so the suite stays deterministic.
"""

from __future__ import annotations

from pathlib import Path

from app.catalog import _match_ingested, capabilities_for
from app.providers.jolpica import parse_races, parse_seasons

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

RACES_FIXTURE = {
    "MRData": {
        "RaceTable": {
            "season": "2024",
            "Races": [
                {
                    "season": "2024",
                    "round": "5",
                    "raceName": "Miami Grand Prix",
                    "Circuit": {
                        "circuitId": "miami",
                        "circuitName": "Miami International Autodrome",
                        "Location": {
                            "lat": "25.9581",
                            "long": "-80.2389",
                            "locality": "Miami",
                            "country": "United States",
                        },
                    },
                    "date": "2024-05-05",
                    "time": "20:00:00Z",
                },
                {
                    "season": "2024",
                    "round": "12",
                    "raceName": "British Grand Prix",
                    "Circuit": {
                        "circuitId": "silverstone",
                        "circuitName": "Silverstone Circuit",
                        "Location": {
                            "lat": "52.0786",
                            "long": "-1.0169",
                            "locality": "Silverstone",
                            "country": "United Kingdom",
                        },
                    },
                    "date": "2024-07-07",
                    "time": "14:00:00Z",
                },
            ],
        }
    }
}

SEASONS_FIXTURE = {
    "MRData": {
        "SeasonTable": {
            "Seasons": [
                {"season": "2024", "url": "https://example/2024"},
                {"season": "2023", "url": "https://example/2023"},
            ]
        }
    }
}


def test_parse_races_builds_canonical_events():
    events = parse_races(RACES_FIXTURE)
    assert [e.round for e in events] == [5, 12]
    miami = events[0]
    assert miami.event_name == "Miami Grand Prix"
    assert miami.country == "United States"
    assert miami.lat == 25.9581
    assert miami.date_start.startswith("2024-05-05T20:00:00")


def test_parse_seasons():
    seasons = parse_seasons(SEASONS_FIXTURE)
    assert [s.year for s in seasons] == [2024, 2023]


def test_match_ingested_silverstone():
    events = parse_races(RACES_FIXTURE)
    silverstone = next(e for e in events if e.circuit_id == "silverstone")
    ingested = [
        {
            "session_key": 9558,
            "year": 2024,
            "circuit_short_name": "Silverstone",
            "session_name": "Race",
        }
    ]
    assert _match_ingested(silverstone, ingested) == 9558
    miami = next(e for e in events if e.circuit_id == "miami")
    assert _match_ingested(miami, ingested) is None


def _patch_events(monkeypatch):
    events = parse_races(RACES_FIXTURE)
    monkeypatch.setattr("app.catalog.jolpica.fetch_events", lambda season: events)


def test_capabilities_not_ingested_coverage_matrix(monkeypatch):
    _patch_events(monkeypatch)
    report = capabilities_for(2024, 5, "Race", DATA_DIR)
    assert report.ingested is False
    assert report.data_mode == "UNAVAILABLE"
    # 2024 race: locations + telemetry + radio exist via OpenF1/FastF1.
    assert report.channels["LOCATIONS"] == "AVAILABLE"
    assert report.channels["TELEMETRY"] == "AVAILABLE"
    # Live window has closed for a past race.
    assert report.channels["LIVE"] == "NOT_SUPPORTED"


def test_capabilities_pre_2023_no_locations(monkeypatch):
    _patch_events(monkeypatch)
    report = capabilities_for(2015, 1, "Race", DATA_DIR)
    assert report.channels["LOCATIONS"] == "NOT_SUPPORTED"
    assert report.channels["TELEMETRY"] == "NOT_SUPPORTED"


def test_capabilities_ingested_silverstone_is_replay(monkeypatch):
    if not (DATA_DIR / "9558").is_dir():
        import pytest

        pytest.skip("flagship session not ingested")
    _patch_events(monkeypatch)
    report = capabilities_for(2024, 12, "Race", DATA_DIR)
    assert report.ingested is True
    assert report.session_key == 9558
    assert report.data_mode == "REPLAY"
    assert report.channels["LOCATIONS"] == "AVAILABLE"
    assert report.channels["LIVE"] == "NOT_SUPPORTED"
