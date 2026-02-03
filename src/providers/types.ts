/**
 * LLM Provider Types
 * Abstraction layer for multiple LLM backends
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionRequest {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_use' | 'error';
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface StreamEvent {
  type: 'text_delta' | 'tool_use' | 'done' | 'error';
  delta?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Abstract LLM Provider Interface
 */
export interface LLMProvider {
  name: string;
  
  /**
   * Create a completion (non-streaming)
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /**
   * Create a streaming completion
   */
  stream(request: CompletionRequest): AsyncGenerator<StreamEvent>;
  
  /**
   * List available models
   */
  listModels(): Promise<string[]>;
  
  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Real-time voice provider interface (for AI Refinery)
 */
export interface RealtimeVoiceProvider {
  /**
   * Connect to real-time voice session
   */
  connect(sessionConfig: RealtimeSessionConfig): Promise<void>;
  
  /**
   * Send audio input
   */
  sendAudio(audio: Buffer | Uint8Array): Promise<void>;
  
  /**
   * Send text input
   */
  sendText(text: string): Promise<void>;
  
  /**
   * Listen for events
   */
  onEvent(callback: (event: RealtimeEvent) => void): void;
  
  /**
   * Disconnect
   */
  disconnect(): Promise<void>;
}

export interface RealtimeSessionConfig {
  agentId?: string;
  voice?: string;
  language?: string;
  inputMode?: 'push-to-talk' | 'streaming';
}

export interface RealtimeEvent {
  type: 'session.created' | 'transcription.delta' | 'response.text' | 
        'response.audio' | 'response.done' | 'error';
  data?: unknown;
  text?: string;
  audio?: Buffer;
  error?: string;
}
