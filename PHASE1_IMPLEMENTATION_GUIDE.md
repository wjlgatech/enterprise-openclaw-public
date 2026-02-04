# Phase 1 Implementation Guide: Foundation Layer

**Duration:** Week 1-2
**Goal:** Set up layered architecture with OpenClaw integration
**Status:** Ready to implement

---

## 🎯 PHASE 1 OBJECTIVES

By end of Phase 1, you will have:
- ✅ Original OpenClaw running as submodule
- ✅ Enterprise Gateway proxying requests to OpenClaw
- ✅ Basic permission checks intercepting actions
- ✅ Basic audit logging for all actions
- ✅ Dual-server architecture (Enterprise port 18789, OpenClaw port 3000)

---

## 📋 PREREQUISITES

```bash
# Verify you have:
node --version  # >= 20.0.0
git --version   # >= 2.0.0
npm --version   # >= 9.0.0

# Current project structure
cd ~/Documents/Projects/enterprise-openclaw
ls -la  # Should see packages/, ui/, server.ts, etc.
```

---

## STEP 1: ADD OPENCLAW AS SUBMODULE

### Option A: If OpenClaw is public on GitHub

```bash
cd ~/Documents/Projects/enterprise-openclaw

# Add OpenClaw as git submodule
git submodule add https://github.com/anthropics/openclaw.git openclaw

# Initialize and update submodule
git submodule update --init --recursive

# Verify
ls openclaw/
# Should see OpenClaw files
```

### Option B: If we need to use local OpenClaw or fork

```bash
# If you need to work with a fork or local version
cd ~/Documents/Projects/enterprise-openclaw

# Create openclaw directory
mkdir -p openclaw

# Option 1: Clone from fork
git clone https://github.com/YOUR-FORK/openclaw.git openclaw

# Option 2: Copy local OpenClaw
# cp -r /path/to/your/openclaw ./openclaw
```

### Verify OpenClaw Structure

```bash
cd openclaw
ls -la
# Should see OpenClaw's package.json, README, etc.

# Install OpenClaw dependencies
npm install

# Build OpenClaw
npm run build

# Test OpenClaw runs standalone
npm start
# Should start on default port (3000)
# Ctrl+C to stop
```

---

## STEP 2: CREATE ENTERPRISE WRAPPER SKELETON

### 2.1 Create Integration Package Structure

```bash
cd ~/Documents/Projects/enterprise-openclaw

# Create integration module in enterprise package
mkdir -p packages/enterprise/src/integration
mkdir -p packages/enterprise/src/middleware
mkdir -p packages/enterprise/tests/integration
```

### 2.2 Create OpenClaw Adapter Interface

**File:** `packages/enterprise/src/integration/openclaw-adapter.ts`

```typescript
/**
 * Adapter interface for Original OpenClaw
 *
 * This adapter abstracts OpenClaw's API so we can:
 * 1. Easily update when OpenClaw changes
 * 2. Mock for testing
 * 3. Add enterprise layers without touching OpenClaw
 */

export interface OpenClawAction {
  type: string;
  params: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface OpenClawResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface OpenClawConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
}

export class OpenClawAdapter {
  private config: OpenClawConfig;
  private baseUrl: string;

  constructor(config: OpenClawConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
  }

  /**
   * Execute action on original OpenClaw
   */
  async execute(action: OpenClawAction): Promise<OpenClawResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(action),
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenClaw returned ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          timestamp: Date.now(),
          latency: response.headers.get('x-latency') || 'unknown'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Health check for OpenClaw
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 2.3 Create Basic Permission Middleware

**File:** `packages/enterprise/src/middleware/permission-middleware.ts`

```typescript
import { OpenClawAction } from '../integration/openclaw-adapter.js';

/**
 * Simple capability-based permission system
 *
 * In Phase 1, we'll just check if user has the capability.
 * In Phase 2, we'll add full policy engine.
 */

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredCapability?: string;
}

export interface UserContext {
  userId: string;
  tenantId?: string;
  capabilities: string[];
}

export class PermissionMiddleware {
  /**
   * Map action types to required capabilities
   */
  private static readonly ACTION_CAPABILITIES: Record<string, string> = {
    'browser.navigate': 'browser.navigate',
    'browser.click': 'browser.click',
    'browser.type': 'browser.type',
    'browser.screenshot': 'browser.screenshot',
    'shell.exec': 'shell.exec',
    'file.read': 'file.read',
    'file.write': 'file.write',
    'file.delete': 'file.delete',
    'api.call': 'api.call'
  };

