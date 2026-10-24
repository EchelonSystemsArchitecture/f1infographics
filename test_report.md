# GRIDTRACE — Test, Edge-Case, UI-Transition, Optimization & Security Report

**Project:** f1infographics / GRIDTRACE
**Branch:** `optimizations`
**HEAD:** `109dc78` (`vulnerablities: manual_v1`)
**Report date:** 2026-10-25
**Scope:** 500+ edge-case checks, UI transition checks, optimization checks, vulnerability review
**Status:** audit complete. **No application code was fixed.** No commit or push was made.

> This report records what the code currently does, including failures that are deliberately marked as
> expected failures in the test suite. “Green” test output does **not** mean those bugs are fixed: 45 checks
> are marked expected failures because they describe real defects.

---

## 1. Executive summary

| Measure | Result |
|---|---|
| Total checks executed | **884** |
| Passed | **839** |
| Known failures encoded in the suite | **45** |
| Unexpected failures | **0** |
| Backend suite | 677 checks — 655 passed, 22 expected failures |
| Frontend suite | 207 checks — 184 passed, 23 expected failures |
| Edge-case + UI checks (the requested 500+) | **753** (546 backend edge + 207 frontend edge/UI) |
| UI transition checks | 58 (40 dedicated transition tests + 7 motion + 11 hook tests) |
| Performance checks | 31 (30 passed, 1 expected failure) |
| Security checks | 38 passed |
| TypeScript / lint / build | `tsc --noEmit` clean; `oxlint` 0 errors / 26 warnings; build succeeds |
| Dependency audit | `npm audit` 0 vulnerabilities; `pip-audit` no known vulnerabilities |

The desktop replay UI is functional at 1440×900. The audit found **three severe product-level issues** that
the existing test suite did not fully cover:

1. **The app layout is unusable below 900 px wide** — the main application starts below the first
   viewport and has zero height at 390×844.
2. **The Race Control ticker always shows the final race-control message**, even at `t=0`, so it reports
   future events as if they already happened.
3. **Battle Lab always requests Silverstone session 9558**, even when another session is selected in the
   header, so it can display telemetry and circuit geometry from the wrong session.

In addition, several existing known bugs affect data honesty: the cancelled Imola 2023 session is exposed as a
playable REPLAY, four DSQ sessions return HTTP 500 on all derived engines, VSC “ending” messages leave VSC on,
qualifying/sprint sessions can be returned for a requested Race capability report, and grid/stint datasets
contain cross-session or invalid entries.

---

## 2. Environment and commands

**Runtime**

- Windows, Git Bash
- Python 3.12.13
- FastAPI 0.146.0, Pydantic 2.14.1, pandas 3.0.6, NumPy 2.5.4
- Node 24.21.0, npm 11.19.0
- Vite 8.3.4, Vitest 5.0.5, TypeScript 6.0.3, oxlint 1.88.0
- Browser checks at 1440×900 and 390×844

**Commands used**

```bash
cd backend && .venv/Scripts/python.exe -m pytest -q
cd frontend && npx vitest run
cd frontend && npx tsc --noEmit
cd frontend && npx oxlint
cd frontend && npm run build
cd frontend && npm audit
cd backend && uvx pip-audit -r requirements.txt
cd backend && uvx bandit -q -r app -x app/tests
curl -sSI https://gridtrace.vercel.app/
curl -sS -D - -o /dev/null "https://gridtrace.vercel.app/api/session/9558/state?t=1000"
```

**Important limitation:** browser automation ran in a backgrounded tab, so `requestAnimationFrame` was
throttled/paused. A click on Play correctly changed the store to `playing: true` (the control switched to
“Pause”), but the clock did not visibly advance in that hidden tab. Playback advancement is therefore
reported as **not fully exercised in the browser**, not as a playback bug. Clock logic is covered by unit
tests.

---

## 3. Test inventory

### 3.1 Backend — 677 checks

| Suite | Files | Checks | Passed | Expected failures |
|---|---:|---:|---:|---:|
| Edge API | 1 | 116 | 109 | 7 |
| Edge contracts | 1 | 67 | 65 | 2 |
| Edge datasets | 1 | 117 | 111 | 6 |
| Edge engines | 1 | 123 | 120 | 3 |
| Edge state | 1 | 123 | 120 | 3 |
| **Backend edge subtotal** | **5** | **546** | **525** | **21** |
| Security | 1 | 38 | 38 | 0 |
| Performance | 1 | 31 | 30 | 1 |
| Existing regression suite | 9 | 62 | 62 | 0 |
| **Backend total** | **16** | **677** | **655** | **22** |

### 3.2 Frontend — 207 checks

| Suite | Files | Checks | Passed | Expected failures |
|---|---:|---:|---:|---:|
| Formatting / delta / clock / circuit / flagship utilities | 7 | 149 | 129 | 20 |
| UI transitions (`ui.transitions.test.tsx`) | 1 | 40 | 38 | 2 |
| Motion hooks (`motion.test.tsx`) | 1 | 7 | 7 | 0 |
| Module loader hook (`useModule.test.tsx`) | 1 | 11 | 10 | 1 |
| **Frontend total** | **10** | **207** | **184** | **23** |

