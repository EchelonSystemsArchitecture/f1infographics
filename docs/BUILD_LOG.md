# Build log

One section per build. Read top-down for current state; bottom-up for history. Each build: what shipped → how → verification → next.

---

## Build 0 — 2026-10-18 — Repo, docs skeleton, data verification

### Goal
Establish the team workspace: git branch, complete docs scaffold, and verified research so any agent can resume.

### What shipped
- `ashwinwork` branch initialized; SSH remote `origin` → `git@github.com:EchelonSystemsArchitecture/f1infographics.git` (auth as **ashvyagni**).
- Docs set: `README.md`, `AGENTS.md`, `TASKS.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES_AND_PROVENANCE.md`, `docs/DESIGN_SYSTEM.md`, `docs/BUILD_LOG.md`, `docs/DECISIONS.md`, `docs/SETUP.md`, `docs/TESTING_AND_QA.md`, `.gitignore`.
- Data-source verification (all live HTTP):
  - **OpenF1** session_key **9558** = 2024 British GP Race @ Silverstone; endpoint sweep documented (drivers 20, laps 962, position 252, pit 45, stints 65, race_control 110, overtakes 120, session_result 20, team_radio 41, weather 147; `car_data`/`location`/`intervals` **require per-driver** — session-wide → 422/timeout; `starting_grid` → 404).
  - **Jolpica**: `.json` suffix mandatory; 2024 season + driver standings → 200.
  - **MultiViewer**: `/circuits/2/2024` = Silverstone **18 corners** + pitLoss (19.07/12.08/13.80s). Corrected earlier wrong key (7 = Spa).
- Backend env: `backend/.venv` via uv, Python 3.14 — **fastapi 0.146.0, pandas 3.0.6, numpy 2.5.4, pydantic 2.14.1, httpx, pytest** import-clean. (Plain pip had timed out; uv succeeded.)

### How (steps)
1. Audited workspace/tools (`node -v`, `python3 --version`, uv/gh presence).
2. Cloned target repo read-only → confirmed main = static site shell; chose app branch `ashwinwork`.
3. OpenF1 probing: session list by year/session_type; fixed `country_name` filter (United Kingdom); endpoint sweep per endpoint with 60s timeouts; discovered per-driver requirement for heavy endpoints.
4. Jolpica/MultiViewer probes; cached `/tmp/mv_silverstone.json`; corrected circuit key.
5. `git init -b ashwinwork` + remote add + identity verify (`ssh -T`).
6. uv venv + dependency install (pip failed on network/timeout).
7. Wrote docs scaffold from verified facts.

### Verification
- All endpoint claims above returned real payloads with field lists recorded in provenance doc.
- `backend/.venv/bin/python -c "import fastapi, pandas, numpy, pydantic, httpx, pytest"` → OK.
- Git: `git status` clean before commit; push to `origin/ashwinwork` succeeds.

### Screenshots
None (no UI yet).

### Next
Build 1: Vite+React+TS scaffold + design tokens (`tokens.css`), FastAPI app skeleton with Pydantic contracts, ingestion script for session 9558 + Jolpica grid + MultiViewer corners → normalized verified cache in `backend/data/`.

---

## Build 1 — 2026-10-18 — Project scaffold: contracts, tokens, shared race clock

### Goal
Stand up both codebases with a verified test loop and the two load-bearing foundations: the Pydantic API contract layer and the shared race-clock store.

### What shipped
- **Frontend** (`frontend/`): Vite + React + TS via `npm create vite@latest -- --template react-ts`; deps added: `lucide-react`, `zustand`; dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
  - `src/styles/tokens.css` — full Digital Pitwall token set (canvas/surfaces/borders, accent + status colors, series 1–5, font stacks, text/space/radius scales, timing-row metrics); imported first in `src/main.tsx`.
  - `src/store/clock.ts` — single zustand race clock (`t`, `playing`, `speed`, `duration`, play/pause/toggle, `setSpeed`, clamped `seek`); `src/store/clock.test.ts` (3 Vitest tests).
  - `vitest.config.ts` — globals + node env, `/api` dev proxy → `localhost:8000`.
