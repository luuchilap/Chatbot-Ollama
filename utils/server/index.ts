import { Message } from '@/types/chat';
import { OllamaModel } from '@/types/ollama';

import { OLLAMA_HOST, LMSTUDIO_HOST, API_TIMEOUT_DURATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

export const OllamaStream = async (
  model: string,
  systemPrompt: string,
  temperature : number,
  prompt: string,
) => {
  // Determine if we should use LMStudio or Ollama
  const isLMStudio = OLLAMA_HOST === LMSTUDIO_HOST;
  
  // Set the appropriate URL based on whether we're using LMStudio or Ollama
  let url = isLMStudio 
    ? `${LMSTUDIO_HOST}/v1/chat/completions` 
    : `${OLLAMA_HOST}/api/generate`;
  
  // Create an AbortController with a long timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);
  
  try {
    // Create the appropriate request body based on the API
    const body = isLMStudio 
      ? JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: temperature,
          stream: true
        })
      : JSON.stringify({
          model: model,
          prompt: prompt,
          system: systemPrompt,
          options: {
            temperature: temperature,
          },
        });
    
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      method: 'POST',
      body: body,
      signal: controller.signal,
    });
    
    // Clear the timeout since the request has completed
    clearTimeout(timeoutId);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
      const result = await res.json();
      if (result.error) {
        throw new OllamaError(
          result.error
        );
      } 
    }

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          if (isLMStudio) {
            // LMStudio uses the OpenAI-style SSE format
            const parser = createParser((event) => {
              if (event.type === 'event') {
                try {
                  const data = JSON.parse(event.data);
                  // Check if this is the [DONE] message
                  if (data.choices && data.choices[0]?.delta?.content) {
                    controller.enqueue(encoder.encode(data.choices[0].delta.content));
                  }
                } catch (e) {
                  console.error('Error parsing SSE event:', e);
                }
              }
            });
            
            // Process the stream
            for await (const chunk of res.body as any) {
              const text = decoder.decode(chunk);
              parser.feed(text);
            }
          } else {
            // Original Ollama streaming logic
            for await (const chunk of res.body as any) {
              const text = decoder.decode(chunk); 
              let parsedData = { response: '' };
              try { parsedData = JSON.parse(text); } catch { }
              if (parsedData.response) {
                controller.enqueue(encoder.encode(parsedData.response)); 
              }
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    
    return responseStream;
  } catch (error) {
    // Clear the timeout if there was an error
    clearTimeout(timeoutId);
    
    // Check if this is a connection error, which might be related to API host settings
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const host = isLMStudio ? LMSTUDIO_HOST : OLLAMA_HOST;
      throw new OllamaError(
        `Connection error: Could not connect to ${isLMStudio ? 'LMStudio' : 'Ollama'} at ${host}.`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
};
