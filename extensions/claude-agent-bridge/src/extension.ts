/**
 * OpenClaw Extension Entry Point for Claude Agent Bridge
 * Type resolved at runtime via jiti alias
 */

import { ClaudeAgentWrapper } from './claude-agent-wrapper.js';

// @ts-ignore - epiloop/plugin-sdk resolved at runtime
type EpiloopPluginApi = any;

const plugin = {
  id: 'claude-agent-bridge',
  name: 'Claude Agent Bridge',
  description: 'Claude Agent SDK integration with extended thinking',

  register(api: EpiloopPluginApi) {
    console.log('🤖 Claude Agent Bridge extension loaded');

    // Register tool for extended thinking
    api.registerTool({
      name: 'claude-think',
      description: 'Execute Claude with extended thinking mode',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The prompt to send to Claude' },
          model: { type: 'string', description: 'Claude model to use (optional)' },
        },
        required: ['prompt'],
      },
      async execute(input: any) {
        const apiKey = process.env.ANTHROPIC_API_KEY || '';
        const wrapper = new ClaudeAgentWrapper(apiKey, input.model || 'claude-3-haiku-20240307');

        return await wrapper.executeWithThinking(input.prompt, {
          extendedThinking: true,
          model: input.model,
        });
      },
    });

    console.log('✅ Claude Agent Bridge ready');
  },
};

export default plugin;
