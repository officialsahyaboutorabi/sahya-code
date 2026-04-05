import { Effect, Layer, ServiceMap } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { makeRuntime } from "@/effect/run-service"
import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { Log } from "../util/log"
import { FileWatcher } from "../file/watcher"
import { Instance } from "../project/instance"
import z from "zod"
import type { Parser } from "./parser"
import type { DependencyGraph } from "./graph"
import type { SearchIndex } from "./search"
import type { CodeMetrics } from "./analysis"

export namespace CodeIntelligence {
  const log = Log.create({ service: "code-intelligence" })

  export const Event = {
    Indexed: BusEvent.define(
      "code-intelligence.indexed",
      z.object({
        file: z.string(),
        symbols: z.number(),
      }),
    ),
    GraphUpdated: BusEvent.define(
      "code-intelligence.graph-updated",
      z.object({
        nodes: z.number(),
        edges: z.number(),
      }),
    ),
  }

  export interface State {
    parser: {
      parse: (file: string) => Effect.Effect<Parser.ParseResult | undefined>
      getSymbolAt: (file: string, line: number, column: number) => Effect.Effect<Parser.Symbol | undefined>
      findReferences: (symbol: Parser.Symbol) => Effect.Effect<Parser.Reference[]>
      isSupported: (file: string) => boolean
    }
    graph: DependencyGraph.Interface
    search: SearchIndex.Interface
    metrics: CodeMetrics.Interface
    initialized: boolean
  }

  export interface Interface {
    readonly init: () => Effect.Effect<void>
    readonly parseFile: (file: string) => Effect.Effect<Parser.ParseResult | undefined>
    readonly getSymbolAt: (file: string, line: number, column: number) => Effect.Effect<Parser.Symbol | undefined>
    readonly findReferences: (symbol: Parser.Symbol) => Effect.Effect<Parser.Reference[]>
    readonly getDependencies: (file: string) => Effect.Effect<DependencyGraph.Dependency[]>
    readonly getDependents: (file: string) => Effect.Effect<DependencyGraph.Dependency[]>
    readonly detectCircularDependencies: () => Effect.Effect<DependencyGraph.CircularDependency[]>
    readonly searchSymbols: (query: string, limit?: number) => Effect.Effect<Parser.Symbol[]>
    readonly getMetrics: (file: string) => Effect.Effect<CodeMetrics.Metrics | undefined>
    readonly getDeadCode: () => Effect.Effect<Parser.Symbol[]>
    readonly analyzeProject: () => Effect.Effect<CodeMetrics.ProjectMetrics>
    readonly indexFile: (file: string) => Effect.Effect<void>
    readonly isSupported: (file: string) => Effect.Effect<boolean>
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/CodeIntelligence") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service

      // Lazy import to avoid circular dependencies
      const [{ ParserImpl }, { DependencyGraphImpl }, { SearchIndexImpl }, { CodeMetricsImpl }] = yield* Effect.promise(() =>
        Promise.all([
          import("./parser"),
          import("./graph"),
          import("./search"),
          import("./analysis"),
        ]),
      )

      const state = yield* InstanceState.make<State>(
        Effect.fn("CodeIntelligence.state")(function* (ctx) {
          log.info("initializing code intelligence", { directory: ctx.directory })

          const parser = yield* ParserImpl.create()
          const graph = yield* DependencyGraphImpl.create()
          const search = yield* SearchIndexImpl.create()
          const metrics = yield* CodeMetricsImpl.create()

          const s: State = {
            parser,
            graph,
            search,
            metrics,
            initialized: true,
          }

          // Listen to file changes using callback-based subscription
          Bus.subscribe(FileWatcher.Event.Updated, (event) => {
            Effect.runFork(
              Effect.gen(function* () {
                const supported = parser.isSupported(event.file)
                if (!supported) return

                if (event.event === "unlink") {
                  yield* graph.removeFile(event.file)
                  yield* search.removeFile(event.file)
                } else {
                  yield* indexFileImpl(s, event.file, bus)
                }
              }).pipe(
                Effect.tapError((err) => Effect.sync(() => log.error("failed to handle file change", { file: event.file, err }))),
                Effect.ignore,
              ),
            )
          })

          return s
        }),
      )

