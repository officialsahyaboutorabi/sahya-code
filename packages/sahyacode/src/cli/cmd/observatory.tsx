import { cmd } from "./cmd"
import { Session } from "@/session"
import { Log } from "@/util/log"

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
      .example("sahyacode observatory", "Observe the current session")
      .example("sahyacode observatory abc123", "Observe a specific session"),
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

      log.info("starting observatory", { sessionID })
      console.log(`\n🔭 Agent Observatory - Session: ${sessionID}`)
      console.log("Observatory is available in the TUI via the observatory route.")
      console.log("Start sahyacode normally and navigate to the Observatory view.")
    } catch (error) {
      log.error("observatory error", { error })
      console.error("Error starting observatory:", error)
      process.exit(1)
    }
  },
})
