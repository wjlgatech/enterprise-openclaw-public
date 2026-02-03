# Claude Agent SDK Bridge

## Overview

Integrates Anthropic's Claude Agent SDK with Enterprise OpenClaw, enabling:
1. Use Claude's native agent capabilities
2. Leverage Claude-optimized tool patterns
3. Access extended thinking and artifacts
4. Seamless integration with Claude's latest features

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Enterprise OpenClaw                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │        Claude Agent Bridge Plugin                    │ │
│  │                                                      │ │
│  │  ┌────────────┐    ┌──────────────┐   ┌─────────┐ │ │
│  │  │   Agent    │    │   Extended   │   │  Tool   │ │ │
│  │  │    SDK     │◄───┤   Thinking   │◄──┤ System  │ │ │
│  │  │  Wrapper   │    │  + Artifacts │   │         │ │ │
│  │  └────────────┘    └──────────────┘   └─────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│              Claude Agent SDK                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Agent Framework                                     │ │
│  │  ├─ Extended thinking mode                           │ │
│  │  ├─ Artifact generation                              │ │
│  │  ├─ Tool use patterns                                │ │
│  │  └─ Streaming responses                              │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Claude Models                                       │ │
│  │  ├─ Claude 3.5 Sonnet (best for code)               │ │
│  │  ├─ Claude 3 Opus (highest quality)                 │ │
│  │  ├─ Claude 3 Haiku (fast & efficient)               │ │
│  │  └─ Claude Sonnet 4 (latest)                        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Native Claude Integration
- Optimized for Claude's capabilities
- Extended thinking mode for complex reasoning
- Artifact generation for rich outputs
- Streaming for real-time responses

### 2. Advanced Tool Patterns
- Computer use (bash, editor)
- Tool chaining and composition
- Parallel tool execution
- Tool result caching

### 3. Extended Thinking
- Long-form reasoning before responses
- Transparent thought process
- Higher quality outputs
- Better for complex tasks

### 4. Artifacts
- Structured outputs (code, documents, data)
- Version tracking
- Rich formatting
- Easy integration

## Installation

```bash
pip install claude-agent-sdk
```

## Configuration

```yaml
# ~/.enterprise-openclaw/config.yaml
enterprise:
  plugins:
    - claude-agent-bridge

  claudeAgentBridge:
    enabled: true

    # API Configuration
    anthropic:
      apiKey: ${ANTHROPIC_API_KEY}
      defaultModel: claude-sonnet-4-20250514
      streaming: true

    # Extended thinking
    extendedThinking:
      enabled: true
      budget: 10000  # max thinking tokens

    # Artifacts
    artifacts:
      enabled: true
      storage: ./data/artifacts

    # Tool configuration
    tools:
      computerUse:
        enabled: true
        sandboxed: true
      bash:
        enabled: true
        allowedCommands: [ls, cat, grep, find]
      textEditor:
        enabled: true
        maxFileSize: 1048576  # 1MB
```

## Usage Examples

### Basic Claude Agent

```typescript
// OpenClaw task using Claude Agent SDK
{
  "tenantId": "acme-corp",
  "sessionId": "session-1",
  "description": "Refactor codebase for better performance",
  "agents": [
    {
      "name": "claude-refactorer",
      "type": "claude-agent-sdk",
      "config": {
        "model": "claude-sonnet-4-20250514",
        "extendedThinking": true,
        "tools": ["bash", "text_editor"]
      }
    }
  ]
}
```

### With Extended Thinking

```typescript
// Complex reasoning task
{
  "name": "system-architect",
  "type": "claude-agent-sdk",
  "config": {
    "model": "claude-3-opus-20240229",
    "extendedThinking": {
      "enabled": true,
      "budget": 20000  // more thinking for complex tasks
    },
    "generateArtifacts": true
  }
}
```

### Computer Use

```typescript
// Agent with computer access
{
  "name": "code-analyzer",
  "type": "claude-agent-sdk",
  "config": {
    "model": "claude-3-5-sonnet-20241022",
    "tools": [
      {
        "name": "computer_use",
        "type": "bash_20241022",
        "sandboxed": true
      },
      {
        "name": "text_editor",
        "type": "text_editor_20241022"
      }
    ]
  }
}
```

### Artifact Generation

```python
# Python example with artifacts
from claude_agent_sdk import Agent

agent = Agent(
    model="claude-3-5-sonnet-20241022",
    extended_thinking=True,
    generate_artifacts=True
)

result = agent.execute(
    "Create a React component for user authentication",
    return_artifacts=True
)

# result.artifacts contains structured code output
for artifact in result.artifacts:
    print(f"Type: {artifact.type}")
    print(f"Content: {artifact.content}")
```

## API Reference

### ClaudeAgentWrapper

```typescript
interface ClaudeAgentWrapper {
  // Create Claude agent
  createAgent(config: ClaudeAgentConfig): Promise<ClaudeAgent>;

  // Execute with extended thinking
  executeWithThinking(
    agent: ClaudeAgent,
    prompt: string,
    thinkingBudget?: number
  ): Promise<Response>;

  // Generate artifacts
  generateArtifacts(
    agent: ClaudeAgent,
    prompt: string
  ): Promise<Artifact[]>;

  // Stream response
  stream(
    agent: ClaudeAgent,
    prompt: string
  ): AsyncIterable<ResponseChunk>;
}
```

