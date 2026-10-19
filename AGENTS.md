# AGENTS.md — rules for everyone working in this repo

Read this before touching anything. This branch (`ashwinwork`) is the team's reference implementation — documentation quality is as important as code quality. **New to the project? Start with [HANDOFF.md](HANDOFF.md).**

## How we work

1. **Docs-first.** Every build starts by reading `TASKS.md` + latest `docs/BUILD_LOG.md` entries, and ends by updating them.
2. **One build = one commit (or a tight series) + push.** Commit messages: `Build N: <what shipped>`. Keep them brief. Push to `origin/ashwinwork` after each build.
3. **Document as you go.** New decision → `docs/DECISIONS.md`. New API finding → `docs/DATA_SOURCES_AND_PROVENANCE.md`. New design token → `docs/DESIGN_SYSTEM.md`. Screenshots → `docs/screenshots/` + referenced in README/BUILD_LOG.
4. **Task-graph discipline.** Do not jump to features. Follow the task graph in `TASKS.md`. Mark tasks done only when verified (tests pass, data checked, screenshot taken where applicable). All Tasks A–H are done (Build 12 / `461e029`). Future work should follow the open-items list in `docs/FINAL_REPORT.md`.

## Data honesty (non-negotiable)

- Label every view's data mode: `LIVE`, `REPLAY`, `ESTIMATE`, `SIMULATION`, `UNAVAILABLE`.
- We are **historical replay** for the foreseeable future. Never show a `LIVE` badge without an actual live feed.
- Never invent gaps, lap times, or telemetry. If data is missing, show `UNAVAILABLE` or a clearly-marked estimate.
- Every number on screen must be traceable to a cached API response or a deterministic transformation of one.

## Code conventions

- Frontend: React + TypeScript + Vite. Shared race clock is the single time source for all visualizations. Design tokens live in `frontend/src/styles/tokens.css`.
- Backend: FastAPI + Pydantic. Normalized JSON contracts in `backend/app/contracts.py`. Raw API responses cached under `backend/cache/` (gitignored); normalized datasets under `backend/data/` (committed only when small + verified).
- No hardcoded race results in UI code. All content flows from the data layer.
- No code comments unless explicitly asked. Markdown docs are exempt.
- Tests: pytest for backend, Vitest for frontend, `tsc --noEmit`, `oxlint`.
- ADR-012 permits three.js/R3F for the landing hero only; the circuit stage uses CSS perspective, not Three.js.
- Circuit data has no names/sectors — SECTOR camera is permanently disabled with an honest title.

## Git

- Branch: `ashwinwork`. Remote: `origin` → `git@github.com:EchelonSystemsArchitecture/f1infographics.git` (SSH, user ashvyagni).
- Do not push to `main` (that's the live static site).
- Commits: `Build N: brief summary`. Optional body with 1–3 bullets.

## Deploy

```bash
vercel --prod --yes
```

Live: **https://gridtrace.vercel.app** — always serves latest production build from `ashwinwork`. Hard-refresh if the UI looks stale.

## When you're stuck

- Read [HANDOFF.md](HANDOFF.md) for current state, open items, and how-to-run.
- API weirdness → check provenance doc first (we've hit most quirks already).
- Unknown next step → read `docs/FINAL_REPORT.md` then `docs/BUILD_LOG.md` last entry's "Next" section.
- Design question → `docs/DESIGN_SYSTEM.md` + `docs/ART_DIRECTION_MASTER.md`.
