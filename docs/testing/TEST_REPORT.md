# GRIDTRACE — Test, Security & Remediation Report

**Project:** f1infographics / GRIDTRACE
**Branch:** `optimizations`
**Audit baseline:** `109dc78` (`vulnerablities: manual_v1`)
**Report date:** 2026-10-26
**Status:** every reproducible defect in this report is fixed in the working tree and verified. The tree is intentionally uncommitted; nothing was pushed or deployed.

**Scope:** 882 automated checks (668 backend, 214 frontend), browser checks at 1440×900 and 390×844, dependency and static security scans, and a full remediation pass over both source reports.

This file is the single authoritative test report. It consolidates the former root-level `test_report.md` and `test_report_snyk.md`; both originals are preserved verbatim under [`archive/`](archive/) for provenance. For a compact before → after list of every change, see [BEFORE_AFTER.md](BEFORE_AFTER.md).

## Document map

| Part | Contents |
|---|---|
| Part I — Test, Edge-Case, UI-Transition, Optimization & Security Report | Test inventory, verification evidence, backend/frontend/data remediation, accepted risks, files changed |
| Part II — Security Vulnerability Report | Manual security review, Snyk/npm/pip/bandit results, per-finding GT-SEC status, residual risk |
| [BEFORE_AFTER.md](BEFORE_AFTER.md) | Every change as before → after, grouped by area |
| [archive/](archive/) | Verbatim snapshots of the two original reports |

Section numbers inside Part I and Part II are local to that part; a cross-part reference names the part.

---

# Part I — Test, Edge-Case, UI-Transition, Optimization & Security Report

## 1. Executive summary

| Measure | Result |
|---|---|
| Backend checks | **668 passed**, 0 failed, 0 xfail |
| Frontend checks | **214 passed**, 0 failed, 0 expected fail |
| Total automated checks | **882** |
| Edge-case + UI checks | **751** (537 backend edge + 214 frontend) |
| UI transition / timing checks | **61** (39 transitions + 7 motion + 10 module hook + 5 clock driver) |
| Performance checks | **31 passed** |
| Security checks | **38 passed** |
| TypeScript | `tsc --noEmit` exit 0 |
| Lint | `oxlint` 0 errors, 29 warnings (React Compiler ref warnings in third-party-style bits) |
| Build | `npm run build` exit 0; entry and StudioEnv chunks still exceed the 500 kB advisory threshold |
| Dependency audit | `npm audit` 0; `pip-audit` 0; Snyk frontend 0 vulnerabilities across 89 dependencies |
| Python Snyk scan | blocked by `SNYK-OS-PYTHON-0013` (scanner could not resolve the requirements graph); `pip-audit` clean |
| Bandit | 0 issues; `B310` in `providers/jolpica.py` is gated by an explicit Jolpica-origin check plus a scoped `nosec B310` |
| Browser | 390×844 layout fixed; ticker is time-filtered; session switch loads the selected session; Settings is reachable and no longer leaves the menu open |

**Headline:** all 19 backend defects, all 8 frontend defects, all 13 new UI/data findings, all 4 test-quality findings, and all actionable Snyk findings are remediated. The only open items are explicitly accepted design/operational risks (public read-only API without auth, count-bounded cache without a byte budget, serverless data bundling, SPA fallback) documented in §10.

---

## 2. Environment and commands

- Windows, Git Bash
- Python 3.12.13
- FastAPI 0.146.0, Pydantic 2.14.1, pandas 3.0.6, NumPy 2.5.4
- Node 24.21.0, npm 11.19.0
- Vite 8.3.4, Vitest 5.0.5, TypeScript 6.0.3, oxlint 1.88.0

```bash
cd backend && .venv/Scripts/python.exe -m pytest -q
cd frontend && npx vitest run
cd frontend && npx tsc --noEmit
cd frontend && npx oxlint
cd frontend && npm run build
cd frontend && npm audit
cd frontend && npx --no-install snyk test
cd backend && uvx pip-audit -r requirements.txt
cd backend && uvx bandit -q -r app -x app/tests
```

**Browser automation limitation:** the preview browser throttles `requestAnimationFrame` even when the page reports `document.visibilityState === "visible"`. Clock animation, CountUp tweens, and Motion exit transitions therefore do not advance in the automated tab. Playback logic is covered by the new `ClockDriver.test.tsx`; transition behaviour is covered by `ui.transitions.test.tsx`. DOM, network, layout, and API behaviour were verified directly. This is an automation limitation, not an application defect.

---

## 3. Test inventory

### 3.1 Backend — 668 checks

| Suite | File | Checks |
|---|---|---:|
| Edge API | `test_edge_api.py` | 113 |
| Edge contracts | `test_edge_contracts.py` | 67 |
| Edge datasets | `test_edge_datasets.py` | 113 |
| Edge engines | `test_edge_engines.py` | 121 |
| Edge state | `test_edge_state.py` | 123 |
| **Edge subtotal** | | **537** |
| Security | `test_security.py` | 38 |
| Performance | `test_performance.py` | 31 |
| Existing regression suite | 9 files | 62 |
| **Backend total** | **16 files** | **668** |

### 3.2 Frontend — 214 checks

