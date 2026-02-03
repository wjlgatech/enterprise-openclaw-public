#!/usr/bin/env tsx

/**
 * Enterprise OpenClaw - Full Application Server
 *
 * Chat-based UI with knowledge graph, RAG, and multi-agent capabilities
 */

import express from 'express';
import { KnowledgeGraph } from './packages/core/src/knowledge-graph/knowledge-graph.js';
import { BasicRAG } from './packages/core/src/rag/basic-rag.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const logger = pino({ level: 'info' });
const port = process.env.PORT || 18789;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Initialize systems
let knowledgeGraph: KnowledgeGraph;
let ragSystem: BasicRAG;
let isInitialized = false;

async function initializeSystem() {
  logger.info('🚀 Initializing Enterprise OpenClaw...');

  try {
    // Initialize Knowledge Graph
    logger.info('📊 Initializing Knowledge Graph...');
    knowledgeGraph = new KnowledgeGraph('./data/knowledge-graph');
    await knowledgeGraph.initialize();
    logger.info('✓ Knowledge Graph initialized');

    // Initialize RAG System
    logger.info('📚 Initializing RAG System...');
    ragSystem = new BasicRAG(knowledgeGraph);
    logger.info('✓ RAG System initialized');

    // Add initial knowledge
    logger.info('📝 Loading initial knowledge...');
    await knowledgeGraph.addNode({
      id: 'openclaw_intro',
      type: 'concept',
      content: 'Enterprise OpenClaw is a GenAI-native multi-agent platform with self-improvement capabilities. It features knowledge graphs, RAG systems, and can run 100% locally.',
      metadata: { category: 'system', importance: 'high' }
    });

    await knowledgeGraph.addNode({
      id: 'openclaw_features',
      type: 'concept',
      content: 'Key features include: knowledge graph storage, vector search with LanceDB, basic and advanced RAG, multi-agent orchestration, local AI support, enterprise security with PII detection and audit logging.',
      metadata: { category: 'features', importance: 'high' }
    });

    await knowledgeGraph.addNode({
      id: 'openclaw_privacy',
      type: 'concept',
      content: 'Enterprise OpenClaw can run 100% locally on your machine, ensuring complete privacy. No data leaves your device unless you explicitly configure cloud AI integrations.',
      metadata: { category: 'security', importance: 'high' }
    });

    isInitialized = true;
    logger.info('✅ System initialization complete!');

  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize system');
    throw error;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    initialized: isInitialized,
    timestamp: Date.now(),
    version: '1.0.0',
    components: {
      knowledgeGraph: isInitialized ? 'ready' : 'initializing',
      ragSystem: isInitialized ? 'ready' : 'initializing'
    }
  });
});

