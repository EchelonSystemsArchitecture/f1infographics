# Decisions (ADRs)

Lightweight: date, decision, context, consequences. Newest first.

---

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
