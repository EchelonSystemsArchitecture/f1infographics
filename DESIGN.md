# GridTrace — Design

The visual system for GridTrace, written for whoever builds the internal frontend (the `/app` pitwall). The public landing page (`/`) is the reference implementation: **hero, garage and footer** are the "this is what it should feel like" pages. Everything else here is the rulebook for carrying that feel into the app.

Run it: `cd frontend && npm install && npm run dev` → http://localhost:5173 (`?skipintro` skips the preloader).

---

## 1. Concept

**Aggressive editorial meets race engineering.** A dark, concrete-and-carbon world lit by one team colour. Huge condensed type, a serif italic for emphasis, and real data underneath. It should feel like a team garage at night: everything dark, one colour doing all the shouting.

References we studied (vibe only, nothing copied):

| Reference | What we took |
|---|---|
| landonorris.com | Mixed serif-italic + heavy grotesk headlines, topographic contour backgrounds, solid-colour preloader, rounded notch footer card, small dark HUD cards |
| Dropbox × McLaren | Papaya halftone dots, diagonal parallelogram stripes, carbon texture, wide chunky type |
| Dribbble "F1 Website Design" (Meher Ali) | Top-down car under a vertical light beam, giant type behind the car, concrete grain |
| Dribbble "F1 NPR Render" (aref karami) | Big race number on a grid, toon/blueprint car renders |
| Dribbble "Velas" (Renat Muratshin) | Light-speed streaks, rim-lit car reveal |
| Dribbble "Ferrari F1 Garage" (Koka Papaskua) | Low-poly isometric garage diorama |
| LightExperience (rqphy) | Car in darkness revealed by a cursor-following key light |

## 2. Principles

1. **One team colour does the work.** Everything is near-black/off-white; the team primary is the only saturated colour on screen (plus the secondary as a rare accent).
2. **Type is the hero.** Headlines are huge, uppercase, wide and tight. One word per headline gets the serif italic in team colour (*gap*, *garage*, *the gap*).
3. **Dark, textured, never flat.** Every dark surface carries grain, contour lines, carbon or halftone at low opacity.
4. **Motion is weighted, not bouncy.** Expo-out easing, long durations, scroll-scrubbed reveals. Nothing springs.
5. **Honest data.** Every number is real or labelled (`REPLAY`, `ESTIMATE`, `SIMULATION`). Decoration never fakes data. (Same rule as `AGENTS.md`.)
6. **Performance is part of the design.** One live WebGL scene in view at a time; everything else is CSS, SVG or pre-rendered images.

## 3. Colour

All colours are CSS variables set at runtime from the team theme (`frontend/src/theme/teams.ts` → `ThemeContext`). **Never hard-code a team colour in a component.**

| Token | Papaya value | Use |
|---|---|---|
| `--team-primary` | `#ff8000` | The only loud colour. CTAs, italic emphasis, active states, light bars, progress |
| `--team-primary-ink` | `#140a00` | Text/icons sitting on primary |
| `--team-secondary` | `#3fc5ff` | Rare accent: secondary data series, sidepod stripe, caliper. Max ~5% of a screen |
| `--team-ink` | `#121212` | Text on paper backgrounds, dark card fills |
| `--team-paper` | `#f1ece4` | Primary text on dark, light section backgrounds (warm off-white, never pure white) |
| `--team-dark` | `#161513` | Section backgrounds |
| `--team-darker` | `#0c0b0a` | Page base, hero, deepest layer |

Derived colours use `color-mix()`, e.g. muted text = `color-mix(in srgb, var(--team-paper) 65%, transparent)`, hairline borders = paper at 10–14%.

Other themes (`scarlet`, `midnight`, `silver`, `racing-green`) are defined but marked `available: false`. Adding a team means filling in its colours + livery; nothing else changes.

The older `--gt-*` tokens in `frontend/src/styles/tokens.css` still drive the existing app (data colours, status colours, data-mode badges). Keep using `--gt-data-*` for chart series and `--gt-replay` etc. for badges; use `--team-*` for chrome, accents and brand moments.

## 4. Typography

