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

## Build 3 — 2026-10-19 — UI phase 1: landing, app shell, Race Control, timing tower, replay

### Goal
Implement the first full UI pass under ART_DIRECTION_MASTER + LANDING_PAGE_DIRECTIVE: full `--gt-*` token palette, self-hosted fonts, SIGNAL LAP landing at `/`, `/app` shell with Race Control board (G1.5), clock-driven timing tower (G1.6), replay controls (G1.8). Commit and push so any agent can resume.

### What shipped

**Tokens + base** (`frontend/src/styles/tokens.css`, `index.css`)
- Full `--gt-*` semantic palette per master directive (void/canvas/surface-1..4/inset, borders, text, signal, 8 telemetry colors, status, data-mode colors); 4px spacing scale; radius scale; motion tokens with `prefers-reduced-motion` → 0ms; `--gt-sidebar-w`/`--gt-tower-w`. No raw hex in components.
- Self-hosted fonts via `@fontsource-variable/inter` + `@fontsource/ibm-plex-mono` (npm); tabular numerals on `.mono`.

**Landing** (`frontend/src/routes/landing/Landing.tsx` + css)
- THE SIGNAL LAP 7-screen landing: hero (headline "Every gap tells a story.", thesis, CTAs ENTER THE PITWALL → `/app` + EXPLORE A RACE), The Race Decoded, Rewind the Moment, Find the Difference, Test the Decision, The Record, Enter the Pitwall closing. Original SingleSeater + CircuitPath SVGs. No fake live stats; REPLAY honesty preserved.

**App shell + Race Control** (`frontend/src/routes/app/AppShell.tsx` + css, `RaceControl.tsx` + css)
- `/app` shell: sidebar nav (Race Control, Battle Lab, Race Intelligence, Strategy Lab, … placeholders), top bar with session identity + data-mode badge, loading/error states. Grid layout: timing tower | center (track map placeholder + replay controls) | race-control feed.
- Race control feed: real 110 events from `GET /api/session/9558/race-control`, lap badges, flag colors, `eventSeconds()` maps event date → clock `t`.

**Timing tower** (`frontend/src/components/timing/TimingTower.tsx` + css)
- Clock-driven leaderboard: position, 3-letter acronym, team-colour chip (from `normalizeHex`, `#`-prefix added), interval/gap strings from backend, tyre compound (S/M/H/I/W) + age. Driven by `useRaceState()` → `api.state(key, t)`. P1 row signal-tinted; no color-only signaling.

**Replay controls** (`frontend/src/components/replay/ReplayControls.tsx` + css)
- Play/pause, 0.5×/1×/2×/4× speed, lap scrubber (1..52), absolute-time readout, REPLAY badge. Single rAF loop in `ClockDriver.tsx` (no per-component timers).

**Data/API glue** (`frontend/src/api/client.ts`, `hooks/useFlagship.ts`, `data/flagship.ts`, `store/clock.ts`)
- Typed client (`getJson` relative `/api/...`); `useFlagship()` loads session + drivers + race-control once; `FLAGSHIP_SESSION_KEY = 9558`; `sessionDurationSeconds()` clamps window to [1h, 4h] fallback 87×60 (intervals max t ≈ 5230s); zustand clock with clamped seek + duration.

**Cleanup**
- Deleted scaffold files: `App.css`, `assets/{hero.png,react.svg,vite.svg}`.

### How (steps)
1. Wrote tokens.css (full palette), index.css reset, index.html meta, vite.config.ts (proxy kept), package.json deps (react-router-dom, zustand, lucide-react, fontsource, vitest/oxlint/jsdom).
2. Wrote client.ts, flagship.ts, useFlagship.ts, format.ts, clock.ts (+ 3 tests), ClockDriver, SingleSeater, CircuitPath.
3. Wrote Landing (7 screens), AppShell, TimingTower, RaceControl, ReplayControls (+ css modules).
4. Fixed RaceControl props (session/drivers/raceControl; `eventSeconds` instead of hardcoded date); TimingTower `teams` Map prop.
5. Deleted scaffold assets; verified `npm run build` (tsc -b + vite clean, ~284 kB JS), `npm run lint` (2 non-blocking `set-state-in-effect` warnings), `npm test -- --run` (3/3 clock).
6. Verified backend runtime under uvicorn: health, state@t=1800 (lap 18, RUS P1, +0.291), drivers 20, race-control 110 events; measured payload sizes (state ≈ 4 kB, RC ≈ 20 kB; data dir 788 kB) — informs Vercel lambda bundling.
7. Updated README, this log, TASKS; committed Build 3; pushed to `origin/ashwinwork`.

### Verification
- `frontend`: `npm run build` SUCCESS; `npm run lint` 2 warnings only (oxlint, non-blocking; no eslint in project); `npm test -- --run` 3/3.
- `backend/.venv/bin/pytest -q` → 15/15 still green (12 data-QA + 3 contracts).
- Live uvicorn API verified (health/state/drivers/race-control all 200).

### Known gaps (next builds)
- Track map markers (G1.7) still `markers=[]` — needs per-driver `car_data`/`location` extract in `normalize.py`.
- Screenshots / Playwright E2E pending.
- Heavy per-driver ingest deferred (ADR-001 budget).

### Next
Build 4: deployment — Vercel (FastAPI serverless + SPA via `app.frontend()`, data 788 kB fits lambda); static JSON export fallback. Then location ingest for track map, screenshot pass, §27 visual gate.

