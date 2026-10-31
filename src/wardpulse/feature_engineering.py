"""Feature engineering utilities, neighbour intelligence, and candidate feature generators."""

from __future__ import annotations

import re

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors

from wardpulse.config import setup_logging

logger = setup_logging()


def extract_candidate_features(
    df: pd.DataFrame,
    exclude_columns: list[str] | None = None,
) -> tuple[list[str], list[str]]:
    """Identify candidate numeric and categorical features without assuming column names.

    Args:
        df: Input DataFrame.
        exclude_columns: Optional list of columns to ignore (e.g. target, IDs, names).

    Returns:
        Tuple of (numeric_candidate_columns, categorical_candidate_columns).
    """
    excluded = set(exclude_columns or [])
    all_columns = [col for col in df.columns if col not in excluded]

    numeric_candidates = [
        col
        for col in all_columns
        if pd.api.types.is_numeric_dtype(df[col]) and not pd.api.types.is_bool_dtype(df[col])
    ]

    categorical_candidates = [col for col in all_columns if col not in numeric_candidates]

    return numeric_candidates, categorical_candidates


def compute_ratio_feature(
    df: pd.DataFrame,
    numerator_column: str,
    denominator_column: str,
    output_feature_name: str,
    fill_value: float = 0.0,
) -> pd.DataFrame:
    """Safely calculate a ratio feature between two numeric columns.

    Original DataFrame is not modified.

    Args:
        df: Input DataFrame.
        numerator_column: Numerator column name.
        denominator_column: Denominator column name.
        output_feature_name: Name for the resulting column.
        fill_value: Value used when denominator is zero or missing.

    Returns:
        New DataFrame containing the new ratio feature.

    Raises:
        ValueError: If columns are missing or non-numeric.
    """
    for col in (numerator_column, denominator_column):
        if col not in df.columns:
            msg = f"Column '{col}' not found in DataFrame for ratio calculation."
            logger.error(msg)
            raise ValueError(msg)
        if not pd.api.types.is_numeric_dtype(df[col]):
            msg = f"Column '{col}' must be numeric for ratio calculation."
            logger.error(msg)
            raise ValueError(msg)

    out_df = df.copy()
    num = out_df[numerator_column].astype(float)
    den = out_df[denominator_column].astype(float)

    # Avoid division by zero
    ratio = np.where(den != 0, num / den, fill_value)
    out_df[output_feature_name] = np.nan_to_num(
        ratio, nan=fill_value, posinf=fill_value, neginf=fill_value
    )
    return out_df


def compute_log_transform(
    df: pd.DataFrame,
    column: str,
    output_feature_name: str | None = None,
    offset: float = 1.0,
) -> pd.DataFrame:
    """Compute natural logarithm transform np.log(x + offset) safely.

    Args:
        df: Input DataFrame.
        column: Column to transform.
        output_feature_name: Target column name (defaults to f"{column}_log").
        offset: Offset added before taking log to handle zeros.

    Returns:
        New DataFrame containing the log-transformed column.
    """
    if column not in df.columns:
        msg = f"Column '{column}' not found in DataFrame."
        logger.error(msg)
        raise ValueError(msg)

    if not pd.api.types.is_numeric_dtype(df[column]):
        msg = f"Column '{column}' must be numeric for log transformation."
        logger.error(msg)
        raise ValueError(msg)

    out_df = df.copy()
    target_name = output_feature_name or f"{column}_log"

    values = out_df[column].astype(float)
    shifted = np.maximum(values + offset, 1e-9)
    out_df[target_name] = np.log(shifted)
    return out_df


def compute_spatial_neighbour_features(
    df: pd.DataFrame,
    latitude_column: str,
    longitude_column: str,
    feature_columns: list[str],
    k_neighbors: int = 3,
) -> pd.DataFrame:
    """Derive Neighbour Intelligence features using k-nearest spatial neighbours.

    When geographic coordinates are available, constructs spatial lag features
    (e.g., mean of neighbour attributes) to capture spatial autocorrelation without
    leaking target variables.

    Args:
        df: Input DataFrame.
        latitude_column: Column name containing latitude.
        longitude_column: Column name containing longitude.
        feature_columns: Numeric feature columns to calculate neighbour averages for.
        k_neighbors: Number of nearest wards to consider.

    Returns:
        New DataFrame with appended neighbour features.

    Raises:
        ValueError: If coordinate columns or feature columns are invalid.
    """
    for col in [latitude_column, longitude_column]:
        if col not in df.columns:
            msg = f"Coordinate column '{col}' not found in DataFrame."
            logger.error(msg)
            raise ValueError(msg)

    valid_feats = [
        col
        for col in feature_columns
        if col in df.columns and pd.api.types.is_numeric_dtype(df[col])
    ]
    if not valid_feats:
        return df.copy()

    out_df = df.copy()
    n_records = len(out_df)
    if n_records < 2:
        return out_df

    # Extract non-null coordinates
    coords = out_df[[latitude_column, longitude_column]].fillna(0.0).values
    effective_k = min(k_neighbors, n_records - 1)

    nn = NearestNeighbors(n_neighbors=effective_k + 1, algorithm="auto")
    nn.fit(coords)
    _, indices = nn.kneighbors(coords)

    # indices[:, 0] is the point itself; indices[:, 1:] are the k nearest neighbours
    neighbour_indices = indices[:, 1:]

    for feat in valid_feats:
        feat_values = out_df[feat].fillna(0.0).values
        # Compute mean across neighbours for each row
        lag_means = np.mean(feat_values[neighbour_indices], axis=1)
        out_df[f"{feat}_neighbour_mean"] = np.round(lag_means, 4)

    return out_df


