# Setup

## Prerequisites

- Node ≥ 20 (repo dev: v26.3.1) + npm 12
- Python 3.14 + **uv** (`brew install uv` or see https://docs.astral.sh/uv)
- Git with SSH access to `github.com` (key: `~/.ssh/id_ed25519_github`, user **ashvyagni**)

## Clone & branch

```bash
git clone git@github.com:EchelonSystemsArchitecture/f1infographics.git
cd f1infographics
git checkout ashwinwork   # app development branch (NOT main — that's the live static site)
```

## Backend

```bash
cd backend
uv venv --python 3.14 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

If `requirements.txt` isn't there yet (pre-Build 1): install the Build 0 verified set —

```bash
uv pip install --python .venv/bin/python fastapi "uvicorn[standard]" pydantic pandas numpy httpx pytest
```

## Frontend (from Build 1)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api → :8000
```

## Data cache

- Raw OpenF1 responses: `backend/cache/` — **gitignored**, regenerable.
- Normalized verified datasets: `backend/data/` — committed when small; regeneration: `python -m app.ingest flagship` (Build 1+).

No API keys required for historical OpenF1/Jolpica/MultiViewer.

## Tests

```bash
backend/.venv/bin/pytest                 # backend
cd frontend && npm test                  # vitest
npx playwright test                      # E2E (Build 3+)
```
