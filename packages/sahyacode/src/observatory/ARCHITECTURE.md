# Observatory Architecture

## Overview

The Observatory is a live browser preview system that allows users to watch the LLM build projects in real-time. It consists of a local HTTP server that serves files and provides Server-Sent Events (SSE) for live reloading.

## Components

### 1. Core Module (`index.ts`)

**Purpose**: Central state management for the Observatory system.

**Key State**:
```typescript
interface State {
  currentTask?: string        // Current AI task description
  progress: number            // Progress percentage (0-100)
  status: "idle" | "running" | "paused" | "completed" | "error"
  thoughts: string[]          // Recent activity log (max 20 items)
  recentFiles: string[]       // Recently modified files (max 10)
  recording: RecordingEvent[] // Full replay history
  projectDir?: string         // Dynamic project directory path
}
```

**Key Functions**:
- `enable()` / `disable()` - Start/stop monitoring
- `updateTask(task)` - Set current AI task
- `addThought(thought)` - Log activity
- `notifyFileChanged(file)` - Broadcast file change to all listeners
- `updateProjectDir(dir)` - Update dynamic project directory
- `onFileChanged(listener)` - Subscribe to file change events

### 2. HTTP Server (`server.ts`)

**Purpose**: Serves the preview and provides SSE for live reload.

**Server-Sent Events (SSE)**:
- Endpoint: `GET /~observatory/events`
- Heartbeat: Ping every 15 seconds to prevent timeout
- Events: `{ type: "reload", file: string }`
- Reconnection: Client auto-reconnects with exponential backoff

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves `index.html` or status page if not exists |
| `/~observatory/events` | GET | SSE stream for live reload |
| `/~observatory/status` | GET | JSON state (task, files, projectDir) |
| `/~observatory/replay` | GET | Replay animation page |
| `/~observatory/recording` | GET | Raw recording JSON |
| `/~observatory/move-to` | POST | Copy files back to project directory |

**Live Reload Script**:
Injected into all HTML pages. Features:
- Auto-reconnect on connection loss
- Exponential backoff (1s → 30s max)
- Max 10 reconnection attempts
- Navigates to `/` when `index.html` appears

### 3. Hooks (`hooks.ts`)

**Purpose**: Capture LLM activity and mirror files to live-view.

**File Mirroring**:
- Source: Original project files
- Destination: `~/.local/share/sahyacode/live-view/`
- Preserves relative paths
- Async operation (non-blocking)

**Recording**:
- Saved to: `~/.local/share/sahyacode/live-view/.sahya-replay.json`
- Format: `{ timestamp, relPath, content, action }`
- Updated on every file write/edit

**Hook Functions**:
- `captureFileWrite(file, content, projectDir, action)` - Main file write capture
- `captureFileRead(file)` - File read logging
- `captureThought(thought)` - AI thought logging
- `captureAction(action, details)` - Action logging
- `captureToolCall(tool, input)` - Tool usage logging
- `captureMessage(role, content)` - Message logging

## Data Flow

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│   LLM writes    │────▶│  Tool Hook  │────▶│  Observatory     │
│   file via tool │     │ (hooks.ts)  │     │  State (index.ts)│
└─────────────────┘     └─────────────┘     └──────────────────┘
                                                    │
                       ┌────────────────────────────┼────────────────────────────┐
                       │                            │                            │
                       ▼                            ▼                            ▼
              ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
              │  Mirror to      │        │  Broadcast SSE  │        │  Save recording │
              │  live-view/     │        │  (server.ts)    │        │  (.sahya-replay)│
              └─────────────────┘        └─────────────────┘        └─────────────────┘
                       │                            │
                       │                            ▼
                       │                   ┌─────────────────┐
                       │                   │  Browser        │
                       │                   │  auto-reload    │
                       │                   └─────────────────┘
                       ▼
              ┌─────────────────┐
              │  Serve static   │
              │  files (server) │
              └─────────────────┘
```

## Project Directory Handling

**Problem**: The initial workDir passed to `start()` may become stale if the user switches projects.

**Solution**: Dynamic project directory tracking

1. `captureFileWrite()` receives `projectDir` from `Instance.directory`
2. Calls `Observatory.updateProjectDir(effectiveProjectDir)`
3. State is updated with current project directory
4. Status endpoint returns `projectDir` in response
5. Status page updates display dynamically

## Connection Stability

**Problem**: Firefox times out idle SSE connections (`NS_BINDING_ABORTED`).

**Solution**: Multi-layer approach

1. **Server Heartbeat**:
   - Ping every 15 seconds (`: ping\n\n`)
   - Keeps connection alive through proxies

2. **Connection Headers**:
   - `X-Accel-Buffering: no` - Prevents nginx buffering
   - `Cache-Control: no-cache` - Prevents caching

3. **Cleanup Handlers**:
   - `req.on("close", cleanup)`
   - `req.on("error", cleanup)`
   - `res.on("close", cleanup)`
   - `res.on("error", cleanup)`
   - `req.on("aborted", cleanup)`

4. **Client Reconnection**:
   - Exponential backoff: 1s → 1.5s → 2.25s → ... (max 30s)
   - Max 10 attempts before giving up
   - `es.onerror` triggers reconnection

## File Structure

```
~/.local/share/sahyacode/
├── live-view/              # Staging directory
│   ├── index.html          # Auto-served when present
│   ├── style.css
│   ├── main.js
│   └── .sahya-replay.json  # Recording data
└── ...
```

## Usage Flow

1. User runs `/observe` command
2. `ObservatoryServer.start(workDir)` called
3. Browser opens to `http://localhost:3456`
4. Status page shows (waiting for files)
5. LLM writes files via tools
6. Hooks capture writes and:
   - Update Observatory state
   - Mirror files to live-view/
   - Broadcast SSE reload event
   - Append to recording
7. Browser auto-reloads on each file change
8. When `index.html` appears, auto-navigates to `/`
9. User clicks "Move to Original Location" to copy files back

## Security Considerations

- Server only binds to `127.0.0.1` (localhost)
- `Access-Control-Allow-Origin: *` for local development
- No authentication required (local only)
- Files are copied (not moved) to prevent data loss

## Future Improvements

- [ ] WebSocket alternative for bidirectional communication
- [ ] Multi-session support (observe different sessions)
- [ ] File diff viewer in status page
- [ ] Terminal output streaming
- [ ] Collaborative mode (multiple viewers)
