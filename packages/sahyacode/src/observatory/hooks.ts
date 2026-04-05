import { Effect } from "effect"
import { Bus } from "@/bus"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionID, MessageID } from "@/session/schema"
import { ObservatoryEvent } from "./stream/events"
import { Log } from "@/util/log"

const log = Log.create({ service: "observatory.hooks" })

export namespace ObservatoryHooks {
  export function emitToolStart(input: {
    sessionID: SessionID
    messageID: MessageID
    toolCallID: string
    toolName: string
    input: any
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.ToolExecutionStart, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitToolComplete(input: {
    sessionID: SessionID
    messageID: MessageID
    toolCallID: string
    toolName: string
    output?: string
    error?: string
    duration: number
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.ToolExecutionComplete, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitFileRead(input: {
    sessionID: SessionID
    messageID: MessageID
    path: string
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.FileRead, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitFileWrite(input: {
    sessionID: SessionID
    messageID: MessageID
    path: string
    content?: string
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.FileWrite, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitLLMRequest(input: {
    sessionID: SessionID
    messageID: MessageID
    model: string
    provider: string
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.LLMRequest, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitLLMResponse(input: {
    sessionID: SessionID
    messageID: MessageID
    model: string
    tokens?: number
    duration: number
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.LLMResponse, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitThought(input: {
    sessionID: SessionID
    messageID: MessageID
    thought: string
    reasoning?: string
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.Thought, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitProgress(input: {
    sessionID: SessionID
    messageID: MessageID
    currentTask: string
    percent?: number
    step?: number
    totalSteps?: number
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.Progress, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitAgentAction(input: {
    sessionID: SessionID
    messageID: MessageID
    action: "thinking" | "reading" | "writing" | "executing" | "planning" | "reviewing" | "idle"
    details?: string
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.AgentAction, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function emitSessionState(input: {
    sessionID: SessionID
    state: "idle" | "running" | "paused" | "error" | "completed"
  }): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      const bus = yield* Bus.Service
      yield* bus.publish(ObservatoryEvent.SessionState, {
        ...input,
        timestamp: Date.now(),
      })
    })
  }

  export function wrapToolExecution<T>(
    input: {
      sessionID: SessionID
      messageID: MessageID
      toolCallID: string
      toolName: string
      args: any
    },
    fn: () => Promise<T>,
  ): Effect.Effect<T, any, Bus.Service> {
    return Effect.gen(function* () {
      const startTime = Date.now()

      yield* emitToolStart({
        sessionID: input.sessionID,
        messageID: input.messageID,
        toolCallID: input.toolCallID,
        toolName: input.toolName,
        input: input.args,
      })

      try {
        const result = yield* Effect.promise(fn)
        const duration = Date.now() - startTime

        yield* emitToolComplete({
          sessionID: input.sessionID,
          messageID: input.messageID,
          toolCallID: input.toolCallID,
          toolName: input.toolName,
          output: typeof result === "string" ? result : JSON.stringify(result),
          duration,
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime

        yield* emitToolComplete({
          sessionID: input.sessionID,
          messageID: input.messageID,
          toolCallID: input.toolCallID,
          toolName: input.toolName,
          error: error instanceof Error ? error.message : String(error),
          duration,
        })

        throw error
      }
    })
  }
}
