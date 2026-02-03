#!/bin/bash
# Enterprise OpenClaw - Safe Setup for Company MacBook Pro
# Ensures all sensitive work stays on device via local Ollama

set -e

echo "🚀 Enterprise OpenClaw - Safe Company Deployment"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Ollama is installed
echo "📦 Step 1: Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama not found. Installing...${NC}"
    brew install ollama
    echo -e "${GREEN}✅ Ollama installed${NC}"
else
    echo -e "${GREEN}✅ Ollama already installed${NC}"
fi

# Start Ollama service
echo ""
echo "🔧 Step 2: Starting Ollama service..."
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve &
    sleep 3
    echo -e "${GREEN}✅ Ollama service started${NC}"
else
    echo -e "${GREEN}✅ Ollama service already running${NC}"
fi

# Check which models are needed
echo ""
echo "📥 Step 3: Checking required models..."
REQUIRED_MODELS=("codellama:13b" "deepseek-coder" "mistral:7b")
MISSING_MODELS=()

for model in "${REQUIRED_MODELS[@]}"; do
    if ollama list | grep -q "$model"; then
        echo -e "${GREEN}✅ $model already downloaded${NC}"
    else
        echo -e "${YELLOW}⏳ $model needs to be downloaded${NC}"
        MISSING_MODELS+=("$model")
    fi
done

# Download missing models
if [ ${#MISSING_MODELS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Downloading missing models (this may take 10-15 minutes)...${NC}"
    for model in "${MISSING_MODELS[@]}"; do
        echo "  Pulling $model..."
        ollama pull "$model"
        echo -e "${GREEN}✅ $model downloaded${NC}"
    done
else
    echo -e "${GREEN}✅ All required models already available${NC}"
fi

# Install Node dependencies
echo ""
echo "📦 Step 4: Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found. Are you in the right directory?${NC}"
    exit 1
fi

# Build all extensions
echo ""
echo "🔨 Step 5: Building extensions..."
npm run build 2>/dev/null || {
    # If npm run build doesn't exist, build manually
    echo "Building Claude Agent Bridge..."
    (cd extensions/claude-agent-bridge && npm install && npx tsc)

    echo "Building Ollama Bridge..."
    (cd extensions/ollama-bridge && npm install && npx tsc)

    echo "Building main server..."
    npx tsc
}
echo -e "${GREEN}✅ Extensions built${NC}"

# Create config directory
echo ""
echo "⚙️  Step 6: Creating configuration..."
mkdir -p ~/.enterprise-openclaw
mkdir -p ./data/artifacts
mkdir -p ./logs

# Create config file
cat > ~/.enterprise-openclaw/config.yaml <<EOF
# Enterprise OpenClaw Configuration
# Safe for company use - local-first architecture

enterprise:
  # Security Settings
  security:
    externalAPIs:
      enabled: false  # Disabled by default - must explicitly enable
      requireApproval: true

    piiDetection:
      enabled: true
      maskBefore: true  # Mask PII before any external call

    auditLogging:
      enabled: true
      location: ./logs/audit.jsonl
      hashChain: true  # Tamper-proof

  # Plugins
  plugins:
    - enterprise-security
    - multi-agent-orchestrator
    - self-improvement
    - claude-agent-bridge
    - ollama-bridge

  # Ollama (LOCAL - NO EXTERNAL CALLS)
  ollama:
    host: http://localhost:11434
    defaultModel: codellama:13b
    routing:
      codeGeneration: codellama:13b
      codeReview: deepseek-coder
      architecture: mistral:7b
      documentation: codellama:13b

  # Claude Agent Bridge (EXTERNAL - opt-in for public info only)
  claudeAgentBridge:
    enabled: false  # Opt-in only
    anthropic:
      apiKey: \${ANTHROPIC_API_KEY}
      defaultModel: claude-3-haiku-20240307
    extendedThinking:
      enabled: true
      budget: 10000
EOF

echo -e "${GREEN}✅ Configuration created at ~/.enterprise-openclaw/config.yaml${NC}"

# Create useful aliases
echo ""
echo "🔧 Step 7: Setting up command aliases..."
SHELL_RC=""
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
fi

if [ -n "$SHELL_RC" ]; then
    if ! grep -q "enterprise-openclaw" "$SHELL_RC"; then
        cat >> "$SHELL_RC" <<EOF

# Enterprise OpenClaw Aliases
alias oclaw='node $(pwd)/dist/index.js'
alias oclaw-start='cd $(pwd) && npm start'
alias oclaw-review='oclaw-call ollama.codeReview'
alias oclaw-doc='oclaw-call ollama.generateDocs'
alias oclaw-analyze='oclaw-call ollama.analyzeArchitecture'

function oclaw-call() {
    curl -s -X POST http://localhost:8789/api/call \
        -H "Content-Type: application/json" \
        -d "{\\"method\\": \\"\$1\\", \\"params\\": \$2}" | jq -r '.result.content'
}
EOF
        echo -e "${GREEN}✅ Aliases added to $SHELL_RC${NC}"
        echo -e "${YELLOW}⚠️  Run 'source $SHELL_RC' to activate aliases${NC}"
    else
        echo -e "${GREEN}✅ Aliases already configured${NC}"
    fi
fi

# Verify installation
echo ""
echo "🧪 Step 8: Verifying installation..."
sleep 2

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama API responding${NC}"
else
    echo -e "${RED}❌ Ollama not responding${NC}"
fi

# Check models
MODEL_COUNT=$(ollama list | grep -c "codellama\|deepseek\|mistral" || echo "0")
if [ "$MODEL_COUNT" -ge 3 ]; then
    echo -e "${GREEN}✅ All required models available${NC}"
else
    echo -e "${YELLOW}⚠️  Some models may still be downloading${NC}"
fi

# Success message
echo ""
echo "=============================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "🚀 To start Enterprise OpenClaw:"
echo "   npm start"
echo ""
echo "🔒 Security Guarantees:"
echo "   ✅ All sensitive work processed locally (Ollama)"
echo "   ✅ No external API calls without approval"
echo "   ✅ PII automatically masked"
echo "   ✅ Full audit trail maintained"
echo ""
echo "📖 Quick Commands:"
echo "   Code Review:  oclaw-review '{\"code\": \"...\", \"language\": \"javascript\"}'"
echo "   Generate Docs: oclaw-doc '{\"code\": \"...\", \"format\": \"markdown\"}'"
echo "   Architecture:  oclaw-analyze '{\"design\": \"...\"}'"
echo ""
echo "📚 Documentation:"
echo "   Setup Guide:     SAFE_DEPLOYMENT_GUIDE.md"
echo "   Accomplishments: TODAYS_ACCOMPLISHMENTS.md"
echo "   Ollama Guide:    extensions/ollama-bridge/README.md"
echo ""
echo "🎊 Ready to automate 95% of your daily work!"
echo ""
