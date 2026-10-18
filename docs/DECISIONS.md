# Decisions (ADRs)

Lightweight: date, decision, context, consequences. Newest first.

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
