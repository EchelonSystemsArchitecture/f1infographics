# GRIDTRACE — THE DEFINITIVE MASTER DIRECTIVE
## Product Engineering · Art Direction · Design System · UI/UX · Data Intelligence · Execution

**Product:** GRIDTRACE  
**Category:** Interactive motorsport intelligence web application  
**Tagline:** Every gap tells a story.  
**Creative direction:** CARBON / CHALK / SIGNAL  
**Visual philosophy:** The annotated engineer's circuit notebook, transformed into a precision digital instrument.  
**Primary experience:** Replay → Compare → Understand → Experiment.  
**Platform:** Browser-based web application, optimized for desktop and adapted for tablet and mobile.

> Source: project owner directive (2026-10-18). Authoritative for all UI work.
> Reconcile older docs (`docs/DESIGN_SYSTEM.md`, `docs/UI_UX_SPECIFICATION.md`) against this
> rather than overwriting valuable existing implementation. Known deltas to reconcile:
> palette token names/values (e.g. `--gt-signal` now `#FF5B49`, new `--gt-void`,
> `--gt-surface-inset`, expanded border/semantic/telemetry palettes), spacing/radius token
> names (`--gt-space-*`, `--gt-radius-*`), and motion tokens.

---

# 0. THE MISSION

Build GRIDTRACE into an exceptionally designed, technically credible, genuinely interactive motorsport intelligence platform.

You are responsible for the complete product experience: repository inspection, research, architecture, art direction, design-system implementation, frontend engineering, backend integration, motorsport data processing, testing, visual verification, accessibility, performance, documentation, and release readiness.

Your job is not to generate a dashboard that looks acceptable in a screenshot.

Your job is to build a product that remains impressive when someone uses it, investigates real data, explores a race, interacts with the charts, encounters missing information, resizes the browser, and asks how the underlying calculations work.

We want the visual confidence of a premium engineering instrument, the character of a meticulously annotated motorsport fieldbook, and the usability of an excellent analytical web application.

We do not want an ordinary AI-generated SaaS dashboard with a charcoal background, generic cards, randomly applied gradients, fake charts, oversized statistics, and superficial animations.

**Every major visual decision must be intentional. Every major interaction must work. Every analytical claim must be defensible.**

This is the authoritative product and design directive. If older project documents conflict with it, inspect their context, preserve valuable existing implementation, and reconcile the documentation rather than blindly overwriting work.

## 0.1 What makes this project successful?

The product must excel in four dimensions simultaneously.

**Visual identity:** GRIDTRACE must have its own instantly recognizable design language.

**Analytical utility:** Its maps, timing, telemetry, events, and comparisons must work together meaningfully.

**Technical credibility:** Data, calculations, source coverage, and model limitations must be handled honestly.

**Interaction quality:** Users should naturally discover useful information without fighting the interface.

Do not maximize the number of visible features at the expense of these four objectives.

Do not claim that any product is objectively the best in the industry. Instead, use measurable quality gates, competitive research, and continuous verification to make GRIDTRACE as exceptional as practical.

---

# 1. PRODUCT DEFINITION

## 1.1 The concept

GRIDTRACE is an interactive motorsport intelligence platform that complements real race broadcasts.

It brings together:

- Circuit visualization.
- Driver positions and race classification.
- Session timing.
- Speed, throttle, braking, gear, and RPM when available.
- Lap and sector analysis.
- Tyre and stint information when available.
- Driver and constructor statistics.
- Historical race exploration.
- Synchronized replay.
- Evidence-backed explanations.
- Winner probabilities.
- Alternative strategy calculations.

The product must connect these capabilities through a consistent data model and a shared understanding of the selected race moment.

## 1.2 The three layers

### OBSERVE — What happened?
Circuit map, running order, gaps, session status, lap timing, telemetry, and event timeline.

### INVESTIGATE — Why did it happen?
Driver comparisons, sector-time differences, battle progression, stint analysis, relevant historical information, and supporting evidence.

### EXPERIMENT — What might happen otherwise?
Alternative pit-stop scenarios, pace assumptions, forecast comparisons, modeled outcome ranges, and prediction evaluation.

These are three connected layers of one application, not three unrelated projects.

## 1.3 The signature workflow

**Replay → Compare → Understand → Experiment.**

A user selects a historical race, jumps to a recorded moment, compares two drivers, identifies where the performance difference developed, opens the associated evidence, and tests an alternative strategy.

The circuit map, position table, telemetry traces, event timeline, and selected analysis must stay synchronized throughout the workflow.

## 1.4 Product priorities

The initial product must prioritize:

1. A polished, functional Race Control interface.
2. A verified historical session.
3. A shared race clock.
4. Interactive circuit visualization.
5. A functional position table.
6. Event-driven replay navigation.
7. A meaningful two-driver comparison.
8. A consistent, original design system.
9. Reliable missing-data and loading behavior.
10. Browser-tested functionality.

Profiles, predictions, advanced strategy modeling, live ingestion, and other capabilities should be integrated as their dependencies and verified scope allow.

---

# 2. EXECUTION RULES — TASKS, NOT DAYS

Do not organize implementation by calendar days, arbitrary hours, or fixed-duration phases.

Organize all work by dependencies, priority, parallelism, acceptance criteria, and actual verification.

## 2.1 Inspect before changing anything

Begin by inspecting:

- Repository structure.
- Existing instructions and `AGENTS.md` files.
- README files.
- Frontend and backend implementations.
- Framework and runtime versions.
- Package and build configuration.
- Routes and state management.
- Existing data providers.
- Design tokens and components.
- Tests and automation.
- Deployment configuration.
- Git status and uncommitted changes.

Run the existing project if possible.

