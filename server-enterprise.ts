#!/usr/bin/env tsx

/**
 * Enterprise OpenClaw Server
 *
 * This server wraps Original OpenClaw with enterprise features.
 * Users connect to this server (port 18789).
 * This server proxies to OpenClaw (port 3000) with governance layers.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { EnterpriseGateway } from './packages/enterprise/src/integration/enterprise-gateway.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { UserRoleManager } from './packages/enterprise/src/permissions/user-storage.js';
import { getAllRoles, getRole, getCapabilitiesFromRoles, isValidRole, type RoleName } from './packages/enterprise/src/permissions/roles.js';

// Load environment variables
dotenv.config({ path: '/Users/jialiang.wu/Documents/Projects/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const port = process.env.ENTERPRISE_PORT || 19000;

// Export io for use in other modules
export { io };

// Initialize REAL LLM client - Using Anthropic Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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
    logPath: process.env.AUDIT_LOG_PATH || './logs/audit.jsonl',
    socketServer: io  // Pass socket.io server to audit middleware
  }
});

// Initialize User Role Manager
const userRoleManager = new UserRoleManager(
  process.env.USER_ROLES_FILE || './data/user-roles.json'
);

let isInitialized = false;

async function initializeGateway() {
  logger.info('🚀 Initializing Enterprise Gateway...');

  try {
    await gateway.initialize();
    await userRoleManager.initialize();
    isInitialized = true;
    logger.info('✅ Enterprise Gateway initialized');
    logger.info('✅ User Role Manager initialized');
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

// Dashboard Analytics Endpoints
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const { readFile } = await import('fs/promises');
    const { DashboardAnalytics } = await import('./packages/enterprise/src/analytics/dashboard-analytics.js');

    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const entries = lines.map(line => JSON.parse(line)).reverse();

    const analytics = new DashboardAnalytics();
    const summary = analytics.generateExecutiveSummary(entries);

    res.json(summary);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Failed to generate dashboard summary');
    res.status(500).json({ error: 'Failed to generate summary', details: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/dashboard/insights', async (req, res) => {
  try {
    const { readFile } = await import('fs/promises');
    const { DashboardAnalytics } = await import('./packages/enterprise/src/analytics/dashboard-analytics.js');

    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const entries = lines.map(line => JSON.parse(line)).reverse();

    const analytics = new DashboardAnalytics();
    const insights = analytics.generateOperationalInsights(entries);

    res.json(insights);
  } catch (error) {
    logger.error({ error }, 'Failed to generate operational insights');
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

app.get('/api/dashboard/details', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const { readFile } = await import('fs/promises');
    const { DashboardAnalytics } = await import('./packages/enterprise/src/analytics/dashboard-analytics.js');

    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const entries = lines.map(line => JSON.parse(line)).reverse();

    const analytics = new DashboardAnalytics();
    const details = analytics.generateDetailedAnalysis(entries, limit);

    // Convert Map to object for JSON serialization
    const denialsByCapability: Record<string, any[]> = {};
    details.denialsByCapability.forEach((entries, capability) => {
      denialsByCapability[capability] = entries;
    });

    res.json({
      recentActions: details.recentActions,
      denialsByCapability,
      userTimeline: details.userTimeline
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate detailed analysis');
    res.status(500).json({ error: 'Failed to generate details' });
  }
});

app.get('/api/dashboard/upgrades', async (req, res) => {
  try {
    const { readFile } = await import('fs/promises');
    const { DashboardAnalytics } = await import('./packages/enterprise/src/analytics/dashboard-analytics.js');

    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const entries = lines.map(line => JSON.parse(line)).reverse();

    const analytics = new DashboardAnalytics();
    const upgrades = analytics.generateSystemUpgrades(entries);

    res.json({ upgrades });
  } catch (error) {
    logger.error({ error }, 'Failed to generate system upgrades');
    res.status(500).json({ error: 'Failed to generate upgrades' });
  }
});

// Action execution endpoint
app.post('/api/dashboard/execute', async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !action.type) {
      return res.status(400).json({ error: 'Action type required' });
    }

    logger.info({ action }, 'Executing dashboard action');

    // Execute based on action type
    switch (action.type) {
      case 'grant_permission':
        // TODO: Implement permission granting
        res.json({
          success: true,
          message: `Permission ${action.payload.capability} would be granted`,
          note: 'Permission system integration pending'
        });
        break;

      case 'update_policy':
        // TODO: Implement policy update
        res.json({
          success: true,
          message: `Policy would be updated for ${action.payload.userId}`,
          note: 'Policy management integration pending'
        });
        break;

      case 'optimize_workflow':
        // TODO: Implement workflow optimization
        res.json({
          success: true,
          message: 'Workflow optimization would be applied',
          note: 'Workflow engine integration pending'
        });
        break;

      case 'upgrade_system':
        // TODO: Implement system upgrade
        res.json({
          success: true,
          message: `System upgrade ${action.payload.feature} would be enabled`,
          note: 'System upgrade framework pending'
        });
        break;

      default:
        res.status(400).json({ error: 'Unknown action type' });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to execute action');
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

// ============================================
// ROLE MANAGEMENT API ENDPOINTS
// ============================================

// GET /api/roles - List all available roles
app.get('/api/roles', (req, res) => {
  try {
    const roles = getAllRoles();
    res.json({ roles });
  } catch (error) {
    logger.error({ error }, 'Failed to get roles');
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// GET /api/users/:userId/roles - Get user's roles
app.get('/api/users/:userId/roles', async (req, res) => {
  try {
    const { userId } = req.params;
    const roles = await userRoleManager.getUserRoles(userId);
    const capabilities = await userRoleManager.getUserCapabilities(userId);

    // Calculate effective capabilities from roles
    const roleCapabilities = getCapabilitiesFromRoles(roles);
    const allCapabilities = [...new Set([...roleCapabilities, ...capabilities])];

    res.json({
      userId,
      roles,
      capabilities,
      effectiveCapabilities: allCapabilities
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get user roles');
    res.status(500).json({ error: 'Failed to get user roles' });
  }
});

// POST /api/users/:userId/roles - Assign role to user
app.post('/api/users/:userId/roles', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    await userRoleManager.assignRole(userId, role as RoleName);

    const roles = await userRoleManager.getUserRoles(userId);
    const roleCapabilities = getCapabilitiesFromRoles(roles);

    logger.info({ userId, role }, 'Role assigned to user');

    res.json({
      success: true,
      message: `Role ${role} assigned to ${userId}`,
      roles,
      grantedCapabilities: roleCapabilities
    });
  } catch (error) {
    logger.error({ error }, 'Failed to assign role');
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// DELETE /api/users/:userId/roles/:role - Remove role from user
app.delete('/api/users/:userId/roles/:role', async (req, res) => {
  try {
    const { userId, role } = req.params;

    if (!isValidRole(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    await userRoleManager.removeRole(userId, role as RoleName);

    const roles = await userRoleManager.getUserRoles(userId);
    const roleCapabilities = getCapabilitiesFromRoles(roles);

    logger.info({ userId, role }, 'Role removed from user');

    res.json({
      success: true,
      message: `Role ${role} removed from ${userId}`,
      roles,
      remainingCapabilities: roleCapabilities
    });
  } catch (error) {
    logger.error({ error }, 'Failed to remove role');
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// GET /api/users - List all users with their roles
app.get('/api/users', async (req, res) => {
  try {
    const users = await userRoleManager.getAllUsers();

    // Enrich with effective capabilities
    const enrichedUsers = users.map(user => ({
      ...user,
      effectiveCapabilities: getCapabilitiesFromRoles(user.roles)
    }));

    res.json({ users: enrichedUsers });
  } catch (error) {
    logger.error({ error }, 'Failed to get users');
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// POST /api/users/:userId/capabilities - Grant individual capability
app.post('/api/users/:userId/capabilities', async (req, res) => {
  try {
    const { userId } = req.params;
    const { capability } = req.body;

    if (!capability) {
      return res.status(400).json({ error: 'Capability is required' });
    }

    await userRoleManager.grantCapability(userId, capability);

    const capabilities = await userRoleManager.getUserCapabilities(userId);

    logger.info({ userId, capability }, 'Capability granted to user');

    res.json({
      success: true,
      message: `Capability ${capability} granted to ${userId}`,
      capabilities
    });
  } catch (error) {
    logger.error({ error }, 'Failed to grant capability');
    res.status(500).json({ error: 'Failed to grant capability' });
  }
});

// DELETE /api/users/:userId/capabilities/:capability - Revoke individual capability
app.delete('/api/users/:userId/capabilities/:capability', async (req, res) => {
  try {
    const { userId, capability } = req.params;

    await userRoleManager.revokeCapability(userId, capability);

    const capabilities = await userRoleManager.getUserCapabilities(userId);

    logger.info({ userId, capability }, 'Capability revoked from user');

    res.json({
      success: true,
      message: `Capability ${capability} revoked from ${userId}`,
      capabilities
    });
  } catch (error) {
    logger.error({ error }, 'Failed to revoke capability');
    res.status(500).json({ error: 'Failed to revoke capability' });
  }
});

// User capabilities endpoint (for UI) - Updated to use role manager
app.get('/api/user/capabilities', async (req, res) => {
  try {
    // Get user from header or default
    const userId = (req.headers['x-user-id'] as string) || 'default-user';

    // Fetch from role manager
    const roles = await userRoleManager.getUserRoles(userId);
    const capabilities = await userRoleManager.getUserCapabilities(userId);
    const roleCapabilities = getCapabilitiesFromRoles(roles);
    const allCapabilities = [...new Set([...roleCapabilities, ...capabilities])];

    res.json({
      userId,
      roles,
      capabilities: allCapabilities,
      individualCapabilities: capabilities,
      roleCapabilities: roleCapabilities
    });
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

    // Get userId from context or header
    const userId = context?.userId || (req.headers['x-user-id'] as string) || 'default-user';

    // Load user permissions from role manager
    const roles = await userRoleManager.getUserRoles(userId);
    const individualCapabilities = await userRoleManager.getUserCapabilities(userId);
    const roleCapabilities = getCapabilitiesFromRoles(roles);
    const allCapabilities = [...new Set([...roleCapabilities, ...individualCapabilities])];

    // Build user context with roles
    const userContext = {
      userId,
      tenantId: context?.tenantId,
      roles,
      capabilities: allCapabilities
    };

    logger.info({
      action: action.type,
      userId: userContext.userId,
      roles: userContext.roles,
      capabilityCount: allCapabilities.length
    }, 'Executing action');

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

    // Get real system context
    const systemContext = `You are Enterprise OpenClaw, an AI assistant with enterprise governance.

**Current System Status:**
- Enterprise Gateway: Running on port ${port}
- OpenClaw Backend: ${await gateway.getOpenClawHealth() ? 'Connected' : 'Unavailable'}
- Audit Logging: Active (${await gateway.getOpenClawHealth() ? 'logging all actions' : 'ready'})
- Permission System: Enforcing ${gateway.getAllCapabilities().length} capabilities

**Available Capabilities:**
${gateway.getAllCapabilities().map(c => `- ${c}`).join('\n')}

**Audit Log Access:**
- API Endpoint: GET /api/audit/recent?limit=N
- Dashboard: Users can view audit logs in the Dashboard tab (top header)
- Logs are stored in logs/audit.jsonl (JSONL format)

**CRITICAL: When users ask about audit logs:**
- DO NOT fabricate or make up sample audit entries
- DO NOT show fake timestamps or example data
- INSTEAD: Direct them to the Dashboard view or API endpoint where they can see REAL audit entries
- Tell them to click "Dashboard" in the top stats area to see real-time audit data

Be helpful and accurate. Never fabricate data or show examples when real data exists.`;

    // REAL LLM CALL - Using Anthropic Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemContext,
      messages: [
        { role: 'user', content: message }
      ]
    });

    const responseText = response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No response generated';

    res.json({
      response: responseText,
      model: response.model,
      timestamp: Date.now(),
      usage: response.usage
    });

  } catch (error) {
    logger.error({ error }, 'Chat failed');
    res.status(500).json({ error: 'Chat failed' });
  }
});

// ============================================
// SMART RECOMMENDATION SYSTEM API
// ============================================

// Initialize recommendation engine
let recommendationEngine: any = null;

async function getRecommendationEngine() {
  if (!recommendationEngine) {
    const { RecommendationEngine } = await import('./packages/enterprise/src/analytics/recommendation-engine.js');
    recommendationEngine = new RecommendationEngine();
    logger.info('✅ Recommendation engine initialized');
  }
  return recommendationEngine;
}

// GET /api/recommendations - Get current recommendations
app.get('/api/recommendations', async (req, res) => {
  try {
    const engine = await getRecommendationEngine();

    // Read audit log
    const { readFile } = await import('fs/promises');
    const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
    const content = await readFile(auditLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const entries = lines.map(line => JSON.parse(line));

    // Analyze and generate recommendations
    engine.analyzeAndGenerateRecommendations(entries);

    // Get recommendations
    const recommendations = engine.getRecommendations();
    const stats = engine.getStats();

    res.json({
      recommendations,
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get recommendations');
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// POST /api/recommendations/:id/apply - Apply a recommendation
app.post('/api/recommendations/:id/apply', async (req, res) => {
  try {
    const engine = await getRecommendationEngine();
    const { id } = req.params;
    const recommendation = engine.getRecommendation(id);

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    logger.info({ recommendation }, 'Applying recommendation');

    // Apply the recommendation
    let result: any;

    switch (recommendation.type) {
      case 'grant_user_capability':
        await userRoleManager.grantCapability(
          recommendation.action.target,
          recommendation.action.capability!
        );
        result = {
          success: true,
          message: `Granted ${recommendation.action.capability} to ${recommendation.action.target}`,
          action: 'capability_granted',
          details: {
            userId: recommendation.action.target,
            capability: recommendation.action.capability
          }
        };
        logger.info({
          userId: recommendation.action.target,
          capability: recommendation.action.capability
        }, 'Applied recommendation: capability granted');
        break;

      case 'add_role_capability':
        // In real system, this would update role definition in database
        result = {
          success: true,
          message: `Would add ${recommendation.action.capability} to ${recommendation.action.role} role`,
          action: 'role_capability_added',
          note: 'Role capability updates require admin approval',
          details: {
            role: recommendation.action.role,
            capability: recommendation.action.capability
          }
        };
        logger.info({
          role: recommendation.action.role,
          capability: recommendation.action.capability
        }, 'Recommendation for role capability addition (requires admin approval)');
        break;

      case 'assign_user_role':
        await userRoleManager.assignRole(
          recommendation.action.target,
          recommendation.action.role! as RoleName
        );
        result = {
          success: true,
          message: `Assigned ${recommendation.action.role} role to ${recommendation.action.target}`,
          action: 'role_assigned',
          details: {
            userId: recommendation.action.target,
            role: recommendation.action.role
          }
        };
        logger.info({
          userId: recommendation.action.target,
          role: recommendation.action.role
        }, 'Applied recommendation: role assigned');
        break;

      default:
        return res.status(400).json({ error: 'Unknown recommendation type' });
    }

    // Remove the recommendation after applying
    engine.dismissRecommendation(id);

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to apply recommendation');
    res.status(500).json({
      error: 'Failed to apply recommendation',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/recommendations/:id/dismiss - Dismiss a recommendation
app.post('/api/recommendations/:id/dismiss', async (req, res) => {
  try {
    const engine = await getRecommendationEngine();
    const { id } = req.params;
    const dismissed = engine.dismissRecommendation(id);

    if (!dismissed) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    logger.info({ id }, 'Recommendation dismissed');

    res.json({
      success: true,
      message: 'Recommendation dismissed'
    });
  } catch (error) {
    logger.error({ error }, 'Failed to dismiss recommendation');
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

// Serve the chat UI
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected to WebSocket');

  socket.emit('connected', {
    message: 'Connected to Enterprise OpenClaw',
    timestamp: Date.now()
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected from WebSocket');
  });

  // Send initial dashboard data on connection
  socket.on('request-dashboard-update', async () => {
    try {
      const { readFile } = await import('fs/promises');
      const { DashboardAnalytics } = await import('./packages/enterprise/src/analytics/dashboard-analytics.js');

      const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.jsonl';
      const content = await readFile(auditLogPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      const entries = lines.map(line => JSON.parse(line)).reverse();

      const analytics = new DashboardAnalytics();
      const summary = analytics.generateExecutiveSummary(entries);

      socket.emit('dashboard-update', {
        type: 'full',
        data: summary,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send dashboard update');
    }
  });
});

// Start server
async function start() {
  try {
    await initializeGateway();

    httpServer.listen(port, () => {
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
      console.log('   • Real-Time Analytics - WebSocket live updates');
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
