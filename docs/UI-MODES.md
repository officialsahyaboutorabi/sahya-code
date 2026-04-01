# Sahya Code UI Modes

Sahya Code provides multiple ways to interact with it, all from the terminal:

## Quick Comparison

| Aspect | Shell UI (Default) | TUI Mode | Print Mode |
|--------|-------------------|----------|------------|
| **Type** | Inline terminal UI | Full-screen terminal app | One-shot output |
| **Implementation** | Python + Rich | Node.js + Ink/React | Python |
| **Requires Node.js** | ❌ No | ✅ Yes | ❌ No |
| **Interactive** | ✅ Yes | ✅ Yes | ❌ No |
| **Full-screen** | ❌ No | ✅ Yes | ❌ No |
| **Session sidebar** | ❌ No | ✅ Yes | ❌ No |
| **Visual dialogs** | ❌ Inline text | ✅ Yes | ❌ No |

## Shell UI (Default)

The traditional **inline** terminal interface written in Python.

```bash
sahya-code                    # Start shell UI
```

**Characteristics:**
- Runs inline in your terminal (like a REPL)
- Uses Python's Rich library for formatting
- Shows tool execution as text output
- Slash commands with `/`
- No additional dependencies

**Best for:**
- Quick tasks
- Users who prefer traditional CLI
- When Node.js is not available
- Scripting and automation

## TUI Mode (opencode-style)

A **full-screen** terminal application inspired by opencode.

```bash
sahya-code --tui              # Start TUI mode
```

**Characteristics:**
- Takes over the entire terminal (like vim, htop)
- Uses Node.js + React Ink for rendering
- Sidebar for session management
- Visual approval dialogs
- More visual polish
- Requires Node.js 18+

**Best for:**
- Longer interactive sessions
- Users who prefer modern TUIs
- Visual session management
- Keyboard-centric workflows

## Print Mode

Non-interactive mode for scripts and automation.

```bash
sahya-code --print "Your prompt"    # One-shot execution
```

**Characteristics:**
- No interaction required
- Outputs to stdout
- Good for CI/CD pipelines
- Auto-approves actions

## Visual Comparison

### Shell UI (Default)
```
$ sahya-code
╭────────────────────────────────────────╮
│  Welcome to Sahya Code                 │
│  Directory: ~/projects/myapp           │
│  Session: abc-123                      │
╰────────────────────────────────────────╯
> Explain this codebase

🤖 I'll analyze the codebase for you...
• Using ReadFile (README.md)
• Using Glob (src/**/*.py)

[Result appears inline]

> /model                    [command]
> /sessions                 [command]
```

### TUI Mode
```
╔═══════════════════════════════════════════════════════════════╗
║ Sessions          ║  Sahya Code                    ║ Help    ║
║ ───────────────── ║  ───────────────────────────── ║ ────    ║
║ ▶ current         ║                                ║         ║
║   session-abc     ║  > Explain this codebase       ║         ║
║   session-xyz     ║                                ║         ║
║                   ║  🤖 I'll analyze...            ║         ║
║ n: new            ║                                ║         ║
║ d: delete         ║  ┌────────────────────────┐    ║         ║
║ r: refresh        ║  │  Approve ReadFile?     │    ║         ║
║                   ║  │                        │    ║         ║
║                   ║  │  [Y] Yes    [N] No     │    ║         ║
║                   ║  └────────────────────────┘    ║         ║
╚═══════════════════════════════════════════════════════════════╝
```

## When to Use Which

### Use Shell UI (default) when:
- You want a quick, simple interface
- You're running in a restricted environment
- You prefer inline output
- You don't have Node.js installed
- You're scripting/automating

```bash
sahya-code "Review this code"     # Quick one-liner
sahya-code                        # Interactive shell
```

### Use TUI Mode when:
- You want a modern, visual interface
- You manage multiple sessions frequently
- You prefer full-screen apps
- You want visual tool approval dialogs
- You have Node.js installed

```bash
sahya-code --tui                  # Full-screen TUI
```

### Use Print Mode when:
- Running in CI/CD
- Need non-interactive output
- Scripting responses

```bash
sahya-code --print "Fix this bug"
```

## Switching Between Modes

All modes share the same:
- Configuration (`~/.config/sahya/config.toml`)
- Session storage
- API keys and authentication
- History and context

You can switch freely:
```bash
sahya-code --tui                  # Work in TUI
# ... later ...
sahya-code --session <id>         # Continue in shell UI
```

## Installation Requirements

### Shell UI
```bash
pip install sahya-code            # Just Python needed
```

### TUI Mode
```bash
pip install sahya-code            # Python
npm install                       # Also need Node.js + deps
```

### Installing TUI Dependencies
```bash
# Option 1: During setup
./install.sh                      # Installs everything

# Option 2: Manual
cd src/sahya_code/tui && npm install

# Option 3: Makefile
make install-tui
```

## Technical Details

### Shell UI
- **Process**: Single Python process
- **Rendering**: Rich library (inline)
- **Input**: Python prompt-toolkit
- **Output**: Inline terminal output

### TUI Mode
- **Process**: Python spawns Node.js subprocess
- **Rendering**: React Ink (full-screen)
- **Input**: Node.js terminal handling
- **Output**: Full-screen terminal UI
- **Communication**: WebSocket to Python backend

## Summary

| If you want... | Use |
|----------------|-----|
| Simple, no dependencies | `sahya-code` |
| Modern full-screen UI | `sahya-code --tui` |
| Scripting/CI | `sahya-code --print` |

Both are **terminal UIs** - they run in your terminal. The TUI is just more visual and interactive!
