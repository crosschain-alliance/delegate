"""
Predefined guardrail configurations
This is a simplified version for testing purposes without dependencies on the guardrails-ai package
"""
from typing import Dict, Any, List
import os
import json
import re

from llm_handler.guardrails import (
    Guard, 
    ProfanityCheck, 
    Refusal, 
    ValidChoices,
    JsonSchema,
    GuardrailsManager, 
    create_guard, 
    create_json_guard
)

# Simple mock implementations of validators
class ValidLength:
    def __init__(self, min_words=0, max_words=float('inf')):
        self.min_words = min_words
        self.max_words = max_words
        
    def validate(self, value, metadata=None):
        word_count = len(re.findall(r'\w+', value))
        if word_count < self.min_words:
            return False, f"Text is too short, contains {word_count} words, minimum is {self.min_words}"
        if word_count > self.max_words:
            return False, f"Text is too long, contains {word_count} words, maximum is {self.max_words}"
        return True, None

# Mock for OnlyJSON validator
class OnlyJSON:
    def validate(self, value, metadata=None):
        try:
            json.loads(value)
            return True, None
        except json.JSONDecodeError:
            return False, "Response is not valid JSON"


def create_content_moderation_guard(guard_id: str = "content_moderation") -> Guard:
    """
    Create a guard for content moderation.
    
    This guard checks for profanity, refusal, and ensures
    reasonable length for responses.
    
    Args:
        guard_id: Identifier for the guard
        
    Returns:
        The configured Guard instance
    """
    validators = {
        "profanity": ProfanityCheck(),
        "refusal": Refusal(),
        "length": ValidLength(min_words=10, max_words=1000),
    }
    
    return create_guard(
        guard_id=guard_id,
        validators=validators,
        description="Ensure content is safe and appropriate"
    )


def create_api_response_guard(
    guard_id: str = "api_response",
    json_schema: Dict[str, Any] = None
) -> Guard:
    """
    Create a guard for API responses that must be valid JSON.
    
    Args:
        guard_id: Identifier for the guard
        json_schema: Schema for validation (optional)
        
    Returns:
        The configured Guard instance
    """
    validators = {
        "profanity": ProfanityCheck(),
        "refusal": Refusal(),
        "only_json": OnlyJSON(),
    }
    
    if json_schema:
        return create_json_guard(
            guard_id=guard_id,
            json_schema=json_schema,
            description="Ensure API response is valid JSON and follows the schema"
        )
    
    return create_guard(
        guard_id=guard_id, 
        validators=validators,
        description="Ensure API response is valid JSON"
    )


def create_voting_guard(
    guard_id: str = "voting_guard",
    choices: List[str] = None
) -> Guard:
    """
    Create a guard for voting responses.
    
    This guard ensures the response is one of the allowed choices.
    
    Args:
        guard_id: Identifier for the guard
        choices: List of allowed choices
        
    Returns:
        The configured Guard instance
    """
    if not choices:
        choices = ["yes", "no", "abstain"]
        
    validators = {
        "valid_choice": ValidChoices(choices=choices),
    }
    
    return create_guard(
        guard_id=guard_id,
        validators=validators,
        description=f"Ensure response is one of the allowed choices: {', '.join(choices)}"
    )


def create_security_guard(guard_id: str = "security_guard") -> Guard:
    """
    Create a security-focused guard.
    
    This guard checks for content that might be harmful from a security perspective.
    
    Args:
        guard_id: Identifier for the guard
        
    Returns:
        The configured Guard instance
    """
    # Simplified security check that just looks for suspicious keywords
    class SecurityCheck:
        def validate(self, value, metadata=None):
            suspicious_keywords = [
                "disable security", "disable firewall", "password", "credit card",
                "social security", "bank account", "personal information"
            ]
            for keyword in suspicious_keywords:
                if keyword.lower() in value.lower():
                    return False, f"Contains potentially unsafe content: {keyword}"
            return True, None
    
    validators = {
        "profanity": ProfanityCheck(),
        "refusal": Refusal(), 
        "security": SecurityCheck(),
    }
    
    return create_guard(
        guard_id=guard_id,
        validators=validators,
        description="Ensure content does not contain security risks"
    )


# Load a JSON schema from a file
def load_json_schema(file_path: str) -> Dict[str, Any]:
    """
    Load a JSON schema from a file.
    
    Args:
        file_path: Path to the JSON schema file
        
    Returns:
        The loaded JSON schema
        
    Raises:
        FileNotFoundError: If the file does not exist
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSON schema file not found: {file_path}")
    
    with open(file_path, "r") as f:
        return json.load(f)
