import type { AssistantMessage, Part, Provider, UserMessage } from "@opencode-ai/sdk/v2"
import { Locale } from "@/util"
import * as Model from "./model"

/**
 * Detect if reasoning content appears to be encrypted, garbled, or redacted.
 * Some models return encrypted reasoning data or placeholders instead of readable text.
 */
function isHiddenReasoning(text: string): boolean {
  if (!text || text.length < 10) return false
  
  // Check 1: High ratio of non-ASCII characters (encrypted/garbled content)
  const nonAsciiCount = [...text].filter(c => {
    const code = c.charCodeAt(0)
    // Allow common ASCII
    if (code < 128) return false
    // Flag mathematical symbols, private use area, etc.
    if (code >= 0x2000 && code <= 0x2BFF) return true // Mathematical/operators
    if (code >= 0xE000 && code <= 0xF8FF) return true // Private use area
    return false
  }).length
  
  const nonAsciiRatio = nonAsciiCount / text.length
  if (nonAsciiRatio > 0.15) return true
  
  // Check 2: Content is mostly underscores (kimi-for-coding redacted reasoning)
  // Some models return "________" as placeholders for hidden reasoning
  const trimmed = text.trim()
  const underscoreCount = [...trimmed].filter(c => c === '_').length
  const underscoreRatio = underscoreCount / trimmed.length
  if (underscoreRatio > 0.8) return true
  
  return false
}

export type TranscriptOptions = {
  thinking: boolean
  toolDetails: boolean
  assistantMetadata: boolean
  providers?: Provider[]
}

export type SessionInfo = {
  id: string
  title: string
  time: {
    created: number
    updated: number
  }
}

export type MessageWithParts = {
  info: UserMessage | AssistantMessage
  parts: Part[]
}

export function formatTranscript(
  session: SessionInfo,
  messages: MessageWithParts[],
  options: TranscriptOptions,
): string {
  const providers = Model.index(options.providers)
  let transcript = `# ${session.title}\n\n`
  transcript += `**Session ID:** ${session.id}\n`
  transcript += `**Created:** ${new Date(session.time.created).toLocaleString()}\n`
  transcript += `**Updated:** ${new Date(session.time.updated).toLocaleString()}\n\n`
  transcript += `---\n\n`

  for (const msg of messages) {
    transcript += formatMessage(msg.info, msg.parts, options, providers)
    transcript += `---\n\n`
  }

  return transcript
}

export function formatMessage(
  msg: UserMessage | AssistantMessage,
  parts: Part[],
  options: TranscriptOptions,
  providers?: Provider[] | ReadonlyMap<string, Provider>,
): string {
  let result = ""

  if (msg.role === "user") {
    result += `## User\n\n`
  } else {
    result += formatAssistantHeader(msg, options.assistantMetadata, providers ?? options.providers)
  }

  for (const part of parts) {
    result += formatPart(part, options)
  }

  return result
}

export function formatAssistantHeader(
  msg: AssistantMessage,
  includeMetadata: boolean,
  providers?: Provider[] | ReadonlyMap<string, Provider>,
): string {
  if (!includeMetadata) {
    return `## Assistant\n\n`
  }

  const duration =
    msg.time.completed && msg.time.created ? ((msg.time.completed - msg.time.created) / 1000).toFixed(1) + "s" : ""

  const modelName = Model.name(providers, msg.providerID, msg.modelID)

  return `## Assistant (${Locale.titlecase(msg.agent)} · ${modelName}${duration ? ` · ${duration}` : ""})\n\n`
}

export function formatPart(part: Part, options: TranscriptOptions): string {
  if (part.type === "text" && !part.synthetic) {
    return `${part.text}\n\n`
  }

  if (part.type === "reasoning") {
    if (options.thinking && !isHiddenReasoning(part.text)) {
      return `_Thinking:_\n\n${part.text}\n\n`
    }
    return ""
  }

  if (part.type === "tool") {
    let result = `**Tool: ${part.tool}**\n`
    if (options.toolDetails && part.state.input) {
      result += `\n**Input:**\n\`\`\`json\n${JSON.stringify(part.state.input, null, 2)}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "completed" && part.state.output) {
      result += `\n**Output:**\n\`\`\`\n${part.state.output}\n\`\`\`\n`
    }
    if (options.toolDetails && part.state.status === "error" && part.state.error) {
      result += `\n**Error:**\n\`\`\`\n${part.state.error}\n\`\`\`\n`
    }
    result += `\n`
    return result
  }

  return ""
}
