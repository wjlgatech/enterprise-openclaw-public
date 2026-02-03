#!/bin/bash

# Enterprise OpenClaw - Private Enterprise Repository Setup Script
# This script configures the current repository as the enterprise private version

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}║   Private Repository Setup               ║${NC}"
echo -e "${BLUE}║   Enterprise OpenClaw Enterprise         ║${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from enterprise-openclaw root directory${NC}"
    exit 1
fi

if [ ! -d "packages/enterprise" ]; then
    echo -e "${RED}Error: packages/enterprise not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuring repository as enterprise private...${NC}"
echo ""

# Backup current state
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_DIR="../enterprise-openclaw-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup created at: ${BACKUP_DIR}${NC}"

# Remove core package from workspace
echo -e "${YELLOW}Removing core package from workspace...${NC}"
if [ -d "packages/core" ]; then
    rm -rf packages/core
    echo -e "${GREEN}✓ Core package removed (will be npm dependency)${NC}"
fi

# Update root package.json
echo -e "${YELLOW}Updating root package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "enterprise-openclaw-enterprise",
  "version": "1.0.0",
  "description": "Enterprise OpenClaw - Enterprise Edition with advanced features",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/enterprise"
  ],
  "scripts": {
    "build": "npm run build -w @enterprise-openclaw/enterprise",
    "test": "npm run test -w @enterprise-openclaw/enterprise",
    "lint": "npm run lint -w @enterprise-openclaw/enterprise",
    "clean": "npm run clean -w @enterprise-openclaw/enterprise && rm -rf node_modules",
    "start": "tsx server-enterprise.ts",
    "generate-license": "npm run generate-license -w @enterprise-openclaw/enterprise"
  },
  "keywords": [
    "ai",
    "multi-agent",
    "genai",
    "enterprise",
    "drift-rag",
    "inference-engine",
    "security"
  ],
  "author": "Enterprise OpenClaw Team",
  "license": "UNLICENSED",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git"
  },
  "dependencies": {
    "@enterprise-openclaw/core": "^1.0.0",
    "express": "^5.2.1",
    "pino": "^10.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.25",
    "@types/node": "^20.19.30",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "@vitest/coverage-v8": "^2.1.9",
    "eslint": "^8.56.0",
    "tsx": "^4.21.0",
    "typescript": "^5.7.3",
    "vitest": "^2.1.9"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

echo -e "${GREEN}✓ Root package.json updated${NC}"

# Update enterprise package.json to depend on core
echo -e "${YELLOW}Updating enterprise package.json...${NC}"

# Create enterprise server (full features)
echo -e "${YELLOW}Creating enterprise server...${NC}"
cat > server-enterprise.ts << 'EOF'
#!/usr/bin/env tsx
import express from 'express';
import { KnowledgeGraph } from '@enterprise-openclaw/core';
import { initializeLicense, getFeatureFlags } from './packages/enterprise/src/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const logger = pino({ level: 'info' });
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public-enterprise')));

let knowledgeGraph: KnowledgeGraph;

async function initializeSystem() {
  logger.info('🚀 Initializing Enterprise OpenClaw (Enterprise Edition)...');

  // Initialize license
  if (process.env.ENTERPRISE_LICENSE_KEY) {
    logger.info('🔐 Validating enterprise license...');
    await initializeLicense({
      licenseKey: process.env.ENTERPRISE_LICENSE_KEY,
      publicKey: process.env.LICENSE_PUBLIC_KEY || '',
      enablePhoneHome: true,
      offlineGracePeriodDays: 7
    });

    const flags = getFeatureFlags();
    logger.info('✓ License validated');
    logger.info(`  Tier: ${flags.getTier()}`);
    logger.info(`  Features: ${flags.getFeatures().join(', ')}`);
  } else {
    logger.warn('⚠️  No license key provided - enterprise features disabled');
    logger.warn('   Set ENTERPRISE_LICENSE_KEY environment variable');
  }

  // Initialize Knowledge Graph
  knowledgeGraph = new KnowledgeGraph('./data/knowledge-graph');
  await knowledgeGraph.initialize();

  logger.info('✅ System ready');
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    edition: 'enterprise',
    licensed: !!process.env.ENTERPRISE_LICENSE_KEY
  });
});

app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await knowledgeGraph.queryNodes(query);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Query failed' });
  }
});

app.get('/api/license', (req, res) => {
  if (!process.env.ENTERPRISE_LICENSE_KEY) {
    return res.json({ licensed: false });
  }

  try {
    const flags = getFeatureFlags();
    res.json({
      licensed: true,
      tier: flags.getTier(),
      features: flags.getFeatures(),
      limits: {
        maxTenants: flags.getLimit('max_tenants'),
        maxConcurrentTasks: flags.getLimit('max_concurrent_tasks'),
        maxTokensPerMonth: flags.getLimit('max_tokens_per_month')
      }
    });
  } catch (error) {
    res.json({ licensed: false });
  }
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public-enterprise', 'index.html'));
});

async function start() {
  await initializeSystem();
  app.listen(port, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║                                           ║');
    console.log('║    🦅 Enterprise OpenClaw                ║');
    console.log('║    Enterprise Edition                     ║');
    console.log('║                                           ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
    console.log(`🌐 Web UI:      http://localhost:${port}`);
    console.log(`🔌 API:         http://localhost:${port}/api`);
    console.log('');
  });
}

start();
EOF

