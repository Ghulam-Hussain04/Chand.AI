Write-Host "Creating virtual environment..."
python -m venv terra_venv

Write-Host "Activating virtual environment..."
.\terra_venv\Scripts\Activate.ps1

Write-Host "Installing packages..."
pip install -r requirements.txt

Write-Host "Backend environment is ready to launch"
