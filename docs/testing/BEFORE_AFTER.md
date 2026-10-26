# GRIDTRACE — Before vs After

**Companion to:** [TEST_REPORT.md](TEST_REPORT.md)
**Report date:** 2026-10-26
**Branch:** `optimizations` (uncommitted working tree)

Every row below is a verified change, not a proposal. “Before” describes the behaviour or data at audit baseline `109dc78`; “After” describes the current working tree. Evidence points at the test or browser check that proves the change.

**At a glance:** 40 product defects fixed (19 backend, 8 frontend, 13 UI/data), 4 test-quality fixes, 7 security changes (plus one accepted static-asset risk), and 5 data repairs. Suite: **668 backend + 214 frontend = 882 checks, 0 failing, 0 expected failures**. Bandit: **0 issues**.

---

## 1. Backend correctness

| ID | Before | After | Evidence |
|---|---|---|---|
| BUG-01 | `t=NaN` returned the last complete race state with HTTP 200 | NaN returns an empty state internally; the API rejects non-finite `t` | `test_edge_state.py` NaN case |
| BUG-02 | A race-control event missing `lap_number`, `flag`, or `category` failed validation | Fields are optional and default to `null` | `test_edge_contracts.py` omission case |
| BUG-03 | Car markers accepted booleans and non-finite coordinates | Booleans and NaN/inf coordinates are rejected | `test_edge_contracts.py` Boolean/NaN cases |
| BUG-04 | `VSC ENDING` left the VSC flag set; safety-car ending left both flags set | VSC ending clears VSC; SC ending clears both | `test_edge_state.py` transition cases |
| BUG-05 | `t=inf` and `t=1e309` were accepted | Query validation rejects inf/NaN with 422 | live `t=inf`/`1e309`/`nan`; edge API tests |
| BUG-06 | DSQ result rows raised `int(None)` in three engines | Null points/laps are coerced; all twelve requests return 200 | four DSQ sessions × three engines |
| BUG-07 | Catalog matching ignored session name, so Monaco 2023 Race could resolve to the wrong session | Session name is required; Monaco 2023 Race resolves to 9094 | catalog/API checks |
| BUG-08 | Local season counts included Sprint sessions | Counts include `session_name == "Race"` only | `test_local_season_counts_exclude_sprints` |
| BUG-09 | A VSC period stayed open after `VSC ENDING` | The period closes at the ending event | `test_edge_engines.py` VSC period case |
| BUG-10 | Missing or negative pit durations were counted as `0.0`, corrupting totals and averages | Invalid durations are ignored | `test_pit_aggregates_ignores_missing_durations` |
| BUG-11 | Prediction could emit rank `P0` | Ranks are a valid `1..n` permutation | prediction engine tests |
| BUG-12 | Cancelled 2023 Imola was listed and playable | Removed from `sessions.json`; empty directory deleted; requests return 404 | `/api/sessions` = 89, 9086 absent |
| BUG-13 | Grids included drivers absent from the session entry list | Sanitizer drops non-entrants; 14 existing files repaired | grid entry-list dataset test |
| BUG-14 | Stints contained null, reversed, non-integer, and lap-0 bounds | Sanitizer drops/repairs them; 19 existing files repaired | strengthened stint-bound test |
| BUG-15 | Binned throttle/brake could exceed the physical range | Clamped to 0–100; session 9558 repaired | telemetry range test |
| BUG-16 | Duplicate grid positions existed | Renumbered uniquely, preserving source order; 5 files repaired | unique grid-position test |
| BUG-17 | `telemetry.json` (1.8 MB) was parsed on every request | Parsed once per process in the session store; selectors validated first | telemetry p95 < 20 ms test |
| BUG-18 | A `lap_start = 0` stint remained after the first repair | Removed (9979); strategy rejects any bound below lap 1 | `test_stint_bounds_are_always_playable` |
| BUG-19 | `/api/seasons` reported `race_count = 0` for every year | Merges locally ingested Race counts; `0` now means “no local replay coverage” | API: 2023=22, 2024=24, 2025=24; contract documented |

