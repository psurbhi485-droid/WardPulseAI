"""Data validation, schema inspection, outlier detection, and profiling utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from wardpulse.config import setup_logging

logger = setup_logging()


@dataclass(frozen=True)
class SchemaSummary:
    """Summary of DataFrame dimensions, columns, and data types."""

    num_rows: int
    num_columns: int
    columns: list[str]
    dtypes: dict[str, str]
    numeric_columns: list[str]
    categorical_columns: list[str]
    datetime_columns: list[str]
    memory_usage_mb: float

    def to_dict(self) -> dict[str, Any]:
        """Convert schema summary to dictionary."""
        return {
            "num_rows": self.num_rows,
            "num_columns": self.num_columns,
            "columns": self.columns,
            "dtypes": self.dtypes,
            "numeric_columns": self.numeric_columns,
            "categorical_columns": self.categorical_columns,
            "datetime_columns": self.datetime_columns,
            "memory_usage_mb": self.memory_usage_mb,
        }


@dataclass(frozen=True)
class MissingValueSummary:
    """Detailed summary of missing data across all dataset fields."""

    total_cells: int
    missing_cells: int
    missing_percentage: float
    columns_with_missing: dict[str, int]
    columns_missing_percentages: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        """Convert missing value summary to dictionary."""
        return {
            "total_cells": self.total_cells,
            "missing_cells": self.missing_cells,
            "missing_percentage": self.missing_percentage,
            "columns_with_missing": self.columns_with_missing,
            "columns_missing_percentages": self.columns_missing_percentages,
        }


@dataclass(frozen=True)
class DuplicateSummary:
    """Summary of duplicate records detected within the dataset."""

    total_rows: int
    duplicate_rows: int
    duplicate_percentage: float
    subset_columns: list[str] | None

    def to_dict(self) -> dict[str, Any]:
        """Convert duplicate summary to dictionary."""
        return {
            "total_rows": self.total_rows,
            "duplicate_rows": self.duplicate_rows,
            "duplicate_percentage": self.duplicate_percentage,
            "subset_columns": self.subset_columns,
        }


@dataclass(frozen=True)
class OutlierSummary:
    """Summary of statistical outliers detected across numeric columns using IQR."""

    total_numeric_columns: int
    columns_with_outliers: dict[str, int]
    outlier_percentages: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        """Convert outlier summary to dictionary."""
        return {
            "total_numeric_columns": self.total_numeric_columns,
            "columns_with_outliers": self.columns_with_outliers,
            "outlier_percentages": self.outlier_percentages,
        }


@dataclass(frozen=True)
class WardIdentifierSummary:
    """Analysis of ward identifier integrity, cardinality, and uniqueness."""

    column_name: str
    total_records: int
    unique_wards: int
    missing_count: int
    is_unique: bool
    duplicate_ward_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        """Convert ward identifier summary to dictionary."""
        return {
            "column_name": self.column_name,
            "total_records": self.total_records,
            "unique_wards": self.unique_wards,
            "missing_count": self.missing_count,
            "is_unique": self.is_unique,
            "duplicate_ward_ids": self.duplicate_ward_ids,
        }


@dataclass(frozen=True)
class DatasetProfile:
    """Comprehensive diagnostic profile of an uploaded or loaded civic dataset."""

    schema: SchemaSummary
    missing: MissingValueSummary
    duplicates: DuplicateSummary


@dataclass(frozen=True)
class DataQualityReport:
    """Full health report evaluating civic data readiness for machine learning."""

    profile: DatasetProfile
    outliers: OutlierSummary
    ward_identifier: WardIdentifierSummary | None
    health_score: float
    readiness_status: str


def inspect_schema(df: pd.DataFrame) -> SchemaSummary:
    """Inspect DataFrame schema without modifying the underlying data.

    Args:
        df: Input DataFrame to inspect.

    Returns:
        SchemaSummary dataclass containing dimensions, column classifications, and types.
    """
    if not isinstance(df, pd.DataFrame):
        msg = f"Expected pandas DataFrame, received {type(df).__name__}"
        logger.error(msg)
        raise TypeError(msg)

    columns = list(df.columns.astype(str))
    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

    numeric_cols = list(df.select_dtypes(include=["number"]).columns.astype(str))
    datetime_cols = list(df.select_dtypes(include=["datetime", "datetimetz"]).columns.astype(str))
    categorical_cols = [
        col for col in columns if col not in numeric_cols and col not in datetime_cols
    ]

    memory_mb = round(float(df.memory_usage(deep=True).sum()) / (1024 * 1024), 4)

    return SchemaSummary(
        num_rows=int(df.shape[0]),
        num_columns=int(df.shape[1]),
        columns=columns,
        dtypes=dtypes,
        numeric_columns=numeric_cols,
        categorical_columns=categorical_cols,
        datetime_columns=datetime_cols,
        memory_usage_mb=memory_mb,
    )


def summarize_missing_values(df: pd.DataFrame) -> MissingValueSummary:
    """Compute detailed statistics on missing values per column and across the dataset.

    Args:
        df: Input DataFrame.

    Returns:
        MissingValueSummary dataclass.
    """
    if not isinstance(df, pd.DataFrame):
        msg = f"Expected pandas DataFrame, received {type(df).__name__}"
        logger.error(msg)
        raise TypeError(msg)

    total_cells = int(df.size)
    if total_cells == 0:
        return MissingValueSummary(
            total_cells=0,
            missing_cells=0,
            missing_percentage=0.0,
            columns_with_missing={},
            columns_missing_percentages={},
        )

    missing_per_col = df.isnull().sum()
    missing_cells = int(missing_per_col.sum())
    missing_pct = round((missing_cells / total_cells) * 100.0, 2)

    cols_with_missing = {
        str(col): int(count) for col, count in missing_per_col.items() if count > 0
    }
    cols_missing_pct = {
        str(col): round(float(count / len(df)) * 100.0, 2)
        for col, count in missing_per_col.items()
        if count > 0
    }

    return MissingValueSummary(
        total_cells=total_cells,
        missing_cells=missing_cells,
        missing_percentage=missing_pct,
        columns_with_missing=cols_with_missing,
        columns_missing_percentages=cols_missing_pct,
    )


def detect_duplicates(df: pd.DataFrame, subset: list[str] | None = None) -> DuplicateSummary:
    """Identify duplicate rows across the entire dataset or a specific subset of key columns.

    Args:
        df: Input DataFrame.
        subset: Optional list of column names to check for uniqueness (e.g. ward ID).

    Returns:
        DuplicateSummary dataclass.

    Raises:
        ValueError: If specified subset columns are not in DataFrame.
    """
    if not isinstance(df, pd.DataFrame):
        msg = f"Expected pandas DataFrame, received {type(df).__name__}"
        logger.error(msg)
        raise TypeError(msg)

    if subset is not None:
        missing_cols = [c for c in subset if c not in df.columns]
        if missing_cols:
            msg = f"Duplicate check subset contains columns not in DataFrame: {missing_cols}"
            logger.error(msg)
            raise ValueError(msg)

    total_rows = len(df)
    if total_rows == 0:
        return DuplicateSummary(
            total_rows=0,
            duplicate_rows=0,
            duplicate_percentage=0.0,
            subset_columns=subset,
        )

    duplicate_mask = df.duplicated(subset=subset, keep="first")
    duplicate_rows = int(duplicate_mask.sum())
    duplicate_pct = round((duplicate_rows / total_rows) * 100.0, 2)

    return DuplicateSummary(
        total_rows=total_rows,
        duplicate_rows=duplicate_rows,
        duplicate_percentage=duplicate_pct,
        subset_columns=subset,
    )


def detect_outliers(df: pd.DataFrame, iqr_multiplier: float = 1.5) -> OutlierSummary:
    """Detect statistical outliers across all numeric columns using the IQR method.

    Args:
        df: Input DataFrame.
        iqr_multiplier: Multiplier for IQR bounds (standard default 1.5).

    Returns:
        OutlierSummary dataclass.
    """
    if not isinstance(df, pd.DataFrame):
        msg = f"Expected pandas DataFrame, received {type(df).__name__}"
        logger.error(msg)
        raise TypeError(msg)

    numeric_cols = df.select_dtypes(include=["number"]).columns
    cols_with_outliers: dict[str, int] = {}
    outlier_percentages: dict[str, float] = {}

    total_rows = len(df)
    if total_rows == 0:
        return OutlierSummary(
            total_numeric_columns=len(numeric_cols),
            columns_with_outliers={},
            outlier_percentages={},
        )

    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 4:
            continue
        q25 = float(np.percentile(series, 25))
        q75 = float(np.percentile(series, 75))
        iqr = q75 - q25
        if iqr <= 0:
            continue
        lower_bound = q25 - (iqr_multiplier * iqr)
        upper_bound = q75 + (iqr_multiplier * iqr)
        outlier_count = int(((series < lower_bound) | (series > upper_bound)).sum())
        if outlier_count > 0:
            cols_with_outliers[str(col)] = outlier_count
            outlier_percentages[str(col)] = round((outlier_count / total_rows) * 100.0, 2)

    return OutlierSummary(
        total_numeric_columns=len(numeric_cols),
        columns_with_outliers=cols_with_outliers,
        outlier_percentages=outlier_percentages,
    )


def validate_ward_identifiers(df: pd.DataFrame, ward_column: str) -> WardIdentifierSummary:
    """Validate ward identifier column properties, uniqueness, and missingness.

    Args:
        df: Input DataFrame.
        ward_column: Name of the column intended as ward identifier.

    Returns:
        WardIdentifierSummary dataclass.

    Raises:
        ValueError: If ward_column does not exist in DataFrame.
    """
    if ward_column not in df.columns:
        msg = f"Ward identifier column '{ward_column}' not found in dataset."
        logger.error(msg)
        raise ValueError(msg)

    series = df[ward_column]
    total_records = len(series)
    missing_count = int(series.isnull().sum())
    non_null_series = series.dropna().astype(str)
    unique_wards = int(non_null_series.nunique())

    # Detect duplicates
    duplicates = non_null_series[non_null_series.duplicated(keep=False)].unique().tolist()
    is_unique = (unique_wards == total_records) and (missing_count == 0)

    return WardIdentifierSummary(
        column_name=ward_column,
        total_records=total_records,
        unique_wards=unique_wards,
        missing_count=missing_count,
        is_unique=is_unique,
        duplicate_ward_ids=sorted(duplicates[:10]),
    )


def profile_dataset(df: pd.DataFrame, key_subset: list[str] | None = None) -> DatasetProfile:
    """Generate a combined diagnostic profile of the dataset.

    Args:
        df: Input DataFrame.
        key_subset: Optional subset of columns to check for duplicates.

    Returns:
        DatasetProfile dataclass.
    """
    return DatasetProfile(
        schema=inspect_schema(df),
        missing=summarize_missing_values(df),
        duplicates=detect_duplicates(df, subset=key_subset),
    )


def generate_data_quality_report(
    df: pd.DataFrame, ward_column: str | None = None
) -> DataQualityReport:
    """Generate a comprehensive data quality and machine learning readiness audit.

    Calculates an objective health score (0-100) based on:
    - Missing cell penalty (up to 40 points deducted)
    - Duplicate row penalty (up to 30 points deducted)
    - Outlier severity penalty (up to 20 points deducted)
    - Ward identifier penalty (up to 10 points deducted if invalid)

    Args:
        df: Input DataFrame.
        ward_column: Optional ward identifier column to audit.

    Returns:
        DataQualityReport dataclass.
    """
    profile = profile_dataset(df)
    outliers = detect_outliers(df)

    ward_summary: WardIdentifierSummary | None = None
    if ward_column and ward_column in df.columns:
        ward_summary = validate_ward_identifiers(df, ward_column)

    # Calculate objective health score
    score = 100.0

    # Missing penalty (max 40)
    score -= min(profile.missing.missing_percentage * 1.5, 40.0)

    # Duplicate penalty (max 30)
    score -= min(profile.duplicates.duplicate_percentage * 3.0, 30.0)

    # Outlier penalty (max 20)
    if outliers.columns_with_outliers and outliers.total_numeric_columns > 0:
        avg_outlier_pct = float(np.mean(list(outliers.outlier_percentages.values())))
        score -= min(avg_outlier_pct * 1.0, 20.0)

    # Ward ID penalty (max 10)
    if ward_summary and not ward_summary.is_unique:
        score -= 10.0

    health_score = max(round(score, 1), 0.0)

    if health_score >= 85.0:
        status = "Optimal"
    elif health_score >= 70.0:
        status = "Good"
    elif health_score >= 50.0:
        status = "Acceptable (Needs Cleaning)"
    else:
        status = "Critical Deficiencies"

    return DataQualityReport(
        profile=profile,
        outliers=outliers,
        ward_identifier=ward_summary,
        health_score=health_score,
        readiness_status=status,
    )


def validate_target_column(df: pd.DataFrame, target_column: str) -> None:
    """Validate that a proposed target column exists and is suitable for regression.

    Args:
        df: Input DataFrame.
        target_column: Name of the target column to validate.

    Raises:
        ValueError: If the column is missing, non-numeric, or all null.
    """
    if target_column not in df.columns:
        msg = (
            f"Target column '{target_column}' not found in dataset. "
            f"Available columns: {list(df.columns)}"
        )
        logger.error(msg)
        raise ValueError(msg)

    series = df[target_column]
    if not pd.api.types.is_numeric_dtype(series):
        msg = (
            f"Target column '{target_column}' must have numeric dtype for regression. "
            f"Found dtype: {series.dtype}"
        )
        logger.error(msg)
        raise ValueError(msg)

    valid_count = series.dropna().count()
    if valid_count == 0:
        msg = f"Target column '{target_column}' contains only missing values."
        logger.error(msg)
        raise ValueError(msg)


def validate_feature_columns(df: pd.DataFrame, feature_columns: list[str]) -> None:
    """Validate that all requested feature columns exist in the DataFrame.

    Args:
        df: Input DataFrame.
        feature_columns: List of feature column names.

    Raises:
        ValueError: If any requested feature columns are missing or if list is empty.
    """
    if not feature_columns:
        msg = "At least one feature column must be specified."
        logger.error(msg)
        raise ValueError(msg)

    missing = [col for col in feature_columns if col not in df.columns]
    if missing:
        msg = (
            f"Feature columns not found in dataset: {missing}. "
            f"Available columns: {list(df.columns)}"
        )
        logger.error(msg)
        raise ValueError(msg)
