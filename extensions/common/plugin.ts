/**
 * Enterprise OpenClaw Plugin Interface
 * Extends OpenClaw with enterprise features
 */

import type { GatewayServer } from '../../core/src/gateway/server.impl';
import type { AnyAgentTool } from '../../core/src/agents/pi-tools.types';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
}

export interface PluginConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface OpenClawPluginApi {
  // Gateway methods registration
  registerMethod(name: string, handler: GatewayMethodHandler): void;

  // Tool registration
  registerTool(tool: AnyAgentTool): void;
  registerTools(tools: AnyAgentTool[]): void;

  // Event subscription
  on(event: PluginEvent, handler: PluginEventHandler): void;
  emit(event: PluginEvent, data: unknown): Promise<void>;

  // Configuration
  getConfig<T = PluginConfig>(pluginId: string): T;
  setConfig(pluginId: string, config: Partial<PluginConfig>): Promise<void>;

  // Gateway access
  getGateway(): GatewayServer | null;

  // Session management
  getSession(sessionKey: string): Promise<any>;
  updateSession(sessionKey: string, data: any): Promise<void>;
}

export type GatewayMethodHandler = (params: any, context: MethodContext) => Promise<any>;

export interface MethodContext {
  sessionKey?: string;
  userId?: string;
  deviceId?: string;
  requestId?: string;
}

export type PluginEvent =
  | 'gateway.start'
  | 'gateway.stop'
  | 'session.create'
  | 'session.message'
  | 'session.complete'
  | 'agent.start'
  | 'agent.complete'
  | 'agent.error'
  | 'tool.execute'
  | 'tool.complete'
  | 'channel.message'
  | 'device.pair'
  | string; // Allow custom events

export type PluginEventHandler = (data: any) => Promise<void> | void;

export interface EnterprisePlugin {
  metadata: PluginMetadata;

  /**
   * Initialize plugin with OpenClaw API
   */
  register(api: OpenClawPluginApi): Promise<void>;

  /**
   * Lifecycle: Called when gateway starts
   */
  onGatewayStart?(gateway: GatewayServer): Promise<void>;

  /**
   * Lifecycle: Called when gateway stops
   */
  onGatewayStop?(): Promise<void>;

  /**
   * Lifecycle: Called when session is created
   */
  onSessionCreate?(session: any): Promise<void>;

  /**
   * Tools provided by this plugin
   */
  tools?: AnyAgentTool[];

  /**
   * Gateway RPC methods provided by this plugin
   */
  gatewayMethods?: Record<string, GatewayMethodHandler>;

  /**
   * Configuration schema for this plugin
   */
  configSchema?: any; // Zod schema
}

export interface PluginLoader {
  load(pluginPath: string): Promise<EnterprisePlugin>;
  loadAll(pluginPaths: string[]): Promise<EnterprisePlugin[]>;
  register(plugin: EnterprisePlugin, api: OpenClawPluginApi): Promise<void>;
}
