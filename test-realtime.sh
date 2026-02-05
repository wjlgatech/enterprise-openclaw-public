#!/bin/bash
# Test real-time audit analytics by generating some test actions

echo "Testing Real-Time Audit Analytics"
echo "=================================="
echo ""

# Base URL
BASE_URL="http://localhost:19000"

# Test 1: Execute an allowed action
echo "1. Testing allowed action..."
curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-1" \
  -d '{
    "action": {
      "type": "file.read",
      "params": {"path": "/tmp/test.txt"}
    },
    "context": {
      "userId": "test-user-1",
      "capabilities": ["file.read"]
    }
  }' | jq -r '.success'

sleep 1

# Test 2: Execute a denied action (missing capability)
echo "2. Testing denied action (should trigger alert)..."
curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-2" \
  -d '{
    "action": {
      "type": "file.delete",
      "params": {"path": "/tmp/test.txt"}
    },
    "context": {
      "userId": "test-user-2",
      "capabilities": ["file.read"]
    }
  }' | jq -r '.error // "Success"'

sleep 1

# Test 3: Execute another denied action
echo "3. Testing another denied action..."
curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user-2" \
  -d '{
    "action": {
      "type": "shell.exec",
      "params": {"command": "ls"}
    },
    "context": {
      "userId": "test-user-2",
      "capabilities": ["file.read"]
    }
  }' | jq -r '.error // "Success"'

sleep 1

# Test 4: Check dashboard summary (should show real-time updates)
echo "4. Checking dashboard summary..."
curl -s "$BASE_URL/api/dashboard/summary" | jq '.healthScore, .totalActions, .successRate'

echo ""
echo "Test complete! Check the dashboard at http://localhost:19000/"
echo "The live activity feed should show these actions in real-time."
