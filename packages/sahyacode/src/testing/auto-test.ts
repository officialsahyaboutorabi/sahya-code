/**
 * AutoTest service — generates, runs, and fixes tests automatically.
 *
 * Flow: given a source file path
 *   1. Detect the test framework from the nearest package.json
 *   2. Ask the LLM to generate a test file
 *   3. Write the test file to disk
 *   4. Run the tests via a child-process
 *   5. If they fail, feed the failure back to the LLM for a fix (up to MAX_RETRIES)
 *   6. Return { passed, testFile, output }
 */

import path from "path"
import { execSync } from "child_process"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { Filesystem } from "../util/filesystem"
import { Log } from "../util/log"
import { Config } from "../config/config"
import { generateText } from "ai"
import { Provider } from "../provider/provider"

const log = Log.create({ service: "auto-test" })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutoTestResult {
  passed: boolean
  testFile: string
  output: string
}

export interface AutoTestOptions {
  /** Maximum red-green-fix iterations (default: 3) */
  maxRetries?: number
}

// ---------------------------------------------------------------------------
// Framework detection
// ---------------------------------------------------------------------------

const FRAMEWORK_PATTERNS: Array<{
  name: string
  deps: string[]
  runCmd: (pkgRoot: string) => string
  testFilePattern: (srcFile: string) => string
}> = [
  {
    name: "vitest",
    deps: ["vitest"],
    runCmd: (root) => `cd "${root}" && npx vitest run --reporter=verbose 2>&1`,
    testFilePattern: (src) => src.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1"),
  },
  {
    name: "jest",
    deps: ["jest", "@jest/core"],
    runCmd: (root) => `cd "${root}" && npx jest --no-coverage 2>&1`,
    testFilePattern: (src) => src.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1"),
  },
  {
    name: "bun",
    deps: [],
    runCmd: (root) => `cd "${root}" && bun test 2>&1`,
    testFilePattern: (src) => src.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1"),
  },
  {
    name: "mocha",
    deps: ["mocha"],
    runCmd: (root) => `cd "${root}" && npx mocha --recursive 2>&1`,
    testFilePattern: (src) => src.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1"),
  },
  {
    name: "pytest",
    deps: [],
    runCmd: (root) => `cd "${root}" && python -m pytest -v 2>&1`,
    testFilePattern: (src) => {
      const base = path.basename(src, path.extname(src))
      const dir = path.dirname(src)
      return path.join(dir, `test_${base}.py`)
    },
  },
]

interface DetectedFramework {
  name: string
  runCmd: string
  testFileForSource: string
}

