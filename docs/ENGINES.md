# GRIDTRACE Engines

Every analytical view in GRIDTRACE is a **pure transformation of cached API responses**.
No engine invents numbers, interpolates gaps across red flags, or smooths missing
telemetry. Each one states what it reads, what it emits, and where it honestly
stops. All engines return `data_mode` from `backend/app/contracts.py`; the
provenance rule (see [DATA_SOURCES_AND_PROVENANCE](DATA_SOURCES_AND_PROVENANCE.md))
is `REPLAY` for anything derived from cached OpenF1/Jolpica pulls, `SIMULATION`
for the Prediction Arena, `UNAVAILABLE` when a required dataset is absent.

Shared infrastructure first, then one section per engine.

---

## 1. Session store (foundation)

**Code:** `backend/app/session_store.py` · **Used by:** every engine

- `load_session_data(data_dir, session_key)` (line 45) loads one session's JSON
  datasets (`drivers`, `positions`, `intervals`, `timing_base`, `race_control`,
  optional `locations`, pit/stint/result files) and builds the precomputed
  `StateIndex` once. Results are cached in-process (`cache_info`, line 108;
  `clear_cache`, line 126) — this is the Build 18 fix that made warm `/state`
  ~65× faster.
- `load_dataset(data_dir, session_key, name)` (line 113) is the single loader
  every feature engine uses for one dataset file.
- Datasets live under `backend/data/<session_key>/` (committed, small, verified);
  raw API responses under `backend/cache/` (gitignored).

## 2. State reconstruction — `GET /api/session/{key}/state?t=SECONDS`

**Code:** `backend/app/state.py` · **Contract:** `StateAtTime` (`contracts.py:103`)

Reconstructs the full timing tower, flag state, and car markers at any time `t`:

- `StateIndex` (line 32) / `build_index` (line 55) pre-converts every timestamp
  to floats once, so per-request work is `bisect` lookups only.
- `build_state_at(t, …, index=None)` (line 210):
  - **Current lap** = highest lap started at or before `t` across drivers; each
    driver's most recent started lap supplies compound + tyre age.
  - **Timing rows** = last position sample at or before `t` per driver, sorted by
    position. Gap/interval come from the last interval sample within
    `INTERVAL_MAX_STALE_SECONDS = 30.0`; older samples report `stale_seconds`
    instead of pretending to be fresh.
  - **Flag state** = `_flag_state` (line 184) scans precomputed race-control
    events up to `t` (RED / VSC / SC booleans). The known substring trap —
    `"CHEQUERED FLAG"` contains `"RED FLAG"` — is explicitly excluded (Build 21 fix).
  - **Car markers** = per-driver location samples when present. `marker_mode` is
    `REPLAY` whenever location coverage exists (Build 9558/9090 flagships),
    otherwise `UNAVAILABLE` — never a guessed dot.
  - Response always carries `data_mode="REPLAY"` and
    `marker_mode` `REPLAY`/`UNAVAILABLE` (state.py:315–316), overriding the
    contract's defensive default of `"ESTIMATE"` (`contracts.py:112`).
- `load_and_build_state` (line 320) is the endpoint glue (store + index + build).

## 3. Race Intelligence — `GET /api/session/{key}/intelligence`

**Code:** `backend/app/intelligence.py` · **Contract:** `RaceIntelligence` (`contracts.py:215`)

Module docstring: *"pure transformation of cached OpenF1/Jolpica data — provenance
always REPLAY."* Reads `pit.json`, `overtakes.json`, `grid.json`,
`session_result.json`, `race_control`, `positions`.

| Helper | Line | Produces |
|--------|------|----------|
| `detect_flag_periods` | 32 | SC/VSC/RED periods as `{kind, start, end}` pairs — starts from flag events, clears from their clear messages, open periods closed at the chequered flag |
| `pit_aggregates` | 95 | total stops, per-stop-count histogram, per-driver pit lists |
| `overtake_leaders` | 121 | overtakes **made** vs **suffered** per driver (top lists for the module) |
| `position_movers` | 146 | grid → finish positions gained/lost per driver |
| `count_lead_changes` | 169 | lead-driver change count along the positions timeline |
| `build_intelligence` | 189 | assembles `RaceIntelligence {flag_periods, total_pit_stops, pit_aggregates, overtakes_total, top_overtakers, most_overtaken, position_movers, lead_changes}` |

## 4. Strategy Lab — `GET /api/session/{key}/strategy`

**Code:** `backend/app/strategy.py:11` `build_strategy` · **Contract:** `StrategyLab` (`contracts.py:249`)

- Stints from `stints.json`: each stint is `{driver, compound, lap_start,
  lap_end, length = lap_end − lap_start + 1}`.
- Stop rows from `pit.json` (lap, driver, tyre change).
- Emits per-driver stint timelines, `stop_histogram` (most common stop counts),
  and compound usage. There is **no undercut model** — we show what happened,
  not what would have happened.

## 5. Driver Lab — `GET /api/session/{key}/driver-lab`

**Code:** `backend/app/driver_lab.py:11` `build_driver_lab` · **Contract:** `DriverLab`/`DriverLabRow` (`contracts.py:257`)

