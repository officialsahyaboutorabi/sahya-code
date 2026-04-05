# Sahya Code - Rebranding Changes

This document summarizes all changes made to rebrand opencode to Sahya Code with Ollama and LiteLLM provider support.

**Current Version:** v2.13.6  
**Last Updated:** 2026-04-05

---

## Summary of Changes

### 1. Package Rebranding

#### Root package.json
- Changed `name` from "opencode" to "sahyacode"
- Updated description

#### packages/sahyacode/package.json
- Changed `name` from "opencode" to "sahyacode"
- Updated binary entries to support both `sahyacode` and `opencode` (legacy)

### 2. Binary Files

#### packages/sahyacode/bin/sahyacode (NEW)
- New Node.js wrapper script
- Supports both `SAHYACODE_BIN_PATH` and `OPENCODE_BIN_PATH` env vars
- Looks for native binaries with `sahyacode-*` prefix

#### packages/sahyacode/bin/opencode
- Now a symlink to `sahyacode` for backward compatibility

### 3. Logo/Branding

#### packages/sahyacode/src/cli/logo.ts
- Replaced with Sahya Code ASCII art logo

#### packages/sahyacode/src/cli/cmd/tui/component/logo.tsx
- Simplified to render ASCII art in primary color (orange)

#### packages/sahyacode/src/cli/cmd/tui/routes/home.tsx
- Updated logo container height from 4 to 16 lines

#### packages/sahyacode/src/cli/ui.ts
- Updated logo() function to render ASCII art with orange color

### 4. Configuration Paths

#### packages/sahyacode/src/global/index.ts
- Changed app name from "opencode" to "sahyacode"
- Config now stored in `~/.config/sahyacode/`

#### packages/sahyacode/src/config/paths.ts
- Updated to search both `.sahyacode` and `.opencode` directories
- Supports both `SAHYACODE_DISABLE_PROJECT_CONFIG` and `OPENCODE_DISABLE_PROJECT_CONFIG`
- Supports both `SAHYACODE_CONFIG_DIR` and `OPENCODE_CONFIG_DIR`

#### packages/sahyacode/src/config/config.ts
- Updated managed config directories to use "sahyacode"
- Updated config file search to include both `sahyacode.json(c)` and `opencode.json(c)`
- Updated schema URL from `https://opencode.ai/config.json` to `https://sahya.ai/config.json`
- Updated documentation URLs

#### packages/sahyacode/src/flag/flag.ts
- Added `SAHYACODE_DISABLE_PROJECT_CONFIG` (aliases `OPENCODE_DISABLE_PROJECT_CONFIG`)
- Added `SAHYACODE_CONFIG_DIR` (aliases `OPENCODE_CONFIG_DIR`)

### 5. Provider Support

#### packages/sahyacode/src/provider/provider.ts
Added two new providers:

**Ollama Provider:**
- Configurable via `OLLAMA_BASE_URL` env var or config
- Defaults to `http://localhost:11434`
- Auto-discovers models from Ollama API
- Uses `@ai-sdk/openai-compatible` for API compatibility

**LiteLLM Provider:**
- Configurable via `LITELLM_BASE_URL` env var or config
- Defaults to `https://llm.nexiant.ai`
- API key via `LITELLM_API_KEY` env var, auth, or config
- Auto-discovers models from LiteLLM API
- Uses `@ai-sdk/openai-compatible` for API compatibility

#### packages/sahyacode/src/provider/schema.ts
- Added `ollama` and `litellm` to ProviderID well-known providers

### 6. CLI Entry Point

#### packages/sahyacode/src/index.ts
- Changed script name from "opencode" to "sahyacode"
- Added `SAHYACODE_PURE`, `SAHYACODE`, `SAHYACODE_PID` env vars
- Maintains `OPENCODE_*` env vars for backward compatibility
- Updated log marker from `opencode.db` to `sahyacode.db`

### 7. Installation

