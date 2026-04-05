import { cmd } from "./cmd"
import { render } from "@opentui/solid"
import { ObservatoryDashboard } from "@/observatory/dashboard"
import { ObservatoryBrowser } from "@/observatory/browser"
import { ObservatoryBroadcaster } from "@/observatory/stream"
import { Session } from "@/session"
import { Global } from "@/global"
import { Log } from "@/util/log"
import open from "open"
import path from "path"

const log = Log.create({ service: "observatory.cmd" })

export const ObservatoryCommand = cmd({
  command: "observatory [session-id]",
  aliases: ["observe", "obs"],
  describe: "Launch the Live Agent Observatory dashboard",
  builder: (yargs) =>
    yargs
      .positional("session-id", {
        type: "string",
        describe: "Session ID to observe (uses current session if not specified)",
      })
      .option("port", {
        alias: "p",
        type: "number",
        describe: "Port for browser preview server",
        default: 3456,
      })
      .option("preview", {
        type: "boolean",
        describe: "Start browser preview server",
        default: false,
      })
      .option("live-reload", {
        type: "boolean",
        describe: "Enable live reload for browser preview",
        default: true,
      })
      .option("view", {
        alias: "v",
        type: "string",
        choices: ["compact", "full", "minimal"],
        describe: "Dashboard view mode",
        default: "compact",
      })
      .option("open", {
        alias: "o",
        type: "boolean",
        describe: "Open browser automatically",
        default: false,
      })
      .example("sahyacode observatory", "Observe the current session")
      .example("sahyacode observatory abc123", "Observe a specific session")
      .example("sahyacode observatory --preview", "Start with browser preview")
      .example("sahyacode observatory --port 8080", "Use custom port for preview"),
  handler: async (args) => {
    try {
      let sessionID = args["session-id"]

      // If no session ID provided, try to get the current session
      if (!sessionID) {
        const sessions = await Session.list()
        const activeSession = sessions.find((s) => !s.time.archived)
        if (activeSession) {
          sessionID = activeSession.id
          console.log(`Observing current session: ${sessionID}`)
        } else {
          console.error("No active session found. Please specify a session ID.")
          process.exit(1)
        }
      }

      // Verify session exists
      const session = await Session.get(sessionID)
      if (!session) {
        console.error(`Session not found: ${sessionID}`)
        process.exit(1)
      }

      log.info("starting observatory", { sessionID, view: args.view })

      // Start browser preview if requested
      let browser: ObservatoryBrowser.BrowserInstance | undefined
      if (args.preview) {
        const rootDir = session.directory || Global.Path.cwd
        browser = await ObservatoryBrowser.start({
          port: args.port,
          rootDir,
          liveReload: args.liveReload,
        })

        console.log(`\n🌐 Browser preview: ${browser.url}`)

        if (args.open) {
          await open(browser.url)
        }
      }

      // Start the TUI dashboard
      console.log(`\n🤖 Agent Observatory - Session: ${sessionID}`)
      console.log("Press Ctrl+C to exit\n")

      const cleanup = async () => {
        log.info("shutting down observatory")
        if (browser) {
          await browser.stop()
        }
        await ObservatoryBroadcaster.unobserve(sessionID)
      }

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        await cleanup()
        process.exit(0)
      })

      process.on("SIGTERM", async () => {
        await cleanup()
        process.exit(0)
      })

      // Start observing the session
      await ObservatoryBroadcaster.observe(sessionID)

      // Render the dashboard
      const renderer = await render(() => (
        <ObservatoryDashboard
          sessionID={sessionID}
          initialView={args.view as any}
          onStop={() => {
            cleanup().then(() => process.exit(0))
          }}
          onPreview={() => {
            if (browser) {
              open(browser.url)
            }
          }}
        />
      ))

      // Keep running until interrupted
      await new Promise(() => {})
    } catch (error) {
      log.error("observatory error", { error })
      console.error("Error starting observatory:", error)
      process.exit(1)
    }
  },
})
