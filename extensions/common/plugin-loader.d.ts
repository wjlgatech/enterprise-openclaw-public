/**
 * Plugin Loader - Dynamically load and register enterprise plugins
 */
import type { EnterprisePlugin, OpenClawPluginApi, PluginLoader, PluginEvent, GatewayMethodHandler } from './plugin';
import type { GatewayServer } from '../../core/src/gateway/server.impl';
import type { AnyAgentTool } from '../../core/src/agents/pi-tools.types';
export declare class EnterprisePluginLoader implements PluginLoader {
    private plugins;
    private eventBus;
    private gatewayMethods;
    private tools;
    private config;
    private gateway;
    load(pluginPath: string): Promise<EnterprisePlugin>;
    loadAll(pluginPaths: string[]): Promise<EnterprisePlugin[]>;
    register(plugin: EnterprisePlugin, api: OpenClawPluginApi): Promise<void>;
    createPluginApi(): OpenClawPluginApi;
    setGateway(gateway: GatewayServer): void;
    getTools(): AnyAgentTool[];
    getGatewayMethods(): Map<string, GatewayMethodHandler>;
    invokeLifecycle(hook: 'onGatewayStart' | 'onGatewayStop' | 'onSessionCreate', ...args: any[]): Promise<void>;
    emitEvent(event: PluginEvent, data: any): Promise<void>;
}
