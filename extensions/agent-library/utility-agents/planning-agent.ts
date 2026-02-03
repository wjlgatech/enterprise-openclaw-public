/**
 * PlanningAgent - AI Refinery compatible task planning agent
 *
 * Implements comprehensive task planning pipeline:
 * 1. Analyze task complexity
 * 2. Decompose into subtasks
 * 3. Identify dependencies
 * 4. Generate DAG (Directed Acyclic Graph)
 * 5. Produce topological execution order
 * 6. Estimate time and resources
 */

export interface PlanNode {
  id: string;
  task: string;
  description: string;
  estimatedTime?: string;
  dependencies: string[]; // IDs of prerequisite tasks
  resources?: string[];
}

export interface TaskPlan {
  nodes: PlanNode[];
  executionOrder: string[]; // Topologically sorted task IDs
}

export interface PlanningAgentConfig {
  agentName: string;
  agentDescription: string;
  selfReflection?: {
    enabled: boolean;
    maxAttempts: number;
  };
  llm?: string;
  temperature?: number;
  maxTokens?: number;
  maxPlanNodes?: number;
  timeout?: number;
}

export interface PlanningOptions {
  includeTimeEstimates?: boolean;
  includeResources?: boolean;
  maxDepth?: number;
}

/**
 * PlanningAgent following AI Refinery agent interface
 */
export class PlanningAgent {
  private config: Required<PlanningAgentConfig>;

