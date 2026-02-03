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

#### ResearchAgent

Performs deep research using document compression and reranking for high-quality results.

**Features:**
- Complete research pipeline: Search → Compress → Rerank → Synthesize
- Document compression (extractive, abstractive, hybrid strategies)
- Relevance-based reranking (TF-IDF, semantic, cross-encoder)
- Intelligent response synthesis
- Self-reflection for quality assurance
- Configurable compression ratios and ranking strategies

**Usage:**

```typescript
import { ResearchAgent } from './utility-agents/research-agent';

// Create research agent
const researchAgent = new ResearchAgent({
  agentName: 'research',
  agentDescription: 'Deep research with compression and reranking',
  selfReflection: {
    enabled: true,
    maxAttempts: 2,
  },
  compressionRatio: 0.5, // Compress to 50%
  topK: 5, // Return top 5 results
});

// Use directly
const result = await researchAgent.execute(
  'What are the latest developments in quantum computing?'
);

// Use with options
const detailedResult = await researchAgent.execute(
  'Explain transfer learning in AI',
  {
    compressionRatio: 0.3, // Aggressive compression
    rerankStrategy: 'semantic',
    minRelevanceScore: 0.3,
    includeSources: true,
    synthesisStyle: 'detailed',
  }
);

// Get structured research results
const research = await researchAgent.research('machine learning algorithms', {
  maxResults: 10,
  compressionRatio: 0.4,
  rerankStrategy: 'tfidf',
});

console.log('Ranked documents:', research.rankedDocuments);
console.log('Synthesis:', research.synthesis);
```

**Configuration:**

```yaml
utility_agents:
  - agent_name: research
    agent_description: "Deep research with document compression and reranking"
    self_reflection:
      enabled: true
      max_attempts: 2
    llm: ollama:phi4
    temperature: 0.7
    max_tokens: 4096
```

**Pipeline Details:**

1. **Search**: Retrieves relevant documents (mock implementation, ready for API integration)
2. **Compress**: Reduces document length using:
   - Extractive: Select important sentences
   - Abstractive: Generate summaries (LLM-based)
   - Hybrid: Combine both approaches
3. **Rerank**: Orders documents by relevance using:
   - TF-IDF: Term frequency-inverse document frequency
   - Semantic: Embedding-based similarity
   - Cross-Encoder: Pairwise relevance scoring
4. **Synthesize**: Generates coherent response with sources

**Test Results:**
- ✅ 33 ResearchAgent tests passing
- ✅ 17 DocumentCompressor tests passing
- ✅ 20 DocumentReranker tests passing
- ✅ Total: 70 tests passing

**Production Integration:**

Current implementation uses rule-based compression and TF-IDF reranking. For production:

1. **Compression**: Integrate LLMLingua
   ```bash
   pip install llmlingua
   ```

2. **Reranking**: Use sentence transformers or cross-encoders
   ```bash
   pip install sentence-transformers
   ```

3. **Search**: Connect to real search APIs (covered in SearchAgent docs)

#### AnalyticsAgent

Performs statistical analysis on data in JSON/CSV formats, generates insights, and provides data-driven recommendations.

**Features:**
- Multiple data format support (JSON arrays, JSON objects, CSV)
- Comprehensive statistical analysis (mean, median, mode, standard deviation, variance, quartiles)
- Correlation analysis between variables
- Trend analysis with linear regression
- Outlier detection using IQR method
- Distribution analysis (skewness, coefficient of variation)
- Automated insight generation
- Data-driven recommendations
- Self-reflection for analysis quality

**Usage:**

```typescript
import { AnalyticsAgent } from './utility-agents/analytics-agent';

// Create analytics agent
const analyticsAgent = new AnalyticsAgent({
  agentName: 'analytics',
  agentDescription: 'Data analysis and statistical insights agent',
  selfReflection: {
    enabled: true,
    maxAttempts: 2,
  },
  analysisDepth: 'detailed',
});

// Analyze JSON array data
const jsonData = JSON.stringify([10, 20, 30, 40, 50, 45, 55]);
const result = await analyticsAgent.execute(jsonData);
console.log(result);
// Output includes: mean, median, mode, std dev, variance, outliers, insights, recommendations

// Analyze CSV data
const csvData = `
temperature,humidity
72,45
75,50
68,55
70,48
73,52
`.trim();
const csvResult = await analyticsAgent.execute(csvData, {
  format: 'csv',
  column: 'temperature'
});

// Correlation analysis
const correlationData = JSON.stringify({
  x: [1, 2, 3, 4, 5],
  y: [2, 4, 6, 8, 10]
});
const correlation = await analyticsAgent.execute(correlationData, {
  analysis: 'correlation'
});
// Output: correlation coefficient, strength, direction, insights

// Trend analysis
const trendData = JSON.stringify([10, 12, 15, 18, 22, 28]);
const trend = await analyticsAgent.execute(trendData, {
  analysis: 'trend'
});
// Output: trend direction, slope, strength, recommendations
```

