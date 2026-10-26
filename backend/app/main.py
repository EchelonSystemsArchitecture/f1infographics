import json
import os
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, HTTPException, Path as ApiPath, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import catalog
from .contracts import (
    CapabilityReport,
    CatalogPage,
    CircuitInfo,
    ConstructorLab,
    Diagnostics,
    Driver,
    DriverLab,
    EventSummary,
    PredictionArena,
    RaceIntelligence,
    SeasonSummary,
    SessionInfo,
    StateAtTime,
    StrategyLab,
    TelemetryCompare,
)
from .driver_lab import build_constructor_lab, build_driver_lab
from .intelligence import build_intelligence
from .prediction import build_prediction
from .session_store import cache_info, load_telemetry
from .state import load_and_build_state
from .strategy import build_strategy

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DATA_ROOT = DATA_DIR.resolve()
FLAGSHIP_SESSION_KEY = 9558
_ENABLE_DOCS = os.getenv("GRIDTRACE_ENABLE_DOCS", "").lower() in {"1", "true", "yes"}
_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "GRIDTRACE_ALLOWED_ORIGINS",
        "https://gridtrace.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

# Process-local defence in depth. Serverless instances each keep their own
# budget, so this complements (rather than replaces) edge rate limiting.
_RATE_LOCK = threading.Lock()
_RATE_WINDOW_SECONDS = 60.0
_RATE_LIMIT = 600
_RATE_BUCKETS: dict[tuple[str, str], deque[float]] = defaultdict(deque)

app = FastAPI(
    title="GRIDTRACE API",
    version="0.1.0",
    docs_url="/docs" if _ENABLE_DOCS else None,
    redoc_url="/redoc" if _ENABLE_DOCS else None,
    openapi_url="/openapi.json" if _ENABLE_DOCS else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
    max_age=600,
)

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; "
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    ),
}


@app.middleware("http")
async def _request_guard(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            too_large = int(content_length) > 1_000_000
        except ValueError:
            too_large = True
        if too_large:
            return JSONResponse(
                {"detail": "Request body too large"},
                status_code=413,
                headers=_SECURITY_HEADERS,
            )

    if request.url.path.startswith("/api/"):
        client = request.client.host if request.client else "unknown"
        key = (client, request.url.path)
        now = time.monotonic()
        with _RATE_LOCK:
            bucket = _RATE_BUCKETS[key]
            while bucket and now - bucket[0] >= _RATE_WINDOW_SECONDS:
                bucket.popleft()
            if len(bucket) >= _RATE_LIMIT:
                retry_after = max(1, int(_RATE_WINDOW_SECONDS - (now - bucket[0])))
                return JSONResponse(
                    {"detail": "Too many requests"},
                    status_code=429,
                    headers={**_SECURITY_HEADERS, "Retry-After": str(retry_after)},
                )
            bucket.append(now)
            remaining = max(0, _RATE_LIMIT - len(bucket))

    response = await call_next(request)
    for header, value in _SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("X-RateLimit-Limit", str(_RATE_LIMIT))
        response.headers.setdefault("X-RateLimit-Remaining", str(remaining))
    return response


def _session_dir(session_key: int) -> Path:
    if session_key < 1 or session_key > 99_999_999:
        raise HTTPException(status_code=404, detail="Session not found")
    path = (DATA_DIR / str(session_key)).resolve()
    if path != _DATA_ROOT and _DATA_ROOT not in path.parents:
        raise HTTPException(status_code=404, detail="Session not found")
    return path


def _load_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=503, detail="Dataset not available")
    try:
        with path.open() as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Dataset unavailable") from exc


def _require_ingested(session_key: int) -> None:
    if not _session_dir(session_key).is_dir():
        raise HTTPException(status_code=404, detail="Session not found")


