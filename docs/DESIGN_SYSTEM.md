# Design system — "Digital Pitwall"

CARBON (structural environment) + CHALK (analytical drawing language) + SIGNAL (selective vermilion emphasis), with DEPTH from the resurrection directive. Dark, instrument-panel aesthetic. Every number readable at a glance; motion only when it communicates state. Governing spec: `docs/ART_DIRECTION_MASTER.md` §3–§6; reconciliation: `docs/ART_DIRECTION.md`.

## Tokens

Canonical source: `frontend/src/styles/tokens.css`. Everything below reflects the current `--gt-*` tokens (CARBON/CHALK/SIGNAL migration complete in code — see [Migration](#migration-build-1--gt-) at the end of this document).

### Color — surfaces, borders, grid (§4.1–§4.4)

| Token | Value | Use |
|-------|-------|-----|
| `--gt-void` | `#080A0D` | deepest background (app void) |
| `--gt-canvas` | `#0B0E12` | page background |
| `--gt-surface-1` | `#10151A` | panels, cards |
| `--gt-surface-2` | `#151B22` | raised rows, inputs |
| `--gt-surface-3` | `#1C242D` | hover/selected rows |
| `--gt-surface-4` | `#252F3A` | highest elevation, popovers |
| `--gt-surface-inset` | `#0D1116` | inset wells, chart plot areas |
| `--gt-border-faint` | `#202830` | hairlines inside panels |
| `--gt-border-subtle` | `#29323D` | default dividers |
| `--gt-border-default` | `#35414E` | panel edges |
| `--gt-border-strong` | `#4A5969` | focused/active edges |
| `--gt-grid-line` | `#222C35` | low-contrast drafting grid |
| `--gt-grid-line-strong` | `#35424E` | emphasized grid lines |

**Background grid policy:** the drafting grid is *local* to charts, circuit stage, and blueprint panels. No full-page grid (master §4.9 background treatment; supersedes `CircuitPath.tsx`'s full-bleed grid).

### Color — text

| Token | Value | Use |
|-------|-------|-----|
| `--gt-text-primary` | `#F1F4F7` | headings, primary data |
| `--gt-text-secondary` | `#B1BBC6` | body, secondary data |
| `--gt-text-muted` | `#84909D` | labels, metadata |
| `--gt-text-disabled` | `#626E7B` | disabled controls, unavailable |
| `--gt-text-inverse` | `#10151A` | text on light surfaces |
| `--gt-text-on-signal` | `#111315` | text on Signal fills |

### Color — Signal (brand accent)

| Token | Value | Use |
|-------|-------|-----|
| `--gt-signal` | `#FF5B49` | primary accent, key CTAs, crosshair |
| `--gt-signal-hover` | `#FF7665` | hover state |
| `--gt-signal-active` | `#E94837` | pressed state |
| `--gt-signal-subtle` | `#331B1A` | tinted backgrounds |
| `--gt-signal-line` | `#7E322C` | tinted borders |
| `--gt-signal-muted` | `#C94F42` | signal on dark where full red is too loud |

SIGNAL is *selective emphasis only* — never a large background, never applied to whole rankings or teams (master §4).

### Color — telemetry series (§4.5)

| Token | Value | Typical use |
|-------|-------|-------------|
| `--gt-data-cyan` | `#61D9E8` | speed / driver A |
| `--gt-data-blue` | `#7DAEFF` | throttle / driver B |
| `--gt-data-amber` | `#F3C16C` | brake |
| `--gt-data-violet` | `#B7A3FF` | gear/RPM / driver C |
| `--gt-data-mint` | `#79D7B1` | delta, positive separation |
| `--gt-data-rose` | `#FF8FB5` | special-series highlight |
| `--gt-data-orange` | `#FF9D70` | DRS / driver D |
| `--gt-data-chalk` | `#D5DEE4` | reference/baseline series |

Rules (§4.5): driver/series → colour mapping is stable and central (single module, never ad-hoc in components); brand colour is never automatically a telemetry series colour.

### Color — status + data-mode badges (§4.6)

| Token | Value | Use |
|-------|-------|-----|
| `--gt-success` | `#75D9A0` | green flag, gains |
| `--gt-warning` | `#F2BF69` | yellow/VSC |
| `--gt-danger` | `#FF737A` | red flag, DNF, errors |
| `--gt-info` | `#77BFFF` | SC, links, focus ring |
| `--gt-neutral-status` | `#A0ACB9` | neutral/unknown |
| `--gt-live` | `#FF6A58` | LIVE badge (reserved — never shown without a real feed) |
| `--gt-replay` | `#80B6FF` | REPLAY badge |
| `--gt-estimate` | `#B7A3FF` | ESTIMATE badge |
| `--gt-simulation` | `#F2BF69` | SIMULATION badge |

`UNAVAILABLE` uses `--gt-text-disabled`. Every view must display its data mode (LIVE / REPLAY / ESTIMATE / SIMULATION / UNAVAILABLE) — honesty rules are non-negotiable.

### Color rules (§4.7–§4.8)

- **Driver identity colours** come from OpenF1 `team_colour` via a single central mapping (`useDriverColour`) — team colours are ground truth, not decorative choices.
- **Never colour alone**: pair colour with text, shape, position, or pattern (flags, compounds, deltas all carry labels).
- Analytical series colours are for *metric* comparison, never driver identity.

### Light theme (§4.9)

Optional, deferred. Same token names, new values only. No component-level light styling until then.

## Type

**Decision:** UI = **Inter** (variable, self-hosted via `@fontsource-variable/inter`); numerals/timing/tables = **IBM Plex Mono** (self-hosted via `@fontsource/ibm-plex-mono`, 400/500). Both imported in `frontend/src/main.tsx` before `tokens.css`. Space Grotesk is **not** used (not installed, not in master §5). Master §5 permits Geist or Inter — we take Inter because it is already the installed variable font.

- Mono always uses `font-variant-numeric: tabular-nums`.
- Fallbacks: `ui-sans-serif, system-ui` / `ui-monospace, SF Mono`.

### Scale (master §5.3)

| Role | Token | Range / value |
|------|-------|---------------|
| Hero display (landing only) | `--gt-text-hero` | `clamp(44px, 8vw, 96px)` — directive allows 64–104 px on large screens; session-selection display only |
| Display (session selection) | `--gt-text-display` | `clamp(30px, 4vw, 36px)` |
| Page title | `--gt-text-page` | `clamp(22px, 2.4vw, 26px)` |
| Section heading | `--gt-text-section` | `16px` |
| Body | `--gt-text-body` | `14px` (13–15 range) |
| Label | `--gt-text-label` | `12px` |
| Metadata | `--gt-text-meta` | `11px` |
| Main numeric readout | `--gt-text-readout` | `22px` (18–28 range) |
| Table measurement | `--gt-text-table-num` | `13px` (12–14 range) |

Weights: display 550–650, page/section 600, body 400–500, labels 500–600, numerals 500–650. `clamp()` resolves the §5.3 responsive ranges.

## Space & radius

- 4px grid: `--gt-space-1..12` = 4, 8, 12, 16, 20, 24, 32, 40, 48 px.
- Radius: `--gt-radius-xs 3px`, `-sm 5px`, `-md 7px`, `-lg 10px`, `-xl 14px`, `-pill 999px`.
- Borders 1px; hierarchy from surface contrast (`surface-1 → surface-4`) before border weight.

## Layout constants

| Token | Value |
|-------|-------|
| `--gt-sidebar-w` | 220px (rail width, 4-region shell) |
| `--gt-tower-w` | 300px (timing tower) |
| `--gt-panel-header-h` | 40px |
| `--gt-row-h` | 28px (timing row) |

## Scene materials (Three.js — added in Tasks D/E)

Landing hero single-seater and Circuit Stage derive all material colours from CARBON/CHALK/SIGNAL; no free-form hexes in scene code:

| Token (to add) | Derived from | Use |
|----------------|--------------|-----|
| `--gt-scene-carbon` | `--gt-void` / `--gt-surface-1` | car bodywork base, environment |
| `--gt-scene-chalk` | `--gt-text-primary` / `--gt-data-chalk` | circuit line, annotation strokes |
| `--gt-scene-signal` | `--gt-signal` | accent stripes, selection glow |
| `--gt-scene-grid` | `--gt-grid-line` | drafting-grid floor / blueprint planes |
| `--gt-scene-fog` | `--gt-void` | scene fog / depth falloff |

Scene code reads these tokens (or their CSS-variable equivalents); DEPTH comes from fog, soft key light, and vignette — not from extra colours. WebGL failure falls back to the blueprint SVG circuit (progressive enhancement).

## Components (Build 1+, restyled per `UI_UX_SPECIFICATION.md`)

- **Badge** (data mode): monospace uppercase, 10px; `REPLAY` → `--gt-replay`, `ESTIMATE` → `--gt-estimate`, `SIMULATION` → `--gt-simulation`, `UNAVAILABLE` → `--gt-text-disabled`, `LIVE` → `--gt-live` solid (reserved).
- **Timing row**: position (tabular), driver tag (3-letter + team colour chip), interval, gap-to-leader, tyre compound circle (S/M/H), last lap mono. Six states: default/hover/selected/focused/unavailable/stale.
- **Editorial event card**: flag/status colour + observed/calculated/inferred/unknown provenance + lap + timestamp; click → seek shared clock.
- **Panel**: `surface-1`, `border-subtle`, header `--gt-panel-header-h` with title + right-side data-mode badge.
- **Crosshair**: 4 arms + centre dot in `--gt-signal`, `pointer-events: none`, context label, keyboard-reachable equivalent.
- **Race Ribbon**: transport controls (0.5×/1×/2×/4×), event pins, expanded lane mode — driven by the single shared clock (`ClockDriver`), never independent timers.
- **Position table**: 15+ rows, scroll pinning, stable columns, honesty states.

## Motion

Tokens: `--gt-micro 120ms`, `--gt-standard 180ms`, `--gt-reveal 280ms`, easing `--gt-ease cubic-bezier(0.2, 0.8, 0.2, 1)`. Scene transitions may run 300–550ms; micro-interactions 100–140ms.

- Clock-driven (cars, numbers) → no easing, purely data-derived.
- Number changes → optional 80ms crossfade; never count-up animations (they imply precision we don't have).
- Forbidden (master §20.3): background animation, pulsing, particles, fake telemetry, animated static values.
- `prefers-reduced-motion: reduce` → `--gt-micro/standard/reveal` collapse to `0ms` (tokens.css) and scene transitions become instant state swaps.

## Accessibility

- Contrast ≥ 4.5:1 on all text: `--gt-text-muted #84909D` and `--gt-signal #FF5B49` both pass against `--gt-void #080A0D`; verify small text when reusing colours on other surfaces.
- Keyboard: ribbon scrubber arrows, RC list navigable, crosshair context reachable without pointer, Battle Lab pickers comboboxes, focus ring via `--gt-info`.
- Reduced motion: crossfades and scene transitions disabled; data motion remains (it's content).
- Never colour-only signalling (§4.8).

## Performance budgets (master §22)

LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. Three.js loaded only on the landing route (route-level code split); WebGL unavailable → blueprint fallback, no blank canvas. Charts stay SVG/D3.

## Imagery

No stock photos. Screenshots of real app views only (docs/screenshots/). Icons: lucide-react, 16/20px, stroke 1.5. Original non-branded single-seater geometry (no team marks, no sponsor logos, no driver likenesses — master §24).

## Migration (Build 1 → `--gt-*`)

The Build-1 palette (`--canvas`, `--surface-1/2`, `--border`, `--border-strong`, `--accent`, `--positive`, `--warning`, `--info`, `--danger`, `--series-1..5`) was replaced wholesale by the `--gt-*` namespace during the CARBON/CHALK/SIGNAL adoption. **Code is fully migrated** (grep-verified: no legacy tokens or raw old-palette hexes remain under `frontend/src/`); this document previously listed the old table and was stale — it now mirrors `tokens.css`. Map for reference: `--accent → --gt-signal`, `--positive → --gt-success`, `--series-1..5 → --gt-data-*`, `--canvas → --gt-canvas`, `--border* → --gt-border-*`.