### 3.3 Combined

| Category | Count |
|---|---:|
| Edge-case checks | 546 backend + 207 frontend = **753** |
| UI transition checks | **58** (40 dedicated + 7 motion + 11 hook) |
| Optimization/performance checks | **31** |
| Security checks | **38** |
| Grand total | **884** |

The requested “500 edge case tests” target is exceeded by the 753 edge/UI checks. All 45 known failures are
marked with `xfail`/`.fails`, so the runners exit successfully; they are still open defects.

---

## 4. Test results

### 4.1 Backend

```
655 passed, 22 xfailed, 1 warning in 29.91s
```

The only warning is a Starlette/httpx deprecation warning from `fastapi.testclient` (`install httpx2`). It
does not affect results.

### 4.2 Frontend

```
Test Files  10 passed (10)
Tests       184 passed | 23 expected fail (207)
Duration    3.41s
```

### 4.3 Static checks and build

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `oxlint` | 0 errors, 26 warnings (mostly React Compiler ref-access warnings) |
| `npm run build` | exit 0 in 1.49s |
| Build warning | entry and Three.js chunks exceed Vite’s 500 kB warning threshold |
| `npm audit` | 0 vulnerabilities |
| `pip-audit -r requirements.txt` | no known vulnerabilities |
| `bandit -r app` | 1 medium: B310 `urllib.request.urlopen` in `providers/jolpica.py`; URL is a fixed constant, see §8.7 |
| Snyk SARIF | 2 note-level path-traversal findings in `ingest/normalize.py`; CLI-only, see §8.7 |

### 4.4 Build sizes

| Artifact | Raw | Gzip |
|---|---:|---:|
| Entry `dist/assets/index-*.js` | 703.96 kB | 235.84 kB |
| Landing Three.js chunk `StudioEnv-*.js` | 1,045.15 kB | 284.35 kB |
| CSS `index-*.css` | 128.23 kB | 23.45 kB |
| Total `dist/` | 6.4 MB | — |

The entry chunk includes landing-page GSAP/ScrollTrigger code because `Landing` is imported eagerly in
`frontend/src/App.tsx`; it is not route-split. `StudioEnv` is lazy and only needed on the landing page.

---

## 5. Backend correctness bugs (existing known failures)

These correspond to the 17 `BUG-xx` references already encoded in the backend tests.

| ID | Severity | Area | Finding | Evidence |
|---|---|---|---|---|
| BUG-01 | Low | State engine | `build_state_at` accepts `NaN` time and returns the last full state instead of an empty/error state. The HTTP API rejects `t=nan` via validation, so this is an internal-call defect today. | `test_edge_state.py::test_state_nan_time_returns_empty_state` |
| BUG-02 | Low | Contracts | `RaceControlEvent.lap_number`, `.flag` and `.category` are nullable without defaults. A row that omits them cannot be validated. | `test_edge_contracts.py::test_race_control_event_nullable_fields_default_to_none` |
| BUG-03 | Low | Contracts | Pydantic silently coerces boolean marker coordinates to `1.0`/`0.0`; invalid geometry is accepted rather than rejected. | `test_edge_contracts.py::test_car_marker_rejects_boolean_coordinates` |
| BUG-04 | High | State / UI | `VSC ENDING` and `VIRTUAL SAFETY CAR ENDING` set `vsc=True` instead of clearing it. The VSC badge can remain on after the period ends. | `test_edge_state.py` (2 xfails) |
| BUG-05 | Medium | API | `t=inf`, `t=1e309`, and long overflowing numeric strings return HTTP 200 with `"t_seconds": null` instead of 422; the response then violates the `StateAtTime` contract. | `test_edge_api.py::test_state_rejects_infinite_time` |
| BUG-06 | High | Engines / API | DSQ result rows with `number_of_laps: null` reach `int(None)` in `build_driver_lab`, causing HTTP 500 on driver-lab, constructor-lab, and prediction for sessions **9636, 9858, 9998, 10014**. | `test_edge_api.py::test_engines_handle_disqualified_rows` (4 params) |
| BUG-07 | High | Catalog | Capability matching ignores the requested `session` name and returns the first measured session at a circuit. Monaco 2023 `session=Race` returns Qualifying 9090 instead of Race 9094. | `test_edge_api.py::test_capabilities_route_matches_requested_session_type` |
| BUG-08 | Medium | Catalog | Local fallback season counts include Sprint sessions because they carry `session_type: "Race"`: returns 30/30/29 instead of race-only 24/24/23. | `test_edge_api.py::test_local_season_counts_exclude_sprints` |
| BUG-09 | Medium | Intelligence | `detect_flag_periods` does not close an open VSC period on a VSC-ending message; the period remains open until race end/chequered flag. | `test_edge_engines.py::test_detect_flag_periods_vsc_ending_closes_period` |
| BUG-10 | Medium | Intelligence | Missing `pit_duration` is treated as `0.0` (`s.get("pit_duration") or 0.0`), lowering pit totals and averages and making a missing measurement look like a zero-second stop. | `test_edge_engines.py::test_pit_aggregates_ignores_missing_durations` |
| BUG-11 | Medium | Prediction | Drivers without average pace receive `predicted_finish = 0`, breaking the 1..n ranking contract and rendering “P0” in the prediction table. | `test_edge_engines.py::test_prediction_rows_without_pace_get_valid_ranks` |
| BUG-12 | High | Dataset | Cancelled 2023 Imola (session 9086) is in `sessions.json` as a playable `REPLAY` session with zero drivers, zero laps, and zero race-control rows. | `test_edge_datasets.py` (2 xfails) |
| BUG-13 | High | Dataset | `grid.json` contains drivers who are not in the session entry list for 10 sessions: **9069, 9078, 9086, 9165, 9506, 9507, 9590, 9971, 10028, 10033**. | `test_edge_datasets.py::test_grid_drivers_are_always_part_of_the_session_entry_list` |
| BUG-14 | Medium | Dataset | Stints contain null lap bounds (e.g. 9140) and reversed bounds (`lap_end < lap_start`, e.g. 7787); 19 sessions are affected. Strategy timeline bars can be invalid. | `test_edge_datasets.py::test_stint_bounds_are_always_playable` |
| BUG-15 | Low | Dataset | Binned throttle/brake values exceed 100 in the flagship session 9558 (maximum 104). This is not physically possible and is visible on the throttle/brake charts. | `test_edge_datasets.py::test_telemetry_throttle_and_brake_are_physical` |
| BUG-16 | Medium | Dataset | Five sessions have duplicate grid positions / missing ranks: **9523, 9582, 9598, 9912, 9987**. Position-gained and grid-baseline stats are then ambiguous. | `test_edge_datasets.py::test_grid_positions_are_unique_per_session` |
| BUG-17 | High | Performance | `/api/session/{key}/telemetry` re-reads and re-parses the 1.8 MB `telemetry.json` on every request instead of using the session store. Measured p95 41.3 ms locally versus 3.4 ms for `/state`; the 20 ms threshold fails. | `test_performance.py::test_telemetry_http_p95_under_twenty_ms` |

