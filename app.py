"""WardPulse AI: Spatial Intelligence for Predictive Civic Resource Allocation.

Predict. Understand. Prioritize.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure 'src' is on python path for direct module resolution
SRC_PATH = str(Path(__file__).resolve().parent / "src")
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)

import streamlit as st  # noqa: E402

from dashboard.components import (  # noqa: E402
    inject_theme_css,
    render_theme_toggle,
)
from dashboard.map_view import render_map_view  # noqa: E402
from dashboard.overview import render_overview  # noqa: E402
from dashboard.prediction_view import (  # noqa: E402
    render_explainability_view,
    render_model_performance_view,
    render_prediction_view,
    render_prioritization_view,
)
from wardpulse.config import ensure_directories, setup_logging  # noqa: E402

logger = setup_logging()

# Page configuration
st.set_page_config(
    page_title="WardPulse AI — Spatial Civic Intelligence",
    page_icon="🏙️",
    layout="wide",
    initial_sidebar_state="expanded",
)


def render_sidebar() -> str:
    """Render the application sidebar navigation, theme switcher, and status indicators.

    Returns:
        Selected section name.
    """
    with st.sidebar:
        st.markdown("### 🏙️ WardPulse AI")
        st.caption("✦ Predict. Understand. Prioritize.")

        # Theme Switcher
        st.markdown("**Theme**")
        render_theme_toggle()

        st.markdown("---")
        navigation_options = [
            "1. Overview & Ingestion",
            "2. Ward Intelligence Map",
            "3. Demand Prediction",
            "4. Model Performance",
            "5. Explainable AI (XAI)",
            "6. Resource Prioritization",
        ]
        selected_section = st.radio(
            "Navigation",
            options=navigation_options,
            index=0,
        )

        st.markdown("---")
        st.markdown("### Active Session")
        dataset_name = st.session_state.get("dataset_name")
        if dataset_name:
            st.success(f"📁 **Dataset**: {dataset_name}")
            row_count = len(st.session_state.get("dataset", []))
            st.caption(f"Rows: {row_count:,}")
        else:
            st.info("📁 **Dataset**: None (Pending Upload)")

        if "trained_pipeline" in st.session_state:
            st.success(f"🤖 **Model**: {st.session_state.get('model_label')}")
        else:
            st.caption("🤖 **Model**: Not Trained")

        st.markdown("---")
        if st.button("🔄 Reset Workspace", use_container_width=True):
            saved_theme = st.session_state.get("theme", "dark")
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.session_state["theme"] = saved_theme
            st.rerun()

        st.caption("WardPulse AI v0.2.0 • Civic Spatial Intelligence")

    return selected_section


def main() -> None:
    """Entry point for the Streamlit application shell."""
    ensure_directories()
    inject_theme_css()

    section = render_sidebar()

    if section.startswith("1."):
        render_overview()
    elif section.startswith("2."):
        render_map_view()
    elif section.startswith("3."):
        render_prediction_view()
    elif section.startswith("4."):
        render_model_performance_view()
    elif section.startswith("5."):
        render_explainability_view()
    elif section.startswith("6."):
        render_prioritization_view()


if __name__ == "__main__":
    main()
