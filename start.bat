@echo off
title VIT MAPATHON Agricultural GIS Platform
color 0A

echo ======================================================================
echo           VIT MAPATHON -- Agricultural GIS Platform
echo ======================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "VIT MAPATHON - Backend (FastAPI)" cmd /k "python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting React Web GIS Dashboard on http://localhost:5174 ...
start "VIT MAPATHON - Frontend (React + Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================================
echo   Both services successfully launched!
echo.
echo   - Web GIS Dashboard: http://localhost:5174
echo   - Interactive API:   http://127.0.0.1:8000/docs
echo   - Health Endpoint:   http://127.0.0.1:8000/api/health
echo ======================================================================
echo.
