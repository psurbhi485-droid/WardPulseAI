"""Unit tests for wardpulse.data_validation module."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from wardpulse.data_validation import (
    detect_duplicates,
    detect_outliers,
    generate_data_quality_report,
    inspect_schema,
    profile_dataset,
    summarize_missing_values,
    validate_feature_columns,
    validate_target_column,
    validate_ward_identifiers,
)


def test_inspect_schema() -> None:
    """Validate schema inspection on mixed data types."""
    df = pd.DataFrame(
        {
            "ward_id": [1, 2, 3],
            "population": [1000.0, 2500.0, 3200.0],
            "zone_name": ["North", "South", "East"],
            "inspected_at": pd.to_datetime(["2026-01-01", "2026-01-02", "2026-01-03"]),
        }
    )

    schema = inspect_schema(df)
    assert schema.num_rows == 3
    assert schema.num_columns == 4
    assert "ward_id" in schema.numeric_columns
    assert "population" in schema.numeric_columns
    assert "zone_name" in schema.categorical_columns
    assert "inspected_at" in schema.datetime_columns
    assert schema.memory_usage_mb >= 0.0


def test_summarize_missing_values() -> None:
    """Validate missing value calculation across columns."""
    df = pd.DataFrame(
        {
            "a": [1, np.nan, 3, 4],
            "b": [np.nan, np.nan, "text", "text"],
            "c": [10, 20, 30, 40],
        }
    )

    missing = summarize_missing_values(df)
    assert missing.total_cells == 12
    assert missing.missing_cells == 3
    assert missing.columns_with_missing == {"a": 1, "b": 2}
    assert missing.columns_missing_percentages["a"] == 25.0
    assert missing.columns_missing_percentages["b"] == 50.0


def test_summarize_missing_values_empty() -> None:
    """Validate missing values on an empty DataFrame."""
    df = pd.DataFrame()
    missing = summarize_missing_values(df)
    assert missing.total_cells == 0
    assert missing.missing_cells == 0
    assert missing.missing_percentage == 0.0


def test_detect_duplicates() -> None:
    """Validate duplicate detection across all rows and subsets."""
    df = pd.DataFrame(
        {
            "id": [1, 2, 2, 3],
            "val": ["a", "b", "b", "c"],
        }
    )

    dups = detect_duplicates(df)
    assert dups.total_rows == 4
    assert dups.duplicate_rows == 1
    assert dups.duplicate_percentage == 25.0

    dups_sub = detect_duplicates(df, subset=["id"])
    assert dups_sub.duplicate_rows == 1


def test_detect_outliers() -> None:
    """Validate statistical outlier detection using the IQR method."""
    df = pd.DataFrame(
        {
            "normal_feat": [10.0, 11.0, 12.0, 10.5, 11.2, 10.8, 12.1],
            "outlier_feat": [10.0, 10.2, 10.5, 10.3, 10.4, 10.1, 999.0],  # 999 is outlier
        }
    )

    outliers = detect_outliers(df, iqr_multiplier=1.5)
    assert outliers.total_numeric_columns == 2
    assert "outlier_feat" in outliers.columns_with_outliers
    assert outliers.columns_with_outliers["outlier_feat"] == 1
    assert outliers.columns_with_outliers.get("normal_feat", 0) == 0


def test_validate_ward_identifiers() -> None:
    """Validate ward identifier cardinality and uniqueness analysis."""
    df_unique = pd.DataFrame({"ward": ["W1", "W2", "W3"]})
    res_unique = validate_ward_identifiers(df_unique, "ward")
    assert res_unique.is_unique is True
    assert res_unique.unique_wards == 3
    assert len(res_unique.duplicate_ward_ids) == 0

    df_dup = pd.DataFrame({"ward": ["W1", "W1", "W2"]})
    res_dup = validate_ward_identifiers(df_dup, "ward")
    assert res_dup.is_unique is False
    assert res_dup.unique_wards == 2
    assert "W1" in res_dup.duplicate_ward_ids


def test_generate_data_quality_report() -> None:
    """Validate data quality report generation and health score calculation."""
    df = pd.DataFrame(
        {
            "ward": ["W1", "W2", "W3", "W4"],
            "pop": [100.0, 200.0, 150.0, 180.0],
            "score": [1.0, 2.0, 3.0, 4.0],
        }
    )
    report = generate_data_quality_report(df, ward_column="ward")
    assert report.health_score > 80.0
    assert report.readiness_status in {"Optimal", "Good"}


def test_profile_dataset() -> None:
    """Validate full profile generation."""
    df = pd.DataFrame({"x": [1, 2, 3], "y": ["a", "b", "c"]})
    profile = profile_dataset(df)
    assert profile.schema.num_rows == 3
    assert profile.missing.missing_cells == 0
    assert profile.duplicates.duplicate_rows == 0


def test_validate_target_column() -> None:
    """Validate target column checking for regression suitability."""
    df = pd.DataFrame({"complaints": [5, 10, 15], "name": ["w1", "w2", "w3"]})

    validate_target_column(df, "complaints")

    with pytest.raises(ValueError, match="not found in dataset"):
        validate_target_column(df, "non_existent")

    with pytest.raises(ValueError, match="must have numeric dtype"):
        validate_target_column(df, "name")


def test_validate_feature_columns() -> None:
    """Validate feature column verification."""
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})

    validate_feature_columns(df, ["a", "b"])

    with pytest.raises(ValueError, match="At least one feature column"):
        validate_feature_columns(df, [])

    with pytest.raises(ValueError, match="Feature columns not found"):
        validate_feature_columns(df, ["a", "missing_col"])
