/**
 * Claude Agent SDK Bridge Plugin
 * Integrates Claude's agent capabilities with Enterprise OpenClaw
 */

import type { EnterprisePlugin, OpenClawPluginApi } from './plugin-types';
import { ClaudeAgentWrapper } from './claude-agent-wrapper';
import { ExtendedThinkingManager } from './extended-thinking-manager';
import { ArtifactManager } from './artifact-manager';
import type { ClaudeAgentConfig, ClaudeAgentResponse } from './types';

export class ClaudeAgentBridgePlugin implements EnterprisePlugin {
  metadata = {
    name: 'claude-agent-bridge',
    version: '1.0.0',
    description: 'Claude Agent SDK integration with extended thinking and artifacts',
  };

  private agentWrapper?: ClaudeAgentWrapper;
  private thinkingManager?: ExtendedThinkingManager;
  private artifactManager?: ArtifactManager;
  private config: any;

  async register(api: OpenClawPluginApi): Promise<void> {
    this.config = api.config.claudeAgentBridge || {};

    // Initialize components
    const apiKey = this.config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    this.agentWrapper = new ClaudeAgentWrapper(
      apiKey,
      this.config.anthropic?.defaultModel
    );

    this.thinkingManager = new ExtendedThinkingManager();

    this.artifactManager = new ArtifactManager(
      this.config.artifacts?.storage || './data/artifacts'
    );
    await this.artifactManager.initialize();

    // Register gateway methods
    api.registerMethod('claude.execute', this.executeAgent.bind(this));
    api.registerMethod('claude.executeWithThinking', this.executeWithThinking.bind(this));
    api.registerMethod('claude.stream', this.streamAgent.bind(this));
    api.registerMethod('claude.generateArtifacts', this.generateArtifacts.bind(this));
    api.registerMethod('claude.getArtifact', this.getArtifact.bind(this));
    api.registerMethod('claude.listArtifacts', this.listArtifacts.bind(this));
    api.registerMethod('claude.getThinking', this.getThinking.bind(this));

    api.log('Claude Agent Bridge initialized');
  }

  /**
   * Execute Claude agent
   */
  private async executeAgent(params: {
    prompt: string;
    config?: ClaudeAgentConfig;
  }): Promise<ClaudeAgentResponse> {
    if (!this.agentWrapper) {
      throw new Error('Agent wrapper not initialized');
    }

    const response = await this.agentWrapper.executeWithThinking(
      params.prompt,
      params.config || {}
    );

    return response;
  }

  /**
   * Execute with extended thinking
   */
  private async executeWithThinking(params: {
    prompt: string;
    thinkingBudget?: number;
    config?: ClaudeAgentConfig;
  }): Promise<ClaudeAgentResponse> {
    if (!this.agentWrapper || !this.thinkingManager) {
      throw new Error('Components not initialized');
    }

    const config: ClaudeAgentConfig = {
      ...params.config,
      extendedThinking: {
        enabled: true,
        budget: params.thinkingBudget || 10000,
      },
    };

    const response = await this.agentWrapper.executeWithThinking(
      params.prompt,
      config
    );

    // Store thinking process
    if (response.thinking) {
      const responseId = `response-${Date.now()}`;
      this.thinkingManager.storeThinking(responseId, response.thinking);

      // Analyze quality
      const thinkingSteps = this.thinkingManager.getThinkingProcess(responseId);
      const quality = this.thinkingManager.analyzeQuality(thinkingSteps);

      (response as any).responseId = responseId;
      (response as any).thinkingQuality = quality;
    }

    return response;
  }

  /**
   * Stream agent response
   */
  private async streamAgent(params: {
    prompt: string;
    config?: ClaudeAgentConfig;
  }): Promise<AsyncIterable<any>> {
    if (!this.agentWrapper) {
      throw new Error('Agent wrapper not initialized');
    }

    return this.agentWrapper.stream(params.prompt, params.config || {});
  }

  /**
   * Generate artifacts
   */
  private async generateArtifacts(params: {
    prompt: string;
    config?: ClaudeAgentConfig;
  }): Promise<any> {
    if (!this.agentWrapper || !this.artifactManager) {
      throw new Error('Components not initialized');
    }

    const artifacts = await this.agentWrapper.generateArtifacts(
      params.prompt,
      params.config || {}
    );

    // Store artifacts
    const artifactIds = [];
    for (const artifact of artifacts) {
      const id = await this.artifactManager.store(artifact);
      artifactIds.push(id);
    }

    return {
      artifacts,
      artifactIds,
    };
  }

  /**
   * Get artifact by ID
   */
  private async getArtifact(params: { artifactId: string }): Promise<any> {
    if (!this.artifactManager) {
      throw new Error('Artifact manager not initialized');
    }

    return this.artifactManager.get(params.artifactId);
  }

  /**
   * List artifacts with filters
   */
  private async listArtifacts(params: {
    type?: string;
    language?: string;
  }): Promise<any> {
    if (!this.artifactManager) {
      throw new Error('Artifact manager not initialized');
    }

    return this.artifactManager.list(params);
  }

  /**
   * Get thinking process for response
   */
  private async getThinking(params: { responseId: string }): Promise<any> {
    if (!this.thinkingManager) {
      throw new Error('Thinking manager not initialized');
    }

    const thinking = this.thinkingManager.getThinkingProcess(params.responseId);
    const quality = this.thinkingManager.analyzeQuality(thinking);

    return {
      thinking,
      quality,
    };
  }
}

// Export plugin instance
export default new ClaudeAgentBridgePlugin();

// Export types and classes for advanced usage
export * from './types';
export { ClaudeAgentWrapper } from './claude-agent-wrapper';
export { ExtendedThinkingManager } from './extended-thinking-manager';
export { ArtifactManager } from './artifact-manager';
