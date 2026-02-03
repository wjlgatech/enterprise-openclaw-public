#!/bin/bash
set -e

echo "🦅 Building Enterprise OpenClaw Installer for macOS"
echo "=================================================="

# Configuration
APP_NAME="Enterprise OpenClaw"
APP_VERSION="1.0.0"
BUNDLE_ID="com.enterprise.openclaw"
BUILD_DIR="$(pwd)/build"
DIST_DIR="$(pwd)/dist"

# Clean previous builds
rm -rf "$BUILD_DIR" "$DIST_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

echo ""
echo "Step 1: Creating app bundle structure..."
APP_DIR="$BUILD_DIR/$APP_NAME.app"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"
mkdir -p "$APP_DIR/Contents/Frameworks"

echo "Step 2: Bundling OpenClaw core..."
# Copy OpenClaw
cp -r ../../../epiloop/dist "$APP_DIR/Contents/Resources/openclaw"
cp -r ../../../epiloop/node_modules "$APP_DIR/Contents/Resources/openclaw/"

echo "Step 3: Bundling Enterprise extensions..."
# Copy enterprise extensions
mkdir -p "$APP_DIR/Contents/Resources/extensions"
cp -r ../../extensions/claude-agent-bridge "$APP_DIR/Contents/Resources/extensions/"
cp -r ../../extensions/ollama-bridge "$APP_DIR/Contents/Resources/extensions/"

echo "Step 4: Creating launcher script..."
cat > "$APP_DIR/Contents/MacOS/enterprise-openclaw" << 'LAUNCHER'
#!/bin/bash

# Get the app directory
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RESOURCES="$APP_DIR/Contents/Resources"
INSTALL_DIR="$HOME/.enterprise-openclaw"

# First-run installation
if [ ! -f "$INSTALL_DIR/.installed" ]; then
    # Create installation directory
    mkdir -p "$INSTALL_DIR"

    # Show progress in a simple dialog
    osascript <<EOF
display dialog "🦅 Setting up Enterprise OpenClaw...

This will take 1-2 minutes:
✓ Installing local AI
✓ Downloading models
✓ Starting services

The chat window will open automatically when ready." buttons {"OK"} default button 1 with title "Enterprise OpenClaw Setup"
EOF

    # Install Ollama if needed
    if ! command -v ollama &> /dev/null; then
        echo "Installing Ollama..."
        curl -fsSL https://ollama.ai/install.sh | sh
    fi

    # Download phi4 model (small, fast)
    echo "Downloading AI model..."
    ollama pull phi4 > /dev/null 2>&1 &

    # Copy config
    cp -r "$RESOURCES/openclaw" "$INSTALL_DIR/"
    cp -r "$RESOURCES/extensions" "$INSTALL_DIR/"

    # Install extensions
    cd "$INSTALL_DIR/openclaw"
    npm install --production --silent

    # Configure with smart defaults
    cat > "$INSTALL_DIR/config.json" << CONFIG
{
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback"
  },
  "ai": {
    "defaultModel": "ollama:phi4",
    "local": true
  },
  "channels": {
    "chat": { "enabled": true },
    "telegram": { "enabled": false },
    "discord": { "enabled": false }
  },
  "enterprise": {
    "security": {
      "piiDetection": true,
      "auditLogging": true
    }
  }
}
CONFIG

    # Mark as installed
    touch "$INSTALL_DIR/.installed"
fi

# Start Ollama if not running
if ! pgrep -x "ollama" > /dev/null; then
    ollama serve > /dev/null 2>&1 &
fi

# Start gateway in background
cd "$INSTALL_DIR/openclaw"
node dist/cli/run-main.js gateway run --bind loopback --port 18789 > "$INSTALL_DIR/gateway.log" 2>&1 &

# Wait for gateway to be ready
sleep 3

# Open chat UI
open "http://localhost:18789/chat"
LAUNCHER

chmod +x "$APP_DIR/Contents/MacOS/enterprise-openclaw"

echo "Step 5: Creating Info.plist..."
cat > "$APP_DIR/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>enterprise-openclaw</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundleVersion</key>
    <string>$APP_VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$APP_VERSION</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
PLIST

echo "Step 6: Creating app icon..."
# Create a simple icon (you should replace with actual icon)
cat > "$APP_DIR/Contents/Resources/AppIcon.icns" << 'ICON'
# Placeholder - replace with actual .icns file
ICON

echo "Step 7: Creating DMG installer..."
# Create DMG
hdiutil create -volname "$APP_NAME" \
    -srcfolder "$BUILD_DIR" \
    -ov -format UDZO \
    "$DIST_DIR/$APP_NAME-$APP_VERSION.dmg"

echo ""
echo "✅ Installer created: $DIST_DIR/$APP_NAME-$APP_VERSION.dmg"
echo ""
echo "To install:"
echo "  1. Double-click the DMG"
echo "  2. Drag Enterprise OpenClaw to Applications"
echo "  3. Double-click to launch"
echo "  4. Chat window opens automatically!"
echo ""
