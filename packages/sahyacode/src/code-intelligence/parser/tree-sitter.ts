import * as Parser from "web-tree-sitter"
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
        await Parser.init()
        initialized = true
        log.info("tree-sitter initialized")
      } catch (error) {
        log.error("failed to initialize tree-sitter", { error })
        throw error
      }
    })()

    return initPromise
  }

  export async function loadLanguage(name: string): Promise<Parser.Language | undefined> {
    await initialize()

    try {
      // Try to load from node_modules
      const langPath = require.resolve(`tree-sitter-${name}`)
      const lang = await Parser.Language.load(langPath)
      return lang
    } catch (error) {
      log.warn(`failed to load language ${name}`, { error })
      return undefined
    }
  }

  export function createParser(language: Parser.Language): Parser {
    const parser = new Parser()
    parser.setLanguage(language)
    return parser
  }

  export function getNodeText(node: Parser.SyntaxNode, source: string): string {
    return source.slice(node.startIndex, node.endIndex)
  }

  export function nodeToRange(node: Parser.SyntaxNode): { start: { line: number; column: number }; end: { line: number; column: number } } {
    return {
      start: { line: node.startPosition.row, column: node.startPosition.column },
      end: { line: node.endPosition.row, column: node.endPosition.column },
    }
  }

  export function findChildren(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = []
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i)
      if (child && child.type === type) {
        results.push(child)
      }
    }
    return results
  }

  export function findDescendants(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = []
    function traverse(n: Parser.SyntaxNode) {
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

  export function findFirstDescendant(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | undefined {
    function traverse(n: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
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