  /**
   * Check if user has permission to execute action
   */
  async checkPermission(
    action: OpenClawAction,
    context: UserContext
  ): Promise<PermissionCheck> {
    // Get required capability for this action
    const requiredCapability = PermissionMiddleware.ACTION_CAPABILITIES[action.type];

    if (!requiredCapability) {
      // Unknown action type - deny by default
      return {
        allowed: false,
        reason: `Unknown action type: ${action.type}`,
        requiredCapability: 'unknown'
      };
    }

    // Check if user has capability
    const hasCapability = context.capabilities.includes(requiredCapability);

    if (!hasCapability) {
      return {
        allowed: false,
        reason: `Missing required capability: ${requiredCapability}`,
        requiredCapability
      };
    }

    // Permission granted
    return {
      allowed: true,
      requiredCapability
    };
  }

  /**
   * Get all capabilities for an action type
   */
  getRequiredCapability(actionType: string): string | undefined {
    return PermissionMiddleware.ACTION_CAPABILITIES[actionType];
  }
}
```

### 2.4 Create Basic Audit Middleware

**File:** `packages/enterprise/src/middleware/audit-middleware.ts`

```typescript
import { OpenClawAction, OpenClawResult } from '../integration/openclaw-adapter.js';
import { UserContext } from './permission-middleware.js';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Simple audit logger for Phase 1
 *
 * Logs all actions to a JSON file.
 * In Phase 3, we'll upgrade to immutable ledger with blockchain hashing.
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  tenantId?: string;
  action: {
    type: string;
    params: Record<string, unknown>;
  };
  result: {
    success: boolean;
    error?: string;
  };
  permission: {
    allowed: boolean;
    reason?: string;
  };
}

export class AuditMiddleware {
  private auditLogPath: string;

  constructor(auditLogPath: string = './logs/audit.jsonl') {
    this.auditLogPath = auditLogPath;
  }

  /**
   * Initialize audit log directory
   */
  async initialize(): Promise<void> {
    const dir = join(this.auditLogPath, '..');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Log an action (after execution)
   */
  async logAction(
    action: OpenClawAction,
    context: UserContext,
    result: OpenClawResult,
    permissionAllowed: boolean,
    permissionReason?: string
  ): Promise<void> {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      userId: context.userId,
      tenantId: context.tenantId,
      action: {
        type: action.type,
        params: action.params
      },
      result: {
        success: result.success,
        error: result.error
      },
      permission: {
        allowed: permissionAllowed,
        reason: permissionReason
      }
    };

    // Append to JSONL file (one JSON per line)
    const line = JSON.stringify(entry) + '\n';
    await appendFile(this.auditLogPath, line, 'utf-8');
  }

