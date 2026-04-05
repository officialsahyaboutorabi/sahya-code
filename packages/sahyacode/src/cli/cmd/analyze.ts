import type { Argv } from "yargs"
import path from "path"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { CodeIntelligence } from "../../code-intelligence"
import { UI } from "../ui"
import { Log } from "../../util/log"
import { Glob } from "../../util/glob"
import { Instance } from "../../project/instance"
import { FileIgnore } from "../../file/ignore"

const log = Log.create({ service: "analyze-cmd" })

export const AnalyzeCommand = cmd({
  command: "analyze <path>",
  describe: "analyze codebase for metrics, dependencies, and dead code",
  builder: (yargs: Argv) => {
    return yargs
      .positional("path", {
        describe: "path to analyze (file or directory)",
        type: "string",
        default: ".",
      })
      .option("metrics", {
        describe: "show code metrics",
        type: "boolean",
        default: true,
      })
      .option("dependencies", {
        describe: "show dependency analysis",
        type: "boolean",
        default: false,
      })
      .option("circular", {
        describe: "detect circular dependencies",
        type: "boolean",
        default: false,
      })
      .option("dead-code", {
        describe: "find potentially unused code",
        type: "boolean",
        default: false,
      })
      .option("symbols", {
        describe: "search for symbols",
        type: "string",
      })
      .option("format", {
        describe: "output format",
        type: "string",
        choices: ["table", "json", "compact"],
        default: "table",
      })
  },
  handler: async (args) => {
    const targetPath = path.resolve(args.path)
    
    await bootstrap(targetPath, async () => {
      // Initialize code intelligence
      await CodeIntelligence.init()

      // Collect files to analyze
      const files = await collectFiles(targetPath)
      
      if (files.length === 0) {
        console.log(UI.Style.TEXT_WARNING + "⚠ No supported files found to analyze" + UI.Style.TEXT_NORMAL)
        return
      }

      console.log(UI.Style.TEXT_INFO + `ℹ Analyzing ${files.length} files...` + UI.Style.TEXT_NORMAL)

      // Index all files
      for (const file of files) {
        try {
          await CodeIntelligence.indexFile(file)
        } catch (err) {
          log.warn(`Failed to index ${file}`, { err })
        }
      }

      // Run requested analyses
      const results: AnalysisResults = {
        files: files.length,
        metrics: undefined,
        dependencies: undefined,
        circular: undefined,
        deadCode: undefined,
        symbols: undefined,
      }

      if (args.metrics) {
        results.metrics = await CodeIntelligence.analyzeProject()
      }

      if (args.dependencies) {
        const allFiles = files.slice(0, 20) // Limit for performance
        const deps: Record<string, Awaited<ReturnType<typeof CodeIntelligence.getDependencies>>> = {}
        for (const file of allFiles) {
          deps[file] = await CodeIntelligence.getDependencies(file)
        }
        results.dependencies = deps
      }

      if (args.circular) {
        results.circular = await CodeIntelligence.detectCircularDependencies()
      }

      if (args.deadCode) {
        results.deadCode = await CodeIntelligence.getDeadCode()
      }

      if (args.symbols) {
        results.symbols = await CodeIntelligence.searchSymbols(args.symbols, 20)
      }

      // Output results
      if (args.format === "json") {
        console.log(JSON.stringify(results, null, 2))
      } else {
        displayResults(results, args.format as "table" | "compact")
      }
    })
  },
})

interface AnalysisResults {
  files: number
  metrics?: Awaited<ReturnType<typeof CodeIntelligence.analyzeProject>>
  dependencies?: Record<string, Awaited<ReturnType<typeof CodeIntelligence.getDependencies>>>
  circular?: Awaited<ReturnType<typeof CodeIntelligence.detectCircularDependencies>>
  deadCode?: Awaited<ReturnType<typeof CodeIntelligence.getDeadCode>>
  symbols?: Awaited<ReturnType<typeof CodeIntelligence.searchSymbols>>
}

async function collectFiles(targetPath: string): Promise<string[]> {
  const stats = await Bun.file(targetPath).exists()
    ? { isDirectory: () => false }
    : await Bun.file(targetPath).stat()

  if (!stats) {
    // Try as directory
    try {
      const files = await Glob.scan("**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", {
        cwd: targetPath,
        absolute: true,
        include: "file",
        dot: false,
      })
      return files.filter((f) => !FileIgnore.PATTERNS.some((p) => f.includes(p)))
    } catch {
      return []
    }
  }

  // Single file
  if (await CodeIntelligence.isSupported(targetPath)) {
    return [targetPath]
  }

  return []
}