| Role | Family | Settings |
|---|---|---|
| Display / headlines | **Archivo Variable** (`--font-display`) | `font-stretch: 112–125%`, `font-weight: 800–900`, uppercase, `letter-spacing: -0.045em to -0.055em`, `line-height: 0.84–0.9` |
| Emphasis word | **Instrument Serif** italic (`--font-serif`) | Normal stretch, weight 400, sentence case, `letter-spacing: -0.02em`, coloured `--team-primary` |
| Body | **Inter Variable** (`--font-sans`) | 14–15px, `line-height: 1.55–1.6`, paper at 65–75% |
| Labels / data | **IBM Plex Mono** (`--font-mono` / `.mono`) | 9–11px, uppercase, `letter-spacing: 0.18–0.3em`, tabular numerals |

Sizes (fluid):

- Hero headline: `clamp(44px, 6vw, 96px)`
- Section headline: `clamp(44px, 7vw, 120px)`
- Footer statement: `clamp(44px, 8.4vw, 150px)`
- Kicker (`01 · THE GARAGE`): mono 11px, `--team-primary`, letter-spacing 0.26em

Headline pattern, every time:

```html
<h2 class="garage__title">Open the <em>garage.</em></h2>
```

Masked line reveals need breathing room for the serif italic's swashes: give the mask `padding: 0.02em 0.12em 0.12em 0.14em` with matching negative margin (see `.hero__line`).

## 5. Layout & spacing

- Side gutter: `--gutter: clamp(16px, 3.2vw, 48px)`.
- Section vertical padding: `clamp(100px, 16vh, 180px)`.
- Section header: two columns, headline left, a ~420px intro paragraph right, aligned to the bottom. Single column under 900px.
- Corner ticks (hero) frame full-bleed scenes: 18px L-shaped hairlines at paper 55%.
- Radii: buttons/chips `999px`; cards `14–22px`; big stages and footer card `28–34px`.

## 6. Texture & motifs

| Motif | Where | How |
|---|---|---|
| Concrete grain | Hero | SVG `feTurbulence` overlay + React Bits `Noise` at 0.07 opacity |
| Topographic contours | Footer card, garage floor | `components/landing/Topo.tsx` (d3-contour over fbm noise), primary at 0.14–0.22 opacity |
| Halftone dots | Garage side wall, rim study card | radial-gradient dots in primary, masked with a linear gradient |
| Parallelogram stripes | Garage back wall, pitwall header | 115° skewed blocks in primary |
| Light beam | Hero | vertical primary gradient column with a wide box-shadow glow |
| Giant ghost type | Hero (`GAP`) | Display font at ~33vw, paper at 7%, with a "lit" copy clipped to the beam |
| Marquee band | Under hero | React Bits `ScrollVelocity`, primary band rotated −2.2° |

## 7. Components

| Component | Spec |
|---|---|
| **Primary button** `.btn--primary` | Pill, primary fill, ink text, display font 750 uppercase. Hover: paper fill wipes up from below (`::before` translateY). Sizes sm 36 / md 44 / lg 56px |
| **Ghost button** `.btn--ghost` | Transparent, paper border at 35%; same wipe to paper on hover |
| **Magnet** | Wrap primary CTAs in React Bits `Magnet` (padding 40–80, strength 3–4) |
| **Chip** `.chip` | 30px pill, mono 10px, coloured dot, blurred dark fill. `is-on` = primary border/text. Disabled = 45% opacity + `SOON` |
| **Segmented control** `.seg` | Pill track, active segment filled primary |
| **HUD card** | Dark at 70–85% + `backdrop-filter: blur(10–14px)` + paper hairline at 12–14%. Used for the garage panels, tyre indicator label, session card |
| **Data badge** `.badge-replay` etc. | Existing `--gt-*` badges; always present on data views |
| **Tyre indicator** `TyreProgress` + `WheelArt` | Fixed bottom-right, cartoon wheel spins with scroll velocity, ring = page progress, pips = sections, click opens jump list. Plain SVG, no WebGL |
| **Nav** | Fixed; stacked serif/bold wordmark left, mark centre, theme dot + Pitwall pill + menu button right. Blurs in after 40px scroll. Menu = full-screen primary panel, giant links that turn serif italic on hover |
| **Footer** | Paper background, centred serif-italic pre-line, dark card with top notch + topo lines, giant statement, CTA, three link columns, primary legal bar |

## 8. Motion

| Use | Duration | Easing |
|---|---|---|
| Hover / micro | 200–300ms | `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)` |
| Card / panel | 400–700ms | `--ease-out` |
| Section reveals | 0.8–1.2s, stagger 0.06–0.12 | GSAP `expo.out` |
| Panel wipes (menu, preloader) | 0.7–0.8s | `expo.inOut` / `cubic-bezier(0.77,0,0.18,1)` |

