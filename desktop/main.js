const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const url = require('url');

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let frontendServer = null;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5199;

// ─── Resolve paths inside packaged app or dev ──────────────────────────────
function getResourcePath(...parts) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...parts);
  }
  return path.join(__dirname, '..', ...parts);
}

// ─── MIME type map ─────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
};

// ─── Kill anything on our ports before starting ────────────────────────────
function clearPorts() {
  try {
    const pids = execSync(`lsof -ti :${BACKEND_PORT} 2>/dev/null`).toString().trim();
    if (pids) {
      pids.split('\n').forEach(pid => {
        try { process.kill(parseInt(pid), 'SIGKILL'); } catch (e) {}
      });
      console.log(`[Startup] Killed existing processes on port ${BACKEND_PORT}`);
    }
  } catch (e) { /* no process on port */ }
}

// ─── Show a splash/loading window ──────────────────────────────────────────
function showSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const splashHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: rgba(11, 15, 20, 0.95);
        color: #E6EDF3;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        border-radius: 20px;
        border: 1px solid rgba(77, 163, 255, 0.2);
        overflow: hidden;
      }
      .logo { font-size: 42px; margin-bottom: 12px; }
      .title { font-size: 22px; font-weight: 800; color: #4DA3FF; margin-bottom: 6px; }
      .subtitle { font-size: 13px; color: #9AA4B2; margin-bottom: 30px; }
      .spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(77, 163, 255, 0.15);
        border-top: 3px solid #4DA3FF;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .status { font-size: 12px; color: #6B7280; animation: pulse 2s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
    </style></head>
    <body>
      <div class="logo">👁️</div>
      <div class="title">OcuSight AI</div>
      <div class="subtitle">Advanced Retinal Disease Detection</div>
      <div class="spinner"></div>
      <div class="status">Loading AI models and starting backend...</div>
    </body>
    </html>
  `)}`;

  splashWindow.loadURL(splashHtml);
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ─── Start static file server for the React frontend ──────────────────────
function startFrontendServer() {
  return new Promise((resolve, reject) => {
    let frontendDir;
    if (app.isPackaged) {
      frontendDir = getResourcePath('frontend-dist');
    } else {
      frontendDir = path.join(__dirname, '..', 'frontend', 'dist');
    }

    console.log(`[Frontend] Serving from: ${frontendDir}`);

    if (!fs.existsSync(frontendDir)) {
      reject(new Error(`Frontend directory not found: ${frontendDir}`));
      return;
    }

    frontendServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      let pathname = decodeURIComponent(parsedUrl.pathname);
      let filePath = path.join(frontendDir, pathname);

      // SPA fallback: if not found or directory, serve index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(frontendDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        try {
          const indexContent = fs.readFileSync(path.join(frontendDir, 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexContent);
        } catch (e) {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    });

    frontendServer.listen(FRONTEND_PORT, '127.0.0.1', () => {
      console.log(`[Frontend] Static server on http://127.0.0.1:${FRONTEND_PORT}`);
      resolve();
    });

    frontendServer.on('error', (err) => {
      console.error('[Frontend] Server error:', err);
      reject(err);
    });
  });
}

// ─── Start the Python backend ──────────────────────────────────────────────
function startBackend() {
  return new Promise((resolve, reject) => {
    let backendExe;
    let cwd;

    if (app.isPackaged) {
      const backendDir = getResourcePath('backend-dist', 'ocusight-backend');
      backendExe = process.platform === 'win32'
        ? path.join(backendDir, 'ocusight-backend.exe')
        : path.join(backendDir, 'ocusight-backend');
      cwd = backendDir;
    } else {
      const pythonPath = path.join(__dirname, '..', '.venv', 'bin', 'python');
      const mainPy = path.join(__dirname, '..', 'backend', 'main.py');
      console.log(`[Backend] Dev mode: ${pythonPath} ${mainPy}`);

      backendProcess = spawn(pythonPath, [mainPy], {
        env: { ...process.env, PORT: String(BACKEND_PORT) },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..', 'backend')
      });
      backendProcess.stdout.on('data', (d) => console.log(`[Backend] ${d.toString().trim()}`));
      backendProcess.stderr.on('data', (d) => console.error(`[Backend] ${d.toString().trim()}`));
      backendProcess.on('error', (err) => reject(err));
      resolve();
      return;
    }

    if (!fs.existsSync(backendExe)) {
      reject(new Error(`Backend binary not found: ${backendExe}`));
      return;
    }

    console.log(`[Backend] Starting: ${backendExe}`);

    backendProcess = spawn(backendExe, [], {
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd
    });

    backendProcess.stdout.on('data', (d) => console.log(`[Backend] ${d.toString().trim()}`));
    backendProcess.stderr.on('data', (d) => console.error(`[Backend] ${d.toString().trim()}`));
    backendProcess.on('error', (err) => {
      console.error('[Backend] Error:', err);
      reject(err);
    });
    backendProcess.on('exit', (code) => {
      console.log(`[Backend] Exited with code ${code}`);
    });

    resolve();
  });
}

// ─── Wait for backend health check ─────────────────────────────────────────
// PyTorch + matplotlib font cache can take 30-90 seconds on first launch
function waitForBackend(maxRetries = 120, interval = 1500) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = () => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/`, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`[Backend] Ready after ${retries + 1} attempts (~${Math.round((retries + 1) * interval / 1000)}s)`);
            resolve();
          } else {
            retry();
          }
        });
      });

      req.on('error', () => retry());
      req.setTimeout(3000, () => { req.destroy(); retry(); });
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error(`Backend didn't respond after ${Math.round(maxRetries * interval / 1000)}s. It may still be loading PyTorch models.`));
      } else {
        if (retries % 10 === 0) {
          console.log(`[Backend] Still loading... attempt ${retries}/${maxRetries} (~${Math.round(retries * interval / 1000)}s)`);
        }
        setTimeout(check, interval);
      }
    };

    check();
  });
}