function displayResults(results: AnalysisResults, format: "table" | "compact"): void {
  const width = 60

  if (format === "compact") {
    if (results.metrics) {
      console.log(`Files: ${results.metrics.totalFiles}, Lines: ${results.metrics.totalLines}, Avg Complexity: ${results.metrics.averageComplexity.toFixed(1)}`)
    }
    if (results.circular) {
      console.log(`Circular Dependencies: ${results.circular.length}`)
    }
    if (results.deadCode) {
      console.log(`Dead Code Items: ${results.deadCode.length}`)
    }
    return
  }

  // Table format
  console.log("")
  console.log("┌" + "─".repeat(width - 2) + "┐")
  console.log("│" + " CODE ANALYSIS RESULTS ".padStart((width + 21) / 2).padEnd(width - 2) + "│")
  console.log("├" + "─".repeat(width - 2) + "┤")
  console.log("│" + ` Files Analyzed: ${results.files}`.padEnd(width - 2) + "│")
  console.log("└" + "─".repeat(width - 2) + "┘")
  console.log("")

  if (results.metrics) {
    console.log("┌" + "─".repeat(width - 2) + "┐")
    console.log("│" + " METRICS ".padStart((width + 9) / 2).padEnd(width - 2) + "│")
    console.log("├" + "─".repeat(width - 2) + "┤")
    console.log(renderRow("Total Files", results.metrics.totalFiles.toString(), width))
    console.log(renderRow("Total Lines", results.metrics.totalLines.toLocaleString(), width))
    console.log(renderRow("Code Lines", results.metrics.totalCodeLines.toLocaleString(), width))
    console.log(renderRow("Avg Complexity", results.metrics.averageComplexity.toFixed(2), width))
    console.log(renderRow("Max Complexity", results.metrics.maxComplexity.toString(), width))
    console.log("└" + "─".repeat(width - 2) + "┘")
    console.log("")

    if (results.metrics.complexFunctions.length > 0) {
      console.log("┌" + "─".repeat(width - 2) + "┐")
      console.log("│" + " COMPLEX FUNCTIONS ".padStart((width + 19) / 2).padEnd(width - 2) + "│")
      console.log("├" + "─".repeat(width - 2) + "┤")
      for (const fn of results.metrics.complexFunctions.slice(0, 5)) {
        const name = fn.name.length > 35 ? fn.name.slice(0, 32) + "..." : fn.name
        const file = path.relative(Instance.directory, fn.file).slice(0, 20)
        console.log("│" + ` ${name} (${file})`.padEnd(width - 2) + "│")
      }
      console.log("└" + "─".repeat(width - 2) + "┘")
      console.log("")
    }
  }

  if (results.circular && results.circular.length > 0) {
    console.log("┌" + "─".repeat(width - 2) + "┐")
    console.log("│" + ` CIRCULAR DEPENDENCIES (${results.circular.length}) `.padStart((width + 24) / 2).padEnd(width - 2) + "│")
    console.log("├" + "─".repeat(width - 2) + "┤")
    for (const cycle of results.circular.slice(0, 3)) {
      const cycleStr = cycle.path.slice(0, 3).join(" → ") + (cycle.path.length > 3 ? " → ..." : "")
      console.log("│" + ` ${cycleStr}`.slice(0, width - 2).padEnd(width - 2) + "│")
    }
    console.log("└" + "─".repeat(width - 2) + "┘")
    console.log("")
  }

  if (results.deadCode && results.deadCode.length > 0) {
    console.log("┌" + "─".repeat(width - 2) + "┐")
    console.log("│" + ` POTENTIALLY UNUSED CODE (${results.deadCode.length}) `.padStart((width + 27) / 2).padEnd(width - 2) + "│")
    console.log("├" + "─".repeat(width - 2) + "┤")
    for (const item of results.deadCode.slice(0, 5)) {
      const name = item.name.length > 30 ? item.name.slice(0, 27) + "..." : item.name
      const file = path.relative(Instance.directory, item.file).slice(0, 20)
      console.log("│" + ` ${item.kind}: ${name} (${file})`.padEnd(width - 2) + "│")
    }
    console.log("└" + "─".repeat(width - 2) + "┘")
    console.log("")
  }

  if (results.symbols && results.symbols.length > 0) {
    console.log("┌" + "─".repeat(width - 2) + "┐")
    console.log("│" + ` SYMBOLS FOUND (${results.symbols.length}) `.padStart((width + 17) / 2).padEnd(width - 2) + "│")
    console.log("├" + "─".repeat(width - 2) + "┤")
    for (const sym of results.symbols.slice(0, 10)) {
      const name = sym.name.length > 30 ? sym.name.slice(0, 27) + "..." : sym.name
      const kind = sym.kind.padEnd(10)
      console.log("│" + ` ${kind} ${name}`.padEnd(width - 2) + "│")
    }
    console.log("└" + "─".repeat(width - 2) + "┘")
    console.log("")
  }
}

function renderRow(label: string, value: string, width: number): string {
  const available = width - 3
  const padding = Math.max(0, available - label.length - value.length)
  return "│" + `${label}${" ".repeat(padding)}${value} `.padEnd(width - 2) + "│"
}
