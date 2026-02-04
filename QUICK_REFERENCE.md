# Enterprise OpenClaw: Quick Reference

**Version:** 1.0.0-layered
**Last Updated:** 2026-02-04

---

## 🏗️ PROJECT STRUCTURE

```
enterprise-openclaw/
├── openclaw/                          # Git submodule - Original OpenClaw
│   └── (original code - NEVER MODIFY)
│
├── packages/
│   ├── core/                          # Open-source (Apache 2.0)
│   │   ├── src/
│   │   │   ├── knowledge-graph/      # Knowledge Graph
│   │   │   ├── rag/                  # Basic RAG
│   │   │   └── integration/          # OpenClaw adapter
│   │   └── tests/
│   │
│   └── enterprise/                    # Licensed
│       ├── src/
│       │   ├── integration/
│       │   │   ├── openclaw-adapter.ts
│       │   │   └── enterprise-gateway.ts
│       │   ├── middleware/
│       │   │   ├── permission-middleware.ts
│       │   │   ├── audit-middleware.ts
│       │   │   └── tenant-middleware.ts
│       │   └── licensing/
│       │       └── license-validator.ts
│       └── tests/
│
├── ui/
│   ├── openclaw-original/             # Original UI (submodule)
│   └── enterprise-extensions/         # Our UI additions
│
├── logs/
│   └── audit.jsonl                    # Audit log
│
├── server-enterprise.ts               # Enterprise Gateway server
└── docs/
    ├── LAYERED_ARCHITECTURE_DESIGN.md
    ├── PHASE1_IMPLEMENTATION_GUIDE.md
    └── STRATEGIC_ALIGNMENT_ANALYSIS.md
```

---

## 🚀 COMMON COMMANDS

### Setup

```bash
# Clone project
git clone <repo-url>
cd enterprise-openclaw

# Add OpenClaw submodule
git submodule add https://github.com/anthropics/openclaw.git openclaw
git submodule update --init --recursive

# Install dependencies
npm install

# Build packages
npm run build
```

### Development

```bash
# Start Enterprise Gateway (port 18789)
npm start

# Start in dev mode (auto-reload)
npm run dev

# Start Original OpenClaw (port 3000)
npm run start:openclaw
# or
cd openclaw && npm start

# Start both servers
npm run start:both
```

### Testing

```bash
# Run all tests
npm test

# Run enterprise tests only
npm run test:enterprise

# Run with coverage
npm run test:enterprise -- --coverage

# Run integration tests
npm run test:integration

# Run specific test file
npm run test:enterprise -- permission-middleware.test.ts

# Watch mode
npm run test:enterprise -- --watch
```

### OpenClaw Management

```bash
# Update OpenClaw to latest
cd openclaw
git pull origin main
cd ..
git add openclaw
git commit -m "chore: update OpenClaw to latest"

# Check OpenClaw version
cd openclaw && git log -1 --oneline

# Build OpenClaw after update
cd openclaw && npm run build
```

---

## 🔌 API ENDPOINTS

### Enterprise Gateway (Port 18789)

#### Health Check
```bash
curl http://localhost:18789/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1706918400000,
  "version": "1.0.0-enterprise",
  "components": {
    "gateway": "ready",
    "openclaw": "ready"
  }
}
```

#### Execute Action (with Governance)
```bash
curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "browser.navigate",
      "params": {"url": "https://example.com"}
    },
    "context": {
      "userId": "user123",
      "tenantId": "tenant1",
      "capabilities": [
        "browser.navigate",
        "browser.click"
      ]
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": 1706918400000,
    "latency": "120ms"
  }
}
```

#### Execute Action (Permission Denied)
```bash
curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "type": "file.delete",
      "params": {"path": "/important.txt"}
    },
    "context": {
      "userId": "user123",
      "capabilities": ["file.read"]
    }
  }'
```

Response:
```json
{
  "success": false,
  "error": "Permission denied: Missing required capability: file.delete"
}
```

#### Chat Endpoint
```bash
curl -X POST http://localhost:18789/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you do?"}'
```

---

## 🔐 CAPABILITIES REFERENCE

### Browser Capabilities
- `browser.navigate` - Navigate to URLs
- `browser.click` - Click elements
- `browser.type` - Type into inputs
- `browser.screenshot` - Take screenshots
- `browser.extract` - Extract page content

