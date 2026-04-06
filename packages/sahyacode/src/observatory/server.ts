import http from "http"
import fs from "fs"
import path from "path"
import { Observatory } from "./index"
import { Log } from "../util/log"

const log = Log.create({ service: "observatory.server" })

const sseClients = new Set<http.ServerResponse>()

const LIVE_RELOAD_SCRIPT = `<script>
(function() {
  var es = new EventSource('/~observatory/events');
  es.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'reload') {
        console.log('[Observatory] reloading – file changed:', msg.file);
        location.reload();
      }
    } catch(_) {}
  };
  es.onerror = function() { setTimeout(function() { location.reload(); }, 2000); };
})();
</script>`

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".cjs": "application/javascript",
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

function statusPage(workDir: string): string {
  const s = Observatory.getState()
  const fileItems = s.recentFiles.length > 0
    ? s.recentFiles.map(f => {
        const rel = path.relative(workDir, f)
        return `<li><span class="badge">${path.extname(f).slice(1) || "?"}</span>${rel}</li>`
      }).join("")
    : `<li class="empty">Waiting for the LLM to write files…</li>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Observatory — Live Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --accent: #ff6b2b; --muted: #8b949e; --text: #e6edf3;
      --green: #3fb950; --radius: 10px;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text);
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 32px 16px;
    }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 32px;
      max-width: 560px; width: 100%;
    }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo { font-size: 1.8rem; }
    h1 { font-size: 1.3rem; font-weight: 700; }
    h1 span { color: var(--accent); }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(63,185,80,.12); border: 1px solid rgba(63,185,80,.25);
      border-radius: 999px; padding: 3px 10px; font-size: .78rem;
      color: var(--green); margin-bottom: 20px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green);
           animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
    .label { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em;
             color: var(--muted); margin-bottom: 6px; }
    .dir { background: #0d1117; border: 1px solid var(--border); border-radius: 6px;
           padding: 8px 12px; font-family: monospace; font-size: .85rem;
           color: var(--muted); margin-bottom: 20px; word-break: break-all; }
    ul { list-style: none; }
    ul li { display: flex; align-items: center; gap: 8px;
            padding: 6px 0; border-bottom: 1px solid var(--border);
            font-size: .88rem; color: var(--muted); }
    ul li:last-child { border-bottom: none; }
    ul li.empty { color: var(--muted); font-style: italic; }
    .badge { background: var(--border); border-radius: 4px; padding: 1px 5px;
             font-size: .7rem; color: var(--text); font-family: monospace; flex-shrink: 0; }
    .hint { margin-top: 20px; font-size: .78rem; color: var(--muted); line-height: 1.5; }
    .hint code { background: var(--border); border-radius: 3px; padding: 1px 4px;
                  font-size: .8rem; }
    #task { margin-bottom: 16px; }
    .task-box { border-left: 3px solid var(--accent); background: #1a1a2e;
                padding: 8px 12px; border-radius: 4px; font-size: .88rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">🔭</div>
      <h1><span>Observatory</span> — Live Preview</h1>
    </div>
    <div class="pill"><div class="dot"></div> Connected — waiting for activity</div>

    <div id="task" style="display:none">
      <div class="label">Current task</div>
      <div class="task-box" id="task-text"></div>
    </div>

    <div class="label">Working directory</div>
    <div class="dir">${workDir}</div>

    <div class="label">Files written by the LLM</div>
    <ul id="files">${fileItems}</ul>

    <p class="hint">
      This page auto-reloads the moment the LLM writes an <code>index.html</code>.<br>
      Every subsequent file edit also triggers an instant refresh.
    </p>
  </div>

  ${LIVE_RELOAD_SCRIPT}

  <script>
    (function poll() {
      fetch('/~observatory/status')
        .then(r => r.json())
        .then(function(d) {
          // Update file list
          var ul = document.getElementById('files');
          if (ul && d.recentFiles && d.recentFiles.length > 0) {
            ul.innerHTML = d.recentFiles.map(function(f) {
              var name = f.split('/').pop();
              var ext  = (name.split('.').pop() || '?').toLowerCase();
              return '<li><span class="badge">' + ext + '</span>' + name + '</li>';
            }).join('');
          }
          // Update task
          var taskDiv  = document.getElementById('task');
          var taskText = document.getElementById('task-text');
          if (taskDiv && taskText) {
            if (d.currentTask) {
              taskDiv.style.display = 'block';
              taskText.textContent   = d.currentTask;
            } else {
              taskDiv.style.display = 'none';
            }
          }
        })
        .catch(function(){})
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

        // ── Observatory internal endpoints (prefixed so they never clash with project files)
        if (url === "/~observatory/events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          })
          res.write(": connected\n\n")
          sseClients.add(res)
          req.on("close", () => sseClients.delete(res))
          return
        }

        if (url === "/~observatory/status") {
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
          res.end(JSON.stringify(Observatory.getState()))
          return
        }

        // ── Serve project files ──────────────────────────────────────────────
        const filePath = path.join(workDir, url === "/" ? "index.html" : url)

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
        log.info("Observatory server started", { port, workDir })
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
