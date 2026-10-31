"""Resource allocation prioritization and municipal action recommendation engine."""

from __future__ import annotations

from enum import Enum
from typing import Any

import numpy as np
import pandas as pd

from wardpulse.config import setup_logging

logger = setup_logging()


class PriorityTier(str, Enum):
    """Categorical priority tiers for civic resource dispatch."""

    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


def assign_priority_tier(score: float) -> PriorityTier:
    """Classify a normalized 0-100 priority score into a discrete priority tier.

    Args:
        score: Priority score between 0 and 100.

    Returns:
        PriorityTier enum value.
    """
    if score >= 75.0:
        return PriorityTier.CRITICAL
    if score >= 50.0:
        return PriorityTier.HIGH
    if score >= 25.0:
        return PriorityTier.MEDIUM
    return PriorityTier.LOW


def calculate_resource_priority(
    predicted_demand: pd.Series | np.ndarray,
    ward_identifiers: pd.Series | list[Any] | None = None,
    current_resources: pd.Series | np.ndarray | None = None,
    uncertainty_std: pd.Series | np.ndarray | None = None,
    uncertainty_weight: float = 0.15,
) -> pd.DataFrame:
    """Calculate normalized resource allocation priority scores for municipal wards.

    Score formulation:
    1. Base demand component (normalized 0-100).
    2. Optional resource deficit component (if current resources provided).
    3. Optional uncertainty risk buffer (higher uncertainty adds a safety margin).

    Args:
        predicted_demand: Array or Series of predicted complaint volumes.
        ward_identifiers: Optional identifiers/names for each ward.
        current_resources: Optional current allocation (e.g. personnel, trucks).
        uncertainty_std: Optional prediction standard deviation.
        uncertainty_weight: Weight given to uncertainty risk buffer (0.0 to 1.0).

    Returns:
        DataFrame sorted by priority score descending, with rank, tier, and recommendations.
    """
    demand = np.asarray(predicted_demand, dtype=float)
    n_wards = len(demand)

    if n_wards == 0:
        return pd.DataFrame(
            columns=[
                "ward",
                "predicted_demand",
                "priority_score",
                "priority_tier",
                "recommended_action",
            ]
        )

    # Normalize demand to 0-100
    min_d, max_d = np.min(demand), np.max(demand)
    if max_d > min_d:
        norm_demand = ((demand - min_d) / (max_d - min_d)) * 100.0
    else:
        norm_demand = np.full(n_wards, 50.0)

    # Base priority score starts with normalized demand
    priority_score = norm_demand.copy()

    # Factor in uncertainty if available
    if uncertainty_std is not None:
        std_arr = np.asarray(uncertainty_std, dtype=float)
        min_s, max_s = np.min(std_arr), np.max(std_arr)
        if max_s > min_s:
            norm_std = ((std_arr - min_s) / (max_s - min_s)) * 100.0
            priority_score = (1.0 - uncertainty_weight) * priority_score + (
                uncertainty_weight * norm_std
            )

    # Factor in current resources if provided
    resource_deficit: np.ndarray | None = None
    if current_resources is not None:
        res_arr = np.asarray(current_resources, dtype=float)
        # Deficit is demand minus allocated resources
        resource_deficit = demand - res_arr
        # Wards with deficit get higher priority
        deficit_norm = np.clip(resource_deficit, a_min=0.0, a_max=None)
        max_def = np.max(deficit_norm)
        if max_def > 0:
            deficit_score = (deficit_norm / max_def) * 100.0
            priority_score = 0.6 * priority_score + 0.4 * deficit_score

    priority_score = np.clip(np.round(priority_score, 2), 0.0, 100.0)

    # Compile result DataFrame
    wards = (
        list(ward_identifiers)
        if ward_identifiers is not None
        else [f"Ward {i + 1}" for i in range(n_wards)]
    )

    tiers = [assign_priority_tier(s).value for s in priority_score]

    def get_action(tier: str) -> str:
        if tier == PriorityTier.CRITICAL.value:
            return (
                "Immediate surge deployment: dispatch emergency maintenance crews "
                "and monitor daily."
            )
        if tier == PriorityTier.HIGH.value:
            return "Priority inspection: reallocate mobile inspection teams within 48 hours."
        if tier == PriorityTier.MEDIUM.value:
            return "Standard scheduling: fulfill within regular municipal service cycle."
        return "Baseline maintenance: routine observation and low-intensity monitoring."

    actions = [get_action(t) for t in tiers]

    result_df = pd.DataFrame(
        {
            "ward": wards,
            "predicted_demand": np.round(demand, 2),
            "priority_score": priority_score,
            "priority_tier": tiers,
            "recommended_action": actions,
        }
    )

    if resource_deficit is not None:
        result_df["resource_gap"] = np.round(resource_deficit, 2)

    return result_df.sort_values(by="priority_score", ascending=False).reset_index(drop=True)


