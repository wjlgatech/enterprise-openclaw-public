/**
 * Computer Use Backends
 * 
 * Auto-detects and uses the best available backend for the current platform.
 * 
 * Priority:
 * 1. macOS: Native CUAHelper (faster) → PyAutoGUI fallback
 * 2. Windows: PyAutoGUI
 * 3. Linux: PyAutoGUI
 */

import { ComputerUseBackend } from './base';
import { MacOSBackend } from './macos-backend';
import { PyAutoGUIBackend } from './pyautogui-backend';

export * from './base';
export { MacOSBackend } from './macos-backend';
export { PyAutoGUIBackend } from './pyautogui-backend';

/**
 * Get the best available backend for the current system
 */
export async function getBackend(): Promise<ComputerUseBackend> {
  const platform = process.platform;

  // On macOS, prefer native backend
  if (platform === 'darwin') {
    const macos = new MacOSBackend();
    if (await macos.isAvailable()) {
      console.log('[computer-use] Using native macOS backend (CUAHelper)');
      return macos;
    }
  }

  // Fallback to PyAutoGUI (cross-platform)
  const pyautogui = new PyAutoGUIBackend();
  if (await pyautogui.isAvailable()) {
    console.log('[computer-use] Using PyAutoGUI backend (cross-platform)');
    return pyautogui;
  }

  // No backend available
  throw new Error(
    'No computer use backend available. ' +
    'On macOS: run setup-cua-helper.sh. ' +
    'All platforms: pip install pyautogui'
  );
}

/**
 * Get a specific backend by name
 */
export function getBackendByName(name: 'macos' | 'pyautogui'): ComputerUseBackend {
  switch (name) {
    case 'macos':
      return new MacOSBackend();
    case 'pyautogui':
      return new PyAutoGUIBackend();
    default:
      throw new Error(`Unknown backend: ${name}`);
  }
}

// Cached backend instance
let cachedBackend: ComputerUseBackend | null = null;

/**
 * Get the default backend (cached)
 */
export async function getDefaultBackend(): Promise<ComputerUseBackend> {
  if (!cachedBackend) {
    cachedBackend = await getBackend();
  }
  return cachedBackend;
}

/**
 * Reset the cached backend (useful for testing)
 */
export function resetBackendCache(): void {
  cachedBackend = null;
}