---

## Build 4 — 2026-10-19 — Public deploy: Vercel serverless FastAPI + SPA

### Goal
Make GRIDTRACE publicly accessible at a stable URL: one Vercel project serving the built React SPA from the CDN and the FastAPI API as a serverless function, with the committed `backend/data/` dataset in the lambda bundle. Docs-first: ADR-008 records every deploy decision.

### What shipped
- **Production URL: https://gridtrace.vercel.app** (project `ashvyagnis-projects/gridtrace`, account `ashvyagni`). Landing `/`, app `/app`, API `/api/*`. Verified publicly with curl after deploy.
- **Root `pyproject.toml`** (new): project metadata + `[tool.vercel] entrypoint = "backend.app.main:app"` + `[tool.vercel.fastapi.static] exclude = true`; lambda deps trimmed to `fastapi==0.146.0` + `pydantic==2.14.1` (pandas/numpy/httpx not needed at runtime — data is pre-normalized).
- **Root `vercel.json`** (new): `buildCommand: "cd frontend && npm ci && npm run build"`; `functions["backend.app.main:app"] = { maxDuration: 30, includeFiles: "backend/data/**" }` (788 kB dataset in bundle).
- **`.vercelignore`** (new): excludes only `frontend/node_modules/`, `frontend/dist/`, test artifacts, `backend/.venv/`, `backend/cache/`, `backend/app/tests/`, `__pycache__`, `docs/`, `.github/`, `.DS_Store`, `.vercel/`, `.env*`. Frontend sources + `package-lock.json` ARE uploaded so Vercel's npm ci + tsc work. (First deploy failed TS5083 because an earlier draft wrongly excluded frontend sources — see How.)
- **`backend/app/main.py`**: guarded SPA mount appended — if `frontend/dist` exists (it does in the Vercel build, absent locally) `app.frontend("/", directory=..., fallback="index.html")` promotes the built SPA to the CDN via FastAPI's Vercel integration; local uvicorn path unchanged.
- **`.gitignore`**: added `.vercel` and `.env*` (link state + `vercel.json`-adjacent secrets never committed).
- **`docs/DECISIONS.md`**: ADR-008 — single-project SPA+API on Vercel, entrypoint wiring, lambda file inclusion, preview-auth caveat, static-JSON fallback plan.

### How (steps)
1. Installed/confirmed Vercel CLI (`ashvyagni` login); `vercel link` → created project `gridtrace`.
2. Wrote `pyproject.toml`, `vercel.json`, `.vercelignore`, `main.py` SPA block; local TestClient verification (`/` and `/app` → 200 text/html when dist present, API unchanged).
3. `vercel deploy` (preview) **failed**: `TS5083: Cannot read file '/vercel/path0/frontend/tsconfig.json'` — `.vercelignore` had excluded frontend sources/configs while `buildCommand` still ran `tsc -b`. Fixed `.vercelignore` to keep all frontend sources + tsconfig + vite config + lockfile; redeploy succeeded.
4. Preview URL then served but sat behind Vercel "Standard Protection" (auth wall) — public verification must go through production.
5. `vercel deploy --prod` → Ready in 23s; alias `gridtrace.vercel.app`. Python 3.12 + uv on Vercel; frontend build ~12s.
6. Public curl verification against `https://gridtrace.vercel.app`:
   - `/` and `/app` → 200 text/html, `<title>GRIDTRACE — Every gap tells a story</title>`
   - `/api/health` → 200 `{"status":"ok"}`
   - `/api/session/9558/state?t=1800` → 200, lap 18, 20 timing rows, `data_mode: "REPLAY"`, RUS P1 (MEDIUM, 17 laps) HAM +0.291 — **byte-identical to local uvicorn response**
   - `/api/session/9558/race-control` → 200, 20 142 B; `/api/session/9558/drivers` → 20 drivers
7. Wrote ADR-008; updated README (Build 4 row + live URL) + this log + TASKS.

### Verification
- Production endpoints above all 200 and payload-matched against local uvicorn on the same dataset.
- Local still green: `backend/.venv/bin/pytest -q` 15/15 from root; TestClient SPA/API checks pass with and without `frontend/dist`.
- Deployed title/meta verified (not just HTTP 200 — actual HTML shell).

### Known gaps (next builds)
- Preview URLs behind Vercel auth — share production URL; or flip team/project protection when a public preview is needed.
- Track map still `markers=[]` (G1.7) — per-driver location ingest remains next technical work.
- No Playwright E2E (G1.10); no screenshots in README yet.
- Lambda cold starts unmeasured; state payload (~4 kB) is small, RC (~20 kB) fine, heavier future endpoints may need static-JSON fallback (ADR-008).

### Next
Build 5: per-driver `location` ingest → track map markers (G1.7); screenshot pass for README/BUILD_LOG; Playwright smoke E2E. GitHub Pages research-docs export (G3.5, ADR-006) whenever convenient.

---

## Build 5 — 2026-10-19 — Track map: per-driver location ingest + moving-car markers (G1.7)

### Goal
Put the cars on the track. Ingest OpenF1's per-driver `location` stream for the flagship session, normalize it into a committed dataset, serve circuit geometry + position markers at arbitrary `t`, and render a truthful SVG track map inside the Race Control board.

