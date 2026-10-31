"""Model factory, regression definitions, cold-start validation, and model comparison."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any, Literal

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, KFold, train_test_split
from sklearn.pipeline import Pipeline

from wardpulse.config import setup_logging
from wardpulse.evaluate import compute_regression_metrics

logger = setup_logging()

ModelType = Literal["baseline", "random_forest", "xgboost"]


def is_xgboost_available() -> bool:
    """Check if XGBoost is installed in the current environment."""
    try:
        import xgboost  # noqa: F401

        return True
    except ImportError:
        return False


def create_baseline_model(strategy: str = "mean") -> DummyRegressor:
    """Create a baseline dummy regressor for benchmarking.

    Args:
        strategy: Prediction strategy ('mean', 'median', 'quantile', 'constant').

    Returns:
        Configured DummyRegressor.
    """
    return DummyRegressor(strategy=strategy)


def create_random_forest_model(
    n_estimators: int = 100,
    max_depth: int | None = None,
    min_samples_split: int = 2,
    random_state: int = 42,
) -> RandomForestRegressor:
    """Create a Scikit-learn Random Forest regressor.

    Args:
        n_estimators: Number of trees in the forest.
        max_depth: Maximum depth of each tree.
        min_samples_split: Minimum number of samples required to split an internal node.
        random_state: Seed for reproducibility.

    Returns:
        Configured RandomForestRegressor.
    """
    return RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        random_state=random_state,
        n_jobs=-1,
    )


def create_xgboost_model(
    n_estimators: int = 100,
    max_depth: int = 6,
    learning_rate: float = 0.1,
    random_state: int = 42,
    **kwargs: Any,
) -> Any:
    """Create an XGBoost regressor if available.

    Args:
        n_estimators: Number of boosting rounds.
        max_depth: Maximum tree depth.
        learning_rate: Boosting learning rate.
        random_state: Seed for reproducibility.
        **kwargs: Extra parameters passed to XGBRegressor.

    Returns:
        XGBRegressor instance.

    Raises:
        ImportError: If xgboost package is not installed.
    """
    if not is_xgboost_available():
        msg = (
            "XGBoost is an optional dependency and is not currently installed. "
            "Install it via: pip install xgboost"
        )
        logger.error(msg)
        raise ImportError(msg)

    import xgboost as xgb

    return xgb.XGBRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        random_state=random_state,
        **kwargs,
    )


def get_model(model_type: ModelType, **kwargs: Any) -> BaseEstimator:
    """Factory function for instantiating model estimators.

    Args:
        model_type: 'baseline', 'random_forest', or 'xgboost'.
        **kwargs: Parameters passed to the specific model constructor.

    Returns:
        BaseEstimator instance.

    Raises:
        ValueError: If model_type is unknown.
    """
    if model_type == "baseline":
        return create_baseline_model(**kwargs)
    if model_type == "random_forest":
        return create_random_forest_model(**kwargs)
    if model_type == "xgboost":
        return create_xgboost_model(**kwargs)

    msg = f"Unknown model type '{model_type}'. Supported: baseline, random_forest, xgboost"
    logger.error(msg)
    raise ValueError(msg)


def build_pipeline(
    preprocessor: ColumnTransformer,
    regressor: BaseEstimator,
) -> Pipeline:
    """Combine a preprocessor and regressor into a single Scikit-learn Pipeline.

    Args:
        preprocessor: Configured ColumnTransformer.
        regressor: Regression model instance.

    Returns:
        Unified Pipeline.
    """
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", regressor),
        ]
    )


class WardHoldoutSplitter:
    """Splitter ensuring no data leakage across municipal wards during validation."""

    def __init__(
        self,
        n_splits: int = 5,
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> None:
        """Initialize splitter.

        Args:
            n_splits: Number of cross-validation folds.
            test_size: Ratio of test holdout for single train/test split.
            random_state: Seed for reproducibility.
        """
        self.n_splits = n_splits
        self.test_size = test_size
        self.random_state = random_state

    def train_test_split(
        self,
        df: pd.DataFrame,
        ward_column: str | None = None,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Perform train/test holdout split respecting ward boundaries if a ward column is provided.

        Args:
            df: Input DataFrame.
            ward_column: Optional column identifying the ward.

        Returns:
            Tuple of (train_df, test_df).
        """
        if ward_column and ward_column in df.columns:
            gss = GroupShuffleSplit(
                n_splits=1,
                test_size=self.test_size,
                random_state=self.random_state,
            )
            groups = df[ward_column]
            train_idx, test_idx = next(gss.split(df, groups=groups))
            return df.iloc[train_idx].copy(), df.iloc[test_idx].copy()

        train_df, test_df = train_test_split(
            df,
            test_size=self.test_size,
            random_state=self.random_state,
        )
        return train_df.copy(), test_df.copy()

    def split_folds(
        self,
        df: pd.DataFrame,
        ward_column: str | None = None,
    ) -> Iterator[tuple[np.ndarray, np.ndarray]]:
        """Generate train/validation indices for cross-validation.

        Args:
            df: Input DataFrame.
            ward_column: Optional column identifying the ward.

        Yields:
            (train_indices, val_indices) pairs.
        """
        if ward_column and ward_column in df.columns:
            gkf = GroupKFold(n_splits=self.n_splits)
            groups = df[ward_column]
            yield from gkf.split(df, groups=groups)
        else:
            kf = KFold(n_splits=self.n_splits, shuffle=True, random_state=self.random_state)
            yield from kf.split(df)


