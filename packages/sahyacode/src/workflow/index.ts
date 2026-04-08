import { readFile, writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { createHash } from "crypto"

export namespace Workflow {
  export interface WorkflowDef {
    id: string
    name: string
    prompt: string
    schedule: string
    enabled: boolean
    lastRun?: number
    nextRun?: number
    createdAt: number
  }

  export interface WorkflowResult {
    workflowId: string
    runAt: number
    success: boolean
    output: string
    error?: string
  }

  // ---------------------------------------------------------------------------
  // Cron parsing helpers
  // ---------------------------------------------------------------------------

  type CronField = number[]

  interface ParsedCron {
    minutes: CronField
    hours: CronField
    days: CronField
    months: CronField
    dows: CronField
  }

  function expandRange(min: number, max: number): number[] {
    const result: number[] = []
    for (let i = min; i <= max; i++) result.push(i)
    return result
  }

  function parseField(field: string, min: number, max: number): CronField | null {
    if (field === "*") return expandRange(min, max)

    const values: number[] = []
    const parts = field.split(",")

    for (const part of parts) {
      const trimmed = part.trim()
      if (trimmed === "") return null

      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-")
        const start = parseInt(startStr, 10)
        const end = parseInt(endStr, 10)
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) return null
        values.push(...expandRange(start, end))
      } else {
        const n = parseInt(trimmed, 10)
        if (isNaN(n) || n < min || n > max) return null
        values.push(n)
      }
    }

    if (values.length === 0) return null
    // deduplicate and sort
    return [...new Set(values)].sort((a, b) => a - b)
  }

  function parseCron(expr: string): ParsedCron | null {
    const fields = expr.trim().split(/\s+/)
    if (fields.length !== 5) return null

    const minutes = parseField(fields[0], 0, 59)
    const hours = parseField(fields[1], 0, 23)
    const days = parseField(fields[2], 1, 31)
    const months = parseField(fields[3], 1, 12)
    const dows = parseField(fields[4], 0, 6)

    if (!minutes || !hours || !days || !months || !dows) return null

    return { minutes, hours, days, months, dows }
  }

  /**
   * Validate a cron expression (5-field: min hour day month dow).
   */
  export function validateCron(expr: string): { valid: boolean; error?: string } {
    const fields = expr.trim().split(/\s+/)
    if (fields.length !== 5) {
      return { valid: false, error: "Cron expression must have exactly 5 fields: minute hour day month dow" }
    }
    const parsed = parseCron(expr)
    if (!parsed) {
      return { valid: false, error: "Invalid cron expression — check field ranges and syntax" }
    }
    return { valid: true }
  }

  /**
   * Parse a cron expression and return the next run timestamp after `from` (default: now).
   * Advances minute-by-minute up to 1 year. Throws if no match is found.
   */
  export function nextRunTime(cronExpr: string, from?: Date): Date {
    const parsed = parseCron(cronExpr)
    if (!parsed) throw new Error(`Invalid cron expression: ${cronExpr}`)

    // Start one minute after `from`
    const start = from ? new Date(from.getTime()) : new Date()
    start.setSeconds(0, 0)
    start.setMinutes(start.getMinutes() + 1)

    const limit = new Date(start.getTime() + 366 * 24 * 60 * 60 * 1000) // 1 year limit

    const candidate = new Date(start.getTime())

    while (candidate < limit) {
      const month = candidate.getMonth() + 1 // 1-12
      const day = candidate.getDate()         // 1-31
      const hour = candidate.getHours()
      const minute = candidate.getMinutes()
      const dow = candidate.getDay()           // 0 (Sun) - 6 (Sat)

      if (!parsed.months.includes(month)) {
        // Advance to next month
        candidate.setMonth(candidate.getMonth() + 1, 1)
        candidate.setHours(0, 0, 0, 0)
        continue
      }

      if (!parsed.days.includes(day) || !parsed.dows.includes(dow)) {
        // Advance to next day
        candidate.setDate(candidate.getDate() + 1)
        candidate.setHours(0, 0, 0, 0)
        continue
      }

      if (!parsed.hours.includes(hour)) {
        // Advance to next hour
        candidate.setHours(candidate.getHours() + 1, 0, 0, 0)
        continue
      }

      if (!parsed.minutes.includes(minute)) {
        // Find the next valid minute in this hour
        const nextMin = parsed.minutes.find((m) => m > minute)
        if (nextMin !== undefined) {
          candidate.setMinutes(nextMin, 0, 0)
        } else {
          // No valid minute left in this hour — advance to next hour
          candidate.setHours(candidate.getHours() + 1, 0, 0, 0)
        }
        continue
      }

      // All fields match
      return new Date(candidate.getTime())
    }

    throw new Error(`No next run time found within 1 year for cron expression: ${cronExpr}`)
  }

  // ---------------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------------

  function workflowsFile(dataDir: string): string {
    return path.join(dataDir, "workflows.json")
  }

  async function readWorkflows(dataDir: string): Promise<WorkflowDef[]> {
    const file = workflowsFile(dataDir)
    if (!existsSync(file)) return []
    try {
      const raw = await readFile(file, "utf-8")
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed as WorkflowDef[]
    } catch {
      return []
    }
  }

  async function writeWorkflows(dataDir: string, workflows: WorkflowDef[]): Promise<void> {
    const file = workflowsFile(dataDir)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(workflows, null, 2), "utf-8")
  }

  function generateId(): string {
    return createHash("sha1")
      .update(Date.now().toString() + Math.random().toString())
      .digest("hex")
      .slice(0, 12)
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * List all workflows.
   */
  export async function list(dataDir: string): Promise<WorkflowDef[]> {
    return readWorkflows(dataDir)
  }

  /**
   * Create a workflow. Computes `nextRun` based on `schedule`.
   */
  export async function create(
    def: Omit<WorkflowDef, "id" | "createdAt">,
    dataDir: string,
  ): Promise<WorkflowDef> {
    const validation = validateCron(def.schedule)
    if (!validation.valid) {
      throw new Error(`Invalid cron schedule: ${validation.error}`)
    }

    const now = Date.now()
    const nextRun = def.enabled ? nextRunTime(def.schedule).getTime() : undefined

    const workflow: WorkflowDef = {
      id: generateId(),
      name: def.name,
      prompt: def.prompt,
      schedule: def.schedule,
      enabled: def.enabled,
      lastRun: def.lastRun,
      nextRun,
      createdAt: now,
    }

    const workflows = await readWorkflows(dataDir)
    workflows.push(workflow)
    await writeWorkflows(dataDir, workflows)

    return workflow
  }

  /**
   * Update fields on an existing workflow. Recomputes `nextRun` if schedule or enabled changes.
   */
  export async function update(
    id: string,
    updates: Partial<WorkflowDef>,
    dataDir: string,
  ): Promise<WorkflowDef> {
    const workflows = await readWorkflows(dataDir)
    const index = workflows.findIndex((w) => w.id === id)
    if (index === -1) throw new Error(`Workflow not found: ${id}`)

    const existing = workflows[index]
    const merged: WorkflowDef = { ...existing, ...updates, id }

    // Recompute nextRun when schedule or enabled changes
    if ("schedule" in updates || "enabled" in updates) {
      if (merged.enabled) {
        const scheduleToUse = updates.schedule ?? existing.schedule
        const validation = validateCron(scheduleToUse)
        if (!validation.valid) throw new Error(`Invalid cron schedule: ${validation.error}`)
        merged.nextRun = nextRunTime(scheduleToUse).getTime()
      } else {
        merged.nextRun = undefined
      }
    }

    workflows[index] = merged
    await writeWorkflows(dataDir, workflows)

    return merged
  }

  /**
   * Delete a workflow by ID.
   */
  export async function remove(id: string, dataDir: string): Promise<void> {
    const workflows = await readWorkflows(dataDir)
    const index = workflows.findIndex((w) => w.id === id)
    if (index === -1) throw new Error(`Workflow not found: ${id}`)
    workflows.splice(index, 1)
    await writeWorkflows(dataDir, workflows)
  }

  /**
   * Return workflows that are due to run (enabled and nextRun <= now).
   */
  export async function getDue(dataDir: string): Promise<WorkflowDef[]> {
    const now = Date.now()
    const workflows = await readWorkflows(dataDir)
    return workflows.filter((w) => w.enabled && w.nextRun !== undefined && w.nextRun <= now)
  }
}
