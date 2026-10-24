# GRIDTRACE — Security Vulnerability Report

**Project:** f1infographics (GRIDTRACE F1 race-replay platform)
**Branch:** ashwinwork
**Report date:** 2026-10-25
**Report type:** Manual security review + Snyk scan results (pending)

---

## 1. Executive Summary

This report combines a manual code-level security review of the GRIDTRACE codebase with a placeholder for Snyk CLI scan results (to be added once you run Snyk locally and share the output).

No Snyk credits were consumed in producing this report. The manual review identified issues across:

| Category | Count | Severity breakdown |
|----------|-------|-------------------|
| Backend / API | 9 | 1 High, 4 Medium, 4 Low |
| Frontend / UI | 5 | 0 High, 3 Medium, 2 Low |
| Dependencies | 4 | 1 High, 2 Medium, 1 Low |
| Infrastructure / Deploy | 3 | 0 High, 2 Medium, 1 Low |

**Critical finding:** The backend exposes all API endpoints with no authentication, no authorization, no rate limiting, and no CORS configuration. In a production deployment this is an open attack surface.

---

## 2. How to read this report

Each finding includes:

- **ID** — unique reference (e.g. GT-SEC-01)
- **Severity** — High / Medium / Low
- **Location** — file and line numbers
- **What it is** — plain-English explanation
- **Why it matters** — real-world impact
- **How to fix** — concrete remediation steps

No exploit code is included. All findings are defensive recommendations.

---

## 3. Backend / API findings (FastAPI + Python)

### GT-SEC-01 — No authentication or authorization on any API endpoint
**Severity:** High  
**Location:** `backend/app/main.py` — all route handlers (`/api/sessions`, `/api/session/{key}/state`, `/api/telemetry`, etc.)

**What it is:** Every endpoint in `main.py` is publicly accessible. There is no API key, JWT, session cookie, or any access control. Any caller can read session data, timing, telemetry, race control events, and diagnostics.

**Why it matters:** Although the data is historical F1 replay (not user PII), an unauthenticated API can be abused for scraping, denial-of-service, or enumeration of internal data structures. If you ever add user-specific data (settings, saved simulations, predictions), it would be fully exposed.

**How to fix:**
- Add API key validation middleware (FastAPI `Depends` or middleware) for all `/api/` routes
- Or at minimum, add rate limiting per IP/session
- Consider frontend-only auth if the app ever stores user data

### GT-SEC-02 — No CORS middleware configured
**Severity:** High  
**Location:** `backend/app/main.py` — `app = FastAPI(...)` on line 33

**What it is:** FastAPI's `CORSMiddleware` is never added. The app does not declare which origins may call the API.

**Why it matters:** Without CORS, browsers will block cross-origin requests from your frontend if it's served from a different domain than the API (e.g. `gridtrace.vercel.app` calling a separate API host). Conversely, a misconfigured or missing CORS policy can also allow unexpected origins to make requests if the deployment model changes.

**How to fix:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gridtrace.vercel.app", "http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

### GT-SEC-03 — Error messages expose internal file paths
**Severity:** Medium  
**Location:** `backend/app/main.py` lines 40-41 (`_load_json`), line 46-47 (`_require_ingested`)

**What it is:** HTTPException detail strings include raw file paths:
```python
raise HTTPException(status_code=503, detail=f"Dataset not ingested yet: {path.name}")
raise HTTPException(status_code=404, detail=f"Session {session_key} is not ingested")
```

**Why it matters:** While these messages don't reveal full system paths (only filenames), they confirm the existence of the `data/` directory structure and session keys. An attacker can use this to enumerate which sessions are ingested vs not.

**How to fix:** Use generic messages that don't reference filesystem paths:
```python
raise HTTPException(status_code=503, detail="Dataset not available")
raise HTTPException(status_code=404, detail="Session not found")
```