def _select_lap(laps: list[dict], selector: str, driver_number: int) -> dict:
    if not laps:
        raise HTTPException(status_code=404, detail="Telemetry unavailable for this selection")
    if selector == "best":
        racing = [l for l in laps if not l.get("is_pit_out_lap")]
        return min(racing or laps, key=lambda l: l.get("duration") or float("inf"))
    wanted = int(selector)
    for l in laps:
        if l["lap_number"] == wanted:
            return l
    raise HTTPException(status_code=404, detail="Requested lap is unavailable")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/sessions", response_model=list[SessionInfo])
def list_sessions():
    rows = _load_json(DATA_DIR / "sessions.json")
    return [
        row
        for row in rows
        if row.get("data_mode") == "REPLAY" and (DATA_DIR / str(row["session_key"])).is_dir()
    ]


def _local_sessions() -> list[dict]:
    path = DATA_DIR / "sessions.json"
    if not path.exists():
        return []
    return [
        s
        for s in _load_json(path)
        if s.get("data_mode") == "REPLAY" and (DATA_DIR / str(s["session_key"])).is_dir()
    ]


def _local_seasons() -> list[SeasonSummary]:
    counts: dict[int, int] = {}
    for s in _local_sessions():
        if s.get("session_name") == "Race":
            counts[s["year"]] = counts.get(s["year"], 0) + 1
    return [SeasonSummary(year=y, race_count=n) for y, n in sorted(counts.items(), reverse=True)]


def _local_events(year: int) -> list[EventSummary]:
    rows = sorted(
        (s for s in _local_sessions() if s["year"] == year and s.get("session_name") == "Race"),
        key=lambda s: s["date_start"],
    )
    dup = {
        c
        for c in (r.get("country_name") for r in rows)
        if sum(1 for r in rows if r.get("country_name") == c) > 1
    }
    return [
        EventSummary(
            season=year,
            round=i + 1,
            event_name=f"{s.get('location') if s.get('country_name') in dup else s.get('country_name', '')} Grand Prix".strip(),
            circuit_name=s.get("circuit_short_name", ""),
            country=s.get("country_name", ""),
            locality=s.get("location"),
            date_start=s["date_start"],
            date_end=s.get("date_end"),
            ingested=True,
            session_key=s["session_key"],
        )
        for i, s in enumerate(rows)
    ]


@app.get("/api/seasons", response_model=list[SeasonSummary])
def list_seasons():
    try:
        return catalog.list_seasons(DATA_DIR)
    except Exception:
        return _local_seasons()


@app.get("/api/seasons/{year}/events", response_model=CatalogPage)
def list_year_events(year: int = ApiPath(ge=1950, le=2100)):
    import datetime as _dt

    try:
        events = catalog.list_events(year, DATA_DIR)
        source = "JOLPICA"
    except Exception:
        events = _local_events(year)
        source = "LOCAL"
    return CatalogPage(
        season=year,
        events=events,
        fetched_at=_dt.datetime.now(_dt.timezone.utc).isoformat(),
        source=source,
    )


@app.get(
    "/api/seasons/{year}/rounds/{round_}/capabilities",
    response_model=CapabilityReport,
)
def round_capabilities(
    year: int = ApiPath(ge=1950, le=2100),
    round_: int = ApiPath(ge=1, le=30),
    session: str = Query(default="Race", min_length=1, max_length=30),
):
    try:
        return catalog.capabilities_for(year, round_, session, DATA_DIR)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Capability report unavailable") from exc


@app.get("/api/session/{session_key}/drivers", response_model=list[Driver])
def list_drivers(session_key: int):
    _require_ingested(session_key)
    return _load_json(_session_dir(session_key) / "drivers.json")


@app.get("/api/session/{session_key}/state", response_model=StateAtTime)
def state_at(session_key: int, t: float = Query(ge=0, allow_inf_nan=False)):
    _require_ingested(session_key)
    try:
        return load_and_build_state(DATA_DIR, session_key, t)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Dataset not available") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/session/{session_key}/race-control")
def race_control(session_key: int):
    _require_ingested(session_key)
    return _load_json(_session_dir(session_key) / "race_control.json")


@app.get("/api/session/{session_key}/weather")
def weather(session_key: int):
    _require_ingested(session_key)
    path = _session_dir(session_key) / "weather.json"
    if not path.exists():
        return []
    return _load_json(path)


