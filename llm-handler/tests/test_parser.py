"""
Tests for the parser module
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from llm_handler.parser import parse_query, OpenAIParser


@pytest.mark.asyncio
@patch('openai.OpenAI')
async def test_parse_query(mock_openai):
    # Setup mock response
    mock_client = MagicMock()
    mock_openai.return_value = mock_client
    
    mock_choices = [MagicMock()]
    mock_choices[0].message.content = "Test response"
    
    mock_response = MagicMock()
    mock_response.choices = mock_choices
    
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    # Call function
    result = await parse_query("test-prompt", "Test input")
    
    # Verify results
    assert result == "Test response"
    mock_client.chat.completions.create.assert_called_once()
    
    # Check arguments
    call_args = mock_client.chat.completions.create.call_args[1]
    assert call_args["model"] == "gpt-4.1"
    assert len(call_args["messages"]) == 2
    assert call_args["messages"][0]["role"] == "system"
    assert call_args["messages"][1]["role"] == "user"
    assert call_args["messages"][1]["content"] == "Test input"


@pytest.mark.asyncio
async def test_openai_parser_class():
    # Create parser with custom settings
    parser = OpenAIParser(
        api_key="custom-api-key",
        model="gpt-4.1",
        system_directive="Custom directive"
    )
    
    # Patch the client's create method
    parser.client.chat.completions.create = AsyncMock()
    mock_choices = [MagicMock()]
    mock_choices[0].message.content = "Custom response"
    
    mock_response = MagicMock()
    mock_response.choices = mock_choices
    
    parser.client.chat.completions.create.return_value = mock_response
    
    # Call parse method
    result = await parser.parse("test-prompt", "Test input")
    
    # Verify results
    assert result == "Custom response"
    parser.client.chat.completions.create.assert_called_once()
    
    # Check configuration
    assert parser.api_key == "custom-api-key"
    assert parser.model == "gpt-4.1"
    assert parser.system_directive == "Custom directive"
    
    # Test configuration update
    parser.update_config(model="gpt-4.1")
    assert parser.model == "gpt-4.1"
