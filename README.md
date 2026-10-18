# GRIDTRACE — Every gap tells a story

Interactive motorsport race-analysis platform. Historical F1 race replay with live-style race control, position/gap timelines, and distance-aligned telemetry battle lab.

**Branch:** `ashwinwork` (app development; `main` remains the static GitHub Pages site)

## Status

| Build | Date | What shipped | Docs |
|-------|------|--------------|------|
| 0 | 2026-10-18 | Repo init, full docs skeleton, data-source verification (OpenF1 + Jolpica + MultiViewer), Python env working | [BUILD_LOG](docs/BUILD_LOG.md#build-0) |

## Data mode honesty

This build (and near-term builds) use **HISTORICAL REPLAY** data from OpenF1's free post-session API (2023+). No live timing. UI will label every view with its data mode: `LIVE` / `REPLAY` / `ESTIMATE` / `SIMULATION` / `UNAVAILABLE`. We never fabricate numbers.

## Quickstart (as of Build 0)

```bash
# Backend (Python 3.14 + uv)
cd backend
uv venv --python 3.14 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (Build 1+)
cd frontend && npm install && npm run dev
```

## Docs map (read in this order)

1. [AGENTS.md](AGENTS.md) — rules for every agent working in this repo
2. [TASKS.md](TASKS.md) — task graph (P0 critical path first)
3. [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — what we're building and why
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, shared race clock
5. [docs/DATA_SOURCES_AND_PROVENANCE.md](docs/DATA_SOURCES_AND_PROVENANCE.md) — every API we tested, what worked, field schemas, research log
6. [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — Digital Pitwall design tokens
7. [docs/BUILD_LOG.md](docs/BUILD_LOG.md) — how each build was done, step by step
8. [docs/DECISIONS.md](docs/DECISIONS.md) — ADRs
9. [docs/SETUP.md](docs/SETUP.md) — dev environment setup
10. [docs/TESTING_AND_QA.md](docs/TESTING_AND_QA.md) — test strategy

## Screenshots

_Shots land here starting Build 2 (app boots with data). See `docs/screenshots/`._

## License / data attribution

OpenF1 data © OpenF1 / their providers, free for historical use. Jolpica mirrors Ergast. MultiViewer circuit geometry for corner markers. All usage within each provider's terms — see provenance doc.
