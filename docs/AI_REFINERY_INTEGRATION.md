# AI Refinery Integration

Enterprise OpenClaw supports Accenture's AI Refinery as an LLM backend, providing:
- Access to Llama, Qwen, and other enterprise-grade models
- Real-time voice capabilities (ASR → LLM → TTS)
- Multi-agent orchestration via Distiller
- Enterprise observability and monitoring

## Quick Start

### 1. Get API Key

Visit [AI Refinery SDK Docs](https://sdk.airefinery.accenture.com/setup/quickstart/) and follow the authentication guide.

### 2. Configure Environment

```bash
# .env
AIR_API_KEY=your-api-key
AIR_BASE_URL=https://api.airefinery.accenture.com

# Enable v2 API for enhanced observability (recommended)
USE_AIR_API_V2_BASE_URL=true
```

### 3. Use in Agents

```typescript
import { createProvider, AIRefineryProvider } from './providers';

// Auto-select based on env vars
const provider = getDefaultProvider();

// Or explicitly use AI Refinery
const airProvider = new AIRefineryProvider({
  apiKey: process.env.AIR_API_KEY,
  projectName: 'my-project',
});

// Use in agent config
const task = await orchestrator.createTask(tenantId, sessionId, 'Generate code', [
  {
    name: 'coder',
    type: 'code-generator',
    description: 'Generate TypeScript code',
    provider: 'airefinery',  // <-- Use AI Refinery
    model: 'meta-llama/Llama-3.1-70B-Instruct',
    config: {},
  },
]);
```

## Available Models

### LLMs
- `meta-llama/Llama-3.1-70B-Instruct`
- `meta-llama/Llama-3.3-70b-Instruct`
- `Qwen/Qwen3-VL-32B-Instruct` (Vision-Language)

### Vision Models
- `meta-llama/Llama-3.2-90B-Vision-Instruct`

> ⚠️ **Note:** Llama models will be deprecated in v1.27.0 (March 2, 2026)

## Real-Time Voice

AI Refinery provides real-time voice capabilities:

```typescript
import { AIRefineryRealtimeProvider } from './providers';

const realtime = new AIRefineryRealtimeProvider();

// Connect to voice session
await realtime.connect({
  agentId: 'my-voice-agent',
  voice: 'default',
  language: 'en-US',
  inputMode: 'push-to-talk',
});

// Handle events
realtime.onEvent((event) => {
  switch (event.type) {
    case 'transcription.delta':
      console.log('User said:', event.text);
      break;
    case 'response.audio':
      playAudio(event.audio);
      break;
  }
});

// Send audio
await realtime.sendAudio(audioBuffer);

// Or send text
await realtime.sendText('Hello, how can I help?');

// Disconnect when done
await realtime.disconnect();
```

### Architecture

The real-time system uses a cascaded design:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  ASR        │ → │  LLM        │ → │  TTS        │
│  (Speech    │    │  (Process   │    │  (Generate  │
│   to Text)  │    │   & Think)  │    │   Speech)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Features
- **Push-to-talk**: User presses button to speak
- **Streaming**: Real-time transcription and response
- **Barge-in** (coming soon): Interrupt agent speech with new input
- **Configurable voices**: Per-agent voice settings
- **Multi-language**: Broad language support via Azure AI Speech

## Configuration Options

### Per-Agent Config (YAML)

```yaml
agents:
  - name: customer-support
    type: analyzer
    provider: airefinery
    config:
      voice: en-US-Jenny
      language: en-US
      speech_speed: 1.0
      silence_duration_ms: 500
      normalization: true
```

### Distiller Project Config

AI Refinery uses Distiller projects for multi-agent orchestration:

```python
# Using airefinery-sdk (Python)
from air import AsyncDistillerClient

async with AsyncDistillerClient() as client:
    # Create project from YAML config
    await client.create_project(config_path='distiller.yaml')
    
    # Run distiller
    async for chunk in client.run_stream(messages=[...]):
        print(chunk)
```

## SDK Reference

- **Repo:** https://github.com/Accenture/airefinery-sdk
- **Docs:** https://sdk.airefinery.accenture.com/
- **Latest:** v1.25.0

### Key Files
```
air/
├── distiller/
│   ├── realtime_client.py    # Real-time voice
│   └── client.py             # Text completions
├── audio/
│   ├── asr_client.py         # Speech-to-Text
│   └── tts_client.py         # Text-to-Speech
```

## Best Practices

### 1. Latency Management
- Design for async execution
- Avoid chaining tool calls between agents
- Use streaming for responsive UX

### 2. Error Handling
- AI Refinery returns structured errors
- Implement retry logic for transient failures
- Fall back to Anthropic if AI Refinery is unavailable

### 3. Cost Management
- AI Refinery is internal (no direct token costs)
- Still track usage for capacity planning
- Use appropriate model sizes for tasks

### 4. Security
- Store API keys in environment variables
- Use v2 API for enhanced observability
- Follow Accenture data handling policies

## Streaming Support

```typescript
import { streamToCallback, streamToSSE, createReadableStream } from './providers';

// Stream with callback (for real-time UI)
await streamToCallback(provider, request, 
  (delta) => process.stdout.write(delta),
  () => console.log('\nDone!'),
  (err) => console.error('Error:', err)
);

// Server-Sent Events (for web)
for await (const sse of streamToSSE(provider, request)) {
  res.write(sse);
}

// ReadableStream (for fetch responses)
return new Response(createReadableStream(provider, request));
```

## Distiller Project Config

Generate AI Refinery-compatible config from your agents:

```typescript
import { generateDistillerConfig, exportToYaml } from './providers';

const config = generateDistillerConfig('my-project', [
  { name: 'coder', type: 'code-generator', description: 'Write code' },
  { name: 'reviewer', type: 'analyzer', description: 'Review code' },
]);

// Export to YAML for AI Refinery
const yaml = exportToYaml(config);
fs.writeFileSync('distiller.yaml', yaml);
```

## Voice Agent

Create real-time voice interactions:

```typescript
import { createVoiceAgent } from './agents';

const agent = createVoiceAgent({
  name: 'support',
  type: 'custom',
  description: 'Customer support',
  voice: 'en-US-Jenny',
  language: 'en-US',
  inputMode: 'push-to-talk',
  interruptible: true,
});

agent.on('session.ready', () => console.log('Ready!'));
agent.on('transcription', (text) => console.log('User:', text));
agent.on('response.text', (text) => console.log('Agent:', text));
agent.on('response.audio', (audio) => playAudio(audio));
agent.on('metrics', (m) => console.log('Latency:', m.responseLatencyMs, 'ms'));

await agent.start();
await agent.sendText('Hello!');

// Handle audio input
agent.sendAudio(microphoneBuffer);

await agent.stop();
```

## Troubleshooting

### "AIR_API_KEY not set"
Set the environment variable:
```bash
export AIR_API_KEY=your-key
```

### Connection Timeout
- Check VPN connection (required for internal API)
- Verify base URL is correct
- Check API key validity

### Model Not Found
- Ensure model is available in your region
- Check for deprecation notices
- Use `listModels()` to see available options
