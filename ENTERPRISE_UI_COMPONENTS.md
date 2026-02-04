# Enterprise UI Components Guide

## Overview

Add enterprise governance features to the **existing OpenClaw UI** without modifying the original UI code. Use **overlay components** and **API interception**.

---

## 3 Enterprise UI Components to Add

### 1. 🛡️ Permission Badge (Shows Current User Capabilities)

**Where:** Top-right header next to model selector

**What it shows:**
- Current user ID
- Granted capabilities (green badges)
- Denied capabilities (red badges with lock icon)

**Implementation:**

```html
<!-- Add to public/index.html after header-right div -->
<div class="enterprise-permission-badge" id="enterprisePermissions">
  <div class="permission-user">
    <span class="permission-icon">👤</span>
    <span class="permission-userId">default-user</span>
  </div>
  <div class="permission-capabilities">
    <span class="capability granted">file.read</span>
    <span class="capability granted">browser.navigate</span>
    <span class="capability denied">🔒 file.delete</span>
  </div>
</div>
```

**Styles:**
```css
.enterprise-permission-badge {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px;
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  font-size: 13px;
}

.permission-user {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
}

.permission-capabilities {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.capability {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.capability.granted {
  background: #1a3a1a;
  color: #22c55e;
  border: 1px solid #2d5a2d;
}

.capability.denied {
  background: #3a1a1a;
  color: #ef4444;
  border: 1px solid #5a2d2d;
}
```

**JavaScript (Auto-fetch from API):**
```javascript
// Add to public/index.html <script> section

async function updatePermissionBadge() {
  try {
    // Get current user context (from localStorage or JWT)
    const userId = localStorage.getItem('userId') || 'default-user';
    const capabilities = localStorage.getItem('capabilities')?.split(',') ||
                         ['file.read', 'browser.navigate', 'api.call'];

    // Update UI
    document.querySelector('.permission-userId').textContent = userId;

    const capContainer = document.querySelector('.permission-capabilities');
    capContainer.innerHTML = '';

    // Show granted capabilities
    capabilities.forEach(cap => {
      const badge = document.createElement('span');
      badge.className = 'capability granted';
      badge.textContent = cap;
      capContainer.appendChild(badge);
    });

    // Show example denied capabilities
    ['file.delete', 'shell.exec'].forEach(cap => {
      if (!capabilities.includes(cap)) {
        const badge = document.createElement('span');
        badge.className = 'capability denied';
        badge.textContent = `🔒 ${cap}`;
        capContainer.appendChild(badge);
      }
    });

  } catch (error) {
    console.error('Failed to update permissions:', error);
  }
}

// Update on load
updatePermissionBadge();
```

---

### 2. 📊 Audit Log Viewer (Real-time Action Log)

**Where:** New sidebar tab "Audit Log"

**What it shows:**
- Last 50 actions
- Timestamp, user, action type, result
- Color-coded: green (allowed), red (denied)
- Filter by user, action type, result

**Implementation:**

```html
<!-- Add new nav item in sidebar -->
<div class="nav-item" data-view="audit">
  <span class="nav-icon">📋</span>
  <span>Audit Log</span>
</div>

<!-- Add new view after dashboardView -->
<div id="auditView" class="content hidden">
  <div class="audit-header">
    <h2>Audit Log</h2>
    <div class="audit-filters">
      <select id="auditUserFilter">
        <option value="">All Users</option>
      </select>
      <select id="auditActionFilter">
        <option value="">All Actions</option>
      </select>
      <select id="auditResultFilter">
        <option value="">All Results</option>
        <option value="allowed">Allowed</option>
        <option value="denied">Denied</option>
      </select>
      <button id="auditRefresh">Refresh</button>
    </div>
  </div>
  <div class="audit-table" id="auditTable"></div>
</div>
```

