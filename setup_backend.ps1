Write-Host "Checking virtual environment..."

if (!(Test-Path "terra_venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv terra_venv

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Virtual environment creation failed. Stopping."
        exit 1
    }
}
else {
    Write-Host "Virtual environment already exists."
}

Write-Host "Activating virtual environment..."
.\terra_venv\Scripts\Activate.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to activate virtual environment. Stopping."
    exit 1
}

Write-Host "Installing packages..."
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "Package installation failed."
    exit 1
}

Write-Host "Backend environment is ready to launch"
