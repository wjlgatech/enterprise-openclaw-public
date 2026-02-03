#!/bin/bash

# Enterprise OpenClaw - Publish Core to Public Repository
# Extracts only packages/core and publishes to public GitHub repo

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}║   Publishing Core to Public Repository   ║${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from repository root${NC}"
    exit 1
fi

if [ ! -d "packages/core" ]; then
    echo -e "${RED}Error: packages/core not found${NC}"
    exit 1
fi

# Check if public remote exists
if ! git remote | grep -q "^public$"; then
    echo -e "${YELLOW}Public remote not configured${NC}"
    echo -e "${YELLOW}Add it with:${NC}"
    echo "  git remote add public https://github.com/YOUR_ORG/enterprise-openclaw.git"
    exit 1
fi

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}📦 Preparing public release in ${TEMP_DIR}${NC}"
echo ""

# Copy core package
echo -e "${YELLOW}Copying core package...${NC}"
mkdir -p "$TEMP_DIR/packages"
cp -r packages/core "$TEMP_DIR/packages/"
echo -e "${GREEN}✓ Core package copied${NC}"

# Copy configuration files
echo -e "${YELLOW}Copying configuration files...${NC}"
cp package.json "$TEMP_DIR/"
cp tsconfig.base.json "$TEMP_DIR/" 2>/dev/null || true
cp vitest.config.base.ts "$TEMP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Configuration copied${NC}"

# Copy basic server (core only)
if [ -f "server.ts" ]; then
    cp server.ts "$TEMP_DIR/"
    echo -e "${GREEN}✓ Server copied${NC}"
fi

# Copy public web UI
if [ -d "public" ]; then
    cp -r public "$TEMP_DIR/"
    echo -e "${GREEN}✓ Web UI copied${NC}"
fi

# Copy documentation
echo -e "${YELLOW}Copying documentation...${NC}"
[ -f "README.md" ] && cp README.md "$TEMP_DIR/" || true
[ -f "LICENSE" ] && cp LICENSE "$TEMP_DIR/" || true
[ -f "CONTRIBUTING.md" ] && cp CONTRIBUTING.md "$TEMP_DIR/" || true
[ -f "CODE_OF_CONDUCT.md" ] && cp CODE_OF_CONDUCT.md "$TEMP_DIR/" || true
[ -d "docs" ] && cp -r docs "$TEMP_DIR/" || true
[ -d "examples" ] && cp -r examples "$TEMP_DIR/" || true
echo -e "${GREEN}✓ Documentation copied${NC}"

# Modify package.json to only include core
echo -e "${YELLOW}Modifying package.json for public release...${NC}"
cd "$TEMP_DIR"

# Use jq if available, otherwise use sed
if command -v jq &> /dev/null; then
    jq '.workspaces = ["packages/core"] | .name = "enterprise-openclaw" | .description = "GenAI-native multi-agent platform - Open Source Core"' package.json > package.json.tmp
    mv package.json.tmp package.json
else
    # Fallback: manual edit
    sed -i.bak 's/"enterprise-openclaw-workspace"/"enterprise-openclaw"/' package.json
    sed -i.bak 's/"packages\/enterprise",\?//g' package.json
    rm -f package.json.bak
fi

echo -e "${GREEN}✓ package.json updated${NC}"

# Create .gitignore for public repo
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
*.tsbuildinfo
coverage/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Data
data/

# Logs
*.log
EOF

echo -e "${GREEN}✓ .gitignore created${NC}"

# Initialize git and create commit
echo -e "${YELLOW}Creating git commit...${NC}"
git init
git config user.name "Enterprise OpenClaw Bot"
git config user.email "bot@enterprise-openclaw.com"
git checkout -b main 2>/dev/null || git checkout main
git add .
git commit -m "Release: $(date '+%Y-%m-%d %H:%M:%S') - Core package only"
echo -e "${GREEN}✓ Commit created${NC}"

# Get public remote URL from main repo
cd - > /dev/null
PUBLIC_URL=$(git remote get-url public)

# Push to public repository
echo ""
echo -e "${YELLOW}Pushing to public repository...${NC}"
cd "$TEMP_DIR"
git remote add public "$PUBLIC_URL"

if git push -f public main 2>&1; then
    echo -e "${GREEN}✓ Successfully pushed to public repository${NC}"
else
    echo -e "${RED}✗ Failed to push to public repository${NC}"
    echo -e "${YELLOW}Check your credentials and repository access${NC}"
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║   ✓ Published to Public Repository!      ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}View at:${NC} $(git remote get-url public | sed 's/\.git$//')"
echo ""
