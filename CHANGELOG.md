# Changelog

All notable changes to Sahya Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.16.5] - 2026-04-08

### Added

- **Observatory Live Construction Page** — New `/~observatory/live` page shows website being built in real-time:
  - Split-view layout with file tree, activity log, code preview, and live preview
  - Files appear in tree as they're created with animated writing indicator
  - Real-time activity log of all file operations
  - Code panel shows current file being written with syntax highlighting
  - Live preview iframe that refreshes as files change
  - New endpoints: `/~observatory/live` and `/~observatory/status`

## [v2.16.4] - 2026-04-08

### Fixed

- **Branding fix** — Changed all user-facing 'opencode' references to 'sahyacode':
  - Session exit message now shows `sahyacode -s <session>` instead of `opencode -s <session>`
  - User-Agent headers updated to `sahyacode/${VERSION}`
  - System prompts updated to refer to 'sahyacode' instead of 'opencode'
  - GitHub issue URL updated to officialsahyaboutorabi/sahya-code

## [v2.16.3] - 2026-04-08

### Added

- **Observatory Live Preview** — Status page now shows live iframe preview of website:
  - Preview iframe renders website in real-time as AI builds it
  - Refresh button to reload preview
  - Resize controls (larger/smaller)
  - Open in new tab for full-screen viewing
  - Served from /~observatory/preview endpoint

### Fixed

- **LiteLLM JSON truncation** — Fixed JSON parsing errors with long content:
  - Added repair logic for truncated JSON tool calls
  - Auto-adds missing closing braces/brackets
  - Special handling for write/edit tools with partial content

## [v2.16.2] - 2026-04-08

### Fixed

- **LiteLLM model discovery** — Fixed models not showing after entering URL and API key. The `discoverModels` function is now properly called for litellm provider (like gitlab), fetching available models from the `/models` endpoint after authentication.

### Changed

- Added debug logging to LiteLLM provider for troubleshooting model fetching

## [v2.16.1] - 2026-04-08

### Fixed

- **Install script binary detection** — Fixed install.sh not finding `sahyacode` binary in extracted directory. Now checks for both `bin/opencode` and `bin/sahyacode` in the extracted archive.
- **Version showing as v0.0.0-main-...** — Build now correctly uses `SAHYACODE_CHANNEL=latest` and `SAHYACODE_VERSION` env vars to embed proper version in binaries.
- **Double 'v' prefix in upgrade messages** — Install script and upgrade command now handle version strings with or without 'v' prefix consistently.

### Added

- **LiteLLM provider in TUI** — Users can now connect to custom OpenAI-compatible endpoints (like LiteLLM) directly from the TUI provider selection dialog:
  - Added `litellm` to provider priority list with "(Custom OpenAI-compatible endpoint)" description
  - Auth flow prompts for URL (required) and API key (optional)
  - Added `baseURL` field to `Auth.Api` schema for storing custom endpoint URLs
  - Provider loader reads baseURL from auth first, then falls back to config/env defaults

## [v2.16.0] - 2026-04-08

### Added

- **LiteLLM provider backend support** — Full backend support for LiteLLM/custom OpenAI-compatible endpoints:
  - New provider loader in `provider.ts` with auto-discovery of models from `/models` endpoint
  - Support for baseURL configuration via config, env vars, or auth
  - Default endpoint: `https://llm.nexiant.ai` (configurable)

## [v2.15.9] - 2026-04-08

### Fixed

- **Install script binary path** — Fixed install.sh to look for binary in extracted directory structure (`sahyacode-*/bin/sahyacode`)

## [v2.15.8] - 2026-04-08

### Fixed

- **Observatory browse endpoint** — Fixed path resolution issues for custom directories in directory browser

## [v2.15.7] - 2026-04-08

### Fixed

- **Upgrade command interference** — Database migration no longer runs during upgrade command, preventing logo display from corrupting terminal output

## [v2.15.6] - 2026-04-08

### Fixed

- **Version display in dev builds** — Fixed dev version showing (v0.0.0-main-...) by using `SAHYACODE_CHANNEL=latest`

## [v2.15.5] - 2026-04-08

### Fixed

- **Double "v" prefix** — Fixed upgrade notification showing "vv2.15.x" instead of "v2.15.x"

## [v2.15.4] - 2026-04-08

### Added

- **Custom provider CLI command** — New `sahyacode provider add` command for adding LiteLLM-compatible APIs via CLI

## [v2.15.3] - 2026-04-08

### Fixed

- **Observatory browse endpoint 404** — Fixed URL matching to use `startsWith` instead of exact match for query params
- **CORS headers** — Added proper CORS headers to all observatory responses
- **JSON parse errors** — Added error handling for malformed JSON in observatory requests

## [v2.14.12] - 2026-04-07

