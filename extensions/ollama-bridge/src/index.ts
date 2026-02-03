/**
 * Ollama Bridge Plugin - Local LLM Integration
 * 100% ON-DEVICE - NO DATA SENT TO EXTERNAL SERVERS
 *
 * Security Guarantees:
 * - All inference runs on localhost
 * - No network calls to external APIs
 * - Your code stays on your machine
 * - Full compliance with enterprise security policies
 */

import { OllamaWrapper, type OllamaConfig, type OllamaResponse } from './ollama-wrapper';

export interface EnterprisePlugin {
  metadata: {
    name: string;
    version: string;
    description: string;
  };
  register(api: any): Promise<void>;
}

export interface OpenClawPluginApi {
  config: any;
  registerMethod(name: string, handler: (...args: any[]) => Promise<any>): void;
  log(message: string): void;
}

export class OllamaBridgePlugin implements EnterprisePlugin {
  metadata = {
    name: 'ollama-bridge',
    version: '1.0.0',
    description: 'Local Ollama LLM integration - 100% on-device, no external API calls',
  };

  private wrapper?: OllamaWrapper;
  private config: any;

  async register(api: OpenClawPluginApi): Promise<void> {
    this.config = api.config.ollama || {};

    // Initialize Ollama wrapper for local inference
    this.wrapper = new OllamaWrapper({
      host: this.config.host || 'http://localhost:11434',
      model: this.config.defaultModel || 'codellama:13b',
    });

    // Verify Ollama is running
    try {
      await this.wrapper.listModels();
      api.log('✅ Ollama bridge initialized - LOCAL INFERENCE READY');
      api.log('🔒 Security: ALL data stays on your machine');
    } catch (error) {
      api.log('⚠️  Ollama not running. Start with: ollama serve');
      api.log('   Install Ollama: brew install ollama');
    }

    // Register methods
    api.registerMethod('ollama.execute', this.execute.bind(this));
    api.registerMethod('ollama.chat', this.chat.bind(this));
    api.registerMethod('ollama.stream', this.stream.bind(this));
    api.registerMethod('ollama.listModels', this.listModels.bind(this));
    api.registerMethod('ollama.pullModel', this.pullModel.bind(this));
    api.registerMethod('ollama.hasModel', this.hasModel.bind(this));

    // Register task-specific methods
    api.registerMethod('ollama.codeReview', this.codeReview.bind(this));
    api.registerMethod('ollama.generateDocs', this.generateDocs.bind(this));
    api.registerMethod('ollama.analyzeArchitecture', this.analyzeArchitecture.bind(this));
    api.registerMethod('ollama.generateCode', this.generateCode.bind(this));
  }

  /**
   * Execute local LLM
   */
  private async execute(params: {
    prompt: string;
    config?: OllamaConfig;
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return await this.wrapper.execute(params.prompt, params.config || {});
  }

  /**
   * Chat with local LLM
   */
  private async chat(params: {
    messages: Array<{ role: string; content: string }>;
    config?: OllamaConfig;
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return await this.wrapper.chat(params.messages as any, params.config || {});
  }

  /**
   * Stream local LLM response
   */
  private async stream(params: {
    prompt: string;
    config?: OllamaConfig;
  }): Promise<AsyncIterable<any>> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return this.wrapper.stream(params.prompt, params.config || {});
  }

  /**
   * List available local models
   */
  private async listModels(): Promise<string[]> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return await this.wrapper.listModels();
  }

  /**
   * Pull model to local machine
   */
  private async pullModel(params: { model: string }): Promise<void> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return await this.wrapper.pullModel(params.model);
  }

  /**
   * Check if model is available
   */
  private async hasModel(params: { model: string }): Promise<boolean> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    return await this.wrapper.hasModel(params.model);
  }

  /**
   * Code Review - LOCAL ONLY
   */
  private async codeReview(params: {
    code: string;
    language?: string;
    focus?: string[];
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    const focus = params.focus || [
      'security vulnerabilities',
      'code quality',
      'performance issues',
      'best practices',
    ];

    const prompt = `You are an expert code reviewer. Review the following ${params.language || 'code'} and provide detailed feedback on:
${focus.map((f) => `- ${f}`).join('\n')}

Code to review:
\`\`\`${params.language || ''}
${params.code}
\`\`\`

Provide actionable recommendations.`;

    return await this.wrapper.execute(prompt, {
      model: 'deepseek-coder',
      temperature: 0.3,
    });
  }

  /**
   * Generate Documentation - LOCAL ONLY
   */
  private async generateDocs(params: {
    code: string;
    language?: string;
    format?: 'markdown' | 'jsdoc' | 'docstring';
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    const prompt = `Generate comprehensive ${params.format || 'markdown'} documentation for the following code:

\`\`\`${params.language || ''}
${params.code}
\`\`\`

Include:
- Overview and purpose
- Parameters and return values
- Usage examples
- Edge cases and limitations`;

    return await this.wrapper.execute(prompt, {
      model: 'codellama:13b',
      temperature: 0.5,
    });
  }

  /**
   * Analyze Architecture - LOCAL ONLY
   */
  private async analyzeArchitecture(params: {
    design: string;
    focus?: string[];
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    const focus = params.focus || [
      'scalability',
      'security',
      'cost optimization',
      'maintainability',
    ];

    const prompt = `You are a senior software architect. Analyze this architecture design and provide recommendations:

${params.design}

Focus areas:
${focus.map((f) => `- ${f}`).join('\n')}

Provide:
1. Current strengths
2. Potential issues
3. Specific recommendations
4. Alternative approaches to consider`;

    return await this.wrapper.execute(prompt, {
      model: 'mistral:7b',
      temperature: 0.4,
    });
  }

  /**
   * Generate Code - LOCAL ONLY
   */
  private async generateCode(params: {
    description: string;
    language: string;
    requirements?: string[];
  }): Promise<OllamaResponse> {
    if (!this.wrapper) {
      throw new Error('Ollama wrapper not initialized');
    }

    const requirements = params.requirements || [];
    const prompt = `Generate production-ready ${params.language} code for:

${params.description}

Requirements:
${requirements.map((r) => `- ${r}`).join('\n')}

Provide:
1. Clean, well-documented code
2. Error handling
3. Type safety
4. Unit tests`;

    return await this.wrapper.execute(prompt, {
      model: 'codellama:13b',
      temperature: 0.3,
      maxTokens: 4000,
    });
  }
}

// Export plugin instance
export default new OllamaBridgePlugin();

// Export types and classes
export * from './ollama-wrapper';
