# UI/UX specification — GRIDTRACE

**Status:** derived from `docs/ART_DIRECTION_MASTER.md` §6–§22 (governing) and the
reconstructed DEPTH requirements (see `docs/ART_DIRECTION.md` for provenance).
**Date:** 2026-10-19. Conflicts resolve to the master.

---

## 1. Layout — the four-region app (master §10, §11.5)

Desktop-priority, rebuilt from the Build-6 two-region shell (sidebar + main):

| Region | Contents | Priority |
|--------|----------|----------|
| **1. Navigation rail** | Product mark, primary modules (Race Control, Battle Lab, Race Intelligence, Strategy Lab, Driver Lab, Constructor Lab, Race Vault, Prediction Arena, Settings), data-mode badge, session switcher. | Persistent, compact (~220px). Only currently-usable modules get visual weight; disabled modules stay visibly secondary. |
| **2. Session header** | Circuit + session name, session type, time source (`LIVE` / `REPLAY` / `ESTIMATE` / `SIMULATION` / `UNAVAILABLE`), current lap + clock, shared-race-clock transport (play/pause, speed, lap nav). | Top band. Must distinguish genuine live from replay at a glance (master §11.1). |
| **3. Main workspace** | Module body: position table, telemetry charts, event analysis, etc. Flexible width; owns its own composition (§9 below). | Largest area. |
| **4. Circuit + timing column** | Circuit Stage (prominent, not consuming info space) with adjacent or stacked timing table; Race Ribbon spans the bottom as the persistent timeline. | Signature region; must coexist with readable table + visible telemetry (master §11.5). |

At 1440×900 the essential race context — circuit, top of the position table,
telemetry presence, and the Race Ribbon — must be visible without scrolling.

**Initial state (master §10.2):** no session selected → a deliberate
session-selection screen (recent sessions, coverage counts, availability labels,
one short intro line). Not a marketing landing page: the landing experience lives
at `/`, the app opens at `/app`. With a session → Race Control immediately.

## 2. Circuit Stage (master §9, §11.2; DEPTH reconstruction)

The signature visualization. Built on the ADR-009 projection from `TrackMap.tsx`
(`ROTATION_DEG = 84.25`, `FLIP_Y = true`, bbox-fit with padding) extended into a
scene.

- **Two modes, shared state:** `SPATIAL` (perspective, depth, camera moves) and
  `BLUEPRINT` (flat top-down diagram: path, sector bounds, corner labels,
  measurement ticks). Modes are a toggle, never separate data pipelines — same
  projected coordinates, same selection state, same clock position.
- **Scene contents:** road ribbon with width derived from the projected path,
  kerb indication at corner apexes, sector boundary markers, corner labels
  (from `circuit.json` MV corners), depth markers (distance ticks at intervals),
  car markers interpolated from `location` samples with the existing
  `(interpolated)` honesty labelling, driver trace tails.
- **Camera presets:** `follow` (lead car / selected driver), `overview` (whole
  circuit), `sector` (zoom to active sector). Presets animate along
  non-linear easing; under reduced-motion they cut instantly.
- **No invented elevation.** The circuit is planar — real x/y only. Any vertical
  presence comes from perspective of a flat plane and from car models sitting on
  it, never from fabricated height data. Explicitly forbidden by master §9.
- **Selection language:** clicking a car marker selects that driver (same
  selection object the timing table uses); hovering shows the custom crosshair
  with a context label.
- **Honest empty state:** when location data is unavailable → blueprint mode with
  `CIRCUIT MAP UNAVAILABLE` (existing `TrackMap.tsx` behavior preserved). A scene
  that cannot be grounded in data does not render fake cars.

## 3. Custom crosshair (DEPTH reconstruction)

A measurement reticle replacing the OS cursor over the Circuit Stage canvas only.

- Geometry: four arms (up/down/left/right) + center dot; arm length ~10px, 1px
  stroke, `--gt-signal` at rest, `--gt-text-primary` when armed over a target.