// Chat endpoint (OpenClaw UI compatible)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isInitialized) {
      return res.status(503).json({
        error: 'System not initialized',
        response: 'Sorry, the system is still initializing. Please wait a moment and try again.'
      });
    }

    logger.info({ message }, 'Processing chat message');

    // Use RAG to get context from knowledge graph
    let response = '';
    let model = 'Enterprise OpenClaw (Local Knowledge)';

    try {
      // Query knowledge graph for relevant context
      const relevantNodes = await knowledgeGraph.queryNodes(message, { limit: 3 });

      if (relevantNodes && relevantNodes.length > 0) {
        // Build response from knowledge graph
        const context = relevantNodes
          .map(node => node.content || node.data?.content || '')
          .filter(c => c)
          .join('\n\n');

        if (context) {
          // Simple RAG-based response
          response = generateResponse(message, context);
        }
      }

      // Fallback to general responses if no relevant knowledge found
      if (!response) {
        response = generateFallbackResponse(message);
        model = 'Enterprise OpenClaw (General)';
      }

    } catch (error) {
      logger.error({ error }, 'Error processing message');
      response = "I encountered an error while processing your request. Please try rephrasing your question.";
    }

    res.json({
      response,
      model,
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error({ error }, 'Chat endpoint error');
    res.status(500).json({
      error: 'Internal server error',
      response: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

// Generate response using RAG context
function generateResponse(question: string, context: string): string {
  const questionLower = question.toLowerCase();

  // Analyze question type
  if (questionLower.includes('what is') || questionLower.includes('what are')) {
    return `Based on my knowledge:\n\n${context}\n\nIs there anything specific you'd like to know more about?`;
  }

  if (questionLower.includes('how') || questionLower.includes('can you')) {
    return `Here's what I know:\n\n${context}\n\nI can provide more details if you need specific information about any aspect.`;
  }

  if (questionLower.includes('status') || questionLower.includes('system')) {
    return `**System Status**\n\n✅ Knowledge Graph: Active\n✅ RAG System: Ready\n✅ Privacy: 100% Local Processing\n\nSystem information: ${context}`;
  }

  // Default response with context
  return `${context}\n\nWould you like me to elaborate on any specific aspect?`;
}

// Fallback responses for general questions
function generateFallbackResponse(question: string): string {
  const questionLower = question.toLowerCase();

  if (questionLower.includes('hello') || questionLower.includes('hi')) {
    return `Hello! I'm your Enterprise OpenClaw AI assistant. I'm running locally on your machine with access to a knowledge graph.

I can help you with:
• Information about Enterprise OpenClaw features
• Knowledge graph queries
• System configuration
• General assistance

What would you like to know?`;
  }

  if (questionLower.includes('help')) {
    return `**Enterprise OpenClaw Help**

I'm here to assist you! Here's what I can do:

**Knowledge Features:**
• Query the knowledge graph
• Retrieve relevant information using RAG
• Store and organize information

**System Commands:**
• "status" - Check system status
• "what is openclaw" - Learn about the platform
• "features" - See available features

**Privacy:**
Everything runs 100% locally on your machine. Your data stays private.

What would you like help with?`;
  }

  if (questionLower.includes('features') || questionLower.includes('capabilities')) {
    return `**Enterprise OpenClaw Features**

🧠 **Core Features (Open Source):**
• Knowledge Graph - Store and query complex information
• Vector Search - Semantic similarity with LanceDB
• Basic RAG - Retrieval-augmented generation
• Multi-Agent Foundation - Agent coordination

🔒 **Enterprise Features:**
• Advanced DRIFT RAG - Dynamic reasoning
• Inference Engine - Knowledge gap detection
• PII Detection - Privacy protection
• Audit Logging - Compliance trail
• Multi-Tenant - Secure data isolation

🎯 **Current Session:**
Running with knowledge graph and basic RAG enabled. Ask me anything!`;
  }

  // Generic response
  return `I understand you're asking about: "${question}"

I can help you with information from my knowledge graph. Try asking about:
• Enterprise OpenClaw features and capabilities
• System status and configuration
• How to use specific features

Or ask me to explain something specific!`;
}

// Query knowledge endpoint (for advanced users)
app.post('/api/query', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!isInitialized) {
      return res.status(503).json({ error: 'Knowledge graph not initialized' });
    }

    const results = await knowledgeGraph.queryNodes(query, { limit });

    res.json({
      query,
      results,
      count: results.length
    });

  } catch (error) {
    logger.error({ error }, 'Query failed');
    res.status(500).json({ error: 'Query failed' });
  }
});

// Add knowledge endpoint
app.post('/api/knowledge', async (req, res) => {
  try {
    const { content, type = 'concept', metadata = {} } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!isInitialized) {
      return res.status(503).json({ error: 'Knowledge graph not initialized' });
    }

    const id = `node_${Date.now()}`;

    await knowledgeGraph.addNode({
      id,
      type,
      content,
      metadata
    });

    logger.info({ id, content }, 'Knowledge added');

    res.json({
      success: true,
      id,
      message: 'Knowledge added successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Failed to add knowledge');
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

// Serve the chat UI
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
  try {
    await initializeSystem();

    app.listen(port, () => {
      console.log('');
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║                                           ║');
      console.log('║    🦅 Enterprise OpenClaw v1.0.0         ║');
      console.log('║                                           ║');
      console.log('║    ✅ System Running                      ║');
      console.log('║                                           ║');
      console.log('╚═══════════════════════════════════════════╝');
      console.log('');
      console.log(`🌐 Chat UI:     http://localhost:${port}`);
      console.log(`🔌 API:         http://localhost:${port}/api`);
      console.log(`💓 Health:      http://localhost:${port}/api/health`);
      console.log('');
      console.log('📚 Features:');
      console.log('   • Knowledge Graph - Active');
      console.log('   • RAG System - Ready');
      console.log('   • Chat Interface - Loaded');
      console.log('   • 100% Local - Privacy Protected');
      console.log('');
      console.log('Press Ctrl+C to stop');
      console.log('');
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
start();
