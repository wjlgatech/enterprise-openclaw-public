# Getting Started with OpenClaw Pro

This guide will help you set up and run OpenClaw Pro (Community Edition) in under 10 minutes.

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js:** Version 20.0.0 or higher
  - Check: `node --version`
  - Install from: [nodejs.org](https://nodejs.org/)

- **npm:** Version 10.0.0 or higher
  - Check: `npm --version`
  - Comes with Node.js

- **Anthropic API Key:** Required for AI features
  - Get from: [console.anthropic.com](https://console.anthropic.com/)
  - Sign up for free - includes free credits

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/wjlgatech/openclaw-pro-public.git
cd openclaw-pro-public
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages for the core library and server.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

**Edit `.env` and add your Anthropic API key:**

```bash
# Required: Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...your-key-here

# Optional: Change server port (default: 18789)
PORT=18789

# Optional: Change host (default: 127.0.0.1)
HOST=127.0.0.1
```

**How to get an Anthropic API key:**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Paste into your `.env` file

---

### 4. Build the Project

```bash
npm run build
```

This compiles the TypeScript code to JavaScript.

### 5. Start the Server

```bash
npm start
```

You should see:

```
OpenClaw Pro starting on http://127.0.0.1:18789
✓ Core package loaded
✓ Knowledge graph initialized
✓ Vector store ready
✓ Server listening on port 18789
```

### 6. Open in Browser

Open your browser and go to:

```
http://localhost:18789
```

You should see the OpenClaw Pro dashboard!

---

## What's Next?

### Try the Examples

Explore example projects in the `examples/` directory:

```bash
cd examples/basic-rag
npm install
npm start
```

### Read the Documentation

- [API Reference](./api-reference.md) - Complete API documentation
- [Architecture](./architecture.md) - System design and internals
- [Contributing](../CONTRIBUTING.md) - How to contribute

### Build Something!

Check out the [README](../README.md) for use cases and inspiration.

---

## Troubleshooting

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::18789
```

**Solution:** Change the port in `.env`:

```bash
PORT=3000 npm start
```

Or find and kill the process using port 18789:

```bash
# macOS/Linux
lsof -ti:18789 | xargs kill -9

# Windows
netstat -ano | findstr :18789
taskkill /PID <PID> /F
```

---

### Missing Anthropic API Key

**Error:**
```
Error: ANTHROPIC_API_KEY is required
```

**Solution:** Make sure you:
1. Created a `.env` file: `cp .env.example .env`
2. Added your API key: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restarted the server: `npm start`

**Get an API key:**
- Visit [console.anthropic.com](https://console.anthropic.com/)
- Sign up (free with credits included)
- Create a new API key
- Copy it to your `.env` file

---

### Data Corruption on Restart

**Error:**
```
Error: Failed to load knowledge graph: corrupt data
```

**Solution:** Clear the data directory and restart:

```bash
rm -rf ./data/knowledge-graph
npm start
```

**Why this happens:**
- The server was killed mid-write
- LanceDB vector store file corruption

**Prevention:**
- Use `Ctrl+C` to gracefully stop the server
- Wait for "Server shutting down..." message before killing

---

### Build Errors

**Error:**
```
Error: Cannot find module '@enterprise-openclaw/core'
```

**Solution:** Make sure you ran the build command:

```bash
npm run build
```

If that doesn't work, try:

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

---

### Tests Failing

**Error:**
```
FAIL tests/knowledge-graph.test.ts
```

**Solution:** Make sure your API key is valid:

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- knowledge-graph.test.ts
```

**Common causes:**
- Invalid or expired API key
- Network connectivity issues
- Rate limiting (Anthropic API)

---

### Memory Issues

**Error:**
```
Error: JavaScript heap out of memory
```

**Solution:** Increase Node.js memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**Why this happens:**
- Processing very large documents
- Too many nodes in knowledge graph (>1M)

**Prevention:**
- Chunk large documents before indexing
- Clear old data periodically
- Use pagination for large queries

---

## Common Tasks

### Adding Documents to Knowledge Graph

```typescript
import { KnowledgeGraph } from '@enterprise-openclaw/core';

const graph = new KnowledgeGraph();

// Add a document chunk
await graph.addNode({
  id: 'doc-1-chunk-1',
  content: 'Your document text here...',
  type: 'document_chunk',
  metadata: {
    document: 'my-doc.pdf',
    page: 1,
    source: 'user-upload'
  }
});
```

### Querying the Knowledge Graph

```typescript
// Find similar content
const results = await graph.findSimilar('What is machine learning?', {
  limit: 5,
  minScore: 0.7
});

results.forEach(result => {
  console.log(`Score: ${result.score}`);
  console.log(`Content: ${result.node.content}`);
  console.log('---');
});
```

### Clearing All Data

```bash
# Stop the server (Ctrl+C)

# Remove data directory
rm -rf ./data

# Restart
npm start
```

---

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

This watches for file changes and automatically restarts the server.

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test
npm test -- knowledge-graph.test.ts
```

---

## Production Deployment

### Environment Variables

Set these in production:

```bash
# Required
ANTHROPIC_API_KEY=your-production-key

# Server
PORT=18789
HOST=0.0.0.0  # Listen on all interfaces

# Security
ENABLE_PII_DETECTION=true
ENABLE_AUDIT_LOGGING=true

# Performance
MAX_CONCURRENT_TASKS=10
TASK_TIMEOUT_MS=300000
```

### Build for Production

```bash
# Install dependencies (production only)
npm ci --production

# Build
npm run build

# Start
NODE_ENV=production npm start
```

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "openclaw-pro" -- start

# Monitor
pm2 monit

# View logs
pm2 logs openclaw-pro

# Restart
pm2 restart openclaw-pro

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Using Docker

```bash
# Build image
docker build -t openclaw-pro .

# Run container
docker run -d \
  -p 18789:18789 \
  -e ANTHROPIC_API_KEY=your-key \
  -v $(pwd)/data:/app/data \
  --name openclaw-pro \
  openclaw-pro

# View logs
docker logs -f openclaw-pro

# Stop
docker stop openclaw-pro
```

---

## Performance Tips

### 1. Batch Operations

Instead of:
```typescript
for (const doc of docs) {
  await graph.addNode(doc); // Slow: 1 request per node
}
```

Use:
```typescript
await Promise.all(
  docs.map(doc => graph.addNode(doc)) // Fast: Parallel requests
);
```

### 2. Limit Query Results

```typescript
// Only fetch what you need
const results = await graph.findSimilar(query, {
  limit: 10  // Don't fetch 1000 results if you only show 10
});
```

### 3. Use Filters

```typescript
// Filter at query time to reduce results
const results = await graph.findSimilar(query, {
  type: 'document_chunk',  // Only search specific node types
  minScore: 0.8            // Only high-quality matches
});
```

### 4. Clear Old Data

```bash
# Periodically clear old vectors
rm -rf ./data/vector-store/*.old

# Or implement TTL (time-to-live) for old nodes
```

---

## Security Best Practices

1. **Never commit `.env`** - It contains secrets
2. **Use environment variables** - Don't hardcode API keys
3. **Enable PII detection** - Set `ENABLE_PII_DETECTION=true`
4. **Enable audit logging** - Set `ENABLE_AUDIT_LOGGING=true`
5. **Use HTTPS in production** - Add reverse proxy (nginx, Caddy)
6. **Limit API rate** - Add rate limiting middleware
7. **Validate inputs** - Always sanitize user inputs

---

## Getting Help

### Documentation

- [API Reference](./api-reference.md)
- [Architecture](./architecture.md)
- [Contributing Guide](../CONTRIBUTING.md)

### Community

- **Issues:** [GitHub Issues](https://github.com/wjlgatech/openclaw-pro-public/issues)
- **Discussions:** [GitHub Discussions](https://github.com/wjlgatech/openclaw-pro-public/discussions)
- **Slack:** [Join Community Slack](https://slack.openclaw.pro)

### Support

- **Email:** [community@openclaw.pro](mailto:community@openclaw.pro)
- **Twitter:** [@openclawpro](https://twitter.com/openclawpro)

---

## What's Next?

- **Build a RAG system:** Check out `examples/basic-rag`
- **Explore the API:** Read [API Reference](./api-reference.md)
- **Contribute:** See [Contributing Guide](../CONTRIBUTING.md)
- **Deploy to production:** Follow production deployment guide above

---

Happy building! 🚀
