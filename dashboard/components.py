"""Reusable premium UI/UX design components, themes, and animated styles."""

from __future__ import annotations

from typing import Any

import plotly.graph_objects as go
import streamlit as st

# Color System definitions
THEMES: dict[str, dict[str, str]] = {
    "dark": {
        "bg": "#08111F",
        "sidebar": "#0D1929",
        "card": "#101E30",
        "card_border": "rgba(77, 228, 208, 0.15)",
        "accent": "#4DE4D0",
        "secondary": "#4C9AFF",
        "text": "#F0F6FC",
        "text_muted": "#8B949E",
        "hover_border": "rgba(77, 228, 208, 0.4)",
        "glow": "0 0 15px rgba(77, 228, 208, 0.12)",
        "plotly_template": "plotly_dark",
        "plot_bgcolor": "#101E30",
        "paper_bgcolor": "#101E30",
        "grid_color": "#1A2E44",
    },
    "light": {
        "bg": "#F3F7FB",
        "sidebar": "#FFFFFF",
        "card": "#FFFFFF",
        "card_border": "rgba(8, 126, 131, 0.12)",
        "accent": "#087E83",
        "secondary": "#2563EB",
        "text": "#14253A",
        "text_muted": "#64748B",
        "hover_border": "rgba(8, 126, 131, 0.4)",
        "glow": "0 2px 12px rgba(8, 126, 131, 0.08)",
        "plotly_template": "plotly_white",
        "plot_bgcolor": "#FFFFFF",
        "paper_bgcolor": "#FFFFFF",
        "grid_color": "#E2E8F0",
    },
}


def get_current_theme() -> str:
    """Get the currently selected theme ('dark' or 'light')."""
    return st.session_state.get("theme", "dark")


def get_theme_colors() -> dict[str, str]:
    """Return color palette dictionary for active theme."""
    theme = get_current_theme()
    return THEMES.get(theme, THEMES["dark"])


