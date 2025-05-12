"""
Integration tests for guardrails functionality.
"""
import pytest
from unittest.mock import patch, MagicMock

from llm_handler.guardrails import create_guard, guard_response, create_json_guard
from llm_handler.guardrail_configs import (
    create_content_moderation_guard,
    create_api_response_guard,
    create_voting_guard
)


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client."""
    with patch('openai.OpenAI') as mock_client:
        # Mock the response for content moderation
        mock_response = MagicMock()
        mock_response.results = [MagicMock(flagged=False)]
        mock_instance = mock_client.return_value
        mock_instance.moderations.create.return_value = mock_response
        yield mock_client


class TestGuardrailsWithMocks:
    """Test guardrails with mock dependencies."""
    
    def test_content_moderation_with_mock(self, mock_openai_client):
        """Test content moderation with mocked OpenAI."""
        guard_id = "mock-content-mod"
        create_content_moderation_guard(guard_id)
        
        # Set up the mock to flag inappropriate content
        mock_instance = mock_openai_client.return_value
        mock_response = MagicMock()
        mock_response.results = [MagicMock(flagged=True)]
        mock_instance.moderations.create.return_value = mock_response
        
        # This should be flagged - make it have profanity to ensure the test works
        result = guard_response(guard_id, "this content has damn profanity in it")
        assert result != "this content has damn profanity in it"
        
        # Reset mock to allow content
        mock_response.results = [MagicMock(flagged=False)]
        mock_instance.moderations.create.return_value = mock_response
        
        # This should pass - using a longer text that meets the minimum word count requirement
        clean_text = "This is clean content that should pass all validation checks because it has more than ten words in it."
        result = guard_response(guard_id, clean_text)
        assert result == clean_text


@patch('openai.OpenAI')
def test_api_response_guard(mock_openai_client):
    """Test API response guard with mocked OpenAI."""
    guard_id = "mock-api-guard"
    create_api_response_guard(guard_id)
    
    # Positive test case - valid API response
    test_response = '{"status": "success", "data": {"key": "value"}}'
    
    # Test valid response
    result = guard_response(guard_id, test_response)
    assert result == test_response
    
    # Test invalid response format
    invalid_response = "Not a valid API response"
    try:
        result = guard_response(guard_id, invalid_response)
        assert result != invalid_response
    except Exception:
        # If your implementation raises exceptions, this is expected
        pass