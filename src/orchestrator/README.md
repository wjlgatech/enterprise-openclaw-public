# Distiller Orchestrator

AI Refinery compatible orchestration engine for Enterprise OpenClaw.

## Features

- ✅ **YAML Configuration** - Load AI Refinery compatible configs
- ✅ **Executor Dictionary** - Register and manage agent executors
- ✅ **Intelligent Routing** - Route queries to appropriate agents
- ✅ **Task Decomposition** - Break down complex queries into subtasks
- ✅ **DAG Execution** - Execute tasks with dependency management
- ✅ **Memory Context** - Manage date, environment, and chat history contexts
- ✅ **Configuration Validation** - Zod schema validation

## Usage

### Basic Usage

```typescript
import { DistillerOrchestrator } from './orchestrator/distiller-orchestrator';

// Create orchestrator
const orchestrator = new DistillerOrchestrator();

// Load configuration
await orchestrator.loadConfig('./config/distiller-config.yaml');

// Register agent executors
orchestrator.registerAgent('search', async (query: string) => {
  // Search implementation
  return `Search results for: ${query}`;
});

// Execute query with intelligent routing
const result = await orchestrator.query('Research AI trends');
```

### With SearchAgent Integration

```typescript
import { DistillerOrchestrator } from './orchestrator/distiller-orchestrator';
import { SearchAgent } from '../extensions/agent-library/utility-agents/search-agent';

// Create orchestrator
const orchestrator = new DistillerOrchestrator();
await orchestrator.loadConfig('./config/distiller-config.yaml');

// Create and register SearchAgent
const searchAgent = new SearchAgent({
  agentName: 'search',
  agentDescription: 'Searches the web for information',
  selfReflection: { enabled: true, maxAttempts: 2 },
});

orchestrator.registerAgent('search', (query) => searchAgent.execute(query));

// Use with intelligent routing
const result = await orchestrator.query('Search for TypeScript tutorials');
```

See `examples/search-agent-example.ts` for complete integration example.

## Test Results

- ✅ 24 tests passing
- ✅ All acceptance criteria met
- ✅ Production-ready code quality
