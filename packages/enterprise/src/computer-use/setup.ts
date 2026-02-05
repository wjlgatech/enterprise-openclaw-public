/**
 * CUAHelper Setup Script
 * 
 * Creates the CUAHelper.app bundle required for computer use functionality.
 * This app needs Accessibility permissions to control mouse/keyboard.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const APP_PATH = path.join(os.homedir(), 'Applications/CUAHelper.app');
const CONTENTS_PATH = path.join(APP_PATH, 'Contents');
const MACOS_PATH = path.join(CONTENTS_PATH, 'MacOS');
const RESOURCES_PATH = path.join(CONTENTS_PATH, 'Resources');

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>cua-helper</string>
    <key>CFBundleIdentifier</key>
    <string>com.enterpriseopenclaw.cuahelper</string>
    <key>CFBundleName</key>
    <string>CUAHelper</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSAppleEventsUsageDescription</key>
    <string>CUAHelper needs to control other applications for computer use automation.</string>
</dict>
</plist>`;

const CUA_HELPER_SCRIPT = `#!/bin/bash
# CUAHelper - macOS automation helper
# Requires Accessibility permission

ACTION="$1"
shift

case "$ACTION" in
    screenshot)
        OUTPUT="\${1:-/tmp/screenshot.png}"
        /usr/sbin/screencapture -x "$OUTPUT"
        echo "Screenshot saved to $OUTPUT"
        ;;

    click)
        X="$1"
        Y="$2"
        BUTTON="\${3:-left}"
        
        if [ "$BUTTON" = "right" ]; then
            osascript -e "tell application \\\\"System Events\\\\" to click at {$X, $Y} using {control down, button 1}"
        else
            osascript <<EOF
tell application "System Events"
    set mousePos to {$X, $Y}
    do shell script "cliclick c:" & (item 1 of mousePos) & "," & (item 2 of mousePos)
end tell
EOF
        fi
        ;;
    
    type)
        TEXT="$1"
        osascript -e "tell application \\"System Events\\" to keystroke \\"$TEXT\\""
        ;;
    
    key)
        KEY="$1"
        # Handle modifier keys
        case "$KEY" in
            cmd+*)
                KEY_PART="\${KEY#cmd+}"
                osascript -e "tell application \\"System Events\\" to keystroke \\"$KEY_PART\\" using command down"
                ;;
            shift+*)
                KEY_PART="\${KEY#shift+}"
                osascript -e "tell application \\"System Events\\" to keystroke \\"$KEY_PART\\" using shift down"
                ;;
            alt+*|option+*)
                KEY_PART="\${KEY#alt+}"
                KEY_PART="\${KEY_PART#option+}"
                osascript -e "tell application \\"System Events\\" to keystroke \\"$KEY_PART\\" using option down"
                ;;
            ctrl+*)
                KEY_PART="\${KEY#ctrl+}"
                osascript -e "tell application \\"System Events\\" to keystroke \\"$KEY_PART\\" using control down"
                ;;
            return|enter)
                osascript -e "tell application \\"System Events\\" to key code 36"
                ;;
            tab)
                osascript -e "tell application \\"System Events\\" to key code 48"
                ;;
            escape|esc)
                osascript -e "tell application \\"System Events\\" to key code 53"
                ;;
            space)
                osascript -e "tell application \\"System Events\\" to key code 49"
                ;;
            delete|backspace)
                osascript -e "tell application \\"System Events\\" to key code 51"
                ;;
            up)
                osascript -e "tell application \\"System Events\\" to key code 126"
                ;;
            down)
                osascript -e "tell application \\"System Events\\" to key code 125"
                ;;
            left)
                osascript -e "tell application \\"System Events\\" to key code 123"
                ;;
            right)
                osascript -e "tell application \\"System Events\\" to key code 124"
                ;;
            *)
                osascript -e "tell application \\"System Events\\" to keystroke \\"$KEY\\""
                ;;
        esac
        ;;
    
    scroll)
        X="$1"
        Y="$2"
        DELTA="$3"
        osascript <<EOF
tell application "System Events"
    set mouseLocation to {$X, $Y}
    -- Move mouse first
    do shell script "cliclick m:" & (item 1 of mouseLocation) & "," & (item 2 of mouseLocation)
    delay 0.1
    -- Scroll
    repeat $DELTA times
        do shell script "cliclick 'kd:ctrl' 'w:50' 'ku:ctrl'"
    end repeat
end tell
EOF
        ;;
    
    move)
        X="$1"
        Y="$2"
        osascript -e "do shell script \\"cliclick m:$X,$Y\\""
        ;;
    
    drag)
        START_X="$1"
        START_Y="$2"
        END_X="$3"
        END_Y="$4"
        osascript -e "do shell script \\"cliclick dd:$START_X,$START_Y du:$END_X,$END_Y\\""
        ;;
    
    *)
        echo "Usage: cua-helper <action> [args...]"
        echo "Actions: screenshot, click, type, key, scroll, move, drag"
        exit 1
        ;;
esac
`;

/**
 * Check if cliclick is installed
 */
async function checkCliclick(): Promise<boolean> {
  try {
    await execAsync('which cliclick');
    return true;
  } catch {
    return false;
  }
}

/**
 * Install cliclick via Homebrew
 */
async function installCliclick(): Promise<void> {
  console.log('Installing cliclick via Homebrew...');
  await execAsync('brew install cliclick');
}

/**
 * Create the CUAHelper.app bundle
 */
export async function setupCUAHelper(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for cliclick
    if (!await checkCliclick()) {
      console.log('cliclick not found, installing...');
      try {
        await installCliclick();
      } catch (err: any) {
        return {
          success: false,
          error: `Failed to install cliclick: ${err.message}. Install manually: brew install cliclick`
        };
      }
    }

    // Create app directories
    await fs.promises.mkdir(MACOS_PATH, { recursive: true });
    await fs.promises.mkdir(RESOURCES_PATH, { recursive: true });

    // Write Info.plist
    await fs.promises.writeFile(
      path.join(CONTENTS_PATH, 'Info.plist'),
      INFO_PLIST
    );

    // Write helper script
    const helperPath = path.join(MACOS_PATH, 'cua-helper');
    await fs.promises.writeFile(helperPath, CUA_HELPER_SCRIPT);
    await fs.promises.chmod(helperPath, 0o755);

    console.log(`✅ CUAHelper.app created at ${APP_PATH}`);
    console.log('');
    console.log('⚠️  IMPORTANT: You need to grant Accessibility permission:');
    console.log('   1. Open System Settings > Privacy & Security > Accessibility');
    console.log('   2. Click the + button');
    console.log('   3. Navigate to ~/Applications/CUAHelper.app and add it');
    console.log('   4. Make sure the checkbox is enabled');
    console.log('');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if CUAHelper is properly set up
 */
export async function checkSetup(): Promise<{
  appExists: boolean;
  cliclickInstalled: boolean;
  ready: boolean;
}> {
  const appExists = fs.existsSync(path.join(MACOS_PATH, 'cua-helper'));
  const cliclickInstalled = await checkCliclick();

  return {
    appExists,
    cliclickInstalled,
    ready: appExists && cliclickInstalled
  };
}

// CLI entry point
if (require.main === module) {
  setupCUAHelper().then(result => {
    if (!result.success) {
      console.error(`❌ Setup failed: ${result.error}`);
      process.exit(1);
    }
  });
}
