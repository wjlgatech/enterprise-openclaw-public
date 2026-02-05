#!/usr/bin/env python3
"""
cua.py - Computer Use Agent CLI

Uses CUAHelper.app for mouse/keyboard actions (requires Accessibility permission).
"""

import argparse
import json
import os
import subprocess
import sys

# Path to CUAHelper app
CUA_HELPER = os.path.expanduser("~/Applications/CUAHelper.app/Contents/MacOS/cua-helper")


def run_helper(action: str, *args) -> tuple:
    """Run CUAHelper with action and args."""
    cmd = [CUA_HELPER, action] + [str(a) for a in args]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except FileNotFoundError:
        return False, "", f"CUAHelper not found at {CUA_HELPER}"
    except Exception as e:
        return False, "", str(e)


def screenshot(args):
    """Take a screenshot."""
    output = args.output or "/tmp/screenshot.png"
    success, out, err = run_helper("screenshot", output)
    if success:
        print(f"Screenshot saved to: {output}")
        return {"success": True, "path": output}
    else:
        print(f"Error: {err}")
        return {"success": False, "error": err}


def click(args):
    """Click at coordinates."""
    x, y = args.x, args.y
    button = args.button or "left"
    
    success, out, err = run_helper("click", x, y, button)
    if success:
        print(f"Clicked at ({x}, {y})")
        return {"success": True, "x": x, "y": y}
    else:
        print(f"Click failed: {err}")
        return {"success": False, "error": err}


def type_text(args):
    """Type text."""
    text = args.text
    success, out, err = run_helper("type", text)
    if success:
        print(f"Typed: {text[:50]}{'...' if len(text) > 50 else ''}")
        return {"success": True}
    else:
        print(f"Type failed: {err}")
        return {"success": False, "error": err}


def key(args):
    """Press keyboard shortcut."""
    shortcut = args.shortcut
    success, out, err = run_helper("key", shortcut)
    if success:
        print(f"Pressed: {shortcut}")
        return {"success": True}
    else:
        print(f"Key failed: {err}")
        return {"success": False, "error": err}


def scroll(args):
    """Scroll at position."""
    x, y = args.x, args.y
    delta = args.delta
    success, out, err = run_helper("scroll", x, y, delta)
    if success:
        print(f"Scrolled at ({x}, {y}) by {delta}")
        return {"success": True}
    else:
        print(f"Scroll failed: {err}")
        return {"success": False, "error": err}


def move(args):
    """Move mouse."""
    x, y = args.x, args.y
    success, out, err = run_helper("move", x, y)
    if success:
        print(f"Moved to ({x}, {y})")
        return {"success": True}
    else:
        print(f"Move failed: {err}")
        return {"success": False, "error": err}


def main():
    parser = argparse.ArgumentParser(description="Computer Use Agent CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # screenshot
    ss = subparsers.add_parser("screenshot", help="Take screenshot")
    ss.add_argument("--output", "-o", help="Output path")
    ss.set_defaults(func=screenshot)
    
    # click
    cl = subparsers.add_parser("click", help="Click at coordinates")
    cl.add_argument("x", type=int)
    cl.add_argument("y", type=int)
    cl.add_argument("--button", "-b", default="left")
    cl.set_defaults(func=click)
    
    # type
    ty = subparsers.add_parser("type", help="Type text")
    ty.add_argument("text")
    ty.set_defaults(func=type_text)
    
    # key
    ke = subparsers.add_parser("key", help="Press key")
    ke.add_argument("shortcut")
    ke.set_defaults(func=key)
    
    # scroll
    sc = subparsers.add_parser("scroll", help="Scroll")
    sc.add_argument("x", type=int)
    sc.add_argument("y", type=int)
    sc.add_argument("delta", type=int)
    sc.set_defaults(func=scroll)
    
    # move
    mv = subparsers.add_parser("move", help="Move mouse")
    mv.add_argument("x", type=int)
    mv.add_argument("y", type=int)
    mv.set_defaults(func=move)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if not os.path.exists(CUA_HELPER):
        print(f"Error: CUAHelper.app not found at ~/Applications/CUAHelper.app")
        print("The helper app should have been created. Check if it exists.")
        sys.exit(1)
    
    result = args.func(args)
    
    if os.environ.get("CUA_JSON_OUTPUT"):
        print(json.dumps(result))


if __name__ == "__main__":
    main()