### Added

- **Observatory skill** — `~/Library/Application Support/sahyacode/skills/observatory/SKILL.md` teaches the LLM the exact workflow for live observatory mode: write `index.html` first, build incrementally so each file triggers a browser reload, never write directly to the live-view directory, and inform the user about the "Move to Original Location" button and the `/~observatory/replay` animation when done.

### Fixed

- **`/upgrade` downgrade guard** — route now checks `semver.gt(currentVersion, targetVersion)` before calling the install script; if the running version is already newer than what `version.txt` reports it returns a clear message instead of attempting a 404 download.

## [v2.14.11] - 2026-04-07

### Fixed

- **`zsh: killed sahyacode` returns on macOS 26** — ad-hoc signing without entitlements is insufficient on macOS 26.3+. Even though the binary had a valid ad-hoc signature, Taskgated kills it because Bun/JavaScriptCore needs JIT (`com.apple.security.cs.allow-jit`) which requires Hardened Runtime (`--options runtime`) to be active. Build script now writes a temporary entitlements plist (identical to what the bun binary itself uses) and signs with `codesign --sign - --force --options runtime --entitlements`. The five required entitlements are: `allow-jit`, `allow-unsigned-executable-memory`, `allow-dyld-environment-variables`, `disable-library-validation`, `disable-executable-page-protection`.

## [v2.14.10] - 2026-04-07

### Fixed

- **Observatory "Project directory" now shows the real project path** — the `/observe` handler was using `sdk.directory` (the directory sahyacode was launched from, e.g. `~`) instead of the live path from the sync store. It now uses `sync.data.path.worktree || sync.data.path.directory` — the same source `useDirectory()` uses for the status bar — so it always reflects the actual project the AI is coding in.

## [v2.14.9] - 2026-04-07

### Fixed

- **`/upgrade` shows "Upgrade Failed undefined"** — Effect's `TaggedErrorClass` has an empty `.message` property; the route's catch was using `e.message` which returned `""` (falsy), causing the TUI to fall through to `String(result.error)` = `String(undefined)` = `"undefined"`. Route now explicitly checks `instanceof Installation.UpgradeFailedError` and reads `e.stderr` instead. Also added a guard in `app.tsx` so `result.error != null` before `String(result.error)` is called.
- **`/upgrade` shows `vv2.14.8` (double v)** — `version.txt` returns `"v2.14.8"` and the success toast prepended another `"v"`. TUI now strips any leading `v` from `result.data.version` before formatting the toast.
- **`/upgrade` silently re-runs install when already on latest** — route now compares `currentVersion === targetVersion` (after stripping `v` prefix) and returns a clear `{ success: false, error: "v2.14.X is already installed — no upgrade needed" }` message instead of running the install script.
- **`version.txt` bumped to `v2.14.8`** — upgrade check was reporting `v2.14.7` as latest so `/upgrade` always saw "already installed".

## [v2.14.8] - 2026-04-07

### Fixed

- **`~/live-view/` moved inside sahyacode's data directory** — `LIVE_VIEW_DIR` is now `Global.Path.data + "/live-view"` (e.g. `~/Library/Application Support/sahyacode/live-view/` on macOS) instead of `~/live-view/`. Both `observatory/hooks.ts` and `observatory/server.ts` updated; `import os from "os"` removed from both files.

## [v2.14.7] - 2026-04-07

### Fixed

- **macOS SIGKILL (Code Signature Invalid)** — macOS 26 Taskgated kills unsigned binaries. Build script now runs `codesign --sign - --force` on every darwin binary automatically after compilation. All future releases will be ad-hoc signed.
- **`/upgrade` shows `[object Object]` on failure** — the route was returning HTTP 500 for upgrade failures; the SDK client routes non-2xx bodies into `result.error` (a raw object), not `result.data`, so `String(result.error)` → `"[object Object]"`. Route now always returns HTTP 200 with `{ success, error? }` in the body, so `result.data` always carries the message.

## [v2.14.6] - 2026-04-07

### Added

