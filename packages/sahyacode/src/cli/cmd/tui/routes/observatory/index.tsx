import { createSignal, onMount, onCleanup, Show, For, createMemo } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions, useKeyboard } from "@opentui/solid"
import { useKeybind } from "@tui/context/keybind"
import { useSync } from "@tui/context/sync"
import { Observatory } from "@/observatory"
import { Log } from "@/util/log"
import { Instance } from "@/project/instance"
import { Prompt } from "@tui/component/prompt"
import type { PromptRef } from "@tui/component/prompt"
import http from "http"
import fs from "fs"
import path from "path"
import type { Message, Part } from "@opencode-ai/sdk/v2"

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

const LIVE_RELOAD_SCRIPT = `
<script>
(function() {
  var src = new EventSource('/observatory-events');
  src.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'reload') { location.reload(); }
    } catch(err) {}
  };
  src.onerror = function() { setTimeout(function() { location.reload(); }, 2000); };
})();
</script>
`

const CHAT_SIDEBAR_WIDTH = 44

export function ObservatoryRoute() {
  const route = useRouteData("observatory")
  const routeCtx = useRoute()
  const { theme } = useTheme()
  const keybind = useKeybind()
  const dimensions = useTerminalDimensions()
  const sync = useSync()

  // Resolve sessionID: from route, or fall back to the most recently active session
  const sessionID = createMemo(() => {
    if (route.sessionID) return route.sessionID
    const sessions = sync.data.session
    const active = sessions.find((s) => !s.time.archived)
    return active?.id
  })

  const messages = createMemo(() => {
    const sid = sessionID()
    if (!sid) return []
    return sync.data.message[sid] ?? []
  })

  // Only show the last N visible (non-synthetic) messages so the sidebar doesn't overflow
  const visibleMessages = createMemo(() => {
    return messages()
      .filter((m) => {
        const parts: Part[] = sync.data.part[m.id] ?? []
        return parts.some((p) => p.type === "text" && !(p as any).synthetic && !(p as any).ignored && (p as any).text?.trim())
      })
      .slice(-8)
  })

  const isBusy = createMemo(() => {
    const sid = sessionID()
    if (!sid) return false
    const status = sync.data.session_status?.[sid]
    return status?.type === "busy"
  })

  const [obsState, setObsState] = createSignal(Observatory.getState())
  const [browserUrl, setBrowserUrl] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let interval: ReturnType<typeof setInterval> | null = null
  let server: http.Server | null = null
  let unsubscribeFileChange: (() => void) | null = null
  let promptRef: PromptRef
  let port = 3456

  const handleExit = () => {
    log.info("Exiting observatory")
    Observatory.disable()
    if (server) { server.close(); server = null }
    if (interval) { clearInterval(interval); interval = null }
    if (unsubscribeFileChange) { unsubscribeFileChange(); unsubscribeFileChange = null }
    sseClients.clear()
    routeCtx.navigate({ type: "home" })
  }

  onMount(() => {
    log.info("Observatory mounted", { sessionID: sessionID() })
    Observatory.enable()
    interval = setInterval(() => setObsState(Observatory.getState()), 200)
    unsubscribeFileChange = Observatory.onFileChanged((file) => broadcastReload(file))
    startServer()
  })

  onCleanup(() => {
    Observatory.disable()
    if (server) server.close()
    if (interval) clearInterval(interval)
    if (unsubscribeFileChange) unsubscribeFileChange()
    sseClients.clear()
  })

  useKeyboard((evt) => {
    if (evt.name === "q" || evt.name === "Q") {
      handleExit()
      return
    }
    if (evt.name === "escape" || keybind.match("app_exit", evt)) {
      handleExit()
      return
    }
  }, {})

  const startServer = async () => {
    const workDir = Instance.worktree || process.cwd()
    try {
      server = http.createServer((req, res) => {
        const url = req.url || "/"

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

        if (url === "/observatory-status") {
          const s = Observatory.getState()
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(s))
          return
        }

        const filePath = path.join(workDir, url === "/" ? "index.html" : url)
        fs.readFile(filePath, (err, data) => {
          if (err) {
            if (url === "/" || url === "/index.html") {
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
    <div class="status"><div class="dot"></div><span>Waiting for the LLM to write files...</span></div>
    <div class="section"><h2>Working directory</h2><div class="task">${workDir}</div></div>
    <div class="section"><h2>Recent files written</h2><ul id="files">${fileList}</ul></div>
    <p class="hint">This page will automatically reload when the LLM writes an <code>index.html</code>.</p>
  </div>
  ${LIVE_RELOAD_SCRIPT}
  <script>
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
            ".html": "text/html", ".htm": "text/html",
            ".js": "application/javascript", ".mjs": "application/javascript",
            ".css": "text/css", ".json": "application/json",
            ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
            ".woff": "font/woff", ".woff2": "font/woff2",
          }
          const contentType = contentTypes[ext] || "text/plain"
          res.writeHead(200, { "Content-Type": contentType })
          if (ext === ".html" || ext === ".htm") {
            let html = data.toString("utf8")
            html = html.includes("</body>") ? html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`) : html + LIVE_RELOAD_SCRIPT
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
        if (err.code === "EADDRINUSE") { port++; server?.listen(port) }
        else { log.error("Server error", { err }); setError(`Server error: ${(err as Error).message}`) }
      })
    } catch (err) {
      log.error("Failed to start server", { err })
      setError(`Failed to start server: ${err}`)
    }
  }

  // Extract the first non-synthetic, non-ignored text from a message's parts
  function messagePreview(message: Message): string {
    const parts: Part[] = sync.data.part[message.id] ?? []
    for (const part of parts) {
      if (part.type !== "text") continue
      const p = part as any
      if (p.synthetic || p.ignored) continue
      const text = (p.text as string | undefined)?.trim()
      if (text) return text
    }
    return ""
  }

  const leftWidth = createMemo(() => Math.max(30, dimensions().width - CHAT_SIDEBAR_WIDTH - 1))

  return (
    <box flexDirection="row" width="100%" height="100%">

      {/* ── LEFT: Observatory monitoring panel ── */}
      <box flexDirection="column" width={leftWidth()} height="100%" padding={1}>

        {/* Header */}
        <box flexDirection="row" marginBottom={1}>
          <text fg={theme.accent}><b>🔭 Observatory</b></text>
          <box flexGrow={1} />
          <text fg={theme.textMuted}>q/Esc to exit</text>
        </box>

        <Show when={error()}>
          <box backgroundColor={theme.error} padding={1} marginBottom={1}>
            <text fg="#fff">Error: {error()}</text>
          </box>
        </Show>

        {/* Status bar */}
        <box
          flexDirection="row"
          backgroundColor={theme.backgroundPanel}
          padding={1}
          marginBottom={1}
          borderStyle="rounded"
        >
          <text>Status: </text>
          <text fg={obsState().status === "running" ? theme.success : theme.text}>
            {obsState().status.toUpperCase()}
          </text>
          <box flexGrow={1} />
          <text fg={theme.textMuted}>Files: {obsState().recentFiles.length}</text>
        </box>

        {/* Current task */}
        <Show when={obsState().currentTask}>
          <box borderStyle="rounded" padding={1} marginBottom={1}>
            <text fg={theme.accent}><b>Task:</b></text>
            <text fg={theme.textMuted}>
              {" "}{(obsState().currentTask ?? "").length > leftWidth() - 10
                ? (obsState().currentTask ?? "").substring(0, leftWidth() - 13) + "..."
                : obsState().currentTask}
            </text>
          </box>
        </Show>

        {/* Files written */}
        <box flexDirection="column" borderStyle="rounded" padding={1} marginBottom={1}>
          <text marginBottom={1}><b>Files written ({obsState().recentFiles.length}):</b></text>
          <Show
            when={obsState().recentFiles.length > 0}
            fallback={<text fg={theme.textMuted}>Waiting for LLM to write files...</text>}
          >
            <For each={obsState().recentFiles.slice(0, 6)}>
              {(file, i) => (
                <text fg={i() === 0 ? theme.success : theme.textMuted}>
                  {i() === 0 ? "▶ " : "  "}{file.split("/").pop() || file}
                </text>
              )}
            </For>
          </Show>
        </box>

        {/* Recent activity */}
        <box flexDirection="column" borderStyle="rounded" padding={1} flexGrow={1}>
          <text marginBottom={1}><b>Activity:</b></text>
          <Show
            when={obsState().thoughts.length > 0}
            fallback={<text fg={theme.textMuted}>No activity yet...</text>}
          >
            <For each={obsState().thoughts.slice(0, 5)}>
              {(thought, i) => (
                <text fg={i() === 0 ? theme.text : theme.textMuted}>
                  {"• "}{thought.length > leftWidth() - 4
                    ? thought.substring(0, leftWidth() - 7) + "..."
                    : thought}
                </text>
              )}
            </For>
          </Show>
        </box>

        {/* Browser URL */}
        <Show when={browserUrl()}>
          <box flexDirection="column" marginTop={1} padding={1} borderStyle="rounded">
            <text fg={theme.textMuted}>Browser (live reload):</text>
            <text fg={theme.accent}>{browserUrl()}</text>
          </box>
        </Show>
      </box>

      {/* Vertical divider */}
      <box width={1} height="100%" backgroundColor={theme.border} />

      {/* ── RIGHT: Chat sidebar ── */}
      <box
        flexDirection="column"
        width={CHAT_SIDEBAR_WIDTH}
        height="100%"
        backgroundColor={theme.backgroundPanel}
      >
        {/* Chat header */}
        <box
          flexDirection="row"
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          borderStyle="rounded"
        >
          <text fg={theme.accent}><b>💬 Chat</b></text>
          <box flexGrow={1} />
          <Show when={isBusy()}>
            <text fg={theme.warning}>thinking...</text>
          </Show>
          <Show when={!sessionID()}>
            <text fg={theme.textMuted}>no session</text>
          </Show>
        </box>

        {/* Messages list */}
        <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1} overflow="hidden">
          <Show
            when={visibleMessages().length > 0}
            fallback={
              <box flexGrow={1} justifyContent="center" alignItems="center">
                <text fg={theme.textMuted}>No messages yet.</text>
                <text fg={theme.textMuted}>Send one below!</text>
              </box>
            }
          >
            <For each={visibleMessages()}>
              {(message) => {
                const isUser = message.role === "user"
                const preview = messagePreview(message)
                if (!preview) return <></>
                const maxLen = CHAT_SIDEBAR_WIDTH - 6
                const lines: string[] = []
                let remaining = preview.replace(/\n+/g, " ").trim()
                while (remaining.length > 0) {
                  lines.push(remaining.substring(0, maxLen))
                  remaining = remaining.substring(maxLen)
                  if (lines.length >= 3) {
                    if (remaining.length > 0) lines[2] = lines[2].substring(0, maxLen - 3) + "..."
                    break
                  }
                }
                return (
                  <box flexDirection="column" marginBottom={1}>
                    <text fg={isUser ? theme.accent : theme.success}>
                      {isUser ? "You" : "AI"}
                    </text>
                    <For each={lines}>
                      {(line) => <text fg={isUser ? theme.text : theme.textMuted}>{line}</text>}
                    </For>
                  </box>
                )
              }}
            </For>
          </Show>
        </box>

        {/* Prompt input — full featured, sends to the active session */}
        <Show when={sessionID()}>
          <box borderStyle="rounded" marginLeft={0} marginRight={0}>
            <Prompt
              sessionID={sessionID()}
              ref={(r) => { promptRef = r }}
              onSubmit={() => {}}
              showPlaceholder={true}
              placeholders={{ normal: ["Ask the AI anything..."] }}
            />
          </box>
        </Show>
        <Show when={!sessionID()}>
          <box padding={1} borderStyle="rounded">
            <text fg={theme.textMuted}>Open a session first to chat.</text>
          </box>
        </Show>
      </box>
    </box>
  )
}
