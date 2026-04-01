# TUI Integration Guide

The opencode-style TUI is now integrated as an **alternative UI** within Sahya Code.

## Quick Start

```bash
# Launch with TUI instead of shell UI
sahya-code --tui

# Or with options
sahya-code --tui --work-dir ./my-project
sahya-code --tui --prompt "Explain this code"
sahya-code --tui --session <session-id>
sahya-code --tui --yolo  # Auto-approve all actions
```

## UI Modes

Sahya Code supports multiple UI modes:

| Mode | Flag | Description |
|------|------|-------------|
| **Shell** (default) | (none) | Rich interactive shell with slash commands |
| **TUI** | `--tui` | Opencode-style Terminal UI (requires Node.js) |
| **Print** | `--print` | Non-interactive mode for scripts |
| **ACP** | `--acp` | ACP server mode |
| **Wire** | `--wire` | Wire server mode |

## Prerequisites

The TUI requires Node.js 18+:

```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Or download from https://nodejs.org/
```

## Setup

### Option 1: Automatic (during install)

```bash
./install.sh          # Installs TUI dependencies automatically
```

### Option 2: Manual

```bash
cd src/sahya_code/tui
npm install
```

### Option 3: Makefile

```bash
make install-tui      # Install TUI dependencies only
make install-dev      # Full dev install with TUI
```

## Usage Examples

### Basic TUI Launch

```bash
# Start TUI in current directory
sahya-code --tui

# Start TUI in specific directory
sahya-code --tui --work-dir ./my-project

# Start with initial prompt
sahya-code --tui --prompt "Explain this codebase"
```

### Session Management

```bash
# Resume existing session
sahya-code --tui --session <session-id>

# Continue previous session
sahya-code --tui --continue
```

### Alternative: Subcommand

The `tui` subcommand also works (backward compatibility):

```bash
sahya-code tui
sahya-code tui --work-dir ./my-project --prompt "Hello"
```

## Architecture

The TUI integration works as follows:

```
┌─────────────────────────────────────────┐
│  User runs: sahya-code --tui            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  SahyaCode CLI                          │
│  - Parses --tui flag                    │
│  - Sets UI mode to "tui"                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  run_tui() method                       │
│  - Launches Node.js TUI process         │
│  - Passes session ID, work-dir, etc.    │
└──────────────┬──────────────────────────┘
               │ subprocess
┌──────────────▼──────────────────────────┐
│  TUI (Node.js + Ink/React)              │
│  - Opencode-style terminal UI           │
│  - WebSocket connection to backend      │
└─────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Exit / Interrupt |
| `Ctrl+S` | Toggle session list |
| `Esc` | Close dialog / Go back |
| `↑/↓` | Navigate sessions |
| `Enter` | Select / Send message |
| `Y/N` | Approve/Reject tool execution |

## Troubleshooting

### "TUI not found" Error

```bash
# Install TUI dependencies
cd src/sahya_code/tui && npm install
```

### "Node.js not found" Error

Install Node.js 18+:

```bash
# macOS
brew install node

# Ubuntu
sudo apt-get install nodejs npm
```

### TUI Doesn't Start

1. Check Node.js version: `node --version` (should be v18+)
2. Check TUI exists: `ls src/sahya_code/tui/src/main.ts`
3. Reinstall dependencies: `cd src/sahya_code/tui && rm -rf node_modules && npm install`

## Development

To work on the TUI:

```bash
# Terminal 1 - Start TUI in dev mode
cd src/sahya_code/tui
npm run dev

# Terminal 2 - Run the Python backend
uv run sahya-code web --port 5494
```

## Comparison: Shell UI vs TUI

| Feature | Shell UI | TUI |
|---------|----------|-----|
| Interactive chat | ✅ | ✅ |
| Session management | ✅ (commands) | ✅ (sidebar) |
| Tool approvals | ✅ (inline) | ✅ (dialogs) |
| Slash commands | ✅ | ✅ |
| File uploads | ✅ | ✅ |
| Web UI | ✅ | ✅ (via --web) |
| Keyboard shortcuts | ✅ | ✅ (vim-like) |
| Visual session list | ❌ | ✅ |
| Requires Node.js | ❌ | ✅ |

## Migration Guide

### From Shell UI to TUI

```bash
# Old way (still works)
sahya-code

# New way - TUI
sahya-code --tui
```

### From Separate TUI Command

```bash
# Old way (still works)
sahya-code tui

# New way - integrated
sahya-code --tui
```

Both methods work - use whichever you prefer!
