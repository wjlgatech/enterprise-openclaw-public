import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('Testing Anthropic API...\n');

// Try different model names
const models = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
];

for (const model of models) {
  try {
    console.log(`Testing ${model}...`);
    const response = await client.messages.create({
      model,
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say "test"' }],
    });
    console.log(`✅ ${model} WORKS!`);
    console.log(`Response: ${response.content[0].text}\n`);
    break;
  } catch (error) {
    console.log(`❌ ${model} failed: ${error.message}\n`);
  }
}
