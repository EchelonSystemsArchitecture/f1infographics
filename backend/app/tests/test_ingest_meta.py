from __future__ import annotations

import json
from pathlib import Path

import app.ingest.fetch as fetch_mod


def test_session_meta_derives_flagship(monkeypatch, tmp_path):
    cache = tmp_path
    session = {
        "session_key": 9558,
        "year": 2024,
        "circuit_key": 2,
        "circuit_short_name": "Silverstone",
    }
    (cache / "sessions.json").write_text(json.dumps([session]))
    monkeypatch.setattr(fetch_mod, "_match_round", lambda year, short: 12)

    meta = fetch_mod._session_meta(cache, 9558)
    assert meta == {"year": 2024, "round": 12, "circuit_key": 2, "short": "silverstone"}


def test_session_meta_fallback_when_missing(tmp_path):
    meta = fetch_mod._session_meta(tmp_path, 1234)
    assert meta == {"year": 2024, "round": 12, "circuit_key": 2, "short": "Silverstone"}


def test_match_round_parses_calendar(monkeypatch):
    payload = {
        "MRData": {
            "RaceTable": {
                "Races": [
                    {"round": "11", "Circuit": {"circuitName": "Red Bull Ring"}},
                    {"round": "12", "Circuit": {"circuitName": "Silverstone"}},
                ]
            }
        }
    }
    monkeypatch.setattr(fetch_mod, "_get", lambda *a, **k: payload)
    assert fetch_mod._match_round(2024, "silverstone") == 12
    assert fetch_mod._match_round(2024, "red bull") == 11
    assert fetch_mod._match_round(2024, "monaco") is None


def test_ingest_fetch_imports_clean():
    assert fetch_mod.OPENF1.endswith("/v1")
    assert "sessions" in fetch_mod.SESSION_ENDPOINTS
