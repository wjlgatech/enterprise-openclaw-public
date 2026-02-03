/**
 * Streaming Utilities
 * Helpers for working with streaming LLM responses
 */

import { StreamEvent, LLMProvider, CompletionRequest } from './types.js';

/**
 * Collect streaming response into a single string
 */
export async function collectStream(
  provider: LLMProvider,
  request: CompletionRequest
): Promise<string> {
  let result = '';
  
  for await (const event of provider.stream(request)) {
    if (event.type === 'text_delta' && event.delta) {
      result += event.delta;
    } else if (event.type === 'error') {
      throw new Error(event.error || 'Stream error');
    }
  }
  
  return result;
}

/**
 * Stream to callback - useful for real-time UI updates
 */
export async function streamToCallback(
  provider: LLMProvider,
  request: CompletionRequest,
  onDelta: (text: string) => void,
  onDone?: () => void,
  onError?: (error: string) => void
): Promise<string> {
  let result = '';
  
  try {
    for await (const event of provider.stream(request)) {
      switch (event.type) {
        case 'text_delta':
          if (event.delta) {
            result += event.delta;
            onDelta(event.delta);
          }
          break;
        case 'done':
          onDone?.();
          break;
        case 'error':
          onError?.(event.error || 'Unknown error');
          break;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed';
    onError?.(message);
    throw error;
  }
  
  return result;
}

/**
 * Create a ReadableStream from provider stream (for web responses)
 */
export function createReadableStream(
  provider: LLMProvider,
  request: CompletionRequest
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of provider.stream(request)) {
          if (event.type === 'text_delta' && event.delta) {
            controller.enqueue(encoder.encode(event.delta));
          } else if (event.type === 'error') {
            controller.error(new Error(event.error));
            return;
          } else if (event.type === 'done') {
            controller.close();
            return;
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Server-Sent Events (SSE) formatter
 */
export async function* streamToSSE(
  provider: LLMProvider,
  request: CompletionRequest
): AsyncGenerator<string> {
  for await (const event of provider.stream(request)) {
    switch (event.type) {
      case 'text_delta':
        yield `data: ${JSON.stringify({ type: 'delta', text: event.delta })}\n\n`;
        break;
      case 'done':
        yield `data: ${JSON.stringify({ type: 'done' })}\n\n`;
        break;
      case 'error':
        yield `data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`;
        break;
    }
  }
}

/**
 * Rate-limited stream (for debugging/demo)
 */
export async function* rateLimitedStream(
  provider: LLMProvider,
  request: CompletionRequest,
  delayMs: number = 50
): AsyncGenerator<StreamEvent> {
  for await (const event of provider.stream(request)) {
    yield event;
    if (event.type === 'text_delta') {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
