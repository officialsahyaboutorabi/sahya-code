import { Effect } from "effect"
import type { Parser } from "../parser"

export namespace CodeMetrics {
  export interface ComplexityMetrics {
    cyclomatic: number
    cognitive: number
    halstead: {
      operators: number
      operands: number
      volume: number
      difficulty: number
      effort: number
    }
  }

  export interface LinesMetrics {
    total: number
    code: number
    comment: number
    blank: number
  }

  export interface Metrics {
    file: string
    lines: LinesMetrics
    complexity: ComplexityMetrics
    functions: number
    classes: number
    maxNestingDepth: number
  }

  export interface ProjectMetrics {
    totalFiles: number
    totalLines: number
    totalCodeLines: number
    averageComplexity: number
    maxComplexity: number
    complexFunctions: Parser.Symbol[]
    deadCode: Parser.Symbol[]
  }

  export interface Interface {
    readonly update: (file: string, result: Parser.ParseResult) => Effect.Effect<void>
    readonly get: (file: string) => Effect.Effect<Metrics | undefined>
    readonly getProjectMetrics: () => Effect.Effect<ProjectMetrics>
    readonly getDeadCode: () => Effect.Effect<Parser.Symbol[]>
  }
}

export namespace CodeMetricsImpl {
  interface FileMetrics {
    file: string
    result: Parser.ParseResult
    metrics: CodeMetrics.Metrics
  }

  export const create = Effect.gen(function* () {
    const files = new Map<string, FileMetrics>()
    const references = new Map<string, number>() // symbol id -> reference count

    const update = (file: string, result: Parser.ParseResult): Effect.Effect<void> =>
      Effect.sync(() => {
        const metrics = calculateMetrics(file, result)
        files.set(file, { file, result, metrics })

        // Update reference counts
        for (const symbol of result.symbols) {
          // Initialize count for new symbols
          if (!references.has(symbol.id)) {
            references.set(symbol.id, 0)
          }
        }

        // Count references from calls
        for (const call of result.calls) {
          const targetSymbol = result.symbols.find((s) => s.name === call.callee)
          if (targetSymbol) {
            references.set(targetSymbol.id, (references.get(targetSymbol.id) || 0) + 1)
          }
        }
      })

    const get = (file: string): Effect.Effect<CodeMetrics.Metrics | undefined> =>
      Effect.sync(() => {
        const fileMetrics = files.get(file)
        return fileMetrics?.metrics
      })

    const getProjectMetrics = (): Effect.Effect<CodeMetrics.ProjectMetrics> =>
      Effect.sync(() => {
        let totalFiles = 0
        let totalLines = 0
        let totalCodeLines = 0
        let totalComplexity = 0
        let maxComplexity = 0
        const complexFunctions: Parser.Symbol[] = []

        for (const { metrics, result } of files.values()) {
          totalFiles++
          totalLines += metrics.lines.total
          totalCodeLines += metrics.lines.code
          totalComplexity += metrics.complexity.cyclomatic

          if (metrics.complexity.cyclomatic > maxComplexity) {
            maxComplexity = metrics.complexity.cyclomatic
          }

          // Find complex functions (cyclomatic > 10)
          for (const symbol of result.symbols) {
            if ((symbol.kind === "function" || symbol.kind === "method") && metrics.complexity.cyclomatic > 10) {
              complexFunctions.push(symbol)
            }
          }
        }

        const averageComplexity = totalFiles > 0 ? totalComplexity / totalFiles : 0

        // Find dead code (symbols with 0 references, excluding exports)
        const deadCode = findDeadCode()

        return {
          totalFiles,
          totalLines,
          totalCodeLines,
          averageComplexity,
          maxComplexity,
          complexFunctions: complexFunctions.sort(
            (a, b) => (references.get(b.id) || 0) - (references.get(a.id) || 0)
          ),
          deadCode,
        }
      })

    const getDeadCode = (): Effect.Effect<Parser.Symbol[]> =>
      Effect.sync(() => findDeadCode())

    function findDeadCode(): Parser.Symbol[] {
      const dead: Parser.Symbol[] = []

      for (const { result } of files.values()) {
        for (const symbol of result.symbols) {
          const refCount = references.get(symbol.id) || 0
          
          // Consider a symbol dead if:
          // - It's a private function/method with no references
          // - It's not exported
          // - It's not an entry point (main, test, etc.)
          if (
            refCount === 0 &&
            (symbol.kind === "function" || symbol.kind === "method") &&
            !isExported(symbol, result) &&
            !isEntryPoint(symbol)
          ) {
            dead.push(symbol)
          }
        }
      }

      return dead
    }

    function isExported(symbol: Parser.Symbol, result: Parser.ParseResult): boolean {
      return result.exports.some((e) => e.symbol === symbol.name)
    }

    function isEntryPoint(symbol: Parser.Symbol): boolean {
      const entryNames = ["main", "init", "setup", "start", "bootstrap", "handler"]
      return entryNames.includes(symbol.name.toLowerCase())
    }

    function calculateMetrics(file: string, result: Parser.ParseResult): CodeMetrics.Metrics {
      const source = result.symbols.length > 0 ? file : ""

      // Calculate lines metrics (simplified)
      const lines: CodeMetrics.LinesMetrics = {
        total: 0,
        code: 0,
        comment: 0,
        blank: 0,
      }

      // Count functions and classes
      let functions = 0
      let classes = 0
      let maxNestingDepth = 0

      for (const symbol of result.symbols) {
        if (symbol.kind === "function" || symbol.kind === "method") {
          functions++
        } else if (symbol.kind === "class") {
          classes++
        }
      }

      // Calculate complexity (simplified cyclomatic complexity)
      const cyclomatic = calculateCyclomaticComplexity(result)
      const cognitive = Math.floor(cyclomatic * 0.8) // Simplified cognitive complexity estimate

      return {
        file,
        lines,
        complexity: {
          cyclomatic,
          cognitive,
          halstead: {
            operators: 0,
            operands: 0,
            volume: 0,
            difficulty: 0,
            effort: 0,
          },
        },
        functions,
        classes,
        maxNestingDepth,
      }
    }

    function calculateCyclomaticComplexity(result: Parser.ParseResult): number {
      // Base complexity is 1
      let complexity = 1

      // Each decision point adds to complexity
      // Since we don't have full AST access here, we use a heuristic based on calls
      complexity += Math.floor(result.calls.length / 5)

      // Cap at reasonable bounds
      return Math.min(Math.max(complexity, 1), 50)
    }

    return {
      update,
      get,
      getProjectMetrics,
      getDeadCode,
    }
  })
}
