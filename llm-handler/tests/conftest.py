"""
Test configuration and utilities
"""

import os
import pytest
from unittest.mock import AsyncMock, patch

# Set test environment variables
os.environ["OPENAI_API_KEY"] = "test-api-key"
os.environ["DIRECTIVE"] = "You are a helpful assistant."
