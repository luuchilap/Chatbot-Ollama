from fastapi import APIRouter, HTTPException, Depends, Response
from typing import List, Dict, Any
import logging

from app.utils.ollama import get_ollama_models, get_model_details, OllamaError
from app.schemas.chat import OllamaModel, OllamaModelDetails

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["models"])

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models():
    """
    Get available Ollama models
    """
    logger.info("Received request to get models")
    try:
        # Try to get models from Ollama
        models = await get_ollama_models()
        logger.info(f"Successfully fetched {len(models)} models")
        return models
    except OllamaError as e:
        logger.error(f"Ollama API Error: {str(e)}")
        
        # Provide a fallback set of models when Ollama is not available
        logger.warning("Using fallback models due to Ollama connection error")
        fallback_models = [
            {
                "id": "llama2",
                "name": "llama2",
                "modified_at": "2023-01-01T00:00:00Z",
                "size": 0
            },
            {
                "id": "mistral",
                "name": "mistral",
                "modified_at": "2023-01-01T00:00:00Z",
                "size": 0
            }
        ]
        
        # Return fallback models with 200 status
        return fallback_models
        
    except Exception as e:
        logger.error(f"Unexpected error in get_models: {str(e)}")
        
        # Provide a fallback set of models for any error
        fallback_models = [
            {
                "id": "llama2",
                "name": "llama2",
                "modified_at": "2023-01-01T00:00:00Z",
                "size": 0
            }
        ]
        
        # Return fallback models with 200 status
        return fallback_models

@router.post("/modeldetails", response_model=Dict[str, Any])
async def get_model_details_endpoint(model: Dict[str, str]):
    """
    Get details for a specific Ollama model
    """
    logger.info(f"Received request for model details: {model}")
    try:
        model_name = model.get("name")
        if not model_name:
            raise HTTPException(
                status_code=400,
                detail="Model name is required"
            )
            
        logger.info(f"Fetching details for model: {model_name}")
        details = await get_model_details(model_name)
        return details
    except OllamaError as e:
        logger.error(f"Ollama API Error in get_model_details: {str(e)}")
        
        # Provide fallback details
        fallback_details = {
            "license": "Unknown",
            "modelfile": "",
            "parameters": "Unknown",
            "template": "{{ .System }}\n\n{{ .Prompt }}",
            "system": "You are a helpful assistant."
        }
        
        return fallback_details
    except Exception as e:
        logger.error(f"Unexpected error in get_model_details: {str(e)}")
        
        # Provide fallback details for any error
        fallback_details = {
            "license": "Unknown",
            "modelfile": "",
            "parameters": "Unknown",
            "template": "{{ .System }}\n\n{{ .Prompt }}",
            "system": "You are a helpful assistant."
        }
        
        return fallback_details 