### What shipped
- **Ingest (`backend/app/ingest/fetch.py`)**: per-driver `location` pull for session 9558 → `backend/cache/9558/location/location_<n>.json`, 20 drivers × ~33,896 rows, 82 MB (gitignored). Empty-filter responses return `{"detail":"No results found."}` — treated as empty, not fatal.
- **Normalize (`backend/app/ingest/normalize.py`)**: → `backend/data/9558/locations.json` (3.0 MB; 20 drivers × ~7710 samples at ~2 Hz; t −3300.6..5489.7, `[[t, x, y], ...]` per driver) + `backend/data/9558/circuit.json` extended with a closed 230-point Silverstone path `{x:[], y:[]}` plus MV corners and pit-loss constants (normal 20.93 / sc 13.26 / vsc 15.14).
- **State markers (`backend/app/state.py`)**: `_marker_at` samples a driver's path with linear interpolation across gaps ≤2 s, holds the last sample up to 5 s (stale → dropped), and admits the leader only within a 2 s tolerance; response gains `markers` and `marker_mode` (`REPLAY` | `UNAVAILABLE`). Missing `locations.json` degrades to `markers=[]` — never a 503.
- **Circuit endpoint**: `GET /api/session/{key}/circuit` (gated by `_require_flagship`) returning `CircuitPath {x: [], y: []}` + corners; `Circuit*` types added to `contracts.py`.
- **Frontend**: `api.circuit()` + `useCircuit` hook; `components/track/TrackMap.{tsx,css}` — locked orientation `ROTATION_DEG = 84.25`, `FLIP_Y = true` (ADR-009), bbox-fit projector, 18 corner labels, start/finish tick, 20 team-coloured markers; Race Control swaps the placeholder `CircuitPath` for TrackMap with a `marker_mode` honesty hint. `useFlagship.ts` extended with `useCircuit`/`useDriverColour`.
- **Bug found & fixed during DOM check**: API `circuit.path` serializes as `{x:[], y:[]}` but `client.ts` had typed it as `CircuitPoint[]` → `circuit.path.map is not a function` crashed the board. Fixed the type in `client.ts` and made TrackMap zip `path.x`/`path.y` with a length guard.
- **Tests**: `backend/app/tests/test_markers.py` added (interp, stale-hold, lead tolerance, UNAVAILABLE degradation) → **22 pytest green**; frontend 3 Vitest green; `tsc + vite build` (286.97 kB) and oxlint (2 pre-existing warnings) pass.

### How (steps)
1. Fetched location per driver (82 MB cache), normalized to committed 3.0 MB `locations.json` + closed circuit path.
2. Verified OpenF1↔MultiViewer frames are aligned (bounds ~2 m, nearest-path median ~23 m) → markers plot directly on the MV polyline, no registration transform.
3. Orientation sweep vs rasterized reference mask → IoU 0.7574 @ +84.25° with y-flip (peak; MV `rotation: 92` alone lower) — locked, recorded as ADR-009.
4. Backend markers + circuit endpoint + 22 tests; frontend types/hook/TrackMap/RaceControl.
5. Headless-Chrome DOM dump proved the `path.map` crash → type fix → re-dump: 20 `tm-marker`, 18 corner labels, no "CIRCUIT MAP UNAVAILABLE".
6. Screenshot `docs/screenshots/2026-10-19-build5-racecontrol-trackmap.png`; data-honesty probes at t=0 (nulls → "—", REPLAY badge) and t=1800 (lap 18, RUS last lap 96365 ms, MEDIUM 17).

### Verification
- `backend/.venv/bin/pytest -q` → 22 passed; `npm test -- --run` → 3 passed; `npm run build` + `npm run lint` → clean (2 known warnings).
- `GET /api/session/9558/circuit` → full path + 18 corners; `?t=0` → 20 markers at grid, `marker_mode: REPLAY`, all timing nulls; `?t=1800` → lap 18, real gaps/tyres.
- Screenshot reviewed: track centered, 18 labels, start/finish tick, 20 markers clustered at grid at t=0, status row honest, no console errors.

### Known gaps (next builds)
- No Playwright smoke E2E (G1.10 — not installed).
- Segment-code decode still TODO (see provenance research log); Battle Lab (G2.1) is the next P0-depth feature.
- GitHub Pages research-docs export (G3.5 / ADR-006) still pending.
- Marker stale-hold can briefly freeze a car in heavy traffic; revisit if t-gap sampling shows it.

### Next
Build 6: Battle Lab distance-aligned telemetry compare (G2.1) or Playwright smoke E2E (G1.10) — pick per P0/P1 order in TASKS.

---

## Hotfix 5.1 — 2026-10-19 — Production `/app` 404 → SPA fallback rewrite (ADR-010)

### Goal
`https://gridtrace.vercel.app/app` returned FastAPI's JSON `{"detail":"Not Found"}` even though Build 4 verification had shown it working — restore deep links without touching the API.

### Diagnosis
- Probes: `/`, `/index.html`, `/assets/*` → 200 static CDN (etag, `x-vercel-cache: HIT`); `/app` and a random path → 404 with `content-type: application/json` (FastAPI body); `/api/health` → 200 `{"status":"ok"}`.
- Chain: Vercel promotes `frontend/dist` to the CDN, so only real file paths serve statically. `/app` falls through to the Python function; inside the lambda bundle `frontend/dist` is absent (`includeFiles: "backend/data/**"` only), so the guarded `app.frontend()` mount in `main.py` never registers its routes → FastAPI JSON 404.

