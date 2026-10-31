"""Model evaluation metrics and residual diagnostic utilities."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from wardpulse.config import setup_logging

logger = setup_logging()


def compute_regression_metrics(
    y_true: np.ndarray | pd.Series | list[float],
    y_pred: np.ndarray | pd.Series | list[float],
) -> dict[str, float]:
    """Compute standard regression metrics: MAE, RMSE, R², and MAPE.

    Args:
        y_true: Ground truth target values.
        y_pred: Model predictions.

    Returns:
        Dictionary mapping metric names to computed floating point values.

    Raises:
        ValueError: If input lengths do not match or arrays are empty.
    """
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)

    if y_true_arr.size == 0 or y_pred_arr.size == 0:
        msg = "Cannot compute metrics on empty arrays."
        logger.error(msg)
        raise ValueError(msg)

    if y_true_arr.shape != y_pred_arr.shape:
        msg = f"Shape mismatch: y_true {y_true_arr.shape} vs y_pred {y_pred_arr.shape}"
        logger.error(msg)
        raise ValueError(msg)

    mae = float(mean_absolute_error(y_true_arr, y_pred_arr))
    mse = float(mean_squared_error(y_true_arr, y_pred_arr))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true_arr, y_pred_arr))

    # Safe MAPE calculation to prevent zero division
    non_zero_mask = y_true_arr != 0
    if np.any(non_zero_mask):
        rel_errors = (
            np.abs(y_true_arr[non_zero_mask] - y_pred_arr[non_zero_mask])
            / y_true_arr[non_zero_mask]
        )
        mape = float(np.mean(rel_errors) * 100.0)
    else:
        mape = 0.0

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "mape": round(mape, 4),
    }


def compute_residuals(
    y_true: np.ndarray | pd.Series | list[float],
    y_pred: np.ndarray | pd.Series | list[float],
) -> pd.DataFrame:
    """Calculate point-by-point residual diagnostic metrics.

    Args:
        y_true: Ground truth target values.
        y_pred: Model predictions.

    Returns:
        DataFrame containing actual, predicted, residual, and absolute errors.
    """
    y_true_arr = np.asarray(y_true, dtype=float)
    y_pred_arr = np.asarray(y_pred, dtype=float)

    if y_true_arr.shape != y_pred_arr.shape:
        msg = f"Shape mismatch: y_true {y_true_arr.shape} vs y_pred {y_pred_arr.shape}"
        logger.error(msg)
        raise ValueError(msg)

    residual = y_true_arr - y_pred_arr
    abs_error = np.abs(residual)

    return pd.DataFrame(
        {
            "actual": y_true_arr,
            "predicted": y_pred_arr,
            "residual": residual,
            "absolute_error": abs_error,
        }
    )
