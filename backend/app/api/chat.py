from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from typing import Optional
import json
import os

from app.utils.ollama import ollama_stream, OllamaError
from app.schemas.chat import ChatBody
from app.utils.auth import get_current_active_user
from app.models.models import User

# Default values
DEFAULT_SYSTEM_PROMPT = "You are an AI assistant that follows instructions. Help the user with their tasks."
DEFAULT_TEMPERATURE = 1.0

# Create router
router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("")
async def chat(body: ChatBody):
    """
    Handle chat requests and stream responses from Ollama
    """
    try:
        # Set default system prompt if not provided
        prompt_to_send = body.system if body.system else DEFAULT_SYSTEM_PROMPT
        
        # Set default temperature if not provided
        temperature_to_use = body.options.temperature if body.options and body.options.temperature is not None else DEFAULT_TEMPERATURE
        
        # Get stream response from Ollama
        stream = await ollama_stream(body.model, prompt_to_send, temperature_to_use, body.prompt)
        
        return stream
    except OllamaError as e:
        # Handle Ollama errors
        suggestion = "Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434" if "OLLAMA_HOST" in str(e) else "Check if Ollama is running and accessible"
        return {
            "error": "Ollama Error",
            "message": str(e),
            "suggestion": suggestion
        }
    except Exception as e:
        # Handle other errors
        return {
            "error": "Internal Server Error",
            "message": str(e)
        } 