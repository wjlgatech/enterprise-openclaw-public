# Enterprise OpenClaw UI Integration Guide

## Architecture Overview

```
┌─────────────────────────┐
│  Original OpenClaw UI   │
│   (Port 18789)          │
│   clawdbot-app          │
└────────┬────────────────┘
         │ API Calls
         ↓
┌─────────────────────────┐
│  Enterprise Gateway     │  ← Add governance layers
│   (Port 19000)          │     - Permission checks
│   API-only server       │     - Audit logging
└────────┬────────────────┘     - License validation
         │ Proxy
         ↓
┌─────────────────────────┐
│  Original OpenClaw      │
│   Backend Logic         │
│   Knowledge Graph       │
└─────────────────────────┘
```

## Integration Options

### Option 1: Unified Server (RECOMMENDED)

Modify `server-enterprise.ts` to **serve the UI** and **handle governance**:

```typescript
// server-enterprise.ts
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { EnterpriseGateway } from './packages/enterprise/src/integration/enterprise-gateway.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.ENTERPRISE_PORT || 19000;

// Middleware
app.use(express.json());

// ✨ NEW: Serve original OpenClaw UI
app.use(express.static(join(__dirname, 'public')));

// Initialize Enterprise Gateway
const gateway = new EnterpriseGateway({
  openclawUrl: 'http://localhost:18789', // Proxy to original OpenClaw backend
  auditLogPath: './logs/audit.jsonl'
});

await gateway.initialize();

// ✨ NEW: Enterprise Chat Endpoint (with governance)
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Get user context (from session/JWT in production)
  const userContext = {
    userId: req.headers['x-user-id'] || 'default-user',
    capabilities: req.headers['x-capabilities']?.split(',') || ['file.read', 'browser.navigate']
  };

  // Execute with governance
  const result = await gateway.execute({
    type: 'chat.send',
    params: { message }
  }, userContext);

  res.json(result);
});

// Health endpoint
app.get('/api/health', async (req, res) => {
  const health = await gateway.getHealth();
  res.json(health);
});

app.listen(port, () => {
  console.log(`🦅 Enterprise OpenClaw (Unified)`);
  console.log(`🌐 http://localhost:${port}`);
  console.log(`✅ UI + Governance layers integrated`);
});
```

**Benefits:**
- Single server (port 19000)
- All requests go through governance
- Original OpenClaw backend (port 18789) becomes internal-only
- Zero UI changes needed

**Deploy:**
```bash
# Stop old servers
pkill -f "tsx server.ts"
pkill -f "tsx server-enterprise.ts"

# Start unified server
tsx server-enterprise.ts

# Access at http://localhost:19000
```

---

### Option 2: Reverse Proxy with Nginx

Keep both servers, add Nginx to route requests:

```nginx
# /etc/nginx/nginx.conf

upstream openclaw_backend {
    server localhost:18789;
}

upstream enterprise_gateway {
    server localhost:19000;
}

server {
    listen 80;
    server_name localhost;

    # Serve UI from original OpenClaw
    location / {
        proxy_pass http://openclaw_backend;
    }

    # Route API calls through Enterprise Gateway
    location /api/ {
        proxy_pass http://enterprise_gateway;
    }
}
```

---

### Option 3: Client-Side Configuration

Add configuration to UI to use Enterprise Gateway:

```javascript
// public/config.js (NEW FILE)
window.OPENCLAW_CONFIG = {
  apiBaseUrl: 'http://localhost:19000', // Enterprise Gateway
  wsUrl: 'ws://localhost:19000',
  enableGovernance: true
};
```

Update UI to use config:
```javascript
// In public/index.html or UI code
const API_BASE = window.OPENCLAW_CONFIG?.apiBaseUrl || 'http://localhost:18789';

async function sendChatMessage(input) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getCurrentUserId(),
      'X-Capabilities': getUserCapabilities().join(',')
    },
    body: JSON.stringify({ message: input })
  });
  return response.json();
}
```

---

## What Happens with Integration

### Before (Direct Connection):
```
User Input → UI → Original OpenClaw → Response
❌ No permission checks
❌ No audit logging
❌ No governance
```

### After (Through Enterprise Gateway):
```
User Input → UI → Enterprise Gateway → Original OpenClaw → Response
                     ↓
                  ✅ Permission check (file.delete blocked for guests)
                  ✅ Audit log (every action logged)
                  ✅ License validation
                  ✅ Rate limiting
```

---

## Testing Integration

### Step 1: Start Unified Server
```bash
ENTERPRISE_PORT=19000 tsx server-enterprise.ts
```

### Step 2: Access UI
```bash
open http://localhost:19000
```

### Step 3: Send Chat Message
```javascript
// In browser console
fetch('http://localhost:19000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'test-user',
    'X-Capabilities': 'file.read,browser.navigate'
  },
  body: JSON.stringify({ message: 'help me configure Claude API' })
}).then(r => r.json()).then(console.log);
```

### Step 4: Verify Audit Log
```bash
cat logs/audit.jsonl | tail -5 | jq '.'
```

Expected: Chat message logged with user, permissions, result

---

## Next Steps

1. **Implement Option 1** (Unified Server) - Easiest, cleanest
2. **Add user authentication** to populate userContext
3. **Add enterprise UI components** (see UI_COMPONENTS_GUIDE.md)
4. **Test all existing UI features** with governance enabled

---

## Current State

- ✅ Original OpenClaw UI: http://localhost:18789
- ✅ Enterprise Gateway API: http://localhost:19000
- ⏳ Integration: Need to implement Option 1, 2, or 3
- ⏳ Enterprise UI components: Next step

**Recommended:** Start with Option 1 (Unified Server)
