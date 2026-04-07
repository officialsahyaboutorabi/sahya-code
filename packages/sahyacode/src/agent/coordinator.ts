/**
 * Multi-Agent Parallel Execution Coordinator
 *
 * Accepts a high-level goal, decomposes it into N independent sub-tasks via an
 * LLM planning step, spawns N child sessions that run concurrently, then
 * collects and merges their outputs.  File conflicts (same path touched by
 * more than one agent) are detected and flagged in the final report.
 */

import { Session } from "../session"
import { SessionPrompt } from "../session/prompt"
import { SessionID, MessageID } from "../session/schema"
import { MessageV2 } from "../session/message-v2"
import { Provider } from "../provider/provider"
import { Config } from "../config/config"
import { Log } from "../util/log"
import { generateObject } from "ai"
import { ModelID, ProviderID } from "../provider/schema"
import z from "zod"

// ─── Public types ─────────────────────────────────────────────────────────────

export namespace Coordinator {
  const log = Log.create({ service: "coordinator" })

  /** One decomposed unit of work for a single agent */
  export interface SubTask {
    /** Short unique identifier within this run, e.g. "task-1" */
    id: string
    /** Human-readable description shown in the UI */
    description: string
    /** Full prompt sent to the child agent */
    prompt: string
    /** Which agent type to use (defaults to "general") */
    agentType: string
  }

  export type SubTaskStatus = "pending" | "running" | "done" | "error"

  export interface SubTaskResult {
    subTask: SubTask
    sessionID: SessionID
    status: SubTaskStatus
    output: string
    error?: string
    /** File paths mentioned in the agent output (heuristically extracted) */
    filesModified: string[]
  }

  export interface FileConflict {
    file: string
    /** IDs of the sub-tasks that both touched this file */
    taskIDs: string[]
  }

  export interface CoordinatorResult {
    goal: string
    subTasks: SubTask[]
    results: SubTaskResult[]
    conflicts: FileConflict[]
    /** Human-readable merged summary of all agent outputs */
    mergedSummary: string
  }

  // ─── Decomposition ──────────────────────────────────────────────────────────

  const DecompositionSchema = z.object({
    subTasks: z
      .array(
        z.object({
          id: z.string().describe("Short unique identifier, e.g. 'task-1'"),
          description: z.string().describe("One-line human-readable description"),
          prompt: z.string().describe("Full prompt for the child agent to execute"),
          agentType: z
            .string()
            .default("general")
            .describe("Agent type: 'general', 'explore', or any configured agent name"),
        }),
      )
      .min(1)
      .max(8),
  })

  const DECOMPOSE_SYSTEM = `You are a task-decomposition assistant for an AI coding tool.
Given a high-level engineering goal, break it into a list of independent, parallel sub-tasks.

Rules:
- Each sub-task must be completable by a single autonomous coding agent
- Sub-tasks should be as independent as possible — minimal file overlap
- Be concrete and actionable; include enough context for the agent to work alone
- Use agentType "explore" for read-only research tasks, "general" (default) for code edits
- Return 2–6 sub-tasks; avoid splitting so finely that tasks become trivially small`

  async function decomposeGoal(
    goal: string,
    model: { providerID: ProviderID; modelID: ModelID },
  ): Promise<SubTask[]> {
    const resolved = await Provider.getModel(model.providerID, model.modelID)
    const language = await Provider.getLanguage(resolved)

    const result = await generateObject({
      model: language,
      schema: DecompositionSchema,
      messages: [
        { role: "system", content: DECOMPOSE_SYSTEM },
        {
          role: "user",
          content: `Decompose this goal into parallel sub-tasks:\n\n${goal}`,
        },
      ],
      temperature: 0.3,
    })

    return result.object.subTasks as SubTask[]
  }

  // ─── File-conflict detection ─────────────────────────────────────────────

