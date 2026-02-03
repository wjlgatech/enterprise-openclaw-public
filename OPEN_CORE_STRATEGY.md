# Open-Core Repository Strategy & Execution Plan

**Status:** Ready for Execution
**Goal:** Separate open-source (public) and enterprise (private) code into two repositories
**Approach:** Industry-standard two-repository model (like GitLab CE/EE, Sentry, etc.)

---

## 🎯 Strategic Overview

### Current State
- Single private repository with both core (Apache 2.0) and enterprise (Proprietary) packages
- Monorepo structure with npm workspaces
- 134 tests passing, production-ready
- Full application server with web UI

### Target State
- **Public Repo** (`enterprise-openclaw`) - Core package, open source community
- **Private Repo** (`enterprise-openclaw-enterprise`) - Enterprise package, licensed customers
- Clean separation, easy distribution via npm

---

## 📊 Repository Architecture

### Repository 1: `enterprise-openclaw` (PUBLIC)

**Purpose:** Open-source platform for community
**License:** Apache 2.0
**Audience:** Developers, contributors, free users

**Structure:**
```
enterprise-openclaw/                    [GitHub: Public]
├── packages/
│   └── core/                          # Apache 2.0
│       ├── src/
│       │   ├── knowledge-graph/       # Knowledge graph engine
│       │   ├── rag/                   # Basic RAG
│       │   ├── orchestrator/          # Multi-agent foundation
│       │   └── types.ts               # Core types
│       ├── tests/                     # Core tests
│       └── package.json               # @enterprise-openclaw/core
│
├── examples/
│   ├── basic-knowledge-graph.ts       # Simple examples
│   ├── basic-rag.ts                   # RAG example
│   └── multi-agent-basic.ts           # Agent example
│
├── docs/
│   ├── GETTING_STARTED.md             # Quick start
│   ├── API_REFERENCE.md               # Core API docs
│   └── ARCHITECTURE.md                # Architecture overview
│
├── server.ts                          # Basic server (core only)
├── public/                            # Basic web UI
│   └── index.html
│
├── README.md                          # Open source focused
├── CONTRIBUTING.md                    # Contribution guidelines
├── CODE_OF_CONDUCT.md                 # Community guidelines
├── LICENSE                            # Apache 2.0
├── package.json                       # Workspace root
└── .github/
    └── workflows/
        ├── ci.yml                     # Public CI/CD
        └── publish.yml                # Publish to npm public
```

**Key Features Available:**
- ✅ Knowledge Graph (storage, traversal, queries)
- ✅ Vector Store (LanceDB integration)
- ✅ Basic RAG (simple retrieval)
- ✅ Multi-Agent Foundation (orchestration basics)
- ✅ REST API (basic endpoints)
- ✅ Web UI (knowledge management)

---

### Repository 2: `enterprise-openclaw-enterprise` (PRIVATE)

**Purpose:** Enterprise features for licensed customers
**License:** Proprietary
**Audience:** Enterprise customers with licenses

**Structure:**
```
enterprise-openclaw-enterprise/         [GitHub: Private]
├── packages/
│   └── enterprise/                    # Proprietary
│       ├── src/
│       │   ├── licensing/             # License system
│       │   ├── rag/                   # Advanced DRIFT RAG
│       │   ├── knowledge-graph/       # Inference engine
│       │   └── security/              # PII, audit logging
│       ├── tests/                     # Enterprise tests
│       ├── scripts/                   # License generation CLI
│       └── package.json               # @enterprise-openclaw/enterprise
│
├── examples/
│   ├── drift-rag-advanced.ts          # Advanced RAG
│   ├── inference-engine.ts            # Knowledge inference
│   ├── multi-tenant.ts                # Multi-tenant setup
│   └── full-platform.ts               # Complete example
│
├── docs/
│   ├── LICENSE_SYSTEM_GUIDE.md        # License setup
│   ├── RSA_KEY_GENERATION.md          # Key management
│   ├── LICENSE_SERVER_DEPLOYMENT.md   # Server deployment
│   ├── TEAM_DOCUMENTATION.md          # Developer handbook
│   └── ENTERPRISE_FEATURES.md         # Feature documentation
│
├── server-enterprise.ts               # Full server (core + enterprise)
├── public-enterprise/                 # Enterprise web UI
│   └── index.html
│
├── README.md                          # Enterprise focused
├── LICENSE                            # Proprietary
├── package.json                       # Workspace root
└── .github/
    └── workflows/
        ├── ci.yml                     # Private CI/CD
        └── publish.yml                # Publish to GitHub Packages
```

