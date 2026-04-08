import http from "http"
import net from "net"
import crypto from "crypto"
import { Bus } from "@/bus"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { Log } from "@/util/log"

export namespace Pairing {
  const log = Log.create({ service: "pairing" })

  // ---------------------------------------------------------------------------
  // Public types
  // ---------------------------------------------------------------------------

  export interface PairSession {
    /** Short random identifier for the pair session */
    id: string
    /** The sahyacode session being shared */
    sessionID: string
    /** e.g. "http://localhost:4567" */
    hostURL: string
    /** Count of currently connected WebSocket observers */
    participants: number
    createdAt: number
    active: boolean
  }

  export interface PairMessage {
    type: "chat" | "agent-output" | "file-change" | "join" | "leave" | "prompt"
    participantId: string
    content: string
    timestamp: number
  }

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  type InternalSession = PairSession & {
    server: http.Server
    sockets: Map<string, net.Socket>
    unsubscribe: Array<() => void>
  }

  const sessions = new Map<string, InternalSession>()

  // ---------------------------------------------------------------------------
  // WebSocket helpers (raw RFC 6455 — no external dep required)
  // ---------------------------------------------------------------------------

  function wsHandshakeKey(key: string): string {
    const MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
    return crypto.createHash("sha1").update(key + MAGIC).digest("base64")
  }

  function wsFrame(payload: string): Buffer {
    const data = Buffer.from(payload, "utf8")
    const len = data.length

    let header: Buffer
    if (len <= 125) {
      header = Buffer.alloc(2)
      header[0] = 0x81 // FIN + opcode text
      header[1] = len
    } else if (len <= 65535) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 126
      header.writeUInt16BE(len, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 127
      // Write as two 32-bit words (high word = 0 for payloads < 4 GB)
      header.writeUInt32BE(0, 2)
      header.writeUInt32BE(len, 6)
    }

    return Buffer.concat([header, data])
  }