def compute_civic_vulnerability_index(
    df: pd.DataFrame,
    ward_id_col: str = "ward_id",
    ward_name_col: str | None = None,
    weights: dict[str, float] | None = None,
) -> pd.DataFrame:
    """Compute a transparent, multi-attribute Civic Vulnerability Index (CVI) without complaint history.

    MODE A: SPATIAL VULNERABILITY INTELLIGENCE
    Formulation evaluates 4 physical civic dimensions:
    1. Demographic & Density Strain (population density, decadal growth rate).
    2. Road & Lighting Deficit (road length per streetlight, lack of lighting infrastructure).
    3. Transit Underservice (households per bus stop).
    4. Amenities & Safety Deficit (inverse of green space, lakes, and public safety per capita).

    This index is strictly an infrastructural vulnerability assessment and is NEVER
    represented as a predicted complaint count.

    Args:
        df: Input DataFrame containing ward features.
        ward_id_col: Column identifying unique ward code.
        ward_name_col: Optional column name for ward human-readable name.
        weights: Optional dictionary specifying custom weights for components.
            Keys: 'density_strain', 'road_lighting', 'transit', 'amenities'.

    Returns:
        DataFrame with vulnerability rankings, CVI score (0-100), component sub-scores,
        primary vulnerability driver, and recommended municipal actions.
    """
    clean_df = df.copy()

    # Default balanced weights
    default_weights = {
        "density_strain": 0.25,
        "road_lighting": 0.25,
        "transit": 0.25,
        "amenities": 0.25,
    }
    active_weights = dict(default_weights)
    if weights:
        active_weights.update(weights)
        total_w = sum(active_weights.values())
        if total_w > 0:
            active_weights = {k: v / total_w for k, v in active_weights.items()}

    def min_max_norm(series: np.ndarray) -> np.ndarray:
        arr = np.asarray(series, dtype=float)
        mn, mx = np.nanmin(arr), np.nanmax(arr)
        if mx > mn:
            return ((arr - mn) / (mx - mn)) * 100.0
        return np.full_like(arr, 50.0)

    # 1. Demographic & Density Strain
    if "population_density_strain" in clean_df.columns:
        s_demo = min_max_norm(clean_df["population_density_strain"].values)
    elif "population_density_2011_persons_sq_km" in clean_df.columns:
        s_demo = min_max_norm(clean_df["population_density_2011_persons_sq_km"].values)
    elif "population_2011" in clean_df.columns:
        s_demo = min_max_norm(clean_df["population_2011"].values)
    else:
        s_demo = np.full(len(clean_df), 50.0)

    # 2. Road & Lighting Deficit
    if "road_to_streetlight_ratio" in clean_df.columns:
        s_infra = min_max_norm(clean_df["road_to_streetlight_ratio"].values)
    elif "road_length_kms" in clean_df.columns and "streetlights" in clean_df.columns:
        ratio = (clean_df["road_length_kms"].values * 1000.0) / np.maximum(
            clean_df["streetlights"].values, 1.0
        )
        s_infra = min_max_norm(ratio)
    else:
        s_infra = np.full(len(clean_df), 50.0)

    # 3. Transit Underservice
    if "household_to_bus_stop_ratio" in clean_df.columns:
        s_transit = min_max_norm(clean_df["household_to_bus_stop_ratio"].values)
    elif "households_census_2011" in clean_df.columns and "bus_stops" in clean_df.columns:
        ratio_t = clean_df["households_census_2011"].values / np.maximum(
            clean_df["bus_stops"].values, 1.0
        )
        s_transit = min_max_norm(ratio_t)
    else:
        s_transit = np.full(len(clean_df), 50.0)

    # 4. Amenities & Safety Deficit (inverted so higher score = greater deficit)
    amenity_vals = np.zeros(len(clean_df), dtype=float)
    if "greenspace_sq_m_per_capita" in clean_df.columns:
        amenity_vals += clean_df["greenspace_sq_m_per_capita"].values
    elif "park_area_sq_m" in clean_df.columns and "population_2011" in clean_df.columns:
        amenity_vals += clean_df["park_area_sq_m"].values / np.maximum(
            clean_df["population_2011"].values, 1.0
        )

    if "public_safety_per_10k" in clean_df.columns:
        amenity_vals += clean_df["public_safety_per_10k"].values * 10.0

    s_amenity = 100.0 - min_max_norm(amenity_vals)

    # Composite CVI
    raw_cvi = (
        active_weights["density_strain"] * s_demo
        + active_weights["road_lighting"] * s_infra
        + active_weights["transit"] * s_transit
        + active_weights["amenities"] * s_amenity
    )
    final_cvi = np.round(min_max_norm(raw_cvi), 2)

    # Determine primary driver per ward
    component_names = [
        "Demographic Density Strain",
        "Road & Lighting Deficit",
        "Transit Underservice",
        "Amenities & Safety Deficit",
    ]
    stacked_components = np.column_stack([s_demo, s_infra, s_transit, s_amenity])
    dominant_indices = np.argmax(stacked_components, axis=1)
    primary_drivers = [component_names[idx] for idx in dominant_indices]

    # Assign priority tiers and recommendations
    tiers = [assign_priority_tier(s).value for s in final_cvi]

    def get_cvi_action(tier: str, driver: str) -> str:
        if tier == PriorityTier.CRITICAL.value:
            return f"Immediate municipal intervention required. Target primary driver: {driver}."
        if tier == PriorityTier.HIGH.value:
            return f"High priority for quarterly capital expenditure. Mitigate: {driver}."
        if tier == PriorityTier.MEDIUM.value:
            return f"Moderate vulnerability: schedule regular infrastructural upgrades for {driver}."
        return "Stable infrastructure: maintain standard municipal service monitoring."

    actions = [get_cvi_action(t, d) for t, d in zip(tiers, primary_drivers, strict=False)]

    # Identify ward columns
    wards = (
        clean_df[ward_id_col].values
        if ward_id_col in clean_df.columns
        else np.arange(1, len(clean_df) + 1)
    )
    name_col = ward_name_col or next((c for c in clean_df.columns if "name" in c.lower()), None)
    names = clean_df[name_col].values if name_col else [f"Ward {w}" for w in wards]

    res_df = pd.DataFrame(
        {
            "ward_id": wards,
            "ward_name": names,
            "civic_vulnerability_index": final_cvi,
            "vulnerability_tier": tiers,
            "primary_vulnerability_driver": primary_drivers,
            "density_strain_score": np.round(s_demo, 1),
            "road_lighting_deficit_score": np.round(s_infra, 1),
            "transit_deficit_score": np.round(s_transit, 1),
            "amenities_deficit_score": np.round(s_amenity, 1),
            "recommended_action": actions,
            "metric_type": "Civic Vulnerability Index (Unsupervised Infrastructure Assessment)",
        }
    )

    # Sort descending by vulnerability score and assign ranks
    res_df = res_df.sort_values(by="civic_vulnerability_index", ascending=False).reset_index(
        drop=True
    )
    res_df.insert(2, "vulnerability_rank", np.arange(1, len(res_df) + 1))
    return res_df