| Suite | File | Checks |
|---|---|---:|
| Utilities / data / clock store | 8 files | 149 |
| UI transitions | `ui.transitions.test.tsx` | 39 |
| Motion hooks | `motion.test.tsx` | 7 |
| Module loader | `useModule.test.tsx` | 10 |
| Clock driver | `ClockDriver.test.tsx` | 5 |
| Battle Lab attribution | `BattleLab.test.tsx` | 2 |
| Session picker default | `SessionPicker.test.tsx` | 2 |
| **Frontend total** | **14 files** | **214** |

### 3.3 Combined

| Category | Count |
|---|---:|
| Edge-case checks | 537 backend + 214 frontend = **751** |
| UI transition / timing checks | **61** |
| Performance checks | **31** |
| Security checks | **38** |
| **Grand total** | **882** |

The requested “500 edge case tests” target is exceeded. No check is marked `xfail` or `.fails`; the suite is now a strict release gate.

---

## 4. Verification results

### 4.1 Automated suites

```
backend:  668 passed, 1 warning in 25.60s
frontend: Test Files 14 passed (14)
          Tests      214 passed (214)
```

The only backend warning is Starlette's `httpx` deprecation notice from `fastapi.testclient`. It does not affect results.

### 4.2 Static checks and build

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `oxlint` | 0 errors, 29 warnings |
| `npm run build` | exit 0 |
| Build advisory | `index-*.js` and `StudioEnv-*.js` exceed Vite's 500 kB warning threshold; both are lazy-loaded route chunks |
| `npm audit` | 0 vulnerabilities |
| `pip-audit -r requirements.txt` | no known vulnerabilities |
| Snyk frontend | `ok: true`, 89 dependencies, 0 vulnerabilities |
| Snyk Python | blocked: `SNYK-OS-PYTHON-0013`; see §9.3 |
| Bandit | 0 issues (B310 origin-pinned and scoped-suppressed) |

### 4.3 API smoke checks (live local app)

| Check | Result |
|---|---|
| `GET /api/health` | 200; all security headers present |
| `GET /openapi.json`, `/docs`, `/redoc` | 404 (disabled unless `GRIDTRACE_ENABLE_DOCS=1`) |
| `GET /api/session/9086/state?t=0` | 404 (cancelled Imola 2023 is gone) |
| `GET /api/session/9558/state?t=inf` / `1e309` / `nan` | 422 for all three |
| DSQ sessions 9636, 9858, 9998, 10014 | driver-lab, constructor-lab, prediction all HTTP 200 |
| `GET /api/seasons/2023/rounds/6/capabilities?session=Race` | `session_key=9094`, `session_name=Race`, `data_mode=REPLAY` |
| `GET /api/sessions` | 89 sessions; 9086 absent |
| `GET /api/seasons` | 77 years; 2023=22, 2024=24, 2025=24 locally covered races |
| `GET /api/diagnostics?session_key=9558` | `data_dir="backend/data"`, no absolute filesystem path |

### 4.4 Browser checks

| View | Result |
|---|---|
| `/app` at 390×844 | `.app__main` is 390×844 at `(0,0)`; status bar 306×128 at `(84,0)`; content 306×682 at `(84,162)`; no blank first viewport; Race Control and timing tower visible |
| `/app` at 1440×900 | full four-region shell, Race Control, timing tower, track map, ribbon, no console errors |
| Ticker at `t=0` | shows `DRS DISABLED` (13:57:16, before the 14:00 start), **not** the final 16:26 message |
| Ticker at `t=1000` | shows the latest event at or before 16:40 — the 10:19 stewards decision; no future events |
| Session switch | selecting Monaco 2024 (9523) triggers `/api/session/9523/drivers`, `/race-control`, and `/state`; header updates to `Race Monte Carlo 2024` |
| Settings | `/app/settings` renders `Settings & Diagnostics`; `Data dir: backend/data`; no absolute path; menu closes on navigation |
| Session picker | defaults to **2025** (latest locally covered season) and lists 24 races, instead of an empty 2026 calendar |
| Playback | store seek and ticker update verified; visual clock advance not observable because preview rAF is throttled; `ClockDriver` covers advance, pause, speed, duration clamp, and resume |
| Post-fix re-run, `/app` 390×844 | document width 390, no horizontal overflow; menu expands, Settings link navigates and auto-collapses the menu |
| Post-fix re-run, ticker filtering | seek to 03:12.540 → ticker `SESSION STARTED`; play to 03:32.389 → ticker `GREEN LIGHT - PIT EXIT OPEN`; pause leaves the clock stable |
| Post-fix re-run, session switch | picker opened from Settings, Suzuka 2025 selected; header updates, requests move to session 10006, and the route stays on the active module |
| Post-fix re-run, Battle Lab | `/app/battle` at 390×844: no overflow, 20-driver selectors, telemetry/circuit requests 200, no console errors |
| Post-fix re-run, landing | `/landing` at 390×844 renders the WebGL hero (295×844 canvas), no horizontal overflow; only Three.js shader/deprecation warnings in console |
| `/app/vault` scrolling | desktop: 765 px viewport over 1986 px of races, `scrollTop` reaches 400; mobile: 650 px over 3439 px, `scrollTop` reaches 500; no horizontal overflow |
| `/app/vault` selection | Australian GP 2025 selection navigates to `/app`, header `RACE Melbourne 2025`, session 9693 state/drivers/race-control/circuit/weather all 200; picker closed |

---

## 5. Backend defect remediation

