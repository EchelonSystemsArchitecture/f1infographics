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

from .contracts import DriverLabRow, PredictionArena, SimulationEntry
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

    def mae(predicted: dict[int, int], subset: list[DriverLabRow]) -> float:
        errs = [
            abs(predicted[r.driver_number] - r.finish)
            for r in subset
            if r.finish is not None and r.driver_number in predicted
        ]
        return round(sum(errs) / len(errs), 4) if errs else 0.0

    # Both models are scored on exactly the same drivers so the improvement
    # headline is a like-for-like comparison.
    scored = [r for r in rows if r.grid is not None and r.avg_lap_ms is not None and r.finish is not None]

    # Baseline: predicted finish == grid order.
    by_grid = sorted([r for r in rows if r.grid is not None], key=lambda r: (r.grid, r.driver_number))
    baseline_pred = {r.driver_number: (r.grid or 0) for r in by_grid}

    # Model: predicted finish == average-pace order. Drivers without a measured
    # pace are ranked after paced drivers (by actual finish, then grid) so every
    # entry still receives a valid 1..n rank instead of the old placeholder 0.
    by_pace = sorted(
        rows,
        key=lambda r: (
            r.avg_lap_ms is None,
            r.avg_lap_ms if r.avg_lap_ms is not None else 0,
            r.finish if r.finish is not None else 999,
            r.grid if r.grid is not None else 999,
            r.driver_number,
        ),
    )
    model_pred: dict[int, int] = {r.driver_number: rank for rank, r in enumerate(by_pace, start=1)}

    baseline_mae = mae(baseline_pred, scored)
    model_mae = mae(model_pred, scored)

    entries: list[SimulationEntry] = []
    for r in sorted(rows, key=lambda x: model_pred[x.driver_number]):
        entries.append(
            SimulationEntry(
                driver_number=r.driver_number,
                name_acronym=r.name_acronym,
                grid=r.grid,
                predicted_finish=model_pred[r.driver_number],
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
