# Product spec — GRIDTRACE

**Tagline:** Every gap tells a story.

## Problem

Race replays show *what* happened; they rarely show *why*. Fans and analysts want to see how gaps opened, where tyres fell off, how a pit window changed the fight — without a broadcast production team.

## Solution

A dark "digital pitwall" web app that replays a historical race with broadcast-grade instrumentation:

1. **Race Control** — every flag, VSC, pit, and steward message on one scrubbed timeline. Click an event → the clock jumps there.
2. **Timing tower** — live-style leaderboard at any moment t: position, interval, tyre, last lap. All derived from cached OpenF1 data.
3. **Track map** — cars moving around the real circuit path at time t (downsampled location samples; interpolation marked).
4. **Replay controls** — one shared race clock drives every visualization. Play/pause/seek/1×–8×.
5. **Battle Lab** (P1) — pick two drivers, compare distance-aligned telemetry (speed/throttle/brake) lap by lap with sector deltas.

## Users

- Motorsport fans rewatching a favourite race
- Amateur analysts explaining a race to others (streaming/screenshotting views)
- Interviewers/portfolio viewers: the app itself is the artifact showing engineering depth

## Non-goals (v1)

- Live timing (paid OpenF1 tier — out of scope; we label `LIVE` only if we ever add it)
- Sim racing / iRacing
- Historical coverage before 2023 (OpenF1 starts there; Jolpica fills standings gaps only)
- Mobile-first layout (responsive enough to not break, but desktop is the design target)

## Data modes (UI contract)

| Badge | Meaning |
|-------|---------|
| `REPLAY` | Historical source data (OpenF1/Jolpica/MultiViewer), exact values |
| `ESTIMATE` | Deterministic transform with documented assumptions (e.g. downsampled marker positions between samples) |
| `SIMULATION` | What-if / derived scenarios, never presented as fact |
| `UNAVAILABLE` | Source had no data — we show a gap, not a guess |
| `LIVE` | Reserved; absent until a real live feed exists |

## Flagship race

**2024 British Grand Prix (Silverstone), `session_key=9558`** — Hamilton's home win, rain-affected opening, multiple strategy strands. Full endpoint coverage verified in Build 0.

## Success criteria (v1)

- Open app → flagship race loads from local verified cache with zero API keys
- Scrub the timeline: leaderboard, track map, and RC board all agree at any t
- Battle Lab compares any two drivers' clean laps distance-aligned
- Every number traceable to a cached response; tests green; screenshots in README
