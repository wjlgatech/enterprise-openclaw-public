/**
 * Basic usage examples for Claude Agent Bridge
 */

import { ClaudeAgentWrapper } from '../src/claude-agent-wrapper';
import { ArtifactManager } from '../src/artifact-manager';
import { ExtendedThinkingManager } from '../src/extended-thinking-manager';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  // 1. Basic execution
  console.log('=== Basic Execution ===');
  const wrapper = new ClaudeAgentWrapper(apiKey);
  const response = await wrapper.executeWithThinking(
    'Explain the concept of recursion with a simple example.',
    { model: 'claude-3-haiku-20240307' }
  );
  console.log('Response:', response.content);
  console.log('Usage:', response.usage);

  // 2. Extended thinking
  console.log('\n=== Extended Thinking ===');
  const thinkingResponse = await wrapper.executeWithThinking(
    'Design a scalable microservices architecture for an e-commerce platform.',
    {
      model: 'claude-3-haiku-20240307',
      extendedThinking: {
        enabled: true,
        budget: 5000,
      },
    }
  );

  if (thinkingResponse.thinking) {
    console.log('Thinking process:');
    thinkingResponse.thinking.forEach((step, i) => {
      console.log(`Step ${i + 1}:`, step.substring(0, 100) + '...');
    });
  }
  console.log('\nFinal response:', thinkingResponse.content.substring(0, 200) + '...');

  // 3. Artifact generation
  console.log('\n=== Artifact Generation ===');
  const artifactManager = new ArtifactManager('./data/artifacts');
  await artifactManager.initialize();

  const artifacts = await wrapper.generateArtifacts(
    'Create a React component for a login form with email and password fields.',
    {
      model: 'claude-3-haiku-20240307',
      generateArtifacts: true,
    }
  );

  console.log(`Generated ${artifacts.length} artifacts:`);
  for (const artifact of artifacts) {
    console.log(`- ${artifact.title} (${artifact.language})`);
    const id = await artifactManager.store(artifact);
    console.log(`  Stored with ID: ${id}`);
  }

  // 4. Streaming
  console.log('\n=== Streaming Response ===');
  process.stdout.write('Stream: ');
  for await (const chunk of wrapper.stream(
    'Write a haiku about coding.',
    { model: 'claude-3-haiku-20240307' }
  )) {
    if (chunk.type === 'text') {
      process.stdout.write(chunk.content);
    } else if (chunk.type === 'thinking') {
      process.stdout.write(`[thinking: ${chunk.content.substring(0, 20)}...]`);
    }
  }
  console.log();

  // 5. Thinking analysis
  console.log('\n=== Thinking Analysis ===');
  const thinkingManager = new ExtendedThinkingManager();
  if (thinkingResponse.thinking) {
    thinkingManager.storeThinking('test-response', thinkingResponse.thinking);
    const steps = thinkingManager.getThinkingProcess('test-response');
    const quality = thinkingManager.analyzeQuality(steps);
    console.log('Thinking quality metrics:', quality);
  }

  // 6. Artifact listing and retrieval
  console.log('\n=== Artifact Management ===');
  const allArtifacts = await artifactManager.list();
  console.log(`Total artifacts: ${allArtifacts.length}`);

  const codeArtifacts = await artifactManager.list({ type: 'code' });
  console.log(`Code artifacts: ${codeArtifacts.length}`);

  const stats = artifactManager.getStats();
  console.log('Storage stats:', stats);
}

main().catch(console.error);
