> **Archived source snapshot.** This is the verbatim former `test_report_snyk.md`, preserved for provenance. The maintained, consolidated report is [`../TEST_REPORT.md`](../TEST_REPORT.md). Content is preserved; only relative links were adjusted for this location.

# GRIDTRACE — Security Vulnerability Report

**Project:** f1infographics (GRIDTRACE F1 race-replay platform)
**Branch:** `optimizations`
**Report date:** 2026-10-26
**Report type:** manual code review + Snyk/npm/pip/bandit verification
**Status:** all actionable findings remediated or explicitly accepted; no high-severity finding remains open.

---

## 1. Executive summary

| Category | Findings | Fixed | Verified | Accepted |
|---|---:|---:|---:|---:|
| Backend / API | 9 | 6 | 1 | 2 |
| Frontend / UI | 4 | 2 | 2 | 0 |
| Dependencies | 3 | 0 | 2 | 1 |
| Infrastructure / deploy | 3 | 0 | 1 | 2 |
| **Total** | **19** | **8** | **6** | **5** |

**Scanner results**

| Scanner | Scope | Result |
|---|---|---|
| Snyk CLI 1.1308.3 | Frontend, 89 dependencies | `ok: true`, **0 vulnerabilities** |
| Snyk CLI 1.1308.3 | Python requirements | blocked by `SNYK-OS-PYTHON-0013` (dependency graph unresolved) |
| `npm audit` | Frontend | **0 vulnerabilities** |
| `pip-audit -r requirements.txt` | Python runtime | **no known vulnerabilities** |
| Bandit | `backend/app` | **0 issues**; `B310` origin-pinned at runtime and scoped-suppressed |

**No high-severity issue is open.** The public API remains intentionally unauthenticated because it is read-only historical data with no accounts, PII, writes, or secrets; it now has rate limiting, bounded input, restricted CORS, security headers, and no docs/diagnostics path leakage.

---

## 2. How to read this report

Each finding includes:

- **ID** — original reference (`GT-SEC-xx`)
- **Severity** — original severity
- **Status** — Fixed / Verified / Accepted
- **Remediation** — what changed
- **Evidence** — test, command, or source location

“Accepted” means the risk is understood and the current product shape makes remediation inappropriate or disproportionate; it is not an unaddressed bug.

---

## 3. Backend / API findings

### GT-SEC-01 — No authentication or authorization on API endpoints
**Severity:** High (original) · **Status:** Accepted, with DoS mitigation

The service is a public, read-only replay API. There are no accounts, PII, saved user data, writes, payments, or secrets. Every route is GET-only and every payload is public historical F1 data. An API key would not create a meaningful boundary while it would break the public app.

Compensating controls added:

- 600 requests/minute per client+path (process-local, complements edge limiting)
- 1 MB request-body cap
- bounded `year`/`round` parameters and upstream timeouts
- no write methods (`POST/PUT/PATCH/DELETE` return 405)
- security headers and restricted CORS

**Evidence:** `test_security.py::test_api_is_read_only`, `test_rate_limit_headers_are_present`, `test_write_methods_are_disabled`; live `X-RateLimit-*` headers.

**Revisit when:** any user-specific data, write endpoint, saved simulation, or paid upstream key is added. At that point require auth and scope all storage by user ID.

---

### GT-SEC-02 — No CORS middleware configured
**Severity:** High · **Status:** Fixed

`CORSMiddleware` now allows only configured origins:

- default: `https://gridtrace.vercel.app`, `http://localhost:5173`, `http://127.0.0.1:5173`
- override: `GRIDTRACE_ALLOWED_ORIGINS` (comma-separated)
- methods: `GET`; credentials are not enabled

**Evidence:** `test_no_cors_wildcard_is_enabled` sends an `evil.example` preflight and asserts no `Access-Control-Allow-Origin`; allowed-origin requests receive the expected header.

---

### GT-SEC-03 — Error messages expose internal file paths
**Severity:** Medium · **Status:** Fixed

API errors are generic:

