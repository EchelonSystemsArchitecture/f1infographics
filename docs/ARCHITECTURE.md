# Architecture — GRIDTRACE

## Overview

```
┌─────────────────────────────────────────────────────────┐
│ frontend (React + TS + Vite)                            │
│  ┌─────────────── shared race clock (zustand/store) ──┐ │
│  │ leaderboard  track map  RC board  battle lab       │ │
│  │ catalog picker (seasons → events)                  │ │
│  └──────────────────────▲─────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────┘
                          │ REST JSON (session-scoped, cached)
┌─────────────────────────┼───────────────────────────────┐
│ backend (FastAPI)       ▼                               │
│  API layer (Pydantic contracts)                         │
│  ├─ /api/seasons, /api/seasons/{y}/events, …/capabilities│
│  ├─ /api/sessions (ingested only)                       │
│  ├─ /api/session/{key}/state?t=<seconds>  ← clock math │
│  ├─ /api/session/{key}/intelligence  ← derived analytics│
│  ├─ /api/session/{key}/race-control / drivers / circuit │
│  └─ /api/session/{key}/telemetry?drivers=&lap= (Battle) │
│  ── services ──                                          │
│  session_store (in-memory, pre-indexed StateIndex) ADR-014│
│  catalog (Jolpica calendar + ingest match + capabilities)│
│  intelligence (deterministic flag/pit/overtake/movement)  │
│  providers/jolpica (cached, rate-limit-aware client)      │
│  Normalized datasets: backend/data/*.json (verified)    │
│  Raw cache:        backend/cache/ (gitignored)          │
│  Ingestion: backend/app/ingest/*.py (OpenF1 → normalize)│
└─────────────────────────────────────────────────────────┘
```

## Shared race clock (core rule)

- The backend owns the canonical session timeline: `t=0` at race start (green flag / `date_start`), monotonic seconds.
- `/state?t=` returns the full visual state at that instant: positions, intervals, current lap, active flags, tyre stints, car markers (x,y) after projection.
- Frontend has **one** clock store (play state, current t, speed). Every component subscribes; no component keeps its own timer.
- Car marker positions between location samples are linearly interpolated → labeled `ESTIMATE` in UI where shown; gaps/positions at t come from change-point reconstruction (exact between changes).

## Data pipeline

1. **Fetch** (once per session): OpenF1 endpoints per driver for `car_data`/`location`/`intervals` (full-session queries 422/timeout — see provenance doc); session-level for the rest. MultiViewer corners for the circuit.
2. **Raw cache**: `backend/cache/openf1/{session_key}/{endpoint}_{params}.json` — byte-faithful, gitignored.
3. **Normalize**: pandas → flat tables → stable JSON contracts (`backend/data/9558/...json`), committed only when small + checksummed in build log.
4. **Derived at ingest, not per-request**: track polyline from fastest lap location samples; per-driver track-distance mapping; race-control index by t.

## State reconstruction semantics

- **Position at t**: `position` endpoint rows are change points; between them the order is constant (exact).
- **Interval/gap at t**: `intervals` rows per driver; forward-fill to t (exact between changes; staleness flagged if last sample > N seconds old → UI shows last-known with age).
- **Lap at t**: from `laps.date_start` forward-fill (null durations excluded).
- **Flags/RC**: events with dates → active between event and next related event (VSC, SC, red flag windows modeled explicitly).

## Session store + pre-indexing (ADR-014)

`/state` used to re-open + re-parse ~3.8 MB of JSON (locations 3.1 MB, intervals
538 KB, timing 140 KB) and rebuild per-driver timestamp arrays **per request**
(~130–155 ms warm). Now:

- `session_store.load_session_data` parses each session's JSON **once** and
  caches a precomputed `StateIndex` (float timestamps, per-driver sorted times,
  lap start-times, sorted flag events) in a bounded (8-session) thread-safe cache.
- `build_state_at(t, …, index)` uses the precomputed index → ~0.445 ms/call.
  Without an `index` (unit tests) it builds one on the fly, so the pure and
  cached paths share **one** reconstruction implementation.
- End-to-end `/state` is now ~1.5–4 ms warm (~65× faster). Cold load is a
  one-time ~320 ms per session.

## Catalog + capability detection (ADR-015)

- `providers/jolpica.py` — pure season/event parsers + a cached, rate-limit-aware
  client (429 backoff). Full historical calendar back to 1950.
- `catalog.py` — merges Jolpica events with local ingest status (matches on
  season + circuit short-name) and computes a per-channel `CapabilityState` map:
  provider-coverage thresholds when not ingested, disk presence when ingested.
- The single-session lock is gone: any ingested session is servable; non-ingested
  keys return `404 "not ingested"`.
- Live never reports `LIVE` for a past session: `REQUIRES_AUTH` (paid OpenF1
  real-time) or `NOT_SUPPORTED` (window closed).

## Race Intelligence (Build 21)

`intelligence.py` derives analytics deterministically from ingested data (always
`REPLAY`): flag periods (SC/VSC/RED), pit-stop aggregates, overtake leaders,
grid→finish position movement, lead changes. Served at
`/api/session/{k}/intelligence`.

## Performance budget

- Race Control + leaderboard payloads: < 200 KB initial.
- Track map: ~20 drivers × 1–2 Hz downsampled markers ≈ small WS-free poll or clock-tick pure client compute from a downsampled marker table (≤ 1 MB).
- Battle Lab: precompute distance-binned traces at ingest (~10 m bins, all laps) → one JSON per lap-pair slice, lazy-loaded + cached client-side.

## Tech choices

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 + TypeScript + Vite | mandate; fast dev |
| State | zustand (or React context if tiny) | one clock store, minimal ceremony |
| Charts/maps | Custom SVG + canvas | full control of the pitwall aesthetic; no heavy chart lib |
| Icons | lucide-react | consistent, tree-shakeable |
| Fonts | Geist + IBM Plex Mono (self-hosted OFL) | tabular numerals mandate |
| Backend | FastAPI + Pydantic v2 | contracts-first, auto OpenAPI |
| Data | pandas + numpy | ingestion alignment/binning |
| Cache | httpx + disk JSON | simple, inspectable |
| Tests | pytest + Vitest + Playwright | mandated trio |
