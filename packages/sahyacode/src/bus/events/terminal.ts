import { Schema } from "effect"
import { BusEvent } from "@/bus/bus-event"

export namespace TerminalEvent {
  const StreamChunk = Schema.Struct({
    type: Schema.Literals(["stdout", "stderr", "exit"]),
    data: Schema.String,
    timestamp: Schema.Number,
    pid: Schema.optional(Schema.Number),
  })

  export const Output = BusEvent.define(
    "terminal.output",
    Schema.Struct({
      sessionID: Schema.String,
      toolCallID: Schema.String,
      chunk: StreamChunk,
    }),
  )
}
