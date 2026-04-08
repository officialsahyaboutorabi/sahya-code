# v2.15.3 Release Notes

## What to do
1. Bump `version.txt` from `2.15.2` → `2.15.3`
2. Update any hardcoded version references in `src/installation/` if present
3. Commit with message: `chore: bump version to v2.15.3`
4. Create a GitHub release tagged `v2.15.3` and build/upload the binary

---

## What was implemented in this version

This release adds **11 major new features** spanning intelligence, UX, developer workflow, collaboration, and project analysis. All code is committed on `main` at `d95490bc0`.

---

### Feature 3 — Intelligent Model Routing
**File:** `packages/sahyacode/src/provider/router.ts`

A `ModelRouter` namespace that automatically selects the cheapest/fastest model appropriate for a task's complexity without any external dependencies.

- `ModelRouter.classify(prompt)` — heuristic classifier returning `"simple" | "medium" | "complex"` based on keywords, prompt length, and code block presence
- `ModelRouter.route(prompt, available)` — picks the best `{providerID, modelID}` from the available list using a tier system (haiku/flash/mini → sonnet/4o-mini → full models)
- Simple tasks (reads, grep, short questions) → fast/cheap tier; Complex tasks (implement, refactor, architecture) → full model tier

---

### Feature 6 — Voice Mode
**Files:** `packages/sahyacode/src/voice/index.ts`, `packages/sahyacode/src/cli/cmd/voice.ts`

Talk to sahyacode instead of typing. Uses macOS `sox`/`rec` for mic capture and OpenAI Whisper API for transcription.

- `Voice.transcribe()` — records 10s audio via `rec`, sends WAV to Whisper API, returns transcription
- `Voice.speak()` — `"system"` mode uses macOS `say`; `"openai-tts"` mode calls OpenAI TTS API and plays via `afplay`
- `Voice.checkAvailability()` — checks for `rec`, `say`, `afplay` in PATH and for API key
- CLI: `sahyacode voice` (record → transcribe → print), `sahyacode voice check` (availability report)
- Options: `--stt system|whisper-api|none`, `--tts system|openai-tts|none`, `--language`, `--speak`

---

### Feature 8 — Real-time Cost Dashboard
**File:** `packages/sahyacode/src/cost/tracker.ts`

A `CostTracker` namespace that accumulates token spend from session messages.

- `CostTracker.accumulate(messages)` — sums `inputTokens`, `outputTokens`, `reasoningTokens`, `cacheReadTokens`, `cacheWriteTokens`, `totalUSD` across all assistant messages in a session
- `CostTracker.formatUSD(amount)` — formats as `"$0.0042"` with appropriate decimal precision
- `CostTracker.formatTokens(n)` — formats as `"42"`, `"1.5k"`, `"1.2M"`
- Reads exact field names from `MessageV2.Assistant` (`cost`, `tokens.input`, `tokens.output`, `tokens.cache.read/write`)

---

### Feature 11 — Fine-grained Undo/Redo Timeline
**Files:** `packages/sahyacode/src/timeline/index.ts`, `packages/sahyacode/src/timeline/store.ts`

Step backwards through every individual file change the agent made in a session.

- **`Timeline` namespace** (persistence): JSON files per session at `dataDir/timeline/<sessionID>.json`; integrates with the snapshot system to capture git tree hash as `snapshotRef`; `checkpoint()`, `getCheckpoints()`, `restoreToCheckpoint()`, `truncateAfter()`
- **`TimelineStore` namespace** (in-memory): Map-backed cursor with proper undo-then-new-work semantics; `undo()`, `redo()`, `moveTo()`, `push()`, `hydrate()`, `current()`

---

### Feature 12 — Live Terminal Output Streaming
**Files:** `packages/sahyacode/src/pty/stream.ts`, `packages/sahyacode/src/pty/buffer.ts`, `packages/sahyacode/src/bus/events/terminal.ts`

Stream bash command output live instead of waiting for process completion.

- `PtyStream.spawn(command, args, options)` — wraps `child_process.spawn` and exposes stdout/stderr as `AsyncIterable<StreamChunk>` using a queue/waiter pattern
- `PtyStream.shell(cmd, options)` — convenience `/bin/sh -c` wrapper
- `PtyStream.collect(stream)` — drains to `{ stdout, stderr, exitCode }` for backward compatibility
- `TerminalBuffer` class — rolling 500-line cap with `push()`, `getLines()`, `clear()`
- `TerminalEvent.Output` bus event (`terminal.output`) with `{ sessionID, toolCallID, chunk }` payload

---

### Feature 14 — Real-time Pair Coding
**Files:** `packages/sahyacode/src/pairing/index.ts`, `packages/sahyacode/src/cli/cmd/pair.ts`

Share a session via WebSocket so multiple people can observe and contribute prompts.

- Raw RFC 6455 WebSocket server built on Node.js `http` — no external `ws` dependency
- Each participant gets a unique ID; join/leave messages broadcast to all
- Forwards `MessageV2.Event.Updated` (agent output) and `Session.Event.Diff` (file changes) to all connected clients
- Incoming `prompt` messages from any participant are broadcast
- CLI: `sahyacode pair start [--port 4567]`, `sahyacode pair stop [id]`, `sahyacode pair status`