- “Dataset not available” / “Dataset unavailable”
- “Session not found”
- “Telemetry unavailable for this selection”
- “Invalid driver selection”

`Diagnostics.data_dir` is the relative string `backend/data`, never an absolute deployment path.

**Evidence:** `test_diagnostics_does_not_disclose_filesystem_path`, `test_engine_response_does_not_leak_internals`, `test_invalid_session_key_does_not_read_outside_data_dir`; live `/api/diagnostics`.

---

### GT-SEC-04 — `session_key` used directly in filesystem paths
**Severity:** Medium · **Status:** Fixed

`_session_dir()`:

1. rejects keys outside `1..99,999,999`
2. resolves the candidate path
3. requires the resolved path to equal `DATA_DIR` or be inside it

Every dataset read uses this helper. FastAPI still types the path parameter as `int`.

**Evidence:** `test_path_traversal_is_not_possible`, `test_invalid_session_key_does_not_read_outside_data_dir`; encoded traversal requests return 404/422.

---

### GT-SEC-05 — Unpinned Python dependencies
**Severity:** Medium · **Status:** Fixed

`backend/requirements.txt` now contains only exact runtime pins:

```text
fastapi==0.146.0
uvicorn[standard]==0.54.0
pydantic==2.14.1
pandas==3.0.6
numpy==2.5.4
httpx==0.28.1
```

`pytest==9.1.1` moved to `backend/requirements-dev.txt`, which starts with `-r requirements.txt`.

**Evidence:** `test_backend_requirements_pin_production_dependencies` now fails on any unpinned runtime line.

---

### GT-SEC-06 — Suspicious / possibly invalid version pins
**Severity:** Medium · **Status:** Verified (report assumption outdated)

`pandas==3.0.6` and `numpy==2.5.4` are the versions installed in this environment and were used for the full 668-test run. `pip-audit -r requirements.txt` reports no known vulnerabilities. The original “does not exist” statement was based on older PyPI knowledge and is not true here.

**Note:** Snyk’s Python resolver returned `SNYK-OS-PYTHON-0013` (“Missing required packages”) rather than a vulnerability result. That is a scanner graph-resolution limitation, not a clean Snyk Python pass.

---

### GT-SEC-07 — No request size or timeout limits
**Severity:** Medium · **Status:** Fixed

- HTTP middleware rejects `Content-Length > 1,000,000` with 413
- malformed `Content-Length` is rejected
- all API routes remain GET-only
- upstream Jolpica timeout reduced from 20 s to 8 s, retries from 3 to 2
- Vercel function `maxDuration` remains 30 s

**Evidence:** guard in `main.py`; `test_large_reflected_input_is_bounded_by_response_size`; `test_write_methods_are_disabled`.

---

### GT-SEC-08 — No security headers on API responses
**Severity:** Low · **Status:** Fixed

Every API response sets:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), geolocation=(), microphone=()`
- `Strict-Transport-Security`

`vercel.json` applies the same policy to static HTML. The production CSP no longer allows `'unsafe-inline'` for scripts; Vite emits external module scripts only.

**Evidence:** `test_security_headers_are_present`, `test_csp_is_configured_for_production_html`; live `/api/health` headers.

---

### GT-SEC-09 — In-memory session cache has no memory-size eviction
**Severity:** Low · **Status:** Accepted

The cache remains count-bounded at 8 sessions, plus a separate 8-entry telemetry cache. The audit measured ~72 MB for the eight largest location sets and ~1.8 MB per telemetry payload. This is within the current serverless memory budget.

A byte-budget eviction would be a useful future hardening step, but it is not required for the current single-user replay workload and would add complexity without changing the public attack surface.

**Evidence:** `test_session_cache_reports_bounded_size`, `test_load_memory_stays_below_two_hundred_megabytes`, diagnostics `max_sessions=8`.

---

## 4. Frontend / UI findings

### GT-SEC-10 — No input sanitization library (DOMPurify equivalent)
**Severity:** Medium · **Status:** Verified

No unsafe DOM sink exists. The codebase uses React JSX text rendering throughout. A source scan asserts there is no `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `new Function`, or `eval(` in application code.

