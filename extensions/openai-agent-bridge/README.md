# OpenAI Agent Platform Bridge

## Overview

Integrates OpenAI's Agent Platform with Enterprise OpenClaw, enabling:
1. Use OpenAI Agents SDK for tool-rich agent workflows
2. Leverage Responses API for built-in tool execution
3. Provider-agnostic support (100+ LLMs beyond OpenAI)
4. Full tracing and handoff capabilities

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Enterprise OpenClaw                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │        OpenAI Agent Bridge Plugin                    │ │
│  │                                                      │ │
│  │  ┌────────────┐    ┌──────────────┐   ┌─────────┐ │ │
│  │  │ Responses  │    │   Agents     │   │  Tool   │ │ │
│  │  │    API     │◄───┤     SDK      │◄──┤ Bridge  │ │ │
│  │  │  Adapter   │    │   Wrapper    │   │         │ │ │
│  │  └────────────┘    └──────────────┘   └─────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│              OpenAI Agent Platform                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Responses API (New)                                 │ │
│  │  ├─ Built-in tool execution                          │ │
│  │  ├─ Simplified agent workflows                       │ │
│  │  └─ Replaces Assistants API                          │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Agents SDK (Open Source)                           │ │
│  │  ├─ Tool use & handoffs                             │ │
│  │  ├─ Guardrails & tracing                            │ │
│  │  ├─ Provider-agnostic (100+ LLMs)                   │ │
│  │  └─ Python + TypeScript support                     │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Model Support                                       │ │
│  │  ├─ GPT-4o, o1, o3-mini                             │ │
│  │  ├─ 100+ other LLMs via SDK                         │ │
│  │  └─ Custom model integration                         │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Responses API Integration
- Simplified agent creation (replaces complex Assistants API)
- Built-in tool execution
- Streaming support
- Native function calling

### 2. Provider-Agnostic SDK
- Support for 100+ LLM providers (not just OpenAI)
- Consistent API across providers
- Easy model switching
- Cost optimization via provider selection

### 3. Tool Use & Handoffs
- Rich tool ecosystem
- Agent-to-agent handoffs
- Parallel tool execution
- Tool result streaming

### 4. Guardrails & Tracing
- Built-in safety mechanisms
- Full execution traces
- Debug capabilities
- Performance monitoring

## Installation

```bash
# Python
pip install openai-agents

# Node.js
npm install @openai/agents-sdk
```

## Configuration

```yaml
# ~/.enterprise-openclaw/config.yaml
enterprise:
  plugins:
    - openai-agent-bridge

  openaiAgentBridge:
    enabled: true

    # Responses API (Primary)
    responsesAPI:
      apiKey: ${OPENAI_API_KEY}
      defaultModel: gpt-4o
      streaming: true

    # Multi-provider support via SDK
    providers:
      - name: openai
        apiKey: ${OPENAI_API_KEY}
        models: [gpt-4o, o1, o3-mini]

      - name: anthropic
        apiKey: ${ANTHROPIC_API_KEY}
        models: [claude-3-5-sonnet]

      - name: groq
        apiKey: ${GROQ_API_KEY}
        models: [llama-3-70b]

    # Tracing & observability
    tracing:
      enabled: true
      provider: opentelemetry
      endpoint: ${OTEL_ENDPOINT}

    # Guardrails
    guardrails:
      maxToolCalls: 10
      timeout: 300000
      contentFiltering: true
```

## Usage Examples

### Use Responses API

```typescript
// OpenClaw task using OpenAI Responses API
{
  "tenantId": "acme-corp",
  "sessionId": "session-1",
  "description": "Analyze codebase and suggest improvements",
  "agents": [
    {
      "name": "code-analyzer",
      "type": "openai-responses",
      "config": {
        "model": "gpt-4o",
        "tools": ["code_interpreter", "file_search"],
        "instructions": "Analyze code quality and security"
      }
    }
  ]
}
```

### Use Agents SDK with Custom Tools

```typescript
// Define custom tool
const customTool = {
  name: "database_query",
  description: "Query the production database",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number" }
    }
  },
  execute: async (params) => {
    return await db.query(params.query, params.limit);
  }
};

// Create agent with tool
{
  "name": "data-analyst",
  "type": "openai-agent-sdk",
  "config": {
    "model": "gpt-4o",
    "tools": [customTool],
    "provider": "openai"  // or anthropic, groq, etc.
  }
}
```

### Agent Handoffs

```typescript
// Multi-agent workflow with handoffs
const workflow = {
  "agents": [
    {
      "name": "triage",
      "type": "openai-agent-sdk",
      "config": {
        "model": "gpt-4o",
        "handoffs": ["sales-agent", "support-agent", "billing-agent"]
      }
    },
    {
      "name": "sales-agent",
      "type": "openai-agent-sdk",
      "config": {
        "model": "o1",
        "specialized": "sales"
      }
    }
  ]
};
```

### Provider Switching

```typescript
// Use different providers for cost optimization
{
  "agents": [
    {
      "name": "quick-summary",
      "type": "openai-agent-sdk",
      "config": {
        "provider": "groq",        // Fast & cheap
        "model": "llama-3-70b"
      }
    },
    {
      "name": "deep-analysis",
      "type": "openai-agent-sdk",
      "config": {
        "provider": "openai",      // High quality
        "model": "o1"
      }
    }
  ]
}
```

## API Reference

### ResponsesAPIAdapter

