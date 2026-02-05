/**
 * Computer Use Module for Enterprise OpenClaw
 * 
 * Cross-platform computer control: macOS, Windows, Linux
 * 
 * Usage:
 * ```typescript
 * import { screenshot, click, typeText, pressKey, runAgent } from '@enterprise-openclaw/enterprise/computer-use';
 * 
 * // Take a screenshot
 * const result = await screenshot('/tmp/screen.png');
 * 
 * // Click at coordinates
 * await click(500, 300);
 * 
 * // Type text
 * await typeText('Hello World');
 * 
 * // Press keys
 * await pressKey('cmd+s');
 * 
 * // Run the Claude agent loop
 * const agentResult = await runAgent("Open Safari and search for weather");
 * ```
 */

// Re-export unified API
export {
  isAvailable,
  getInfo,
  screenshot,
  screenshotBase64,
  click,
  doubleClick,
  rightClick,
  moveMouse,
  typeText,
  pressKey,
  scroll,
  drag,
  getScreenSize,
  setBackend,
  resetBackend,
} from './unified';

// Re-export agent
export { runAgent, executeComputerAction } from './agent';

// Re-export types
export * from './types';

// Re-export backends for advanced use
export * from './backends';