### 5.1 Detail: BUG-06 (server errors)

Confirmed live against the local app:

```
9636  driver-lab       500
9636  constructor-lab  500
9636  prediction       500
9858  driver-lab       500
9858  constructor-lab  500
9858  prediction       500
9998  driver-lab       500
9998  constructor-lab  500
9998  prediction       500
10014 driver-lab      500
10014 constructor-lab 500
10014 prediction      500
```

Root cause: `backend/app/driver_lab.py`:

```python
laps=int(r.get("number_of_laps", 0))
```

`dict.get("number_of_laps", 0)` returns `None` when the key exists with a null value, so `int(None)` raises
`TypeError`. The same function feeds constructor-lab and prediction.

### 5.2 Detail: BUG-05 (invalid time accepted)

Confirmed locally:

```
t=inf        -> 200 {"t_seconds":null,"current_lap":52,...}
t=1e309      -> 200 {"t_seconds":null,"current_lap":52,...}
t=9... (400 digits) -> 200 {"t_seconds":null,...}
```

`Query(ge=0)` accepts positive infinity; Pydantic/FastAPI serializes non-finite floats as JSON `null`.
This is both an input-validation gap and a response-contract violation.

### 5.3 Detail: BUG-07 (wrong session type)

The catalog’s `_match_ingested` only matches year + circuit name/locality and returns the first ingested
session. It never compares the requested `session_name` (`Race`, `Qualifying`, `Sprint`). A circuit that has
Qualifying ingested before Race therefore resolves to qualifying, e.g. Monaco 2023: requested Race 9094,
returned 9090.

---

## 6. Frontend correctness and transition bugs

The 23 expected frontend failures group into eight defects.

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| FE-01 | High | Navigating to Settings from the expanded PitRail menu leaves the full-screen menu `is-open` (and the scrim mounted). The user must press Escape to reach the settings page. | `ui.transitions.test.tsx::routes Settings through the same close behaviour` |
| FE-02 | Medium | TimingTower falsely promotes an unchanged last lap to “personal best” after two renders. `lapBook.seen` increments on every rows update, so repetition looks like improvement. | `ui.transitions.test.tsx::an unchanged last lap must not become a personal best on re-render` |
| FE-03 | Medium | Every session window below one hour is clamped to 3600 s, so seven 30-minute Sprint sessions (9069, 9117, 9140, 9204, 9883, 9934, 10028) get a one-hour clock and 30 minutes of empty timeline. The intelligence flag timeline separately hard-codes a 7200 s axis. | `flagship.test.ts::a real 30-minute sprint window should not be clamped to one hour` |
| FE-04 | Medium | `useModule` keeps the previous result and `loading: false` when dependencies change. A new session/module can display the previous session’s data until the new request resolves. | `useModule.test.tsx::should enter loading and hide stale data when dependencies change` |
| FE-05 | Medium | The clock store accepts `NaN` in `set`, `seek`, and `setDuration`; shrinking duration does not clamp `t`; switching duration does not reset `t`; `setSpeed` accepts 0, negative, and `NaN`. These can poison the clock or strand it past the new duration. Eight expected failures. | `clock.edge.test.ts` |
| FE-06 | Low | Circuit projection accepts `NaN` rotation/coordinates and emits `NaN` SVG points; a viewport narrower than `2 × PAD` produces points outside its width. Four expected failures. | `circuitProjection.test.ts` |
| FE-07 | Low | `deltaTimeAt(NaN, …)` returns `NaN` instead of rejecting non-finite speed. `cumulativeDelta` filters most bad samples, so the UI usually escapes this. | `delta.edge.test.ts` |
| FE-08 | Low | Formatting leaks non-finite/negative values: `formatClock(NaN/Infinity)` produces strings such as `NaN:NaN.NaN`; `formatGap(Infinity)` prints `Infinity`; negative/infinite lap times are not rejected; `formatCompound(" soft ")` yields `" SO"`. Six expected failures. | `format.test.ts` |

