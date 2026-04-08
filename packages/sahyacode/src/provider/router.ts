import { Log } from "../util/log"
import { ModelID, ProviderID } from "./schema"

/**
 * ModelRouter — Intelligent model routing based on task complexity.
 *
 * Heuristically classifies a prompt as simple, medium, or complex and then
 * picks the cheapest/fastest model from the caller-supplied list that is
 * appropriate for that complexity tier.
 *
 * Usage:
 *   const complexity = ModelRouter.classify(userPrompt)
 *   const model     = ModelRouter.route(userPrompt, availableModels)
 */
export namespace ModelRouter {
  const log = Log.create({ service: "model-router" })

  // ---------------------------------------------------------------------------
  // Public types
  // ---------------------------------------------------------------------------

  /** Complexity tier for a given prompt. */
  export type TaskComplexity = "simple" | "medium" | "complex"

  /** A provider+model pair as used throughout the codebase. */
  export interface ModelRef {
    providerID: ProviderID
    modelID: ModelID
  }

  // ---------------------------------------------------------------------------
  // Keyword tables
  // ---------------------------------------------------------------------------

  /**
   * Keywords that strongly suggest a complex task.
   * Matched case-insensitively against the full prompt text.
   */
  const COMPLEX_KEYWORDS: readonly string[] = [
    "implement",
    "architecture",
    "architect",
    "design",
    "refactor",
    "rewrite",
    "migrate",
    "scaffold",
    "bootstrap",
    "overhaul",
    "redesign",
    "optimise",
    "optimize",
    "debug",
    "diagnose",
    "investigate",
    "trace",
    "performance",
    "scalab",
    "concurrent",
    "multithreaded",
    "distributed",
    "security",
    "vulnerability",
    "integration",
    "end-to-end",
    "e2e",
  ]

  /**
   * Keywords that suggest a simple informational / lookup task.
   * Matched case-insensitively.
   */
  const SIMPLE_KEYWORDS: readonly string[] = [
    "what is",
    "what are",
    "show me",
    "list",
    "find",
    "search",
    "grep",
    "read",
    "open",
    "display",
    "print",
    "echo",
    "how do i",
    "can you tell",
    "explain briefly",
    "summarise briefly",
    "summarize briefly",
    "quick question",
    "clarify",
  ]

  // ---------------------------------------------------------------------------
  // Model tier classification
  // ---------------------------------------------------------------------------

  /**
   * Known model-id substrings that map to a cheap/fast (haiku/flash) tier.
   * Checked via `modelID.includes(fragment)`.
   */
  const SIMPLE_TIER_FRAGMENTS: readonly string[] = [
    "haiku",
    "flash",
    "mini",
    "nano",
    "lite",
    "instant",
    "turbo",
    "fast",
    "small",
    "3.5-sonnet", // older, cheaper sonnet generation
  ]

  /**
   * Known model-id substrings for mid-tier (sonnet / gpt-4o-mini / etc.).
   */
  const MEDIUM_TIER_FRAGMENTS: readonly string[] = [
    "sonnet",
    "4o-mini",
    "4o_mini",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "mistral-small",
    "mistral-medium",
    "command-r",
  ]

  // ---------------------------------------------------------------------------
  // classify()
  // ---------------------------------------------------------------------------

  /**
   * Heuristically classifies `prompt` into a TaskComplexity tier.
   *
   * Decision order (first match wins):
   *  1. Explicit complex keywords  → "complex"
   *  2. Long prompts (>= 800 chars) or code blocks → "complex"
   *  3. Explicit simple keywords and short prompt (< 200 chars) → "simple"
   *  4. Medium-length prompts (200–799 chars) → "medium"
   *  5. Short prompts (< 200 chars) without explicit signals → "simple"
   */
  export function classify(prompt: string): TaskComplexity {
    const lower = prompt.toLowerCase()
    const charLen = prompt.length

    // 1. Complex keywords take highest priority.
    if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) {
      log.debug("classify: complex (keyword match)", { charLen })
      return "complex"
    }

    // 2. Code blocks or long prompts → complex.
    const hasCodeBlock = prompt.includes("```") || prompt.includes("~~~")
    if (hasCodeBlock && charLen >= 300) {
      log.debug("classify: complex (code block + length)", { charLen })
      return "complex"
    }
    if (charLen >= 800) {
      log.debug("classify: complex (length)", { charLen })
      return "complex"
    }

    // 3. Simple keyword + short prompt → simple.
    const hasSimpleKw = SIMPLE_KEYWORDS.some((kw) => lower.includes(kw))
    if (hasSimpleKw && charLen < 200) {
      log.debug("classify: simple (keyword + short)", { charLen })
      return "simple"
    }

    // 4. Medium-length → medium.
    if (charLen >= 200) {
      log.debug("classify: medium (length)", { charLen })
      return "medium"
    }

    // 5. Short with no strong signals → simple.
    log.debug("classify: simple (short, no signals)", { charLen })
    return "simple"
  }

  // ---------------------------------------------------------------------------
  // Internal tier scoring
  // ---------------------------------------------------------------------------

  /**
   * Returns a numeric tier for a model ID:
   *   0 = simple/cheap (haiku, flash, …)
   *   1 = medium
   *   2 = no match / unknown
   *
   * Higher tier numbers are used as a last resort for complex tasks.
   */
  function modelTier(modelID: ModelID): 0 | 1 | 2 {
    const lower = (modelID as string).toLowerCase()
    if (SIMPLE_TIER_FRAGMENTS.some((f) => lower.includes(f))) return 0
    if (MEDIUM_TIER_FRAGMENTS.some((f) => lower.includes(f))) return 1
    return 2
  }

  // ---------------------------------------------------------------------------
  // route()
  // ---------------------------------------------------------------------------

  /**
   * Picks the best model from `available` for the given `prompt`.
   *
   * - For SIMPLE tasks  → prefer tier-0 models; fall back to tier-1, then tier-2.
   * - For MEDIUM tasks  → prefer tier-1 models; fall back to tier-0, then tier-2.
   * - For COMPLEX tasks → prefer tier-2 (primary/configured) models; fall back
   *                       through tier-1, then tier-0.
   *
   * If `available` is empty, throws a descriptive error.
   * If no model matches the preferred tier, the first model in `available` is
   * returned so the caller is never left without a selection.
   */
  export function route(prompt: string, available: ModelRef[]): ModelRef {
    if (available.length === 0) {
      throw new Error("ModelRouter.route: no available models to route to")
    }

    const complexity = classify(prompt)

    log.debug("route: routing", {
      complexity,
      candidates: available.length,
    })

    // Build tier-ordered preference for each complexity level.
    const tierPreference: Record<TaskComplexity, Array<0 | 1 | 2>> = {
      simple: [0, 1, 2],
      medium: [1, 0, 2],
      complex: [2, 1, 0],
    }

    const preferred = tierPreference[complexity]

    for (const tier of preferred) {
      const candidates = available.filter((m) => modelTier(m.modelID) === tier)
      if (candidates.length > 0) {
        const chosen = candidates[0]!
        log.debug("route: selected model", {
          complexity,
          tier,
          providerID: chosen.providerID as string,
          modelID: chosen.modelID as string,
        })
        return chosen
      }
    }

    // Unreachable if tierPreference covers all three tiers, but TypeScript
    // requires a return path.
    const fallback = available[0]!
    log.warn("route: falling back to first available model", {
      complexity,
      providerID: fallback.providerID as string,
      modelID: fallback.modelID as string,
    })
    return fallback
  }
}
