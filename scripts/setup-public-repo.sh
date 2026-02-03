#!/bin/bash

# Enterprise OpenClaw - Public Repository Setup Script
# This script creates the public open-source repository structure

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}║   Public Repository Setup                ║${NC}"
echo -e "${BLUE}║   Enterprise OpenClaw Open Source        ║${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from enterprise-openclaw root directory${NC}"
    exit 1
fi

# Get target directory
TARGET_DIR="${1:-../enterprise-openclaw-public}"

echo -e "${YELLOW}Target directory: ${TARGET_DIR}${NC}"
echo -e "${YELLOW}Creating public repository structure...${NC}"
echo ""

# Create directory structure
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# Initialize git if not already
if [ ! -d ".git" ]; then
    git init
    git branch -m main
fi

echo -e "${GREEN}✓ Git repository initialized${NC}"

# Create directories
mkdir -p packages/core
mkdir -p examples
mkdir -p docs
mkdir -p public
mkdir -p .github/workflows

echo -e "${GREEN}✓ Directory structure created${NC}"

# Copy core package
echo -e "${YELLOW}Copying core package...${NC}"
cp -r ../enterprise-openclaw/packages/core/* packages/core/
echo -e "${GREEN}✓ Core package copied${NC}"

# Copy configuration files
echo -e "${YELLOW}Copying configuration files...${NC}"
cp ../enterprise-openclaw/tsconfig.base.json .
cp ../enterprise-openclaw/vitest.config.base.ts .

# Create package.json (workspace root, core only)
cat > package.json << 'EOF'
{
  "name": "enterprise-openclaw",
  "version": "1.0.0",
  "description": "GenAI-native multi-agent platform - Open Source Core",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/core"
  ],
  "scripts": {
    "build": "npm run build -w @enterprise-openclaw/core",
    "test": "npm run test -w @enterprise-openclaw/core",
    "lint": "npm run lint -w @enterprise-openclaw/core",
    "clean": "npm run clean -w @enterprise-openclaw/core && rm -rf node_modules",
    "start": "tsx server.ts"
  },
  "keywords": [
    "ai",
    "multi-agent",
    "genai",
    "knowledge-graph",
    "rag",
    "open-source"
  ],
  "author": "Enterprise OpenClaw Team",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/enterprise-openclaw.git"
  },
  "dependencies": {
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

echo -e "${GREEN}✓ package.json created${NC}"

# Create basic server (core-only)
cat > server.ts << 'EOF'
#!/usr/bin/env tsx
import express from 'express';
import { KnowledgeGraph } from './packages/core/src/knowledge-graph/knowledge-graph.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const logger = pino({ level: 'info' });
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

let knowledgeGraph: KnowledgeGraph;

async function initializeSystem() {
  logger.info('🚀 Initializing Enterprise OpenClaw (Open Source)...');
  knowledgeGraph = new KnowledgeGraph('./data/knowledge-graph');
  await knowledgeGraph.initialize();
  logger.info('✅ System ready');
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
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

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

async function start() {
  await initializeSystem();
  app.listen(port, () => {
    console.log(`\n🌐 Enterprise OpenClaw (Open Source)`);
    console.log(`http://localhost:${port}\n`);
  });
}

start();
EOF

echo -e "${GREEN}✓ server.ts created${NC}"

# Copy public web UI
cp -r ../enterprise-openclaw/public/* public/
echo -e "${GREEN}✓ Web UI copied${NC}"

# Create README.md (open source focused)
cat > README.md << 'EOF'
# Enterprise OpenClaw - Open Source

GenAI-native multi-agent platform with self-improvement capabilities.

## 🔓 Open Source Core (Apache 2.0)

This is the **open source core** of Enterprise OpenClaw, providing:

- **Knowledge Graph** - Store and traverse complex information
- **Vector Search** - Semantic similarity with LanceDB
- **Basic RAG** - Retrieval-Augmented Generation
- **Multi-Agent Foundation** - Build and coordinate AI agents

## ⚡ Quick Start

```bash
npm install @enterprise-openclaw/core
```

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const kg = new KnowledgeGraph('./data/knowledge');
await kg.initialize();

await kg.addNode({
  id: 'concept_1',
  type: 'concept',
  content: 'Your knowledge here'
});

const results = await kg.queryNodes('search query');
```

## 🚀 Run the Demo

```bash
git clone https://github.com/YOUR_ORG/enterprise-openclaw.git
cd enterprise-openclaw
npm install
npm run build
npm start
```

Open http://localhost:3000

## 🔒 Enterprise Features

Want advanced features? Check out **Enterprise OpenClaw Enterprise Edition**:

- Advanced DRIFT RAG with inference engine
- PII detection and masking
- Audit logging and compliance
- Multi-tenant architecture
- Enterprise connectors
- Priority support

Learn more: [Enterprise Edition](https://github.com/YOUR_ORG/enterprise-openclaw-enterprise)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

Apache 2.0 - See [LICENSE](./LICENSE)
EOF

echo -e "${GREEN}✓ README.md created${NC}"

# Create CONTRIBUTING.md
cat > CONTRIBUTING.md << 'EOF'
# Contributing to Enterprise OpenClaw

Thank you for your interest in contributing!

## Ways to Contribute

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation
- Help others in issues

## Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Follow existing TypeScript conventions
- Add tests for new features
- Update documentation as needed

## Questions?

Open an issue or email: support@enterprise-openclaw.com
EOF

echo -e "${GREEN}✓ CONTRIBUTING.md created${NC}"

# Create CODE_OF_CONDUCT.md
cat > CODE_OF_CONDUCT.md << 'EOF'
# Code of Conduct

## Our Pledge

We pledge to make participation in our community a harassment-free experience for everyone.

## Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

## Enforcement

Instances of unacceptable behavior may be reported to support@enterprise-openclaw.com.

## Attribution

Adapted from the Contributor Covenant, version 2.1.
EOF

echo -e "${GREEN}✓ CODE_OF_CONDUCT.md created${NC}"

# Create LICENSE (Apache 2.0)
cat > LICENSE << 'EOF'
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

[Full Apache 2.0 license text would go here]

Copyright 2026 Enterprise OpenClaw Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
EOF

echo -e "${GREEN}✓ LICENSE created${NC}"

# Create CI workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - run: npm test
EOF

echo -e "${GREEN}✓ CI workflow created${NC}"

# Create publish workflow
cat > .github/workflows/publish.yml << 'EOF'
name: Publish to npm

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
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm run build
      - run: npm publish --access public -w @enterprise-openclaw/core
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF

echo -e "${GREEN}✓ Publish workflow created${NC}"

# Create .gitignore
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

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║   ✓ Public Repository Created!           ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. Review the generated files in: ${YELLOW}${TARGET_DIR}${NC}"
echo ""
echo -e "2. Create public repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Name: enterprise-openclaw"
echo "   - Visibility: Public"
echo "   - Do NOT initialize with README"
echo ""
echo -e "3. Push to GitHub:"
echo "   ${YELLOW}cd ${TARGET_DIR}${NC}"
echo "   ${YELLOW}git add .${NC}"
echo "   ${YELLOW}git commit -m \"Initial commit: Open source core\"${NC}"
echo "   ${YELLOW}git remote add origin https://github.com/YOUR_ORG/enterprise-openclaw.git${NC}"
echo "   ${YELLOW}git push -u origin main${NC}"
echo ""
echo -e "${GREEN}Public repository setup complete! 🎉${NC}"
echo ""
