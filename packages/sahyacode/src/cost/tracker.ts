import type { MessageV2 } from "@/session/message-v2"

export namespace CostTracker {
  /**
   * Accumulated cost and token breakdown for a session.
   */
  export interface SessionCost {
    inputTokens: number
    outputTokens: number
    reasoningTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    totalUSD: number
    /** Last-seen model ID across assistant messages, or empty string if none. */
    model: string
    /** Last-seen provider ID across assistant messages, or empty string if none. */
    provider: string
  }

  /**
   * Accumulate cost and token data from an array of MessageV2.WithParts.
   * Only assistant messages carry cost/token fields; user messages are skipped.
   */
  export function accumulate(messages: MessageV2.WithParts[]): SessionCost {
    const result: SessionCost = {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalUSD: 0,
      model: "",
      provider: "",
    }

    for (const message of messages) {
      const { info } = message
      if (info.role !== "assistant") continue

      result.totalUSD += info.cost || 0
      result.inputTokens += info.tokens?.input || 0
      result.outputTokens += info.tokens?.output || 0
      result.reasoningTokens += info.tokens?.reasoning || 0
      result.cacheReadTokens += info.tokens?.cache?.read || 0
      result.cacheWriteTokens += info.tokens?.cache?.write || 0

      // Track the most recently seen model/provider (last assistant message wins)
      if (info.modelID) result.model = info.modelID
      if (info.providerID) result.provider = info.providerID
    }

    return result
  }

  /**
   * Format a USD amount with up to 4 significant decimal digits.
   * Examples: "$0.0042", "$1.23", "$0.0000"
   */
  export function formatUSD(amount: number): string {
    if (isNaN(amount) || amount === 0) return "$0.0000"
    if (amount >= 1) return `$${amount.toFixed(2)}`
    if (amount >= 0.01) return `$${amount.toFixed(4)}`
    // Show up to 4 significant figures for very small amounts
    return `$${amount.toPrecision(2)}`
  }

  /**
   * Format a token count as a compact human-readable string.
   * Examples: 42 -> "42", 1500 -> "1.5k", 1_200_000 -> "1.2M"
   */
  export function formatTokens(n: number): string {
    if (isNaN(n)) return "0"
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return `${Math.round(n)}`
  }
}