| ID | Status | Fix | Verification |
|---|---|---|---|
| BUG-01 | Fixed | `build_state_at` returns an empty state for `NaN` time instead of the last full state | `test_edge_state.py` NaN case |
| BUG-02 | Fixed | `RaceControlEvent.lap_number`, `flag`, `category` default to `None` | `test_edge_contracts.py` omission case |
| BUG-03 | Fixed | `CarMarker` rejects booleans and non-finite coordinates | `test_edge_contracts.py` Boolean/NaN cases |
| BUG-04 | Fixed | `VSC ENDING` / `VIRTUAL SAFETY CAR ENDING` clear VSC; SC ending clears both flags | `test_edge_state.py` flag transition cases |
| BUG-05 | Fixed | `/state` query uses `allow_inf_nan=False`; infinity and overflow return 422 | live `t=inf`/`1e309`/`nan` checks; edge API tests |
| BUG-06 | Fixed | null `number_of_laps`/points are coerced with `or 0`, not `int(None)` | four DSQ sessions × three engines return 200 |
| BUG-07 | Fixed | catalog matching requires the requested session name, not just circuit/year | Monaco 2023 Race resolves to 9094 |
| BUG-08 | Fixed | local season counts use `session_name == "Race"`, excluding Sprint rows | `test_local_season_counts_exclude_sprints` |
| BUG-09 | Fixed | `detect_flag_periods` closes an open VSC period on VSC-ending | `test_edge_engines.py` VSC period case |
| BUG-10 | Fixed | pit aggregates ignore missing/non-numeric/negative durations instead of treating them as 0 | `test_pit_aggregates_ignores_missing_durations` |
| BUG-11 | Fixed | every prediction entry gets a valid 1..n rank; no `P0` | prediction engine tests |
| BUG-12 | Fixed | cancelled Imola 2023 removed from `sessions.json` and its data directory deleted | `/api/sessions` count 89, 9086 absent; dataset test |
| BUG-13 | Fixed | grid sanitizer drops drivers outside the session entry list; 9 existing files repaired | grid entry-list dataset test |
| BUG-14 | Fixed | invalid/null/reversed stint bounds removed at ingest and in existing data; strategy guards bounds | strengthened stint test, 19 repaired files |
| BUG-15 | Fixed | throttle/brake bins clamped to 0..100; 9558 repaired | telemetry physical-range test |
| BUG-16 | Fixed | duplicate grid positions renumbered; 5 existing files repaired | unique grid-position test |
| BUG-17 | Fixed | parsed telemetry cached in the session store and selectors validated before reading the 1.8 MB file | telemetry p95 < 20 ms test |
| BUG-18 | Fixed | removed remaining `lap_start = 0` stints (9979); strategy rejects any bound below lap 1 | strengthened `test_stint_bounds_are_always_playable` |
| BUG-19 | Fixed | `/api/seasons` merges locally ingested race counts instead of returning 0 for every year | API check 2023=22, 2024=24, 2025=24; catalog test |

**BUG-06 evidence:** all twelve previously failing requests now return 200:

```text
9636  driver-lab=200 constructor-lab=200 prediction=200
9858  driver-lab=200 constructor-lab=200 prediction=200
9998  driver-lab=200 constructor-lab=200 prediction=200
10014 driver-lab=200 constructor-lab=200 prediction=200
```

**BUG-19 note:** Jolpica's season list carries no round counts, and fetching every calendar would turn one request into dozens of upstream calls. `race_count` is therefore the number of locally ingested Race sessions; `0` means no local replay coverage. This is now documented in `docs/API_CONTRACT.md`.

---

## 6. Frontend defect remediation

