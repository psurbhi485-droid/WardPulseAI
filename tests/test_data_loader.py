"""Unit tests for wardpulse.data_loader module."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from wardpulse.data_loader import (
    list_available_raw_datasets,
    load_csv,
    load_dataset,
    load_excel,
    load_geojson,
    validate_file_path,
)


def test_validate_file_path_nonexistent(tmp_path: Path) -> None:
    """Validate that non-existent path raises FileNotFoundError."""
    non_existent = tmp_path / "missing.csv"
    with pytest.raises(FileNotFoundError, match="Data file does not exist"):
        validate_file_path(non_existent)


def test_validate_file_path_unsupported_ext(tmp_path: Path) -> None:
    """Validate that unsupported file extensions raise ValueError."""
    bad_file = tmp_path / "test.unsupported"
    bad_file.write_text("sample content", encoding="utf-8")
    with pytest.raises(ValueError, match="Unsupported file format"):
        validate_file_path(bad_file)


def test_load_csv_valid(tmp_path: Path) -> None:
    """Validate loading a valid CSV file."""
    csv_file = tmp_path / "wards.csv"
    df_expected = pd.DataFrame({"ward_id": [1, 2, 3], "population": [1000, 2000, 3000]})
    df_expected.to_csv(csv_file, index=False)

    df_loaded = load_csv(csv_file)
    pd.testing.assert_frame_equal(df_loaded, df_expected)


def test_load_excel_valid(tmp_path: Path) -> None:
    """Validate loading a valid Excel file."""
    xlsx_file = tmp_path / "wards.xlsx"
    df_expected = pd.DataFrame({"ward_id": [1, 2], "score": [4.5, 3.2]})
    df_expected.to_excel(xlsx_file, index=False)

    df_loaded = load_excel(xlsx_file)
    pd.testing.assert_frame_equal(df_loaded, df_expected)


def test_load_geojson_valid(tmp_path: Path) -> None:
    """Validate loading a valid GeoJSON file."""
    geojson_file = tmp_path / "ward_boundaries.geojson"
    sample_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"ward": "Ward 1", "area_sqkm": 2.5},
                "geometry": {"type": "Point", "coordinates": [77.59, 12.97]},
            }
        ],
    }
    geojson_file.write_text(json.dumps(sample_geojson), encoding="utf-8")

    data = load_geojson(geojson_file)
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 1


def test_load_dataset_dispatch(tmp_path: Path) -> None:
    """Validate load_dataset auto-dispatches correctly for CSV."""
    csv_file = tmp_path / "data.csv"
    df_expected = pd.DataFrame({"col_a": [10, 20], "col_b": [30, 40]})
    df_expected.to_csv(csv_file, index=False)

    df_loaded = load_dataset(csv_file)
    assert df_loaded.shape == (2, 2)


def test_list_available_raw_datasets(tmp_path: Path) -> None:
    """Validate listing datasets inside a specified directory."""
    sub_dir = tmp_path / "sub"
    sub_dir.mkdir()
    f1 = sub_dir / "wards.csv"
    f1.write_text("a,b\n1,2\n", encoding="utf-8")
    f2 = sub_dir / "notes.txt"  # not supported
    f2.write_text("info", encoding="utf-8")

    found = list_available_raw_datasets(tmp_path)
    found_names = [f.name for f in found]
    assert "wards.csv" in found_names
    assert "notes.txt" not in found_names
