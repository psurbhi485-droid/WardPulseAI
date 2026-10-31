"""WardPulse AI Streamlit dashboard presentation package."""

from dashboard.components import (
    get_theme_colors,
    inject_theme_css,
    render_empty_state,
    render_header,
    render_metric_card,
    render_theme_toggle,
    style_plotly_chart,
)
from dashboard.map_view import render_map_view
from dashboard.overview import render_overview
from dashboard.prediction_view import (
    render_explainability_view,
    render_model_performance_view,
    render_prediction_view,
    render_prioritization_view,
)

__all__ = [
    "render_overview",
    "render_map_view",
    "render_prediction_view",
    "render_model_performance_view",
    "render_explainability_view",
    "render_prioritization_view",
    "inject_theme_css",
    "get_theme_colors",
    "render_header",
    "render_metric_card",
    "render_empty_state",
    "render_theme_toggle",
    "style_plotly_chart",
]
