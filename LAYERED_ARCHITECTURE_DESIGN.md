# Enterprise OpenClaw: Layered Architecture Design

**Date:** 2026-02-04
**Status:** Architecture Blueprint
**Strategy:** Build enterprise layers ON TOP of original OpenClaw

---

## 🎯 CORE PRINCIPLE: Non-Invasive Enhancement

**Goal:** Add enterprise features as transparent layers without modifying original OpenClaw code.

**Benefit:** When OpenClaw updates, we automatically inherit improvements while our enterprise layers remain untouched.

---

## 📐 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
│  Original OpenClaw UI (untouched) + Enterprise Extensions   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│               ENTERPRISE GOVERNANCE LAYER                    │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Permission   │  │   Policy     │  │  Action         │ │
│  │  Interceptor  │→ │  Engine      │→ │  Validator      │ │
│  └───────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                 AUDIT & OBSERVABILITY LAYER                  │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Immutable    │  │  Decision    │  │  PII            │ │
│  │  Ledger       │  │  Tracer      │  │  Detector       │ │
│  └───────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              ORIGINAL OPENCLAW (BASE LAYER)                  │
│  • Browser automation (Playwright)                           │
│  • Shell command execution                                   │
│  • File operations                                           │
│  • Computer-using agent                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 INTEGRATION STRATEGY

### 1. Proxy Architecture Pattern

**How it works:**
- Enterprise OpenClaw acts as a transparent proxy
- All requests pass through enterprise layers BEFORE reaching OpenClaw
- Responses are augmented with enterprise metadata
- Original OpenClaw never knows about enterprise features

```typescript
// Enterprise Gateway (Proxy)
class EnterpriseGateway {
  private openclawClient: OpenClawClient;
  private governanceLayer: GovernanceLayer;
  private auditLayer: AuditLayer;

  async executeAction(action: Action, context: Context): Promise<Result> {
    // Layer 1: Governance Check
    const permissionResult = await this.governanceLayer.checkPermission(action, context);
    if (!permissionResult.allowed) {
      await this.auditLayer.logDenial(action, permissionResult.reason);
      throw new PermissionDeniedError(permissionResult.reason);
    }

    // Layer 2: Audit - Pre-execution
    const auditId = await this.auditLayer.logActionStart(action, context);

    // Layer 3: Execute on Original OpenClaw (unchanged)
    try {
      const result = await this.openclawClient.execute(action);

      // Layer 4: Audit - Post-execution
      await this.auditLayer.logActionComplete(auditId, result);

      return result;
    } catch (error) {
      await this.auditLayer.logActionFailure(auditId, error);
      throw error;
    }
  }
}
```

---

## 🏗️ LAYER BREAKDOWN

### Layer 1: UI Extension Layer

**Purpose:** Add enterprise UI without modifying original OpenClaw UI

**Implementation:**
```
ui/
├── openclaw-original/          # Git submodule - original OpenClaw UI
├── enterprise-extensions/      # Our enterprise UI extensions
│   ├── governance-panel.html   # Permission & policy management
│   ├── audit-viewer.html       # Audit log viewer
│   ├── tenant-selector.html    # Multi-tenancy switcher
│   └── license-status.html     # License info widget
└── integration/
    └── ui-injector.js          # Injects enterprise UI into original
```

**Technique: UI Injection**
```javascript
// ui-injector.js
(function injectEnterpriseUI() {
  // Wait for original OpenClaw UI to load
  window.addEventListener('DOMContentLoaded', () => {
    // Inject enterprise sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'enterprise-sidebar';
    sidebar.innerHTML = `
      <div class="enterprise-panel">
        <h3>Enterprise Controls</h3>
        <div id="license-status"></div>
        <div id="governance-panel"></div>
        <div id="audit-summary"></div>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Inject enterprise CSS
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/enterprise/styles.css';
    document.head.appendChild(style);

    // Initialize enterprise components
    initializeLicenseStatus();
    initializeGovernancePanel();
    initializeAuditSummary();
  });
})();
```

---

### Layer 2: Governance Middleware Layer

**Purpose:** Intercept all actions for permission/policy validation

**Architecture:**
```typescript
// packages/enterprise/src/middleware/governance-middleware.ts

