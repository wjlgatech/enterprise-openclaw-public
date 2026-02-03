/**
 * Enterprise OpenClaw - Main Entry Point
 * GenAI-native multi-agent platform with self-improvement
 */

import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { TaskOrchestrator } from './orchestrator/task-orchestrator.js';
import { MetricsLogger } from './metrics/metrics-logger.js';
import { AuditLogger } from './security/audit-logger.js';
import { PIIDetector } from './security/pii-detector.js';
import { ImprovementEngine } from './improvement/improvement-engine.js';
import { TaskEvent } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

class EnterpriseOpenClaw {
  private wss: WebSocketServer;
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private orchestrator: TaskOrchestrator;
  private metricsLogger: MetricsLogger;
  private auditLogger: AuditLogger;
  private piiDetector: PIIDetector;
  private improvementEngine: ImprovementEngine;
  private clients = new Map<string, WebSocket>();

  constructor(private port: number = 8789) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Initialize components
    this.metricsLogger = new MetricsLogger();
    this.auditLogger = new AuditLogger();
    this.piiDetector = new PIIDetector();
    this.improvementEngine = new ImprovementEngine(this.metricsLogger);

    this.orchestrator = new TaskOrchestrator(
      this.metricsLogger,
      this.auditLogger,
      this.piiDetector,
      5 // max concurrent tasks
    );

