import type { Argv } from "yargs"
import path from "path"
import fs from "fs"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { ArchitectureDiagram } from "../../code-intelligence/diagram"
import { renderDiagramHTML } from "../../code-intelligence/diagram.html"

export const DiagramCommand = cmd({
  command: "diagram",
  describe: "generate architecture diagrams from the codebase in Mermaid format",
  builder: (yargs: Argv) => {
    return yargs
      .option("type", {
        describe: "diagram type to generate",
        type: "string",
        choices: ["component", "dependency", "class"] as const,
        default: "component",
      })
      .option("root", {
        describe: "root directory to analyse",
        type: "string",
        default: "./src",
      })
      .option("entry", {
        describe: "optional entry-point file (used by dependency diagram)",
        type: "string",
      })
      .option("max-depth", {
        describe: "maximum directory depth to traverse",
        type: "number",
        default: 3,
      })
      .option("include-external", {
        describe: "include node_modules / external imports in the dependency graph",
        type: "boolean",
        default: false,
      })
      .option("output", {
        describe: "write output to this file path (.md, .html, or plain .mmd). Omit to print to stdout",
        type: "string",
        alias: "o",
      })
      .option("html", {
        describe: "wrap the diagram in a self-contained HTML page (requires --output)",
        type: "boolean",
        default: false,
      })
  },
  handler: async (args) => {
    const rootDir = path.resolve(args.root as string)

    // Validate the root directory exists
    if (!fs.existsSync(rootDir)) {
      UI.println(
        UI.Style.TEXT_DANGER_BOLD +
          `Error: root directory "${rootDir}" does not exist.` +
          UI.Style.TEXT_NORMAL,
      )
      process.exitCode = 1
      return
    }

    const diagramType = (args.type as ArchitectureDiagram.DiagramType) ?? "component"

    const options: ArchitectureDiagram.DiagramOptions = {
      type: diagramType,
      rootDir,
      maxDepth: args["max-depth"] as number | undefined,
      includeExternal: args["include-external"] as boolean | undefined,
      entryPoint: args.entry as string | undefined,
    }

    UI.println(
      UI.Style.TEXT_INFO +
        `Generating ${diagramType} diagram for ${rootDir} …` +
        UI.Style.TEXT_NORMAL,
    )

    let result: ArchitectureDiagram.DiagramResult
    try {
      result = await ArchitectureDiagram.generate(options)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      UI.println(UI.Style.TEXT_DANGER_BOLD + `Failed to generate diagram: ${message}` + UI.Style.TEXT_NORMAL)
      process.exitCode = 1
      return
    }

    const outputPath = args.output as string | undefined
    const wrapHtml = args.html as boolean

    if (outputPath) {
      const absOutput = path.resolve(outputPath)
      const ext = path.extname(absOutput).toLowerCase()

      let content: string

      if (wrapHtml || ext === ".html" || ext === ".htm") {
        const title = `Architecture Diagram — ${diagramType}`
        content = renderDiagramHTML(result.mermaid, title)
      } else if (ext === ".md") {
        content = buildMarkdown(result)
      } else {
        // Raw mermaid (.mmd or anything else)
        content = result.mermaid + "\n"
      }

      try {
        fs.mkdirSync(path.dirname(absOutput), { recursive: true })
        fs.writeFileSync(absOutput, content, "utf8")
        UI.println(
          UI.Style.TEXT_SUCCESS +
            `Diagram written to ${absOutput}` +
            UI.Style.TEXT_NORMAL,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        UI.println(UI.Style.TEXT_DANGER_BOLD + `Failed to write file: ${message}` + UI.Style.TEXT_NORMAL)
        process.exitCode = 1
        return
      }
    } else {
      // No output path — print raw Mermaid to stdout
      process.stdout.write(result.mermaid + "\n")
    }

    UI.println(
      UI.Style.TEXT_DIM +
        `Nodes: ${result.nodeCount}  Edges: ${result.edgeCount}` +
        UI.Style.TEXT_NORMAL,
    )
  },
})

function buildMarkdown(result: ArchitectureDiagram.DiagramResult): string {
  const heading = `# Architecture Diagram (${result.diagramType})\n\n`
  const meta = `> Nodes: ${result.nodeCount} | Edges: ${result.edgeCount}\n\n`
  const fence = "```mermaid\n" + result.mermaid + "\n```\n"
  return heading + meta + fence
}
