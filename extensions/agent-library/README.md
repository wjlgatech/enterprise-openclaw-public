# Agent Library

AI Refinery compatible agent implementations for Enterprise OpenClaw.

## Available Agents

### Utility Agents

#### SearchAgent

Performs web searches and returns formatted results with self-reflection capabilities.

**Features:**
- Web search integration (mock implementation, ready for API integration)
- Structured search results (title, URL, snippet)
- Self-reflection for quality validation
- Error handling and timeout protection
- Configurable result limits
- Deduplication of results

**Usage:**

```typescript
import { SearchAgent } from './utility-agents/search-agent';
import { DistillerOrchestrator } from '../../src/orchestrator/distiller-orchestrator';

// Create search agent
const searchAgent = new SearchAgent({
  agentName: 'search',
  agentDescription: 'Searches the web for information',
  selfReflection: {
    enabled: true,
    maxAttempts: 2,
  },
  llm: 'ollama:phi4',
  temperature: 0.7,
  maxTokens: 2048,
});

// Use directly
const results = await searchAgent.execute('TypeScript best practices');
console.log(results);

// Register with orchestrator
const orchestrator = new DistillerOrchestrator();
await orchestrator.loadConfig('./config/distiller-config.yaml');

orchestrator.registerAgent('search', async (query: string) => {
  return await searchAgent.execute(query);
});

// Use through orchestrator
const answer = await orchestrator.query('What is machine learning?');
```

**Configuration:**

```yaml
utility_agents:
  - agent_name: search
    agent_description: "Searches the web for relevant information"
    self_reflection:
      enabled: true
      max_attempts: 2
    llm: ollama:phi4
    temperature: 0.7
    max_tokens: 2048
```

**API:**

- `execute(query: string, context?: any): Promise<string>` - Main execution method
- `search(query: string, options?: SearchOptions): Promise<SearchResult[]>` - Get structured results
- `selfReflect(query: string, result: string): Promise<string>` - Validate and improve results
- `getConfig(): SearchAgentConfig` - Get agent configuration

**Search Result Format:**

```typescript
interface SearchResult {
  title: string;      // Result title
  url: string;        // Result URL
  snippet: string;    // Result description/snippet
}
```

**Production Integration:**

The current implementation uses mock search results for testing. To integrate with real search APIs:

1. **Google Custom Search:**
   ```typescript
   // Install: npm install googleapis
   import { google } from 'googleapis';

   const customsearch = google.customsearch('v1');
   const res = await customsearch.cse.list({
     auth: API_KEY,
     cx: SEARCH_ENGINE_ID,
     q: query,
   });
   ```

2. **Brave Search:**
   ```typescript
   // Install: npm install node-fetch
   const response = await fetch(
     `https://api.search.brave.com/res/v1/web/search?q=${query}`,
     {
       headers: { 'X-Subscription-Token': API_KEY }
     }
   );
   ```

3. **DuckDuckGo (no API key required):**
   ```typescript
   // Install: npm install duck-duck-scrape
   import { search } from 'duck-duck-scrape';
   const results = await search(query);
   ```

**Testing:**

All 23 tests passing with comprehensive coverage:
- Agent interface conformance
- Search execution
- Result formatting
- Self-reflection
- Error handling
- Configuration
- Integration with orchestrator

## Coming Soon

- **ResearchAgent** - Deep research with compression and reranking
- **AnalyticsAgent** - Data analysis and insights
- **PlanningAgent** - Task planning with dependencies
- **BaseSuperAgent** - Multi-agent coordination

## Architecture

All agents follow the AI Refinery agent interface:

```typescript
interface Agent {
  execute(query: string, context?: any): Promise<string>;
  selfReflect(query: string, result: string): Promise<string>;
  getConfig(): AgentConfig;
}
```

This ensures compatibility with the Distiller orchestrator and enables seamless agent composition.