    this.setupExpress();
    this.setupWebSocket();
    this.setupEventHandlers();
  }

  private setupExpress(): void {
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Create task via REST
    this.app.post('/api/tasks', async (req, res) => {
      try {
        const { tenantId, sessionId, description, agents } = req.body;

        if (!tenantId || !sessionId || !description || !agents) {
          res.status(400).json({ error: 'Missing required fields' });
          return;
        }

        const task = await this.orchestrator.createTask(
          tenantId,
          sessionId,
          description,
          agents
        );

        res.json({ taskId: task.id, status: task.status });
      } catch (error) {
        logger.error({ error }, 'Failed to create task');
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // List all tasks
    this.app.get('/api/tasks', (req, res) => {
      const tenantId = (req.query.tenantId as string) || 'default';
      const tasks = this.orchestrator.getAllTasks(tenantId);
      res.json({ tasks });
    });

    // Get task status
    this.app.get('/api/tasks/:taskId', (req, res) => {
      const task = this.orchestrator.getTask(req.params.taskId);

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(task);
    });

    // Get improvement proposals
    this.app.get('/api/improvement/proposals', async (req, res) => {
      const status = req.query.status as any;
      const proposals = await this.improvementEngine.getProposals(status);
      res.json(proposals);
    });

    // Approve improvement proposal
    this.app.post('/api/improvement/proposals/:proposalId/approve', async (req, res) => {
      await this.improvementEngine.approveProposal(req.params.proposalId);
      res.json({ success: true });
    });

    // Dashboard
    this.app.get('/dashboard', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dashboard.html'));
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIdMatch = req.url?.split('clientId=')[1] || 'unknown';
      this.clients.set(clientIdMatch, ws);

      logger.info({ clientId: clientIdMatch }, 'Client connected');

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(clientIdMatch, message, ws);
        } catch (error) {
          logger.error({ error }, 'Failed to handle message');
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientIdMatch);
        logger.info({ clientId: clientIdMatch }, 'Client disconnected');
      });
    });
  }

  private async handleWebSocketMessage(
    _clientId: string,
    message: any,
    ws: WebSocket
  ): Promise<void> {
    const { type, data } = message;

    switch (type) {
      case 'create-task':
        const task = await this.orchestrator.createTask(
          data.tenantId,
          data.sessionId,
          data.description,
          data.agents
        );
        ws.send(JSON.stringify({ type: 'task-created', data: { taskId: task.id } }));
        break;

      case 'get-task':
        const taskData = this.orchestrator.getTask(data.taskId);
        ws.send(JSON.stringify({ type: 'task-data', data: taskData }));
        break;

      case 'subscribe-task':
        // Client will receive task events via broadcast
        ws.send(JSON.stringify({ type: 'subscribed', data: { taskId: data.taskId } }));
        break;

      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  private setupEventHandlers(): void {
    // Broadcast task events to all connected clients
    this.orchestrator.on('task-event', (event: TaskEvent) => {
      const message = JSON.stringify({
        type: 'task-event',
        data: event,
      });

      for (const ws of this.clients.values()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }

      logger.info({ event: event.type, taskId: event.taskId }, 'Task event');
    });

    // Run improvement analysis every 5 minutes
    setInterval(async () => {
      try {
        const since = new Date(Date.now() - 5 * 60 * 1000);
        await this.improvementEngine.analyzeMetrics('default', since);

        const proposals = await this.improvementEngine.getProposals('proposed');
        if (proposals.length > 0) {
          logger.info(
            { count: proposals.length },
            'New improvement proposals generated'
          );
        }
      } catch (error) {
        logger.error({ error }, 'Failed to run improvement analysis');
      }
    }, 5 * 60 * 1000);
  }

  private getDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Enterprise OpenClaw Dashboard</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #2563eb; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: inline-block; margin-right: 30px; }
    .metric-value { font-size: 32px; font-weight: bold; color: #2563eb; }
    .metric-label { color: #6b7280; font-size: 14px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-running { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🚀 Enterprise OpenClaw Dashboard</h1>

  <div class="card">
    <h2>System Status</h2>
    <div class="metric">
      <div class="metric-value" id="totalTasks">0</div>
      <div class="metric-label">Total Tasks</div>
    </div>
    <div class="metric">
      <div class="metric-value" id="runningTasks">0</div>
      <div class="metric-label">Running</div>
    </div>
    <div class="metric">
      <div class="metric-value" id="successRate">0%</div>
      <div class="metric-label">Success Rate</div>
    </div>
  </div>

  <div class="card">
    <h2>Self-Improvement Proposals</h2>
    <div id="proposals">Loading...</div>
  </div>

  <div class="card">
    <h2>Quick Start</h2>
    <pre>
# Install dependencies
npm install

# Create a task via CLI
curl -X POST http://localhost:8789/api/tasks \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenantId": "demo",
    "sessionId": "session-1",
    "description": "Generate a REST API for user management",
    "agents": [
      {
        "name": "code-generator",
        "type": "code-generator",
        "description": "Generate production-ready code",
        "config": {}
      }
    ]
  }'

# View task status
curl http://localhost:8789/api/tasks/{taskId}

# WebSocket connection
wscat -c "ws://localhost:8789?clientId=my-client"
    </pre>
  </div>

  <script>
    async function loadDashboard() {
      try {
        const response = await fetch('/api/improvement/proposals');
        const proposals = await response.json();

        const proposalsDiv = document.getElementById('proposals');
        if (proposals.length === 0) {
          proposalsDiv.innerHTML = '<p>No proposals yet. System is learning from your usage...</p>';
        } else {
          proposalsDiv.innerHTML = proposals.map(p => \`
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
              <strong>\${p.type}</strong>: \${p.rationale}
              <br><small>Expected: \${p.expectedImprovement}</small>
            </div>
          \`).join('');
        }
      } catch (error) {
        console.error('Failed to load proposals:', error);
      }
    }

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:8789?clientId=dashboard');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received:', message);

      if (message.type === 'task-event') {
        // Update metrics in real-time
        loadDashboard();
      }
    };

    // Load initial data
    loadDashboard();
    setInterval(loadDashboard, 10000); // Refresh every 10 seconds
  </script>
</body>
</html>
    `;
  }

  async start(): Promise<void> {
    // Initialize components
    await this.metricsLogger.initialize();
    await this.auditLogger.initialize();
    await this.improvementEngine.initialize();

    // Start server
    this.server.listen(this.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║         Enterprise OpenClaw - GenAI-Native Platform          ║
║                                                               ║
║  🚀 Server running on http://localhost:${this.port}             ║
║  📊 Dashboard: http://localhost:${this.port}/dashboard         ║
║  🔌 WebSocket: ws://localhost:${this.port}                      ║
║                                                               ║
║  Features:                                                    ║
║  ✓ Multi-agent orchestration (DAG-based)                     ║
║  ✓ Self-improvement engine                                   ║
║  ✓ PII detection & masking                                   ║
║  ✓ Audit logging & metrics                                   ║
║  ✓ Real-time progress streaming                              ║
║                                                               ║
║  Every interaction makes the system smarter!                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  }

  async stop(): Promise<void> {
    await this.auditLogger.close();
    this.wss.close();
    this.server.close();
  }
}

// Start server
const app = new EnterpriseOpenClaw(8789);
app.start().catch(error => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await app.stop();
  process.exit(0);
});

export { EnterpriseOpenClaw };