def inject_theme_css() -> None:
    """Inject premium CSS variables, Inter typography, and polished animations."""
    colors = get_theme_colors()
    theme = get_current_theme()

    css = f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {{
        --bg-main: {colors["bg"]};
        --bg-sidebar: {colors["sidebar"]};
        --bg-card: {colors["card"]};
        --border-card: {colors["card_border"]};
        --color-accent: {colors["accent"]};
        --color-secondary: {colors["secondary"]};
        --color-text: {colors["text"]};
        --color-muted: {colors["text_muted"]};
        --border-hover: {colors["hover_border"]};
        --shadow-glow: {colors["glow"]};
    }}

    /* Global typography & background */
    html, body, [class*="st-"] {{
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }}

    .stApp {{
        background-color: var(--bg-main) !important;
        color: var(--color-text) !important;
        transition: background-color 0.3s ease, color 0.3s ease;
    }}

    /* Sidebar styling */
    [data-testid="stSidebar"] {{
        background-color: var(--bg-sidebar) !important;
        border-right: 1px solid var(--border-card) !important;
    }}

    /* Fade-in and slide-up page transitions */
    @keyframes fadeInUp {{
        from {{
            opacity: 0;
            transform: translateY(12px);
        }}
        to {{
            opacity: 1;
            transform: translateY(0);
        }}
    }}

    .animated-container {{
        animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }}

    /* Premium Glass/SaaS Cards */
    .premium-card {{
        background: var(--bg-card);
        border: 1px solid var(--border-card);
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        box-shadow: var(--shadow-glow);
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        margin-bottom: 1rem;
    }}

    .premium-card:hover {{
        border-color: var(--border-hover);
        transform: translateY(-2px);
    }}

    /* Metric Card */
    .metric-container {{
        background: var(--bg-card);
        border: 1px solid var(--border-card);
        border-radius: 10px;
        padding: 1rem 1.25rem;
        box-shadow: var(--shadow-glow);
        transition: all 0.2s ease;
    }}
    .metric-container:hover {{
        border-color: var(--border-hover);
    }}
    .metric-label {{
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--color-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
    }}
    .metric-val {{
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--color-text);
        letter-spacing: -0.02em;
    }}
    .metric-sub {{
        font-size: 0.8rem;
        color: var(--color-accent);
        font-weight: 500;
        margin-top: 0.25rem;
    }}

    /* Tagline Badge */
    .tagline-badge {{
        display: inline-flex;
        align-items: center;
        background: {"rgba(77, 228, 208, 0.12)" if theme == "dark" else "rgba(8, 126, 131, 0.1)"};
        color: var(--color-accent);
        border: 1px solid var(--border-card);
        padding: 0.3rem 0.8rem;
        border-radius: 9999px;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
    }}

    /* Empty state card */
    .empty-state-card {{
        background: var(--bg-card);
        border: 1px dashed var(--border-card);
        border-radius: 14px;
        padding: 2.5rem 2rem;
        text-align: center;
        margin: 1.5rem 0;
    }}
    .empty-state-icon {{
        font-size: 2.8rem;
        margin-bottom: 0.75rem;
        opacity: 0.9;
    }}
    .empty-state-title {{
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text);
        margin-bottom: 0.5rem;
    }}
    .empty-state-desc {{
        font-size: 0.92rem;
        color: var(--color-muted);
        max-width: 600px;
        margin: 0 auto 1.5rem auto;
        line-height: 1.5;
    }}

    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {{
        .animated-container, .premium-card, .metric-container {{
            animation: none !important;
            transition: none !important;
            transform: none !important;
        }}
    }}
    </style>
    """
    st.markdown(css, unsafe_allow_html=True)


def style_plotly_chart(fig: go.Figure) -> go.Figure:
    """Apply consistent theme-aware palette, background, and grid styling to Plotly figure.

    Args:
        fig: Input Plotly figure.

    Returns:
        Styled Plotly figure matching current light/dark theme.
    """
    colors = get_theme_colors()
    fig.update_layout(
        template=colors["plotly_template"],
        paper_bgcolor=colors["paper_bgcolor"],
        plot_bgcolor=colors["plot_bgcolor"],
        font=dict(family="Inter, sans-serif", color=colors["text"], size=12),
        margin=dict(l=40, r=40, t=50, b=40),
        xaxis=dict(
            gridcolor=colors["grid_color"],
            linecolor=colors["grid_color"],
            zerolinecolor=colors["grid_color"],
        ),
        yaxis=dict(
            gridcolor=colors["grid_color"],
            linecolor=colors["grid_color"],
            zerolinecolor=colors["grid_color"],
        ),
    )
    return fig


def render_header(
    title: str, subtitle: str, badge: str = "Predict. Understand. Prioritize."
) -> None:
    """Render a premium page header with product tagline badge.

    Args:
        title: Main title for the view.
        subtitle: Secondary descriptive subtitle.
        badge: Optional top tagline badge text.
    """
    st.markdown(
        f"""
        <div class="animated-container">
            <div class="tagline-badge">✦ {badge}</div>
            <h1 style="font-size: 2.1rem; font-weight: 800; margin-bottom: 0.2rem;">
                {title}
            </h1>
            <p style="font-size: 1rem; color: var(--color-muted); margin-bottom: 1.5rem;">
                {subtitle}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_metric_card(
    label: str,
    value: Any,
    subtext: str | None = None,
    delta: str | None = None,
) -> None:
    """Render a modern SaaS metric tile.

    Args:
        label: Metric title.
        value: Primary numerical or status value.
        subtext: Optional supporting text.
        delta: Optional delta badge.
    """
    delta_html = f"<span class='metric-sub'>▲ {delta}</span>" if delta else ""
    sub_html = f"<div class='metric-sub'>{subtext}</div>" if subtext else ""

    st.markdown(
        f"""
        <div class="metric-container">
            <div class="metric-label">{label}</div>
            <div class="metric-val">{value} {delta_html}</div>
            {sub_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_empty_state(
    title: str,
    description: str,
    icon: str = "🏙️",
    instructions: list[str] | None = None,
) -> None:
    """Render an elegant zero-state placeholder when datasets or models are uninitialized.

    Args:
        title: Header for the empty state.
        description: Informative description explaining why features are dormant.
        icon: Emoji or visual symbol.
        instructions: Optional numbered actionable steps.
    """
    instruct_html = ""
    if instructions:
        items = "".join(f"<li style='margin-bottom: 0.3rem;'>{step}</li>" for step in instructions)
        instruct_html = f"""
        <div style='text-align: left; max-width: 520px; margin: 1rem auto 0 auto;
                    font-size: 0.88rem; color: var(--color-muted);'>
            <div style='font-weight: 600; margin-bottom: 0.4rem; color: var(--color-text);'>
                Recommended Actions:
            </div>
            <ol style='padding-left: 1.2rem; margin: 0;'>{items}</ol>
        </div>
        """

    st.markdown(
        f"""
        <div class="empty-state-card animated-container">
            <div class="empty-state-icon">{icon}</div>
            <div class="empty-state-title">{title}</div>
            <div class="empty-state-desc">{description}</div>
            {instruct_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_theme_toggle() -> None:
    """Render theme toggle switcher preserving user selection in session state."""
    current_theme = get_current_theme()
    options = ["🌙 Dark Mode", "☀️ Light Mode"]
    index = 0 if current_theme == "dark" else 1

    selected = st.sidebar.radio(
        "Appearance",
        options=options,
        index=index,
        horizontal=True,
        label_visibility="collapsed",
    )

    new_theme = "dark" if "Dark" in selected else "light"
    if new_theme != current_theme:
        st.session_state["theme"] = new_theme
        st.rerun()


def render_status_badge(label: str, status: str) -> None:
    """Render a clean theme-aware status badge indicating pipeline readiness.

    Allowed statuses: 'Ready', 'Needs Data', 'Processing', 'Completed', 'Blocked'.

    Args:
        label: Workflow step or component name.
        status: Current state ('Ready', 'Needs Data', 'Processing', 'Completed', 'Blocked').
    """
    colors_map = {
        "Completed": ("#10B981", "rgba(16, 185, 129, 0.15)", "✓"),
        "Ready": ("#06B6D4", "rgba(6, 182, 212, 0.15)", "●"),
        "Processing": ("#3B82F6", "rgba(59, 130, 246, 0.15)", "⏳"),
        "Needs Data": ("#F59E0B", "rgba(245, 158, 11, 0.15)", "▲"),
        "Blocked": ("#EF4444", "rgba(239, 68, 68, 0.15)", "✕"),
    }
    color, bg, icon = colors_map.get(status, ("#64748B", "rgba(100, 116, 139, 0.15)", "○"))
    html = (
        f'<div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; '
        f'border-radius: 9999px; background: {bg}; border: 1px solid {color}40; margin: 3px 0;">'
        f'<span style="font-size: 0.75rem; color: {color};">{icon}</span>'
        f'<span style="font-size: 0.8rem; font-weight: 600; color: {color};">'
        f"{label}: {status}</span>"
        f"</div>"
    )
    st.markdown(html, unsafe_allow_html=True)
