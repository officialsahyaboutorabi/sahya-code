import Parser from "web-tree-sitter"
import path from "path"
import { Effect } from "effect"
import { Filesystem } from "../../../util/filesystem"
import { Log } from "../../../util/log"
import { TreeSitter } from "../tree-sitter"
import type { Parser as ParserTypes } from "../index"

const log = Log.create({ service: "parser.typescript" })

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
])

export namespace TypeScriptParser {
  interface ParsedFile {
    file: string
    source: string
    tree: Parser.Tree
    symbols: ParserTypes.Symbol[]
    imports: ParserTypes.Import[]
    exports: ParserTypes.Export[]
    calls: ParserTypes.Call[]
  }

  const cache = new Map<string, ParsedFile>()

  export const create = Effect.gen(function* () {
    const lang = yield* Effect.promise(() => TreeSitter.loadLanguage("typescript"))
    if (!lang) {
      log.warn("typescript language not available")
      return {
        parse: () => Effect.succeed(undefined),
        getSymbolAt: () => Effect.succeed(undefined),
        findReferences: () => Effect.succeed([]),
        isSupported: () => false,
      }
    }

    const parser = TreeSitter.createParser(lang)

    const isSupported = (file: string): boolean => {
      return SUPPORTED_EXTENSIONS.has(path.extname(file).toLowerCase())
    }

    const parseFile = (file: string): Effect.Effect<ParsedFile | undefined> =>
      Effect.gen(function* () {
        if (!isSupported(file)) return undefined

        const cached = cache.get(file)
        if (cached) return cached

        const source = yield* Effect.promise(() =>
          Filesystem.readText(file).catch(() => "")
        )

        if (!source) return undefined

        const tree = parser.parse(source)
        if (!tree) return undefined

        const symbols = extractSymbols(tree.rootNode, file, source)
        const imports = extractImports(tree.rootNode, file, source)
        const exports = extractExports(tree.rootNode, file, source)
        const calls = extractCalls(tree.rootNode, file, source)

        const result: ParsedFile = {
          file,
          source,
          tree,
          symbols,
          imports,
          exports,
          calls,
        }

        cache.set(file, result)
        return result
      })

    const parse = (file: string): Effect.Effect<ParserTypes.ParseResult | undefined> =>
      Effect.gen(function* () {
        const parsed = yield* parseFile(file)
        if (!parsed) return undefined

        return {
          file: parsed.file,
          symbols: parsed.symbols,
          imports: parsed.imports,
          exports: parsed.exports,
          calls: parsed.calls,
          errors: [],
        }
      })

    const getSymbolAt = (file: string, line: number, column: number): Effect.Effect<ParserTypes.Symbol | undefined> =>
      Effect.gen(function* () {
        const parsed = yield* parseFile(file)
        if (!parsed) return undefined

        const node = parsed.tree.rootNode.descendantForPosition({ row: line, column })
        if (!node) return undefined

        // Find the closest symbol that contains this position
        let current: Parser.SyntaxNode | null = node
        while (current) {
          const symbol = parsed.symbols.find(
            (s) =>
              s.range.start.line <= line &&
              s.range.end.line >= line &&
              s.range.start.column <= column &&
              s.range.end.column >= column
          )
          if (symbol) return symbol
          current = current.parent
        }

        return undefined
      })

    const findReferences = (symbol: ParserTypes.Symbol): Effect.Effect<ParserTypes.Reference[]> =>
      Effect.gen(function* () {
        const references: ParserTypes.Reference[] = []

        // Check all cached files for references to this symbol
        for (const [file, parsed] of cache) {
          // Look for identifiers with the same name
          const identifiers = TreeSitter.findDescendants(parsed.tree.rootNode, "identifier")
          for (const id of identifiers) {
            if (TreeSitter.getNodeText(id, parsed.source) === symbol.name) {
              const range = TreeSitter.nodeToRange(id)
              references.push({
                symbol,
                file,
                range,
                isDefinition: file === symbol.file && range.start.line === symbol.range.start.line,
                isWrite: false,
              })
            }
          }
        }

        return references
      })

    return {
      parse,
      getSymbolAt,
      findReferences,
      isSupported,
    }
  })

