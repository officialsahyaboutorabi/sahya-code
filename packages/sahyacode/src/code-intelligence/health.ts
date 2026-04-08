import { readdir, readFile, stat } from "fs/promises"
import path from "path"

export namespace CodeHealth {
  export interface FileMetrics {
    path: string
    lines: number
    complexity: number
    functions: number
    longestFunction: number
    todos: number
    duplicateScore: number
  }

  export interface ProjectMetrics {
    files: FileMetrics[]
    totalLines: number
    averageComplexity: number
    highComplexityFiles: FileMetrics[]
    testFileCount: number
    sourceFileCount: number
    testCoverageRatio: number
    totalTodos: number
    healthScore: number
    grade: "A" | "B" | "C" | "D" | "F"
  }

  const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])
  const SKIP_DIRS = new Set(["node_modules", "dist", ".bak", ".git", ".next", "build", "coverage", "out"])

  async function collectFiles(dir: string): Promise<string[]> {
    const results: string[] = []

    async function walk(current: string): Promise<void> {
      let entries: string[]
      try {
        entries = await readdir(current)
      } catch {
        return
      }

      await Promise.all(
        entries.map(async (entry) => {
          if (SKIP_DIRS.has(entry)) return

          const fullPath = path.join(current, entry)
          let s: Awaited<ReturnType<typeof stat>>
          try {
            s = await stat(fullPath)
          } catch {
            return
          }

          if (s.isDirectory()) {
            await walk(fullPath)
          } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry))) {
            results.push(fullPath)
          }
        }),
      )
    }

    await walk(dir)
    return results
  }

  export function computeComplexity(source: string): number {
    const matches = source.match(/\b(if|else|for|while|do|switch|case|catch|\?\s|\&\&|\|\|)\b/g)
    return (matches?.length ?? 0) + 1
  }

  function countFunctions(source: string): number {
    const matches = source.match(/\bfunction\b|=>|\basync\b/g)
    return matches?.length ?? 0
  }

  function countTodos(source: string): number {
    const matches = source.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi)
    return matches?.length ?? 0
  }

  function longestFunctionLines(source: string): number {
    // Heuristic: find the span between consecutive function declarations
    const lines = source.split("\n")
    const functionLineIndices: number[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/\bfunction\b/.test(line) || /=>\s*\{/.test(line) || /\basync\b.*\(/.test(line)) {
        functionLineIndices.push(i)
      }
    }

    if (functionLineIndices.length === 0) return 0

    let longest = 0
    for (let i = 0; i < functionLineIndices.length; i++) {
      const start = functionLineIndices[i]
      const end = functionLineIndices[i + 1] ?? lines.length
      const span = end - start
      if (span > longest) longest = span
    }

    return longest
  }

  function computeDuplicateScore(source: string, allSources: string[]): number {
    // Simple heuristic: count how many non-trivial lines appear in other files
    const lines = source
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 20)

    if (lines.length === 0) return 0

    let duplicated = 0
    for (const line of lines) {
      for (const other of allSources) {
        if (other !== source && other.includes(line)) {
          duplicated++
          break
        }
      }
    }

    return Math.min(1, duplicated / lines.length)
  }

  function isTestFile(filePath: string): boolean {
    const base = path.basename(filePath)
    return (
      base.includes(".test.") ||
      base.includes(".spec.") ||
      base.includes("-test.") ||
      base.includes("-spec.") ||
      filePath.includes("/__tests__/") ||
      filePath.includes("/test/") ||
      filePath.includes("/tests/")
    )
  }

  function computeGrade(score: number): "A" | "B" | "C" | "D" | "F" {
    if (score >= 90) return "A"
    if (score >= 75) return "B"
    if (score >= 60) return "C"
    if (score >= 45) return "D"
    return "F"
  }

  export async function analyze(projectDir: string): Promise<ProjectMetrics> {
    const filePaths = await collectFiles(projectDir)

    // Read all sources up front so we can compute duplicate scores
    const sourceMap = new Map<string, string>()
    await Promise.all(
      filePaths.map(async (fp) => {
        try {
          const content = await readFile(fp, "utf-8")
          sourceMap.set(fp, content)
        } catch {
          // skip unreadable files
        }
      }),
    )

    const allSources = Array.from(sourceMap.values())

    const files: FileMetrics[] = []

    for (const fp of filePaths) {
      const source = sourceMap.get(fp)
      if (source === undefined) continue

      const lines = source.split("\n").length
      const complexity = computeComplexity(source)
      const functions = countFunctions(source)
      const longestFunction = longestFunctionLines(source)
      const todos = countTodos(source)
      const duplicateScore = computeDuplicateScore(source, allSources)

      files.push({
        path: fp,
        lines,
        complexity,
        functions,
        longestFunction,
        todos,
        duplicateScore,
      })
    }

    const totalLines = files.reduce((sum, f) => sum + f.lines, 0)
    const averageComplexity = files.length > 0 ? files.reduce((sum, f) => sum + f.complexity, 0) / files.length : 0
    const highComplexityFiles = files.filter((f) => f.complexity > 10)
    const testFileCount = files.filter((f) => isTestFile(f.path)).length
    const sourceFileCount = files.length - testFileCount
    const testCoverageRatio = sourceFileCount > 0 ? testFileCount / sourceFileCount : 0
    const totalTodos = files.reduce((sum, f) => sum + f.todos, 0)

    // Compute health score
    let healthScore = 100
    healthScore -= highComplexityFiles.length * 5
    if (testCoverageRatio < 0.1) healthScore -= 20
    healthScore -= Math.min(20, totalTodos * 0.5)
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)))

    return {
      files,
      totalLines,
      averageComplexity,
      highComplexityFiles,
      testFileCount,
      sourceFileCount,
      testCoverageRatio,
      totalTodos,
      healthScore,
      grade: computeGrade(healthScore),
    }
  }

  export function summarize(metrics: ProjectMetrics): string {
    const lines: string[] = []
    const width = 58

    function row(label: string, value: string): string {
      const available = width - 2
      const padding = Math.max(0, available - label.length - value.length)
      return `│${label}${" ".repeat(padding)}${value}│`
    }

    function divider(): string {
      return "├" + "─".repeat(width - 2) + "┤"
    }

    function top(): string {
      return "┌" + "─".repeat(width - 2) + "┐"
    }

    function bottom(): string {
      return "└" + "─".repeat(width - 2) + "┘"
    }

    function header(title: string): string {
      const padded = ` ${title} `
      const total = width - 2
      const left = Math.floor((total - padded.length) / 2)
      const right = total - left - padded.length
      return "│" + " ".repeat(left) + padded + " ".repeat(right) + "│"
    }

    const gradeLabel = `${metrics.grade} (${metrics.healthScore}/100)`

    lines.push(top())
    lines.push(header("CODE HEALTH REPORT"))
    lines.push(divider())
    lines.push(row(" Health Score", `${gradeLabel} `))
    lines.push(row(" Total Files", `${metrics.files.length} `))
    lines.push(row(" Total Lines", `${metrics.totalLines.toLocaleString()} `))
    lines.push(row(" Avg Complexity", `${metrics.averageComplexity.toFixed(2)} `))
    lines.push(row(" High Complexity Files", `${metrics.highComplexityFiles.length} `))
    lines.push(divider())
    lines.push(header("TEST COVERAGE"))
    lines.push(divider())
    lines.push(row(" Source Files", `${metrics.sourceFileCount} `))
    lines.push(row(" Test Files", `${metrics.testFileCount} `))
    lines.push(row(" Coverage Ratio", `${(metrics.testCoverageRatio * 100).toFixed(1)}% `))
    lines.push(divider())
    lines.push(header("TECHNICAL DEBT"))
    lines.push(divider())
    lines.push(row(" TODO / FIXME / HACK", `${metrics.totalTodos} `))

    if (metrics.highComplexityFiles.length > 0) {
      lines.push(divider())
      lines.push(header("HIGH COMPLEXITY FILES"))
      lines.push(divider())
      const top5 = metrics.highComplexityFiles
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5)
      for (const f of top5) {
        const rel = f.path.length > width - 18 ? "..." + f.path.slice(-(width - 21)) : f.path
        const complexity = `cx:${f.complexity}`
        const available = width - 2
        const padding = Math.max(0, available - 1 - rel.length - complexity.length)
        lines.push(`│ ${rel}${" ".repeat(padding)}${complexity}│`)
      }
    }

    lines.push(bottom())

    return lines.join("\n")
  }
}
