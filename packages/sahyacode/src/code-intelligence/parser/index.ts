import { Effect } from "effect"

export namespace Parser {
  export interface Position {
    line: number
    column: number
  }

  export interface Range {
    start: Position
    end: Position
  }

  export type SymbolKind =
    | "function"
    | "method"
    | "class"
    | "interface"
    | "type"
    | "variable"
    | "constant"
    | "parameter"
    | "property"
    | "module"
    | "namespace"
    | "enum"
    | "import"
    | "export"

  export interface Symbol {
    id: string
    name: string
    kind: SymbolKind
    file: string
    range: Range
    scope?: string
    signature?: string
    documentation?: string
    modifiers?: string[]
  }

  export interface Reference {
    symbol: Symbol
    file: string
    range: Range
    isDefinition: boolean
    isWrite: boolean
  }

  export interface Import {
    source: string
    symbols: string[]
    default?: string
    namespace?: string
    range: Range
  }

  export interface Export {
    symbol: string
    isDefault: boolean
    isReexport: boolean
    source?: string
    range: Range
  }

  export interface Call {
    callee: string
    file: string
    range: Range
    argumentsCount: number
  }

  export interface ParseResult {
    file: string
    symbols: Symbol[]
    imports: Import[]
    exports: Export[]
    calls: Call[]
    errors: string[]
  }

  export interface Interface {
    readonly parse: (file: string) => Effect.Effect<ParseResult | undefined>
    readonly getSymbolAt: (file: string, line: number, column: number) => Effect.Effect<Symbol | undefined>
    readonly findReferences: (symbol: Symbol) => Effect.Effect<Reference[]>
    readonly isSupported: (file: string) => boolean
  }
}

export namespace ParserImpl {
  export const create = Effect.gen(function* () {
    const [{ TypeScriptParser }] = yield* Effect.promise(() => import("./languages/typescript"))
    const parsers: Parser.Interface[] = [yield* TypeScriptParser.create()]

    const findParser = (file: string): Parser.Interface | undefined => {
      return parsers.find((p) => p.isSupported(file))
    }

    const parse = (file: string): Effect.Effect<Parser.ParseResult | undefined> =>
      Effect.gen(function* () {
        const parser = findParser(file)
        if (!parser) return undefined
        return yield* parser.parse(file)
      })

    const getSymbolAt = (file: string, line: number, column: number): Effect.Effect<Parser.Symbol | undefined> =>
      Effect.gen(function* () {
        const parser = findParser(file)
        if (!parser) return undefined
        return yield* parser.getSymbolAt(file, line, column)
      })

    const findReferences = (symbol: Parser.Symbol): Effect.Effect<Parser.Reference[]> =>
      Effect.gen(function* () {
        const parser = findParser(symbol.file)
        if (!parser) return []
        return yield* parser.findReferences(symbol)
      })

    const isSupported = (file: string): boolean => {
      return parsers.some((p) => p.isSupported(file))
    }

    return {
      parse,
      getSymbolAt,
      findReferences,
      isSupported,
    }
  })
}
