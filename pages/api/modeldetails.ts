import { OLLAMA_HOST, LMSTUDIO_HOST } from '@/utils/app/const';
import { OllamaModelDetail } from '@/types/ollama';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    // Determine if we should use LMStudio or Ollama
    const isLMStudio = OLLAMA_HOST === LMSTUDIO_HOST;
    
    let url: string;
    let requestBody: any;
    
    // Set up the request based on which API we're using
    if (isLMStudio) {
      // LMStudio doesn't have a direct equivalent of Ollama's /api/show endpoint
      // Instead, we'll return some basic info from a model endpoint
      url = `${LMSTUDIO_HOST}/v1/models`;
      requestBody = null; // GET request with no body
    } else {
      // Ollama API
      url = `${OLLAMA_HOST}/api/show`;
      const { name } = await req.json();
      
      if (typeof name !== 'string' || name.trim() === '') {
        return new Response('Name parameter is required', { status: 400 });
      }
      
      requestBody = JSON.stringify({ name });
    }

    const response = await fetch(url, {
      method: isLMStudio ? 'GET' : 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      ...(requestBody ? { body: requestBody } : {}),
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `${isLMStudio ? 'LMStudio' : 'Ollama'} API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error(`${isLMStudio ? 'LMStudio' : 'Ollama'} API returned an error`);
    }

    const json = await response.json();
    
    // Format response based on the API
    if (isLMStudio) {
      // Since LMStudio doesn't provide detailed model info like Ollama,
      // we'll create a minimal compatible response with what we have
      const { name } = await req.json();
      const modelInfo = {
        license: "Unknown", // LMStudio doesn't provide license info
        modelfile: "",
        parameters: "Unknown",
        template: "{{ .System }}\n\n{{ .Prompt }}",
        system: "You are a helpful assistant.",
      };
      
      return new Response(JSON.stringify(modelInfo), { status: 200 });
    } else {
      // Pass through Ollama response
      return new Response(JSON.stringify(json), { status: 200 });
    }
  } catch (error) {
    console.error('Model details API error:', error);
    
    // Determine if we're using LMStudio
    const isLMStudio = OLLAMA_HOST === LMSTUDIO_HOST;
    const apiHost = isLMStudio ? LMSTUDIO_HOST : OLLAMA_HOST;
    const apiName = isLMStudio ? 'LMStudio' : 'Ollama';
    
    // Check if this is a fetch/connection error that might be related to API host setting
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Response(JSON.stringify({
        error: 'Connection Error',
        message: `Could not connect to ${apiName} at ${apiHost}`,
        suggestion: `Check if ${apiName} is running and accessible at ${apiHost}`
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Error fetching model details',
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