  /**
   * Heuristically extract file paths from free-form agent output text.
   * Matches tokens like `src/foo/bar.ts` or `/abs/path/file.py`.
   */
  function extractFilesMentioned(text: string): string[] {
    const re = /(?:^|[\s"'`(])([./][\w./\-@]+\.\w+)/gm
    const results = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      results.add(m[1].trim())
    }
    return [...results]
  }

  function detectConflicts(results: SubTaskResult[]): FileConflict[] {
    const fileToTasks = new Map<string, string[]>()
    for (const r of results) {
      for (const file of r.filesModified) {
        const list = fileToTasks.get(file) ?? []
        list.push(r.subTask.id)
        fileToTasks.set(file, list)
      }
    }
    const conflicts: FileConflict[] = []
    for (const [file, taskIDs] of fileToTasks) {
      if (taskIDs.length > 1) conflicts.push({ file, taskIDs })
    }
    return conflicts
  }

  // ─── Summary builder ────────────────────────────────────────────────────

  function buildMergedSummary(results: SubTaskResult[], conflicts: FileConflict[]): string {
    const lines: string[] = ["# Parallel Execution Summary", ""]

    for (const r of results) {
      const icon = r.status === "done" ? "✓" : "✗"
      lines.push(`## ${icon} [${r.subTask.id}] ${r.subTask.description}`)
      lines.push(`Session: ${r.sessionID}`)
      if (r.error) {
        lines.push(`**Error:** ${r.error}`)
      } else {
        const snippet = r.output.length > 600 ? r.output.slice(0, 600) + "…" : r.output
        lines.push(snippet)
      }
      lines.push("")
    }

    if (conflicts.length > 0) {
      lines.push("## ⚠ File Conflicts Detected")
      lines.push("")
      lines.push("The following files were modified by multiple agents. Manual review is required:")
      lines.push("")
      for (const c of conflicts) {
        lines.push(`- \`${c.file}\` — tasks: ${c.taskIDs.join(", ")}`)
      }
      lines.push("")
    }

    const done = results.filter((r) => r.status === "done").length
    const total = results.length
    lines.push(`---`)
    lines.push(`**${done}/${total} sub-tasks completed successfully.**`)

    return lines.join("\n")
  }

  // ─── Resolve the model for planning ─────────────────────────────────────

  async function resolveModel(
    parentSessionID: SessionID,
    parentMessageID: MessageID,
  ): Promise<{ providerID: ProviderID; modelID: ModelID }> {
    try {
      const msg = MessageV2.get({ sessionID: parentSessionID, messageID: parentMessageID })
      if (msg.info.role === "assistant") {
        return {
          providerID: msg.info.providerID as ProviderID,
          modelID: msg.info.modelID as ModelID,
        }
      }
    } catch {
      // fall through to default
    }
    return Provider.defaultModel()
  }

  // ─── Execute a single sub-task ───────────────────────────────────────────

  async function runSubTask(
    subTask: SubTask,
    parentSessionID: SessionID,
    model: { providerID: ProviderID; modelID: ModelID },
  ): Promise<SubTaskResult> {
    let childSessionID: SessionID = "" as SessionID

    try {
      const childSession = await Session.create({
        parentID: parentSessionID,
        title: `[parallel/${subTask.id}] ${subTask.description}`,
      })
      childSessionID = childSession.id

      log.info("coordinator: running sub-task", { taskID: subTask.id, sessionID: childSessionID })

      const result = await SessionPrompt.prompt({
        sessionID: childSessionID,
        messageID: MessageID.ascending(),
        model: {
          providerID: model.providerID,
          modelID: model.modelID,
        },
        agent: subTask.agentType,
        parts: [{ type: "text", text: subTask.prompt }],
      })

      const text = result.parts.findLast((p) => p.type === "text")?.text ?? ""
      const filesModified = extractFilesMentioned(text)

      return {
        subTask,
        sessionID: childSessionID,
        status: "done",
        output: text,
        filesModified,
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("coordinator: sub-task error", { taskID: subTask.id, error: errMsg })
      return {
        subTask,
        sessionID: childSessionID,
        status: "error",
        output: "",
        error: errMsg,
        filesModified: [],
      }
    }
  }

  // ─── Public entry point ──────────────────────────────────────────────────

  /**
   * Run the full multi-agent parallel coordination flow.
   *
   * 1. Resolves the LLM model from the parent session context
   * 2. Decomposes `goal` into N sub-tasks via an LLM planning call
   * 3. Spawns N child sessions concurrently
   * 4. Detects file conflicts across agents
   * 5. Returns a merged summary report
   */
  export async function run(input: {
    goal: string
    parentSessionID: SessionID
    parentMessageID: MessageID
  }): Promise<CoordinatorResult> {
    log.info("coordinator.run start", { goal: input.goal })

    const model = await resolveModel(input.parentSessionID, input.parentMessageID)
    log.info("coordinator: using model", { providerID: model.providerID, modelID: model.modelID })

    const subTasks = await decomposeGoal(input.goal, model)
    log.info("coordinator: decomposed", {
      count: subTasks.length,
      tasks: subTasks.map((t) => t.id),
    })

    // Run all sub-tasks in parallel
    const results = await Promise.all(
      subTasks.map((task) => runSubTask(task, input.parentSessionID, model)),
    )

    const conflicts = detectConflicts(results)
    if (conflicts.length > 0) {
      log.info("coordinator: conflicts detected", { count: conflicts.length })
    }

    const mergedSummary = buildMergedSummary(results, conflicts)
    log.info("coordinator.run complete", {
      done: results.filter((r) => r.status === "done").length,
      errors: results.filter((r) => r.status === "error").length,
      conflicts: conflicts.length,
    })

    return {
      goal: input.goal,
      subTasks,
      results,
      conflicts,
      mergedSummary,
    }
  }
}
