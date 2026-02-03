/**
 * Enterprise Gateway - Integrates OpenClaw with Enterprise Extensions
 */

import { EnterprisePluginLoader } from '../extensions/common/plugin-loader';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export class EnterpriseGateway {
  private pluginLoader: EnterprisePluginLoader;
  private openclawGateway: any = null;

  constructor() {
    this.pluginLoader = new EnterprisePluginLoader();
  }

  async start(options: { port?: number; host?: string } = {}): Promise<void> {
    const { port = 8789, host = '127.0.0.1' } = options;

    logger.info('Starting Enterprise OpenClaw...');

    // Create plugin API
    const pluginApi = this.pluginLoader.createPluginApi();

    // Load enterprise plugins
    const plugins = [
      './extensions/enterprise-security/src/index',
      './extensions/multi-agent-orchestrator/src/index',
      './extensions/self-improvement/src/index',
    ];

    logger.info(`Loading ${plugins.length} enterprise plugins...`);

    for (const pluginPath of plugins) {
      try {
        const plugin = await this.pluginLoader.load(pluginPath);
        await this.pluginLoader.register(plugin, pluginApi);
      } catch (error) {
        logger.error(`Failed to load plugin ${pluginPath}:`, error);
      }
    }

    // Start our standalone server for demo (until we fully integrate with OpenClaw gateway)
    await this.startStandaloneServer(port, host);

    // Invoke lifecycle hooks
    await this.pluginLoader.invokeLifecycle('onGatewayStart', this.openclawGateway);

    logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║      Enterprise OpenClaw - Built on OpenClaw Foundation      ║
║                                                               ║
║  🚀 Server running on http://${host}:${port}                 ║
║  📊 Dashboard: http://${host}:${port}/dashboard              ║
║  🔌 WebSocket: ws://${host}:${port}                           ║
║                                                               ║
║  Core: OpenClaw/Epiloop (Multi-channel gateway)             ║
║  Extensions: Enterprise features as plugins                  ║
║                                                               ║
║  Features:                                                    ║
║  ✓ Multi-channel support (WhatsApp, Slack, Teams...)        ║
║  ✓ Multi-agent orchestration (DAG-based)                     ║
║  ✓ Self-improvement engine (Pattern detection)              ║
║  ✓ PII detection & masking (Compliance ready)               ║
║  ✓ Audit logging & metrics (SOC2 ready)                     ║
║  ✓ Real-time progress streaming                              ║
║                                                               ║
║  Standing on shoulders of giants! 🚀                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  private async startStandaloneServer(port: number, host: string): Promise<void> {
    // Import our standalone MVP server
    const { EnterpriseOpenClaw } = await import('./index');
    const app = new EnterpriseOpenClaw(port);
    await app.start();

    logger.info('Standalone server started (transitioning to full OpenClaw integration)');
  }

  async stop(): Promise<void> {
    logger.info('Stopping Enterprise OpenClaw...');

    await this.pluginLoader.invokeLifecycle('onGatewayStop');

    if (this.openclawGateway && typeof this.openclawGateway.close === 'function') {
      await this.openclawGateway.close();
    }

    logger.info('Enterprise OpenClaw stopped');
  }
}

// Start enterprise gateway if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const gateway = new EnterpriseGateway();

  gateway.start().catch(error => {
    logger.error({ error }, 'Failed to start Enterprise OpenClaw');
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await gateway.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await gateway.stop();
    process.exit(0);
  });
}
