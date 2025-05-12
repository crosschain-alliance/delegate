#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install package in development mode
echo "Installing package in development mode..."
pip install -e ".[dev]"

echo "Python environment setup complete! Run 'source venv/bin/activate' to activate it."
