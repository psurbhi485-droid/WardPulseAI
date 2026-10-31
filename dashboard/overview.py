"""Overview and data ingestion component for WardPulse AI dashboard."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st

from dashboard.components import (
    render_empty_state,
    render_header,
    render_metric_card,
    render_status_badge,
)
from wardpulse.config import RAW_DATA_DIR
from wardpulse.data_loader import list_available_raw_datasets, load_csv, load_dataset, load_geojson
from wardpulse.data_validation import generate_data_quality_report
from wardpulse.explainability import is_shap_available
from wardpulse.feature_engineering import (
    build_spatial_intelligence_features,
    detect_complaint_type_columns,
)
from wardpulse.preprocessing import clean_numeric_strings, clean_ward_features
from wardpulse.train import is_xgboost_available


def is_geopandas_available() -> bool:
    """Check if geopandas is available."""
    try:
        import geopandas  # noqa: F401

        return True
    except ImportError:
        return False


def render_environment_status() -> None:
    """Render diagnostic status cards of core and optional software dependencies."""
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        render_metric_card("Core Pipeline", "Active", "Scikit-learn • Pandas", delta="Ready")
    with col2:
        geo_status = "Installed" if is_geopandas_available() else "Optional"
        sub = "Vector Boundaries" if is_geopandas_available() else "Not Required"
        render_metric_card("GeoPandas", geo_status, sub)
    with col3:
        xgb_status = "Installed" if is_xgboost_available() else "Optional"
        sub = "Gradient Boosting" if is_xgboost_available() else "RF Active"
        render_metric_card("XGBoost", xgb_status, sub)
    with col4:
        shap_status = "Installed" if is_shap_available() else "Optional"
        sub = "Game Theory XAI" if is_shap_available() else "Tree XAI Active"
        render_metric_card("SHAP", shap_status, sub)


def render_overview() -> None:
    """Render the primary overview, welcome section, and data ingestion workbench."""
    render_header(
        title="Civic Intelligence Overview",
        subtitle="Cold-start complaint forecasting and resource allocation for municipal bodies",
    )

    render_environment_status()

    st.markdown("---")
    st.subheader("Data Ingestion Hub")

    official_features_path = RAW_DATA_DIR / "official" / "ward_features.csv"
    official_geojson_path = RAW_DATA_DIR / "official" / "wards.geojson"
    official_grid_path = RAW_DATA_DIR / "official" / "prediction_grid_template.csv"

    # Fast 1-click loader for official BBMP Bangalore dataset if detected
    if official_features_path.exists():
        st.info(
            "✦ **Official BBMP Bangalore Dataset Bundle Detected**: "
            "`ward_features.csv` (198 wards), `wards.geojson` (198 boundaries), and "
            "`prediction_grid_template.csv` (4,320 target rows) are ready in `data/raw/official/`."
        )
        if st.button("⚡ Load Official Bangalore BBMP Dataset Bundle", type="primary"):
            try:
                raw_df = load_csv(official_features_path)
                cleaned_df, clean_report = clean_ward_features(raw_df)
                engineered_df = build_spatial_intelligence_features(cleaned_df, k_neighbors=4)

                st.session_state["dataset"] = engineered_df
                st.session_state["dataset_name"] = "Official BBMP Bangalore Wards (ward_features.csv)"
                st.session_state["clean_report"] = clean_report
                st.session_state["spatial_engineered"] = True

                if official_geojson_path.exists():
                    st.session_state["geojson"] = load_geojson(official_geojson_path)

                st.success("Successfully loaded official BBMP dataset, spatial features, and boundary geometry!")
                st.rerun()
            except Exception as exc:
                st.error(f"Error loading official bundle: {exc}")

    col_up, col_sel = st.columns([1, 1])

    with col_up:
        uploaded_file = st.file_uploader(
            "Upload Civic / Ward Dataset",
            type=["csv", "xlsx", "xls", "geojson", "json", "parquet"],
            help="Upload raw municipal dataset or ward attributes file.",
        )
        if uploaded_file is not None:
            try:
                file_ext = Path(uploaded_file.name).suffix.lower()
                if file_ext == ".csv":
                    df = pd.read_csv(uploaded_file)
                elif file_ext in {".xlsx", ".xls"}:
                    df = pd.read_excel(uploaded_file)
                elif file_ext == ".parquet":
                    df = pd.read_parquet(uploaded_file)
                else:
                    content = uploaded_file.getvalue().decode("utf-8")
                    parsed_json = json.loads(content)
                    if (
                        isinstance(parsed_json, dict)
                        and parsed_json.get("type") == "FeatureCollection"
                    ):
                        st.session_state["geojson"] = parsed_json
                        features = parsed_json.get("features", [])
                        records = [f.get("properties", {}) for f in features]
                        df = pd.DataFrame(records)
                    else:
                        df = pd.DataFrame(parsed_json)

                df = clean_numeric_strings(df)
                st.session_state["dataset"] = df
                st.session_state["dataset_name"] = uploaded_file.name
                st.success(f"Loaded: {uploaded_file.name}")
            except Exception as exc:
                st.error(f"Error loading uploaded file: {exc}")

    with col_sel:
        available_files = list_available_raw_datasets(RAW_DATA_DIR)
        file_options: dict[str, Path] = {f"{f.parent.name}/{f.name}": f for f in available_files}
        selected_option = st.selectbox(
            "Or Select Local Dataset from 'data/raw/'",
            options=["None"] + list(file_options.keys()),
            help="Select existing file from data/raw/official or data/raw/manual_test",
        )
        if selected_option != "None":
            selected_path = file_options[selected_option]
            try:
                if selected_path.suffix.lower() in {".geojson", ".json"}:
                    gj = load_geojson(selected_path)
                    st.session_state["geojson"] = gj
                    features = gj.get("features", [])
                    records = [f.get("properties", {}) for f in features]
                    df = pd.DataFrame(records)
                else:
                    df = load_dataset(selected_path)
                    df = clean_numeric_strings(df)

                # Auto-link geojson if loading ward_features
                if "ward_features" in selected_path.name and official_geojson_path.exists():
                    st.session_state["geojson"] = load_geojson(official_geojson_path)

                st.session_state["dataset"] = df
                st.session_state["dataset_name"] = selected_path.name
                st.success(f"Loaded: {selected_path.name}")
            except Exception as exc:
                st.error(f"Error loading dataset: {exc}")

    st.markdown("---")

    df: pd.DataFrame | None = st.session_state.get("dataset")

    if df is None:
        render_empty_state(
            title="Official Competition Dataset Pending",
            description=(
                "The official municipal dataset has not been loaded into the active session yet. "
                "WardPulse AI operates under strict data integrity standards: "
                "no pseudo-predictions, synthetic accuracy, or fake boundaries are fabricated."
            ),
            icon="📊",
            instructions=[
                "Click the 'Load Official Bangalore BBMP Dataset Bundle' button above",
                "Or select a dataset from data/raw/official using the selector",
                "Dynamic schema profiling and spatial intelligence activate automatically",
            ],
        )
        return

    # Dataset loaded state: render comprehensive intelligence overview
    dataset_name = st.session_state.get("dataset_name", "Active Dataset")
    st.subheader(f"Data Profile & Quality Audit: {dataset_name}")

    # Ward candidate selection for audit
    ward_col_guess = next(
        (c for c in df.columns if any(k in str(c).lower() for k in ["ward", "zone", "id", "area"])),
        None,
    )
    quality_report = generate_data_quality_report(df, ward_column=ward_col_guess)
    profile = quality_report.profile

    # Primary high-level metrics
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        render_metric_card("Total Records", f"{profile.schema.num_rows:,}", "Municipal Rows")
    with m2:
        render_metric_card(
            "Total Features",
            profile.schema.num_columns,
            f"{len(profile.schema.numeric_columns)} numeric",
        )
    with m3:
        status_color = "Optimal" if quality_report.health_score >= 80 else "Audit Needed"
        render_metric_card("Data Health Score", f"{quality_report.health_score}/100", status_color)
    with m4:
        model_status = "Trained" if "trained_pipeline" in st.session_state else "Ready to Train"
        render_metric_card("Model Readiness", model_status, "Cold-Start Engine")

    # Feature categorization and civic complaint breakdown
    complaint_cats = detect_complaint_type_columns(list(df.columns))

    tab_data, tab_schema, tab_audit, tab_civic, tab_challenge = st.tabs(
        [
            "Data Preview",
            "Schema & Classifications",
            "Quality & Outliers",
            "Civic Categories",
            "Prediction Grid Staging",
        ]
    )

    with tab_data:
        st.dataframe(df.head(10), use_container_width=True)

    with tab_schema:
        schema_df = pd.DataFrame(
            {
                "Column": profile.schema.columns,
                "Data Type": [profile.schema.dtypes[c] for c in profile.schema.columns],
                "Classification": [
                    "Numeric Predictor"
                    if c in profile.schema.numeric_columns
                    else "Datetime"
                    if c in profile.schema.datetime_columns
                    else "Categorical / ID"
                    for c in profile.schema.columns
                ],
            }
        )
        st.dataframe(schema_df, use_container_width=True)

    with tab_audit:
        c_a1, c_a2 = st.columns(2)
        with c_a1:
            st.markdown("#### Missing Values")
            if profile.missing.columns_with_missing:
                miss_df = pd.DataFrame(
                    {
                        "Column": list(profile.missing.columns_with_missing.keys()),
                        "Missing Count": list(profile.missing.columns_with_missing.values()),
                        "Missing %": [
                            profile.missing.columns_missing_percentages[c]
                            for c in profile.missing.columns_with_missing
                        ],
                    }
                ).sort_values(by="Missing Count", ascending=False)
                st.dataframe(miss_df, use_container_width=True)
            else:
                st.success("Zero missing cells detected across all columns.")

        with c_a2:
            st.markdown("#### Statistical Outliers (IQR Method)")
            if quality_report.outliers.columns_with_outliers:
                out_df = pd.DataFrame(
                    {
                        "Column": list(quality_report.outliers.columns_with_outliers.keys()),
                        "Outliers": list(quality_report.outliers.columns_with_outliers.values()),
                        "Outlier %": [
                            quality_report.outliers.outlier_percentages[c]
                            for c in quality_report.outliers.columns_with_outliers
                        ],
                    }
                ).sort_values(by="Outliers", ascending=False)
                st.dataframe(out_df, use_container_width=True)
            else:
                st.success("No statistical outliers outside 1.5x IQR.")

    with tab_civic:
        if complaint_cats:
            st.markdown("#### Detected Complaint Categories")
            for cat, cols in complaint_cats.items():
                st.info(f"**{cat.capitalize()} Complaints**: Matched columns `{cols}`")
        else:
            st.caption(
                "No individual complaint count columns (roads, garbage, water) were found. "
                "Demand categories are staged in `prediction_grid_template.csv`."
            )

    with tab_challenge:
        if official_grid_path.exists():
            grid_df = pd.read_csv(official_grid_path)
            st.markdown("#### Official Hackathon Prediction Grid Specification")
            g1, g2, g3, g4 = st.columns(4)
            with g1:
                render_metric_card(
                    "Test Target Wards", grid_df["ward_id"].nunique(), "Cold-Start Subset"
                )
            with g2:
                render_metric_card(
                    "Horizon Months",
                    grid_df["month"].nunique(),
                    f"{grid_df['month'].min()} to {grid_df['month'].max()}",
                )
            with g3:
                render_metric_card(
                    "Complaint Categories", grid_df["category_group"].nunique(), "6 Domain Groups"
                )
            with g4:
                render_metric_card("Required Predictions", len(grid_df), "Submission Grid Rows")

            st.markdown("##### Prediction Grid Preview")
            st.dataframe(grid_df.head(12), use_container_width=True)

            categories = grid_df["category_group"].unique().tolist()
            st.info(
                f"**Covered Civic Categories**: {', '.join(categories)}\n\n"
                "In the **Demand Prediction** page, this template grid is enriched with spatial "
                "and demographic features to produce compliant submission predictions."
            )
        else:
            st.caption("Prediction grid template not detected in data/raw/official/.")
