/**
 * AI Refinery Distiller Configuration
 * Support for YAML/NOML config files and multi-agent workflows
 * 
 * @see https://sdk.airefinery.accenture.com/distiller/
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Distiller Agent Configuration
 */
export interface DistillerAgentConfig {
  name: string;
  role: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: DistillerTool[];
  audioConfig?: AudioConfig;
}

export interface DistillerTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AudioConfig {
  voice?: string;
  language?: string;
  speed?: number;
  silenceDurationMs?: number;
  normalization?: boolean;
}

/**
 * Distiller Project Configuration
 */
export interface DistillerProjectConfig {
  name: string;
  version?: string;
  description?: string;
  
  // Default settings
  defaults?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  
  // Agents in this project
  agents: DistillerAgentConfig[];
  
  // Workflow DAG
  workflow?: {
    entryAgent: string;
    transitions: WorkflowTransition[];
  };
  
  // Global audio settings
  audio?: AudioConfig;
  
  // Knowledge bases
  knowledge?: KnowledgeConfig[];
}

export interface WorkflowTransition {
  from: string;
  to: string;
  condition?: string;
}

export interface KnowledgeConfig {
  name: string;
  type: 'vector' | 'graph' | 'document';
  source: string;
  embedModel?: string;
}

/**
 * Load Distiller config from YAML file
 */
export async function loadDistillerConfig(
  configPath: string
): Promise<DistillerProjectConfig> {
  const ext = path.extname(configPath).toLowerCase();
  const content = await fs.promises.readFile(configPath, 'utf-8');
  
  if (ext === '.yaml' || ext === '.yml') {
    // Simple YAML parser for basic configs
    // In production, use a proper YAML library
    return parseSimpleYaml(content);
  } else if (ext === '.json') {
    return JSON.parse(content);
  } else {
    throw new Error(`Unsupported config format: ${ext}`);
  }
}

/**
 * Generate Distiller config from Enterprise OpenClaw agents
 */
export function generateDistillerConfig(
  projectName: string,
  agents: Array<{
    name: string;
    type: string;
    description: string;
    config?: Record<string, unknown>;
  }>
): DistillerProjectConfig {
  return {
    name: projectName,
    version: '1.0.0',
    defaults: {
      model: 'meta-llama/Llama-3.1-70B-Instruct',
      temperature: 0.7,
      maxTokens: 4096,
    },
    agents: agents.map(agent => ({
      name: agent.name,
      role: mapAgentTypeToRole(agent.type),
      systemPrompt: generateSystemPrompt(agent.type, agent.description),
      ...agent.config,
    })),
    workflow: agents.length > 1 ? {
      entryAgent: agents[0].name,
      transitions: agents.slice(1).map((agent, idx) => ({
        from: agents[idx].name,
        to: agent.name,
      })),
    } : undefined,
  };
}

/**
 * Export config to YAML format
 */
export function exportToYaml(config: DistillerProjectConfig): string {
  const lines: string[] = [];
  
  lines.push(`name: ${config.name}`);
  if (config.version) lines.push(`version: "${config.version}"`);
  if (config.description) lines.push(`description: "${config.description}"`);
  lines.push('');
  
  if (config.defaults) {
    lines.push('defaults:');
    if (config.defaults.model) lines.push(`  model: ${config.defaults.model}`);
    if (config.defaults.temperature) lines.push(`  temperature: ${config.defaults.temperature}`);
    if (config.defaults.maxTokens) lines.push(`  max_tokens: ${config.defaults.maxTokens}`);
    lines.push('');
  }
  
  lines.push('agents:');
  for (const agent of config.agents) {
    lines.push(`  - name: ${agent.name}`);
    lines.push(`    role: ${agent.role}`);
    if (agent.model) lines.push(`    model: ${agent.model}`);
    if (agent.systemPrompt) {
      lines.push(`    system_prompt: |`);
      lines.push(`      ${agent.systemPrompt.replace(/\n/g, '\n      ')}`);
    }
    if (agent.temperature) lines.push(`    temperature: ${agent.temperature}`);
    if (agent.maxTokens) lines.push(`    max_tokens: ${agent.maxTokens}`);
    
    if (agent.audioConfig) {
      lines.push('    audio:');
      if (agent.audioConfig.voice) lines.push(`      voice: ${agent.audioConfig.voice}`);
      if (agent.audioConfig.language) lines.push(`      language: ${agent.audioConfig.language}`);
      if (agent.audioConfig.speed) lines.push(`      speed: ${agent.audioConfig.speed}`);
    }
    lines.push('');
  }
  
  if (config.workflow) {
    lines.push('workflow:');
    lines.push(`  entry_agent: ${config.workflow.entryAgent}`);
    lines.push('  transitions:');
    for (const t of config.workflow.transitions) {
      lines.push(`    - from: ${t.from}`);
      lines.push(`      to: ${t.to}`);
      if (t.condition) lines.push(`      condition: "${t.condition}"`);
    }
  }
  
  return lines.join('\n');
}

// Helper functions

function mapAgentTypeToRole(type: string): string {
  const roleMap: Record<string, string> = {
    'code-generator': 'You are an expert software engineer.',
    'analyzer': 'You are a data analyst providing actionable insights.',
    'knowledge-extractor': 'You extract and organize knowledge from documents.',
    'custom': 'You are a helpful AI assistant.',
  };
  return roleMap[type] || roleMap.custom;
}

function generateSystemPrompt(type: string, description: string): string {
  const basePrompts: Record<string, string> = {
    'code-generator': `You are an expert software engineer. Your task is to: ${description}

Guidelines:
- Write clean, type-safe code
- Include error handling
- Add comments and documentation
- Consider edge cases`,
    
    'analyzer': `You are a data analyst. Your task is to: ${description}

Guidelines:
- Provide actionable insights
- Support claims with data
- Identify trends and patterns
- Suggest next steps`,
    
    'knowledge-extractor': `You are a knowledge extraction specialist. Your task is to: ${description}

Guidelines:
- Extract key facts and entities
- Identify relationships
- Summarize clearly
- Preserve important context`,
    
    'custom': description,
  };
  
  return basePrompts[type] || basePrompts.custom;
}

function parseSimpleYaml(content: string): DistillerProjectConfig {
  // Very basic YAML parsing - in production use js-yaml or similar
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentIndent = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        currentKey = key;
        result[key] = {};
      }
    }
  }
  
  return result as unknown as DistillerProjectConfig;
}
