"""
LLM Factory module to easily use different LLM providers
"""
from typing import Literal, Optional, Dict, Any

from llm_handler.parser import OpenAIParser
from llm_handler.claude_parser import ClaudeParser

# Define the model type
LLMType = Literal["openai", "claude"]


class LLMFactory:
    """
    Factory class to create LLM parsers based on provider type.
    """
    
    @staticmethod
    def create(
        llm_type: LLMType = "openai", 
        **kwargs: Dict[str, Any]
    ) -> OpenAIParser | ClaudeParser:
        """
        Create an LLM parser instance based on the provider type.
        
        Args:
            llm_type: The type of LLM to use (openai or claude)
            **kwargs: Additional configuration parameters for the LLM parser
            
        Returns:
            An instance of the specified LLM parser
        
        Raises:
            ValueError: If an unsupported LLM type is provided
        """
        if llm_type == "openai":
            return OpenAIParser(**kwargs)
        elif llm_type == "claude":
            return ClaudeParser(**kwargs)
        else:
            raise ValueError(f"Unsupported LLM type: {llm_type}")


class MultiLLM:
    """
    Class to query multiple LLMs and return their responses.
    """
    
    def __init__(
        self,
        parsers: Optional[Dict[str, OpenAIParser | ClaudeParser]] = None
    ):
        """
        Initialize the MultiLLM.
        
        Args:
            parsers: Dictionary of parser instances by name
        """
        self.parsers = parsers or {
            "openai": LLMFactory.create("openai"),
            "claude": LLMFactory.create("claude")
        }
    
    async def parse_all(
        self, 
        prompt_id: str, 
        input_text: str
    ) -> Dict[str, str]:
        """
        Parse a query using all available LLMs.
        
        Args:
            prompt_id: The ID of the prompt
            input_text: The input text to send to the LLMs
            
        Returns:
            Dictionary of responses by LLM name
        """
        results = {}
        
        for name, parser in self.parsers.items():
            try:
                results[name] = await parser.parse(f"{prompt_id}-{name}", input_text)
            except Exception as e:
                print(f"Error with {name} parser: {e}")
                results[name] = f"Error: {str(e)}"
        
        return results
