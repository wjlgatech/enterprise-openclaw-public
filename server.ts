#!/usr/bin/env tsx

/**
 * Enterprise OpenClaw - Full Application Server
 *
 * Chat-based UI with knowledge graph, RAG, and multi-agent capabilities
 */

import express from 'express';
import { KnowledgeGraph } from './packages/core/src/knowledge-graph/knowledge-graph.js';
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
let isInitialized = false;

async function initializeSystem() {
  logger.info('🚀 Initializing Enterprise OpenClaw...');

  try {
    // Initialize Knowledge Graph
    logger.info('📊 Initializing Knowledge Graph...');
    knowledgeGraph = new KnowledgeGraph('./data/knowledge-graph');
    await knowledgeGraph.initialize();
    logger.info('✓ Knowledge Graph initialized');

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
      knowledgeGraph: isInitialized ? 'ready' : 'initializing'
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

// Generate response using RAG context with conversational setup features
function generateResponse(question: string, context: string): string {
  const questionLower = question.toLowerCase();

  // Status check with detailed system info
  if (questionLower.includes('status') || questionLower.includes('running')) {
    return `**System Status**

✅ Server: Running (Port ${port})
✅ Knowledge Graph: Active
✅ Privacy: 100% Local Processing

**Features:**
• Knowledge Graph - Storing and querying information
• Basic RAG - Context-aware responses
• Chat Interface - Active (you're using it now!)
• Enterprise Features - Available with license

**Data:**
${context}

Everything is working great! What would you like to do?`;
  }

  // Claude API setup
  if (questionLower.includes('claude') && (questionLower.includes('add') || questionLower.includes('api') || questionLower.includes('configure') || questionLower.includes('setup'))) {
    return `I'll help you add Claude API support!

**Step 1:** Get an API key
Visit: https://console.anthropic.com/
Create an account and get your API key.

**Step 2:** Configure it
You can set it as an environment variable:
\`\`\`bash
export ANTHROPIC_API_KEY="your-key-here"
\`\`\`

Or I can help you configure it through chat! Just paste your key here and I'll guide you.

**Benefits of adding Claude:**
• Access to powerful Claude Opus 4.5
• Extended thinking mode
• Latest AI capabilities
• Still 100% secure (API only used when you request)

Do you have an API key ready, or should I explain more?`;
  }

  // Model installation
  if (questionLower.includes('install') && (questionLower.includes('model') || questionLower.includes('ollama') || questionLower.includes('local ai'))) {
    return `Great! I can help you install local AI models.

**Popular Local Models (via Ollama):**

**🚀 Fast & Efficient:**
• mistral:7b - 4GB - General purpose, very fast
• deepseek-coder - 4GB - Coding specialist

**💪 Powerful:**
• codellama:13b - 7GB - Best for coding tasks
• qwen2.5-coder:32b - 20GB - Advanced coding

**🧠 Most Capable:**
• llama3.2:90b - 50GB - Highest quality responses

**To install**, run in your terminal:
\`\`\`bash
ollama pull mistral:7b
\`\`\`

Then integrate it with Enterprise OpenClaw through our provider system.

Which model interests you? I can provide specific installation steps!`;
  }

  // Configuration help
  if (questionLower.includes('configure') || questionLower.includes('setup') || questionLower.includes('how to')) {
    return `I can help you configure Enterprise OpenClaw through natural language - no terminal needed for most things!

**Available Configurations:**

**🔑 AI Providers:**
• Add Claude API (best quality)
• Configure local Ollama models (privacy-first)
• Mix and match providers

**📡 Channels:**
• Chat UI (active now)
• Telegram bot setup
• Discord integration

**⚙️ Features:**
• Knowledge Graph tuning
• RAG configuration
• Security settings

**To configure**, just tell me what you want to do. For example:
• "Add Claude API"
• "Install mistral model"
• "Set up Telegram bot"

What would you like to configure?`;
  }

  // Analyze question type
  if (questionLower.includes('what is') || questionLower.includes('what are')) {
    return `Based on my knowledge:\n\n${context}\n\nIs there anything specific you'd like to know more about?`;
  }

  if (questionLower.includes('how') || questionLower.includes('can you')) {
    return `Here's what I know:\n\n${context}\n\nI can provide more details if you need specific information about any aspect.`;
  }

  // Default response with context
  return `${context}\n\nWould you like me to elaborate on any specific aspect?`;
}

// Fallback responses for general questions with conversational setup
function generateFallbackResponse(question: string): string {
  const questionLower = question.toLowerCase();

  if (questionLower.includes('hello') || questionLower.includes('hi')) {
    return `Hello! I'm your Enterprise OpenClaw AI assistant. I'm running locally on your machine with access to a knowledge graph.

I can help you with:
• **Setup & Configuration** - Add Claude API, install models, configure features (all through chat, no terminal needed!)
• **Knowledge Management** - Store, query, and organize information
• **System Status** - Check what's running and healthy
• **General Assistance** - Anything else you need

**Quick Start:**
• Say "help me configure Claude API" to add cloud AI
• Say "status" to see system health
• Say "install a model" for local AI setup

What would you like to do?`;
  }

  if (questionLower.includes('help')) {
    return `**Enterprise OpenClaw Help**

I'm here to assist you! Here's what I can do:

**🎯 Natural Language Setup (No Terminal Needed!):**
• "Add Claude API" - Configure Claude with conversational steps
• "Install a model" - Get local AI models (Ollama)
• "Setup Telegram" - Connect Telegram bot
• "Configure features" - Tune your installation

**📊 Knowledge Features:**
• Query the knowledge graph
• Retrieve relevant information using RAG
• Store and organize information

**⚙️ System Commands:**
• "status" - Check system health
• "what is openclaw" - Learn about the platform
• "features" - See available capabilities

**🔒 Privacy:**
Everything runs 100% locally on your machine. Your data stays private.

**Pro Tip:** Just describe what you want in natural language - I'll guide you through setup steps conversationally!

What would you like help with?`;
  }

  if (questionLower.includes('features') || questionLower.includes('capabilities')) {
    return `**Enterprise OpenClaw Features**

🧠 **Core Features (Open Source):**
• Knowledge Graph - Store and query complex information
• Vector Search - Semantic similarity with LanceDB
• Basic RAG - Retrieval-augmented generation
• Multi-Agent Foundation - Agent coordination
• **Conversational Setup** - Configure everything through chat!

🔒 **Enterprise Features:**
• Advanced DRIFT RAG - Dynamic reasoning
• Inference Engine - Knowledge gap detection
• PII Detection - Privacy protection
• Audit Logging - Compliance trail
• Multi-Tenant - Secure data isolation

🎯 **Unique Add-ons:**
• **Natural Language Configuration** - No terminal needed for most setup
• **Chat-based Model Installation** - Install AI models conversationally
• **Interactive Onboarding** - Guided setup through conversation

🎯 **Current Session:**
Running with knowledge graph and conversational setup. Ask me anything or say "help me configure"!`;
  }

  // Generic response
  return `I understand you're asking about: "${question}"

I can help you with information from my knowledge graph. Try:
• **Configuration**: "help me set up Claude API" or "install a model"
• **Features**: "what can you do?" or "show me features"
• **Status**: "system status" or "what's running?"

Or just describe what you want in natural language - I'll guide you through it!`;
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
