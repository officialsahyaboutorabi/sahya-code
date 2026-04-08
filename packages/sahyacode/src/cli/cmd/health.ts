import type { Argv } from "yargs"
import path from "path"
import { cmd } from "./cmd"
import { CodeHealth } from "../../code-intelligence/health"

export const HealthCommand = cmd({
  command: "health [path]",
  describe: "analyze code health metrics: complexity, test coverage, and technical debt",
  builder: (yargs: Argv) => {
    return yargs
      .positional("path", {
        describe: "path to analyze (directory)",
        type: "string",
        default: ".",
      })
      .option("json", {
        describe: "output raw JSON instead of a formatted report",
        type: "boolean",
        default: false,
      })
      .option("top", {
        describe: "number of high-complexity files to list (default: 5)",
        type: "number",
        default: 5,
      })
  },
  handler: async (args) => {
    const targetPath = path.resolve(args.path as string)

    console.log(`Scanning ${targetPath} ...`)

    const metrics = await CodeHealth.analyze(targetPath)

    if (args.json) {
      console.log(JSON.stringify(metrics, null, 2))
      return
    }

    // Respect --top for how many high-complexity files to show
    const topN = typeof args.top === "number" ? args.top : 5
    const trimmedMetrics: CodeHealth.ProjectMetrics = {
      ...metrics,
      highComplexityFiles: metrics.highComplexityFiles
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, topN),
    }

    console.log()
    console.log(CodeHealth.summarize(trimmedMetrics))
    console.log()

    // Exit with non-zero if grade is D or F so CI can catch it
    if (metrics.grade === "D" || metrics.grade === "F") {
      process.exitCode = 1
    }
  },
})