def detect_complaint_type_columns(columns: list[str]) -> dict[str, list[str]]:
    """Detect civic complaint category columns using semantic keyword matching.

    Supports classification into:
    - roads: potholes, street damage, footpath issues
    - garbage: waste management, trash, sanitation, littering
    - water: pipeline leaks, contamination, supply cuts, drainage
    - electricity: streetlight outages, wiring, power supply

    Args:
        columns: List of available dataset columns.

    Returns:
        Dictionary mapping category names to matched column names.
    """
    category_patterns = {
        "roads": [r"road", r"pothole", r"street", r"asphalt", r"footpath", r"traffic"],
        "garbage": [r"garbage", r"waste", r"trash", r"sanitation", r"debris", r"clean"],
        "water": [r"water", r"drain", r"sewage", r"leak", r"flood", r"supply", r"pipe"],
        "electricity": [r"light", r"electric", r"power", r"lamp", r"transformer", r"wire"],
    }

    matched: dict[str, list[str]] = {}
    for cat, patterns in category_patterns.items():
        found = []
        for col in columns:
            col_str = str(col).lower()
            if any(re.search(pat, col_str) for pat in patterns):
                found.append(str(col))
        if found:
            matched[cat] = found

    return matched


def aggregate_complaint_categories(
    df: pd.DataFrame,
    category_mapping: dict[str, list[str]],
) -> pd.DataFrame:
    """Aggregate complaint volumes by civic service categories.

    Args:
        df: Input DataFrame.
        category_mapping: Output from detect_complaint_type_columns.

    Returns:
        DataFrame with summary of complaint counts per category.
    """
    records = []
    for cat, cols in category_mapping.items():
        numeric_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
        if numeric_cols:
            total_count = float(df[numeric_cols].sum().sum())
            records.append({"category": cat.capitalize(), "total_complaints": total_count})

    if not records:
        return pd.DataFrame(columns=["category", "total_complaints"])

    res_df = pd.DataFrame(records)
    total = res_df["total_complaints"].sum()
    if total > 0:
        res_df["percentage"] = np.round((res_df["total_complaints"] / total) * 100.0, 2)
    else:
        res_df["percentage"] = 0.0

    return res_df.sort_values(by="total_complaints", ascending=False).reset_index(drop=True)


def aggregate_ward_features(
    df: pd.DataFrame,
    group_column: str,
    aggregations: dict[str, list[str]],
) -> pd.DataFrame:
    """Aggregate row-level data into ward-level summary attributes.

    Args:
        df: Input incident or point-level DataFrame.
        group_column: Column identifying ward or administrative boundary.
        aggregations: Dictionary mapping column names to list of aggregation functions
            e.g. {"complaint_id": ["count"], "response_days": ["mean", "median"]}.

    Returns:
        Aggregated DataFrame with flattened column names.
    """
    if group_column not in df.columns:
        msg = f"Grouping column '{group_column}' not found in DataFrame."
        logger.error(msg)
        raise ValueError(msg)

    for col in aggregations:
        if col not in df.columns:
            msg = f"Aggregation target column '{col}' not found in DataFrame."
            logger.error(msg)
            raise ValueError(msg)

    grouped = df.groupby(group_column).agg(aggregations)
    grouped.columns = [f"{col}_{func}" for col, func in grouped.columns]
    return grouped.reset_index()


