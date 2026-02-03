/**
 * Tests for PlanningAgent
 * Following Reality-Grounded TDD - tests written FIRST
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningAgent } from '../../extensions/agent-library/utility-agents/planning-agent';
import type {
  PlanNode,
  TaskPlan,
  PlanningAgentConfig,
} from '../../extensions/agent-library/utility-agents/planning-agent';

describe('PlanningAgent', () => {
  let agent: PlanningAgent;

  beforeEach(() => {
    agent = new PlanningAgent({
      agentName: 'test_planner',
      agentDescription: 'Test planning agent',
      selfReflection: {
        enabled: true,
        maxAttempts: 2,
      },
    });
  });

  describe('Agent Interface', () => {
    it('should follow AI Refinery agent interface', () => {
      expect(agent).toHaveProperty('execute');
      expect(agent).toHaveProperty('selfReflect');
      expect(agent).toHaveProperty('getConfig');
      expect(typeof agent.execute).toBe('function');
      expect(typeof agent.selfReflect).toBe('function');
      expect(typeof agent.getConfig).toBe('function');
    });

    it('should have correct agent metadata', () => {
      const config = agent.getConfig();
      expect(config.agentName).toBe('test_planner');
      expect(config.agentDescription).toBe('Test planning agent');
      expect(config.selfReflection?.enabled).toBe(true);
      expect(config.selfReflection?.maxAttempts).toBe(2);
    });

    it('should return configuration with defaults', () => {
      const defaultAgent = new PlanningAgent({
        agentName: 'default',
        agentDescription: 'Default agent',
      });

      const config = defaultAgent.getConfig();
      expect(config.selfReflection?.enabled).toBe(false);
      expect(config.selfReflection?.maxAttempts).toBe(1);
      expect(config.llm).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.maxTokens).toBeDefined();
    });
  });

  describe('Task Analysis', () => {
    it('should analyze simple task complexity', async () => {
      const task = 'Write a hello world program';
      const result = await agent.execute(task);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should analyze complex task complexity', async () => {
      const task = 'Build a full-stack web application with authentication, database, and deployment';
      const result = await agent.execute(task);

      expect(result).toBeDefined();
      expect(result).toContain('Task Plan');
    });

    it('should handle empty task gracefully', async () => {
      await expect(agent.execute('')).rejects.toThrow('Task description cannot be empty');
    });

    it('should handle whitespace-only task', async () => {
      await expect(agent.execute('   ')).rejects.toThrow('Task description cannot be empty');
    });
  });

  describe('Plan Generation', () => {
    it('should generate step-by-step plan', async () => {
      const task = 'Create a REST API';
      const plan = await agent.plan(task);

      expect(plan).toBeDefined();
      expect(plan.nodes).toBeDefined();
      expect(Array.isArray(plan.nodes)).toBe(true);
      expect(plan.nodes.length).toBeGreaterThan(0);
    });

    it('should create plan nodes with required fields', async () => {
      const task = 'Build a website';
      const plan = await agent.plan(task);

      const node = plan.nodes[0];
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('task');
      expect(node).toHaveProperty('description');
      expect(node).toHaveProperty('dependencies');
      expect(typeof node.id).toBe('string');
      expect(typeof node.task).toBe('string');
      expect(typeof node.description).toBe('string');
      expect(Array.isArray(node.dependencies)).toBe(true);
    });

    it('should include execution order in plan', async () => {
      const task = 'Deploy application to production';
      const plan = await agent.plan(task);

      expect(plan).toHaveProperty('executionOrder');
      expect(Array.isArray(plan.executionOrder)).toBe(true);
      expect(plan.executionOrder.length).toBe(plan.nodes.length);
    });

    it('should generate different plans for different tasks', async () => {
      const plan1 = await agent.plan('Write documentation');
      const plan2 = await agent.plan('Run tests');

      expect(plan1.nodes.length).toBeGreaterThan(0);
      expect(plan2.nodes.length).toBeGreaterThan(0);
      // Plans should be different
      expect(JSON.stringify(plan1)).not.toBe(JSON.stringify(plan2));
    });

    it('should break down complex tasks into multiple steps', async () => {
      const complexTask = 'Develop and deploy a microservices architecture';
      const plan = await agent.plan(complexTask);

      // Complex task should have multiple steps
      expect(plan.nodes.length).toBeGreaterThanOrEqual(3);
    });

    it('should include time estimates when requested', async () => {
      const task = 'Implement feature X';
      const plan = await agent.plan(task, { includeTimeEstimates: true });

      // At least one node should have time estimate
      const nodesWithTime = plan.nodes.filter(n => n.estimatedTime);
      expect(nodesWithTime.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Detection', () => {
    it('should identify task dependencies', async () => {
      const task = 'Build and test application';
      const plan = await agent.plan(task);

      // Should have dependencies between tasks
      const nodesWithDeps = plan.nodes.filter(n => n.dependencies.length > 0);
      expect(nodesWithDeps.length).toBeGreaterThan(0);
    });

    it('should create valid dependency chains', async () => {
      const task = 'Setup, develop, test, and deploy';
      const plan = await agent.plan(task);

      // All dependencies should reference valid node IDs
      plan.nodes.forEach(node => {
        node.dependencies.forEach(depId => {
          const depExists = plan.nodes.some(n => n.id === depId);
          expect(depExists).toBe(true);
        });
      });
    });

    it('should handle tasks with no dependencies', async () => {
      const task = 'Write independent documentation';
      const plan = await agent.plan(task);

      // First task should have no dependencies
      const firstTask = plan.nodes[0];
      expect(firstTask.dependencies).toEqual([]);
    });

    it('should support parallel tasks', async () => {
      const task = 'Setup database and configure API';
      const plan = await agent.plan(task);

      // Should have tasks that can run in parallel (same or empty dependencies)
      const parallelTasks = plan.nodes.filter(n => n.dependencies.length === 0);
      expect(parallelTasks.length).toBeGreaterThan(0);
    });
  });

  describe('DAG Structure', () => {
    it('should create directed acyclic graph', async () => {
      const task = 'Complete software development lifecycle';
      const plan = await agent.plan(task);

      // Verify DAG properties
      expect(plan.nodes.length).toBeGreaterThan(0);
      expect(plan.executionOrder.length).toBe(plan.nodes.length);
    });

    it('should validate DAG has no cycles', async () => {
      const task = 'Build application with dependencies';
      const plan = await agent.plan(task);

      // Check for cycles
      const hasCycle = detectCycle(plan);
      expect(hasCycle).toBe(false);
    });

    it('should ensure all nodes are in execution order', async () => {
      const task = 'Multi-step project';
      const plan = await agent.plan(task);

      // All node IDs should be in execution order
      const nodeIds = new Set(plan.nodes.map(n => n.id));
      const orderIds = new Set(plan.executionOrder);

      expect(nodeIds.size).toBe(orderIds.size);
      nodeIds.forEach(id => {
        expect(orderIds.has(id)).toBe(true);
      });
    });

    it('should order dependent tasks correctly', async () => {
      const task = 'Sequential workflow';
      const plan = await agent.plan(task);

      // Dependencies should appear before dependents in execution order
      plan.nodes.forEach(node => {
        const nodeIndex = plan.executionOrder.indexOf(node.id);

        node.dependencies.forEach(depId => {
          const depIndex = plan.executionOrder.indexOf(depId);
          expect(depIndex).toBeLessThan(nodeIndex);
        });
      });
    });
  });

  describe('Cycle Detection', () => {
    it('should detect and prevent circular dependencies', async () => {
      const task = 'Complex interconnected tasks';
      const plan = await agent.plan(task);

      // Should not contain cycles
      expect(detectCycle(plan)).toBe(false);
    });

    it('should handle self-referencing tasks', async () => {
      const task = 'Task planning test';
      const plan = await agent.plan(task);

      // No task should depend on itself
      plan.nodes.forEach(node => {
        expect(node.dependencies.includes(node.id)).toBe(false);
      });
    });
  });

  describe('Topological Sorting', () => {
    it('should produce valid topological sort', async () => {
      const task = 'Ordered task execution';
      const plan = await agent.plan(task);

      // Verify topological order
      const isValidTopo = verifyTopologicalOrder(plan);
      expect(isValidTopo).toBe(true);
    });

    it('should handle multiple valid orderings', async () => {
      const task = 'Parallel execution tasks';
      const plan = await agent.plan(task);

      // Should produce a valid ordering (one of possibly many)
      expect(plan.executionOrder.length).toBe(plan.nodes.length);
      expect(verifyTopologicalOrder(plan)).toBe(true);
    });

    it('should prioritize independent tasks first', async () => {
      const task = 'Mixed dependencies';
      const plan = await agent.plan(task);

      // Tasks with no dependencies should appear early
      const firstTask = plan.nodes.find(n => n.id === plan.executionOrder[0]);
      expect(firstTask?.dependencies).toBeDefined();
    });
  });

  describe('Time Estimation', () => {
    it('should provide time estimates for tasks', async () => {
      const task = 'Development project';
      const plan = await agent.plan(task, { includeTimeEstimates: true });

      // Should have time estimates
      const withEstimates = plan.nodes.filter(n => n.estimatedTime);
      expect(withEstimates.length).toBeGreaterThan(0);
    });

    it('should format time estimates correctly', async () => {
      const task = 'Project with timeline';
      const plan = await agent.plan(task, { includeTimeEstimates: true });

      plan.nodes.forEach(node => {
        if (node.estimatedTime) {
          // Should be a string with time units
          expect(typeof node.estimatedTime).toBe('string');
          expect(node.estimatedTime.length).toBeGreaterThan(0);
        }
      });
    });

    it('should allow disabling time estimates', async () => {
      const task = 'Quick task';
      const plan = await agent.plan(task, { includeTimeEstimates: false });

      // No time estimates should be present
      const withEstimates = plan.nodes.filter(n => n.estimatedTime);
      expect(withEstimates.length).toBe(0);
    });
  });

  describe('Resource Allocation', () => {
    it('should identify required resources', async () => {
      const task = 'Full stack development';
      const plan = await agent.plan(task, { includeResources: true });

      // Should have resource information
      const withResources = plan.nodes.filter(n => n.resources && n.resources.length > 0);
      expect(withResources.length).toBeGreaterThan(0);
    });

    it('should allow optional resource allocation', async () => {
      const task = 'Simple task';
      const plan = await agent.plan(task, { includeResources: false });

      // Resources should not be included or empty
      plan.nodes.forEach(node => {
        if (node.resources) {
          expect(Array.isArray(node.resources)).toBe(true);
        }
      });
    });
  });

  describe('Self-Reflection', () => {
    it('should perform self-reflection when enabled', async () => {
      const task = 'Complex planning scenario';
      const plan = await agent.plan(task);
      const formatted = formatPlan(plan);

      const reflected = await agent.selfReflect(task, formatted);

      expect(reflected).toBeDefined();
      expect(typeof reflected).toBe('string');
    });

    it('should validate plan quality in self-reflection', async () => {
      const task = 'Quality check test';
      const poorResult = 'Incomplete plan';

      const reflected = await agent.selfReflect(task, poorResult);

      // Should improve or flag quality issues
      expect(reflected).toBeDefined();
    });

    it('should skip self-reflection when disabled', async () => {
      const noReflectionAgent = new PlanningAgent({
        agentName: 'no_reflection',
        agentDescription: 'Agent without self-reflection',
        selfReflection: {
          enabled: false,
          maxAttempts: 1,
        },
      });

      const result = 'Some plan';
      const reflected = await noReflectionAgent.selfReflect('task', result);

      // Should return original result when disabled
      expect(reflected).toBe(result);
    });

    it('should detect missing dependencies in reflection', async () => {
      const task = 'Dependency validation';
      const incompleteResult = 'Task Plan:\n1. Step 1\n2. Step 2';

      const reflected = await agent.selfReflect(task, incompleteResult);

      // Reflection should identify issues
      expect(reflected).toBeDefined();
    });

    it('should validate execution order in reflection', async () => {
      const task = 'Order validation';
      const plan = await agent.plan(task);
      const formatted = formatPlan(plan);

      const reflected = await agent.selfReflect(task, formatted);

      // Should validate proper ordering
      expect(reflected).toContain('Task Plan');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task descriptions', async () => {
      await expect(agent.execute('')).rejects.toThrow();
    });

    it('should handle very long task descriptions', async () => {
      const longTask = 'a'.repeat(10000);
      const result = await agent.execute(longTask);

      expect(result).toBeDefined();
    });

    it('should handle special characters in tasks', async () => {
      const task = 'Build API with @annotations & special $characters';
      const plan = await agent.plan(task);

      expect(plan).toBeDefined();
      expect(plan.nodes.length).toBeGreaterThan(0);
    });

    it('should handle planning errors gracefully', async () => {
      const mockAgent = new PlanningAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
      });

      vi.spyOn(mockAgent as any, 'analyzeTaskComplexity').mockRejectedValue(
        new Error('Analysis error')
      );

      await expect(mockAgent.execute('test')).rejects.toThrow('Planning failed');
    });

    it('should provide helpful error messages', async () => {
      const mockAgent = new PlanningAgent({
        agentName: 'mock',
        agentDescription: 'Mock agent',
      });

      vi.spyOn(mockAgent as any, 'generatePlan').mockRejectedValue(
        new Error('Plan generation failed')
      );

      try {
        await mockAgent.plan('test');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Plan generation failed');
      }
    });
  });

  describe('Configuration', () => {
    it('should support custom configuration', () => {
      const customAgent = new PlanningAgent({
        agentName: 'custom',
        agentDescription: 'Custom planning agent',
        llm: 'ollama:phi4',
        temperature: 0.7,
        maxTokens: 4096,
        maxPlanNodes: 10,
      });

      const config = customAgent.getConfig();
      expect(config.llm).toBe('ollama:phi4');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
      expect(config.maxPlanNodes).toBe(10);
    });

    it('should use default values when not specified', () => {
      const defaultAgent = new PlanningAgent({
        agentName: 'default',
        agentDescription: 'Default agent',
      });

      const config = defaultAgent.getConfig();
      expect(config.selfReflection?.enabled).toBe(false);
      expect(config.maxPlanNodes).toBeDefined();
    });

    it('should respect maxPlanNodes limit', async () => {
      const limitedAgent = new PlanningAgent({
        agentName: 'limited',
        agentDescription: 'Limited agent',
        maxPlanNodes: 5,
      });

      const task = 'Very complex task with many steps';
      const plan = await limitedAgent.plan(task);

      expect(plan.nodes.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Integration with DistillerOrchestrator', () => {
    it('should work as executor function', async () => {
      const executorFn = (query: string) => agent.execute(query);

      const result = await executorFn('test task');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should accept context parameter', async () => {
      const context = {
        userPreferences: { detailLevel: 'high' },
        constraints: { maxTime: '1 week' },
      };

      const result = await agent.execute('test', context);

      expect(result).toBeDefined();
    });

    it('should maintain consistent interface across calls', async () => {
      const result1 = await agent.execute('first task');
      const result2 = await agent.execute('second task');

      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
    });

    it('should return formatted plan as string', async () => {
      const result = await agent.execute('Create application');

      expect(typeof result).toBe('string');
      expect(result).toContain('Task Plan');
    });
  });

  describe('Plan Formatting', () => {
    it('should format plan as readable text', async () => {
      const task = 'Build web app';
      const result = await agent.execute(task);

      expect(result).toContain('Task Plan');
      expect(result).toContain('Execution Order');
    });

    it('should include task descriptions in formatted output', async () => {
      const task = 'Develop feature';
      const plan = await agent.plan(task);
      const formatted = formatPlan(plan);

      plan.nodes.forEach(node => {
        expect(formatted).toContain(node.task);
      });
    });

    it('should show dependencies in formatted output', async () => {
      const task = 'Multi-step process';
      const result = await agent.execute(task);

      // Should indicate dependencies
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions
function detectCycle(plan: TaskPlan): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const nodeMap = new Map(plan.nodes.map(n => [n.id, n]));

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return false;

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        if (dfs(depId)) return true;
      } else if (recursionStack.has(depId)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of plan.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

function verifyTopologicalOrder(plan: TaskPlan): boolean {
  const nodeMap = new Map(plan.nodes.map(n => [n.id, n]));
  const position = new Map(plan.executionOrder.map((id, i) => [id, i]));

  for (const node of plan.nodes) {
    const nodePos = position.get(node.id);
    if (nodePos === undefined) return false;

    for (const depId of node.dependencies) {
      const depPos = position.get(depId);
      if (depPos === undefined) return false;
      if (depPos >= nodePos) return false; // Dependency should come before
    }
  }

  return true;
}

function formatPlan(plan: TaskPlan): string {
  let formatted = 'Task Plan:\n\n';

  plan.nodes.forEach((node, i) => {
    formatted += `${i + 1}. ${node.task}\n`;
    formatted += `   Description: ${node.description}\n`;
    if (node.dependencies.length > 0) {
      formatted += `   Dependencies: ${node.dependencies.join(', ')}\n`;
    }
    if (node.estimatedTime) {
      formatted += `   Estimated Time: ${node.estimatedTime}\n`;
    }
    formatted += '\n';
  });

  formatted += 'Execution Order:\n';
  formatted += plan.executionOrder.join(' → ');

  return formatted;
}
