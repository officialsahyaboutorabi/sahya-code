import type { WebSocketServer as WSServerType, WebSocket as WSType } from "ws"
import { watch } from "fs"
import path from "path"
import { Log } from "@/util/log"

export namespace FileSync {
  const log = Log.create({ service: "observatory.sync" })

  export interface Options {
    port: number
    rootDir: string
    debounceMs?: number
  }

  export interface SyncServer {
    port: number
    broadcast: (message: string) => void
    stop: () => Promise<void>
  }

  interface ClientInfo {
    ws: WSType
    subscriptions: Set<string>
  }

  export async function start(options: Options): Promise<SyncServer> {
    // Dynamically import ws module
    const { WebSocketServer, WebSocket } = await import("ws")
    
    const clients = new Map<WSType, ClientInfo>()
    const wss: WSServerType = new WebSocketServer({ port: options.port })
    const debounceMs = options.debounceMs || 100

    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

    wss.on("connection", (ws: WSType) => {
      log.info("client connected")

      clients.set(ws, {
        ws,
        subscriptions: new Set(),
      })

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString())

          if (message.type === "subscribe") {
            const client = clients.get(ws)
            if (client && message.path) {
              client.subscriptions.add(message.path)
              log.info("client subscribed", { path: message.path })
            }
          }

          if (message.type === "unsubscribe") {
            const client = clients.get(ws)
            if (client && message.path) {
              client.subscriptions.delete(message.path)
            }
          }
        } catch (error) {
          log.error("message parse error", { error })
        }
      })

      ws.on("close", () => {
        log.info("client disconnected")
        clients.delete(ws)
      })

      ws.on("error", (error) => {
        log.error("websocket error", { error })
        clients.delete(ws)
      })

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }))
    })

    // File watcher
    const watcher = watch(
      options.rootDir,
      { recursive: true },
      (eventType: "rename" | "change", filename: string | null) => {
        if (!filename) return

        const fullPath = path.join(options.rootDir, filename)
        const relativePath = path.relative(options.rootDir, fullPath)

        // Debounce rapid changes
        const key = `${eventType}:${relativePath}`
        const existingTimer = debounceTimers.get(key)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        debounceTimers.set(
          key,
          setTimeout(() => {
            debounceTimers.delete(key)

            const message = JSON.stringify({
              type: "file_change",
              eventType,
              path: relativePath,
              timestamp: Date.now(),
            })

            // Broadcast to all clients
            clients.forEach((client) => {
              if (client.ws.readyState === 1) { // WebSocket.OPEN
                client.ws.send(message)
              }
            })

            log.info("file change detected", { eventType, path: relativePath })
          }, debounceMs),
        )
      },
    )

    watcher.on("error", (error) => {
      log.error("watcher error", { error })
    })

    log.info("sync server started", { port: options.port })

    return {
      port: options.port,
      broadcast: (message: string) => {
        clients.forEach((client) => {
          if (client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(message)
          }
        })
      },
      stop: () => {
        return new Promise((resolve) => {
          // Clear all debounce timers
          debounceTimers.forEach((timer) => clearTimeout(timer))
          debounceTimers.clear()

          watcher.close()

          // Close all client connections
          clients.forEach((client) => {
            client.ws.close()
          })
          clients.clear()

          wss.close(() => {
            log.info("sync server stopped")
            resolve()
          })
        })
      },
    }
  }

  export async function startLiveReload(options: Options): Promise<SyncServer> {
    const server = await start(options)

    // Override broadcast to send simple reload message
    const originalBroadcast = server.broadcast
    server.broadcast = (message: string) => {
      try {
        const parsed = JSON.parse(message)
        if (parsed.type === "file_change") {
          // Send simple reload command
          const ws = (server as any).wss
          if (ws) {
            ws.clients.forEach((client: WSType) => {
              if (client.readyState === 1) { // WebSocket.OPEN
                client.send("reload")
              }
            })
          }
        }
      } catch {
        originalBroadcast(message)
      }
    }

    return server
  }
}
