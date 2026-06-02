# Start OSTTFV Backend
Set-Location "$PSScriptRoot\backend"

# Create venv if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

# Activate
& ".venv\Scripts\Activate.ps1"

# Install deps
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

# Start server
Write-Host "Starting FastAPI backend on http://localhost:8000" -ForegroundColor Green
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