- Smooth scroll: Lenis synced to GSAP ScrollTrigger (`hooks/useSmoothScroll.ts`). Use `scrollToTarget()` for jumps; never hijack scroll.
- Scroll-scrubbed effects use `scrub: 0.6–1`.
- Cursor effects stay subtle: max ~12px parallax, ~4° tilt.
- `prefers-reduced-motion`: no Lenis, no scrubbed animation, everything renders in its final state. Already wired; keep it that way.
- Pause anything animated when off-screen or the tab is hidden.

## 9. 3D

- **Car model:** `public/models/papaya-f1.glb` (2.6 MB, meshopt + WebP). Load via `components/three/RealCar.tsx`. Licence **CC BY-NC 4.0**: keep the credit (footer + `CREDITS.md`), no commercial use.
- **Livery is a shader, not a texture.** The chassis texture is a neutral shading map; `RealCar` colours it from the team (`liveryFrom(team.livery)`): body = primary, lower body + nose tip = dark accent, sidepod stripe = secondary. New team = new colours, same model.
- **Render modes:** `standard`, `toon` (cel shade + ink outline), `blueprint` (edges only).
- **Lighting recipe:** near-black world, one warm key from above, a primary-coloured rim from behind, a cool secondary fill, `StudioEnv` (procedural, no HDR downloads) at 0.25–0.8.
- **Performance rules:**
  - Mount a canvas once when it first nears the viewport (`useInView` → `seen`) and set `frameloop="never"` when it scrolls out. Never unmount/remount canvases while scrolling: that's what made scenes vanish.
  - Cap `dpr` at 1.5 for heavy scenes.
  - Anything that doesn't need to move live (e.g. the study cards) should be a **pre-rendered still** (`/lab/study` + `scripts`-style capture), not a canvas.
  - Lazy-load every 3D chunk (`React.lazy`).

## 10. Asset inventory for the internal frontend

Built but no longer on the landing page, ready to reuse in `/app`:

| Asset | File | Idea for the app |
|---|---|---|
| Chase-cam replay scene | `components/landing/WarpCar.tsx`, `Warp.tsx` | Replay loading / scrub transition; tyre trails could encode real speed |
| Study stills (toon / blueprint / rim) | `public/studies/papaya-0{1,2,3}.webp`, `Studies.tsx` | Driver/team cards, empty states |
| Block-wipe thesis | `components/landing/Manifesto.tsx` | Onboarding / section intros |
| Pitwall module cards | `components/landing/Pitwall.tsx` | App home / module picker |
| Ferrofluid (React Bits) | `components/reactbits/Ferrofluid` (preview `/lab/ferro`) | Tyre / grip visualisation background |
| Power unit (exploded, labelled) | `components/three/PowerUnit.tsx`, `puParts.ts` | Strategy / ERS explainer |
| Procedural car + loft tool | `components/three/F1Car.tsx`, `loft.ts` | Lightweight fallback car |
| Topo contours | `components/landing/Topo.tsx` | Panel backgrounds |
| Tyre wheel art | `components/landing/WheelArt.tsx` | Compound / stint icons |
| Silverstone path (real data) | `data/circuit.ts` | Any circuit thumbnail |
| Model test bench | `/lab` (`?real`, `?mode=toon|blueprint`, `?view=top|side|rear`) | Checking renders |

## 11. Applying it to `/app`

- App chrome: `--team-darker` base, `--team-dark` panels, paper hairlines, HUD-card treatment for floating panels.
- Page titles use the headline pattern at a smaller scale (`clamp(28px, 3vw, 44px)`), with one serif-italic word.
- Kickers (`02 · RACE CONTROL`) above every panel title.
- Primary is for the *selected* thing only: selected driver, active tab, playhead. Data series stay on `--gt-data-*`.
- Keep the data-mode badge visible on every data view.
- Use the tyre indicator pattern for long scrolling views; skip it in dense dashboards.

## 12. Do / Don't

| Do | Don't |
|---|---|
| One team colour per screen | Mix team colours, or use pure `#fff` / `#000` |
| One serif-italic word per headline | Serif for body text or whole headlines |
| Textured dark surfaces | Flat grey panels |
| Pre-render what doesn't need to move | Ship a WebGL canvas for a static image |
| Label every number's data mode | Invent numbers for decoration |
| Credit third-party assets | Use team or sponsor logos (colours only) |
