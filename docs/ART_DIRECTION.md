# Art direction — reconciliation layer

**Status:** canonical. **Date:** 2026-10-19.

This document reconciles every art-direction source in the repo against the single
governing spec, `docs/ART_DIRECTION_MASTER.md`. It exists so no future agent has to
guess which instruction wins when two documents disagree.

## Source hierarchy (highest authority first)

1. **`docs/ART_DIRECTION_MASTER.md`** — the project owner's directive
   (2026-10-18). Authoritative for all UI work: concept (CARBON / CHALK / SIGNAL),
   exact color system, typography, spatial rules, app architecture, per-module
   specifications, motion, responsive, accessibility, testing, task graph, visual
   acceptance gate, final directive.
2. **This document** — conflict resolution, supersessions, provenance notes.
3. **Derived specs** — `docs/UI_UX_SPECIFICATION.md` and the art-direction
   sections of `docs/DESIGN_SYSTEM.md`. These elaborate the master; they never
   contradict it.
4. **Historical design docs** — `docs/LANDING_PAGE_DIRECTIVE.md`,
   `docs/DESIGN_SYSTEM.md`'s Build-1 token tables, older ADRs. Kept for provenance;
   superseded clauses are listed below and must not be followed.
5. **Code** — `frontend/src/styles/tokens.css` is the runtime source of truth for
   token *values*; master §4 is the source of truth for which tokens must *exist*.

When any two layers disagree, the higher layer wins and the lower layer is updated
in the same build.

## Supersessions

| Source | Clause | Superseded by | Because |
|--------|--------|---------------|--------|
| `docs/LANDING_PAGE_DIRECTIVE.md` §6 | "Three.js/GSAP bundles are not justified" (no-3D landing) | Master directive (3D single-seater hero, spatial circuit stage) + ADR-012 | The resurrection directive is the newest explicit user instruction; it requires a genuine 3D landing experience, so the no-3D constraint is void. |
| `docs/LANDING_PAGE_DIRECTIVE.md` §2 | SVG "Signal Lap" flat hero (`CircuitPath` + `SingleSeater` SVGs) | Master §3 creative concept — cinematic 3D scene | Flat top-down SVG is explicitly called out in the directive plan as what the resurrection replaces; shipping it again fails the acceptance gate. |
| `docs/LANDING_PAGE_DIRECTIVE.md` §9 | Original acceptance gate | Master §27 visual acceptance gate | The master gate is broader (28 checks incl. token, layout, state, motion checks). The old gate's checks remain satisfied *in addition* where they don't conflict. |
| ADR-005 | "Custom SVG/D3 visualizations, no 3D library" (charts and scenes) | ADR-012 | Scene rendering now uses Three.js / React Three Fiber. Charts, circuit overlays, and data plots remain SVG/D3 — ADR-005 is narrowed, not void: it still governs *data* visualization. |
| Master §26 task graph numbering | Docs referring to "§19 task graph" | Correct numbering: task graph = **§26**, visual acceptance gate = **§27**, final directive = **§28** | §19 of the master is PREDICTION ARENA. `docs/BUILD_LOG.md` and todo labels inherited the wrong number. |

Reconstructed, not verbatim: the original DEPTH-spec text (Race Ribbon details,
crosshair geometry, circuit-stage camera presets) is **not present in this
repository** (grep-confirmed). Its requirements were reconstructed from the
pre-resurrection requirement list carried in the session that authored this
document. Every reconstructed requirement is implemented and reviewed against
`docs/UI_UX_SPECIFICATION.md`; treat that spec as the written form of DEPTH for
subsequent work. If the original DEPTH spec resurfaces, diff it against
`docs/UI_UX_SPECIFICATION.md` and fold deltas into the master hierarchy.

## What stays

- **Data honesty rules** (master §24, `AGENTS.md`): LIVE / REPLAY / ESTIMATE /
  SIMULATION / UNAVAILABLE labelling, no invented gaps or lap times, every number
  traceable to a cached API response or deterministic transform. Unaffected by the
  resurrection.
- **Build-1 component vocabulary** that already matches the master: badge, timing
  row, event card, panel, scrubber — restyled to `--gt-*` tokens, not rewritten.
- **ADR-006 / ADR-008 / ADR-010** deployment stack (Vercel, FastAPI lambda, SPA
  rewrites). Art direction does not touch deployment.
- **Prohibition on unauthorized marks** (master §8): no F1 / FIA / team / driver
  logos; the GRIDTRACE wordmark and its circuit-telemetry-grid mark are original.
  Three.js and R3F are MIT-licensed — no license blocker (ADR-012).

## Task graph mapping

The master's §26 task graph (P0/P1/P2 priorities, dependency-ordered) is executed
through this session's task list. Mapping:

| Session task | Master §26 items | Master section |
|--------------|------------------|----------------|
| A — audit current UI vs CARBON/CHALK/SIGNAL + DEPTH | precondition for all | §3, §4, §27 |
| B — write art-direction docs (this batch) | documentation lock-in | §25 permanent documentation |
| C — 3D assets (original non-branded single-seater) | P0 scene foundation | §3, §8 |
| D — cinematic 3D landing hero | P0 landing experience | §3, §9 (landing) |
| E — spatial circuit stage + custom crosshair + Race Ribbon | P0 core visualization | §9, §11, §12 |
| F — 4-region layout + editorial race control + microinteractions | P0 app shell | §10, §11, §20 |
| G — visual acceptance gate | verification | §27 |
| H — final report | closure | §28 |

P0 content the resurrection inherits unchanged from Build 6 baseline: data
normalization/caching, position table, shared race clock, historical replay,
two-driver telemetry comparison, tests. These are restyled, not rebuilt.

## Non-negotiables (verbatim in force)

- Master §2 execution rules: docs-first, no fabricated data, no fake effects,
  comment-free code unless asked, gates before commit.
- Master §27 item: *"if the result still looks like the current screenshots with
  extra effects, the redesign is incomplete."*
- `AGENTS.md`: label every view's data mode; never show LIVE without a live feed;
  push only to `ashwinwork`; README rides with every commit.
