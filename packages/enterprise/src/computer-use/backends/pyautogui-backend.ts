/**
 * PyAutoGUI Backend - Cross-platform computer use
 * Works on: macOS, Windows, Linux
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import {
  ComputerUseBackend,
  ScreenshotResult,
  ActionResult,
  ClickOptions,
  ScrollOptions,
  DragOptions,
} from './base';

const execAsync = promisify(exec);

// Path to the Python backend script
const BACKEND_SCRIPT = path.join(__dirname, 'pyautogui_backend.py');

export class PyAutoGUIBackend extends ComputerUseBackend {
  readonly name = 'pyautogui';
  readonly platform = 'cross-platform' as const;

  private pythonCmd: string = 'python3';

  constructor() {
    super();
    // On Windows, might need 'python' instead of 'python3'
    if (process.platform === 'win32') {
      this.pythonCmd = 'python';
    }
  }

  /**
   * Run the Python backend with given action and args
   */
  private async runBackend(action: string, ...args: (string | number)[]): Promise<any> {
    const cmd = [
      this.pythonCmd,
      BACKEND_SCRIPT,
      action,
      ...args.map(String),
    ].join(' ');

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
      
      try {
        return JSON.parse(stdout.trim());
      } catch {
        return { success: false, error: `Invalid JSON response: ${stdout}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if pyautogui is importable
      const { stdout } = await execAsync(
        `${this.pythonCmd} -c "import pyautogui; print('ok')"`,
        { timeout: 5000 }
      );
      return stdout.trim() === 'ok';
    } catch {
      return false;
    }
  }

  async screenshot(outputPath?: string): Promise<ScreenshotResult> {
    const output = outputPath || `/tmp/screenshot_${Date.now()}.png`;
    const result = await this.runBackend('screenshot', output);
    
    if (result.success) {
      return { success: true, path: result.path || output };
    }
    return { success: false, error: result.error };
  }

  async screenshotBase64(): Promise<ScreenshotResult> {
    const result = await this.runBackend('screenshot_base64');
    
    if (result.success && result.base64) {
      return { success: true, base64: result.base64 };
    }
    return { success: false, error: result.error };
  }

  async click(x: number, y: number, options: ClickOptions = {}): Promise<ActionResult> {
    const button = options.button || 'left';
    const clicks = options.clicks || 1;
    return this.runBackend('click', x, y, button, clicks);
  }

  async moveMouse(x: number, y: number): Promise<ActionResult> {
    return this.runBackend('move', x, y);
  }

  async typeText(text: string): Promise<ActionResult> {
    return this.runBackend('type', text);
  }

  async pressKey(key: string): Promise<ActionResult> {
    return this.runBackend('key', key);
  }

  async scroll(x: number, y: number, options: ScrollOptions = {}): Promise<ActionResult> {
    const direction = options.direction || 'down';
    const amount = options.amount || 3;
    return this.runBackend('scroll', x, y, amount, direction);
  }

  async drag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options: DragOptions = {}
  ): Promise<ActionResult> {
    return this.runBackend('drag', startX, startY, endX, endY);
  }

  async getScreenSize(): Promise<{ width: number; height: number }> {
    const result = await this.runBackend('screen_size');
    
    if (result.success) {
      return { width: result.width, height: result.height };
    }
    
    // Default fallback
    return { width: 1920, height: 1080 };
  }
}

// Export singleton instance
export const pyautoguiBackend = new PyAutoGUIBackend();
