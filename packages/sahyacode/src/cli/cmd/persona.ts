/**
 * sahyacode persona — manage custom agent personas
 *
 * Subcommands:
 *   sahyacode persona list [--search <query>]  — list all built-in personas
 *   sahyacode persona activate <id>            — save the persona to project config
 *   sahyacode persona deactivate               — remove the active persona
 *   sahyacode persona info <id>                — show detailed info for a persona
 */

import type { Argv } from "yargs"
import path from "path"
import fs from "fs/promises"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { Persona } from "../../agent/persona"
import { Instance } from "../../project/instance"
import { Global } from "../../global"
import { Filesystem } from "../../util/filesystem"
import { EOL } from "os"

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Locate or create the project-local `.sahyacode/sahyacode.json` config file.
 * Returns the absolute path to the file that should hold the persona setting.
 */
async function resolveConfigFile(global: boolean): Promise<string> {
  if (global) {
    const dir = Global.Path.config
    await fs.mkdir(dir, { recursive: true })
    return path.join(dir, "sahyacode.json")
  }

  const projectDir = path.join(Instance.worktree, ".sahyacode")
  await fs.mkdir(projectDir, { recursive: true })
  return path.join(projectDir, "sahyacode.json")
}

/** Read an existing JSON config file, returning an empty object on missing. */
async function readJson(file: string): Promise<Record<string, unknown>> {
  try {
    const text = await fs.readFile(file, "utf8")
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Write a plain JSON config file with 2-space indentation. */
async function writeJson(file: string, data: Record<string, unknown>): Promise<void> {
  await fs.writeFile(file, JSON.stringify(data, null, 2) + EOL, "utf8")
}

/** Render a single row of the list table. */
function renderRow(id: string, name: string, description: string, active: boolean): string {
  const width = 70
  const marker = active ? UI.Style.TEXT_SUCCESS_BOLD + "* " + UI.Style.TEXT_NORMAL : "  "
  const idPart = (active ? UI.Style.TEXT_SUCCESS_BOLD : UI.Style.TEXT_HIGHLIGHT_BOLD) + id.padEnd(22) + UI.Style.TEXT_NORMAL
  const namePart = UI.Style.TEXT_DIM + name.padEnd(26) + UI.Style.TEXT_NORMAL
  const desc = description.length > 30 ? description.slice(0, 27) + "..." : description
  return `${marker}${idPart} ${namePart} ${UI.Style.TEXT_DIM}${desc}${UI.Style.TEXT_NORMAL}`
}

// ─── persona list ─────────────────────────────────────────────────────────────

const PersonaListCommand = cmd({
  command: "list",
  describe: "list all built-in personas",
  builder: (yargs: Argv) =>
    yargs.option("search", {
      alias: "s",
      type: "string",
      describe: "filter personas by keyword",
    }),

  async handler(args) {
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        const query = args.search as string | undefined
        const personas = query ? Persona.search(query) : Persona.list()

        // Determine currently active persona (stored in project config)
        let activeId: string | undefined
        try {
          const localFile = path.join(Instance.worktree, ".sahyacode", "sahyacode.json")
          const globalFile = path.join(Global.Path.config, "sahyacode.json")
          for (const file of [localFile, globalFile]) {
            if (await Filesystem.exists(file)) {
              const data = await readJson(file)
              if (data.active_persona && typeof data.active_persona === "string") {
                activeId = data.active_persona
                break
              }
            }
          }
        } catch {
          // ignore read errors
        }

        if (personas.length === 0) {
          process.stdout.write(
            UI.Style.TEXT_WARNING + `No personas match "${query}".` + UI.Style.TEXT_NORMAL + EOL,
          )
          return
        }

        const width = 70
        process.stdout.write(EOL)
        process.stdout.write(
          UI.Style.TEXT_HIGHLIGHT_BOLD + "  Available Personas" + UI.Style.TEXT_NORMAL + EOL,
        )
        if (query) {
          process.stdout.write(
            UI.Style.TEXT_DIM + `  Showing results for: "${query}"` + UI.Style.TEXT_NORMAL + EOL,
          )
        }
        process.stdout.write(EOL)
        process.stdout.write(
          "  " +
          UI.Style.TEXT_DIM_BOLD + "ID".padEnd(24) +
          "NAME".padEnd(28) +
          "DESCRIPTION" +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
        process.stdout.write("  " + UI.Style.TEXT_DIM + "─".repeat(width) + UI.Style.TEXT_NORMAL + EOL)

        for (const p of personas) {
          const isActive = p.id === activeId
          process.stdout.write("  " + renderRow(p.id, p.name, p.description, isActive) + EOL)
        }

        process.stdout.write(EOL)

        if (activeId) {
          process.stdout.write(
            UI.Style.TEXT_SUCCESS + `  Active persona: ${activeId}` + UI.Style.TEXT_NORMAL + EOL,
          )
        } else {
          process.stdout.write(
            UI.Style.TEXT_DIM + "  No persona is currently active." + UI.Style.TEXT_NORMAL + EOL,
          )
        }

        process.stdout.write(
          UI.Style.TEXT_DIM +
          `  Run "sahyacode persona activate <id>" to enable a persona.` +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
        process.stdout.write(EOL)
      },
    })
  },
})

// ─── persona info ─────────────────────────────────────────────────────────────

const PersonaInfoCommand = cmd({
  command: "info <id>",
  describe: "show detailed information for a persona",
  builder: (yargs: Argv) =>
    yargs.positional("id", {
      describe: "persona ID",
      type: "string",
      demandOption: true,
    }),

  async handler(args) {
    const id = args.id as string
    const p = Persona.get(id)

    if (!p) {
      process.stderr.write(
        UI.Style.TEXT_DANGER + `Error: persona "${id}" not found.` + UI.Style.TEXT_NORMAL + EOL,
      )
      process.stderr.write(
        UI.Style.TEXT_DIM + `Run "sahyacode persona list" to see available personas.` + UI.Style.TEXT_NORMAL + EOL,
      )
      process.exit(1)
    }

    const width = 60
    process.stdout.write(EOL)
    process.stdout.write("┌" + "─".repeat(width - 2) + "┐" + EOL)
    process.stdout.write(
      "│" +
      (UI.Style.TEXT_HIGHLIGHT_BOLD + ` ${p.name}` + UI.Style.TEXT_NORMAL).padEnd(width + 18) +
      "│" +
      EOL,
    )
    process.stdout.write("├" + "─".repeat(width - 2) + "┤" + EOL)
    process.stdout.write("│" + ` ID:          ${p.id}`.padEnd(width - 1) + "│" + EOL)
    process.stdout.write("│" + ` Description: ${p.description}`.padEnd(width - 1) + "│" + EOL)
    if (p.temperature !== undefined) {
      process.stdout.write("│" + ` Temperature: ${p.temperature}`.padEnd(width - 1) + "│" + EOL)
    }
    process.stdout.write("│" + ` Tags:        ${p.tags.join(", ")}`.padEnd(width - 1) + "│" + EOL)
    if (p.preferredTools?.length) {
      process.stdout.write("│" + ` Preferred:   ${p.preferredTools.join(", ")}`.padEnd(width - 1) + "│" + EOL)
    }
    if (p.avoidTools?.length) {
      process.stdout.write("│" + ` Avoid:       ${p.avoidTools.join(", ")}`.padEnd(width - 1) + "│" + EOL)
    }
    process.stdout.write("├" + "─".repeat(width - 2) + "┤" + EOL)
    process.stdout.write("│" + " System prompt addition:".padEnd(width - 1) + "│" + EOL)

    // Word-wrap the system prompt addition at (width - 4) characters
    const maxLine = width - 4
    const words = p.systemPromptAddition.split(" ")
    let line = ""
    for (const word of words) {
      if (line.length + word.length + 1 > maxLine) {
        process.stdout.write("│  " + line.padEnd(width - 4) + " │" + EOL)
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    if (line) {
      process.stdout.write("│  " + line.padEnd(width - 4) + " │" + EOL)
    }

    process.stdout.write("└" + "─".repeat(width - 2) + "┘" + EOL)
    process.stdout.write(EOL)
  },
})

// ─── persona activate ─────────────────────────────────────────────────────────

const PersonaActivateCommand = cmd({
  command: "activate <id>",
  describe: "activate a persona and save it to the project config",
  builder: (yargs: Argv) =>
    yargs
      .positional("id", {
        describe: "persona ID to activate",
        type: "string",
        demandOption: true,
      })
      .option("global", {
        alias: "g",
        type: "boolean",
        describe: "save to global config instead of project config",
        default: false,
      }),

  async handler(args) {
    const id = args.id as string
    const isGlobal = Boolean(args.global)

    const persona = Persona.get(id)
    if (!persona) {
      process.stderr.write(
        UI.Style.TEXT_DANGER + `Error: persona "${id}" not found.` + UI.Style.TEXT_NORMAL + EOL,
      )
      process.stderr.write(
        UI.Style.TEXT_DIM + `Run "sahyacode persona list" to see available personas.` + UI.Style.TEXT_NORMAL + EOL,
      )
      process.exit(1)
    }

    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        const configFile = await resolveConfigFile(isGlobal)
        const existing = await readJson(configFile)

        // Persist the active persona ID and inject the system prompt addition
        // into the agent prompt of the default "build" agent so the LLM sees it.
        const updated: Record<string, unknown> = {
          ...existing,
          active_persona: persona.id,
          agent: {
            ...(typeof existing.agent === "object" && existing.agent !== null ? existing.agent : {}),
            build: {
              ...(
                typeof existing.agent === "object" &&
                existing.agent !== null &&
                "build" in existing.agent &&
                typeof (existing.agent as Record<string, unknown>).build === "object" &&
                (existing.agent as Record<string, unknown>).build !== null
                  ? (existing.agent as Record<string, unknown>).build as Record<string, unknown>
                  : {}
              ),
              prompt: persona.systemPromptAddition,
              ...(persona.temperature !== undefined ? { temperature: persona.temperature } : {}),
            },
          },
        }

        await writeJson(configFile, updated)

        const scope = isGlobal ? "global" : "project"
        process.stdout.write(
          UI.Style.TEXT_SUCCESS_BOLD +
          `Persona "${persona.name}" activated (${scope}).` +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
        process.stdout.write(
          UI.Style.TEXT_DIM +
          `Config written to: ${configFile}` +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
        process.stdout.write(
          UI.Style.TEXT_DIM +
          `Run "sahyacode persona deactivate" to remove the active persona.` +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
      },
    })
  },
})

// ─── persona deactivate ───────────────────────────────────────────────────────

const PersonaDeactivateCommand = cmd({
  command: "deactivate",
  describe: "remove the active persona from the project config",
  builder: (yargs: Argv) =>
    yargs.option("global", {
      alias: "g",
      type: "boolean",
      describe: "remove from global config instead of project config",
      default: false,
    }),

  async handler(args) {
    const isGlobal = Boolean(args.global)

    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        const configFile = await resolveConfigFile(isGlobal)

        if (!(await Filesystem.exists(configFile))) {
          process.stdout.write(
            UI.Style.TEXT_DIM + "No persona is currently active." + UI.Style.TEXT_NORMAL + EOL,
          )
          return
        }

        const existing = await readJson(configFile)

        if (!existing.active_persona) {
          process.stdout.write(
            UI.Style.TEXT_DIM + "No persona is currently active." + UI.Style.TEXT_NORMAL + EOL,
          )
          return
        }

        const previousId = existing.active_persona as string

        // Remove the persona settings: active_persona key, and the injected
        // prompt/temperature from the build agent (leaving other build config intact).
        const { active_persona, ...rest } = existing

        const agent = (typeof rest.agent === "object" && rest.agent !== null)
          ? { ...rest.agent as Record<string, unknown> }
          : {}

        if ("build" in agent && typeof agent.build === "object" && agent.build !== null) {
          const { prompt, temperature, ...buildRest } = agent.build as Record<string, unknown>
          // Only strip if the prompt matches a known persona (avoid removing user-set prompts)
          const persona = Persona.get(previousId)
          const promptMatchesPersona = persona && prompt === persona.systemPromptAddition
          agent.build = {
            ...buildRest,
            ...(promptMatchesPersona ? {} : { prompt }),
            ...(promptMatchesPersona ? {} : (temperature !== undefined ? { temperature } : {})),
          }
          // Clean up empty build object
          if (Object.keys(agent.build as object).length === 0) {
            delete agent.build
          }
        }

        const updated: Record<string, unknown> = {
          ...rest,
          ...(Object.keys(agent).length > 0 ? { agent } : {}),
        }

        await writeJson(configFile, updated)

        process.stdout.write(
          UI.Style.TEXT_SUCCESS_BOLD +
          `Persona "${previousId}" deactivated.` +
          UI.Style.TEXT_NORMAL +
          EOL,
        )
      },
    })
  },
})

// ─── root command ─────────────────────────────────────────────────────────────

export const PersonaCommand = cmd({
  command: "persona",
  describe: "manage agent personas",
  builder: (yargs) =>
    yargs
      .command(PersonaListCommand)
      .command(PersonaInfoCommand)
      .command(PersonaActivateCommand)
      .command(PersonaDeactivateCommand)
      .demandCommand(1, "Please specify a subcommand: list, info, activate, or deactivate"),
  async handler() {},
})