export class GovernanceMiddleware {
  private permissionEngine: PermissionEngine;
  private policyEngine: PolicyEngine;

  // Intercept ALL actions before they reach OpenClaw
  async intercept(action: Action, context: ExecutionContext): Promise<InterceptResult> {
    // 1. Check if user has capability
    const hasCapability = await this.permissionEngine.checkCapability(
      context.userId,
      action.type // e.g., 'browser.navigate', 'shell.exec', 'file.write'
    );

    if (!hasCapability) {
      return {
        allowed: false,
        reason: `Missing capability: ${action.type}`,
        action: 'deny'
      };
    }

    // 2. Evaluate policies
    const policyResult = await this.policyEngine.evaluate(action, context);

    if (policyResult.decision === 'deny') {
      return {
        allowed: false,
        reason: `Policy violation: ${policyResult.reason}`,
        action: 'deny'
      };
    }

    if (policyResult.decision === 'prompt') {
      return {
        allowed: false,
        reason: 'Requires approval',
        action: 'prompt',
        promptMessage: policyResult.message
      };
    }

    // 3. Check rate limits
    const rateLimitOk = await this.checkRateLimit(context.userId, action.type);
    if (!rateLimitOk) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        action: 'deny'
      };
    }

    // All checks passed
    return {
      allowed: true,
      metadata: {
        evaluatedPolicies: policyResult.policiesChecked,
        timestamp: Date.now()
      }
    };
  }
}
```

**Permission Types:**
```typescript
// Capability taxonomy
enum Capability {
  // Browser capabilities
  BROWSER_NAVIGATE = 'browser.navigate',
  BROWSER_CLICK = 'browser.click',
  BROWSER_TYPE = 'browser.type',
  BROWSER_SCREENSHOT = 'browser.screenshot',
  BROWSER_EXTRACT = 'browser.extract',

  // Shell capabilities
  SHELL_EXEC_READ = 'shell.exec:read-only',
  SHELL_EXEC_WRITE = 'shell.exec:write',
  SHELL_EXEC_NETWORK = 'shell.exec:network',

  // File capabilities
  FILE_READ = 'file.read',
  FILE_WRITE = 'file.write',
  FILE_DELETE = 'file.delete',
  FILE_EXECUTE = 'file.execute',

  // API capabilities
  API_CALL = 'api.call',
  API_CALL_EXTERNAL = 'api.call:external',

  // Knowledge capabilities
  KNOWLEDGE_READ = 'knowledge.read',
  KNOWLEDGE_WRITE = 'knowledge.write'
}
```

---

### Layer 3: Audit & Compliance Layer

**Purpose:** Log every action to immutable ledger

**Architecture:**
```typescript
// packages/enterprise/src/audit/audit-middleware.ts

export class AuditMiddleware {
  private ledger: ImmutableLedger;
  private piiDetector: PIIDetector;

