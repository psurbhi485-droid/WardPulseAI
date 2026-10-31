"""Configuration settings, directory paths, and logging setup for WardPulse AI."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Final

# Root repository directory
PROJECT_ROOT: Final[Path] = Path(__file__).resolve().parent.parent.parent

# Data directory paths
DATA_DIR: Final[Path] = PROJECT_ROOT / "data"
RAW_DATA_DIR: Final[Path] = DATA_DIR / "raw"
OFFICIAL_DATA_DIR: Final[Path] = RAW_DATA_DIR / "official"
MANUAL_TEST_DATA_DIR: Final[Path] = RAW_DATA_DIR / "manual_test"
PROCESSED_DATA_DIR: Final[Path] = DATA_DIR / "processed"

# Artifacts directory paths
ARTIFACTS_DIR: Final[Path] = PROJECT_ROOT / "artifacts"
MODELS_DIR: Final[Path] = ARTIFACTS_DIR / "models"
REPORTS_DIR: Final[Path] = ARTIFACTS_DIR / "reports"

# File format specifications
SUPPORTED_EXTENSIONS: Final[set[str]] = {
    ".csv",
    ".xlsx",
    ".xls",
    ".geojson",
    ".json",
    ".parquet",
}


def ensure_directories() -> None:
    """Ensure all expected data and artifact directories exist."""
    directories = [
        OFFICIAL_DATA_DIR,
        MANUAL_TEST_DATA_DIR,
        PROCESSED_DATA_DIR,
        MODELS_DIR,
        REPORTS_DIR,
    ]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)


def setup_logging(
    level: int = logging.INFO,
    logger_name: str = "wardpulse",
) -> logging.Logger:
    """Configure and return an application logger.

    Args:
        level: Logging level (e.g. logging.INFO, logging.DEBUG).
        logger_name: Name of the logger.

    Returns:
        Configured logging.Logger instance.
    """
    logger = logging.getLogger(logger_name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(level)
    return logger