Identify functioning features, architectural strengths, current defects, and missing functionality.

Preserve useful work. Do not perform destructive Git operations or replace the application without understanding its existing state.

## 2.2 Create a dependency-aware task graph

Maintain a project task tracker, preferably `TASKS.md`, containing:

- Task ID.
- Objective.
- Priority.
- Dependencies.
- Deliverables.
- Acceptance criteria.
- Verification method.
- Status.
- Blockers.

Use explicit task states such as `BACKLOG`, `READY`, `IN_PROGRESS`, `BLOCKED`, `VERIFYING`, and `DONE`.

## 2.3 Work on the critical path first

Identify which tasks unlock the largest number of dependent tasks.

A likely critical path is:

Repository audit → data verification → normalized contract → ingestion and caching → session snapshot interface → shared race clock → synchronized Race Control → Battle Lab → end-to-end verification.

Research, visual design, independent calculations, accessibility audits, and other genuinely separable tasks can proceed in parallel when safe.

Do not polish a dependent feature before its necessary data or interactions exist.

## 2.4 Parallelize intelligently

Use available coding agents or subagents for bounded, independent tasks.

Potential workstreams include:

- Product research and competitive analysis.
- Design-system implementation and UI audit.
- Data-provider research.
- Backend data processing.
- Independent testing and accessibility review.

Define shared interfaces and file ownership before parallel implementation.

Do not let multiple agents independently rewrite the same core components, data contracts, or state model.

The primary agent remains responsible for integration and final verification.

If parallel tooling is unavailable, continue sequentially without pretending independent work happened in parallel.

## 2.5 Continuous execution loop

Repeatedly:

1. Select the highest-priority ready tasks.
2. Resolve blocking dependencies.
3. Implement the required changes.
4. Run targeted checks.
5. Inspect actual rendered behavior where relevant.
6. Fix defects discovered.
7. Update the task tracker and documentation.
8. Select the next ready tasks.

Do not stop after writing documentation, generating a plan, or building a static mockup.

Do not claim successful browser testing without performing it.

Continue until the product acceptance criteria are met or a specific external limitation prevents further progress.

## 2.6 Research should lead to implementation

Use current documentation and relevant design references when they materially affect a decision.

Context7, Playwright, Stitch, browser tools, and parallel agents may be used when genuinely available and useful.

Do not claim to use unavailable tools.

Do not introduce dependencies merely because they are fashionable.

Document meaningful decisions, implement them, and keep the documentation consistent with the actual product.

---

# 3. THE DEFINITIVE CREATIVE CONCEPT

# CARBON / CHALK / SIGNAL

This is the central art direction for GRIDTRACE.

The product should feel like a race engineer's annotated circuit notebook has evolved into a precise, interactive digital instrument.

The visual identity consists of three complementary materials.

## CARBON

The structural environment.

Deep graphite, engineered surfaces, disciplined contrast, fine borders, compact information layouts, and a sense of technical precision.

## CHALK

The analytical drawing language.

Drafted circuit geometry, measurement references, sector marks, technical annotations, fine construction lines, and editorial explanations of selected moments.

Chalk is not a literal paper texture applied to the entire application. It is a visual metaphor for technical drawings and the act of investigating a race.

## SIGNAL

The selective emphasis.

A distinctive vermilion-red brand accent, precisely applied to selected interactions, important events, highlighted differences, and active investigative states.

Signal gives the product personality without turning every component into a neon sign.

The intended result is a restrained, recognizable, high-precision visual identity.

**Do not interpret this concept as permission to put random sketch marks around every panel. The sketch language must be purposeful, controlled, and connected to the analytical meaning of the interface.**

---

# 4. EXACT COLOR SYSTEM

Build the full semantic color system before implementing the majority of the interface.

The following palette is the required initial direction. Refine individual values when actual contrast testing and browser rendering identify an issue, but do not casually replace the identity with a generic palette.

All recurring colors must be centralized in design tokens. Do not scatter raw color values throughout the application.

## 4.1 Foundation palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-void` | `#080A0D` | Deepest application background and limited visual separation |
| `--gt-canvas` | `#0B0E12` | Primary application canvas |
| `--gt-surface-1` | `#10151A` | Navigation, foundational panels, and large surfaces |
| `--gt-surface-2` | `#151B22` | Raised analytical surfaces and selected work areas |
| `--gt-surface-3` | `#1C242D` | Hover surfaces, active regions, and inset controls |
| `--gt-surface-4` | `#252F3A` | Strongly emphasized surfaces where necessary |
| `--gt-surface-inset` | `#0D1116` | Recessed chart areas and compact information fields |

The background hierarchy should remain subtle.

Do not treat every surface as a separate floating card.

Use the canvas, integrated panels, dividers, and inset regions to establish composition.

## 4.2 Border and structure palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-border-faint` | `#202830` | Very subtle separations |
| `--gt-border-subtle` | `#29323D` | Panel dividers and structural lines |
| `--gt-border-default` | `#35414E` | Input borders and normal component boundaries |
| `--gt-border-strong` | `#4A5969` | Selected or strongly differentiated structure |
| `--gt-grid-line` | `#222C35` | Low-contrast graph and drafting grid lines |
| `--gt-grid-line-strong` | `#35424E` | Important chart divisions and section boundaries |

Borders should create structure, not box every individual element.

Use stronger lines only when they improve comprehension.

## 4.3 Typography palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-text-primary` | `#F1F4F7` | Principal labels and important measurements |
| `--gt-text-secondary` | `#B1BBC6` | Secondary labels and supporting information |
| `--gt-text-muted` | `#84909D` | Axis labels, metadata, and tertiary information |
| `--gt-text-disabled` | `#626E7B` | Disabled controls and inactive elements |
| `--gt-text-inverse` | `#10151A` | Text on sufficiently bright surfaces |
| `--gt-text-on-signal` | `#111315` | Text on verified bright brand-action surfaces where contrast permits |