- **Backend** (`backend/`):
  - `requirements.txt` pinned to the Build 0 verified set (fastapi 0.146.0, pydantic 2.14.1, pandas 3.0.6, numpy 2.5.4, httpx, pytest, uvicorn[standard]) — `.venv` already matches.
  - `app/contracts.py` — `DataMode` (`REPLAY`/`ESTIMATE`/`SIMULATION`/`UNAVAILABLE`/`LIVE`), `Driver`, `SessionInfo`, `TimingRow`, `RaceControlEvent`, `CarMarker` (with `interpolated` flag), `StateAtTime` (timing + markers + `marker_mode` defaulting to `ESTIMATE`).
  - `app/main.py` — FastAPI skeleton: `/api/health`, `/api/sessions`, `/api/session/{key}/state?t=`, `/api/session/{key}/race-control`; 503 until `backend/data/` is ingested, 404 for non-flagship session keys.
  - `app/tests/test_contracts.py` (3 tests) + `pytest.ini` (`pythonpath = .`, `testpaths = app/tests`).
- `.gitignore` verified to exclude `node_modules/`, `dist/`, `.venv/`, `__pycache__/`, `backend/cache/` while keeping `backend/data/` trackable.

### How (steps)
1. `npm create vite@latest frontend -- --template react-ts` → install → add state/test deps.
2. Wrote `tokens.css` from `docs/DESIGN_SYSTEM.md`; wired into `main.tsx` before `index.css`.
3. Wrote zustand clock store + Vitest tests.
4. Wrote `requirements.txt`, `contracts.py`, `main.py`, contract tests; added `pytest.ini` to fix `ModuleNotFoundError: app` when running pytest from repo root.
5. Verified everything (below), committed as Build 1.

### Verification
- `frontend`: `npx vitest run` → **3/3 passed**; `npm run build` (tsc -b + vite) → clean, 222 kB JS bundle.
- `backend`: `.venv/bin/pytest -q` (from `backend/`) → **3/3 passed**.
- `uvicorn app.main:app` boots; `GET /api/health` → `200 {"status":"ok"}`; `GET /api/sessions` → `503` (dataset not ingested — expected).
- `git check-ignore` confirms ignore rules bite on `frontend/node_modules`, `backend/.venv`, `__pycache__`, `frontend/dist`.

### Screenshots
None (scaffold only; first UI screenshot lands with Race Control board).

### Next
Build 2: ingestion pipeline — `backend/app/ingest/` fetching session 9558 (per-driver `car_data`/`location`/`intervals` + session-level endpoints), Jolpica qualifying grid, MultiViewer Silverstone corners → normalized JSON in `backend/data/9558/`; then wire `/api/sessions` + `/state` to real data.

---

## Build 2 — 2026-10-19 — Real data: ingestion, state reconstruction, verified API

### Goal
Land the flagship dataset end-to-end: fetch OpenF1 session 9558, normalize to stable JSON contracts, reconstruct race state at arbitrary `t`, expose real-data API endpoints, and lock the master design directives that govern all future UI work.

### What shipped

**Ingestion** (`backend/app/ingest/`)
- `fetch.py` — httpx fetcher: 15 session-level + per-driver endpoint family for session 9558; 3 retries, exponential backoff; 404 treated as "no rows" (OpenF1 semantics); `--session` / `--force` flags. First run ~16s (session-level only; heavy car_data/location deferred to Build 3 per ADR-001 budget).
- `normalize.py` — raw cache (`backend/cache/9558/`, gitignored, 3.7M) → normalized JSON (`backend/data/`): `sessions.json` + `9558/{drivers,timing_base,positions,intervals,race_control,stints,pit,weather,overtakes,session_result,team_radio,laps}.json`. Conventions: `t` = seconds since session `date_start` UTC; interval downsample 1.0s / 0.1 gap-delta; compact `json.dump(separators=(",",":"))`; `_SESSION_STRIP = {"is_cancelled"}`; `_DRIVER_STRIP = {"meeting_key","session_key","country_code"}`.

