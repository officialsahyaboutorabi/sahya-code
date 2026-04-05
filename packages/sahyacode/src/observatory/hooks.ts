import { Observatory } from "./index"
import { Log } from "../util/log"

const log = Log.create({ service: "observatory.hooks" })

let isEnabled = false

export function enableObservatory() {
  isEnabled = true
  Observatory.setStatus("running")
  Observatory.addThought("Observatory enabled - monitoring agent activity")
  log.info("observatory enabled")
}

export function disableObservatory() {
  isEnabled = false
  Observatory.setStatus("idle")
  log.info("observatory disabled")
}

export function isObservatoryEnabled() {
  return isEnabled
}

export function captureThought(thought: string) {
  if (!isEnabled) return
  Observatory.addThought(thought)
}

export function captureAction(action: string, details?: string) {
  if (!isEnabled) return
  const fullAction = details ? `${action}: ${details}` : action
  Observatory.updateTask(fullAction)
  Observatory.addThought(fullAction)
}

export function captureProgress(progress: number) {
  if (!isEnabled) return
  Observatory.updateProgress(progress)
}

export function captureFileRead(file: string) {
  if (!isEnabled) return
  Observatory.addThought(`Reading file: ${file}`)
}

export function captureFileWrite(file: string) {
  if (!isEnabled) return
  Observatory.addThought(`Writing file: ${file}`)
}

export function captureToolCall(tool: string, input?: unknown) {
  if (!isEnabled) return
  const inputStr = input ? JSON.stringify(input).slice(0, 50) + "..." : ""
  Observatory.addThought(`Tool: ${tool} ${inputStr}`)
}
