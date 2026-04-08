import z from "zod"
import { BusEvent } from "@/bus/bus-event"

export namespace TerminalEvent {
  const StreamChunk = z.object({
    type: z.enum(["stdout", "stderr", "exit"]),
    data: z.string(),
    timestamp: z.number(),
    pid: z.number().optional(),
  })

  export const Output = BusEvent.define(
    "terminal.output",
    z.object({
      sessionID: z.string(),
      toolCallID: z.string(),
      chunk: StreamChunk,
    }),
  )
}
