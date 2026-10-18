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
