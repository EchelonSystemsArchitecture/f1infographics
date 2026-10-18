# TASKS — GRIDTRACE build graph

Order matters. P0 is the critical path; do not start a P1 task until its P0 parents are verified done.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done (linked to Build Log entry)

## P0 — critical path (must ship for a credible demo)

- [x] **G0.1** Audit workspace + tooling (Node 26, Python 3.14, uv, git SSH) — Build 0
- [x] **G0.2** Data-source verification: OpenF1 session coverage for flagship race; Jolpica; MultiViewer circuit — Build 0
- [x] **G0.3** Repo init: `ashwinwork` branch, SSH remote, docs skeleton — Build 0
- [~] **G1.1** Design tokens + Digital Pitwall theme — *tokens.css done (Build 1); self-hosted fonts + base components pending*
- [~] **G1.2** Data contracts (Pydantic models) — *core models done (Build 1): Driver, SessionInfo, TimingRow, RaceControlEvent, CarMarker, StateAtTime; lap/position/interval/stint/pit/telemetry models pending*
- [ ] **G1.3** Ingestion pipeline: OpenF1 → raw cache → normalized JSON (flagship: Silverstone 2024, session_key 9558)
- [~] **G1.4** Shared race clock module — *frontend zustand store done (Build 1, 3 tests); backend-derived session timeline pending*
- [ ] **G1.5** Race Control board (flag events, timeline scrubber, driver highlights)
- [ ] **G1.6** Live-style leaderboard / timing tower (position + gap at t, driven by clock)
- [ ] **G1.7** Track map with moving cars (location data, downsampled)
- [ ] **G1.8** Replay controls (play/pause/seek, speed)
- [~] **G1.9** Backend API surface + tests (pytest) — *skeleton + contract tests done (Build 1): /health, /sessions, /state, /race-control (503 until ingest); real data wiring pending*
- [~] **G1.10** Frontend unit tests (Vitest) + happy-path E2E (Playwright) — *Vitest harness + 3 clock tests running (Build 1); Playwright pending*

## P1 — depth (after P0 demo works)

- [ ] **G2.1** Battle Lab: distance-aligned telemetry compare (2 drivers, speed/throttle/brake, sector deltas)
- [ ] **G2.2** Stint / tyre strategy view (compound timeline, pit windows)
- [ ] **G2.3** Overtake + interval story beats (auto-highlight from intervals + overtakes endpoints)
- [ ] **G2.4** Multi-session browser (qualifying + race from same meeting)
- [ ] **G2.5** Weather overlay (track temp, rainfall history)
- [ ] **G2.6** Team radio player (recording_url from OpenF1, with attribution)

## P2 — polish

- [ ] **G3.1** Screenshot gallery + README polish
- [ ] **G3.2** Performance pass (telemetry downsample, virtualized tables)
- [ ] **G3.3** Accessibility pass (contrast, keyboard, reduced-motion)
- [ ] **G3.4** Docs cross-link audit + contributor onboarding walkthrough

## Verified flagship dataset (Build 0 research)

- **Race:** 2024 British GP — Silverstone — `session_key=9558`, `meeting_key=1240`, `circuit_key=2`
- **Date:** 2024-07-07, 52 laps, Hamilton win (result: P1 #44, 25 pts)
- **Coverage confirmed:** drivers(20), laps(962), position(252), intervals(per-driver ~938), pit(45), stints(65), race_control(110), overtakes(120), session_result(20), team_radio(41), weather(147), car_data/per-driver(~33k), location/per-driver(~33k)
- **Grid:** OpenF1 `starting_grid` 404 for this session — reconstruct from Jolpica qualifying results (session 11 of 2024 season)
- **Circuit geometry:** MultiViewer `/api/v1/circuits/2/2024` → 18 corners + track x/y path + pit loss times
