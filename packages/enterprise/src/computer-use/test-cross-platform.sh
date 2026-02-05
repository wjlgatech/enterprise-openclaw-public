#!/bin/bash
# Test cross-platform computer use backends

BACKEND_DIR="$(dirname "$0")/backends"
PYAUTOGUI="$BACKEND_DIR/pyautogui_backend.py"
CUA_HELPER="$HOME/Applications/CUAHelper.app/Contents/MacOS/cua-helper"

echo "=========================================="
echo "Computer Use Cross-Platform Test"
echo "=========================================="
echo ""

# Detect OS
OS=$(uname -s)
echo "🖥️  OS: $OS"
echo ""

# Test PyAutoGUI backend
echo "--- PyAutoGUI Backend (Cross-Platform) ---"
if python3 -c "import pyautogui" 2>/dev/null; then
    echo "✅ pyautogui installed"
    
    echo -n "📐 Screen size: "
    python3 $PYAUTOGUI screen_size
    
    echo -n "📸 Screenshot: "
    python3 $PYAUTOGUI screenshot /tmp/cua_test_pyautogui.png
    
    echo -n "🖱️  Move mouse: "
    python3 $PYAUTOGUI move 100 100
    
    echo -n "⌨️  Press key: "
    python3 $PYAUTOGUI key escape
else
    echo "❌ pyautogui not installed"
    echo "   Install: pip install pyautogui"
fi

echo ""

# Test macOS native backend (only on macOS)
if [ "$OS" = "Darwin" ]; then
    echo "--- macOS Native Backend (CUAHelper) ---"
    if [ -x "$CUA_HELPER" ]; then
        echo "✅ CUAHelper.app installed"
        
        echo -n "📸 Screenshot: "
        $CUA_HELPER screenshot /tmp/cua_test_native.png && echo '{"success": true}'
        
        echo -n "🖱️  Move mouse: "
        $CUA_HELPER move 200 200 && echo '{"success": true}'
        
        echo -n "⌨️  Press key: "
        $CUA_HELPER key esc && echo '{"success": true}'
    else
        echo "❌ CUAHelper.app not found"
        echo "   Run: ./scripts/setup-cua-helper.sh"
    fi
fi

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="