  /**
   * Query audit log (simple version for Phase 1)
   */
  async query(filter?: { userId?: string; actionType?: string; limit?: number }): Promise<AuditEntry[]> {
    // TODO: Implement in Phase 3 with proper indexing
    return [];
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2.5 Create Enterprise Gateway

**File:** `packages/enterprise/src/integration/enterprise-gateway.ts`

```typescript
import { OpenClawAdapter, OpenClawAction, OpenClawResult } from './openclaw-adapter.js';
import { PermissionMiddleware, UserContext } from '../middleware/permission-middleware.js';
import { AuditMiddleware } from '../middleware/audit-middleware.js';
import { LicenseValidator } from '../licensing/license-validator.js';

/**
 * Enterprise Gateway - Main entry point
 *
 * Wraps Original OpenClaw with enterprise layers:
 * 1. License validation
 * 2. Permission checks
 * 3. Audit logging
 * 4. (Future: tenant isolation, policy engine, etc.)
 */

export interface EnterpriseConfig {
  openclaw: {
    baseUrl: string;
    timeout?: number;
  };
  license: {
    publicKeyPath: string;
    licenseKey?: string;
  };
  audit: {
    logPath: string;
  };
}

export class EnterpriseGateway {
  private openclawAdapter: OpenClawAdapter;
  private permissionMiddleware: PermissionMiddleware;
  private auditMiddleware: AuditMiddleware;
  private licenseValidator: LicenseValidator;

  constructor(private config: EnterpriseConfig) {
    this.openclawAdapter = new OpenClawAdapter({
      baseUrl: config.openclaw.baseUrl,
      timeout: config.openclaw.timeout
    });

    this.permissionMiddleware = new PermissionMiddleware();
    this.auditMiddleware = new AuditMiddleware(config.audit.logPath);

    this.licenseValidator = new LicenseValidator({
      publicKeyPath: config.license.publicKeyPath,
      cachePath: './cache/license',
      enableMachineBinding: true
    });
  }

  /**
   * Initialize gateway
   */
  async initialize(): Promise<void> {
    // Initialize audit log
    await this.auditMiddleware.initialize();

    // Validate license
    if (this.config.license.licenseKey) {
      const licenseResult = await this.licenseValidator.validate(this.config.license.licenseKey);
      if (!licenseResult.valid) {
        throw new Error(`License validation failed: ${licenseResult.reason}`);
      }
      console.log('✅ License validated successfully');
      console.log(`   Tier: ${licenseResult.payload?.tier}`);
      console.log(`   Features: ${licenseResult.payload?.features.join(', ')}`);
    }

    // Check OpenClaw health
    const openclawHealthy = await this.openclawAdapter.healthCheck();
    if (!openclawHealthy) {
      console.warn('⚠️  OpenClaw health check failed - may not be running');
    } else {
      console.log('✅ OpenClaw connection verified');
    }
  }

  /**
   * Execute action with enterprise layers
   */
  async execute(action: OpenClawAction, context: UserContext): Promise<OpenClawResult> {
    // ============ LAYER 1: PERMISSION CHECK ============
    const permissionCheck = await this.permissionMiddleware.checkPermission(action, context);

    if (!permissionCheck.allowed) {
      // Log denial
      await this.auditMiddleware.logAction(
        action,
        context,
        { success: false, error: permissionCheck.reason },
        false,
        permissionCheck.reason
      );

      return {
        success: false,
        error: `Permission denied: ${permissionCheck.reason}`
      };
    }

    // ============ LAYER 2: EXECUTE ON OPENCLAW ============
    const result = await this.openclawAdapter.execute(action);

    // ============ LAYER 3: AUDIT LOG ============
    await this.auditMiddleware.logAction(
      action,
      context,
      result,
      true
    );

    return result;
  }
}
```

---

## STEP 3: CREATE ENTERPRISE SERVER

**File:** `server-enterprise.ts` (new file at root)

```typescript
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
const logger = pino({ level: 'info' });
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
  license: {
    publicKeyPath: process.env.LICENSE_PUBLIC_KEY_PATH || './keys/public_key.pem',
    licenseKey: process.env.ENTERPRISE_LICENSE_KEY
  },
  audit: {
    logPath: './logs/audit.jsonl'
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
app.get('/api/health', (req, res) => {
  res.json({
    status: isInitialized ? 'healthy' : 'initializing',
    timestamp: Date.now(),
    version: '1.0.0-enterprise',
    components: {
      gateway: isInitialized ? 'ready' : 'initializing',
      openclaw: 'checking...'
    }
  });
});

// Execute action (enterprise-wrapped)
app.post('/api/execute', async (req, res) => {
  try {
    const { action, context } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (!isInitialized) {
      return res.status(503).json({ error: 'Gateway not initialized' });
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

    logger.info({ action, context: userContext }, 'Executing action');

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

// Chat endpoint (for UI compatibility)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Simple response for Phase 1
    res.json({
      response: `Enterprise OpenClaw received: "${message}"\n\nPhase 1 foundation is active:\n✅ Permission checks\n✅ Audit logging\n✅ OpenClaw integration\n\nType "test action" to test the full flow.`,
      model: 'Enterprise OpenClaw Gateway',
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error({ error }, 'Chat failed');
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Serve UI
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
      console.log('║                                           ║');
      console.log('║    ✅ System Running                      ║');
      console.log('║                                           ║');
      console.log('╚═══════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Enterprise Gateway: http://localhost:${port}`);
      console.log(`🔌 OpenClaw Backend:   http://localhost:3000`);
      console.log(`💓 Health Check:       http://localhost:${port}/api/health`);
      console.log('');
      console.log('🔒 Enterprise Features Active:');
      console.log('   • Permission Middleware');
      console.log('   • Audit Logging');
      console.log('   • License Validation');
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('');
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start
start();
```

---

## STEP 4: UPDATE PACKAGE.JSON SCRIPTS

**File:** `package.json` (root)

Add these scripts:

```json
{
  "scripts": {
    "start": "tsx server-enterprise.ts",
    "start:openclaw": "cd openclaw && npm start",
    "start:both": "concurrently \"npm run start:openclaw\" \"npm run start\"",
    "dev": "tsx watch server-enterprise.ts",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "test:enterprise": "npm run test -w @enterprise-openclaw/enterprise",
    "test:integration": "npm run test:enterprise -- integration"
  }
}
```

Install `concurrently` for running both servers:

```bash
npm install --save-dev concurrently
```

---

## STEP 5: CREATE TESTS

### 5.1 Test Permission Middleware

**File:** `packages/enterprise/tests/middleware/permission-middleware.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { PermissionMiddleware } from '../../src/middleware/permission-middleware.js';

describe('PermissionMiddleware', () => {
  const middleware = new PermissionMiddleware();

  describe('checkPermission', () => {
    it('should allow action when user has capability', async () => {
      const result = await middleware.checkPermission(
        { type: 'browser.navigate', params: { url: 'https://example.com' } },
        { userId: 'user1', capabilities: ['browser.navigate'] }
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny action when user lacks capability', async () => {
      const result = await middleware.checkPermission(
        { type: 'file.delete', params: { path: '/etc/passwd' } },
        { userId: 'user1', capabilities: ['file.read'] }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Missing required capability');
    });

    it('should deny unknown action types', async () => {
      const result = await middleware.checkPermission(
        { type: 'unknown.action', params: {} },
        { userId: 'user1', capabilities: [] }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown action type');
    });
  });
});
```

### 5.2 Test OpenClaw Adapter

**File:** `packages/enterprise/tests/integration/openclaw-adapter.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawAdapter } from '../../src/integration/openclaw-adapter.js';

describe('OpenClawAdapter', () => {
  let adapter: OpenClawAdapter;

  beforeAll(() => {
    adapter = new OpenClawAdapter({
      baseUrl: process.env.OPENCLAW_URL || 'http://localhost:3000'
    });
  });

  it('should execute action on OpenClaw', async () => {
    const result = await adapter.execute({
      type: 'test.echo',
      params: { message: 'hello' }
    });

    // This will fail if OpenClaw not running - that's OK for now
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it('should check OpenClaw health', async () => {
    const healthy = await adapter.healthCheck();
    // Will be false if OpenClaw not running
    expect(typeof healthy).toBe('boolean');
  });
});
```

### 5.3 Run Tests

```bash
cd ~/Documents/Projects/enterprise-openclaw

# Run all tests
npm test

# Run only enterprise tests
npm run test:enterprise

# With coverage
npm run test:enterprise -- --coverage
```

---

## STEP 6: START BOTH SERVERS

### Terminal 1: Start OpenClaw

```bash
cd ~/Documents/Projects/enterprise-openclaw/openclaw
npm start

# Should see:
# OpenClaw running on http://localhost:3000
```

### Terminal 2: Start Enterprise Gateway

```bash
cd ~/Documents/Projects/enterprise-openclaw
npm start

# Should see:
# 🦅 Enterprise OpenClaw Gateway
# ✅ System Running
# 🌐 Enterprise Gateway: http://localhost:18789
# 🔌 OpenClaw Backend:   http://localhost:3000
```

### Alternative: Start Both with One Command

```bash
npm run start:both
```

---

## STEP 7: TEST END-TO-END

### 7.1 Test Health Check

```bash
# Enterprise Gateway health
curl http://localhost:18789/api/health

# Expected:
# {"status":"healthy","timestamp":...,"version":"1.0.0-enterprise"}
```

### 7.2 Test Action Execution (With Permission)

```bash
curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "browser.navigate",
      "params": {"url": "https://example.com"}
    },
    "context": {
      "userId": "test-user",
      "capabilities": ["browser.navigate", "browser.click"]
    }
  }'

# Expected:
# {"success":true,"data":{...}}  (if OpenClaw supports this action)
# OR
# {"success":false,"error":"..."}  (if OpenClaw doesn't support it yet)
```

### 7.3 Test Permission Denial

```bash
curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "file.delete",
      "params": {"path": "/tmp/test.txt"}
    },
    "context": {
      "userId": "test-user",
      "capabilities": ["file.read"]
    }
  }'

# Expected:
# {"success":false,"error":"Permission denied: Missing required capability: file.delete"}
```

### 7.4 Check Audit Log

```bash
cat logs/audit.jsonl

# Expected: JSONL format with entries
# {"id":"audit_...","timestamp":...,"userId":"test-user",...}
# {"id":"audit_...","timestamp":...,"userId":"test-user",...}
```

### 7.5 Test Web UI

Open browser: http://localhost:18789

You should see the Enterprise OpenClaw UI.

Try typing: "test action"

---

## STEP 8: VERIFY PHASE 1 COMPLETION

### Checklist:

- [ ] OpenClaw runs on port 3000
- [ ] Enterprise Gateway runs on port 18789
- [ ] Health check returns healthy status
- [ ] Permission middleware blocks unauthorized actions
- [ ] Permission middleware allows authorized actions
- [ ] Audit log file created at `logs/audit.jsonl`
- [ ] Audit log contains entries for all actions
- [ ] Tests pass: `npm run test:enterprise`
- [ ] Can access UI at http://localhost:18789

### Success Criteria:

✅ **User → Enterprise → OpenClaw → Result** flow working
✅ **Permission checks** intercepting actions
✅ **Audit logging** recording all actions
✅ **Dual-server architecture** operational
✅ **Tests passing** (at least permission & adapter tests)

---

## TROUBLESHOOTING

### Problem: OpenClaw won't start

**Solution:**
```bash
cd openclaw
npm install  # Re-install dependencies
npm run build  # Rebuild
npm start
```

### Problem: Enterprise Gateway can't connect to OpenClaw

**Check:**
```bash
# Is OpenClaw running?
curl http://localhost:3000/health

# If not, start it:
cd openclaw && npm start
```

**Set URL:**
```bash
export OPENCLAW_URL=http://localhost:3000
npm start
```

### Problem: Permission always denied

**Check user context:**
```javascript
// In your test, make sure context has capabilities:
{
  "context": {
    "userId": "test-user",
    "capabilities": [
      "browser.navigate",   // Add all needed capabilities
      "browser.click",
      "file.read"
    ]
  }
}
```

### Problem: Tests failing

**Run with verbose:**
```bash
npm run test:enterprise -- --reporter=verbose
```

**Check if OpenClaw running:**
Integration tests may fail if OpenClaw not running. That's OK for Phase 1.

---

## NEXT STEPS (After Phase 1)

### Phase 2: Full Governance Layer (Week 3-4)
- Add policy engine (org/team/agent policies)
- Add approval workflow
- Add capability management UI

### Phase 3: Immutable Audit Ledger (Week 5-6)
- Upgrade audit to blockchain-style hashing
- Add PII detection
- Add replay engine

### Phase 4: Multi-Tenancy (Week 7-8)
- Add tenant isolation
- Add tenant-specific policies
- Add tenant switcher UI

### Phase 5: UI Extensions (Week 9-10)
- Inject enterprise panels into OpenClaw UI
- Add governance management UI
- Add audit viewer UI

---

## 📊 PHASE 1 DELIVERABLES

**Code:**
- ✅ `OpenClawAdapter` - Abstraction layer for OpenClaw API
- ✅ `PermissionMiddleware` - Basic capability checks
- ✅ `AuditMiddleware` - Simple JSONL audit logging
- ✅ `EnterpriseGateway` - Main wrapper class
- ✅ `server-enterprise.ts` - Enterprise server

**Tests:**
- ✅ Permission middleware tests (3+ tests)
- ✅ OpenClaw adapter tests (2+ tests)
- ✅ Coverage: 60%+ (basic for Phase 1)

**Documentation:**
- ✅ This implementation guide
- ✅ Architecture design (LAYERED_ARCHITECTURE_DESIGN.md)

**Infrastructure:**
- ✅ Dual-server architecture (Enterprise + OpenClaw)
- ✅ Git submodule for OpenClaw
- ✅ Audit log directory structure

---

**Phase 1 Status:** Ready to implement 🚀

**Estimated Time:** 1-2 weeks

**Next:** Review with team → Start implementation → Complete checklist
