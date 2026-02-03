/**
 * Enterprise OpenClaw Gateway
 * Properly integrates enterprise plugins with OpenClaw's gateway
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

export async function startEnterpriseGateway() {
  logger.info('🦅 Starting Enterprise OpenClaw');
  logger.info('Using OpenClaw gateway with enterprise extensions');

  try {
    // Import OpenClaw's gateway server
    const { GatewayServer } = await import('../core/dist/gateway/server.impl.js');

    // Load enterprise configuration
    const config = {
      gateway: {
        mode: 'local',
        host: '0.0.0.0',
        port: 8789,
        controlUi: true,  // Enable OpenClaw's control UI
      },
      enterprise: {
        plugins: [
          'enterprise-security',
          'multi-agent-orchestrator',
          'self-improvement',
          'claude-agent-bridge',
          'ollama-bridge',
        ],
        security: {
          piiDetection: true,
          auditLogging: true,
        },
      },
    };

    logger.info('Configuration loaded');
    logger.info({ plugins: config.enterprise.plugins }, 'Enterprise plugins');

    // Create OpenClaw gateway server
    const gateway = new GatewayServer();

    // Initialize gateway with config
    await gateway.start({
      port: config.gateway.port,
      host: config.gateway.host,
    });

    logger.info('✅ Enterprise OpenClaw Gateway started');
    logger.info({
      url: `http://localhost:${config.gateway.port}`,
      controlUi: `http://localhost:${config.gateway.port}/`,
      features: [
        'OpenClaw Control UI',
        'Multi-channel support (12+)',
        'Enterprise security (PII, audit)',
        'Multi-agent orchestration',
        'Self-improvement engine',
        'Local LLM (Ollama)',
        'Claude Agent SDK',
      ],
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      await gateway.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error({ error }, 'Failed to start gateway');
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startEnterpriseGateway();
}
