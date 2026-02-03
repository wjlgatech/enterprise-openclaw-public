/**
 * Voice Agent
 * Real-time voice interactions using AI Refinery
 * 
 * Architecture: ASR → LLM → TTS (cascaded design)
 */

import { EventEmitter } from 'events';
import { 
  AIRefineryRealtimeProvider, 
  RealtimeSessionConfig, 
  RealtimeEvent 
} from '../providers/airefinery-provider.js';
import { AgentConfig, TaskMetrics } from '../types.js';

export interface VoiceAgentConfig extends AgentConfig {
  voice?: string;
  language?: string;
  inputMode?: 'push-to-talk' | 'streaming';
  silenceTimeoutMs?: number;
  interruptible?: boolean;
}

export interface VoiceAgentEvents {
  'session.ready': () => void;
  'transcription': (text: string, isFinal: boolean) => void;
  'response.text': (text: string) => void;
  'response.audio': (audio: Buffer) => void;
  'response.done': () => void;
  'error': (error: Error) => void;
  'metrics': (metrics: VoiceMetrics) => void;
}

export interface VoiceMetrics extends TaskMetrics {
  transcriptionLatencyMs?: number;
  responseLatencyMs?: number;
  audioChunksReceived?: number;
  totalAudioDurationMs?: number;
}

/**
 * Voice Agent for real-time speech interactions
 */
export class VoiceAgent extends EventEmitter {
  private provider: AIRefineryRealtimeProvider;
  private config: VoiceAgentConfig;
  private connected = false;
  private metrics: VoiceMetrics;
  private responseStartTime?: number;

  constructor(config: VoiceAgentConfig) {
    super();
    this.config = config;
    this.provider = new AIRefineryRealtimeProvider();
    this.metrics = this.initMetrics();
  }

  /**
   * Start voice session
   */
  async start(): Promise<void> {
    const sessionConfig: RealtimeSessionConfig = {
      agentId: this.config.name,
      voice: this.config.voice || 'default',
      language: this.config.language || 'en-US',
      inputMode: this.config.inputMode || 'push-to-talk',
    };

    // Set up event handlers
    this.provider.onEvent((event) => this.handleEvent(event));

    try {
      await this.provider.connect(sessionConfig);
      this.connected = true;
      this.emit('session.ready');
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Send audio input (for push-to-talk or streaming)
   */
  async sendAudio(audio: Buffer | Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error('Voice session not started');
    }
    
    const startTime = Date.now();
    await this.provider.sendAudio(audio);
    
    // Track metrics
    this.metrics.audioChunksReceived = (this.metrics.audioChunksReceived || 0) + 1;
    this.metrics.totalAudioDurationMs = (this.metrics.totalAudioDurationMs || 0) + 
      this.estimateAudioDuration(audio);
  }

  /**
   * Send text input (bypass ASR)
   */
  async sendText(text: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Voice session not started');
    }
    
    this.responseStartTime = Date.now();
    await this.provider.sendText(text);
  }

  /**
   * Interrupt current response (barge-in)
   */
  async interrupt(): Promise<void> {
    if (!this.config.interruptible) {
      console.warn('Voice agent is not configured for interruption');
      return;
    }
    
    // Send interrupt signal
    // Note: Barge-in is coming in future AI Refinery versions
    console.log('Interrupt requested - feature coming soon');
  }

  /**
   * Stop voice session
   */
  async stop(): Promise<void> {
    if (this.connected) {
      await this.provider.disconnect();
      this.connected = false;
      
      // Emit final metrics
      this.emit('metrics', this.metrics);
    }
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.connected;
  }

  /**
   * Get current metrics
   */
  getMetrics(): VoiceMetrics {
    return { ...this.metrics };
  }

  // Event handlers

  private handleEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case 'session.created':
        // Session is ready
        break;

      case 'transcription.delta':
        if (event.text) {
          this.emit('transcription', event.text, false);
          
          // Track transcription latency
          if (!this.metrics.transcriptionLatencyMs && this.responseStartTime) {
            this.metrics.transcriptionLatencyMs = Date.now() - this.responseStartTime;
          }
        }
        break;

      case 'response.text':
        if (event.text) {
          this.emit('response.text', event.text);
          
          // Track response latency
          if (!this.metrics.responseLatencyMs && this.responseStartTime) {
            this.metrics.responseLatencyMs = Date.now() - this.responseStartTime;
          }
        }
        break;

      case 'response.audio':
        if (event.audio) {
          this.emit('response.audio', event.audio);
        }
        break;

      case 'response.done':
        this.emit('response.done');
        
        // Calculate duration
        if (this.responseStartTime) {
          this.metrics.durationMs = Date.now() - this.responseStartTime;
          this.responseStartTime = undefined;
        }
        break;

      case 'error':
        this.emit('error', new Error(event.error || 'Unknown voice error'));
        break;
    }
  }

  private initMetrics(): VoiceMetrics {
    return {
      durationMs: 0,
      tokensUsed: 0,
      memoryPeakMB: 0,
      cpuPeakPercent: 0,
      costUSD: 0,
      audioChunksReceived: 0,
      totalAudioDurationMs: 0,
    };
  }

  private estimateAudioDuration(audio: Buffer | Uint8Array): number {
    // Assuming 16kHz mono 16-bit audio
    const bytesPerSample = 2;
    const sampleRate = 16000;
    const samples = audio.length / bytesPerSample;
    return (samples / sampleRate) * 1000;
  }
}

/**
 * Voice Agent Factory
 */
export function createVoiceAgent(config: VoiceAgentConfig): VoiceAgent {
  return new VoiceAgent(config);
}

/**
 * Example usage:
 * 
 * ```typescript
 * const agent = createVoiceAgent({
 *   name: 'customer-support',
 *   type: 'custom',
 *   description: 'Customer support voice agent',
 *   voice: 'en-US-Jenny',
 *   language: 'en-US',
 *   inputMode: 'push-to-talk',
 *   interruptible: true,
 * });
 * 
 * agent.on('session.ready', () => console.log('Ready!'));
 * agent.on('transcription', (text) => console.log('User:', text));
 * agent.on('response.text', (text) => console.log('Agent:', text));
 * agent.on('response.audio', (audio) => playAudio(audio));
 * 
 * await agent.start();
 * await agent.sendText('Hello, how can I help you?');
 * 
 * // Later...
 * await agent.stop();
 * ```
 */