### 6.1 Clock failure detail

`frontend/src/store/clock.ts`:

```ts
set: (t) => set({ t: Math.max(0, Math.min(t, get().duration)) })
seek: (t) => set({ t: Math.max(0, Math.min(t, get().duration)) })
setDuration: (duration) => set({ duration: Math.max(0, duration) })
setSpeed: (speed) => set({ speed })
```

With `NaN`, `Math.max`/`Math.min` return `NaN`, so `t`, `duration`, or `speed` become `NaN`. The state hook
then requests `/state?t=NaN` (422), and `formatClock` renders a non-numeric readout. `setDuration` also never
clamps `t` when the new duration is smaller, and `useFlagship` does not reset the clock when the session key
changes.

### 6.2 UI transition coverage that passed

The passing checks cover:

- PitLoader entering/out states, first-load vs subsequent duration, reduced motion, and unmount.
- PitRail open/close, Escape, scrim, module navigation, session button, closing animation, and session badge.
- ReplayControls play/pause, four speeds, scrubber, and duration clamping.
- RaceRibbon pins, expand/collapse, previous/next event navigation, speed, empty state, and invalid dates.
- TimingTower rows, selection via click/Enter/Space, marker badges, empty state, and session-best class.
- Motion hooks: reduced-motion listening/cleanup, IntersectionObserver entry/fallback.
- `useModule`: success/error/non-Error rejection, dependency reload, latest-request-wins, unmount safety.

Accessibility gaps that are not covered by assertions:

- The expanded PitRail menu has no focus trap, does not mark background content inert, and does not return
  focus to the toggle when closed.
- TimingTower rows use `aria-selected` on elements with `role="button"`; `aria-selected` is not valid for a
  generic button. `aria-pressed` or an option/grid row pattern would be appropriate.
- RaceRibbon navigation uses `aria-disabled` while keeping buttons focusable. Click handlers are guarded, so
  behaviour is safe, but keyboard users can still focus unavailable controls.

---

## 7. New findings not covered by the existing failures

### NEW-01 — Critical: app is unusable below 900 px wide

**Location:** `frontend/src/routes/app/AppShell.css` (`@media (max-width: 900px)`),
`frontend/src/components/app/PitRail.css` (`.pitrail { height: 100svh; }`)

**Observed at 390×844:**

```
.pitrail        x=0  y=0    w=84  h=844
.app__main      x=0  y=844  w=379 h=0
.app__statusbar x=0  y=844  w=379 h=128
.app__content   x=0  y=988  w=379 h=44
.rc / tower     y=1296+
```

The `.app` grid becomes one column (`auto 1fr`) below 900 px, but `.pitrail` remains `height: 100svh`.
Its empty in-flow box consumes the entire first grid row, leaving the main column at `y=844` with height 0.
The fixed 84 px rail also overlays the left edge of the main column. At 390×844 the first screen is blank
except for the rail; there is no usable Race Control, timing tower, track map, or ribbon.

This is a rendering/layout defect. It also affects tablets between 700 and 900 px. The mobile CSS only
restyles the legacy `.app__rail`, not the actual `.pitrail` component.

### NEW-02 — High: Race Control ticker shows the future as current

**Location:** `frontend/src/routes/app/AppShell.tsx:49`

```ts
const latestMsg =
  raceControl && raceControl.length > 0
    ? raceControl[raceControl.length - 1]
    : null
```

The ticker always displays the **last event in the dataset**, regardless of the shared clock. At `/app` with
`t=0` (`00:00.000`, Lap 0) the rendered ticker showed:

```
WAVED BLUE FLAG FOR CAR 24 (ZHO) TIMED AT 16:26:12
```

The session starts at 14:00. At 00:00 the user is being shown an event 2 h 26 min in the future. The ticker
also never changes while the clock advances because `raceControl` is static. It needs a time filter
(`event time <= startMs + t`) and should show the latest past event (or an explicit empty state).

### NEW-03 — High: Battle Lab mixes the selected session with the flagship session

**Location:** `frontend/src/routes/app/BattleLab.tsx:25,45`

```ts
const circuit = useCircuit()                     // defaults to FLAGSHIP_SESSION_KEY 9558
...
api.telemetry(FLAGSHIP_SESSION_KEY, [a, b], lapQuery)
```

`BattleLab` receives `drivers` for the session selected in AppShell, but the circuit and telemetry request
are hard-coded to 9558. If the selected session is not Silverstone 2024:

- drivers/labels in the selector come from the selected session;
- telemetry comes from 9558 (or 404s for driver numbers absent there);
- circuit geometry and corner distances come from 9558;
- the UI still shows a `REPLAY` badge and presents the mixture as current-session data.

This violates the “every number traceable to the selected session” rule. It is not covered by a test.

### NEW-04 — Medium: duplicate state polling and a permanently running rAF loop

- `AppShell` calls `useRaceState(sessionKey)` at line 39 for the header lap count.
- `RaceControl` calls `useRaceState(sessionKey)` again at line 26 for the timing tower and markers.
- Each hook fetches `/api/session/{key}/state` whenever the rounded clock changes and on mount.
- `AppShell` keeps polling on every route (settings, vault, strategy, etc.), even when the race state is not
  displayed.

Result: roughly **two state requests per second** while the clock is running, plus one-per-second polling
on non-race routes. There is no shared cache or request deduplication.

`ClockDriver` also schedules `requestAnimationFrame` permanently (lines 23–25), including while paused and
while idle. It checks the store every frame; on battery-powered devices this keeps a 60 fps wake-up loop
alive for no visual work.

### NEW-05 — Medium: entry bundle pulls landing-page code into every app route

`frontend/src/App.tsx` imports `Landing` eagerly:

```ts
import { Landing } from './routes/landing/Landing'
```

The entry chunk is **703.96 kB / 235.84 kB gzip** and contains GSAP/ScrollTrigger strings. `/app` users pay
for landing animation code even if they never visit `/landing`. Lazy-loading `Landing` would split the
landing-only code; `Lab`, `StudyRender`, and `FerroLab` are already lazy.

`StudioEnv` (1,045.15 kB / 284.35 kB gzip) is already lazy and is not in the app entry, but it is still a
large landing chunk.

### NEW-06 — Medium: stale state while switching sessions

`useRaceState`, `useFlagship`, and `useModule` all use a `cancelled` flag to ignore late responses, but
they do not abort the network request and do not clear the old value when the key/dependency changes.

- `useRaceState` keeps the previous session’s timing/markers until the new `/state` request resolves.
- `useFlagship` keeps the previous session/drivers while `loading` is true.
- `useModule` keeps old data with `loading: false` (FE-04).

Because the shared clock also keeps `t` across the session switch, a new shorter session can briefly show the
old session’s state at a time beyond its duration. This is a data-attribution risk, not just a loading
polish issue.

### NEW-07 — Medium: prediction accuracy compares different driver sets

`backend/app/prediction.py` computes `baseline_mae` and `model_mae` through the same `mae()` helper:

```python
for r in rows:
    pred = predicted.get(r.driver_number)
    if pred is None:
        continue
    errs.append(abs(pred - (r.finish or 0)))
```

`rows` includes every finisher. `baseline_pred` only has entries with a non-null grid position; `model_pred`
only has entries with a non-null average lap. If those sets differ, the two MAEs use different denominators
and the “improvement” headline is not a like-for-like comparison. The missing-driver case is already exposed
by BUG-11; this is the separate ratio/denominator issue.

### NEW-08 — Low: Driver Lab best-lap label can render non-finite text

`frontend/src/routes/app/modules/Modules.tsx` computes:

```ts
const best = Math.min(...data.drivers.map((r) => r.best_lap_ms ?? Infinity))
```

When no driver has a best lap (e.g. a session with no timing data), `best` is `Infinity` and the legend
renders `SESSION BEST (Infinity:NaN.NaN)` through `fmtLap`. This overlaps FE-08 but is reachable from a
normal empty-data response.

### NEW-09 — Low: weather lookup can use a pre-session fallback

`RaceControl` initializes `wx = null` and, if no sample is at or before `nowMs` but weather exists, falls
back to `weather[0]`. For a clock before the first weather sample this presents the first pre-session sample
as current conditions instead of `UNAVAILABLE`. For Silverstone 9558 the first sample is 13:05, before the
14:00 start, so the usual `t=0` case is covered by the last-at-or-before loop; the fallback is only a
boundary issue.

---

## 8. Security findings

**Threat model:** public, read-only historical replay data. There is no user account, PII, write endpoint,
payment, or secret in the API. “No authentication” is therefore **not** currently a vulnerability, but
unauthenticated expensive endpoints and future write/user-data features are.

### 8.1 High-level results

| Area | Result |
|---|---|
| Path traversal | Not possible through typed `session_key`; tests pass. Static backend data is not served. |
| CORS | No CORS middleware/wildcard on the API; test passes. Production static HTML/assets do return `Access-Control-Allow-Origin: *` (Vercel), which is low risk for public assets. |
| SQL / command injection | No SQL and no shell execution on request paths. |
| DOM XSS | No `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `new Function`, or `eval` in frontend source. React escapes rendered race-control strings. |
| Secrets | No tracked `.env`, private key, GitHub token, AWS key, or OpenAI-style key found. |
| Methods | POST/PUT/PATCH/DELETE/TRACE are rejected on API routes. |
| Error leakage | No traceback or internal type names in 500 responses. |
| Dependency CVEs | `npm audit` 0; `pip-audit` no known vulnerabilities. |
| Rate limiting | **Absent.** |
| Browser security headers | **Absent from app code**; production HSTS is supplied by Vercel, but CSP/XFO/XCTO/Referrer-Policy/Permissions-Policy are not. |
| Diagnostics disclosure | **Present.** |

### 8.2 SEC-01 — Missing browser security headers / framing protection

**Severity:** Medium (defence-in-depth; public app, no auth)

Production headers observed:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
(no Content-Security-Policy)
(no X-Frame-Options)
(no X-Content-Type-Options)
(no Referrer-Policy)
(no Permissions-Policy)
```