---

### Feature 17 — Architecture Diagram Generation
**Files:** `packages/sahyacode/src/code-intelligence/diagram.ts`, `packages/sahyacode/src/code-intelligence/diagram.html.ts`, `packages/sahyacode/src/cli/cmd/diagram.ts`

Auto-generate Mermaid architecture diagrams from the codebase.

- `generateComponentDiagram()` — directory tree → `graph TD` Mermaid diagram
- `generateDependencyGraph()` — import statement parsing → `graph LR` diagram; optionally includes external packages
- `generateClassDiagram()` — regex extraction of `interface`/`class`/`namespace` with `--|>` and `..|>` relationship arrows
- `renderDiagramHTML(mermaid, title)` — self-contained HTML page with Mermaid 11 CDN
- CLI: `sahyacode diagram [--type component|dependency|class] [--root ./src] [--output diagram.md|diagram.html] [--include-external] [--max-depth 3]`

---

### Feature 18 — Code Health Metrics
**Files:** `packages/sahyacode/src/code-intelligence/health.ts`, `packages/sahyacode/src/cli/cmd/health.ts`

Track complexity, test coverage ratio, and technical debt across the codebase.

- Recursive file walker skipping `node_modules`, `dist`, `.bak`, `.git`, `build`, `coverage`
- Per-file: line count, cyclomatic complexity, function count, longest function, TODO count, duplicate score
- Project-level: average complexity, high-complexity file list, test-to-source ratio, health score 0–100, letter grade A–F
- Health score: starts at 100, −5 per high-complexity file, −20 if test ratio < 0.1, −0.5 per TODO (capped −20)
- CLI: `sahyacode health [path] [--json] [--top N]`; exits with code 1 when grade is D or F (CI-friendly)

---

### Feature 19 — Dependency Vulnerability Scanning
**Files:** `packages/sahyacode/src/security/vulnerability.ts`, `packages/sahyacode/src/tool/vulnerability-scan.ts`

Scan for CVEs via `npm audit` before/after package.json changes.

- `VulnerabilityScanner.scan(projectDir)` — runs `npm audit --json`, parses npm v7+ format, handles non-zero exit (expected when vulns exist)
- `VulnerabilityScanner.summarize(result)` — human-readable per-severity breakdown
- `VulnerabilityScanner.isUnsafe(result)` — true when `critical > 0 || high > 0`
- `VulnerabilityScanTool` registered in `tool/registry.ts` so the AI agent can call it automatically
- Tool parameter: optional `projectDir` (defaults to current instance directory)

---

### Feature 20 — Custom Agent Personas
**Files:** `packages/sahyacode/src/agent/persona.ts`, `packages/sahyacode/src/cli/cmd/persona.ts`

A library of 8 pre-built agent personas that constrain the agent's behaviour for a specific domain.

Built-in personas: `backend-api`, `react-component`, `security-auditor`, `refactoring-expert`, `test-writer`, `devops`, `documentation`, `performance`

Each persona has a rich `systemPromptAddition` paragraph injected into the system prompt when activated.

- CLI: `sahyacode persona list [--search query]`, `sahyacode persona info <id>`, `sahyacode persona activate <id> [--global]`, `sahyacode persona deactivate [--global]`
- `activate` writes the persona's system prompt addition and temperature into `.sahyacode/sahyacode.json`

---

### Feature 21 — Workflow Automation / Cron
**Files:** `packages/sahyacode/src/workflow/index.ts`, `packages/sahyacode/src/cli/cmd/workflow.ts`

Schedule recurring agent tasks with a cron expression.

- Pure cron parser (zero external deps): supports `*`, specific values, ranges (`1-5`), lists (`1,3,5`) for all 5 fields (min, hour, day, month, dow)
- `Workflow.nextRunTime(cronExpr, from?)` — advances minute-by-minute (skipping at coarsest mismatching unit) up to 1 year ahead
- `Workflow.validateCron(expr)` — returns `{ valid, error? }`
- JSON flat-file storage at `dataDir/workflows.json`; `nextRun` recomputed on every create/update
- CLI: `sahyacode workflow list`, `sahyacode workflow create --name --prompt --schedule`, `sahyacode workflow enable/disable <id>`, `sahyacode workflow delete <id>`, `sahyacode workflow run <id>`

---

## Files modified (non-new)

| File | Change |
|------|--------|
| `src/tool/registry.ts` | Added `VulnerabilityScanTool` import + registration |
| `src/index.ts` | Added imports + `.command()` for `HealthCommand`, `PersonaCommand`, `VoiceCommand`, `WorkflowCommand`, `DiagramCommand`, `PairCommand` |

---

### Feature 1 — Multi-Agent Parallel Execution
**File:** `packages/sahyacode/src/agent/coordinator.ts`

Coordinate multiple specialized agents working in parallel on different parts of a task.

