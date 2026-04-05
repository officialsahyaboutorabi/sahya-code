import { BusEvent } from "@/bus/bus-event"
import { SessionID, MessageID } from "@/session/schema"
import z from "zod"

export namespace ObservatoryEvent {
  export const ToolExecutionStart = BusEvent.define(
    "observatory.tool.start",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      toolCallID: z.string(),
      toolName: z.string(),
      input: z.record(z.any()),
      timestamp: z.number(),
    }),
  )

  export const ToolExecutionComplete = BusEvent.define(
    "observatory.tool.complete",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      toolCallID: z.string(),
      toolName: z.string(),
      output: z.string().optional(),
      error: z.string().optional(),
      duration: z.number(),
      timestamp: z.number(),
    }),
  )

  export const FileRead = BusEvent.define(
    "observatory.file.read",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      path: z.string(),
      timestamp: z.number(),
    }),
  )

  export const FileWrite = BusEvent.define(
    "observatory.file.write",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      path: z.string(),
      content: z.string().optional(),
      timestamp: z.number(),
    }),
  )

  export const LLMRequest = BusEvent.define(
    "observatory.llm.request",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      model: z.string(),
      provider: z.string(),
      timestamp: z.number(),
    }),
  )

  export const LLMResponse = BusEvent.define(
    "observatory.llm.response",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      model: z.string(),
      tokens: z.number().optional(),
      duration: z.number(),
      timestamp: z.number(),
    }),
  )

  export const Thought = BusEvent.define(
    "observatory.thought",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      thought: z.string(),
      reasoning: z.string().optional(),
      timestamp: z.number(),
    }),
  )

  export const Progress = BusEvent.define(
    "observatory.progress",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      currentTask: z.string(),
      percent: z.number().min(0).max(100).optional(),
      step: z.number().optional(),
      totalSteps: z.number().optional(),
      timestamp: z.number(),
    }),
  )

  export const AgentAction = BusEvent.define(
    "observatory.agent.action",
    z.object({
      sessionID: SessionID.zod,
      messageID: MessageID.zod,
      action: z.enum([
        "thinking",
        "reading",
        "writing",
        "executing",
        "planning",
        "reviewing",
        "idle",
      ]),
      details: z.string().optional(),
      timestamp: z.number(),
    }),
  )

  export const CheckpointCreated = BusEvent.define(
    "observatory.checkpoint.created",
    z.object({
      sessionID: SessionID.zod,
      checkpointID: z.string(),
      description: z.string(),
      timestamp: z.number(),
    }),
  )

  export const SessionState = BusEvent.define(
    "observatory.session.state",
    z.object({
      sessionID: SessionID.zod,
      state: z.enum(["idle", "running", "paused", "error", "completed"]),
      timestamp: z.number(),
    }),
  )

  export const all = [
    ToolExecutionStart,
    ToolExecutionComplete,
    FileRead,
    FileWrite,
    LLMRequest,
    LLMResponse,
    Thought,
    Progress,
    AgentAction,
    CheckpointCreated,
    SessionState,
  ]
}

export type ObservatoryEventType =
  | z.infer<typeof ObservatoryEvent.ToolExecutionStart.properties>
  | z.infer<typeof ObservatoryEvent.ToolExecutionComplete.properties>
  | z.infer<typeof ObservatoryEvent.FileRead.properties>
  | z.infer<typeof ObservatoryEvent.FileWrite.properties>
  | z.infer<typeof ObservatoryEvent.LLMRequest.properties>
  | z.infer<typeof ObservatoryEvent.LLMResponse.properties>
  | z.infer<typeof ObservatoryEvent.Thought.properties>
  | z.infer<typeof ObservatoryEvent.Progress.properties>
  | z.infer<typeof ObservatoryEvent.AgentAction.properties>
  | z.infer<typeof ObservatoryEvent.CheckpointCreated.properties>
  | z.infer<typeof ObservatoryEvent.SessionState.properties>

export interface ActionEntry {
  id: string
  type: "tool" | "file" | "llm" | "thought" | "progress" | "checkpoint"
  status: "pending" | "running" | "completed" | "error"
  title: string
  description?: string
  timestamp: number
  duration?: number
  metadata?: Record<string, any>
}

export interface ThoughtEntry {
  id: string
  text: string
  timestamp: number
}

export interface AgentState {
  sessionID: string
  currentTask?: string
  progress?: {
    percent: number
    step?: number
    totalSteps?: number
  }
  action: "thinking" | "reading" | "writing" | "executing" | "planning" | "reviewing" | "idle"
  thoughts: ThoughtEntry[]
  actions: ActionEntry[]
  lastUpdate: number
}
