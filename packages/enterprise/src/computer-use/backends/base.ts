/**
 * Base interface for Computer Use backends
 * All platform-specific implementations must implement this interface
 */

export interface ScreenshotResult {
  success: boolean;
  path?: string;
  base64?: string;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clicks?: number; // 1 = single, 2 = double
}

export interface ScrollOptions {
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface DragOptions {
  button?: 'left' | 'right' | 'middle';
  duration?: number; // seconds
}

/**
 * Abstract base class for computer use backends
 */
export abstract class ComputerUseBackend {
  abstract readonly name: string;
  abstract readonly platform: 'macos' | 'windows' | 'linux' | 'cross-platform';

  /**
   * Check if this backend is available on the current system
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Take a screenshot
   */
  abstract screenshot(outputPath?: string): Promise<ScreenshotResult>;

  /**
   * Get screenshot as base64
   */
  abstract screenshotBase64(): Promise<ScreenshotResult>;

  /**
   * Click at coordinates
   */
  abstract click(x: number, y: number, options?: ClickOptions): Promise<ActionResult>;

  /**
   * Move mouse to coordinates
   */
  abstract moveMouse(x: number, y: number): Promise<ActionResult>;

  /**
   * Type text
   */
  abstract typeText(text: string): Promise<ActionResult>;

  /**
   * Press a key or key combination
   */
  abstract pressKey(key: string): Promise<ActionResult>;

  /**
   * Scroll at position
   */
  abstract scroll(x: number, y: number, options?: ScrollOptions): Promise<ActionResult>;

  /**
   * Drag from one point to another
   */
  abstract drag(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    options?: DragOptions
  ): Promise<ActionResult>;

  /**
   * Get screen size
   */
  abstract getScreenSize(): Promise<{ width: number; height: number }>;
}
