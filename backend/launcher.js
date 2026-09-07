const http = require('http');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

const LAUNCHER_PORT = 5050;
const APP_PORT = 5000;
const SERVER_ENTRY = path.join(__dirname, 'src', 'server.js');
const LOG_FILE = path.join(__dirname, 'launcher.log');

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Email Scheduler Launcher</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f1115;
    color: #f2f2f2;
  }
  .card {
    text-align: center;
    padding: 48px 56px;
    border-radius: 16px;
    background: #1a1d24;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p { color: #9aa0aa; margin: 0 0 28px; font-size: 14px; }
  button {
    font-size: 16px;
    padding: 14px 32px;
    border-radius: 10px;
    border: none;
    background: #4f8cff;
    color: white;
    cursor: pointer;
    font-weight: 600;
  }
  button:disabled { opacity: 0.6; cursor: default; }
  button:hover:not(:disabled) { background: #3d76e0; }
  #status { margin-top: 18px; font-size: 13px; color: #9aa0aa; min-height: 18px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Job Outreach Email Scheduler</h1>
    <p>Click to start the backend and open the dashboard.</p>
    <button id="startBtn" onclick="startApp()">Start Servers</button>
    <div id="status"></div>
  </div>
<script>
async function checkAndMaybeOpen() {
  const res = await fetch('/status');
  const data = await res.json();
  if (data.appRunning) {
    document.getElementById('status').textContent = 'Already running. Opening...';
    window.location.href = 'http://localhost:${APP_PORT}';
  }
}
async function startApp() {
  const btn = document.getElementById('startBtn');
  const status = document.getElementById('status');
  btn.disabled = true;
  status.textContent = 'Starting server...';
  try {
    const res = await fetch('/start', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      status.textContent = 'Server ready. Opening dashboard...';
      window.location.href = 'http://localhost:${APP_PORT}';
    } else {
      status.textContent = 'Failed: ' + (data.error || 'unknown error');
      btn.disabled = false;
    }
  } catch (e) {
    status.textContent = 'Failed: ' + e.message;
    btn.disabled = false;
  }
}
checkAndMaybeOpen();
</script>
</body>
</html>`;

async function waitForPort(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(PAGE);
    return;
  }

  if (req.url === '/status' && req.method === 'GET') {
    const running = await isPortOpen(APP_PORT);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ appRunning: running }));
    return;
  }

  if (req.url === '/start' && req.method === 'POST') {
    const alreadyRunning = await isPortOpen(APP_PORT);
    if (alreadyRunning) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const out = fs.openSync(LOG_FILE, 'a');
    const child = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: __dirname,
      detached: true,
      stdio: ['ignore', out, out]
    });
    child.unref();

    const started = await waitForPort(APP_PORT, 8000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: started, error: started ? null : 'server did not come up in time' }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(LAUNCHER_PORT, () => {
  console.log(`Launcher running on http://localhost:${LAUNCHER_PORT}`);
});