- Center dot never grows into a weapon-like reticle; no muzzle/radial ornament.
- Context label: small mono readout following the cursor inside the canvas —
  shows nearest element (e.g. `TURN 6 · COPSE · 452 m` or `CAR 44 · 287 km/h`),
  or `—` over empty canvas.
- Scoped: pointer events on the stage container only; keyboard users reach every
  crosshair target (car, corner, sector) through Tab + Enter. Crosshair is
  `pointer-events: none` overlay so it never blocks clicks.
- Reduced-motion: no trailing/lag interpolation; crosshair snaps.

## 4. Race Ribbon — persistent timeline (master §12; DEPTH reconstruction)

Bottom-spanning timeline bound to the shared race clock. It is the only timeline
in the app (no duplicated scrubbers).

- **Transport:** play/pause, speed (0.5×/1×/2×/4×), lap stepper, clock readout,
  position scrubber. All state lives in the clock store; ribbon never keeps an
  independent timer (master §12.3).
- **Event markers:** race-control events + overtakes/pit stops as pins on the
  scrubber, colored by category using semantic status tokens, never color alone
  (shape/label accompanies).
- **Expanded mode:** clicking the ribbon expands it upward into a denser lane
  view (lap ticks, sector markers, event pins with labels). Collapsed default
  keeps the main workspace tall.
- **Seek behavior:** any seek (ribbon, event select, lap nav, circuit click)
  resolves one clock snapshot → circuit, table, telemetry, timeline all update
  together (master §12.4).
- **Honest empty state:** a session with no cached events shows the track line +
  lap ticks with `NO EVENTS RECORDED FOR THIS SESSION` — not a fabricated pin
  set.

## 5. Position table (master §11.3)

Columns: position, driver (3-letter + team color chip), interval, gap to leader,
grid, positions gained/lost, last lap, best lap, compound, stint age, pace trend,
status. Rules:

- Missing measurements render `—` (`formatGap` / `formatLapMs` already do this).
- No fabricated values; stale intervals beyond `INTERVAL_MAX_STALE_SECONDS`
  (30.0) show as stale, not as live numbers.
- Driver identity colors: deterministic central mapping (OpenF1 `team_colour`),
  consistent across table, circuit, telemetry legend, compare controls (master
  §4.7).
- Row states: default, hover, selected (mirrors circuit selection), focused
  (keyboard), disabled/unavailable driver (e.g. #10 without telemetry → row
  links to the honest 404 path, not to a fake chart).

## 6. Editorial race-control events (master §11.4)

Event language reads like race control, not chat:

- Observed facts first (`Lap 18 · Car 44 pits · Medium → Hard`), then
  calculation (`+2.4 s stop`), then inference only if traceable, otherwise
  `UNKNOWN`.
- Every event carries a traceable timestamp; selecting it seeks the shared clock
  and updates all linked views.
- Pace changes flagged with stated basis (lap-time delta vs stint baseline).
- Analysis explanations (Race Intelligence) separate **observed / calculated /
  inferred / unknown** and link back to the underlying records; no free-form
  generated prose (master §14.4).

## 7. Data-mode badges & honesty UI (master §4.6, §24)

Reuse existing `.badge` variants; every view labels its mode:

| Mode | Token | Note |
|------|-------|------|
| LIVE | `--gt-live` | only with an actual live feed — never now |
| REPLAY | `--gt-replay` | default for 9558 |
| ESTIMATE | `--gt-estimate` | derived values with stated method |
| SIMULATION | `--gt-simulation` | Strategy Lab / Predictor outputs |
| UNAVAILABLE | `--gt-neutral-status` | honest empty states |

Status color never replaces a text label (master §4.6). The same semantic token
names serve both dark and light themes (master §4.9).

## 8. Component states completeness (master §27 item 12)

Every interactive component ships all six states, visibly distinct:
`default → hover → active → focus-visible → disabled → unavailable`.
Hover color changes alone are insufficient; focus-visible uses the info ring.

## 9. Per-module compositions (master §14–§19, §27 item 16)

Modules must vary their composition; a repeated panel+chart grid fails the gate.

