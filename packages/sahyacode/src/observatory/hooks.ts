import fs from "fs"
import path from "path"
import os from "os"
import { Observatory } from "./index"
import { Log } from "../util/log"

const log = Log.create({ service: "observatory.hooks" })

const LIVE_VIEW_DIR = path.join(os.homedir(), "live-view")

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

export function captureFileWrite(file: string, content?: string, projectDir?: string, action: "write" | "edit" = "write") {
  if (!Observatory.isEnabled()) return
  const msg = `Writing: ${file.split('/').pop() || file}`
  log.debug("Capturing file write", { file: msg })
  Observatory.addThought(msg)
  Observatory.notifyFileChanged(file)

  const relPath = path.relative(projectDir || process.cwd(), file)

  // Mirror file to ~/live-view/ asynchronously
  const destPath = path.join(LIVE_VIEW_DIR, relPath)
  fs.promises.mkdir(path.dirname(destPath), { recursive: true })
    .then(() => fs.promises.copyFile(file, destPath))
    .catch((err) => log.debug("Failed to mirror file to live-view", { err: String(err) }))

  // Record the event and persist the recording
  Observatory.addRecordingEvent({ timestamp: Date.now(), relPath, content: content || "", action })
  const recording = Observatory.getRecording()
  fs.promises.mkdir(LIVE_VIEW_DIR, { recursive: true })
    .then(() => fs.promises.writeFile(path.join(LIVE_VIEW_DIR, ".sahya-replay.json"), JSON.stringify(recording, null, 2), "utf8"))
    .catch((err) => log.debug("Failed to save replay recording", { err: String(err) }))
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
