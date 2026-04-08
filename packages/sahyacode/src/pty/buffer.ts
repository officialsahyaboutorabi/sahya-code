import type { PtyStream } from "./stream"

const DEFAULT_MAX_LINES = 500

export class TerminalBuffer {
  private lines: string[] = []
  private readonly maxLines: number

  constructor(maxLines: number = DEFAULT_MAX_LINES) {
    this.maxLines = maxLines
  }

  push(chunk: PtyStream.StreamChunk): void {
    if (chunk.type === "exit") return

    const incoming = chunk.data.split("\n")
    for (const line of incoming) {
      this.lines.push(line)
    }

    if (this.lines.length > this.maxLines) {
      this.lines = this.lines.slice(this.lines.length - this.maxLines)
    }
  }

  getLines(): string[] {
    return [...this.lines]
  }

  clear(): void {
    this.lines = []
  }
}
