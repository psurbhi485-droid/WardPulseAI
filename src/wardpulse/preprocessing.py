"""Data preprocessing pipelines and column transformation utilities."""

from __future__ import annotations

import re
from typing import Any, Literal

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, RobustScaler, StandardScaler

from wardpulse.config import setup_logging

logger = setup_logging()

ScalingMethod = Literal["standard", "robust", "minmax", "none"]
ImputationStrategy = Literal["mean", "median", "most_frequent", "constant"]


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Return a new DataFrame with sanitized, lowercase, snake_case column names.

    The original DataFrame is never modified.

    Args:
        df: Input DataFrame.

    Returns:
        New DataFrame with standardized column names.
    """
    cleaned_df = df.copy()
    cleaned_names = []
    for col in cleaned_df.columns:
        # Strip whitespace, replace special characters, collapse spaces/dashes to underscores
        name = str(col).strip()
        name = re.sub(r"[^\w\s-]", " ", name)
        name = re.sub(r"[-\s]+", "_", name)
        name = name.strip("_").lower()
        cleaned_names.append(name)
    cleaned_df.columns = cleaned_names
    return cleaned_df


def clean_numeric_strings(
    df: pd.DataFrame,
    columns: list[str] | None = None,
    threshold: float = 0.8,
) -> pd.DataFrame:
    """Convert string columns with formatted numbers (commas, percentages) to numeric floats.

    Original DataFrame is never modified.

    Args:
        df: Input DataFrame.
        columns: Specific columns to clean, or None to auto-detect formatted numeric strings.
        threshold: Minimum fraction of non-null values that must convert to numeric (default: 0.8).

    Returns:
        New DataFrame with cleaned numeric columns.
    """
    cleaned_df = df.copy()

    if columns is not None:
        target_columns = [c for c in columns if c in cleaned_df.columns]
    else:
        target_columns = []
        for col in cleaned_df.select_dtypes(include=["object", "string"]).columns:
            non_null_series = cleaned_df[col].dropna()
            if non_null_series.empty:
                continue
            cleaned_vals = (
                non_null_series.astype(str)
                .str.replace(",", "", regex=False)
                .str.replace("%", "", regex=False)
                .str.strip()
            )
            parsed = pd.to_numeric(cleaned_vals, errors="coerce")
            valid_ratio = float(parsed.notnull().mean())
            if valid_ratio >= threshold:
                target_columns.append(col)

    for col in target_columns:
        if col in cleaned_df.columns:
            cleaned_series = (
                cleaned_df[col]
                .astype(str)
                .str.replace(",", "", regex=False)
                .str.replace("%", "", regex=False)
                .str.strip()
            )
            cleaned_df[col] = pd.to_numeric(cleaned_series, errors="coerce")
            logger.info("Converted formatted string column '%s' to numeric float", col)

    return cleaned_df


def get_scaler(scaling: ScalingMethod):
    """Factory for feature scalers.

    Args:
        scaling: Name of the scaling method ('standard', 'robust', 'minmax', 'none').

    Returns:
        Transformer instance or 'passthrough'.
    """
    if scaling == "standard":
        return StandardScaler()
    if scaling == "robust":
        return RobustScaler()
    if scaling == "minmax":
        return MinMaxScaler()
    if scaling == "none":
        return "passthrough"

    msg = f"Unknown scaling method '{scaling}'. Allowed: standard, robust, minmax, none"
    logger.error(msg)
    raise ValueError(msg)


def create_preprocessor(
    numeric_features: list[str],
    categorical_features: list[str] | None = None,
    scaling: ScalingMethod = "standard",
    numeric_imputer_strategy: ImputationStrategy = "median",
    categorical_imputer_strategy: ImputationStrategy = "most_frequent",
) -> ColumnTransformer:
    """Construct an automated Scikit-learn ColumnTransformer for mixed feature types.

    Args:
        numeric_features: List of numeric column names.
        categorical_features: Optional list of categorical column names.
        scaling: Scaling strategy for numeric features ('standard', 'robust', 'minmax', 'none').
        numeric_imputer_strategy: Imputer strategy for numerical features.
        categorical_imputer_strategy: Imputer strategy for categorical features.

    Returns:
        Configured Scikit-learn ColumnTransformer instance.
    """
    transformers = []

    if numeric_features:
        numeric_steps: list[tuple[str, Any]] = [
            ("imputer", SimpleImputer(strategy=numeric_imputer_strategy)),
        ]
        scaler = get_scaler(scaling)
        if scaler != "passthrough":
            numeric_steps.append(("scaler", scaler))

        numeric_pipeline = Pipeline(steps=numeric_steps)
        transformers.append(("num", numeric_pipeline, numeric_features))

    if categorical_features:
        categorical_pipeline = Pipeline(
            steps=[
                (
                    "imputer",
                    SimpleImputer(strategy=categorical_imputer_strategy, fill_value="missing"),
                ),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]
        )
        transformers.append(("cat", categorical_pipeline, categorical_features))

    if not transformers:
        msg = "At least one numeric or categorical feature must be specified for preprocessor."
        logger.error(msg)
        raise ValueError(msg)

    return ColumnTransformer(transformers=transformers, remainder="drop")


def clean_ward_features(
    df: pd.DataFrame, ward_id_col: str = "ward_id"
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Perform comprehensive data sanitization and validation on raw municipal ward features.

    Preserves original DataFrame by copying.

    Cleaning steps:
    1. Parse comma-separated numeric strings (e.g. '3,182' -> 3182.0).
    2. Parse percentage strings (e.g. '59.10%' -> 59.1).
    3. Validate geographic coordinates (latitude in [-90, 90], longitude in [-180, 180]).
    4. Handle missing police station data: creates binary 'has_local_police_station'
       and fills null text with 'None'.
    5. Check and report duplicate ward identifiers.

    Args:
        df: Raw input DataFrame.
        ward_id_col: Primary ward identifier column name.

    Returns:
        Tuple of (cleaned_dataframe, audit_report_dict).
    """
    cleaned = clean_numeric_strings(df)
    report: dict[str, Any] = {
        "initial_rows": len(df),
        "initial_columns": len(df.columns),
        "duplicate_ward_ids": 0,
        "invalid_coordinates_count": 0,
        "missing_police_stations_imputed": 0,
    }

    # Duplicate check on ward ID
    if ward_id_col in cleaned.columns:
        dup_count = int(cleaned[ward_id_col].duplicated().sum())
        report["duplicate_ward_ids"] = dup_count
        if dup_count > 0:
            cleaned = cleaned.drop_duplicates(subset=[ward_id_col], keep="first")
            logger.warning("Dropped %d duplicate records matching '%s'", dup_count, ward_id_col)

    # Missing police station handling
    if "police_stn" in cleaned.columns:
        null_count = int(cleaned["police_stn"].isnull().sum())
        report["missing_police_stations_imputed"] = null_count
        cleaned["has_local_police_station"] = cleaned["police_stn"].notnull().astype(int)
        cleaned["police_stn"] = cleaned["police_stn"].fillna("None")

    # Coordinate validation
    coord_cols = [c for c in cleaned.columns if any(k in c.lower() for k in ["lat", "lon"])]
    lat_col = next((c for c in coord_cols if "lat" in c.lower() and "relat" not in c.lower()), None)
    lon_col = next((c for c in coord_cols if "lon" in c.lower() or "lng" in c.lower()), None)

    if lat_col and lon_col:
        lat_valid = cleaned[lat_col].between(-90.0, 90.0) & cleaned[lat_col].notnull()
        lon_valid = cleaned[lon_col].between(-180.0, 180.0) & cleaned[lon_col].notnull()
        invalid_mask = ~(lat_valid & lon_valid)
        invalid_count = int(invalid_mask.sum())
        report["invalid_coordinates_count"] = invalid_count
        if invalid_count > 0:
            logger.warning("Detected %d records with invalid geographic coordinates", invalid_count)

    report["final_rows"] = len(cleaned)
    report["final_columns"] = len(cleaned.columns)
    return cleaned, report


