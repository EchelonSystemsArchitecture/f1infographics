import sys
from pathlib import Path
from typing import get_args

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import DataMode, StateAtTime, TimingRow


def test_data_mode_literal_values():
    assert set(get_args(DataMode)) == {"LIVE", "REPLAY", "ESTIMATE", "SIMULATION", "UNAVAILABLE"}


def test_state_at_time_defaults():
    state = StateAtTime(t_seconds=0, current_lap=None, red_flag=False, vsc=False, sc=False, timing=[], markers=[])
    assert state.data_mode == "REPLAY"
    assert state.marker_mode == "ESTIMATE"


def test_timing_row_requires_position_and_driver():
    row = TimingRow(position=1, driver_number=44, name_acronym="HAM", team_colour="#e80020")
    assert row.interval is None
    assert row.stale_seconds is None
