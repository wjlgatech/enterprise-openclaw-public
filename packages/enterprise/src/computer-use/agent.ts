/**
 * Computer Use Agent - Claude-powered desktop automation
 * 
 * Takes screenshots, sends to Claude, executes actions in a loop
 * until the task is complete.
 */

import Anthropic from '@anthropic-ai/sdk';
import * as cua from './index';
import { ComputerAction, AgentConfig, AgentResult } from './types';

const SYSTEM_PROMPT = `You are a computer use agent controlling a macOS computer. You can see screenshots and must decide what action to take to accomplish the user's task.

IMPORTANT: Always respond with a JSON action block. Available actions:

1. Click: {"action": "click", "x": 500, "y": 300}
2. Double-click: {"action": "double_click", "x": 500, "y": 300}
3. Right-click: {"action": "right_click", "x": 500, "y": 300}
4. Type text: {"action": "type", "text": "hello world"}  
5. Press key: {"action": "key", "key": "return"} or {"action": "key", "key": "cmd+s"}
6. Scroll: {"action": "scroll", "x": 500, "y": 400, "direction": "down", "amount": 3}
7. Move mouse: {"action": "move", "x": 500, "y": 300}
8. Wait: {"action": "wait", "ms": 1000}
9. Done: {"action": "done", "reason": "Task completed successfully"}

Screen coordinates: The screenshot shows the full screen. Identify the pixel coordinates of UI elements you need to interact with.

Guidelines:
- Look carefully at the screenshot to identify clickable elements
- Click on buttons, text fields, links by their visual position
- After clicking a text field, use "type" to enter text
- Use "key" for keyboard shortcuts (cmd+s, return, tab, etc.)
- Report "done" when the task is complete or impossible

Respond with ONLY the JSON action, no explanation needed unless reporting done.`;

/**
 * Parse Claude's response to extract action JSON
 */
function parseAction(responseText: string): ComputerAction {
  // Try to find JSON in the response
  const jsonMatch = responseText.match(/\{[^{}]*"action"[^{}]*\}/s);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as ComputerAction;
    } catch {
      // Fall through to text parsing
    }
  }

  // Check for done signals
  const textLower = responseText.toLowerCase();
  if (textLower.includes('task complete') || (textLower.includes('done') && !textLower.includes('click'))) {
    return { action: 'done', reason: responseText };
  }

  // Try to extract click coordinates
  const clickMatch = textLower.match(/click.*?(\d+)[,\s]+(\d+)/);
  if (clickMatch) {
    return {
      action: 'click',
      x: parseInt(clickMatch[1]),
      y: parseInt(clickMatch[2])
    };
  }

  // Try to extract type text
  const typeMatch = responseText.match(/type[:\s]+"([^"]+)"/);
  if (typeMatch) {
    return { action: 'type', text: typeMatch[1] };
  }

  // Default to done with unknown
  return { action: 'done', reason: `Could not parse action: ${responseText}` };
}

/**
 * Execute a single action
 */
async function executeAction(action: ComputerAction): Promise<boolean> {
  switch (action.action) {
    case 'click':
      await cua.click(action.x, action.y);
      return true;

    case 'double_click':
      await cua.doubleClick(action.x, action.y);
      return true;

    case 'right_click':
      await cua.rightClick(action.x, action.y);
      return true;

    case 'type':
      await cua.typeText(action.text);
      return true;

    case 'key':
      await cua.pressKey(action.key);
      return true;

    case 'scroll':
      await cua.scroll(action.x, action.y, {
        direction: action.direction,
        amount: action.amount
      });
      return true;

    case 'move':
      await cua.moveMouse(action.x, action.y);
      return true;

    case 'drag':
      await cua.drag(action.startX, action.startY, action.endX, action.endY);
      return true;

    case 'wait':
      await new Promise(r => setTimeout(r, action.ms));
      return true;

    case 'done':
      return false; // Signal to stop loop

    default:
      console.warn(`Unknown action: ${(action as any).action}`);
      return true;
  }
}

/**
 * Run the Computer Use Agent loop
 */
export async function runAgent(task: string, config: AgentConfig = {}): Promise<AgentResult> {
  const {
    maxSteps = 15,
    apiKey = process.env.ANTHROPIC_API_KEY,
    model = 'claude-sonnet-4-20250514',
    debug = false,
    onStep,
    onScreenshot
  } = config;

  if (!apiKey) {
    return {
      success: false,
      steps: 0,
      actions: [],
      error: 'ANTHROPIC_API_KEY not found'
    };
  }

  // Check if CUAHelper is available
  if (!await cua.isAvailable()) {
    return {
      success: false,
      steps: 0,
      actions: [],
      error: 'CUAHelper.app not found. Please install it first.'
    };
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [];
  const executedActions: ComputerAction[] = [];

  for (let step = 0; step < maxSteps; step++) {
    if (debug) console.log(`\n🔄 Step ${step + 1}/${maxSteps}`);

    // Take screenshot
    const screenshotResult = await cua.screenshotBase64();
    if (!screenshotResult.success || !screenshotResult.base64) {
      return {
        success: false,
        steps: step,
        actions: executedActions,
        error: `Screenshot failed: ${screenshotResult.error}`
      };
    }

    if (onScreenshot) {
      onScreenshot(screenshotResult.base64);
    }

    // Build message with screenshot
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshotResult.base64
        }
      },
      {
        type: 'text',
        text: step === 0 
          ? `Task: ${task}\n\nWhat action should I take? Respond with JSON action.`
          : 'What action should I take next? Respond with JSON action.'
      }
    ];

    messages.push({ role: 'user', content });

    // Call Claude
    if (debug) console.log('🤔 Analyzing with Claude...');

    try {
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages
      });

      // Extract response text
      let responseText = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
      }

      if (debug) console.log(`💭 Claude: ${responseText.substring(0, 200)}...`);

      // Add assistant response to history
      messages.push({ role: 'assistant', content: responseText });

      // Parse and execute action
      const action = parseAction(responseText);
      executedActions.push(action);

      if (onStep) {
        onStep(step + 1, action);
      }

      if (debug) console.log(`🎯 Action: ${JSON.stringify(action)}`);

      const shouldContinue = await executeAction(action);
      
      if (!shouldContinue) {
        return {
          success: true,
          steps: step + 1,
          actions: executedActions,
          finalReason: action.action === 'done' ? action.reason : undefined
        };
      }

      // Brief pause after action
      await new Promise(r => setTimeout(r, 500));

    } catch (err: any) {
      return {
        success: false,
        steps: step,
        actions: executedActions,
        error: `Claude API error: ${err.message}`
      };
    }
  }

  return {
    success: false,
    steps: maxSteps,
    actions: executedActions,
    error: `Max steps (${maxSteps}) reached without completing task`
  };
}

/**
 * Execute a single computer action (for direct use without agent loop)
 */
export async function executeComputerAction(action: ComputerAction): Promise<{ success: boolean; error?: string }> {
  try {
    await executeAction(action);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
