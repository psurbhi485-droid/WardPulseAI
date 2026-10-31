"""Unit tests for wardpulse.preprocessing module."""

from __future__ import annotations

import pandas as pd
import pytest
from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

from wardpulse.preprocessing import (
    clean_column_names,
    clean_numeric_strings,
    clean_ward_features,
    create_preprocessor,
    get_scaler,
    validate_and_merge_prediction_grid,
)


def test_clean_column_names() -> None:
    """Validate sanitization of column names without mutating original."""
    df_orig = pd.DataFrame(
        {
            " Ward ID # ": [1, 2],
            "Total-Population (2026)": [5000, 6000],
            "Water_Supply!": [10, 20],
        }
    )

    df_cleaned = clean_column_names(df_orig)

    # Check cleaned names
    assert list(df_cleaned.columns) == ["ward_id", "total_population_2026", "water_supply"]
    # Ensure original is unchanged
    assert list(df_orig.columns) == [
        " Ward ID # ",
        "Total-Population (2026)",
        "Water_Supply!",
    ]


def test_get_scaler() -> None:
    """Validate scaler factory output types."""
    assert isinstance(get_scaler("standard"), StandardScaler)
    assert isinstance(get_scaler("robust"), RobustScaler)
    assert isinstance(get_scaler("minmax"), MinMaxScaler)
    assert get_scaler("none") == "passthrough"

    with pytest.raises(ValueError, match="Unknown scaling method"):
        get_scaler("invalid")  # type: ignore[arg-type]


def test_create_preprocessor_transformation() -> None:
    """Validate end-to-end preprocessing pipeline on mixed types."""
    df = pd.DataFrame(
        {
            "population": [1000.0, None, 3000.0],
            "area": [2.5, 4.0, 1.5],
            "zone": ["North", "South", None],
        }
    )

    preprocessor = create_preprocessor(
        numeric_features=["population", "area"],
        categorical_features=["zone"],
        scaling="standard",
    )

    transformed = preprocessor.fit_transform(df)
    # 2 numeric columns + one-hot encoded categories (2 unique non-null + missing = 3)
    assert transformed.shape[0] == 3
    assert transformed.shape[1] >= 4


def test_create_preprocessor_empty_raises() -> None:
    """Validate that passing no features raises a ValueError."""
    with pytest.raises(ValueError, match="At least one numeric or categorical feature"):
        create_preprocessor(numeric_features=[], categorical_features=[])


def test_clean_numeric_strings_auto_detect() -> None:
    """Validate automatic detection and conversion of formatted numbers."""
    df = pd.DataFrame(
        {
            "ward_name": ["Ward A", "Ward B", "Ward C"],
            "density": ["3,182", "5,635", "6,606"],
            "growth": ["59.10%", "86.50%", "142.00%"],
            "mixed": ["Text", "123", "More Text"],
        }
    )

    cleaned = clean_numeric_strings(df)

    # density and growth should now be numeric float
    assert pd.api.types.is_numeric_dtype(cleaned["density"])
    assert pd.api.types.is_numeric_dtype(cleaned["growth"])
    assert cleaned["density"].iloc[0] == 3182.0
    assert cleaned["growth"].iloc[0] == 59.10
    # ward_name and mixed should remain untouched
    assert cleaned["ward_name"].iloc[0] == "Ward A"
    assert not pd.api.types.is_numeric_dtype(cleaned["mixed"])
    # Original should be unchanged
    assert df["density"].iloc[0] == "3,182"


def test_clean_numeric_strings_explicit_columns() -> None:
    """Validate explicit column specification for numeric conversion."""
    df = pd.DataFrame(
        {
            "val_a": ["1,000", "2,000"],
            "val_b": ["3,000", "4,000"],
        }
    )

    cleaned = clean_numeric_strings(df, columns=["val_a"])
    assert pd.api.types.is_numeric_dtype(cleaned["val_a"])
    assert not pd.api.types.is_numeric_dtype(cleaned["val_b"])


def test_clean_ward_features() -> None:
    """Validate comprehensive data ingestion sanitization for ward attributes."""
    df = pd.DataFrame(
        {
            "ward_id": [1, 2, 2],  # Duplicate ward_id = 2
            "density": ["3,182", "5,635", "5,635"],
            "growth": ["59.10%", "86.50%", "86.50%"],
            "police_stn": ["Yelahanka", None, None],
            "centroid_lat": [13.1, 13.2, 13.2],
            "centroid_lon": [77.6, 77.7, 77.7],
        }
    )

    cleaned, report = clean_ward_features(df, ward_id_col="ward_id")

    # Duplicate dropped
    assert len(cleaned) == 2
    assert report["duplicate_ward_ids"] == 1
    # Formatted numeric converted
    assert cleaned["density"].iloc[0] == 3182.0
    assert cleaned["growth"].iloc[0] == 59.10
    # Police station imputed and flagged
    assert cleaned["has_local_police_station"].tolist() == [1, 0]
    assert cleaned["police_stn"].tolist() == ["Yelahanka", "None"]
    assert report["invalid_coordinates_count"] == 0


def test_validate_and_merge_prediction_grid() -> None:
    """Validate merging template grid with ward attributes."""
    grid = pd.DataFrame(
        {
            "ward_id": [1, 1, 2, 3],
            "month": ["2024-01", "2024-02", "2024-01", "2024-01"],
            "category_group": ["electrical", "electrical", "roads", "trees"],
        }
    )
    features = pd.DataFrame(
        {
            "ward_id": [1, 2],
            "ward_name": ["Ward One", "Ward Two"],
            "population_2011": [10000, 20000],
        }
    )

    merged, report = validate_and_merge_prediction_grid(grid, features, ward_id_col="ward_id")

    assert len(merged) == 4
    assert report["grid_unique_wards"] == 3
    assert report["features_unique_wards"] == 2
    assert report["unmatched_wards_count"] == 1
    assert report["unmatched_wards"] == [3]
    assert not report["is_complete_match"]