  async logAction(action: Action, context: ExecutionContext, result: ActionResult): Promise<void> {
    // 1. Detect PII in action parameters and result
    const piiInParams = await this.piiDetector.scan(action.params);
    const piiInResult = await this.piiDetector.scan(result.data);

    // 2. Create audit entry
    const entry: AuditEntry = {
      id: generateId(),
      timestamp: Date.now(),

      // Who
      userId: context.userId,
      tenantId: context.tenantId,
      agentId: context.agentId,

      // What
      action: {
        type: action.type,
        params: piiInParams.detected ? piiInParams.redacted : action.params,
        result: piiInResult.detected ? piiInResult.redacted : result.data,
        status: result.status
      },

      // Why
      reasoning: {
        intent: context.intent,
        goal: context.goal,
        llmModel: context.llmModel,
        llmReasoning: context.llmReasoning,
        confidence: context.confidence
      },

      // How
      governance: {
        permissionsChecked: context.permissionsChecked,
        policiesEvaluated: context.policiesEvaluated,
        allowed: context.allowed,
        approvalRequired: context.approvalRequired
      },

      // Privacy
      pii: {
        detected: piiInParams.detected || piiInResult.detected,
        types: [...piiInParams.types, ...piiInResult.types],
        locations: piiInParams.detected ? 'params' : piiInResult.detected ? 'result' : 'none'
      },

      // Signature
      hash: '', // SHA256 hash of entry (for immutability)
      previousHash: '' // Hash of previous entry (blockchain-style)
    };

    // 3. Sign entry with SHA256
    entry.hash = await this.computeHash(entry);
    entry.previousHash = await this.ledger.getLastHash();

    // 4. Append to immutable ledger
    await this.ledger.append(entry);

    // 5. Trigger compliance checks
    if (entry.pii.detected) {
      await this.triggerPIIAlert(entry);
    }
  }
}
```

**Immutable Ledger Storage:**
```typescript
// packages/enterprise/src/audit/immutable-ledger.ts

export class ImmutableLedger {
  private storage: LedgerStorage;

  async append(entry: AuditEntry): Promise<void> {
    // Verify chain integrity
    const lastEntry = await this.storage.getLast();
    if (lastEntry && entry.previousHash !== lastEntry.hash) {
      throw new Error('Ledger chain broken - tampering detected');
    }

    // Append-only write (no updates allowed)
    await this.storage.appendOnly(entry);

    // Optionally: Replicate to S3/Cloud for compliance
    if (this.config.cloudBackup) {
      await this.replicateToCloud(entry);
    }
  }

  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    // Query entries (read-only)
    return this.storage.query(filter);
  }

  async replay(fromTimestamp: number, toTimestamp: number): Promise<ReplayResult> {
    // Replay actions for investigation
    const entries = await this.query({
      timestamp: { gte: fromTimestamp, lte: toTimestamp }
    });

    return {
      entries,
      timeline: this.buildTimeline(entries),
      decisionTree: this.buildDecisionTree(entries)
    };
  }
}
```

---

### Layer 4: Multi-Tenancy Isolation Layer

**Purpose:** Isolate data and actions by tenant

**Architecture:**
```typescript
// packages/enterprise/src/multi-tenant/tenant-middleware.ts

export class TenantMiddleware {
  private tenantStore: TenantStore;

  async isolate(action: Action, context: ExecutionContext): Promise<ExecutionContext> {
    // 1. Resolve tenant from context
    const tenant = await this.tenantStore.getTenant(context.tenantId);

    // 2. Apply tenant-specific constraints
    const constrainedAction = {
      ...action,
      constraints: {
        // File operations limited to tenant directory
        fileBasePath: `/tenants/${tenant.id}/data`,

        // Browser operations limited to tenant domains
        allowedDomains: tenant.config.allowedDomains,

        // Shell commands sandboxed
        shellSandbox: `/tenants/${tenant.id}/sandbox`,

        // API calls rate-limited per tenant
        rateLimit: tenant.limits.apiCallsPerHour
      }
    };

    // 3. Return isolated context
    return {
      ...context,
      action: constrainedAction,
      isolation: {
        tenantId: tenant.id,
        dataPath: `/tenants/${tenant.id}`,
        permissions: tenant.permissions,
        policies: tenant.policies
      }
    };
  }
}
```

**Tenant Data Structure:**
```typescript
interface Tenant {
  id: string;
  name: string;
  orgStructure: {
    org: string;
    teams: string[];
    projects: string[];
  };
  config: {
    allowedDomains: string[];
    allowedCommands: string[];
    dataRetentionDays: number;
  };
  limits: {
    maxConcurrentAgents: number;
    maxTokensPerMonth: number;
    apiCallsPerHour: number;
  };
  permissions: Permission[];
  policies: Policy[];
}
```

---

## 🔗 INTEGRATION WITH ORIGINAL OPENCLAW

### Step 1: Wrap OpenClaw Client

```typescript
// packages/enterprise/src/integration/openclaw-wrapper.ts