Primary measurements must remain highly legible.

Muted text is for genuinely secondary information, not critical results.

Validate all combinations in the rendered application.

## 4.4 Brand Signal palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-signal` | `#FF5B49` | Primary brand accent and major actions |
| `--gt-signal-hover` | `#FF7665` | Hover treatment |
| `--gt-signal-active` | `#E94837` | Pressed or active treatment |
| `--gt-signal-subtle` | `#331B1A` | Restrained selected backgrounds |
| `--gt-signal-line` | `#7E322C` | Subtle emphasis line or analytical reference |
| `--gt-signal-muted` | `#C94F42` | Lower-intensity red emphasis where needed |

Signal red is deliberately warm and slightly vermilion rather than electric magenta or generic purple.

Use it for:

- Primary calls to action.
- Selected high-priority actions.
- Active investigation indicators.
- Important event references.
- Editorial redline annotations.
- A selected focus state when the context calls for brand emphasis.

Do not color every active tab, every chart trace, every border, and every icon red.

The brand accent must retain visual significance because it is used selectively.

## 4.5 Telemetry palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-data-cyan` | `#61D9E8` | A primary telemetry series |
| `--gt-data-blue` | `#7DAEFF` | A second data series |
| `--gt-data-amber` | `#F3C16C` | A distinct comparison or measurement |
| `--gt-data-violet` | `#B7A3FF` | An additional comparison series |
| `--gt-data-mint` | `#79D7B1` | An additional data series |
| `--gt-data-rose` | `#FF8FB5` | An additional comparison series |
| `--gt-data-orange` | `#FF9D70` | An additional series |
| `--gt-data-chalk` | `#D5DDE4` | Neutral or reference measurements |

Maintain consistent color assignments within a comparison and across linked visualizations.

Do not assign colors according to arbitrary array order if that changes between renders.

Use stable mapping from driver or series identity.

Avoid relying exclusively on color to distinguish lines. Use line style, markers, labels, or interaction where needed.

**The primary brand color is not automatically a telemetry-series color.** Keep the meaning of the brand accent distinct from the meaning of individual series unless an explicit mapping is established.

## 4.6 Semantic status palette

| Token | Hex | Intended use |
|---|---|---|
| `--gt-success` | `#75D9A0` | Verified successful outcomes |
| `--gt-warning` | `#F2BF69` | Warnings and important cautions |
| `--gt-danger` | `#FF737A` | Errors and critical conditions |
| `--gt-info` | `#77BFFF` | Informational status |
| `--gt-neutral-status` | `#A0ACB9` | Neutral status |
| `--gt-live` | `#FF6A58` | Genuine live-status marker when live data is active |
| `--gt-replay` | `#80B6FF` | Recorded replay mode |
| `--gt-estimate` | `#B7A3FF` | Estimated or model-derived output |
| `--gt-simulation` | `#F2BF69` | Hypothetical scenario |

A status color does not replace a textual label.

For example, a red indicator by itself must not be the only way to identify live data.

## 4.7 Driver and constructor series mapping

Assign each selected driver or constructor an identity that remains consistent within the session and comparison.

Use deterministic mappings and store them centrally.

A driver's color should match across:

- The circuit.
- The timing table.
- The telemetry legend.
- The relevant chart traces.
- Driver comparison controls.
- Event details where appropriate.

If the data contains more drivers than the most distinguishable palette entries, use additional visual differentiation rather than generating visually indistinguishable colors.

## 4.8 Color rules

1. Use semantic tokens rather than hard-coded values.
2. Validate text contrast.
3. Keep status meaning consistent.
4. Do not use red indiscriminately.
5. Preserve stable driver-series identity.
6. Do not communicate essential information with color alone.
7. Distinguish selected, focused, hovered, active, disabled, and unavailable states.
8. Verify that every palette choice works with actual charts and realistic data.
9. Avoid overwhelming the screen with the entire palette.
10. Use additional colors when the data requires them, not as random decoration.

## 4.9 Light theme

Dark mode is the primary GRIDTRACE identity.

If a light theme can be implemented without compromising the core product, give it an independently designed, high-quality palette.

Do not simply invert the dark theme.

Define appropriate light-theme mappings for surfaces, borders, typography, charts, drivers, annotations, selection, focus, and status.

Both themes must use the same semantic design-token names.

---

# 5. TYPOGRAPHY SYSTEM

Typography is part of the product's analytical precision.

Do not treat it as an afterthought.

## 5.1 Primary interface typeface

Prefer **Geist Sans** or **Inter** for the general interface, subject to the existing project dependencies and actual rendering quality.

Use one primary family consistently.

## 5.2 Numerical and technical typeface

Prefer **IBM Plex Mono** or **JetBrains Mono** for:

- Lap times.
- Gaps.
- Sector differences.
- Telemetry measurements.
- Lap counts.
- Timestamps.
- Measurement references.
- Compact technical identifiers.

Use tabular numerals where available.

## 5.3 Typography scale

Use the following as an initial desktop scale.

| Role | Font size | Weight | Typical use |
|---|---:|---:|---|
| Display statement | 30–36 px | 550–650 | Initial session-selection experience only |
| Page title | 22–26 px | 600 | Main module heading |
| Section title | 15–18 px | 600 | Panel and section headings |
| Body | 13–15 px | 400–500 | Main explanatory text |
| Interface label | 11–13 px | 500–600 | Navigation, controls, and labels |
| Metadata | 10–12 px | 400–500 | Source, session, or secondary context |
| Main numerical readout | 18–28 px | 500–650 | Significant performance measurement |
| Table measurement | 12–14 px | 450–550 | Gaps, timing, and statistics |
| Technical annotation | 10–12 px | 400–500 | Track references and editorial callouts |

