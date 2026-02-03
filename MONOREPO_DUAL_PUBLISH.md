# Monorepo with Dual Publishing Strategy

**Status:** Recommended Approach ✅
**Benefit:** Single local codebase, dual publishing to public/private repos automatically

---

## 🎯 Architecture Overview

### Single Source of Truth (Local)

```
enterprise-openclaw/                    [Local Development]
├── packages/
│   ├── core/                          # Will publish to: GitHub Public
│   └── enterprise/                    # Will publish to: GitHub Private
├── .git/
│   └── remotes/
│       ├── public                     # → github.com/YOUR_ORG/enterprise-openclaw (public)
│       └── private                    # → github.com/YOUR_ORG/enterprise-openclaw-enterprise (private)
└── scripts/
    ├── publish-public.sh              # Auto-publish core to public
    └── publish-private.sh             # Auto-publish full to private
```

### On Push/Merge → Automatic Dual Publishing

```
git push
   │
   ├─→ Trigger GitHub Action
   │   │
   │   ├─→ Extract core/ → Push to public repo
   │   │   └─→ Publish @enterprise-openclaw/core to npm
   │   │
   │   └─→ Push full repo → Push to private repo
   │       └─→ Publish @enterprise-openclaw/enterprise to GitHub Packages
   │
   └─→ Done! Both versions published
```

---

## ✨ Benefits

### Single Codebase
- ✅ **One source of truth** - No sync issues
- ✅ **Unified development** - Test both packages together
- ✅ **Consistent versioning** - Core and enterprise always in sync
- ✅ **Easier maintenance** - Changes in one place

### Automatic Publishing
- ✅ **No manual steps** - Push once, publish twice
- ✅ **Always synced** - Public and private repos stay current
- ✅ **CI/CD driven** - Automated testing before publish
- ✅ **Rollback safety** - Git history for both versions

### Clean Separation
- ✅ **Public can't see enterprise** - Selective publishing
- ✅ **Enterprise depends on public** - Clear dependency
- ✅ **Proper licensing** - Apache 2.0 for core, Proprietary for enterprise

---

## 🚀 Implementation

### Step 1: Setup Remote Repositories

```bash
# Add public remote
git remote add public https://github.com/YOUR_ORG/enterprise-openclaw.git

# Add private remote
git remote add private https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git

# Verify
git remote -v
```

### Step 2: Create Publishing Scripts

**scripts/publish-public.sh** - Publishes only core to public repo

```bash
#!/bin/bash
# Extracts packages/core and publishes to public GitHub repo

set -e

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📦 Preparing public release in $TEMP_DIR"

# Copy only public parts
cp -r packages/core "$TEMP_DIR/"
cp package.json tsconfig.base.json vitest.config.base.ts "$TEMP_DIR/"
cp README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md "$TEMP_DIR/" 2>/dev/null || true
cp -r examples docs public "$TEMP_DIR/" 2>/dev/null || true
cp server.ts "$TEMP_DIR/"

# Modify package.json to only include core
cd "$TEMP_DIR"
jq '.workspaces = ["packages/core"]' package.json > package.json.tmp
mv package.json.tmp package.json

# Create git repo
git init
git add .
git commit -m "Release: $(date '+%Y-%m-%d %H:%M:%S')"

# Push to public remote
git remote add public https://github.com/YOUR_ORG/enterprise-openclaw.git
git push -f public main

echo "✅ Published to public repository"

# Cleanup
cd -
rm -rf "$TEMP_DIR"
```

**scripts/publish-private.sh** - Publishes full repo to private

```bash
#!/bin/bash
# Publishes complete repository to private GitHub repo

set -e

# Push directly to private remote
git push private main

echo "✅ Published to private repository"
```

### Step 3: Automated Workflow (GitHub Actions)

**.github/workflows/dual-publish.yml**