HSTS is provided by Vercel, but the app does not set a CSP or framing protection. The site can be embedded
in an iframe, and MIME sniffing is not explicitly disabled. With no authenticated actions the immediate
impact is limited, but it becomes material if user settings, saved simulations, or accounts are added.
`vercel.json` has no `headers` block and the FastAPI app has no security-header middleware.

### 8.3 SEC-02 — Diagnostics exposes server internals; docs/OpenAPI are public

**Severity:** Low

Production `/api/diagnostics` returns:

```json
{"session_key":null,"ingested_sessions":90,
 "data_dir":"/var/task/backend/data",
 "session_store":{"sessions_cached":1,"max_sessions":8},
 "datasets_present":{},"data_mode":"REPLAY"}
```

This reveals the deployment filesystem layout, dataset count, and cache behaviour. `/docs`, `/redoc`, and
`/openapi.json` also return 200 without authentication. None of this is secret data, but it aids
reconnaissance and increases the exposed surface. The Settings UI displays `data_dir` directly.

Tests that confirm this are intentionally named:
`test_diagnostics_discloses_server_filesystem_path`, `test_openapi_exposes_internal_route_inventory`,
`test_docs_are_exposed_without_auth`.

### 8.4 SEC-03 — No rate limiting; telemetry parses 1.8 MB before validating input

**Severity:** Medium (availability/cost)

`/api/session/9558/telemetry` reads and parses `telemetry.json` (1,808,513 bytes) **before** it validates
the `drivers` string. Therefore even a request such as `?drivers=<script>` pays the full parse cost before
returning 400. Local measurements: telemetry p50 34.5 ms, p95 41.3 ms; 1.8 MB JSON parse p50 48.1 ms. Live
requests from this network were ~0.50–0.52 s per telemetry request (network + function), versus ~0.45–0.58 s
for the much cheaper `/state` (network-dominated).

There is no per-IP/session limit (`test_no_rate_limit_currently_applies` passes after 50 requests). On
Vercel, concurrent requests consume function concurrency and can raise cost / cause 429s. Fix direction:
validate selectors first, cache parsed telemetry in the session store, and add a request budget.

### 8.5 SEC-04 — Catalog endpoints can amplify slow upstream calls

**Severity:** Medium (availability)

`/api/seasons/{year}/events` and `/api/seasons/{year}/rounds/{round_}/capabilities` accept arbitrary
unbounded integers for `year`/`round_` and call Jolpica. `providers/jolpica._get_json` uses a 20 s timeout
with up to three attempts and 1.5 s/3 s backoff. A failing upstream can therefore occupy a function for
roughly **60 s plus backoff**, exceeding the configured Vercel `maxDuration: 30`. Distinct arbitrary years
also create unbounded in-memory event cache entries. This is not SSRF (the base URL is a constant), but it is
an outbound-request amplification and upstream-rate-limit risk.

Suggested bounds: `year` 1950..current+1, `round_` 1..30, a short circuit-breaker, and a bounded upstream
cache. The current fallback returns local data only after the exception; it does not prevent the call.

### 8.6 SEC-05 — Python runtime dependencies are not fully pinned

**Severity:** Low–Medium (supply chain/reproducibility)

`backend/requirements.txt` pins FastAPI/Pydantic/pandas/NumPy but leaves `uvicorn[standard]`, `httpx`, and
`pytest` unpinned. A fresh install can resolve newer versions than those tested. There is no Python lock
file (the frontend has `package-lock.json`, and Vercel uses `npm ci`). `pytest` is a test-only dependency but
is installed in the production requirements list.

Note: `test_backend_requirements_pin_production_dependencies` currently **asserts** that those packages are
unpinned, so it codifies the problem instead of preventing it (see §10).

### 8.7 SEC-06 — Static assets allow wildcard CORS; informational Snyk/Bandit results

**Severity:** Low / informational

Production `/` returns `Access-Control-Allow-Origin: *` (Vercel static serving). The API’s `/state` response
does not. Wildcard CORS on public static HTML/JS/CSS is not sensitive, but it allows other origins to read
the public app shell. If future API responses are ever served from the same static path, revisit this.

Snyk’s SARIF output contains two note-level `python/PT` findings in `backend/app/ingest/normalize.py`
(`json.dump` paths at the CLI write path). They are **not remotely reachable**: the path comes from the
operator’s ingest command, not an HTTP parameter. Bandit’s only finding is B310 in `providers/jolpica.py`;
the URL is built from the constant `https://api.jolpi.ca/ergast/f1`, so it is a false positive for this
codebase.

### 8.8 Positive security findings