Do not make the entire interface oversized.

Analytical screens should use typography economically so more useful information fits into a smaller space.

## 5.4 Number formatting

Define consistent formatting rules for:

- Time.
- Lap numbers.
- Sector times.
- Gaps.
- Speeds.
- Percentages.
- Distances.
- Missing measurements.

Always show units where ambiguity is possible.

Align comparable numerical values.

Avoid showing different decimal precision for comparable measurements without a reason.

---

# 6. SPATIAL SYSTEM AND COMPONENT GEOMETRY

Create a coherent spacing, radius, and layout system.

## 6.1 Spacing tokens

Use an initial four-pixel base scale.

| Token | Value | Typical purpose |
|---|---:|---|
| `--gt-space-1` | 4 px | Icon/text separation and tiny internal gaps |
| `--gt-space-2` | 8 px | Compact control spacing |
| `--gt-space-3` | 12 px | Table and component spacing |
| `--gt-space-4` | 16 px | Standard panel padding |
| `--gt-space-5` | 20 px | Expanded group spacing |
| `--gt-space-6` | 24 px | Section separation |
| `--gt-space-8` | 32 px | Major layout gaps |
| `--gt-space-10` | 40 px | Large section separation |
| `--gt-space-12` | 48 px | Major layout margins when justified |

Do not insert extra whitespace just to make the interface look luxurious.

Data-intensive screens must remain dense enough to be useful.

## 6.2 Radius tokens

| Token | Value | Purpose |
|---|---:|---|
| `--gt-radius-xs` | 3 px | Compact technical indicators |
| `--gt-radius-sm` | 5 px | Inputs and small surfaces |
| `--gt-radius-md` | 7 px | Standard panels and buttons |
| `--gt-radius-lg` | 10 px | Large interactive regions |
| `--gt-radius-xl` | 14 px | Exceptional large surfaces |
| `--gt-radius-pill` | 999 px | Compact status tags only where appropriate |

The visual character should be predominantly precise and restrained.

Do not make every component a large rounded pill or heavily rounded card.

Use square corners where they improve the technical appearance and maintain clarity.

## 6.3 Shadow and elevation

Use the smallest amount of shadow required to communicate elevation.

Prefer border contrast and surface differentiation over heavy shadows.

Avoid the floating-stack effect commonly found in generic dashboard templates.

---

# 7. THE ANNOTATED ENGINEER'S NOTEBOOK

This is the distinctive graphic language that separates GRIDTRACE from a conventional telemetry dashboard.

Sketch-inspired elements must be custom, purposeful, and integrated with data.

## 7.1 Drafting motifs

Develop original vector-based motifs for:

- Circuit geometry.
- Corner references.
- Sector divisions.
- Measurement ticks.
- Coordinate guides.
- Trajectory paths.
- Lap references.
- Registration marks.
- Measurement brackets.
- Editorial leader lines.
- Selected-location callouts.

Use low-contrast construction lines that become more visible only when relevant.

Keep real measurements more prominent than decorative lines.

## 7.2 Annotations

Create a consistent visual language for editorial callouts.

Examples:

- A fine leader line identifying a selected corner.
- A redline around a significant time difference.
- A numbered reference connected to a race event.
- A compact note explaining a sector comparison.
- A measurement bracket showing the span of a selected interval.
- A small coordinate-style label referencing a track position.

Do not turn measurements into handwritten-looking text.

Numerical data remains precisely typeset.

Use sketch-inspired character primarily for analytical notes, circuit references, and selected events.

## 7.3 Line quality

Use clean vector strokes with carefully chosen thickness and contrast.

A possible hierarchy:

- Primary circuit line: 2–3 px depending on scale.
- Selected trajectory: 2–3 px.
- Secondary drafting line: 1 px.
- Background construction geometry: approximately 1 px at very low opacity.
- Event leader line: 1–1.5 px.
- Important selected measurement: a more distinct line or marker.

Adjust these values according to the actual component dimensions.

Avoid noisy outlines and random scribbles.

## 7.4 Texture

If a subtle technical-paper or graphite texture improves the composition, implement it carefully.

Prefer lightweight CSS or SVG techniques over large external textures.

Keep texture extremely restrained.

Never sacrifice readability, performance, or accessibility for texture.

Do not place textures beneath dense text when they reduce contrast.

## 7.5 Where annotations belong

Use the greatest concentration of drafting details in:

- Circuit visualization.
- Battle Lab.
- Selected event analysis.
- Strategy comparison diagrams.
- Technical empty states.

Use fewer annotations in:

- Navigation.
- Ordinary forms.
- Long tables.
- Repetitive profile statistics.
- Secondary settings panels.

The annotation system must support the investigation, not overwhelm it.

---

# 8. ORIGINAL BRAND MARK AND ICONOGRAPHY

## 8.1 GRIDTRACE wordmark

Create an original GRIDTRACE wordmark using typography, proportion, and spacing appropriate for a premium motorsport intelligence product.

Do not create an illegible futuristic wordmark.

The name should work in a compact navigation area and a larger entry experience.

## 8.2 Logo concept

Develop a custom vector mark inspired by the intersection of:

- A racing circuit path.
- A telemetry trace.
- A measurement grid.
- A crossing or convergence that suggests discovering a performance difference.

The mark must be identifiable at small sizes and work in monochrome.

Do not copy an existing motorsport logo.

Do not use unauthorized F1, FIA, team, or driver marks.

