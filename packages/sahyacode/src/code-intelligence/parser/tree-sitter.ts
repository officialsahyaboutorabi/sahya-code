import * as TreeSitterModule from "web-tree-sitter"
import path from "path"
import { Log } from "../../util/log"

const log = Log.create({ service: "tree-sitter" })

export namespace TreeSitter {
  let initialized = false
  let initPromise: Promise<void> | null = null

  export async function initialize(): Promise<void> {
    if (initialized) return
    if (initPromise) return initPromise

    initPromise = (async () => {
      try {
        await TreeSitterModule.Parser.init()
        initialized = true
        log.info("tree-sitter initialized")
      } catch (error) {
        log.error("failed to initialize tree-sitter", { error })
        throw error
      }
    })()

    return initPromise
  }

  export async function loadLanguage(name: string): Promise<TreeSitterModule.Language | undefined> {
    await initialize()

    try {
      // Try to load from node_modules
      const langPath = require.resolve(`tree-sitter-${name}`)
      const lang = await TreeSitterModule.Language.load(langPath)
      return lang
    } catch (error) {
      log.warn(`failed to load language ${name}`, { error })
      return undefined
    }
  }

  export function createParser(language: TreeSitterModule.Language): TreeSitterModule.Parser {
    const parser = new TreeSitterModule.Parser()
    parser.setLanguage(language)
    return parser
  }

  export function getNodeText(node: TreeSitterModule.Node, source: string): string {
    return source.slice(node.startIndex, node.endIndex)
  }

  export function nodeToRange(node: TreeSitterModule.Node): { start: { line: number; column: number }; end: { line: number; column: number } } {
    return {
      start: { line: node.startPosition.row, column: node.startPosition.column },
      end: { line: node.endPosition.row, column: node.endPosition.column },
    }
  }

  export function findChildren(node: TreeSitterModule.Node, type: string): TreeSitterModule.Node[] {
    const results: TreeSitterModule.Node[] = []
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i)
      if (child && child.type === type) {
        results.push(child)
      }
    }
    return results
  }

  export function findDescendants(node: TreeSitterModule.Node, type: string): TreeSitterModule.Node[] {
    const results: TreeSitterModule.Node[] = []
    function traverse(n: TreeSitterModule.Node) {
      if (n.type === type) {
        results.push(n)
      }
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i)
        if (child) traverse(child)
      }
    }
    traverse(node)
    return results
  }

  export function findFirstDescendant(node: TreeSitterModule.Node, type: string): TreeSitterModule.Node | undefined {
    function traverse(n: TreeSitterModule.Node): TreeSitterModule.Node | undefined {
      if (n.type === type) {
        return n
      }
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i)
        if (child) {
          const found = traverse(child)
          if (found) return found
        }
      }
      return undefined
    }
    return traverse(node)
  }
}
