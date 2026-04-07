import http from "http"
import fs from "fs"
import path from "path"
import { Observatory } from "./index"
import { Log } from "../util/log"
import { Global } from "@/global"

const log = Log.create({ service: "observatory.server" })

const sseClients = new Set<http.ServerResponse>()

export const LIVE_VIEW_DIR = path.join(Global.Path.data, "live-view")

const LIVE_RELOAD_SCRIPT = `<script>
(function() {
  var es = null;
  var reconnectTimer = null;
  var reconnectAttempts = 0;
  var MAX_RECONNECT_ATTEMPTS = 10;
  var RECONNECT_DELAY = 1000;
  
  function connect() {
    if (es) {
      try { es.close(); } catch(_) {}
    }
    
    es = new EventSource('/~observatory/events');
    
    es.onopen = function() {
      console.log('[Observatory] SSE connected');
      reconnectAttempts = 0;
    };
    
    es.onmessage = function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'reload') {
          console.log('[Observatory] reloading – file changed:', msg.file);
          // If we're on the waiting/status page and index.html just appeared, navigate to it
          var changedName = (msg.file || '').split('/').pop();
          if (changedName === 'index.html' && window.location.pathname === '/') {
            window.location.reload();
            return;
          }
          location.reload();
        }
      } catch(_) {}
    };
    
    es.onerror = function(e) {
      console.log('[Observatory] SSE error, will reconnect...');
      if (es) {
        try { es.close(); } catch(_) {}
        es = null;
      }
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      reconnectAttempts++;
      if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.log('[Observatory] Max reconnect attempts reached, falling back to polling');
        return;
      }
      
      // Exponential backoff with jitter
      var delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1), 30000);
      delay = delay + (Math.random() * 1000);
      
      reconnectTimer = setTimeout(function() {
        connect();
      }, delay);
    };
  }
  
  connect();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (es) {
      try { es.close(); } catch(_) {}
    }
  });
})();
</script>`

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript",
  ".jsx": "application/javascript",
  ".ts": "application/javascript",
  ".tsx": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
}

function replayPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Replay — Observatory</title>

  <!-- SB Sans Text -->
  <style>
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Regular.woff2') format('woff2'); font-weight: normal; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Medium.woff2') format('woff2'); font-weight: 500; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Semibold.woff2') format('woff2'); font-weight: 600; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Bold.woff2') format('woff2'); font-weight: bold; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-primary:   #0d0d0d;
      --bg-secondary: #121212;
      --bg-card:      #171717;
      --bg-hover:     #1f1f1f;
      --text-primary: #fbfbfb;
      --text-secondary: #b7b7b7;
      --accent:       #ff4f00;
      --accent-glow:  rgba(255,107,44,.1);
      --success:      #00ff88;
      --error:        #ff3333;
      --border:       #2a2a2a;
    }

    html, body { height: 100%; overflow: hidden; }

    body {
      font-family: 'SB Sans Text', 'Inter', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-secondary); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* Top bar */
    .topbar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
      flex-shrink: 0;
    }
    .topbar-logo { font-size: 1.2rem; }
    .topbar-title { font-weight: 700; font-size: 1rem; }
    .topbar-title span { color: var(--accent); }
    .topbar-badge {
      margin-left: auto;
      font-size: .72rem; color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Main layout */
    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* File tree panel */
    .tree-panel {
      width: 220px;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
    }
    .tree-header {
      padding: 10px 14px;
      font-size: .72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .tree-body { flex: 1; overflow-y: auto; padding: 8px 0; }
    .tree-item {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 14px;
      font-size: .82rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background .1s, color .1s;
      word-break: break-all;
    }
    .tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .tree-item.active { color: var(--accent); background: var(--accent-glow); }
    .tree-icon { font-size: .75rem; flex-shrink: 0; }

    /* Code panel */
    .code-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg-primary);
    }
    .code-filename {
      padding: 8px 16px;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: .82rem;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      flex-shrink: 0;
    }
    .code-filename span { color: var(--accent); }
    .code-body { flex: 1; overflow: auto; }
    .code-body pre {
      margin: 0;
      padding: 16px;
      background: transparent !important;
      font-family: 'JetBrains Mono', monospace;
      font-size: .82rem;
      line-height: 1.6;
      min-height: 100%;
    }
    .code-body code {
      background: transparent !important;
    }
    /* Override hljs background */
    .hljs { background: transparent !important; }

    /* Timeline / controls */
    .controls {
      flex-shrink: 0;
      border-top: 1px solid var(--border);
      background: var(--bg-secondary);
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .progress-row {
      display: flex; align-items: center; gap: 10px;
    }
    .progress-bar-wrap {
      flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; background: var(--accent); border-radius: 2px;
      transition: width .1s;
      width: 0%;
    }
    .progress-label {
      font-size: .72rem; color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
      min-width: 50px; text-align: right;
    }
    .controls-row {
      display: flex; align-items: center; gap: 10px;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--bg-card); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 6px 14px; font-size: .82rem;
      cursor: pointer; transition: background .15s, border-color .15s;
      font-family: 'SB Sans Text', 'Inter', sans-serif;
    }
    .btn:hover { background: var(--bg-hover); border-color: var(--accent); }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn.primary:hover { background: #e04400; }
    select.speed-select {
      background: var(--bg-card); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 6px 10px; font-size: .82rem;
      cursor: pointer;
      font-family: 'SB Sans Text', 'Inter', sans-serif;
    }
    .status-text {
      margin-left: auto;
      font-size: .78rem;
      color: var(--text-secondary);
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--success);
      display: inline-block;
    }
    .dot.idle { background: var(--text-secondary); animation: none; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
    .dot.playing { animation: pulse 1s ease-in-out infinite; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">🔭</div>
    <div class="topbar-title"><span>Observatory</span> — Replay</div>
    <div class="topbar-badge" id="event-count">Loading…</div>
  </div>

  <div class="main">
    <div class="tree-panel">
      <div class="tree-header">Files</div>
      <div class="tree-body" id="tree"></div>
    </div>
    <div class="code-panel">
      <div class="code-filename" id="code-filename"><span>—</span></div>
      <div class="code-body">
        <pre><code id="code-display" class="hljs"></code></pre>
      </div>
    </div>
  </div>

  <div class="controls">
    <div class="progress-row">
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progress-fill"></div>
      </div>
      <div class="progress-label" id="progress-label">0 / 0</div>
    </div>
    <div class="controls-row">
      <button class="btn primary" id="play-btn">▶ Play</button>
      <select class="speed-select" id="speed-select">
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="4">4×</option>
        <option value="8">8×</option>
      </select>
      <div class="status-text" id="status-text"><span class="dot idle" id="status-dot"></span> Ready</div>
    </div>
  </div>

  <script>
  (function() {
    var recording = [];
    var currentEventIdx = 0;
    var playing = false;
    var speed = 1;
    var CHUNK_SIZE = 50;
    var BASE_DELAY = 16; // ms per chunk at 1x
    var animTimer = null;
    var treeFiles = {}; // relPath -> true

    var playBtn = document.getElementById('play-btn');
    var speedSelect = document.getElementById('speed-select');
    var progressFill = document.getElementById('progress-fill');
    var progressLabel = document.getElementById('progress-label');
    var statusText = document.getElementById('status-text');
    var statusDot = document.getElementById('status-dot');
    var eventCount = document.getElementById('event-count');
    var tree = document.getElementById('tree');
    var codeDisplay = document.getElementById('code-display');
    var codeFilename = document.getElementById('code-filename');

    function setStatus(text, cls) {
      statusDot.className = 'dot ' + (cls || '');
      statusText.innerHTML = '<span class="dot ' + (cls || '') + '"></span> ' + text;
    }

    function updateProgress() {
      var total = recording.length;
      var pct = total > 0 ? (currentEventIdx / total) * 100 : 0;
      progressFill.style.width = pct + '%';
      progressLabel.textContent = currentEventIdx + ' / ' + total;
    }

    function addFileToTree(relPath) {
      if (treeFiles[relPath]) return;
      treeFiles[relPath] = true;
      var item = document.createElement('div');
      item.className = 'tree-item';
      item.dataset.path = relPath;
      var parts = relPath.split('/');
      var name = parts[parts.length - 1];
      var ext = (name.split('.').pop() || '').toLowerCase();
      item.innerHTML = '<span class="tree-icon">📄</span><span>' + relPath + '</span>';
      item.addEventListener('click', function() {
        document.querySelectorAll('.tree-item').forEach(function(el) { el.classList.remove('active'); });
        item.classList.add('active');
        showFileContent(relPath);
      });
      tree.appendChild(item);
    }

    function showFileContent(relPath) {
      var evt = null;
      for (var i = recording.length - 1; i >= 0; i--) {
        if (recording[i].relPath === relPath) { evt = recording[i]; break; }
      }
      codeFilename.innerHTML = '<span>' + relPath + '</span>';
      if (evt) {
        renderCode(evt.content, relPath);
      } else {
        codeDisplay.textContent = '';
      }
    }

    function renderCode(content, relPath) {
      var ext = (relPath.split('.').pop() || '').toLowerCase();
      var langMap = { js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
        py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
        sh: 'bash', yaml: 'yaml', yml: 'yaml', rs: 'rust', go: 'go', java: 'java' };
      var lang = langMap[ext] || 'plaintext';
      codeDisplay.className = 'hljs language-' + lang;
      codeDisplay.textContent = content;
      if (window.hljs) {
        try { window.hljs.highlightElement(codeDisplay); } catch(e) {}
      }
    }

    function animateEvent(evt, done) {
      addFileToTree(evt.relPath);

      // Highlight file in tree
      document.querySelectorAll('.tree-item').forEach(function(el) {
        el.classList.toggle('active', el.dataset.path === evt.relPath);
      });

      codeFilename.innerHTML = '<span>' + evt.relPath + '</span>';

      var content = evt.content;
      var revealed = 0;
      var delay = Math.max(1, Math.round(BASE_DELAY / speed));
      var ext = (evt.relPath.split('.').pop() || '').toLowerCase();
      var langMap = { js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
        py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
        sh: 'bash', yaml: 'yaml', yml: 'yaml', rs: 'rust', go: 'go', java: 'java' };
      var lang = langMap[ext] || 'plaintext';

      function step() {
        if (!playing) { done(); return; }
        if (revealed >= content.length) {
          // Final highlight
          codeDisplay.className = 'hljs language-' + lang;
          codeDisplay.textContent = content;
          if (window.hljs) {
            try { window.hljs.highlightElement(codeDisplay); } catch(e) {}
          }
          done();
          return;
        }
        revealed = Math.min(revealed + CHUNK_SIZE, content.length);
        var partial = content.substring(0, revealed);
        // Set without syntax highlight during typing for performance
        codeDisplay.className = 'hljs';
        codeDisplay.textContent = partial;
        animTimer = setTimeout(step, delay);
      }

      step();
    }

    function runReplay() {
      if (currentEventIdx >= recording.length) {
        playing = false;
        playBtn.textContent = '↺ Replay';
        setStatus('Complete', '');
        return;
      }

      var evt = recording[currentEventIdx];
      currentEventIdx++;
      updateProgress();
      setStatus('Writing: ' + evt.relPath, 'playing');

      animateEvent(evt, function() {
        if (!playing) return;
        animTimer = setTimeout(runReplay, Math.max(1, Math.round(200 / speed)));
      });
    }

    playBtn.addEventListener('click', function() {
      if (playing) {
        // Pause
        playing = false;
        if (animTimer) { clearTimeout(animTimer); animTimer = null; }
        playBtn.textContent = '▶ Resume';
        setStatus('Paused', 'idle');
      } else {
        // Play or resume
        if (currentEventIdx >= recording.length) {
          // Reset
          currentEventIdx = 0;
          tree.innerHTML = '';
          treeFiles = {};
          codeDisplay.textContent = '';
          codeFilename.innerHTML = '<span>—</span>';
          updateProgress();
        }
        playing = true;
        playBtn.textContent = '⏸ Pause';
        setStatus('Playing…', 'playing');
        runReplay();
      }
    });

    speedSelect.addEventListener('change', function() {
      speed = parseInt(this.value, 10) || 1;
    });

    // Load recording
    fetch('/~observatory/recording')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        recording = Array.isArray(data) ? data : [];
        eventCount.textContent = recording.length + ' events';
        updateProgress();
        setStatus('Ready — ' + recording.length + ' file events', '');
      })
      .catch(function() {
        eventCount.textContent = 'No recording found';
        setStatus('No recording data', 'idle');
      });
  })();
  </script>