export class EnterpriseOpenClawClient {
  private openclawClient: OriginalOpenClawClient;
  private governanceLayer: GovernanceMiddleware;
  private auditLayer: AuditMiddleware;
  private tenantLayer: TenantMiddleware;
  private licenseValidator: LicenseValidator;

  constructor(openclawConfig: OpenClawConfig, enterpriseConfig: EnterpriseConfig) {
    // Initialize original OpenClaw (untouched)
    this.openclawClient = new OriginalOpenClawClient(openclawConfig);

    // Initialize enterprise layers
    this.governanceLayer = new GovernanceMiddleware(enterpriseConfig.governance);
    this.auditLayer = new AuditMiddleware(enterpriseConfig.audit);
    this.tenantLayer = new TenantMiddleware(enterpriseConfig.multiTenant);
    this.licenseValidator = new LicenseValidator(enterpriseConfig.license);
  }

  async execute(action: Action, context: ExecutionContext): Promise<Result> {
    // ============ ENTERPRISE LAYERS (OUR CODE) ============

    // Layer 1: License validation
    const licenseValid = await this.licenseValidator.validate();
    if (!licenseValid.valid) {
      throw new LicenseError('Enterprise features require valid license');
    }

    // Layer 2: Tenant isolation
    const isolatedContext = await this.tenantLayer.isolate(action, context);

    // Layer 3: Governance check
    const governanceResult = await this.governanceLayer.intercept(action, isolatedContext);
    if (!governanceResult.allowed) {
      await this.auditLayer.logDenial(action, isolatedContext, governanceResult.reason);
      throw new PermissionDeniedError(governanceResult.reason);
    }

    // Layer 4: Audit - pre-execution
    const auditId = await this.auditLayer.logStart(action, isolatedContext);

    // ============ ORIGINAL OPENCLAW (UNCHANGED) ============
    try {
      const result = await this.openclawClient.execute(action);

      // ============ ENTERPRISE LAYERS (POST-EXECUTION) ============

      // Layer 5: Audit - post-execution
      await this.auditLayer.logComplete(auditId, action, isolatedContext, result);

      return result;

    } catch (error) {
      // Layer 6: Audit - failure
      await this.auditLayer.logFailure(auditId, action, isolatedContext, error);
      throw error;
    }
  }
}
```

### Step 2: Start Both Systems

```typescript
// server.ts (Enterprise Gateway)

import { EnterpriseOpenClawClient } from './packages/enterprise/src/integration/openclaw-wrapper.js';
import { OriginalOpenClawServer } from 'openclaw'; // From original OpenClaw

async function startEnterpriseGateway() {
  // 1. Start original OpenClaw on its default port (e.g., 3000)
  const openclawServer = new OriginalOpenClawServer({
    port: 3000,
    // ... original config
  });
  await openclawServer.start();
  console.log('✅ Original OpenClaw running on http://localhost:3000');

  // 2. Start Enterprise Gateway on different port (e.g., 18789)
  const enterpriseGateway = new EnterpriseGateway({
    port: 18789,
    openclawUrl: 'http://localhost:3000',
    enterprise: {
      license: { /* ... */ },
      governance: { /* ... */ },
      audit: { /* ... */ },
      multiTenant: { /* ... */ }
    }
  });
  await enterpriseGateway.start();
  console.log('✅ Enterprise Gateway running on http://localhost:18789');

  console.log('');
  console.log('🦅 Enterprise OpenClaw ready!');
  console.log('📝 Users connect to: http://localhost:18789 (Enterprise)');
  console.log('🔒 OpenClaw runs on: http://localhost:3000 (Internal)');
}