#### packages/sahyacode/src/installation/index.ts
- Updated USER_AGENT from `opencode/` to `sahyacode/`
- Updated latest version detection to read from `version.txt` on GitHub
- Version string includes 'v' prefix for consistency

#### packages/sahyacode/src/installation/meta.ts
- Version comes from `OPENCODE_VERSION` compile-time define
- Falls back to "local" if not defined

### 8. Install Script

#### install.sh (NEW)
- curl-based installation script
- URL: `curl -fsSL https://sbgpt.qzz.io/install.sh | bash`
- Detects platform/architecture
- Downloads appropriate binary from GitHub releases
- Creates both `sahyacode` and `opencode` symlinks
- **v2.13.4+**: Now handles tar.gz archives correctly
- **v2.13.4+**: Looks for `opencode` binary inside `sahyacode-*/bin/` directory

### 9. Version Management

#### version.txt
- New file at repo root tracking current version
- Format: `v2.13.4`
- Used by installation system to check for updates

#### Build Process (packages/sahyacode/script/build.ts)
- **IMPORTANT**: Must set `OPENCODE_VERSION` environment variable
- Without this, binary reports `0.0.0-main-*` instead of actual version
- Version is baked into binary via `define` option

### 10. Bug Fixes (v2.13.4)

#### Double 'v' in Update Messages
**File:** `packages/sahyacode/src/cli/cmd/tui/app.tsx`
**Problem:** Messages showed `vv2.13.3` instead of `v2.13.3`
**Fix:** Removed hardcoded 'v' prefix since version already includes it

```typescript
// Before:
message: `SahyaCode v${version} is available...`

// After:
message: `SahyaCode ${version} is available...`
```

#### Binary Version Reporting
**File:** `packages/script/src/index.ts`
**Problem:** Binary showed `0.0.0-main-TIMESTAMP` instead of version
**Cause:** `Script.version` defaults to preview version when `OPENCODE_VERSION` not set
**Fix:** Set `OPENCODE_VERSION` env var before building

```bash
export OPENCODE_VERSION="2.13.4"
bun run script/build.ts --single
```

#### Install Script Archive Handling
**File:** `sahyagpt/install.sh` (deployed to sbgpt.qzz.io)
**Problem:** Expected raw binary, but GitHub releases use tar.gz
**Fix:** Added tar extraction logic and proper binary path detection

```bash
# Extract archive
tar -xzf "$archive_path" -C "$TEMP_DIR"

# Find binary in extracted directory
EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "sahyacode-*" | head -1)
mv "$EXTRACTED_DIR/bin/opencode" "$INSTALL_DIR/sahyacode"
```

---

## Environment Variables

### New Sahya Code Variables (Preferred)
- `SAHYACODE_BIN_PATH` - Path to binary
- `SAHYACODE_CONFIG_DIR` - Config directory override
- `SAHYACODE_DISABLE_PROJECT_CONFIG` - Disable project config
- `SAHYACODE_PURE` - Run without external plugins
- `SAHYACODE` - Set to "1" when running
- `SAHYACODE_PID` - Process ID

### Legacy Variables (Still Supported)
- `OPENCODE_BIN_PATH`
- `OPENCODE_CONFIG_DIR`
- `OPENCODE_DISABLE_PROJECT_CONFIG`
- `OPENCODE_PURE`
- `OPENCODE`
- `OPENCODE_PID`

