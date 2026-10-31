"""Reusable and resilient data loading utilities for tabular and geospatial civic data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from wardpulse.config import (
    RAW_DATA_DIR,
    SUPPORTED_EXTENSIONS,
    setup_logging,
)

logger = setup_logging()


def validate_file_path(file_path: Path | str) -> Path:
    """Validate that a target file exists, is a file, and has a supported extension.

    Args:
        file_path: Path to the target file.

    Returns:
        Path object pointing to the validated file.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the path is not a file or has an unsupported extension.
    """
    path = Path(file_path).resolve()
    if not path.exists():
        msg = f"Data file does not exist: {path}"
        logger.error(msg)
        raise FileNotFoundError(msg)

    if not path.is_file():
        msg = f"Path exists but is not a file: {path}"
        logger.error(msg)
        raise ValueError(msg)

    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        msg = (
            f"Unsupported file format '{path.suffix}'. "
            f"Supported extensions are: {sorted(SUPPORTED_EXTENSIONS)}"
        )
        logger.error(msg)
        raise ValueError(msg)

    return path


def load_csv(file_path: Path | str, **kwargs: Any) -> pd.DataFrame:
    """Load a CSV file into a Pandas DataFrame.

    Original file is opened read-only and never modified.

    Args:
        file_path: Path to the CSV file.
        **kwargs: Additional parameters forwarded to `pandas.read_csv`.

    Returns:
        Loaded DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If file loading fails or is invalid.
    """
    path = validate_file_path(file_path)
    try:
        df = pd.read_csv(path, **kwargs)
        logger.info("Successfully loaded CSV: %s (shape: %s)", path.name, df.shape)
        return df
    except Exception as exc:
        msg = f"Failed to load CSV file '{path}': {exc}"
        logger.error(msg)
        raise ValueError(msg) from exc


def load_excel(file_path: Path | str, **kwargs: Any) -> pd.DataFrame:
    """Load an Excel spreadsheet into a Pandas DataFrame.

    Args:
        file_path: Path to the Excel file.
        **kwargs: Additional parameters forwarded to `pandas.read_excel`.

    Returns:
        Loaded DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If file loading fails.
    """
    path = validate_file_path(file_path)
    try:
        df = pd.read_excel(path, **kwargs)
        logger.info("Successfully loaded Excel: %s (shape: %s)", path.name, df.shape)
        return df
    except Exception as exc:
        msg = f"Failed to load Excel file '{path}': {exc}"
        logger.error(msg)
        raise ValueError(msg) from exc


def load_geojson(file_path: Path | str) -> dict[str, Any]:
    """Load a GeoJSON file into a Python dictionary.

    Args:
        file_path: Path to the GeoJSON file.

    Returns:
        Parsed GeoJSON content as a dictionary.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If JSON parsing fails or content is not a GeoJSON structure.
    """
    path = validate_file_path(file_path)
    try:
        with path.open("r", encoding="utf-8") as file_handle:
            data = json.load(file_handle)

        if not isinstance(data, dict) or "type" not in data:
            msg = f"File '{path.name}' is valid JSON but does not follow GeoJSON structure."
            logger.error(msg)
            raise ValueError(msg)

        logger.info("Successfully loaded GeoJSON: %s (type: %s)", path.name, data.get("type"))
        return data
    except Exception as exc:
        msg = f"Failed to load GeoJSON file '{path}': {exc}"
        logger.error(msg)
        raise ValueError(msg) from exc


def load_dataset(file_path: Path | str, **kwargs: Any) -> pd.DataFrame:
    """Load any supported tabular or feature dataset based on its file extension.

    Args:
        file_path: Path to the dataset.
        **kwargs: Optional keyword arguments passed to the specific loader.

    Returns:
        Loaded Pandas DataFrame.

    Raises:
        ValueError: If the file format cannot be parsed into a DataFrame.
    """
    path = validate_file_path(file_path)
    ext = path.suffix.lower()

    if ext == ".csv":
        return load_csv(path, **kwargs)
    if ext in {".xlsx", ".xls"}:
        return load_excel(path, **kwargs)
    if ext == ".parquet":
        try:
            return pd.read_parquet(path, **kwargs)
        except Exception as exc:
            msg = f"Failed to load Parquet file '{path}': {exc}"
            logger.error(msg)
            raise ValueError(msg) from exc
    if ext in {".geojson", ".json"}:
        geo_dict = load_geojson(path)
        # Extract tabular properties if GeoJSON FeatureCollection
        if geo_dict.get("type") == "FeatureCollection" and "features" in geo_dict:
            features = geo_dict.get("features", [])
            records = [feat.get("properties", {}) for feat in features if isinstance(feat, dict)]
            if records:
                return pd.DataFrame(records)
        msg = (
            f"GeoJSON file '{path.name}' loaded successfully as spatial geometry, "
            "but could not be converted directly into a tabular DataFrame of properties."
        )
        raise ValueError(msg)

    msg = f"Loader dispatch not implemented for extension: '{ext}'"
    raise ValueError(msg)


def list_available_raw_datasets(directory: Path | None = None) -> list[Path]:
    """Scan the raw data directories and return paths to all supported files.

    Args:
        directory: Optional directory to search. Defaults to RAW_DATA_DIR.

    Returns:
        List of Path objects for available dataset files.
    """
    search_dir = directory or RAW_DATA_DIR
    if not search_dir.exists():
        return []

    available_files: list[Path] = []
    for ext in SUPPORTED_EXTENSIONS:
        # Search for lowercase and uppercase variants
        available_files.extend(search_dir.rglob(f"*{ext}"))
        available_files.extend(search_dir.rglob(f"*{ext.upper()}"))

    # Remove duplicates and filter out hidden files
    unique_files = sorted(
        {p.resolve() for p in available_files if p.is_file() and not p.name.startswith(".")}
    )
    return unique_files