| Module | Composition signature |
|--------|----------------------|
| Race Control | Circuit Stage dominant + editorial event column + ribbon |
| Battle Lab | Split telemetry comparison, aligned by distance; channel selector rail |
| Race Intelligence | Moment cards on a scannable list; explanations docked to circuit highlights |
| Strategy Lab | Scenario editor left, baseline-vs-alternative delta chart right; SIMULATION badges everywhere |
| Driver Lab | Season timeline hero + metric grid |
| Constructor Lab | Ranked table with bar-encoded points |
| Race Vault | Archive browser (season → event → session) opening into the same replay shell |
| Prediction Arena | Probability bars with calibration history; P2, secondary nav weight |

Analytical honesty everywhere (master §17.3): state season, sample size,
denominator; mark modeled outputs estimates/simulations; no proprietary-data
claims.

## 10. Motion (master §20)

Tokens:

| Token | Duration | Use |
|-------|----------|-----|
| `--gt-motion-micro` | 100–140ms | hover, focus, color changes |
| `--gt-motion-standard` | 160–200ms | panel state, selection, badges |
| `--gt-motion-reveal` | 240–320ms | drawer/expand, annotation reveal |
| `--gt-motion-scene` | 300–550ms | camera moves, hero scene transitions |

Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` default; scene moves may use
non-linear ease-out; clock-driven values (cars, numbers) → no easing, purely
data-derived.

**Purposeful triggers only (§20.2):** driver select, pair select, playhead move,
track-section highlight, event select, annotation reveal, observed↔simulated
switch, chart point select, detail expand.

**Forbidden (§20.3):** background animation, random pulsing, particles, fake
telemetry, animated values on static data.

**Reduced motion (§20.4):** transitions → 0ms, camera cuts instead of glides,
hero scene renders final frame, progress animations complete instantly. Data
motion that *is* content (position changes driven by the clock) remains.

Number changes: optional 80ms crossfade; never count-up animations.

## 11. Responsive (master §21)

- **Desktop (≥1280px):** four regions as specified; full Circuit Stage.
- **Tablet (768–1279px):** rail collapses to icon strip; circuit and timing
  table stack vertically; ribbon stays fixed bottom; telemetry charts keep
  horizontal integrity.
- **Mobile (<768px):** single column, nav becomes top sheet; circuit view is
  compact (blueprint mode default); timing table scrolls horizontally with
  position+driver pinned; ribbon simplified to playhead + lap nav.
- No desktop-shrink; no native packaging; PWA only after the core is reliable.

## 12. Accessibility (master §22.1)

- Keyboard reach for: nav, session picker, clock transport, ribbon scrubber
  (arrow keys), table rows, circuit elements, Battle Lab comboboxes.
- Semantics: landmarks, headings, table headers, `aria-label` on icon-only
  buttons.
- Non-color alternatives for every status/flag/compound/driver cue.
- Contrast ≥ 4.5:1 body, ≥ 3:1 large text and UI edges (validate `--gt-text-muted`
  `#84909D` on `--gt-canvas` `#0B0E12` and `--gt-signal` `#FF5B49` on
  `--gt-void` before shipping).
- Focus rings visible on all six component states.
- Errors: specific, actionable, non-blaming copy; failures explain what is
  missing, not "something went wrong".

## 13. Performance budgets (master §22.2)

- LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (measured on landing + Race Control).
- 3D loads progressively: app shell and table usable before scene assets;
  scene chunks code-split behind the route.
- WebGL unavailable → blueprint circuit + full table/ribbon (graceful, not
  blank); never block core workflow on the scene.
- Memoize chart series; reuse caches (`useFlagship`, clock store); no duplicate
  fetches on clock ticks.

## 14. Failure handling (master §22.3)

Network/parse/missing-data failures render the honest empty/unavailable states
already established (`CIRCUIT MAP UNAVAILABLE`, Gasly 404 path, `UNAVAILABLE`
badges). Retry affordance where useful; stale data labelled stale; partial data
never presented as complete.
