# GRIDTRACE — Data Coverage Matrix

What each external provider can actually give us, per channel, by year. This is
the source of truth behind the `/api/seasons/{y}/rounds/{r}/capabilities`
endpoint (`app/catalog.py`). **Never** claim a channel a provider can't back.

Legend for `CapabilityState`:
- `AVAILABLE` — a real provider supplies it (or it's ingested on disk).
- `PARTIAL` — available but incomplete / coarse / legacy-only.
- `UNAVAILABLE` — not present for this session; may exist for other years.
- `NOT_SUPPORTED` — no source exists for this year at all.
- `REQUIRES_AUTH` — exists but needs paid credentials we don't hold.
- `NOT_YET_PUBLISHED` — upcoming session whose data doesn't exist yet.

## Providers

| Provider | Base | Auth | Coverage | Channels | Notes |
|---|---|---|---|---|---|
| **Jolpica** (Ergast-compatible) | `api.jolpi.ca/ergast/f1` | none | **1950 → present** (77 seasons) | calendar, results, standings, some lap times | Rate-limited; 429 backoff. Our catalog source. Not a telemetry source. |
| **OpenF1** | `api.openf1.org/v1` | none (historical); **paid** (real-time) | **2023 → present** detailed; real-time = subscription | sessions, drivers, laps, position, intervals, pit, stints, race_control, team_radio, weather, **car_data, location** | Car location ≈3.7 Hz; car_data ≈3.7 Hz. Per-driver queries required (session-wide 422/timeout — ADR-001). Real-time needs paid MQTT/WebSockets. |
| **FastF1** | `theOehrly/Fast-F1` (Python) | none | **detailed 2018 → present**; basic earlier | lap timing, telemetry, results, event schedule | Post-session (30–120 min after). Not a live feed. |
| **MultiViewer** | `api.multiviewer.app/api/v1` | none | recent seasons | circuit corners/geometry | Shares `circuit_key` with OpenF1 (verified 2 = Silverstone). |

## Per-channel coverage by session year (not ingested)

| Channel | <2018 | 2018–2022 | 2023+ | Source |
|---|---|---|---|---|
| CALENDAR / RESULTS / STANDINGS | AVAILABLE | AVAILABLE | AVAILABLE | Jolpica |
| TIMING (laps) | PARTIAL | AVAILABLE | AVAILABLE | FastF1 / Jolpica |
| POSITIONS | UNAVAILABLE | AVAILABLE | AVAILABLE | FastF1 / OpenF1 |
| INTERVALS | UNAVAILABLE | PARTIAL | PARTIAL | OpenF1 |
| TELEMETRY | NOT_SUPPORTED | AVAILABLE | AVAILABLE | FastF1 / OpenF1 |
| LOCATIONS (car pos) | NOT_SUPPORTED | NOT_SUPPORTED | AVAILABLE | OpenF1 |
| RADIO | NOT_SUPPORTED | NOT_SUPPORTED | AVAILABLE | OpenF1 / FastF1 |
| RACE_CONTROL | PARTIAL | AVAILABLE | AVAILABLE | FastF1 / OpenF1 |
| WEATHER / PIT_STOPS / STINTS | UNAVAILABLE/PARTIAL | AVAILABLE | AVAILABLE | FastF1 / OpenF1 |
| OVERTAKES | PARTIAL | PARTIAL | PARTIAL | derived |
| LIVE | NOT_SUPPORTED (past) | REQUIRES_AUTH | REQUIRES_AUTH | OpenF1 paid subscription |

## Ingested sessions (on disk under `backend/data/<key>/`)

Only **one** session is currently ingested: **9558 · Silverstone 2024 Race**.
When a session is ingested, its capability report is computed from **disk
presence** (not the coverage matrix): each of the 15 normalized datasets maps to
a channel and reports `AVAILABLE` if the file exists, `UNAVAILABLE` otherwise.
Ingested sessions are always `data_mode=REPLAY` and `LIVE=NOT_SUPPORTED`.

### Known ingest gap
`app/ingest/fetch.py` is still **hardcoded** to `/2024/12/` (Jolpica) and
circuit_key `2` (MultiViewer/Silverstone). The catalog *lists* all historical
events, but only 2024 Silverstone can currently be *ingested*. Generalizing the
ingest to arbitrary (year, round, session_type) is open follow-up work — see
`docs/REPOSITORY_AUDIT.md` and the overhaul task graph.

## Data honesty rules (non-negotiable)
- Label every view `LIVE / REPLAY / ESTIMATE / SIMULATION / UNAVAILABLE`.
- Never show `LIVE` without an actual live feed. Past sessions are `REPLAY`.
- Never invent gaps, lap times, telemetry, or positions. Missing → `UNAVAILABLE`.
- Every number traces to a cached API response or a deterministic transform of one.
