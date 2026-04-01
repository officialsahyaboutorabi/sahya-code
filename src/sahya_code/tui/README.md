# Sahya Code TUI

A modern **full-screen Terminal User Interface** for Sahya Code, inspired by [opencode](https://github.com/anomalyco/opencode)'s CLI design.

## What is the TUI?

The TUI is an **alternative terminal interface** to the default shell UI:

| | Shell UI (default) | TUI |
|---|---|---|
| **Style** | Inline terminal UI | Full-screen terminal app |
| **Look** | Like a REPL | Like vim/htop |
| **Needs Node.js** | No | Yes |
| **Session sidebar** | No | Yes |
| **Visual dialogs** | No | Yes |

**Both are terminal-based** - they run in your terminal. The TUI just provides a more visual, full-screen experience!

## Overview

The TUI provides an interactive terminal interface for Sahya Code with:

- **Modern UI**: Built with Ink (React for terminals) for a rich interactive experience
- **Session Management**: List, create, and switch between sessions
- **Real-time Chat**: Interactive conversation with AI assistance
- **Approval Flow**: Visual approval dialogs for tool executions
- **Keyboard Shortcuts**: Efficient navigation with vim-like keybindings

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Terminal                        │
├─────────────────────────────────────────────────────────┤
│  Sahya Code TUI (Node.js + Ink + React)                 │
│  - React components for terminal UI                     │
│  - WebSocket client for real-time communication         │
├─────────────────────────────────────────────────────────┤
│  Adapter Layer                                          │
│  - Translates TUI events to Python backend              │
│  - Manages session state synchronization                │
├─────────────────────────────────────────────────────────┤
│  Sahya Code Backend (Python)                            │
│  - Existing session management                          │
│  - Tool execution                                       │
│  - LLM integration                                      │
└─────────────────────────────────────────────────────────┘
```

## Installation

The TUI is included with Sahya Code. It requires Node.js (v18+) to be installed.

### Prerequisites

```bash
# Install Node.js (if not already installed)
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get install nodejs npm

# Or download from https://nodejs.org/
```

### Setup

```bash
# Navigate to the TUI directory
cd src/sahya_code/tui

# Install dependencies
npm install

# Build the TUI
npm run build
```

## Usage

### Launch TUI (as alternative UI)

```bash
# Start with TUI instead of shell UI
sahya-code --tui

# Or with options
sahya-code --tui --work-dir ./my-project --prompt "Explain this code"
sahya-code --tui --session <session-id>
sahya-code --tui --yolo  # Auto-approve all actions
```

### Alternative: Using the tui command

```bash
# The tui subcommand also works
sahya-code tui
sahya-code tui --work-dir ./my-project
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Exit / Interrupt current operation |
| `Ctrl+S` | Toggle session list sidebar |
| `Esc` | Close dialog / Go back |
| `↑/↓` | Navigate sessions (in session list) |
| `Enter` | Select session / Send message |
| `Y/N` | Approve/Reject tool execution |

### Session List Commands

When in session list view:
- `n` - Create new session
- `d` - Delete selected session
- `r` - Refresh session list

## Development

### Project Structure

```
tui/
├── src/
│   ├── main.ts              # Entry point
│   ├── backend/
│   │   └── client.ts        # WebSocket client for Python backend
│   ├── components/
│   │   ├── App.tsx          # Main app component
│   │   ├── ChatView.tsx     # Chat message display
│   │   ├── PromptInput.tsx  # Input component
│   │   ├── SessionList.tsx  # Session list sidebar
│   │   ├── ApprovalDialog.tsx # Tool approval dialog
│   │   └── ...
│   ├── hooks/
│   │   └── useBackend.ts    # Backend interaction hooks
│   └── utils/
│       └── ...
├── package.json
└── tsconfig.json
```

### Running in Development Mode

```bash
# In one terminal - start the TUI
cd src/sahya_code/tui
npm run dev

# In another terminal - the Python backend will start automatically
# Or manually start it:
sahya-code web --port 5494 --no-browser
```

### Building

```bash
npm run build
```

## Features from opencode

This TUI incorporates design patterns from opencode:

1. **Component-based Architecture**: React components for terminal UI
2. **Real-time Updates**: WebSocket for live message streaming
3. **Session Management**: Easy switching between conversation contexts
4. **Keyboard Navigation**: Efficient keyboard shortcuts
5. **Modern UX**: Clean, minimal interface with visual feedback

## Integration with Sahya Code

The TUI integrates with Sahya Code's existing features:

- ✅ Session management (list, create, resume, delete)
- ✅ Real-time chat with AI
- ✅ Tool execution with approval
- ✅ Session forking
- ✅ File uploads
- ✅ All existing slash commands
- ✅ Web UI (accessible via `--web` flag)

## Troubleshooting

### TUI doesn't start

1. Ensure Node.js is installed: `node --version`
2. Install dependencies: `cd src/sahya_code/tui && npm install`
3. Check that the Python backend is accessible

### WebSocket connection fails

1. Check if the Python backend is running on port 5494
2. Verify no firewall is blocking localhost connections
3. Check logs: `~/.local/share/sahya-code/logs/sahya.log`

### Display issues

1. Ensure your terminal supports Unicode
2. Try using a modern terminal (iTerm2, Windows Terminal, Alacritty)
3. Set `TERM=xterm-256color` if needed

## License

Apache License 2.0 - Same as Sahya Code