</body>
</html>`
}

function statusPage(projectDir: string): string {
  const s = Observatory.getState()
  const fileItems = s.recentFiles.length > 0
    ? s.recentFiles.map(f => {
        const rel = path.relative(LIVE_VIEW_DIR, f)
        const ext = path.extname(f).slice(1) || "?"
        return `<li><span class="badge">${ext}</span><span class="file-name">${rel}</span></li>`
      }).join("")
    : `<li class="empty">Waiting for the LLM to write files…</li>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Observatory — SahyaCode</title>

  <!-- SB Sans Text -->
  <style>
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Regular.woff2') format('woff2'); font-weight: normal; font-style: normal; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Medium.woff2') format('woff2'); font-weight: 500; font-style: normal; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Semibold.woff2') format('woff2'); font-weight: 600; font-style: normal; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Bold.woff2') format('woff2'); font-weight: bold; font-style: normal; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-primary:   #0d0d0d;
      --bg-secondary: #121212;
      --bg-card:      #171717;
      --bg-hover:     #1f1f1f;
      --text-primary: #fbfbfb;
      --text-secondary: #b7b7b7;
      --accent:       #ff4f00;
      --accent-glow:  rgba(255,107,44,.1);
      --success:      #00ff88;
      --error:        #ff3333;
      --border:       #2a2a2a;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'SB Sans Text', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary); color: var(--text-primary);
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 16px; line-height: 1.6; overflow-x: hidden;
    }

    /* Hide scrollbars */
    ::-webkit-scrollbar { width: 0; height: 0; display: none; }
    * { scrollbar-width: none; -ms-overflow-style: none; }

    /* Noise overlay */
    .noise {
      position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: .03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    /* Starfield */
    #stars {
      position: fixed; inset: 0; z-index: -1; pointer-events: none;
      background: var(--bg-primary);
    }
    #stars canvas { display: block; width: 100%; height: 100%; }

    /* Card */
    .card {
      position: relative; z-index: 1;
      background: rgba(23,23,23,.85); backdrop-filter: blur(20px);
      border: 1px solid var(--border); border-radius: 20px;
      padding: 36px; max-width: 580px; width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,.4);
      animation: card-in .4s cubic-bezier(.16,1,.3,1);
    }
    @keyframes card-in { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }

    /* Header */
    .header { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
    .logo-wrap {
      width: 42px; height: 42px; border-radius: 12px;
      background: var(--border); display: flex; align-items: center;
      justify-content: center; font-size: 1.3rem; flex-shrink: 0;
      box-shadow: 0 0 20px var(--accent-glow);
    }
    .title { font-size: 1.25rem; font-weight: 700; }
    .title span { color: var(--accent); }
    .subtitle { font-size: .85rem; color: var(--text-secondary); margin-bottom: 24px; margin-left: 56px; }

    /* Status pill */
    .pill {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(0,255,136,.08); border: 1px solid rgba(0,255,136,.2);
      border-radius: 999px; padding: 4px 12px; font-size: .78rem;
      color: var(--success); margin-bottom: 28px;
    }
    .dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--success);
      animation: pulse 1.8s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }

    /* Section label */
    .label {
      font-size: .72rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .07em; color: var(--text-secondary); margin-bottom: 8px;
    }

    /* Directory */
    .dir {
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 14px;
      font-family: 'JetBrains Mono', monospace; font-size: .82rem;
      color: var(--text-secondary); margin-bottom: 8px;
      word-break: break-all;
    }

    /* Project dir label */
    .proj-dir {
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 14px;
      font-family: 'JetBrains Mono', monospace; font-size: .82rem;
      color: var(--text-secondary); margin-bottom: 24px;
      word-break: break-all;
    }

    /* Current task */
    #task { margin-bottom: 20px; }
    .task-box {
      border-left: 3px solid var(--accent);
      background: rgba(255,79,0,.06);
      border-radius: 0 10px 10px 0;
      padding: 10px 14px; font-size: .9rem; color: var(--text-primary);
    }

    /* File list */
    ul { list-style: none; }
    ul li {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 0; border-bottom: 1px solid var(--border);
      font-size: .88rem; color: var(--text-secondary);
      transition: color .15s;
    }
    ul li:last-child { border-bottom: none; }
    ul li:hover { color: var(--text-primary); }
    ul li.empty { font-style: italic; color: var(--text-secondary); }
    .badge {
      background: var(--border); border-radius: 5px; padding: 2px 7px;
      font-size: .68rem; font-family: 'JetBrains Mono', monospace;
      color: var(--accent); flex-shrink: 0; font-weight: 500;
    }
    .file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Divider */
    .divider { height: 1px; background: var(--border); margin: 24px 0; }

    /* Hint */
    .hint { font-size: .8rem; color: var(--text-secondary); line-height: 1.6; }
    .hint code {
      font-family: 'JetBrains Mono', monospace; font-size: .78rem;
      background: var(--bg-hover); border-radius: 5px; padding: 1px 5px;
      color: var(--accent);
    }

    /* Action buttons */
    .actions { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
    .action-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--bg-card); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 10px;
      padding: 8px 16px; font-size: .85rem;
      cursor: pointer; transition: background .15s, border-color .15s;
      font-family: 'SB Sans Text', 'Inter', sans-serif;
      text-decoration: none;
    }
    .action-btn:hover { background: var(--bg-hover); border-color: var(--accent); }
    .action-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .action-btn.primary:hover { background: #e04400; }
    .action-result {
      margin-top: 10px; font-size: .8rem;
      color: var(--success);
      display: none;
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div id="stars"><canvas id="star-canvas"></canvas></div>

  <div class="card">
    <div class="header">
      <div class="logo-wrap">🔭</div>
      <div class="title"><span>Observatory</span> — Live Preview</div>
    </div>
    <div class="subtitle">SahyaCode is building your project in real time</div>

    <div class="pill"><div class="dot"></div> Connected — watching for file changes</div>

    <div id="task" style="display:none">
      <div class="label">Current task</div>
      <div class="task-box" id="task-text"></div>
    </div>

    <div class="label">Live view directory</div>
    <div class="dir">${LIVE_VIEW_DIR}</div>

    <div class="label">Project directory</div>
    <div class="proj-dir" id="project-dir">${projectDir}</div>

    <div class="label">Files written by the LLM</div>
    <ul id="files">${fileItems}</ul>

    <div class="divider"></div>

    <div class="actions">
      <a href="/~observatory/replay" class="action-btn">🎬 Watch Replay</a>
      <button class="action-btn primary" id="move-btn">📁 Move to Original Location</button>
    </div>
    <div class="action-result" id="move-result"></div>

    <div class="divider"></div>

    <p class="hint">
      This page updates live as files are written. It will automatically navigate
      to the project once <code>index.html</code> is ready.
    </p>
  </div>

  ${LIVE_RELOAD_SCRIPT}

  <script>
    // ── Dynamic project directory (updated from status) ───────────────────────
    var currentProjectDir = ${JSON.stringify(projectDir)};
    
    // ── Move to original location ─────────────────────────────────────────────
    document.getElementById('move-btn').addEventListener('click', function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '⏳ Moving…';
      fetch('/~observatory/move-to', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: currentProjectDir })
      })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var result = document.getElementById('move-result');
          result.style.display = 'block';
          result.textContent = d.message || 'Files moved successfully.';
          btn.textContent = '✅ Moved';
        })
        .catch(function(err) {
          btn.disabled = false;
          btn.textContent = '📁 Move to Original Location';
          var result = document.getElementById('move-result');
          result.style.display = 'block';
          result.style.color = 'var(--error)';
          result.textContent = 'Error: ' + String(err);
        });
    });

    // ── Starfield ────────────────────────────────────────────────────────────
    (function() {
      var canvas = document.getElementById('star-canvas');
      var ctx = canvas.getContext('2d');
      var stars = [];
      function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resize();
      window.addEventListener('resize', resize);
      for (var i = 0; i < 120; i++) {
        stars.push({
          x: Math.random(), y: Math.random(),
          r: Math.random() * 1.2 + .2,
          a: Math.random(), da: (Math.random() - .5) * .004
        });
      }
      function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(function(s) {
          s.a = Math.max(.05, Math.min(1, s.a + s.da));
          if (s.a <= .05 || s.a >= 1) s.da *= -1;
          ctx.beginPath();
          ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251,251,251,' + s.a + ')';
          ctx.fill();
        });
        requestAnimationFrame(frame);
      }
      frame();
    })();

    // ── Status polling ────────────────────────────────────────────────────────
    (function poll() {
      fetch('/~observatory/status')
        .then(function(r) { return r.json(); })
        .then(function(d) {
          // Update project directory dynamically
          if (d.projectDir) {
            currentProjectDir = d.projectDir;
            var projDirEl = document.getElementById('project-dir');
            if (projDirEl && projDirEl.textContent !== d.projectDir) {
              projDirEl.textContent = d.projectDir;
            }
          }
          // Update file list
          var ul = document.getElementById('files');
          if (ul && d.recentFiles && d.recentFiles.length > 0) {
            ul.innerHTML = d.recentFiles.map(function(f) {
              var name = f.split('/').pop();
              var ext  = (name.split('.').pop() || '?').toLowerCase();
              return '<li><span class="badge">' + ext + '</span><span class="file-name">' + name + '</span></li>';
            }).join('');
          }
          // Update task
          var taskDiv  = document.getElementById('task');
          var taskText = document.getElementById('task-text');
          if (taskDiv && taskText) {
            if (d.currentTask) {
              taskDiv.style.display = 'block';
              taskText.textContent  = d.currentTask;
            } else {
              taskDiv.style.display = 'none';
            }
          }
          // Auto-navigate when index.html appears
          if (d.recentFiles && d.recentFiles.some(function(f) {
            return f.split('/').pop() === 'index.html';
          })) {
            window.location.href = '/';
            return;
          }
        })
        .catch(function() {})
        .finally(function() { setTimeout(poll, 1000); });
    })();
  </script>