### Provider Variables
- `OLLAMA_BASE_URL` - Ollama API URL (default: http://localhost:11434)
- `LITELLM_BASE_URL` - LiteLLM API URL (default: https://llm.nexiant.ai)
- `LITELLM_API_KEY` - LiteLLM API key

### Build Variables
- `OPENCODE_VERSION` - **REQUIRED** for proper version embedding (e.g., "2.13.4")
- `OPENCODE_CHANNEL` - Release channel (default: "latest")
- `OPENCODE_RELEASE` - Set to "1" for release builds

---

## Config Files

### Search Order (new to old)
1. `sahyacode.jsonc`
2. `sahyacode.json`
3. `opencode.jsonc`
4. `opencode.json`
5. `config.json`

### Directories
- Global config: `~/.config/sahyacode/`
- Project config: `.sahyacode/` (preferred) or `.opencode/` (legacy)

---

## Usage

### Basic Usage
```bash
# Using new name
sahyacode

# Using legacy name (still works)
opencode
```

### Install via curl
```bash
curl -fsSL https://sbgpt.qzz.io/install.sh | bash
```

### Upgrade
```bash
sahyacode upgrade
```

### Configure Providers

**Ollama (local):**
```json
{
  "provider": {
    "ollama": {
      "options": {
        "baseURL": "http://localhost:11434"
      }
    }
  },
  "model": "ollama/llama3.2"
}
```

**LiteLLM (nexiant):**
```json
{
  "provider": {
    "litellm": {
      "options": {
        "apiKey": "your-api-key"
      }
    }
  },
  "model": "litellm/gpt-4"
}
```

---

## Build Instructions

### Prerequisites
- Bun 1.3.11+
- Node.js 22+

### Build Binary (macOS ARM64)
```bash
cd packages/sahyacode

# IMPORTANT: Set version env var
export OPENCODE_VERSION="2.13.4"

# Build
bun run script/build.ts --single

# Package
cd dist/sahyacode-darwin-arm64
tar -czf ../../../sahyacode-darwin-arm64.tar.gz .
```

### Release
```bash
# Tag and push
git tag v2.13.4
git push origin v2.13.4

# Create release with binary
gh release create v2.13.4 \
  --title "v2.13.4" \
  --notes "Release notes..." \
  sahyacode-darwin-arm64.tar.gz
```

---

## Repository Structure

```
sahya-code/
├── packages/
│   ├── opencode/          # Main CLI application
│   │   ├── src/
│   │   │   ├── cli/       # CLI commands and TUI
│   │   │   ├── installation/  # Version checking and upgrades
│   │   │   ├── provider/  # AI provider implementations
│   │   │   └── ...
│   │   └── script/
│   │       └── build.ts   # Build script
│   └── script/            # Shared build utilities
├── sahyagpt/              # Public website (sbgpt.qzz.io)
│   └── install.sh         # Public install script
├── version.txt            # Current version
└── install.sh             # Local install script
```

---

## New Modules (v2.13.6)

### Code Intelligence Module

**Location:** `packages/sahyacode/src/code-intelligence/`

Provides deep codebase understanding capabilities:

- **AST Parsing** - Tree-sitter integration for TypeScript/JavaScript (extensible to other languages)
- **Dependency Graph** - Visualize imports, exports, and function call relationships
- **Semantic Search** - Find code by meaning, not just text
- **Code Metrics** - Complexity analysis, lines of code, function counts
- **Dead Code Detection** - Identify potentially unused code

**CLI Command:**
```bash
sahyacode analyze ./src
sahyacode analyze ./src --circular    # Detect circular dependencies
sahyacode analyze ./src --dead-code   # Find unused code
sahyacode analyze ./src --symbols "auth"  # Search for symbols
```

### Live Agent Observatory Module

**Location:** `packages/sahyacode/src/observatory/`

Real-time visualization of AI agent activity:

- **Event Streaming** - Capture tool calls, file operations, LLM requests, thoughts
- **TUI Dashboard** - Live progress tracking with thought visualization
- **Browser Preview** - HTTP server with auto-refresh for web projects
- **Checkpoints** - Save/restore session state snapshots
- **Timeline** - Action history with status indicators

**CLI Command:**
```bash
sahyacode observatory                    # Observe current session
sahyacode observatory --preview          # Start with browser preview
sahyacode observatory --port 8080        # Custom preview port
sahyacode observatory abc123 --open      # Observe specific session
```

---

## Related Files

- [CHANGELOG.md](./CHANGELOG.md) - Detailed version history
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture (if exists)
- [README.md](./README.md) - Main documentation
