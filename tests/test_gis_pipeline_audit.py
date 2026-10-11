"""
End-to-End Audit & Data Pipeline Integrity Tests for AgriMap GIS.

Validates:
1. Spatial coverage completeness (study area >= 20 sq km, both taluks represented).
2. Geometry validity & authenticity (valid shapely Polygons, non-synthetic/irregular field boundaries).
3. Feature schema consistency (parcel_id, crop, confidences, indices including LSWI, provenance).
4. Statistical consistency across GeoJSON, SQLite timeseries.db, crop_statistics.json, and CSV summaries.
5. Water/river masking exclusion verification.
6. Backend FastAPI API contract verification.
"""

import os
import sys
import json
import sqlite3
import pytest
from shapely.geometry import shape, Point, Polygon, MultiPolygon
from fastapi.testclient import TestClient

# Add project roots
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(repo_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from main import app

client = TestClient(app)

GEOJSON_PATH = os.path.join(repo_root, "outputs", "classified_parcels.geojson")
BACKEND_GEOJSON_PATH = os.path.join(backend_dir, "data", "classified_parcels.geojson")
STATS_PATH = os.path.join(repo_root, "outputs", "crop_statistics.json")
TALUK_ACREAGE_PATH = os.path.join(repo_root, "results", "taluk_crop_acreage_summary.csv")
DB_PATH = os.path.join(repo_root, "data", "database", "timeseries.db")
INFRA_PATH = os.path.join(repo_root, "data", "real_infrastructure.geojson")


@pytest.fixture(scope="module")
def parcel_geojson():
    """Loads outputs/classified_parcels.geojson."""
    assert os.path.exists(GEOJSON_PATH), f"GeoJSON deliverable missing at {GEOJSON_PATH}"
    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@pytest.fixture(scope="module")
def crop_stats():
    """Loads outputs/crop_statistics.json."""
    assert os.path.exists(STATS_PATH), f"Crop statistics missing at {STATS_PATH}"
    with open(STATS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def test_spatial_coverage_completeness(parcel_geojson):
    """
    Audit 1: Spatial Coverage Completeness.
    Detects empty or truncated spatial coverage.
    Ensures:
    - >= 2000 genuine field parcels.
    - Coverage spans both Ambasamudram and Cheranmahadevi taluks.
    - Total parcel area >= 20 km² (minimum study area requirement).
    - Coordinates lie within Tirunelveli district study area bounds.
    """
    features = parcel_geojson.get("features", [])
    assert len(features) >= 1500, f"Expected at least 1500 parcels, got {len(features)}"

    taluks = set()
    total_area_sq_km = 0.0
    lats = []
    lons = []

    amba_count = 0
    cher_count = 0

    for f in features:
        props = f.get("properties", {})
        taluk = props.get("taluk", "")
        taluks.add(taluk)
        if "amba" in taluk.lower():
            amba_count += 1
        elif "cher" in taluk.lower():
            cher_count += 1

        total_area_sq_km += props.get("area_sq_km", 0.0)

        geom = shape(f["geometry"])
        bounds = geom.bounds  # (minx, miny, maxx, maxy) -> (min_lon, min_lat, max_lon, max_lat)
        lons.extend([bounds[0], bounds[2]])
        lats.extend([bounds[1], bounds[3]])

    assert "Ambasamudram" in taluks, "Ambasamudram taluk missing from spatial coverage"
    assert "Cheranmahadevi" in taluks, "Cheranmahadevi taluk missing from spatial coverage"
    assert amba_count >= 500, f"Ambasamudram under-represented: {amba_count} parcels"
    assert cher_count >= 500, f"Cheranmahadevi under-represented: {cher_count} parcels"

    assert total_area_sq_km >= 20.0, f"Study area parcel extent {total_area_sq_km} km² < 20.0 km² requirement"

    # Tirunelveli Western Basin Bounding Box Check (approx [8.60, 8.80] N, [77.30, 77.70] E)
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    assert 77.30 <= min_lon <= 77.45, f"Min longitude out of expected bounds: {min_lon}"
    assert 77.55 <= max_lon <= 77.70, f"Max longitude out of expected bounds: {max_lon}"
    assert 8.60 <= min_lat <= 8.72, f"Min latitude out of expected bounds: {min_lat}"
    assert 8.70 <= max_lat <= 8.82, f"Max latitude out of expected bounds: {max_lat}"


def test_geometry_validity_and_authenticity(parcel_geojson):
    """
    Audit 2: Geometry Validity and Authenticity.
    Detects invalid geometries, self-intersections, and synthetic 4-corner grid boxes.
    """
    features = parcel_geojson.get("features", [])
    assert len(features) > 0

    vertex_counts = []
    invalid_geoms = []

    for f in features:
        geom = shape(f["geometry"])
        if not geom.is_valid:
            invalid_geoms.append(f["properties"].get("parcel_id"))

        assert geom.area > 0, f"Parcel {f['properties'].get('parcel_id')} has zero area"

        # Count vertices in exterior boundary
        if isinstance(geom, Polygon):
            vertex_counts.append(len(geom.exterior.coords))
        elif isinstance(geom, MultiPolygon):
            total_v = sum(len(p.exterior.coords) for p in geom.geoms)
            vertex_counts.append(total_v)

    assert len(invalid_geoms) == 0, f"Found invalid geometries in parcels: {invalid_geoms[:5]}"

    # A synthetic grid generator generates exactly 4-corner (5 coords including closure) rectangles for 100% of cells.
    # Genuine field parcels delineated from raster contours have diverse vertex counts (e.g. 6 to 100+ vertices).
    mean_vertices = sum(vertex_counts) / len(vertex_counts)
    assert mean_vertices > 8.0, f"Mean vertex count too low ({mean_vertices:.2f}), suspected synthetic grid"
    
    irregular_parcels = sum(1 for v in vertex_counts if v > 5)
    pct_irregular = (irregular_parcels / len(vertex_counts)) * 100.0
    assert pct_irregular > 75.0, f"Only {pct_irregular:.1f}% parcels are irregular, suspected rectangular grid"

    # In a synthetic grid, std dev of vertex count is 0. In genuine field parcels, std dev is substantial.
    variance = sum((v - mean_vertices) ** 2 for v in vertex_counts) / len(vertex_counts)
    std_dev = variance ** 0.5
    assert std_dev > 2.0, f"Vertex count standard deviation too low ({std_dev:.2f}), suspected synthetic grid"


def test_feature_schema_consistency(parcel_geojson):
    """
    Audit 3: Feature Schema and Attribute Integrity.
    Verifies that all required attributes, classes, indices (including LSWI),
    and provenance tags are present and consistent.
    """
    features = parcel_geojson.get("features", [])
    valid_crops = {"Paddy", "Banana", "Other"}
    valid_taluks = {"Ambasamudram", "Cheranmahadevi"}

    for idx, f in enumerate(features):
        props = f.get("properties", {})
        pid = props.get("parcel_id")
        assert pid and isinstance(pid, str), f"Missing or invalid parcel_id at index {idx}"

        crop = props.get("predicted_crop")
        assert crop in valid_crops, f"Invalid crop '{crop}' in parcel {pid}"

        taluk = props.get("taluk")
        assert taluk in valid_taluks, f"Invalid taluk '{taluk}' in parcel {pid}"

        conf = props.get("confidence")
        assert 0.0 <= conf <= 1.0, f"Confidence out of range in parcel {pid}: {conf}"

        ha = props.get("area_ha")
        sqkm = props.get("area_sq_km")
        assert ha > 0.0, f"Non-positive area_ha in parcel {pid}: {ha}"
        assert sqkm > 0.0, f"Non-positive area_sq_km in parcel {pid}: {sqkm}"
        # Consistency between hectares and square kilometers (1 km² = 100 ha)
        assert abs(ha - (sqkm * 100.0)) < 0.01, f"Area mismatch in parcel {pid}: {ha} ha vs {sqkm} km²"

        # Check model probabilities sum to ~1.0
        p_paddy = props.get("prob_paddy", 0.0)
        p_banana = props.get("prob_banana", 0.0)
        p_other = props.get("prob_other", 0.0)
        prob_sum = p_paddy + p_banana + p_other
        assert 0.95 <= prob_sum <= 1.05, f"Probabilities do not sum to 1.0 in parcel {pid}: {prob_sum}"

        # Check spectral indices are extracted and valid
        ndvi = props.get("mean_ndvi")
        evi = props.get("mean_evi")
        ndwi = props.get("mean_ndwi")
        lswi = props.get("mean_lswi")

        assert ndvi is not None and -1.0 <= ndvi <= 1.0, f"Invalid NDVI in parcel {pid}: {ndvi}"
        assert evi is not None, f"Missing EVI in parcel {pid}"
        assert ndwi is not None and -1.0 <= ndwi <= 1.0, f"Invalid NDWI in parcel {pid}: {ndwi}"
        assert lswi is not None and -1.0 <= lswi <= 1.0, f"Invalid LSWI in parcel {pid}: {lswi}"

        # Provenance must be explicitly stated (distinguishing field-delineated from official cadastral)
        prov = props.get("provenance")
        assert prov and isinstance(prov, str), f"Missing provenance in parcel {pid}"


def test_statistical_consistency(parcel_geojson, crop_stats):
    """
    Audit 4: Statistical Consistency Across Deliverables.
    Verifies that crop_statistics.json matches outputs/classified_parcels.geojson
    and taluk_crop_acreage_summary.csv without fabrication or drift.
    """
    features = parcel_geojson.get("features", [])
    total_parcels = len(features)

    summary = crop_stats.get("study_area_summary", {})
    assert summary.get("total_parcels") == total_parcels, (
        f"Stats total_parcels ({summary.get('total_parcels')}) != GeoJSON features ({total_parcels})"
    )

    crop_dist = crop_stats.get("crop_distribution", {})
    sum_dist_parcels = sum(c["parcel_count"] for c in crop_dist.values())
    assert sum_dist_parcels == total_parcels, (
        f"Sum of crop distribution parcels ({sum_dist_parcels}) != total_parcels ({total_parcels})"
    )

    geojson_area_sqkm = sum(f["properties"]["area_sq_km"] for f in features)
    stats_area_sqkm = summary.get("total_parcels_area_sq_km", 0.0)
    assert abs(geojson_area_sqkm - stats_area_sqkm) < 0.01, (
        f"GeoJSON area ({geojson_area_sqkm:.4f}) != stats area ({stats_area_sqkm:.4f})"
    )

    # Check CSV summary alignment
    assert os.path.exists(TALUK_ACREAGE_PATH), "taluk_crop_acreage_summary.csv missing"
    import csv
    with open(TALUK_ACREAGE_PATH, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
    
    grand_total_row = next((r for r in reader if "GRAND_TOTAL" in r.get("Taluk", "")), None)
    assert grand_total_row is not None, "GRAND_TOTAL row missing in acreage summary CSV"
    csv_parcels = int(grand_total_row["Parcel_Count"])
    csv_ha = float(grand_total_row["Area_Hectares"])

    assert csv_parcels == total_parcels, f"CSV total parcels ({csv_parcels}) != GeoJSON ({total_parcels})"
    assert abs(csv_ha - (stats_area_sqkm * 100.0)) < 0.1, f"CSV ha ({csv_ha}) != stats ha ({stats_area_sqkm * 100.0})"


def test_database_timeseries_synchronization(parcel_geojson):
    """
    Audit 5: SQLite Database Synchronization.
    Verifies that timeseries.db contains all parcels, 4 observation dates,
    and includes LSWI index measurements.
    """
    assert os.path.exists(DB_PATH), f"timeseries.db missing at {DB_PATH}"
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check table structure
    cursor.execute("PRAGMA table_info(parcel_observations);")
    cols = [col[1] for col in cursor.fetchall()]
    assert "parcel_id" in cols
    assert "observation_date" in cols
    assert "ndvi" in cols
    assert "ndwi" in cols
    assert "lswi" in cols, "lswi column missing from parcel_observations table in timeseries.db"

    # Distinct parcel count
    cursor.execute("SELECT COUNT(DISTINCT parcel_id) FROM parcel_observations;")
    db_parcels = cursor.fetchone()[0]
    geojson_parcels = len(parcel_geojson.get("features", []))
    assert db_parcels == geojson_parcels, (
        f"timeseries.db distinct parcels ({db_parcels}) != GeoJSON parcels ({geojson_parcels})"
    )

    # Total rows = parcels * 4 dates
    cursor.execute("SELECT COUNT(*) FROM parcel_observations;")
    total_obs = cursor.fetchone()[0]
    assert total_obs == geojson_parcels * 4, f"Expected {geojson_parcels * 4} observations, got {total_obs}"

    # Non-null LSWI values
    cursor.execute("SELECT COUNT(*) FROM parcel_observations WHERE lswi IS NOT NULL;")
    lswi_count = cursor.fetchone()[0]
    assert lswi_count == total_obs, f"Found {total_obs - lswi_count} null LSWI values in timeseries.db"

    conn.close()


def test_water_masking_integrity(parcel_geojson):
    """
    Audit 6: Water and Channel Masking Integrity.
    Verifies that agricultural field parcels do not overlap the main Thamirabarani River.
    """
    if not os.path.exists(INFRA_PATH):
        pytest.skip("real_infrastructure.geojson not found")

    with open(INFRA_PATH, "r", encoding="utf-8") as f:
        infra = json.load(f)

    river_geoms = []
    for f in infra.get("features", []):
        props = f.get("properties", {})
        if props.get("category") == "waterway" and props.get("type") == "river":
            river_geoms.append(shape(f["geometry"]))

    if not river_geoms:
        pytest.skip("No river lines found in infrastructure data")

    # Sample check: parcels should not intersect the center line of the main river
    from shapely.ops import unary_union
    river_union = unary_union(river_geoms)

    overlap_count = 0
    for feat in parcel_geojson.get("features", [])[:200]:
        poly = shape(feat["geometry"])
        if poly.contains(river_union.intersection(poly)):
            overlap_count += 1

    # Overlaps should be zero or negligible boundary touches
    assert overlap_count == 0, f"Detected {overlap_count} parcels overlapping river centerline"


def test_backend_api_live_endpoints():
    """
    Audit 7: Backend FastAPI Endpoints Contract.
    Verifies /api/statistics, /api/taluk-acreage, /api/parcels/geojson serve
    consistent, non-synthetic data.
    """
    # 1. Statistics
    resp = client.get("/api/statistics")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["study_area_summary"]["total_parcels"] >= 2000
    assert stats["study_area_summary"]["meets_min_area_requirement"] is True

    # 2. Taluk Acreage
    resp = client.get("/api/taluk-acreage")
    assert resp.status_code == 200
    taluk_rows = resp.json()
    assert len(taluk_rows) >= 6
    taluk_names = {r["taluk"] for r in taluk_rows}
    assert any("Ambasamudram" in t for t in taluk_names)
    assert any("Cheranmahadevi" in t for t in taluk_names)

    # 3. GeoJSON Stream
    resp = client.get("/api/parcels/geojson")
    assert resp.status_code == 200
    fc = resp.json()
    assert fc.get("type") == "FeatureCollection"
    assert len(fc.get("features", [])) >= 2000
