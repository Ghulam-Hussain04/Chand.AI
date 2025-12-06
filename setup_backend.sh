#!/bin/bash

echo "Checking virtual environment..."

if [ ! -d "terra_venv" ]; then
    echo "Creating virtual environment..."
    python -m venv terra_venv

    if [ $? -ne 0 ]; then
        echo "Virtual environment creation failed. Stopping !"
        exit 1
    fi
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source terra_venv/Scripts/activate

if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment. Stopping !"
    exit 1
fi

echo "Installing packages..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "Package installation failed !"
    exit 1
fi

echo "Backend environment is ready to launch."