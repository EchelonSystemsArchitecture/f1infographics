# GRIDTRACE — UI Handoff (for Vairaj)

**Scope boundary (master directive):** The functional overhaul deliberately does
**not** touch visual design. All CSS/Tailwind, tokens, typography, layout,
sidebar, landing art direction, circuit-map treatment, 3D/visual assets,
animations, and responsive styling are **yours**. This doc tells you what the
functional work changed, what wiring exists, and the recommended order for the
deferred design skills.

**Branch:** `ashwinwork` · **Live:** https://gridtrace.vercel.app

---

## A. What the functional work changed in the UI (wiring only)

1. **SessionPicker** (`routes/app/SessionPicker.tsx` + `.css`) — now browses the
   **all-race catalog**: a season `<select>` + a full event list. Ingested events
   are pickable (`REPLAY · CACHED COVERAGE`); the rest are disabled
   (`NOT INGESTED`). Two minimal token-based CSS rules were added
   (`.picker__season*`, `.picker__item--disabled`) — restyle freely, keep the
   behavior.
2. **`api/client.ts`** — new typed methods `seasons()`, `yearEvents()`,
   `capabilities()` + models. No visual change.
3. Everything else in the UI is **unchanged**. The nav still shows Race
   Intelligence / Strategy / Driver / Constructor / Vault / Prediction /
   Settings as `disabled: true` ("soon") — the **backends** for Race Intelligence
   now exist (see §C), but their **UIs are not built yet**.

## B. New backend surfaces you can wire UI to

| Endpoint | Returns | UI opportunity |
|---|---|---|
| `GET /api/seasons` | `SeasonSummary[]` | season picker (done) |
| `GET /api/seasons/{y}/events` | `CatalogPage` | vault / session browser (done in picker) |
| `GET /api/seasons/{y}/rounds/{r}/capabilities` | `CapabilityReport` | per-event data-channel badges / empty states |
| `GET /api/session/{k}/intelligence` | `RaceIntelligence` | **Race Intelligence module** (new) |
| `GET /api/session/{k}/state?t=` | `StateAtTime` | now ~65× faster — safe to drive richer track/timing views |

`RaceIntelligence` fields ready for visualization: `flag_periods`
(SC/VSC/RED intervals), `pit_aggregates` (stops/total/avg per driver),
`top_overtakers` / `most_overtaken`, `position_movers` (grid→finish Δ),
`lead_changes`.

## C. Module status (functional)

| Module | Backend | Frontend | Notes |
|---|---|---|---|
| Race Control | ✅ | ✅ | existing |
| Battle Lab | ✅ | ✅ | existing |
| Catalog / Session picker | ✅ | ✅ | Build 19/20 |
| Race Intelligence | ✅ (Build 21) | ❌ "soon" | wire UI to `/intelligence` |
| Strategy Lab | ❌ | ❌ | engine not built |
| Driver Lab | ❌ | ❌ | engine not built |
| Constructor Lab | ❌ | ❌ | engine not built |
| Race Vault | ✅ (catalog) | partial (picker) | richer vault UI = yours |
| Prediction Arena | ❌ | ❌ | engine not built (free, non-monetary, temporal validation) |
| Settings / diagnostics | ❌ | ❌ | not built |

## D. Recommended design-skill execution sequence (deferred skills)

These were **mapped, not executed** (out of functional scope). Run them in this
order when you do the visual work:

1. **design-system** — reconcile any new controls (season select, capability
   badges) into `DESIGN_SYSTEM.md` + `tokens.css`.
2. **ui-ux-pro-max** / **impeccable** / **taste-skill** — direction for the new
   modules (Intelligence, Strategy, Vault, Prediction) so they match the
   pitwall aesthetic; keep CARBON/CHALK/SIGNAL.
3. **ui-ux-engineering** / **creative-web** — build the module layouts with
   strong hierarchy.
4. **interaction-design** — states for every control (loading / unavailable /
   error / capability-driven empty states).
5. **accessibility** — keyboard + contrast + reduced-motion for new views.
6. **frontend-polish** / **visual-qa** — spacing, typography, consistency pass;
   then headless-Chrome + mobile `scrollWidth` checks.
7. **motion-design** — any new animation, reduced-motion-safe.
8. **elk-*** (5) — only if adding scroll/entry animations; measure with
   elk-animation-performance.
9. **3d-web** — only for a new WebGL hero/scene (ADR-012 keeps WebGL to the
   landing hero; the circuit stage stays CSS-perspective).

## E. Honest-state conventions to preserve (do not regress)
- Every view labels its data mode: `LIVE / REPLAY / ESTIMATE / SIMULATION /
  UNAVAILABLE`. Never show `LIVE` without a real feed — past sessions are
  `REPLAY`.
- Non-ingested catalog events must stay visibly `NOT INGESTED` (disabled).
- Missing channels → `UNAVAILABLE`, never faked numbers.
- The capability report's `note` explains why a channel is what it is — surface
  it in empty states rather than a blank panel.

## F. How to run + verify
- Backend: `cd backend && .venv/bin/python -m uvicorn app.main:app --port 8000`
- Frontend: `cd frontend && npm run dev` (proxies `/api` → `:8000`).
- Open `/app`, click the sidebar session button → the catalog picker.
- Gates: `npx tsc --noEmit`, `npx oxlint`, `npx vitest run` (frontend);
  `cd backend && .venv/bin/python -m pytest` (53 tests).