| ID | Status | Fix | Verification |
|---|---|---|---|
| FE-01 | Fixed | Settings closes the PitRail menu; footer becomes visible and interactive when open; toggle focus returns on close | transition test `routes Settings through the same close behaviour`; browser check |
| FE-02 | Fixed | TimingTower tracks `last` and `improved`; an unchanged lap cannot become a personal best | transition test `an unchanged last lap must not become a personal best` |
| FE-03 | Fixed | session window clamp lowered to 30 minutes; flag timeline uses the shared session duration instead of a fixed 7200 s axis | `flagship.test.ts` sprint window cases |
| FE-04 | Fixed | `useModule` clears data and enters loading when dependencies change | `useModule.test.tsx` dependency-change case |
| FE-05 | Fixed | clock rejects `NaN`, clamps on duration shrink, rejects non-positive/NaN speed, adds `reset()`; session change resets the clock | 28 clock edge tests |
| FE-06 | Fixed | circuit projection rejects non-finite inputs and respects narrow viewports | 28 projection tests |
| FE-07 | Fixed | `deltaTimeAt` rejects non-finite/zero distance inputs | delta edge tests |
| FE-08 | Fixed | formatters return `—` for non-finite/negative values and trim compound labels | formatter tests |
| NEW-01 | Fixed | mobile layout collapses the in-flow rail to 0×0, pads the main column, and keeps content at the top | browser measurement at 390×844 |
| NEW-02 | Fixed | ticker uses `latestRaceControlEvent(events, startMs, t)` and never shows future events | 7 raceControl unit tests; browser `t=0` and `t=1000` |
| NEW-03 | Fixed | BattleLab receives `sessionKey` and uses it for both `useCircuit` and telemetry | `BattleLab.test.tsx` (selected session, not 9558) |
| NEW-04 | Fixed | AppShell shares one state request with RaceControl; in-flight requests deduplicate; ClockDriver only runs rAF while playing | hook + ClockDriver tests |
| NEW-05 | Fixed | Landing is lazy-loaded; entry chunk reduced from 703.96 kB to 630.26 kB (209.49 kB gzip) | build output; `App.tsx` |
| NEW-06 | Fixed | `useFlagship`, `useRaceState`, `useCircuit`, and `useModule` clear stale values on key/dependency changes | hook tests, browser session switch |
| NEW-07 | Fixed | prediction MAE scores baseline and model on the same driver subset | prediction tests |
| NEW-08 | Fixed | Driver Lab computes session best only from finite best laps and shows an empty-state label instead of `Infinity` | module tests |
| NEW-09 | Fixed | weather lookup no longer falls back to the first pre-session sample | source review; RaceControl |
| NEW-10 | Fixed | season picker defaults to the latest year with local coverage, not the newest Jolpica calendar year | `SessionPicker.test.tsx`; browser 2025 |
| NEW-11 | Fixed | PitRail footer session badge is visible/clickable in the expanded menu and Settings uses an explicit navigation handler | transition tests |
| NEW-12 | Fixed | `/app/vault` could not scroll: the picker had no bounded height inside the clipped app content, so its own `overflow-y: auto` never engaged. It now fills the route, scrolls internally, and contains overscroll | browser: 1986 px list in a 765 px viewport scrolls; mobile 3439 px in 650 px; no page overflow |
| NEW-13 | Fixed | Selecting a race on `/app/vault` loaded its data but left the picker on screen; the selection now opens Race Control for that session | browser: Australian GP 2025 → `/app`, `RACE Melbourne 2025`, session 9693 requests all 200 |

---

## 7. Data repairs (deterministic, no invented results)

All repairs are deterministic transformations of cached normalized data; no lap time, finishing position, or telemetry sample was invented.

| Dataset | Sessions | Repair |
|---|---:|---|
| `sessions.json` + `data/9086` | 1 | Removed cancelled Imola 2023 from the catalog and deleted its empty session directory |
| `grid.json` | 14 | Removed drivers absent from the session entry list (9069, 9078, 9165, 9506, 9507, 9590, 9971, 10028, 10033); renumbered duplicate positions preserving source order (9523, 9582, 9598, 9912, 9987) |
| `stints.json` | 19 | Dropped null, non-integer, reversed, and lap-0 bounds; sorted valid reversed pairs; 9979 lap-0 rows removed |
| `telemetry.json` | 1 | Clamped binned throttle/brake to the physical 0–100 range (9558) |
| `normalize.py` | pipeline | Added `_sanitise_grid` and `_sanitise_stints` so future ingests cannot reintroduce these defects |

The data QA suite asserts entry-list membership, unique grid positions, playable stint bounds, physical throttle/brake ranges, sorted timestamps, and driver/result consistency across all 89 sessions.

---

## 8. Security remediation

| ID | Status | Change |
|---|---|---|
| SEC-01 | Fixed | Security headers on API responses and `vercel.json`: CSP, XCTO, XFO, Referrer-Policy, Permissions-Policy, HSTS |
| SEC-02 | Fixed | Diagnostics returns `data_dir="backend/data"`; `/docs`, `/redoc`, `/openapi.json` disabled by default |
| SEC-03 | Fixed | 600 req/min per client+path rate limit; telemetry selectors validated before parse; parsed telemetry cached |
| SEC-04 | Fixed | catalog year/round bounded (1950–2100, 1–30); upstream timeout 8 s, 2 attempts, bounded event cache |
| SEC-05 | Fixed | all runtime dependencies pinned; `pytest` moved to `requirements-dev.txt` |
| SEC-06 | Accepted | Vercel serves public static assets with wildcard CORS; no sensitive API data is served from those paths |
| SEC-07 | Fixed | removed unused Three.js `SpeedTunnel` from `components/stage`; the `/app` circuit stage has zero Three.js imports |
| SEC-08 | Fixed | Jolpica client rejects any URL outside `https://api.jolpi.ca/` before `urlopen`, closing the Bandit `B310` custom-scheme path; origin-guard regression test added |

Detailed per-finding status, including Snyk cross-references, is in Part II (Security Vulnerability Report).

---

## 9. Test-quality fixes

| ID | Status | Change |
|---|---|---|
| TQ-01 | Fixed | dependency test now fails on any unpinned runtime requirement and requires pytest only in the dev file |
| TQ-02 | Fixed | `.env` test uses `git ls-files`, not a filesystem walk |
| TQ-03 | Fixed | all `xfail`/`.fails` markers removed; the suite is a strict gate with zero expected failures |
| TQ-04 | Fixed | regression coverage added for Battle Lab session attribution, ticker time filtering, clock driver playback, and picker default coverage |

### 9.1 New regression tests

- `frontend/src/components/clock/ClockDriver.test.tsx` — advance, pause, speed, duration clamp, resume.
- `frontend/src/routes/app/BattleLab.test.tsx` — selected session, not flagship.
- `frontend/src/utils/raceControl.test.ts` — no future events, ordering independence, invalid timestamps.
- `frontend/src/routes/app/SessionPicker.test.tsx` — latest locally covered season; fallback to newest calendar year.
- Backend: local season-count merge test; stricter stint-bound assertion; CSP script policy assertion; Jolpica origin guard (an untrusted `BASE_URL` is rejected before `urlopen`).