- No secrets or `.env` files are tracked; `.gitignore` covers `.env*`, cache, node_modules, and dist.
- No path traversal through integer `session_key`; encoded traversal tests return 404/422.
- No unsafe DOM sinks; React text rendering is used throughout.
- No wildcard CORS on API routes; no write methods.
- No SQL/command execution on request paths.
- Dependency audits are clean.
- CSP absence is the main hardenability gap, not an active XSS finding.

---

## 9. Performance and optimization measurements

All timings below are **local** (`TestClient`/direct calls, Windows, warm Python process) unless marked
“live”. They are not directly comparable to Vercel network timings.

| Measurement | Result |
|---|---:|
| Cold session load (9558, includes 3.2 MB locations parse + index) | 96.4 ms |
| Warm session load (cache hit) | 0.312 ms |
| Direct `build_state_at` p50 / p95 / max | 0.096 / 0.139 / 0.881 ms |
| 20,000 direct state reconstructions | < 10 s (threshold passes) |
| HTTP `/state?t=1000` p50 / p95 | 1.91 / 3.44 ms |
| `/state` payload | 5,745 B (gzip 1,340 B) |
| `/sessions` payload | 25,290 B (gzip 2,284 B) |
| `/race-control` payload | 20,142 B (gzip 1,781 B) |
| `/weather` payload | 25,858 B (gzip 2,521 B) |
| `/telemetry?drivers=44` p50 / p95 | 34.47 / 41.32 ms |
| Telemetry JSON parse p50 | 48.08 ms |
| Telemetry JSON size | 1,808,513 B |
| 8 cached sessions (largest location sets) current / peak | 72.3 / 72.4 MB |
| 8-session cold fill time | 1,202 ms |
| Entry JS | 703.96 kB raw / 235.84 kB gzip |
| StudioEnv JS | 1,045.15 kB raw / 284.35 kB gzip |
| CSS | 128.23 kB raw / 23.45 kB gzip |

**Optimization conclusions**

- BUG-17 is confirmed: telemetry is ~10× slower than state, and its parse cost is paid per request.
- The state path is fast (sub-millisecond engine, ~3 ms HTTP); the session cache is effective (warm hit
  0.312 ms vs 96 ms cold).
- The 8-session cache is bounded by count, measured at ~72 MB for the largest location sets. This is within
  the tested limit but is a meaningful per-instance footprint. `max_sessions=8` plus 72 MB is not a memory
  *bug*, but a byte-budget would be safer on constrained serverless instances.
- The entry bundle contains landing code. Lazy-loading `Landing` is the clearest bundle win, followed by
  reviewing the 1 MB StudioEnv landing chunk.
- Two state requests/second and a permanently active rAF loop are avoidable UI costs (NEW-04).
- Live Vercel requests from this network took ~0.45–0.58 s for state and ~0.50–0.52 s for telemetry. The
  function appears to run in `iad1`; network/region latency dominates these numbers. They are evidence for a
  regional-latency review, not proof of a parse-time regression in production.

**Performance suite status:** 30 of 31 pass. The only failing assertion is the intentionally documented
telemetry p95 < 20 ms test (BUG-17). Payload-size, cache, concurrency, index-size, cold-load, and latency
thresholds pass.

---

## 10. Test-quality issues

These are issues in the audit suite itself; they should be fixed before the suite is used as a CI gate.

### TQ-01 — The “pin production dependencies” test asserts the opposite

`backend/app/tests/test_security.py::test_backend_requirements_pin_production_dependencies` collects lines
without `==` and asserts that `uvicorn[standard]`, `httpx`, and `pytest` are in that unpinned list. The test
therefore passes precisely because runtime dependencies are unpinned. It should fail on any unpinned
production dependency and should not require `pytest` in the production requirements file.

### TQ-02 — The `.env` test checks the filesystem, not Git tracking

`test_no_env_files_are_committed` uses `ROOT.rglob(".env*")` and asserts the result is empty. A developer’s
local untracked `.env` makes the test fail even though nothing is committed; a committed file located
outside the scanned tree could be missed. The test should use `git ls-files` (or equivalent) for tracked
secrets.

### TQ-03 — Expected failures keep the suite green

The 45 real defects are `xfail(strict=True)` or `it.fails`. That is useful for documentation, but CI still
reports “all tests passed” at the process level. A release gate should separately count expected failures,
fail above an agreed budget, or use a quarantine report so known bugs cannot silently grow.

### TQ-04 — No test covers the three new high-severity UI findings

NEW-01 (mobile layout), NEW-02 (future ticker), and NEW-03 (Battle Lab session mismatch) have no regression
test in the current suite. They were found by browser DOM measurement and source inspection. Adding tests
would prevent these from regressing.

---

## 11. Prioritized fix order (not applied)

**P0 — data honesty / unusable UI**

1. Fix NEW-01 mobile grid/rail layout at ≤900 px.
2. Fix NEW-03 Battle Lab session key and circuit source.
3. Fix NEW-02 ticker time filtering.
4. Fix BUG-04 VSC-ending state.
5. Fix BUG-06 null `number_of_laps` 500s.
6. Fix BUG-07 capability `session_name` matching.
7. Remove/quarantine the cancelled Imola 2023 session (BUG-12).
8. Repair grid entry-list contamination and duplicate positions (BUG-13, BUG-16).
9. Repair or exclude invalid stint bounds (BUG-14).

