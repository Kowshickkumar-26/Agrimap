# 🌾 AgriMap — Agricultural Land Parcel and Crop Identification Platform
### VIT MAPATHON 2026 — Geospatial AI & Aerial Computer Vision Solution

---

## 📌 Problem Statement Overview
Automated identification and classification of agricultural land parcels, **Paddy** (rice), and **Banana** plantations in **Tirunelveli District** (covering **Ambasamudram Taluk** and **Cheranmahadevi Taluk**), Tamil Nadu, India, using multi-temporal Sentinel-2 Level-2A surface reflectance satellite imagery and high-resolution aerial computer vision.

- **Study Area Covered**: $240.65 \text{ km}^2$ (Ambasamudram & Cheranmahadevi Taluks)
- **Target Classes**: `Paddy`, `Banana`, `Other (Fallow/Non-Crop)`
- **Core AI Models**:
  - **Crop Classifier**: Multi-Temporal Random Forest & Tuned XGBoost (91.53% Accuracy, 91.14% Macro F1)
  - **Plant & Tree Counter**: YOLOv8 Aerial Computer Vision (0.25m GSD micro-canopy detection)
  - **Agri-AI Chatbot**: Google Gemini 2.5 Flash with localized domain grounding & zero hardcoding
  - **Disaster Risk Engine**: Multi-hazard flood inundation and crop damage valuation (SDRF norms)

---

## 🏛️ Unified System Architecture

```
                                 [ Sentinel-2 Multi-Temporal L2A Imagery ]
                                                     ↓
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🛰️ GEOSPATIAL & REMOTE SENSING PREPROCESSING (preprocessing/)                                         │
│  - SCL Scene Classification cloud & shadow masking (>99.9% valid pixels)                               │
│  - 20m -> 10m band resampling in EPSG:32643 (UTM Zone 43N)                                             │
│  - Multi-temporal 60-layer stack (NDVI, NDWI, EVI, SAVI, NDRE Red-Edge)                                │
│  - Cadastral Parcel extraction (850 contiguous agricultural parcels across 2 Taluks)                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     ↓
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🧠 MACHINE LEARNING & COMPUTER VISION ENGINE (ml/)                                                    │
│  - Stratified & Group Cross-Validation (Zero Spatial Autocorrelation Leakage)                          │
│  - Tuned Random Forest (n_estimators=200) & XGBoost Classifier (88.14% - 91.53% Accuracy)             │
│  - YOLOv8 Aerial Tree & Plant Counter (individual plant density & cluster tracking)                    │
│  - PostGIS & SQLite Time-Series Ingestion Pipeline (Phase 2 Multi-Season Monitoring)                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     ↕
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ FULL-STACK PLATFORM & INTERACTIVE WEB GIS (backend/ & frontend/)                                   │
│  - FastAPI High-Performance Spatial REST API (Parcels, Metrics, Stats, Hazards, Tree-Counts, PDF)      │
│  - React + Leaflet + Vite Web GIS Dashboard with real-time layer toggles & analytics                   │
│  - Conversational AgriBot powered by Google Gemini 2.5 Flash for parcel-level agronomic advisories     │
│  - Automated publication-quality Agricultural Cadastral PDF Report Generator                           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Clean Unified Directory Structure

```
VIT/
├── backend/                  # FastAPI Spatial REST API Backend
│   ├── data/                 # Data artifacts & local GeoJSON fallback
│   ├── reports/              # Automated PDF report generator
│   ├── routers/              # API routers (parcels, statistics, analysis, monitoring, layers)
│   ├── services/             # Gemini AI chatbot service & domain calculation engine
│   ├── database.py           # Database connection & artifact loader
│   ├── timeseries_db.py      # TimeSeriesDB SQLite & PostGIS storage
│   └── main.py               # FastAPI application entrypoint
├── frontend/                 # React + Leaflet Web GIS Dashboard (Vite)
│   ├── public/               # Public maps, GeoJSON layers, assets
│   ├── src/                  # React components, styles, reactive state
│   ├── package.json
│   └── vite.config.js
├── ml/                       # Machine Learning & Aerial Computer Vision
│   ├── classification/       # Crop classification models & predictors
│   ├── features/             # Advanced vegetation indices & phenology
│   ├── pipelines/            # Inference and training pipelines
│   ├── tree_counting/        # YOLOv8 individual tree & plant detection
│   ├── models/               # Model registry & versioning
│   ├── train_crop_classifier.py
│   └── run_pipeline.py       # End-to-end ML execution orchestrator
├── tests/                    # Comprehensive Automated Test Suite (57 tests)
│   ├── test_backend.py
│   ├── test_production_monitoring.py
│   ├── test_tree_counter.py
│   ├── test_model_pipeline.py
│   ├── test_dataset_builder.py
│   ├── test_parcel_classifier.py
│   ├── test_feature_loader.py
│   ├── test_label_loader.py
│   └── test_validation.py
├── data/                     # Geospatial layers, parcels, database
├── hazard/                   # Flood inundation & crop damage assessment
├── models/                   # Serialized model weights (.joblib, .pt)
├── postprocessing/           # Validation maps, acreage calculations, Folium map
├── preprocessing/            # Sentinel-2 L2A preprocessing & feature extraction
├── results/                  # Deliverables, reports, charts, maps
├── scripts/                  # Automated data fetching & processing scripts
├── start.bat                 # 1-Click Platform Launcher (Windows Batch)
├── start.ps1                 # 1-Click Platform Launcher (PowerShell)
├── requirements.txt          # Python dependencies
└── README.md
```

---

## 🚀 Running the Platform

### 1-Click Launch (Recommended)
- **Windows Batch**: Double-click or run [`start.bat`](file:///d:/VIT%20%282%29/VIT/start.bat)
- **PowerShell**: Run [`start.ps1`](file:///d:/VIT%20%282%29/VIT/start.ps1)

### Manual Launch

1. **Install Python Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Automated Test Suite (57 tests):**
   ```bash
   pytest tests/ -v
   ```

3. **Start FastAPI Backend (Port 8000):**
   ```bash
   python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```
   - API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
   - Health Status: `http://127.0.0.1:8000/api/health`

4. **Start Web GIS Frontend (Port 5173 / 5174):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Open Web Dashboard: `http://localhost:5173` or `http://localhost:5174`

---

## 📊 Key Results & Model Performance

| Metric | Random Forest (v1.0) | XGBoost Upgraded (v2.0) |
|---|---|---|
| **Test Accuracy** | **88.14%** | **91.53%** |
| **Macro F1-Score** | **87.06%** | **91.14%** |
| **Paddy Precision / Recall** | **92.3% / 88.9%** | **94.1% / 93.3%** |
| **Banana Precision / Recall** | **85.7% / 87.0%** | **90.0% / 91.2%** |
| **5-Fold Cross Validation** | **83.78%** | **87.16%** |
| **Evaluation Strategy** | GroupShuffleSplit by Parcel ID | GroupShuffleSplit by Parcel ID |
