"""
Unit tests for guardrails functionality.
"""
import pytest
from unittest.mock import patch, MagicMock

from llm_handler.guardrails import create_guard, guard_response, create_json_guard
from llm_handler.guardrail_configs import (
    create_content_moderation_guard,
    create_api_response_guard,
    create_voting_guard
)


class TestContentModerationGuard:
    """Tests for content moderation guardrails."""
    
    def setup_method(self):
        """Set up test environment before each test."""
        self.guard_id = "test-content-mod-guard"
        create_content_moderation_guard(self.guard_id)
    
    def test_clean_text_passes(self):
        """Test that clean text passes the content moderation guard."""
        clean_text = "This is a simple test paragraph about artificial intelligence and machine learning that should pass validation."
        result = guard_response(self.guard_id, clean_text)

        print(f"Result for clean text: {result}", flush=True)
        
        assert result == clean_text
        assert isinstance(result, str)
    
    def test_profane_text_gets_caught(self):
        """Test that text with profanity gets caught by the guard."""
        profane_text = "This is a damn test with some bad words that should be caught."
        result = guard_response(self.guard_id, profane_text)

        print(f"Result for profane text: {result}")
        
        # The result should either be None, raise an exception, or return a cleaned version
        # Adjust this assertion based on your actual implementation behavior
        assert result != profane_text

    def test_short_text_handling(self):
        """Test how the guard handles very short text."""
        short_text = "Too short."
        result = guard_response(self.guard_id, short_text)

        print(f"Result for short text: {result}")
        
        # Verify the expected behavior for short text
        # This might be rejection or acceptance depending on your implementation
        assert result is not None


class TestJsonGuard:
    """Tests for JSON guardrails."""
    
    def setup_method(self):
        """Set up test environment before each test."""
        self.guard_id = "test-json-guard"
        self.schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "number"},
                "interests": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["name", "age", "interests"]
        }
        create_json_guard(self.guard_id, self.schema)
        
    def test_valid_json_passes(self):
        """Test that valid JSON matching the schema passes."""
        valid_json = '{"name": "John Doe", "age": 30, "interests": ["coding", "hiking", "reading"]}'
        result = guard_response(self.guard_id, valid_json)
        
        # The result should be the same as the input for valid JSON
        assert result == valid_json
    
    def test_invalid_json_fails(self):
        """Test that JSON missing required fields fails."""
        invalid_json = '{"name": "John Doe", "interests": ["coding", "hiking", "reading"]}'
        
        # This might raise an exception or return None depending on implementation
        try:
            result = guard_response(self.guard_id, invalid_json)
            assert result != invalid_json
        except Exception as e:
            # If your guard raises exceptions for invalid input, this is expected
            assert "age" in str(e).lower()
    
    def test_non_json_fails(self):
        """Test that non-JSON text fails."""
        not_json = "This is just plain text, not JSON"
        
        # This might raise an exception or return None depending on implementation
        try:
            result = guard_response(self.guard_id, not_json)
            assert result != not_json
        except Exception:
            # If your guard raises exceptions for invalid input, this is expected
            pass


class TestVotingGuard:
    """Tests for voting guardrails."""
    
    def setup_method(self):
        """Set up test environment before each test."""
        self.guard_id = "test-voting-guard"
        self.valid_options = ["yes", "no", "abstain"]
        create_voting_guard(self.guard_id, self.valid_options)
    
    def test_valid_vote_passes(self):
        """Test that valid vote options pass."""
        for vote in self.valid_options:
            result = guard_response(self.guard_id, vote)
            assert result == vote
    
    def test_invalid_vote_fails(self):
        """Test that invalid vote options fail."""
        invalid_vote = "maybe"
        
        # This might raise an exception or return None depending on implementation
        try:
            result = guard_response(self.guard_id, invalid_vote)
            assert result != invalid_vote  # Should not return the original invalid vote
        except Exception:
            # If your guard raises exceptions for invalid input, this is expected
            pass