"""
Anthropic Claude parser module for handling LLM queries
"""
import os
from typing import Optional, Dict, Any, List, Union

import httpx
from dotenv import load_dotenv

from llm_handler.guardrails import Guard, guard_response, create_guard

# Load environment variables from .env file
load_dotenv()


async def claude_parse_query(
    prompt_id: str, 
    input_text: str,
    guard_id: Optional[str] = None,
    use_guardrails: bool = True
) -> str:
    """
    Parse a query using Anthropic's Claude API with optional guardrails.

    Args:
        prompt_id: The ID of the prompt
        input_text: The input text to send to the LLM
        guard_id: ID of a specific guardrail to use
        use_guardrails: Whether to apply guardrails to the response

    Returns:
        The response from the LLM
    """
    print(f"Getting response from Claude for: {prompt_id}")
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "content-type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-3-opus-20240229",  # Using latest Claude model
                    "system": os.environ.get("CLAUDE_DIRECTIVE", ""),
                    "messages": [
                        {"role": "user", "content": input_text}
                    ],
                    "max_tokens": 1024
                },
                timeout=60.0,  # 60 second timeout
            )
            
            response.raise_for_status()
            content = response.json()["content"][0]["text"]
            print(f"Raw Claude response: {content}")
            
            # Apply guardrails if enabled
            if use_guardrails and content:
                guardrail_id = guard_id or prompt_id
                try:
                    # Try to get an existing guard or create a default one
                    content = guard_response(guardrail_id, content, prompt=input_text)
                    print(f"Guardrailed Claude response: {content}")
                except ValueError:
                    # If guard doesn't exist, create a default one
                    create_guard(guardrail_id)
                    content = guard_response(guardrail_id, content, prompt=input_text)
                    print(f"Created default guardrail for Claude. Response: {content}")
            
            return content
    except Exception as error:
        print(f"Error with Claude API: {error}")
        return ""


class ClaudeParser:
    """
    Class-based parser for Anthropic Claude API interactions with guardrails support.
    Provides more flexibility for configuration.
    """
    
    def __init__(
        self, 
        api_key: Optional[str] = None,
        model: str = "claude-3-opus-20240229",
        system_directive: Optional[str] = None,
        max_tokens: int = 1024,
        use_guardrails: bool = True,
        default_guard_id: Optional[str] = None,
    ):
        """
        Initialize the Claude parser.
        
        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: The model to use (defaults to claude-3-opus-20240229)
            system_directive: System directive (defaults to CLAUDE_DIRECTIVE env var)
            max_tokens: Maximum number of tokens in the response
            use_guardrails: Whether to apply guardrails to responses by default
            default_guard_id: Default guardrail ID to use
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("API key not provided and ANTHROPIC_API_KEY environment variable not set")
            
        self.model = model
        self.system_directive = system_directive or os.environ.get("CLAUDE_DIRECTIVE", "")
        self.max_tokens = max_tokens
        self.base_url = "https://api.anthropic.com/v1"
        self.use_guardrails = use_guardrails
        self.default_guard_id = default_guard_id
        
    async def parse(
        self, 
        prompt_id: str, 
        input_text: str,
        messages: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Parse a query using Claude API.
        
        Args:
            prompt_id: The ID of the prompt
            input_text: The input text to send to the LLM
            messages: Optional list of message dictionaries for conversation history
                      Each message should be {"role": "user"|"assistant", "content": "text"}
            
        Returns:
            The response from the LLM
        """
        print(f"Getting Claude response for: {prompt_id}")
        
        # Build messages - either use provided messages or create a new one from input_text
        if not messages:
            messages = [{"role": "user", "content": input_text}]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "content-type": "application/json",
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": self.model,
                        "system": self.system_directive,
                        "messages": messages,
                        "max_tokens": self.max_tokens
                    },
                    timeout=60.0,  # 60 second timeout
                )
                
                response.raise_for_status()
                content = response.json()["content"][0]["text"]
                print(f"Claude Response: {content}")
                
                return content
        except Exception as error:
            print(f"Error with Claude API: {error}")
            return ""
            
    def update_config(self, **kwargs: Dict[str, Any]) -> None:
        """
        Update configuration parameters.
        
        Args:
            **kwargs: Configuration parameters to update
        """
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