- **`~/live-view/` staging directory** — observatory now uses a dedicated `~/live-view/` directory; all files written by the LLM are mirrored there automatically with correct relative paths preserved
- **Recording system** — every file write/edit is recorded as `~/live-view/.sahya-replay.json` with timestamps, relative paths, content and action type (`write`/`edit`)
- **Move to Original Location** — button on the observatory page sends a `POST /~observatory/move-to` request that copies all files from `~/live-view/` back to the original project directory
- **Replay page** at `/~observatory/replay` — full construction replay with: animated file tree (files appear as they're created), syntax-highlighted code editor revealing content progressively, play/pause, 1×/2×/4×/8× speed control, and a progress bar

## [v2.14.5] - 2026-04-07

### Changed

- **Observatory page redesigned** — now uses SahyaGPT's full design system: SB Sans Text font, JetBrains Mono for paths/badges, `#0d0d0d` background, `#ff4f00` orange accent, glassmorphism card with backdrop blur, animated starfield background, noise overlay, and all CSS variables matching SahyaGPT exactly

## [v2.14.4] - 2026-04-07

### Fixed

- **`/upgrade` command now works** — the `onSelect` handler was `async` but `onSelect` is never awaited by the TUI, so the upgrade ran silently with no feedback. Converted to `.then()/.catch()` (synchronous entry) so the upgrade runs properly and shows success/error toasts
- **Observatory shows the correct working directory** — now uses `sdk.directory` (the actual project directory) as primary source instead of falling back to `process.cwd()` which returned the user's home folder
- **Observatory watches all file types live** — status page now auto-navigates when `index.html` appears; hint text updated; added JSX/TSX/TS content types to the file server

## [v2.14.3] - 2026-04-07

### Fixed

- **Observatory SSE connection stability** — fixes `NS_BINDING_ABORTED` error in Firefox:
  - Server-side heartbeat ping every 15 seconds (was 30s) to keep connection alive
  - Added `X-Accel-Buffering: no` header to prevent proxy buffering
  - Added proper cleanup handlers for `req`/`res` close/error/aborted events
  - Client-side auto-reconnection with exponential backoff (max 10 attempts)
  
- **Observatory dynamic project directory** — project directory is no longer static:
  - `Observatory.updateProjectDir()` updates directory when files are written
  - Status endpoint returns current `projectDir` with fallback to initial workDir
  - Status page displays and updates project directory dynamically via polling
  - "Move to Original Location" button uses the dynamic project directory

- **`/observe` command now works** — fixed `Context.NotFound` crash caused by accessing `Instance.worktree` outside an active session context; now safely falls back to `process.cwd()`
- **Mistral-format tool call repair** — when a model outputs tool calls using `<|tool_call_begin|>` tokens in the text stream, the repair handler now attempts to extract valid JSON from the tokens before falling back to the `invalid` tool display

## [v2.14.2] - 2026-04-06

### Changed

- **Observatory completely reworked** — `/observe` no longer hijacks the TUI. Instead:
  - Starts a local HTTP preview server (`http://localhost:3456`) in the background
  - Opens the browser automatically to that URL
  - You stay in the normal chat session and keep interacting with the AI
  - The browser page auto-reloads the instant the LLM writes any file (SSE live-reload)
  - While waiting for `index.html` to appear, a live status page shows which files are being written in real time
  - Running `/observe` a second time re-opens the already-running server rather than starting a new one
  - Server is stopped cleanly when you exit the TUI

## [v2.14.1] - 2026-04-06

### Fixed

- **Observatory live preview** - The `/observe` command now actually shows the LLM building things in real time:
  - Added `captureFileWrite` calls to the Write and Edit tools so every file the LLM writes is tracked
  - Added SSE (Server-Sent Events) endpoint `/observatory-events` to the preview server so the browser auto-reloads the moment a file changes — no manual refresh needed
  - Live-reload script is injected into every HTML file served, connecting to the SSE endpoint automatically
  - TUI now shows a "Files written by LLM" panel with the most recently created/edited files
  - Status page (shown before `index.html` exists) lists files being written in real time and auto-reloads when `index.html` appears
  - Observatory state now tracks `recentFiles[]` and `lastFileChange` timestamp
  - Proper MIME types for JS, CSS, images, fonts, SVG, etc.

## [v2.14.0] - 2026-04-06

### Fixed

- **TypeScript errors** - Fixed all type errors across the sahyacode package (13 packages, 0 errors):
  - `flag.ts` - Added missing declarations for `SAHYACODE_DISABLE_PROJECT_CONFIG`, `SAHYACODE_CONFIG_DIR`, and `SAHYACODE_SERVER_USERNAME`
  - `theme.ts` - Fixed type cast, missing `readdir` import, multiselect options type, and unknown `colorInfo` type
  - `observatory.tsx` - Removed imports of non-existent observatory modules
  - `tui/routes/observatory/index.tsx` - Fixed `useKeyboard` signature, `theme` proxy usage, `TextProps` props (`fg` vs `color`, `<b>` for bold), `borderStyle="rounded"`, and `theme.backgroundPanel` vs `bgSecondary`
  - `tui/plugin/api.tsx` - Added guard for `ObservatoryRoute` before accessing `id`/`data` properties
  - `plugin/install.ts` - Added `"sahyacode"` to the `PatchDeps.files` name union type
  - `tool/read.ts` - Restored missing `instructions` variable declaration
  - `code-intelligence/index.ts` - Fixed `event.properties.*` access, `create` as Effect values, `InstanceState.make` type cast
  - `code-intelligence/parser/index.ts` - Fixed module destructuring and `create` Effect value usage
  - `code-intelligence/parser/tree-sitter.ts` - Fixed `web-tree-sitter` namespace import and `Parser.Node` vs `SyntaxNode`
  - `code-intelligence/parser/languages/typescript.ts` - Fixed default import and `Parser.Node` usage
  - `tsconfig.json` - Excluded `src/observatory.bak` from compilation

## [v2.13.7] - 2026-04-05

### Fixed

- **Upgrade command** - Fixed /upgrade slash command failing with "Update Check Failed"
- **Package naming** - Changed all references from opencode-ai/opencode to sahyacode:
  - Installation method detection
  - NPM registry URL
  - Upgrade commands (npm, pnpm, bun, choco, scoop, brew)
  - Uninstall commands
- **Server API** - Defaults to "curl" method when installation method detection fails

## [v2.13.6] - 2026-04-05

### Added

- **Code Intelligence Module** (WIP) - New module for deep codebase understanding with AST parsing, dependency graphs, and semantic search. Includes:
  - Tree-sitter integration for multi-language AST parsing
  - Dependency graph builder with circular dependency detection
  - Semantic symbol search
  - Code metrics (complexity, lines of code)
  - Dead code detection
  - New CLI command: `sahyacode analyze <path>`

- **Live Agent Observatory Module** (WIP) - Real-time visualization of AI agent activity:
  - Event streaming for tool calls, file operations, and thoughts
  - TUI dashboard with progress tracking
  - Browser preview server with live reload
  - Checkpoint/rollback system
  - Action timeline visualization
  - New CLI command: `sahyacode observatory [session-id] --preview`

### Fixed

- **Upgrade command** - Fixed version comparison and added downgrade prevention:
  - Versions are now normalized (stripped of 'v' prefix) before comparison
  - Prevents accidental downgrades to older versions
  - Clear messaging when already on latest version
- **Version display** - CLI and TUI now consistently show version with 'v' prefix (e.g., `v2.13.6`)
- **Skill tool validation** - Added validation to catch malformed skill names and provide better error messages with "Did you mean?" suggestions

### Changed

- **npm package references** - Migrated from `opencode-ai` to `sahyacode` npm package references throughout codebase

## [v2.13.5] - 2026-04-05

### Added

- **Linux support** - Added build targets for Linux x64, arm64, and musl variants
- **GitHub Actions workflow** - Simplified release workflow using `bun build --compile`

### Fixed

- **Version mismatch** - Binary now correctly reports v2.13.5 instead of v2.13.4

## [v2.13.4] - 2026-04-02

### Fixed

- **Double 'v' in update notifications** - Fixed update available messages showing `vv2.13.3` instead of `v2.13.3`. The version string already includes the 'v' prefix, so the UI was adding a second one.
- **Version reporting in binary** - Fixed binary reporting `0.0.0-main-*` instead of actual version. Build process now requires `OPENCODE_VERSION` environment variable to be set.
- **Install script tar.gz handling** - Fixed install script to properly extract tar.gz archives instead of expecting raw binary files.
- **Binary path in archive** - Fixed install script to look for `opencode` binary inside `sahyacode-*/bin/` directory within the archive.
- **Ghost animation import** - Fixed `GHOST_FRAME_MS` to `GHOST_FRAME_INTERVAL_MS` import in sidebar.tsx.

### Changed

- **Build process** - Build script now requires `OPENCODE_VERSION` environment variable to properly embed version in binary.
- **Install script URL** - Install script hosted at `https://sbgpt.qzz.io/install.sh` now handles both tar.gz extraction and correct binary naming.

## [v2.13.3] - 2026-04-02

### Fixed

- Install script naming consistency - Updated to use `sahyacode` prefix consistently instead of `opencode`.

## [v2.13.2] - 2026-04-02

### Removed

- **Ghost sidebar plugin** - Removed non-functional "Modified Files" sidebar plugin from TUI that was causing UI issues.

### Fixed

- Worker.py initialization error handling.
- setup-dev.sh error handling improvements.
- WebSocket cleanup on session end.
- Setup command checking for dev environment correctly.
- TUI ghost animation import (`GHOST_FRAME_INTERVAL_MS`).
- Session switching in TUI.
- Config loading with empty state file.
- Sidebar icon color theming.
- Ignore patterns for search working correctly.
- Windows build portable.

### Added

- Initial version tracking via `version.txt`.
- GitHub releases with binary assets.
- curl-based installation script.

---

## Earlier Versions

See [SAHYA_CHANGES.md](./SAHYA_CHANGES.md) for detailed rebranding changes from opencode to Sahya Code.
