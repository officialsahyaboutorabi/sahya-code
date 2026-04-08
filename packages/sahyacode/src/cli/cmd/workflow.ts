import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { Global } from "../../global"
import { Workflow } from "../../workflow"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dataDir(): string {
  return Global.Path.data
}

function formatDate(ts: number | undefined): string {
  if (ts === undefined) return "—"
  return new Date(ts).toLocaleString()
}

function formatSchedule(schedule: string): string {
  return schedule
}

function padEnd(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length)
}

// ---------------------------------------------------------------------------
// workflow list
// ---------------------------------------------------------------------------

const WorkflowListCommand = cmd({
  command: "list",
  describe: "list all workflows",
  builder: (yargs: Argv) => yargs,
  handler: async () => {
    const workflows = await Workflow.list(dataDir())

    if (workflows.length === 0) {
      console.log(UI.Style.TEXT_DIM + "No workflows configured." + UI.Style.TEXT_NORMAL)
      return
    }

    const width = 80
    console.log("")
    console.log("┌" + "─".repeat(width - 2) + "┐")
    console.log("│" + " WORKFLOWS ".padStart((width + 10) / 2).padEnd(width - 2) + "│")
    console.log("├" + "─".repeat(width - 2) + "┤")

    for (const wf of workflows) {
      const status = wf.enabled
        ? UI.Style.TEXT_SUCCESS + "enabled " + UI.Style.TEXT_NORMAL
        : UI.Style.TEXT_DIM + "disabled" + UI.Style.TEXT_NORMAL
      const idStr = UI.Style.TEXT_DIM + wf.id + UI.Style.TEXT_NORMAL
      const header = `│ ${status} ${idStr}  ${wf.name}`
      console.log(header.padEnd(width + (UI.Style.TEXT_SUCCESS.length + UI.Style.TEXT_NORMAL.length) * 2) + "│")

      console.log("│  " + UI.Style.TEXT_DIM + "schedule: " + UI.Style.TEXT_NORMAL + padEnd(wf.schedule, 25) +
        UI.Style.TEXT_DIM + "  next: " + UI.Style.TEXT_NORMAL + formatDate(wf.nextRun) + " │".padStart(width - 2 - 10 - wf.schedule.length - 8))

      const promptPreview = wf.prompt.length > 60 ? wf.prompt.slice(0, 57) + "..." : wf.prompt
      console.log("│  " + UI.Style.TEXT_DIM + "prompt: " + UI.Style.TEXT_NORMAL + promptPreview + " │".padStart(width - 2 - 10 - promptPreview.length))

      if (wf.lastRun !== undefined) {
        console.log("│  " + UI.Style.TEXT_DIM + "last run: " + UI.Style.TEXT_NORMAL + formatDate(wf.lastRun) + " │".padStart(width - 2 - 12 - formatDate(wf.lastRun).length))
      }

      console.log("├" + "─".repeat(width - 2) + "┤")
    }

    // Replace last separator with bottom border
    process.stdout.write("\x1B[1A")
    console.log("└" + "─".repeat(width - 2) + "┘")
    console.log("")
  },
})

// ---------------------------------------------------------------------------
// workflow create
// ---------------------------------------------------------------------------