**Styles:**
```css
.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.audit-header h2 {
  font-size: 24px;
  font-weight: 600;
}

.audit-filters {
  display: flex;
  gap: 12px;
}

.audit-filters select,
.audit-filters button {
  padding: 8px 16px;
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  color: #e5e5e5;
  font-size: 14px;
  cursor: pointer;
}

.audit-table {
  background: #171717;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
}

.audit-entry {
  display: grid;
  grid-template-columns: 180px 120px 200px 1fr 120px;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #2a2a2a;
  align-items: center;
  font-size: 13px;
}

.audit-entry:hover {
  background: #1f1f1f;
}

.audit-time {
  color: #6b7280;
}

.audit-user {
  color: #9ca3af;
  font-weight: 600;
}

.audit-action {
  font-family: 'Monaco', monospace;
  color: #a5d6ff;
}

.audit-result {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  text-align: center;
}

.audit-result.allowed {
  background: #1a3a1a;
  color: #22c55e;
}

.audit-result.denied {
  background: #3a1a1a;
  color: #ef4444;
}
```

**JavaScript (Fetch from API):**
```javascript
// Add to public/index.html <script> section

async function loadAuditLog() {
  try {
    // Fetch audit log from Enterprise Gateway
    const response = await fetch('/api/audit/recent?limit=50');
    const entries = await response.json();

    const auditTable = document.getElementById('auditTable');
    auditTable.innerHTML = '';

    entries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'audit-entry';

      const time = new Date(entry.timestamp).toLocaleString();
      const result = entry.permission.allowed ? 'allowed' : 'denied';

      row.innerHTML = `
        <div class="audit-time">${time}</div>
        <div class="audit-user">${entry.userId}</div>
        <div class="audit-action">${entry.action.type}</div>
        <div class="audit-params">${JSON.stringify(entry.action.params || {}).substring(0, 50)}</div>
        <div class="audit-result ${result}">${result.toUpperCase()}</div>
      `;

      auditTable.appendChild(row);
    });

  } catch (error) {
    console.error('Failed to load audit log:', error);
  }
}

// Navigation handler for audit view
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const view = item.dataset.view;
    if (view === 'audit') {
      document.getElementById('auditView').classList.remove('hidden');
      document.getElementById('chatView').classList.add('hidden');
      document.getElementById('dashboardView').classList.add('hidden');
      loadAuditLog();
    }
  });
});

// Auto-refresh audit log every 10 seconds
setInterval(() => {
  if (!document.getElementById('auditView').classList.contains('hidden')) {
    loadAuditLog();
  }
}, 10000);
```

---

### 3. 🚨 Permission Denial Alert (Inline Error Messages)

**Where:** Overlay when action is denied

**What it shows:**
- Clear error message
- Which capability was missing
- How to request access

**Implementation:**

```html
<!-- Add modal overlay to body -->
<div id="permissionDenialModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <span class="modal-icon">🚨</span>
      <h3>Permission Denied</h3>
    </div>
    <div class="modal-body">
      <p id="denialMessage"></p>
      <div class="denied-capability">
        <strong>Missing capability:</strong>
        <code id="denialCapability"></code>
      </div>
      <p class="denial-help">
        Contact your administrator to request access to this feature.
      </p>
    </div>
    <div class="modal-actions">
      <button class="modal-btn-secondary" onclick="closePermissionDenialModal()">Close</button>
      <button class="modal-btn-primary" onclick="requestAccess()">Request Access</button>
    </div>
  </div>
</div>
```

**Styles:**
```css
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: #171717;
  border: 1px solid #2a2a2a;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.modal-icon {
  font-size: 32px;
}

.modal-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #ef4444;
}

.modal-body {
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 24px;
}

.denied-capability {
  margin: 16px 0;
  padding: 16px;
  background: #3a1a1a;
  border: 1px solid #5a2d2d;
  border-radius: 8px;
}

.denied-capability code {
  color: #ef4444;
  font-weight: 600;
}

.denial-help {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn-secondary,
.modal-btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn-secondary {
  background: #2a2a2a;
  color: #e5e5e5;
}

.modal-btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.modal-btn-secondary:hover {
  background: #3a3a3a;
}

.modal-btn-primary:hover {
  transform: scale(1.05);
}
```