      const isSupported = Effect.fn("CodeIntelligence.isSupported")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return s.parser.isSupported(file)
      })

      const parseFile = Effect.fn("CodeIntelligence.parseFile")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return yield* s.parser.parse(file)
      })

      const getSymbolAt = Effect.fn("CodeIntelligence.getSymbolAt")(function* (
        file: string,
        line: number,
        column: number,
      ) {
        const s = yield* InstanceState.get(state)
        return yield* s.parser.getSymbolAt(file, line, column)
      })

      const findReferences = Effect.fn("CodeIntelligence.findReferences")(function* (symbol: Parser.Symbol) {
        const s = yield* InstanceState.get(state)
        return yield* s.parser.findReferences(symbol)
      })

      const getDependencies = Effect.fn("CodeIntelligence.getDependencies")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return yield* s.graph.getDependencies(file)
      })

      const getDependents = Effect.fn("CodeIntelligence.getDependents")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return yield* s.graph.getDependents(file)
      })

      const detectCircularDependencies = Effect.fn("CodeIntelligence.detectCircularDependencies")(function* () {
        const s = yield* InstanceState.get(state)
        return yield* s.graph.detectCircular()
      })

      const searchSymbols = Effect.fn("CodeIntelligence.searchSymbols")(function* (query: string, limit?: number) {
        const s = yield* InstanceState.get(state)
        return yield* s.search.search(query, limit)
      })

      const getMetrics = Effect.fn("CodeIntelligence.getMetrics")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return yield* s.metrics.get(file)
      })

      const getDeadCode = Effect.fn("CodeIntelligence.getDeadCode")(function* () {
        const s = yield* InstanceState.get(state)
        return yield* s.metrics.getDeadCode()
      })

      const analyzeProject = Effect.fn("CodeIntelligence.analyzeProject")(function* () {
        const s = yield* InstanceState.get(state)
        return yield* s.metrics.getProjectMetrics()
      })

      const indexFile = Effect.fn("CodeIntelligence.indexFile")(function* (file: string) {
        const s = yield* InstanceState.get(state)
        return yield* indexFileImpl(s, file, bus)
      })

      const init = Effect.fn("CodeIntelligence.init")(function* () {
        yield* InstanceState.get(state)
        log.info("code intelligence initialized")
      })

      return Service.of({
        init,
        parseFile,
        getSymbolAt,
        findReferences,
        getDependencies,
        getDependents,
        detectCircularDependencies,
        searchSymbols,
        getMetrics,
        getDeadCode,
        analyzeProject,
        indexFile,
        isSupported,
      })
    }),
  )

  // Helper function for indexing a file
  function indexFileImpl(
    s: State,
    file: string,
    bus: Bus.Interface,
  ): Effect.Effect<void> {
    return Effect.gen(function* () {
      if (!Instance.containsPath(file)) return

      const parseResult = yield* s.parser.parse(file)
      if (!parseResult) return

      yield* s.graph.updateFile(file, parseResult)
      yield* s.search.index(file, parseResult)
      yield* s.metrics.update(file, parseResult)

      yield* bus.publish(Event.Indexed, {
        file,
        symbols: parseResult.symbols.length,
      })

      log.debug("indexed file", { file, symbols: parseResult.symbols.length })
    })
  }

  export const defaultLayer = layer.pipe(Layer.provide(Bus.layer))

  const { runPromise } = makeRuntime(Service, defaultLayer)

  export const init = () => runPromise((svc) => svc.init())
  export const parseFile = (file: string) => runPromise((svc) => svc.parseFile(file))
  export const getSymbolAt = (file: string, line: number, column: number) =>
    runPromise((svc) => svc.getSymbolAt(file, line, column))
  export const findReferences = (symbol: Parser.Symbol) => runPromise((svc) => svc.findReferences(symbol))
  export const getDependencies = (file: string) => runPromise((svc) => svc.getDependencies(file))
  export const getDependents = (file: string) => runPromise((svc) => svc.getDependents(file))
  export const detectCircularDependencies = () => runPromise((svc) => svc.detectCircularDependencies())
  export const searchSymbols = (query: string, limit?: number) => runPromise((svc) => svc.searchSymbols(query, limit))
  export const getMetrics = (file: string) => runPromise((svc) => svc.getMetrics(file))
  export const getDeadCode = () => runPromise((svc) => svc.getDeadCode())
  export const analyzeProject = () => runPromise((svc) => svc.analyzeProject())
  export const indexFile = (file: string) => runPromise((svc) => svc.indexFile(file))
  export const isSupported = (file: string) => runPromise((svc) => svc.isSupported(file))
}
