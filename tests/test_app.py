"""Comprehensive integration tests for WardPulse AI core interfaces, algorithms, and components."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from dashboard.components import (
    THEMES,
    get_theme_colors,
    style_plotly_chart,
)
from dashboard.map_view import detect_coordinate_columns, detect_ward_id_column
from wardpulse.config import (
    MODELS_DIR,
    OFFICIAL_DATA_DIR,
    PROJECT_ROOT,
    REPORTS_DIR,
    ensure_directories,
)
from wardpulse.evaluate import compute_regression_metrics, compute_residuals
from wardpulse.explainability import (
    compute_permutation_importance,
    explain_individual_prediction,
    get_feature_importances,
    is_shap_available,
)
from wardpulse.feature_engineering import (
    aggregate_complaint_categories,
    aggregate_ward_features,
    build_spatial_intelligence_features,
    compute_log_transform,
    compute_ratio_feature,
    compute_spatial_neighbour_features,
    detect_complaint_type_columns,
    extract_candidate_features,
)
from wardpulse.predict import (
    format_uncertainty_interval,
    generate_prediction_grid_submission,
    predict_demand,
    predict_with_uncertainty,
)
from wardpulse.preprocessing import create_preprocessor
from wardpulse.prioritization import (
    PriorityTier,
    assign_priority_tier,
    calculate_resource_priority,
    compute_civic_vulnerability_index,
)
from wardpulse.train import (
    ColdStartHoldoutSplitter,
    WardHoldoutSplitter,
    compare_models,
    create_baseline_model,
    create_random_forest_model,
    get_model,
    is_xgboost_available,
)


def test_config_and_directory_creation() -> None:
    """Validate directory constants and creation function."""
    assert PROJECT_ROOT.exists()
    ensure_directories()
    assert OFFICIAL_DATA_DIR.exists()
    assert MODELS_DIR.exists()
    assert REPORTS_DIR.exists()


def test_baseline_and_random_forest_models() -> None:
    """Validate model creation, fitting, and basic inference."""
    X = pd.DataFrame({"x1": [1.0, 2.0, 3.0, 4.0, 5.0], "x2": [5.0, 4.0, 3.0, 2.0, 1.0]})
    y = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])

    baseline = create_baseline_model(strategy="mean")
    baseline.fit(X, y)
    preds_base = baseline.predict(X)
    assert np.allclose(preds_base, 30.0)

    rf = create_random_forest_model(n_estimators=10, random_state=42)
    rf.fit(X, y)
    preds_rf = rf.predict(X)
    assert len(preds_rf) == 5

    model = get_model("baseline")
    assert model is not None

    with pytest.raises(ValueError, match="Unknown model type"):
        get_model("unsupported_type")  # type: ignore[arg-type]


def test_xgboost_availability() -> None:
    """Validate xgboost check returns boolean without unhandled exception."""
    available = is_xgboost_available()
    assert isinstance(available, bool)


def test_ward_holdout_splitter() -> None:
    """Validate ward-level holdout splitting avoids data leakage across groups."""
    df = pd.DataFrame(
        {
            "ward": ["W1", "W1", "W2", "W2", "W3", "W3", "W4", "W4"],
            "feat": [1, 2, 3, 4, 5, 6, 7, 8],
            "target": [10, 20, 30, 40, 50, 60, 70, 80],
        }
    )

    splitter = WardHoldoutSplitter(n_splits=2, test_size=0.25, random_state=42)

    train_df, test_df = splitter.train_test_split(df, ward_column="ward")
    train_wards = set(train_df["ward"])
    test_wards = set(test_df["ward"])
    assert train_wards.isdisjoint(test_wards)

    folds = list(splitter.split_folds(df, ward_column="ward"))
    assert len(folds) == 2


def test_cold_start_holdout_splitter() -> None:
    """Validate strict cold-start simulation isolates target wards completely."""
    df = pd.DataFrame(
        {
            "ward_id": ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
            "population": [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500],
            "complaints": [12, 18, 25, 30, 42, 50, 61, 75],
        }
    )

    splitter = ColdStartHoldoutSplitter(test_size=0.25, random_state=42)
    train_df, test_df, train_w, cold_w = splitter.split_cold_start(df, ward_column="ward_id")

    # Verify distinct disjoint ward sets
    assert set(train_w).isdisjoint(set(cold_w))
    assert len(cold_w) == 2
    assert len(train_w) == 6
    assert len(train_df) == 6
    assert len(test_df) == 2


def test_compare_models() -> None:
    """Validate side-by-side benchmarking of Baseline vs Random Forest."""
    X_train = pd.DataFrame(
        {"feat_1": [1.0, 2.0, 3.0, 4.0, 5.0], "feat_2": [5.0, 4.0, 3.0, 2.0, 1.0]}
    )
    y_train = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    X_test = pd.DataFrame({"feat_1": [2.5, 4.5], "feat_2": [3.5, 1.5]})
    y_test = pd.Series([25.0, 45.0])

    prep = create_preprocessor(numeric_features=["feat_1", "feat_2"])
    comp_df = compare_models(X_train, y_train, X_test, y_test, preprocessor=prep, random_state=42)

    assert "Model" in comp_df.columns
    assert "MAE" in comp_df.columns
    assert "R² Score" in comp_df.columns
    # Check baseline and RF are present
    models = list(comp_df["Model"])
    assert any("Baseline" in m for m in models)
    assert any("Random Forest" in m for m in models)


def test_evaluate_regression_metrics() -> None:
    """Validate exact computation of regression metrics."""
    y_true = np.array([10.0, 20.0, 30.0])
    y_pred = np.array([10.0, 20.0, 30.0])

    metrics = compute_regression_metrics(y_true, y_pred)
    assert metrics["mae"] == 0.0
    assert metrics["rmse"] == 0.0
    assert metrics["r2"] == 1.0

    with pytest.raises(ValueError, match="empty arrays"):
        compute_regression_metrics([], [])

    with pytest.raises(ValueError, match="Shape mismatch"):
        compute_regression_metrics([1.0], [1.0, 2.0])


def test_compute_residuals() -> None:
    """Validate residual table calculations."""
    y_true = np.array([10.0, 25.0])
    y_pred = np.array([12.0, 20.0])

    res_df = compute_residuals(y_true, y_pred)
    assert list(res_df.columns) == ["actual", "predicted", "residual", "absolute_error"]
    assert np.allclose(res_df["residual"], [-2.0, 5.0])
    assert np.allclose(res_df["absolute_error"], [2.0, 5.0])


def test_predict_and_uncertainty() -> None:
    """Validate inference and ensemble tree variance uncertainty quantification."""
    X = pd.DataFrame({"x1": [1.0, 2.0, 3.0, 4.0], "x2": [4.0, 3.0, 2.0, 1.0]})
    y = pd.Series([10.0, 20.0, 30.0, 40.0])

    rf = create_random_forest_model(n_estimators=10, random_state=42)
    rf.fit(X, y)

    preds = predict_demand(rf, X, clip_negative=True)
    assert len(preds) == 4
    assert np.all(preds >= 0.0)

    unc = predict_with_uncertainty(rf, X, confidence_level=0.95)
    assert "mean" in unc
    assert "std" in unc
    assert "lower_bound" in unc
    assert "upper_bound" in unc
    assert len(unc["mean"]) == 4
    assert np.all(unc["lower_bound"] <= unc["upper_bound"])

    formatted = format_uncertainty_interval(42.5, 36.1, 48.9)
    assert formatted == "42.5 [36.1 – 48.9]"


def test_explainability_global_and_individual() -> None:
    """Validate global feature importance and individual prediction attribution."""
    X = pd.DataFrame({"feat_a": [1.0, 2.0, 3.0, 4.0], "feat_b": [4.0, 3.0, 2.0, 1.0]})
    y = pd.Series([10.0, 20.0, 30.0, 40.0])

    rf = create_random_forest_model(n_estimators=10, random_state=42)
    rf.fit(X, y)

    df_imp = get_feature_importances(rf, ["feat_a", "feat_b"])
    assert list(df_imp.columns) == ["feature", "importance", "importance_pct"]
    assert len(df_imp) == 2

    df_perm = compute_permutation_importance(rf, X, y, n_repeats=2, random_state=42)
    assert list(df_perm.columns) == ["feature", "mean_importance", "std_importance"]
    assert len(df_perm) == 2

    # Individual prediction explanation
    target_instance = pd.Series({"feat_a": 4.5, "feat_b": 0.5})
    df_indiv = explain_individual_prediction(
        model=rf,
        instance_features=target_instance,
        feature_names=["feat_a", "feat_b"],
        reference_dataset=X,
    )
    assert "feature" in df_indiv.columns
    assert "local_impact" in df_indiv.columns
    assert "direction" in df_indiv.columns
    assert len(df_indiv) == 2

    assert isinstance(is_shap_available(), bool)


def test_spatial_neighbour_features() -> None:
    """Validate neighbour lag intelligence feature calculation from coordinates."""
    df = pd.DataFrame(
        {
            "ward": ["W1", "W2", "W3"],
            "lat": [12.97, 12.98, 12.99],
            "lon": [77.59, 77.60, 77.61],
            "population": [1000.0, 2000.0, 3000.0],
        }
    )

    df_lag = compute_spatial_neighbour_features(
        df,
        latitude_column="lat",
        longitude_column="lon",
        feature_columns=["population"],
        k_neighbors=2,
    )

    assert "population_neighbour_mean" in df_lag.columns
    assert len(df_lag) == 3
    # Check that original columns are intact
    assert "population" in df_lag.columns


def test_complaint_category_detection() -> None:
    """Validate semantic keyword matching for civic complaint categories."""
    cols = ["ward_id", "pothole_complaints", "garbage_collection_issues", "water_leak_count"]
    matched = detect_complaint_type_columns(cols)
    assert "roads" in matched
    assert "pothole_complaints" in matched["roads"]
    assert "garbage" in matched
    assert "water" in matched

    df = pd.DataFrame(
        {
            "pothole_complaints": [10, 20],
            "garbage_collection_issues": [15, 25],
            "water_leak_count": [5, 15],
        }
    )
    agg_df = aggregate_complaint_categories(df, matched)
    assert "category" in agg_df.columns
    assert "total_complaints" in agg_df.columns
    assert len(agg_df) == 3


def test_resource_prioritization() -> None:
    """Validate municipal resource prioritization scoring and ranking."""
    demand = np.array([10.0, 80.0, 50.0])
    wards = ["Ward A", "Ward B", "Ward C"]

    df_pri = calculate_resource_priority(
        predicted_demand=demand,
        ward_identifiers=wards,
        uncertainty_std=np.array([1.0, 5.0, 2.0]),
    )

    assert len(df_pri) == 3
    assert df_pri.iloc[0]["ward"] == "Ward B"
    assert df_pri.iloc[0]["priority_tier"] in {PriorityTier.CRITICAL.value, PriorityTier.HIGH.value}
    assert "recommended_action" in df_pri.columns


def test_assign_priority_tier() -> None:
    """Validate threshold logic for priority tiers."""
    assert assign_priority_tier(90.0) == PriorityTier.CRITICAL
    assert assign_priority_tier(60.0) == PriorityTier.HIGH
    assert assign_priority_tier(35.0) == PriorityTier.MEDIUM
    assert assign_priority_tier(10.0) == PriorityTier.LOW


def test_feature_engineering_utilities() -> None:
    """Validate feature candidate extraction, ratios, and transformations."""
    df = pd.DataFrame(
        {
            "ward": ["W1", "W2"],
            "population": [1000.0, 2000.0],
            "area": [2.0, 4.0],
            "category": ["Urban", "Suburban"],
        }
    )

    num_cols, cat_cols = extract_candidate_features(df, exclude_columns=["ward"])
    assert "population" in num_cols
    assert "area" in num_cols
    assert "category" in cat_cols

    df_ratio = compute_ratio_feature(
        df,
        numerator_column="population",
        denominator_column="area",
        output_feature_name="density",
    )
    assert np.allclose(df_ratio["density"], [500.0, 500.0])

    df_log = compute_log_transform(df, column="population")
    assert "population_log" in df_log.columns
    assert np.all(df_log["population_log"] > 0)

    incidents = pd.DataFrame(
        {
            "ward": ["W1", "W1", "W2"],
            "response_time": [10.0, 20.0, 15.0],
        }
    )
    df_agg = aggregate_ward_features(
        incidents,
        group_column="ward",
        aggregations={"response_time": ["mean"]},
    )
    assert "response_time_mean" in df_agg.columns
    assert len(df_agg) == 2


def test_theme_and_components() -> None:
    """Validate theme color definitions and component styling helpers."""
    assert "dark" in THEMES
    assert "light" in THEMES
    dark_colors = get_theme_colors()
    assert "bg" in dark_colors
    assert "card" in dark_colors
    assert "accent" in dark_colors

    import plotly.graph_objects as go

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=[1, 2], y=[3, 4]))
    styled = style_plotly_chart(fig)
    assert styled.layout.template is not None


def test_detect_coordinate_columns_centroid() -> None:
    """Validate coordinate detection handles BBMP centroid naming conventions."""
    cols = ["ward_id", "centroid_lat", "centroid_lon", "population_2011"]
    lat_col, lon_col = detect_coordinate_columns(cols)
    assert lat_col == "centroid_lat"
    assert lon_col == "centroid_lon"


def test_detect_ward_id_column() -> None:
    """Validate ward identifier detection."""
    cols = ["ward_id", "ward_name", "population_2011"]
    assert detect_ward_id_column(cols) == "ward_id"
    assert detect_ward_id_column(["ward_no", "area"]) == "ward_no"
    assert detect_ward_id_column(["area_sq_km", "notes"]) is None


def test_official_bangalore_datasets_integrity() -> None:
    """Validate presence and structure of official BBMP Bangalore dataset files."""
    from wardpulse.config import OFFICIAL_DATA_DIR
    from wardpulse.data_loader import load_csv, load_geojson

    feat_path = OFFICIAL_DATA_DIR / "ward_features.csv"
    geo_path = OFFICIAL_DATA_DIR / "wards.geojson"
    grid_path = OFFICIAL_DATA_DIR / "prediction_grid_template.csv"
    sub_path = OFFICIAL_DATA_DIR / "sample_submission.csv"

    if feat_path.exists():
        df_feat = load_csv(feat_path)
        assert len(df_feat) == 198
        assert "ward_id" in df_feat.columns
        assert "centroid_lat" in df_feat.columns
        assert "centroid_lon" in df_feat.columns

    if geo_path.exists():
        gj = load_geojson(geo_path)
        assert gj.get("type") == "FeatureCollection"
        assert len(gj.get("features", [])) == 198

    if grid_path.exists():
        df_grid = load_csv(grid_path)
        assert len(df_grid) == 4320
        assert set(df_grid.columns) == {"ward_id", "month", "category_group"}
        assert df_grid["ward_id"].nunique() == 40
        assert df_grid["month"].nunique() == 18
        assert df_grid["category_group"].nunique() == 6

    if sub_path.exists():
        df_sub = load_csv(sub_path)
        assert "predicted_count" in df_sub.columns