### 9.2 Remaining test limitation

The preview browser's rAF throttling prevents visual verification of animated clock/CountUp/Motion exit. The logic is covered by fake-rAF and fake-timer tests; DOM and network behaviour were verified separately.

### 9.3 Snyk / scanner status

- **Frontend:** Snyk CLI 1.1308.3, authenticated, `ok: true`, 89 dependencies, 0 vulnerabilities.
- **Backend:** Snyk returns `SNYK-OS-PYTHON-0013 — Missing required packages`; the scanner could not resolve the Python graph. `pip-audit -r requirements.txt` reports no known vulnerabilities. This is a scanner limitation, not a clean Snyk Python result.
- **Bandit:** clean (0 issues). `B310` at `providers/jolpica.py` is now prevented at runtime as well as statically: `_get_json` rejects any URL that does not start with `https://api.jolpi.ca/` before calling `urlopen`, and the call carries a scoped `nosec B310`.

---

## 10. Accepted risks / residual notes

1. **No authentication on the public API.** The service is read-only historical replay with no accounts, PII, writes, or secrets. Rate limiting and bounded inputs mitigate scraping/DoS. Auth should be added before any user-specific data or write endpoint is introduced.
2. **Session cache is count-bounded, not byte-bounded.** The cache holds at most 8 sessions; the audit measured ~72 MB for the eight largest location sets. This is within the current serverless budget but is a known operational ceiling.
3. **Vercel bundles `backend/data/**`.** The serverless API needs the normalized datasets at runtime. All bundled data is public historical F1 data, and no secrets are included.
4. **SPA fallback returns the app shell for unknown paths.** This is standard for the client-side router; API paths are excluded and security headers are applied.
5. **Three.js scope.** After removing `SpeedTunnel`, Three.js remains only in the landing artwork and the intentionally isolated `/lab` study route. The `/app` circuit stage uses CSS perspective per ADR-012.
6. **Preview browser rAF throttle.** Playback and Motion transitions cannot be observed in the automated tab; unit tests cover the logic. Manual visual review of animation remains recommended.

---

## 11. Files changed by this remediation

**Backend**

- `app/main.py` — rate limit, security headers, CORS, docs gating, path/validation guards, telemetry cache, local season counts
- `app/catalog.py` — session-name matching, local race counts
- `app/contracts.py` — nullable defaults, coordinate validation
- `app/state.py` — NaN guard, VSC/SC transition handling
- `app/strategy.py` — stint bound validation
- `app/driver_lab.py` — null-safe result rows
- `app/intelligence.py` — VSC ending periods, missing pit durations
- `app/prediction.py` — valid ranks and like-for-like MAE
- `app/session_store.py` — telemetry cache
- `app/ingest/normalize.py` — grid/stint sanitizers, throttle/brake clamp
- `app/providers/jolpica.py` — bounded timeout/retries, event cache, pinned-origin URL guard
- `app/tests/test_edge_engines.py` — Jolpica origin-guard regression test
- `requirements.txt`, `requirements-dev.txt` — pinned runtime/dev split
- `app/tests/*` — strict assertions and new regressions

**Frontend**

- `App.tsx` — lazy Landing
- `routes/app/AppShell.tsx`, `AppShell.css` — mobile grid, shared state, ticker filter, vault selection opens Race Control
- `routes/app/RaceControl.tsx` — provided state, weather fallback removed
- `routes/app/BattleLab.tsx` — session key attribution
- `routes/app/SessionPicker.tsx`, `SessionPicker.css` — latest covered season default; bounded, scrollable vault
- `components/app/PitRail.tsx`, `PitRail.css` — Settings close, footer visibility
- `components/timing/TimingTower.tsx` — personal-best detection
- `components/clock/ClockDriver.tsx` — rAF gated on playback
- `store/clock.ts`, `utils/format.ts`, `utils/delta.ts`, `utils/circuitProjection.ts`, `data/flagship.ts` — guards and clamps
- `hooks/useFlagship.ts`, `routes/app/modules/useModule.ts`, `Modules.tsx` — stale data, request dedupe, empty-state labels
- `components/stage/SpeedTunnel.*` — removed (unused Three.js)
- `vite.config.ts`, `vercel.json` — source maps off, headers/CSP
- New tests: `ClockDriver.test.tsx`, `BattleLab.test.tsx`, `SessionPicker.test.tsx`, `utils/raceControl.ts` + test

**Data**

- `backend/data/sessions.json`, 14 `grid.json`, 19 `stints.json`, `telemetry.json`, deleted `backend/data/9086/*`

**Reports**

- `docs/testing/TEST_REPORT.md` (this file)
- `docs/testing/BEFORE_AFTER.md` (change ledger)
- `docs/testing/README.md` (folder index)
- `docs/testing/archive/TEST_REPORT_EDGE_UI_OPTIMIZATION.md`
- `docs/testing/archive/TEST_REPORT_SNYK_SECURITY.md`
- `docs/TESTING_AND_QA.md`
- `docs/FINAL_REPORT.md` test-status section
- `docs/API_CONTRACT.md` (`race_count` semantics)
- `docs/DATA_SOURCES_AND_PROVENANCE.md` (data repair log)

