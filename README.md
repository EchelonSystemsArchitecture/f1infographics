# GRIDTRACE — Every gap tells a story

Interactive motorsport race-analysis platform. Historical F1 race replay with live-style race control, position/gap timelines, and distance-aligned telemetry battle lab.

**Branch:** `ashwinwork` (app development; `main` remains the static GitHub Pages site)

## Status

| Build | Date | What shipped | Docs |
|-------|------|--------------|------|
| 0 | 2026-10-18 | Repo init, full docs skeleton, data-source verification (OpenF1 + Jolpica + MultiViewer), Python env working | [BUILD_LOG](docs/BUILD_LOG.md#build-0) |
| 1 | 2026-10-18 | Vite+React+TS scaffold, design tokens, zustand shared race clock, FastAPI skeleton + Pydantic contracts, test harnesses (pytest + Vitest) | [BUILD_LOG](docs/BUILD_LOG.md#build-1) |
| 2 | 2026-10-19 | Ingestion pipeline (fetch + normalize) for flagship Silverstone 2024, real-data API endpoints (sessions/drivers/state@t/race-control), state reconstruction, 12-test data QA suite, master design + landing directives | [BUILD_LOG](docs/BUILD_LOG.md#build-2) |
| 3 | 2026-10-19 | Full `--gt-*` tokens + self-hosted fonts, SIGNAL LAP landing at `/`, `/app` shell, Race Control board (110 real events), clock-driven timing tower (20 drivers, real gaps/tyres), replay controls (play/pause/speed/scrubber) | [BUILD_LOG](docs/BUILD_LOG.md#build-3) |
| 4 | 2026-10-19 | Public deploy on Vercel: FastAPI serverless API + SPA (`app.frontend()` CDN promotion, ADR-008); live at **https://gridtrace.vercel.app** | [BUILD_LOG](docs/BUILD_LOG.md#build-4) |

**Live:** https://gridtrace.vercel.app — landing at `/`, app at `/app`, API under `/api/*` (all `REPLAY` data).

## Data mode honesty

This build (and near-term builds) use **HISTORICAL REPLAY** data from OpenF1's free post-session API (2023+). No live timing. UI will label every view with its data mode: `LIVE` / `REPLAY` / `ESTIMATE` / `SIMULATION` / `UNAVAILABLE`. We never fabricate numbers.

## Quickstart (as of Build 4)

Production is already deployed (https://gridtrace.vercel.app); the steps below are for local development only.

```bash
# Backend (Python 3.14 + uv)
cd backend
uv venv --python 3.14 .venv
uv pip install --python .venv/bin/python -r requirements.txt

# Ingest flagship session 9558 (2024 British GP) — first run ~16s for session-level;
# per-driver heavy endpoints (car_data/location) land in a later build (ADR-001)
.venv/bin/python -m app.ingest.fetch --session 9558
.venv/bin/python -m app.ingest.normalize

# Run API
.venv/bin/uvicorn app.main:app --reload --port 8000

# Tests (run from backend/ or repo root)
.venv/bin/pytest -q

# Frontend
cd frontend && npm install
npm run dev      # http://localhost:5173, /api proxies to :8000
npm test -- --run
npm run build && npm run lint
```

### API surface (Build 2; same on production)

| Endpoint | Returns |
|----------|---------|
| `GET /api/health` | `{"status":"ok"}` |
| `GET /api/sessions` | Normalized session list (flagship 9558) |
| `GET /api/session/9558/drivers` | 20 drivers with team colours |
| `GET /api/session/9558/state?t=SECONDS` | Position/gap/tyre state reconstructed at t |
| `GET /api/session/9558/race-control` | 110 race-control events (REPLAY) |

## Docs map (read in this order)

1. [AGENTS.md](AGENTS.md) — rules for every agent working in this repo
2. [TASKS.md](TASKS.md) — task graph (P0 critical path first)
3. [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — what we're building and why
4. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, shared race clock
5. [docs/DATA_SOURCES_AND_PROVENANCE.md](docs/DATA_SOURCES_AND_PROVENANCE.md) — every API we tested, what worked, field schemas, research log
6. [docs/ART_DIRECTION_MASTER.md](docs/ART_DIRECTION_MASTER.md) — **authoritative** master design directive (tokens, palette, modules)
7. [docs/LANDING_PAGE_DIRECTIVE.md](docs/LANDING_PAGE_DIRECTIVE.md) — landing page experience spec (THE SIGNAL LAP)
8. [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — Digital Pitwall design tokens (superseded in part by ART_DIRECTION_MASTER)
9. [docs/UI_UX_SPECIFICATION.md](docs/UI_UX_SPECIFICATION.md) — UI/UX details
10. [docs/BUILD_LOG.md](docs/BUILD_LOG.md) — how each build was done, step by step
11. [docs/DECISIONS.md](docs/DECISIONS.md) — ADRs
12. [docs/SETUP.md](docs/SETUP.md) — dev environment setup
13. [docs/TESTING_AND_QA.md](docs/TESTING_AND_QA.md) — test strategy

## Screenshots

_Shots land with the first full UI build (Race Control board). See `docs/screenshots/`._

## License / data attribution

OpenF1 data © OpenF1 / their providers, free for historical use. Jolpica mirrors Ergast. MultiViewer circuit geometry for corner markers. All usage within each provider's terms — see provenance doc.
