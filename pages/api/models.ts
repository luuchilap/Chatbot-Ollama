import { OLLAMA_HOST, LMSTUDIO_HOST } from '@/utils/app/const';

import { OllamaModel, OllamaModelID, OllamaModels } from '@/types/ollama';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    // Determine if we should use LMStudio or Ollama
    const isLMStudio = OLLAMA_HOST === LMSTUDIO_HOST;
    
    // Set the appropriate URL based on whether we're using LMStudio or Ollama
    let url = isLMStudio 
      ? `${LMSTUDIO_HOST}/v1/models` 
      : `${OLLAMA_HOST}/api/tags`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error(`${isLMStudio ? 'LMStudio' : 'Ollama'} API returned an error`);
    }

    const json = await response.json();

    let models: OllamaModel[];
    
    if (isLMStudio) {
      // Handle LMStudio models format which follows OpenAI format
      models = json.data.map((model: any) => {
        return {
          id: model.id,
          name: model.id,
          modified_at: new Date().toISOString(),
          size: 0,  // LMStudio doesn't provide model size information
        };
      });
    } else {
      // Handle Ollama models format
      models = json.models
        .map((model: any) => {
          const model_name = model.name;
          for (const [key, value] of Object.entries(OllamaModelID)) {
            {
              return {
                id: model.name,
                name: model.name,
                modified_at: model.modified_at,
                size: model.size,
              };
            }
          }
        })
        .filter(Boolean);
    }

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error('Models API error:', error);
    
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
