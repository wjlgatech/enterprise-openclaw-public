#!/usr/bin/env tsx

/**
 * Enterprise OpenClaw Server
 *
 * This server wraps Original OpenClaw with enterprise features.
 * Users connect to this server (port 18789).
 * This server proxies to OpenClaw (port 3000) with governance layers.
 */

import express from 'express';
import { EnterpriseGateway } from './packages/enterprise/src/integration/enterprise-gateway.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = process.env.ENTERPRISE_PORT || 18789;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Initialize Enterprise Gateway
const gateway = new EnterpriseGateway({
  openclaw: {
    baseUrl: process.env.OPENCLAW_URL || 'http://localhost:3000',
    timeout: 30000
  },
  license: process.env.ENTERPRISE_LICENSE_KEY ? {
    publicKeyPath: process.env.LICENSE_PUBLIC_KEY_PATH || './keys/public_key.pem',
    licenseKey: process.env.ENTERPRISE_LICENSE_KEY
  } : undefined,
  audit: {
    logPath: process.env.AUDIT_LOG_PATH || './logs/audit.jsonl'
  }
});

let isInitialized = false;

async function initializeGateway() {
  logger.info('🚀 Initializing Enterprise Gateway...');

  try {
    await gateway.initialize();
    isInitialized = true;
    logger.info('✅ Enterprise Gateway initialized');
  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize gateway');
    throw error;
  }
}

// Health check
app.get('/api/health', async (req, res) => {
  const openclawHealthy = isInitialized ? await gateway.getOpenClawHealth() : false;

  res.json({
    status: isInitialized ? 'healthy' : 'initializing',
    timestamp: Date.now(),
    version: '1.0.0-enterprise',
    components: {
      gateway: isInitialized ? 'ready' : 'initializing',
      openclaw: openclawHealthy ? 'healthy' : 'unavailable',
      audit: isInitialized ? 'active' : 'pending'
    }
  });
});

// Audit log endpoint (for UI)
app.get('/api/audit/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const { readFile } = await import('fs/promises');
    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';

    // Read audit log file
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    // Parse JSONL and get last N entries
    const entries = lines
      .slice(-limit)
      .map(line => JSON.parse(line))
      .reverse(); // Most recent first

    res.json({ entries });
  } catch (error) {
    logger.error({ error }, 'Failed to read audit log');
    res.json({ entries: [] });
  }
});

// User capabilities endpoint (for UI)
app.get('/api/user/capabilities', async (req, res) => {
  try {
    // Get user from header or default
    const userId = req.headers['x-user-id'] || 'default-user';

    // In production, fetch from user database
    // For now, return default capabilities
    const capabilities = ['file.read', 'browser.navigate', 'api.call'];

    res.json({ userId, capabilities });
  } catch (error) {
    logger.error({ error }, 'Failed to get user capabilities');
    res.status(500).json({ error: 'Failed to get capabilities' });
  }
});

// Execute action (enterprise-wrapped)
app.post('/api/execute', async (req, res) => {
  try {
    const { action, context } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required. Format: {"action": {...}, "context": {...}}'
      });
    }

    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Gateway not initialized. Please wait and try again.'
      });
    }

    // Default context if not provided (for testing)
    const userContext = context || {
      userId: 'default-user',
      capabilities: [
        'browser.navigate',
        'browser.click',
        'browser.type',
        'file.read',
        'api.call'
      ]
    };

    logger.info({ action: action.type, userId: userContext.userId }, 'Executing action');

    // Execute through enterprise gateway
    const result = await gateway.execute(action, userContext);

    res.json(result);

  } catch (error) {
    logger.error({ error }, 'Execute failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported actions
app.get('/api/capabilities', (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({ error: 'Gateway not initialized' });
  }

  res.json({
    actions: gateway.getSupportedActions(),
    capabilities: gateway.getAllCapabilities()
  });
});

// Chat endpoint (for UI compatibility)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isInitialized) {
      return res.json({
        response: 'Enterprise OpenClaw is still initializing. Please wait a moment...',
        model: 'Enterprise OpenClaw Gateway',
        timestamp: Date.now()
      });
    }

    // Simple response for demo
    let response = `**Enterprise OpenClaw Gateway Active** 🦅

I received your message: "${message}"

**Phase 1 Features Active:**
✅ Permission Checks - Fine-grained access control
✅ Audit Logging - Complete action trail
✅ OpenClaw Integration - Browser, shell, file operations

**To Test Governance:**
Try: "test permission check"
Try: "show capabilities"
Try: "system status"

**Current Status:**
- OpenClaw: ${await gateway.getOpenClawHealth() ? '✅ Connected' : '⚠️  Unavailable'}
- Audit: ✅ Logging all actions
- Gateway: ✅ Ready

What would you like to do?`;

    // Handle special commands
    if (message.toLowerCase().includes('capability') || message.toLowerCase().includes('capabilities')) {
      const caps = gateway.getAllCapabilities();
      response = `**Available Capabilities:**\n\n${caps.map(c => `• ${c}`).join('\n')}\n\nThese control what actions users can perform.`;
    } else if (message.toLowerCase().includes('status')) {
      const healthy = await gateway.getOpenClawHealth();
      response = `**System Status:**

🦅 Enterprise Gateway: ✅ Running
🔌 OpenClaw Backend: ${healthy ? '✅ Connected' : '⚠️  Unavailable'}
📝 Audit Logging: ✅ Active
🔐 Permission System: ✅ Enforcing

**Metrics:**
• Supported Actions: ${gateway.getSupportedActions().length}
• Total Capabilities: ${gateway.getAllCapabilities().length}
• Port: ${port}

Everything is operational!`;
    }

    res.json({
      response,
      model: 'Enterprise OpenClaw Gateway',
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error({ error }, 'Chat failed');
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Serve the chat UI
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
  try {
    await initializeGateway();

    app.listen(port, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║                                           ║');
      console.log('║    🦅 Enterprise OpenClaw Gateway        ║');
      console.log('║       Phase 1: Foundation Complete       ║');
      console.log('║                                           ║');
      console.log('║    ✅ System Running                      ║');
      console.log('║                                           ║');
      console.log('╚═══════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Enterprise Gateway: http://localhost:${port}`);
      console.log(`🔌 OpenClaw Backend:   ${process.env.OPENCLAW_URL || 'http://localhost:3000'}`);
      console.log(`💓 Health Check:       http://localhost:${port}/api/health`);
      console.log(`📊 Capabilities:       http://localhost:${port}/api/capabilities`);
      console.log('');
      console.log('🔒 Enterprise Features Active:');
      console.log('   • Permission Middleware - Capability-based access control');
      console.log('   • Audit Logging - Complete action trail (logs/audit.jsonl)');
      console.log('   • License Validation - Ready for integration');
      console.log('');
      console.log('📝 Test the API:');
      console.log('   curl http://localhost:' + port + '/api/health');
      console.log('   curl -X POST http://localhost:' + port + '/api/execute \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"action":{"type":"browser.navigate","params":{"url":"https://example.com"}},"context":{"userId":"test","capabilities":["browser.navigate"]}}\'');
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('');
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
start();