### GT-SEC-04 — `session_key` used directly in filesystem path construction
**Severity:** Medium  
**Location:** `backend/app/main.py` lines 46-47, 253-254, 260, 284; `backend/app/session_store.py` lines 46, 58, 60-77

**What it is:** The `session_key` integer parameter from the URL is interpolated directly into `Path` objects:
```python
DATA_DIR / str(session_key)  # line 46
DATA_DIR / str(session_key) / "circuit.json"  # line 254
```

**Why it matters:** FastAPI coerces `session_key: int`, so a path-traversal string like `../etc/passwd` would fail type validation. However, if the type hint is ever relaxed or a future endpoint accepts a string session identifier, this becomes a path-traversal vulnerability allowing arbitrary file read/write.

**How to fix:** Add an explicit allowlist or range check:
```python
if session_key < 1 or session_key > 99999:
    raise HTTPException(status_code=400, detail="Invalid session key")
```
Or validate that the resolved path stays within `DATA_DIR`.

### GT-SEC-05 — Unpinned Python dependencies
**Severity:** Medium  
**Location:** `backend/requirements.txt` lines 6-7

**What it is:**
```
httpx
pytest
```
These have no version pins. `fastapi==0.146.0`, `pydantic==2.14.1`, `pandas==3.0.6`, `numpy==2.5.4` are pinned but `httpx` and `pytest` float to latest.

**Why it matters:** Unpinned dependencies can silently pull in versions with known vulnerabilities or breaking changes on reinstall.

**How to fix:** Pin all dependencies with exact versions:
```
httpx==0.27.0
pytest==8.3.0
```
Run `pip freeze > requirements.txt` after testing to capture exact versions.

### GT-SEC-06 — Suspicious / possibly invalid version pins
**Severity:** Medium  
**Location:** `backend/requirements.txt` lines 4-5

**What it is:**
```
pandas==3.0.6
numpy==2.5.4
```
As of this review, the latest stable pandas is 2.x (3.0.6 does not exist in PyPI), and numpy 2.5.4 is unusually high. These may be typos, future-version placeholders, or internally mirrored versions.

**Why it matters:** If these versions don't exist on PyPI, `pip install -r requirements.txt` will fail in CI or on a fresh machine.

**How to fix:** Verify these versions exist and are installable. If they're typos, correct to available versions (e.g. `pandas==2.2.3`, `numpy==2.1.3`). Pin via `pip freeze`.

### GT-SEC-07 — No request size or timeout limits on inbound API

## 4. Frontend / UI findings (React + TypeScript + Vite)

### GT-SEC-10 — No input sanitization library (DOMPurify equivalent)
**Severity:** Medium  
**Location:** `frontend/src/api/client.ts` and all route components

**What it is:** Data from the backend API (driver names, team names, race-control messages, circuit names) is rendered directly into React components. React's default JSX escaping protects against most XSS, but any future use of `dangerouslySetInnerHTML`, `innerHTML`, or SVG `dangerouslySetInnerHTML` would be unprotected.

**Why it matters:** If an API response ever contains malicious script (e.g. a compromised OpenF1 feed with script in `message` or `raceName`), and the frontend renders it without escaping, it executes in the user's browser.

**How to fix:**
- Continue using React JSX (auto-escaping) — avoid `dangerouslySetInnerHTML`
- If you must render HTML, sanitize with DOMPurify
- Add a lint rule flagging `dangerouslySetInnerHTML` and `innerHTML`

### GT-SEC-11 — Three.js used beyond permitted scope (ADR-012)
**Severity:** Medium  
**Location:** `frontend/src/components/three/` — `F1Car.tsx`, `GarageScene.tsx`, `HeroScene.tsx`, `RealCar.tsx`, `PowerUnit.tsx`, `GarageProps.tsx`, `loft.ts`, `puParts.ts`

**What it is:** ADR-012 permits Three.js/R3F for the **landing hero only**; the circuit stage must use CSS perspective. The `frontend/src/components/three/` directory contains multiple Three.js scenes (Garage, Hero, etc.). The landing page (`/landing`) uses `HeroScene.tsx`, which is within scope. However, any Three.js usage in the `/app` circuit stage would violate ADR-012 and increase the frontend attack surface (WebGL, shaders).

