"""Explainable AI (XAI) interfaces, global and local prediction explainers."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from sklearn.pipeline import Pipeline

from wardpulse.config import setup_logging

logger = setup_logging()


def is_shap_available() -> bool:
    """Check if the SHAP library is installed in the current environment."""
    try:
        import shap  # noqa: F401

        return True
    except ImportError:
        return False


def get_feature_importances(
    model: Any,
    feature_names: list[str],
) -> pd.DataFrame:
    """Extract intrinsic feature importances from tree-based models.

    Args:
        model: Trained estimator or Scikit-learn Pipeline.
        feature_names: Names corresponding to input features.

    Returns:
        DataFrame containing features and importance scores, sorted descending.

    Raises:
        ValueError: If model does not provide feature importances.
    """
    regressor = model
    if isinstance(model, Pipeline):
        regressor = model.named_steps.get("regressor", model)

    if not hasattr(regressor, "feature_importances_"):
        msg = f"Model '{type(regressor).__name__}' does not provide feature_importances_."
        logger.error(msg)
        raise ValueError(msg)

    importances = regressor.feature_importances_
    if len(importances) != len(feature_names):
        msg = (
            f"Feature count mismatch: model has {len(importances)} weights "
            f"but received {len(feature_names)} feature names."
        )
        logger.error(msg)
        raise ValueError(msg)

    df_importance = (
        pd.DataFrame(
            {
                "feature": feature_names,
                "importance": importances,
            }
        )
        .sort_values(by="importance", ascending=False)
        .reset_index(drop=True)
    )

    total = df_importance["importance"].sum()
    if total > 0:
        df_importance["importance_pct"] = (df_importance["importance"] / total) * 100.0
    else:
        df_importance["importance_pct"] = 0.0

    return df_importance


def compute_permutation_importance(
    model: Any,
    X: pd.DataFrame,
    y: pd.Series | np.ndarray,
    n_repeats: int = 5,
    random_state: int = 42,
) -> pd.DataFrame:
    """Compute model-agnostic permutation feature importances.

    Args:
        model: Trained estimator or Pipeline.
        X: Evaluation features DataFrame.
        y: True target values.
        n_repeats: Number of times to permute each feature.
        random_state: Random state seed.

    Returns:
        DataFrame with feature, mean_importance, and std_importance.
    """
    result = permutation_importance(
        model,
        X,
        y,
        n_repeats=n_repeats,
        random_state=random_state,
        scoring="neg_mean_absolute_error",
    )

    df_perm = (
        pd.DataFrame(
            {
                "feature": list(X.columns),
                "mean_importance": result.importances_mean,
                "std_importance": result.importances_std,
            }
        )
        .sort_values(by="mean_importance", ascending=False)
        .reset_index(drop=True)
    )

    return df_perm


def explain_individual_prediction(
    model: Any,
    instance_features: pd.Series | dict[str, Any] | pd.DataFrame,
    feature_names: list[str],
    reference_dataset: pd.DataFrame,
) -> pd.DataFrame:
    """Explain an individual ward prediction by decomposing feature deviations from baseline.

    For a given ward, decomposes how its feature values deviate from the municipal
    dataset baseline, weighted by the model's feature importance attribution.

    Args:
        model: Trained pipeline or estimator.
        instance_features: Features for the specific ward to explain.
        feature_names: List of input feature names.
        reference_dataset: Full dataset used to establish reference baseline means.

    Returns:
        DataFrame with local attribution breakdown sorted by absolute impact.
    """
    if isinstance(instance_features, pd.DataFrame):
        inst_series = instance_features.iloc[0]
    elif isinstance(instance_features, dict):
        inst_series = pd.Series(instance_features)
    else:
        inst_series = instance_features

    regressor = model
    if isinstance(model, Pipeline):
        regressor = model.named_steps.get("regressor", model)

    # Get feature weights
    if hasattr(regressor, "feature_importances_"):
        raw_weights = regressor.feature_importances_
        sum_w = np.sum(raw_weights)
        weights = (
            raw_weights / sum_w if sum_w > 0 else np.ones(len(feature_names)) / len(feature_names)
        )
    else:
        weights = np.ones(len(feature_names)) / len(feature_names)

    records = []
    for i, feat in enumerate(feature_names):
        val = inst_series.get(feat, np.nan)
        if feat in reference_dataset.columns and pd.api.types.is_numeric_dtype(
            reference_dataset[feat]
        ):
            baseline_mean = float(reference_dataset[feat].mean())
            baseline_std = float(reference_dataset[feat].std())
            val_float = float(val) if pd.notnull(val) else baseline_mean

            # Normalized z-score deviation
            z_diff = (val_float - baseline_mean) / (baseline_std + 1e-6)
            local_attribution = float(z_diff * weights[i] * 10.0)

            direction = "Pushes Demand Higher" if local_attribution > 0 else "Lowers Demand"
            records.append(
                {
                    "feature": feat,
                    "ward_value": round(val_float, 2),
                    "municipal_avg": round(baseline_mean, 2),
                    "local_impact": round(local_attribution, 3),
                    "direction": direction,
                }
            )
        else:
            records.append(
                {
                    "feature": feat,
                    "ward_value": str(val),
                    "municipal_avg": "N/A",
                    "local_impact": 0.0,
                    "direction": "Neutral",
                }
            )

    res_df = pd.DataFrame(records)
    res_df["abs_impact"] = res_df["local_impact"].abs()
    return (
        res_df.sort_values(by="abs_impact", ascending=False)
        .drop(columns=["abs_impact"])
        .reset_index(drop=True)
    )


def get_shap_explainer(model: Any, X_background: pd.DataFrame) -> Any:
    """Instantiate a SHAP TreeExplainer or Explainer if SHAP is installed.

    Args:
        model: Trained model or pipeline.
        X_background: Background reference dataset for SHAP values.

    Returns:
        Configured SHAP explainer instance.

    Raises:
        ImportError: If shap package is not installed.
    """
    if not is_shap_available():
        msg = (
            "SHAP is an optional dependency and is not installed. Install it via: pip install shap"
        )
        logger.error(msg)
        raise ImportError(msg)

    import shap

    regressor = model
    if isinstance(model, Pipeline):
        regressor = model.named_steps.get("regressor", model)

    return shap.Explainer(regressor, X_background)
