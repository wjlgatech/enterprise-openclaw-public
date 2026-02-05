#!/usr/bin/env python3
"""
PyAutoGUI Backend for Computer Use
Cross-platform: macOS, Windows, Linux

Usage:
    python pyautogui_backend.py <action> [args...]

Actions:
    screenshot <output_path>
    click <x> <y> [button] [clicks]
    move <x> <y>
    type <text>
    key <key_combo>
    scroll <x> <y> <amount> [direction]
    drag <start_x> <start_y> <end_x> <end_y>
    screen_size
"""

import sys
import json
import base64
import os

def ensure_pyautogui():
    """Import pyautogui, install if needed"""
    try:
        # Ensure screencapture is in PATH on macOS
        if sys.platform == 'darwin':
            os.environ['PATH'] = '/usr/sbin:/usr/bin:' + os.environ.get('PATH', '')
        
        import pyautogui
        return pyautogui
    except ImportError:
        print(json.dumps({"success": False, "error": "pyautogui not installed. Run: pip install pyautogui"}))
        sys.exit(1)

def screenshot(output_path: str = None):
    """Take screenshot and save to file"""
    pyautogui = ensure_pyautogui()
    
    if output_path is None:
        output_path = f"/tmp/screenshot_{os.getpid()}.png"
    
    try:
        img = pyautogui.screenshot()
        if img is not None:
            img.save(output_path)
            return {"success": True, "path": output_path}
        else:
            return {"success": False, "error": "Screenshot returned None"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def screenshot_base64():
    """Take screenshot and return as base64"""
    pyautogui = ensure_pyautogui()
    import io
    
    try:
        img = pyautogui.screenshot()
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return {"success": True, "base64": b64}
    except Exception as e:
        return {"success": False, "error": str(e)}

def click(x: int, y: int, button: str = 'left', clicks: int = 1):
    """Click at coordinates"""
    pyautogui = ensure_pyautogui()
    
    try:
        pyautogui.click(x, y, button=button, clicks=clicks)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def move(x: int, y: int):
    """Move mouse to coordinates"""
    pyautogui = ensure_pyautogui()
    
    try:
        pyautogui.moveTo(x, y)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def type_text(text: str):
    """Type text"""
    pyautogui = ensure_pyautogui()
    
    try:
        # Use write for regular text, typewrite is alias
        pyautogui.write(text, interval=0.02)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def press_key(key: str):
    """Press a key or key combination
    
    Supports:
    - Single keys: 'enter', 'tab', 'escape', 'space', etc.
    - Modifiers: 'cmd+s', 'ctrl+c', 'alt+tab', 'shift+a'
    - Multiple modifiers: 'cmd+shift+s'
    """
    pyautogui = ensure_pyautogui()
    
    # Normalize key names
    key_map = {
        'return': 'enter',
        'esc': 'escape',
        'cmd': 'command',
        'ctrl': 'ctrl',
        'alt': 'alt',
        'option': 'alt',
        'delete': 'backspace',
        'up': 'up',
        'down': 'down', 
        'left': 'left',
        'right': 'right',
    }
    
    try:
        if '+' in key:
            # Handle key combinations
            parts = key.lower().split('+')
            modifiers = []
            main_key = parts[-1]
            
            for mod in parts[:-1]:
                mod = key_map.get(mod, mod)
                if mod in ['command', 'ctrl', 'alt', 'shift']:
                    modifiers.append(mod)
            
            main_key = key_map.get(main_key, main_key)
            
            # Use hotkey for combinations
            pyautogui.hotkey(*modifiers, main_key)
        else:
            # Single key
            key_normalized = key_map.get(key.lower(), key.lower())
            pyautogui.press(key_normalized)
        
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def scroll(x: int, y: int, amount: int, direction: str = 'down'):
    """Scroll at position"""
    pyautogui = ensure_pyautogui()
    
    try:
        # Move to position first
        pyautogui.moveTo(x, y)
        
        # Scroll (positive = up, negative = down)
        if direction in ['down', 'right']:
            amount = -abs(amount)
        else:
            amount = abs(amount)
        
        if direction in ['left', 'right']:
            pyautogui.hscroll(amount)
        else:
            pyautogui.scroll(amount)
        
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def drag(start_x: int, start_y: int, end_x: int, end_y: int, button: str = 'left'):
    """Drag from start to end position"""
    pyautogui = ensure_pyautogui()
    
    try:
        pyautogui.moveTo(start_x, start_y)
        pyautogui.drag(end_x - start_x, end_y - start_y, button=button, duration=0.5)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def screen_size():
    """Get screen dimensions"""
    pyautogui = ensure_pyautogui()
    
    try:
        size = pyautogui.size()
        return {"success": True, "width": size.width, "height": size.height}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No action specified"}))
        sys.exit(1)
    
    action = sys.argv[1]
    args = sys.argv[2:]
    
    result = None
    
    if action == 'screenshot':
        path = args[0] if args else None
        result = screenshot(path)
    
    elif action == 'screenshot_base64':
        result = screenshot_base64()
    
    elif action == 'click':
        if len(args) < 2:
            result = {"success": False, "error": "click requires x y [button] [clicks]"}
        else:
            x, y = int(args[0]), int(args[1])
            button = args[2] if len(args) > 2 else 'left'
            clicks = int(args[3]) if len(args) > 3 else 1
            result = click(x, y, button, clicks)
    
    elif action == 'move':
        if len(args) < 2:
            result = {"success": False, "error": "move requires x y"}
        else:
            result = move(int(args[0]), int(args[1]))
    
    elif action == 'type':
        if not args:
            result = {"success": False, "error": "type requires text"}
        else:
            result = type_text(' '.join(args))
    
    elif action == 'key':
        if not args:
            result = {"success": False, "error": "key requires key_combo"}
        else:
            result = press_key(args[0])
    
    elif action == 'scroll':
        if len(args) < 3:
            result = {"success": False, "error": "scroll requires x y amount [direction]"}
        else:
            x, y, amount = int(args[0]), int(args[1]), int(args[2])
            direction = args[3] if len(args) > 3 else 'down'
            result = scroll(x, y, amount, direction)
    
    elif action == 'drag':
        if len(args) < 4:
            result = {"success": False, "error": "drag requires start_x start_y end_x end_y"}
        else:
            result = drag(int(args[0]), int(args[1]), int(args[2]), int(args[3]))
    
    elif action == 'screen_size':
        result = screen_size()
    
    else:
        result = {"success": False, "error": f"Unknown action: {action}"}
    
    print(json.dumps(result))

if __name__ == '__main__':
    main()