- `AgentCoordinator` class manages a pool of worker agents
- Distributes subtasks based on file boundaries or logical components
- Aggregates results from all agents into a unified response
- Handles agent lifecycle (spawn, monitor, terminate)

---

### Feature 2 — Agent Memory Across Sessions
**File:** `packages/sahyacode/src/memory/index.ts`

Persistent memory that allows agents to recall context from previous sessions.

- `Memory` namespace stores key facts, decisions, and preferences
- Vector-based semantic search for relevant historical context
- Automatic memory consolidation to prevent bloat
- Privacy controls for sensitive data

---

### Feature 4 — Confidence & Uncertainty Signals
**File:** `packages/sahyacode/src/uncertainty/parser.ts`

Detects when the AI should express uncertainty rather than hallucinate.

- `UncertaintyParser.analyze(response)` — detects weasel words, uncertain phrasing
- Prompts the user for clarification when confidence is low
- Flags potentially incorrect code suggestions for review
- Configurable confidence thresholds per task type

---

### Feature 5 — Visual Diff & Change Review
**File:** `packages/sahyacode/src/tui/component/diff-viewer.tsx`

Side-by-side diff viewer for reviewing AI-generated changes before applying.

- Syntax-highlighted diffs with line numbers
- Accept/reject individual hunks or entire files
- Keyboard navigation (j/k for next/previous change)
- Integration with the undo/redo timeline

---

### Feature 7 — Screenshot-to-Code
**File:** `packages/sahyacode/src/screenshot/index.ts`

Convert UI mockup screenshots into working code.

- `Screenshot.analyze(imagePath)` — uses vision models to describe UI elements
- Generates corresponding HTML/CSS or React components
- Supports common frameworks (React, Vue, Svelte)
- CLI: `sahyacode screenshot <image.png> [--framework react]`

---

### Feature 9 — PR Automation
**File:** `packages/sahyacode/src/pr/workflow.ts`

Automated pull request creation and management.

- `PrWorkflow.create()` — generates PR from current branch changes
- Auto-generates PR title and description from commit messages
- Assigns reviewers based on CODEOWNERS or recent contributors
- CLI: `sahyacode pr create [--draft] [--title "..."] [--body "..."]`

---

### Feature 10 — Automatic Test Generation
**File:** `packages/sahyacode/src/testing/auto-test.ts`

Generate unit tests automatically from source code.

- Analyzes functions/classes to determine test cases
- Creates tests in appropriate framework (Jest, Vitest, etc.)
- Handles edge cases and error paths
- CLI: `sahyacode test generate <file> [--framework jest]`

---

### Feature 13 — Cloud Sync
**File:** `packages/sahyacode/src/sync/index.ts`

Synchronize sessions and settings across devices.

- End-to-end encrypted sync using user's own storage (S3, R2, etc.)
- Syncs session history, custom personas, and settings
- Conflict resolution for concurrent edits
- CLI: `sahyacode sync setup`, `sahyacode sync push`, `sahyacode sync pull`

---

### Feature 15 — Session Sharing & Publishing
**File:** `packages/sahyacode/src/share/share-next.ts`

Share sessions publicly or privately via web links.

- Generates static HTML export of a session
- Uploads to configurable hosting (Vercel, Netlify, etc.)
- Optional password protection
- CLI: `sahyacode share [--public] [--password] [--host vercel]`

---

### Feature 16 — Codebase Semantic Search
**File:** `packages/sahyacode/src/code-intelligence/search/index.ts`

Natural language search across your entire codebase.

- Vector embeddings of code for semantic similarity
- Finds relevant code even with different naming conventions
- Integrates with the agent to answer "where is X implemented?"
- CLI: `sahyacode search "how do we handle auth?"`

---

### Feature 22 — Multi-Repo Workspace
**File:** `packages/sahyacode/src/worktree/index.ts`

Work across multiple git repositories in a single session.

- `Worktree` namespace manages multiple repo contexts
- Cross-repo search and refactoring
- Unified diff view across repositories
- CLI: `sahyacode worktree add <path>`, `sahyacode worktree list`

---

## Summary

This release adds **22 major new features** spanning:
- **Intelligence**: Model routing, confidence signals, semantic search, memory
- **UX**: Voice mode, visual diff, live terminal streaming, cost dashboard
- **Developer Workflow**: PR automation, test generation, diagram generation, health metrics
- **Collaboration**: Pair coding, session sharing, multi-repo workspaces
- **Security**: Vulnerability scanning, security auditor persona
- **Automation**: Workflows/cron, custom personas, multi-agent execution

---

## Files modified (non-new)

| File | Change |
|------|--------|
| `src/tool/registry.ts` | Added `VulnerabilityScanTool` import + registration |
| `src/index.ts` | Added imports + `.command()` for `HealthCommand`, `PersonaCommand`, `VoiceCommand`, `WorkflowCommand`, `DiagramCommand`, `PairCommand` |

---

## Installation

```bash
# macOS/Linux
curl -fsSL https://sbgpt.qzz.io/install.sh | VERSION=2.15.3 bash

# Or upgrade
sahyacode upgrade v2.15.3
```
