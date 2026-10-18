# Testing & QA

## Pyramid

| Layer | Tool | What it guards | Starts |
|-------|------|----------------|--------|
| Backend unit | pytest | contracts, state-at-t reconstruction, ingest transforms (alignment math, flag windows) | Build 1 |
| Frontend unit | Vitest + Testing Library | clock store, formatting (gaps/laps), pure components | Build 1 |
| E2E smoke | Playwright | boot → load flagship → scrub timeline → RC click-seek → Battle Lab pick | Build 3 |
| Visual | Playwright screenshots vs `docs/screenshots/` | token drift, layout regressions | Build 3 |
| Data QA | pytest (`tests/data/`) | cache integrity: row counts, monotonic dates, checksums in provenance doc | Build 1 |

## Non-negotiable test cases

**Race clock / state-at-t**
- t before green → idle state, no positions
- t at exact RC event timestamp → event active
- t between position change points → order unchanged (exactness test)
- stale interval (last sample age > threshold) → flagged, not silently interpolated

**Ingestion**
- per-driver loop hits all 20 drivers × {car_data, location, intervals}; failures retried then surfaced
- location polyline: fastest-lap sample ordering by date is strictly increasing; no NaN in projected distance
- Battle Lab bins: distance within [0, lap_length], monotonic

**Honesty rules**
- Badge component: `LIVE` cannot render without live source flag (unit test)
- No number rendered from missing data → must render `UNAVAILABLE` (component tests)

## Commands (per docs/SETUP.md)

- `backend/.venv/bin/pytest`
- `npm test` (frontend)
- `npx playwright test`

## QA checklist per build (Build Log "Verification" section)

1. Tests green (or explicitly listed as new gaps).
2. Flagship dataset loads with network disabled (dev tools offline check) once cache is local.
3. Screenshot added to `docs/screenshots/` + README/BUILD_LOG updated when UI changed.
4. Provenance doc updated for any new API behavior discovered.
5. `git status` reviewed: no cache dumps, no secrets, no venv.
