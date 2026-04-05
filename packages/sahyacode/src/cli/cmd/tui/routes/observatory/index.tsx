import { createSignal, onMount, onCleanup, Show, createEffect } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions, useKeyboard } from "@opentui/solid"
import { Observatory } from "@/observatory"
import { Log } from "@/util/log"
import { Instance } from "@/project/instance"
import http from "http"
import fs from "fs"
import path from "path"

const log = Log.create({ service: "observatory.route" })

export function ObservatoryRoute() {
  const route = useRouteData("observatory")
  const routeCtx = useRoute()
  const { theme } = useTheme()
  const keyboard = useKeyboard()
  const dimensions = useTerminalDimensions()
  
  const [state, setState] = createSignal(Observatory.getState())
  const [browserUrl, setBrowserUrl] = createSignal<string | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  let interval: ReturnType<typeof setInterval> | null = null
  let server: http.Server | null = null
  let port = 3456

  // Enable observatory when entering
  onMount(() => {
    log.info("Observatory mounted")
    
    // Enable observatory hooks
    Observatory.enable()
    
    // Update state periodically
    interval = setInterval(() => {
      setState(Observatory.getState())
    }, 200)

    // Start HTTP server for browser preview
    startServer()

    // Keyboard handler - use simpler approach
    const unsub = keyboard.subscribe((key) => {
      if (key.key === 'q' || key.key === 'Q') {
        log.info("Exit key pressed (q)")
        handleExit()
      } else if (key.key === 'c' && key.ctrl) {
        log.info("Ctrl+C pressed")
        handleExit()
      }
    })

    return () => {
      unsub()
    }
  })

  const startServer = async () => {
    const workDir = Instance.worktree || process.cwd()
    
    try {
      // Create simple HTTP server
      server = http.createServer((req, res) => {
        const filePath = path.join(workDir, req.url === '/' ? 'index.html' : req.url || '')
        
        fs.readFile(filePath, (err, data) => {
          if (err) {
            if (req.url === '/') {
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Observatory Preview</title>
                  <style>
                    body { font-family: sans-serif; background: #1a1a1a; color: #fff; padding: 40px; }
                    h1 { color: #ff4f00; }
                    .status { padding: 20px; background: #2a2a2a; border-radius: 8px; margin: 20px 0; }
                  </style>
                </head>
                <body>
                  <h1>🔭 Observatory Preview</h1>
                  <div class="status">
                    <p>Working directory: ${workDir}</p>
                    <p>Status: Observatory is monitoring the agent...</p>
                    <p id="activity">Waiting for activity...</p>
                  </div>
                  <script>
                    setInterval(async () => {
                      try {
                        const res = await fetch('/observatory-status');
                        const data = await res.json();
                        document.getElementById('activity').textContent = 
                          'Current: ' + (data.currentTask || 'Idle') + 
                          ' | Progress: ' + data.progress + '%';
                      } catch(e) {}
                    }, 1000);
                  </script>
                </body>
                </html>
              `)
              return
            }
            res.writeHead(404)
            res.end('Not found')
            return
          }
          
          const ext = path.extname(filePath)
          const contentType = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
          }[ext] || 'text/plain'
          
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(data)
        })
      })

      // Status endpoint
      server.on('request', (req, res) => {
        if (req.url === '/observatory-status') {
          const s = Observatory.getState()
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(s))
          return
        }
      })

      server.listen(port, () => {
        log.info(`Observatory server started on port ${port}`)
        setBrowserUrl(`http://localhost:${port}`)
      })

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          port++
          server?.listen(port)
        } else {
          log.error('Server error', { err })
          setError(`Server error: ${err.message}`)
        }
      })
    } catch (err) {
      log.error('Failed to start server', { err })
      setError(`Failed to start server: ${err}`)
    }
  }

  const handleExit = () => {
    log.info("Exiting observatory")
    Observatory.disable()
    
    // Stop server
    if (server) {
      server.close()
      server = null
    }
    
    // Clear interval
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    
    // Navigate back
    routeCtx.navigate({ type: "home" })
  }

  onCleanup(() => {
    log.info("Observatory cleanup")
    Observatory.disable()
    if (server) {
      server.close()
    }
    if (interval) {
      clearInterval(interval)
    }
  })

  const currentState = state()

  return (
    <box flexDirection="column" width="100%" height="100%" padding={1}>
      {/* Header */}
      <box flexDirection="row" marginBottom={1}>
        <text bold color={theme().accent}>
          🔭 Observatory
        </text>
        <box flexGrow={1} />
        <text color={theme().textMuted}>
          Press 'q' to exit
        </text>
      </box>

      <Show when={error()}>
        <box backgroundColor={theme().error} padding={1} marginBottom={1}>
          <text color="#fff">Error: {error()}</text>
        </box>
      </Show>

      {/* Status Bar */}
      <box 
        flexDirection="row" 
        backgroundColor={theme().bgSecondary}
        padding={1}
        marginBottom={1}
        borderStyle="round"
      >
        <text>Status: </text>
        <text color={currentState.status === "running" ? theme().success : theme().text}>
          {currentState.status.toUpperCase()}
        </text>
        <box flexGrow={1} />
        <text>Progress: {currentState.progress}%</text>
      </box>

      {/* Current Task */}
      <Show when={currentState.currentTask}>
        <box flexDirection="column" marginBottom={1} borderStyle="round" padding={1}>
          <text bold color={theme().accent}>Current Task:</text>
          <text>{currentState.currentTask}</text>
        </box>
      </Show>

      {/* Progress Bar */}
      <box flexDirection="row" marginBottom={1} height={1}>
        <box 
          width={`${Math.max(1, currentState.progress)}%`} 
          height={1}
          backgroundColor={theme().accent}
        />
        <box 
          width={`${Math.max(1, 100 - currentState.progress)}%`} 
          height={1}
          backgroundColor={theme().bgSecondary}
        />
      </box>

      {/* Recent Thoughts */}
      <box flexDirection="column" flexGrow={1} borderStyle="round" padding={1}>
        <text bold marginBottom={1}>Recent Activity ({currentState.thoughts.length}):</text>
        <Show 
          when={currentState.thoughts.length > 0}
          fallback={<text color={theme().textMuted}>No activity yet... Agent will appear here when it starts working.</text>}
        >
          {currentState.thoughts.slice(0, 10).map((thought, i) => (
            <text key={i} color={i === 0 ? theme().text : theme().textMuted}>
              • {thought.length > 60 ? thought.substring(0, 60) + "..." : thought}
            </text>
          ))}
        </Show>
      </box>

      {/* Browser Preview URL */}
      <Show when={browserUrl()}>
        <box flexDirection="row" marginTop={1} padding={1} borderStyle="round">
          <text>Browser Preview: </text>
          <text color={theme().accent}>{browserUrl()}</text>
          <box flexGrow={1} />
          <text color={theme().textMuted}>(Open in browser)</text>
        </box>
      </Show>

      {/* Last Action */}
      <Show when={currentState.lastAction}>
        <box flexDirection="row" marginTop={1}>
          <text color={theme().textMuted}>Last: {currentState.lastAction}</text>
        </box>
      </Show>
    </box>
  )
}