  constructor(config: PlanningAgentConfig) {
    this.config = {
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      selfReflection: config.selfReflection || {
        enabled: false,
        maxAttempts: 1,
      },
      llm: config.llm || 'ollama:phi4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      maxPlanNodes: config.maxPlanNodes || 20,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Get agent configuration
   */
  getConfig(): Required<PlanningAgentConfig> {
    return this.config;
  }

  /**
   * Main execution method - AI Refinery interface
   */
  async execute(taskDescription: string, context?: any): Promise<string> {
    if (!taskDescription || taskDescription.trim().length === 0) {
      throw new Error('Task description cannot be empty');
    }

    try {
      // Extract options from context if provided
      const options: PlanningOptions = context || {};

      // Generate task plan
      const plan = await this.plan(taskDescription, options);

      // Format plan as readable text
      return this.formatPlan(taskDescription, plan);
    } catch (error: any) {
      throw new Error(`Planning failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive task plan
   */
  async plan(taskDescription: string, options: PlanningOptions = {}): Promise<TaskPlan> {
    // Step 1: Analyze task complexity
    const complexity = await this.analyzeTaskComplexity(taskDescription);

    // Step 2: Generate plan nodes
    const nodes = await this.generatePlan(taskDescription, complexity, options);

    // Step 3: Detect and resolve cycles
    const validNodes = this.ensureAcyclic(nodes);

    // Step 4: Generate topological sort for execution order
    const executionOrder = this.topologicalSort(validNodes);

    return {
      nodes: validNodes,
      executionOrder,
    };
  }

  /**
   * Analyze task complexity
   */
  private async analyzeTaskComplexity(taskDescription: string): Promise<number> {
    // Simple heuristic-based complexity analysis
    // In production, this could use LLM for deeper analysis

    let complexity = 1;

    // Check for complexity indicators
    const indicators = {
      'full-stack': 3,
      'microservices': 3,
      'architecture': 2,
      'deploy': 2,
      'test': 1,
      'build': 1,
      'implement': 2,
      'integrate': 2,
      'develop': 2,
      'create': 1,
      'setup': 1,
      'configure': 1,
      'and': 0.5,
      'with': 0.5,
    };

    const lowerTask = taskDescription.toLowerCase();

    for (const [keyword, score] of Object.entries(indicators)) {
      if (lowerTask.includes(keyword)) {
        complexity += score;
      }
    }

    // Length-based complexity
    if (taskDescription.length > 100) complexity += 1;
    if (taskDescription.length > 200) complexity += 1;

    return Math.min(complexity, 10); // Cap at 10
  }

  /**
   * Generate plan nodes based on task decomposition
   */
  private async generatePlan(
    taskDescription: string,
    complexity: number,
    options: PlanningOptions
  ): Promise<PlanNode[]> {
    const nodes: PlanNode[] = [];
    const nodeCount = Math.min(
      Math.max(Math.ceil(complexity), 2),
      this.config.maxPlanNodes
    );

    // Decompose task into subtasks
    const subtasks = this.decomposeTasks(taskDescription, nodeCount);

    // Generate nodes with dependencies
    subtasks.forEach((subtask, index) => {
      const node: PlanNode = {
        id: `task-${index + 1}`,
        task: subtask.name,
        description: subtask.description,
        dependencies: this.identifyDependencies(index, subtasks.length, subtask),
      };

      // Add time estimates if requested
      if (options.includeTimeEstimates !== false) {
        node.estimatedTime = this.estimateTime(subtask, complexity);
      }

      // Add resources if requested
      if (options.includeResources) {
        node.resources = this.identifyResources(subtask);
      }

      nodes.push(node);
    });

    return nodes;
  }

  /**
   * Decompose task into subtasks
   */
  private decomposeTasks(
    taskDescription: string,
    targetCount: number
  ): Array<{ name: string; description: string; type: string }> {
    const subtasks: Array<{ name: string; description: string; type: string }> = [];

    // Pattern-based task decomposition
    const lowerTask = taskDescription.toLowerCase();

    // Common patterns for different types of tasks
    if (lowerTask.includes('build') || lowerTask.includes('develop') || lowerTask.includes('create')) {
      subtasks.push({
        name: 'Requirements Analysis',
        description: 'Analyze and document requirements',
        type: 'analysis',
      });
      subtasks.push({
        name: 'Design & Architecture',
        description: 'Design system architecture and components',
        type: 'design',
      });
      subtasks.push({
        name: 'Implementation',
        description: `Implement ${taskDescription}`,
        type: 'implementation',
      });
      subtasks.push({
        name: 'Testing',
        description: 'Write and execute tests',
        type: 'testing',
      });
    }

    if (lowerTask.includes('deploy') || lowerTask.includes('production')) {
      subtasks.push({
        name: 'Environment Setup',
        description: 'Configure deployment environment',
        type: 'setup',
      });
      subtasks.push({
        name: 'Deployment',
        description: 'Deploy to production',
        type: 'deployment',
      });
      subtasks.push({
        name: 'Monitoring',
        description: 'Setup monitoring and alerts',
        type: 'monitoring',
      });
    }

    if (lowerTask.includes('test')) {
      subtasks.push({
        name: 'Test Planning',
        description: 'Plan test strategy and cases',
        type: 'planning',
      });
      subtasks.push({
        name: 'Test Execution',
        description: 'Execute tests',
        type: 'execution',
      });
      subtasks.push({
        name: 'Test Reporting',
        description: 'Generate test reports',
        type: 'reporting',
      });
    }

    if (lowerTask.includes('api') || lowerTask.includes('rest')) {
      subtasks.push({
        name: 'API Design',
        description: 'Design API endpoints and contracts',
        type: 'design',
      });
      subtasks.push({
        name: 'API Implementation',
        description: 'Implement API endpoints',
        type: 'implementation',
      });
      subtasks.push({
        name: 'API Documentation',
        description: 'Document API endpoints',
        type: 'documentation',
      });
    }

    // If no specific patterns matched, create generic subtasks
    if (subtasks.length === 0) {
      subtasks.push({
        name: 'Task Planning',
        description: `Plan approach for ${taskDescription}`,
        type: 'planning',
      });
      subtasks.push({
        name: 'Task Execution',
        description: `Execute ${taskDescription}`,
        type: 'execution',
      });
      subtasks.push({
        name: 'Task Verification',
        description: `Verify completion of ${taskDescription}`,
        type: 'verification',
      });
    }

    // Limit to target count
    return subtasks.slice(0, targetCount);
  }

  /**
   * Identify dependencies for a subtask
   */
  private identifyDependencies(
    index: number,
    total: number,
    subtask: { name: string; description: string; type: string }
  ): string[] {
    const dependencies: string[] = [];

    // First task has no dependencies
    if (index === 0) {
      return dependencies;
    }

    // Determine dependencies based on task type
    const dependentTypes: Record<string, string[]> = {
      design: ['analysis'],
      implementation: ['design', 'analysis'],
      testing: ['implementation'],
      deployment: ['testing', 'implementation'],
      monitoring: ['deployment'],
      execution: ['planning'],
      reporting: ['execution'],
      documentation: ['implementation'],
      verification: ['execution'],
    };

    const requiredTypes = dependentTypes[subtask.type] || [];

    // Look back at previous tasks to find dependencies
    if (requiredTypes.length > 0) {
      // Add dependencies based on type matching
      for (let i = 0; i < index; i++) {
        dependencies.push(`task-${i + 1}`);
      }
    } else {
      // Sequential dependency: depend on previous task
      dependencies.push(`task-${index}`);
    }

    return dependencies;
  }

  /**
   * Ensure DAG is acyclic by removing cycles
   */
  private ensureAcyclic(nodes: PlanNode[]): PlanNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cyclicEdges = new Set<string>();

    function dfs(nodeId: string, path: string[]): void {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      for (const depId of node.dependencies) {
        if (!visited.has(depId)) {
          dfs(depId, [...path, nodeId]);
        } else if (recursionStack.has(depId)) {
          // Cycle detected: remove this edge
          cyclicEdges.add(`${nodeId}->${depId}`);
        }
      }

      recursionStack.delete(nodeId);
    }

    // Detect cycles
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }

    // Remove cyclic edges
    if (cyclicEdges.size > 0) {
      return nodes.map(node => ({
        ...node,
        dependencies: node.dependencies.filter(
          depId => !cyclicEdges.has(`${node.id}->${depId}`)
        ),
      }));
    }

    return nodes;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(nodes: PlanNode[]): string[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    });

    // Build adjacency list and in-degree count
    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const deps = adjList.get(depId) || [];
        deps.push(node.id);
        adjList.set(depId, deps);
        inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
      });
    });

    // Find all nodes with no incoming edges
    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    const sorted: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      const neighbors = adjList.get(nodeId) || [];
      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 0) - 1;
        inDegree.set(neighborId, newDegree);

        if (newDegree === 0) {
          queue.push(neighborId);
        }
      });
    }

    // If sorted length doesn't match nodes length, there was a cycle
    // This shouldn't happen after ensureAcyclic, but handle it anyway
    if (sorted.length !== nodes.length) {
      // Return nodes in original order as fallback
      return nodes.map(n => n.id);
    }

    return sorted;
  }

  /**
   * Estimate time for a subtask
   */
  private estimateTime(
    subtask: { name: string; description: string; type: string },
    complexity: number
  ): string {
    const baseTime: Record<string, number> = {
      analysis: 2,
      planning: 1,
      design: 4,
      implementation: 8,
      testing: 4,
      deployment: 2,
      monitoring: 1,
      execution: 4,
      reporting: 1,
      documentation: 2,
      verification: 1,
      setup: 2,
    };

    const hours = (baseTime[subtask.type] || 2) * Math.max(complexity / 3, 1);

    if (hours < 1) return '< 1 hour';
    if (hours < 8) return `${Math.round(hours)} hours`;
    if (hours < 40) return `${Math.round(hours / 8)} days`;
    return `${Math.round(hours / 40)} weeks`;
  }

  /**
   * Identify required resources
   */
  private identifyResources(subtask: { name: string; description: string; type: string }): string[] {
    const resourceMap: Record<string, string[]> = {
      analysis: ['Business Analyst', 'Product Owner'],
      planning: ['Project Manager'],
      design: ['System Architect', 'Designer'],
      implementation: ['Developer', 'Development Environment'],
      testing: ['QA Engineer', 'Testing Environment'],
      deployment: ['DevOps Engineer', 'Production Environment'],
      monitoring: ['DevOps Engineer', 'Monitoring Tools'],
      execution: ['Developer'],
      reporting: ['Analyst'],
      documentation: ['Technical Writer'],
      verification: ['QA Engineer'],
      setup: ['DevOps Engineer'],
    };

    return resourceMap[subtask.type] || ['Team Member'];
  }

  /**
   * Format plan as readable text
   */
  private formatPlan(taskDescription: string, plan: TaskPlan): string {
    let formatted = `Task Plan: "${taskDescription}"\n\n`;
    formatted += `Total Steps: ${plan.nodes.length}\n\n`;

    // List all nodes with details
    formatted += '=== Plan Steps ===\n\n';
    plan.nodes.forEach((node, index) => {
      formatted += `${index + 1}. ${node.task}\n`;
      formatted += `   ID: ${node.id}\n`;
      formatted += `   Description: ${node.description}\n`;

      if (node.dependencies.length > 0) {
        formatted += `   Dependencies: ${node.dependencies.join(', ')}\n`;
      } else {
        formatted += `   Dependencies: None (can start immediately)\n`;
      }

      if (node.estimatedTime) {
        formatted += `   Estimated Time: ${node.estimatedTime}\n`;
      }

      if (node.resources && node.resources.length > 0) {
        formatted += `   Resources: ${node.resources.join(', ')}\n`;
      }

      formatted += '\n';
    });

    // Show execution order
    formatted += '=== Execution Order ===\n\n';
    plan.executionOrder.forEach((taskId, index) => {
      const node = plan.nodes.find(n => n.id === taskId);
      if (node) {
        formatted += `${index + 1}. ${node.task} (${taskId})\n`;
      }
    });

    formatted += '\n';
    formatted += `Workflow: ${plan.executionOrder.join(' → ')}\n`;

    return formatted.trim();
  }

  /**
   * Self-reflection - validate and potentially improve results
   * AI Refinery interface
   */
  async selfReflect(taskDescription: string, result: string): Promise<string> {
    if (!this.config.selfReflection.enabled) {
      return result;
    }

    try {
      return await this.performReflection(taskDescription, result);
    } catch (error: any) {
      console.warn(`Self-reflection failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Perform self-reflection on planning results
   */
  private async performReflection(taskDescription: string, result: string): Promise<string> {
    const qualityIssues: string[] = [];

    // Check if result is too short
    if (result.length < 100) {
      qualityIssues.push('Plan may be too brief');
    }

    // Check if result contains plan structure
    if (!result.includes('Task Plan')) {
      qualityIssues.push('Result format may be incorrect');
    }

    // Check if result contains execution order
    if (!result.includes('Execution Order')) {
      qualityIssues.push('Execution order may be missing');
    }

    // Check if result contains dependencies
    if (!result.includes('Dependencies')) {
      qualityIssues.push('Dependency information may be missing');
    }

    // Check if task is mentioned in result
    const taskKeywords = taskDescription.toLowerCase().split(' ').filter(w => w.length > 3);
    const hasTaskContext = taskKeywords.some(keyword =>
      result.toLowerCase().includes(keyword)
    );

    if (!hasTaskContext && taskKeywords.length > 0) {
      qualityIssues.push('Result may not address the specific task');
    }

    // If quality issues detected, append suggestions
    if (qualityIssues.length > 0) {
      return result + `\n\n[Self-Reflection Note: ${qualityIssues.join('; ')}]`;
    }

    return result;
  }
}