function findPackageJson(start: string): string | undefined {
  let dir = start
  while (true) {
    const candidate = path.join(dir, "package.json")
    if (existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

function detectFramework(sourceFile: string): DetectedFramework | undefined {
  const dir = path.dirname(sourceFile)

  // Python?
  if (sourceFile.endsWith(".py")) {
    const pattern = FRAMEWORK_PATTERNS.find((p) => p.name === "pytest")!
    const root = dir
    return {
      name: "pytest",
      runCmd: pattern.runCmd(root),
      testFileForSource: pattern.testFilePattern(sourceFile),
    }
  }

  // Look for package.json up the tree
  const pkgJsonPath = findPackageJson(dir)
  if (!pkgJsonPath) return undefined

  const pkgRoot = path.dirname(pkgJsonPath)
  let pkg: any = {}
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"))
  } catch {
    // ignore parse errors
  }

  const allDeps = {
    ...((pkg.dependencies as object) ?? {}),
    ...((pkg.devDependencies as object) ?? {}),
  }

  // Check for bun (package.json with type bun or bun in scripts)
  const scripts = (pkg.scripts as Record<string, string>) ?? {}
  const hasBunTest = Object.values(scripts).some((v) => v.includes("bun test"))
  if (hasBunTest) {
    const pattern = FRAMEWORK_PATTERNS.find((p) => p.name === "bun")!
    return {
      name: "bun",
      runCmd: pattern.runCmd(pkgRoot),
      testFileForSource: pattern.testFilePattern(sourceFile),
    }
  }

  for (const fp of FRAMEWORK_PATTERNS.filter((p) => p.name !== "pytest" && p.name !== "bun")) {
    const found = fp.deps.some((dep) => dep in allDeps)
    if (found) {
      return {
        name: fp.name,
        runCmd: fp.runCmd(pkgRoot),
        testFileForSource: fp.testFilePattern(sourceFile),
      }
    }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// LLM helpers — uses Vercel AI SDK directly (same as the rest of the codebase)
// ---------------------------------------------------------------------------

async function callLLM(prompt: string): Promise<string> {
  const cfg = await Config.get()
  const modelSpec = cfg.model ?? "anthropic/claude-3-5-haiku"
  const { providerID, modelID } = Provider.parseModel(modelSpec)
  if (!providerID || !modelID) {
    throw new Error(`AutoTest: invalid model spec '${modelSpec}'`)
  }
  const model = await Provider.getLanguage({ providerID, id: modelID } as any)
  const { text } = await generateText({
    model,
    prompt,
    maxOutputTokens: 4096,
  })
  return text
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildGeneratePrompt(sourceFile: string, sourceContent: string, framework: DetectedFramework): string {
  return `You are an expert software engineer writing tests.

Source file: ${sourceFile}
Test framework: ${framework.name}

Source code:
\`\`\`
${sourceContent}
\`\`\`

Generate a complete, runnable test file for the above source using ${framework.name}.
- Cover all exported functions/classes with at least one happy-path and one edge-case test.
- Import the module using the relative path from the test file location.
- Do NOT include any explanation — output ONLY the raw test file contents.
`
}

function buildFixPrompt(
  sourceFile: string,
  sourceContent: string,
  testFile: string,
  testContent: string,
  framework: DetectedFramework,
  failureOutput: string,
): string {
  return `You are an expert software engineer fixing failing tests.

Source file: ${sourceFile}
Test file: ${testFile}
Test framework: ${framework.name}

Source code:
\`\`\`
${sourceContent}
\`\`\`

Current test code:
\`\`\`
${testContent}
\`\`\`

Test failure output:
\`\`\`
${failureOutput.slice(0, 6000)}
\`\`\`

Fix the test file so all tests pass.
Do NOT modify the source file.
Do NOT include any explanation — output ONLY the raw corrected test file contents.
`
}

// ---------------------------------------------------------------------------
// Strip markdown fences that LLMs sometimes emit
// ---------------------------------------------------------------------------

function stripCodeFences(text: string): string {
  // Remove leading ```<lang> and trailing ```
  return text
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim()
}

// ---------------------------------------------------------------------------
// Run tests — returns { passed, output }
// ---------------------------------------------------------------------------

function runTests(cmd: string): { passed: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" })
    return { passed: true, output }
  } catch (err: any) {
    const output: string = (err.stdout ?? "") + (err.stderr ?? "") + (err.message ?? "")
    return { passed: false, output }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export namespace AutoTest {
  /**
   * Generate tests for `sourceFile`, run them, and fix on failure.
   * Returns a result object. Never throws — errors are surfaced in `output`.
   */
  export async function run(sourceFile: string, options: AutoTestOptions = {}): Promise<AutoTestResult> {
    const maxRetries = options.maxRetries ?? 3

    log.info("auto-test: starting", { sourceFile })

    // 1. Read source
    let sourceContent: string
    try {
      sourceContent = await Filesystem.readText(sourceFile)
    } catch (err) {
      return { passed: false, testFile: "", output: `AutoTest: could not read source file: ${err}` }
    }

    // 2. Detect framework
    const framework = detectFramework(sourceFile)
    if (!framework) {
      return {
        passed: false,
        testFile: "",
        output: "AutoTest: could not detect a supported test framework. Install jest, vitest, mocha, or pytest.",
      }
    }

    log.info("auto-test: detected framework", { framework: framework.name })

    // 3. Determine test file path
    const testFile = framework.testFileForSource

    // Ensure the directory exists
    const testDir = path.dirname(testFile)
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }

    // 4. Generate initial test
    let testContent: string
    try {
      const raw = await callLLM(buildGeneratePrompt(sourceFile, sourceContent, framework))
      testContent = stripCodeFences(raw)
    } catch (err) {
      return { passed: false, testFile, output: `AutoTest: LLM call failed during generation: ${err}` }
    }

    writeFileSync(testFile, testContent, "utf-8")
    log.info("auto-test: wrote test file", { testFile })

    // 5. Red-green-refactor loop
    let lastOutput = ""
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      log.info("auto-test: running tests", { attempt })

      const { passed, output } = runTests(framework.runCmd)
      lastOutput = output

      if (passed) {
        log.info("auto-test: tests passed", { attempt })
        return { passed: true, testFile, output }
      }

      log.info("auto-test: tests failed", { attempt, output: output.slice(0, 500) })

      if (attempt === maxRetries) break

      // 6. Ask LLM to fix
      try {
        const raw = await callLLM(buildFixPrompt(sourceFile, sourceContent, testFile, testContent, framework, output))
        testContent = stripCodeFences(raw)
        writeFileSync(testFile, testContent, "utf-8")
        log.info("auto-test: wrote fixed test file", { testFile, attempt })
      } catch (err) {
        lastOutput += `\nAutoTest: LLM fix call failed on attempt ${attempt}: ${err}`
        break
      }
    }

    return { passed: false, testFile, output: lastOutput }
  }

  /**
   * Run all existing tests in the project root (using the detected framework).
   * Returns output from the test runner.
   */
  export async function runAll(projectRoot: string): Promise<{ passed: boolean; output: string }> {
    // Try to detect framework from any package.json in the project root
    const pkgJsonPath = path.join(projectRoot, "package.json")
    let pkg: any = {}
    if (existsSync(pkgJsonPath)) {
      try {
        pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"))
      } catch {
        // ignore
      }
    }

    const allDeps = { ...((pkg.dependencies ?? {}) as object), ...((pkg.devDependencies ?? {}) as object) }
    const scripts = (pkg.scripts as Record<string, string>) ?? {}

    // Check scripts.test first
    if (scripts.test && !scripts.test.includes("no test")) {
      const cmd = `cd "${projectRoot}" && npm test 2>&1`
      return runTests(cmd)
    }

    for (const fp of FRAMEWORK_PATTERNS.filter((p) => p.name !== "pytest")) {
      if (fp.deps.length === 0) continue
      const found = fp.deps.some((dep) => dep in allDeps)
      if (found) {
        return runTests(fp.runCmd(projectRoot))
      }
    }

    // Fallback: try pytest
    const hasPy = existsSync(path.join(projectRoot, "setup.py")) || existsSync(path.join(projectRoot, "pyproject.toml"))
    if (hasPy) {
      const fp = FRAMEWORK_PATTERNS.find((p) => p.name === "pytest")!
      return runTests(fp.runCmd(projectRoot))
    }

    return {
      passed: false,
      output: "AutoTest: could not detect a test runner. Run tests manually or configure a test script in package.json.",
    }
  }
}
