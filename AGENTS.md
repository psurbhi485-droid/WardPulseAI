# WardPulse AI — Agent Operating Rules & Directives

This document sets binding technical and ethical standards for any AI agent or contributor working on the **WardPulse AI** codebase.

---

## 1. Core Principles

### Rule 1: Never Fabricate Data or Predictions
- **Zero Hallucination Policy**: If the official dataset is not loaded, do not fabricate ward names, complaint counts, synthetic metrics, or pseudo-predictions in the UI or pipelines.
- Clearly present an explicit `Dataset Not Uploaded` or `Feature Not Available` state.
- Predictions must be genuine outputs from validated, trained models evaluated on verified input features.

### Rule 2: Never Assume Dataset Schemas
- Never hardcode expected column names (e.g., assuming `"ward_id"`, `"complaints"`, `"population"`).
- Always use runtime schema inspection, column selection, or configurable mapping dictionaries.
- Validate types, missing values, and uniqueness dynamically at runtime.

### Rule 3: Never Claim Unmeasured Performance
- Never display dummy or hardcoded accuracy metrics (e.g., claiming "R² = 0.94" or "RMSE = 2.1").
- Metrics (MAE, RMSE, R²) must only be rendered after an actual holdout or cross-validation evaluation on real data.
- When evaluation has not been executed, display metric states as uncalculated with explanation.

### Rule 4: Never Silently Suppress Errors
- Catch specific exceptions (`FileNotFoundError`, `ValueError`, `KeyError`, etc.).
- Never use bare `except:` or `pass` blocks that swallow failures.
- Log meaningful context with the standard Python `logging` module before surfacing actionable messages to the user.

### Rule 5: Never Overwrite Original Datasets
- Files in `data/raw/official/` and `data/raw/manual_test/` are immutable and strictly read-only.
- Always load data as copies. All transformations and cleanings must write to `data/processed/` or memory.
- Prevent in-place modifications (`inplace=True` is prohibited).

### Rule 6: Always Test Changes
- Every new pipeline, data loader, validator, and model interface must have corresponding automated tests in `tests/`.
- All changes must pass:
  1. `ruff check .`
  2. `ruff format --check .`
  3. `python -m pytest -q`
  4. `python -m compileall app.py src dashboard`

---

## 2. Architecture & Design Rules

- **Separation of Concerns**: UI code resides strictly in `app.py` and `dashboard/`. ML, data manipulation, validation, and analytics logic reside strictly in `src/wardpulse/`.
- **Path Handling**: Use `pathlib.Path` exclusively. String path concatenations are forbidden.
- **Type Annotations**: All function signatures must include Python type hints.
- **Optional Dependencies**: Geospatial (`geopandas`), advanced gradient boosting (`xgboost`), and model interpretability (`shap`) packages must be treated as optional plugins with graceful runtime fallback and informative diagnostic messages.