### Shell Capabilities
- `shell.exec` - Execute any shell command
- `shell.exec:read-only` - Read-only commands (ls, cat, etc.)
- `shell.exec:write` - Write commands (touch, mkdir, etc.)
- `shell.exec:network` - Network commands (curl, wget, etc.)

### File Capabilities
- `file.read` - Read files
- `file.write` - Write files
- `file.delete` - Delete files
- `file.execute` - Execute files

### API Capabilities
- `api.call` - Call internal APIs
- `api.call:external` - Call external APIs

### Knowledge Capabilities
- `knowledge.read` - Query knowledge graph
- `knowledge.write` - Add to knowledge graph

---

## 📝 AUDIT LOG REFERENCE

### Audit Log Location
```bash
./logs/audit.jsonl
```

### Audit Entry Format (JSONL)
```json
{
  "id": "audit_1706918400000_abc123",
  "timestamp": 1706918400000,
  "userId": "user123",
  "tenantId": "tenant1",
  "action": {
    "type": "browser.navigate",
    "params": {"url": "https://example.com"}
  },
  "result": {
    "success": true
  },
  "permission": {
    "allowed": true,
    "requiredCapability": "browser.navigate"
  }
}
```

### Query Audit Log
```bash
# View all entries
cat logs/audit.jsonl

# View last 10 entries
tail -10 logs/audit.jsonl

# Filter by user
grep '"userId":"user123"' logs/audit.jsonl

# Filter by action type
grep '"type":"browser.navigate"' logs/audit.jsonl

# Count total actions
wc -l logs/audit.jsonl

# Count by user
grep -o '"userId":"[^"]*"' logs/audit.jsonl | sort | uniq -c
```

---

## 🧪 TESTING PATTERNS

### Test Permission Check
```typescript
import { describe, it, expect } from 'vitest';
import { PermissionMiddleware } from '../../src/middleware/permission-middleware.js';

describe('PermissionMiddleware', () => {
  const middleware = new PermissionMiddleware();

  it('should allow action when user has capability', async () => {
    const result = await middleware.checkPermission(
      { type: 'browser.navigate', params: { url: 'https://example.com' } },
      { userId: 'user1', capabilities: ['browser.navigate'] }
    );

    expect(result.allowed).toBe(true);
  });
});
```

### Test OpenClaw Integration
```typescript
import { OpenClawAdapter } from '../../src/integration/openclaw-adapter.js';

describe('OpenClawAdapter', () => {
  let adapter: OpenClawAdapter;

  beforeAll(() => {
    adapter = new OpenClawAdapter({
      baseUrl: 'http://localhost:3000'
    });
  });

  it('should execute action on OpenClaw', async () => {
    const result = await adapter.execute({
      type: 'test.echo',
      params: { message: 'hello' }
    });

    expect(result.success).toBeDefined();
  });
});
```

### Test Enterprise Gateway
```typescript
import { EnterpriseGateway } from '../../src/integration/enterprise-gateway.js';

describe('EnterpriseGateway', () => {
  let gateway: EnterpriseGateway;

  beforeAll(async () => {
    gateway = new EnterpriseGateway({
      openclaw: { baseUrl: 'http://localhost:3000' },
      license: { publicKeyPath: './test/keys/public_key.pem' },
      audit: { logPath: './test/audit.jsonl' }
    });
    await gateway.initialize();
  });

  it('should deny action without permission', async () => {
    const result = await gateway.execute(
      { type: 'file.delete', params: { path: '/test.txt' } },
      { userId: 'user1', capabilities: ['file.read'] }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission denied');
  });
});
```

---

## 🔧 ENVIRONMENT VARIABLES

```bash
# Enterprise Gateway
export ENTERPRISE_PORT=18789
export OPENCLAW_URL=http://localhost:3000

# License
export LICENSE_PUBLIC_KEY_PATH=./keys/public_key.pem
export ENTERPRISE_LICENSE_KEY="eyJhbGc..."

# Audit
export AUDIT_LOG_PATH=./logs/audit.jsonl

# Development
export NODE_ENV=development
export LOG_LEVEL=debug
```

---

## 🐛 DEBUGGING

### Check if OpenClaw is Running
```bash
# Test health endpoint
curl http://localhost:3000/health

# Check process
ps aux | grep openclaw

# Check port
lsof -i :3000
```