echo -e "${GREEN}✓ server-enterprise.ts created${NC}"

# Copy public UI to enterprise version
if [ -d "public" ]; then
    cp -r public public-enterprise
    echo -e "${GREEN}✓ Enterprise web UI created${NC}"
fi

# Update README.md (enterprise focused)
echo -e "${YELLOW}Updating README.md...${NC}"
cat > README.md << 'EOF'
# Enterprise OpenClaw - Enterprise Edition

🔒 **This is a Private Repository**

Advanced features for production enterprise deployments.

## 🎯 Enterprise Features

All open source core features PLUS:

- **Advanced DRIFT RAG** - Dynamic reasoning with inference engine
- **PII Detection** - Automatic privacy protection and masking
- **Audit Logging** - Complete compliance trail
- **Multi-Tenant** - Secure data isolation
- **Enterprise Connectors** - Integration with your stack
- **Inference Engine** - Automatic knowledge gap detection
- **Priority Support** - Email, phone, and Slack support

## 📦 Installation

### Step 1: Install Core Package

```bash
npm install @enterprise-openclaw/core
```

### Step 2: Configure GitHub Packages

```bash
echo "@enterprise-openclaw:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc
```

### Step 3: Install Enterprise Package

```bash
npm install @enterprise-openclaw/enterprise
```

## 🔑 License Activation

### Step 1: Get Your License Key

Contact sales@enterprise-openclaw.com for your enterprise license.

### Step 2: Set Environment Variables

```bash
export ENTERPRISE_LICENSE_KEY="your-license-key-here"
export LICENSE_PUBLIC_KEY="your-public-key-here"
```

### Step 3: Initialize License

```typescript
import { initializeLicense } from '@enterprise-openclaw/enterprise';

await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});
```

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git
cd enterprise-openclaw-enterprise
npm install
npm run build

# Set license key
export ENTERPRISE_LICENSE_KEY="your-key"

# Start server
npm start
```

Open http://localhost:3000

## 📖 Documentation

- [License System Guide](./LICENSE_SYSTEM_GUIDE.md)
- [RSA Key Generation](./docs/RSA_KEY_GENERATION.md)
- [License Server Deployment](./docs/LICENSE_SERVER_DEPLOYMENT.md)
- [Team Documentation](./docs/TEAM_DOCUMENTATION.md)

## 💎 License Tiers

### 🌱 Starter ($99/month)
- Advanced DRIFT RAG
- 1 tenant, 10 concurrent tasks
- 100K tokens/month

### 💼 Professional ($499/month)
- All Starter features
- Inference engine, PII detection
- 5 tenants, 25 concurrent tasks
- 500K tokens/month

### 🏢 Enterprise (Custom)
- All Professional features
- Multi-tenant, audit logging
- 10+ tenants, 50+ concurrent tasks
- 1M+ tokens/month
- Priority support + SLA

## 🆘 Support

- **Email:** support@enterprise-openclaw.com
- **Sales:** sales@enterprise-openclaw.com
- **Phone:** Available for enterprise customers

## 📄 License

Proprietary - See LICENSE file
EOF

echo -e "${GREEN}✓ README.md updated${NC}"

# Create LICENSE (proprietary)
cat > LICENSE << 'EOF'
Enterprise OpenClaw Enterprise Edition License

Copyright (c) 2026 Enterprise OpenClaw Team

PROPRIETARY SOFTWARE LICENSE

This software and associated documentation files (the "Software") are proprietary
and confidential. Use of the Software is subject to the terms of a separate
commercial license agreement between you and Enterprise OpenClaw.

Unauthorized copying, modification, distribution, or use of this Software
is strictly prohibited and will be prosecuted to the fullest extent of the law.

For licensing information, contact: sales@enterprise-openclaw.com
EOF

echo -e "${GREEN}✓ LICENSE updated${NC}"

# Create GitHub Packages publish workflow
mkdir -p .github/workflows
cat > .github/workflows/publish.yml << 'EOF'
name: Publish to GitHub Packages

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@enterprise-openclaw'
      - run: npm install
      - run: npm run build
      - run: npm publish -w @enterprise-openclaw/enterprise
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
EOF

echo -e "${GREEN}✓ Publish workflow created${NC}"

# Update .gitignore to exclude core package
cat >> .gitignore << 'EOF'

# Core package (installed via npm)
packages/core/
EOF

echo -e "${GREEN}✓ .gitignore updated${NC}"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║   ✓ Private Repository Configured!       ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. Install core package from npm:"
echo "   ${YELLOW}npm install${NC}"
echo ""
echo -e "2. Build enterprise package:"
echo "   ${YELLOW}npm run build${NC}"
echo ""
echo -e "3. Test that everything works:"
echo "   ${YELLOW}npm test${NC}"
echo ""
echo -e "4. Make repository private on GitHub:"
echo "   - Go to repository settings"
echo "   - Scroll to 'Danger Zone'"
echo "   - Click 'Change visibility' → 'Make private'"
echo ""
echo -e "5. Commit and push changes:"
echo "   ${YELLOW}git add .${NC}"
echo "   ${YELLOW}git commit -m \"Configure as enterprise private repository\"${NC}"
echo "   ${YELLOW}git push origin main${NC}"
echo ""
echo -e "${GREEN}Private enterprise repository ready! 🎉${NC}"
echo ""
echo -e "${BLUE}Backup saved at: ${YELLOW}${BACKUP_DIR}${NC}"
echo ""
