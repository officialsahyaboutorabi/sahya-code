/**
 * Parse a unified diff patch and extract before/after content
 */
export function parseUnifiedDiff(patch: string): { before: string; after: string } {
  if (!patch || patch.trim() === "") {
    return { before: "", after: "" }
  }

  const lines = patch.split("\n")
  const beforeLines: string[] = []
  const afterLines: string[] = []

  let inHunk = false

  for (const line of lines) {
    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (hunkMatch) {
      inHunk = true
      continue
    }

    if (!inHunk) continue

    if (line.startsWith("-")) {
      beforeLines.push(line.slice(1))
    } else if (line.startsWith("+")) {
      afterLines.push(line.slice(1))
    } else if (line.startsWith(" ")) {
      const content = line.slice(1)
      beforeLines.push(content)
      afterLines.push(content)
    } else if (line === "\\ No newline at end of file") {
      // Skip this marker
    }
  }

  return {
    before: beforeLines.join("\n"),
    after: afterLines.join("\n"),
  }
}
