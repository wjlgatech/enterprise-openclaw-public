#!/bin/bash
# Enterprise OpenClaw Demo Script

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     Enterprise OpenClaw - GenAI-Native Platform Demo         ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:8789/health > /dev/null; then
    echo "❌ Server not running. Please start with: npm start"
    exit 1
fi

echo "✓ Server is healthy"
echo ""

# Demo 1: Code Generation
echo "📝 Demo 1: Code Generation with Self-Improvement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TASK_ID=$(curl -s -X POST http://localhost:8789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo",
    "sessionId": "demo-session-1",
    "description": "Create a TypeScript function to validate email addresses with unit tests",
    "agents": [
      {
        "name": "code-generator",
        "type": "code-generator",
        "description": "Generate production-ready code",
        "config": {}
      }
    ]
  }' | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)

echo "✓ Created task: $TASK_ID"
echo ""

# Wait for task to complete
echo "⏳ Waiting for task to complete..."
sleep 2

for i in {1..30}; do
    STATUS=$(curl -s http://localhost:8789/api/tasks/$TASK_ID | grep -o '"status":"[^"]*' | cut -d'"' -f4 || echo "pending")

    if [ "$STATUS" = "completed" ]; then
        echo "✓ Task completed!"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "❌ Task failed"
        curl -s http://localhost:8789/api/tasks/$TASK_ID
        exit 1
    fi

    echo "  Status: $STATUS..."
    sleep 2
done

echo ""
echo "📊 Task Result:"
curl -s http://localhost:8789/api/tasks/$TASK_ID | jq '.'
echo ""

# Demo 2: PII Detection
echo ""
echo "🔒 Demo 2: PII Detection & Masking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TASK_ID_PII=$(curl -s -X POST http://localhost:8789/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo",
    "sessionId": "demo-session-2",
    "description": "Process data for John Smith, email john.smith@company.com, SSN 123-45-6789",
    "agents": [
      {
        "name": "analyzer",
        "type": "analyzer",
        "description": "Analyze data",
        "config": { "analysisType": "security" }
      }
    ]
  }' | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)

echo "✓ Created task with PII: $TASK_ID_PII"
echo "  (Check audit logs for PII masking)"
echo ""

# Demo 3: Check Improvement Proposals
echo ""
echo "🚀 Demo 3: Self-Improvement Proposals"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sleep 2

PROPOSALS=$(curl -s http://localhost:8789/api/improvement/proposals)

if [ "$PROPOSALS" = "[]" ]; then
    echo "ℹ️  No proposals yet (system needs more data)"
    echo "   Run more tasks to see the self-improvement engine in action!"
else
    echo "📈 Improvement Proposals:"
    echo "$PROPOSALS" | jq '.'
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                      Demo Complete!                           ║"
echo "║                                                               ║"
echo "║  Key Features Demonstrated:                                   ║"
echo "║  ✓ Multi-agent task execution                                ║"
echo "║  ✓ PII detection and masking                                 ║"
echo "║  ✓ Metrics collection                                        ║"
echo "║  ✓ Self-improvement proposals                                ║"
echo "║                                                               ║"
echo "║  View Dashboard:  http://localhost:8789/dashboard            ║"
echo "║  View Audit Logs: ./data/audit-logs/                         ║"
echo "║  View Metrics:    ./data/metrics/                            ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
