# Sahya Code Re-architecture: opencode as Primary CLI

## Current Architecture
```
┌─────────────────────────────────────────┐
│  User                                   │
│    ├─ sahya-code (Python/Shell UI)     │
│    └─ sahya-code --tui (Node.js/opencode)│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Python Backend                         │
│  - Session management                   │
│  - Tool execution                       │
│  - LLM integration (kimi-style)        │
└─────────────────────────────────────────┘
```

## Target Architecture
```
┌─────────────────────────────────────────┐
│  User                                   │
│    └─ sahya-code (Node.js/opencode)    │
└──────────────┬──────────────────────────┘
               │ JSON-RPC / WebSocket
┌──────────────▼──────────────────────────┐
│  Python Backend (Agent/Tool Server)     │
│  - Session management                   │
│  - Tool execution                       │
│  - LLM integration                      │
└─────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Clone and Setup opencode
1. Clone opencode repository
2. Rename/rebrand to "sahya-code"
3. Set up build system

### Phase 2: Create Python Agent Server
1. Strip down current CLI to just backend
2. Implement JSON-RPC interface matching opencode's expectations
3. Tool execution via the agent server

### Phase 3: Integration
1. opencode spawns Python backend as subprocess
2. Communication via stdin/stdout JSON-RPC
3. Shared session storage

### Phase 4: Feature Parity
1. Port all kimi tools to work with opencode
2. Configuration compatibility
3. Migration path for existing users

## Key Changes

### What Stays (Python Backend)
- Session management
- Tool implementations (ReadFile, WriteFile, Shell, etc.)
- LLM provider integration
- Configuration system
- Hook system

### What Goes (Python CLI)
- Rich-based Shell UI
- Prompt toolkit input
- Inline rendering
- All terminal UI code

### What Comes (opencode)
- Full-screen terminal UI (primary interface)
- Session sidebar
- Visual approval dialogs
- Real-time streaming display
- Plugin system

## New Entry Point

```bash
# User runs
sahya-code

# What happens:
# 1. Node.js/opencode starts
# 2. Spawns: python -m sahya_code.agent_server
# 3. Communicates via JSON-RPC
# 4. All UI is opencode, all logic is Python
```

## File Structure

```
sahya-code/
├── cli/                    # opencode-based CLI (Node.js)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts       # Entry point
│   │   ├── agent/         # Python agent communication
│   │   └── ...
│   └── ...
├── agent/                  # Python backend
│   ├── pyproject.toml
│   ├── src/
│   │   ├── sahya_agent/   # Agent server
│   │   │   ├── __init__.py
│   │   │   ├── server.py  # JSON-RPC server
│   │   │   ├── tools/     # Tool implementations
│   │   │   └── ...
│   └── ...
└── ...
```

## Migration Guide for Users

### Before
```bash
pip install sahya-code
sahya-code                    # Python CLI
sahya-code --tui              # opencode TUI
```

### After
```bash
npm install -g sahya-code     # Node.js CLI
sahya-code                    # opencode CLI (spawns Python automatically)
```

## Technical Details

### JSON-RPC Protocol
opencode expects a specific protocol. We need to implement:
- `initialize` - Agent capabilities
- `tools/list` - Available tools
- `tools/call` - Execute tool
- `chat/completion` - LLM completion
- `session/*` - Session management

### Tool Mapping
| opencode Tool | Python Backend |
|---------------|----------------|
| `read`        | `ReadFile`     |
| `write`       | `WriteFile`    |
| `edit`        | `StrReplaceFile`|
| `bash`        | `Shell`        |
| `glob`        | `Glob`         |
| `grep`        | `Grep`         |
| ...           | ...            |

## Risks & Considerations

1. **Distribution**: Users need both Node.js and Python
2. **Performance**: IPC overhead between Node.js and Python
3. **Complexity**: Two languages/runtimes to maintain
4. **Compatibility**: Breaking change for existing users

## Alternative: Keep Both

Instead of full replacement, we could:
- Make opencode the default/recommended UI
- Keep Python CLI as fallback
- Gradual migration

## Decision Needed

1. Full replacement or gradual migration?
2. Distribution method (npm + pip, combined installer, etc.)?
3. Timeline and migration strategy?
