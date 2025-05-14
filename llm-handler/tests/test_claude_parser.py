"""
Tests for the Claude parser module
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from llm_handler.claude_parser import claude_parse_query, ClaudeParser


@pytest.mark.asyncio
@patch('httpx.AsyncClient')
async def test_claude_parse_query(mock_client_class):
    # Setup mock response
    mock_client = MagicMock()
    mock_client_instance = AsyncMock()
    mock_client_class.return_value.__aenter__.return_value = mock_client_instance
    
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "content": [{"text": "Test Claude response"}]
    }
    
    mock_client_instance.post = AsyncMock(return_value=mock_response)
    
    # Set environment variable for testing
    with patch.dict('os.environ', {"ANTHROPIC_API_KEY": "test-api-key"}):
        # Call function
        result = await claude_parse_query("test-prompt", "Test input")
        
        # Verify results
        assert result == "Test Claude response"
        mock_client_instance.post.assert_called_once()
        
        # Check arguments
        call_args = mock_client_instance.post.call_args
        assert call_args[0][0] == "https://api.anthropic.com/v1/messages"
        assert "x-api-key" in call_args[1]["headers"]
        assert call_args[1]["json"]["model"] == "claude-3-opus-20240229"
        assert len(call_args[1]["json"]["messages"]) == 1
        assert call_args[1]["json"]["messages"][0]["role"] == "user"
        assert call_args[1]["json"]["messages"][0]["content"] == "Test input"


@pytest.mark.asyncio
async def test_claude_parser_class():
    # Create parser with custom settings
    parser = ClaudeParser(
        api_key="custom-api-key",
        model="claude-3-sonnet",
        system_directive="Custom directive",
        max_tokens=2048
    )
    
    # Setup mock for httpx client
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client_instance = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client_instance
        
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "content": [{"text": "Custom Claude response"}]
        }
        
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        
        # Call parse method
        result = await parser.parse("test-prompt", "Test input")
        
        # Verify results
        assert result == "Custom Claude response"
        mock_client_instance.post.assert_called_once()
        
        # Check configuration
        assert parser.api_key == "custom-api-key"
        assert parser.model == "claude-3-sonnet"
        assert parser.system_directive == "Custom directive"
        assert parser.max_tokens == 2048
        
        # Test configuration update
        parser.update_config(model="claude-3-haiku", max_tokens=512)
        assert parser.model == "claude-3-haiku"
        assert parser.max_tokens == 512
