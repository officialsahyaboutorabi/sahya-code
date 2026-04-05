import { Observatory } from "./index"
import { Log } from "../util/log"

const log = Log.create({ service: "observatory.hooks" })

export function captureThought(thought: string) {
  if (!Observatory.isEnabled()) return
  log.debug("Capturing thought", { thought: thought.substring(0, 50) })
  Observatory.addThought(thought)
}

export function captureAction(action: string, details?: string) {
  if (!Observatory.isEnabled()) return
  const fullAction = details ? `${action}: ${details}` : action
  log.debug("Capturing action", { action: fullAction.substring(0, 50) })
  Observatory.updateTask(fullAction)
  Observatory.addThought(fullAction)
}

export function captureProgress(progress: number) {
  if (!Observatory.isEnabled()) return
  Observatory.updateProgress(progress)
}

export function captureFileRead(file: string) {
  if (!Observatory.isEnabled()) return
  const msg = `Reading: ${file.split('/').pop() || file}`
  log.debug("Capturing file read", { file: msg })
  Observatory.addThought(msg)
}

export function captureFileWrite(file: string) {
  if (!Observatory.isEnabled()) return
  const msg = `Writing: ${file.split('/').pop() || file}`
  log.debug("Capturing file write", { file: msg })
  Observatory.addThought(msg)
}

export function captureToolCall(tool: string, input?: unknown) {
  if (!Observatory.isEnabled()) return
  let inputStr = ""
  if (input) {
    try {
      const str = JSON.stringify(input)
      inputStr = str.length > 30 ? str.substring(0, 30) + "..." : str
    } catch {}
  }
  const msg = `Tool: ${tool}${inputStr ? ` (${inputStr})` : ""}`
  log.debug("Capturing tool call", { tool, msg })
  Observatory.addThought(msg)
  Observatory.updateTask(`Using ${tool}...`)
}

export function captureMessage(role: string, content: string) {
  if (!Observatory.isEnabled()) return
  if (role === "assistant") {
    const truncated = content.length > 50 ? content.substring(0, 50) + "..." : content
    Observatory.addThought(`Agent: ${truncated}`)
  }
}
