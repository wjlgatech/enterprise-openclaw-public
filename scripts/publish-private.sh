#!/bin/bash

# Enterprise OpenClaw - Publish Full Repository to Private Repository
# Pushes complete repository (core + enterprise) to private GitHub repo

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}║   Publishing to Private Repository       ║${NC}"
echo -e "${BLUE}║                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from repository root${NC}"
    exit 1
fi

# Check if private remote exists
if ! git remote | grep -q "^private$"; then
    echo -e "${YELLOW}Private remote not configured${NC}"
    echo -e "${YELLOW}Add it with:${NC}"
    echo "  git remote add private https://github.com/YOUR_ORG/enterprise-openclaw-enterprise.git"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo -e "${YELLOW}   Commit them first or stash them${NC}"
    echo ""
    echo -e "Uncommitted files:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch: ${YELLOW}${CURRENT_BRANCH}${NC}"
echo ""

# Push to private repository
echo -e "${YELLOW}Pushing to private repository...${NC}"

if git push private "$CURRENT_BRANCH":main 2>&1; then
    echo -e "${GREEN}✓ Successfully pushed to private repository${NC}"
else
    echo -e "${RED}✗ Failed to push to private repository${NC}"
    echo -e "${YELLOW}Check your credentials and repository access${NC}"
    exit 1
fi

# Push tags as well (if any)
if git tag | grep -q .; then
    echo -e "${YELLOW}Pushing tags...${NC}"
    if git push private --tags 2>&1; then
        echo -e "${GREEN}✓ Tags pushed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}║   ✓ Published to Private Repository!     ║${NC}"
echo -e "${GREEN}║                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}View at:${NC} $(git remote get-url private | sed 's/\.git$//')"
echo ""
