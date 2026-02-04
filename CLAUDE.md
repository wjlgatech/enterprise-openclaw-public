# Claude Code Operational Principles

## Core Philosophy: Reality-First Engineering

**No Mock Data. No Fake Processes. No Idealization.**

This document defines how Claude Code operates when building Enterprise OpenClaw and all future systems.

---

## 🎯 The Three Pillars

### 1. Don't Believe Claims - Verify Implementation

**Principle:** Never trust what documentation or comments say. Always look at the actual code.

**Example:**
```javascript
// ❌ WRONG: Trusting the comment
// This endpoint calls Claude API
app.post('/api/chat', async (req, res) => {
  res.json({ response: "Hello!" }); // Actually fake!
});

// ✅ RIGHT: Verify implementation
app.post('/api/chat', async (req, res) => {
  const response = await anthropic.messages.create({...}); // Real API call
  res.json({ response: response.content[0].text });
});
```

**Action Items:**
- ✅ Read the actual implementation code
- ✅ Trace function calls to their source
- ✅ Verify external API calls are real
- ✅ Check database queries execute
- ❌ Don't trust README claims without code review
- ❌ Don't assume tests mean real functionality

---

### 2. Don't Trust Implementation - Examine Outcomes

**Principle:** Code that looks correct might still produce fake results. Always test with real data.

**Example:**
```javascript
// ❌ WRONG: Code looks good but returns fake data
async function loadTasks() {
  const data = await fetch('/api/tasks').then(r => r.json());
  // Returns: { tasks: 0, status: 'healthy' } - hardcoded!
  return data;
}

// ✅ RIGHT: Verify the actual data returned
async function loadTasks() {
  const data = await fetch('/api/audit/recent').then(r => r.json());
  // Returns: { entries: [...19 real entries...] } - from real audit.jsonl file
  return data.entries.length; // Real count: 19
}
```

**Action Items:**
- ✅ Run the code and inspect actual output
- ✅ Test with real databases, files, APIs
- ✅ Verify data comes from real sources
- ✅ Check timestamps, IDs are unique and real
- ❌ Don't trust mock data in tests
- ❌ Don't assume sample responses are real

---

### 3. Don't Look at Metrics Alone - Understand Changes

**Principle:** Metrics can lie. Always understand what actually changed and why.

**Example:**
```javascript
// ❌ WRONG: Metric shows improvement but is fake
console.log('Success rate: 100%'); // Hardcoded
console.log('Latency: 2ms');       // Fake

// ✅ RIGHT: Calculate from real before/after measurements
const before = await measureLatency(oldSystem);
const after = await measureLatency(newSystem);
console.log(`Latency: ${before}ms → ${after}ms (${((after-before)/before*100).toFixed(1)}% change)`);
```

**Action Items:**
- ✅ Measure actual before state (baseline)
- ✅ Measure actual after state (current)
- ✅ Calculate and explain the delta
- ✅ Understand WHY metrics changed
- ✅ Test in real conditions (not lab)
- ❌ Don't report metrics without context
- ❌ Don't use sample/demo numbers

---

## 🚫 Banned Practices

### Absolutely Never Do This:

1. **Mock/Fake API Responses**
   ```javascript
   // ❌ BANNED
   app.post('/api/chat', (req, res) => {
     res.json({ response: "I'm Claude!" }); // Fake!
   });

   // ✅ REQUIRED
   app.post('/api/chat', async (req, res) => {
     const response = await anthropic.messages.create({...}); // Real LLM
     res.json({ response: response.content[0].text });
   });
   ```

2. **Hardcoded Placeholder Data**
   ```javascript
   // ❌ BANNED
   document.getElementById('totalTasks').textContent = '0'; // Fake!

   // ✅ REQUIRED
   const audit = await fetch('/api/audit/recent').then(r => r.json());
   document.getElementById('totalTasks').textContent = audit.entries.length;
   ```