def build_spatial_intelligence_features(
    df: pd.DataFrame,
    k_neighbors: int = 4,
    lat_col: str | None = None,
    lon_col: str | None = None,
) -> pd.DataFrame:
    """Construct four-nearest-neighbor spatial features and physical infrastructure ratios.

    Uses centroid coordinates without fabricating any geographical data.
    Protects against division by zero and handles missing inputs safely.

    Args:
        df: Input DataFrame containing ward attributes and coordinates.
        k_neighbors: Number of spatial neighbors to evaluate (default: 4).
        lat_col: Optional latitude column name (defaults to auto-detection).
        lon_col: Optional longitude column name (defaults to auto-detection).

    Returns:
        New DataFrame with appended spatial neighbor and ratio attributes.
    """
    out_df = df.copy()

    # Detect coordinate columns if not provided
    if not lat_col or not lon_col:
        lat_candidates = ["centroid_lat", "latitude", "lat", "ward_lat", "y_coord", "w_lat"]
        lon_candidates = ["centroid_lon", "longitude", "lon", "lng", "ward_lon", "x_coord", "w_lon"]
        lat_col = lat_col or next((c for c in out_df.columns if c.lower() in lat_candidates), None)
        lon_col = lon_col or next((c for c in out_df.columns if c.lower() in lon_candidates), None)
        if not lat_col:
            lat_col = next(
                (
                    c
                    for c in out_df.columns
                    if "lat" in c.lower()
                    and not any(k in c.lower() for k in ["popul", "relat", "plate"])
                ),
                None,
            )
        if not lon_col:
            lon_col = next(
                (
                    c
                    for c in out_df.columns
                    if ("lon" in c.lower() or "lng" in c.lower()) and "popul" not in c.lower()
                ),
                None,
            )

    # 1. Spatial Neighbour Intelligence (k-NN)
    if lat_col and lon_col and len(out_df) > k_neighbors:
        lag_candidates = [
            c
            for c in [
                "road_length_kms",
                "streetlights",
                "population_2011",
                "parks",
                "bus_stops",
                "govt_schools",
            ]
            if c in out_df.columns and pd.api.types.is_numeric_dtype(out_df[c])
        ]
        if lag_candidates:
            coords = out_df[[lat_col, lon_col]].fillna(0.0).values
            nn = NearestNeighbors(n_neighbors=k_neighbors + 1, algorithm="auto").fit(coords)
            _, indices = nn.kneighbors(coords)
            neighbour_indices = indices[:, 1:]  # Exclude self

            for col in lag_candidates:
                col_vals = out_df[col].astype(float).values
                means = np.mean(col_vals[neighbour_indices], axis=1)
                out_df[f"{col}_neighbour_mean"] = np.round(means, 2)
            logger.info(
                "Generated %d spatial lag features using k=%d", len(lag_candidates), k_neighbors
            )

    # 2. Road to Streetlight Ratio (meters of road per streetlight)
    if "road_length_kms" in out_df.columns and "streetlights" in out_df.columns:
        road_m = out_df["road_length_kms"].astype(float) * 1000.0
        lights = np.maximum(out_df["streetlights"].astype(float), 1.0)
        out_df["road_to_streetlight_ratio"] = np.round(road_m / lights, 2)

    # 3. Household to Bus Stop Ratio
    if "households_census_2011" in out_df.columns and "bus_stops" in out_df.columns:
        hh = out_df["households_census_2011"].astype(float)
        stops = np.maximum(out_df["bus_stops"].astype(float), 1.0)
        out_df["household_to_bus_stop_ratio"] = np.round(hh / stops, 2)

    # 4. Population Density Strain
    if "population_density_2011_persons_sq_km" in out_df.columns:
        dens = out_df["population_density_2011_persons_sq_km"].astype(float).values
        growth = (
            np.maximum(out_df["decadal_popn_growth_rate_2011_2001"].astype(float).values, 0.0)
            if "decadal_popn_growth_rate_2011_2001" in out_df.columns
            else np.zeros_like(dens)
        )
        d_min, d_max = np.min(dens), np.max(dens)
        norm_dens = (dens - d_min) / (d_max - d_min + 1e-9)
        out_df["population_density_strain"] = np.round(norm_dens * (1.0 + growth / 100.0), 4)

    # 5. Public Safety Infrastructure Indicator
    if "police_stations" in out_df.columns:
        ps = out_df["police_stations"].astype(float)
        fs = (
            out_df["fire_stations"].astype(float)
            if "fire_stations" in out_df.columns
            else np.zeros_like(ps)
        )
        has_local = (
            out_df["has_local_police_station"].astype(float)
            if "has_local_police_station" in out_df.columns
            else (
                out_df["police_stn"].notnull().astype(float)
                if "police_stn" in out_df.columns
                else np.zeros_like(ps)
            )
        )
        composite_safety = ps + 0.5 * fs + 0.5 * has_local
        out_df["public_safety_infra_indicator"] = np.round(composite_safety, 2)
        if "population_2011" in out_df.columns:
            pop = np.maximum(out_df["population_2011"].astype(float), 1.0)
            out_df["public_safety_per_10k"] = np.round((composite_safety / pop) * 10000.0, 3)

    # 6. Green-space Availability Indicator
    green_cols = [
        c
        for c in ["park_area_sq_m", "lake_area_sq_m", "playground_area_sq_m"]
        if c in out_df.columns
    ]
    if green_cols and "population_2011" in out_df.columns:
        total_green = out_df[green_cols].astype(float).sum(axis=1)
        pop = np.maximum(out_df["population_2011"].astype(float), 1.0)
        out_df["greenspace_sq_m_per_capita"] = np.round(total_green / pop, 2)
    elif "parks" in out_df.columns and "area_sq_km" in out_df.columns:
        out_df["parks_per_sq_km"] = np.round(
            out_df["parks"].astype(float) / np.maximum(out_df["area_sq_km"].astype(float), 0.01), 2
        )

    return out_df