**Evidence:** `test_security.py::test_no_dangerous_dom_sinks_in_frontend`.

**Policy:** if raw HTML is ever required, sanitize with DOMPurify and add a lint rule before merging.

---

### GT-SEC-11 — Three.js used beyond permitted scope (ADR-012)
**Severity:** Medium · **Status:** Fixed

Removed the unused `frontend/src/components/stage/SpeedTunnel.tsx` and its CSS. It was the only Three.js import under `components/stage` and was never referenced by a route. The `/app` circuit stage now has **zero** Three.js imports and uses CSS perspective only.

Three.js remains in:

- landing artwork (`components/landing`, `components/three`)
- the intentionally isolated `/lab` study route

Neither is part of the `/app` circuit stage or the eager entry bundle.

**Evidence:** `grep -rn "from 'three\|@react-three" frontend/src/routes/app frontend/src/components/stage frontend/src/components/timing` returns no matches; build succeeds.

---

### GT-SEC-12 — Unchecked timers without guaranteed cleanup
**Severity:** Low · **Status:** Verified

Audited every timer site:

- `PitLoader` — cancels rAF on effect cleanup
- `PitRail` — clears intro/closing timeouts
- `DecryptedText` — clears interval and hold timeout on unmount
- `SplitFlapText` — clears timeout and cancels rAF on unmount
- `Landing` — clears both scroll timeouts

**Evidence:** transition tests for PitLoader/PitRail; source review; no leaked timers observed in repeated mount/unmount tests.

---

### GT-SEC-13 — Source maps may be exposed in production
**Severity:** Low · **Status:** Fixed

`frontend/vite.config.ts` sets `build.sourcemap: false`. The production build contains no `.map` artifacts.

**Evidence:** Vite config; `npm run build` output.

---

### GT-SEC-14 — React 19.3.1 is very recent
**Severity:** Medium · **Status:** Verified

No action required beyond current controls. The project uses the current React 19.3.1 with a committed lockfile. `npm audit` and Snyk report 0 vulnerabilities for the installed tree.

**Evidence:** `npm ls react react-dom`; `npm audit`; Snyk frontend result.

---

### GT-SEC-15 — `@react-three/fiber` and `three` ecosystem
**Severity:** Low · **Status:** Verified

Three.js is confined to landing/lab and is lazy-loaded. Snyk and npm audit report no advisories for `three`, `@react-three/fiber`, or `@react-three/drei`. The unused circuit-stage component was removed (GT-SEC-11).

**Evidence:** Snyk 89-dependency scan, 0 vulnerabilities; lazy route chunks in build output.

---

## 5. Dependency findings

### GT-SEC-16 — Unpinned dev dependency ranges
**Severity:** Low · **Status:** Accepted

`package-lock.json` is committed and Vercel uses `npm ci`, so CI/deploy installs are reproducible even though `package.json` keeps caret/tilde ranges for maintainability. Snyk/npm audit are clean.

Pin exact dev versions only if the team wants to give up routine patch updates; the lockfile already prevents silent drift in CI.

---

### GT-SEC-17 — Vercel bundles `backend/data/**`
**Severity:** Medium · **Status:** Accepted

The serverless API must read normalized JSON at runtime; the data is public historical F1 content with no secrets or PII. Access is guarded by the path-containment checks in GT-SEC-04, and only known dataset filenames are read. No data file is served statically.

**Evidence:** `includeFiles` in `vercel.json`; `test_static_backend_data_is_not_served`; path guard tests.

---

### GT-SEC-18 — SPA fallback routes non-API paths to `index.html`
**Severity:** Low · **Status:** Accepted

This is the standard client-side routing fallback. API paths are excluded (`/((?!api/).*)`), security headers are applied to all paths, and the app has no server-side content to confuse with a 404. A custom 404 page is a UX choice, not a security control.

---

### GT-SEC-19 — No `.env` or secrets in repository
**Severity:** N/A (positive) · **Status:** Verified