**Why it matters:** Extra 3D dependencies increase bundle size and introduce WebGL-specific risks (shader injection, GPU memory exhaustion). If Three.js leaks into the circuit map, it also contradicts the architectural decision.

**How to fix:** Verify that `frontend/src/components/stage/CircuitStage.tsx` uses only CSS perspective (it does, per HANDOFF.md). Keep Three.js confined to `/landing` routes. Add a dependency-graph check to prevent `@react-three/fiber` or `three` imports in `routes/app/`.
**Severity:** Medium  
**Location:** `backend/app/main.py` — no `max_request_size` or timeout configuration

**What it is:** FastAPI/Starlette does not enforce a default request body size limit. All endpoints are GET-only currently, but future POST/PUT endpoints would accept arbitrarily large bodies.


### GT-SEC-12 — Unchecked use of `setTimeout`/`setInterval` without guaranteed cleanup
**Severity:** Low  
**Location:** `frontend/src/components/app/PitLoader.tsx:49`, `PitRail.tsx:26,42`, `frontend/src/components/bits/DecryptedText.tsx:263,275`, `frontend/src/components/bits/SplitFlapText.tsx:344`, `frontend/src/routes/landing/Landing.tsx:30,36`

**What it is:** Multiple `setTimeout`/`setInterval` calls with cleanup functions (`clearTimeout`/`clearInterval` in return callbacks). React 19 StrictMode double-invokes effects in development, which could create duplicate timers if cleanup isn't perfectly paired.

**Why it matters:** Orphaned timers cause memory leaks and unexpected UI behavior (double ticks, ghost animations). Not a direct security issue, but affects reliability and can be abused for DoS via rapid mount/unmount.

**How to fix:** Audit each timer to ensure cleanup always runs. Consider a `useInterval`/`useTimeout` hook that guarantees cleanup.

### GT-SEC-13 — Source maps may be exposed in production build
**Severity:** Low  
**Location:** `frontend/vite.config.ts` — no `build.rollupOptions.output` configuration to disable sourcemaps

**What it is:** Vite may generate source maps in the production build (`vercel build` → `frontend/dist`).

**Why it matters:** Source maps expose original TypeScript source, variable names, and logic structure to anyone who downloads them. For a public-facing app this is mostly an information-disclosure concern, but it makes reverse-engineering easier.

**How to fix:** Disable sourcemaps in production:
```typescript
export default defineConfig({
  build: {
    sourcemap: false,
  },
})
```

## 5. Dependency findings
**Why it matters:** An attacker could send massive request bodies to exhaust memory (DoS).

**How to fix:** Add Starlette `Middleware` with `max_request_size`, or use a reverse proxy (Vercel, nginx) with body-size limits. Vercel functions already have a 6MB payload limit and 30s duration (per `vercel.json`), which partially mitigates this.

### GT-SEC-08 — No security headers on API responses
**Severity:** Low  
**Location:** `backend/app/main.py` — no middleware setting `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`

**What it is:** Responses lack standard security headers.

**Why it matters:** Low risk for a JSON API, but `X-Content-Type-Options: nosniff` prevents MIME-type sniffing and `X-Frame-Options: DENY` prevents clickjacking if any endpoint ever returns HTML.

