/**
 * Provider Index
 * Factory for creating LLM providers
 */

export * from './types.js';
export { AnthropicProvider } from './anthropic-provider.js';
export { AIRefineryProvider, AIRefineryRealtimeProvider } from './airefinery-provider.js';
export * from './streaming.js';
export * from './distiller-config.js';

import { LLMProvider, ProviderConfig } from './types.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { AIRefineryProvider, AIRefineryConfig } from './airefinery-provider.js';

export type ProviderType = 'anthropic' | 'airefinery' | 'openai';

/**
 * Create an LLM provider by name
 */
export function createProvider(
  type: ProviderType,
  config?: ProviderConfig | AIRefineryConfig
): LLMProvider {
  switch (type) {
    case 'anthropic':
      return new AnthropicProvider(config);
    
    case 'airefinery':
      return new AIRefineryProvider(config as AIRefineryConfig);
    
    case 'openai':
      // TODO: Implement OpenAI provider
      throw new Error('OpenAI provider not yet implemented');
    
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Get the default provider based on available API keys
 */
export function getDefaultProvider(): LLMProvider {
  // Priority: AI Refinery > Anthropic > OpenAI
  if (process.env.AIR_API_KEY) {
    return new AIRefineryProvider();
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  
  throw new Error('No LLM provider configured. Set AIR_API_KEY or ANTHROPIC_API_KEY');
}

/**
 * Provider registry for managing multiple providers
 */
export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private defaultProviderName: string | null = null;

  register(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
    if (!this.defaultProviderName) {
      this.defaultProviderName = name;
    }
  }

  get(name?: string): LLMProvider {
    const providerName = name || this.defaultProviderName;
    if (!providerName) {
      throw new Error('No default provider set');
    }
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    
    return provider;
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not found: ${name}`);
    }
    this.defaultProviderName = name;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    
    return results;
  }
}

// Global registry instance
export const providerRegistry = new ProviderRegistry();
