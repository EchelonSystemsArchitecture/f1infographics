# HANDOFF — GRIDTRACE

Read this if you're taking over the project. It assumes zero prior context.

## What is this?

GRIDTRACE is an interactive F1 race-analysis platform: historical race replay with live-style race control, a circuit map with car markers, position/gap timing, distance-aligned telemetry comparison, and a suite of analytical modules — all driven by one shared replay clock. Branch `ashwinwork` is the reference implementation. Live at **https://gridtrace.vercel.app**.

**The infographic is the front door.** The marketing landing page was deleted in Build 27 — `/` redirects straight to the app at `/app`. There is no separate landing.

## Current state (Build 29)

- The UI is the **PIT WALL** design (Builds 27–28): carbon blue-tinted ground `#0b0d12`, one accent `#ff4d2e` (selection/live pulse only), F1 broadcast sector colours (purple = session best, green = personal best, yellow = slower) as the only performance colours — colour on data, never chrome. Sticky 56px status bar with a race-control ticker, icon rail, `motion/react` route crossfades. A three.js SpeedTunnel sits behind the circuit map (speed-coupled to the replay clock, reduced-motion safe); the session title decrypts in via react-bits DecryptedText; module screens got CountUp/bento/stagger kinetics (Build 29), all off under `prefers-reduced-motion`.
- Everything committed and pushed to `origin/ashwinwork`; production serves the latest `vercel --prod` build (hard-refresh if the UI looks stale).

## What exists (the product)

| Layer | What's there |
|-------|-------------|
| App (`/app`) | Status bar + race-control ticker, icon rail, Race Ribbon transport |
| Session catalog | Jolpica-backed seasons/events (1950→present); ingested sessions pickable, others honestly `NOT INGESTED` |
| Circuit stage | CSS-perspective SPATIAL/BLUEPRINT track, FOLLOW/OVERVIEW camera, driver markers, SpeedTunnel backdrop |
| Timing tower + race control | Clock-driven gaps/positions/tyres with FLIP reorder; editorial event feed, click-to-seek, flag chips |
| Battle Lab | Per-driver telemetry (speed/throttle/brake + Δt) on a shared distance axis; honest 404 when a driver has no `car_data` |
| Modules | Race Intelligence, Strategy Lab, Driver Lab, Constructor Lab, Prediction Arena (labelled `SIMULATION`), Race Vault (catalog), Settings/Diagnostics |
| Backend | FastAPI + Pydantic contracts, in-memory session store, committed normalized JSON |
| Data honesty | Every view labelled `REPLAY` / `ESTIMATE` / `SIMULATION` / `UNAVAILABLE`. Never `LIVE` without a live feed. Never fabricate numbers. |

## Data coverage (be honest about this)

- **OpenF1's free post-session API covers 2023 onward only.** There is NO 2015–2022 data through this pipeline — do not promise it.
- A **core-only bulk ingest of 2023–2025 race sessions (~88)** is running: session-level data (laps, positions, timing, pit stops, stints, race control, weather, results) — enough for every analytical module. Per-driver telemetry is deliberately skipped for these (tens of GB).
- **Two flagship sessions have FULL per-driver tracking** (car markers on the map): **9558** (2024 British GP / Silverstone) and **9090** (2023 Monaco GP Qualifying).
- Every other ingested session replays fully in the timing tower / race control / modules, but the circuit map shows **without car dots**, honestly labelled `UNAVAILABLE`.

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
vercel --prod --yes   # from repo root → https://gridtrace.vercel.app (branch ashwinwork)
```

## Open items (honest)

1. **2015–2022 data is unavailable** — OpenF1 starts at 2023; earlier seasons need a different provider.
2. **Per-driver telemetry/location only on the two flagships** — extending map tracking to all ~88 sessions is a tens-of-GB pull.
3. **Prediction Arena is a deterministic `SIMULATION`** (pace-based what-if) — labelled as such; not a calibrated forecast model.
4. **Bulk ingest still running** — not-yet-ingested events honestly show `NOT INGESTED`.
5. **Live timing** remains externally blocked (paid OpenF1 subscription) — never show `LIVE`.
6. Responsive multi-viewport + interactive-motion verification passes still outstanding (§27 items 14–15).

## Conventions

- Branch: `ashwinwork`. Do NOT push to `main`. One build = one commit (`Build N: …`); README rides with every push.
- No code comments unless asked. All race data flows from the data layer — never hardcode results in UI.
- Design tokens: `frontend/src/styles/tokens.css`. Circuit data has no names/sectors — SECTOR camera is permanently disabled.
- Tests: `pytest` (backend), `npx vitest run`, `npx tsc --noEmit`, `npx oxlint`.

## Key files

| File | Role |
|------|------|
| `docs/BUILD_LOG.md` | Step-by-step build history (read the last entry first) |
| `docs/FINAL_REPORT.md` | Honest final report — what works, tests run, limitations |
| `frontend/src/styles/tokens.css` | Design tokens |
| `frontend/src/store/clock.ts` | Shared race clock (single source of truth) |
| `frontend/src/utils/circuitProjection.ts` | Per-circuit rotation/fit for the map |
| `backend/data/sessions.json` | Normalized session catalog |

## When you're stuck

- API weirdness → `docs/DATA_SOURCES_AND_PROVENANCE.md`
- Design question → `docs/DESIGN_SYSTEM.md`
- Unknown next step → `docs/FINAL_REPORT.md` open items, then `docs/BUILD_LOG.md` last entry
