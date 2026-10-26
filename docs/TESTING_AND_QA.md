# Testing & QA

## Pyramid

| Layer | Tool | What it guards | Starts |
|-------|------|----------------|--------|
| Backend unit | pytest | contracts, state-at-t reconstruction, ingest transforms, catalog, engines, security, performance | Build 1 |
| Frontend unit | Vitest + Testing Library | clock store/driver, formatting, projection, hooks, transitions, session picker, Battle Lab | Build 1 |
| API smoke | HTTP checks / TestClient | every route, error paths, headers, rate limiting, data presence | Build 3 |
| Browser | Chromium preview | layout, ticker, session switch, menu transitions, accessibility tree | Build 3 |
| Data QA | pytest (`test_edge_datasets.py`) | every committed normalized session: drivers, grids, stints, telemetry, timestamps | Build 1 |

## Non-negotiable test cases

**Race clock / state-at-t**
- t before green → idle state, no positions
- t at exact RC event timestamp → event active
- t between position change points → order unchanged
- stale interval (last sample age > threshold) → flagged, not silently interpolated
- NaN/infinite/overflowing `t` → empty state or 422, never `null` in a success body
- clock `set`/`seek`/`setDuration` reject NaN; duration shrink clamps `t`; session change resets to 0

**Ingestion / data**
- every session has drivers/positions/intervals/timing/race-control and optional datasets
- grid drivers belong to the entry list; grid positions are unique
- stint bounds are positive integers and `lap_end >= lap_start`
- telemetry throttle/brake stay in 0–100
- race-control and weather timestamps are sorted
- cancelled sessions are not catalogued or playable

**Honesty rules**
- `LIVE` cannot render without a live source flag
- missing data renders `UNAVAILABLE` or an explicit empty state, never a fabricated number
- ticker shows only events at or before the shared clock
- long lists scroll inside the app shell (`/app/vault` at 390×844 and 1440×900), and the shell never clips scrollable content
- choosing a race in Race Vault opens Race Control for that session instead of leaving the picker mounted
- Battle Lab uses the selected session for drivers, circuit, and telemetry

## Commands

```bash
cd backend && .venv/Scripts/python.exe -m pytest -q
cd frontend && npx vitest run
cd frontend && npx tsc --noEmit
cd frontend && npx oxlint
cd frontend && npm run build
cd frontend && npm audit
cd backend && uvx pip-audit -r requirements.txt
cd backend && uvx bandit -q -r app -x app/tests
```

## Current suite (2026-10-26)

**Backend — 668 passing** (`backend/app/tests/`, 16 files, 0 xfail):

- Edge API 113
- Edge contracts 67
- Edge datasets 113
- Edge engines 121
- Edge state 123
- Security 38
- Performance 31
- Existing regression suites 62

**Frontend — 214 passing** (`frontend/src`, 14 files, 0 expected fail):

- Utilities/data/clock store 149
- UI transitions 39
- Motion 7
- Module loader 10
- Clock driver 5
- Battle Lab attribution 2
- Session picker default 2

**Gates:** `tsc --noEmit` clean; `oxlint` 0 errors / 29 warnings; production build succeeds; `npm audit` 0; `pip-audit` clean; Snyk frontend 0 vulnerabilities across 89 deps. Snyk Python scan is blocked by `SNYK-OS-PYTHON-0013`; use `pip-audit` as the compensating check.

The authoritative finding-by-finding record is [testing/TEST_REPORT.md](testing/TEST_REPORT.md), with every change listed as before → after in [testing/BEFORE_AFTER.md](testing/BEFORE_AFTER.md). The original reports are preserved in [testing/archive/](testing/archive/).

## Browser QA (390×844 and 1440×900)

- `.app__main` fills the viewport on mobile; the rail collapses to 0×0 and content starts at the top.
- Ticker at `t=0` shows only pre-start events; it never shows the final race-control message.
- Selecting a session updates the header and loads that session's drivers, race-control, and state.
- Battle Lab requests telemetry and circuit geometry for the selected session.
- Settings is reachable from the rail and the expanded menu closes on navigation.
- Session picker defaults to the latest locally covered season.

**Automation limitation:** the preview browser throttles `requestAnimationFrame`, so visual clock/CountUp/Motion playback is not observable in that tab. `ClockDriver.test.tsx` and `ui.transitions.test.tsx` cover the logic with fake rAF/timers. Manual visual review of animation remains part of the release checklist.

## QA checklist per build

1. Backend and frontend suites green, with zero expected failures.
2. `tsc --noEmit`, `oxlint`, and `npm run build` pass.
3. Dependency/security scans reviewed; new findings fixed or explicitly accepted.
4. Browser check at 1440×900 and 390×844 for changed UI.
5. Data QA green after any ingest or normalized-data change.
6. `git status` reviewed: no cache dumps, no secrets, no venv, no dist.
7. Reports updated when findings or test counts change.
