# ======================================================================
#          VIT MAPATHON -- Agricultural GIS Platform Launcher
# ======================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          VIT MAPATHON -- Agricultural GIS Platform" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Starting React Web GIS Dashboard on http://localhost:5174..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n======================================================================" -ForegroundColor Cyan
Write-Host "  Both services successfully launched!" -ForegroundColor Green
Write-Host "  - Web GIS Dashboard: http://localhost:5174" -ForegroundColor Yellow
Write-Host "  - Interactive API:   http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "  - Health Endpoint:   http://127.0.0.1:8000/api/health" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