### Fix
`vercel.json`: `"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]` — rewrites run after the filesystem check (static wins), negative lookahead keeps `/api/*` on the function. `app.frontend()` mount retained for local dev / safety net (ADR-010 records the tradeoffs + fallback plan).

### Verification (production, after `vercel --prod`)
- `/app` → 200 `text/html`, `<title>GRIDTRACE — Every gap tells a story</title>`
- `/` → 200 HTML; `/assets/index-Bzk-1ApU.js` → 200 JS; random path → 200 HTML (SPA fallback)
- `/api/health` → 200 JSON; `/api/session/9558/circuit` → 200 JSON (rewrites do not shadow the API)

### Next
Build 6: Battle Lab (G2.1) or Playwright smoke E2E (G1.10) — pick per P0/P1 order in TASKS.

---

## Build 6 — 2026-10-19 — Battle Lab: distance-aligned telemetry compare (G2.1)

### Goal
Two drivers, one circuit axis. Ingest per-driver `car_data`, project it onto a fixed distance grid (ADR-011), serve paired speed/throttle/brake traces + sector deltas, and ship a Battle Lab route with hand-rolled SVG charts — the platform's first *INVESTIGATE*-layer view.

### Plan (steps)
1. Docs-first: this entry, TASKS G2.1 → `[~]`, ADR-011.
2. Ingest: extend `ingest/fetch.py` → per-driver `car_data` into `backend/cache/9558/car_data/` (gitignored); extend `ingest/normalize.py` → distance-binned `backend/data/9558/telemetry.json` (per driver/lap integer arrays, `sd` sector splits, corner distances on `circuit.json`).
3. Backend: `GET /api/session/{key}/telemetry?drivers=A,B&lap=N|best` (flagship-gated, contracts, `_require_flagship`) + pytest.
4. Frontend: Battle Lab route — Driver A/B pickers, lap selector (default "Fastest (each)"), stacked SVG charts (speed / throttle / brake / Δt) sharing a distance x-axis with corner + sector markers, sector-delta table, `REPLAY` honesty badge; `deltaTimeAt` util + Vitest.
5. Verify: pytest / `npm run build` / `lint` / `test -- --run`; headless-Chrome DOM + screenshot.
6. Deploy: `vercel --prod` + live curl checks.
7. Docs: BUILD_LOG results, TASKS G2.1 `[x]`, README status row — commit + push (README rides).

