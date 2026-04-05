// Simplified Observatory module for v2.13.7
export namespace Observatory {
  export interface State {
    currentTask?: string
    progress: number
    status: "idle" | "running" | "paused" | "completed" | "error"
    lastAction?: string
    thoughts: string[]
    enabled: boolean
  }

  let currentState: State = {
    progress: 0,
    status: "idle",
    thoughts: [],
    enabled: false,
  }

  export function getState(): State {
    return currentState
  }

  export function enable() {
    currentState.enabled = true
    currentState.status = "running"
    addThought("🔭 Observatory enabled - monitoring started")
  }

  export function disable() {
    currentState.enabled = false
    currentState.status = "idle"
  }

  export function isEnabled(): boolean {
    return currentState.enabled
  }

  export function updateTask(task: string) {
    if (!currentState.enabled) return
    currentState.currentTask = task
    currentState.status = "running"
    currentState.lastAction = task
  }

  export function addThought(thought: string) {
    if (!currentState.enabled) return
    currentState.thoughts.unshift(thought)
    if (currentState.thoughts.length > 20) {
      currentState.thoughts.pop()
    }
  }

  export function updateProgress(progress: number) {
    if (!currentState.enabled) return
    currentState.progress = Math.min(100, Math.max(0, progress))
  }

  export function setStatus(status: State["status"]) {
    currentState.status = status
  }

  export function clear() {
    currentState = {
      progress: 0,
      status: "idle",
      thoughts: [],
      enabled: currentState.enabled,
    }
  }
}
