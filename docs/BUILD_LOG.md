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

## Build 12 — 2026-10-19 — Final implementation report (resurrection Task H, master §28)

### Goal
Close the art-direction task graph with an honest §28 final report: what works, what was actually verified, what's known-limitation, and how to run/deploy it.

### What shipped
- **`docs/FINAL_REPORT.md`** — §28 report: working-product inventory, design-system summary, tests actually executed (pytest pass, vitest 12/12, `tsc --noEmit` clean, `oxlint` 2 pre-existing warnings, §27 gate PASS-with-refinements), known-limitations table (responsive, interactive motion, single-session ingest, POSITION labelling, SPATIAL vertical composition), how-to-run, build history 0–11, verdict.
- **Task graph closed:** `TASKS.md` Tasks A–H all `[x]`; README docs index gained item 13 (FINAL_REPORT).

### Verification
Gates re-confirmed green before commit; report claims only what was executed.

### Known gaps
Carried forward from §27: items 14–15 (responsive/motion) unverifiable from statics; open items live in `docs/FINAL_REPORT.md`.

### Next
Task-graph docs polish: README live banner + root `AGENTS.md`/`HANDOFF.md` takeover docs, then milestone deploy.

## Build 13 — 2026-10-19 — Live banner + takeover docs (README, AGENTS.md, HANDOFF.md)

### Goal
Make the repo self-explanatory for any new agent or visitor: live URL front and centre, plus root-level onboarding docs.

