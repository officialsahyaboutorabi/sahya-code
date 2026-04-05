import { Bus } from "@/bus"
import { BusEvent } from "@/bus/bus-event"
import { Session } from "@/session"
import { SessionProcessor } from "@/session/processor"
import { SessionStatus } from "@/session/status"
import { MessageV2 } from "@/session/message-v2"
import { SessionID, MessageID } from "@/session/schema"
import { Effect, Layer, ServiceMap, Stream } from "effect"
import { Observable, Subject } from "./observable"
import { ObservatoryEvent, ActionEntry, ThoughtEntry, AgentState } from "./events"
import { Log } from "@/util/log"

export namespace ObservatoryBroadcaster {
  const log = Log.create({ service: "observatory.broadcaster" })

  export interface Interface {
    readonly observe: (sessionID: SessionID) => Effect.Effect<void>
    readonly unobserve: (sessionID: SessionID) => Effect.Effect<void>
    readonly getState: (sessionID: SessionID) => Effect.Effect<AgentState | undefined>
    readonly stream: (sessionID: SessionID) => Effect.Effect<Observable<AgentState> | undefined>
    readonly pause: (sessionID: SessionID) => Effect.Effect<void>
    readonly resume: (sessionID: SessionID) => Effect.Effect<void>
    readonly step: (sessionID: SessionID) => Effect.Effect<void>
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@opencode/ObservatoryBroadcaster") {}

  type State = {
    states: Map<string, AgentState>
    streams: Map<string, Subject<AgentState>>
    paused: Set<string>
    stepMode: Set<string>
  }