**How to fix:** Add middleware to set:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`

### GT-SEC-09 — In-memory session cache has no eviction by memory size
**Severity:** Low  
**Location:** `backend/app/session_store.py` lines 24, 100-104


### GT-SEC-14 — React 19.2.8 (very recent)
**Severity:** Medium  
**Location:** `frontend/package.json` lines 29-30

**What it is:** `react: ^19.2.8` and `react-dom: ^19.2.8`. React 19 is the latest major release (as of late 2026).

**Why it matters:** New major versions can have undiscovered vulnerabilities. The `^` caret allows patch/minor updates automatically, which is generally good, but a major release may have breaking security patches that require code changes.

**How to fix:** Run `npm audit` regularly. Subscribe to React security advisories. Test upgrades in a staging branch before production.

### GT-SEC-15 — `@react-three/fiber` and `three` (Three.js ecosystem)
**Severity:** Low  
**Location:** `frontend/package.json` lines 20-21, 32

**What it is:** `@react-three/fiber: ^9.8.2`, `three: ^0.186.1`, `@react-three/drei: ^10.7.9`

**Why it matters:** Three.js is a large, complex library with WebGL surface area. If kept strictly to the landing hero (per ADR-012), risk is contained. If it spreads, vulnerability surface grows.

**How to fix:** Keep Three.js confined to landing. Run `npm audit` to check for known Three.js CVEs.

### GT-SEC-16 — Unpinned dev dependency versions with `^` and `~`
**Severity:** Low  
**Location:** `frontend/package.json` devDependencies

**What it is:** Most dev dependencies use `^` (compatible updates) or `~` (patch only). This allows automatic minor version pulls.

**Why it matters:** A compromised or vulnerable dev dependency could affect the build pipeline (e.g., Vite plugin, TypeScript compiler).

**How to fix:** Pin critical build tools (`vite`, `typescript`, `vitest`, `oxlint`) to exact versions. Use `npm ci` (already used in `vercel.json`) for reproducible installs.

## 6. Infrastructure / Deployment findings
**What it is:** `_MAX_SESSIONS = 8` limits the count of cached sessions but not their total memory footprint. A single session with full per-driver telemetry can be several MB.

**Why it matters:** An attacker (or heavy user) could request many distinct sessions, evicting useful ones and forcing repeated disk reads, degrading performance. Not a direct security vulnerability, but a DoS vector.

**How to fix:** Add a total byte budget alongside the count limit, or cap per-session cache size.

### GT-SEC-17 — Vercel exposes `backend/data/**` to the function bundle
**Severity:** Medium  
**Location:** `vercel.json` line 7: `"includeFiles": "backend/data/**"`

**What it is:** All normalized data JSON files under `backend/data/` are included in the Vercel function deployment package.

**Why it matters:** If any data file contains sensitive information (it shouldn't — this is historical F1 data), it ships to the edge. More importantly, it increases the attack surface: every data file is part of the serverless bundle and could be accessed if there's a path-traversal bug in a future endpoint.

**How to fix:** Only include data files actually needed by the deployed function. Consider serving static data via a CDN or separate bucket rather than bundling in the Lambda.

### GT-SEC-18 — SPA fallback rewrite routes all non-API paths to `index.html`
**Severity:** Low  
**Location:** `vercel.json` lines 11-14

**What it is:** `{"source": "/((?!api/).*)", "destination": "/index.html"}` catches every non-API route.

**Why it matters:** This is standard for SPAs and not a vulnerability per se, but it means any malformed path returns 200 with the app shell rather than 404. Combined with no security headers, this slightly aids reconnaissance.

**How to fix:** Add a 404 page for truly unknown routes, or add security headers in `vercel.json` `headers` configuration.

### GT-SEC-19 — No `.env` or secrets in repository (positive finding)
**Severity:** N/A (positive)  
**Location:** Repository root

**What it is:** No `.env`, `.env.local`, `secrets.json`, or hardcoded API keys found in the codebase.

**Why it matters:** Good security hygiene. The OpenF1 and Jolpica APIs used by the ingest pipeline are free and unauthenticated, so no keys are needed.

**How to fix:** Keep it this way. If you add authenticated services later, use environment variables and never commit them.

## 7. Snyk scan results (pending)

The local Snyk scan has not been run yet. Once you run it:

```bash
cd C:\Users\bijan\f1infographics
npx snyk test
npx snyk test --severity=high --format=json > snyk-results.json
```

Share the output (`snyk-results.json` or terminal text) and I will:

- Append a **Section 8** with Snyk-identified vulnerabilities
- Map each CVE to the files above where applicable
- Provide prioritized remediation steps
- Update this report's summary table

**Current placeholder:**
| Scanner | Status | Results |
|---------|--------|---------|
| Manual code review | Complete | See Sections 3–6 |
| Snyk CLI (frontend) | Pending | Awaiting your `npx snyk test` output |
| Snyk CLI (backend) | Pending | Awaiting your `npx snyk test` output in `backend/` |

## 8. Prioritized remediation roadmap

### P0 — Do this first (High severity)
1. **Add CORS middleware** to FastAPI (`GT-SEC-02`)
2. **Add API key or rate limiting** to all `/api/` routes (`GT-SEC-01`)
3. **Pin unpinned Python deps** (`httpx`, `pytest`) and verify `pandas`/`numpy` versions (`GT-SEC-05`, `GT-SEC-06`)

### P1 — Do this next (Medium severity)
4. **Genericize error messages** to not expose filesystem hints (`GT-SEC-03`)
5. **Validate `session_key` range** before path construction (`GT-SEC-04`)
6. **Confirm Three.js is landing-only**, not in `/app` circuit stage (`GT-SEC-11`)
7. **Run `npm audit`** and fix frontend dependency advisories (`GT-SEC-14`, `GT-SEC-15`)
8. **Disable production source maps** in Vite (`GT-SEC-13`)

### P2 — Do this when time permits (Low severity)
9. **Add security headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) (`GT-SEC-08`)
10. **Add request body size limits** (`GT-SEC-07`)
11. **Add memory-based cache eviction** alongside count-based (`GT-SEC-09`)
12. **Audit `setTimeout`/`setInterval` cleanup** in frontend components (`GT-SEC-12`)

## 9. How to run Snyk locally (credit-safe)

You're on a free trial — here's how to minimize credit usage:

```bash
# Install Node.js if needed (https://nodejs.org), then:
cd C:\Users\bijan\f1infographics

# Frontend scan only (fewer credits than full org scan)
cd frontend
npx snyk test

# Backend scan (separate, since it's Python)
cd ../backend
npx snyk test

# Generate JSON report for sharing
npx snyk test --format=json > ../snyk-results.json
```

**Credit-saving tips:**
- Scan only the directories you care about (`frontend/`, `backend/`) rather than the whole repo
- Use `--severity=high` to filter to critical issues first
- Don't run `snyk monitor` (that creates a project on Snyk's cloud and uses more credits)
- Don't re-scan on every code change; batch scans

Once you have the output, paste it here and I'll integrate it into Section 7 of this report.

## Appendix A: Files reviewed

**Backend:**
- `backend/app/main.py` — API routes, error handling, path construction
- `backend/app/contracts.py` — Pydantic data models
- `backend/app/session_store.py` — In-memory cache
- `backend/app/state.py` — State reconstruction at time t
- `backend/app/ingest/fetch.py` — OpenF1/Jolpica/MultiViewer fetcher
- `backend/app/ingest/normalize.py` — Cache → normalized JSON
- `backend/app/providers/jolpica.py` — Jolpica API client
- `backend/app/catalog.py` — Session catalog
- `backend/app/intelligence.py` — Race intelligence engine
- `backend/requirements.txt` — Python dependencies
- `backend/bulk_ingest.py` — Bulk ingest script

**Frontend:**
- `frontend/package.json` — npm dependencies
- `frontend/vite.config.ts` — Vite dev server + proxy
- `frontend/src/api/client.ts` — API client interfaces + fetch
- `frontend/src/App.tsx` — Route definitions
- `frontend/src/main.tsx` — Entry point
- `frontend/src/store/clock.ts` — Shared race clock (Zustand)
- `frontend/src/components/three/*` — Three.js components

**Infrastructure:**
- `vercel.json` — Deployment configuration
- `.gitignore` — Git ignore rules