---

## 12. Bottom line

The failure budget is now **zero**. Every item that was an expected failure in the audit is an ordinary passing regression test, and the three highest-risk UI defects found during the audit (mobile layout, future ticker, cross-session Battle Lab) have both code fixes and automated or browser evidence.

The app was re-checked end to end: backend engines, catalog, datasets, security middleware, frontend utilities, transitions, clock driver, Battle Lab attribution, session picker, mobile layout, and live API responses. No commit, push, or deployment was performed.


---

# Part II — Security Vulnerability Report

## 1. Executive summary

| Category | Findings | Fixed | Verified | Accepted |
|---|---:|---:|---:|---:|
| Backend / API | 9 | 6 | 1 | 2 |
| Frontend / UI | 4 | 2 | 2 | 0 |
| Dependencies | 3 | 0 | 2 | 1 |
| Infrastructure / deploy | 3 | 0 | 1 | 2 |
| **Total** | **19** | **8** | **6** | **5** |

**Scanner results**

| Scanner | Scope | Result |
|---|---|---|
| Snyk CLI 1.1308.3 | Frontend, 89 dependencies | `ok: true`, **0 vulnerabilities** |
| Snyk CLI 1.1308.3 | Python requirements | blocked by `SNYK-OS-PYTHON-0013` (dependency graph unresolved) |
| `npm audit` | Frontend | **0 vulnerabilities** |
| `pip-audit -r requirements.txt` | Python runtime | **no known vulnerabilities** |
| Bandit | `backend/app` | **0 issues**; `B310` origin-pinned at runtime and scoped-suppressed |

**No high-severity issue is open.** The public API remains intentionally unauthenticated because it is read-only historical data with no accounts, PII, writes, or secrets; it now has rate limiting, bounded input, restricted CORS, security headers, and no docs/diagnostics path leakage.

---

## 2. How to read this report

Each finding includes:

- **ID** — original reference (`GT-SEC-xx`)
- **Severity** — original severity
- **Status** — Fixed / Verified / Accepted
- **Remediation** — what changed
- **Evidence** — test, command, or source location

“Accepted” means the risk is understood and the current product shape makes remediation inappropriate or disproportionate; it is not an unaddressed bug.

---

## 3. Backend / API findings

### GT-SEC-01 — No authentication or authorization on API endpoints
**Severity:** High (original) · **Status:** Accepted, with DoS mitigation

The service is a public, read-only replay API. There are no accounts, PII, saved user data, writes, payments, or secrets. Every route is GET-only and every payload is public historical F1 data. An API key would not create a meaningful boundary while it would break the public app.

Compensating controls added:

- 600 requests/minute per client+path (process-local, complements edge limiting)
- 1 MB request-body cap
- bounded `year`/`round` parameters and upstream timeouts
- no write methods (`POST/PUT/PATCH/DELETE` return 405)
- security headers and restricted CORS

**Evidence:** `test_security.py::test_api_is_read_only`, `test_rate_limit_headers_are_present`, `test_write_methods_are_disabled`; live `X-RateLimit-*` headers.

**Revisit when:** any user-specific data, write endpoint, saved simulation, or paid upstream key is added. At that point require auth and scope all storage by user ID.

---

### GT-SEC-02 — No CORS middleware configured
**Severity:** High · **Status:** Fixed

`CORSMiddleware` now allows only configured origins:

- default: `https://gridtrace.vercel.app`, `http://localhost:5173`, `http://127.0.0.1:5173`
- override: `GRIDTRACE_ALLOWED_ORIGINS` (comma-separated)
- methods: `GET`; credentials are not enabled

**Evidence:** `test_no_cors_wildcard_is_enabled` sends an `evil.example` preflight and asserts no `Access-Control-Allow-Origin`; allowed-origin requests receive the expected header.

---

### GT-SEC-03 — Error messages expose internal file paths
**Severity:** Medium · **Status:** Fixed

API errors are generic:

- “Dataset not available” / “Dataset unavailable”
- “Session not found”
- “Telemetry unavailable for this selection”
- “Invalid driver selection”

`Diagnostics.data_dir` is the relative string `backend/data`, never an absolute deployment path.

**Evidence:** `test_diagnostics_does_not_disclose_filesystem_path`, `test_engine_response_does_not_leak_internals`, `test_invalid_session_key_does_not_read_outside_data_dir`; live `/api/diagnostics`.

---

### GT-SEC-04 — `session_key` used directly in filesystem paths
**Severity:** Medium · **Status:** Fixed

`_session_dir()`:

1. rejects keys outside `1..99,999,999`
2. resolves the candidate path
3. requires the resolved path to equal `DATA_DIR` or be inside it

Every dataset read uses this helper. FastAPI still types the path parameter as `int`.

**Evidence:** `test_path_traversal_is_not_possible`, `test_invalid_session_key_does_not_read_outside_data_dir`; encoded traversal requests return 404/422.

---

### GT-SEC-05 — Unpinned Python dependencies
**Severity:** Medium · **Status:** Fixed

`backend/requirements.txt` now contains only exact runtime pins:

```text
fastapi==0.146.0
uvicorn[standard]==0.54.0
pydantic==2.14.1
pandas==3.0.6
numpy==2.5.4
httpx==0.28.1
```