  function extractSymbols(root: Parser.SyntaxNode, file: string, source: string): ParserTypes.Symbol[] {
    const symbols: ParserTypes.Symbol[] = []

    const functionNodes = [
      ...TreeSitter.findDescendants(root, "function_declaration"),
      ...TreeSitter.findDescendants(root, "function"),
      ...TreeSitter.findDescendants(root, "arrow_function"),
      ...TreeSitter.findDescendants(root, "method_definition"),
    ]

    for (const node of functionNodes) {
      const nameNode = node.childForFieldName("name")
      const name = nameNode ? TreeSitter.getNodeText(nameNode, source) : "anonymous"

      symbols.push({
        id: `${file}:${name}:${node.startPosition.row}`,
        name,
        kind: node.type === "method_definition" ? "method" : "function",
        file,
        range: TreeSitter.nodeToRange(node),
        signature: extractSignature(node, source),
      })
    }

    const classNodes = TreeSitter.findDescendants(root, "class_declaration")
    for (const node of classNodes) {
      const nameNode = node.childForFieldName("name")
      if (nameNode) {
        const name = TreeSitter.getNodeText(nameNode, source)
        symbols.push({
          id: `${file}:${name}:${node.startPosition.row}`,
          name,
          kind: "class",
          file,
          range: TreeSitter.nodeToRange(node),
        })
      }
    }

    const interfaceNodes = TreeSitter.findDescendants(root, "interface_declaration")
    for (const node of interfaceNodes) {
      const nameNode = node.childForFieldName("name")
      if (nameNode) {
        const name = TreeSitter.getNodeText(nameNode, source)
        symbols.push({
          id: `${file}:${name}:${node.startPosition.row}`,
          name,
          kind: "interface",
          file,
          range: TreeSitter.nodeToRange(node),
        })
      }
    }

    const typeNodes = TreeSitter.findDescendants(root, "type_alias_declaration")
    for (const node of typeNodes) {
      const nameNode = node.childForFieldName("name")
      if (nameNode) {
        const name = TreeSitter.getNodeText(nameNode, source)
        symbols.push({
          id: `${file}:${name}:${node.startPosition.row}`,
          name,
          kind: "type",
          file,
          range: TreeSitter.nodeToRange(node),
        })
      }
    }

    const enumNodes = TreeSitter.findDescendants(root, "enum_declaration")
    for (const node of enumNodes) {
      const nameNode = node.childForFieldName("name")
      if (nameNode) {
        const name = TreeSitter.getNodeText(nameNode, source)
        symbols.push({
          id: `${file}:${name}:${node.startPosition.row}`,
          name,
          kind: "enum",
          file,
          range: TreeSitter.nodeToRange(node),
        })
      }
    }

    const variableNodes = TreeSitter.findDescendants(root, "variable_declaration")
    for (const node of variableNodes) {
      const declarators = TreeSitter.findChildren(node, "variable_declarator")
      for (const declarator of declarators) {
        const nameNode = declarator.childForFieldName("name")
        if (nameNode) {
          const name = TreeSitter.getNodeText(nameNode, source)
          const isConst = node.child(0)?.type === "const"
          symbols.push({
            id: `${file}:${name}:${node.startPosition.row}`,
            name,
            kind: isConst ? "constant" : "variable",
            file,
            range: TreeSitter.nodeToRange(declarator),
          })
        }
      }
    }

    return symbols
  }

