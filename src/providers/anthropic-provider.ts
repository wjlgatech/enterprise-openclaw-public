/**
 * Anthropic Provider
 * Direct integration with Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ProviderConfig,
  Message,
} from './types.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: ProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY required for Anthropic provider');
    }

    this.client = new Anthropic({ apiKey });
    this.defaultModel = config.defaultModel || 'claude-3-haiku-20240307';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = this.convertMessages(request.messages);
    
    const response = await this.client.messages.create({
      model: request.model || this.defaultModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      messages,
      tools: request.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      })),
    });

    const textContent = response.content.find(c => c.type === 'text');
    const toolUseContent = response.content.filter(c => c.type === 'tool_use');

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapStopReason(response.stop_reason),
      toolCalls: toolUseContent.map(tc => ({
        id: tc.type === 'tool_use' ? tc.id : '',
        name: tc.type === 'tool_use' ? tc.name : '',
        arguments: tc.type === 'tool_use' ? (tc.input as Record<string, unknown>) : {},
      })),
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<StreamEvent> {
    const messages = this.convertMessages(request.messages);

    const stream = this.client.messages.stream({
      model: request.model || this.defaultModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', delta: event.delta.text };
        }
      } else if (event.type === 'message_stop') {
        yield { type: 'done' };
      }
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models list API, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20241022',
    ];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private mapStopReason(reason: string | null): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}
