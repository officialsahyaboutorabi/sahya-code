import path from "path"
import { createHash } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import { existsSync } from "fs"

export interface MemoryEntry {
  key: string
  value: string
  createdAt: number
}

const MAX_ENTRIES = 100

function projectHash(projectDir: string): string {
  return createHash("sha1").update(projectDir).digest("hex").slice(0, 16)
}

function memoryDir(dataDir: string): string {
  return path.join(dataDir, "memory")
}

function memoryFile(dataDir: string, projectDir: string): string {
  return path.join(memoryDir(dataDir), `${projectHash(projectDir)}.json`)
}

async function readEntries(dataDir: string, projectDir: string): Promise<MemoryEntry[]> {
  const file = memoryFile(dataDir, projectDir)
  if (!existsSync(file)) return []
  try {
    const raw = await readFile(file, "utf-8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as MemoryEntry[]
  } catch {
    return []
  }
}

async function writeEntries(dataDir: string, projectDir: string, entries: MemoryEntry[]): Promise<void> {
  const dir = memoryDir(dataDir)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const file = memoryFile(dataDir, projectDir)
  await writeFile(file, JSON.stringify(entries, null, 2), "utf-8")
}

export namespace Memory {
  /**
   * Store a fact in the project's memory.
   * If a key already exists it is updated in-place.
   * When capacity is exceeded the oldest entry is evicted (FIFO).
   */
  export async function remember(key: string, value: string, projectDir: string, dataDir: string): Promise<void> {
    const entries = await readEntries(dataDir, projectDir)
    const existingIdx = entries.findIndex((e) => e.key === key)
    if (existingIdx !== -1) {
      entries[existingIdx] = { key, value, createdAt: Date.now() }
    } else {
      entries.push({ key, value, createdAt: Date.now() })
      // FIFO eviction when over capacity
      while (entries.length > MAX_ENTRIES) {
        entries.shift()
      }
    }
    await writeEntries(dataDir, projectDir, entries)
  }

  /**
   * Retrieve all stored memories for a project, sorted oldest-first.
   */
  export async function recall(projectDir: string, dataDir: string): Promise<MemoryEntry[]> {
    return readEntries(dataDir, projectDir)
  }

  /**
   * Remove a specific memory by key.
   */
  export async function forget(key: string, projectDir: string, dataDir: string): Promise<void> {
    const entries = await readEntries(dataDir, projectDir)
    const filtered = entries.filter((e) => e.key !== key)
    await writeEntries(dataDir, projectDir, filtered)
  }
}
