from typing import Literal

from pydantic import BaseModel

DataMode = Literal["LIVE", "REPLAY", "ESTIMATE", "SIMULATION", "UNAVAILABLE"]


class Driver(BaseModel):
    driver_number: int
    full_name: str
    name_acronym: str
    team_name: str
    team_colour: str
    broadcast_name: str | None = None
    headshot_url: str | None = None


class SessionInfo(BaseModel):
    session_key: int
    meeting_key: int
    session_name: str
    session_type: str
    circuit_short_name: str
    country_name: str
    year: int
    date_start: str
    date_end: str
    gmt_offset: str
    data_mode: DataMode


class TimingRow(BaseModel):
    position: int
    driver_number: int
    name_acronym: str
    team_colour: str
    interval: str | None = None
    gap_to_leader: str | None = None
    last_lap_ms: int | None = None
    compound: str | None = None
    tyre_age: int | None = None
    stale_seconds: float | None = None


class RaceControlEvent(BaseModel):
    date: str
    lap_number: int | None
    message: str
    flag: str | None
    category: str | None
    driver_number: int | None = None
    data_mode: DataMode = "REPLAY"


class CarMarker(BaseModel):
    driver_number: int
    x: float
    y: float
    interpolated: bool


class CircuitPath(BaseModel):
    x: list[float]
    y: list[float]


class CircuitCorner(BaseModel):
    number: int
    angle: float | None = None
    x: float
    y: float
    dist: float | None = None


class PitLoss(BaseModel):
    normal: float
    sc: float
    vsc: float


class CircuitInfo(BaseModel):
    circuit_key: int
    circuit_name: str
    rotation: float
    path: CircuitPath
    corners: list[CircuitCorner]
    pit_loss: PitLoss
    length_m: float | None = None


class StateAtTime(BaseModel):
    t_seconds: float
    current_lap: int | None
    red_flag: bool
    vsc: bool
    sc: bool
    timing: list[TimingRow]
    markers: list[CarMarker]
    data_mode: DataMode = "REPLAY"
    marker_mode: DataMode = "ESTIMATE"


class TelemetryLap(BaseModel):
    lap_number: int
    duration: float
    sectors: list[float | None]
    is_pit_out_lap: bool
    sd: list[float] | None = None
    speed: list[int | None]
    throttle: list[int | None]
    brake: list[int | None]


class TelemetryDriver(BaseModel):
    driver_number: int
    laps: list[TelemetryLap]


class TelemetryCompare(BaseModel):
    session_key: int
    length_m: float
    grid_points: int
    lap_selector: str
    drivers: list[TelemetryDriver]