```yaml
name: Dual Publish (Public + Private)

on:
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  publish-public:
    name: Publish Core to Public Repo
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Prepare public release
        run: |
          mkdir -p /tmp/public-release
          cp -r packages/core /tmp/public-release/
          cp package.json tsconfig.base.json vitest.config.base.ts /tmp/public-release/
          cp server.ts public /tmp/public-release/ -r
          cp README.md LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md /tmp/public-release/

      - name: Modify package.json for public
        working-directory: /tmp/public-release
        run: |
          jq '.workspaces = ["packages/core"] | .name = "enterprise-openclaw"' package.json > package.json.tmp
          mv package.json.tmp package.json

      - name: Push to public repository
        working-directory: /tmp/public-release
        run: |
          git init
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Release: ${{ github.sha }}"
          git remote add public https://x-access-token:${{ secrets.PUBLIC_REPO_TOKEN }}@github.com/YOUR_ORG/enterprise-openclaw.git
          git push -f public main

      - name: Publish to npm
        if: github.event_name == 'release'
        working-directory: /tmp/public-release
        run: |
          npm install
          npm run build
          npm publish --access public -w @enterprise-openclaw/core
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-private:
    name: Publish Full to Private Repo
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Push to private repository
        run: |
          git remote add private https://x-access-token:${{ secrets.PRIVATE_REPO_TOKEN }}@github.com/YOUR_ORG/enterprise-openclaw-enterprise.git
          git push -f private main

      - name: Publish to GitHub Packages
        if: github.event_name == 'release'
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm install
      - run: npm run build
      - run: npm publish -w @enterprise-openclaw/enterprise
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Step 4: Configure GitHub Secrets

In your **main repository** settings → Secrets and variables → Actions, add:

1. **NPM_TOKEN** - npm access token for publishing core package
2. **PUBLIC_REPO_TOKEN** - GitHub PAT with write access to public repo
3. **PRIVATE_REPO_TOKEN** - GitHub PAT with write access to private repo

### Step 5: Create Target Repositories

#### Create Public Repository
```bash
# On GitHub: Create new repository
# Name: enterprise-openclaw
# Visibility: Public
# Don't initialize (we'll push to it)
```

#### Create Private Repository
```bash
# On GitHub: Create new repository
# Name: enterprise-openclaw-enterprise
# Visibility: Private
# Don't initialize (we'll push to it)
```

---

## 📋 Workflow

### Daily Development

```bash
# Work on either core or enterprise
cd packages/core
# ... make changes ...

cd packages/enterprise
# ... make changes ...

# Test everything together
npm test

# Commit as usual
git add .
git commit -m "feat: add new feature"

# Push once → automatic dual publishing!
git push origin main
```

**What happens:**
1. ✅ GitHub Action triggers
2. ✅ Extracts core → pushes to public repo
3. ✅ Pushes full → pushes to private repo
4. ✅ Both repos updated automatically

### Creating a Release

```bash
# Create and push a tag
git tag v1.0.1
git push origin v1.0.1

# Create GitHub release
gh release create v1.0.1 --title "Release v1.0.1" --notes "Release notes here"
```

**What happens:**
1. ✅ GitHub Action triggers on release
2. ✅ Core package published to npm public
3. ✅ Enterprise package published to GitHub Packages
4. ✅ Both published repositories tagged

### Manual Publishing (if needed)

```bash
# Publish core to public repo
./scripts/publish-public.sh

