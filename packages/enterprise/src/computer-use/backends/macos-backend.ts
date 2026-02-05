/**
 * Native macOS Backend - Uses CUAHelper.app + cliclick
 * Faster than PyAutoGUI on macOS, but macOS-only
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  ComputerUseBackend,
  ScreenshotResult,
  ActionResult,
  ClickOptions,
  ScrollOptions,
  DragOptions,
} from './base';

const execAsync = promisify(exec);

// Path to CUAHelper
const CUA_HELPER = path.join(os.homedir(), 'Applications/CUAHelper.app/Contents/MacOS/cua-helper');

export class MacOSBackend extends ComputerUseBackend {
  readonly name = 'macos-native';
  readonly platform = 'macos' as const;

  async isAvailable(): Promise<boolean> {
    // Only available on macOS
    if (process.platform !== 'darwin') {
      return false;
    }

    // Check if CUAHelper exists
    try {
      await fs.promises.access(CUA_HELPER, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async runHelper(action: string, ...args: (string | number)[]): Promise<ActionResult> {
    const cmd = [CUA_HELPER, action, ...args.map(String)].map(s => `"${s}"`).join(' ');

    try {
      await execAsync(cmd, { timeout: 10000 });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  async screenshot(outputPath?: string): Promise<ScreenshotResult> {
    const output = outputPath || `/tmp/screenshot_${Date.now()}.png`;
    const result = await this.runHelper('screenshot', output);

    if (result.success) {
      return { success: true, path: output };
    }
    return { success: false, error: result.error };
  }

  async screenshotBase64(): Promise<ScreenshotResult> {
    const tempPath = `/tmp/screenshot_${Date.now()}.png`;
    const result = await this.screenshot(tempPath);

    if (result.success && result.path) {
      try {
        const data = await fs.promises.readFile(result.path);
        const base64 = data.toString('base64');
        await fs.promises.unlink(result.path).catch(() => {});
        return { success: true, base64 };
      } catch (err: any) {
        return { success: false, error: `Failed to read screenshot: ${err.message}` };
      }
    }
    return result;
  }

  async click(x: number, y: number, options: ClickOptions = {}): Promise<ActionResult> {
    const button = options.button || 'left';
    const result = await this.runHelper('click', x, y, button);

    // Handle double-click
    if (result.success && options.clicks === 2) {
      await new Promise(r => setTimeout(r, 50));
      return this.runHelper('click', x, y, button);
    }

    return result;
  }

  async moveMouse(x: number, y: number): Promise<ActionResult> {
    return this.runHelper('move', x, y);
  }

  async typeText(text: string): Promise<ActionResult> {
    return this.runHelper('type', text);
  }

  async pressKey(key: string): Promise<ActionResult> {
    return this.runHelper('key', key);
  }

  async scroll(x: number, y: number, options: ScrollOptions = {}): Promise<ActionResult> {
    const direction = options.direction || 'down';
    const amount = options.amount || 3;
    const delta = direction === 'down' ? -amount : amount;
    return this.runHelper('scroll', x, y, delta);
  }

  async drag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    _options: DragOptions = {}
  ): Promise<ActionResult> {
    return this.runHelper('drag', startX, startY, endX, endY);
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    // Use system_profiler on macOS
    try {
      const { stdout } = await execAsync(
        "system_profiler SPDisplaysDataType | grep Resolution | head -1 | awk '{print $2, $4}'"
      );
      const [width, height] = stdout.trim().split(' ').map(Number);
      if (width && height) {
        return { width, height };
      }
    } catch {}

    // Fallback to common resolution
    return { width: 2560, height: 1440 };
  }
}

// Export singleton instance
export const macosBackend = new MacOSBackend();