## 8.3 Icons

Use one consistent icon family, such as Lucide, where appropriate.

Customize sizing, color, spacing, stroke, and interaction states to match the design system.

Do not use emojis as primary interface icons.

Make icons accessible through labels or tooltips where their meaning is not obvious.

## 8.4 Custom assets

Prefer custom SVG artwork for:

- The GRIDTRACE mark.
- Circuit drawings where suitable data exists.
- Sector references.
- Track-direction indicators.
- Analytical annotation primitives.
- Small visual explanations.

Do not depend on generated photographs or unrelated illustrations to make the analytical interface appear finished.

If design-reference tools are available, use them for exploration, then implement coherent production assets.

---

# 9. THE BROWSER APPLICATION ARCHITECTURE

GRIDTRACE is a **web application**.

Build and test it as a browser-based product.

Do not create Electron or Tauri wrappers, native application installers, operating-system-specific packaging, or unrelated desktop infrastructure as part of this mandate.

The frontend must work through a browser and be deployable as a web application.

A PWA may be considered only after the core web product is working and verified.

## 9.1 Preserve the existing stack

Inspect the repository first.

Reuse the existing frontend and backend structure where it is sound.

If a backend or frontend must be established from scratch, the preferred direction is:

Frontend:
- React.
- TypeScript.
- Vite.
- A coherent centralized styling and component system.

Backend:
- Python.
- FastAPI.
- Pydantic.
- pandas and NumPy where useful.

Visualization:
- Custom SVG or D3 for circuit geometry.
- A suitable charting library for telemetry and analytical plots.

Storage:
- Local cached historical data.
- SQLite if lightweight persistence is needed.
- PostgreSQL if justified by the actual requirements.

Do not introduce a large infrastructure stack for the sake of architectural appearance.

## 9.2 Data contract

Normalize data into stable internal models for:

- Session.
- Driver.
- Constructor.
- Lap.
- Telemetry sample.
- Race event.
- Prediction snapshot.
- Strategy scenario.

Preserve relevant units, source identifiers, timestamps, and provenance.

## 9.3 Data sources

Investigate and verify:

OpenF1: https://openf1.org/docs/

FastF1: https://github.com/theOehrly/Fast-F1

Jolpica-F1: https://api.jolpi.ca/docs/

Use these providers according to their capabilities and applicable terms.

Do not assume every provider contains every metric.

Do not assume publicly accessible data can be redistributed without restrictions.

## 9.4 Historical-first reliability

The initial core experience should use a verified historical session with enough data to support circuit visualization, timing, replay, and comparisons.

Cache the selected dataset when appropriate.

The application must remain useful during external data-source failures.

Never present a recorded replay as a current live event.

---

# 10. PRIMARY APPLICATION SHELL

The application should prioritize desktop use because race analysis benefits from multiple visible panels.

Use a consistent application shell, but allow major modules to differ according to their purpose.

## 10.1 Navigation

Create a distinctive but restrained navigation system for:

- Race Control.
- Battle Lab.
- Race Intelligence.
- Strategy Lab.
- Driver Lab.
- Constructor Lab.
- Race Vault.
- Prediction Arena if implemented.
- Settings.

Keep the most important destinations prominent.

Do not make every module equally dominant.

## 10.2 Initial application state

When a session is selected, open Race Control as the primary workspace.

When no session is selected, provide a deliberate session-selection experience with:

- Recent or supported sessions.
- Available historical coverage.
- Clear selection controls.
- Data availability labels.
- A concise introduction to the product's capabilities.

Avoid a marketing landing page that delays access to the actual application.

## 10.3 Desktop layout

Use a strong desktop layout hierarchy.

A reasonable initial direction is:

- A compact primary navigation rail or sidebar.
- A consistent session header.
- A flexible main workspace.
- A prominent circuit-map region.
- A readable timing table.
- An analytical region for telemetry.
- A persistent or easily accessible replay timeline.

Let actual data density and viewport dimensions inform final proportions.

At a common desktop viewport around 1440 × 900, the main interface should expose the essential race context without forcing the user through excessive scrolling.

Do not rigidly force all components into an identical arrangement when different modules need different layouts.

## 10.4 Avoid the card-wall effect

Do not place every element inside a separate rounded rectangle.

Use:

- Tables for structured information.
- Integrated surfaces for related analytics.
- Dividers for section separation.
- Inset backgrounds for appropriate charts.
- Lightweight headings for panel identity.
- Explicit borders for meaningful interaction boundaries.

Use cards only when they improve grouping or interactive meaning.

---

# 11. RACE CONTROL

Race Control is the principal race-viewing interface.

## 11.1 Session header

Display the selected event, season, session type, circuit, session time or lap, data mode, and relevant update information.

The header must distinguish genuine live data from replay.

## 11.2 Circuit map

The circuit should be a major visual element and one of the product's signatures.

Support where the data permits:

- Circuit outline.
- Corner identifiers.
- Sector boundaries.
- Driver positions.
- Selected drivers.
- Two-driver comparisons.
- Event locations.
- Track-distance references.
- Relevant measurement annotations.

Make the map interactive.

Selecting a driver highlights the relevant driver identity.

Selecting a supported track section should update the associated analytical context.

The circuit map and the timing table must refer to the same session state.

## 11.3 Position table

Build a compact, precise race classification table.

Potential fields:

- Position.
- Driver identifier.
- Interval.
- Gap to leader.
- Grid position.
- Positions gained or lost.
- Last lap.
- Best lap.
- Tyre compound where available.
- Stint age where available.
- Pace trend where supported.
- Recorded status.

Allow meaningful sorting, filtering, and driver selection.

Maintain consistent numerical alignment and units.

Do not display unsupported or fabricated measurements.