startEnterpriseGateway();
```

---

## 📦 PACKAGE STRUCTURE

```
enterprise-openclaw/
├── openclaw/                    # Git submodule - original OpenClaw
│   └── (original OpenClaw code - NEVER MODIFIED)
│
├── packages/
│   ├── core/                    # Open-source wrapper
│   │   └── src/
│   │       └── integration/
│   │           └── openclaw-adapter.ts
│   │
│   └── enterprise/              # Licensed features
│       └── src/
│           ├── middleware/
│           │   ├── governance-middleware.ts
│           │   ├── audit-middleware.ts
│           │   └── tenant-middleware.ts
│           ├── integration/
│           │   └── openclaw-wrapper.ts
│           └── licensing/
│               └── license-validator.ts
│
├── ui/
│   ├── openclaw-original/       # Original OpenClaw UI (submodule)
│   ├── enterprise-extensions/   # Our UI additions
│   └── integration/
│       └── ui-injector.js
│
└── server.ts                    # Enterprise Gateway
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         USER / CLIENT                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 │
┌────────────────▼────────────────────────────────────────────┐
│           ENTERPRISE GATEWAY (Port 18789)                    │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────────────┐ │
│  │ License    │→ │ Governance  │→ │ Audit                │ │
│  │ Validator  │  │ Middleware  │  │ Middleware           │ │
│  └────────────┘  └─────────────┘  └──────────────────────┘ │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP (internal)
                 │
┌────────────────▼────────────────────────────────────────────┐
│         ORIGINAL OPENCLAW (Port 3000)                        │
│  • Browser automation                                        │
│  • Shell execution                                           │
│  • File operations                                           │
│  • (UNCHANGED - direct from OpenClaw repo)                   │
└──────────────────────────────────────────────────────────────┘
```

**Benefits:**
1. **Isolation:** Original OpenClaw runs internally, not exposed to users
2. **Security:** All requests filtered through enterprise layers
3. **Upgrades:** Pull latest OpenClaw, restart, enterprise layers unchanged
4. **Rollback:** If OpenClaw update breaks, rollback OpenClaw, keep enterprise layers

---

## 🔄 UPDATE WORKFLOW

### When OpenClaw Releases New Version:

```bash
# 1. Update OpenClaw submodule
cd openclaw/
git pull origin main
cd ..

# 2. Test compatibility
npm run test:integration

# 3. If tests pass, commit
git add openclaw/
git commit -m "chore: update OpenClaw to v2.5.0"

