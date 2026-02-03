/**
 * Plugin Loader - Dynamically load and register enterprise plugins
 */

import { EventEmitter } from 'events';
import type {
  EnterprisePlugin,
  OpenClawPluginApi,
  PluginLoader,
  PluginEvent,
  PluginEventHandler,
  GatewayMethodHandler,
  PluginConfig
} from './plugin';
import type { GatewayServer } from '../../core/src/gateway/server.impl';
import type { AnyAgentTool } from '../../core/src/agents/pi-tools.types';

export class EnterprisePluginLoader implements PluginLoader {
  private plugins = new Map<string, EnterprisePlugin>();
  private eventBus = new EventEmitter();
  private gatewayMethods = new Map<string, GatewayMethodHandler>();
  private tools: AnyAgentTool[] = [];
  private config = new Map<string, PluginConfig>();
  private gateway: GatewayServer | null = null;

  async load(pluginPath: string): Promise<EnterprisePlugin> {
    try {
      const pluginModule = await import(pluginPath);
      const plugin: EnterprisePlugin = pluginModule.default || pluginModule.plugin;

      if (!plugin.metadata) {
        throw new Error(`Plugin at ${pluginPath} missing metadata`);
      }

      this.plugins.set(plugin.metadata.id, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error}`);
    }
  }

  async loadAll(pluginPaths: string[]): Promise<EnterprisePlugin[]> {
    const loaded: EnterprisePlugin[] = [];

    for (const path of pluginPaths) {
      try {
        const plugin = await this.load(path);
        loaded.push(plugin);
      } catch (error) {
        console.error(`Failed to load plugin ${path}:`, error);
      }
    }

    return loaded;
  }

  async register(plugin: EnterprisePlugin, api: OpenClawPluginApi): Promise<void> {
    console.log(`Registering plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);

    // Store plugin
    this.plugins.set(plugin.metadata.id, plugin);

    // Register tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.tools.push(tool);
      }
    }

    // Register gateway methods
    if (plugin.gatewayMethods) {
      for (const [name, handler] of Object.entries(plugin.gatewayMethods)) {
        this.gatewayMethods.set(name, handler);
      }
    }

    // Call plugin registration
    await plugin.register(api);

    console.log(`✓ Plugin registered: ${plugin.metadata.id}`);
  }

  createPluginApi(): OpenClawPluginApi {
    return {
      registerMethod: (name: string, handler: GatewayMethodHandler) => {
        this.gatewayMethods.set(name, handler);
      },

      registerTool: (tool: AnyAgentTool) => {
        this.tools.push(tool);
      },

      registerTools: (tools: AnyAgentTool[]) => {
        this.tools.push(...tools);
      },

      on: (event: PluginEvent, handler: PluginEventHandler) => {
        this.eventBus.on(event, handler);
      },

      emit: async (event: PluginEvent, data: unknown) => {
        this.eventBus.emit(event, data);
      },

      getConfig: <T = PluginConfig>(pluginId: string): T => {
        return (this.config.get(pluginId) || {}) as T;
      },

      setConfig: async (pluginId: string, config: Partial<PluginConfig>) => {
        const existing = this.config.get(pluginId) || { enabled: true };
        this.config.set(pluginId, { ...existing, ...config });
      },

      getGateway: () => {
        return this.gateway;
      },

      getSession: async (sessionKey: string) => {
        // TODO: Integrate with OpenClaw session store
        return null;
      },

      updateSession: async (sessionKey: string, data: any) => {
        // TODO: Integrate with OpenClaw session store
      },
    };
  }

  setGateway(gateway: GatewayServer): void {
    this.gateway = gateway;
  }

  getTools(): AnyAgentTool[] {
    return this.tools;
  }

  getGatewayMethods(): Map<string, GatewayMethodHandler> {
    return this.gatewayMethods;
  }

  async invokeLifecycle(hook: 'onGatewayStart' | 'onGatewayStop' | 'onSessionCreate', ...args: any[]): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin[hook]) {
        try {
          await plugin[hook]!(...args);
        } catch (error) {
          console.error(`Plugin ${plugin.metadata.id} ${hook} failed:`, error);
        }
      }
    }
  }

  async emitEvent(event: PluginEvent, data: any): Promise<void> {
    this.eventBus.emit(event, data);
  }
}
