import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

from .contracts import CircuitInfo, Driver, SessionInfo, StateAtTime, TelemetryCompare
from .state import load_and_build_state

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

app = FastAPI(title="GRIDTRACE API", version="0.1.0")

FLAGSHIP_SESSION_KEY = 9558


def _load_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=503, detail=f"Dataset not ingested yet: {path.name}")
    with path.open() as f:
        return json.load(f)


def _require_flagship(session_key: int) -> None:
    if session_key != FLAGSHIP_SESSION_KEY:
        raise HTTPException(status_code=404, detail="Unknown session_key")


def _select_lap(laps: list[dict], selector: str, driver_number: int) -> dict:
    if not laps:
        raise HTTPException(status_code=404, detail=f"No telemetry for driver {driver_number}")
    if selector == "best":
        racing = [l for l in laps if not l["is_pit_out_lap"]]
        return min(racing or laps, key=lambda l: l["duration"])
    wanted = int(selector)
    for l in laps:
        if l["lap_number"] == wanted:
            return l
    raise HTTPException(status_code=404, detail=f"Driver {driver_number} has no lap {wanted}")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/sessions", response_model=list[SessionInfo])
def list_sessions():
    return _load_json(DATA_DIR / "sessions.json")


@app.get("/api/session/{session_key}/drivers", response_model=list[Driver])
def list_drivers(session_key: int):
    _require_flagship(session_key)
    return _load_json(DATA_DIR / str(session_key) / "drivers.json")


@app.get("/api/session/{session_key}/state", response_model=StateAtTime)
def state_at(session_key: int, t: float = Query(ge=0)):
    _require_flagship(session_key)
    try:
        return load_and_build_state(DATA_DIR, session_key, t)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/session/{session_key}/race-control")
def race_control(session_key: int):
    _require_flagship(session_key)
    return _load_json(DATA_DIR / str(session_key) / "race_control.json")


@app.get("/api/session/{session_key}/circuit", response_model=CircuitInfo)
def circuit(session_key: int) -> CircuitInfo:
    _require_flagship(session_key)
    return _load_json(DATA_DIR / str(session_key) / "circuit.json")


@app.get("/api/session/{session_key}/telemetry", response_model=TelemetryCompare)
def telemetry(session_key: int, drivers: str = Query(min_length=1), lap: str = Query(default="best")) -> dict:
    _require_flagship(session_key)
    raw = _load_json(DATA_DIR / str(session_key) / "telemetry.json")

    numbers: list[int] = []
    for part in drivers.split(","):
        token = part.strip()
        try:
            n = int(token)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid driver number: {token}")
        if n < 1:
            raise HTTPException(status_code=400, detail=f"Invalid driver number: {token}")
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

    by_number = {row["driver_number"]: row for row in raw["drivers"]}
    picked = []
    for n in numbers:
        row = by_number.get(n)
        if row is None:
            raise HTTPException(status_code=404, detail=f"No telemetry for driver {n}")
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