# 4. Deploy (enterprise layers unchanged)
npm run deploy
```

**Enterprise layers are NOT touched during OpenClaw updates.**

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up layered architecture

**Tasks:**
1. Add OpenClaw as git submodule
2. Create `EnterpriseOpenClawClient` wrapper
3. Implement basic governance middleware (permission checks)
4. Implement basic audit middleware (logging)
5. Create dual-server architecture (Enterprise + OpenClaw)

**Deliverable:** Enterprise gateway proxying to OpenClaw with basic permission checks

---

### Phase 2: Governance Layer (Week 3-4)
**Goal:** Full permission & policy system

**Tasks:**
1. Capability engine (grant/revoke capabilities)
2. Policy engine (org/team/agent policies)
3. Action validator (pre-execution checks)
4. Approval workflow (for prompted actions)

**Deliverable:** Production-ready governance with 50+ tests

---

### Phase 3: Audit Layer (Week 5-6)
**Goal:** Immutable audit ledger

**Tasks:**
1. Immutable ledger with blockchain-style hashing
2. PII detection in action params & results
3. Decision tracer (intent → goal → action → result)
4. Replay engine (replay actions for investigation)

**Deliverable:** SOC 2 ready audit trail with 30+ tests

---

### Phase 4: Multi-Tenancy Layer (Week 7-8)
**Goal:** Tenant isolation

**Tasks:**
1. Tenant store (org → team → project structure)
2. Tenant-specific constraints (file paths, domains, commands)
3. Tenant-specific policies and permissions
4. Tenant-specific audit logs

**Deliverable:** Multi-tenant ready with 20+ tests

---

### Phase 5: UI Extensions (Week 9-10)
**Goal:** Enterprise UI additions

**Tasks:**
1. UI injector (inject enterprise panels into OpenClaw UI)
2. Governance panel (permission & policy management)
3. Audit viewer (query and visualize audit logs)
4. Tenant selector (switch between tenants)
5. License status widget

**Deliverable:** Full enterprise UI integrated with OpenClaw

---

## 📊 SUCCESS CRITERIA

### Technical Metrics:
- ✅ OpenClaw updates without breaking enterprise features
- ✅ <100ms overhead added by enterprise layers
- ✅ 100% action coverage (all actions audited)
- ✅ 80%+ test coverage on enterprise layers
- ✅ Zero security vulnerabilities

### Enterprise Metrics:
- ✅ SOC 2 compliance ready (immutable audit trail)
- ✅ GDPR compliant (PII detection & redaction)
- ✅ Multi-tenant capable (tenant isolation working)
- ✅ All 7 enterprise priorities met (from strategy analysis)

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Enterprise Gateway Security
- All enterprise middleware runs in Node.js process
- No access to original OpenClaw internals
- Communication via HTTP (internal network only)
- TLS for external connections

### 2. Tenant Isolation
- File system sandboxing (chroot-style)
- Domain whitelisting for browser actions
- Shell command sandboxing
- Rate limiting per tenant

### 3. Audit Integrity
- Immutable ledger (blockchain-style hashing)
- Append-only storage
- Tampering detection (verify hash chain)
- Cloud replication for compliance

---

## 💡 ADVANTAGES OF LAYERED APPROACH

### ✅ Advantages:
1. **Zero Code Duplication** - Use 100% of OpenClaw code
2. **Auto-Upgrades** - Pull latest OpenClaw, get new features automatically
3. **Clean Separation** - Enterprise logic isolated, easy to maintain
4. **Rollback Safety** - Rollback OpenClaw without touching enterprise layers
5. **Extensibility** - Add more layers without touching existing code
6. **Testing** - Test enterprise layers independently

### ⚠️ Challenges:
1. **Latency** - Extra HTTP hop adds ~10-20ms
2. **Breaking Changes** - If OpenClaw changes API, need adapter updates
3. **Debugging** - Harder to debug across two processes
4. **Deployment** - Need to deploy two services instead of one

### 🔧 Mitigations:
1. **Latency:** Use HTTP/2, connection pooling, in-memory cache
2. **Breaking Changes:** Pin OpenClaw version, test before upgrading
3. **Debugging:** Distributed tracing with correlation IDs
4. **Deployment:** Docker Compose or Kubernetes for orchestration

---

## 🎬 NEXT STEPS

### Immediate (This Week):
1. ✅ Review and approve architecture
2. ⏳ Add OpenClaw as git submodule
3. ⏳ Create `EnterpriseOpenClawClient` wrapper skeleton
4. ⏳ Implement first middleware (basic permission check)
5. ⏳ Test end-to-end: User → Enterprise → OpenClaw → Result

### Short-term (This Month):
1. Complete Phase 1 (Foundation)
2. Implement governance layer (Phase 2)
3. Create comprehensive tests (80%+ coverage)
4. Document API for developers

### Medium-term (This Quarter):
1. Complete all 5 phases
2. SOC 2 audit preparation
3. First enterprise pilot customer
4. Performance benchmarks

---

**The layered approach turns OpenClaw into a commodity while our enterprise features become the differentiator.** 🦅

---

**Status:** Ready for implementation
**Next:** Review with team → Approve → Start Phase 1
