# 🖥️ Enterprise OpenClaw Desktop App

**Zero-Config, Click-to-Install, Chat-Based Interface**

Perfect for non-technical users who want to use DRIFT RAG without touching a terminal!

---

## ✨ Features

- 💬 **Natural Language Interface** - Control everything through chat
- 🚀 **One-Click Installation** - Download and run, no setup needed
- 🎨 **Beautiful UI** - Modern, gradient-based design
- 🧠 **DRIFT RAG Built-in** - Full knowledge graph reasoning
- ⚡ **Zero Configuration** - Works out of the box
- 🌍 **Cross-Platform** - Mac, Windows, Linux

---

## 📥 For Users: How to Install

### Step 1: Download

Visit the download page and click your platform:
- 🍎 **macOS**: Download the `.dmg` file
- 🪟 **Windows**: Download the `.exe` installer  
- 🐧 **Linux**: Download the `.AppImage` or `.deb`

### Step 2: Install

**macOS:**
1. Open the `.dmg` file
2. Drag Enterprise OpenClaw to Applications
3. Done!

**Windows:**
1. Double-click the `.exe` file
2. Follow the installer (one click!)
3. Done!

**Linux:**
```bash
chmod +x Enterprise-OpenClaw.AppImage
./Enterprise-OpenClaw.AppImage
```

### Step 3: Use It!

1. Launch the app
2. A chat window appears
3. Start typing what you want to do!

**Example conversations:**
```
You: "Create a knowledge base about machine learning"
App: [Guides you through the process]

You: "Process this PDF file"
App: [Extracts knowledge automatically]

You: "Configure settings"
App: [Chat-based configuration]
```

---

## 🛠️ For Developers: Building Installers

### Prerequisites

```bash
cd desktop-app
npm install
```

### Build for All Platforms

```bash
# Build for current platform
npm run build

# Build for macOS
npm run build:mac

# Build for Windows  
npm run build:win

# Build for Linux
npm run build:linux
```

### Output

Installers will be in `desktop-app/dist/`:

- **macOS**: `Enterprise-OpenClaw-1.0.0.dmg`
- **Windows**: `Enterprise-OpenClaw-Setup-1.0.0.exe`
- **Linux**: `Enterprise-OpenClaw-1.0.0.AppImage` and `.deb`

---

## 🎯 Architecture

```
Desktop App
├── Electron Shell
│   ├── Main Process (main.js)
│   │   └── Window management
│   │   └── IPC handlers
│   │   └── Config storage
│   └── Renderer Process (index.html)
│       └── Chat UI
│       └── Message handling
│       └── DRIFT RAG interface
└── Backend Integration
    └── DRIFT RAG Core
    └── Knowledge Graph
    └── Document Processor
```

---

## 🔌 Integrating DRIFT RAG

The desktop app has placeholders for DRIFT RAG integration. To connect:

1. **In `src/renderer.js`**, update `processMessage()`:

```javascript
async function processMessage(message) {
    // Import DRIFT RAG
    const { DRIFTRAG, KnowledgeGraph } = require('../../extensions/knowledge-system/rag-modes/drift-rag.js');
    
    // Initialize if not already
    if (!window.driftRAG) {
        const graph = new KnowledgeGraph('./user-kb.db');
        await graph.initialize();
        window.driftRAG = new DRIFTRAG({ knowledgeGraph: graph });
    }
    
    // Process with DRIFT RAG
    const response = await window.driftRAG.query(message);
    
    return {
        role: 'assistant',
        content: response
    };
}
```

2. **Add natural language command processing**:

```javascript
// Detect user intents
if (message.includes('create knowledge base')) {
    // Guide user through knowledge base creation
}

if (message.includes('process document')) {
    // Open file picker, process with DocumentProcessor
}

if (message.includes('configure')) {
    // Chat-based configuration
}
```

---

## 🎨 Customization

### Change Colors

Edit `src/index.html` CSS variables:

```css
/* Primary gradient */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Or use your brand colors */
background: linear-gradient(135deg, #YOUR_COLOR_1, #YOUR_COLOR_2);
```

### Change App Icon

Replace these files:
- `assets/icon.icns` (macOS)
- `assets/icon.ico` (Windows)
- `assets/icon.png` (Linux)

### Modify Chat Behavior

Edit `src/renderer.js` → `processMessage()` function

---

## 📱 Features Roadmap

- [ ] File upload via drag-and-drop
- [ ] Document preview in chat
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Theme customization
- [ ] Cloud sync
- [ ] Collaboration features

---

## 🐛 Troubleshooting

### App won't start

**Mac:** 
```bash
# If you see "unidentified developer":
xattr -cr /Applications/Enterprise\ OpenClaw.app
```

**Windows:**
- Right-click → "Run as Administrator"

**Linux:**
```bash
chmod +x Enterprise-OpenClaw.AppImage
```

### Can't build installers

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📄 License

Apache 2.0 - See LICENSE file

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes to desktop app
4. Test on all platforms
5. Submit pull request

---

**Made with ❤️ by Enterprise OpenClaw Team**  
**Powered by Electron + DRIFT RAG**