class ColdStartHoldoutSplitter:
    """Specialized splitter designed for Cold-Start Ward Demand Prediction.

    Simulates the zero-historical-data regime by completely isolating a set of
    wards as unseen cold-start targets. The model is trained exclusively on
    'known' wards and evaluated on 'unseen' cold-start wards.
    """

    def __init__(self, test_size: float = 0.25, random_state: int = 42) -> None:
        """Initialize cold-start splitter.

        Args:
            test_size: Proportion of distinct wards to reserve as cold-start holdout.
            random_state: Seed for reproducibility.
        """
        self.test_size = test_size
        self.random_state = random_state

    def split_cold_start(
        self,
        df: pd.DataFrame,
        ward_column: str,
    ) -> tuple[pd.DataFrame, pd.DataFrame, list[Any], list[Any]]:
        """Split dataset into historical training wards and unseen cold-start holdout wards.

        Args:
            df: Input DataFrame.
            ward_column: Column name identifying wards.

        Returns:
            Tuple of:
            - train_df (historical wards)
            - test_df (cold-start wards)
            - train_wards (list of ward IDs seen in training)
            - cold_start_wards (list of ward IDs evaluated as cold-start)

        Raises:
            ValueError: If ward_column not found in DataFrame.
        """
        if ward_column not in df.columns:
            msg = f"Ward column '{ward_column}' not found in DataFrame."
            logger.error(msg)
            raise ValueError(msg)

        unique_wards = df[ward_column].dropna().unique()
        n_wards = len(unique_wards)

        if n_wards < 2:
            return df.copy(), df.copy(), list(unique_wards), list(unique_wards)

        rng = np.random.default_rng(self.random_state)
        shuffled_wards = rng.permutation(unique_wards)

        n_test = max(1, int(np.round(n_wards * self.test_size)))
        cold_start_wards = list(shuffled_wards[:n_test])
        train_wards = list(shuffled_wards[n_test:])

        train_df = df[df[ward_column].isin(train_wards)].copy()
        test_df = df[df[ward_column].isin(cold_start_wards)].copy()

        logger.info(
            "Cold-Start Split: %d historical wards (%d rows), %d cold-start wards (%d rows)",
            len(train_wards),
            len(train_df),
            len(cold_start_wards),
            len(test_df),
        )

        return train_df, test_df, train_wards, cold_start_wards


def compare_models(
    X_train: pd.DataFrame,
    y_train: pd.Series | np.ndarray,
    X_test: pd.DataFrame,
    y_test: pd.Series | np.ndarray,
    preprocessor: ColumnTransformer,
    random_state: int = 42,
) -> pd.DataFrame:
    """Train and evaluate Baseline, Random Forest, and optional XGBoost side-by-side.

    Evaluates models on the exact same holdout split to produce defensible,
    measured comparison metrics.

    Args:
        X_train: Training features.
        y_train: Training target.
        X_test: Holdout test features.
        y_test: Holdout test target.
        preprocessor: Scikit-learn ColumnTransformer.
        random_state: Random state seed.

    Returns:
        DataFrame comparing MAE, RMSE, R², and MAPE across algorithms.
    """
    models_to_test: list[tuple[str, BaseEstimator]] = [
        ("Baseline (Mean)", create_baseline_model(strategy="mean")),
        ("Random Forest", create_random_forest_model(n_estimators=100, random_state=random_state)),
    ]

    if is_xgboost_available():
        models_to_test.append(
            ("XGBoost", create_xgboost_model(n_estimators=100, random_state=random_state))
        )

    results = []
    y_test_arr = np.asarray(y_test, dtype=float)

    for name, estimator in models_to_test:
        try:
            pipe = build_pipeline(preprocessor, estimator)
            pipe.fit(X_train, y_train)
            raw_preds = pipe.predict(X_test)
            preds = np.clip(np.asarray(raw_preds, dtype=float), 0.0, None)
            metrics = compute_regression_metrics(y_test_arr, preds)

            results.append(
                {
                    "Model": name,
                    "MAE": metrics["mae"],
                    "RMSE": metrics["rmse"],
                    "R² Score": metrics["r2"],
                    "MAPE (%)": metrics["mape"],
                }
            )
        except Exception as exc:
            logger.warning("Failed evaluating model '%s': %s", name, exc)

    return pd.DataFrame(results).sort_values(by="MAE", ascending=True).reset_index(drop=True)
