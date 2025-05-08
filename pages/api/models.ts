import { OLLAMA_HOST, LMSTUDIO_HOST } from '@/utils/app/const';

import { OllamaModel, OllamaModelID } from '@/types/ollama';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    // Get FastAPI backend URL from environment variable or use default
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';
    
    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendUrl}/api/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    
    // Return the response from the FastAPI backend
    const models = await response.json();
    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error('Models API error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Handle network errors (Failed to fetch)
      return new Response(JSON.stringify({
        error: 'Network Error',
        message: 'Failed to connect to the backend server',
        suggestion: 'Please ensure the FastAPI backend is running on port 8000 or set FASTAPI_BACKEND_URL correctly in your .env file.'
      }), { 
        status: 502,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Error fetching models',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export default handler;
