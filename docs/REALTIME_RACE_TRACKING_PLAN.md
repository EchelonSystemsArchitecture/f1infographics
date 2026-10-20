# GRIDTRACE — Real-Time Race Tracking Plan

Research-backed plan for adding live tracking. **Status: research + provider
abstraction plan only — no live mode is shipped, and none will be until an
authorized feed exists.** Data honesty rule: we never show `LIVE` without a real
live feed.

## 1. What the sources actually support (verified)

| Need | OpenF1 | FastF1 | Verdict |
|---|---|---|---|
| Historical sessions | yes (2023+) | yes (2018+ detailed) | covered today (REPLAY) |
| Real-time / live | **paid subscription only** (MQTT / WebSockets) | **no** — post-session recorder (30–120 min after) | live needs paid OpenF1 |

- OpenF1's free tier is **historical**. Its real-time feed is a separate paid
  product. Without credentials we cannot legitimately claim live coverage.
- FastF1 is explicitly a **post-session** recorder — it can never be a live source.
- Therefore: **live mode is gated on obtaining an OpenF1 real-time subscription.**
  Until then every session is `REPLAY`.

## 2. Deployment topology (Vercel) — the hard constraint

GRIDTRACE deploys to Vercel (`vercel --prod`):
- The FastAPI backend runs as a **serverless function** (`backend.app.main:app`,
  `maxDuration: 30s`). Serverless functions are request/response + short-lived;
  they are a poor fit for a **long-lived persistent socket** to an upstream
  broker.
- The frontend is **static** (CDN). No always-on process.

Implications for live:
1. A persistent MQTT/WebSocket bridge to OpenF1 cannot live inside the Vercel
   serverless function (it would freeze between invocations and burn duration).
2. Options, in increasing fidelity:
   - **A. Poll-through (works today on Vercel).** A scheduled/edge function polls
     OpenF1's live REST endpoints on an interval and writes a short rolling cache
     (Redis/Vercel KV or blob). The client reads the cache. Freshness = poll
     interval; not true push. Simplest, serverless-compatible.
   - **B. External bridge (true push).** Run a tiny always-on service (Fly.io /
     Railway / a container) that holds the OpenF1 MQTT/WebSocket connection and
     fans out to clients via a WebSocket/SSE endpoint or a managed realtime
     channel (Pusher/Ably/Supabase Realtime). Vercel serves static + REST; the
     bridge handles the socket. Cleanest true-live path.
   - **C. Self-hosted full stack.** Move off Vercel to a long-running server.
     Largest change; only if live becomes core.

**Recommendation:** build the **provider abstraction + deterministic test
harness** now (§3), ship **Option A (poll-through)** first if/when credentials
exist, and treat **Option B** as the true-live upgrade. Do not block the
historical product on live.

## 3. Provider abstraction + deterministic harness (build this regardless)

Decouple "where data comes from" from "how the UI replays it" so live can be
added without touching visualizations:
- Define a `RaceDataProvider` interface: `get_session_meta`, `get_drivers`,
  `stream_positions(t)`, `get_timing(t)`, etc., returning the **same normalized
  contracts** the UI already consumes (`StateAtTime`, `Driver`, …).
- Two implementations: `ReplayProvider` (today's ingest + `/state`) and
  `LiveProvider` (OpenF1 real-time, behind credentials).
- A `DeterministicHarness` that replays a **recorded** live session through the
  `LiveProvider` interface with a fake clock — so live-mode logic (staleness,
  reconnect, ordering) is unit-testable **without credentials or network**.
- This is the honest way to "add live mode" before we have a live feed: the
  code path exists and is tested; only the credentials are missing.

## 4. Freshness ≠ frame rate; per-channel staleness

- OpenF1 location ≈3.7 Hz; car_data ≈3.7 Hz. Do not imply 60 Hz telemetry.
- Define **per-channel staleness thresholds** (e.g. position >2 s stale → flag
  the row; timing >10 s → show `UNAVAILABLE` for the gap). Expose `stale_seconds`
  (already in `TimingRow`) and a top-level freshness indicator.
- The UI must degrade honestly: a stalled feed shows `UNAVAILABLE`/stale badges,
  never frozen values presented as current.

## 5. Network resilience (failure-recovery)
- Exponential backoff + jitter on reconnect; cap retries; heartbeat/ping to
  detect dead sockets.
- Backpressure: drop-to-latest for position streams (only newest matters);
  never buffer unbounded.
- Reconnect resumes from a sequence/timestamp cursor when the source supports it.
- All failures surface as `UNAVAILABLE` + a reason, never a silent hang.

## 6. What is NOT built yet
- No `LiveProvider`, no poll-through bridge, no credentials, no `LIVE` badge
  anywhere. `LIVE` appears in the `DataMode`/`CapabilityState` enums and reports
  `REQUIRES_AUTH`/`NOT_SUPPORTED` — that's it.
- The provider abstraction + harness above is the next concrete engineering step
  if live is prioritized.

## 7. Decision
Live tracking is **blocked on an external dependency** (a paid OpenF1 real-time
subscription) and a **topology choice** (poll-through vs. external bridge). The
historical replay product is complete and honest without it. Per the overhaul
directive, this is a **documented external blockage**, not an unfinished plan.
