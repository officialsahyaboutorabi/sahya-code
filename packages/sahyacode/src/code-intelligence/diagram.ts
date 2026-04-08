import fs from "fs"
import path from "path"

export namespace ArchitectureDiagram {
  export type DiagramType = "component" | "dependency" | "sequence" | "class"

  export interface DiagramOptions {
    type: DiagramType
    maxDepth?: number
    includeExternal?: boolean
    rootDir: string
    entryPoint?: string
  }

  export interface DiagramResult {
    mermaid: string
    nodeCount: number
    edgeCount: number
    diagramType: DiagramType
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function sanitizeId(raw: string): string {
    // Mermaid node IDs must not contain slashes, dots, dashes, etc.
    return raw.replace(/[^a-zA-Z0-9_]/g, "_")
  }

  /** Recursively collect subdirectories up to maxDepth. */
  function collectDirs(dir: string, rootDir: string, maxDepth: number, depth = 0): string[] {
    if (depth > maxDepth) return []
    const results: string[] = []
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return results
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const name = entry.name
      if (name.startsWith(".") || name === "node_modules") continue
      const fullPath = path.join(dir, name)
      results.push(fullPath)
      results.push(...collectDirs(fullPath, rootDir, maxDepth, depth + 1))
    }
    return results
  }

  /** Walk the file tree and return all .ts/.tsx files. */
  function collectTsFiles(dir: string, maxDepth: number, depth = 0): string[] {
    if (depth > maxDepth) return []
    const results: string[] = []
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return results
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue
        results.push(...collectTsFiles(fullPath, maxDepth, depth + 1))
      } else if (entry.isFile()) {
        if (/\.(ts|tsx)$/.test(entry.name)) {
          results.push(fullPath)
        }
      }
    }
    return results
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Component diagram  (graph TD, directory → subdirectory edges)
  // ─────────────────────────────────────────────────────────────────────────────

  export async function generateComponentDiagram(options: DiagramOptions): Promise<DiagramResult> {
    const depth = options.maxDepth ?? 3
    const rootDir = path.resolve(options.rootDir)
    const rootLabel = path.basename(rootDir)

    const dirs = collectDirs(rootDir, rootDir, depth)

    const nodes = new Set<string>()
    const edges: Array<[string, string]> = []

    nodes.add(rootLabel)

    for (const dirPath of dirs) {
      const rel = path.relative(rootDir, dirPath)
      const parts = rel.split(path.sep)

      // Build label as the last part of the relative path (the directory name)
      const label = parts[parts.length - 1]
      nodes.add(label)

      // The parent label is either the root or the parent dir name
      const parentLabel = parts.length === 1 ? rootLabel : parts[parts.length - 2]
      const edgeKey = `${parentLabel}-->${label}` as const
      edges.push([parentLabel, label])
    }

    // De-duplicate edges
    const uniqueEdges = [...new Map(edges.map((e) => [e.join("-->"), e])).values()]

    const lines: string[] = ["graph TD"]
    for (const [from, to] of uniqueEdges) {
      lines.push(`  ${sanitizeId(from)} --> ${sanitizeId(to)}`)
    }

    return {
      mermaid: lines.join("\n"),
      nodeCount: nodes.size,
      edgeCount: uniqueEdges.length,
      diagramType: "component",
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Dependency graph  (graph LR, file import edges)
  // ─────────────────────────────────────────────────────────────────────────────

  export async function generateDependencyGraph(options: DiagramOptions): Promise<DiagramResult> {
    const depth = options.maxDepth ?? 3
    const rootDir = path.resolve(options.rootDir)
    const importRe = /^import\s+.*?\s+from\s+['"](.+)['"]/gm

    const files = options.entryPoint
      ? [path.resolve(options.entryPoint)]
      : collectTsFiles(rootDir, depth)

    const nodes = new Set<string>()
    const edgeSet = new Set<string>()
    const edges: Array<[string, string]> = []

    for (const file of files) {
      let content: string
      try {
        content = fs.readFileSync(file, "utf8")
      } catch {
        continue
      }

      const sourceLabel = path.relative(rootDir, file)
      nodes.add(sourceLabel)

      let match: RegExpExecArray | null
      importRe.lastIndex = 0
      while ((match = importRe.exec(content)) !== null) {
        const importPath = match[1]
        const isRelative = importPath.startsWith("./") || importPath.startsWith("../")

        if (!isRelative && !options.includeExternal) continue

        let targetLabel: string
        if (isRelative) {
          const absTarget = path.resolve(path.dirname(file), importPath)
          targetLabel = path.relative(rootDir, absTarget)
        } else {
          // External package — use bare package name (first segment)
          targetLabel = importPath.split("/")[0]
        }

        nodes.add(targetLabel)
        const key = `${sourceLabel}-->${targetLabel}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push([sourceLabel, targetLabel])
        }
      }
    }

    const lines: string[] = ["graph LR"]
    for (const [from, to] of edges) {
      lines.push(`  ${sanitizeId(from)} --> ${sanitizeId(to)}`)
    }

    return {
      mermaid: lines.join("\n"),
      nodeCount: nodes.size,
      edgeCount: edges.length,
      diagramType: "dependency",
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Class diagram  (classDiagram, TypeScript interfaces / classes / namespaces)
  // ─────────────────────────────────────────────────────────────────────────────

  export async function generateClassDiagram(options: DiagramOptions): Promise<DiagramResult> {
    const depth = options.maxDepth ?? 3
    const rootDir = path.resolve(options.rootDir)

    const interfaceRe = /export\s+(?:default\s+)?interface\s+(\w+)/g
    const classRe = /export\s+(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g
    const namespaceRe = /export\s+namespace\s+(\w+)/g
    const methodRe = /^\s+(?:(?:public|private|protected|static|readonly|abstract)\s+)*(\w+)\s*\(/gm
    const propRe = /^\s+(?:(?:public|private|protected|readonly|static)\s+)*(\w+)\s*(?::|\?:)/gm

    const files = options.entryPoint
      ? [path.resolve(options.entryPoint)]
      : collectTsFiles(rootDir, depth)

    interface ClassEntry {
      name: string
      kind: "class" | "interface" | "namespace"
      methods: string[]
      props: string[]
      parent?: string
      implements: string[]
    }

    const classes = new Map<string, ClassEntry>()
    const relationships: Array<[string, string, string]> = [] // [from, to, label]

    for (const file of files) {
      let content: string
      try {
        content = fs.readFileSync(file, "utf8")
      } catch {
        continue
      }

      // Collect interfaces
      interfaceRe.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = interfaceRe.exec(content)) !== null) {
        const name = m[1]
        if (!classes.has(name)) {
          classes.set(name, { name, kind: "interface", methods: [], props: [], implements: [] })
        }
      }

      // Collect classes with inheritance
      classRe.lastIndex = 0
      while ((m = classRe.exec(content)) !== null) {
        const name = m[1]
        const parent = m[2]
        const impl = m[3] ? m[3].split(",").map((s) => s.trim()).filter(Boolean) : []
        if (!classes.has(name)) {
          classes.set(name, { name, kind: "class", methods: [], props: [], implements: impl, parent })
        }
        if (parent) relationships.push([name, parent, "extends"])
        for (const iface of impl) relationships.push([name, iface, "implements"])
      }

      // Collect namespaces
      namespaceRe.lastIndex = 0
      while ((m = namespaceRe.exec(content)) !== null) {
        const name = m[1]
        if (!classes.has(name)) {
          classes.set(name, { name, kind: "namespace", methods: [], props: [], implements: [] })
        }
      }
    }

    const lines: string[] = ["classDiagram"]

    for (const entry of classes.values()) {
      lines.push(`  class ${entry.name} {`)
      if (entry.kind === "interface") lines.push(`    <<interface>>`)
      if (entry.kind === "namespace") lines.push(`    <<namespace>>`)
      lines.push(`  }`)
    }

    for (const [from, to, label] of relationships) {
      if (classes.has(from) && classes.has(to)) {
        if (label === "extends") {
          lines.push(`  ${from} --|> ${to}`)
        } else {
          lines.push(`  ${from} ..|> ${to}`)
        }
      }
    }

    return {
      mermaid: lines.join("\n"),
      nodeCount: classes.size,
      edgeCount: relationships.length,
      diagramType: "class",
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-detect and generate
  // ─────────────────────────────────────────────────────────────────────────────

  export async function generate(options: DiagramOptions): Promise<DiagramResult> {
    switch (options.type) {
      case "component":
        return generateComponentDiagram(options)
      case "dependency":
        return generateDependencyGraph(options)
      case "class":
        return generateClassDiagram(options)
      case "sequence":
        // Sequence diagrams require runtime tracing; return a minimal placeholder
        return {
          mermaid: "sequenceDiagram\n  participant A\n  participant B\n  A->>B: (auto-generation not supported)",
          nodeCount: 2,
          edgeCount: 1,
          diagramType: "sequence",
        }
      default: {
        // Auto-detect: default to component
        const detected = { ...options, type: "component" as DiagramType }
        return generateComponentDiagram(detected)
      }
    }
  }
}
