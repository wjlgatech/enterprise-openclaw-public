# Getting Started with OpenClaw Pro (Community Edition)

## Quick Start

### 1. Prerequisites

- Node.js >= 20.0.0
- Anthropic API key ([get one here](https://console.anthropic.com/))

### 2. Installation

```bash
git clone https://github.com/wjlgatech/openclaw-pro-public.git
cd openclaw-pro-public
npm install
```

### 3. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your-actual-api-key-here
```

### 4. Build and Run

```bash
npm run build
npm start
```

The server will start on http://localhost:18789

### 5. Verify Installation

Open your browser to http://localhost:18789

You should see the OpenClaw Pro chat interface.

### 6. Your First Query

Try asking:
- "What is OpenClaw Pro?"
- "How do I use the knowledge graph?"
- "Explain the DRIFT RAG system"

---

## Configuration Options

See `.env.example` for all configuration options:

- `PORT` - Server port (default: 18789)
- `HOST` - Server host (default: 127.0.0.1)
- `MAX_CONCURRENT_TASKS` - Concurrent task limit
- `ENABLE_PII_DETECTION` - PII detection (default: true)
- `ENABLE_AUDIT_LOGGING` - Audit logging (default: true)

---

## Troubleshooting

### Port Already in Use

If port 18789 is busy, change it:

```bash
PORT=3000 npm start
```

### Data Corruption on Restart

If you see errors on second run, clear the data directory:

```bash
rm -rf ./data/knowledge-graph
npm start
```

### API Key Issues

Make sure your `.env` file has a valid Anthropic API key:

```bash
# Test your key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

---

## Next Steps

- [API Reference](./api-reference.md)
- [Architecture Overview](./architecture.md)
- [Contributing Guide](../CONTRIBUTING.md)
