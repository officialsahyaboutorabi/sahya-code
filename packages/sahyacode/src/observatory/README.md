# Live Agent Observatory

A real-time dashboard for observing AI agent activity in SahyaCode.

## Overview

The Observatory module provides comprehensive visibility into what the AI agent is doing, thinking, and planning. It captures and displays:

- Current task with progress tracking
- Thought process and reasoning
- File operations (read/write)
- Tool executions
- LLM requests and responses
- Timeline of recent actions

## Usage

### Command Line

```bash
# Observe the current session
sahyacode observatory

# Observe a specific session
sahyacode observatory <session-id>

# Start with browser preview
sahyacode observatory --preview --port 3456

# Open browser automatically
sahyacode observatory --preview --open

# Different view modes
sahyacode observatory --view compact  # Default
sahyacode observatory --view full
sahyacode observatory --view minimal
```

### TUI Integration

The Observatory is integrated into the TUI system. Press the assigned keybind to open the observatory view, or use the command palette (`/observatory`).

### Programmatic API

```typescript
import { ObservatoryBroadcaster, ObservatoryEvent } from "@/observatory"

// Start observing a session
await ObservatoryBroadcaster.observe(sessionID)

// Get current state
const state = await ObservatoryBroadcaster.getState(sessionID)

// Subscribe to updates
const stream = await ObservatoryBroadcaster.stream(sessionID)
const subscription = stream.subscribe({
  next: (state) => console.log(state),
})

// Pause/Resume
await ObservatoryBroadcaster.pause(sessionID)
await ObservatoryBroadcaster.resume(sessionID)

// Step through execution
await ObservatoryBroadcaster.step(sessionID)
```

## Architecture

### Event Collection

Events are captured via the bus system and processed by the `ObservatoryBroadcaster`:

- **Tool Execution**: Start/complete events
- **File Operations**: Read/write events
- **LLM Requests**: Request/response events
- **Thoughts**: Reasoning blocks
- **Progress**: Task progress updates

### Dashboard UI

The dashboard is built with SolidJS and @opentui/solid:

- **Layout**: Main dashboard container with responsive layout
- **TaskPanel**: Current task and progress display
- **ThoughtPanel**: Recent thoughts display
- **Timeline**: Action history with timestamps
- **Controls**: Pause, resume, step, checkpoint buttons

### Browser Preview

A lightweight HTTP server with live reload:

- **PreviewServer**: Serves files from the project directory
- **FileSync**: WebSocket-based file change notifications
- Live reload injection for HTML files

### Checkpoints

Save and restore session state:

```typescript
import { ObservatoryCheckpoint } from "@/observatory"

// Create checkpoint
const checkpoint = await ObservatoryCheckpoint.create(
  sessionID,
  "Before refactoring"
)

// List checkpoints
const checkpoints = await ObservatoryCheckpoint.list(sessionID)

// Restore checkpoint
await ObservatoryCheckpoint.restore(checkpointID)
```

## Events

### ObservatoryEvent Types

| Event | Description |
|-------|-------------|
| `ToolExecutionStart` | Tool execution began |
| `ToolExecutionComplete` | Tool execution finished |
| `FileRead` | File was read |
| `FileWrite` | File was written |
| `LLMRequest` | LLM request sent |
| `LLMResponse` | LLM response received |
| `Thought` | Agent thought/reasoning |
| `Progress` | Progress update |
| `AgentAction` | Agent action state change |
| `CheckpointCreated` | Checkpoint was created |
| `SessionState` | Session state change |

## Dashboard Views

### Compact (Default)
- Current task and progress
- Last 3 thoughts
- Recent actions
- Controls

### Full
- Side-by-side layout
- Full timeline (30 items)
- All 5 recent thoughts
- Session metadata

### Minimal
- Single line status
- Progress bar
- Current action only

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+P | Pause/Resume |
| Ctrl+S | Step |
| Ctrl+Shift+C | Create Checkpoint |
| Ctrl+V | Open Browser Preview |
| Ctrl+X | Stop |
| q | Quit |

## Integration Points

### Session Processor
The observatory hooks into the session processor to capture events:

```typescript
// In session processor
yield* ObservatoryHooks.emitToolStart({
  sessionID,
  messageID,
  toolCallID,
  toolName,
  input,
})
```

### TUI Plugin
The TUI plugin adds a mini observatory view to the sidebar:

```typescript
import ObservatoryPlugin from "@/observatory/tui-plugin"

// Register the plugin
plugins.register(ObservatoryPlugin)
```

## File Structure

```
observatory/
├── index.ts              # Main exports
├── stream/
│   ├── index.ts          # Event streaming exports
│   ├── events.ts         # Event type definitions
│   ├── broadcaster.ts    # Event collection & broadcast
│   └── observable.ts     # Observable/Subject implementation
├── dashboard/
│   ├── index.tsx         # Main dashboard component
│   ├── layout.tsx        # Main layout
│   ├── task-panel.tsx    # Current task display
│   ├── thought-panel.tsx # Thought/reasoning display
│   ├── timeline.tsx      # Action timeline
│   └── controls.tsx      # Pause/resume/step buttons
├── browser/
│   ├── index.ts          # Live preview exports
│   ├── server.ts         # HTTP server for preview
│   └── sync.ts           # File change sync
├── checkpoint/
│   ├── index.ts          # Checkpoint exports
│   └── snapshot.ts       # Checkpoint creation
├── hooks.ts              # Integration hooks
├── integration.ts        # Module integration
└── tui-plugin.tsx        # TUI plugin
```
