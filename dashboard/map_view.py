"""Ward Intelligence Map presentation component for spatial visualization and neighbour insights."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st

from dashboard.components import (
    get_theme_colors,
    render_empty_state,
    render_header,
    render_metric_card,
)
from wardpulse.config import RAW_DATA_DIR
from wardpulse.data_loader import load_geojson


def detect_coordinate_columns(columns: list[str]) -> tuple[str | None, str | None]:
    """Identify candidate latitude and longitude columns based on naming patterns.

    Args:
        columns: List of available column names.

    Returns:
        Tuple of (latitude_column, longitude_column) or (None, None).
    """
    lat_candidates = {
        "latitude",
        "lat",
        "y_coord",
        "y",
        "ward_lat",
        "centroid_lat",
        "centroid_latitude",
        "w_lat",
    }
    lon_candidates = {
        "longitude",
        "lon",
        "lng",
        "x_coord",
        "x",
        "ward_lon",
        "centroid_lon",
        "centroid_longitude",
        "w_lon",
        "long",
    }

    lat_col = next((c for c in columns if c.lower() in lat_candidates), None)
    lon_col = next((c for c in columns if c.lower() in lon_candidates), None)

    if not lat_col:
        lat_col = next(
            (
                c
                for c in columns
                if "lat" in c.lower() and "relat" not in c.lower() and "plate" not in c.lower()
            ),
            None,
        )
    if not lon_col:
        lon_col = next((c for c in columns if "lon" in c.lower() or "lng" in c.lower()), None)

    return lat_col, lon_col


def detect_ward_id_column(columns: list[str]) -> str | None:
    """Find the primary ward identifier column.

    Args:
        columns: List of available column names.

    Returns:
        Column name or None.
    """
    for c in columns:
        c_lower = str(c).lower()
        if c_lower in {"ward_id", "wardid", "ward_no", "ward_number", "ward_code"}:
            return c
    for c in columns:
        c_lower = str(c).lower()
        if "ward" in c_lower and "id" in c_lower:
            return c
    for c in columns:
        if "ward" in str(c).lower():
            return c
    return None


def get_or_load_geojson() -> dict[str, Any] | None:
    """Retrieve GeoJSON from session state or attempt loading official boundaries."""
    if "geojson" in st.session_state and isinstance(st.session_state["geojson"], dict):
        return st.session_state["geojson"]

    official_geojson_path = RAW_DATA_DIR / "official" / "wards.geojson"
    if official_geojson_path.exists():
        try:
            gj = load_geojson(official_geojson_path)
            st.session_state["geojson"] = gj
            return gj
        except Exception:
            return None
    return None


def get_cold_start_target_wards() -> set[int | str]:
    """Retrieve the set of 40 cold-start target wards from prediction grid template."""
    grid_path = RAW_DATA_DIR / "official" / "prediction_grid_template.csv"
    if grid_path.exists():
        try:
            grid_df = pd.read_csv(grid_path)
            if "ward_id" in grid_df.columns:
                return set(grid_df["ward_id"].unique())
        except Exception:
            return set()
    return set()


def render_map_view() -> None:
    """Render the Ward Intelligence Map view with spatial layers and neighbour analysis."""
    render_header(
        title="Ward Intelligence Map",
        subtitle="Geospatial distribution of municipal wards, spatial clustering, and demand",
    )

    df: pd.DataFrame | None = st.session_state.get("dataset")

    if df is None:
        render_empty_state(
            title="Geospatial Boundaries & Data Not Loaded",
            description=(
                "No ward boundary geometry or spatial dataset is loaded. "
                "WardPulse AI never displays artificial ward polygons or fake GPS coordinates."
            ),
            icon="🗺️",
            instructions=[
                "Upload a GeoJSON file containing municipal polygon boundaries",
                "Or load the official BBMP dataset via the Overview & Data Ingestion tab",
                "Once loaded, genuine spatial coordinates and choropleths visualize automatically",
            ],
        )
        return

    lat_col, lon_col = detect_coordinate_columns(list(df.columns))

    if not lat_col or not lon_col:
        dataset_name = st.session_state.get("dataset_name", "Active Dataset")
        render_empty_state(
            title="Spatial Coordinates Not Detected",
            description=(
                f"Dataset '{dataset_name}' ({len(df)} records) lacks recognized "
                "latitude/longitude coordinates. Spatial mapping requires GPS points or GeoJSON."
            ),
            icon="📍",
            instructions=[
                f"Scanned columns: {', '.join(list(df.columns)[:8])}...",
                "Ensure your dataset contains latitude (lat) and longitude (lon) columns",
                "Or upload a boundary GeoJSON via the Overview & Data Ingestion tab",
            ],
        )
        return

    colors = get_theme_colors()
    geojson_data = get_or_load_geojson()
    cold_start_wards = get_cold_start_target_wards()
    ward_id_col = detect_ward_id_column(list(df.columns))

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        render_metric_card("Mapped Wards", len(df), "Valid GPS Coordinates")
    with m2:
        geo_label = (
            f"{len(geojson_data.get('features', []))} Polygons" if geojson_data else "GPS Points"
        )
        render_metric_card(
            "Geometry Source",
            geo_label,
            "Official BBMP Boundaries" if geojson_data else "Point Centroids",
        )
    with m3:
        target_count = len(cold_start_wards)
        render_metric_card(
            "Cold-Start Targets", f"{target_count} Wards", "Hackathon Prediction Grid"
        )
    with m4:
        render_metric_card("Neighbour Intelligence", "k-NN Active", "Spatial Autocorrelation")

    st.markdown("---")

    # Merge vulnerability metrics if available from Mode A
    if "vulnerability_df" in st.session_state and ward_id_col:
        v_df = st.session_state["vulnerability_df"]
        if ward_id_col in v_df.columns and "civic_vulnerability_index" not in df.columns:
            extra_cols = [
                ward_id_col,
                "civic_vulnerability_index",
                "vulnerability_tier",
                "primary_vulnerability_driver",
            ]
            df = df.merge(v_df[extra_cols], on=ward_id_col, how="left")

    # Map configuration controls
    ctrl1, ctrl2, ctrl3 = st.columns(3)

    numeric_cols = list(df.select_dtypes(include=["number"]).columns)
    default_idx = (
        numeric_cols.index("civic_vulnerability_index") + 1
        if "civic_vulnerability_index" in numeric_cols
        else (1 if len(numeric_cols) > 1 else 0)
    )
    with ctrl1:
        color_col = st.selectbox(
            "Color Metric (Intensity)",
            options=["None"] + [c for c in numeric_cols if c not in {lat_col, lon_col}],
            index=default_idx,
            help="Choose attribute to color-code ward locations (e.g. CVI, density, road length).",
        )

    with ctrl2:
        available_modes = []
        if geojson_data and ward_id_col:
            available_modes.append("Choropleth Boundaries (Official GeoJSON)")
        available_modes.extend(["Point Scatter with Spatial Insights", "Density Heatmap"])

        map_mode = st.selectbox(
            "Visualization Mode",
            options=available_modes,
            index=0,
        )

    with ctrl3:
        display_names = []
        ward_name_col = next((c for c in df.columns if "name" in str(c).lower()), None)
        for idx, row in df.iterrows():
            w_id = row[ward_id_col] if ward_id_col else idx
            w_name = (
                f" - {row[ward_name_col]}"
                if ward_name_col and pd.notnull(row[ward_name_col])
                else ""
            )
            cold_flag = " [Target]" if w_id in cold_start_wards else ""
            display_names.append(f"Ward {w_id}{w_name}{cold_flag}")

        selected_ward_idx = st.selectbox(
            "Inspect Individual Ward",
            options=["None (All Wards)"] + display_names,
            index=0,
        )

    # Prepare map dataframe
    map_df = df.copy()
    hover_fields = [c for c in df.columns if c not in {lat_col, lon_col}][:8]

    center_lat = float(map_df[lat_col].mean())
    center_lon = float(map_df[lon_col].mean())

    is_dark = colors.get("plotly_template") != "plotly_white"
    map_style = "carto-darkmatter" if is_dark else "carto-positron"
    scale = "Teal" if is_dark else "Viridis"

    if map_mode == "Choropleth Boundaries (Official GeoJSON)" and geojson_data and ward_id_col:
        fig = px.choropleth_map(
            map_df,
            geojson=geojson_data,
            locations=ward_id_col,
            featureidkey="properties.ward_id",
            color=color_col if color_col != "None" else None,
            color_continuous_scale=scale,
            map_style=map_style,
            center=dict(lat=center_lat, lon=center_lon),
            zoom=10,
            opacity=0.75,
            hover_data=hover_fields,
            title=f"Bangalore BBMP Ward Boundaries (n={len(map_df)})"
            + (f" — Colored by {color_col}" if color_col != "None" else ""),
            height=650,
        )
    elif map_mode == "Density Heatmap" and color_col != "None":
        fig = px.density_map(
            map_df,
            lat=lat_col,
            lon=lon_col,
            z=color_col,
            radius=22,
            center=dict(lat=center_lat, lon=center_lon),
            zoom=10,
            map_style=map_style,
            title=f"Civic Demand Intensity Heatmap: {color_col}",
            height=650,
        )
    else:
        fig = px.scatter_map(
            map_df,
            lat=lat_col,
            lon=lon_col,
            color=color_col if color_col != "None" else None,
            hover_data=hover_fields,
            center=dict(lat=center_lat, lon=center_lon),
            zoom=10,
            map_style=map_style,
            title="Bangalore Ward Spatial Intelligence Map",
            height=650,
        )

    fig.update_layout(margin=dict(r=0, t=40, l=0, b=0))
    st.plotly_chart(fig, use_container_width=True)

    # Ward inspection panel if specific ward selected
    if selected_ward_idx != "None (All Wards)":
        chosen_idx = display_names.index(selected_ward_idx)
        selected_row = map_df.iloc[chosen_idx]
        current_w_id = selected_row[ward_id_col] if ward_id_col else chosen_idx

        st.subheader(f"Spatial Profile: {selected_ward_idx}")

        if current_w_id in cold_start_wards:
            st.info(
                f"✦ **Cold-Start Target Ward #{current_w_id}**: "
                "This ward belongs to the 40 test wards in the official prediction grid template. "
                "It requires cold-start forecasting without relying on historical complaint logs."
            )
        else:
            st.success(
                f"✓ **Base Reference Ward #{current_w_id}**: "
                "This ward is part of the 158 reference wards with demographic "
                "and infrastructural baseline features."
            )

        # 4 Key attribute cards
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            pop = selected_row.get("population_2011", "N/A")
            dens = selected_row.get("population_density_2011_persons_sq_km", "N/A")
            render_metric_card(
                "Population",
                f"{pop:,}" if isinstance(pop, (int, float)) else str(pop),
                f"Density: {dens}/km²",
            )
        with c2:
            area = selected_row.get("area_sq_km", "N/A")
            roads = selected_row.get("road_length_kms", "N/A")
            render_metric_card("Area & Roads", f"{area} sq km", f"Roads: {roads} km")
        with c3:
            lights = selected_row.get("streetlights", "N/A")
            stops = selected_row.get("bus_stops", "N/A")
            render_metric_card(
                "Street Infrastructure",
                f"{lights:,}" if isinstance(lights, (int, float)) else str(lights),
                f"Bus Stops: {stops}",
            )
        with c4:
            parks = selected_row.get("parks", "N/A")
            lakes = selected_row.get("lakes", "N/A")
            render_metric_card("Environmental Assets", f"{parks} Parks", f"Lakes: {lakes}")

        # Spatial neighbour comparison
        st.markdown("#### Spatial Neighbour Intelligence Analysis")
        st.caption("Attributes of this ward compared against its 4 closest spatial neighbours:")

        coords = map_df[[lat_col, lon_col]].values
        target_coord = coords[chosen_idx]
        dists = np.linalg.norm(coords - target_coord, axis=1)
        neighbour_indices = np.argsort(dists)[1:5]

        neighbour_df = map_df.iloc[neighbour_indices]
        comparison_cols = [
            c
            for c in [
                "population_2011",
                "road_length_kms",
                "streetlights",
                "parks",
                "bus_stops",
                "area_sq_km",
            ]
            if c in map_df.columns
        ]

        if comparison_cols:
            ward_vals = selected_row[comparison_cols].to_dict()
            neighbour_means = neighbour_df[comparison_cols].mean().round(1).to_dict()

            comp_records = []
            for col in comparison_cols:
                w_val = ward_vals[col]
                n_mean = neighbour_means[col]
                diff = (w_val - n_mean) if isinstance(w_val, (int, float)) else 0
                comp_records.append(
                    {
                        "Attribute": col.replace("_", " ").title(),
                        "Selected Ward Value": w_val,
                        "4-Neighbour Average": n_mean,
                        "Spatial Variance vs Neighbours": f"{diff:+.1f}",
                    }
                )

            st.dataframe(pd.DataFrame(comp_records), use_container_width=True)
