/**
 * Claude Agent SDK Bridge - Type Definitions
 */

export interface ClaudeAgentConfig {
  model?: string;
  extendedThinking?: boolean | ExtendedThinkingConfig;
  generateArtifacts?: boolean;
  tools?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface ExtendedThinkingConfig {
  enabled: boolean;
  budget?: number; // max thinking tokens
}

export interface ThinkingStep {
  type: 'thinking';
  thinking: string;
}

export interface ResponseChunk {
  type: 'text' | 'thinking' | 'artifact';
  content: string;
  metadata?: Record<string, any>;
}

export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'data';
  title: string;
  content: string;
  language?: string;
  createdAt: Date;
  version: number;
}

export interface QualityMetrics {
  thinkingDepth: number;
  coherence: number;
  relevance: number;
}

export interface ClaudeAgentResponse {
  content: string;
  thinking?: string[];
  artifacts?: Artifact[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens?: number;
  };
  stopReason: string;
}

export interface MCPServer {
  name: string;
  version: string;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (params: any) => Promise<any>;
}
