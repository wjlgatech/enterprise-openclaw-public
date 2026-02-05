# Computer Use Module

**Cross-platform** computer control for Enterprise OpenClaw. Lets Claude see your screen, click, type, and automate any application.

**Supports:** macOS ✅ | Windows ✅ | Linux ✅

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    agent.ts                                 │
│              (Claude Vision Agent Loop)                     │
├─────────────────────────────────────────────────────────────┤
│  1. Take screenshot                                         │
│  2. Send to Claude Vision API                               │
│  3. Parse action from response                              │
│  4. Execute action                                          │
│  5. Repeat until done                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                unified.ts / index.ts                        │
│              (Cross-platform API)                           │
├─────────────────────────────────────────────────────────────┤
│  screenshot, click, type, key, scroll, move, drag           │
│  Auto-detects best backend for current OS                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   macOS Native Backend  │     │   PyAutoGUI Backend     │
│     (CUAHelper.app)     │     │   (Cross-platform)      │
├─────────────────────────┤     ├─────────────────────────┤
│  • screencapture        │     │  • Works on all OS      │
│  • cliclick             │     │  • Pure Python          │
│  • Fastest on macOS     │     │  • Fallback option      │
└─────────────────────────┘     └─────────────────────────┘
```

## Platform Support

| Platform | Backend | Setup |
|----------|---------|-------|
| **macOS** | CUAHelper (native) | `./scripts/setup-cua-helper.sh` |
| **macOS** | PyAutoGUI (fallback) | `pip install pyautogui` |
| **Windows** | PyAutoGUI | `pip install pyautogui` |
| **Linux** | PyAutoGUI | `pip install pyautogui` |

## Quick Start

### 1. Setup

```typescript
import { setupCUAHelper, checkSetup } from '@enterprise-openclaw/enterprise/computer-use/setup';

// Check if ready
const status = await checkSetup();
if (!status.ready) {
  await setupCUAHelper();
}
```

### 2. Grant Accessibility Permission

After running setup:
1. Open **System Settings** > **Privacy & Security** > **Accessibility**
2. Click **+** button
3. Navigate to `~/Applications/CUAHelper.app`
4. Enable the checkbox

### 3. Run Agent

```typescript
import { runAgent } from '@enterprise-openclaw/enterprise/computer-use';

const result = await runAgent("Open Safari and search for weather in San Francisco", {
  maxSteps: 10,
  debug: true
});

console.log(result);
// { success: true, steps: 5, actions: [...], finalReason: "Task completed" }
```

### 4. Direct Actions

```typescript
import { screenshot, click, typeText, pressKey } from '@enterprise-openclaw/enterprise/computer-use';

// Take screenshot
const ss = await screenshot('/tmp/screen.png');

// Click at coordinates
await click(500, 300);

// Type text
await typeText("Hello World");

// Press keys
await pressKey('cmd+s');  // Save
await pressKey('return'); // Enter
```

## API Reference

### Agent Functions

#### `runAgent(task: string, config?: AgentConfig): Promise<AgentResult>`

Runs the computer use agent loop until task is complete.

```typescript
interface AgentConfig {
  maxSteps?: number;      // Default: 15
  apiKey?: string;        // Uses ANTHROPIC_API_KEY env var
  model?: string;         // Default: claude-sonnet-4-20250514
  debug?: boolean;        // Log steps
  onStep?: (step, action) => void;
  onScreenshot?: (base64) => void;
}
```

### Low-Level Functions

| Function | Description |
|----------|-------------|
| `screenshot(path?)` | Take screenshot, returns path |
| `screenshotBase64()` | Take screenshot, returns base64 |
| `click(x, y, options?)` | Click at coordinates |
| `doubleClick(x, y)` | Double-click |
| `rightClick(x, y)` | Right-click |
| `moveMouse(x, y)` | Move cursor |
| `typeText(text)` | Type text |
| `pressKey(key)` | Press key/shortcut |
| `scroll(x, y, options?)` | Scroll at position |
| `drag(x1, y1, x2, y2)` | Drag from point to point |

### Key Shortcuts

| Key | Description |
|-----|-------------|
| `return`, `enter` | Enter key |
| `tab` | Tab key |
| `escape`, `esc` | Escape key |
| `space` | Space bar |
| `delete`, `backspace` | Delete/Backspace |
| `up`, `down`, `left`, `right` | Arrow keys |
| `cmd+s` | Command + S |
| `cmd+shift+p` | Command + Shift + P |
| `ctrl+c` | Control + C |

## Example Tasks

```typescript
// Open app and take action
await runAgent("Open Notes and create a new note with title 'Meeting Notes'");

// Web automation
await runAgent("Open Safari, go to github.com, and star the anthropics/claude-code repo");

// System settings
await runAgent("Open System Settings and enable Dark Mode");

// Fill forms
await runAgent("Fill out the contact form on the current page with name 'John Doe' and email 'john@example.com'");
```

## Troubleshooting

### "CUAHelper not found"
Run `setupCUAHelper()` to create the app bundle.

### "cliclick not found"
Install via Homebrew: `brew install cliclick`

### Actions not working
1. Check Accessibility permission is granted
2. Try removing and re-adding CUAHelper.app in Privacy settings
3. Restart the app/terminal

### Wrong coordinates
The coordinates are screen pixels. On Retina displays, coordinates may need adjustment.

## Security Considerations

- Computer use gives full desktop control - use with caution
- Consider command allowlisting (SEC-002) for production
- Log all actions for audit trail
- Require explicit user consent before enabling