  export const layer: Layer.Layer<Service, never, Bus.Service> = Layer.effect(
    Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service

      const state: State = {
        states: new Map(),
        streams: new Map(),
        paused: new Set(),
        stepMode: new Set(),
      }

      const createActionID = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      const getOrCreateState = (sessionID: string): AgentState => {
        let agentState = state.states.get(sessionID)
        if (!agentState) {
          agentState = {
            sessionID,
            action: "idle",
            thoughts: [],
            actions: [],
            lastUpdate: Date.now(),
          }
          state.states.set(sessionID, agentState)
        }
        return agentState
      }

      const emit = (sessionID: string) => {
        const agentState = state.states.get(sessionID)
        const stream = state.streams.get(sessionID)
        if (agentState && stream) {
          agentState.lastUpdate = Date.now()
          stream.next(agentState)
        }
      }

      const handleToolStart = Effect.fn("Observatory.handleToolStart")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        toolCallID: string
        toolName: string
        input: any
      }) {
        if (state.paused.has(props.sessionID)) return

        const agentState = getOrCreateState(props.sessionID)
        const action: ActionEntry = {
          id: createActionID(),
          type: "tool",
          status: "running",
          title: `Execute: ${props.toolName}`,
          description: JSON.stringify(props.input).slice(0, 200),
          timestamp: Date.now(),
          metadata: { toolName: props.toolName, input: props.input },
        }
        agentState.actions.unshift(action)
        if (agentState.actions.length > 50) {
          agentState.actions = agentState.actions.slice(0, 50)
        }
        agentState.action = "executing"
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.ToolExecutionStart, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const handleToolComplete = Effect.fn("Observatory.handleToolComplete")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        toolCallID: string
        toolName: string
        output?: string
        error?: string
        duration: number
      }) {
        const agentState = getOrCreateState(props.sessionID)
        const action = agentState.actions.find(
          (a) => a.metadata?.toolCallID === props.toolCallID && a.status === "running",
        )
        if (action) {
          action.status = props.error ? "error" : "completed"
          action.duration = props.duration
          if (props.error) {
            action.description = `${action.description}\nError: ${props.error}`
          }
        }
        agentState.action = "idle"
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.ToolExecutionComplete, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const handleFileRead = Effect.fn("Observatory.handleFileRead")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        path: string
      }) {
        if (state.paused.has(props.sessionID)) return

        const agentState = getOrCreateState(props.sessionID)
        const action: ActionEntry = {
          id: createActionID(),
          type: "file",
          status: "completed",
          title: `Read: ${props.path}`,
          timestamp: Date.now(),
          metadata: { path: props.path, operation: "read" },
        }
        agentState.actions.unshift(action)
        if (agentState.actions.length > 50) {
          agentState.actions = agentState.actions.slice(0, 50)
        }
        agentState.action = "reading"
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.FileRead, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const handleFileWrite = Effect.fn("Observatory.handleFileWrite")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        path: string
        content?: string
      }) {
        if (state.paused.has(props.sessionID)) return

        const agentState = getOrCreateState(props.sessionID)
        const action: ActionEntry = {
          id: createActionID(),
          type: "file",
          status: "completed",
          title: `Write: ${props.path}`,
          timestamp: Date.now(),
          metadata: { path: props.path, operation: "write" },
        }
        agentState.actions.unshift(action)
        if (agentState.actions.length > 50) {
          agentState.actions = agentState.actions.slice(0, 50)
        }
        agentState.action = "writing"
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.FileWrite, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const handleThought = Effect.fn("Observatory.handleThought")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        thought: string
        reasoning?: string
      }) {
        if (state.paused.has(props.sessionID)) return

        const agentState = getOrCreateState(props.sessionID)
        const thoughtEntry: ThoughtEntry = {
          id: createActionID(),
          text: props.thought,
          timestamp: Date.now(),
        }
        agentState.thoughts.unshift(thoughtEntry)
        agentState.thoughts = agentState.thoughts.slice(0, 5)
        agentState.action = "thinking"
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.Thought, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const handleProgress = Effect.fn("Observatory.handleProgress")(function* (props: {
        sessionID: SessionID
        messageID: MessageID
        currentTask: string
        percent?: number
        step?: number
        totalSteps?: number
      }) {
        if (state.paused.has(props.sessionID)) return

        const agentState = getOrCreateState(props.sessionID)
        agentState.currentTask = props.currentTask
        agentState.progress = {
          percent: props.percent ?? 0,
          step: props.step,
          totalSteps: props.totalSteps,
        }
        emit(props.sessionID)

        yield* bus.publish(ObservatoryEvent.Progress, {
          ...props,
          timestamp: Date.now(),
        })
      })

      const observe = Effect.fn("Observatory.observe")(function* (sessionID: SessionID) {
        log.info("observing session", { sessionID })

        if (!state.streams.has(sessionID)) {
          state.streams.set(sessionID, new Subject<AgentState>())
        }

        yield* bus.publish(ObservatoryEvent.SessionState, {
          sessionID,
          state: "running",
          timestamp: Date.now(),
        })
      })

      const unobserve = Effect.fn("Observatory.unobserve")(function* (sessionID: SessionID) {
        log.info("unobserving session", { sessionID })
        state.streams.delete(sessionID)
        state.states.delete(sessionID)
        state.paused.delete(sessionID)
        state.stepMode.delete(sessionID)

        yield* bus.publish(ObservatoryEvent.SessionState, {
          sessionID,
          state: "idle",
          timestamp: Date.now(),
        })
      })

      const getState = Effect.fn("Observatory.getState")(function* (sessionID: SessionID) {
        return state.states.get(sessionID)
      })

      const stream = Effect.fn("Observatory.stream")(function* (sessionID: SessionID) {
        return state.streams.get(sessionID)
      })

      const pause = Effect.fn("Observatory.pause")(function* (sessionID: SessionID) {
        state.paused.add(sessionID)
        yield* bus.publish(ObservatoryEvent.SessionState, {
          sessionID,
          state: "paused",
          timestamp: Date.now(),
        })
      })

      const resume = Effect.fn("Observatory.resume")(function* (sessionID: SessionID) {
        state.paused.delete(sessionID)
        state.stepMode.delete(sessionID)
        yield* bus.publish(ObservatoryEvent.SessionState, {
          sessionID,
          state: "running",
          timestamp: Date.now(),
        })
      })

      const step = Effect.fn("Observatory.step")(function* (sessionID: SessionID) {
        state.stepMode.add(sessionID)
        state.paused.delete(sessionID)

        yield* Effect.sleep(100)

        state.paused.add(sessionID)
      })

      return Service.of({
        observe,
        unobserve,
        getState,
        stream,
        pause,
        resume,
        step,
      })
    }),
  )

  export const defaultLayer = Layer.unwrap(
    Effect.sync(() => layer.pipe(Layer.provide(Bus.layer))),
  )

  const { runPromise } = Effect.runSync(
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime<Bus.Service>()
      return {
        runPromise: <A>(effect: Effect.Effect<A, any, Bus.Service>) =>
          Effect.runPromise(Effect.provide(effect, runtime)),
      }
    }),
  )

  export async function observe(sessionID: SessionID) {
    return runPromise((svc) => svc.observe(sessionID))
  }

  export async function unobserve(sessionID: SessionID) {
    return runPromise((svc) => svc.unobserve(sessionID))
  }

  export async function getState(sessionID: SessionID) {
    return runPromise((svc) => svc.getState(sessionID))
  }

  export async function stream(sessionID: SessionID) {
    return runPromise((svc) => svc.stream(sessionID))
  }

  export async function pause(sessionID: SessionID) {
    return runPromise((svc) => svc.pause(sessionID))
  }

  export async function resume(sessionID: SessionID) {
    return runPromise((svc) => svc.resume(sessionID))
  }

  export async function step(sessionID: SessionID) {
    return runPromise((svc) => svc.step(sessionID))
  }
}
