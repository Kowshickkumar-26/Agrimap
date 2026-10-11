"""
VIT MAPATHON — Member 1 (AI / ML & Backend Systems)
Statistics Router: Serves dynamic study area aggregations and ML model metrics.
"""

import csv
import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException
try:
    from sqlalchemy import text
    from sqlalchemy.orm import Session
except (ImportError, Exception):
    text = None
    Session = None

from database import is_db_connected, get_db, load_json_artifact, resolve_artifact_path

logger = logging.getLogger("StatisticsRouter")
router = APIRouter(prefix="/api", tags=["statistics"])


@router.get("/statistics", response_model=Dict[str, Any])
def get_statistics(db: Optional[Session] = Depends(get_db)):
    """
    Returns aggregated study area summary and per-crop distribution (counts, area in sq. km, ha, %).
    Calculates dynamically from PostGIS if connected; otherwise serves crop_statistics.json deliverable.
    """
    if is_db_connected() and db is not None:
        try:
            # Dynamic PostGIS aggregation
            summary_sql = """
                SELECT 
                    COUNT(*) as total_parcels,
                    COALESCE(SUM(area_sq_km), 0.0) as total_area_sq_km,
                    COALESCE(SUM(area_ha), 0.0) as total_area_ha,
                    COALESCE(AVG(confidence), 0.0) as overall_mean_conf
                FROM agricultural_parcels;
            """
            s_row = db.execute(text(summary_sql)).fetchone()
            total_parcels = s_row.total_parcels
            total_area_sq_km = float(s_row.total_area_sq_km)
            total_area_ha = float(s_row.total_area_ha)
            overall_conf = float(s_row.overall_mean_conf)

            dist_sql = """
                SELECT 
                    predicted_crop,
                    COUNT(*) as p_count,
                    COALESCE(SUM(area_sq_km), 0.0) as c_area_sq_km,
                    COALESCE(SUM(area_ha), 0.0) as c_area_ha,
                    COALESCE(AVG(confidence), 0.0) as c_mean_conf
                FROM agricultural_parcels
                GROUP BY predicted_crop;
            """
            d_rows = db.execute(text(dist_sql)).fetchall()

            crop_dist = {}
            for r in d_rows:
                pct_parcels = round((r.p_count / total_parcels * 100.0), 2) if total_parcels > 0 else 0.0
                pct_area = round((float(r.c_area_sq_km) / total_area_sq_km * 100.0), 2) if total_area_sq_km > 0 else 0.0
                crop_dist[r.predicted_crop] = {
                    "parcel_count": r.p_count,
                    "percentage_of_parcels": pct_parcels,
                    "area_sq_km": round(float(r.c_area_sq_km), 4),
                    "area_hectares": round(float(r.c_area_ha), 2),
                    "percentage_of_total_area": pct_area,
                    "mean_confidence": round(float(r.c_mean_conf), 4)
                }

            return {
                "source": "PostGIS_Live_Query",
                "study_area_summary": {
                    "total_parcels": total_parcels,
                    "total_study_area_sq_km": round(total_area_sq_km, 4),
                    "total_study_area_hectares": round(total_area_ha, 2),
                    "overall_mean_confidence": round(overall_conf, 4),
                    "meets_min_area_requirement": total_area_sq_km >= 20.0
                },
                "crop_distribution": crop_dist
            }
        except Exception as e:
            logger.warning(f"PostGIS aggregation failed: {e}. Falling back to crop_statistics.json.")

    try:
        data = load_json_artifact("crop_statistics.json")
        data["source"] = "Artifact_File"
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Crop statistics not available: {e}")


@router.get("/metrics", response_model=Dict[str, Any])
def get_metrics():
    """
    Returns machine learning evaluation metrics (Accuracy, Precision, Recall, F1, per-class metrics)
    from model_metrics.json deliverable.
    """
    try:
        return load_json_artifact("model_metrics.json")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Model metrics not available: {e}")


@router.get("/feature-importance", response_model=Dict[str, Any])
def get_feature_importance():
    """
    Returns ranked feature importance scores from feature_importance.json deliverable.
    """
    try:
        return load_json_artifact("feature_importance.json")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Feature importance not available: {e}")


@router.get("/taluk-acreage", response_model=List[Dict[str, Any]])
@router.get("/statistics/taluk-acreage", response_model=List[Dict[str, Any]])
def get_taluk_acreage():
    """
    Returns taluk-level agricultural acreage statistics (Ambasamudram vs Cheranmahadevi)
    dynamically loaded from taluk_crop_acreage_summary.csv or taluk_acreage.json.
    """
    csv_path = resolve_artifact_path("taluk_crop_acreage_summary.csv")
    if csv_path:
        try:
            records = []
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    t = row.get("Taluk") or row.get("taluk")
                    c = row.get("Crop") or row.get("crop") or "ALL_CROPS"
                    pc = int(float(row.get("Parcel_Count") or row.get("parcel_count") or row.get("total_parcels") or 0))
                    ha = float(row.get("Area_Hectares") or row.get("area_hectares") or row.get("total_area_ha") or 0.0)
                    ac = float(row.get("Area_Acres") or row.get("area_acres") or (ha * 2.47105))
                    pct = float(row.get("Percentage_of_Taluk") or row.get("percentage_of_taluk") or 0.0)
                    records.append({
                        "taluk": t,
                        "crop": c,
                        "parcel_count": pc,
                        "area_hectares": round(ha, 4),
                        "area_acres": round(ac, 4),
                        "percentage_of_taluk": round(pct, 2)
                    })
            if records:
                return records
        except Exception as e:
            logger.warning(f"Error reading taluk acreage CSV: {e}")

    # Fallback to JSON artifact
    json_path = resolve_artifact_path("taluk_acreage.json")
    if json_path:
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            logger.warning(f"Error reading taluk_acreage.json: {e}")

    raise HTTPException(status_code=404, detail="taluk acreage deliverable not found")