`pytest==9.1.1` moved to `backend/requirements-dev.txt`, which starts with `-r requirements.txt`.

**Evidence:** `test_backend_requirements_pin_production_dependencies` now fails on any unpinned runtime line.

---

### GT-SEC-06 — Suspicious / possibly invalid version pins
**Severity:** Medium · **Status:** Verified (report assumption outdated)

`pandas==3.0.6` and `numpy==2.5.4` are the versions installed in this environment and were used for the full 668-test run. `pip-audit -r requirements.txt` reports no known vulnerabilities. The original “does not exist” statement was based on older PyPI knowledge and is not true here.

**Note:** Snyk’s Python resolver returned `SNYK-OS-PYTHON-0013` (“Missing required packages”) rather than a vulnerability result. That is a scanner graph-resolution limitation, not a clean Snyk Python pass.

---

### GT-SEC-07 — No request size or timeout limits
**Severity:** Medium · **Status:** Fixed

- HTTP middleware rejects `Content-Length > 1,000,000` with 413
- malformed `Content-Length` is rejected
- all API routes remain GET-only
- upstream Jolpica timeout reduced from 20 s to 8 s, retries from 3 to 2
- Vercel function `maxDuration` remains 30 s

**Evidence:** guard in `main.py`; `test_large_reflected_input_is_bounded_by_response_size`; `test_write_methods_are_disabled`.

---

### GT-SEC-08 — No security headers on API responses
**Severity:** Low · **Status:** Fixed

Every API response sets:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), geolocation=(), microphone=()`
- `Strict-Transport-Security`

`vercel.json` applies the same policy to static HTML. The production CSP no longer allows `'unsafe-inline'` for scripts; Vite emits external module scripts only.

**Evidence:** `test_security_headers_are_present`, `test_csp_is_configured_for_production_html`; live `/api/health` headers.

---

### GT-SEC-09 — In-memory session cache has no memory-size eviction
**Severity:** Low · **Status:** Accepted

The cache remains count-bounded at 8 sessions, plus a separate 8-entry telemetry cache. The audit measured ~72 MB for the eight largest location sets and ~1.8 MB per telemetry payload. This is within the current serverless memory budget.

A byte-budget eviction would be a useful future hardening step, but it is not required for the current single-user replay workload and would add complexity without changing the public attack surface.

**Evidence:** `test_session_cache_reports_bounded_size`, `test_load_memory_stays_below_two_hundred_megabytes`, diagnostics `max_sessions=8`.

---

## 4. Frontend / UI findings

### GT-SEC-10 — No input sanitization library (DOMPurify equivalent)
**Severity:** Medium · **Status:** Verified

No unsafe DOM sink exists. The codebase uses React JSX text rendering throughout. A source scan asserts there is no `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `new Function`, or `eval(` in application code.

**Evidence:** `test_security.py::test_no_dangerous_dom_sinks_in_frontend`.

**Policy:** if raw HTML is ever required, sanitize with DOMPurify and add a lint rule before merging.

---

### GT-SEC-11 — Three.js used beyond permitted scope (ADR-012)
**Severity:** Medium · **Status:** Fixed

Removed the unused `frontend/src/components/stage/SpeedTunnel.tsx` and its CSS. It was the only Three.js import under `components/stage` and was never referenced by a route. The `/app` circuit stage now has **zero** Three.js imports and uses CSS perspective only.

Three.js remains in:

- landing artwork (`components/landing`, `components/three`)
- the intentionally isolated `/lab` study route

Neither is part of the `/app` circuit stage or the eager entry bundle.

**Evidence:** `grep -rn "from 'three\|@react-three" frontend/src/routes/app frontend/src/components/stage frontend/src/components/timing` returns no matches; build succeeds.

---

### GT-SEC-12 — Unchecked timers without guaranteed cleanup
**Severity:** Low · **Status:** Verified

Audited every timer site:

- `PitLoader` — cancels rAF on effect cleanup
- `PitRail` — clears intro/closing timeouts
- `DecryptedText` — clears interval and hold timeout on unmount
- `SplitFlapText` — clears timeout and cancels rAF on unmount
- `Landing` — clears both scroll timeouts

**Evidence:** transition tests for PitLoader/PitRail; source review; no leaked timers observed in repeated mount/unmount tests.

---

### GT-SEC-13 — Source maps may be exposed in production
**Severity:** Low · **Status:** Fixed

`frontend/vite.config.ts` sets `build.sourcemap: false`. The production build contains no `.map` artifacts.

**Evidence:** Vite config; `npm run build` output.

---

### GT-SEC-14 — React 19.3.1 is very recent
**Severity:** Medium · **Status:** Verified

No action required beyond current controls. The project uses the current React 19.3.1 with a committed lockfile. `npm audit` and Snyk report 0 vulnerabilities for the installed tree.

**Evidence:** `npm ls react react-dom`; `npm audit`; Snyk frontend result.

---

### GT-SEC-15 — `@react-three/fiber` and `three` ecosystem
**Severity:** Low · **Status:** Verified

Three.js is confined to landing/lab and is lazy-loaded. Snyk and npm audit report no advisories for `three`, `@react-three/fiber`, or `@react-three/drei`. The unused circuit-stage component was removed (GT-SEC-11).

**Evidence:** Snyk 89-dependency scan, 0 vulnerabilities; lazy route chunks in build output.

---

## 5. Dependency findings

