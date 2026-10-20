# GRIDTRACE Landing — Reference Design Brief

**Date:** 2026-10-19 · **Build 16** · **Status:** approved for implementation
**Sources studied live:** [aten7.com](https://www.aten7.com/) · [landonorris.com](https://landonorris.com/) · [2019.makemepulse.com](https://2019.makemepulse.com/)
**Identity lock:** CARBON / CHALK / SIGNAL (`--gt-signal` racing red `#ff5b49`). Reference accents (acid lime, LOAD NORRIS green) are **not** adopted as brand colors.

---

## 1. What we steal, per reference

### aten7.com — structure + ambient glitch title

| Element | Reference behavior | GRIDTRACE adaptation |
|--------|-------------------|----------------------|
| Preloader | OS-boot glitch-scramble, orbital arcs, ~6–8s | Shortened **telemetry boot** (~2.0–2.4s): mono lines (`INIT TELEMETRY REPLAY`, `SESSION 9558 · SILVERSTONE`, `SYNC CLOCK`), progress 0→100, faint rotating gap-arc SVG. Never blocks CTA availability under reduced-motion (skip to gate/main). |
| Intro gate | "CLICK TO ENTER" full-screen lock | Full-screen gate: giant **GRIDTRACE** H1 + ambient glitch; subline "EVERY GAP TELLS A STORY"; CTA button **ENTER REPLAY** (keyboard-focusable, Enter/Space). Click dissolves gate into main landing. `sessionStorage` key `gt:entered` skips gate on return visits. |
| Ambient glitch title | Display type never sits still: micro-displacement, slice shifts, RGB echo, acid flash-through | Same treatment on gate H1 only (not every heading). Flash-through uses `--gt-signal` (racing red) instead of acid yellow. Micro: 1–2px random x-shift on random chars, RGB twin shadows (cyan + signal), occasional 1-frame brightness spike. Driven by CSS keyframes + per-char spans. |
| Per-char type | `char__wrapper` / `char__proxy` spans | Hand-rolled `SplitReveal` / `GlitchTitle` components — per-char `<span>`; no react-bits / shadcn dependency. |
| Background arcs | Faint orbital / Bezier lines from center | Telemetry **gap arcs**: concentric SVG ellipses, dash-draw + slow rotate, chalk opacity ~0.12–0.2, behind hero and gate. |
| Wheel chapters | No native scroll | We **keep native scroll** for the marketing landing (honesty + a11y + deep-link to `#decoded`). Full-screen chapter feel comes from `min-height` sections + scroll reveals, not scroll hijack. |

### landonorris.com — phase animation → F1 car

| Element | Reference behavior | GRIDTRACE adaptation |
|--------|-------------------|----------------------|
| Phase reveal | Sketch → fill → finished subject | On gate dismiss + hero mount: `SingleSeater` reveals in three phases — (1) chalk **stroke ghost** / clip-wipe draw left→right, (2) fills fade to full, (3) signal glow + orbiting gap arcs pulse in. Duration ~1.6s total; reduced-motion = fully formed, no animation. |
| Preloader wordmark | "LOAD NORRIS" | Boot sequence title: **GRIDTRACE** mono boot banner. |
| Mixed display type | Serif + sans, handwritten accent | We keep Inter Variable + IBM Plex Mono only (licensed already). Personality comes from glitch + mono kickers, not new font files. |
| Photo scatter / frames | Notched-corner frames | Notched corners on the hero visual frame (clip-path or corner ticks) — light nod, not a copy of the helmet gallery. |

### 2019.makemepulse.com — storytelling flow

| Element | Reference behavior | GRIDTRACE adaptation |
|--------|-------------------|----------------------|
| Sequential narrative | Click-through full screens | Gate → hero → numbered sections `01`–`05` + finale. Each section reveals on scroll (IntersectionObserver, translateY + opacity). |
| Grain / texture | Film grain over dark scenes | Fixed full-viewport grain overlay (SVG `feTurbulence` data-URI, opacity ~0.045, `pointer-events: none`, above content below gate). |
| Dual-canvas drama | Two large staged scenes | Hero visual = phase car + circuit + gap arcs stacked; copy column stays calm for readability. |
| Restraint | One idea per screen | One thesis per section (existing copy retained). |

---

## 2. Screen flow (target)

```
[boot ≤2.4s] → [gate: glitch GRIDTRACE + ENTER REPLAY] → [main]
     ↓ reduced-motion / sessionStorage gt:entered
   [main] directly (boot skipped, gate skipped, car fully formed)
```

**Main** = existing seven screens (Signal Lap hero, 01 Decoded, 02 Rewind, 03 Difference, 04 Decision, 05 Record, finale + footer), restyled with:

- Grain overlay
- Section scroll-reveal
- Hero visual: phase car (SVG `SingleSeater` + gap arcs + notched frame); WebGL `HeroScene` remains optional enhancement when `webglOk` and after gate (lazy), with SVG fallback always correct
- Ambient grid background retained (40px `--gt-grid-line`)

## 3. Non-negotiables

1. **Data honesty** unchanged: REPLAY badge in header; no fake LIVE.
2. **Primary CTA** `ENTER THE PITWALL` → `/app` visible without scrolling on desktop; keyboard-reachable in all motion modes.
3. **Reduced motion:** no boot delay, no glitch, no phase animation, no scroll-reveal motion (content visible), gate skipped.
4. **No new runtime deps** (no anime.js, no shadcn, no react-bits). CSS + rAF + IntersectionObserver only.
5. **No code comments** in shipped TS/CSS (docs exempt).
6. **Tokens only** — no new hex values outside `tokens.css` (grain uses existing chalk/void via opacity).
7. Original artwork only (`SingleSeater`, `CircuitPath`); licensed fonts already bundled.

## 4. Component map

| Piece | File | Notes |
|-------|------|-------|
| Boot overlay | `landing/BootSequence.tsx` | Mono lines + progress + arcs |
| Gate | `landing/IntroGate.tsx` | Glitch H1 + SplitReveal tagline + enter button |
| Glitch chars | `components/motion/GlitchTitle.tsx` | Per-char spans, CSS glitch |
| Split reveal | `components/motion/SplitReveal.tsx` | Per-char stagger opacity/translate |
| Phase car | `landing/PhaseCar.tsx` | Wraps `SingleSeater` + orbits + clip wipe phases |
| Grain | CSS `.landing__grain` | Fixed overlay, data-URI turbulence |
| Scroll reveal | `landing/useReveal.ts` | IntersectionObserver → `data-reveal` |
| Shell | `landing/Landing.tsx` + `Landing.css` | Phase machine: boot \| gate \| main |

## 5. Verification checklist

- [ ] `npx oxlint` / `npx tsc --noEmit` / `npx vitest run` clean (pre-existing warnings only)
- [ ] Desktop 1440×900 + mobile ~390×844 screenshots of boot, gate, main hero
- [ ] `prefers-reduced-motion: reduce` → straight to main, car formed, CTA usable
- [ ] Gate dismisses on click, Enter, Space; focus returns to main CTA
- [ ] Return visit within tab (`sessionStorage`) skips gate
- [ ] No invented LIVE badges; footer/session copy unchanged in honesty
