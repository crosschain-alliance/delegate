#!/bin/bash
set -e

# Create artifacts directory if it doesn't exist
mkdir -p artifacts

# Copy contract artifacts if they exist
if [ -f "../contracts/out/LLMAdapter.sol/LLMAdapter.json" ]; then
    cp ../contracts/out/LLMAdapter.sol/LLMAdapter.json artifacts/
else
    echo "Warning: Contract artifacts not found. Make sure to build contracts first."
    exit 1
fi
