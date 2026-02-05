/**
 * Unified Computer Use API
 * 
 * Cross-platform computer control that auto-detects the best backend.
 * Works on macOS, Windows, and Linux.
 */

import { getDefaultBackend, ComputerUseBackend, ClickOptions, ScrollOptions, DragOptions } from './backends';

// Lazy-loaded backend
let backend: ComputerUseBackend | null = null;

async function getBackend(): Promise<ComputerUseBackend> {
  if (!backend) {
    backend = await getDefaultBackend();
  }
  return backend;
}

/**
 * Check if computer use is available on this system
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const b = await getBackend();
    return b.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Get information about the current backend
 */
export async function getInfo(): Promise<{
  available: boolean;
  backend: string;
  platform: string;
  screenSize: { width: number; height: number };
}> {
  try {
    const b = await getBackend();
    const screenSize = await b.getScreenSize();
    return {
      available: true,
      backend: b.name,
      platform: b.platform,
      screenSize,
    };
  } catch (err: any) {
    return {
      available: false,
      backend: 'none',
      platform: process.platform,
      screenSize: { width: 0, height: 0 },
    };
  }
}

/**
 * Take a screenshot and save to file
 */
export async function screenshot(outputPath?: string): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  const b = await getBackend();
  return b.screenshot(outputPath);
}

/**
 * Take a screenshot and return as base64
 */
export async function screenshotBase64(): Promise<{
  success: boolean;
  base64?: string;
  error?: string;
}> {
  const b = await getBackend();
  return b.screenshotBase64();
}

/**
 * Click at coordinates
 */
export async function click(
  x: number,
  y: number,
  options?: ClickOptions
): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.click(x, y, options);
}

/**
 * Double-click at coordinates
 */
export async function doubleClick(
  x: number,
  y: number
): Promise<{ success: boolean; error?: string }> {
  return click(x, y, { clicks: 2 });
}

/**
 * Right-click at coordinates
 */
export async function rightClick(
  x: number,
  y: number
): Promise<{ success: boolean; error?: string }> {
  return click(x, y, { button: 'right' });
}

/**
 * Move mouse to coordinates
 */
export async function moveMouse(
  x: number,
  y: number
): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.moveMouse(x, y);
}

/**
 * Type text
 */
export async function typeText(text: string): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.typeText(text);
}

/**
 * Press a key or key combination
 * 
 * Examples:
 * - 'enter', 'tab', 'escape', 'space'
 * - 'cmd+s', 'ctrl+c', 'alt+tab'
 * - 'cmd+shift+p'
 */
export async function pressKey(key: string): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.pressKey(key);
}

/**
 * Scroll at position
 */
export async function scroll(
  x: number,
  y: number,
  options?: ScrollOptions
): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.scroll(x, y, options);
}

/**
 * Drag from one point to another
 */
export async function drag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options?: DragOptions
): Promise<{ success: boolean; error?: string }> {
  const b = await getBackend();
  return b.drag(startX, startY, endX, endY, options);
}

/**
 * Get screen dimensions
 */
export async function getScreenSize(): Promise<{ width: number; height: number }> {
  const b = await getBackend();
  return b.getScreenSize();
}

/**
 * Force use of a specific backend
 */
export function setBackend(newBackend: ComputerUseBackend): void {
  backend = newBackend;
}

/**
 * Reset to auto-detected backend
 */
export function resetBackend(): void {
  backend = null;
}