The test now uses `git ls-files` rather than a filesystem walk, so an untracked local `.env` cannot create a false failure and a tracked secret cannot be missed.

**Evidence:** `test_no_env_files_are_committed`, `test_gitignore_covers_secrets_and_build_artifacts`, `test_no_secret_patterns_in_source`.

---

## 6. Snyk scanner details

### 6.1 Frontend

```text
Snyk CLI 1.1308.3
Dependency count: 89
Vulnerabilities: 0
ok: true
```

The scan was run from `frontend/` with `npx --no-install snyk test --json`.

### 6.2 Python

`npx snyk test --file=requirements.txt` returns:

```text
ERROR Missing required packages (SNYK-OS-PYTHON-0013)
Status: 422 Unprocessable Entity
```

The CLI is authenticated (`snyk doctor` passes authentication/connectivity), but it cannot resolve this requirements graph. `pip-audit -r requirements.txt` reports **no known vulnerabilities**. This gap is reported honestly rather than claiming a clean Snyk Python scan.

### 6.3 Bandit

`bandit -q -r app -x app/tests` now reports **0 issues**. The former `B310` at `app/providers/jolpica.py` is fixed rather than only accepted: `_get_json` rejects every URL that does not start with `https://api.jolpi.ca/` before reaching `urlopen`, and the call is annotated `# nosec B310` so the remaining literal-host guarantee is documented at the call site. Any future change that weakens the origin check fails fast instead of opening a custom-scheme request.

---

## 7. Remediation roadmap — final status

| Priority | Item | Status |
|---|---|---|
| P0 | CORS middleware (`GT-SEC-02`) | Done |
| P0 | API abuse controls (`GT-SEC-01`) | Rate limiting + body cap; auth accepted for public read-only data |
| P0 | Pin runtime dependencies (`GT-SEC-05`, `GT-SEC-06`) | Done / verified |
| P1 | Generic error messages (`GT-SEC-03`) | Done |
| P1 | Session-key path validation (`GT-SEC-04`) | Done |
| P1 | Three.js landing-only (`GT-SEC-11`) | Done for `/app` stage; landing/lab remain |
| P1 | Dependency audits (`GT-SEC-14`, `GT-SEC-15`) | Clean |
| P1 | Disable source maps (`GT-SEC-13`) | Done |
| P2 | Security headers (`GT-SEC-08`) | Done |
| P2 | Request body cap (`GT-SEC-07`) | Done |
| P2 | Memory-aware cache (`GT-SEC-09`) | Accepted; count bound retained |
| P2 | Timer cleanup (`GT-SEC-12`) | Verified |

---

## 8. Manual verification performed

- `npm audit --audit-level=low` → 0 vulnerabilities
- Snyk frontend → 0 vulnerabilities / 89 deps
- `pip-audit -r requirements.txt` → no known vulnerabilities
- Bandit → 0 issues (B310 origin check + scoped suppression)
- `test_security.py` → 38 passed, including traversal, reflection, headers, CORS, docs, rate-limit, dependency-pin, `.env`, dangerous-sink, and read-only checks
- Live `/api/health` → all security headers present
- Live `/openapi.json`, `/docs`, `/redoc` → 404
- Live `/api/diagnostics` → relative data path
- Browser: `/app` at 390×844 and 1440×900, session switch, ticker filtering, Settings navigation

---

## 9. Residual risk statement

The remaining risk is operational rather than exploitable:

1. A public read-only API can still be scraped or load-tested. Per-process rate limiting and bounded upstream calls reduce impact; a CDN/edge rate limit is the next step if abuse appears.
2. The in-memory cache is bounded by session count, not bytes. The measured ~72 MB ceiling is acceptable for the current deployment but should be revisited if dataset size grows.
3. The Python Snyk graph is not scanned by Snyk in this environment; `pip-audit` is the current compensating control.
4. Three.js remains in the landing artwork and the isolated `/lab` study route. It is not imported by `/app` or the circuit stage.

No high-severity issue remains open. No commit, push, or deployment was performed.
