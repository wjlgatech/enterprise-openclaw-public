# Quick Start Guide - Enterprise OpenClaw

Get your GenAI-native multi-agent platform running in 5 minutes!

## Prerequisites

- Node.js 20+
- Anthropic API Key ([get one here](https://console.anthropic.com/))

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Build the project
npm run build
```

## Start the Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════════╗
║         Enterprise OpenClaw - GenAI-Native Platform          ║
║  🚀 Server running on http://localhost:8789                  ║
║  📊 Dashboard: http://localhost:8789/dashboard               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Run Demo

In a new terminal:

```bash
chmod +x demo.sh
./demo.sh
```

This will demonstrate:
- Code generation with AI agents
- PII detection and masking
- Self-improvement proposals
- Metrics collection

## Create Your First Task

### Via CLI:

```bash
node dist/cli.js create "Build a REST API for user authentication"
```

### Via REST API:

```bash
curl -X POST http://localhost:8789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "my-tenant",
    "sessionId": "my-session",
    "description": "Create a password hashing utility with bcrypt",
    "agents": [
      {
        "name": "code-gen",
        "type": "code-generator",
        "description": "Generate secure password utility",
        "config": {}
      }
    ]
  }'
```

### Via WebSocket:

```bash
npm install -g wscat
wscat -c "ws://localhost:8789?clientId=my-client"

# Send:
{
  "type": "create-task",
  "data": {
    "tenantId": "my-tenant",
    "sessionId": "my-session",
    "description": "Analyze customer churn data",
    "agents": [
      {
        "name": "analyzer",
        "type": "analyzer",
        "description": "Analyze churn patterns",
        "config": { "analysisType": "churn" }
      }
    ]
  }
}
```

## View the Dashboard

Open http://localhost:8789/dashboard in your browser to see:
- Real-time task execution
- Self-improvement proposals
- System metrics
- Quick start examples

## Multi-Agent Workflow Example

Create a complex workflow with multiple agents:

```bash
curl -X POST http://localhost:8789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "my-tenant",
    "sessionId": "my-session",
    "description": "Build a complete user management system",
    "agents": [
      {
        "name": "data-modeler",
        "type": "code-generator",
        "description": "Design user data models",
        "config": {}
      },
      {
        "name": "api-builder",
        "type": "code-generator",
        "description": "Build REST API endpoints",
        "config": {},
        "dependsOn": ["data-modeler"]
      },
      {
        "name": "security-analyzer",
        "type": "analyzer",
        "description": "Analyze security posture",
        "config": { "analysisType": "security" },
        "dependsOn": ["api-builder"]
      }
    ]
  }'
```

Agents execute in dependency order:
1. `data-modeler` runs first
2. `api-builder` waits for data-modeler to complete
3. `security-analyzer` runs after api-builder

## View Self-Improvement Proposals

After running several tasks:

```bash
curl http://localhost:8789/api/improvement/proposals
```

Example output:

```json
[
  {
    "id": "prop-123",
    "type": "config_change",
    "target": "code-generator.timeout",
    "currentValue": 30000,
    "proposedValue": 60000,
    "rationale": "code-generator frequently times out on complex tasks",
    "expectedImprovement": "20% reduction in timeout failures",
    "status": "proposed"
  }
]
```

Approve a proposal:

```bash
curl -X POST http://localhost:8789/api/improvement/proposals/prop-123/approve
```

## Explore Data

All metrics and logs are stored locally:

```bash
# View metrics
cat data/metrics/metrics-2026-02-02.jsonl | jq '.'

# View audit logs
cat data/audit-logs/audit-2026-02-02.jsonl | jq '.'

# View improvement data
cat data/improvement/proposals.json | jq '.'
```

## Key Features to Try

### 1. PII Detection

Create a task with PII and watch it get automatically masked:

```bash
node dist/cli.js create "Process order for John Smith, SSN 123-45-6789"
```

Check audit logs to see PII was detected and masked.

### 2. Parallel Execution

Create multiple tasks simultaneously - the system handles queuing and parallel execution:

```bash
for i in {1..5}; do
  node dist/cli.js create "Task $i: Generate code" &
done
```

### 3. Real-Time Streaming

Connect via WebSocket to see live progress updates:

```bash
wscat -c "ws://localhost:8789?clientId=monitor"
# You'll receive real-time task events
```

## Next Steps

- Read the [Architecture Overview](README.md#architecture-overview)
- Review [Security Policy](SECURITY.md)
- Explore the codebase in `src/`
- Build custom agents by extending `AgentExecutor`
- Integrate with your existing systems

## Troubleshooting

**Server won't start:**
- Check Node.js version: `node --version` (must be 20+)
- Verify API key is set in `.env`
- Check port 8789 is available: `lsof -i :8789`

**Tasks failing:**
- Check Anthropic API key is valid
- Ensure you have API credits
- View error details in audit logs

**No improvement proposals:**
- System needs 3+ similar patterns to propose improvements
- Run more tasks to generate training data
- Check `data/improvement/patterns.json`

## Support

- Report issues: GitHub Issues
- Questions: Check documentation
- Security issues: See [SECURITY.md](SECURITY.md)

---

**You're now running an enterprise-grade, self-improving AI platform! 🚀**
