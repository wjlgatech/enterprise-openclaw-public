/**
 * Plugin Loader - Dynamically load and register enterprise plugins
 */
import { EventEmitter } from 'events';
export class EnterprisePluginLoader {
    plugins = new Map();
    eventBus = new EventEmitter();
    gatewayMethods = new Map();
    tools = [];
    config = new Map();
    gateway = null;
    async load(pluginPath) {
        try {
            const pluginModule = await import(pluginPath);
            const plugin = pluginModule.default || pluginModule.plugin;
            if (!plugin.metadata) {
                throw new Error(`Plugin at ${pluginPath} missing metadata`);
            }
            this.plugins.set(plugin.metadata.id, plugin);
            return plugin;
        }
        catch (error) {
            throw new Error(`Failed to load plugin from ${pluginPath}: ${error}`);
        }
    }
    async loadAll(pluginPaths) {
        const loaded = [];
        for (const path of pluginPaths) {
            try {
                const plugin = await this.load(path);
                loaded.push(plugin);
            }
            catch (error) {
                console.error(`Failed to load plugin ${path}:`, error);
            }
        }
        return loaded;
    }
    async register(plugin, api) {
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
    createPluginApi() {
        return {
            registerMethod: (name, handler) => {
                this.gatewayMethods.set(name, handler);
            },
            registerTool: (tool) => {
                this.tools.push(tool);
            },
            registerTools: (tools) => {
                this.tools.push(...tools);
            },
            on: (event, handler) => {
                this.eventBus.on(event, handler);
            },
            emit: async (event, data) => {
                this.eventBus.emit(event, data);
            },
            getConfig: (pluginId) => {
                return (this.config.get(pluginId) || {});
            },
            setConfig: async (pluginId, config) => {
                const existing = this.config.get(pluginId) || { enabled: true };
                this.config.set(pluginId, { ...existing, ...config });
            },
            getGateway: () => {
                return this.gateway;
            },
            getSession: async (sessionKey) => {
                // TODO: Integrate with OpenClaw session store
                return null;
            },
            updateSession: async (sessionKey, data) => {
                // TODO: Integrate with OpenClaw session store
            },
        };
    }
    setGateway(gateway) {
        this.gateway = gateway;
    }
    getTools() {
        return this.tools;
    }
    getGatewayMethods() {
        return this.gatewayMethods;
    }
    async invokeLifecycle(hook, ...args) {
        for (const plugin of this.plugins.values()) {
            if (plugin[hook]) {
                try {
                    await plugin[hook](...args);
                }
                catch (error) {
                    console.error(`Plugin ${plugin.metadata.id} ${hook} failed:`, error);
                }
            }
        }
    }
    async emitEvent(event, data) {
        this.eventBus.emit(event, data);
    }
}
//# sourceMappingURL=plugin-loader.js.map