# Contributing to OpenClaw Pro

Thank you for your interest in contributing to OpenClaw Pro! This document provides guidelines for contributing to the open-source community edition.

---

## Code of Conduct

Be respectful, inclusive, and constructive. We're building this together.

---

## Ways to Contribute

### 1. Report Bugs

Found a bug? [Open an issue](https://github.com/wjlgatech/openclaw-pro-public/issues/new) with:
- **Description:** What went wrong?
- **Steps to Reproduce:** How can we see the bug?
- **Expected Behavior:** What should have happened?
- **Environment:** OS, Node.js version, package version

**Example:**
```
**Description:** KnowledgeGraph.findSimilar() returns duplicate results

**Steps to Reproduce:**
1. Add 3 nodes with identical content
2. Call findSimilar('test query', { limit: 5 })
3. Observe duplicate node IDs in results

**Expected:** Each node should appear once
**Actual:** Node 'test-1' appears 3 times

**Environment:**
- OS: macOS 14.0
- Node: 20.10.0
- @enterprise-openclaw/core: 1.0.0
```

---

### 2. Suggest Features

Have an idea? [Open an issue](https://github.com/wjlgatech/openclaw-pro-public/issues/new) with:
- **Use Case:** What problem does this solve?
- **Proposed Solution:** How should it work?
- **Alternatives:** What other options did you consider?

**Example:**
```
**Feature:** Support for batch node addition

**Use Case:** Adding 10K nodes is slow (10 seconds). Batch API would be 10x faster.

**Proposed API:**
```typescript
await graph.addNodesBatch([
  { id: '1', content: '...' },
  { id: '2', content: '...' },
  // ...
]);
```

**Alternatives:**
- Stream API: More complex, less user-friendly
- Parallel promises: Already possible with Promise.all()
```

---

### 3. Improve Documentation

Found a typo? Unclear explanation? Submit a PR:
- Fix typos in README.md, docs/, or code comments
- Add examples to API reference
- Clarify confusing sections

**Documentation Guidelines:**
- Use clear, simple language
- Provide code examples
- Explain the "why" not just the "what"

---

### 4. Write Code

Ready to contribute code? Follow the process below.

---

## Development Setup

### Prerequisites

- **Node.js:** >= 20.0.0
- **npm:** >= 10.0.0
- **Git:** Latest version
- **Anthropic API Key:** Get from [console.anthropic.com](https://console.anthropic.com/)

### Clone and Install

```bash
# Fork the repository on GitHub first
git clone https://github.com/YOUR-USERNAME/openclaw-pro-public.git
cd openclaw-pro-public

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Build packages
npm run build

# Run tests
npm test
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

---

### 2. Make Changes

**Code Style:**
- Use TypeScript strict mode
- Follow existing code patterns
- Write clear variable/function names
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Find nodes similar to a text query using vector embeddings.
 *
 * @param query - Text to search for
 * @param options - Search options (limit, minScore, type)
 * @returns Array of similar nodes with similarity scores
 *
 * @example
 * ```typescript
 * const results = await graph.findSimilar('machine learning', {
 *   limit: 5,
 *   minScore: 0.7
 * });
 * ```
 */
async findSimilar(
  query: string,
  options?: SimilarityOptions
): Promise<SimilarityResult[]> {
  // Implementation...
}
```

---

### 3. Write Tests

**Testing Philosophy:**
- Every feature needs tests
- Aim for 80%+ code coverage
- Test edge cases and error handling

**Test Structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../src/knowledge-graph/knowledge-graph.js';

describe('KnowledgeGraph', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  afterEach(async () => {
    // Cleanup
    await graph.clear();
  });

  describe('addNode()', () => {
    it('should add a node to the graph', async () => {
      // Arrange
      const node = { id: 'test-1', content: 'Test content' };

      // Act
      await graph.addNode(node);
      const retrieved = await graph.getNode('test-1');

      // Assert
      expect(retrieved).toEqual(node);
    });

    it('should throw error for duplicate node ID', async () => {
      // Arrange
      const node = { id: 'test-1', content: 'Test content' };
      await graph.addNode(node);

      // Act & Assert
      await expect(graph.addNode(node)).rejects.toThrow('already exists');
    });
  });
});
```

**Run Tests:**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- knowledge-graph.test.ts
```

---

### 4. Lint and Format

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

**ESLint Rules:**
- No unused variables
- No `any` types (use `unknown` or proper types)
- Consistent semicolons
- 2-space indentation

---

### 5. Build and Test Locally

```bash
# Build all packages
npm run build

# Run full test suite
npm test

# Test in example project (optional)
cd examples/basic-rag
npm install
npm start
```

---

### 6. Commit Changes

**Commit Message Format:**
```
<type>: <short description>

<optional longer description>

<optional footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation change
- `refactor:` - Code refactoring
- `test:` - Test additions/fixes
- `chore:` - Build/tooling changes

**Examples:**
```
feat: Add batch node addition API

Adds addNodesBatch() method to KnowledgeGraph for efficient
bulk node insertion. 10x faster than individual addNode() calls.

Closes #123
```

```
fix: Prevent duplicate results in findSimilar()

KnowledgeGraph.findSimilar() was returning duplicate nodes when
multiple edges pointed to the same node. Fixed by deduplicating
results by node ID.

Fixes #456
```

**Commit with Git:**
```bash
git add .
git commit -m "feat: Add batch node addition API"
```

---

### 7. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name
```

**Then:**
1. Go to GitHub
2. Click "New Pull Request"
3. Fill out the PR template:

```markdown
## Description
What does this PR do?

## Motivation
Why is this change needed?

## Changes
- Added addNodesBatch() method
- Updated tests
- Updated API documentation

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manually tested with example project

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Review Process

1. **Automated Checks:** CI runs tests and linting
2. **Code Review:** Maintainer reviews your code
3. **Feedback:** Address any requested changes
4. **Approval:** Once approved, we'll merge your PR
5. **Release:** Your change will be in the next release

**Review Timeline:**
- First response: Within 3 business days
- Final decision: Within 1 week (for most PRs)

---

## Testing Guidelines

### Unit Tests

Test individual functions in isolation.

```typescript
describe('VectorStore', () => {
  it('should calculate correct cosine similarity', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBe(0);
  });
});
```

### Integration Tests

Test multiple components working together.

```typescript
describe('KnowledgeGraph + VectorStore', () => {
  it('should persist nodes to vector store', async () => {
    const graph = new KnowledgeGraph();
    await graph.addNode({ id: 'test', content: 'Test' });

    // Verify in vector store
    const store = graph.getVectorStore();
    const vector = await store.get('test');
    expect(vector).toBeTruthy();
  });
});
```

### Performance Tests

Test performance for critical operations.

```typescript
describe('Performance', () => {
  it('should handle 10K nodes in <5 seconds', async () => {
    const graph = new KnowledgeGraph();
    const start = Date.now();

    for (let i = 0; i < 10000; i++) {
      await graph.addNode({ id: `node-${i}`, content: `Content ${i}` });
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
```

---

## Architecture Decisions

When making significant changes, consider:

### Performance Impact

- Will this slow down hot paths (addNode, findSimilar)?
- Can we batch operations?
- Is memory usage acceptable?

### Breaking Changes

Avoid breaking changes when possible. If necessary:
- Document in CHANGELOG.md
- Provide migration guide
- Bump major version

### Dependencies

- Prefer zero dependencies when possible
- Only add well-maintained, audited packages
- Check license compatibility (Apache 2.0)

---

## Release Process

(For maintainers)

1. **Update Version:** Bump version in package.json
2. **Update CHANGELOG:** Document all changes
3. **Tag Release:** `git tag v1.2.3`
4. **Publish:** `npm publish --access public`
5. **GitHub Release:** Create release notes

---

## Community

### Get Help

- **Issues:** [GitHub Issues](https://github.com/wjlgatech/openclaw-pro-public/issues)
- **Discussions:** [GitHub Discussions](https://github.com/wjlgatech/openclaw-pro-public/discussions)
- **Slack:** [Community Slack](https://slack.openclaw.pro)

### Stay Updated

- Watch the repository for updates
- Follow [@openclawpro](https://twitter.com/openclawpro) on Twitter
- Subscribe to our [blog](https://blog.openclaw.pro)

---

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.

---

## Questions?

Reach out:
- **Email:** [community@openclaw.pro](mailto:community@openclaw.pro)
- **Slack:** [Join our Slack](https://slack.openclaw.pro)

Thank you for contributing! 🎉