**Additional Features:**
- ✅ Advanced DRIFT RAG (dynamic reasoning)
- ✅ Inference Engine (knowledge gap detection)
- ✅ PII Detection (privacy protection)
- ✅ Audit Logging (compliance)
- ✅ Multi-Tenant (data isolation)
- ✅ Enterprise Connectors (integrations)
- ✅ License Validation System (production-ready)

---

## 📦 Distribution Model

### Open Source (Public npm)

```bash
# Install core package
npm install @enterprise-openclaw/core

# Use in your project
import { KnowledgeGraph } from '@enterprise-openclaw/core';
```

**Published to:** npm public registry (npmjs.com)
**Access:** Anyone
**Cost:** Free

### Enterprise (Private npm/GitHub Packages)

```bash
# Install both packages
npm install @enterprise-openclaw/core
npm install @enterprise-openclaw/enterprise

# Configure for private registry
echo "@enterprise-openclaw:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
```

**Published to:** GitHub Packages (or private npm registry)
**Access:** Authenticated with license key
**Cost:** Tiered pricing (Starter $99/mo, Professional $499/mo, Enterprise custom)

---

## 🔐 License Enforcement

### At Package Level
```typescript
// In @enterprise-openclaw/enterprise/src/index.ts
import { initializeLicense } from './licensing/license-validator.js';

// Must call before using enterprise features
await initializeLicense({
  licenseKey: process.env.ENTERPRISE_LICENSE_KEY!,
  publicKey: process.env.LICENSE_PUBLIC_KEY!
});
```

### At Runtime
- License validated on application start
- Phone-home to validation server
- Offline cache (7-day grace period)
- Features blocked without valid license

---

## 🚀 Execution Steps

### Phase 1: Prepare Public Repository

#### Step 1.1: Create Public Repository Structure

```bash
# Create new public repository on GitHub
# Name: enterprise-openclaw
# Visibility: Public
# Description: GenAI-native multi-agent platform with self-improvement capabilities
# License: Apache 2.0

# Clone the new empty repo
git clone https://github.com/YOUR_ORG/enterprise-openclaw.git
cd enterprise-openclaw
```

#### Step 1.2: Copy Core Package

```bash
# From current private repo, copy core package
cp -r ../enterprise-openclaw-private/packages/core packages/

# Copy shared configuration
cp ../enterprise-openclaw-private/package.json .
cp ../enterprise-openclaw-private/tsconfig.base.json .
cp ../enterprise-openclaw-private/vitest.config.base.ts .

# Copy basic server (core-only version)
cp ../enterprise-openclaw-private/server.ts .
cp -r ../enterprise-openclaw-private/public .
```

#### Step 1.3: Create Public Documentation

Create these files in the public repo:

**README.md** - Open source focused:
```markdown
# Enterprise OpenClaw (Open Source)

GenAI-native multi-agent platform - Open Source Core

## Features
- Knowledge Graph with vector search
- Basic RAG (Retrieval-Augmented Generation)
- Multi-agent orchestration foundation
- REST API and Web UI

## Quick Start
\`\`\`bash
npm install @enterprise-openclaw/core
\`\`\`

## Enterprise Version
For advanced features (DRIFT RAG, Inference Engine, Security), see:
https://github.com/YOUR_ORG/enterprise-openclaw-enterprise
```

**CONTRIBUTING.md** - Contribution guidelines
**CODE_OF_CONDUCT.md** - Community standards
**LICENSE** - Apache 2.0 full text

