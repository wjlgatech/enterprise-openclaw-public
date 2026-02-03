/**
 * AI Refinery Provider
 * Integration with Accenture AI Refinery SDK
 * 
 * Supports:
 * - Text completions via Distiller
 * - Real-time voice via AsyncRealtimeDistillerClient
 * - Multi-agent orchestration
 * 
 * @see https://sdk.airefinery.accenture.com/
 * @see https://github.com/Accenture/airefinery-sdk
 */

import {
  LLMProvider,
  RealtimeVoiceProvider,
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ProviderConfig,
  RealtimeSessionConfig,
  RealtimeEvent,
} from './types.js';

// Note: In production, install airefinery-sdk via pip and use a Python subprocess
// or implement the WebSocket protocol directly. This implementation shows the pattern.

export interface AIRefineryConfig extends ProviderConfig {
  projectName?: string;
  distillerConfig?: Record<string, unknown>;
}

/**
 * AI Refinery LLM Provider
 * Uses the Distiller service for text completions
 */
export class AIRefineryProvider implements LLMProvider {
  name = 'airefinery';
  private baseUrl: string;
  private apiKey: string;
  private projectName: string;

  constructor(config: AIRefineryConfig = {}) {
    this.apiKey = config.apiKey || process.env.AIR_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.AIR_BASE_URL || 'https://api.airefinery.accenture.com';
    this.projectName = config.projectName || 'default';

    if (!this.apiKey) {
      console.warn('AIR_API_KEY not set - AI Refinery provider will not work');
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // AI Refinery uses a distiller/run endpoint for completions
    const response = await fetch(`${this.baseUrl}/distiller/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        project_name: this.projectName,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Refinery API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      content: string;
      model: string;
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content || '',
      model: data.model || request.model || 'unknown',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: 'stop',
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<StreamEvent> {
    // AI Refinery supports streaming via WebSocket
    const ws = new WebSocket(`${this.baseUrl.replace('https', 'wss')}/distiller/run/stream`);
    
    const messageQueue: StreamEvent[] = [];
    let done = false;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'text_delta') {
        messageQueue.push({ type: 'text_delta', delta: data.delta });
      } else if (data.type === 'done') {
        messageQueue.push({ type: 'done' });
        done = true;
      }
    };

    ws.onerror = () => {
      messageQueue.push({ type: 'error', error: 'WebSocket error' });
      done = true;
    };

    // Wait for connection
    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          project_name: this.projectName,
          messages: request.messages,
          model: request.model,
          max_tokens: request.maxTokens,
          stream: true,
        }));
        resolve();
      };
    });

    // Yield events
    while (!done || messageQueue.length > 0) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    ws.close();
  }

  async listModels(): Promise<string[]> {
    // AI Refinery model catalog
    // See: https://sdk.airefinery.accenture.com/distiller/model_catalog/
    return [
      // LLMs
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.3-70b-Instruct',
      'Qwen/Qwen3-VL-32B-Instruct',
      // Vision
      'meta-llama/Llama-3.2-90B-Vision-Instruct',
      // Note: Llama models deprecating March 2, 2026 (v1.27.0)
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * AI Refinery Real-Time Voice Provider
 * Uses AsyncRealtimeDistillerClient for voice interactions
 * 
 * Architecture: ASR → LLM → TTS (cascaded design)
 * Features: Push-to-talk, streaming, barge-in (upcoming)
 */
export class AIRefineryRealtimeProvider implements RealtimeVoiceProvider {
  private ws: WebSocket | null = null;
  private eventCallback: ((event: RealtimeEvent) => void) | null = null;
  private baseUrl: string;
  private apiKey: string;
  private connected = false;

  constructor(config: AIRefineryConfig = {}) {
    this.apiKey = config.apiKey || process.env.AIR_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.AIR_BASE_URL || 'https://api.airefinery.accenture.com';
  }

  async connect(sessionConfig: RealtimeSessionConfig): Promise<void> {
    const wsUrl = `${this.baseUrl.replace('https', 'wss')}/distiller/realtime`;
    
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    } as unknown as string);

    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));

      this.ws.onopen = () => {
        // Send session configuration
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            agent_id: sessionConfig.agentId,
            voice: sessionConfig.voice || 'default',
            language: sessionConfig.language || 'en-US',
            input_mode: sessionConfig.inputMode || 'push-to-talk',
          },
        }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string);
        this.handleServerEvent(data);
        
        if (data.type === 'session.created') {
          this.connected = true;
          resolve();
        }
      };

      this.ws.onerror = (error) => {
        reject(new Error(`WebSocket error: ${error}`));
      };

      this.ws.onclose = () => {
        this.connected = false;
      };

      // Timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }

  async sendAudio(audio: Buffer | Uint8Array): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to realtime session');
    }

    // Send audio as base64
    const base64Audio = Buffer.from(audio).toString('base64');
    
    this.ws.send(JSON.stringify({
      type: 'input_audio.append',
      audio: base64Audio,
    }));
  }

  async sendText(text: string): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to realtime session');
    }

    this.ws.send(JSON.stringify({
      type: 'input_text',
      text,
    }));
  }

  onEvent(callback: (event: RealtimeEvent) => void): void {
    this.eventCallback = callback;
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  private handleServerEvent(data: Record<string, unknown>): void {
    if (!this.eventCallback) return;

    const eventType = data.type as string;
    
    switch (eventType) {
      case 'session.created':
        this.eventCallback({ type: 'session.created', data });
        break;
      
      case 'transcription.delta':
        this.eventCallback({ 
          type: 'transcription.delta', 
          text: data.delta as string,
        });
        break;
      
      case 'response.text.delta':
        this.eventCallback({ 
          type: 'response.text', 
          text: data.delta as string,
        });
        break;
      
      case 'response.audio.delta':
        this.eventCallback({ 
          type: 'response.audio', 
          audio: Buffer.from(data.audio as string, 'base64'),
        });
        break;
      
      case 'response.done':
        this.eventCallback({ type: 'response.done', data });
        break;
      
      case 'error':
        this.eventCallback({ 
          type: 'error', 
          error: data.message as string,
        });
        break;
    }
  }
}