### GT-SEC-16 — Unpinned dev dependency ranges
**Severity:** Low · **Status:** Accepted

`package-lock.json` is committed and Vercel uses `npm ci`, so CI/deploy installs are reproducible even though `package.json` keeps caret/tilde ranges for maintainability. Snyk/npm audit are clean.

Pin exact dev versions only if the team wants to give up routine patch updates; the lockfile already prevents silent drift in CI.

---

### GT-SEC-17 — Vercel bundles `backend/data/**`
**Severity:** Medium · **Status:** Accepted

The serverless API must read normalized JSON at runtime; the data is public historical F1 content with no secrets or PII. Access is guarded by the path-containment checks in GT-SEC-04, and only known dataset filenames are read. No data file is served statically.

**Evidence:** `includeFiles` in `vercel.json`; `test_static_backend_data_is_not_served`; path guard tests.

---

### GT-SEC-18 — SPA fallback routes non-API paths to `index.html`
**Severity:** Low · **Status:** Accepted

This is the standard client-side routing fallback. API paths are excluded (`/((?!api/).*)`), security headers are applied to all paths, and the app has no server-side content to confuse with a 404. A custom 404 page is a UX choice, not a security control.

---

### GT-SEC-19 — No `.env` or secrets in repository
**Severity:** N/A (positive) · **Status:** Verified

The test now uses `git ls-files` rather than a filesystem walk, so an untracked local `.env` cannot create a false failure and a tracked secret cannot be missed.

**Evidence:** `test_no_env_files_are_committed`, `test_gitignore_covers_secrets_and_build_artifacts`, `test_no_secret_patterns_in_source`.

---

## 6. Snyk scanner details

### 6.1 Frontend

```text
Snyk CLI 1.1308.3
Dependency count: 89
Vulnerabilities: 0
ok: true
```

The scan was run from `frontend/` with `npx --no-install snyk test --json`.

### 6.2 Python

`npx snyk test --file=requirements.txt` returns:

```text
ERROR Missing required packages (SNYK-OS-PYTHON-0013)
Status: 422 Unprocessable Entity
```

The CLI is authenticated (`snyk doctor` passes authentication/connectivity), but it cannot resolve this requirements graph. `pip-audit -r requirements.txt` reports **no known vulnerabilities**. This gap is reported honestly rather than claiming a clean Snyk Python scan.

### 6.3 Bandit

`bandit -q -r app -x app/tests` now reports **0 issues**. The former `B310` at `app/providers/jolpica.py` is fixed rather than only accepted: `_get_json` rejects every URL that does not start with `https://api.jolpi.ca/` before reaching `urlopen`, and the call is annotated `# nosec B310` so the remaining literal-host guarantee is documented at the call site. Any future change that weakens the origin check fails fast instead of opening a custom-scheme request.

---

## 7. Remediation roadmap — final status

| Priority | Item | Status |
|---|---|---|
| P0 | CORS middleware (`GT-SEC-02`) | Done |
| P0 | API abuse controls (`GT-SEC-01`) | Rate limiting + body cap; auth accepted for public read-only data |
| P0 | Pin runtime dependencies (`GT-SEC-05`, `GT-SEC-06`) | Done / verified |
| P1 | Generic error messages (`GT-SEC-03`) | Done |
| P1 | Session-key path validation (`GT-SEC-04`) | Done |
| P1 | Three.js landing-only (`GT-SEC-11`) | Done for `/app` stage; landing/lab remain |
| P1 | Dependency audits (`GT-SEC-14`, `GT-SEC-15`) | Clean |
| P1 | Disable source maps (`GT-SEC-13`) | Done |
| P2 | Security headers (`GT-SEC-08`) | Done |
| P2 | Request body cap (`GT-SEC-07`) | Done |
| P2 | Memory-aware cache (`GT-SEC-09`) | Accepted; count bound retained |
| P2 | Timer cleanup (`GT-SEC-12`) | Verified |

---

## 8. Manual verification performed

- `npm audit --audit-level=low` → 0 vulnerabilities
- Snyk frontend → 0 vulnerabilities / 89 deps
- `pip-audit -r requirements.txt` → no known vulnerabilities
- Bandit → 0 issues (B310 origin check + scoped suppression)
- `test_security.py` → 38 passed, including traversal, reflection, headers, CORS, docs, rate-limit, dependency-pin, `.env`, dangerous-sink, and read-only checks
- Live `/api/health` → all security headers present
- Live `/openapi.json`, `/docs`, `/redoc` → 404
- Live `/api/diagnostics` → relative data path
- Browser: `/app` at 390×844 and 1440×900, session switch, ticker filtering, Settings navigation

---

## 9. Residual risk statement

The remaining risk is operational rather than exploitable:

1. A public read-only API can still be scraped or load-tested. Per-process rate limiting and bounded upstream calls reduce impact; a CDN/edge rate limit is the next step if abuse appears.
2. The in-memory cache is bounded by session count, not bytes. The measured ~72 MB ceiling is acceptable for the current deployment but should be revisited if dataset size grows.
3. The Python Snyk graph is not scanned by Snyk in this environment; `pip-audit` is the current compensating control.
4. Three.js remains in the landing artwork and the isolated `/lab` study route. It is not imported by `/app` or the circuit stage.

No high-severity issue remains open. No commit, push, or deployment was performed.
