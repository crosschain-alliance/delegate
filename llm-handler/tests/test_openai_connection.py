"""
Tests for OpenAI API connectivity.
"""
import os
import pytest
from unittest.mock import patch, MagicMock
import openai
import asyncio


def test_openai_api_with_mock():
    """Test OpenAI API with mocked client."""
    with patch('openai.OpenAI') as mock_client:
        # Set up mock response
        mock_instance = mock_client.return_value
        mock_chat = MagicMock()
        mock_instance.chat.completions.create = mock_chat
        
        # Configure mock response
        mock_message = MagicMock()
        mock_message.content = "Hello! I'm a mock response."
        mock_choice = MagicMock()
        mock_choice.message = mock_message
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_chat.return_value = mock_response
        
        # Create client and call API
        client = openai.OpenAI(api_key="fake-api-key")
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello!"},
            ],
        )
        
        # Assert response content
        assert response.choices[0].message.content == "Hello! I'm a mock response."


@pytest.mark.skipif(True, reason="Skipping actual OpenAI API call")
def test_real_openai_api():
    """Test real OpenAI API connection if API key is available."""
    # This test is skipped by default to avoid making real API calls in CI/CD
    api_key = os.environ.get("OPENAI_API_KEY")
    
    client = openai.OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello briefly."},
        ],
    )
    
    content = response.choices[0].message.content
    assert content
    assert isinstance(content, str)
    assert len(content) > 0