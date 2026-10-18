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