// ─── Create the main application window ────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OcuSight AI',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0B0F14',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
  console.log(`[Window] Loading: ${frontendUrl}`);
  mainWindow.loadURL(frontendUrl);

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    console.log('[Window] Application window visible');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Cleanup ───────────────────────────────────────────────────────────────
function stopAll() {
  if (backendProcess) {
    console.log('[Cleanup] Stopping backend...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
      setTimeout(() => {
        try { backendProcess.kill('SIGKILL'); } catch (e) {}
      }, 3000);
    }
    backendProcess = null;
  }

  if (frontendServer) {
    console.log('[Cleanup] Stopping frontend server...');
    frontendServer.close();
    frontendServer = null;
  }
}

// ─── App lifecycle ─────────────────────────────────────────────────────────
app.on('ready', async () => {
  console.log('=========================================');
  console.log('  OcuSight AI — Desktop App Starting');
  console.log(`  Packaged: ${app.isPackaged}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log('=========================================');

  // Show splash screen immediately
  showSplash();

  try {
    // Clear any stale processes on our port
    clearPorts();

    // Step 1: Start frontend static server
    await startFrontendServer();

    // Step 2: Start backend
    await startBackend();

    // Step 3: Wait for backend to be ready (can take 60s+ on first launch)
    console.log('[Startup] Waiting for backend (PyTorch model loading)...');
    await waitForBackend();

    // Step 4: Show the main window
    createWindow();
  } catch (err) {
    console.error('[FATAL]', err);
    closeSplash();
    dialog.showErrorBox(
      'OcuSight AI — Startup Error',
      `Failed to start the application.\n\n${err.message}\n\nPlease try restarting the application.`
    );
    stopAll();
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopAll();
  app.quit();
});

app.on('before-quit', () => {
  stopAll();
});

app.on('activate', () => {
  if (mainWindow === null && frontendServer) {
    createWindow();
  }
});
