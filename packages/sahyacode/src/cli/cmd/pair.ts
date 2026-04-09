import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { Pairing } from "../../pairing"
import { bootstrap } from "../bootstrap"

// ---------------------------------------------------------------------------
// pair start
// ---------------------------------------------------------------------------

export const PairStartCommand = cmd({
  command: "start",
  describe: "start a real-time pair coding session and print the shareable URL",
  builder: (yargs: Argv) =>
    yargs.option("port", {
      describe: "port to listen on (default: random available port)",
      type: "number",
      alias: "p",
    }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      // Resolve the active session — use the first available or ask for one
      // via the SESSION_ID environment variable (same convention as other commands).
      const sessionID = process.env["SAHYACODE_SESSION_ID"] ?? process.env["SAHYACODE_SESSION_ID"] ?? "default"

      console.log(`Starting pair coding session for session: ${sessionID}`)
      console.log("Initializing WebSocket server...")

      const pairSession = await Pairing.startServer(sessionID, args.port)

      const wsURL = Pairing.shareURL(pairSession)

      console.log("")
      console.log("┌──────────────────────────────────────────────────────────┐")
      console.log("│              PAIR CODING SESSION STARTED                  │")
      console.log("├──────────────────────────────────────────────────────────┤")
      console.log(`│  Pair ID   : ${pairSession.id.padEnd(43)} │`)
      console.log(`│  Session   : ${pairSession.sessionID.padEnd(43)} │`)
      console.log(`│  Host URL  : ${pairSession.hostURL.padEnd(43)} │`)
      console.log(`│  WS URL    : ${wsURL.padEnd(43)} │`)
      console.log("├──────────────────────────────────────────────────────────┤")
      console.log("│  Share the WS URL above with your collaborators.         │")
      console.log("│  Press Ctrl+C to stop the session.                       │")
      console.log("└──────────────────────────────────────────────────────────┘")
      console.log("")

      // Keep the process running until Ctrl+C
      const cleanup = async () => {
        console.log("\nStopping pair coding session...")
        try {
          await Pairing.stopServer(pairSession.id)
          console.log("Pair coding session stopped.")
        } catch (err) {
          // Already stopped or error — swallow
        }
        process.exit(0)
      }

      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)

      await new Promise(() => {}) // wait forever
    })
  },
})

// ---------------------------------------------------------------------------
// pair stop
// ---------------------------------------------------------------------------

export const PairStopCommand = cmd({
  command: "stop [pairId]",
  describe: "stop the current (or specified) pair coding session",
  builder: (yargs: Argv) =>
    yargs.positional("pairId", {
      describe: "pair session ID to stop (default: the most recently started session)",
      type: "string",
    }),
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      const sessions = Pairing.listSessions()

      if (sessions.length === 0) {
        console.log("No active pair coding sessions.")
        return
      }

      const target = args.pairId
        ? sessions.find((s) => s.id === args.pairId)
        : sessions[sessions.length - 1]

      if (!target) {
        console.error(`No pair session found with id: ${args.pairId}`)
        process.exit(1)
      }

      await Pairing.stopServer(target.id)
      console.log(`Pair coding session ${target.id} stopped.`)
    })
  },
})

// ---------------------------------------------------------------------------
// pair status
// ---------------------------------------------------------------------------

export const PairStatusCommand = cmd({
  command: "status",
  describe: "show current pair coding session information",
  builder: (yargs: Argv) => yargs,
  handler: async (_args) => {
    await bootstrap(process.cwd(), async () => {
      const sessions = Pairing.listSessions()

      if (sessions.length === 0) {
        console.log("No active pair coding sessions.")
        return
      }

      console.log("")
      console.log("┌──────────────────────────────────────────────────────────┐")
      console.log("│              ACTIVE PAIR CODING SESSIONS                  │")
      console.log("└──────────────────────────────────────────────────────────┘")

      for (const session of sessions) {
        const wsURL = Pairing.shareURL(session)
        const age = Math.floor((Date.now() - session.createdAt) / 1000)
        const ageStr = age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`

        console.log("")
        console.log(`  Pair ID      : ${session.id}`)
        console.log(`  Session      : ${session.sessionID}`)
        console.log(`  Host URL     : ${session.hostURL}`)
        console.log(`  WS URL       : ${wsURL}`)
        console.log(`  Participants : ${session.participants}`)
        console.log(`  Running for  : ${ageStr}`)
        console.log(`  Active       : ${session.active ? "yes" : "no"}`)
      }

      console.log("")
    })
  },
})

// ---------------------------------------------------------------------------
// pair (parent command)
// ---------------------------------------------------------------------------

export const PairCommand = cmd({
  command: "pair",
  describe: "real-time pair coding — share a session via WebSocket",
  builder: (yargs: Argv) =>
    yargs
      .command(PairStartCommand)
      .command(PairStopCommand)
      .command(PairStatusCommand)
      .demandCommand(1, "Specify a subcommand: start | stop | status"),
  async handler() {},
})
