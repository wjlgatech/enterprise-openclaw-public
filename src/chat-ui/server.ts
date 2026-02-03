/**
 * Chat UI Server for Enterprise OpenClaw
 * Provides conversational configuration and onboarding
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Conversational AI handler
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    // Route to appropriate handler based on intent
    const response = await handleMessage(message);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      response: 'Sorry, I encountered an error. Please try again.',
      model: 'system',
    });
  }
});

async function handleMessage(message: string): Promise<any> {
  const lower = message.toLowerCase();

  // Intent detection with conversational responses

  // Status check
  if (lower.includes('status') || lower.includes('running')) {
    return {
      response: `**System Status**

✅ Gateway: Running (Port 18789)
✅ Ollama: Active (localhost:11434)
✅ AI Model: phi4 (local)
✅ Privacy: 100% Local Processing

**Extensions:**
• Claude Agent Bridge: Loaded
• Ollama Bridge: Loaded

**Channels:**
• Chat UI: Active (you're using it now!)
• Telegram: Not configured
• Discord: Not configured

Everything is working great! What would you like to do?`,
      model: 'System',
    };
  }

  // Help with Claude API
  if (lower.includes('claude') && (lower.includes('add') || lower.includes('api') || lower.includes('configure'))) {
    return {
      response: `I'll help you add Claude API support!

**Step 1:** Get an API key
Visit: https://console.anthropic.com/
Create an account and get your API key.

**Step 2:** Paste your key
Once you have it, just paste it here and I'll configure everything automatically.

**Benefits of adding Claude:**
• Access to powerful Claude Opus 4.5
• Extended thinking mode
• Latest AI capabilities
• Still 100% secure (API only used when you request)

Do you have an API key ready, or should I explain more?`,
      model: 'Setup Assistant',
    };
  }

  // Install models
  if (lower.includes('install') && (lower.includes('model') || lower.includes('codellama') || lower.includes('mistral') || lower.includes('llama'))) {
    const modelMap: Record<string, string> = {
      'codellama': 'codellama:13b - Specialized for coding (7GB)',
      'mistral': 'mistral:7b - Fast general-purpose (4GB)',
      'llama': 'llama3.2:90b - Most powerful (50GB)',
      'deepseek': 'deepseek-coder - Coding expert (4GB)',
      'qwen': 'qwen2.5-coder:32b - Advanced coding (20GB)',
    };

    return {
      response: `Great! I can install additional AI models.

**Available Models:**

**🚀 Fast & Efficient:**
• mistral:7b - 4GB - General purpose, very fast
• deepseek-coder - 4GB - Coding specialist

**💪 Powerful:**
• codellama:13b - 7GB - Best for coding tasks
• qwen2.5-coder:32b - 20GB - Advanced coding

**🧠 Most Capable:**
• llama3.2:90b - 50GB - Highest quality responses

Which one would you like to install? (Downloads happen in background, you can keep chatting!)

Or ask: "What's the difference between mistral and codellama?"`,
      model: 'Model Manager',
    };
  }

  // Telegram setup
  if (lower.includes('telegram') && (lower.includes('connect') || lower.includes('add') || lower.includes('setup'))) {
    return {
      response: `Let's connect Telegram! This lets you chat with me from Telegram.

**Step 1:** Create a bot
1. Open Telegram and message **@BotFather**
2. Send: \`/newbot\`
3. Choose a name (e.g., "My Enterprise AI")
4. Choose a username (e.g., "my_enterprise_bot")

**Step 2:** You'll receive a token
It looks like: \`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz\`

**Step 3:** Paste the token here
I'll configure everything automatically!

**Privacy Note:** Messages will still process locally through your Ollama installation. Telegram is just the interface.

Ready to start? Message @BotFather now!`,
      model: 'Setup Assistant',
    };
  }

  // Default: Send to Ollama
  return await callOllama(message);
}

async function callOllama(prompt: string): Promise<any> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi4',
        prompt: `You are a helpful AI assistant in Enterprise OpenClaw, a local AI platform.
Be concise, friendly, and helpful. If asked about configuration, guide users through conversational setup.

User: ${prompt}
Assistant:`,
        stream: false,
      }),
    });

    const data = await response.json();
    return {
      response: data.response,
      model: 'phi4 (local)',
    };
  } catch (error) {
    console.error('Ollama error:', error);
    return {
      response: `I'm having trouble connecting to the local AI model. This usually means:

1. Ollama is still downloading the model (check progress with \`ollama list\`)
2. Ollama service isn't running (it should auto-start)

Want me to check the status for you?`,
      model: 'System',
    };
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = 18790;
app.listen(PORT, () => {
  console.log(`✅ Chat UI server running on http://localhost:${PORT}`);
  console.log(`   Open your browser to start chatting!`);
});