```typescript
interface ResponsesAPIAdapter {
  // Create agent with Responses API
  createAgent(config: ResponsesAgentConfig): Promise<Agent>;

  // Execute with built-in tools
  execute(agent: Agent, input: string): Promise<Response>;

  // Stream response
  stream(agent: Agent, input: string): AsyncIterable<ResponseChunk>;

  // Tool management
  registerTool(tool: Tool): void;
  listTools(): Tool[];
}
```

### AgentSDKWrapper

```typescript
interface AgentSDKWrapper {
  // Create provider-agnostic agent
  createAgent(config: AgentConfig): Promise<SDKAgent>;

  // Execute with custom provider
  executeWithProvider(
    agent: SDKAgent,
    input: string,
    provider: string
  ): Promise<Response>;

  // Handoff to another agent
  handoff(
    fromAgent: SDKAgent,
    toAgent: SDKAgent,
    context: any
  ): Promise<void>;

  // Get execution trace
  getTrace(executionId: string): Promise<Trace>;
}
```

### ToolBridge

```typescript
interface ToolBridge {
  // Import OpenAI tools to OpenClaw
  importTools(agent: Agent): Promise<AgentTool[]>;

  // Export OpenClaw tools to OpenAI
  exportTools(tools: AgentTool[]): Promise<OpenAITool[]>;

  // Execute tool
  executeTool(tool: Tool, params: any): Promise<any>;
}
```

## Built-in Tools

### Responses API Tools
1. **Code Interpreter**: Execute Python code in sandbox
2. **File Search**: RAG over uploaded files
3. **Function Calling**: Custom function execution

### SDK Tools (via extensions)
1. **Web Search**: Internet search capabilities
2. **Computer Use**: Browser automation
3. **Custom Tools**: User-defined functions

## Benefits

### 1. Simplicity
- Responses API: Much simpler than old Assistants API
- SDK: Clean, intuitive interface
- Quick setup and deployment

### 2. Provider Flexibility
- Not locked into OpenAI only
- Use 100+ LLM providers
- Cost optimization via provider selection
- Fallback and load balancing

### 3. Rich Tooling
- Built-in code execution
- File search (RAG)
- Custom tools easy to add
- Agent handoffs built-in

### 4. Production Ready
- Full tracing and debugging
- Guardrails for safety
- Streaming for real-time UX
- Open source and well-documented

## Model Comparison

| Model | Use Case | Speed | Cost | Quality |
|-------|----------|-------|------|---------|
| **GPT-4o** | General purpose | Fast | $$$ | High |
| **o1** | Complex reasoning | Slow | $$$$ | Very High |
| **o3-mini** | Quick tasks | Very Fast | $ | Medium |
| **Claude 3.5** | Code & analysis | Fast | $$$ | Very High |
| **Llama 3 70B** | High throughput | Very Fast | $ | Good |

## Pricing (via SDK)

### OpenAI Models
- **GPT-4o**: $2.50/$10 per 1M tokens (in/out)
- **o1**: $15/$60 per 1M tokens
- **o3-mini**: $1.10/$4.40 per 1M tokens

### Alternative Providers (via SDK)
- **Groq (Llama)**: $0.05/$0.08 per 1M tokens
- **Together AI**: $0.20/$0.20 per 1M tokens
- **Anthropic (Claude)**: $3/$15 per 1M tokens

## Migration from Assistants API

**Note**: OpenAI plans to deprecate Assistants API by mid-2026.

### Migration Path

```python
# Old Assistants API
assistant = client.beta.assistants.create(
    name="Code Reviewer",
    instructions="Review code for issues",
    tools=[{"type": "code_interpreter"}],
    model="gpt-4"
)

# New Responses API (via bridge)
{
  "name": "code-reviewer",
  "type": "openai-responses",
  "config": {
    "model": "gpt-4o",
    "tools": ["code_interpreter"],
    "instructions": "Review code for issues"
  }
}
```

## Deployment Options

### Option 1: OpenAI Cloud
- Use OpenAI's hosted platform
- Simplest deployment
- Pay-per-use pricing

### Option 2: Self-Hosted SDK
- Run Agents SDK on your infrastructure
- Use any LLM provider
- Full control over data

### Option 3: Hybrid
- Responses API for OpenAI models
- SDK for other providers
- Best of both worlds

## Roadmap

- [x] Phase 1: Responses API integration
- [x] Phase 2: Agents SDK wrapper
- [ ] Phase 3: Provider abstraction layer
- [ ] Phase 4: Tool ecosystem bridge
- [ ] Phase 5: Advanced tracing integration
- [ ] Phase 6: Multi-agent workflows

## Security Considerations

1. **API Key Management**
   - Rotate keys regularly
   - Use separate keys per environment
   - Never commit keys to git

2. **Content Filtering**
   - Enable OpenAI moderation
   - Add custom filters
   - Log all interactions

3. **Rate Limiting**
   - Implement per-user limits
   - Use exponential backoff
   - Monitor for abuse

4. **Data Privacy**
   - PII detection before sending
   - Opt-out of training data
   - Audit all requests

## Sources

- [Agents SDK Guide](https://platform.openai.com/docs/guides/agents-sdk)
- [OpenAI Agents SDK Python](https://github.com/openai/openai-agents-python)
- [Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [Agents Resources](https://developers.openai.com/resources/agents)
- [OpenAI for Developers 2025](https://developers.openai.com/blog/openai-for-developers-2025/)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Apache 2.0 (inherits from Enterprise OpenClaw)