@app.get("/api/session/{session_key}/intelligence", response_model=RaceIntelligence)
def intelligence(session_key: int) -> RaceIntelligence:
    _require_ingested(session_key)
    try:
        return build_intelligence(DATA_DIR, session_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Dataset not available") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/session/{session_key}/strategy", response_model=StrategyLab)
def strategy(session_key: int) -> StrategyLab:
    _require_ingested(session_key)
    try:
        return build_strategy(DATA_DIR, session_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/session/{session_key}/driver-lab", response_model=DriverLab)
def driver_lab(session_key: int) -> DriverLab:
    _require_ingested(session_key)
    try:
        return build_driver_lab(DATA_DIR, session_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/session/{session_key}/constructor-lab", response_model=ConstructorLab)
def constructor_lab(session_key: int) -> ConstructorLab:
    _require_ingested(session_key)
    try:
        return build_constructor_lab(DATA_DIR, session_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/session/{session_key}/prediction", response_model=PredictionArena)
def prediction(session_key: int) -> PredictionArena:
    _require_ingested(session_key)
    try:
        return build_prediction(DATA_DIR, session_key)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@app.get("/api/diagnostics", response_model=Diagnostics)
def diagnostics(session_key: int | None = Query(default=None)) -> Diagnostics:
    sessions_path = DATA_DIR / "sessions.json"
    count = 0
    if sessions_path.exists():
        count = len(_load_json(sessions_path))
    present: dict[str, bool] = {}
    if session_key is not None:
        for name in (
            "drivers.json", "positions.json", "intervals.json", "timing_base.json",
            "race_control.json", "locations.json", "telemetry.json", "pit.json",
            "stints.json", "grid.json", "session_result.json", "circuit.json",
            "overtakes.json", "team_radio.json", "weather.json",
        ):
            present[name] = (_session_dir(session_key) / name).exists()
    return Diagnostics(
        session_key=session_key,
        ingested_sessions=count,
        data_dir="backend/data",
        session_store=cache_info(),
        datasets_present=present,
    )


@app.get("/api/session/{session_key}/circuit", response_model=CircuitInfo)
def circuit(session_key: int) -> CircuitInfo:
    _require_ingested(session_key)
    return _load_json(_session_dir(session_key) / "circuit.json")


@app.get("/api/session/{session_key}/telemetry", response_model=TelemetryCompare)
def telemetry(session_key: int, drivers: str = Query(min_length=1), lap: str = Query(default="best")) -> dict:
    _require_ingested(session_key)

    numbers: list[int] = []
    for part in drivers.split(","):
        token = part.strip()
        try:
            n = int(token)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid driver selection")
        if n < 1:
            raise HTTPException(status_code=400, detail="Invalid driver selection")
        numbers.append(n)
    numbers = list(dict.fromkeys(numbers))

    selector = lap.strip().lower()
    if selector != "best":
        try:
            requested = int(selector)
        except ValueError:
            raise HTTPException(status_code=400, detail="lap must be 'best' or a positive integer")
        if requested < 1:
            raise HTTPException(status_code=400, detail="lap must be 'best' or a positive integer")
        selector = str(requested)

    raw = load_telemetry(DATA_DIR, session_key)
    by_number = {row["driver_number"]: row for row in raw["drivers"]}
    picked = []
    for n in numbers:
        row = by_number.get(n)
        if row is None:
            raise HTTPException(status_code=404, detail="Telemetry unavailable for this selection")
        picked.append({**row, "laps": [_select_lap(row["laps"], selector, n)]})

    return {
        "session_key": raw["session_key"],
        "length_m": raw["length_m"],
        "grid_points": raw["grid_points"],
        "lap_selector": selector,
        "drivers": picked,
    }


# Vercel promotes this directory to the CDN at build time (ADR-008).
# Skipped locally when frontend/dist is absent so uvicorn still runs.
_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    app.frontend("/", directory=str(_FRONTEND_DIST), fallback="index.html")