## 11.4 Event timeline

Provide navigation for supported recorded events.

Examples include:

- Position changes.
- Pit stops.
- Overtakes where reliably recorded.
- Race-control messages.
- Fast laps.
- Retirements.
- Significant calculated pace changes.

Every event must have a traceable timestamp or clearly defined time reference.

Selecting an event must seek the shared race clock and update linked views.

## 11.5 Main screen visual hierarchy

The circuit should be prominent but not consume space required for useful information.

The position table should remain readable.

Telemetry should be visible when relevant and expand naturally in analytical contexts.

The timeline should be easy to find and operate.

Maintain a purposeful balance among these regions rather than giving every element the same size and emphasis.

---

# 12. THE SHARED RACE CLOCK

The race clock is a critical piece of application architecture.

It must be a shared source of truth for the selected session time.

## 12.1 Required controls

Where relevant:

- Play.
- Pause.
- Seek.
- Playback speed.
- Lap navigation.
- Event navigation.
- Session-time display.

## 12.2 Shared behavior

When the selected time changes:

1. Resolve the relevant session snapshot.
2. Update the circuit visualization.
3. Update the position table.
4. Update telemetry context.
5. Update the event timeline.
6. Preserve selected-driver context.
7. Refresh linked calculations as appropriate.

Avoid independent timers inside separate visual components.

Avoid uncontrolled duplicate fetches.

Use a coherent shared state or service.

## 12.3 Determinism

Seeking to the same timestamp should reproduce the same underlying recorded state.

If interpolation is used to smooth rendered motion, ensure it does not alter or misrepresent the measured source values.

---

# 13. BATTLE LAB

This is the signature analytical module.

## 13.1 Driver selection

Allow users to choose two drivers and compatible laps or stints.

Preserve the selected session and the relationship to the source race.

## 13.2 Telemetry plots

Display supported data, such as:

- Speed.
- Throttle.
- Braking.
- Gear.
- RPM.
- Track distance.
- Lap time.
- Sector time.

Use clear axis labels and explicit units.

## 13.3 Alignment

Align two laps by track distance where suitable position data exists.

Do not assume identical timestamps imply equivalent circuit positions.

Show enough context for the user to understand the comparison.

## 13.4 Sector analysis

Calculate supported lap and sector differences.

Identify sections where an observed performance difference developed.

Do not claim causal explanations merely because two traces differ.

## 13.5 Visual design

The Battle Lab should feel like a dedicated engineering instrument, not a group of generic chart cards.

Use:

- Stable driver-series colors.
- Carefully aligned traces.
- Clear legends.
- Consistent units.
- Useful measurement cursors.
- Selected-point indicators.
- Compact analytical annotations.
- Meaningful selected-section highlighting.

## 13.6 Linked interaction

Where feasible, selecting a telemetry position should identify the corresponding track section.

Selecting an event should bring the relevant measurements into view.

Every comparison must be reproducible from the selected data.

---

# 14. RACE INTELLIGENCE

Build an evidence-oriented investigation experience.

## 14.1 Moment Finder

Use documented rules and recorded events to identify interesting moments, such as:

- Unusual gap changes.
- Significant position changes.
- Lap-time differences.
- Sector-level performance changes.
- Pit-stop-related events.

Avoid declaring every mathematical change a strategically important event.

## 14.2 Event explanation

For a selected moment, distinguish:

- Observed facts.
- Calculated metrics.
- Inferences.
- Unknowns.

Every important conclusion should link to supporting information when practical.

## 14.3 Race storyline

Summarize the selected race through relevant recorded events and calculated changes.

Allow the user to navigate back to the underlying event.

Do not use unconstrained AI text generation to fabricate explanations.

An AI assistant may be introduced later if it is grounded in retrieved records and validated calculations.

---

# 15. STRATEGY LAB

Provide a transparent environment for exploring hypothetical decisions.

## 15.1 Scenario editor

Support inputs that the model can genuinely evaluate, potentially including:

- Pit-stop lap.
- Tyre assumptions.
- Pace assumptions.
- Tyre degradation.
- Pit-stop time loss.
- Traffic assumptions.
- Relevant condition changes.

Do not add controls that have no meaningful effect on the model.

## 15.2 Baseline and alternative

Compare the recorded strategy with a modeled scenario.

Show modified inputs, projected differences, important assumptions, and uncertainty.

## 15.3 Truthfulness

Mark modeled outputs as estimates or simulations.

Never present a hypothetical result as a factual reconstruction.

Start with a transparent calculation if a more complex model is not justified.

---

# 16. WINNER PREDICTOR

Build an explainable forecasting interface.

## 16.1 Inputs

Use only appropriate, supported information, such as:

- Starting position.
- Historical performance.
- Current race position.
- Available lap pace.
- Gaps.
- Stint and tyre information.
- Pit stops.
- Remaining distance.

## 16.2 Output

Show:

- Forecast timestamp.
- Model version.
- Driver probabilities.
- Important contributing factors.
- Data limitations.
- Suitable uncertainty information.

## 16.3 Validation

Evaluate the forecast against historical results and a simple baseline.

Use appropriate probabilistic measures, such as calibration, Brier score, or log loss when practical.

Do not hard-code probability values and present them as real predictions.

---

# 17. DRIVER LAB AND CONSTRUCTOR LAB

## 17.1 Driver profiles

Display available historical metrics such as:

- Starts.
- Wins.
- Podiums.
- Pole positions.
- Fastest laps.
- Points.
- Qualifying outcomes.
- Finishing positions.
- Position changes.
- Supported pace comparisons.

## 17.2 Constructor profiles

Display available measured measures such as:

- Season points.
- Wins and podiums.
- Qualifying performance.
- Finishing results.
- Retirement-related statistics.
- Available pit-stop information.
- Historical performance comparisons.

## 17.3 Analytical honesty

Identify the relevant season, sample size and denominator when interpreting statistics.

Do not claim access to proprietary engineering data without legitimate evidence.

Do not draw strong conclusions from inadequate or incompatible samples.

---

# 18. RACE VAULT

Create a historical archive that links directly to the rest of the application.

Support navigation by season, event, circuit, or session where the data source permits.

Allow supported sessions to open in the same replay and analysis system used by Race Control.

Clearly identify whether results, timing, telemetry, stint information, and event records are available for each session.

Do not imply that every historical race contains modern telemetry.

---

# 19. PREDICTION ARENA

If the core experience is stable, implement a free, non-monetary prediction competition.

Potential capabilities:

- Predict a winner.
- Predict a podium.
- Predict fastest lap where applicable.
- Earn points through documented scoring.
- Compare predictions with friends or group members if user accounts exist.
- Inspect historical accuracy.

Do not introduce real-money wagering, deposits, odds-based betting, or cash-out mechanics.

Keep the feature secondary to the analytical product.

---

# 20. MOTION AND INTERACTION LANGUAGE

Motion must clarify the state of the product.

Define consistent movement and transition rules.

## 20.1 Motion tokens

Use an initial timing scale such as:

- Micro feedback: 100–140 ms.
- Standard interaction: 160–220 ms.
- Panel transition: 220–300 ms.
- Contextual chart transition: 180–260 ms.

Adjust according to actual browser testing.

Use appropriate easing that feels responsive without unnecessary overshoot.

## 20.2 Meaningful interactions

Design purposeful behavior for:

- Selecting a driver.
- Selecting a pair of drivers.
- Moving the replay playhead.
- Highlighting a track section.
- Selecting a recorded event.
- Revealing an annotation.
- Switching between observed and simulated data.
- Selecting a chart point.
- Expanding additional analytical detail.

## 20.3 Avoid distracting animation

No permanent background animations.

No random pulsing elements.

No decorative particles.

No fake live telemetry.

No animated values that imply a changing measurement when the underlying data is static.

Honor reduced-motion preferences.

All important controls must remain understandable when motion is disabled.

---

# 21. RESPONSIVE WEB EXPERIENCE

The product is a browser-based web application.

Desktop is the primary target because the analytical workflow benefits from multiple visible panels.

However, the implementation must adapt deliberately to smaller viewports.

## Desktop

Expose the circuit map, position table, session context, telemetry and replay controls in a coherent layout.

## Tablet

Allow the primary circuit and timing experience to remain available while less central panels become collapsible or tabbed.

## Mobile

Prioritize focused navigation among the circuit, leaderboard, telemetry, selected event and driver details.

Do not simply shrink the desktop layout until it becomes unreadable.

Keep tables horizontally navigable or provide a compact alternative.

Maintain readable numerical values and usable controls.

Do not introduce native desktop packaging.

Consider installable PWA functionality only after the core browser application is reliable and verified.

---

# 22. ACCESSIBILITY AND PERFORMANCE

## 22.1 Accessibility

Implement:

- Keyboard navigation.
- Visible focus indicators.
- Accessible names and labels.
- Proper semantic controls and tables.
- Non-color alternatives for essential distinctions.
- Suitable contrast.
- Reduced-motion support.
- Clear error messaging.

## 22.2 Performance

Avoid unnecessary chart redraws and uncontrolled network requests.

Use appropriate derived state, memoization, caching and efficient data selection.

Do not introduce these optimizations blindly; address measured or reasonably anticipated costs.

Keep the bundle and dependency footprint appropriate for the product.

## 22.3 Failure handling

Handle:

- Missing telemetry.
- Unsupported session fields.
- External API failures.
- Invalid scenario inputs.
- Empty session results.
- Stale cached data.
- Loading states.
- Failed calculations.
- Browser refreshes during replay.

Do not turn failures into fabricated values.

---

# 23. TESTING AND BROWSER VERIFICATION

Use the existing testing setup where appropriate.

Use Playwright if available.

Do not rely exclusively on compiling successfully.

## 23.1 Build checks

Run:

- The project's actual build.
- Available type checking.
- Existing linting.
- Existing tests.
- Relevant new tests.

## 23.2 Data tests

Test:

- Data normalization.
- Units and timestamps.
- Missing fields.
- Lap calculations.
- Position changes.
- Session selection.
- API response validation.

## 23.3 Replay tests

Verify:

- Playing and pausing.
- Seeking.
- Event navigation.
- Shared time state.
- Synchronized updates across linked components.
- Deterministic seeking.

## 23.4 Battle Lab tests

Verify supported measurements, trace alignment, comparison calculations, chart selection, and replay linkage.

## 23.5 Browser workflow

Test the full journey:

1. Open a supported session.
2. Inspect Race Control.
3. Select a driver.
4. Select a recorded event.
5. Seek to the relevant moment.
6. Open Battle Lab.
7. Compare two drivers.
8. Inspect the supporting measurements.
9. Return to the race timeline.
10. Open the related profile or historical view.

## 23.6 Visual verification

Inspect the real rendered application for:

- Incorrect hierarchy.
- Generic template appearance.
- Inconsistent spacing.
- Clipped labels.
- Poor numerical alignment.
- Broken charts.
- Missing selected states.
- Excessive decorative effects.
- Unintended horizontal overflow.
- Weak contrast.
- Inconsistent driver colors.
- Unusable small-screen layouts.

Take screenshots or record browser evidence where available.

Fix important defects discovered.

Never claim that browser testing succeeded unless it was actually executed.

---

