"""
OpenAI parser module for handling LLM queries
"""
import os
from typing import Optional, Dict, Any, Union

import openai
from dotenv import load_dotenv

from llm_handler.guardrails import Guard, guard_response, create_guard

# Load environment variables from .env file
load_dotenv()


async def parse_query(
    prompt_id: str, 
    input_text: str, 
    guard_id: Optional[str] = None,
    use_guardrails: bool = True
) -> str:
    """
    Parse a query using OpenAI's API with optional guardrails.

    Args:
        prompt_id: The ID of the prompt
        input_text: The input text to send to the LLM
        guard_id: ID of a specific guardrail to use
        use_guardrails: Whether to apply guardrails to the response

    Returns:
        The response from the LLM
    """
    print(f"Getting response for: {prompt_id}")
    
    client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": os.environ.get("DIRECTIVE", "")},
                {"role": "user", "content": input_text},
            ],
        )
        
        content = response.choices[0].message.content
        print(f"Raw response: {content}")
        
        # Apply guardrails if enabled
        if use_guardrails and content:
            guardrail_id = guard_id or prompt_id
            try:
                # Try to get an existing guard or create a default one
                content = guard_response(guardrail_id, content, prompt=input_text)
                print(f"Guardrailed response: {content}")
            except ValueError:
                # If guard doesn't exist, create a default one
                create_guard(guardrail_id)
                content = guard_response(guardrail_id, content, prompt=input_text)
                print(f"Created default guardrail. Response: {content}")
                
        return content or ""
    except Exception as error:
        print(f"Error: {error}")
        return ""


class OpenAIParser:
    """
    Class-based parser for OpenAI interactions with guardrails support.
    Provides more flexibility for configuration.
    """
    
    def __init__(
        self, 
        api_key: Optional[str] = None,
        model: str = "gpt-4.1",
        system_directive: Optional[str] = None,
        use_guardrails: bool = True,
        default_guard_id: Optional[str] = None,
    ):
        """
        Initialize the OpenAI parser.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: The model to use (defaults to gpt-4.1)
            system_directive: System directive (defaults to DIRECTIVE env var)
            use_guardrails: Whether to apply guardrails to responses by default
            default_guard_id: Default guardrail ID to use
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.system_directive = system_directive or os.environ.get("DIRECTIVE", "")
        self.client = openai.OpenAI(api_key=self.api_key)
        self.use_guardrails = use_guardrails
        self.default_guard_id = default_guard_id
    
    async def parse(
        self, 
        prompt_id: str, 
        input_text: str,
        guard_id: Optional[str] = None,
        use_guardrails: Optional[bool] = None,
    ) -> str:
        """
        Parse a query using OpenAI's API with optional guardrails.
        
        Args:
            prompt_id: The ID of the prompt
            input_text: The input text to send to the LLM
            guard_id: ID of a specific guardrail to use (overrides default)
            use_guardrails: Whether to apply guardrails (overrides instance setting)
            
        Returns:
            The response from the LLM
        """
        print(f"Getting response for: {prompt_id}")
        
        # Determine whether to use guardrails for this request
        apply_guardrails = self.use_guardrails if use_guardrails is None else use_guardrails
        guardrail_id = guard_id or self.default_guard_id or prompt_id
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_directive},
                    {"role": "user", "content": input_text},
                ],
            )
            
            content = response.choices[0].message.content
            print(f"Raw response: {content}")
            
            # Apply guardrails if enabled
            if apply_guardrails and content:
                try:
                    # Try to get an existing guard or create a default one
                    content = guard_response(guardrail_id, content, prompt=input_text)
                    print(f"Guardrailed response: {content}")
                except ValueError:
                    # If guard doesn't exist, create a default one
                    create_guard(guardrail_id)
                    content = guard_response(guardrail_id, content, prompt=input_text)
                    print(f"Created default guardrail. Response: {content}")
            
            return content or ""
        except Exception as error:
            print(f"Error: {error}")
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
        
        # Recreate client if api_key was updated
        if "api_key" in kwargs:
            self.client = openai.OpenAI(api_key=self.api_key)