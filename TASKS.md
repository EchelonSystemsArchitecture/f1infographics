# TASKS — GRIDTRACE build graph

Order matters. P0 is the critical path; do not start a P1 task until its P0 parents are verified done.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done (linked to Build Log entry)

## P0 — critical path (must ship for a credible demo)

- [x] **G0.1** Audit workspace + tooling (Node 26, Python 3.14, uv, git SSH) — Build 0
- [x] **G0.2** Data-source verification: OpenF1 session coverage for flagship race; Jolpica; MultiViewer circuit — Build 0
- [x] **G0.3** Repo init: `ashwinwork` branch, SSH remote, docs skeleton — Build 0
- [x] **G1.1** Design tokens + Digital Pitwall theme — Build 3: full `--gt-*` palette in tokens.css, self-hosted Inter/IBM Plex Mono, no raw hex in components
- [~] **G1.2** Data contracts (Pydantic models) — *core models done (Build 1): Driver, SessionInfo, TimingRow, RaceControlEvent, CarMarker, StateAtTime; lap/position/interval/stint/pit/telemetry models pending*
- [x] **G1.3** Ingestion pipeline: OpenF1 → raw cache → normalized JSON (flagship: Silverstone 2024, session_key 9558) — Build 2
- [x] **G1.4** Shared race clock module — frontend zustand store + 3 tests (Build 1); backend state@t reconstruction + 12 QA tests (Build 2); single rAF ClockDriver wired (Build 3)
- [x] **G1.5** Race Control board (flag events, timeline scrubber, driver highlights) — Build 3: real 110 events, lap badges, flag colors, eventSeconds→clock
- [x] **G1.6** Live-style leaderboard / timing tower (position + gap at t, driven by clock) — Build 3: 20 drivers, team colours, interval/gap, tyre compound+age, P1 highlight
- [x] **G1.7** Track map with moving cars (location data, downsampled) — Build 5: per-driver location ingest (20 × 33,896 rows) → normalized `locations.json` (2 Hz, ~7710 samples/driver) + closed Silverstone polyline with MV corners; `GET /circuit` + `markers` on state@t (lerp ≤2 s, stale hold ≤5 s, lead tolerance 2 s); TrackMap SVG (rotation +84.25°, flip-y, IoU 0.757) wired into Race Control with `marker_mode` honesty badge; 22 backend tests green
- [x] **G1.8** Replay controls (play/pause/seek, speed) — Build 3: play/pause, 0.5×–4×, lap scrubber 1..52, absolute time readout, single rAF loop
- [x] **G1.9** Backend API surface + tests (pytest) — Build 2: /health, /sessions, /drivers, /state?t=, /race-control all serve real 9558 data; 12 data-QA tests green — Build 5: + `GET /session/{key}/circuit` and `markers`/`marker_mode` on state, 22 tests green
- [~] **G1.10** Frontend unit tests (Vitest) + happy-path E2E (Playwright) — *Vitest 3/3 green (Build 1–2); Playwright pending*
- [x] **G1.11** Public deployment — Build 4: live at **https://gridtrace.vercel.app** (Vercel FastAPI lambda + SPA CDN, ADR-008); Hotfix 5.1: production `/app` deep-link 404 fixed via SPA fallback rewrite (ADR-010)

## P1 — depth (after P0 demo works)

- [x] **G2.1** Battle Lab: distance-aligned telemetry compare (2 drivers, speed/throttle/brake, sector deltas) — Build 6: car_data ingest (20 drivers) → distance-binned `telemetry.json` (ADR-011 decimetre units fix, length 5821.3 m) → `GET /telemetry` (36 pytest green) → Battle Lab route with SVG speed/throttle/brake/Δt charts, sector-delta table, honest 404 branch (12 Vitest green)
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
- [ ] **G3.5** Publish research docs to GitHub Pages (static export of provenance/spec/architecture under `main` site — ADR-006)

## Art-direction resurrection (2026-10-19, master §26 tasks A–H)

Governing docs: `docs/ART_DIRECTION_MASTER.md` → reconciliation `docs/ART_DIRECTION.md` → `docs/UI_UX_SPECIFICATION.md` + `docs/DESIGN_SYSTEM.md`. ADR-012 permits Three.js/R3F for the hero + Circuit Stage only (ADR-005 narrowed for tables/race-control).

- [x] **A** Audit current UI vs CARBON/CHALK/SIGNAL + DEPTH — Build 7 pre-work: code fully on `--gt-*`; flat-SVG hero, 2-region shell, table-style race control, no scene depth = redesign incomplete per §27
- [x] **B** Art-direction docs (reconciliation layer, UI/UX spec, rewritten design system, ADR-012) — commit `50df567`
- [x] **C** 3D assets: procedural non-branded single-seater (`SingleSeater3D.tsx`, three@0.186 / R3F@9.8 / drei@10.7) — Build 7
- [x] **D** Cinematic 3D landing hero (`HeroScene.tsx` lazy chunk, scene tokens, WebGL fallback) — Build 8
- [x] **E** Spatial circuit stage + custom pitwall crosshair + Race Ribbon timeline (UI/UX spec §Circuit Stage, master §9) — Build 9
- [x] **F** 4-region app layout + editorial race-control board + microinteractions (master §10/§11/§20) — Build 10
- [ ] **G** Visual acceptance gate (master §27 — every item)
- [ ] **H** Final report (master §28)

## Verified flagship dataset (Build 0 research)

- **Race:** 2024 British GP — Silverstone — `session_key=9558`, `meeting_key=1240`, `circuit_key=2`
- **Date:** 2024-07-07, 52 laps, Hamilton win (result: P1 #44, 25 pts)
- **Coverage confirmed:** drivers(20), laps(962), position(252), intervals(per-driver ~938), pit(45), stints(65), race_control(110), overtakes(120), session_result(20), team_radio(41), weather(147), car_data/per-driver(~33k), location/per-driver(~33k)
- **Grid:** OpenF1 `starting_grid` 404 for this session — reconstruct from Jolpica qualifying results (session 11 of 2024 season)
- **Circuit geometry:** MultiViewer `/api/v1/circuits/2/2024` → 18 corners + track x/y path + pit loss times
