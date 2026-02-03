/**
 * OpenClaw Extension Entry Point for Ollama Bridge
 * Type resolved at runtime via jiti alias
 */

import { OllamaWrapper } from './ollama-wrapper.js';

// @ts-ignore - epiloop/plugin-sdk resolved at runtime
type EpiloopPluginApi = any;

const plugin = {
  id: 'ollama-bridge',
  name: 'Ollama Bridge',
  description: 'Local LLM execution via Ollama - 100% on-device',

  register(api: EpiloopPluginApi) {
    console.log('🦙 Ollama Bridge extension loaded');
    console.log('   100% On-Device LLM Processing');

    // Register tool for local LLM execution
    api.registerTool({
      name: 'ollama-execute',
      description: 'Execute local LLM (100% private, no data leaves device)',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt to send to Ollama' },
          model: { type: 'string', description: 'Model to use (codellama:13b, deepseek-coder, mistral:7b)' },
          temperature: { type: 'number', description: 'Temperature for generation (0.0-1.0)' },
        },
        required: ['prompt'],
      },
      async execute(input: any) {
        const wrapper = new OllamaWrapper({
          host: 'http://localhost:11434',
          model: input.model || 'codellama:13b',
        });

        try {
          return await wrapper.execute(input.prompt, {
            model: input.model,
            temperature: input.temperature,
          });
        } catch (error) {
          throw new Error('Ollama not running. Start with: ollama serve');
        }
      },
    });

    console.log('✅ Ollama Bridge ready - All processing stays local');
  },
};

export default plugin;
