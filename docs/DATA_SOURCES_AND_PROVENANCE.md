# Data sources & provenance — research log

Every claim below was tested live (HTTP 200/actual payload) on **2026-10-18** unless noted. 404 on OpenF1 means "no rows match the filter", not auth failure.

## 1. OpenF1 — https://api.openf1.org/v1

Free historical timing API (2023+), no key. Real-time tier is paid (we don't use it).

### Flagship session (verified)

| Field | Value |
|-------|-------|
| session_key | **9558** |
| meeting_key | 1240 |
| session_name/type | Race / Race |
| circuit_key / short_name | 2 / Silverstone |
| country_name | United Kingdom (note: filter value "Great Britain"/"British GP" → 404; correct value is **"United Kingdom"**) |
| date_start / end | 2024-07-07T14:00Z / 16:00Z (gmt_offset +01:00) |
| year | 2024 |

Session list: `GET /sessions?year=2024&session_type=Race` → 30 races, all keys.

### Endpoint coverage for session_key=9558 (Build 0 verification)

| Endpoint | Query shape | Rows | Fields (verified) |
|----------|-------------|------|-------------------|
| `drivers` | session_key | 20 | driver_number, full_name, name_acronym, team_name, team_colour, broadcast_name, country_code, first/last_name, headshot_url |
| `laps` | session_key | 962 | lap_number, date_start, lap_duration, duration_sector_1/2/3, i1_speed, i2_speed, st_speed, is_pit_out_lap, segments_sector_1/2/3 (array; 2064=green, null=unknown, other codes for purple/ yellow — decode in ingest) |
| `position` | session_key | 252 | date, driver_number, position (change points) |
| `intervals` | **session_key + driver_number** | ~938/driver | date, gap_to_leader, interval. ⚠️ full-session query **timed out**; per-driver required |
| `car_data` | **session_key + driver_number** | ~33k/driver | date, speed, throttle (0–100), brake (0/100), n_gear, rpm, drs. ⚠️ session-only query → **422**; per-driver required |
| `location` | **session_key + driver_number** | ~33k/driver | date, x, y, z (F1 game coords; pre-race samples are 0,0) ⚠️ same 422 rule |
| `pit` | session_key | 45 | date, lap_number, stop_duration, lane_duration |
| `stints` | session_key | 65 | stint_number, compound (MEDIUM etc.), lap_start/end, tyre_age_at_start |
| `race_control` | session_key | 110 | date, lap_number, message, flag, category, scope, sector, qualifying_phase, driver_number |
| `overtakes` | session_key | 120 | date, overtaking/overtaken_driver_number, position |
| `session_result` | session_key | 20 | position, driver_number, points, duration, gap_to_leader, number_of_laps, dnf/dns/dsq |
| `team_radio` | session_key | 41 | date, driver_number, recording_url (livetiming.formula1.com mp3) |
| `weather` | session_key | 147 | date, air/track temp, humidity, pressure, rainfall, wind_speed/direction |
| `starting_grid` | anything | **404** | Not available for this session → grid comes from Jolpica qualifying |
| `qualifying` / `grid` alt names | — | **404** | don't exist |

Other quirks:
- `?country_name=Great Britain|British GP|Britain` → 404 (filter match failure, not auth).
- `intervals?...&gap_to_leader=1` → 404 "No results found" (param is not a toggle in v1 docs sense; per-driver rows already include both `interval` and `gap_to_leader`).
- Rate behavior: requests are fine sequentially with 40–60s timeouts on big per-driver pulls; session-level < 10s.

Endpoints documented by OpenF1 but **not re-tested for 9558**: championship standings (beta). `sessions`, `meetings` verified earlier (2024 race list).

## 2. Jolpica (Ergast-compatible) — https://api.jolpi.ca/ergast/f1

Mirror of Ergast. **Requires explicit `.json` suffix**; bare path → 301 redirect, and some paths (`/race.json` w/o filters) → `400 {"detail":"Bad Request: Endpoint does not support final filter."}`.

Verified 200s:
- `https://api.jolpi.ca/ergast/f1/2024/driverstandings.json` → 10,478 bytes (standings)
- `https://api.jolpi.ca/ergast/f1/2024.json` → 14,944 bytes (season race list)

Planned use: **starting grid** for 2024 British GP = qualifying results (`/2024/11/qualifying.json` — round number to confirm from season list at ingest), plus championship context (standings view, P1).

## 3. MultiViewer — https://api.multiviewer.app/api/v1

Circuit metadata (corner numbers, x/y track path, pit loss). Verified:

- `GET /circuits/2/2024` → **Silverstone, 18 corners** (circuit_key matches OpenF1's 2)
- `GET /circuits/7/2024` → **Spa-Francorchamps, 19 corners** (initial probe used wrong key; 7≠Silverstone)
- Response keys: candidateLap, circuitKey/Name, corners[{number, angle, length, trackPosition{x,y}}], marshalSectors, miniSectorsIndexes, pitLoss{normal,sc,vsc}, x, y, rotation, meeting metadata
- Silverstone pitLoss: normal 19.07s, SC 12.08s, VSC 13.80s

Use: static corner markers + pit-lane loss constants + track outline cross-check vs OpenF1 location polyline.

## 4. Flagship dataset summary

**2024 British GP Race, Silverstone, session_key=9558** — Hamilton home win (session_result: P1 #44, 52 laps, 4947.059s, 25 pts). Chosen for: drama (rain/switchback strategy), full endpoint coverage, iconic circuit.

Data volume estimate (for cache design): 20 drivers × ~33k rows car_data + location ≈ 1.3M raw rows total; normalize → distance-binned Battle Lab traces (~1 pt/10 m ≈ 5.9 km × 52 laps × 20 drivers ≈ 600k points) stored precomputed; raw location kept downsampled to 1–2 Hz for markers.

## 5. Research log

| Date | What | Result |
|------|------|--------|
| 2026-10-18 | Workspace/tooling audit | Node 26.3.1, npm 12, Python 3.14.6, uv present, pip standalone **timed out** on PyPI → uv retry succeeded |
| 2026-10-18 | OpenF1 session list 2024 races | 30 rows; Silverstone race = 9558 |
| 2026-10-18 | OpenF1 endpoint sweep @9558 | See table; car_data/location/intervals **per-driver only**; starting_grid 404 |
| 2026-10-18 | Jolpica season + standings | Works with `.json` suffix |
| 2026-10-18 | MultiViewer circuits | circuit_key 2 = Silverstone (18 corners); **7 = Spa — corrected** |
| 2026-10-18 | Backend env | uv venv + fastapi 0.146.0, pandas 3.0.6, numpy 2.5.4, pydantic 2.14.1, httpx, pytest OK |
| 2026-10-19 | Build 2 ingest run | 15 raw files fetched for 9558 in ~16s (session-level); normalized to `backend/data/` |
| 2026-10-19 | Real driver numbers @9558 | `{1,2,3,4,10,11,14,16,18,20,22,23,24,27,31,44,55,63,77,81}` — **not** 1..20; driver 10 = Gasly (`dns`), driver 11 = Pérez |
| 2026-10-19 | Pérez lap-1 null | `laps` for driver 11 lap 1 has `date_start: null, lap_duration: null` — skip in state reconstruction |
| 2026-10-19 | Gasly DNS → intervals | Driver 10 has no interval series → 19 of 20 drivers; documented exception (OpenF1 404-as-empty) |
| 2026-10-19 | Segment codes @9558 | Observed in `laps.segments_sector_*`: 2048 ×19406, 2049 ×3486, null ×656, 2064 ×232, 2051 ×226, 0 ×3 — full decode still TODO |
| 2026-10-19 | No SC/VSC/RED in RC @9558 | Zero race-control messages contain "SAFETY CAR"/"VSC"/"RED FLAG" — `sc`/`vsc`/`red_flag` all false; flag-state heuristic implemented anyway for other sessions |
| 2026-10-19 | Jolpica British GP round | 2024 British GP = **round 12** (not 11) — qualifying path `/2024/12/qualifying.json` |
| 2026-10-19 | MultiViewer pitLoss re-read | Live `GET /circuits/2/2024` returns **normal 20.93, sc 13.26, vsc 15.14** — differs from Build 0 note (19.07/12.08/13.80); **use live values**, discrepancy noted here |
| 2026-10-19 | Build 5 location ingest @9558 | 20 drivers × ~33,896 rows (`x,y,z` @ ~2 Hz) → `backend/cache/9558/location/` (82 MB, gitignored); normalized to `data/9558/locations.json` (3.0 MB, ~7710 samples/driver, t −3300.6..5489.7) |
| 2026-10-19 | OpenF1 ↔ MultiViewer frame check | Bounds differ ~2 m; nearest-path median ~23 m → coordinate spaces effectively aligned; markers plot directly on the MV polyline (no registration transform) |
| 2026-10-19 | Track map orientation sweep | Best IoU **0.7574 @ +84.25° with y-flip** vs reference mask; MV `rotation: 92` alone scores lower — map locked to +84.25°/flip-y (ADR-009) |

## 6. Normalization and repair log (2026-10-26)

A data-QA pass corrected deterministic integrity defects in the committed normalized datasets. No lap time, finishing position, or telemetry sample was invented. Duplicate grid positions were renumbered in stable source order, which removes the ambiguity caused by the duplicate values without changing the relative order of the affected rows.

| Dataset | Sessions | Transformation |
|---|---:|---|
| `sessions.json` / `data/9086` | 1 | Removed cancelled 2023 Imola from the catalog and deleted its empty session directory. Direct requests now return 404. |
| `grid.json` | 14 | Dropped drivers absent from `drivers.json` (9069, 9078, 9165, 9506, 9507, 9590, 9971, 10028, 10033). Renumbered duplicate source positions in stable source order (9523, 9582, 9598, 9912, 9987); no row was reordered relative to its source position. |
| `stints.json` | 19 | Dropped rows with null/non-integer bounds, `lap_start < 1`, or reversed bounds; valid reversed pairs were sorted. 9979's lap-0 rows were removed. |
| `telemetry.json` | 1 | Clamped binned throttle/brake to 0–100 (9558); the source bins exceeded the physical range by up to 4 points. |

`backend/app/ingest/normalize.py` now applies the grid and stint sanitizers on every ingest, and clamps throttle/brake bins, so a re-ingest cannot reintroduce these defects. `build_strategy` also rejects bounds below lap 1 defensively.

The QA suite (`backend/app/tests/test_edge_datasets.py`) asserts entry-list membership, unique grid positions, positive stint bounds, 0–100 telemetry, sorted timestamps, and driver/result consistency for every catalogued session.
