# GRIDTRACE — API Contract

FastAPI service (`backend/app/main.py`). All session data endpoints accept **any
ingested** `session_key`; a non-ingested key returns `404 {"detail": "Session <k> is not ingested"}`.
Datasets not yet on disk return `503`. Provider/catalog failures return `502`.

Base path: `/api`. Frontend proxies `/api` → the FastAPI function (Vercel) or
`http://127.0.0.1:8000` (local Vite dev).

## Health
| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `{"status":"ok"}` |

## Catalog (Jolpica-backed; new in Build 19)
| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/seasons` | `SeasonSummary[]` | `{year, race_count}`. Full historical list (1950→present). |
| GET | `/api/seasons/{year}/events` | `CatalogPage` | `{season, events: EventSummary[], fetched_at, source}`. Each event has `ingested` + `session_key` when it matches a local ingest. |
| GET | `/api/seasons/{year}/rounds/{round}/capabilities?session=Race` | `CapabilityReport` | Per-channel `CapabilityState` map; `ingested`, `data_mode`, `note`. |
| GET | `/api/sessions` | `SessionInfo[]` | **Ingested** sessions only (from `data/sessions.json`). |

## Session data
| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/session/{k}/drivers` | `Driver[]` | |
| GET | `/api/session/{k}/state?t=` | `StateAtTime` | `t` ≥ 0, seconds since session start. Served from the in-memory pre-indexed store (ADR-014); ~1.5–4 ms warm. |
| GET | `/api/session/{k}/race-control` | `RaceControlEvent[]` | Raw race-control rows. |
| GET | `/api/session/{k}/intelligence` | `RaceIntelligence` | Deterministic derived analytics (Build 21): flag periods, pit aggregates, overtake leaders, position movement, lead changes. |
| GET | `/api/session/{k}/intelligence` | `RaceIntelligence` | Deterministic derived analytics: flag periods, pit aggregates, overtake leaders, position movement, lead changes. (Build 21) |
| GET | `/api/session/{k}/strategy` | `StrategyLab` | Tyre stints, compound sequences, pit windows, stop histogram. (Build 22) |
| GET | `/api/session/{k}/driver-lab` | `DriverLab` | Per-driver grid→finish, best/avg lap, pits, points, DNF. (Build 22) |
| GET | `/api/session/{k}/constructor-lab` | `ConstructorLab` | Team aggregation: points, best/avg finish, positions gained. (Build 22) |
| GET | `/api/session/{k}/prediction` | `PredictionArena` | Deterministic what-if (SIMULATION, free, non-monetary). (Build 22) |
| GET | `/api/diagnostics?session_key=` | `Diagnostics` | Session-store cache info + per-dataset presence. (Build 22) |
| GET | `/api/session/{k}/circuit` | `CircuitInfo` | Path polyline + corners + pit loss. |
| GET | `/api/session/{k}/telemetry?drivers=44,11&lap=best` | `TelemetryCompare` | `lap` = `best` or a positive integer. |

## Key models (`backend/app/contracts.py`)
- **DataMode**: `LIVE | REPLAY | ESTIMATE | SIMULATION | UNAVAILABLE`.
- **CapabilityState**: `AVAILABLE | PARTIAL | UNAVAILABLE | NOT_SUPPORTED | REQUIRES_AUTH | NOT_YET_PUBLISHED`.
- `SessionInfo`, `Driver`, `TimingRow`, `StateAtTime`, `CarMarker`, `CircuitInfo`,
  `TelemetryCompare`, `SeasonSummary`, `EventSummary`, `CatalogPage`,
  `CapabilityReport`, `RaceIntelligence` (+ `FlagPeriod`, `PitStopAggregate`,
  `OvertakerEntry`, `PositionMovement`).

## Provenance guarantees
- `/state` `data_mode` is `REPLAY`; `marker_mode` is `REPLAY` when locations exist, else `UNAVAILABLE`.
- `/intelligence` is always `REPLAY` (deterministic transform of ingested data).
- Capabilities never report `LIVE` for a past session; OpenF1 real-time → `REQUIRES_AUTH`.

## Error codes
- `400` invalid query (bad driver number / lap selector).
- `404` unknown or **not-ingested** session; missing telemetry for a driver/lap.
- `502` catalog/provider failure (seasons/events/capabilities).
- `503` dataset not ingested on disk (state/drivers/etc. for a key whose dir exists but a file is missing).