---

## 2. Data repairs

All transformations are deterministic. No lap time, position, or telemetry sample was invented.

| Dataset | Before | After |
|---|---|---|
| `sessions.json` + `data/9086` | Cancelled Imola 2023 catalogued; empty session directory shipped | Removed from catalog and deleted |
| `grid.json` (14 sessions) | Non-entrants listed; duplicate positions | Non-entrants dropped; duplicates renumbered |
| `stints.json` (19 sessions) | Null, reversed, non-integer, and lap-0 bounds | Invalid bounds dropped; valid reversed pairs sorted; lap-0 rows removed |
| `telemetry.json` (9558) | Throttle/brake outside 0–100 | Clamped to physical range |
| `ingest/normalize.py` | Pipeline could reintroduce the same defects | `_sanitise_grid` and `_sanitise_stints` run on every future ingest |

---

## 3. Frontend defects

| ID | Before | After | Evidence |
|---|---|---|---|
| FE-01 | Settings left the PitRail menu open; footer was unreachable | Menu closes on Settings; footer is visible and interactive; focus returns to the toggle | transition test; browser |
| FE-02 | An unchanged last lap could become a personal best | `last`/`improved` tracked; unchanged laps cannot claim a best | transitions test |
| FE-03 | Sprint sessions were clamped at 60 minutes; flag timeline used a fixed 7200 s axis | 30-minute clamp; timeline uses the shared session duration | `flagship.test.ts` |
| FE-04 | `useModule` kept stale data when dependencies changed | Data clears and the hook enters loading | `useModule.test.tsx` |
| FE-05 | Clock accepted NaN, accepted non-positive speed, did not clamp on duration shrink, had no reset; session changes kept the old time | Inputs guarded, duration shrink clamps `t`, `reset()` added, session change resets to 0 | 28 clock edge tests |
| FE-06 | Circuit projection produced NaN on degenerate inputs and narrow viewports | Non-finite inputs rejected; narrow viewports respected | 28 projection tests |
| FE-07 | `deltaTimeAt` divided by zero distance | Non-finite/zero inputs rejected | delta edge tests |
| FE-08 | Formatters rendered `NaN`, `Infinity`, and negative values | Returns `—`; compound labels trimmed | formatter tests |

---

## 4. UI and data findings

| ID | Before | After | Evidence |
|---|---|---|---|
| NEW-01 | Mobile shell kept the 84 px rail in flow, producing a blank first viewport | Rail collapses to 0×0, main column is padded, content starts at the top | browser 390×844 |
| NEW-02 | Ticker showed the final race-control message at `t=0` | Ticker uses the latest event at or before the shared clock | 7 unit tests; browser |
| NEW-03 | Battle Lab used flagship session 9558 for circuit and telemetry regardless of selection | Receives `sessionKey` and uses it for both calls | `BattleLab.test.tsx` |
| NEW-04 | AppShell and RaceControl fetched state twice; rAF ran while paused | One shared state request, in-flight dedupe, rAF only while playing | hook + ClockDriver tests |
| NEW-05 | Landing was in the eager entry chunk (703.96 kB) | Landing lazy-loaded; entry reduced to 630.26 kB (209.49 kB gzip) | build output |
| NEW-06 | `useFlagship`, `useRaceState`, `useCircuit`, `useModule` kept stale values on key change | Values clear immediately on key/dependency change | hook tests; browser switch |
| NEW-07 | Prediction MAE scored baseline and model on different driver subsets | Both scored on the same like-for-like subset | prediction tests |
| NEW-08 | Driver Lab could show `Infinity` as session best | Uses finite best laps only; empty-state label otherwise | module tests |
| NEW-09 | Weather lookup fell back to the first pre-session sample | No pre-session fallback; missing data stays unavailable | source review |
| NEW-10 | Season picker defaulted to the newest calendar year (empty 2026) | Defaults to the latest year with local coverage (2025) | `SessionPicker.test.tsx`; browser |
| NEW-11 | PitRail footer session badge was clipped in the expanded menu; Settings relied on link default | Badge visible/clickable; explicit navigation handler | transition tests |
| NEW-12 | `/app/vault` could not scroll: the picker had no bounded height inside clipped app content, so `overflow-y: auto` never engaged | Picker fills the route, scrolls internally, and contains overscroll | browser: 765 px viewport / 1986 px content; mobile 650 / 3439; no page overflow |
| NEW-13 | Selecting a race on `/app/vault` loaded its data but left the picker on screen | Selection navigates to Race Control for that session | browser: Australian GP 2025 → `/app`, `RACE Melbourne 2025`, all requests 200 |

