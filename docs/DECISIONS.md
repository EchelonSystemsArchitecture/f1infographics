# Decisions (ADRs)

Lightweight: date, decision, context, consequences. Newest first.

---

## ADR-013 — Art-direction resurrection complete: §27 gate + §28 report shipped

**Date:** 2026-10-19
**Decision:** Tasks A–H of the art-direction resurrection (`ART_DIRECTION_MASTER.md` §26 task graph) are closed. Task G (§27 visual acceptance gate) passed **with refinements** after a SPATIAL-contrast fix; Task H (§28 final implementation report) shipped as `docs/FINAL_REPORT.md` and was deployed to production (`Build 12` / `08f5291`, https://gridtrace.vercel.app). No further §26 tasks remain open.
**Context:** The resurrection directive (issued 2026-10-18, post ADR-005) prescribed an 18-item visual gate and a final honest report. Builds 6–12 executed the task graph; the capture harness (playwright-core + headless Chrome + SwiftShader) produced the six gate screenshots; the §27 inspection found one red failure (SPATIAL contrast) which was fixed in `CircuitStage.css` and re-verified. The §28 report documents what works, tests actually run, known limitations (responsive multi-viewport, interactive motion, multi-session ingest, SECTOR camera), and how to run — with no fabricated numbers or false test claims.
**Consequences:** Future work outside the §26 graph (responsive pass, multi-session ingest, SECTOR geometry, POSITION-bar labelling) should be planned against the §27 open-items list in `docs/FINAL_REPORT.md` rather than inventing a new task graph. The capture harness at `/var/folders/.../gt-capture/capture.mjs` is the reference for any future gate re-run. Deploy cadence: milestone commits push to `origin/ashwinwork` and `vercel --prod --yes`.

---

## ADR-012 — 3D scenes: Three.js + React Three Fiber permitted (narrows ADR-005)

**Date:** 2026-10-19
**Decision:** Three.js (MIT) and `@react-three/fiber` / `@react-three/drei` (MIT) are permitted for the cinematic landing hero (single-seater) and the spatial Circuit Stage. This narrows ADR-005's "no 3D libraries" constraint, which stays in force for charts (SVG/D3 only) and everything outside the two named scenes. ADR-005 is **not** void — it still bars 3D for tables, race control, and analytical views.
**Context:** The art-direction resurrection (`ART_DIRECTION_MASTER.md`, issued 2026-10-18 after ADR-005) mandates a cinematic 3D landing scene and a camera-driven circuit stage. Those are impossible under the original constraint, and the resurrection directive is the newer, explicit owner instruction, so it wins (documented in `docs/ART_DIRECTION.md` supersessions). R3F keeps declarative React ownership of the scene graph, pairs with the React 19 toolchain, and is the ecosystem-standard Three.js binding; raw Three.js remains the underlying layer for anything R3F cannot express. Licenses verified MIT.
**Consequences:** `three`, `@react-three/fiber`, `@react-three/drei` are installed as dependencies of the landing/stage routes only and loaded via route-level code split so the app bundle does not pay for them. All material/scene colours derive from `--gt-scene-*` tokens (CARBON/CHALK/SIGNAL) — no free-form hexes in scene code. WebGL unavailability degrades to the blueprint SVG circuit (progressive enhancement, master §22). LCP ≤ 2.5s budget applies to the landing route: the hero canvas must not block first paint. If bundle impact proves unacceptable, fall back to pre-rendered sequences — but that is a regression to be re-argued, not the default.

---

## ADR-011 — Battle Lab telemetry: fixed distance-bin grid (integer arrays, per driver per lap)

**Date:** 2026-10-19
**Decision:** Normalize raw OpenF1 `car_data` (≈6 Hz, time-domain: speed/throttle/brake) into a **fixed distance grid** — N≈180 bins over the ~5.9 km circuit — stored as integer arrays per driver per lap in `backend/data/9558/telemetry.json`. The raw stream stays in the gitignored cache; only the binned grid ships.
**Context:** Battle Lab compares drivers *along the track*, not along the clock: `Δt(s) = Σ(1/v_A − 1/v_B)·ds` and per-sector deltas both need channels sampled at common arc-length positions. Time-domain rows differ per driver/lap and would require re-projecting on every request; the lambda has no location data loaded at runtime (ADR-008 keeps heavy streams out of the function). Location → arc-length mapping (`s(t)` via the circuit path) and lap boundaries (`laps.json date_start`) are both already cached from Build 5, so the projection is a pure ingest-time transform.
**Consequences:** Fixed-size payload (~2–3 MB committed, precedent `locations.json` 3.0 MB) serves any two-driver/lap pairing with no per-request computation; bin count is a single constant to tune (G3.2 may downsample). Sector split distances (`sd: [s1, s2]`) and corner distances ride along so the frontend draws markers without extra endpoints. Pit laps keep their data but are flagged (`is_pit_out_lap`) and excluded from "fastest lap" selection; channels are int-quantized (km/h, %) so no float bloat. Tradeoff: fixed bins slightly blur intra-bin detail (~33 m/bin) — acceptable at chart resolution; a future zoom feature would need finer bins or raw access.

---

## ADR-010 — SPA deep links: Vercel rewrite fallback to `/index.html` (supersedes reliance on `app.frontend()` alone)

**Date:** 2026-10-19
**Decision:** `vercel.json` gains `"rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]` — Vercel serves real files/CDN assets first, then falls back to the SPA shell for every non-`/api/` path. The FastAPI `app.frontend()` mount in `main.py` stays (local dev + safety net) but is **no longer** the thing that makes `/app` work in production.
**Context:** Build 4 assumed `app.frontend()` (guarded on `frontend/dist`) would handle deep links in the lambda. In production, Vercel promotes `frontend/dist` to the CDN, so `/`, `/index.html`, and `/assets/*` served statically — but `/app` matched no file, fell through to the Python function, and inside the lambda bundle `frontend/dist` does **not** exist (`includeFiles` ships only `backend/data/**`), so the guarded mount never registered. Result: FastAPI's JSON `{"detail":"Not Found"}` 404 on `/app` (and any deep route), while the API itself was healthy.
**Consequences:** `/app`, client routes, and arbitrary paths return the HTML shell (200 `text/html`, correct `<title>`); `/api/*` is excluded by the negative lookahead so FastAPI 404s/JSON stay intact. Static files are still checked before rewrites (no perf cost). If a future path must reach the function (e.g. a non-`/api` FastAPI route), either rename it under `/api/` or narrow the pattern. Alternate fallback if rewrites ever lose to the function catch-all: add `frontend/dist/**` to `functions[...].includeFiles` so the lambda-side mount registers.

## ADR-009 — Track map orientation: +84.25° with y-flip (supersedes MultiViewer `rotation: 92`)

**Date:** 2026-10-19
**Decision:** The TrackMap projector rotates circuit coordinates by a locked `ROTATION_DEG = 84.25` and negates y (`FLIP_Y = true`) before bbox-fit scaling. MultiViewer's published `rotation: 92` is retained in `circuit.json` as source metadata but is **not** used for rendering.
**Context:** OpenF1 location x/y and MultiViewer corner/track coordinates share a frame (aligned within ~2 m bounds; nearest-path median ~23 m), but neither matches the circuit's natural screen orientation. A sweep over rotation × flip against a rasterized reference mask of Silverstone produced IoU 0.7574 at +84.25° with y-flip (the peak); `rotation: 92` without flip scored lower. y-flip is required regardless: the normalized path is clockwise under y-down, and Silverstone is raced clockwise — the opposite winding would mirror the circuit.
**Consequences:** Track map renders in a landscape orientation that visually matches broadcast/reference imagery. The constants live at module scope in `TrackMap.tsx` — changing orientation later means changing one pair of consts and re-running the IoU check. Corner labels (from MV `corners`, projected onto the polyline) follow the same transform, so they stay glued to the track.

## ADR-008 — Deploy app + API to Vercel (FastAPI serverless + SPA promotion)

**Date:** 2026-10-19
**Decision:** One Vercel project serves both the SPA and the API. `tool.vercel.entrypoint = "backend.app.main:app"` builds FastAPI as a Python 3.12 serverless function; `buildCommand` runs `npm ci && npm run build` in `frontend/`; `main.py` mounts `app.frontend("/", directory=frontend/dist, fallback="index.html")` so Vercel promotes the built SPA to the CDN. Committed `backend/data/` ships in the function bundle (`includeFiles: "backend/data/**"`, 788 kB — well under lambda limits).
**Context:** User directive — site must be publicly accessible. Preview deployments default to Vercel Authentication ("Standard Protection"); production (`gridtrace.vercel.app`) is public. `npm ci` needs `package-lock.json` uploaded, so `.vercelignore` excludes `node_modules/`/`dist/` (regenerated in CI) but keeps frontend sources, configs, and the lockfile.
**Consequences:** Live URL `https://gridtrace.vercel.app` (alias of gridtrace project, `ashvyagnis-projects`). Python deps trimmed to `fastapi==0.146.0` + `pydantic==2.14.1` in `pyproject.toml` (lambda stays small; ingest stays local-uv). Heavy per-driver telemetry (ADR-001) does **not** go through the lambda — ingested locally, committed or exported as static JSON if needed. Fallback if Python runtime breaks: static JSON export under `frontend/public/api/` (frontend already uses relative `/api/...`).

## ADR-006 — Publish research docs to GitHub Pages (docs-only push to `main`)

**Date:** 2026-10-19
**Decision:** Render key research docs (provenance, product spec, architecture, build log) to static HTML and publish them as a `/docs/` section of the existing GitHub Pages site hosted on `main`. Not a new repo.
**Context:** User request — public research docs build reputation. GitHub Pages allows one site per public repo (free, generous soft limits; not unlimited per-repo but effectively unlimited across repos). `main` already hosts the live static site; `ashwinwork` is app-dev only per AGENTS.md.
**Consequences:** A small docs-export step (markdown → static HTML) runs before a deliberate, docs-only push to `main` (never app code). Pages source stays on `main`; no branch switch. If `main` protection tightens, fall back to a dedicated `gridtrace-docs` repo. Task: G3.5.

## ADR-007 — State reconstruction: forward-fill + staleness caps, no fabricated markers

**Date:** 2026-10-19
**Decision:** Reconstruct `StateAtTime` via: current lap from max lap with non-null `date_start` ≤ t; positions forward-filled from OpenF1 change-points; intervals forward-filled with a 30s staleness cap; tyre/compound from most recent started lap; `markers=[]` until real car_data/location ingest (Build 3).
**Context:** OpenF1 position and interval streams are sparse change-points, not continuous. Lap 1 for driver 11 (Pérez) has a null `date_start` and must be skipped. Emitting estimated car markers without location data would violate data-honesty rules.
**Consequences:** state@t is REPLAY-accurate for positions/gaps/tyres; car markers explicitly absent (not estimated) until Build 3. Interval staleness older than 30s renders as null rather than a misleading frozen gap.

---

## ADR-003 — Flagship race = 2024 British GP (session_key 9558)

**Date:** 2026-10-18
**Decision:** Ship the demo against Silverstone 2024 Race; qualifying from the same meeting for Battle Lab.
**Context:** Need one fully-covered session for a vertical slice. 9558 verified across all needed endpoints (RC, stints, intervals, telemetry, radio, weather). Hamilton home win = good narrative for storytelling views.
**Consequences:** Ingestion targets 9558 first; multi-session browser (P1) adds qualifying + other meetings later. Grid data must come from Jolpica (OpenF1 starting_grid 404).

## ADR-002 — Python deps via uv; venv inside `backend/.venv`

**Date:** 2026-10-18
**Decision:** Use `uv` for environment + installs; venv committed to no VCS (gitignored).
**Context:** Standalone `pip install` timed out (>300s) on PyPI from this network. uv succeeded immediately with the same packages.
**Consequences:** Setup docs prescribe uv; CI (if added) uses uv too. Fallback: retry pip with longer timeout, but uv is primary.

## ADR-001 — Heavy OpenF1 endpoints are per-driver queries

**Date:** 2026-10-18
**Decision:** Ingestion always queries `car_data`, `location`, `intervals` with `session_key` **and** `driver_number`; never session-wide.
**Context:** Session-wide `car_data`/`location` → HTTP 422; session-wide `intervals` → read timeout. Per-driver returns fine (~33k rows).
**Consequences:** ~20× more requests per session (20 drivers × 3 endpoints) — ingest with modest concurrency + disk cache; budget ~10–15 min for full flagship cache on first run.

## ADR-004 — Circuit geometry: MultiViewer corners + OpenF1 location polyline

**Date:** 2026-10-18
**Decision:** Draw the track from OpenF1 `location` samples of the fastest lap; overlay corner numbers/angles from MultiViewer `/circuits/{circuit_key}/{year}` (circuit_key shared with OpenF1 — verified 2 = Silverstone).
**Context:** OpenF1 has dense real coordinates but no corner metadata; MultiViewer has corners but a coarser path. Combining gives accurate shape + labeled corners.
**Consequences:** Corner marker positions projected onto the location path (nearest-point) at ingest; discrepancies documented if > threshold.

## ADR-005 — No heavy charting library

**Date:** 2026-10-18
**Decision:** Custom SVG/canvas visualizations (timelines, telemetry, track map).
**Context:** The pitwall aesthetic needs exact styling, tabular numerals, and clock-driven redraws; chart libs fight this and add bundle weight.
**Consequences:** More code ownership (zoom/tooltip/a11y hand-rolled); mitigated by small, purpose-built components with Vitest coverage.
