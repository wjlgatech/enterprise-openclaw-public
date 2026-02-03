/**
 * Ollama Local LLM Wrapper
 * ALL INFERENCE RUNS ON YOUR MACHINE - NO DATA SENT TO EXTERNAL APIS
 */

import { Ollama } from 'ollama';

export interface OllamaConfig {
  host?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  done: boolean;
}

export class OllamaWrapper {
  private client: Ollama;
  private defaultModel: string;

  constructor(config: OllamaConfig = {}) {
    this.client = new Ollama({
      host: config.host || 'http://localhost:11434',
    });
    this.defaultModel = config.model || 'codellama:13b';
  }

  /**
   * Execute local LLM - NO DATA LEAVES YOUR MACHINE
   */
  async execute(prompt: string, config: OllamaConfig = {}): Promise<OllamaResponse> {
    const model = config.model || this.defaultModel;

    const response = await this.client.generate({
      model,
      prompt,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    return {
      content: response.response,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
      model,
      done: response.done,
    };
  }

  /**
   * Stream local LLM response - NO DATA LEAVES YOUR MACHINE
   */
  async *stream(prompt: string, config: OllamaConfig = {}) {
    const model = config.model || this.defaultModel;

    const stream = await this.client.generate({
      model,
      prompt,
      stream: true,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.response,
        done: chunk.done,
      };
    }
  }

  /**
   * Chat interface for multi-turn conversations - LOCAL ONLY
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    config: OllamaConfig = {}
  ): Promise<OllamaResponse> {
    const model = config.model || this.defaultModel;

    const response = await this.client.chat({
      model,
      messages,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    return {
      content: response.message.content,
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
      model,
      done: response.done,
    };
  }

  /**
   * List available local models
   */
  async listModels(): Promise<string[]> {
    const response = await this.client.list();
    return response.models.map((m) => m.name);
  }

  /**
   * Check if a model is available locally
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  /**
   * Pull a model (download to local machine)
   */
  async pullModel(modelName: string): Promise<void> {
    await this.client.pull({ model: modelName, stream: false });
  }

  /**
   * Delete local model
   */
  async deleteModel(modelName: string): Promise<void> {
    await this.client.delete({ model: modelName });
  }

  /**
   * Get model info
   */
  async modelInfo(modelName: string): Promise<any> {
    return await this.client.show({ model: modelName });
  }
}
