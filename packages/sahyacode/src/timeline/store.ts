import type { Timeline } from "./index"

/**
 * In-memory store for per-session TimelineState.
 *
 * The TUI uses this to track the current cursor position (currentIndex) and
 * the cached checkpoint list without hitting the filesystem on every render.
 * Persistence is handled by `Timeline.checkpoint` / `Timeline.truncateAfter`
 * in `index.ts`; this store is the fast, mutable layer on top.
 */
export namespace TimelineStore {
  const store = new Map<string, Timeline.TimelineState>()

  /**
   * Return the TimelineState for a session.
   * If no state exists yet an empty one is created and returned.
   */
  export function get(sessionID: string): Timeline.TimelineState {
    const existing = store.get(sessionID)
    if (existing) return existing

    const initial: Timeline.TimelineState = {
      checkpoints: [],
      currentIndex: -1,
    }
    store.set(sessionID, initial)
    return initial
  }

  /**
   * Overwrite the entire TimelineState for a session.
   * Useful when checkpoints are loaded from disk at startup.
   */
  export function set(sessionID: string, state: Timeline.TimelineState): void {
    store.set(sessionID, { ...state })
  }

  /**
   * Append a newly created Checkpoint to the in-memory state and advance
   * `currentIndex` to point at it.
   *
   * Any checkpoints that were sitting after the current index (i.e. "future"
   * checkpoints that are no longer reachable after new work) are dropped to
   * keep the in-memory state consistent with `Timeline.truncateAfter`.
   */
  export function push(sessionID: string, cp: Timeline.Checkpoint): void {
    const state = get(sessionID)

    // Drop anything that was ahead of the current cursor.
    const kept = state.currentIndex >= 0 ? state.checkpoints.slice(0, state.currentIndex + 1) : []

    kept.push(cp)
    store.set(sessionID, {
      checkpoints: kept,
      currentIndex: kept.length - 1,
    })
  }

  /**
   * Move the cursor to a specific checkpoint index without mutating the list.
   * Returns `false` if the index is out of bounds.
   */
  export function moveTo(sessionID: string, index: number): boolean {
    const state = get(sessionID)
    if (index < -1 || index >= state.checkpoints.length) return false

    store.set(sessionID, { ...state, currentIndex: index })
    return true
  }

  /**
   * Move the cursor one step backward (undo).
   * Returns the Checkpoint that is now current, or `undefined` if already at
   * the beginning of the timeline.
   */
  export function undo(sessionID: string): Timeline.Checkpoint | undefined {
    const state = get(sessionID)
    if (state.currentIndex <= 0) return undefined

    const nextIndex = state.currentIndex - 1
    store.set(sessionID, { ...state, currentIndex: nextIndex })
    return state.checkpoints[nextIndex]
  }

  /**
   * Move the cursor one step forward (redo).
   * Returns the Checkpoint that is now current, or `undefined` if already at
   * the latest checkpoint.
   */
  export function redo(sessionID: string): Timeline.Checkpoint | undefined {
    const state = get(sessionID)
    if (state.currentIndex >= state.checkpoints.length - 1) return undefined

    const nextIndex = state.currentIndex + 1
    store.set(sessionID, { ...state, currentIndex: nextIndex })
    return state.checkpoints[nextIndex]
  }

  /**
   * Return the Checkpoint at the current cursor position, or `undefined` when
   * the timeline is empty.
   */
  export function current(sessionID: string): Timeline.Checkpoint | undefined {
    const state = get(sessionID)
    if (state.currentIndex < 0) return undefined
    return state.checkpoints[state.currentIndex]
  }

  /**
   * Synchronise the in-memory store with a freshly-loaded list of persisted
   * checkpoints (e.g. after the user reopens a session).  The cursor is
   * positioned at the last checkpoint (most recent).
   */
  export function hydrate(sessionID: string, checkpoints: Timeline.Checkpoint[]): void {
    store.set(sessionID, {
      checkpoints: checkpoints.slice(),
      currentIndex: checkpoints.length - 1,
    })
  }

  /**
   * Remove all in-memory state for a session.
   * Call this when a session is closed to free memory.
   */
  export function clear(sessionID: string): void {
    store.delete(sessionID)
  }

  /**
   * Remove all sessions from the store.
   * Intended for testing / shutdown scenarios.
   */
  export function clearAll(): void {
    store.clear()
  }
}