**Configuration:**

```yaml
utility_agents:
  - agent_name: analytics
    agent_description: "Performs statistical analysis and generates insights"
    self_reflection:
      enabled: true
      max_attempts: 2
    llm: ollama:phi4
    temperature: 0.7
    max_tokens: 2048
    analysis_depth: detailed  # basic | detailed | comprehensive
```

**API:**

- `execute(data: string, context?: AnalyticsOptions): Promise<string>` - Main analysis method
- `selfReflect(query: string, result: string): Promise<string>` - Validate analysis quality
- `getConfig(): AnalyticsAgentConfig` - Get agent configuration

**Analysis Options:**

```typescript
interface AnalyticsOptions {
  format?: 'json' | 'csv';              // Data format (auto-detected if not specified)
  column?: string;                       // CSV column name to analyze
  analysis?: 'basic' | 'correlation' | 'trend' | 'all';  // Analysis type
  includeVisualizationData?: boolean;    // Include data for visualization
  visualization?: 'histogram' | 'scatter' | 'line';      // Visualization type
}
```

**Statistical Measures:**

Basic analysis includes:
- Count, Mean, Median, Mode
- Standard Deviation, Variance
- Min, Max, Range
- Quartiles (Q1, Q3)
- Coefficient of Variation
- Outlier detection (IQR method)
- Distribution skewness

**Insights Generated:**

- Data variability assessment (low/moderate/high)
- Outlier identification and reporting
- Distribution shape analysis
- Sample size adequacy
- Data quality recommendations
- Actionable recommendations based on findings

**Test Results:**

- ✅ 54 AnalyticsAgent tests passing
- ✅ 89.69% line coverage
- ✅ 84.37% branch coverage
- ✅ 100% function coverage
- ✅ Exceeds 80% coverage requirement

**Example Output:**

```
Statistical Analysis Results
================================

Basic Statistics:
-----------------
Count: 7
Mean: 35.71
Median: 40.00
Mode: No mode
Standard Deviation: 15.59
Variance: 242.86
Min: 10.00
Max: 55.00
Range: 45.00
Q1 (25th percentile): 25.00
Q3 (75th percentile): 47.50

Insights:
---------
• Data shows high variability (CV: 43.7%)
• Values are spread out with significant variation
• No significant outliers detected
• Distribution appears relatively symmetric

Recommendations:
----------------
• High variability suggests need for deeper investigation
• Consider segmenting data to find more consistent subgroups
• Sample size is relatively small (n=7)
• Consider collecting more data for stronger conclusions
```

**Production Integration:**

The AnalyticsAgent uses the `simple-statistics` library for calculations. For advanced analytics:

1. **Time Series Analysis**: Integrate with libraries like `d3` or `timeseries-analysis`
2. **Advanced Statistics**: Add support for hypothesis testing, ANOVA, chi-square tests
3. **Machine Learning**: Connect to TensorFlow.js or ONNX for predictive modeling
4. **Visualization**: Integrate with Chart.js, D3.js, or Plotly for interactive charts

#### PlanningAgent

Analyzes task complexity, generates step-by-step plans, and creates DAG workflows with dependency management.

**Features:**
- Task complexity analysis
- Task decomposition into subtasks
- Dependency detection and validation
- DAG (Directed Acyclic Graph) construction
- Cycle detection and prevention
- Topological sorting for execution order
- Time estimation for tasks
- Resource allocation recommendations
- Self-reflection for plan quality

**Usage:**