# Publish full to private repo
./scripts/publish-private.sh
```

---

## 🎯 Repository States

### Main Repository (Local Development)

```
enterprise-openclaw/                    [Main - Private on GitHub]
├── packages/
│   ├── core/                          # Apache 2.0
│   └── enterprise/                    # Proprietary
├── scripts/
│   ├── publish-public.sh
│   └── publish-private.sh
├── .github/
│   └── workflows/
│       └── dual-publish.yml
└── README.md                          # Explains dual-publishing
```

**Purpose:** Development, testing, CI/CD orchestration
**Visibility:** Private (or public, doesn't matter - it's the control center)
**Users:** Developers only

### Public Repository (Auto-Published)

```
enterprise-openclaw/                    [Auto-generated from main]
├── packages/
│   └── core/                          # Apache 2.0 only
├── server.ts                          # Core-only server
├── public/                            # Basic UI
└── README.md                          # Open source focused
```

**Purpose:** Open source distribution
**Visibility:** Public
**Users:** Community, open source users
**Published:** Automatically on push to main repo

### Private Repository (Auto-Published)

```
enterprise-openclaw-enterprise/         [Full copy from main]
├── packages/
│   ├── core/                          # (duplicate for now)
│   └── enterprise/                    # Proprietary
├── docs/                              # Full documentation
└── README.md                          # Enterprise focused
```

**Purpose:** Enterprise distribution
**Visibility:** Private
**Users:** Enterprise customers only
**Published:** Automatically on push to main repo

---

## 🔒 Security Considerations

### Keep Enterprise Code Private
- ✅ **Main repo can be private** - Safest option
- ✅ **Public repo gets only core** - Selective publishing
- ✅ **GitHub Actions uses secrets** - No credential leaks

### Git History
- ✅ **Force push to published repos** - Clean history
- ✅ **No enterprise commits in public** - Filtered automatically
- ✅ **Main repo has full history** - Complete audit trail

### Access Control
- ✅ **Public repo** - Anyone can read, contribute via PR
- ✅ **Private repo** - License-holders only
- ✅ **Main repo** - Team members only

---

## 📊 Comparison with Alternative Approaches

| Aspect | Dual Publishing (Recommended) | Two Separate Repos |
|--------|------------------------------|-------------------|
| **Local Development** | ✅ Single codebase | ❌ Two repos to sync |
| **Sync Issues** | ✅ Never (automatic) | ⚠️ Manual sync needed |
| **Testing** | ✅ Easy (monorepo) | ⚠️ Complex (two repos) |
| **Publishing** | ✅ Automatic on push | ❌ Manual for each |
| **Versioning** | ✅ Always consistent | ⚠️ Can drift |
| **Setup Complexity** | ⚠️ Initial setup | ✅ Simpler initially |
| **Maintenance** | ✅ Low (automated) | ❌ Higher (manual) |

---

## ✅ Final Checklist

### Initial Setup
- [ ] Create public GitHub repository (enterprise-openclaw)
- [ ] Create private GitHub repository (enterprise-openclaw-enterprise)
- [ ] Add git remotes (public, private)
- [ ] Create GitHub PAT tokens
- [ ] Add secrets to main repository
- [ ] Create publish scripts (publish-public.sh, publish-private.sh)
- [ ] Create dual-publish GitHub Action workflow
- [ ] Test manual publishing scripts
- [ ] Test automated workflow with a push

### Testing
- [ ] Push to main → verify public repo updates (core only)
- [ ] Push to main → verify private repo updates (full repo)
- [ ] Create release → verify npm publish (core)
- [ ] Create release → verify GitHub Packages (enterprise)
- [ ] Clone public repo → verify no enterprise code
- [ ] Clone private repo → verify full code

### Documentation
- [ ] Update main README (explain dual-publishing)
- [ ] Update public README (open source focus)
- [ ] Update private README (enterprise focus)
- [ ] Document workflow for team
- [ ] Create troubleshooting guide

---

## 🚀 Quick Start Commands

```bash
# 1. Setup remotes
git remote add public https://github.com/YOUR_ORG/enterprise-openclaw.git
git remote add private https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git

# 2. Make scripts executable
chmod +x scripts/publish-public.sh
chmod +x scripts/publish-private.sh

# 3. Test manual publishing
./scripts/publish-public.sh   # Publishes core to public
./scripts/publish-private.sh  # Publishes full to private

# 4. Enable automatic publishing
# Add .github/workflows/dual-publish.yml
# Configure GitHub secrets
# Push to trigger

git push origin main  # Magic! Both repos updated
```

---

**Result:** One codebase, automatic dual publishing, zero sync issues! 🎉
