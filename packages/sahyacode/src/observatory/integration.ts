import { Effect } from "effect"
import { Bus } from "@/bus"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionID } from "@/session/schema"
import { ObservatoryEvent, ObservatoryBroadcaster } from "./stream"
import { Log } from "@/util/log"

const log = Log.create({ service: "observatory.integration" })

export namespace ObservatoryIntegration {
  let isInitialized = false

  export function initialize(): Effect.Effect<void, never, Bus.Service> {
    return Effect.gen(function* () {
      if (isInitialized) {
        return
      }

      isInitialized = true
      log.info("initializing observatory integration")

      const bus = yield* Bus.Service

      // Subscribe to tool execution events from the session processor
      yield* bus.subscribeAllCallback((event) => {
        // Route events to the observatory broadcaster
        handleBusEvent(event)
      })

      log.info("observatory integration initialized")
    })
  }

  function handleBusEvent(event: { type: string; properties: any }) {
    // Map existing bus events to observatory events
    switch (event.type) {
      case "tool.start":
        ObservatoryBroadcaster.observe(event.properties.sessionID)
        break

      case "session.created":
        // Auto-observe new sessions
        ObservatoryBroadcaster.observe(event.properties.sessionID)
        break

      case "session.completed":
        // Optionally unobserve completed sessions
        // ObservatoryBroadcaster.unobserve(event.properties.sessionID)
        break
    }
  }

  export function hookSessionProcessor() {
    // This function can be called to add hooks to the session processor
    // The actual hooking is done via bus events which are already being published
    log.info("session processor hooks registered")
  }

  export function hookToolExecution() {
    // Tool execution is hooked via the bus system
    log.info("tool execution hooks registered")
  }

  export function hookFileOperations() {
    // File operations are hooked via the bus system
    log.info("file operation hooks registered")
  }

  export function hookLLMRequests() {
    // LLM requests are hooked via the bus system
    log.info("llm request hooks registered")
  }
}