const WorkflowCreateCommand = cmd({
  command: "create",
  describe: "create a new workflow",
  builder: (yargs: Argv) => {
    return yargs
      .option("name", {
        describe: "workflow name",
        type: "string",
        demandOption: true,
      })
      .option("prompt", {
        describe: "prompt to send to the agent",
        type: "string",
        demandOption: true,
      })
      .option("schedule", {
        describe: 'cron expression (5-field), e.g. "0 9 * * 1-5"',
        type: "string",
        demandOption: true,
      })
      .option("disabled", {
        describe: "create the workflow in disabled state",
        type: "boolean",
        default: false,
      })
  },
  handler: async (args) => {
    const validation = Workflow.validateCron(args.schedule)
    if (!validation.valid) {
      console.error(UI.Style.TEXT_DANGER + "Invalid schedule: " + validation.error + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }

    try {
      const wf = await Workflow.create(
        {
          name: args.name,
          prompt: args.prompt,
          schedule: args.schedule,
          enabled: !args.disabled,
        },
        dataDir(),
      )

      console.log("")
      console.log(
        UI.Style.TEXT_SUCCESS_BOLD + "Workflow created" + UI.Style.TEXT_NORMAL,
      )
      console.log(UI.Style.TEXT_DIM + "  id:       " + UI.Style.TEXT_NORMAL + wf.id)
      console.log(UI.Style.TEXT_DIM + "  name:     " + UI.Style.TEXT_NORMAL + wf.name)
      console.log(UI.Style.TEXT_DIM + "  schedule: " + UI.Style.TEXT_NORMAL + wf.schedule)
      console.log(UI.Style.TEXT_DIM + "  enabled:  " + UI.Style.TEXT_NORMAL + wf.enabled)
      if (wf.nextRun !== undefined) {
        console.log(UI.Style.TEXT_DIM + "  next run: " + UI.Style.TEXT_NORMAL + formatDate(wf.nextRun))
      }
      console.log("")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(UI.Style.TEXT_DANGER + "Error: " + message + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }
  },
})

// ---------------------------------------------------------------------------
// workflow enable / disable
// ---------------------------------------------------------------------------

const WorkflowEnableCommand = cmd({
  command: "enable <id>",
  describe: "enable a workflow",
  builder: (yargs: Argv) => {
    return yargs.positional("id", {
      describe: "workflow ID",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (args) => {
    try {
      const wf = await Workflow.update(args.id, { enabled: true }, dataDir())
      console.log(
        UI.Style.TEXT_SUCCESS_BOLD + "Workflow enabled" + UI.Style.TEXT_NORMAL +
        UI.Style.TEXT_DIM + "  next run: " + UI.Style.TEXT_NORMAL + formatDate(wf.nextRun),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(UI.Style.TEXT_DANGER + "Error: " + message + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }
  },
})

const WorkflowDisableCommand = cmd({
  command: "disable <id>",
  describe: "disable a workflow",
  builder: (yargs: Argv) => {
    return yargs.positional("id", {
      describe: "workflow ID",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (args) => {
    try {
      await Workflow.update(args.id, { enabled: false }, dataDir())
      console.log(UI.Style.TEXT_SUCCESS_BOLD + "Workflow disabled" + UI.Style.TEXT_NORMAL)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(UI.Style.TEXT_DANGER + "Error: " + message + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }
  },
})

// ---------------------------------------------------------------------------
// workflow delete
// ---------------------------------------------------------------------------

const WorkflowDeleteCommand = cmd({
  command: "delete <id>",
  describe: "delete a workflow",
  builder: (yargs: Argv) => {
    return yargs.positional("id", {
      describe: "workflow ID",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (args) => {
    try {
      await Workflow.remove(args.id, dataDir())
      console.log(
        UI.Style.TEXT_SUCCESS_BOLD + "Workflow deleted" + UI.Style.TEXT_NORMAL +
        UI.Style.TEXT_DIM + " (" + args.id + ")" + UI.Style.TEXT_NORMAL,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(UI.Style.TEXT_DANGER + "Error: " + message + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }
  },
})

// ---------------------------------------------------------------------------
// workflow run <id>   — run a workflow immediately
// ---------------------------------------------------------------------------

const WorkflowRunCommand = cmd({
  command: "run <id>",
  describe: "run a workflow immediately",
  builder: (yargs: Argv) => {
    return yargs.positional("id", {
      describe: "workflow ID",
      type: "string",
      demandOption: true,
    })
  },
  handler: async (args) => {
    const dir = dataDir()
    const workflows = await Workflow.list(dir)
    const wf = workflows.find((w) => w.id === args.id)

    if (!wf) {
      console.error(UI.Style.TEXT_DANGER + `Workflow not found: ${args.id}` + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }

    console.log("")
    console.log(
      UI.Style.TEXT_INFO_BOLD + "Running workflow: " + UI.Style.TEXT_NORMAL +
      UI.Style.TEXT_NORMAL_BOLD + wf.name + UI.Style.TEXT_NORMAL,
    )
    console.log(UI.Style.TEXT_DIM + "  prompt: " + UI.Style.TEXT_NORMAL + wf.prompt)
    console.log("")

    const runAt = Date.now()

    try {
      // Spawn the agent via the existing `run` command machinery.
      // We use Bun.spawn (project targets Bun runtime) to run sahyacode itself
      // with the `run` subcommand so the full agent lifecycle is reused.
      const { execa } = await import("execa")
      const proc = await execa(process.execPath, [process.argv[1], "run", wf.prompt], {
        stdio: "inherit",
        env: { ...process.env },
      })

      const result: Workflow.WorkflowResult = {
        workflowId: wf.id,
        runAt,
        success: true,
        output: "Agent completed successfully",
      }

      // Update lastRun and recompute nextRun
      await Workflow.update(
        wf.id,
        {
          lastRun: runAt,
          nextRun: wf.enabled ? Workflow.nextRunTime(wf.schedule).getTime() : undefined,
        },
        dir,
      )

      console.log("")
      console.log(UI.Style.TEXT_SUCCESS_BOLD + "Workflow run complete" + UI.Style.TEXT_NORMAL)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      await Workflow.update(wf.id, { lastRun: runAt }, dir)

      console.error("")
      console.error(UI.Style.TEXT_DANGER + "Workflow run failed: " + message + UI.Style.TEXT_NORMAL)
      process.exit(1)
    }
  },
})

// ---------------------------------------------------------------------------
// Top-level workflow command
// ---------------------------------------------------------------------------

export const WorkflowCommand = cmd({
  command: "workflow",
  describe: "manage and run scheduled workflow automations",
  builder: (yargs: Argv) =>
    yargs
      .command(WorkflowListCommand)
      .command(WorkflowCreateCommand)
      .command(WorkflowEnableCommand)
      .command(WorkflowDisableCommand)
      .command(WorkflowDeleteCommand)
      .command(WorkflowRunCommand)
      .demandCommand(),
  async handler() {},
})
