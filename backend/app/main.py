import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

from .contracts import SessionInfo, StateAtTime

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

app = FastAPI(title="GRIDTRACE API", version="0.1.0")

FLAGSHIP_SESSION_KEY = 9558


def _load_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=503, detail=f"Dataset not ingested yet: {path.name}")
    with path.open() as f:
        return json.load(f)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/sessions", response_model=list[SessionInfo])
def list_sessions():
    return _load_json(DATA_DIR / "sessions.json")


@app.get("/api/session/{session_key}/state", response_model=StateAtTime)
def state_at(session_key: int, t: float = Query(ge=0)):
    if session_key != FLAGSHIP_SESSION_KEY:
        raise HTTPException(status_code=404, detail="Unknown session_key")
    return _load_json(DATA_DIR / str(session_key) / "state_placeholder.json")


@app.get("/api/session/{session_key}/race-control")
def race_control(session_key: int):
    if session_key != FLAGSHIP_SESSION_KEY:
        raise HTTPException(status_code=404, detail="Unknown session_key")
    return _load_json(DATA_DIR / str(session_key) / "race_control.json")