  /**
   * Parse a single WebSocket frame from a buffer and return the text payload.
   * Returns null if the frame is incomplete or not a text/binary frame.
   */
  function parseWsFrame(buf: Buffer): string | null {
    if (buf.length < 2) return null
    const opcode = buf[0] & 0x0f
    // 0x1 = text, 0x2 = binary, 0x8 = close, 0x9 = ping, 0xA = pong
    if (opcode === 0x8) return null // close
    if (opcode === 0x9 || opcode === 0xa) return null // ping/pong — ignore

    const masked = (buf[1] & 0x80) !== 0
    let payloadLen = buf[1] & 0x7f
    let offset = 2

    if (payloadLen === 126) {
      if (buf.length < 4) return null
      payloadLen = buf.readUInt16BE(2)
      offset = 4
    } else if (payloadLen === 127) {
      if (buf.length < 10) return null
      payloadLen = buf.readUInt32BE(6) // ignore high 32-bit word
      offset = 10
    }

    if (masked) {
      if (buf.length < offset + 4 + payloadLen) return null
      const mask = buf.slice(offset, offset + 4)
      offset += 4
      const payload = Buffer.alloc(payloadLen)
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buf[offset + i] ^ mask[i % 4]
      }
      return payload.toString("utf8")
    } else {
      if (buf.length < offset + payloadLen) return null
      return buf.slice(offset, offset + payloadLen).toString("utf8")
    }
  }

  function sendToSocket(socket: net.Socket, msg: PairMessage): void {
    try {
      if (!socket.writable) return
      socket.write(wsFrame(JSON.stringify(msg)))
    } catch (err) {
      log.warn("failed to write to socket", { err })
    }
  }

  function broadcast(session: InternalSession, msg: PairMessage, exclude?: string): void {
    for (const [pid, socket] of session.sockets) {
      if (exclude && pid === exclude) continue
      sendToSocket(socket, msg)
    }
  }

  // ---------------------------------------------------------------------------
  // Port discovery
  // ---------------------------------------------------------------------------

  function findAvailablePort(preferredPort?: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (preferredPort) {
        const probe = net.createServer()
        probe.once("error", () => findAvailablePort().then(resolve, reject))
        probe.listen(preferredPort, "127.0.0.1", () => {
          const addr = probe.address() as net.AddressInfo
          probe.close(() => resolve(addr.port))
        })
      } else {
        const server = net.createServer()
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address() as net.AddressInfo
          server.close(() => resolve(addr.port))
        })
        server.once("error", reject)
      }
    })
  }

  // ---------------------------------------------------------------------------
  // ID generation
  // ---------------------------------------------------------------------------

  function generateId(): string {
    return crypto.randomBytes(4).toString("hex")
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Start a WebSocket pairing server for the given session.
   * Returns a PairSession describing the hosted pair.
   */
  export async function startServer(sessionID: string, port?: number): Promise<PairSession> {
    const actualPort = await findAvailablePort(port)
    const pairId = generateId()
    const hostURL = `http://localhost:${actualPort}`

    const internalSession: InternalSession = {
      id: pairId,
      sessionID,
      hostURL,
      participants: 0,
      createdAt: Date.now(),
      active: true,
      server: null as unknown as http.Server,
      sockets: new Map(),
      unsubscribe: [],
    }

    // Build the HTTP server that upgrades connections to WebSocket
    const server = http.createServer((req, res) => {
      // Simple health / info endpoint
      if (req.method === "GET" && req.url === "/") {
        const body = JSON.stringify({
          pairId,
          sessionID,
          participants: internalSession.participants,
          createdAt: internalSession.createdAt,
        })
        res.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) })
        res.end(body)
        return
      }
      // All other HTTP requests get 426
      res.writeHead(426, { "Content-Type": "text/plain" })
      res.end("WebSocket upgrade required")
    })

    server.on("upgrade", (req, socket, head) => {
      // Validate WebSocket upgrade headers
      const upgradeHeader = req.headers["upgrade"] ?? ""
      const key = req.headers["sec-websocket-key"] as string | undefined

      if (upgradeHeader.toLowerCase() !== "websocket" || !key) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n")
        socket.destroy()
        return
      }

      // Complete the handshake
      const acceptKey = wsHandshakeKey(key)
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${acceptKey}\r\n` +
          "\r\n",
      )

      const participantId = generateId()
      internalSession.sockets.set(participantId, socket)
      internalSession.participants = internalSession.sockets.size

      log.info("participant joined", { pairId, participantId, participants: internalSession.participants })

      // Notify the newcomer of their ID, then broadcast the join
      const joinMsg: PairMessage = {
        type: "join",
        participantId,
        content: JSON.stringify({ pairId, sessionID, yourId: participantId }),
        timestamp: Date.now(),
      }
      sendToSocket(socket, joinMsg)
      broadcast(internalSession, joinMsg, participantId)

      // Handle incoming frames from this participant
      let buf = Buffer.alloc(0)
      socket.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk])
        const text = parseWsFrame(buf)
        if (text === null) return
        buf = Buffer.alloc(0) // consume (single-frame assumption for small payloads)

        let parsed: Partial<PairMessage> = {}
        try {
          parsed = JSON.parse(text)
        } catch {
          return
        }

        if (parsed.type === "prompt" && typeof parsed.content === "string") {
          log.info("received prompt from participant", { participantId, content: parsed.content })
          // Broadcast to everyone including the sender
          const promptMsg: PairMessage = {
            type: "prompt",
            participantId,
            content: parsed.content,
            timestamp: Date.now(),
          }
          broadcast(internalSession, promptMsg)
        }
      })

      socket.on("error", (err) => {
        log.warn("participant socket error", { participantId, err })
        cleanupParticipant()
      })

      socket.on("close", () => {
        cleanupParticipant()
      })

      function cleanupParticipant() {
        internalSession.sockets.delete(participantId)
        internalSession.participants = internalSession.sockets.size
        const leaveMsg: PairMessage = {
          type: "leave",
          participantId,
          content: "",
          timestamp: Date.now(),
        }
        broadcast(internalSession, leaveMsg)
        log.info("participant left", { pairId, participantId, participants: internalSession.participants })
      }
    })

    // Subscribe to Bus events and forward them to connected clients
    // Bus.subscribe (public API) runs synchronously and returns () => void
    const unsubMsgUpdated: () => void = Bus.subscribe(MessageV2.Event.Updated, (evt) => {
      if (evt.properties.info.sessionID !== sessionID) return
      const msg: PairMessage = {
        type: "agent-output",
        participantId: "server",
        content: JSON.stringify(evt.properties.info),
        timestamp: Date.now(),
      }
      broadcast(internalSession, msg)
    })

    const unsubDiff: () => void = Bus.subscribe(Session.Event.Diff, (evt) => {
      if (evt.properties.sessionID !== sessionID) return
      for (const diff of evt.properties.diff) {
        const msg: PairMessage = {
          type: "file-change",
          participantId: "server",
          content: JSON.stringify({ file: diff.file }),
          timestamp: Date.now(),
        }
        broadcast(internalSession, msg)
      }
    })

    internalSession.unsubscribe.push(unsubMsgUpdated, unsubDiff)

    // Start listening
    await new Promise<void>((resolve, reject) => {
      server.listen(actualPort, "127.0.0.1", () => resolve())
      server.once("error", reject)
    })

    internalSession.server = server
    sessions.set(pairId, internalSession)

    log.info("pair server started", { pairId, sessionID, port: actualPort })

    return publicSession(internalSession)
  }

  /**
   * Stop a pairing server and close all connections.
   */
  export async function stopServer(pairSessionID: string): Promise<void> {
    const session = sessions.get(pairSessionID)
    if (!session) throw new Error(`No pair session found: ${pairSessionID}`)

    session.active = false

    // Close all WebSocket connections gracefully
    for (const [, socket] of session.sockets) {
      try {
        // Send WebSocket close frame (opcode 0x8)
        const closeFrame = Buffer.from([0x88, 0x00])
        socket.write(closeFrame)
        socket.destroy()
      } catch {}
    }
    session.sockets.clear()
    session.participants = 0

    // Cancel Bus subscriptions
    for (const unsub of session.unsubscribe) {
      try { unsub() } catch {}
    }

    // Close HTTP server
    await new Promise<void>((resolve) => session.server.close(() => resolve()))

    sessions.delete(pairSessionID)
    log.info("pair server stopped", { pairSessionID })
  }

  /**
   * Get current info for a pair session.
   */
  export function getSession(pairSessionID: string): PairSession | undefined {
    const s = sessions.get(pairSessionID)
    return s ? publicSession(s) : undefined
  }

  /**
   * List all active pair sessions.
   */
  export function listSessions(): PairSession[] {
    return Array.from(sessions.values()).map(publicSession)
  }

  /**
   * Generate a shareable WebSocket URL from a PairSession.
   * Clients can connect directly to this URL with a WebSocket client.
   */
  export function shareURL(pairSession: PairSession): string {
    // Rewrite http:// → ws:// for direct WebSocket usage
    return pairSession.hostURL.replace(/^http/, "ws") + `?pair=${pairSession.id}`
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function publicSession(s: InternalSession): PairSession {
    return {
      id: s.id,
      sessionID: s.sessionID,
      hostURL: s.hostURL,
      participants: s.participants,
      createdAt: s.createdAt,
      active: s.active,
    }
  }
}
