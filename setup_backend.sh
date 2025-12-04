#!/bin/bash

echo "Creating virtual environment..."
python -m venv terra_venv

echo "Activating virtual environment..."
source terra_venv/bin/activate

echo "Installing packages..."
pip install -r requirements.txt

echo "Backend environment is ready to launch"
