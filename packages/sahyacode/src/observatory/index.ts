// Simplified Observatory module for v2.13.7
export namespace Observatory {
  export interface State {
    currentTask?: string
    progress: number
    status: "idle" | "running" | "paused" | "completed" | "error"
    lastAction?: string
    thoughts: string[]
  }

  let currentState: State = {
    progress: 0,
    status: "idle",
    thoughts: [],
  }

  export function getState(): State {
    return currentState
  }

  export function updateTask(task: string) {
    currentState.currentTask = task
    currentState.status = "running"
    currentState.lastAction = `Started: ${task}`
  }

  export function addThought(thought: string) {
    currentState.thoughts.unshift(thought)
    if (currentState.thoughts.length > 5) {
      currentState.thoughts.pop()
    }
  }

  export function updateProgress(progress: number) {
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
    }
  }
}
