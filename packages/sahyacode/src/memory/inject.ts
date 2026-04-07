import { Memory } from "./index"

/**
 * Build a <memory> block for the system prompt from project-specific memories.
 * Returns an empty string when there are no stored memories.
 */
export async function buildMemoryBlock(projectDir: string, dataDir: string): Promise<string> {
  const entries = await Memory.recall(projectDir, dataDir)
  if (entries.length === 0) return ""

  const lines = entries.map((e) => `- ${e.key}: ${e.value}`)
  return [
    "<memory>",
    "The following facts about this project have been remembered from previous sessions.",
    "Use them to inform your decisions and avoid repeating past mistakes or re-discovering known patterns:",
    ...lines,
    "</memory>",
  ].join("\n")
}