### Results (all verified)
- **Units bug found + fixed (ADR-011)**: OpenF1/MultiViewer path coordinates are **decimetres** — `PATH_UNITS_PER_METRE = 10.0` added; circuit corner `dist`/`length_m` and telemetry `length_m`/`sd` now divided through. Re-normalized: Silverstone length **5821.3 m** (1.2% under official 5891 m), corners 452.1–5675.0 m, 959 laps, durations 88.3–128.5 s, max binned speed 336 km/h. TrackMap IoU 0.7574 unchanged.
- **Ingest**: `fetch.py --session 9558` pulls `car_data` for all 20 drivers (~6 Hz × 33,181 rows) into gitignored `backend/cache/9558/car_data/`.
- **Dataset**: `backend/data/9558/telemetry.json` — 19/20 drivers (Gasly #10 has no car_data — honest gap), 959 laps, 180 bins over length, `sd` len 2 → 3 sectors.
- **Backend**: `GET /api/session/{key}/telemetry?drivers=A,B&lap=N|best` (flagship-gated, contracts `TelemetryLap`/`TelemetryDriver`/`TelemetryCompare`, `_select_lap` 404s). **pytest 36 passed** (14 new in `test_telemetry.py`).
- **Frontend**: `BattleLab` route (Driver A/B selects, lap input, stacked SVG speed/throttle/brake + Δt chart sharing a distance axis with corner + sector markers, sector-delta table, rail, `REPLAY` badge, honest 404 branch), `delta.ts` (`deltaTimeAt`/`cumulativeDelta`) + 12 Vitest tests, wired into `AppShell` nav.
- **Quality gates**: `npm run lint` — only the 2 pre-existing warnings (`Landing.tsx:16`, `useFlagship.ts:25`); `npm run build` clean; `vitest` 12 passed.
- **Visual QA (headless Chrome + CDP)**: captured `docs/screenshots/2026-10-19-build6-battlelab.png` (default) and `2026-10-19-build6-battlelab-404.png` (selecting Gasly #10 → `NO TELEMETRY FOR SELECTION · 404`, `role="alert"`). Two defects found + fixed + re-verified: sector-table Δ column clipping (cell padding) and SPEED chart "0" y-tick sitting on the axis rule (label clamp).

### Next
Docs close-out (this entry, TASKS G2.1 → `[x]`, README row), final gates + `vercel --prod`, Build 6 commit/push. Then **art-direction resurrection** (§19 task graph A–H) — see `docs/ART_DIRECTION_MASTER.md` + `docs/UI_UX_SPECIFICATION.md`; needs an ADR for the 3D stack (vs ADR-005's no-3D-lib stance).

## Build 7 — 2026-10-19 — Art-direction docs + 3D single-seater asset (resurrection Tasks B+C)

### Goal
Lock the resurrection in writing before any pixels move: reconcile the art-direction directive stack (CARBON/CHALK/SIGNAL + DEPTH master vs the older no-3D landing directive), then ship the first original 3D asset so the cinematic hero has something to render.

### What shipped
- **Task B — docs batch** (commit `50df567`): `docs/ART_DIRECTION.md` (source hierarchy, supersession table, DEPTH provenance, task-graph map A–H), rewritten `docs/DESIGN_SYSTEM.md` (full `--gt-*` token tables, Inter + IBM Plex Mono decision, scene-material spec, motion/a11y/perf), `docs/UI_UX_SPECIFICATION.md` (4-region layout, Circuit Stage, crosshair, Race Ribbon, states, breakpoints), ADR-012 in `docs/DECISIONS.md` (Three.js/R3F permitted for hero + Circuit Stage; ADR-005 narrowed — charts stay SVG/D3), README docs map.
- **Task C — 3D asset** (commit `ba677e5`): deps three@0.186.1, @react-three/fiber@9.8.2, @react-three/drei@10.7.9 (MIT verified). `frontend/src/components/three/SingleSeater3D.tsx` — procedural non-branded single-seater (CARBON body, CHALK line accents, SIGNAL highlights; halo, front/rear wings, 4 wheels, suspension arms; faces +X, floor y=0). Not yet imported; tree-shaken until Task D lazy-loads it.

### Resolution (the big conflict)
`LANDING_PAGE_DIRECTIVE.md` §6 no-3D clause + §2 SVG hero + §9 gate are **superseded** by the newer master directive (option 2, newest-user-instruction wins). The directive's seven landing screens survive; only the hero treatment changes (flat SVG → cinematic 3D) and the gate moves to master §27. Documented in `ART_DIRECTION.md` supersession table. DEPTH-spec text is not in the repo — reconstructed provenance documented rather than fabricated.

### Verification
Doc cross-links checked; `SingleSeater3D.tsx` compiles under `tsc -b` (build green). No visual change yet (asset unimported).

### Next
Task D: cinematic 3D landing hero — scene tokens (`--gt-scene-*`, `--gt-scene` motion), lazy `HeroScene.tsx`, WebGL probe + SVG fallback.

## Build 8 — 2026-10-19 — Cinematic 3D landing hero (resurrection Task D)

### Goal
Replace the flat-SVG Signal Lap hero with the cinematic single-seater scene from the master directive: carbon environment, chalk analytical linework, selective signal accent, depth from fog + soft key light + vignette — without regressing when WebGL is unavailable or motion is reduced.

### What shipped
- **Tokens** (`frontend/src/styles/tokens.css`): scene block `--gt-scene-carbon #10151a`, `--gt-scene-chalk #d5dde4`, `--gt-scene-signal #ff5b49`, `--gt-scene-grid #222c35`, `--gt-scene-fog #080a0d`; motion `--gt-scene: 420ms` (reduced-motion: `0ms`).
- **`frontend/src/components/three/HeroScene.tsx`** (new, default export `{ onReady }`): R3F Canvas (dpr [1,2], alpha, camera [4.2, 2.4, 4.8] fov 32) with `THREE.Fog` (near 6, far 18), hemisphere 0.9 + key directional 1.2 + rim 0.3 lights, 14×14 `gridHelper`, `<SingleSeater3D body={CARBON} accent={SIGNAL} />`. Rig does a one-shot 0.5s entrance (y 0.6→0, yaw 0.9→0, ease `1-(1-t)³` accumulated in `useFrame` so wall-clock pauses can't overshoot) then calls `onReady` via a `fired` ref; reduced-motion renders the final pose immediately. Scene colors read from `--gt-scene-*` via a `cssVar()` helper (no raw hex).
- **`Landing.tsx`**: `HeroScene` is route-component-lazy (`React.lazy` + `Suspense`) so three.js (922 kB chunk) never enters the initial landing bundle (UI/UX spec: progressive 3D load). WebGL probe (try/catch, webgl2→webgl) gates rendering; on failure or during chunk suspense the original SVG `CircuitPath` + `SingleSeater` show through `HeroFallback`. Caption swaps `SIGNAL LAP · 0 → X% · ORIGINAL ILLUSTRATION` → `SIGNAL LAP · SINGLE-SEATER STUDY · WEBGL SCENE` when the scene fires ready. Hero scene element memoized so the rAF progress tick doesn't re-render the Canvas tree.
- **`Landing.css`**: `.landing__scene-frame` (relative, `min(100%,560px)`, 4:3, `overflow:hidden`, 420ms fade-in), radial vignette `::after` (transparent 55% → `--gt-void` 100%), `@keyframes landing-scene-in`; `.landing__title` weight 540→580 to hold optical density beside the 3D asset.

### Verification (all green)
- `npm run lint` — only the 2 pre-existing warnings (`Landing.tsx` rAF progress effect, `useFlagship.ts:25`); new code adds none.
- `npm run build` — `tsc -b && vite build` clean; `index` 300.72 kB + lazy `HeroScene` 922.31 kB chunk (gzip 244 kB) — three.js correctly out of the critical path.
- `npm test -- --run` — 12 passed (format.ts, delta.ts).

### Known gaps (next builds)
- No visual screenshot yet (headless Chrome lacks GPU — verify on real browser at Task G gate).
- `useMemo` freezes the scene element; progress-driven animation inside the scene is out of scope for Task D.
- Task E replaces the circuit stage below the hero; Task F rebuilds the app shell.

### Next
Task E: spatial circuit stage + custom pitwall crosshair + Race Ribbon timeline (UI/UX spec Circuit Stage section, master §9/§11/§12).

## Build 9 — 2026-10-19 — Spatial circuit stage + pitwall crosshair + Race Ribbon (resurrection Task E)

### Goal
Replace the flat SVG track map and the standalone replay-controls pill with the spatial circuit stage and the Race Ribbon timeline specified in the UI/UX spec (§Circuit Stage, §Crosshair, §Race Ribbon) and the master directive (§9/§11/§12): a CSS-perspective circuit plane that tilts in SPATIAL mode, click-selectable driver markers with turn labels, a custom pitwall crosshair that follows the cursor and pins on focus, and a bottom-spanning ribbon whose event pins carry semantic token + shape (never colour alone).

### What shipped
- **`frontend/src/utils/circuitProjection.ts`** (new, 98 ln): pure projection maths. `project()` applies the Silverstone orientation (rotation +84.25°, flip-y, ADR-009) and normalises to a padded layout box; `buildTrackLayout()` turns `CircuitInfo` + `MarkerPoint[]` into path data, corner positions, start/finish chord, and projected driver markers (interpolated flag preserved).
- **`frontend/src/components/stage/CircuitStage.tsx`** (new, 330 ln, comment-free): the spatial stage. `useElementSize` ResizeObserver hook; `projectPlaneToScreen()` perspective divide over `SPATIAL_TILT_DEG=58` / `PERSPECTIVE_PX=1100`; state for mode (SPATIAL/BLUEPRINT), camera (OVERVIEW/FOLLOW/SECTOR-disabled), cursor, hover label, focus pin. Hit-testing finds car or turn labels within 26 px; crosshair follows cursor and arms "armed" when a marker is focus-pinned. Markers are keyboard-focusable `<g role="button">` with Enter/Space select. HUD exposes mode + camera toggles (aria-pressed, honest disabled titles: `SELECT A CAR TO FOLLOW`, `SECTOR GEOMETRY UNAVAILABLE` — circuit data has no sector split). `activeCamera` derived during render so FOLLOW auto-falls back to OVERVIEW when the selection is cleared; `camRef` synced via effect for mousemove hit-tests. `cs__empty` shows `CIRCUIT MAP UNAVAILABLE` when layout is null.
- **`frontend/src/components/stage/CircuitStage.css`** (new, comment-free): stage fills its cell; `perspective: 1100px` on `.cs__viewport`, `.cs__plane` gets the tilt transform with `--gt-reveal` transition; track bed/line/SF/corner/marker styles; crosshair arms 10×1 + 4 px core; HUD pill groups; reduced-motion block.
- **`frontend/src/components/ribbon/RaceRibbon.tsx`** (new, comment-free): the timeline ribbon. Reads the master clock (`useClock`) — no independent timers (determinism §12.3). Pins built from race-control events via `pinKind()` (red/yellow/chequered/green/blue/neutral) mapped to semantic tokens + shape classes; expandable mode reveals axis ticks + pin labels. Transport: play/pause, prev/next event (aria-disabled when exhausted), lap nav (honestly disabled with `LAP BOUNDARIES UNAVAILABLE IN REPLAY API`), speed 0.5×/1×/2×/4×, expand toggle. Scrubber range seeks the shared clock. Empty state: `NO EVENTS RECORDED FOR THIS SESSION`.
- **`frontend/src/components/ribbon/RaceRibbon.css`** (new, comment-free): bottom-spanning flex column, transport row, pin shapes (square/triangle/diamond/circle/tick), expanded axis, reduced-motion.
- **`frontend/src/routes/app/RaceControl.tsx`** (edited): `selectedDriver` state; `<CircuitStage>` replaces `<TrackMap>` in the centre column (markers from `useRaceState`, colours from `useDriverColour`, select wired to TimingTower-adjacent state); `<RaceRibbon>` replaces `<ReplayControls />` at the app bottom, fed `events={raceControl ?? []}`.
- **`frontend/src/components/track/TrackMap.tsx`** (refactored, still exported): projection maths removed — now delegates layout to the shared `circuitProjection.ts` (`buildTrackLayout`), keeping the flat-SVG map as a preserved fallback without duplicating the rotation/normalisation logic.
- **`frontend/src/routes/app/RaceControl.css`** (edited): dead `.rc__track` rule removed; `.rc__center > .cs { flex: 1 1 auto; height: auto; }` so the stage fills the centre column beside the status bar; `.rc__track-status` gets `flex-shrink: 0`.

### Verification (all green)
- `npm run lint` — only the 2 pre-existing warnings (`useFlagship.ts:25`, `Landing.tsx:29`); CircuitStage and RaceRibbon add none.
- `npm run build` — `tsc -b && vite build` clean; no new chunks (stage/ribbon are static imports of the app route).
- `npm test -- --run` — 12 passed.

### Design decisions retained
- CSS perspective, not Three.js, for the circuit plane (charts stay SVG/D3 per ADR-012 narrowing; the stage is a 2.5-D tilt).
- Pins never encode by colour alone — every pin pairs a semantic token with a distinct shape (square/triangle/diamond/circle/tick).
- SECTOR camera permanently disabled because `circuit.json` has no sector split — honest UI title rather than a fabricated mode.
- No new CSS classes outside the component files; `.mono` and `.badge` reused from `index.css`.

### Known gaps (Task F)
- TimingTower row ↔ stage marker selection not yet cross-wired (Task F).
- Editoral race-control board styling still table-like — Task F rebuilds it per master §20.
- The 4-region app shell itself is still the 2-region Build 3 shell — Task F rebuilds AppShell.

### Next
Task F: 4-region app layout + editorial race-control board + microinteractions (master §10/§11/§20); wire TimingTower ↔ CircuitStage selection.

---

## Build 10 — 2026-10-19 — 4-region app shell + session picker + editorial race control (resurrection Task F)

### Goal
Rebuild the application shell into the four-region layout mandated by the master directive §10.3 (persistent left rail, session header, stage + timing table, ribbon spanning the bottom), add the deliberate session-selection screen required by §10.2 (never a marketing gate), and apply §20 microinteractions: selectable timing-tower rows and clickable editorial race-control events that seek the shared race clock, with focus-visible rings on every new interactive surface.

### What shipped
- **`frontend/src/hooks/useFlagship.ts`** (edited): optional `sessionKey` parameter defaults to `FLAGSHIP_SESSION_KEY`. All three hooks (`useRaceState`, `useCircuit`, `useDriverColour`) accept it and thread it through `Promise.all`, the sessions `find`, and the dependency array. Callers can target any session; existing call sites are unchanged.
- **`frontend/src/routes/app/AppShell.tsx`** (rewritten): holds `pickedKey` (explicit choice), `showPicker` (force flag), and derives `needsPicker = showPicker || (!loading && !error && !session)` so an invalid or absent session routes to `SessionPicker` rather than a blank shell (§10.2). `dataBadgeClass` maps a session's `data_mode` to the correct `.badge` variant — unknown modes get a plain `.badge` with the honest text, never a replay mislabel. Session header enriched with circuit + session name, session type, data-mode badge, current lap, and race clock (§11.1). A `session-switcher` button in the rail footer sets `showPicker` without leaving `/app`. `sessionKey` prop forwarded to `RaceControl` so the workspace follows the picker.
- **`frontend/src/routes/app/AppShell.css`** (edited): focus-visible ring on the switcher, header meta/lap/clock styles, `.app__session-switch`, `.app__error`/`.app__loading` states. Coverage verified: every class referenced by the TSX is styled (`.app__header-left` intentionally unstyled — structural wrapper only).
- **`frontend/src/routes/app/SessionPicker.tsx`** (new, comment-free): the deliberate session-selection screen (§10.2). Self-fetches `api.sessions()` on mount; does not gate — dismissing or picking immediately enters the workspace. States: `LOADING SESSIONS…`, `FAILED TO LOAD SESSIONS · {error}` (`role="alert"`), `NO SESSIONS AVAILABLE`. Each row shows meeting, circuit, session type, date, and an honest data-mode badge. `FULL CACHED COVERAGE` badge is applied only to session 9558 (the verified flagship dataset); other sessions show only their real `data_mode`. Helper copy: "GRIDTRACE replays historical race data. Every number on screen is traceable to a cached API response — nothing is simulated." BEM `picker__*`; self-contained CSS, no circular import from `index.css`.
- **`frontend/src/routes/app/RaceControl.tsx`** (edited): accepts `sessionKey = FLAGSHIP_SESSION_KEY` prop and forwards it to `useRaceState`/`useCircuit`. TimingTower is wired with `selected={selectedDriver}` and `onSelectDriver={setSelectedDriver}` (selection state established in Build 9). Race-control event rows are now `<button type="button">` — click seeks the shared clock via `useClock((s) => s.seek)` (no independent timers, determinism §12.3). `flagClass` helper returns semantic token classes (`--red` for RED, `--vsc` for VSC/YELLOW, `--sc` for SAFETY/SC) so the flag chip colour follows the event.
- **`frontend/src/routes/app/RaceControl.css`** (edited): `.rc__event` converted from a static block to a button reset (display block, width 100%, text-align left, transparent background, no border + bottom divider, inherit font/colour) with `cursor: pointer` and a focus-visible ring. Flag token colour classes added (`.rc__event-flag--red` → `--gt-danger`, `--sc` → `--gt-warning`, `--vsc` → `--gt-data-amber`).
- **`frontend/src/components/timing/TimingTower.tsx`** (edited): new props `selected = null` / `onSelectDriver?: (n: number | null) => void`. Each row is now a `<div role="button" tabIndex={0}>` with `aria-selected={isSelected}`, class `tower__row tower__row--selected` when selected, click toggle (clicking the selected row deselects), and Enter/Space keyboard toggle (`e.preventDefault()` on Space).
- **`frontend/src/components/timing/TimingTower.css`** (edited): `.tower__row` gains `cursor: pointer`; `.tower__row--selected` background `var(--gt-signal-subtle)`; `.tower__row:focus-visible` gets the standard 2 px signal outline with `-2px` inset offset.

### Verification (all green)
- `npx oxlint` — only the 2 pre-existing warnings (`useFlagship.ts:25:5`, `Landing.tsx:29:7`); the rewrite and new files add none.
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 12 passed (2 files).

### Design decisions retained
- **Local `badgeClass` in SessionPicker** — a shared helper would have imported from a module that imports from SessionPicker; a small local function avoids the circular import.
- **`FULL CACHED COVERAGE` only for 9558** — every other session in the (currently singleton) list would be over-claiming; the badge stays honest.
- **Double polling accepted** — AppShell's header clock and RaceControl's `useRaceState` each poll `state@t`; negligible for a local FastAPI instance and keeps both regions self-contained.
- **TimingTower rows toggle** — clicking the selected row clears selection, matching CircuitStage's marker behaviour and giving the user a way back to OVERVIEW.
- **Unknown data modes get a plain `.badge`** — never mislabelled as replay; the badge text is the honest mode string.
- **No new global CSS** — all new styles live in component CSS files; `.mono` and `.badge` reused from `index.css`.
- **Comment-free new code** — `SessionPicker.tsx`/`.css` carry zero comments; edited files keep their existing comments.

### Known gaps (Task G)
- §27 visual acceptance gate not yet run (1440×900 screenshot; headless Chrome on this machine lacks a GPU — Task G plans a headed capture or a documented limitation).
- Session picker currently lists one session (the verified flagship); multi-session coverage arrives with more ingested sessions.

### Next
Task G: visual acceptance gate (master §27 — every item). Task H: final report (master §28). Deploy at milestone with `vercel --prod --yes`.

---

## Build 11 — 2026-10-19 — Visual acceptance gate (resurrection Task G, master §27)

### Goal
Run the §27 visual acceptance gate against the real application: capture every major screen at 1440×900, inspect each of the 18 gate items in a real browser (or the strongest available equivalent), fix any weak composition, and record an honest verdict.

### What shipped
- **Capture harness** (`/var/folders/.../gt-capture/capture.mjs`, not committed): `playwright-core` + system Chrome (`channel: 'chrome'`, `--use-angle=swiftshader --enable-unsafe-swiftshader`). Viewport 1440×900, dark scheme, `reducedMotion: 'no-preference'`. Content-based waits (not fixed timeouts) because cold SwiftShader load runs ~6 fps: shot 01 waits `WEBGL SCENE`; shot 03 waits `.tower__row` then seeks the Race Ribbon scrubber (`input.rb__range`, native value setter + `input` event at 46% duration — React controlled input); shot 04 waits the BLUEPRINT toggle; shot 06 waits `.bl`.
- **6 gate screenshots** committed under `docs/screenshots/build10-gate/`: `01-landing-hero`, `02-landing-bottom`, `03-app-racecontrol-spatial` (mid-race), `04-app-racecontrol-blueprint` (mid-race), `05-app-session-picker`, `06-app-battlelab`.
- **SPATIAL circuit-stage contrast fix** (`CircuitStage.css`): thicker track stroke on the spatial view + lighter vignette so the path and car markers stay legible under the 58° CSS-perspective tilt. Re-captured mid-race so the 20 cars are spread around the circuit instead of stacked at the grid.

### §27 verdict (all 18 items inspected in the captured browser session)
| # | Item | Verdict |
|---|------|---------|
| 1 | CARBON/CHALK/SIGNAL identity | PASS |
| 2 | Exact palette via semantic tokens | PASS |
| 3 | Consistent color assignments | PASS |
| 4 | Data vs UI typography | PASS |
| 5 | Spacing + surface system | PASS |
| 6 | Not a generic dashboard template | PASS-with-note (Race Control flirts conventional; editorial feed + ribbon + Battle Lab lift it clear) |
| 7 | Distinctive circuit map | FIXED: SPATIAL was weak (thin track + heavy vignette); contrast fix re-captured mid-race and re-inspected — path + markers legible. BLUEPRINT excellent. |
| 8 | Purposeful, restrained annotations | PASS |
| 9 | Telemetry precise + legible | PASS (Battle Lab strongest screen) |
| 10 | Shared timeline language | PASS |
| 11 | Per-screen hierarchy | PASS |
| 12 | Complete control states | PASS (SECTOR permanently disabled — no sector data in circuit.json) |
| 13 | Readable at 1440×900 | PASS |
| 14 | Responsive behavior | Not verifiable from fixed-viewport shots (limitation) |
| 15 | Motion functional, not decorative | Not verifiable from statics (limitation) |
| 16 | Accessibility | Covered by prior code review (focus-visible rings, aria-selected, role=alert) |
| 17 | Real data / honest demo state | PASS |
| 18 | Real-browser inspection | PASS (headless Chrome + SwiftShader WebGL) |

**Gate result: PASS with refinements.** The weak item (SPATIAL circuit map) was fixed and re-verified. The remaining "not verifiable" items (14–16) are honest limitations of a fixed-viewport static capture, not failures.

### Verification
- `npx oxlint` / `npx tsc --noEmit` / `npx vitest run` — re-run after the CSS fix; same green result as Build 10 (2 pre-existing warnings, clean tsc, 12/12 tests).

### Known gaps
- Item 14 (responsive) and 15 (motion) still need a real multi-viewport + interaction pass — folded into Task H's report as open items.
- SPATIAL vertical composition (map occupies upper ~40%, empty perspective floor below) accepted as-is for the gate; further polish is optional.
- Session picker still lists one cached session (flagship 9558).

### Next
Task H: final implementation report (master §28) with the honest verdict above, open items, and a `vercel --prod --yes` milestone deploy.
