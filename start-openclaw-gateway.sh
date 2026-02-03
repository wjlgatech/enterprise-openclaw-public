#!/bin/bash
# Start OpenClaw Gateway with Enterprise Extensions

echo "🦅 Starting Enterprise OpenClaw with OpenClaw's Control UI"
echo ""
echo "Using OpenClaw's proven, battle-tested gateway infrastructure"
echo "Extending with enterprise features via plugins"
echo ""

cd core

# Start OpenClaw gateway with enterprise config
pnpm epiloop gateway run \
  --port 8789 \
  --bind 0.0.0.0 \
  --force

echo ""
echo "✅ OpenClaw Gateway started!"
echo "🌐 Control UI: http://localhost:8789"
echo ""
