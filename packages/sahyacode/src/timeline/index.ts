import path from "path"
import { mkdir, readFile, writeFile } from "fs/promises"
import { existsSync } from "fs"
import { Log } from "@/util/log"
import { Snapshot } from "@/snapshot"

const log = Log.create({ service: "timeline" })

export namespace Timeline {
  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  export interface Checkpoint {
    /** Unique identifier for this checkpoint (nanoid-style, prefixed). */
    id: string
    /** The session this checkpoint belongs to. */
    sessionID: string
    /** The message exchange that triggered the checkpoint creation. */
    messageID: string
    /** Unix epoch milliseconds. */
    timestamp: number
    /** Human-readable label, e.g. "After: wrote auth.ts". */
    description: string
    /** Relative or absolute paths of files changed at this point. */
    filesChanged: string[]
    /** Git tree hash produced by Snapshot.track(), if available. */
    snapshotRef?: string
  }

  export interface TimelineState {
    checkpoints: Checkpoint[]
    /**
     * Index into `checkpoints` that represents the currently-active position.
     * -1 means no checkpoints have been created yet.
     */
    currentIndex: number
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function timelineDir(dataDir: string): string {
    return path.join(dataDir, "timeline")
  }

  function timelineFile(dataDir: string, sessionID: string): string {
    return path.join(timelineDir(dataDir), `${sessionID}.json`)
  }

  function generateID(): string {
    // Deterministic-enough unique ID without an external dependency.
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 8)
    return `cp_${ts}_${rand}`
  }

  async function readCheckpoints(dataDir: string, sessionID: string): Promise<Checkpoint[]> {
    const file = timelineFile(dataDir, sessionID)
    if (!existsSync(file)) return []
    try {
      const raw = await readFile(file, "utf-8")
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed as Checkpoint[]
    } catch {
      log.warn("failed to parse timeline file", { sessionID, file })
      return []
    }
  }

  async function persistCheckpoints(dataDir: string, sessionID: string, checkpoints: Checkpoint[]): Promise<void> {
    const dir = timelineDir(dataDir)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    const file = timelineFile(dataDir, sessionID)
    await writeFile(file, JSON.stringify(checkpoints, null, 2), "utf-8")
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Create a checkpoint after a message exchange and persist it.
   *
   * Optionally records a `snapshotRef` by calling `Snapshot.track()`.  If the
   * snapshot system is unavailable (e.g. the project is not a git repo) the
   * checkpoint is still created without a ref.
   */
  export async function checkpoint(
    sessionID: string,
    messageID: string,
    description: string,
    filesChanged: string[],
    dataDir: string,
  ): Promise<Checkpoint> {
    // Attempt to capture a snapshot hash so restores can be precise.
    let snapshotRef: string | undefined
    try {
      snapshotRef = await Snapshot.track() ?? undefined
    } catch {
      log.warn("snapshot.track failed — checkpoint will have no snapshotRef", { sessionID, messageID })
    }

    const cp: Checkpoint = {
      id: generateID(),
      sessionID,
      messageID,
      timestamp: Date.now(),
      description,
      filesChanged,
      snapshotRef,
    }

    const existing = await readCheckpoints(dataDir, sessionID)
    existing.push(cp)
    await persistCheckpoints(dataDir, sessionID, existing)

    log.info("checkpoint created", { id: cp.id, sessionID, snapshotRef })
    return cp
  }

  /**
   * Return all checkpoints for a session, sorted oldest-first.
   */
  export async function getCheckpoints(sessionID: string, dataDir: string): Promise<Checkpoint[]> {
    const checkpoints = await readCheckpoints(dataDir, sessionID)
    // Ensure stable oldest-first ordering regardless of insertion order.
    return checkpoints.slice().sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Restore the working directory to the state captured by a specific checkpoint.
   *
   * When the checkpoint has a `snapshotRef` the snapshot system is used to
   * perform the actual file restoration.  Otherwise a warning is logged so the
   * caller is aware that a full restore was not possible.
   */
  export async function restoreToCheckpoint(
    checkpointID: string,
    sessionID: string,
    dataDir: string,
  ): Promise<void> {
    const checkpoints = await readCheckpoints(dataDir, sessionID)
    const cp = checkpoints.find((c) => c.id === checkpointID)

    if (!cp) {
      log.warn("restoreToCheckpoint: checkpoint not found", { checkpointID, sessionID })
      return
    }

    if (cp.snapshotRef) {
      try {
        await Snapshot.restore(cp.snapshotRef)
        log.info("restored to checkpoint via snapshot", { checkpointID, snapshotRef: cp.snapshotRef })
      } catch (err) {
        log.error("snapshot restore failed", { checkpointID, snapshotRef: cp.snapshotRef, err })
      }
    } else {
      log.warn("checkpoint has no snapshotRef — file restore skipped", {
        checkpointID,
        sessionID,
        description: cp.description,
        filesChanged: cp.filesChanged,
      })
    }
  }

  /**
   * Remove all checkpoints that come after `checkpointIndex` (exclusive).
   *
   * This is used to clear "future" checkpoints when the user branches off from
   * a past point in the timeline (undo → new work → redo is no longer valid).
   *
   * @param checkpointIndex - The index of the last checkpoint to keep (0-based,
   *   in the oldest-first sorted order returned by `getCheckpoints`).
   */
  export async function truncateAfter(
    sessionID: string,
    checkpointIndex: number,
    dataDir: string,
  ): Promise<void> {
    const checkpoints = await readCheckpoints(dataDir, sessionID)
    const sorted = checkpoints.slice().sort((a, b) => a.timestamp - b.timestamp)

    if (checkpointIndex < 0) {
      // Truncate everything.
      await persistCheckpoints(dataDir, sessionID, [])
      log.info("truncated all checkpoints", { sessionID })
      return
    }

    const kept = sorted.slice(0, checkpointIndex + 1)
    await persistCheckpoints(dataDir, sessionID, kept)
    log.info("truncated checkpoints", { sessionID, kept: kept.length, removed: sorted.length - kept.length })
  }
}
