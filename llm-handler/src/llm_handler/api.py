"""
REST API for LLM handler.
This module provides HTTP endpoints to interact with the LLM parser.
"""
import os
import asyncio
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from dotenv import load_dotenv

from llm_handler.parser import parse_query, OpenAIParser

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="LLM Handler API",
    description="API for parsing queries using LLM with guardrails",
    version="1.0.0",
)

# Create parser instance for reuse
default_parser = OpenAIParser(
    model=os.environ.get("LLM_MODEL", "gpt-4.1"),
    use_guardrails=True,
)

# Request models
class QueryRequest(BaseModel):
    """Request model for query parsing."""
    prompt_id: str
    input_text: str
    guard_id: Optional[str] = None
    use_guardrails: bool = True

class ConfigUpdateRequest(BaseModel):
    """Request model for updating parser configuration."""
    model: Optional[str] = None
    system_directive: Optional[str] = None
    use_guardrails: Optional[bool] = None
    default_guard_id: Optional[str] = None

# Response models
class QueryResponse(BaseModel):
    """Response model for query parsing."""
    response: str
    prompt_id: str
    guard_id: Optional[str] = None
    guardrails_applied: bool = True

@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify API is running.
    """
    return {"status": "ok", "service": "llm-handler"}

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Parse a query using the LLM with optional guardrails.
    
    Args:
        request: The query request containing prompt ID, input text, and guardrail options
        
    Returns:
        The LLM response with metadata
    """
    try:
        # Use function-based parser
        response = await parse_query(
            prompt_id=request.prompt_id,
            input_text=request.input_text,
            guard_id=request.guard_id,
            use_guardrails=request.use_guardrails
        )
        
        return QueryResponse(
            response=response,
            prompt_id=request.prompt_id,
            guard_id=request.guard_id or request.prompt_id,
            guardrails_applied=request.use_guardrails
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.post("/query/class", response_model=QueryResponse)
async def query_class_based(request: QueryRequest):
    """
    Parse a query using the class-based LLM parser with optional guardrails.
    
    Args:
        request: The query request containing prompt ID, input text, and guardrail options
        
    Returns:
        The LLM response with metadata
    """
    try:
        # Use class-based parser
        response = await default_parser.parse(
            prompt_id=request.prompt_id,
            input_text=request.input_text,
            guard_id=request.guard_id,
            use_guardrails=request.use_guardrails
        )
        
        # Determine effective guard ID
        effective_guard_id = request.guard_id or default_parser.default_guard_id or request.prompt_id
        
        return QueryResponse(
            response=response,
            prompt_id=request.prompt_id,
            guard_id=effective_guard_id,
            guardrails_applied=request.use_guardrails if request.use_guardrails is not None else default_parser.use_guardrails
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.patch("/config")
async def update_config(request: ConfigUpdateRequest):
    """
    Update the configuration of the default parser.
    
    Args:
        request: Configuration update request
        
    Returns:
        The updated configuration
    """
    config_update = {k: v for k, v in request.dict().items() if v is not None}
    default_parser.update_config(**config_update)
    
    return {
        "status": "updated",
        "config": {
            "model": default_parser.model,
            "system_directive": default_parser.system_directive,
            "use_guardrails": default_parser.use_guardrails,
            "default_guard_id": default_parser.default_guard_id
        }
    }