### Check if Enterprise Gateway is Running
```bash
# Test health endpoint
curl http://localhost:18789/api/health

# Check process
ps aux | grep server-enterprise

# Check port
lsof -i :18789
```

### View Real-time Logs
```bash
# Enterprise Gateway logs (if using pino)
npm start | pino-pretty

# Audit log (real-time)
tail -f logs/audit.jsonl | jq '.'
```

### Debug Permission Issues
```bash
# Test with full capabilities
curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": {"type": "browser.navigate", "params": {"url": "https://example.com"}},
    "context": {
      "userId": "admin",
      "capabilities": [
        "browser.navigate", "browser.click", "browser.type",
        "shell.exec", "file.read", "file.write", "api.call"
      ]
    }
  }'
```

### Debug OpenClaw Connection
```bash
# Direct test to OpenClaw
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"type":"test.echo","params":{"message":"hello"}}'
```

---

## 📊 PERFORMANCE MONITORING

### Check Latency
```bash
# Time a request
time curl -X POST http://localhost:18789/api/execute \
  -H "Content-Type: application/json" \
  -d '{"action":{"type":"browser.navigate","params":{"url":"https://example.com"}},"context":{"userId":"user1","capabilities":["browser.navigate"]}}'
```

### Analyze Audit Log Performance
```bash
# Average actions per second
total=$(wc -l < logs/audit.jsonl)
duration=$(($(date +%s) - $(head -1 logs/audit.jsonl | jq '.timestamp/1000')))
echo "Actions/sec: $((total / duration))"

# Most common actions
grep -o '"type":"[^"]*"' logs/audit.jsonl | sort | uniq -c | sort -rn
```

---

## 🔄 UPDATE WORKFLOW

### Update OpenClaw
```bash
# 1. Pull latest OpenClaw
cd openclaw
git pull origin main
cd ..

# 2. Test compatibility
npm run test:integration

# 3. If tests pass, commit
git add openclaw
git commit -m "chore: update OpenClaw to v2.5.0"

# 4. Rebuild
cd openclaw && npm run build

# 5. Restart servers
npm run start:both
```

### Update Enterprise Layers
```bash
# 1. Make changes to enterprise code
# Edit packages/enterprise/src/**

# 2. Run tests
npm run test:enterprise

# 3. Build
npm run build

# 4. Restart enterprise gateway
npm start
```

---

## 📚 DOCUMENTATION LINKS

- **LAYERED_ARCHITECTURE_DESIGN.md** - Full architecture explanation
- **PHASE1_IMPLEMENTATION_GUIDE.md** - Step-by-step setup
- **STRATEGIC_ALIGNMENT_ANALYSIS.md** - Why this works
- **LAYERED_ARCHITECTURE_SUMMARY.md** - Executive summary
- **ENTERPRISE_STRATEGY_ANALYSIS.md** - Original strategy

---

## 🆘 COMMON ISSUES

### Issue: "OpenClaw connection failed"
**Fix:**
```bash
# Start OpenClaw first
cd openclaw && npm start

# Then start enterprise gateway
npm start
```

### Issue: "Permission denied" for all actions
**Fix:** Make sure context includes required capabilities:
```json
{
  "context": {
    "userId": "user1",
    "capabilities": ["browser.navigate", "file.read", ...]
  }
}
```

### Issue: Audit log not created
**Fix:**
```bash
# Create logs directory
mkdir -p logs

# Check permissions
ls -la logs/

# Manually create if needed
touch logs/audit.jsonl
```

### Issue: Tests failing
**Fix:**
```bash
# Rebuild packages
npm run build

# Clear cache
rm -rf node_modules/.vite

# Re-run tests
npm test
```

---

## 🎯 QUICK WINS

### Day 1: Get It Running
```bash
git submodule add <openclaw-url> openclaw
cd openclaw && npm install && npm run build && npm start &
cd .. && npm start
```

### Day 2: Test End-to-End
```bash
curl http://localhost:18789/api/health
curl -X POST http://localhost:18789/api/execute -d '...'
cat logs/audit.jsonl
```

### Week 1: Complete Phase 1
- [ ] OpenClaw integrated
- [ ] Permission middleware working
- [ ] Audit logging working
- [ ] Tests passing

---

**Keep this reference handy during implementation!** 🦅
