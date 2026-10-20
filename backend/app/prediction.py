"""Prediction Arena — transparent deterministic what-if simulation.

Honesty constraints (master directive):
- FREE + non-monetary. No betting, no odds, no stakes.
- This is a **transparent deterministic model**, NOT a black-box "AI". The method
  is stated in the payload; every input is an ingested number.
- data_mode is always SIMULATION — never LIVE, never presented as a forecast of
  an unrun race.
- A *calibrated* probabilistic predictor (Brier / log-loss / calibration curves)
  requires temporal validation across many historical races, which is blocked on
  generalizing ingest beyond the single ingested session. That limitation is
  documented rather than faked with a wrapper.
"""

from __future__ import annotations

from pathlib import Path

from .contracts import PredictionArena, SimulationEntry
from .driver_lab import build_driver_lab

_NOTE = (
    "Deterministic what-if: predicts finishing order from observed average race "
    "pace, then scores it against the grid-only baseline on this same session. "
    "This is a transparent simulation (SIMULATION), not a calibrated forecast. "
    "A probabilistic predictor with Brier/calibration needs temporal validation "
    "across many races — blocked until ingest is generalized beyond one session."
)


def build_prediction(data_dir: Path, session_key: int) -> PredictionArena:
    lab = build_driver_lab(data_dir, session_key)
    rows = [r for r in lab.drivers if r.finish is not None and not r.dnf]

    def mae(predicted: dict[int, int]) -> float:
        errs = []
        for r in rows:
            pred = predicted.get(r.driver_number)
            if pred is None:
                continue
            errs.append(abs(pred - (r.finish or 0)))
        return round(sum(errs) / len(errs), 4) if errs else 0.0

    # Baseline: predicted finish == grid order.
    by_grid = sorted([r for r in rows if r.grid is not None], key=lambda r: r.grid or 99)
    baseline_pred = {r.driver_number: (r.grid or 0) for r in by_grid}

    # Model: predicted finish == average-pace order (fastest avg lap first).
    by_pace = sorted([r for r in rows if r.avg_lap_ms is not None], key=lambda r: r.avg_lap_ms or 1e9)
    model_pred: dict[int, int] = {}
    for rank, r in enumerate(by_pace, start=1):
        model_pred[r.driver_number] = rank

    baseline_mae = mae(baseline_pred)
    model_mae = mae(model_pred)

    entries: list[SimulationEntry] = []
    for r in sorted(rows, key=lambda x: model_pred.get(x.driver_number, 999)):
        d = next((d for d in lab.drivers if d.driver_number == r.driver_number), None)
        entries.append(
            SimulationEntry(
                driver_number=r.driver_number,
                name_acronym=r.name_acronym,
                grid=r.grid,
                predicted_finish=model_pred.get(r.driver_number, 0),
                actual_finish=r.finish,
            )
        )

    return PredictionArena(
        session_key=session_key,
        method="pace-order (avg race lap) vs grid-order baseline",
        entries=entries,
        accuracy_vs_baseline={
            "baseline_mae": baseline_mae,
            "model_mae": model_mae,
            "improvement": round(baseline_mae - model_mae, 4),
        },
        note=_NOTE,
    )
