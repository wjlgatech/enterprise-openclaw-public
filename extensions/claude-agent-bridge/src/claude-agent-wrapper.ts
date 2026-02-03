/**
 * Claude Agent SDK Wrapper
 * Provides high-level interface to Claude's agent capabilities
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ClaudeAgentConfig,
  ClaudeAgentResponse,
  ResponseChunk,
  Artifact,
} from './types';

export class ClaudeAgentWrapper {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel;
  }

  /**
   * Execute agent with extended thinking
   */
  async executeWithThinking(
    prompt: string,
    config: ClaudeAgentConfig = {}
  ): Promise<ClaudeAgentResponse> {
    const model = config.model || this.defaultModel;
    const maxTokens = config.maxTokens || 4096;

    // Prepare extended thinking configuration
    const thinkingBudget =
      typeof config.extendedThinking === 'object'
        ? config.extendedThinking.budget || 10000
        : 10000;

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Enable extended thinking if requested
    const requestParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      messages,
    };

    // Add extended thinking parameter when supported
    if (config.extendedThinking) {
      (requestParams as any).thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      };
    }

    if (config.temperature !== undefined) {
      requestParams.temperature = config.temperature;
    }

    const response = await this.client.messages.create(requestParams);

    // Extract thinking blocks
    const thinking: string[] = [];
    let content = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if ((block as any).type === 'thinking') {
        thinking.push((block as any).thinking);
      }
    }

    return {
      content,
      thinking: thinking.length > 0 ? thinking : undefined,
      artifacts: config.generateArtifacts
        ? this.extractArtifacts(content)
        : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Stream response with real-time thinking
   */
  async *stream(
    prompt: string,
    config: ClaudeAgentConfig = {}
  ): AsyncIterable<ResponseChunk> {
    const model = config.model || this.defaultModel;
    const maxTokens = config.maxTokens || 4096;

    const requestParams: Anthropic.MessageStreamParams = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    };

    if (config.temperature !== undefined) {
      requestParams.temperature = config.temperature;
    }

    const stream = this.client.messages.stream(requestParams);

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield {
            type: 'text',
            content: event.delta.text,
          };
        } else if ((event.delta as any).type === 'thinking_delta') {
          yield {
            type: 'thinking',
            content: (event.delta as any).thinking,
          };
        }
      }
    }
  }

  /**
   * Generate artifacts from response
   */
  async generateArtifacts(
    prompt: string,
    config: ClaudeAgentConfig = {}
  ): Promise<Artifact[]> {
    const response = await this.executeWithThinking(prompt, {
      ...config,
      generateArtifacts: true,
    });

    return response.artifacts || [];
  }

  /**
   * Extract artifacts from content
   * Looks for code blocks and structured content
   */
  private extractArtifacts(content: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();

      artifacts.push({
        id: `artifact-${Date.now()}-${index}`,
        type: 'code',
        title: `Generated ${language} code`,
        content: code,
        language,
        createdAt: new Date(),
        version: 1,
      });

      index++;
    }

    return artifacts;
  }

  /**
   * Execute with tools
   */
  async executeWithTools(
    prompt: string,
    tools: Anthropic.Tool[],
    config: ClaudeAgentConfig = {}
  ): Promise<ClaudeAgentResponse> {
    const model = config.model || this.defaultModel;
    const maxTokens = config.maxTokens || 4096;

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      tools,
    });

    let content = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason || 'end_turn',
    };
  }
}
