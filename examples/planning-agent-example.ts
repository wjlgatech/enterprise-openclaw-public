/**
 * PlanningAgent Example
 * Demonstrates task planning, DAG construction, and workflow orchestration
 */

import { PlanningAgent } from '../extensions/agent-library/utility-agents/planning-agent';
import type { TaskPlan, PlanNode } from '../extensions/agent-library/utility-agents/planning-agent';

// Example 1: Basic Task Planning
async function basicPlanningExample() {
  console.log('=== Example 1: Basic Task Planning ===\n');

  const planner = new PlanningAgent({
    agentName: 'basic_planner',
    agentDescription: 'Basic task planning agent',
  });

  const task = 'Build a REST API with authentication';
  const result = await planner.execute(task);

  console.log(result);
  console.log('\n');
}

// Example 2: Detailed Plan with Time Estimates and Resources
async function detailedPlanningExample() {
  console.log('=== Example 2: Detailed Planning with Time & Resources ===\n');

  const planner = new PlanningAgent({
    agentName: 'detailed_planner',
    agentDescription: 'Detailed task planning with estimates',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
  });

  const task = 'Deploy a microservices application to production';
  const plan = await planner.plan(task, {
    includeTimeEstimates: true,
    includeResources: true,
  });

  console.log(`Task: "${task}"\n`);
  console.log(`Total Steps: ${plan.nodes.length}\n`);

  plan.nodes.forEach((node, index) => {
    console.log(`${index + 1}. ${node.task}`);
    console.log(`   Description: ${node.description}`);
    console.log(`   Dependencies: ${node.dependencies.length > 0 ? node.dependencies.join(', ') : 'None'}`);
    if (node.estimatedTime) {
      console.log(`   Time Estimate: ${node.estimatedTime}`);
    }
    if (node.resources && node.resources.length > 0) {
      console.log(`   Resources: ${node.resources.join(', ')}`);
    }
    console.log('');
  });

  console.log('Execution Order:');
  console.log(plan.executionOrder.join(' → '));
  console.log('\n');
}

// Example 3: Complex Multi-Step Project
async function complexProjectExample() {
  console.log('=== Example 3: Complex Multi-Step Project ===\n');

  const planner = new PlanningAgent({
    agentName: 'complex_planner',
    agentDescription: 'Complex project planning',
    maxPlanNodes: 15,
  });

  const task = 'Build and deploy a full-stack e-commerce application with payment integration';
  const plan = await planner.plan(task, {
    includeTimeEstimates: true,
    includeResources: true,
  });

  // Visualize DAG structure
  console.log('DAG Visualization:\n');
  console.log(visualizeDAG(plan));
  console.log('\n');

  // Calculate critical path
  const criticalPath = calculateCriticalPath(plan);
  console.log('Critical Path:');
  console.log(criticalPath.join(' → '));
  console.log('\n');

  // Identify parallel tasks
  const parallelGroups = identifyParallelTasks(plan);
  console.log('Tasks that can run in parallel:');
  parallelGroups.forEach((group, index) => {
    if (group.length > 1) {
      console.log(`  Group ${index + 1}: ${group.join(', ')}`);
    }
  });
  console.log('\n');
}

// Example 4: Self-Reflection for Plan Quality
async function selfReflectionExample() {
  console.log('=== Example 4: Self-Reflection for Plan Quality ===\n');

  const planner = new PlanningAgent({
    agentName: 'reflecting_planner',
    agentDescription: 'Planning agent with self-reflection',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
  });

  const task = 'Implement CI/CD pipeline for automated testing and deployment';
  const initialResult = await planner.execute(task);

  console.log('Initial Plan:\n');
  console.log(initialResult);
  console.log('\n');

  // Apply self-reflection
  const reflectedResult = await planner.selfReflect(task, initialResult);

  if (reflectedResult !== initialResult) {
    console.log('Self-Reflection Applied:\n');
    console.log(reflectedResult);
  } else {
    console.log('Plan passed quality checks - no changes needed.\n');
  }
  console.log('\n');
}

