#!/bin/bash
# Quick start script for Enterprise OpenClaw
# Bypasses TypeScript compilation issues with core/ symlink

echo "🚀 Starting Enterprise OpenClaw..."
echo ""

# Check Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Starting Ollama service..."
    ollama serve &
    sleep 3
fi

# Check models
echo "✅ Checking local models..."
ollama list | grep -E "codellama|deepseek|mistral"

echo ""
echo "🔧 Starting server on port 8789..."
echo "🔒 Security: All sensitive work processed locally via Ollama"
echo ""

# Run with tsx (TypeScript execution)
tsx src/index.ts
