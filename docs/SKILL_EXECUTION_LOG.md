# GRIDTRACE — Skill Execution Log (Task Group A + F/E)

Per the master functional overhaul directive §2. Only skills that were **actually
loaded and applied** are logged, with the concrete decisions they drove. Design
skills were **mapped, not executed** (visual redesign is out of scope — Vairaj
owns UI). Skills are referenced by their real paths:
`~/.agents/skills/<name>/SKILL.md` (auto-loaded via the `skill` tool) unless
noted as path-loaded.

## Applied this session

### repo-forensics — `~/.agents/skills/repo-forensics/SKILL.md`
- **Purpose:** Establish a truthful baseline before changing anything.
- **Instructions followed:** assess → plan → execute → verify; never invent state
  or metrics; scrub for secrets; report what actually exists vs. what's claimed.
- **Concrete decisions:** Inspected every backend/frontend file that touches the
  clock, API, ingest, and routing; measured `/state` latency live (130–155 ms
  warm) rather than assuming; enumerated the 7 disabled nav modules; confirmed
  36 backend tests as the pre-change gate.
- **Output:** `docs/REPOSITORY_AUDIT.md`.
- **Verification:** Every audit claim is backed by a file read, a running process,
  or an HTTP measurement.

### research — `~/.agents/skills/research/SKILL.md`
- **Purpose:** Verify data-source contracts before building adapters.
- **Instructions followed:** separate evidence from inference; cite the primary
  source; don't build on assumed API shapes.
- **Concrete decisions:** Fetched live Jolpica responses to confirm
  `RaceTable.Races` (not `Race`), 77 seasons back to 1950, 24 races for 2024,
  and rate-limit behavior. Confirmed OpenF1 real-time is **paid** → live
  coverage must report `REQUIRES_AUTH`, never `LIVE`. Recorded that detailed
  timing/telemetry/locations are FastF1 (2018+) / OpenF1 (2023+), not Jolpica.
- **Output:** coverage thresholds encoded in `app/catalog.py`
  (`_TIMING_MIN_YEAR=2018`, `_LOCATIONS_MIN_YEAR=2023`, …); provenance noted in
  `docs/REPOSITORY_AUDIT.md`.
- **Verification:** Adapter built against the confirmed contract; parsers
  unit-tested against fixture payloads.

### algorithm-selection + performance-engineering — `~/.agents/skills/algorithm-selection/SKILL.md`, `~/.agents/skills/performance-engineering/SKILL.md`
- **Purpose:** Fix the replay lag with a measured, correct optimization.
- **Instructions followed:** measure before optimizing; prefer the cheapest fix
  that removes the dominant cost; keep one source of truth; don't trade
  correctness for speed.
- **Concrete decisions:** Diagnosed the dominant cost as **per-request JSON
  parse** (3.8 MB) plus per-request `datetime.fromisoformat` of ~1200 laps + all
  RC events, *not* the clock formula (which was already correct). Chose
  **in-memory parse-once + precomputed float index** over (a) client-only
  throttling (wouldn't help the server) and (b) rewriting the reconstruction
  logic (would risk correctness). Kept `build_state_at`'s pure signature and made
  the index an *optional* param so tests and the cached path share one
  implementation.
- **Output:** `app/session_store.py`, `StateIndex`/`build_index` in `state.py`.
- **Verification:** Equivalence test (index ≡ pure over 6 timestamps on real
  data), parse-once identity test, speed bound test. Measured ~65× end-to-end
  (`/state` 130–155 ms → 1.5–4 ms; pure compute 27 ms → 0.445 ms).

### api-design — `~/.agents/skills/api-design/SKILL.md`
- **Purpose:** Model the catalog + capability surface honestly and consistently.
- **Instructions followed:** explicit contracts; explicit error states; never
  imply availability you can't back with data.
- **Concrete decisions:** Added a `CapabilityState` literal distinct from
  `DataMode` (availability ≠ derivation); per-channel capability matrix with
  provider-coverage thresholds; non-ingested session → `404 "not ingested"`
  (not a blanket 404); live window closed → `NOT_SUPPORTED`, OpenF1 real-time →
  `REQUIRES_AUTH`. Replaced the flagship-only lock with a real ingest check.
- **Output:** `contracts.py` catalog models; `catalog.py`; `main.py` endpoints.
- **Verification:** 6 catalog tests (parsers, ingest match, capabilities with
  `fetch_events` monkeypatched); live curl of all three new endpoints.

### testing-strategy — `~/.agents/skills/testing-strategy/SKILL.md`
- **Purpose:** Guard the lag fix and catalog with meaningful tests.
- **Instructions followed:** test domain invariants (index ≡ pure), boundaries
  (parse-once, pre-2023 no-locations, past-race LIVE=NOT_SUPPORTED), and keep
  the suite deterministic (no network).
- **Concrete decisions:** Equivalence + parse-once + speed-bound for the store;
  fixture-based parsers; monkeypatched `jolpica.fetch_events` so capability tests
  never hit the network.
- **Output:** `test_session_store.py`, `test_catalog.py`.
- **Verification:** 36 → 45 backend tests, all passing.

### scope-control — `~/.agents/skills/scope-control/SKILL.md`
- **Purpose:** Keep the frontend work functional-only (no visual redesign).
- **Instructions followed:** protect shared work; don't touch styling owned by
  another workstream; document deferred design work instead of executing it.
- **Concrete decisions:** SessionPicker changes reused existing `picker__*`
  classes + tokens; added only two minimal token-based rules (season select,
  disabled state) required by the new control. Deferred all design skills
  (impeccable, taste-skill, ui-ux-*, design-system, creative-web, frontend-
  polish, visual-qa, motion-design, elk-*, 3d-web) → mapped in `UI_HANDOFF`.
- **Verification:** oxlint back to the single pre-existing warning; no palette,
  type, layout, or token changes.

### documentation — `~/.agents/skills/documentation/SKILL.md`
- **Purpose:** Keep the docs-first contract (AGENTS.md) honest and current.
- **Instructions followed:** document as you go; every claim traceable.
- **Output:** `docs/REPOSITORY_AUDIT.md`; BUILD_LOG entries for Builds 18–20;
  this log; `docs/DECISIONS.md` update.

## Mapped, not executed (deferred — visual redesign out of scope)
impeccable, taste-skill, ui-ux-pro-max, ui-ux-engineering, design-system,
creative-web, frontend-polish, visual-qa, motion-design, elk-animate,
elk-animation-performance, elk-find-animation-opportunities,
elk-improve-animations, elk-review-animations, 3d-web → recommended execution
sequence lives in `docs/UI_HANDOFF.md` §23.I for Vairaj's workstream.
