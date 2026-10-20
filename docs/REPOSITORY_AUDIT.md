# GRIDTRACE — Repository Audit (Task Group A)

Established by direct inspection + live measurement on 2026-10-20 (Build 17 tree, branch `ashwinwork`).
Every claim below was verified against source, running processes, or an actual HTTP measurement — not assumed.

## 1. What actually exists

### Backend (FastAPI, `backend/app/`)
| File | Role | State |
|---|---|---|
| `main.py` | 7 endpoints: `/api/health`, `/api/sessions`, `/api/session/{k}/drivers`, `/state?t=`, `/race-control`, `/circuit`, `/telemetry` | **Locked to one session.** `FLAGSHIP_SESSION_KEY = 9558`; `_require_flagship()` returns 404 for any other key. |
| `state.py` | `build_state_at(t, …)` pure reconstruction; `load_and_build_state(data_dir, k, t)` loads JSON from disk each call | Correct logic, **no caching** — re-opens + re-parses all session JSON per request. |
| `contracts.py` | Pydantic models: `Driver`, `SessionInfo`, `TimingRow`, `StateAtTime`, `CarMarker`, `CircuitInfo`, `TelemetryCompare` | Solid. `DataMode` literal already models LIVE/REPLAY/ESTIMATE/SIMULATION/UNAVAILABLE. |
| `ingest/fetch.py` | Pulls OpenF1 (+ per-driver intervals/location/car_data), Jolpica, MultiViewer → `backend/cache/<k>/` | **Single-session + single-year hardcodes:** Jolpica `/2024/12/`, MultiViewer circuit `2`. |
| `ingest/normalize.py` | `backend/cache/<k>/` → `backend/data/<k>/` + `data/sessions.json` | Correct, deterministic. Emits 15 dataset files. |
| `tests/` | 36 tests (contracts, markers, telemetry, data_qa) | **All 36 pass** (measured). |

### Frontend (React + TS + Vite, `frontend/src/`)
| Area | State |
|---|---|
| `store/clock.ts` | Zustand clock: `t/playing/speed/duration`. No advance logic here. |
| `components/clock/ClockDriver.tsx` | Single rAF loop advancing `t`. Time-scaling formula `t + elapsed×speed` is **correct**. |
| `hooks/useFlagship.ts` | Loads session/drivers/RC once; **`useRaceState` polls `/state?t=` on every integer-second change**. |
| `api/client.ts` | Typed client matching the 7 endpoints. |
| `routes/app/AppShell.tsx` | Nav: **only Race Control + Battle Lab are live.** Intelligence, Strategy, Driver, Constructor, Vault, Prediction, Settings are `disabled: true` ("soon"). |
| Battle Lab, Race Control, SessionPicker, RaceRibbon, track map | Implemented for the flagship session. |

### Data
- `backend/data/sessions.json` contains **exactly 1 session** (9558 · Silverstone 2024 Race).
- `backend/data/9558/` holds real normalized OpenF1 data: `drivers`, `positions`, `intervals` (538 KB), `timing_base` (140 KB), `locations` (3.1 MB), `telemetry` (1.8 MB), `race_control`, `stints`, `pit`, `weather`, `overtakes`, `team_radio`, `grid`, `circuit`, `session_result`. **Real, single-session.**

### Deployment (Vercel)
- `vercel.json`: frontend build; FastAPI function `backend.app.main:app`, `maxDuration: 30`, `includeFiles: backend/data/**`; SPA rewrite for non-`/api` paths. Backend and frontend deploy together; `/api/*` → Python function.

## 2. The replay-lag root cause (measured)

Baseline `/api/session/9558/state?t=` latency (local uvicorn, warm data dir):

```
cold  0.470 s
warm  0.147 0.123 0.132 0.154 s   → ~130–155 ms per request
```

Two independent causes:

1. **Server (dominant).** `load_and_build_state` calls `json.load` on `locations.json` (3.1 MB) + `intervals.json` (538 KB) + `timing_base.json` (140 KB) + the rest **on every request**, with no in-memory cache. It then rebuilds `times = [s[0] for s in samples]` for every driver on every call.
2. **Client.** `ClockDriver` updates `t` at ~60 fps; every `useClock(s=>s.t)` subscriber re-renders each frame, and `useRaceState` fetches `/state` on each integer-second change. At **8×**, `Math.round(t)` changes ~8×/s → **~8 heavy requests/sec**, each ~130 ms. The server cannot keep up → dropped frames / desync.

`ClockDriver`'s time-scaling math is correct; the lag is I/O + render cadence, not the clock formula.

## 3. Single-session lock (the biggest functional gap)
- Backend `_require_flagship()` 404s every session except 9558.
- Ingest hardcodes `/2024/12/` and circuit `2`.
- `sessions.json` has 1 row; no seasons/races/capabilities endpoints.
- 7 of 9 app modules are disabled placeholders.

## 4. Missing entirely (disabled nav / no endpoints)
Race Intelligence engine, Strategy Lab engine, Driver Lab stats, Constructor Lab, Race Vault catalog, Prediction Arena, Settings/diagnostics, capability detection, canonical multi-provider event model, real-time tracking path.

## 5. What is genuinely good (preserve)
- Correct deterministic `build_state_at` (bisect forward-fill, lerp markers, flag scan).
- Honest `DataMode` provenance (REPLAY vs ESTIMATE vs UNAVAILABLE) already threaded through contracts + UI badges.
- Real ingested data for the flagship session; deterministic normalize step.
- 36 passing backend tests; clean Vitest suite (12) + tsc + oxlint on the frontend.

## 6. Test/build baseline
- Backend: `pytest` → **36 passed**.
- Frontend: `vitest` → 12 passed; `tsc --noEmit` clean; `oxlint` only pre-existing `useFlagship.ts:25` warning.
- Live: `https://gridtrace.vercel.app` serving Build 17.