#### Step 1.4: Clean Up References

```bash
# Remove enterprise references from package.json
# Remove enterprise workspaces
# Update scripts to only reference core

# Remove enterprise imports from server.ts
# Use only core features in examples
```

#### Step 1.5: Setup Public CI/CD

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

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
```

Create `.github/workflows/publish.yml`:
```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
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
```

#### Step 1.6: Initial Commit and Push

```bash
git add .
git commit -m "Initial commit: Open source core"
git push origin main
```

---

### Phase 2: Configure Private Enterprise Repository

#### Step 2.1: Make Current Repo Private

```bash
# On GitHub:
# 1. Go to repository settings
# 2. Scroll to "Danger Zone"
# 3. Click "Change visibility" → "Make private"

# Or create new private repo and migrate:
git clone https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git
cd enterprise-openclaw-enterprise

# Copy everything from current repo
cp -r ../enterprise-openclaw-current/* .
```

#### Step 2.2: Remove Core Package Source

```bash
# Core will be dependency, not in workspace
rm -rf packages/core

# Update package.json workspaces
# Remove "packages/core" from workspaces array

# Add core as dependency in enterprise package.json
cd packages/enterprise
npm install @enterprise-openclaw/core
```

#### Step 2.3: Update Enterprise Package

```json
// packages/enterprise/package.json
{
  "name": "@enterprise-openclaw/enterprise",
  "version": "1.0.0",
  "dependencies": {
    "@enterprise-openclaw/core": "^1.0.0",  // From public npm
    // ... other dependencies
  }
}
```

#### Step 2.4: Create Enterprise Documentation

**README.md** - Enterprise focused:
```markdown
# Enterprise OpenClaw - Enterprise Edition

Advanced features for production deployments.

## 🔒 This is a Private Repository
Access requires a valid Enterprise OpenClaw license.

## Features
All open source core features PLUS:
- Advanced DRIFT RAG with inference
- PII Detection and masking
- Audit logging and compliance
- Multi-tenant architecture
- Enterprise connectors
- Priority support

## Installation
\`\`\`bash
npm install @enterprise-openclaw/core
npm install @enterprise-openclaw/enterprise
\`\`\`

## License Activation
See [LICENSE_SYSTEM_GUIDE.md](./LICENSE_SYSTEM_GUIDE.md)
```

Keep all existing enterprise docs:
- LICENSE_SYSTEM_GUIDE.md
- RSA_KEY_GENERATION.md
- LICENSE_SERVER_DEPLOYMENT.md
- TEAM_DOCUMENTATION.md
- FINAL_COMPLETION_REPORT.md

#### Step 2.5: Setup Private Publishing

Create `.github/workflows/publish.yml`:
```yaml
name: Publish to GitHub Packages

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm install
      - run: npm run build
      - run: npm publish -w @enterprise-openclaw/enterprise
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Step 2.6: Commit and Push

```bash
git add .
git commit -m "Configure as enterprise private repository"
git push origin main
```

---

### Phase 3: Update Documentation

#### Public Repo README Updates

Focus on:
- Open source value proposition
- Core features and capabilities
- Easy getting started
- Link to enterprise version
- Contribution guidelines

#### Private Repo README Updates

Focus on:
- Enterprise value proposition
- Advanced features
- Installation with authentication
- License activation
- Deployment guides

#### Create Migration Guide

For users upgrading from single repo to dual repo:

**MIGRATION_V1_TO_V2.md:**
```markdown
# Migration Guide: v1.x to v2.0 (Dual Repository)

## What Changed
- Core package now in public repository
- Enterprise package in private repository
- Both published to npm

## For Open Source Users
No change - continue using core package

## For Enterprise Customers
Update installation:
\`\`\`bash
npm install @enterprise-openclaw/core
npm install @enterprise-openclaw/enterprise
\`\`\`

Configure authentication:
\`\`\`bash
echo "@enterprise-openclaw:registry=https://npm.pkg.github.com" >> .npmrc
\`\`\`
```

---

### Phase 4: Publishing Setup

#### Public Package (Core)

1. **Create npm Account**
   - Sign up at npmjs.com
   - Create organization: `@enterprise-openclaw`

2. **Generate npm Token**
   ```bash
   npm login
   npm token create
   ```

3. **Add to GitHub Secrets**
   - Go to public repo settings → Secrets
   - Add `NPM_TOKEN`

4. **Publish First Version**
   ```bash
   cd packages/core
   npm version 1.0.0
   npm publish --access public
   ```

#### Private Package (Enterprise)

1. **Configure GitHub Packages**
   ```json
   // packages/enterprise/package.json
   {
     "name": "@YOUR_ORG/enterprise-openclaw-enterprise",
     "repository": {
       "type": "git",
       "url": "https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git"
     },
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

2. **Publish First Version**
   ```bash
   cd packages/enterprise
   npm version 1.0.0
   npm publish
   ```

---

## 📋 Checklist

### Public Repository Setup
- [ ] Create public GitHub repository
- [ ] Copy core package
- [ ] Create open-source README
- [ ] Add CONTRIBUTING.md
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Add Apache 2.0 LICENSE
- [ ] Setup public CI/CD
- [ ] Remove enterprise references
- [ ] Initial commit and push
- [ ] Publish to npm public registry

### Private Repository Setup
- [ ] Make current repo private (or create new)
- [ ] Remove core package from workspace
- [ ] Add core as npm dependency
- [ ] Update enterprise package.json
- [ ] Update enterprise README
- [ ] Keep all enterprise docs
- [ ] Setup private CI/CD
- [ ] Setup GitHub Packages publishing
- [ ] Commit and push
- [ ] Publish to GitHub Packages

### Documentation
- [ ] Update public README (open source focus)
- [ ] Update private README (enterprise focus)
- [ ] Create migration guide
- [ ] Update API documentation
- [ ] Update deployment guides

### Testing
- [ ] Public repo: All core tests pass
- [ ] Private repo: All enterprise tests pass
- [ ] Public package: Installs correctly
- [ ] Private package: Installs with auth
- [ ] Integration: Both packages work together

### Communication
- [ ] Announce repository split to community
- [ ] Update documentation links
- [ ] Update support channels
- [ ] Send email to enterprise customers
- [ ] Update website

---

## 🎯 Success Metrics

### Technical
- ✅ Both repositories building successfully
- ✅ All tests passing (134 tests)
- ✅ Packages published to respective registries
- ✅ Authentication working for private package
- ✅ Zero security leaks (enterprise code not in public)

### User Experience
- ✅ Open source users can install core easily
- ✅ Enterprise customers can access both packages
- ✅ Clear documentation for both audiences
- ✅ Simple contribution process for community
- ✅ Smooth migration from v1

### Business
- ✅ Clear value differentiation (open vs enterprise)
- ✅ License enforcement working
- ✅ Reduced support burden (clear separation)
- ✅ Easier sales conversations (transparent features)

---

## 🚨 Important Notes

### Security
- **Never** commit enterprise code to public repo
- **Always** verify .gitignore before pushing
- **Review** all commits to public repo for leaks
- **Use** branch protection on both repos

### Versioning
- **Sync** versions between core and enterprise
- **Test** compatibility before releasing
- **Document** breaking changes clearly
- **Follow** semantic versioning (semver)

### Support
- **Public repo** - GitHub Issues, community support
- **Private repo** - Email support, priority tickets
- **Separate** support channels to avoid confusion

---

## 📞 Next Steps

1. **Review this strategy** with team
2. **Get approval** for repository split
3. **Schedule** migration window
4. **Execute** phases 1-4 systematically
5. **Test** thoroughly before announcing
6. **Communicate** to users and customers
7. **Monitor** for issues post-launch

---

**Prepared by:** Claude Sonnet 4.5
**Date:** 2026-02-03
**Status:** Ready for Execution
**Estimated Time:** 4-6 hours for complete migration
