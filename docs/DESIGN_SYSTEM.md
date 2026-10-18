# Design system — "Digital Pitwall"

Dark, instrument-panel aesthetic. Every number readable at a glance; motion only when it communicates state.

## Tokens (canonical: `frontend/src/styles/tokens.css`, Build 1)

### Color — surfaces

| Token | Value | Use |
|-------|-------|-----|
| `--canvas` | `#0B0E12` | app background |
| `--surface-1` | `#12161D` | panels, cards |
| `--surface-2` | `#1A1F28` | raised rows, inputs |
| `--border` | `#262C36` | hairlines |
| `--border-strong` | `#39414E` | focused/active edges |

### Color — semantic / brand

| Token | Value | Use |
|-------|-------|-----|
| `--accent` (racing red) | `#FF5B45` | primary accent, red flag, key CTAs |
| `--positive` | `#3DDC97` | green flag, gains |
| `--warning` | `#F5C451` | yellow/VSC |
| `--info` | `#5AB0FF` | SC, links, focus ring |
| `--danger` | `#FF5B45` | DNF, errors (shares accent) |

### Color — analytical series (charts, battle lab)

| Token | Value | Typical use |
|-------|-------|-------------|
| `--series-1` | `#5AB0FF` | speed / driver A |
| `--series-2` | `#3DDC97` | throttle / driver B |
| `--series-3` | `#F5C451` | brake |
| `--series-4` | `#C084FC` | gear/rPM or driver C |
| `--series-5` | `#FF8A65` | DRS / driver D |

Driver identity colors come from OpenF1 `team_colour` (per-driver) — team colors are ground truth; analytical series colors are for *metric* comparison, not driver identity.

### Type

| Role | Font | Notes |
|------|------|-------|
| Numerals, timing, tables | **IBM Plex Mono** | `font-variant-numeric: tabular-nums`; all gap/lap columns |
| UI text | **Geist** (self-hosted, OFL) | fallback: `ui-sans-serif, system-ui` |
| Scale | 12 / 14 / 16 / 20 / 24 / 32 px | smallest for dense tables |

### Space & radius

- 4px grid: `--space-1..8` = 4, 8, 12, 16, 24, 32, 48, 64
- Radius: `--radius-sm 4px`, `--radius-md 8px`, pill for badges
- Borders 1px; panel header height 40px; timing row height 28px

## Components (Build 1+)

- **Badge** (data mode): monospace uppercase, 10px; `REPLAY` info-blue outline, `ESTIMATE` amber outline, `SIMULATION` purple outline, `UNAVAILABLE` gray, `LIVE` red solid (reserved).
- **Timing row**: position (tabular), driver tag (3-letter + team color chip), interval, gap-to-leader, tyre compound circle (S/M/H color-coded), last lap mono.
- **Event card**: flag icon color + message + lap + timestamp; click → seek clock.
- **Panel**: surface-1, hairline border, header with title + right-side data-mode badge.
- **Scrubber**: full-width slider, lap ticks, event pins colored by category.

## Motion rules

- Clock-driven (cars, numbers) → no easing, purely data-derived.
- Panel enter/exit → 120–160ms ease-out; respects `prefers-reduced-motion`.
- Number changes → optional 80ms crossfade; never count-up animations (they imply precision we don't have).

## Accessibility

- Contrast ≥ 4.5:1 on all text (red `#FF5B45` on canvas passes for large/bold; verify small text).
- Keyboard: scrubber arrows, RC list navigable, Battle Lab driver pickers comboboxes.
- Reduced motion: disable crossfades only; data motion remains (it's content).

## Imagery

No stock photos. Screenshots of real app views only (docs/screenshots/). Icons: lucide-react, 16/20px, stroke 1.5.