**State reconstruction** (`backend/app/state.py`)
- `build_state_at(t)` — current lap = max lap with non-null `date_start` ≤ t (skips Pérez lap-1 null); position forward-filled from change-points; intervals forward-filled with 30s staleness cap; compound/tyre_age/last_lap_ms from most recent started lap; flag scan from race-control; `data_mode="REPLAY"`, `marker_mode="ESTIMATE"`; `markers=[]` until Build 3 (needs car_data/location).

**API** (`backend/app/main.py` rewritten)
- `/api/health`, `/api/sessions`, `/api/session/{key}/drivers`, `/api/session/{key}/state?t=`, `/api/session/{key}/race-control` — all serve real normalized data; `_require_flagship` 404 for non-9558; FileNotFoundError → 503, KeyError → 404.

**Tests** (`backend/app/tests/test_data_qa.py`)
- 12 tests: session key 9558, 20 drivers, real driver-number set (not 1..20), no null `date_start` laps in timing_base, positions cover 19 runners, intervals 19 series (Gasly DNS exception), race-control 110 events, state@t monotonic positions, tyre ages sane, all `data_mode` values valid enums. Green from both `backend/` and repo root.

**Design directives** (docs)
- `docs/ART_DIRECTION_MASTER.md` — full verbatim master UI directive (CARBON/CHALK/SIGNAL, full `--gt-*` semantic token palette, module list, testing gates, §27 visual acceptance).
- `docs/LANDING_PAGE_DIRECTIVE.md` — verbatim landing experience spec (THE SIGNAL LAP, 7 screens, CTAs, motion budget, acceptance gate).

### How (steps)
1. Probed real raw cache shapes (timing_base/positions/intervals/race_control); confirmed driver numbers `{1,2,3,4,10,11,14,16,18,20,22,23,24,27,31,44,55,63,77,81}`, driver 10 = Gasly DNS, driver 11 = Pérez null lap-1 stamp.
2. Wrote `fetch.py` → ran → 15 raw files cached. Wrote `normalize.py` → fixed `_SESSION_STRIP` bug → re-ran → committed `backend/data/`.
3. Wrote `state.py` (null-lap guard, interval staleness, flag heuristic); rewrote `main.py` to load from `data/`.
4. Wrote `test_data_qa.py`; fixed driver-number and null-date assertions against real data → 12/12 green.
5. Verified live endpoints under uvicorn (foreground; backgrounded launch proved unreliable across tool calls — port free confirmed via `lsof`).
6. Frontend: `npm run build` (tsc+vite clean), `npm run lint` (oxlint clean), `vitest` 3/3.
7. Wrote ART_DIRECTION_MASTER + LANDING_PAGE_DIRECTIVE; updated README, this log, provenance, TASKS, DECISIONS.

### Verification
- `backend/.venv/bin/pytest -q` → **12/12 passed** (test_data_qa) + 3/3 (test_contracts) from both `backend/` and root.
- `frontend`: build clean (222 kB JS), lint clean, **3/3 Vitest**.
- Live API (uvicorn, all 200 OK):
  - `/api/health` → `{"status":"ok"}`
  - `/api/sessions` → session 9558, Silverstone, `data_mode:"REPLAY"`
  - `/api/session/9558/drivers` → 20 drivers, real team colours
  - `/api/session/9558/state?t=1800` → lap 18, RUS P1 / HAM P2 (+0.291s), MEDIUM age 17 — matches mid-race British GP 2024 narrative
  - `/api/session/9558/race-control` → real flag/DRS/steward messages

### Screenshots
None yet (no UI surface). First screenshot lands with Race Control board (G1.5).

### Next
Build 3: UI phase governed by ART_DIRECTION_MASTER + LANDING_PAGE_DIRECTIVE — full `--gt-*` tokens, landing page at `/` (Signal Lap hero), `/app` shell, Race Control board (G1.5), timing tower (G1.6), heavy per-driver ingest (car_data/location) for track map (G1.7), replay controls (G1.8). Verify §27 visual gate in a real browser.

---