---

## 5. Security

| ID | Before | After |
|---|---|---|
| SEC-01 | API responses and static HTML lacked a complete header policy | CSP, XCTO, XFO, Referrer-Policy, Permissions-Policy, HSTS applied to API and Vercel |
| SEC-02 | Diagnostics could expose an absolute path; FastAPI docs were discoverable | Diagnostics returns `backend/data`; `/docs`, `/redoc`, `/openapi.json` are 404 unless explicitly enabled |
| SEC-03 | No per-client rate limit; telemetry selectors were read before validation | 600 req/min per client+path, 1 MB body cap, selectors validated before parse, parsed telemetry cached |
| SEC-04 | Jolpica calls had a 20 s timeout, 3 attempts, and an unbounded event cache | 8 s timeout, 2 attempts, 24-season event cache, bounded year/round inputs |
| SEC-05 | Python runtime dependencies were unpinned; pytest sat in runtime requirements | Exact pins in `requirements.txt`; pytest isolated in `requirements-dev.txt` |
| SEC-06 | Vercel served public static assets with wildcard CORS | Accepted: no sensitive data is served from those paths |
| SEC-07 | An unused Three.js `SpeedTunnel` sat under `components/stage` | Removed; the `/app` stage has zero Three.js imports and uses CSS perspective |
| SEC-08 | `urlopen` accepted a variable URL with no scheme/host guard (Bandit B310) | `_get_json` rejects URLs outside `https://api.jolpi.ca/`; scoped `nosec B310`; regression test added |

Accepted by design, unchanged: public read-only API without auth, count-bounded cache (no byte budget), bundled public datasets, SPA fallback for unknown paths. Rationale and revisit triggers are in Part II, sections 3–6 of [TEST_REPORT.md](TEST_REPORT.md).

---

## 6. Test quality and tooling

| ID | Before | After |
|---|---|---|
| TQ-01 | The dependency test could pass with unpinned or misplaced requirements | Fails on any unpinned runtime requirement; pytest must live only in the dev file |
| TQ-02 | The `.env` check walked the filesystem and could miss a tracked secret or fail on an untracked local file | Uses `git ls-files` |
| TQ-03 | Expected failures (`xfail`, `.fails`) documented known bugs | All markers removed; zero expected failures |
| TQ-04 | Several fixes had no regression test | Added ClockDriver, BattleLab, SessionPicker, raceControl, origin-guard, stint, CSP, and data-repair tests |
| TOOL-01 | Two reports at repository root (`test_report.md`, `test_report_snyk.md`) | One authoritative [TEST_REPORT.md](TEST_REPORT.md); both originals preserved in [archive/](archive/) |
| TOOL-02 | Bandit reported one medium finding (`B310`) | 0 issues; fix verified by test and scan |
| TOOL-03 | No single before/after change ledger | This file, linked from the consolidated report |

---

## 7. How to reproduce

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

Browser checks: `/app`, `/app/battle`, `/app/vault`, `/app/settings`, and `/landing` at 1440×900 and 390×844, against a local backend on `127.0.0.1:8000`.
