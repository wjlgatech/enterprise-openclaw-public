/**
 * OpenClaw Adapter
 *
 * Abstraction layer for Original OpenClaw API
 * Allows us to update when OpenClaw changes without modifying all our code
 */

export interface OpenClawAction {
  type: string;
  params: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface OpenClawResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    timestamp: number;
    latency?: string;
  };
}

export interface OpenClawConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
}

export class OpenClawAdapter {
  private config: OpenClawConfig;
  private baseUrl: string;

  constructor(config: OpenClawConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
  }

  /**
   * Execute action on original OpenClaw
   */
  async execute(action: OpenClawAction): Promise<OpenClawResult> {
    const startTime = Date.now();

    try {
      // Make HTTP request to OpenClaw
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(action),
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `OpenClaw returned ${response.status}: ${response.statusText}`,
          metadata: {
            timestamp: Date.now(),
            latency: `${latency}ms`
          }
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          timestamp: Date.now(),
          latency: `${latency}ms`
        }
      };

    } catch (error) {
      const latency = Date.now() - startTime;

      // Handle different error types
      let errorMessage = 'Unknown error';

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          errorMessage = `Request timeout after ${this.config.timeout || 30000}ms`;
        } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to OpenClaw - is it running?';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        metadata: {
          timestamp: Date.now(),
          latency: `${latency}ms`
        }
      };
    }
  }

  /**
   * Health check for OpenClaw
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // Fast timeout for health check
      });

      return response.ok;
    } catch {
      // Any error means unhealthy
      return false;
    }
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get timeout setting
   */
  getTimeout(): number {
    return this.config.timeout || 30000;
  }
}
