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

let currentWorkDir: string = ""

function liveConstructionPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Live Construction — Observatory</title>
  <style>
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Regular.woff2') format('woff2'); font-weight: normal; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Medium.woff2') format('woff2'); font-weight: 500; }
    @font-face { font-family: 'SB Sans Text'; src: url('https://cdn-app.giga.chat/shared-static/0.0.0/fonts/SBSansText/SBSansText-Semibold.woff2') format('woff2'); font-weight: 600; }
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  </style>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg-primary: #0d0d0d;
      --bg-secondary: #121212;
      --bg-card: #171717;
      --bg-hover: #1f1f1f;
      --text-primary: #fbfbfb;
      --text-secondary: #b7b7b7;
      --accent: #ff4f00;
      --accent-glow: rgba(255,107,44,.1);
      --success: #00ff88;
      --border: #2a2a2a;
    }
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: 'SB Sans Text', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-secondary); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    .topbar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-secondary);
    }
    .topbar-logo { font-size: 1.3rem; }
    .topbar-title { font-weight: 700; font-size: 1rem; }
    .topbar-title span { color: var(--accent); }
    .topbar-status {
      margin-left: auto;
      display: flex; align-items: center; gap: 8px;
      font-size: 0.8rem; color: var(--text-secondary);
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--success);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .main { display: flex; height: calc(100% - 57px); }
    .sidebar {
      width: 280px;
      border-right: 1px solid var(--border);
      background: var(--bg-secondary);
      display: flex; flex-direction: column;
    }
    .panel-header {
      padding: 12px 16px;
      font-size: 0.75rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }
    .file-tree {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    .file-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 16px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }
    .file-item:hover { background: var(--bg-hover); color: var(--text-primary); }
    .file-item.active { 
      background: var(--accent-glow); 
      color: var(--accent);
      border-right: 2px solid var(--accent);
    }
    .file-item.writing { animation: writing 0.5s ease-in-out infinite alternate; }
    @keyframes writing { from { opacity: 0.6; } to { opacity: 1; } }
    .file-icon { font-size: 0.9rem; }
    .activity-log {
      height: 150px;
      border-top: 1px solid var(--border);
      overflow-y: auto;
      padding: 8px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .activity-item {
      padding: 4px 16px;
      color: var(--text-secondary);
      display: flex; align-items: center;
      gap: 8px;
    }
    .activity-item.new { color: var(--success); }
    .activity-item::before { content: '›'; color: var(--accent); }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .code-panel {
      height: 40%;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .code-header {
      padding: 10px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-header span { color: var(--accent); }
    .writing-indicator {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.75rem; color: var(--text-secondary);
    }
    .writing-indicator.active { color: var(--success); }
    .typing-dots { display: flex; gap: 3px; }
    .typing-dots span {
      width: 5px; height: 5px; border-radius: 50%;
      background: currentColor;
      animation: typing 1s infinite;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing { 0%,100%{opacity:0.3} 50%{opacity:1} }
    .code-body {
      flex: 1;
      overflow: auto;
      background: var(--bg-primary);
    }
    .code-body pre {
      margin: 0;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.6;
    }
    .code-body code { background: transparent !important; }
    .preview-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .preview-header {
      padding: 10px 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .preview-toolbar {
      display: flex; gap: 8px;
    }
    .btn {
      padding: 4px 12px;
      background: var(--bg-hover);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:hover { border-color: var(--accent); }
    .preview-frame {
      flex: 1;
      border: none;
      background: white;
    }
    .hljs { background: transparent !important; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">🔭</div>
    <div class="topbar-title"><span>Observatory</span> — Live Construction</div>
    <div class="topbar-status">
      <div class="status-dot"></div>
      <span id="status-text">Watching...</span>
    </div>
  </div>
  
  <div class="main">
    <div class="sidebar">
      <div class="panel-header">Files</div>
      <div class="file-tree" id="file-tree"></div>
      <div class="panel-header">Activity</div>
      <div class="activity-log" id="activity-log"></div>
    </div>
    
    <div class="content-area">
      <div class="code-panel">
        <div class="code-header">
          <span id="current-file">—</span>
          <div class="writing-indicator" id="writing-indicator">
            <div class="typing-dots"><span></span><span></span><span></span></div>
            <span>Writing...</span>
          </div>
        </div>
        <div class="code-body">
          <pre><code id="code-display" class="hljs"></code></pre>
        </div>
      </div>
      
      <div class="preview-panel">
        <div class="preview-header">
          <span>Live Preview</span>
          <div class="preview-toolbar">
            <button class="btn" onclick="refreshPreview()">🔄 Refresh</button>
            <button class="btn" onclick="openPreview()">↗️ Open</button>
          </div>
        </div>
        <iframe class="preview-frame" id="preview-frame" src="/~observatory/preview"></iframe>
      </div>
    </div>
  </div>

  <script>
  (function() {
    const fileTree = document.getElementById('file-tree');
    const activityLog = document.getElementById('activity-log');
    const codeDisplay = document.getElementById('code-display');
    const currentFile = document.getElementById('current-file');
    const writingIndicator = document.getElementById('writing-indicator');
    const statusText = document.getElementById('status-text');
    const previewFrame = document.getElementById('preview-frame');
    
    const files = new Map();
    let currentFilePath = null;
    let typingTimer = null;
    
    function addActivity(message, isNew = false) {
      const item = document.createElement('div');
      item.className = 'activity-item' + (isNew ? ' new' : '');
      item.textContent = message;
      activityLog.insertBefore(item, activityLog.firstChild);
      while (activityLog.children.length > 50) {
        activityLog.removeChild(activityLog.lastChild);
      }
    }
    
    function addOrUpdateFile(relPath, content = '', isWriting = false) {
      const existing = files.get(relPath);
      if (!existing) {
        const item = document.createElement('div');
        item.className = 'file-item' + (isWriting ? ' writing' : '');
        item.dataset.path = relPath;
        const ext = relPath.split('.').pop() || '';
        const icon = { html: '🌐', css: '🎨', js: '⚡', json: '📋', md: '📝' }[ext] || '📄';
        item.innerHTML = '<span class="file-icon">' + icon + '</span><span>' + relPath + '</span>';
        item.addEventListener('click', () => showFile(relPath));
        fileTree.appendChild(item);
        files.set(relPath, { element: item, content });
        addActivity('Created ' + relPath, true);
      } else {
        existing.content = content;
        existing.element.classList.toggle('writing', isWriting);
        if (isWriting && currentFilePath === relPath) {
          showFile(relPath, content);
        }
      }
    }
    
    function showFile(relPath, content = null) {
      const file = files.get(relPath);
      if (!file) return;
      
      currentFilePath = relPath;
      currentFile.textContent = relPath;
      
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      file.element.classList.add('active');
      
      const displayContent = content !== null ? content : file.content;
      const ext = relPath.split('.').pop() || '';
      const langMap = { js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'javascript',
        py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown' };
      codeDisplay.className = 'hljs language-' + (langMap[ext] || 'plaintext');
      codeDisplay.textContent = displayContent;
      if (window.hljs) {
        try { window.hljs.highlightElement(codeDisplay); } catch(e) {}
      }
    }
    
    function refreshPreview() {
      previewFrame.src = previewFrame.src;
    }
    
    function openPreview() {
      window.open('/~observatory/preview', '_blank');
    }
    
    window.refreshPreview = refreshPreview;
    window.openPreview = openPreview;
    
    // Connect to SSE
    const es = new EventSource('/~observatory/events');
    
    es.onmessage = function(e) {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'reload' && msg.file) {
          const relPath = msg.file.replace(/^.*\//, '');
          addOrUpdateFile(relPath, '', true);
          showFile(relPath);
          
          writingIndicator.classList.add('active');
          statusText.textContent = 'Writing ' + relPath + '...';
          
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => {
            writingIndicator.classList.remove('active');
            statusText.textContent = 'Watching...';
            const file = files.get(relPath);
            if (file) file.element.classList.remove('writing');
            refreshPreview();
          }, 500);
        }
      } catch(_) {}
    };
    
    // Load initial file list
    fetch('/~observatory/status')
      .then(r => r.json())
      .then(data => {
        if (data.files) {
          data.files.forEach(f => addOrUpdateFile(f.name));
        }
      })
      .catch(() => {});
    
    addActivity('Connected to live construction feed');
  })();
  </script>
</body>
</html>`
}

function statusPage(projectDir: string, hasIndexHtml: boolean = false): string {
  currentWorkDir = projectDir
  const s = Observatory.getState()
  // Get files from current workDir for initial display
  const workDirFiles: string[] = []
  try {
    const checkPath = currentWorkDir || projectDir
    if (fs.existsSync(checkPath)) {
      const entries = fs.readdirSync(checkPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile()) {
          workDirFiles.push(path.join(checkPath, entry.name))
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  const filesToShow = workDirFiles.length > 0 ? workDirFiles : s.recentFiles
  const fileItems = filesToShow.length > 0
    ? filesToShow.map(f => {
        const name = path.basename(f)
        const ext = path.extname(f).slice(1) || "?"
        return `<li><span class="badge">${ext}</span><span class="file-name">${name}</span></li>`
      }).join("")
    : `<li class="empty">No files in this directory</li>`
  
  // Preview iframe - shows the actual website when index.html exists
  const previewSection = hasIndexHtml ? `
    <div class="label">Live Preview</div>
    <div class="preview-container" style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--bg-primary);">
      <iframe id="preview-frame" src="/~observatory/preview" style="width: 100%; height: 400px; border: none; display: block;"></iframe>
      <div class="preview-toolbar" style="display: flex; gap: 10px; padding: 10px 14px; background: var(--bg-card); border-top: 1px solid var(--border);">
        <button class="action-btn" onclick="document.getElementById('preview-frame').src='/~observatory/preview'">🔄 Refresh</button>
        <button class="action-btn" onclick="const f=document.getElementById('preview-frame'); f.style.height=(parseInt(f.style.height)+100)+'px'">➕ Larger</button>
        <button class="action-btn" onclick="const f=document.getElementById('preview-frame'); f.style.height=Math.max(200,parseInt(f.style.height)-100)+'px'">➖ Smaller</button>
        <a href="/~observatory/preview" target="_blank" class="action-btn" style="margin-left: auto;">↗️ Open in New Tab</a>
      </div>
    </div>
  ` : ''

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
      color: var(--text-secondary); margin-bottom: 12px;
      word-break: break-all;
    }

    /* Directory input */
    .dir-input-wrap {
      display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;
    }
    .dir-input {
      flex: 1; min-width: 200px;
      background: var(--bg-primary); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 14px;
      font-family: 'JetBrains Mono', monospace; font-size: .82rem;
      color: var(--text-primary);
      outline: none;
    }
    .dir-input:focus { border-color: var(--accent); }
    .dir-input::placeholder { color: var(--text-secondary); opacity: 0.6; }
    
    /* Directory browser */
    .dir-browser {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .dir-browser-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: .82rem;
      color: var(--text-secondary);
    }
    .dir-browser-list {
      max-height: 200px;
      overflow-y: auto;
    }
    .dir-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      font-size: .82rem;
      color: var(--text-secondary);
      cursor: pointer;
      border-bottom: 1px solid var(--border);
      transition: background .15s, color .15s;
    }
    .dir-item:last-child { border-bottom: none; }
    .dir-item:hover { 
      background: var(--bg-hover); 
      color: var(--text-primary);
    }
    .dir-item.folder::before { content: '📁'; }
    .dir-item.file::before { content: '📄'; }
    .dir-item.up::before { content: '🔙'; }

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

    <div class="label">Set Working Directory</div>
    
    <!-- Manual Path Input -->
    <div class="dir-input-wrap">
      <input type="text" class="dir-input" id="workdir-input" placeholder="Enter path manually..." />
      <button class="action-btn primary" id="set-manual-btn">Set Path</button>
    </div>
    
    <!-- Directory Browser -->
    <div class="dir-browser" id="dir-browser">
      <div class="dir-browser-header">
        <span id="current-path">${projectDir}</span>
        <button class="action-btn" id="select-dir-btn">✅ Select This Folder</button>
      </div>
      <div class="dir-browser-list" id="dir-list">
        <div class="dir-item" data-path="..">🔙 ..</div>
      </div>
    </div>
    <div class="action-result" id="workdir-result"></div>

    ${previewSection}

    <div class="label">Files written by the LLM</div>
    <ul id="files">${fileItems}</ul>

    <div class="divider"></div>

    <div class="actions">
      <a href="/~observatory/live" class="action-btn">🔴 Live Construction</a>
      <a href="/~observatory/replay" class="action-btn">🎬 Watch Replay</a>
      <button class="action-btn primary" id="move-btn">📁 Move to Original Location</button>
    </div>
    <div class="action-result" id="move-result"></div>

    <div class="divider"></div>

    <p class="hint">
      This page updates live as files are written. The preview above shows your website
      in real-time as the AI builds it. Use the replay button to watch the construction
      process again.
    </p>
  </div>

  ${LIVE_RELOAD_SCRIPT}

  <script>
    // ── Dynamic project directory (updated from status) ───────────────────────
    var currentProjectDir = ${JSON.stringify(projectDir)};
    
    // ── Manual Path Input ────────────────────────────────────────────────────
    document.getElementById('set-manual-btn').addEventListener('click', function() {
      var input = document.getElementById('workdir-input');
      var result = document.getElementById('workdir-result');
      var btn = this;
      var newDir = input.value.trim();
      
      if (!newDir) {
        result.style.display = 'block';
        result.style.color = 'var(--error)';
        result.textContent = 'Please enter a directory path';
        return;
      }
      
      btn.disabled = true;
      btn.textContent = '⏳ Setting...';
      
      fetch('/~observatory/set-workdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDir: newDir })
      })
        .then(function(r) {
          if (!r.ok) {
            return r.text().then(function(text) {
              throw new Error('Server error: ' + text);
            });
          }
          return r.json();
        })
        .then(function(d) {
          result.style.display = 'block';
          if (d.success) {
            result.style.color = 'var(--success)';
            result.textContent = d.message || 'Working directory updated successfully';
            currentProjectDir = newDir;
            var projDirEl = document.getElementById('project-dir');
            if (projDirEl) projDirEl.textContent = newDir;
            // Refresh browser to new path
            browserCurrentPath = newDir;
            loadDirectory(newDir);
          } else {
            result.style.color = 'var(--error)';
            result.textContent = d.message || 'Failed to update working directory';
          }
          btn.disabled = false;
          btn.textContent = 'Set Path';
        })
        .catch(function(err) {
          btn.disabled = false;
          btn.textContent = 'Set Path';
          result.style.display = 'block';
          result.style.color = 'var(--error)';
          result.textContent = 'Error: ' + String(err);
        });
    });
    
    // Allow Enter key on input
    document.getElementById('workdir-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('set-manual-btn').click();
      }
    });
    
    // ── Directory Browser ────────────────────────────────────────────────────
    var browserCurrentPath = currentProjectDir;
    
    function loadDirectory(path) {
      var list = document.getElementById('dir-list');
      var header = document.getElementById('current-path');
      list.innerHTML = '<div class="dir-item">⏳ Loading...</div>';
      
      fetch('/~observatory/browse?path=' + encodeURIComponent(path))
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (!d.success) {
            list.innerHTML = '<div class="dir-item" style="color:var(--error)">Error: ' + (d.message || 'Failed to load') + '</div>';
            return;
          }
          browserCurrentPath = d.path;
          header.textContent = d.path;
          
          var html = '';
          // Add ".." entry if not at root
          if (d.parent !== null) {
            html += '<div class="dir-item up" data-path="' + d.parent + '">🔙 ..</div>';
          }
          // Add folders
          if (d.folders && d.folders.length > 0) {
            d.folders.forEach(function(folder) {
              html += '<div class="dir-item folder" data-path="' + folder.path + '">' + folder.name + '</div>';
            });
          }
          // Add files (disabled)
          if (d.files && d.files.length > 0) {
            d.files.slice(0, 20).forEach(function(file) {
              html += '<div class="dir-item file" style="opacity:0.5;cursor:not-allowed">' + file.name + '</div>';
            });
            if (d.files.length > 20) {
              html += '<div class="dir-item" style="opacity:0.5">... and ' + (d.files.length - 20) + ' more files</div>';
            }
          }
          if (html === '') {
            html = '<div class="dir-item" style="opacity:0.5">Empty directory</div>';
          }
          list.innerHTML = html;
          
          // Add click handlers
          list.querySelectorAll('.dir-item:not(.file)').forEach(function(item) {
            item.addEventListener('click', function() {
              var newPath = this.dataset.path;
              if (newPath) loadDirectory(newPath);
            });
          });
        })
        .catch(function(err) {
          list.innerHTML = '<div class="dir-item" style="color:var(--error)">Error: ' + String(err) + '</div>';
        });
    }
    
    // Load initial directory
    loadDirectory(browserCurrentPath);
    
    // Select directory button
    document.getElementById('select-dir-btn').addEventListener('click', function() {
      var btn = this;
      var result = document.getElementById('workdir-result');
      
      btn.disabled = true;
      btn.textContent = '⏳ Setting...';
      
      fetch('/~observatory/set-workdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDir: browserCurrentPath })
      })
        .then(function(r) {
          if (!r.ok) {
            return r.text().then(function(text) {
              throw new Error(text || 'Server returned ' + r.status);
            });
          }
          return r.json();
        })
        .then(function(d) {
          result.style.display = 'block';
          if (d.success) {
            result.style.color = 'var(--success)';
            result.textContent = d.message || 'Working directory updated successfully';
            currentProjectDir = browserCurrentPath;
            var projDirEl = document.getElementById('project-dir');
            if (projDirEl) projDirEl.textContent = browserCurrentPath;
          } else {
            result.style.color = 'var(--error)';
            result.textContent = d.message || 'Failed to update working directory';
          }
          btn.disabled = false;
          btn.textContent = '✅ Select This Folder';
        })
        .catch(function(err) {
          btn.disabled = false;
          btn.textContent = '✅ Select This Folder';
          result.style.display = 'block';
          result.style.color = 'var(--error)';
          result.textContent = 'Error: ' + String(err);
        });
    });
    
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
          // Update file list - use workDirFiles if available, fall back to recentFiles
          var ul = document.getElementById('files');
          var filesToShow = d.workDirFiles || d.recentFiles || [];
          if (ul) {
            if (filesToShow.length > 0) {
              ul.innerHTML = filesToShow.map(function(f) {
                var name = f.split('/').pop();
                var ext  = (name.split('.').pop() || '?').toLowerCase();
                return '<li><span class="badge">' + ext + '</span><span class="file-name">' + name + '</span></li>';
              }).join('');
            } else {
              ul.innerHTML = '<li class="empty">No files in this directory yet</li>';
            }
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

  // Initialize current working directory
  currentWorkDir = workDir

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
          (async () => {
            const state = Observatory.getState()
            // Use the current working directory (which may have been updated via API)
            const effectiveWorkDir = currentWorkDir || workDir
            
            // Get files from the working directory (not just LIVE_VIEW_DIR)
            const workDirFiles: string[] = []
            try {
              const workDirPath = effectiveWorkDir
              if (fs.existsSync(workDirPath)) {
                const entries = await fs.promises.readdir(workDirPath, { withFileTypes: true })
                for (const entry of entries) {
                  if (entry.isFile()) {
                    workDirFiles.push(path.join(workDirPath, entry.name))
                  }
                }
              }
            } catch (e) {
              // Ignore errors reading workDir
            }
            
            const statusWithDir = {
              ...state,
              projectDir: state.projectDir || effectiveWorkDir,
              liveViewDir: LIVE_VIEW_DIR,
              workDirFiles,
            }
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
            res.end(JSON.stringify(statusWithDir))
          })()
          return
        }

        if (url === "/~observatory/replay") {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(replayPage())
          return
        }

        if (url === "/~observatory/live") {
          res.writeHead(200, { "Content-Type": "text/html" })
          res.end(liveConstructionPage())
          return
        }

        if (url === "/~observatory/status") {
          // Return JSON status for live construction page
          const recordingPath = path.join(LIVE_VIEW_DIR, ".sahya-replay.json")
          fs.readFile(recordingPath, (err, data) => {
            const recording = err ? [] : JSON.parse(data.toString())
            const files: Array<{name: string, path: string}> = []
            
            try {
              if (fs.existsSync(LIVE_VIEW_DIR)) {
                const entries = fs.readdirSync(LIVE_VIEW_DIR, { withFileTypes: true })
                for (const entry of entries) {
                  if (entry.isFile() && entry.name !== ".sahya-replay.json") {
                    files.push({ name: entry.name, path: path.join(LIVE_VIEW_DIR, entry.name) })
                  }
                }
              }
            } catch (e) {}
            
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
            res.end(JSON.stringify({ 
              files, 
              recording,
              projectDir: currentWorkDir 
            }))
          })
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
              const target = parsed.target || currentWorkDir

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

        if (url.startsWith("/~observatory/browse") && method === "GET") {
          (async () => {
            try {
              const urlObj = new URL(req.url || "/", `http://${req.headers.host}`)
              const browsePath = urlObj.searchParams.get("path") || currentWorkDir || workDir || "/"
              
              // Resolve and validate path
              const resolvedPath = path.resolve(browsePath)
              const stats = await fs.promises.stat(resolvedPath)
              
              if (!stats.isDirectory()) {
                res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
                res.end(JSON.stringify({ success: false, message: "Path is not a directory" }))
                return
              }

              // Read directory contents
              const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true })
              
              const folders: Array<{ name: string; path: string }> = []
              const files: Array<{ name: string; path: string }> = []
              
              for (const entry of entries) {
                const entryPath = path.join(resolvedPath, entry.name)
                if (entry.isDirectory()) {
                  folders.push({ name: entry.name, path: entryPath })
                } else {
                  files.push({ name: entry.name, path: entryPath })
                }
              }
              
              // Sort alphabetically
              folders.sort((a, b) => a.name.localeCompare(b.name))
              files.sort((a, b) => a.name.localeCompare(b.name))
              
              const parent = path.dirname(resolvedPath) === resolvedPath ? null : path.dirname(resolvedPath)
              
              res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end(JSON.stringify({
                success: true,
                path: resolvedPath,
                parent,
                folders,
                files,
              }))
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end(JSON.stringify({ success: false, message: String(err) }))
            }
          })()
          return
        }

        // Handle CORS preflight
        if (method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          })
          res.end()
          return
        }

        if (url === "/~observatory/set-workdir" && method === "POST") {
          let body = ""
          req.on("data", (chunk) => { body += chunk.toString() })
          req.on("end", async () => {
            try {
              const parsed = JSON.parse(body) as { workDir?: string }
              const newWorkDir = parsed.workDir

              if (!newWorkDir) {
                res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
                res.end(JSON.stringify({ success: false, message: "No working directory provided" }))
                return
              }

              // Validate the directory exists
              try {
                const stats = await fs.promises.stat(newWorkDir)
                if (!stats.isDirectory()) {
                  res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
                  res.end(JSON.stringify({ success: false, message: "Path is not a directory" }))
                  return
                }
              } catch (err) {
                res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
                res.end(JSON.stringify({ success: false, message: "Directory does not exist or is not accessible" }))
                return
              }

              // Update the current working directory
              currentWorkDir = newWorkDir

              // Update Observatory state
              Observatory.updateProjectDir(newWorkDir)

              res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end(JSON.stringify({ success: true, message: `Working directory set to: ${newWorkDir}` }))
            } catch (err) {
              res.writeHead(500, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
              res.end(JSON.stringify({ success: false, message: String(err) }))
            }
          })
          return
        }

        // ── Serve project files from LIVE_VIEW_DIR ─────────────────────────
        const filePath = path.join(LIVE_VIEW_DIR, url === "/" ? "index.html" : url)

        // Special handler for preview iframe - serves raw index.html without status page wrapper
        if (url === "/~observatory/preview") {
          const indexPath = path.join(LIVE_VIEW_DIR, "index.html")
          fs.readFile(indexPath, (err, data) => {
            if (err) {
              res.writeHead(404, { "Content-Type": "text/html" })
              res.end("<html><body style='background:#0d0d0d;color:#888;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;'>No index.html yet</body></html>")
              return
            }
            let html = data.toString("utf8")
            html = html.includes("</body>")
              ? html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`)
              : html + LIVE_RELOAD_SCRIPT
            res.writeHead(200, { "Content-Type": "text/html" })
            res.end(html)
          })
          return
        }

        fs.readFile(filePath, (err, data) => {
          if (err) {
            // No index.html yet — show the status/waiting page
            if (url === "/" || url === "/index.html") {
              res.writeHead(200, { "Content-Type": "text/html" })
              res.end(statusPage(currentWorkDir || workDir, false))
              return
            }
            res.writeHead(404, { "Content-Type": "text/plain" })
            res.end("Not found")
            return
          }

          // If requesting root and index.html exists, show status page with preview iframe
          if (url === "/" || url === "/index.html") {
            res.writeHead(200, { "Content-Type": "text/html" })
            res.end(statusPage(currentWorkDir || workDir, true))
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
