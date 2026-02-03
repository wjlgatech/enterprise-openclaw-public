#!/usr/bin/env node
/**
 * Enterprise OpenClaw CLI
 * Command-line interface for task management
 */

import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';

const WS_URL = process.env.OPENCLAW_URL || 'ws://localhost:8789';

class OpenClawCLI {
  private ws: WebSocket | null = null;
  private clientId = nanoid();

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}?clientId=${this.clientId}`);

      this.ws.on('open', () => {
        console.log('✓ Connected to Enterprise OpenClaw');
        resolve();
      });

      this.ws.on('error', reject);

      this.ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'task-created':
        console.log(`✓ Task created: ${message.data.taskId}`);
        console.log('  Waiting for completion...\n');
        break;

      case 'task-event':
        const event = message.data;
        switch (event.type) {
          case 'task.started':
            console.log('⚙️  Task started');
            break;

          case 'task.progress':
            console.log(`📊 Progress: ${event.data.progress.toFixed(0)}%`);
            break;

          case 'agent.started':
            console.log(`🤖 Agent started: ${event.data.agent}`);
            break;

          case 'agent.completed':
            console.log(`✓ Agent completed: ${event.data.agent}`);
            break;

          case 'task.completed':
            console.log('\n🎉 Task completed successfully!\n');
            console.log('Result:');
            console.log(JSON.stringify(event.data.result, null, 2));
            process.exit(0);
            break;

          case 'task.failed':
            console.error(`\n❌ Task failed: ${event.data.error}\n`);
            process.exit(1);
            break;
        }
        break;

      case 'task-data':
        console.log('\nTask Status:');
        console.log(JSON.stringify(message.data, null, 2));
        process.exit(0);
        break;
    }
  }

  async createTask(description: string, agentType: string = 'code-generator'): Promise<void> {
    if (!this.ws) throw new Error('Not connected');

    const message = {
      type: 'create-task',
      data: {
        tenantId: 'cli-user',
        sessionId: nanoid(),
        description,
        agents: [
          {
            name: agentType,
            type: agentType,
            description: `Execute ${agentType} for: ${description}`,
            config: {},
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  async getTask(taskId: string): Promise<void> {
    if (!this.ws) throw new Error('Not connected');

    this.ws.send(JSON.stringify({
      type: 'get-task',
      data: { taskId },
    }));
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

function printUsage(): void {
  console.log(`
Enterprise OpenClaw CLI

Usage:
  cli.js create <description> [agent-type]    Create and execute a task
  cli.js status <task-id>                     Get task status
  cli.js help                                 Show this help

Agent Types:
  - code-generator       Generate production-ready code
  - analyzer            Analyze data and provide insights
  - knowledge-extractor Extract knowledge from documents

Examples:
  cli.js create "Build a REST API for user authentication"
  cli.js create "Analyze sales data" analyzer
  cli.js status task-abc123

Environment:
  OPENCLAW_URL    WebSocket URL (default: ws://localhost:8789)
  `);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    printUsage();
    return;
  }

  const command = args[0];
  const cli = new OpenClawCLI();

  try {
    await cli.connect();

    switch (command) {
      case 'create':
        if (args.length < 2) {
          console.error('Error: Missing task description');
          printUsage();
          process.exit(1);
        }
        const description = args[1];
        const agentType = args[2] || 'code-generator';
        await cli.createTask(description, agentType);
        break;

      case 'status':
        if (args.length < 2) {
          console.error('Error: Missing task ID');
          printUsage();
          process.exit(1);
        }
        await cli.getTask(args[1]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    cli.close();
    process.exit(1);
  }
}

main();