3. **Sample/Demo Metrics**
   ```javascript
   // ❌ BANNED
   console.log('Performance: 50x faster'); // No data!

   // ✅ REQUIRED
   console.log(`Performance: ${beforeMs}ms → ${afterMs}ms (${improvement}x faster)`);
   ```

4. **"Hello World" Responses**
   ```javascript
   // ❌ BANNED
   return "Hello! I'm a chatbot."; // Not a real LLM

   // ✅ REQUIRED
   return await callRealLLM(userMessage); // Actual API call
   ```

5. **Simulated Delays**
   ```javascript
   // ❌ BANNED
   await sleep(1000); // Fake latency
   return mockData;

   // ✅ REQUIRED
   return await realDatabaseQuery(); // Real latency measured
   ```

---

## ✅ Required Practices

### Always Do This:

1. **Use Real External Services**
   - ✅ Real LLM APIs (Anthropic, OpenAI, Kimi)
   - ✅ Real databases (PostgreSQL, MongoDB, SQLite)
   - ✅ Real file systems (read/write actual files)
   - ✅ Real network calls (HTTP, WebSocket)

2. **Load Real Data**
   - ✅ Read from actual files (`logs/audit.jsonl`)
   - ✅ Query real databases
   - ✅ Fetch from real APIs
   - ✅ Use environment variables for config

3. **Test with Real Scenarios**
   - ✅ Real user inputs (not "hello world")
   - ✅ Real error conditions (network failures)
   - ✅ Real concurrency (multiple users)
   - ✅ Real data volumes (not 10 rows, thousands)

4. **Measure Real Impact**
   - ✅ Before/after comparisons
   - ✅ Actual latency measurements
   - ✅ Real error rates
   - ✅ Actual cost calculations

5. **Document Real Results**
   - ✅ Include actual test outputs
   - ✅ Show real API responses
   - ✅ Provide real screenshots
   - ✅ Share real metrics with context

---

## 🔍 Verification Checklist

Before claiming anything works, verify:

### Code Level:
- [ ] Does this call a real external service? (No mocks)
- [ ] Does this read from a real data source? (No hardcoded arrays)
- [ ] Are all responses dynamically generated? (No templates)
- [ ] Is error handling based on real errors? (Not simulated)

### Data Level:
- [ ] Is the data coming from a real file/database?
- [ ] Are timestamps real and recent?
- [ ] Are IDs unique and generated?
- [ ] Does data change when inputs change?

### Behavior Level:
- [ ] Does it actually call the LLM API?
- [ ] Does it actually write to logs/database?
- [ ] Does it actually enforce permissions?
- [ ] Does it actually measure real latency?

### Outcome Level:
- [ ] Can I see the actual API call in network logs?
- [ ] Can I see the actual file on disk?
- [ ] Can I see the actual database record?
- [ ] Does the metric reflect real measurement?

---

## 📊 Real-World Example: Phase 1 Enterprise OpenClaw

### What We Did WRONG Initially:

1. **Mock Chat Responses** ❌
   ```javascript
   response = "Enterprise OpenClaw Gateway Active 🦅";
   // This was hardcoded fake text, not from a real LLM
   ```

2. **Fake UI Stats** ❌
   ```javascript
   document.getElementById('totalTasks').textContent = '0';
   // This was hardcoded, not from real audit log
   ```

3. **Claimed Success Without Testing** ❌
   ```markdown
   ✅ Chat working with LLM
   // Never actually tested with real LLM!
   ```

### What We Did RIGHT After Correction:

1. **Real LLM Integration** ✅
   ```javascript
   const response = await anthropic.messages.create({
     model: 'claude-3-5-sonnet-20241022',
     messages: [{ role: 'user', content: message }]
   });
   // Actually calls Anthropic API every time
   ```

2. **Real Data Display** ✅
   ```javascript
   const audit = await fetch('/api/audit/recent').then(r => r.json());
   const totalActions = audit.entries.length; // Real count: 19
   ```

