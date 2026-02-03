const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Show welcome dialog on first launch
  if (!store.get('firstLaunchComplete')) {
    setTimeout(() => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Welcome to Enterprise OpenClaw! 🚀',
        message: 'Ready to start!',
        detail: 'Your DRIFT RAG knowledge system is ready to use.\n\n' +
                'Just start chatting in the window below to:\n' +
                '• Ask questions\n' +
                '• Build knowledge bases\n' +
                '• Configure settings\n\n' +
                'Everything is done through natural language!',
        buttons: ['Get Started']
      }).then(() => {
        store.set('firstLaunchComplete', true);
      });
    }, 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for chat functionality
ipcMain.handle('send-message', async (event, message) => {
  // This will be connected to DRIFT RAG
  return {
    role: 'assistant',
    content: `Echo: ${message}`
  };
});

ipcMain.handle('get-config', async () => {
  return store.get('config', {});
});

ipcMain.handle('set-config', async (event, config) => {
  store.set('config', config);
  return { success: true };
});