```typescript
import { PlanningAgent } from './utility-agents/planning-agent';

// Create planning agent
const planningAgent = new PlanningAgent({
  agentName: 'planner',
  agentDescription: 'Task planning and workflow orchestration',
  selfReflection: {
    enabled: true,
    maxAttempts: 2,
  },
  maxPlanNodes: 20,
});

// Use directly
const plan = await planningAgent.execute(
  'Build and deploy a full-stack web application'
);
console.log(plan);

// Get structured plan
const taskPlan = await planningAgent.plan(
  'Create REST API with authentication',
  {
    includeTimeEstimates: true,
    includeResources: true,
  }
);

console.log('Plan nodes:', taskPlan.nodes);
console.log('Execution order:', taskPlan.executionOrder);
```

**Configuration:**

```yaml
utility_agents:
  - agent_name: planner
    agent_description: "Task planning and dependency management"
    self_reflection:
      enabled: true
      max_attempts: 2
    llm: ollama:phi4
    temperature: 0.7
    max_tokens: 4096
    max_plan_nodes: 20
```

**API:**

- `execute(task: string, context?: any): Promise<string>` - Main execution method
- `plan(task: string, options?: PlanningOptions): Promise<TaskPlan>` - Get structured plan
- `selfReflect(task: string, result: string): Promise<string>` - Validate plan quality
- `getConfig(): PlanningAgentConfig` - Get agent configuration

**Plan Structure:**

```typescript
interface PlanNode {
  id: string;              // Unique task identifier
  task: string;            // Task name
  description: string;     // Detailed description
  estimatedTime?: string;  // Time estimate (e.g., "2 hours", "3 days")
  dependencies: string[];  // IDs of prerequisite tasks
  resources?: string[];    // Required resources
}

interface TaskPlan {
  nodes: PlanNode[];          // All plan nodes
  executionOrder: string[];   // Topologically sorted task IDs
}
```

**Planning Options:**

```typescript
interface PlanningOptions {
  includeTimeEstimates?: boolean;  // Add time estimates (default: true)
  includeResources?: boolean;      // Add resource allocation (default: false)
  maxDepth?: number;              // Max decomposition depth
}
```

**Key Features:**

1. **Task Decomposition**: Automatically breaks down complex tasks into manageable subtasks based on patterns and keywords.

2. **Dependency Detection**: Identifies which tasks must be completed before others can start, ensuring logical workflow.

3. **DAG Construction**: Creates a directed acyclic graph where nodes are tasks and edges are dependencies.

4. **Cycle Prevention**: Validates and removes any circular dependencies to ensure valid execution order.

5. **Topological Sort**: Uses Kahn's algorithm to produce optimal execution order respecting all dependencies.

6. **Time Estimation**: Provides realistic time estimates based on task type and complexity.

7. **Resource Allocation**: Identifies required resources (personnel, tools, environments) for each task.

**Example Output:**

```
Task Plan: "Build and deploy a full-stack web application"

Total Steps: 4

=== Plan Steps ===

1. Requirements Analysis
   ID: task-1
   Description: Analyze and document requirements
   Dependencies: None (can start immediately)
   Estimated Time: 2 hours
   Resources: Business Analyst, Product Owner

2. Design & Architecture
   ID: task-2
   Description: Design system architecture and components
   Dependencies: task-1
   Estimated Time: 1 days
   Resources: System Architect, Designer

3. Implementation
   ID: task-3
   Description: Implement Build and deploy a full-stack web application
   Dependencies: task-1, task-2
   Estimated Time: 2 weeks
   Resources: Developer, Development Environment

4. Testing
   ID: task-4
   Description: Write and execute tests
   Dependencies: task-3
   Estimated Time: 1 days
   Resources: QA Engineer, Testing Environment

=== Execution Order ===

1. Requirements Analysis (task-1)
2. Design & Architecture (task-2)
3. Implementation (task-3)
4. Testing (task-4)

Workflow: task-1 → task-2 → task-3 → task-4
```

**Testing:**

All 51 tests passing with comprehensive coverage:
- Agent interface conformance
- Task complexity analysis
- Plan generation
- Dependency detection
- DAG structure validation
- Cycle detection
- Topological sorting
- Time estimation
- Resource allocation
- Self-reflection
- Error handling
- Configuration
- Integration with orchestrator

**Integration with Orchestrator:**

```typescript
// Register with orchestrator
orchestrator.registerAgent('planner', async (query: string) => {
  return await planningAgent.execute(query);
});

// Use through orchestrator for task decomposition
const decomposedPlan = await orchestrator.query(
  'Plan the development of a microservices architecture',
  { defaultAgent: 'planner' }
);
```

## Coming Soon

- **AnalyticsAgent** - Data analysis and insights
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
