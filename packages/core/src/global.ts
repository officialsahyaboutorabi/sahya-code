import path from "path"
import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import os from "os"
import { Context, Effect, Layer } from "effect"
import { Flock } from "./util/flock"

const app = "sahyacode"
const data = path.join(xdgData!, app)
const cache = path.join(xdgCache!, app)
const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)

const paths = {
  get home() {
    return process.env.SAHYACODE_TEST_HOME ?? process.env.OPENCODE_TEST_HOME ?? os.homedir()
  },
  data,
  bin: path.join(cache, "bin"),
  log: path.join(data, "log"),
  cache,
  config,
  state,
}

export const Path = paths

async function migrateIfNeeded(oldPath: string, newPath: string) {
  if (oldPath === newPath) return
  const oldExists = await fs.stat(oldPath).then(() => true).catch(() => false)
  if (!oldExists) return
  const newExists = await fs.stat(newPath).then(() => true).catch(() => false)
  if (newExists) {
    console.warn(`[sahyacode] both old and new directories exist, skipping migration:\n  old: ${oldPath}\n  new: ${newPath}`)
    return
  }
  await fs.mkdir(path.dirname(newPath), { recursive: true })
  await fs.rename(oldPath, newPath)
  console.log(`[sahyacode] migrated ${oldPath} → ${newPath}`)
}

const oldApp = "opencode"
const oldData = path.join(xdgData!, oldApp)
const oldCache = path.join(xdgCache!, oldApp)
const oldConfig = path.join(xdgConfig!, oldApp)
const oldState = path.join(xdgState!, oldApp)

await Promise.all([
  migrateIfNeeded(oldData, data),
  migrateIfNeeded(oldCache, cache),
  migrateIfNeeded(oldConfig, config),
  migrateIfNeeded(oldState, state),
])

Flock.setGlobal({ state })

await Promise.all([
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
])

export class Service extends Context.Service<Service, Interface>()("@opencode/Global") {}

export interface Interface {
  readonly home: string
  readonly data: string
  readonly cache: string
  readonly config: string
  readonly state: string
  readonly bin: string
  readonly log: string
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of({
      home: Path.home,
      data: Path.data,
      cache: Path.cache,
      config: Path.config,
      state: Path.state,
      bin: Path.bin,
      log: Path.log,
    })
  }),
)

export * as Global from "./global"
