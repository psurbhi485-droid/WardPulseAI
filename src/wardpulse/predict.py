"""Inference, prediction interfaces, and statistically defensible uncertainty quantification."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.pipeline import Pipeline

from wardpulse.config import setup_logging

logger = setup_logging()


def predict_demand(
    model: BaseEstimator,
    features: pd.DataFrame,
    clip_negative: bool = True,
) -> np.ndarray:
    """Generate complaint volume predictions for given ward feature inputs.

    Args:
        model: Trained estimator or Scikit-learn Pipeline.
        features: DataFrame containing required input features.
        clip_negative: If True, clips negative values to 0.0 (complaints cannot be negative).

    Returns:
        Array of predicted values.

    Raises:
        ValueError: If predictions fail.
    """
    try:
        raw_predictions = model.predict(features)
        predictions = np.asarray(raw_predictions, dtype=float)
        if clip_negative:
            predictions = np.clip(predictions, a_min=0.0, a_max=None)
        return predictions
    except Exception as exc:
        msg = f"Inference execution failed: {exc}"
        logger.error(msg)
        raise ValueError(msg) from exc


def predict_with_uncertainty(
    model: Any,
    features: pd.DataFrame,
    confidence_level: float = 0.95,
    method: str = "empirical_quantile",
    clip_negative: bool = True,
) -> dict[str, np.ndarray]:
    """Estimate statistically defensible prediction uncertainty using tree ensemble distributions.

    Never presents arbitrary percentages. For Random Forest ensembles, constructs
    intervals from the empirical distribution of individual decision tree predictions.

    Args:
        model: Trained estimator or Pipeline.
        features: Input features DataFrame.
        confidence_level: Confidence level for prediction intervals (0.90 or 0.95).
        method: 'empirical_quantile' (non-parametric) or 'normal_approx' (parametric).
        clip_negative: If True, clips lower bound to 0.0.

    Returns:
        Dictionary containing:
            - 'mean': Mean prediction across ensemble.
            - 'std': Standard deviation across estimators.
            - 'lower_bound': Lower confidence interval bound.
            - 'upper_bound': Upper confidence interval bound.
    """
    regressor = model
    transformed_features = features

    if isinstance(model, Pipeline):
        if "preprocessor" in model.named_steps:
            transformed_features = model.named_steps["preprocessor"].transform(features)
        regressor = model.named_steps.get("regressor", model)

    if hasattr(regressor, "estimators_") and len(regressor.estimators_) > 0:
        features_arr = (
            transformed_features.values
            if isinstance(transformed_features, pd.DataFrame)
            else transformed_features
        )
        tree_predictions = np.array([tree.predict(features_arr) for tree in regressor.estimators_])
        mean_pred = np.mean(tree_predictions, axis=0)
        std_pred = np.std(tree_predictions, axis=0)

        if method == "empirical_quantile":
            alpha = (1.0 - confidence_level) / 2.0
            lower_pct = alpha * 100.0
            upper_pct = (1.0 - alpha) * 100.0
            lower = np.percentile(tree_predictions, lower_pct, axis=0)
            upper = np.percentile(tree_predictions, upper_pct, axis=0)
        else:
            z_score = 1.96 if confidence_level == 0.95 else 1.645
            lower = mean_pred - (z_score * std_pred)
            upper = mean_pred + (z_score * std_pred)

        if clip_negative:
            mean_pred = np.clip(mean_pred, a_min=0.0, a_max=None)
            lower = np.clip(lower, a_min=0.0, a_max=None)
            upper = np.clip(upper, a_min=0.0, a_max=None)

        return {
            "mean": mean_pred,
            "std": std_pred,
            "lower_bound": lower,
            "upper_bound": upper,
        }

    point_pred = predict_demand(model, features, clip_negative=clip_negative)
    zero_std = np.zeros_like(point_pred)
    return {
        "mean": point_pred,
        "std": zero_std,
        "lower_bound": point_pred,
        "upper_bound": point_pred,
    }


def format_uncertainty_interval(mean: float, lower: float, upper: float) -> str:
    """Format prediction with confidence interval in a clean defensible format."""
    return f"{mean:.1f} [{lower:.1f} – {upper:.1f}]"


def generate_prediction_grid_submission(
    grid_df: pd.DataFrame,
    features_df: pd.DataFrame,
    pipeline: Any | None = None,
    feature_cols: list[str] | None = None,
    mode: str = "heuristic_baseline",
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Generate and strictly validate the official 4,320-row competition submission.

    Args:
        grid_df: Template grid containing (ward_id, month, category_group).
        features_df: Cleaned ward attributes DataFrame.
        pipeline: Optional fitted Scikit-learn Pipeline (used when mode='supervised_model').
        feature_cols: Predictor features used during training.
        mode: Operating mode: 'supervised_model' or 'heuristic_baseline'.

    Returns:
        Tuple of (submission_dataframe, validation_report_dict).

    Raises:
        ValueError: If required grid columns are missing.
    """
    required_cols = {"ward_id", "month", "category_group"}
    missing = required_cols - set(grid_df.columns)
    if missing:
        msg = f"Template grid missing required columns: {sorted(missing)}"
        logger.error(msg)
        raise ValueError(msg)

    sub_df = grid_df[["ward_id", "month", "category_group"]].copy()

    if mode == "supervised_model" and pipeline is not None and feature_cols:
        # Merge grid with ward features to build prediction matrix
        merged = sub_df.merge(features_df, on="ward_id", how="left")
        avail_features = [f for f in feature_cols if f in merged.columns]
        if len(avail_features) == len(feature_cols):
            raw_preds = pipeline.predict(merged[feature_cols])
            preds = np.clip(np.round(np.asarray(raw_preds, dtype=float), 2), 0.0, None)
            sub_df["predicted_count"] = preds
        else:
            logger.warning("Feature mismatch during supervised inference. Falling back to baseline.")
            mode = "heuristic_baseline"

    if mode != "supervised_model" or "predicted_count" not in sub_df.columns:
        # Transparent physical-infrastructure demand baseline
        merged = sub_df.merge(features_df, on="ward_id", how="left")
        if "population_2011" in merged.columns:
            pop = merged["population_2011"].fillna(features_df["population_2011"].median()).values
            base_rate = (pop / 10000.0) * 8.0  # Scaled by population density
        else:
            base_rate = np.full(len(sub_df), 15.0)

        # Domain category demand weights
        category_weights = {
            "solid_waste": 1.4,
            "roads": 1.2,
            "electrical": 1.0,
            "trees": 0.6,
            "animals_health": 0.5,
            "other": 0.7,
        }
        cat_multipliers = merged["category_group"].map(category_weights).fillna(1.0).values
        sub_df["predicted_count"] = np.round(np.clip(base_rate * cat_multipliers, 0.0, None), 2)

    # Validation Checks
    exact_row_count = len(sub_df) == 4320
    exact_columns = list(sub_df.columns) == ["ward_id", "month", "category_group", "predicted_count"]
    zero_nulls = int(sub_df.isnull().sum().sum()) == 0
    zero_duplicates = int(sub_df.duplicated(subset=["ward_id", "month", "category_group"]).sum()) == 0
    all_non_negative = bool((sub_df["predicted_count"] >= 0.0).all())

    is_valid = (
        exact_row_count
        and exact_columns
        and zero_nulls
        and zero_duplicates
        and all_non_negative
    )

    report = {
        "is_valid": is_valid,
        "row_count": len(sub_df),
        "columns": list(sub_df.columns),
        "null_count": int(sub_df.isnull().sum().sum()),
        "duplicate_count": int(sub_df.duplicated(subset=["ward_id", "month", "category_group"]).sum()),
        "min_predicted_count": float(sub_df["predicted_count"].min()),
        "max_predicted_count": float(sub_df["predicted_count"].max()),
        "mean_predicted_count": float(sub_df["predicted_count"].mean()),
        "operating_mode": mode,
        "methodology": (
            "Supervised Random Forest / Gradient Boosted Model"
            if mode == "supervised_model"
            else "Transparent Multi-Factor Physical Infrastructure Demand Baseline (Unsupervised Heuristic)"
        ),
    }

    return sub_df, report
