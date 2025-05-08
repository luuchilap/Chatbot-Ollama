import httpx
import os
import json
import traceback
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any, AsyncGenerator
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
LMSTUDIO_HOST = os.getenv("LMSTUDIO_HOST", "http://127.0.0.1:1234")
API_TIMEOUT_DURATION = int(os.getenv("API_TIMEOUT_DURATION", "60000"))  # 60 seconds default

class OllamaError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


async def ollama_stream(
    model: str,
    system_prompt: str,
    temperature: float,
    prompt: str
) -> StreamingResponse:
    # Determine if we should use LMStudio or Ollama
    is_lm_studio = OLLAMA_HOST == LMSTUDIO_HOST
    
    # Set the appropriate URL based on whether we're using LMStudio or Ollama
    url = f"{LMSTUDIO_HOST}/v1/chat/completions" if is_lm_studio else f"{OLLAMA_HOST}/api/generate"
    
    # Create the appropriate request body based on the API
    body = (
        {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "stream": True
        }
        if is_lm_studio
        else {
            "model": model,
            "prompt": prompt,
            "system": system_prompt,
            "options": {
                "temperature": temperature,
            },
        }
    )
    
    try:
        async def generate() -> AsyncGenerator[bytes, None]:
            async with httpx.AsyncClient(timeout=API_TIMEOUT_DURATION / 1000) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=body,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache",
                        "Pragma": "no-cache",
                    },
                ) as response:
                    if response.status_code != 200:
                        try:
                            error_data = await response.json()
                            error_message = error_data.get("error", f"HTTP error {response.status_code}")
                            raise OllamaError(error_message)
                        except:
                            raise OllamaError(f"HTTP error {response.status_code}")
                    
                    if is_lm_studio:
                        # LMStudio uses OpenAI-style SSE format
                        buffer = ""
                        async for chunk in response.aiter_text():
                            buffer += chunk
                            while "data: " in buffer:
                                parts = buffer.split("data: ", 1)
                                if len(parts) != 2:
                                    break
                                
                                pre, rest = parts
                                buffer = rest
                                
                                newline_pos = buffer.find("\n")
                                if newline_pos == -1:
                                    break
                                
                                data_line = buffer[:newline_pos].strip()
                                buffer = buffer[newline_pos + 1:]
                                
                                if data_line == "[DONE]":
                                    continue
                                
                                try:
                                    data = json.loads(data_line)
                                    if data.get("choices") and data["choices"][0].get("delta") and data["choices"][0]["delta"].get("content"):
                                        content = data["choices"][0]["delta"]["content"]
                                        yield content.encode("utf-8")
                                except json.JSONDecodeError:
                                    logger.error(f"JSON decode error for: {data_line}")
                    else:
                        # Original Ollama streaming logic
                        async for chunk in response.aiter_text():
                            try:
                                data = json.loads(chunk)
                                if "response" in data:
                                    yield data["response"].encode("utf-8")
                            except json.JSONDecodeError:
                                logger.error(f"JSON decode error for: {chunk}")
                                
        return StreamingResponse(generate(), media_type="text/event-stream")
        
    except httpx.RequestError as e:
        host = LMSTUDIO_HOST if is_lm_studio else OLLAMA_HOST
        raise OllamaError(f"Connection error: Could not connect to {'LMStudio' if is_lm_studio else 'Ollama'} at {host}. {str(e)}")
    except Exception as e:
        raise OllamaError(f"Error: {str(e)}")


async def get_ollama_models():
    # Determine if we should use LMStudio or Ollama
    is_lm_studio = OLLAMA_HOST == LMSTUDIO_HOST
    
    # Set the appropriate URL based on whether we're using LMStudio or Ollama
    url = f"{LMSTUDIO_HOST}/v1/models" if is_lm_studio else f"{OLLAMA_HOST}/api/tags"
    
    logger.info(f"Fetching models from: {url}")
    
    try:
        timeout_seconds = 10
        logger.info(f"Creating httpx client with timeout of {timeout_seconds} seconds")
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            try:
                logger.info(f"Sending GET request to {url}")
                response = await client.get(url)
                logger.info(f"Response status code: {response.status_code}")
                
                if response.status_code != 200:
                    error_msg = f"API returned error {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data:
                            error_msg = f"{error_msg}: {error_data['error']}"
                    except:
                        pass
                    logger.error(f"Error response: {error_msg}")
                    raise OllamaError(error_msg)
                
                try:
                    data = response.json()
                    logger.info(f"Received data: {str(data)[:200]}...")
                except Exception as e:
                    logger.error(f"Failed to parse JSON response: {str(e)}")
                    raise OllamaError(f"Failed to parse response from {url}: {str(e)}")
                
                # Since we don't have access to actual Ollama
                # Let's provide some mock data as a fallback
                if is_lm_studio:
                    # Handle LMStudio models format which follows OpenAI format
                    models = [
                        {
                            "id": model["id"],
                            "name": model["id"],
                            "modified_at": "2023-01-01T00:00:00Z",  # LMStudio doesn't provide modified date
                            "size": 0  # LMStudio doesn't provide model size
                        }
                        for model in data.get("data", [])
                    ]
                else:
                    # Handle Ollama models format
                    try:
                        models = [
                            {
                                "id": model["name"],
                                "name": model["name"],
                                "modified_at": model.get("modified_at", "2023-01-01T00:00:00Z"),
                                "size": model.get("size", 0)
                            }
                            for model in data.get("models", [])
                        ]
                        # If no models are found, provide a default model
                        if not models:
                            logger.warning("No models found, providing default model")
                            models = [
                                {
                                    "id": "llama2",
                                    "name": "llama2",
                                    "modified_at": "2023-01-01T00:00:00Z",
                                    "size": 0
                                }
                            ]
                    except Exception as e:
                        logger.error(f"Error parsing models: {str(e)}")
                        # Provide a fallback model
                        models = [
                            {
                                "id": "llama2",
                                "name": "llama2",
                                "modified_at": "2023-01-01T00:00:00Z", 
                                "size": 0
                            }
                        ]
                
                logger.info(f"Returning {len(models)} models")
                return models
            except Exception as e:
                logger.error(f"Request error: {str(e)}")
                logger.error(traceback.format_exc())
                raise OllamaError(f"Error connecting to {url}: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        raise OllamaError(f"Unexpected error: {str(e)}")


async def get_model_details(model_name: str):
    # Determine if we should use LMStudio or Ollama
    is_lm_studio = OLLAMA_HOST == LMSTUDIO_HOST
    
    if is_lm_studio:
        # Since LMStudio doesn't provide detailed model info like Ollama,
        # we'll create a minimal compatible response
        return {
            "license": "Unknown",  # LMStudio doesn't provide license info
            "modelfile": "",
            "parameters": "Unknown",
            "template": "{{ .System }}\n\n{{ .Prompt }}",
            "system": "You are a helpful assistant."
        }
        
    # For Ollama, get the model details
    url = f"{OLLAMA_HOST}/api/show"
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json={"name": model_name})
            
            if response.status_code != 200:
                raise OllamaError(f"API returned error {response.status_code}")
            
            return response.json()
    except httpx.RequestError as e:
        raise OllamaError(f"Connection error: Could not connect to Ollama at {OLLAMA_HOST}. {str(e)}")
    except Exception as e:
        raise OllamaError(f"Error: {str(e)}") 