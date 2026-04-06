import { createSignal, onMount, onCleanup, Show, For } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions, useKeyboard } from "@opentui/solid"
import { useKeybind } from "@tui/context/keybind"
import { Observatory } from "@/observatory"
import { Log } from "@/util/log"
import { Instance } from "@/project/instance"
import http from "http"
import fs from "fs"
import path from "path"

const log = Log.create({ service: "observatory.route" })

// SSE client list for live reload
const sseClients = new Set<http.ServerResponse>()

function broadcastReload(file: string) {
  const data = JSON.stringify({ type: "reload", file })
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`)
    } catch {
      sseClients.delete(client)
    }
  }
}

// Injected into HTML files so the browser auto-reloads when Observatory detects a file change
const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  var src = new EventSource('/observatory-events');
  src.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'reload') {
        console.log('[Observatory] File changed:', msg.file, '— reloading...');
        location.reload();
      }
    } catch(err) {}
  };
  src.onerror = function() {
    setTimeout(function() { location.reload(); }, 2000);
  };
  console.log('[Observatory] Live reload connected.');
})();
</script>
`

export function ObservatoryRoute() {
  const route = useRouteData("observatory")
  const routeCtx = useRoute()
  const { theme } = useTheme()
  const keybind = useKeybind()
  const dimensions = useTerminalDimensions()

  const [state, setState] = createSignal(Observatory.getState())
  const [browserUrl, setBrowserUrl] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let interval: ReturnType<typeof setInterval> | null = null
  let server: http.Server | null = null
  let unsubscribeFileChange: (() => void) | null = null
  let port = 3456

  const handleExit = () => {
    log.info("Exiting observatory")
    Observatory.disable()

    if (server) {
      server.close()
      server = null
    }

    if (interval) {
      clearInterval(interval)
      interval = null
    }

    if (unsubscribeFileChange) {
      unsubscribeFileChange()
      unsubscribeFileChange = null
    }

    sseClients.clear()
    routeCtx.navigate({ type: "home" })
  }

  onMount(() => {
    log.info("Observatory mounted")
    Observatory.enable()

    interval = setInterval(() => {
      setState(Observatory.getState())
    }, 200)

    // Subscribe to file changes and broadcast to SSE clients
    unsubscribeFileChange = Observatory.onFileChanged((file) => {
      broadcastReload(file)
    })

    startServer()
  })

  onCleanup(() => {
    log.info("Observatory cleanup")
    Observatory.disable()
    if (server) server.close()
    if (interval) clearInterval(interval)
    if (unsubscribeFileChange) unsubscribeFileChange()
    sseClients.clear()
  })

  useKeyboard((evt) => {
    if (evt.name === "q" || evt.name === "Q") {
      log.info("Exit key pressed (q)")
      handleExit()
      return
    }
    if (evt.name === "escape" || keybind.match("app_exit", evt)) {
      log.info("Exit key pressed (escape/app_exit)")
      handleExit()
      return
    }
  }, {})

  const startServer = async () => {
    const workDir = Instance.worktree || process.cwd()

    try {
      server = http.createServer((req, res) => {
        const url = req.url || "/"

        // SSE endpoint for live reload
        if (url === "/observatory-events") {
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

        // JSON status endpoint
        if (url === "/observatory-status") {
          const s = Observatory.getState()
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(s))
          return
        }

        // Serve files from the project working directory
        const filePath = path.join(workDir, url === "/" ? "index.html" : url)

        fs.readFile(filePath, (err, data) => {
          if (err) {
            if (url === "/" || url === "/index.html") {
              // No index.html yet — show a status page with live reload
              const s = Observatory.getState()
              const fileList = s.recentFiles.length > 0
                ? s.recentFiles.map(f => `<li>${path.relative(workDir, f)}</li>`).join("")
                : "<li>No files written yet...</li>"
              res.writeHead(200, { "Content-Type": "text/html" })
              res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Observatory — Live Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    .accent { color: #ff6b2b; }
    .status { display: flex; align-items: center; gap: 8px; margin: 16px 0; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #3fb950; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .section { margin-top: 20px; }
    .section h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #8b949e; margin-bottom: 8px; }
    ul { list-style: none; }
    ul li { padding: 4px 0; font-size: 0.9rem; color: #8b949e; border-bottom: 1px solid #21262d; }
    ul li:last-child { border-bottom: none; }
    .task { background: #1f2937; border-left: 3px solid #ff6b2b; padding: 8px 12px; border-radius: 4px; font-size: 0.9rem; margin-top: 8px; }
    .hint { color: #8b949e; font-size: 0.8rem; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔭 <span class="accent">Observatory</span> — Live Preview</h1>
    <div class="status">
      <div class="dot"></div>
      <span>Waiting for the LLM to write files...</span>
    </div>
    <div class="section">
      <h2>Working directory</h2>
      <div class="task">${workDir}</div>
    </div>
    <div class="section">
      <h2>Recent files written</h2>
      <ul id="files">${fileList}</ul>
    </div>
    <p class="hint">This page will automatically reload when the LLM writes an <code>index.html</code>.</p>
  </div>
  ${LIVE_RELOAD_SCRIPT}
  <script>
    // Also poll status and update file list
    setInterval(async () => {
      try {
        const r = await fetch('/observatory-status');
        const d = await r.json();
        const ul = document.getElementById('files');
        if (ul && d.recentFiles && d.recentFiles.length > 0) {
          ul.innerHTML = d.recentFiles.map(f => '<li>' + f.split('/').pop() + '</li>').join('');
        }
      } catch(e) {}
    }, 1000);
  </script>
</body>
</html>`)
              return
            }
            res.writeHead(404)
            res.end("Not found")
            return
          }

          const ext = path.extname(filePath).toLowerCase()
          const contentTypes: Record<string, string> = {
            ".html": "text/html",
            ".htm": "text/html",
            ".js": "application/javascript",
            ".mjs": "application/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
          }
          const contentType = contentTypes[ext] || "text/plain"

          res.writeHead(200, { "Content-Type": contentType })

          // Inject live-reload script into HTML responses
          if (ext === ".html" || ext === ".htm") {
            let html = data.toString("utf8")
            if (html.includes("</body>")) {
              html = html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`)
            } else {
              html += LIVE_RELOAD_SCRIPT
            }
            res.end(html)
          } else {
            res.end(data)
          }
        })
      })

      server.listen(port, () => {
        log.info(`Observatory server started on port ${port}`)
        setBrowserUrl(`http://localhost:${port}`)
      })

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          port++
          server?.listen(port)
        } else {
          log.error("Server error", { err })
          setError(`Server error: ${(err as Error).message}`)
        }
      })
    } catch (err) {
      log.error("Failed to start server", { err })
      setError(`Failed to start server: ${err}`)
    }
  }

  return (
    <box flexDirection="column" width="100%" height="100%" padding={1}>
      {/* Header */}
      <box flexDirection="row" marginBottom={1}>
        <text fg={theme.accent}>
          <b>🔭 Observatory — Live Preview</b>
        </text>
        <box flexGrow={1} />
        <text fg={theme.textMuted}>
          Press 'q' or Esc to exit
        </text>
      </box>

      <Show when={error()}>
        <box backgroundColor={theme.error} padding={1} marginBottom={1}>
          <text fg="#fff">Error: {error()}</text>
        </box>
      </Show>

      {/* Status Bar */}
      <box
        flexDirection="row"
        backgroundColor={theme.backgroundPanel}
        padding={1}
        marginBottom={1}
        borderStyle="rounded"
      >
        <text>Status: </text>
        <text fg={state().status === "running" ? theme.success : theme.text}>
          {state().status.toUpperCase()}
        </text>
        <box flexGrow={1} />
        <text>Files written: {state().recentFiles.length}</text>
      </box>

      {/* Current Task */}
      <Show when={state().currentTask}>
        <box flexDirection="column" marginBottom={1} borderStyle="rounded" padding={1}>
          <text fg={theme.accent}><b>Current task:</b></text>
          <text>{state().currentTask}</text>
        </box>
      </Show>

      {/* Recent Files Written */}
      <box flexDirection="column" marginBottom={1} borderStyle="rounded" padding={1} flexGrow={1}>
        <text marginBottom={1}><b>Files written by LLM ({state().recentFiles.length}):</b></text>
        <Show
          when={state().recentFiles.length > 0}
          fallback={<text fg={theme.textMuted}>No files written yet. Agent will appear here when it starts building.</text>}
        >
          <For each={state().recentFiles.slice(0, 8)}>
            {(file, i) => (
              <text fg={i() === 0 ? theme.success : theme.textMuted}>
                {i() === 0 ? "▶ " : "  "}{file.split("/").pop() || file}
              </text>
            )}
          </For>
        </Show>
      </box>

      {/* Recent Activity */}
      <box flexDirection="column" marginBottom={1} borderStyle="rounded" padding={1}>
        <text marginBottom={1}><b>Recent activity ({state().thoughts.length}):</b></text>
        <Show
          when={state().thoughts.length > 0}
          fallback={<text fg={theme.textMuted}>No activity yet...</text>}
        >
          <For each={state().thoughts.slice(0, 5)}>
            {(thought, i) => (
              <text fg={i() === 0 ? theme.text : theme.textMuted}>
                • {thought.length > 70 ? thought.substring(0, 70) + "..." : thought}
              </text>
            )}
          </For>
        </Show>
      </box>

      {/* Browser Preview URL */}
      <Show when={browserUrl()}>
        <box flexDirection="row" marginTop={1} padding={1} borderStyle="rounded">
          <text>Browser preview (live reload): </text>
          <text fg={theme.accent}>{browserUrl()}</text>
          <box flexGrow={1} />
          <text fg={theme.textMuted}>(auto-refreshes on file change)</text>
        </box>
      </Show>
    </box>
  )
}
