# Ollama Bridge - Local LLM Integration

## 🔒 100% ON-DEVICE - NO EXTERNAL API CALLS

This plugin enables Enterprise OpenClaw to use local Large Language Models via [Ollama](https://ollama.ai), ensuring **all your code and data stays on your machine**.

## Security Guarantees

✅ **No Data Leaves Your Machine**: All inference runs locally on localhost
✅ **No External API Calls**: Zero network requests to cloud providers
✅ **Full Privacy**: Your proprietary code never sent to external servers
✅ **Accenture Compliant**: Meets enterprise security requirements
✅ **Air-Gap Capable**: Works without internet connection (after model download)

## Why Local LLM?

| Scenario | Cloud API | Local Ollama |
|----------|-----------|--------------|
| **Your proprietary code** | ❌ Risk of leakage | ✅ Stays on device |
| **Client data** | ❌ Compliance issues | ✅ Fully compliant |
| **Architecture docs** | ❌ Sensitive | ✅ Private |
| **API keys in code** | ❌ Security risk | ✅ Safe |
| **Public info research** | ✅ Fine | ⚠️ Slower |

## Supported Models

### Code Generation & Review
- **codellama:13b** (7.4GB) - Best for code generation, recommended default
- **codellama:34b** (19GB) - Higher quality, slower
- **deepseek-coder** (6.7GB) - Excellent for code review and analysis

### General Purpose
- **mistral:7b** (4.1GB) - Fast, good for architecture discussions
- **mixtral:8x7b** (26GB) - Higher quality, needs more RAM
- **llama3:8b** (4.7GB) - Latest Llama model

### Specialized
- **phi** (1.6GB) - Super fast, smaller context
- **neural-chat** (4.1GB) - Conversational tasks

## Installation

### 1. Install Ollama
```bash
# macOS
brew install ollama

# Or download from https://ollama.ai
```

### 2. Start Ollama Service
```bash
ollama serve
# Runs on http://localhost:11434
```

### 3. Pull Models
```bash
# Essential models for AI engineer work
ollama pull codellama:13b      # Primary code model
ollama pull deepseek-coder     # Code review
ollama pull mistral:7b         # Architecture & docs

# Verify
ollama list
```

### 4. Enable in Enterprise OpenClaw
```yaml
# ~/.enterprise-openclaw/config.yaml
enterprise:
  plugins:
    - ollama-bridge

  ollama:
    host: http://localhost:11434
    defaultModel: codellama:13b
```

## Usage Examples

### Code Review (Local Only)
```typescript
const result = await api.call('ollama.codeReview', {
  code: `
function processPayment(amount, card) {
  return charge(card, amount);
}
  `,
  language: 'javascript',
  focus: ['security', 'error-handling']
});

console.log(result.content);
// Output: Detailed security analysis, recommendations
```

### Generate Documentation (Local Only)
```typescript
const docs = await api.call('ollama.generateDocs', {
  code: myComplexFunction,
  language: 'typescript',
  format: 'markdown'
});

fs.writeFileSync('./docs/api.md', docs.content);
```

### Architecture Analysis (Local Only)
```typescript
const analysis = await api.call('ollama.analyzeArchitecture', {
  design: architectureDocument,
  focus: ['scalability', 'security', 'cost']
});

console.log(analysis.content);
// Output: Detailed architectural recommendations
```

### Code Generation (Local Only)
```typescript
const code = await api.call('ollama.generateCode', {
  description: 'REST API endpoint for user authentication',
  language: 'typescript',
  requirements: [
    'JWT tokens',
    'Password hashing',
    'Rate limiting',
    'Input validation'
  ]
});

fs.writeFileSync('./src/auth.ts', code.content);
```

### Chat Interface (Local Only)
```typescript
const response = await api.call('ollama.chat', {
  messages: [
    { role: 'system', content: 'You are a senior software architect.' },
    { role: 'user', content: 'How should I design a microservices auth system?' }
  ],
  config: {
    model: 'mistral:7b',
    temperature: 0.4
  }
});
```

### Streaming Response (Local Only)
```typescript
const stream = await api.call('ollama.stream', {
  prompt: 'Explain SOLID principles with examples',
  config: { model: 'codellama:13b' }
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

## Daily Workflow Integration

### Morning Code Review
```bash
#!/bin/bash
# review-prs.sh - Review all overnight PRs locally

for pr in $(gh pr list --json number -q '.[].number'); do
  echo "Reviewing PR #$pr..."

  # Get PR diff
  diff=$(gh pr diff $pr)

  # Review locally with Ollama
  node -e "
    const api = require('./enterprise-openclaw');
    api.call('ollama.codeReview', {
      code: \`${diff}\`,
      focus: ['security', 'quality']
    }).then(r => console.log(r.content));
  "
done
```

### Auto-Document Codebase
```bash
#!/bin/bash
# document-api.sh - Generate docs for all API files

find ./src/api -name "*.ts" | while read file; do
  echo "Documenting $file..."

  code=$(cat "$file")

  node -e "
    const api = require('./enterprise-openclaw');
    api.call('ollama.generateDocs', {
      code: \`${code}\`,
      language: 'typescript',
      format: 'markdown'
    }).then(r => {
      const docFile = '$file'.replace('.ts', '.md');
      require('fs').writeFileSync(docFile, r.content);
    });
  "
done
```

### Architecture Review
```bash
#!/bin/bash
# review-arch.sh - Analyze architecture documents

for doc in ./docs/architecture/*.md; do
  content=$(cat "$doc")

  node -e "
    const api = require('./enterprise-openclaw');
    api.call('ollama.analyzeArchitecture', {
      design: \`${content}\`,
      focus: ['scalability', 'security', 'cost']
    }).then(r => {
      console.log('=== Analysis for $doc ===');
      console.log(r.content);
    });
  "
done
```

## Performance Benchmarks

### MacBook Pro M1/M2
| Model | Tokens/sec | Use Case |
|-------|-----------|----------|
| **codellama:13b** | ~20 | Code generation |
| **deepseek-coder** | ~25 | Code review |
| **mistral:7b** | ~30 | Architecture |
| **codellama:34b** | ~8 | High quality |

### RAM Requirements
| Model | Min RAM | Recommended |
|-------|---------|-------------|
| **7B models** | 8GB | 16GB |
| **13B models** | 16GB | 32GB |
| **34B models** | 32GB | 64GB |

## Task Automation Examples

### 1. Automated Code Review
```typescript
// Auto-review on git commit hook
{
  "task": "Review staged changes",
  "agent": "local-reviewer",
  "config": {
    "provider": "ollama",
    "model": "deepseek-coder",
    "method": "codeReview",
    "input": "git diff --staged"
  }
}
```

### 2. Documentation Generation
```typescript
// Generate docs on file save
{
  "task": "Update API docs",
  "agent": "doc-generator",
  "config": {
    "provider": "ollama",
    "model": "codellama:13b",
    "method": "generateDocs",
    "watch": "./src/api/**/*.ts"
  }
}
```

### 3. Architecture Analysis
```typescript
// Weekly architecture review
{
  "schedule": "0 9 * * 1",  // Monday 9 AM
  "task": "Review architecture docs",
  "agent": "architect",
  "config": {
    "provider": "ollama",
    "model": "mistral:7b",
    "method": "analyzeArchitecture",
    "input": "./docs/architecture/**/*.md"
  }
}
```

## Comparison: Ollama vs Cloud APIs

| Feature | Ollama (Local) | Cloud API |
|---------|---------------|-----------|
| **Data Privacy** | ✅ 100% private | ❌ Sent to cloud |
| **Cost** | ✅ Free (after hw) | ❌ $$ per token |
| **Latency** | ✅ Sub-second | ⚠️ Network dependent |
| **Quality** | ⚠️ Good (7-34B) | ✅ Excellent (175B+) |
| **Context Window** | ⚠️ 4K-32K | ✅ 100K-200K |
| **Compliance** | ✅ Fully compliant | ❌ Requires approval |
| **Internet Required** | ✅ No (after setup) | ❌ Yes, always |

## Recommended Setup for Enterprise Use

### Default Configuration
```yaml
ollama:
  host: http://localhost:11434
  defaultModel: codellama:13b

  # Model routing by task type
  routing:
    codeGeneration: codellama:13b
    codeReview: deepseek-coder
    architecture: mistral:7b
    documentation: codellama:13b
    chat: mistral:7b
```

### Hybrid Approach
```yaml
# Use local for sensitive, cloud for public info
agents:
  sensitive:
    provider: ollama
    model: codellama:13b
    useCases:
      - proprietary-code
      - architecture
      - client-data

  public:
    provider: claude
    model: claude-3-sonnet
    useCases:
      - research
      - tutorials
      - public-apis
```

## Troubleshooting

### Ollama Not Running
```bash
# Start service
ollama serve

# Check status
curl http://localhost:11434/api/tags
```

### Model Not Found
```bash
# List available models
ollama list

# Pull missing model
ollama pull codellama:13b
```

### Out of Memory
```bash
# Use smaller model
ollama pull codellama:7b

# Or adjust Docker memory (if using Docker)
docker update --memory=16g ollama
```

### Slow Performance
```bash
# Use faster model
ollama pull phi

# Or enable GPU acceleration (if available)
ollama serve --gpu
```

## License

Apache 2.0 (inherits from Enterprise OpenClaw)

---

**🔒 Remember: With Ollama, your code never leaves your machine. Perfect for enterprise compliance!**
