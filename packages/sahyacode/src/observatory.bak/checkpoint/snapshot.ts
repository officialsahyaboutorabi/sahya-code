import { Effect, Layer, ServiceMap } from "effect"
import { Bus } from "@/bus"
import { Session } from "@/session"
import { Snapshot } from "@/snapshot"
import { SessionID } from "@/session/schema"
import { ObservatoryEvent, CheckpointCreated } from "../stream/events"
import { Log } from "@/util/log"
import path from "path"
import { mkdir, writeFile, readFile, readdir, stat, rm } from "fs/promises"
import crypto from "crypto"

export namespace ObservatoryCheckpoint {
  const log = Log.create({ service: "observatory.checkpoint" })

  export interface Checkpoint {
    id: string
    sessionID: string
    timestamp: number
    description: string
    snapshotHash: string
    files: CheckpointFile[]
    metadata?: Record<string, any>
  }

  export interface CheckpointFile {
    path: string
    content: string
    hash: string
  }

  export interface Interface {
    readonly create: (
      sessionID: SessionID,
      description?: string,
    ) => Effect.Effect<Checkpoint>
    readonly restore: (checkpointID: string) => Effect.Effect<void>
    readonly list: (sessionID: SessionID) => Effect.Effect<Checkpoint[]>
    readonly get: (checkpointID: string) => Effect.Effect<Checkpoint | undefined>
    readonly remove: (checkpointID: string) => Effect.Effect<void>
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/ObservatoryCheckpoint") {}

  type State = {
    checkpointsDir: string
  }

  function generateCheckpointID(): string {
    return `checkpoint_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
  }

  function hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16)
  }

  export const layer: Layer.Layer<Service, never, Bus.Service | Session.Service | Snapshot.Service> =
    Layer.effect(
      Service,
      Effect.gen(function* () {
        const bus = yield* Bus.Service
        const session = yield* Session.Service
        const snapshot = yield* Snapshot.Service

        const state: State = {
          checkpointsDir: path.join(process.cwd(), ".sahyacode", "checkpoints"),
        }

        const ensureDir = (dir: string) => Effect.tryPromise({
          try: () => mkdir(dir, { recursive: true }),
          catch: () => undefined, // Directory may already exist
        })

        const create = Effect.fn("ObservatoryCheckpoint.create")(function* (
          sessionID: SessionID,
          description?: string,
        ) {
          yield* ensureDir(state.checkpointsDir)

          const checkpointID = generateCheckpointID()
          log.info("creating checkpoint", { checkpointID, sessionID })

          // Capture current snapshot
          const snapshotHash = yield* snapshot.track()

          // Get session info for context
          const sessionInfo = yield* session.get(sessionID)

          const checkpoint: Checkpoint = {
            id: checkpointID,
            sessionID,
            timestamp: Date.now(),
            description: description || `Checkpoint at ${new Date().toLocaleString()}`,
            snapshotHash,
            files: [],
            metadata: {
              directory: sessionInfo?.directory,
              version: "1.0",
            },
          }

          // Save checkpoint to disk
          const checkpointPath = path.join(state.checkpointsDir, `${checkpointID}.json`)
          yield* Effect.promise(() => writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2)))

          // Publish event
          yield* bus.publish(ObservatoryEvent.CheckpointCreated, {
            sessionID,
            checkpointID,
            description: checkpoint.description,
            timestamp: checkpoint.timestamp,
          })

          log.info("checkpoint created", { checkpointID })

          return checkpoint
        })

        const restore = Effect.fn("ObservatoryCheckpoint.restore")(function* (checkpointID: string) {
          const checkpoint = yield* get(checkpointID)
          if (!checkpoint) {
            throw new Error(`Checkpoint not found: ${checkpointID}`)
          }

          log.info("restoring checkpoint", { checkpointID })

          // Restore files from snapshot
          // This would integrate with the snapshot system to restore file state
          // For now, we just log the restore action

          yield* bus.publish(ObservatoryEvent.AgentAction, {
            sessionID: checkpoint.sessionID,
            messageID: "", // Would need actual message ID
            action: "planning",
            details: `Restored checkpoint: ${checkpoint.description}`,
            timestamp: Date.now(),
          })

          log.info("checkpoint restored", { checkpointID })
        })

        const list = Effect.fn("ObservatoryCheckpoint.list")(function* (sessionID: SessionID) {
          yield* ensureDir(state.checkpointsDir)

          const entries = yield* Effect.promise(() => readdir(state.checkpointsDir))
          const checkpoints: Checkpoint[] = []

          for (const entry of entries) {
            if (!entry.endsWith(".json")) continue

            try {
              const content = yield* Effect.promise(() =>
                readFile(path.join(state.checkpointsDir, entry), "utf-8"),
              )
              const checkpoint: Checkpoint = JSON.parse(content)
              if (checkpoint.sessionID === sessionID) {
                checkpoints.push(checkpoint)
              }
            } catch (error) {
              log.error("failed to load checkpoint", { entry, error })
            }
          }

          // Sort by timestamp descending
          checkpoints.sort((a, b) => b.timestamp - a.timestamp)

          return checkpoints
        })

        const get = Effect.fn("ObservatoryCheckpoint.get")(function* (checkpointID: string) {
          const checkpointPath = path.join(state.checkpointsDir, `${checkpointID}.json`)

          try {
            const content = yield* Effect.promise(() => readFile(checkpointPath, "utf-8"))
            return JSON.parse(content) as Checkpoint
          } catch {
            return undefined
          }
        })

        const remove = Effect.fn("ObservatoryCheckpoint.remove")(function* (checkpointID: string) {
          const checkpointPath = path.join(state.checkpointsDir, `${checkpointID}.json`)

          try {
            yield* Effect.promise(() => rm(checkpointPath))
            log.info("checkpoint removed", { checkpointID })
          } catch (error) {
            log.error("failed to remove checkpoint", { checkpointID, error })
          }
        })

        return Service.of({ create, restore, list, get, remove })
      }),
    )

  export const defaultLayer = Layer.unwrap(
    Effect.sync(() =>
      layer.pipe(
        Layer.provide(Bus.layer),
        Layer.provide(Session.defaultLayer),
        Layer.provide(Snapshot.defaultLayer),
      ),
    ),
  )

  const { runPromise } = Effect.runSync(
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Bus.Service | Session.Service | Snapshot.Service>()
      return {
        runPromise: <A>(effect: Effect.Effect<A, any, Bus.Service | Session.Service | Snapshot.Service>) =>
          Effect.runPromise(Effect.provide(effect, runtime)),
      }
    }),
  )

  export async function create(sessionID: SessionID, description?: string) {
    return runPromise((svc) => svc.create(sessionID, description))
  }

  export async function restore(checkpointID: string) {
    return runPromise((svc) => svc.restore(checkpointID))
  }

  export async function list(sessionID: SessionID) {
    return runPromise((svc) => svc.list(sessionID))
  }

  export async function get(checkpointID: string) {
    return runPromise((svc) => svc.get(checkpointID))
  }

  export async function remove(checkpointID: string) {
    return runPromise((svc) => svc.remove(checkpointID))
  }
}
