#!/usr/bin/env python3
"""
cua_claude.py - Computer Use Agent powered by Claude Vision

Uses Claude to analyze screenshots and decide actions,
then executes them locally with cliclick/screencapture.
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

# Load API key from environment or .env
def load_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    
    # Try loading from .env files
    for env_path in [
        Path("/Volumes/My Shared Files/Projects/.env"),
        Path.home() / ".openclaw" / ".env",
        Path.cwd() / ".env",
    ]:
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.startswith("ANTHROPIC_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"\'')
    return None


ANTHROPIC_API_KEY = load_api_key()

# Screen dimensions (will be detected)
SCREEN_WIDTH = 2560
SCREEN_HEIGHT = 1080


CUA_HELPER = os.path.expanduser("~/Applications/CUAHelper.app/Contents/MacOS/cua-helper")

def take_screenshot(output_path: str = "/tmp/cua_screen.png") -> str:
    """Take screenshot and return base64."""
    # Use CUAHelper for screenshot
    subprocess.run([CUA_HELPER, "screenshot", output_path], check=True)
    with open(output_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def click(x: int, y: int, button: str = "left", double: bool = False):
    """Click at coordinates."""
    subprocess.run([CUA_HELPER, "click", str(x), str(y), button], check=True)
    if double:
        time.sleep(0.1)
        subprocess.run([CUA_HELPER, "click", str(x), str(y), button], check=True)


def type_text(text: str):
    """Type text."""
    subprocess.run([CUA_HELPER, "type", text], check=True)


def press_key(key: str):
    """Press a key or key combination."""
    subprocess.run([CUA_HELPER, "key", key], check=True)


def scroll(x: int, y: int, direction: str = "down", amount: int = 3):
    """Scroll at position."""
    delta = -amount if direction == "down" else amount
    subprocess.run([CUA_HELPER, "scroll", str(x), str(y), str(delta)], check=True)


def call_claude(messages: list, system: str = None) -> dict:
    """Call Claude API with vision."""
    import urllib.request
    import urllib.error
    
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not found")
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
    }
    
    data = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "messages": messages
    }
    
    if system:
        data["system"] = system
    
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"Claude API error {e.code}: {error_body}")


def parse_action(response_text: str) -> dict:
    """Parse Claude's response to extract action."""
    # Look for JSON action block
    import re
    
    # Try to find JSON in the response
    json_match = re.search(r'\{[^{}]*"action"[^{}]*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    # Try to find action patterns in text
    text_lower = response_text.lower()
    
    if "task complete" in text_lower or "done" in text_lower and "click" not in text_lower:
        return {"action": "done", "reason": response_text}
    
    # Look for click coordinates
    click_match = re.search(r'click.*?(\d+)[,\s]+(\d+)', text_lower)
    if click_match:
        return {
            "action": "click",
            "x": int(click_match.group(1)),
            "y": int(click_match.group(2))
        }
    
    # Look for type text
    type_match = re.search(r'type[:\s]+"([^"]+)"', response_text)
    if type_match:
        return {"action": "type", "text": type_match.group(1)}
    
    # Look for key press
    key_match = re.search(r'press[:\s]+([a-z+]+)', text_lower)
    if key_match:
        return {"action": "key", "key": key_match.group(1)}
    
    return {"action": "unknown", "raw": response_text}


def execute_action(action: dict) -> bool:
    """Execute a parsed action. Returns True if should continue."""
    action_type = action.get("action", "unknown")
    
    if action_type == "done":
        print(f"✅ Task complete: {action.get('reason', 'Done')}")
        return False
    
    elif action_type == "click":
        x, y = action["x"], action["y"]
        button = action.get("button", "left")
        double = action.get("double", False)
        print(f"🖱️  Clicking at ({x}, {y})")
        click(x, y, button, double)
        
    elif action_type == "type":
        text = action["text"]
        print(f"⌨️  Typing: {text[:50]}{'...' if len(text) > 50 else ''}")
        type_text(text)
        
    elif action_type == "key":
        key = action["key"]
        print(f"⌨️  Pressing: {key}")
        press_key(key)
        
    elif action_type == "scroll":
        x = action.get("x", SCREEN_WIDTH // 2)
        y = action.get("y", SCREEN_HEIGHT // 2)
        direction = action.get("direction", "down")
        amount = action.get("amount", 3)
        print(f"📜 Scrolling {direction} at ({x}, {y})")
        scroll(x, y, direction, amount)
        
    elif action_type == "wait":
        ms = action.get("ms", 1000)
        print(f"⏳ Waiting {ms}ms")
        time.sleep(ms / 1000)
        
    else:
        print(f"❓ Unknown action: {action}")
        return True
    
    return True


SYSTEM_PROMPT = """You are a computer use agent controlling a macOS computer. You can see screenshots and must decide what action to take to accomplish the user's task.

IMPORTANT: Always respond with a JSON action block. Available actions:

1. Click: {"action": "click", "x": 500, "y": 300, "button": "left"}
2. Type text: {"action": "type", "text": "hello world"}  
3. Press key: {"action": "key", "key": "return"} or {"action": "key", "key": "cmd+s"}
4. Scroll: {"action": "scroll", "x": 500, "y": 400, "direction": "down", "amount": 3}
5. Wait: {"action": "wait", "ms": 1000}
6. Done: {"action": "done", "reason": "Task completed successfully"}

Screen coordinates: The screenshot shows the full screen. Identify the pixel coordinates of UI elements you need to interact with.

Guidelines:
- Look carefully at the screenshot to identify clickable elements
- Click on buttons, text fields, links by their visual position
- After clicking a text field, use "type" to enter text
- Use "key" for keyboard shortcuts (cmd+s, return, tab, etc.)
- Report "done" when the task is complete or impossible

Respond with ONLY the JSON action, no explanation needed unless reporting done."""


def run_cua_loop(task: str, max_steps: int = 15, debug: bool = False):
    """Run the computer use agent loop."""
    print(f"\n🖥️  Claude Computer Use Agent")
    print(f"📋 Task: {task}")
    print(f"📐 Screen: {SCREEN_WIDTH}x{SCREEN_HEIGHT}")
    print("-" * 50)
    
    messages = []
    
    for step in range(max_steps):
        print(f"\n🔄 Step {step + 1}/{max_steps}")
        
        # Take screenshot
        print("📸 Taking screenshot...")
        screenshot_b64 = take_screenshot()
        
        # Build message with screenshot
        content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": screenshot_b64
                }
            },
            {
                "type": "text",
                "text": f"Task: {task}\n\nWhat action should I take? Respond with JSON action."
            }
        ]
        
        if step == 0:
            messages.append({"role": "user", "content": content})
        else:
            # Add screenshot as new message
            messages.append({
                "role": "user", 
                "content": content
            })
        
        # Call Claude
        print("🤔 Analyzing with Claude...")
        try:
            response = call_claude(messages, system=SYSTEM_PROMPT)
            
            if debug:
                print(f"DEBUG: {json.dumps(response, indent=2)}")
            
            # Extract response text
            response_text = ""
            for block in response.get("content", []):
                if block.get("type") == "text":
                    response_text += block.get("text", "")
            
            print(f"💭 Claude: {response_text[:200]}{'...' if len(response_text) > 200 else ''}")
            
            # Add assistant response to messages
            messages.append({"role": "assistant", "content": response_text})
            
            # Parse and execute action
            action = parse_action(response_text)
            
            if not execute_action(action):
                break
            
            # Brief pause after action
            time.sleep(0.5)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            if debug:
                import traceback
                traceback.print_exc()
            break
    
    print("\n" + "=" * 50)
    print("CUA loop finished")


def main():
    parser = argparse.ArgumentParser(description="Claude-powered Computer Use Agent")
    parser.add_argument("task", nargs="?", help="Task to accomplish")
    parser.add_argument("--max-steps", "-n", type=int, default=15, help="Maximum steps")
    parser.add_argument("--debug", "-d", action="store_true", help="Debug mode")
    
    args = parser.parse_args()
    
    if not args.task:
        args.task = input("Enter task: ")
    
    if not ANTHROPIC_API_KEY:
        print("Error: ANTHROPIC_API_KEY not found")
        print("Set it in environment or in /Volumes/My Shared Files/Projects/.env")
        sys.exit(1)
    
    run_cua_loop(args.task, args.max_steps, args.debug)


if __name__ == "__main__":
    main()