def validate_and_merge_prediction_grid(
    grid_df: pd.DataFrame,
    features_df: pd.DataFrame,
    ward_id_col: str = "ward_id",
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Merge prediction grid with ward features and validate integrity.

    Args:
        grid_df: Template grid DataFrame containing (ward_id, month, category_group).
        features_df: Cleaned ward features DataFrame.
        ward_id_col: Common ward identifier column name.

    Returns:
        Tuple of (merged_dataframe, merge_report_dict).

    Raises:
        ValueError: If required grid columns are missing.
    """
    required_grid_cols = {ward_id_col, "month", "category_group"}
    missing_cols = required_grid_cols - set(grid_df.columns)
    if missing_cols:
        msg = f"Prediction grid is missing required columns: {sorted(missing_cols)}"
        logger.error(msg)
        raise ValueError(msg)

    if ward_id_col not in features_df.columns:
        msg = f"Ward features DataFrame is missing identifier column: '{ward_id_col}'"
        logger.error(msg)
        raise ValueError(msg)

    grid_wards = set(grid_df[ward_id_col].unique())
    feat_wards = set(features_df[ward_id_col].unique())

    unmatched_wards = sorted(list(grid_wards - feat_wards))
    merged = grid_df.merge(features_df, on=ward_id_col, how="left")

    report: dict[str, Any] = {
        "grid_rows": len(grid_df),
        "merged_rows": len(merged),
        "grid_unique_wards": len(grid_wards),
        "features_unique_wards": len(feat_wards),
        "unmatched_wards_count": len(unmatched_wards),
        "unmatched_wards": unmatched_wards,
        "is_complete_match": len(unmatched_wards) == 0,
        "unique_months": int(grid_df["month"].nunique()),
        "unique_categories": int(grid_df["category_group"].nunique()),
    }

    if unmatched_wards:
        logger.warning(
            "Found %d unmatched wards in prediction grid: %s",
            len(unmatched_wards),
            unmatched_wards[:10],
        )

    return merged, report
