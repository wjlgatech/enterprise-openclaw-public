/**
 * SearchAgent Integration Example
 * Demonstrates how to use SearchAgent with DistillerOrchestrator
 */

import { DistillerOrchestrator } from '../src/orchestrator/distiller-orchestrator';
import { SearchAgent } from '../extensions/agent-library/utility-agents/search-agent';
import * as path from 'path';

async function main() {
  console.log('=== SearchAgent Integration Example ===\n');

  // 1. Create SearchAgent
  console.log('1. Creating SearchAgent...');
  const searchAgent = new SearchAgent({
    agentName: 'search',
    agentDescription: 'Searches the web for information',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    llm: 'ollama:phi4',
    temperature: 0.7,
    maxTokens: 2048,
  });
  console.log('   ✓ SearchAgent created\n');

  // 2. Test direct execution
  console.log('2. Testing direct execution...');
  const directResult = await searchAgent.execute('TypeScript best practices');
  console.log('   Result preview:', directResult.substring(0, 100) + '...\n');

  // 3. Create orchestrator
  console.log('3. Creating DistillerOrchestrator...');
  const orchestrator = new DistillerOrchestrator();

  // Load configuration
  const configPath = path.join(__dirname, '../config/examples/test-distiller-config.yaml');
  await orchestrator.loadConfig(configPath);
  console.log('   ✓ Configuration loaded\n');

  // 4. Register SearchAgent with orchestrator
  console.log('4. Registering SearchAgent with orchestrator...');
  orchestrator.registerAgent('search', async (query: string, context?: any) => {
    return await searchAgent.execute(query, context);
  });
  console.log('   ✓ Agent registered\n');

  // 5. Test intelligent routing
  console.log('5. Testing intelligent routing...');
  const queries = [
    'Search for Node.js tutorials',
    'Find information about AI ethics',
    'Look up quantum computing papers',
  ];

  for (const query of queries) {
    console.log(`   Query: "${query}"`);
    try {
      const result = await orchestrator.query(query);
      console.log(`   Result: ${result.substring(0, 80)}...`);
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
    console.log();
  }

  // 6. Test self-reflection
  console.log('6. Testing self-reflection...');
  const query = 'machine learning algorithms';
  const initialResult = await searchAgent.execute(query);
  const reflectedResult = await searchAgent.selfReflect(query, initialResult);

  console.log('   Initial result length:', initialResult.length);
  console.log('   Reflected result length:', reflectedResult.length);
  console.log('   Self-reflection added warnings:', reflectedResult !== initialResult);
  console.log();

  // 7. Test structured search
  console.log('7. Testing structured search...');
  const structuredResults = await searchAgent.search('climate change', { maxResults: 3 });
  console.log(`   Found ${structuredResults.length} results:`);
  structuredResults.forEach((result, i) => {
    console.log(`   ${i + 1}. ${result.title}`);
    console.log(`      ${result.url}`);
  });
  console.log();

  // 8. List registered agents
  console.log('8. Listing registered agents...');
  const agents = orchestrator.listAgents();
  console.log('   Registered agents:', agents.join(', '));
  console.log();

  console.log('=== Example Complete ===');
}

// Run example
main().catch((error) => {
  console.error('Error running example:', error);
  process.exit(1);
});
