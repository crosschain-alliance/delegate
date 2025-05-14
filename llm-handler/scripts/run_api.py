#!/usr/bin/env python
"""
Script to run the LLM Handler API server.
This script starts the API server with uvicorn.
"""
import os
import argparse
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Run the API server."""
    parser = argparse.ArgumentParser(description="Run the LLM handler API server.")
    parser.add_argument("--host", default=os.getenv("API_HOST", "localhost"), help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=int(os.getenv("API_PORT", "8000")), help="Port to bind the server to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload on code changes")
    args = parser.parse_args()

    print(f"Starting LLM Handler API server on {args.host}:{args.port}")
    
    # Run the server
    uvicorn.run(
        "llm_handler.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )

if __name__ == "__main__":
    main()
