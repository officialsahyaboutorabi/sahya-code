import { Effect } from "effect"
import type { Parser } from "../parser"

export namespace DependencyGraph {
  export interface Dependency {
    source: string
    target: string
    type: "import" | "call" | "inheritance" | "export"
    symbol?: string
  }

  export interface CircularDependency {
    path: string[]
    files: string[]
  }

  export interface Interface {
    readonly updateFile: (file: string, result: Parser.ParseResult) => Effect.Effect<void>
    readonly removeFile: (file: string) => Effect.Effect<void>
    readonly getDependencies: (file: string) => Effect.Effect<Dependency[]>
    readonly getDependents: (file: string) => Effect.Effect<Dependency[]>
    readonly detectCircular: () => Effect.Effect<CircularDependency[]>
    readonly getAllFiles: () => Effect.Effect<string[]>
    readonly getStats: () => Effect.Effect<{ nodes: number; edges: number }>
  }
}

export namespace DependencyGraphImpl {
  interface GraphNode {
    file: string
    dependencies: Set<string>
    dependents: Set<string>
    imports: Parser.Import[]
    exports: Parser.Export[]
    calls: Parser.Call[]
  }

  export const create = Effect.gen(function* () {
    const nodes = new Map<string, GraphNode>()

    const updateFile = (file: string, result: Parser.ParseResult): Effect.Effect<void> =>
      Effect.sync(() => {
        // Remove old dependencies first
        removeFileInternal(file)

        const node: GraphNode = {
          file,
          dependencies: new Set(),
          dependents: new Set(),
          imports: result.imports,
          exports: result.exports,
          calls: result.calls,
        }

        // Add import dependencies
        for (const imp of result.imports) {
          const resolved = resolveImport(file, imp.source)
          if (resolved) {
            node.dependencies.add(resolved)
            const targetNode = nodes.get(resolved)
            if (targetNode) {
              targetNode.dependents.add(file)
            }
          }
        }

        nodes.set(file, node)
      })

    const removeFile = (file: string): Effect.Effect<void> =>
      Effect.sync(() => {
        removeFileInternal(file)
      })

    const getDependencies = (file: string): Effect.Effect<DependencyGraph.Dependency[]> =>
      Effect.sync(() => {
        const node = nodes.get(file)
        if (!node) return []

        const deps: DependencyGraph.Dependency[] = []
        
        for (const imp of node.imports) {
          const resolved = resolveImport(file, imp.source)
          if (resolved) {
            deps.push({
              source: file,
              target: resolved,
              type: "import",
              symbol: imp.symbols.join(", ") || imp.default || imp.namespace,
            })
          }
        }

        for (const call of node.calls) {
          deps.push({
            source: file,
            target: call.callee,
            type: "call",
            symbol: call.callee,
          })
        }

        return deps
      })

    const getDependents = (file: string): Effect.Effect<DependencyGraph.Dependency[]> =>
      Effect.sync(() => {
        const result: DependencyGraph.Dependency[] = []
        
        for (const [otherFile, node] of nodes) {
          if (otherFile === file) continue
          
          for (const imp of node.imports) {
            const resolved = resolveImport(otherFile, imp.source)
            if (resolved === file) {
              result.push({
                source: otherFile,
                target: file,
                type: "import",
                symbol: imp.symbols.join(", ") || imp.default || imp.namespace,
              })
            }
          }
        }

        return result
      })

    const detectCircular = (): Effect.Effect<DependencyGraph.CircularDependency[]> =>
      Effect.sync(() => {
        const visited = new Set<string>()
        const recursionStack = new Set<string>()
        const cycles: DependencyGraph.CircularDependency[] = []

        function dfs(file: string, path: string[]): boolean {
          visited.add(file)
          recursionStack.add(file)
          path.push(file)

          const node = nodes.get(file)
          if (node) {
            for (const dep of node.dependencies) {
              if (!visited.has(dep)) {
                if (dfs(dep, [...path])) {
                  return true
                }
              } else if (recursionStack.has(dep)) {
                // Found a cycle
                const cycleStart = path.indexOf(dep)
                const cyclePath = path.slice(cycleStart).concat([dep])
                cycles.push({
                  path: cyclePath,
                  files: [...new Set(cyclePath)],
                })
              }
            }
          }

          recursionStack.delete(file)
          return false
        }

        for (const file of nodes.keys()) {
          if (!visited.has(file)) {
            dfs(file, [])
          }
        }

        // Remove duplicate cycles
        const uniqueCycles: DependencyGraph.CircularDependency[] = []
        const seen = new Set<string>()
        
        for (const cycle of cycles) {
          const key = cycle.files.sort().join(",")
          if (!seen.has(key)) {
            seen.add(key)
            uniqueCycles.push(cycle)
          }
        }

        return uniqueCycles
      })

    const getAllFiles = (): Effect.Effect<string[]> =>
      Effect.sync(() => Array.from(nodes.keys()))

    const getStats = (): Effect.Effect<{ nodes: number; edges: number }> =>
      Effect.sync(() => {
        let edges = 0
        for (const node of nodes.values()) {
          edges += node.dependencies.size
        }
        return { nodes: nodes.size, edges }
      })

    function removeFileInternal(file: string): void {
      const node = nodes.get(file)
      if (!node) return

      // Remove this file from dependents of its dependencies
      for (const dep of node.dependencies) {
        const depNode = nodes.get(dep)
        if (depNode) {
          depNode.dependents.delete(file)
        }
      }

      nodes.delete(file)
    }

    function resolveImport(fromFile: string, importPath: string): string | undefined {
      // Simple resolution - just check if it looks like a relative path
      if (importPath.startsWith("./") || importPath.startsWith("../")) {
        // Return as-is for now - in a full implementation, we'd resolve to absolute paths
        return importPath
      }
      // External modules return undefined
      return undefined
    }

    return {
      updateFile,
      removeFile,
      getDependencies,
      getDependents,
      detectCircular,
      getAllFiles,
      getStats,
    }
  })
}