</body>
</html>`
}

// ── Singleton server state ──────────────────────────────────────────────────

let server: http.Server | null = null
let activePort = 0
let unsubscribe: (() => void) | null = null

export function getUrl(): string | null {
  if (!server || !activePort) return null
  return `http://localhost:${activePort}`
}

export function isRunning(): boolean {
  return server !== null && activePort > 0
}

/**
 * Start the observatory preview server.
 * Resolves with the URL once listening. Safe to call multiple times — subsequent
 * calls return the already-running server's URL.
 */
export function start(workDir: string, startPort = 3456): Promise<string> {
  if (server && activePort) {
    return Promise.resolve(`http://localhost:${activePort}`)
  }

  // Ensure live-view directory exists
  fs.mkdirSync(LIVE_VIEW_DIR, { recursive: true })

  Observatory.enable()

  // Broadcast file changes to all SSE clients
  unsubscribe = Observatory.onFileChanged((file) => {
    const data = JSON.stringify({ type: "reload", file })
    for (const client of sseClients) {
      try {
        client.write(`data: ${data}\n\n`)
      } catch {
        sseClients.delete(client)
      }
    }
  })

  return new Promise((resolve, reject) => {
    let port = startPort

    const tryListen = () => {
      const srv = http.createServer((req, res) => {
        const url = req.url || "/"
        const method = req.method || "GET"

        // ── Observatory internal endpoints ─────────────────────────────────
        if (url === "/~observatory/events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no", // Disable nginx buffering
          })
          res.write(": connected\n\n")
          sseClients.add(res)
          
          // Heartbeat to keep connection alive (every 15 seconds for better reliability)
          const heartbeat = setInterval(() => {
            try {
              res.write(": ping\n\n")
            } catch {
              clearInterval(heartbeat)
              sseClients.delete(res)
            }
          }, 15000)
          
          const cleanup = () => {
            clearInterval(heartbeat)
            sseClients.delete(res)
          }
          
          req.on("close", cleanup)
          req.on("error", cleanup)
          res.on("close", cleanup)
          res.on("error", cleanup)
          req.on("aborted", cleanup)
          return
        }

        if (url === "/~observatory/status") {
          const state = Observatory.getState()
          // Include the initial workDir as fallback if projectDir not set yet
          const statusWithDir = {
            ...state,
            projectDir: state.projectDir || workDir,
            liveViewDir: LIVE_VIEW_DIR,
          }
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
          res.end(JSON.stringify(statusWithDir))
          return
        }

        if (url === "/~observatory/replay") {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(replayPage())
          return
        }

        if (url === "/~observatory/recording") {
          const recordingPath = path.join(LIVE_VIEW_DIR, ".sahya-replay.json")
          fs.readFile(recordingPath, (err, data) => {
            if (err) {
              res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end("[]")
              return
            }
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
            res.end(data)
          })
          return
        }

        if (url === "/~observatory/move-to" && method === "POST") {
          let body = ""
          req.on("data", (chunk) => { body += chunk.toString() })
          req.on("end", async () => {
            try {
              const parsed = JSON.parse(body) as { target?: string }
              const target = parsed.target || workDir

              // Collect all files from LIVE_VIEW_DIR recursively, excluding .sahya-replay.json
              const getAllFiles = async (dir: string): Promise<string[]> => {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true })
                const files: string[] = []
                for (const entry of entries) {
                  const fullPath = path.join(dir, entry.name)
                  if (entry.isDirectory()) {
                    files.push(...(await getAllFiles(fullPath)))
                  } else if (entry.name !== ".sahya-replay.json") {
                    files.push(fullPath)
                  }
                }
                return files
              }

              const allFiles = await getAllFiles(LIVE_VIEW_DIR)
              for (const srcFile of allFiles) {
                const relPath = path.relative(LIVE_VIEW_DIR, srcFile)
                const destFile = path.join(target, relPath)
                await fs.promises.mkdir(path.dirname(destFile), { recursive: true })
                await fs.promises.copyFile(srcFile, destFile)
              }

              res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end(JSON.stringify({ success: true, message: `Moved ${allFiles.length} file(s) to ${target}` }))
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ success: false, message: String(err) }))
            }
          })
          return
        }

        // ── Serve project files from LIVE_VIEW_DIR ─────────────────────────
        const filePath = path.join(LIVE_VIEW_DIR, url === "/" ? "index.html" : url)

        fs.readFile(filePath, (err, data) => {
          if (err) {
            // No index.html yet — show the status/waiting page
            if (url === "/" || url === "/index.html") {
              res.writeHead(200, { "Content-Type": "text/html" })
              res.end(statusPage(workDir))
              return
            }
            res.writeHead(404, { "Content-Type": "text/plain" })
            res.end("Not found")
            return
          }

          const ext = path.extname(filePath).toLowerCase()
          const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"
          res.writeHead(200, { "Content-Type": contentType })

          // Inject live-reload into HTML
          if (ext === ".html" || ext === ".htm") {
            let html = data.toString("utf8")
            html = html.includes("</body>")
              ? html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`)
              : html + LIVE_RELOAD_SCRIPT
            res.end(html)
          } else {
            res.end(data)
          }
        })
      })

      srv.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          port++
          tryListen()
        } else {
          reject(err)
        }
      })

      srv.listen(port, "127.0.0.1", () => {
        server = srv
        activePort = port
        log.info("Observatory server started", { port, workDir, liveViewDir: LIVE_VIEW_DIR })
        resolve(`http://localhost:${port}`)
      })
    }

    tryListen()
  })
}

/**
 * Stop the preview server and clean up.
 */
export function stop() {
  Observatory.disable()
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  sseClients.clear()
  if (server) { server.close(); server = null }
  activePort = 0
}
