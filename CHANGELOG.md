# Changelog

All notable changes to Sahya Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
