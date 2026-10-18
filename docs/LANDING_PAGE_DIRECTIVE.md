# GRIDTRACE — MASTER LANDING PAGE & END-TO-END EXPERIENCE DIRECTIVE

> Source: user-delivered master design directive, 2026-10-18. This file preserves the directive **verbatim** as the authoritative specification for the root landing route (`/`) and the overall end-to-end experience framing. Companion file: [ART_DIRECTION_MASTER.md](ART_DIRECTION_MASTER.md) (general UI/system directive). Where the two overlap, treat the ART_DIRECTION token/palette values as authoritative for tokens, and this file as authoritative for the landing page experience.

---

## 1. Creative concept — THE SIGNAL LAP

The landing page is **"The Engineer's Racing Atlas"**. It should feel like an annotated circuit notebook rendered as a precision instrument: carbon surfaces, chalk marks, signal red. Purposeful, controlled sketch language only — never decorative scribble.

- Root route `/` = marketing/landing experience.
- Main application lives at `/app`.
- The landing page's job is to communicate the thesis and hand the user into a **working** app. Primary CTA must navigate to the real application, never a placeholder.

## 2. Hero — the Signal Lap

- Concept: a **custom, original single-seater SVG** traveling an **original circuit path** with orientation change.
- A **red racing-line trace** draws behind the car as it completes the lap (signal color `--gt-signal #FF5B49`).
- A **technical circuit drawing** (thin chalk lines, corner numbers) underlies the animation — reads as engineering sketch, not video game.
- Non-blocking: hero animation must never delay content, CTA interaction, or navigation. If fonts/assets are slow, the hero degrades gracefully.

### Headline & copy (verbatim)

- **Headline:** "Every gap tells a story."
- **Supporting copy:** "Explore the lines behind the result. Replay decisive moments, compare drivers at the same point on track, and investigate the decisions that shape a race."

### CTAs

| CTA | Label | Behavior |
|-----|-------|----------|
| Primary | **ENTER THE PITWALL** | Navigates to `/app` — the working application. Must remain visible and keyboard-accessible at all times, including reduced-motion mode. |
| Secondary | **EXPLORE A RACE** | Opens a real session selector or jumps to the flagship session (9558). Never a dead link. |

### Navigation (compact)

- Platform · Race Intelligence · Strategy · Archive
- No placeholder links. If a destination is not built yet, the nav item must be absent or clearly disabled — never a 404.

## 3. Section thesis (verbatim)

> "A leaderboard tells you where. GRIDTRACE helps you understand why."

This line frames the transition from hero into the product-preview sections.

## 4. Seven landing screens (order)

1. **Signal Lap** — hero (see §2)
2. **The Race Decoded** — show the race-control / timing-tower concept: flags, position changes, the shared clock
3. **Rewind the Moment** — replay/scrub interaction preview: seek to a decisive moment
4. **Find the Difference** — two-driver comparison preview (Battle Lab teaser)
5. **Test the Decision** — strategy / what-if framing (label as SIMULATION when interactive)
6. **The Record** — archive/sessions framing; historical breadth
7. **Enter the Pitwall** — closing handoff into the app

### Preview honesty rules (all sections)

- Previews reuse **real app components / real data** wherever practical.
- Illustrative data must be **labeled** (e.g., "ILLUSTRATIVE" or the appropriate data-mode badge).
- **Never invent numbers.** No fake live statistics anywhere on the landing page.
- Every number shown must be traceable to a cached API response or a deterministic transformation of one — same rule as the app.

## 5. Closing & footer

- Closing statement: **"The race is still telling its story."**
- Restrained footer: product name, docs link, data attribution (OpenF1, Jolpica, MultiViewer), **independent-product disclaimer**.
- No unauthorized team/series logos. Driver/team names as factual identifiers only.

## 6. Motion & performance budget

| Class | Duration | Use |
|-------|----------|-----|
| micro | 100–140ms | hover, focus, toggles |
| standard | 160–220ms | small state changes, card hover |
| reveal | 220–320ms | section entrance |
| section reveal | ~300–500ms | scroll-triggered section fades (once, no re-trigger thrash) |
| CTA | 180–320ms | primary CTA enter/activate (magnetic is optional, restrained) |

Hard rules:

- **No scroll hijacking.** Native scroll only.
- **No particle systems, no starfields.**
- **`prefers-reduced-motion`:** static, fully-composed hero (car + full racing line already drawn, no travel). All entrance reveals become instant opacity 1. CTA remains fully functional.
- **Pause when the tab is hidden** (`visibilitychange`). No rAF loops while backgrounded.
- **No layout shifts** (CLS ≈ 0). Reserve space for fonts, hero SVG, and images.
- Prefer **custom SVG / CSS / JS** over heavyweight 3D/animation libraries. Three.js/GSAP bundles are not justified for this concept.

## 7. Typography & tokens on the landing page

- Use the semantic `--gt-*` tokens defined in [ART_DIRECTION_MASTER.md](ART_DIRECTION_MASTER.md). No raw hex in components.
- Hero headline may use the landing-specific hero scale: **64–96px** (display sans), weight 550–650, tight tracking.
- Optional **Instrument Serif italic** for a small number of editorial phrases only (e.g., the closing line). Never for body copy.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for any time/gap/position figures shown in previews.

## 8. Accessibility

- Primary CTA reachable by keyboard, visible focus ring (`--gt-signal` or border-strong per token system).
- Color is never the only signal (racing-line animation is decorative; meaning lives in text).
- Landmark structure: `header`, `main`, `section` per screen, `footer`.
- Hero SVG marked `aria-hidden="true"` if purely decorative; the headline and CTA carry the accessible experience.
- Reduced-motion fallback (§6) is mandatory, not optional.

## 9. Acceptance gate for the landing page

- [ ] `/` renders the Signal Lap hero with original SVG car + circuit path + red racing line
- [ ] "Every gap tells a story." + supporting copy present verbatim
- [ ] ENTER THE PITWALL navigates to a working `/app`
- [ ] EXPLORE A RACE reaches a real session/selector
- [ ] All 7 sections present in order; previews labeled; no invented numbers
- [ ] Closing line + restrained footer with attribution + disclaimer
- [ ] No scroll hijack, no particles, no layout shift
- [ ] `prefers-reduced-motion` static hero works
- [ ] Keyboard path to primary CTA works
- [ ] No unauthorized logos

---

*End of landing page directive. General UI tokens, palettes, module list, testing gates: [ART_DIRECTION_MASTER.md](ART_DIRECTION_MASTER.md).*