**JavaScript (Auto-detect permission denials):**
```javascript
// Intercept fetch to detect permission denials
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);

  // Clone response to read body
  const clone = response.clone();
  try {
    const data = await clone.json();

    // Check if permission denied
    if (data.error && data.error.includes('Permission denied')) {
      showPermissionDenialModal(data.error);
    }
  } catch (e) {
    // Not JSON, ignore
  }

  return response;
};

function showPermissionDenialModal(errorMessage) {
  const modal = document.getElementById('permissionDenialModal');
  const messageEl = document.getElementById('denialMessage');
  const capabilityEl = document.getElementById('denialCapability');

  // Extract capability from error message
  const match = errorMessage.match(/Missing required capability: (.+)/);
  const capability = match ? match[1] : 'unknown';

  messageEl.textContent = errorMessage;
  capabilityEl.textContent = capability;

  modal.classList.remove('hidden');
}

function closePermissionDenialModal() {
  document.getElementById('permissionDenialModal').classList.add('hidden');
}

function requestAccess() {
  const capability = document.getElementById('denialCapability').textContent;
  alert(`Access request for "${capability}" sent to administrator`);
  closePermissionDenialModal();
}
```

---

## Implementation Checklist

### Step 1: Update server-enterprise.ts
- [ ] Add `app.use(express.static('public'))` to serve UI
- [ ] Add `/api/audit/recent` endpoint to fetch audit log
- [ ] Add user context headers to all API calls

### Step 2: Add Enterprise Styles
- [ ] Create `public/enterprise-ui.css` with all styles above
- [ ] Link in `public/index.html`: `<link rel="stylesheet" href="enterprise-ui.css">`

### Step 3: Add Enterprise Components HTML
- [ ] Add permission badge to header
- [ ] Add audit view section
- [ ] Add permission denial modal

### Step 4: Add Enterprise JavaScript
- [ ] Add `updatePermissionBadge()` function
- [ ] Add `loadAuditLog()` function
- [ ] Add fetch interceptor for permission denials
- [ ] Wire up navigation for audit view

### Step 5: Test
- [ ] Load UI at http://localhost:19000
- [ ] Verify permission badge shows correct capabilities
- [ ] Try action that gets denied (e.g., file.delete)
- [ ] Verify modal appears with clear error
- [ ] Navigate to Audit Log view
- [ ] Verify recent actions appear with color coding

---

## Before/After Screenshots

### Before (Original OpenClaw UI):
```
┌──────────────────────────────────────┐
│ 🦅 Enterprise OpenClaw    [Model ▼] │  ← No permission visibility
├──────────────────────────────────────┤
│                                      │
│  Chat messages here...               │
│                                      │
│  [User tries file.delete]            │
│  → Generic error message             │  ← Unhelpful error
│                                      │
└──────────────────────────────────────┘
❌ No way to see what you can/can't do
❌ No audit trail visible
❌ Errors are unclear
```

### After (Enterprise OpenClaw UI):
```
┌──────────────────────────────────────────────────────────────┐
│ 🦅 Enterprise OpenClaw  │ 👤 alice │ ✅ file.read ✅ browser │  ← Permission badge
│                         │          │ 🔒 file.delete         │
├──────────────────────────────────────────────────────────────┤
│ 💬 New Task  📊 Dashboard  📋 Audit Log  🤖 Agents          │  ← New Audit tab
├──────────────────────────────────────────────────────────────┤
│  Chat messages here...                                       │
│                                                              │
│  [User tries file.delete]                                   │
│  → 🚨 Modal appears:                                        │  ← Clear modal
│     "Permission Denied: Missing capability: file.delete"    │
│     [Request Access]                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
✅ Clear permission visibility
✅ Real-time audit log
✅ Helpful error modals
```

---

## API Requirements

Enterprise Gateway needs these endpoints:

### GET /api/audit/recent
```json
{
  "entries": [
    {
      "id": "audit_123",
      "timestamp": 1770196467186,
      "userId": "alice",
      "action": { "type": "file.delete", "params": {...} },
      "result": { "success": false },
      "permission": { "allowed": false, "reason": "Missing capability: file.delete" }
    }
  ]
}
```

### GET /api/user/capabilities
```json
{
  "userId": "alice",
  "capabilities": ["file.read", "browser.navigate", "api.call"]
}
```

---

## Next Steps

1. **Implement unified server** (UI_INTEGRATION_GUIDE.md Option 1)
2. **Add these 3 UI components** (this guide)
3. **Test with real users**
4. **Iterate based on feedback**

**All components are additive** - they don't modify the original OpenClaw UI code, just overlay new enterprise features! 🦅
