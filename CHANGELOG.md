# Changelog

All notable changes to Sahya Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
