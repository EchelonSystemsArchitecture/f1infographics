# HANDOFF — GRIDTRACE

Read this if you're taking over the project. It assumes zero prior context.

## What is this?

GRIDTRACE is an interactive F1 race-analysis platform. Historical race replay with live-style race control, position/gap timelines, and distance-aligned telemetry battle lab. Branch `ashwinwork` is the reference implementation. Live at **https://gridtrace.vercel.app**.

## Current state

- All resurrection Tasks A–H are complete (Build 12 / `461e029`). The art-direction task graph (§26 of the master directive) is fully closed. HEAD is current (Build 17 — award-level landing: pinned-poster circuit spine, full-bleed display type, custom cursor, contour depth, react-bits DecryptedText/CountUp; see `docs/BUILD_LOG.md` + `docs/REFERENCE_DESIGN_BRIEF.md`); the production alias **https://gridtrace.vercel.app** serves the last deployed build.
- Live at **https://gridtrace.vercel.app** — hard-refresh if you see a stale UI.
- Everything is committed and pushed. Working tree is clean.

## What exists (the product)

| Layer | What's there |
|-------|-------------|
| Landing (`/`) | Boot → gate → main flow: telemetry boot overlay, glitch intro gate, custom cursor, topographic contour + orbital-arc background, grain, full-bleed `EVERY GAP / TELLS A STORY` display type w/ RGB glitch, pinned circuit spine with 4 telemetry chapters (POSITIONS/GAPS/PIT WINDOWS/SECTOR PACE) scrolling past a sticky stage, chapter rail, react-bits `DecryptedText` + `CountUp`, honesty + finale |
| Session picker (`/app`) | 2024 British GP (Silverstone), 18 corners, 20 drivers |
| App shell (`/app`) | 4-region layout: rail / session header / stage + timing / ribbon |
| Spatial circuit stage | CSS-perspective 3D track, FOLLOW/OVERVIEW camera, driver markers, turn labels, pitwall crosshair |
| Race Ribbon | Distance-aligned timeline with semantic event pins (SC/VSC/red), expandable axis, transport controls |
| Timing tower | Clock-driven gap + position + tyre state, selectable rows, selectable race-control events |
| Editorial race control | Filtered feed, click-to-seek, spatial/BLUEPRINT toggle |
| Battle Lab | Per-driver telemetry (speed/throttle/brake + Δt) on shared distance axis, lap selector, honest 404 for missing data |
| Backend | FastAPI, single flagship session (9558), Pydantic contracts, committed normalized JSON data |
| Data honesty | LIVE/REPLAY/ESTIMATE/SIMULATION/UNAVAILABLE badges. Never fabricate numbers. REPLAY only for now. |

## What's open (next work, from §27/FINAL_REPORT)

1. **Responsive multi-viewport pass** — currently only verified at 1440×900
2. **Interactive motion verification** — capture harness is static screenshots only
3. **Multi-session ingest** — currently one hardcoded session
4. **POSITION-bar labelling** — timing tower has no position bar
5. **SPATIAL vertical composition** — circuit sits centered; could fill more viewport height

## How to run locally

```bash
# Backend (Python 3.14 + uv)
cd backend
uv venv --python 3.14 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev      # http://localhost:5173, /api proxies to :8000
```

## How to deploy

```bash
vercel --prod --yes
```

## Conventions

- Branch: `ashwinwork`. Do NOT push to `main`.
- One build = one commit. README rides with every push.
- No code comments unless asked.
- All race data flows from the data layer — never hardcode race results in UI.
- Design tokens: `frontend/src/styles/tokens.css`. ADR-012 permits three.js/R3F for the hero only.
- Circuit data has no names/sectors — SECTOR camera is permanently disabled.
- Tests: `pytest` (backend), `npx vitest run` (frontend), `npx tsc --noEmit`, `npx oxlint`.

## Key files

| File | Role |
|------|------|
| `docs/ART_DIRECTION_MASTER.md` | Governing art-direction source (CARBON/CHALK/SIGNAL + DEPTH) |
| `docs/DESIGN_SYSTEM.md` | Full token tables, type, components, motion, accessibility |
| `docs/FINAL_REPORT.md` | §28 honest final report — what works, tests run, limitations |
| `docs/BUILD_LOG.md` | Step-by-step build history |
| `docs/DECISIONS.md` | ADRs (ADR-012 = three.js permission; ADR-013 = task-graph closure) |
| `TASKS.md` | Task graph (all done) |
| `frontend/src/styles/tokens.css` | Design tokens |
| `frontend/src/store/clock.ts` | Shared race clock (single source of truth) |
| `backend/data/sessions.json` | Normalized session data |
| `backend/data/9558/` | Per-session JSON files |

## When you're stuck

- Read `docs/FINAL_REPORT.md` first.
- API weirdness → `docs/DATA_SOURCES_AND_PROVENANCE.md`
- Design question → `docs/DESIGN_SYSTEM.md` + `docs/ART_DIRECTION_MASTER.md`
- Unknown next step → `docs/BUILD_LOG.md` last entry's "Next" section