- Reads `session_result.json`, `grid.json`, `pit.json`, `timing_base`.
- `best_lap_ms` / `avg_lap_ms` computed over race laps **excluding pit-out laps**
  (`is_pit_out_lap`), stored as integer milliseconds.
- One row per driver: grid, finish, delta, best/avg lap, pit count, points,
  laps, DNF flag, compound — the raw material for the module's pace cards and
  for the Prediction Arena.

## 6. Constructor Lab — `GET /api/session/{key}/constructor-lab`

**Code:** `backend/app/driver_lab.py:74` `build_constructor_lab` · **Contract:** `ConstructorLab` (`contracts.py:291`)

- Groups Driver Lab rows by team: combined points, best/avg finish across both
  drivers, positions gained, team colour + driver numbers.
- A single-session constructor view — no season championship maths beyond this
  session's results.

## 7. Battle Lab telemetry — `GET /api/session/{key}/telemetry?drivers=n1,n2&lap=best|N`

**Code:** `backend/app/main.py:257` · **Contracts:** `TelemetryLap`/`TelemetryDriver`/`TelemetryCompare` (`contracts.py:115–131`)

- Serves distance-binned `telemetry.json` (ingested per-driver `car_data`,
  ADR-011 unit fix): speed / throttle / brake arrays plus sectors and
  `is_pit_out_lap` per lap, `lap_selector` echoed (`best` or lap number).
- Frontend drives everything else (shared distance axis, Δt charts, sector-delta
  table) — the API only reports cached numbers.
- **Honest 404:** a driver with no `car_data` (e.g. Gasly #10 on the flagship)
  returns 404; the UI says so instead of faking a trace.
- Flagships with full telemetry: session **9558** (2024 British GP) and
  **9090** (2023 Monaco Q). Bulk 2023–2025 sessions are core-only, so Battle
  Lab correctly reports `UNAVAILABLE` there.

## 8. Prediction Arena — `GET /api/session/{key}/prediction`

**Code:** `backend/app/prediction.py` · **Contract:** `PredictionArena` (`contracts.py:305`)

Honesty constraints from the module docstring (lines 1–13):

- FREE and non-monetary: no betting, no odds, no stakes.
- **Transparent deterministic model, not a black-box "AI."** Method string ships
  in the payload: `"pace-order (avg race lap) vs grid-order baseline"`.
- `data_mode` is always `SIMULATION` — never `LIVE`, never presented as a
  forecast of an unrun race.
- A *calibrated* probabilistic predictor (Brier/log-loss/calibration curves)
  needs temporal validation across many races; that limitation is documented in
  `_NOTE` (line 22) rather than faked with a wrapper.

Mechanics (`build_prediction`, line 31): drop DNF/unfinished rows from Driver
Lab, predict finishing order by average race pace (fastest first), score against
the grid-order baseline with mean absolute error; `accuracy_vs_baseline` reports
`baseline_mae`, `model_mae`, and `improvement`.

## 9. Diagnostics — `GET /api/diagnostics`

**Code:** `backend/app/main.py:227` · **Contract:** `Diagnostics` (`contracts.py:316`)

Per-session dataset inventory (which JSON files exist, row counts, cache state)
so data-mode badges and `UNAVAILABLE` states can be explained rather than
silently blank.

---

## Endpoints at a glance

| Endpoint | Engine |
|----------|--------|
| `GET /api/health` | liveness |
| `GET /api/sessions`, `/api/seasons`, `/api/seasons/{year}/events` | catalog |
| `GET /api/session/{k}/drivers` | driver list + team colours |
| `GET /api/session/{k}/state?t=` | §2 state reconstruction |
| `GET /api/session/{k}/race-control`, `/weather` | raw cached feeds |
| `GET /api/session/{k}/intelligence` | §3 |
| `GET /api/session/{k}/strategy` | §4 |
| `GET /api/session/{k}/driver-lab` | §5 |
| `GET /api/session/{k}/constructor-lab` | §6 |
| `GET /api/session/{k}/telemetry` | §7 |
| `GET /api/session/{k}/prediction` | §8 |
| `GET /api/session/{k}/circuit` | circuit path + pit-loss constants |
| `GET /api/diagnostics` | §9 |

(Line references: `backend/app/main.py` — health 63, sessions 68, seasons 111,
events 119, drivers 148, state 154, race-control 165, weather 171, intelligence
180, strategy 191, driver-lab 200, constructor-lab 209, prediction 218,
diagnostics 227, circuit 251, telemetry 257.)

## The rules every engine follows

1. **`REPLAY` provenance** for anything computed from cached pulls; `LIVE` never
   appears without an actual live feed.
2. **No invented gaps, lap times, or telemetry.** Missing data → `UNAVAILABLE`
   (or an honest 404), never a fabricated series.
3. **Stale is flagged, not hidden** — interval samples older than 30 s carry
   `stale_seconds`.
4. **Simulation is labelled `SIMULATION`** and ships its method + note in-band.
5. **Every number is traceable** to a cached API response or a deterministic
   transformation of one.