### ExtendedThinkingManager

```typescript
interface ExtendedThinkingManager {
  // Enable extended thinking
  enable(agent: ClaudeAgent, budget: number): void;

  // Get thinking process
  getThinkingProcess(responseId: string): ThinkingStep[];

  // Analyze thinking quality
  analyzeQuality(thinking: ThinkingStep[]): QualityMetrics;
}
```

### ArtifactManager

```typescript
interface ArtifactManager {
  // Store artifact
  store(artifact: Artifact): Promise<string>;

  // Retrieve artifact
  get(artifactId: string): Promise<Artifact>;

  // List artifacts
  list(filters: ArtifactFilters): Promise<Artifact[]>;

  // Version artifact
  version(artifactId: string, content: string): Promise<string>;
}
```

## Tool System

### Computer Use Tools

```typescript
// Bash tool
{
  "name": "bash",
  "type": "bash_20241022",
  "config": {
    "allowedCommands": ["ls", "cat", "grep", "find", "wc"],
    "workingDirectory": "/workspace",
    "timeout": 30000
  }
}

// Text editor tool
{
  "name": "text_editor",
  "type": "text_editor_20241022",
  "config": {
    "maxFileSize": 1048576,  // 1MB
    "allowedExtensions": [".ts", ".js", ".py", ".md"],
    "backupEnabled": true
  }
}
```

### Custom Tools

```typescript
// Define custom tool for Claude
const customTool = {
  name: "database_query",
  description: "Query production database",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "SQL query" },
      limit: { type: "number", default: 100 }
    },
    required: ["query"]
  },
  execute: async (params) => {
    return await db.query(params.query, { limit: params.limit });
  }
};
```

## Benefits

### 1. Claude-Optimized
- Built specifically for Claude's capabilities
- Extended thinking for complex reasoning
- Artifact generation for structured outputs
- Streaming for real-time UX

### 2. Best-in-Class Code Generation
- Claude 3.5 Sonnet: Industry-leading code quality
- Extended thinking: Better architecture decisions
- Computer use: Can edit files directly
- Artifacts: Clean, structured outputs

### 3. Transparency
- Extended thinking shows reasoning process
- Tool use is tracked and logged
- Artifact versioning for auditability
- Full conversation history

### 4. Enterprise Ready
- Sandboxed tool execution
- Fine-grained permissions
- Audit logging
- Cost tracking

## Model Comparison

| Model | Best For | Speed | Cost | Context |
|-------|----------|-------|------|---------|
| **Sonnet 4** | Latest capabilities | Fast | $$$ | 200K |
| **3.5 Sonnet** | Code & analysis | Fast | $$ | 200K |
| **3 Opus** | Complex reasoning | Slow | $$$$ | 200K |
| **3 Haiku** | Quick tasks | Very Fast | $ | 200K |

## Pricing

### Anthropic Models (2026)
- **Claude Sonnet 4**: $3/$15 per 1M tokens (in/out)
- **Claude 3.5 Sonnet**: $3/$15 per 1M tokens
- **Claude 3 Opus**: $15/$75 per 1M tokens
- **Claude 3 Haiku**: $0.25/$1.25 per 1M tokens

### Extended Thinking
- No additional cost
- Counts toward input tokens
- Budget controlled by you

## Integration with Other Bridges

### Combined Workflow Example

```yaml
# Use best model for each task
agents:
  - name: quick-triage
    type: claude-agent-sdk
    model: claude-3-haiku-20240307  # Fast & cheap

  - name: deep-analysis
    type: openai-agent-sdk
    model: o1  # Complex reasoning

  - name: code-generation
    type: claude-agent-sdk
    model: claude-3-5-sonnet-20241022  # Best for code

  - name: integration-work
    type: google-adk
    integration: github  # Pre-built tools
```

## Deployment Options

### Option 1: Direct API
- Use Anthropic API directly
- Simplest deployment
- Pay-per-use

### Option 2: Amazon Bedrock
- Claude via AWS Bedrock
- AWS integration
- Enterprise SLAs

### Option 3: Google Vertex AI
- Claude via Vertex AI
- GCP integration
- Multi-model support

### Option 4: Azure (coming)
- Claude via Azure
- Microsoft integration
- Enterprise compliance

## Roadmap

- [x] Phase 1: Basic Claude Agent SDK integration
- [x] Phase 2: Extended thinking support
- [x] Phase 3: Artifact management
- [ ] Phase 4: Computer use tools
- [ ] Phase 5: Advanced tool chaining
- [ ] Phase 6: Multi-turn reasoning

## Security Considerations

1. **Sandboxed Execution**
   - All computer use tools run in sandboxes
   - File system access restricted
   - Network access controlled

2. **Tool Permissions**
   - Whitelist allowed commands
   - File access restrictions
   - Audit all tool executions

3. **Extended Thinking**
   - No additional security concerns
   - Thinking process logged
   - PII detection applied

4. **Artifacts**
   - Version controlled
   - Access controlled
   - Audit trail maintained

## Sources

- [Claude Agent SDK Python](https://github.com/anthropics/claude-agent-sdk-python)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude Models Overview](https://www.anthropic.com/claude)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Apache 2.0 (inherits from Enterprise OpenClaw)
