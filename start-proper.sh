#!/bin/bash
# Start Enterprise OpenClaw with proper OpenClaw gateway integration

echo "🦅 Enterprise OpenClaw - Proper Integration"
echo "==========================================="
echo ""
echo "Using:"
echo "  ✅ OpenClaw's Gateway Server (150K lines)"
echo "  ✅ OpenClaw's Control UI"
echo "  ✅ Enterprise Plugins"
echo ""

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Starting Ollama..."
    ollama serve &
    sleep 3
fi

# Show models
echo "✅ Local models available:"
ollama list | grep -E "codellama|deepseek|mistral"

echo ""
echo "🚀 Starting Enterprise OpenClaw Gateway..."
echo ""

# Start with tsx (TypeScript execution)
tsx src/openclaw-enterprise-gateway.ts
