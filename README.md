# WardPulse AI
> **Spatial Intelligence for Predictive Civic Resource Allocation**
> *Tagline*: **Predict. Understand. Prioritize.**

WardPulse AI is a civic-intelligence platform designed to solve the **cold-start ward demand prediction** challenge: forecasting the volume of civic complaints expected in municipal wards with little or no historical complaint records using demographic, infrastructural, spatial, and neighbouring-ward attribute data.

---

## 1. Problem Statement & Mission

Municipalities often face resource allocation imbalances because complaint-reporting rates correlate heavily with digital literacy, civic engagement, and socio-economic privilege rather than actual infrastructural distress. Wards with low historical complaint volumes frequently suffer from unreported civic issues.

WardPulse AI addresses this with:
1. **Cold-Start Demand Prediction**: Generalizing to unseen wards with zero historical complaint records via demographic, infrastructural, and spatial attributes.
2. **Neighbour Intelligence**: Spatial lag feature synthesis capturing geographic autocorrelation using k-nearest neighbour spatial clustering without target leakage.
3. **Statistically Defensible Uncertainty**: Prediction intervals and standard deviation estimates derived from tree ensemble distributions rather than arbitrary confidence percentages.
4. **Explainable AI (XAI)**: Global feature rankings and individual ward attribution decomposing why specific wards deviate above or below municipal averages.
5. **Civic Resource Prioritization**: Transparent 0–100 dispatch priority indexing into **Critical**, **High**, **Medium**, and **Low** response tiers.
6. **Domain Complaint Breakdowns**: Automatic detection of road, waste, water, and lighting categories where present.

---

## 2. Tech Stack

- **Core Runtime**: Python 3.10+
- **Data Manipulation**: Pandas, NumPy
- **Machine Learning**: Scikit-learn
- **Dashboard & Visualization**: Streamlit, Plotly
- **Quality & Testing**: Pytest, Ruff
- **Optional Extensions**: GeoPandas (vector geometry), XGBoost (gradient boosting), SHAP (Shapley values)

---

## 3. Architecture & Directory Structure

```text
WardPulse-AI/
├── app.py                     # Streamlit application shell & theme controller
├── requirements.txt           # Base project dependencies
├── pyproject.toml             # Ruff and pytest tool configuration
├── README.md                  # Project documentation and setup guide
├── AGENTS.md                  # Operating principles and strict engineering rules
├── .gitignore                 # Version control exclusions
├── data/
│   ├── raw/
│   │   ├── official/          # Immutable directory for official competition data
│   │   └── manual_test/       # Immutable directory for edge-case and test data
│   └── processed/             # Cleaned, standardized tabular outputs
├── artifacts/
│   ├── models/                # Serialized model pipelines and metadata
│   └── reports/               # Evaluation metrics, audit logs, and figures
├── src/
│   └── wardpulse/             # Core business and machine learning logic
│       ├── __init__.py
│       ├── config.py          # Central paths and logging configuration
│       ├── data_loader.py     # Resilient loaders for CSV, Excel, GeoJSON, Parquet
│       ├── data_validation.py # Schema inspection, missingness, duplicates, outliers, ward ID audit
│       ├── preprocessing.py   # Imputation, scaling, column sanitization
│       ├── feature_engineering.py # Neighbour intelligence, ratios, complaint category matcher
│       ├── train.py           # Baseline & RF models, ColdStartHoldoutSplitter, compare_models
│       ├── evaluate.py        # MAE, RMSE, R², MAPE, and residual metrics
│       ├── predict.py         # Demand prediction, empirical quantile uncertainty intervals
│       ├── explainability.py  # Global importance, individual ward attribution, SHAP fallback
│       └── prioritization.py  # Need-based resource allocation scoring and priority tiers
├── dashboard/                 # Streamlit presentation components
│   ├── __init__.py
│   ├── components.py          # Dark/Light theme system, animated CSS, Inter typography, cards
│   ├── overview.py            # Overview, data quality audit, health score, category matcher
│   ├── map_view.py            # Ward Intelligence Map, Choropleth boundaries, spatial drill-down
│   └── prediction_view.py     # Cold-start training, benchmarking, XAI, and prioritization
└── tests/                     # Automated unit and integration test suite (42 tests)
    ├── test_data_loader.py
    ├── test_data_validation.py
    ├── test_preprocessing.py
    └── test_app.py
```

---

## 4. Quick Start & Installation

### Prerequisites
- Python 3.10 or higher.

### Step 1: Clone and Set Up Virtual Environment
```bash
# Clone the repository
git clone <repo-url>
cd WardPulse-AI

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

*(Optional packages can be installed if required):*
```bash
# Optional geospatial boundary polygons
pip install geopandas

# Optional gradient boosting and SHAP
pip install xgboost shap
```

---

## 5. Running the Application

Launch the Streamlit dashboard:
```bash
streamlit run app.py
```

### Dark & Light Mode Theme Switcher
The application features a built-in theme switcher in the sidebar supporting:
- **Dark Mode**: Premium SaaS aesthetic (`#08111F` canvas, `#101E30` cards, `#4DE4D0` teal accent).
- **Light Mode**: High-contrast civic portal (`#F3F7FB` canvas, `#FFFFFF` cards, `#087E83` accent).
- Persistent state across navigation and tab switches without resetting data.

---

## 6. Development and Quality Assurance

Run the automated verification suite:
```bash
# Check code style and linting
ruff check .

# Check code formatting
ruff format --check .

# Run automated test suite (42 tests)
python -m pytest -v

# Verify syntax compilation
python -m compileall app.py src dashboard
```

---

## 7. Official Competition Dataset Integration

The official BBMP Bangalore dataset files are staged in `data/raw/official/`:
1. `ward_features.csv`: 198 wards of BBMP Bangalore with 30 demographic, infrastructural, and spatial features (`centroid_lat`, `centroid_lon`).
2. `wards.geojson`: 198 polygon boundaries matching each ward by `properties.ward_id`.
3. `prediction_grid_template.csv`: Official test grid of 4,320 target prediction rows (40 cold-start wards × 18 months × 6 complaint categories: `electrical`, `solid_waste`, `roads`, `trees`, `animals_health`, `other`).
4. `sample_submission.csv`: Competition submission schema (`ward_id`, `month`, `category_group`, `predicted_count`).

### Workflow with Official Data:
1. **1-Click Load**: On the **Overview** page, click `⚡ Load Official Bangalore BBMP Dataset Bundle`.
2. **Interactive Map**: In **Ward Intelligence Map**, explore full choropleth boundaries and spatial neighbour intelligence.
3. **Cold-Start Prediction**: In **Demand Prediction**, evaluate cold-start models or generate the official `submission.csv` using the built-in competition submission generator.
4. **Prioritization**: In **Civic Resource Prioritization**, inspect action tiers and download the dispatch allocation CSV.