  function extractImports(root: Parser.SyntaxNode, file: string, source: string): ParserTypes.Import[] {
    const imports: ParserTypes.Import[] = []
    const importNodes = TreeSitter.findDescendants(root, "import_statement")

    for (const node of importNodes) {
      const sourceNode = node.childForFieldName("source")
      if (!sourceNode) continue

      const importSource = TreeSitter.getNodeText(sourceNode, source).replace(/['"]/g, "")
      const clause = node.childForFieldName("clause")
      
      const symbols: string[] = []
      let defaultImport: string | undefined
      let namespaceImport: string | undefined

      if (clause) {
        // Named imports
        const namedImports = TreeSitter.findFirstDescendant(clause, "named_imports")
        if (namedImports) {
          const specifiers = TreeSitter.findDescendants(namedImports, "import_specifier")
          for (const spec of specifiers) {
            const nameNode = spec.childForFieldName("name")
            if (nameNode) {
              symbols.push(TreeSitter.getNodeText(nameNode, source))
            }
          }
        }

        // Default import
        const identifier = clause.type === "identifier" ? clause : TreeSitter.findFirstDescendant(clause, "identifier")
        if (identifier && clause.type !== "namespace_import") {
          defaultImport = TreeSitter.getNodeText(identifier, source)
        }

        // Namespace import
        const nsImport = TreeSitter.findFirstDescendant(clause, "namespace_import")
        if (nsImport) {
          const idNode = TreeSitter.findFirstDescendant(nsImport, "identifier")
          if (idNode) {
            namespaceImport = TreeSitter.getNodeText(idNode, source)
          }
        }
      }

      imports.push({
        source: importSource,
        symbols,
        default: defaultImport,
        namespace: namespaceImport,
        range: TreeSitter.nodeToRange(node),
      })
    }

    return imports
  }

  function extractExports(root: Parser.SyntaxNode, file: string, source: string): ParserTypes.Export[] {
    const exports: ParserTypes.Export[] = []
    const exportNodes = TreeSitter.findDescendants(root, "export_statement")

    for (const node of exportNodes) {
      const sourceNode = node.childForFieldName("source")
      const declaration = node.childForFieldName("declaration")
      
      // Check for default export
      const isDefault = node.text.includes("export default")
      
      if (sourceNode) {
        // Re-export
        const exportSource = TreeSitter.getNodeText(sourceNode, source).replace(/['"]/g, "")
        exports.push({
          symbol: "*",
          isDefault: false,
          isReexport: true,
          source: exportSource,
          range: TreeSitter.nodeToRange(node),
        })
      } else if (declaration) {
        // Named export
        const nameNode = declaration.childForFieldName("name")
        if (nameNode) {
          exports.push({
            symbol: TreeSitter.getNodeText(nameNode, source),
            isDefault,
            isReexport: false,
            range: TreeSitter.nodeToRange(node),
          })
        }
      }
    }

    return exports
  }

  function extractCalls(root: Parser.SyntaxNode, file: string, source: string): ParserTypes.Call[] {
    const calls: ParserTypes.Call[] = []
    const callNodes = TreeSitter.findDescendants(root, "call_expression")

    for (const node of callNodes) {
      const functionNode = node.childForFieldName("function")
      const argumentsNode = node.childForFieldName("arguments")
      
      if (functionNode) {
        const callee = TreeSitter.getNodeText(functionNode, source)
        const argsCount = argumentsNode ? argumentsNode.namedChildCount : 0
        
        calls.push({
          callee,
          file,
          range: TreeSitter.nodeToRange(node),
          argumentsCount: argsCount,
        })
      }
    }

    return calls
  }

  function extractSignature(node: Parser.SyntaxNode, source: string): string | undefined {
    const params = node.childForFieldName("parameters")
    if (!params) return undefined

    const returnType = node.childForFieldName("return_type")
    let sig = TreeSitter.getNodeText(params, source)
    
    if (returnType) {
      sig += `: ${TreeSitter.getNodeText(returnType, source)}`
    }

    return sig
  }
}
