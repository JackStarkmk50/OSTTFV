# Start OSTTFV Backend
Set-Location "$PSScriptRoot\backend"

# Suppress HuggingFace symlinks warning (Windows doesn't need symlinks to work)
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"

# Use Python 3.11 explicitly
$py = "py"
$pyVersion = "-3.11"

# Create venv with Python 3.11 if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python 3.11 virtual environment..." -ForegroundColor Cyan
    & $py $pyVersion -m venv .venv
    if (-not $?) {
        Write-Host "ERROR: Python 3.11 not found. Install from python.org" -ForegroundColor Red
        exit 1
    }
}

# Verify venv is 3.11
$venvPython = ".\.venv\Scripts\python.exe"
$venvVersion = (& $venvPython --version 2>&1)
Write-Host "Using: $venvVersion" -ForegroundColor Cyan

# Activate
& ".venv\Scripts\Activate.ps1"

# Install deps (skip if already installed to save time)
Write-Host "Checking dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt --quiet

# Start server
Write-Host "Starting FastAPI backend on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