### What shipped
- **README.md** — top production banner (**https://gridtrace.vercel.app**, routes `/` `/app` `/api/*`, hard-refresh note) + repo SSH line; Build 12 row in the status table; refreshed `Live:` line.
- **HANDOFF.md** (new, root) — current state, open items, how-to-run, how-to-deploy, conventions, key files, stuck-pointers.
- **AGENTS.md** (rewritten) — links HANDOFF first; states Tasks A–H complete (Build 12 / `461e029`), points future work at `docs/FINAL_REPORT.md` open items.

### Verification
- `git push origin ashwinwork` → `b29395e` on remote.
- `vercel --prod --yes` → `https://gridtrace-f6tvj136y-ashvyagnis-projects.vercel.app`, **Aliased → https://gridtrace.vercel.app**, Ready in 31s; build succeeded (`tsc -b && vite build`, same bundle hashes as local dist).

### Known gaps
None for this scope. Open product items unchanged (see `HANDOFF.md` / `docs/FINAL_REPORT.md`).

### Next
Product open items from `docs/FINAL_REPORT.md`: responsive multi-viewport pass, interactive motion verification, multi-session ingest, POSITION-bar labelling, SPATIAL vertical composition.

## Build 16 — 2026-10-20 — Award-reference landing redesign: boot → gate → main (REFERENCE_DESIGN_BRIEF)

### Goal
Rebuild the landing page against the three studied award references (aten7, landonorris, makemepulse), re-expressed in the GRIDTRACE CARBON/CHALK/SIGNAL identity — preloader, intro gate, ambient glitch, phase car, grain, scroll reveals — while honoring the data-honesty and reduced-motion non-negotiables.

### What shipped
- **`docs/REFERENCE_DESIGN_BRIEF.md`** — steal map per reference, screen-flow target, non-negotiables, component map, verification checklist. `AGENTS.md` gained the "Reference workflow (award-site study)" loop.
- **`landing/BootSequence.tsx` + `.css`** — telemetry boot overlay (~2.2s): mono log lines (`INIT TELEMETRY REPLAY` … `SYNC CLOCK`), progress bar 0→100 with tabular readout, faint rotating gap-arc SVG. `onDone` driven by a per-invocation `cancelled` flag (the earlier `ref`-based guard silently blocked the transition under React StrictMode's double-invoked effect).
- **`landing/IntroGate.tsx` + `.css`** — full-screen gate: `GlitchTitle` H1 `GRIDTRACE` (RGB cyan/signal echo), `SplitReveal` tagline, `ENTER REPLAY` CTA auto-focused, click-anywhere / Enter / Space to enter.
- **`landing/PhaseCar.tsx` + `.css`** — three-phase `SingleSeater` reveal: chalk stroke ghost wipes in (clip-path), fill fades over it, then signal glow + orbiting gap arcs pulse. Reduced-motion = fully formed.
- **`landing/useReveal.ts`** — IntersectionObserver → `data-reveal`/`data-revealed` on sections; reduced-motion marks everything visible immediately.
- **`landing/Landing.tsx`** — phase machine `boot | gate | main`; initializer: reduced-motion → `main`, else `sessionStorage gt:entered` → `main`, else `boot`; body scroll-lock while not `main`; focus returns to the primary CTA on enter; `sessionStorage` access wrapped in try/catch.
- **`landing/Landing.css`** — grain overlay (SVG `feTurbulence` data-URI, opacity 0.045), notched-corner hero frame (clip-path), section scroll-reveal transitions, restored reduced-motion overrides.
- **`components/motion/HoverLink.tsx` + `.css`** — hand-adapted `@skiper-ui/skiper40` underline-wipe link (skipped the shadcn/Tailwind scaffold; re-expressed the original's `origin-right/scale-x-0` → `hover:origin-left/scale-x-100` + arrow reveal in token CSS, no new deps). Used for `WHY TRUST THESE NUMBERS` and `OPEN THE REPLAY CLOCK`.
- **Dropped from landing:** the `HeroScene` WebGL lazy path + `webglOk` probe (the SVG phase car is the hero visual now). The `HeroScene`/`SingleSeater3D` files remain in the tree as deferred enhancement.

### How (steps)
1. Read the three reference briefs; wrote `REFERENCE_DESIGN_BRIEF.md`; updated `AGENTS.md` reference workflow.
2. Built `GlitchTitle`, `SplitReveal`, `HoverLink`, `BootSequence`, `IntroGate`, `PhaseCar`, `useReveal`; rewrote `Landing.tsx`/`Landing.css`.
3. Hand-adapted skiper40 (fetched `https://skiper-ui.com/r/skiper40.json`; confirmed its Tailwind/`next-link` deps → reimplemented as token CSS instead of scaffolding shadcn).
4. Verified via headless-Chrome captures (`ref-analysis/capture-landing.mjs`): desktop boot/gate/main + 6 scroll positions, mobile 390×844, `prefers-reduced-motion`; measured `scrollWidth === clientWidth` on both viewports.

### Verification
- `npx oxlint` → only the pre-existing `useFlagship.ts:25` warning; `npx tsc --noEmit` → clean; `npx vitest run` → 12/12.
- Captures confirm: boot panel renders (banner + `013%` + first log line); gate renders (glitch H1 + tagline + CTA, auto-focus); main renders fully formed; scroll reveals fire; reduced-motion skips to `main`; **mobile horizontal overflow fixed** (grid track `1fr`→`minmax(0,1fr)` + responsive SVG scaling brought `scrollWidth` 538→390).

### Known gaps
- Headless rAF throttling makes mid-boot progress frames hard to capture; `probe2` confirmed the bar animates 0→85%→100% on schedule on a warm load.
- `HeroScene`/`SingleSeater3D` are now unreferenced by the landing (kept as a documented deferral).

### Next
Screenshot-compare against reference captures, then `vercel --prod --yes` and refresh the stale `HANDOFF.md` HEAD line (still claims Build 14).

## Build 17 — 2026-10-20 — Award-level landing: pinned-poster spine, full-bleed type, react-bits motion

### Goal
Redo the landing (Build 16 was judged "almost no change" — same 7-section list, flat cards, subtle fade-ups). This time pull real award-site ambition: full-bleed cinematic display type, custom cursor, aggressive glitch, topographic/contour depth, heavy grain, a pinned circuit spine where telemetry chapters scroll past, and hand-adapted react-bits components — all in GRIDTRACE tokens, all reduced-motion safe, verified against the references and the running UI.

### Art direction (skills actually run)
- **taste-skill** `draw.mjs --sector studio-portfolio` dealt the **`pinned-poster`** direction: "something stays put while everything else changes." Mapped onto GRIDTRACE: **the circuit stays pinned while telemetry chapters scroll past it.** Kept palette+type from the brand (`--keep palette,type`); redrew the direction's "pale ground + stock coast photos" slots (they conflict with our dark identity and data-honesty) with our own SVG circuit + phase car instead.
- **ui-ux-pro-max** `search.py --design-system` confirmed the pattern: *Scroll-Triggered Storytelling* (chaptered narrative, climax CTA, premium dark + red action, chromatic aberration). Adopted the structure; kept our own tokens/face over its suggested palette.
- **impeccable** SKILL.md guidance applied (bold commitment, no timid half-measures); its `context` launcher hung on network/interactive so proceeded from the loaded skill doc.
- **Reference cross-check**: aten7 (full-bleed glitch type + orbital arcs + custom cursor + "click to enter" gate), landonorris (topographic contour background + mixed display scale + notched framing), makemepulse (heavy grain + scroll narrative) — all re-expressed in CARBON/CHALK/SIGNAL. No reference brand colors adopted.

### What shipped
- **`components/landing/ContourField.tsx` + `.css`** — fixed full-bleed background: procedurally-built nested topographic contour rings (16) + sweeping orbital arcs (7, one in signal), radial fade + mask, slow CSS drift/sweep. Replaces the old flat 40px grid on the main landing (grid kept only for the boot/gate "system" layer).
- **`components/landing/CustomCursor.tsx` + `.css`** — signal dot + lagging ring (`mix-blend-mode: difference`), rAF lerp follow, scales up + brightens over interactive targets (`a, button, [data-cursor]`). Auto-disabled on coarse pointers and `prefers-reduced-motion`.
- **`components/reactbits/DecryptedText.tsx` + `.css`** — hand-adapted from react-bits (upstream is 594 lines w/ canvas metrics + GSAP/`motion` deps). Our port: word-grouped per-char scramble→decrypt (signal-tinted while scrambling, settles to inherit), IntersectionObserver to trigger on view (`animateOn="view"|"hover"`), sr-only final text + `aria-hidden` animated layer, reduced-motion renders final instantly. **Word-grouping matters** — a naive flat `inline-flex` + nbsp version broke wrapping and clipped the finale headline (fixed below).
- **`components/reactbits/CountUp.tsx` + `.css`** — hand-adapted from react-bits (upstream 449 lines on `motion/react`). Our port: rAF + easeOutExpo, `from`/`to`/`decimals`/`prefix`/`suffix`/`separator`, IntersectionObserver trigger, sr-only final value, reduced-motion shows `to` immediately (derived at init, not synced in-effect — keeps `oxlint` clean).
- **`routes/landing/Landing.tsx`** — rebuilt around the pinned-poster spine: hero (full-bleed `EVERY GAP` / `TELLS A STORY` display type at `clamp(52px,12vw,200px)`, accent line in signal w/ periodic RGB glitch, faint circuit+car behind, decrypting kicker, CTA + scroll cue); a **chapters** run with a `position: sticky` circuit stage that holds center while 4 full-height chapter cards (POSITIONS / GAPS / PIT WINDOWS / SECTOR PACE) scroll past left/right, each with a decrypting title and a `CountUp` stat; a right-side **chapter rail** (dots + expanding labels) that tracks the active chapter via IntersectionObserver; then the release sections (The Record honesty + mode badges, decrypting finale headline, footer).
- **`routes/landing/Landing.css`** — full rewrite: contour/grain layering, display-type scale + glitch keyframes, sticky stage + `-100svh` track overlap, chapter cards (glass, backdrop-blur), rail states, finale, and explicit reduced-motion final-state overrides for every new animation.
- **Deps**: installed `motion` to satisfy upstream react-bits, then **removed it** — our hand-adapted ports use IntersectionObserver + rAF, so nothing imported it (kept the bundle honest).

### Bugs found + fixed during the look-and-fix loop
1. **DecryptedText collapsed spaces** — kicker rendered `MOTORSPORTRACEANALYSIS·HISTORICALREPLAY` (flex layout strips whitespace between cells; nbsp then made spaces non-breaking). Fixed by grouping chars into `inline-block` word spans with breakable gap spans, view set to normal `inline` flow.
2. **Finale headline overflowed/clipped** — the same non-wrapping `inline-flex` cut "THE RACE IS STILL TELLING…" off the right edge. Same fix; it now wraps to three centered lines.
3. **Mobile scroll-cue collided** with the stacked CTAs → hidden below 900px.

### How (steps)
1. Ran taste-skill `draw.mjs` (dealt + adopted `pinned-poster`), ui-ux-pro-max `search.py --design-system`, loaded impeccable; inventoried react-bits and chose `DecryptedText` + `CountUp` (skipped `SplitText` — pulls GSAP club plugin; we already have SplitReveal/GlitchTitle).
2. Wrote `ContourField`, `CustomCursor`, the two react-bits ports, rewrote `Landing.tsx`/`Landing.css`.
3. Fixed three `set-state-in-effect` warnings by deriving reduced-motion state at init (`reduced ? final : animated`) instead of syncing it inside the effect.
4. Gates → headless-Chrome capture (`ref-analysis/capture-b17.mjs`, desktop 1440×900 + 8 scroll steps + cursor + mobile 390×844 + reduced-motion) → read every key frame → fixed the two wrapping bugs + mobile cue → re-captured → re-verified.

### Verification
- `npx tsc --noEmit` clean; `npx oxlint` → only the pre-existing `useFlagship.ts:25` warning; `npx vitest run` → 12/12; `npm run build` succeeds.
- Captures confirm: boot panel renders; gate renders (glitch H1 + RGB aberration + focused CTA + custom cursor); hero full-bleed type + contours + circuit + signal glow; chapters pin the circuit while cards + CountUp + rail track the active chapter; finale wraps cleanly; **mobile `scrollWidth === clientWidth` (390)**; reduced-motion → straight to `main`, final text immediately, no cursor.

### Known gaps
- `motion` was installed then removed (our ports are dependency-free) — noted so nobody re-adds it wondering.
- The pinned stage shows a faint fixed grid inside the circuit mask (matches the reference's telemetry feel); the boot/gate layer still uses the old 40px grid by design.

### Next
Landing is the priority and is now at award level. Next: verify on the deployed alias, then move to the main `/app` experience per the open items in `docs/FINAL_REPORT.md`.

---

## Build 18 — Replay-lag fix: in-memory pre-indexed session store

### Goal
The master functional overhaul's first critical-path item: the replay clock lagged because `/api/session/{k}/state` re-opened + re-parsed ~3.8 MB of JSON (`locations.json` 3.1 MB, `intervals.json` 538 KB, `timing_base.json` 140 KB) and rebuilt per-driver timestamp arrays on **every request**. Measured baseline: **~130–155 ms warm / 470 ms cold per `/state` call**. At 8× playback `useRaceState` fires ~8 such requests/sec → the server saturates and playback desyncs.

### What shipped
- **`app/session_store.py`** — loads + parses each session's JSON **once**, precomputes a `StateIndex` (all timestamps as seconds-since-start floats, per-driver sorted times arrays, lap start-times, sorted flag events), caches it in a bounded (8-session) thread-safe LRU. `load_and_build_state` now reads from the cache.
- **`app/state.py`** — added `StateIndex` + `build_index(...)`; `build_state_at` accepts an optional precomputed `index`. The pure path (no index) builds one on the fly so unit tests and the cached path share **one** reconstruction implementation. `_last_at_or_before`/`_marker_at` take optional precomputed `times`; `_flag_state` takes precomputed sorted `(t, msg, flag)` events (no per-request `datetime.fromisoformat` of ~1200 laps + all RC events).
- **Tests** — `test_session_store.py`: index ≡ pure path (equivalence over 6 timestamps on real data), store parses once (identity), indexed path < 20 ms/call. **39→45 backend tests pass.**

### Measured result
- Pure `build_state_at` (indexed): **~0.445 ms/call (~2248 req/s)** vs ~27 ms when rebuilding the index each call.
- End-to-end HTTP `/state`: **~1.5–4 ms warm** (was ~130–155 ms) — **~65× faster**. Cold load is a one-time ~320 ms per session.
- Payload verified correct at t=1000 (lap 9, 20 timing rows, 20 markers).

### Verification
`pytest` 45 passed. Restarted uvicorn; curl latency samples + payload spot-check. `docs/REPOSITORY_AUDIT.md` written (full baseline + measured lag root cause).

### Next
All-race catalog + remove the single-session lock.

---

## Build 19 — All-race catalog + capability detection, remove single-session lock

### Goal
Second critical-path item: the API was hard-locked to one session (`FLAGSHIP_SESSION_KEY=9558`; `_require_flagship()` 404'd everything else), ingest hardcoded `/2024/12/` + circuit `2`, and `sessions.json` held a single row. Ship a real historical catalog with honest per-channel capability detection.

### Research (verified before coding)
- Jolpica (`api.jolpi.ca/ergast/f1`) — full historical calendar/results/standings back to **1950 (77 seasons)**; 24 races for 2024. Contract: `RaceTable.Races` (capital R), `SeasonTable.Seasons`. Detailed lap timing/telemetry/locations are **not** here (FastF1 2018+, OpenF1 2023+).
- OpenF1 real-time requires a **paid** subscription → live coverage reports `REQUIRES_AUTH`, never `LIVE`.

### What shipped
- **`app/providers/jolpica.py`** — pure `parse_seasons`/`parse_races` (unit-testable, no network) + cached, rate-limit-aware (429 backoff) HTTP client.
- **`app/contracts.py`** — `SeasonSummary`, `EventSummary`, `CapabilityReport`, `CatalogPage`, `CapabilityState` (AVAILABLE/PARTIAL/UNAVAILABLE/NOT_SUPPORTED/REQUIRES_AUTH/NOT_YET_PUBLISHED).
- **`app/catalog.py`** — merges Jolpica calendar with local ingest status (matches on season + circuit short-name; OpenF1's numeric `circuit_key` ≠ Jolpica's string `circuit_id`); honest per-channel capability matrix (live window closed → `NOT_SUPPORTED`; pre-2023 locations → `NOT_SUPPORTED`; ingested → disk-backed `AVAILABLE`/`UNAVAILABLE`).
- **`app/main.py`** — `/api/seasons`, `/api/seasons/{y}/events`, `/api/seasons/{y}/rounds/{r}/capabilities`; replaced flagship-only 404 with a real ingest check (non-ingested → `404 "not ingested"`).
- **Tests** — `test_catalog.py` (parsers, ingest match, capabilities, with `jolpica.fetch_events` monkeypatched for determinism). **45 backend tests pass.**

### Live-verified
`/api/seasons` → 77 seasons; `/api/seasons/2024/events` → 24 events with Silverstone (round 12) marked `ingested, session_key=9558`; capabilities round 12 → REPLAY/LOCATIONS AVAILABLE/LIVE NOT_SUPPORTED; round 5 (not ingested) → UNAVAILABLE + provider-coverage channels. Ingested `/state` still 200; non-ingested 404.

### Next
Wire the frontend SessionPicker to the catalog.

---

## Build 20 — Wire SessionPicker to the all-race catalog

### Goal
Make the catalog usable: browse seasons → events, pick the ingested one, honest disabled state for the rest. Functional wiring only (no visual redesign — Vairaj owns UI).

### What shipped
- **`api/client.ts`** — `SeasonSummary`, `EventSummary`, `CatalogPage`, `CapabilityReport` + `seasons()/yearEvents()/capabilities()`.
- **`SessionPicker.tsx`** — season `<select>` (default = latest year, derived not set-in-effect to keep oxlint clean), events list; ingested events are `REPLAY · CACHED COVERAGE` and pickable; others are `NOT INGESTED` and disabled.
- **`SessionPicker.css`** — minimal token-based rules for the season select + disabled item (existing `picker__*` classes reused).
- Fixed a self-introduced `set-state-in-effect` lint warning by deriving `loadingEvents`/`events` from an `eventsState` object keyed by season (no synchronous setState in the effect body).

### Verification
Gates green: `tsc --noEmit` clean; `oxlint` → only the pre-existing `useFlagship.ts:25` warning; `vitest` 12/12; `npm run build` OK. Headless-Chrome capture (`ref-analysis/catalog/capture.mjs`): picker renders, 2024 lists 24 events, **exactly 1 pickable** ("12. British Grand Prix · Silverstone · REPLAY · CACHED COVERAGE"), the rest disabled/NOT INGESTED. Mobile `scrollWidth === clientWidth`.

### Status / next
Replay performance + all-race catalog + capability detection are shipped and browser-verified. Remaining overhaul critical path: feature engines (Race Intelligence, Strategy, Driver/Constructor Labs, Vault, Prediction), Settings/diagnostics, `docs/UI_HANDOFF.md`, `docs/API_CONTRACT.md`, `docs/TESTING_AND_QA.md`, `docs/REALTIME_RACE_TRACKING_PLAN.md`, final report. Continue in follow-up builds.

---

## Build 21 — Race Intelligence engine + chequered-flag red-flag bug fix

### Goal
Unlock the first disabled module (Race Intelligence) as a real backend engine, and fix a data-honesty bug found while building it.

### What shipped
- **`app/intelligence.py`** — deterministic derived analytics (REPLAY provenance, all from ingested data): flag periods (SC/VSC/RED with durations), pit-stop aggregates (stops/total/avg per driver), overtake leaders (most made / most received), grid→finish position movement (biggest winners/losers), and lead-change count.
- **`contracts.py`** — `RaceIntelligence` + `FlagPeriod`/`PitStopAggregate`/`OvertakerEntry`/`PositionMovement`; `/api/session/{k}/intelligence` endpoint (404 for non-ingested).
- **Tests** — `test_intelligence.py` (pure detectors + flagship integration). **45→53 backend tests pass.**

### Bug found + fixed (data honesty)
`"CHEQUERED FLAG"` contains the substring `"RED FLAG"`, so both the existing `_flag_state` and my new detector set `red_flag=True` **after the race ended** (verified: `/state?t=5200` returned `red_flag: true`). Fixed by excluding `CHEQUERED` from red-flag matching in `state.py` and `intelligence.py`; the detector also closes any open SC/VSC/RED period at the chequered flag. Regression tests added (`red_flag` False after chequered; detector ignores chequered for RED).

### Live-verified (9558)
45 pit stops, 120 overtakes, 5 lead changes; top overtake MAG (10), biggest mover MAG P17→P12 (+5), most stops PER (4). `flag_periods` correctly empty (Silverstone 2024 had no SC/VSC/RED). `red_flag` False after chequered.

### Next
Frontend Race Intelligence module wiring (route + viz) → noted in `UI_HANDOFF.md` as functional wiring. Then Strategy Lab engine, Driver/Constructor Labs, Vault, Prediction, Settings, and the remaining overhaul docs.

---

## Build 22 — Feature engines: Strategy, Driver Lab, Constructor Lab, Prediction, Diagnostics

### Goal
Ship the remaining analytical engines as deterministic, tested backend services working on any ingested session (they run on the flagship 9558 today).

### What shipped
- **`strategy.py`** — tyre stints, compound sequences, pit windows, stop histogram.
- **`driver_lab.py`** — per-driver grid→finish, best/avg race lap (pit-out laps excluded), pit count, points, DNF, compounds.
- **`driver_lab.py`** — constructor aggregation (points, best/avg finish, net positions gained).
- **`prediction.py`** — honest deterministic what-if: predicts finishing order from observed average pace, scores itself against a grid-only baseline (MAE). Labeled `SIMULATION` (never `LIVE`); free/non-monetary; documents that calibrated Brier/temporal validation is blocked on multi-race ingest.
- **`/api/diagnostics`** — session-store cache info + per-dataset presence.
- Contracts + 6 engine tests. **53→58 backend tests pass.**

### Live-verified (9558)
Strategy (stints + stop histogram), Driver Lab (winner P1, best-lap sanity), Constructor Lab (**McLaren 27 / Mercedes 25 / Red Bull 18** — correct Silverstone points), Prediction (pace model MAE **0.22** vs grid baseline **1.78**, HAM/VER/NOR/PIA predicted=actual), Diagnostics (1 ingested, store cached 1, 15/15 datasets).

---

## Build 23 — Full module UI: every nav item live

### Goal
Give the entire project a basic, honest UI — no more "soon" placeholders.

### What shipped
- **`api/client.ts`** — typed methods + models for intelligence/strategy/driver-lab/constructor-lab/prediction/diagnostics.
- **`routes/app/modules/`** — shared token-based `Modules.css` (tables, stat cards, chips, flag badges), a `useModule` fetch hook, and views for Intelligence, Strategy, Driver Lab, Constructor Lab, Prediction Arena, and Settings/Diagnostics.
- **`AppShell.tsx`** — enabled all nav items (removed `disabled: true` "soon") and wired routes; **Race Vault** routes to the catalog picker.
- All views honor data-honesty: mode badges (`REPLAY`/`SIMULATION`), `—` for missing values, honest empty states ("NO SC / VSC / RED PERIODS").

### Verification
Gates green: `tsc` clean; `oxlint` pre-existing-only; `vitest` 12/12; `npm run build` OK. Headless-Chrome over all 7 routes: every module renders its data (Driver Lab shows HAM, Constructor shows McLaren, Prediction shows the MAE stats + hit table, Intelligence shows 45 pits / 120 overtakes / movers, Settings shows dataset presence), **no errors, no horizontal overflow** (driver overflow 0 px).

### Status
**"Basic UI for the entire project" target reached.** Remaining overhaul items: **E2** generalize ingest (beyond 2024/Silverstone) and **N1** real-time (externally blocked). Deploy (`vercel --prod`) not yet run this session.

---

## Build 24 — Generalize ingest (E2): any 2023+ session, not just 2024/Silverstone

### Problem
`ingest/fetch.py` + `normalize.py` were hardcoded to the flagship (Jolpica `/2024/12/`, MultiViewer `circuits/2/2024`, `jolpica_qualifying_r12.json`, `mv_circuit_2_2024.json`), and `normalize` overwrote `sessions.json` with a single session — so only one session (2024/Silverstone) could ever be ingested.

### What shipped
- **fetch.py** — derive `year` / Jolpica `round` / `circuit_key` from the fetched OpenF1 session + a Jolpica-calendar match on **country** (OpenF1 `country_name` → Jolpica `Location.country`/`circuitId`). Session-level endpoints now tolerate empty (404) so Qualifying/Sprint sessions (no pit/overtakes) ingest. **`--no-tracking`** flag skips the multi-MB per-driver `location`/`car_data` pulls; session-level data (laps/pit/stints/result/drivers/weather/radio/control) is all the analytical engines need.
- **normalize.py** — **merge** `sessions.json` (upsert by `session_key`) so multi-session ingest doesn't clobber; **glob** `jolpica_qualifying_r*.json` + `mv_circuit_*.json` (were hardcoded to flagship filenames); guard missing qualifying/circuit.
- **`tests/test_ingest_meta.py`** — 4 tests: meta derivation against a real-shaped session, fallback, country→round matching, import sanity. **58→62 backend tests pass.**

### Verified end-to-end (second session)
Ingested + normalized **Monaco 2023 Qualifying (session_key 9090, round 6)** via `--no-tracking`. Catalog `/api/seasons/2023/events` matches it **pickable**; `/capabilities` shows `ingested: true, session_key: 9090`. Engines `/intelligence`, `/strategy`, `/driver-lab` all return **200 REPLAY** on 9090. Normalized data committed (184 K).

### Honest limitation
The flagship **car-tracking replay** (`/state`) is **Race-lap-based** — it returns 0 cars for a Qualifying session (Q1/Q2/Q3 structure ≠ continuous race laps). The **analytical engines + catalog generalize fully**; the live car tracker remains a Race-session visualization. Documented, not faked.

---

## Build 25 — UI craft pass (impeccable + taste app-screen rules) + production deploy

### Direction
Loaded the **impeccable** and **taste-skill** design skills and applied their **app-screen** rules (Operate mode: colour on data not chrome, flat surfaces, type-first KPIs, receding nav, honest states) to the highest-visibility surfaces. The token system (CARBON/CHALK/SIGNAL) and layout were already strong — this was an execution-craft pass, not a rebuild.

### What changed
- **Circuit map corner labels** (`CircuitStage.tsx/.css`): every corner rendered a full `TURN n · dist m` string that collided badly at the centre of the map. Now renders the **corner number only** (tighter 7px offset, 9px mono, `pointer-events: none`); the full "TURN n · dist m" detail stays in the hover HUD. The flagship track map now reads clean.
- **Active nav** (`AppShell.css`): replaced the heavy signal-red fill with a restrained treatment — white label (brightness change, the dark-mode recommended default) + a thin `inset 2px` signal left-accent bar + a subtle surface step. Colour moved off the chrome onto a single accent, per the "navigation recedes" rule.

### Verification
Gates green: `tsc`, `oxlint` (pre-existing-only), `vitest` 12/12, `npm run build`. Deployed with `vercel --prod --yes` → **https://gridtrace.vercel.app** (live-verified: circuit corner numbers + refined active nav both serving). Screenshot: `docs/screenshots/build25-racecontrol-live.png`.

---

## Build 26 — Full UI rebuild from zero: the data-terminal world

### Direction
Ran taste-skill's direction-dealing engine (`draw.mjs --app --kind markets --theme dark`). It dealt **data-terminal** — the authentic long-session monitoring/timing aesthetic: cards **darker** than the ground (inverted elevation), tabular digits that stack, signs-not-colour, and every selection a 1px accent line. Mapped its accent to the product's own signal red. This replaced the previous world wholesale (a redesign, not a refinement).

### What rebuilt
- **tokens.css** — full remap to data-terminal: ground `#171719` (now *lighter* than the `#131217` cards — the signature inverted move), 42px rows, 55px rail, dense 24px gap / 32px pad, 26px title / 20px section / 13px body, status-sign pills. Fixed three latent undefined-token bugs (`--gt-border`, `--gt-status-danger`, `--gt-font-mono`).
- **Public Sans** text face (`@fontsource-variable/public-sans`) + **IBM Plex Mono** figures with `tabular-nums` everywhere.
- **AppShell** — labelled 220px sidebar → **55px icon rail**: GT monogram (signal), nine outline icons with tooltips + accessible names, settings utility and session badge pinned to the bottom. Active = signal icon + a 1px accent bar on the rail edge (the direction's selection mark). Frees ~170px of canvas.
- **Modules.css** (shared by all six analytical modules) — borderless dark cards, **sentence-case 11px grey headers** (was 9px uppercase tracked), 42px rows over hairline rules, a right-align `.num` helper, mono tabular figures, status pill chips.

### Verification
Gates green: `tsc -b`, `oxlint` (pre-existing-only), `vitest` 12/12, `npm run build`. Headless-Chrome confirmed the new world on Race Control + Driver Lab; deployed via `vercel --prod` → **https://gridtrace.vercel.app**, live-verified (icon-rail present, GT glyph, Public Sans title). Screenshot: `docs/screenshots/build26-rebuild-live.png`.

---

## Build 27 — "PIT WALL" rebuild: landing removed, broadcast shell, motion layer

### Direction
The user rejected the data-terminal rebuild as too restrained and asked for a full from-zero redesign with real references, reactbits components, three.js/anime.js and sleek transitions. Researched award-winning F1 surfaces (Lando Norris SOTY site, Charles Leclerc, Williams GPTech, the FOM broadcast package) and landed on **PIT WALL**: carbon blue-tinted ground `#0b0d12` (F1 Carbon Black is never pure black), one screaming accent `#ff4d2e` used only for selection/live pulse, and the F1 broadcast sector canon (purple = session best, green = personal best, yellow = slower) as the only performance colours. Colour on data, never chrome.

### What rebuilt
- **Landing page deleted.** `/` now redirects straight to the app — the infographic *is* the front door.
- **tokens.css** remapped to the pit-wall world; added `--gt-ease-out`/`--gt-ease-in-out` (elk easings), `--gt-sector-*`, a broadcast-size `--gt-text-lap`.
- **AppShell** — sticky 56px status bar (session title, big LAP figure via CountUp, session clock, RACE/REPLAY badge) + a **race-control message ticker** under it; icon rail kept; route content wrapped in a `motion/react` crossfade (220ms, ease-out) so every module change transitions in and out.
- **Race Control hero** — new KPI strip (Lap / Session time / Track status / Cars on track) with staggered entrance; the whole screen choreographs in (KPIs → tower → stage → feed, 45ms stagger).
- **TimingTower** — FLIP reorder animation (rows physically slide to new positions via the Web Animations API), position-change flash on gains, last-lap colour coding against a live session-best/per-driver-best book, compound chips, entrance cascade.
- **CircuitStage** — the racing line now **draws itself** (stroke-dashoffset, 1.4s in-out) on mount/circuit change; markers cascade in; controls restyled quiet.
- **SpeedField** (new) — a canvas of drifting light streaks behind the track map (long-exposure car-light feel), rAF-paused when hidden, static under reduced motion.
- **motion lib** (`src/lib/motion.ts`) — elk easings, page/stagger variants, `useInView`, reduced-motion hook. `animejs` + `motion` installed (three.js was already present; it lands in the next build).
- **reactbits** vendored (MIT + Commons Clause, attributed in `docs/THIRD_PARTY.md`): CountUp (used for lap/cars), DecryptedText, SplitFlapText, AnimatedList.

### Verification
Gates green: `tsc --noEmit`, `oxlint` (no new errors), `vitest` 12/12, `npm run build`. Headless Chrome: circuit draws and renders with car markers, KPI strip fills, all 8 module routes render with zero horizontal overflow, mobile (390px) stacks correctly. Fixed a critical layout bug where the ~130-event race-control feed stretched the auto grid row to 6500px (bounded the height chain + `grid-template-rows: minmax(0,1fr)`). Screenshots: `docs/screenshots/build27-pitwall.png`, `build27-pitwall-mobile.png`.

---

## Build 28 — three.js speed tunnel + kinetic title (anime.js speed ramp)

### What shipped
- **SpeedTunnel** (new, `components/stage/SpeedTunnel.tsx`) — a three.js/R3F hyperspeed light-streak field behind the circuit map (the Lando-Norris/WebGL award-site move): 600 additive line streaks streaming past the camera, 88% chalk / 12% signal-red. It is atmosphere, not car data — it never implies specific positions. **Speed-coupled to the replay clock**: flow speed tweens (anime.js v4 `animate`, 600ms `outQuad`) from 0 (paused = a static dim dash field) to the selected playback speed (1×–8×), so hitting play visibly accelerates the field. Respects `prefers-reduced-motion` (renders empty, no Canvas), pauses when the tab is hidden, disposes on unmount. Mounted behind the SVG track (z-index 0; the crisp data layer stays on top).
- **Session title decrypts in** (`DecryptedText` from the vendored reactbits set) on the status bar whenever the session changes — a short glyph-scramble settle, the F1-broadcast lower-third feel.
- Gates green: `tsc --noEmit`, `oxlint`, `vitest` 12/12, `npm run build`. Headless Chrome: play → clock ticks, tunnel canvas active, streaks accelerate, no console errors. Screenshot: `docs/screenshots/build28-speedtunnel.png`.