**P1 — reliability / performance**

10. Cache parsed telemetry and validate selectors before reading the 1.8 MB file (BUG-17 / SEC-03).
11. Fix clock NaN/shrink/session-reset behavior and sprint duration clamping (FE-03, FE-05).
12. Make `useModule`, `useRaceState`, and `useFlagship` clear stale state and abort requests on key changes
    (FE-04, NEW-06).
13. Add rate limiting and bound catalog `year`/`round_`; reduce upstream timeout (SEC-03, SEC-04).
14. Fix Settings menu close behavior (FE-01).
15. Fix pit aggregation, VSC periods, and prediction rank/denominator issues (BUG-09, BUG-10, BUG-11,
    NEW-07).
16. Add security headers/CSP and remove or protect diagnostics/docs (SEC-01, SEC-02).
17. Lazy-load Landing; reduce duplicate state polling; gate the rAF loop while paused (NEW-04, NEW-05).

**P2 — contract/format polish**

18. Contract defaults and boolean-coordinate rejection (BUG-02, BUG-03).
19. Non-finite/negative formatting and projection guards (FE-06, FE-08).
20. Fix false personal-best promotion (FE-02).
21. Fix upstream/dependency/test-quality issues (SEC-05, TQ-01, TQ-02, TQ-03).

---

## 12. Reproduction details

### 12.1 Backend expected-failure report

```bash
cd backend
.venv/Scripts/python.exe -m pytest -q -rxX
```

The 22 XFAIL lines name each BUG ID and the exact failing assertion.

### 12.2 Frontend expected-failure report

```bash
cd frontend
npx vitest run --reporter=verbose
# or inspect the it.fails cases:
grep -rn "\.fails(" src --include=*.test.*
```

The 23 expected failures are grouped in FE-01..FE-08 above.

### 12.3 Build/static checks

```bash
cd frontend
npx tsc --noEmit
npx oxlint
npm run build
npm audit
```

### 12.4 Dependency/security scans

```bash
cd backend
uvx pip-audit -r requirements.txt
uvx bandit -q -r app -x app/tests
```

### 12.5 Mobile-layout DOM check

At 390×844, on `/app`:

```js
({
  rail: document.querySelector('.pitrail').getBoundingClientRect(),
  main: document.querySelector('.app__main').getBoundingClientRect(),
  status: document.querySelector('.app__statusbar').getBoundingClientRect(),
  content: document.querySelector('.app__content').getBoundingClientRect(),
})
```

Observed: `.pitrail` 84×844 at `(0,0)`; `.app__main` at `y=844`, height `0`; `.app__content` at `y=988`,
height `44`. This is the evidence for NEW-01.

### 12.6 Production header check

```bash
curl -sSI https://gridtrace.vercel.app/
curl -sS -D - -o /dev/null \
  'https://gridtrace.vercel.app/api/session/9558/state?t=1000' \
  -H 'Accept-Encoding: gzip, br'
```

Production currently shows HSTS and, on `/`, `Access-Control-Allow-Origin: *`; it does not show CSP,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy. The deployed revision may
predate this branch; the header result is an observation of the current production URL.

---

## 13. Files added/changed by this audit

Tests used by this audit (two files were already tracked in HEAD; the remainder are untracked). No application source edits were made:

```text
backend/app/tests/test_edge_api.py
backend/app/tests/test_edge_contracts.py
backend/app/tests/test_edge_datasets.py
backend/app/tests/test_edge_engines.py
backend/app/tests/test_edge_state.py
backend/app/tests/test_performance.py
backend/app/tests/test_security.py
frontend/src/components/ui.transitions.test.tsx
frontend/src/data/flagship.test.ts
frontend/src/lib/motion.test.tsx
frontend/src/routes/app/modules/useModule.test.tsx
frontend/src/store/clock.edge.test.ts
frontend/src/utils/circuitProjection.test.ts
frontend/src/utils/delta.edge.test.ts
frontend/src/utils/format.test.ts
```

This report:

```text
test_report.md
```

**No application code was modified to fix any finding. No commit, push, or deployment was performed.**
The working tree also contains unrelated pre-existing/generated files (`.gitignore` modification,
`code-report.json`); they were left untouched and are not part of this report’s test results.

---

## 14. Bottom line

- The request for 500+ edge cases is satisfied with **753** backend/frontend edge and UI checks.
- The suite is broad and catches many real data-integrity and transition defects; 45 assertions currently
  fail by design.
- The highest-risk immediate defects are **mobile layout**, **Battle Lab cross-session data**, **future
  ticker messages**, **VSC ending state**, **DSQ 500s**, **cancelled-session exposure**, **wrong capability
  session**, **grid/stint contamination**, and **telemetry parsing on every request**.
- No known dependency CVEs were found, and the API has good baseline traversal/XSS/write-method hygiene.
  The main security gaps are operational: no rate limit, expensive telemetry access, unbounded upstream
  catalog calls, missing browser security headers, and diagnostics/docs disclosure.