// Example 5: Integration with Orchestrator Pattern
async function orchestratorIntegrationExample() {
  console.log('=== Example 5: Orchestrator Integration ===\n');

  // Create planning agent
  const planner = new PlanningAgent({
    agentName: 'orchestrator_planner',
    agentDescription: 'Planning agent for orchestrator',
  });

  // Simulate orchestrator pattern
  const agentRegistry = new Map<string, (query: string) => Promise<string>>();

  // Register planning agent
  agentRegistry.set('planner', async (query: string) => {
    return await planner.execute(query);
  });

  // Use through orchestrator
  const executorFn = agentRegistry.get('planner')!;
  const result = await executorFn('Create automated testing suite');

  console.log('Result from Orchestrator:\n');
  console.log(result);
  console.log('\n');
}

// Example 6: Task Dependency Analysis
async function dependencyAnalysisExample() {
  console.log('=== Example 6: Dependency Analysis ===\n');

  const planner = new PlanningAgent({
    agentName: 'dependency_analyzer',
    agentDescription: 'Analyzes task dependencies',
  });

  const task = 'Setup development environment and build application';
  const plan = await planner.plan(task);

  console.log('Dependency Graph:\n');

  // Show dependency relationships
  plan.nodes.forEach(node => {
    console.log(`${node.id} (${node.task}):`);
    if (node.dependencies.length === 0) {
      console.log('  → No dependencies (can start immediately)');
    } else {
      node.dependencies.forEach(depId => {
        const depNode = plan.nodes.find(n => n.id === depId);
        console.log(`  → depends on ${depId} (${depNode?.task})`);
      });
    }
  });
  console.log('\n');

  // Verify acyclic property
  const isAcyclic = verifyAcyclic(plan);
  console.log(`DAG is acyclic: ${isAcyclic ? 'YES ✓' : 'NO ✗'}`);
  console.log('\n');
}

// Helper Functions

function visualizeDAG(plan: TaskPlan): string {
  let viz = '';

  plan.nodes.forEach(node => {
    const shortTask = node.task.length > 40 ? node.task.substring(0, 37) + '...' : node.task;
    viz += `[${node.id}] ${shortTask}\n`;

    if (node.dependencies.length > 0) {
      node.dependencies.forEach(depId => {
        viz += `  ↑ ${depId}\n`;
      });
    }
  });

  return viz;
}

function calculateCriticalPath(plan: TaskPlan): string[] {
  // Simplified critical path: longest chain through dependencies
  const nodeMap = new Map(plan.nodes.map(n => [n.id, n]));
  let longestPath: string[] = [];

  function findPath(nodeId: string, currentPath: string[]): string[] {
    const node = nodeMap.get(nodeId);
    if (!node) return currentPath;

    const newPath = [...currentPath, nodeId];

    if (node.dependencies.length === 0) {
      return newPath;
    }

    let longest = newPath;
    for (const depId of node.dependencies) {
      const path = findPath(depId, newPath);
      if (path.length > longest.length) {
        longest = path;
      }
    }

    return longest;
  }

  // Find longest path from all leaf nodes
  plan.nodes.forEach(node => {
    const path = findPath(node.id, []);
    if (path.length > longestPath.length) {
      longestPath = path;
    }
  });

  return longestPath.reverse();
}

function identifyParallelTasks(plan: TaskPlan): string[][] {
  const groups: string[][] = [];
  const processed = new Set<string>();

  plan.executionOrder.forEach(taskId => {
    if (processed.has(taskId)) return;

    const node = plan.nodes.find(n => n.id === taskId)!;
    const group = [taskId];
    processed.add(taskId);

    // Find tasks with same dependencies
    plan.nodes.forEach(otherNode => {
      if (otherNode.id !== taskId && !processed.has(otherNode.id)) {
        if (JSON.stringify(otherNode.dependencies) === JSON.stringify(node.dependencies)) {
          group.push(otherNode.id);
          processed.add(otherNode.id);
        }
      }
    });

    groups.push(group);
  });

  return groups;
}

function verifyAcyclic(plan: TaskPlan): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const nodeMap = new Map(plan.nodes.map(n => [n.id, n]));

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return false;

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        if (hasCycle(depId)) return true;
      } else if (recursionStack.has(depId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of plan.nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) return false;
    }
  }

  return true;
}

// Run all examples
async function runAllExamples() {
  try {
    await basicPlanningExample();
    await detailedPlanningExample();
    await complexProjectExample();
    await selfReflectionExample();
    await orchestratorIntegrationExample();
    await dependencyAnalysisExample();

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  basicPlanningExample,
  detailedPlanningExample,
  complexProjectExample,
  selfReflectionExample,
  orchestratorIntegrationExample,
  dependencyAnalysisExample,
};
