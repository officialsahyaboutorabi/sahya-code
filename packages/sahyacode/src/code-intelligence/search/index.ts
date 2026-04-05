import { Effect } from "effect"
import fuzzysort from "fuzzysort"
import type { Parser } from "../parser"

export namespace SearchIndex {
  export interface IndexedSymbol extends Parser.Symbol {
    searchText: string
  }

  export interface Interface {
    readonly index: (file: string, result: Parser.ParseResult) => Effect.Effect<void>
    readonly removeFile: (file: string) => Effect.Effect<void>
    readonly search: (query: string, limit?: number) => Effect.Effect<Parser.Symbol[]>
    readonly getByFile: (file: string) => Effect.Effect<Parser.Symbol[]>
    readonly clear: () => Effect.Effect<void>
  }
}

export namespace SearchIndexImpl {
  export const create = Effect.gen(function* () {
    const symbols = new Map<string, SearchIndex.IndexedSymbol[]>()
    let allSymbols: SearchIndex.IndexedSymbol[] = []

    const index = (file: string, result: Parser.ParseResult): Effect.Effect<void> =>
      Effect.sync(() => {
        // Remove existing entries for this file
        removeFileInternal(file)

        // Index new symbols with search text
        const indexed: SearchIndex.IndexedSymbol[] = result.symbols.map((sym) => ({
          ...sym,
          searchText: createSearchText(sym),
        }))

        symbols.set(file, indexed)
        rebuildAllSymbols()
      })

    const removeFile = (file: string): Effect.Effect<void> =>
      Effect.sync(() => {
        removeFileInternal(file)
      })

    const search = (query: string, limit = 20): Effect.Effect<Parser.Symbol[]> =>
      Effect.sync(() => {
        if (!query.trim()) return allSymbols.slice(0, limit)

        const results = fuzzysort.go(query, allSymbols, {
          key: "searchText",
          limit,
          threshold: -10000,
        })

        return results.map((r) => ({
          id: r.obj.id,
          name: r.obj.name,
          kind: r.obj.kind,
          file: r.obj.file,
          range: r.obj.range,
          scope: r.obj.scope,
          signature: r.obj.signature,
          documentation: r.obj.documentation,
          modifiers: r.obj.modifiers,
        }))
      })

    const getByFile = (file: string): Effect.Effect<Parser.Symbol[]> =>
      Effect.sync(() => {
        return symbols.get(file) || []
      })

    const clear = (): Effect.Effect<void> =>
      Effect.sync(() => {
        symbols.clear()
        allSymbols = []
      })

    function removeFileInternal(file: string): void {
      if (symbols.has(file)) {
        symbols.delete(file)
        rebuildAllSymbols()
      }
    }

    function rebuildAllSymbols(): void {
      allSymbols = Array.from(symbols.values()).flat()
    }

    function createSearchText(symbol: Parser.Symbol): string {
      const parts = [symbol.name, symbol.kind]
      if (symbol.scope) parts.push(symbol.scope)
      if (symbol.signature) parts.push(symbol.signature)
      return parts.join(" ")
    }

    return {
      index,
      removeFile,
      search,
      getByFile,
      clear,
    }
  })
}
