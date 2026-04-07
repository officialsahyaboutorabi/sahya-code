export namespace UncertaintyParser {
  export type Level = "HIGH" | "MEDIUM" | "LOW"

  export interface Block {
    level: Level
    reason: string
    alternatives: string[]
  }

  /**
   * Extracts the first complete `<uncertainty>` block from a text string.
   * Returns undefined if no complete block is found.
   *
   * Expected format:
   * ```
   * <uncertainty>
   * <level>HIGH|MEDIUM|LOW</level>
   * <reason>...</reason>
   * <alternatives>
   * - Alt A
   * - Alt B
   * </alternatives>
   * </uncertainty>
   * ```
   */
  export function parse(text: string): Block | undefined {
    const blockMatch = text.match(/<uncertainty>([\s\S]*?)<\/uncertainty>/)
    if (!blockMatch) return undefined

    const inner = blockMatch[1]

    const levelMatch = inner.match(/<level>\s*(HIGH|MEDIUM|LOW)\s*<\/level>/)
    const level = (levelMatch?.[1] as Level) ?? "LOW"

    const reasonMatch = inner.match(/<reason>([\s\S]*?)<\/reason>/)
    const reason = reasonMatch ? reasonMatch[1].trim() : ""

    const alternativesMatch = inner.match(/<alternatives>([\s\S]*?)<\/alternatives>/)
    const alternatives: string[] = []
    if (alternativesMatch) {
      const lines = alternativesMatch[1].split("\n")
      for (const line of lines) {
        const trimmed = line.replace(/^[-*]\s*/, "").trim()
        if (trimmed) alternatives.push(trimmed)
      }
    }

    return { level, reason, alternatives }
  }

  /**
   * Returns true if the text contains at least one (possibly partial) `<uncertainty>` tag.
   * Useful to detect mid-stream that an uncertainty block is being emitted.
   */
  export function hasUncertaintyTag(text: string): boolean {
    return text.includes("<uncertainty>")
  }

  /**
   * Strips all `<uncertainty>…</uncertainty>` blocks from text, returning clean text
   * suitable for rendering the non-uncertainty portion of the response.
   */
  export function stripBlocks(text: string): string {
    return text.replace(/<uncertainty>[\s\S]*?<\/uncertainty>/g, "").trim()
  }

  /**
   * Extracts all complete `<uncertainty>` blocks from a text string.
   */
  export function parseAll(text: string): Block[] {
    const blocks: Block[] = []
    const pattern = /<uncertainty>([\s\S]*?)<\/uncertainty>/g
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const inner = match[1]

      const levelMatch = inner.match(/<level>\s*(HIGH|MEDIUM|LOW)\s*<\/level>/)
      const level = (levelMatch?.[1] as Level) ?? "LOW"

      const reasonMatch = inner.match(/<reason>([\s\S]*?)<\/reason>/)
      const reason = reasonMatch ? reasonMatch[1].trim() : ""

      const alternativesMatch = inner.match(/<alternatives>([\s\S]*?)<\/alternatives>/)
      const alternatives: string[] = []
      if (alternativesMatch) {
        const lines = alternativesMatch[1].split("\n")
        for (const line of lines) {
          const trimmed = line.replace(/^[-*]\s*/, "").trim()
          if (trimmed) alternatives.push(trimmed)
        }
      }

      blocks.push({ level, reason, alternatives })
    }
    return blocks
  }
}