# 24. DATA INTEGRITY AND INTELLECTUAL PROPERTY

Clearly identify every relevant data mode.

**LIVE:** Actual current data is being received.

**REPLAY:** Recorded session data is being inspected or played.

**ESTIMATE:** A model has produced an estimate or forecast.

**SIMULATION:** A hypothetical scenario is being explored.

**UNAVAILABLE:** The required data is missing or cannot be accessed.

Preserve source timestamps, units, identifiers and relevant transformations.

Verify the applicable terms of selected data providers.

Accessible APIs do not automatically grant unrestricted redistribution or commercial usage rights.

Use original GRIDTRACE branding, custom graphics and properly licensed resources.

Do not use broadcast footage or protected branding without appropriate authorization.

Research references:

- https://openf1.org/docs/
- https://github.com/theOehrly/Fast-F1
- https://api.jolpi.ca/docs/
- https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt

---

# 25. PERMANENT DOCUMENTATION

Create or update the following documentation as appropriate to the existing repository:

- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/PRODUCT_RESEARCH.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/UI_UX_SPECIFICATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES_AND_PROVENANCE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/TESTING_AND_QA.md`
- `docs/DECISIONS.md`
- `TASKS.md`

These documents must describe real implementation decisions, not generic aspirations.

Keep the design tokens and component rules consistent with the implementation.

Keep the task graph updated as tasks become ready, blocked, verified, or completed.

---

# 26. TASK GRAPH AND ACCEPTANCE PRIORITIES

Do not use fixed time schedules.

Use these priorities to determine task order.

## P0 — Essential connected experience

- Repository audit.
- Source and dataset verification.
- Data contract.
- Design tokens.
- Application shell.
- Data normalization and caching.
- Circuit map.
- Position table.
- Shared race clock.
- Event timeline.
- Historical replay.
- Two-driver telemetry comparison.
- Basic responsive behavior.
- Relevant tests and browser verification.

## P1 — Original product completeness

- Driver profiles.
- Constructor profiles.
- Historical archive.
- Evidence-based event analysis.
- Basic winner forecast.
- Strategy comparison.
- Stronger responsive layouts.
- Improved analytical annotations.

## P2 — Advanced differentiation

- Advanced strategy models.
- Forecast auditing.
- Data-grounded question answering.
- Saved comparisons.
- PWA installation if appropriate.
- Additional historical coverage.
- Additional motorsport categories.
- Personalization and collaboration.

These are dependency priorities, not calendar milestones.

Execute independent tasks in parallel when safe.

Prioritize tasks that unblock other tasks.

If a feature is blocked by an external requirement, document the blocker and continue independent work.

Do not sacrifice the core workflow for an optional feature.

---

# 27. VISUAL ACCEPTANCE GATE

Before considering the design system complete, verify all of the following against the real application.

1. The CARBON / CHALK / SIGNAL identity is visibly present.
2. The exact palette is implemented through semantic tokens.
3. Color assignments remain consistent across the interface.
4. Typography distinguishes numerical data from interface content.
5. The spacing and surface system is coherent.
6. The interface does not rely on generic dashboard templates.
7. The circuit map has a distinctive visual treatment.
8. Sketch-inspired annotations are purposeful and restrained.
9. Telemetry remains precise and legible.
10. The shared timeline has its own coherent visual and interaction language.
11. Major screens have appropriate individual hierarchies.
12. Buttons, tables, selectors, tooltips and charts have complete states.
13. The interface remains readable at relevant desktop sizes.
14. Responsive behavior remains coherent.
15. Motion supports functionality rather than decorating the interface.
16. Accessibility is tested.
17. Every important visualization uses real data or an explicitly identified demonstration state.
18. The final result has been inspected in a real browser or using the strongest available equivalent verification.

If the rendered interface still resembles a conventional dashboard template, do not consider the design work finished. Identify the reason and refine the composition, typography, map geometry, graphic language, interactions and visual hierarchy.

---

# 28. FINAL IMPLEMENTATION DIRECTIVE

Begin immediately.

**First:** Inspect the repository and identify the current application state.

**Second:** Build the dependency-aware task graph and determine the critical path.

**Third:** Verify the initial historical dataset and relevant technical documentation.

**Fourth:** Establish the design tokens and the CARBON / CHALK / SIGNAL visual system.

**Fifth:** Implement the connected Race Control and replay experience.

**Sixth:** Implement Battle Lab and verify the core analytical workflow.

**Seventh:** Continue with supporting and advanced features according to their dependencies and product value.

**Eighth:** Test the actual browser experience, fix defects, and update documentation.

Do not stop after generating files and documentation.

Do not implement a static mockup in place of actual interactions.

Do not substitute fabricated numbers for missing data.

Do not add native desktop packaging.

Do not claim a test passed unless it ran.

Work continuously through implementation, verification, correction and integration.

When the core experience is complete, continue with the highest-value available improvements until the acceptance criteria are met or a specific, documented external limitation prevents further progress.

Report the final implementation honestly, including what works, which tests were actually executed, known limitations, and how to run the web application.

---

# THE FINAL DESIGN PRINCIPLE

GRIDTRACE should feel like an engineer investigating a race.

The circuit geometry gives the experience its identity.

The telemetry supplies precision.

The annotations make the act of investigation tangible.

The palette establishes a recognizable brand.

The shared timeline connects the entire experience.

The analytical system explains what the evidence supports.

The strategy tools allow users to explore possibilities without confusing them with facts.

The interface must feel coherent because its visual design, interaction behavior, data model, and analytical purpose have all been developed together.

**Do not decorate a generic dashboard. Build an original motorsport instrument as a complete, functional web application.**

# GRIDTRACE

**Every gap tells a story.**
