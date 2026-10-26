# Testing & QA — report folder

This folder is the single home for GRIDTRACE test and security reporting. It replaces the two root-level files (`test_report.md`, `test_report_snyk.md`) without discarding either: both are preserved verbatim in [`archive/`](archive/).

## Read this first

| File | What it is | When to use it |
|---|---|---|
| [TEST_REPORT.md](TEST_REPORT.md) | Consolidated, authoritative report. Part I covers test inventory, edge cases, UI transitions, optimizations, and remediation evidence. Part II covers the security review and per-finding GT-SEC status. | Any question about what was tested, what was fixed, or what remains accepted |
| [BEFORE_AFTER.md](BEFORE_AFTER.md) | Complete change ledger, one row per defect: before → after → evidence | Quick review, release notes, PR description |
| [archive/TEST_REPORT_EDGE_UI_OPTIMIZATION.md](archive/TEST_REPORT_EDGE_UI_OPTIMIZATION.md) | Snapshot of the former `test_report.md` at consolidation | Provenance only; do not edit. May lag later master fixes |
| [archive/TEST_REPORT_SNYK_SECURITY.md](archive/TEST_REPORT_SNYK_SECURITY.md) | Snapshot of the former `test_report_snyk.md` at consolidation | Provenance only; do not edit. May lag later master fixes |

## Naming rules

- `TEST_REPORT.md` — the maintained master. New findings, counts, and verification evidence go here.
- `BEFORE_AFTER.md` — the maintained change ledger. Every fixed defect gets one row.
- `archive/<SOURCE>_<TOPIC>.md` — immutable snapshots. Never edit; add a new snapshot instead.
- Screenshots, if added, go in `docs/testing/evidence/` and are referenced from the master report.

## Current status (2026-10-26)

- Backend: **668 passed** (`pytest`, 16 files, 0 xfail)
- Frontend: **214 passed** (`vitest`, 14 files, 0 expected failures)
- Total: **882 checks**
- `tsc --noEmit` clean; `oxlint` 0 errors / 29 warnings; production build succeeds
- `npm audit` 0; `pip-audit` clean; Snyk frontend 0 vulnerabilities / 89 dependencies
- Bandit 0 issues
- Accepted risks: public read-only API without auth, count-bounded cache, bundled public datasets, SPA fallback

## Reproduce

```bash
cd backend && .venv/Scripts/python.exe -m pytest -q
cd frontend && npx vitest run
cd frontend && npx tsc --noEmit
cd frontend && npx oxlint
cd frontend && npm run build
cd frontend && npm audit
cd backend && uvx pip-audit -r requirements.txt
cd backend && uvx bandit -q -r app -x app/tests
```

Browser verification surfaces: `/app`, `/app/battle`, `/app/vault`, `/app/settings`, `/landing` at 1440×900 and 390×844.