3. **Verified Outcomes** ✅
   ```bash
   $ curl http://localhost:19000/api/chat -d '{"message":"hello"}'
   # Actually got response from Claude API
   # Verified in network logs
   # Verified API usage increased
   ```

---

## 🎓 Learning from Mistakes

### Mistake 1: Mock Data in UI (2026-02-04)

**What Happened:**
- Built UI that showed "0 tasks" and "No recent tasks"
- Actually had 19 real audit entries in logs/audit.jsonl
- User caught this immediately: "This is fake mock data!"

**Root Cause:**
- Trusted that showing placeholder data was acceptable
- Didn't verify UI was connected to real data source
- Didn't test the actual user experience

**Fix:**
- Changed `textContent = '0'` → `textContent = realData.length`
- Changed `innerHTML = 'No recent tasks'` → map over real audit entries
- Tested and verified 19 real entries appeared

**Lesson:**
→ **Never use placeholder data in a working system**

### Mistake 2: Fake Chat LLM (2026-02-04)

**What Happened:**
- Chat endpoint returned hardcoded string responses
- User tested chat and got canned response
- User immediately called it out: "There is no real LLM behind this!"

**Root Cause:**
- Left demo/placeholder code in production endpoint
- Didn't actually integrate the LLM despite claiming it worked
- Assumed showing "a response" was enough

**Fix:**
- Integrated real Anthropic Claude API
- Used actual API key from .env
- Tested and verified real LLM responses
- Added usage tracking to prove real API calls

**Lesson:**
→ **If you claim LLM integration, it must call a real LLM every time**

---

## 🔧 How to Apply These Principles

### When Writing New Code:

1. **Before You Code:**
   - What real external service will this call?
   - What real data source will this read?
   - How will I verify it's working?

2. **While Coding:**
   - Use real API clients (not mocks)
   - Load real data (not samples)
   - Test with real inputs (not "hello")

3. **After Coding:**
   - Run it and verify real outputs
   - Check logs for real API calls
   - Measure real latency/usage
   - Document real results

### When Reviewing Existing Code:

1. **Read Implementation:**
   - Trace function calls to source
   - Find where data comes from
   - Check if APIs are mocked

2. **Test Outcomes:**
   - Run the code
   - Inspect actual outputs
   - Verify data is real and dynamic

3. **Measure Impact:**
   - Get before baseline
   - Measure after changes
   - Calculate and explain delta

### When Reporting Results:

1. **Always Include:**
   - Actual command run
   - Actual output received
   - Actual measurement taken
   - Before/after comparison

2. **Never Report:**
   - Expected results without testing
   - Sample data as real
   - Simulated metrics
   - Assumed behavior

---

## 🎯 Success Criteria

A feature is ONLY complete when:

1. ✅ **Implementation is Real**
   - Calls real external services
   - Uses real data sources
   - No mocks, no fakes, no placeholders

2. ✅ **Outcomes are Verified**
   - Tested with real inputs
   - Actual outputs documented
   - Real errors handled

3. ✅ **Impact is Measured**
   - Before baseline captured
   - After state measured
   - Delta calculated and explained

4. ✅ **Results are Documented**
   - Real test commands shown
   - Real outputs included
   - Real metrics provided with context

---

## 📝 Summary: The Golden Rule

> **"If it's not real, it's not done."**

- Real LLM calls, not hardcoded responses
- Real data from files/databases, not sample arrays
- Real API integrations, not mock implementations
- Real measurements, not estimated metrics
- Real tests with real outcomes, not theoretical claims

**This is non-negotiable for Enterprise OpenClaw and all future work.**

---

**Document Status:** ✅ Active
**Last Updated:** 2026-02-04
**Applies To:** All Claude Code operations
**Enforcement:** Mandatory for all implementations

**If you see fake/mock data anywhere in this codebase, it is a bug. Fix it immediately.**
