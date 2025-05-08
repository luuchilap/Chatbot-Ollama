import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OllamaError, OllamaStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const body = await req.json() as ChatBody;
    
    // Get FastAPI backend URL from environment variable or use default
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8000';
    
    // Forward the request to the FastAPI backend
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }
    
    // Return the streaming response
    return new Response(response.body);
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof OllamaError) {
      // Return a more descriptive error message to help with debugging
      return new Response(JSON.stringify({ 
        error: 'Ollama Error', 
        message: error.message,
        suggestion: error.message.includes('OLLAMA_HOST') ? 
          'Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434' : 
          'Check if Ollama is running and accessible'
      }), { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
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
    } else {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    }
  }
};

export default handler;
