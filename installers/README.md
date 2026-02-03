# Enterprise OpenClaw - One-Click Installers

## 🎯 Philosophy

**"Download → Double-click → Start chatting"**

No terminal commands. No configuration files. No scary setup wizards.
Just a friendly chat interface that guides you through everything.

## 📦 Available Installers

### macOS
- **File**: `Enterprise OpenClaw.dmg`
- **Size**: ~50MB (installer) + 1.6GB (first-run model download)
- **Requirements**: macOS 11.0+
- **Installation**:
  1. Download DMG
  2. Double-click to mount
  3. Drag to Applications
  4. Double-click to launch
  5. Chat window opens automatically!

### Windows
- **File**: `EnterpriseOpenClawSetup.exe`
- **Size**: ~50MB (installer) + 1.6GB (first-run model download)
- **Requirements**: Windows 10+
- **Installation**:
  1. Download EXE
  2. Double-click to install
  3. Follow simple wizard (just "Next, Next, Finish")
  4. App launches automatically with chat window

### Linux
- **File**: `enterprise-openclaw-amd64.AppImage`
- **Size**: ~80MB (self-contained) + 1.6GB (first-run model download)
- **Requirements**: Any modern Linux distribution
- **Installation**:
  1. Download AppImage
  2. `chmod +x enterprise-openclaw-amd64.AppImage`
  3. Double-click to run
  4. Chat window opens!

## ✨ First-Run Experience

### What Happens Automatically:

1. **Install Ollama** (if not present)
   - macOS/Linux: Uses official installer
   - Windows: Bundled installer

2. **Download AI Model** (phi4 - 1.6GB)
   - Fast, efficient model
   - Runs 100% locally
   - Progress shown in chat window

3. **Start Services**
   - Gateway starts in background
   - All extensions loaded
   - Health checks pass

4. **Open Chat Window**
   - Clean, modern interface
   - Welcome message from AI
   - Ready to use immediately

### Welcome Screen

```
┌─────────────────────────────────────────────┐
│  🦅 Welcome to Enterprise OpenClaw!         │
│                                             │
│  Hi! I'm your AI assistant. I've set up    │
│  everything with smart defaults.           │
│                                             │
│  ✅ Local AI running (100% private)        │
│  ✅ Gateway active                         │
│  ✅ Enterprise features enabled            │
│                                             │
│  [Start Chatting] [Quick Tour] [Customize] │
└─────────────────────────────────────────────┘
```

## 🎨 Chat Interface Features

### Built-in Conversations:

- **Setup Claude API**: "I want to use Claude"
- **Install Models**: "install codellama"
- **Connect Telegram**: "setup Telegram"
- **Check Status**: "show me the status"
- **Get Help**: "help"

### Progressive Configuration:

Everything is configured through conversation:

```
User: I want to use Claude

AI: Great! I can add Claude API support.
    Do you have an Anthropic API key?

User: Yes

AI: Perfect! Please paste your API key:

User: sk-ant-...

AI: ✅ Claude configured!
    You can now use Claude models.
```

## 🔧 Building Installers

### macOS DMG

```bash
cd installers/mac
./build-installer.sh
```

Creates: `dist/Enterprise OpenClaw-1.0.0.dmg`

### Windows EXE

```bash
cd installers/windows
./build-installer.sh  # Requires Windows or Wine
```

Creates: `dist/EnterpriseOpenClawSetup.exe`

### Linux AppImage

```bash
cd installers/linux
./build-appimage.sh
```

Creates: `dist/enterprise-openclaw-amd64.AppImage`

## 📊 Technical Details

### What's Included:

- OpenClaw core (150K LOC)
- Enterprise extensions
  - Claude Agent Bridge
  - Ollama Bridge
  - Security plugins
- Ollama runtime
- phi4 model (downloaded on first run)
- Chat UI server
- Auto-update mechanism

### Smart Defaults:

| Setting | Default Value | Why |
|---------|---------------|-----|
| AI Model | phi4 (local) | Fast, small, no API needed |
| Privacy | 100% local | Enterprise security |
| Port | 18789 | Unlikely to conflict |
| Channels | Chat UI only | Simple start |
| Auto-update | Enabled | Always latest features |

### Storage Locations:

- **macOS**: `~/.enterprise-openclaw/`
- **Windows**: `%APPDATA%\Enterprise OpenClaw\`
- **Linux**: `~/.enterprise-openclaw/`

## 🚀 Distribution

### Download Links (when ready):

- **macOS**: `https://download.enterprise-openclaw.com/mac/latest.dmg`
- **Windows**: `https://download.enterprise-openclaw.com/windows/latest.exe`
- **Linux**: `https://download.enterprise-openclaw.com/linux/latest.AppImage`

### Homebrew (macOS):

```bash
brew install enterprise-openclaw/tap/openclaw
```

### Chocolatey (Windows):

```powershell
choco install enterprise-openclaw
```

### Snap (Linux):

```bash
snap install enterprise-openclaw
```

## 🎯 Success Metrics

- **Time to install**: < 2 minutes
- **Time to first chat**: < 30 seconds
- **Configuration complexity**: Zero (defaults work)
- **Support needed**: Minimal (AI guides users)

## 📚 User Documentation

### Getting Started Guide:

1. Download installer for your platform
2. Double-click to install
3. Chat window opens
4. Start using immediately

### Advanced Users:

Can still access:
- Configuration files
- Command-line tools
- Advanced settings
- API access

But 99% of users never need to!

---

**Built for humans. Powered by AI. Enterprise-ready.** 🦅
