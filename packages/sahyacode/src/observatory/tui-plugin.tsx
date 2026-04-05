import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal, createEffect, onCleanup, Show, For } from "solid-js"
import { ObservatoryBroadcaster } from "./stream"
import { ObservatoryBrowser } from "./browser"
import { ObservatoryCheckpoint } from "./checkpoint"
import type { AgentState, ActionEntry } from "./stream/events"

const id = "internal:observatory"

function MiniObservatoryView(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [state, setState] = createSignal<AgentState | undefined>(undefined)
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [sessionID, setSessionID] = createSignal<string | null>(null)

  createEffect(() => {
    const sessions = props.api.state.session
    const activeSession = sessions.find((s) => !s.time.completed)
    if (activeSession) {
      setSessionID(activeSession.id)
    }
  })

  createEffect(() => {
    const sid = sessionID()
    if (!sid) return

    let unsubscribe: (() => void) | null = null

    const setup = async () => {
      await ObservatoryBroadcaster.observe(sid)

      const stream = await ObservatoryBroadcaster.stream(sid)
      if (stream) {
        const sub = stream.subscribe({
          next: (newState) => setState(newState),
        })
        unsubscribe = () => sub.unsubscribe()
      }
    }

    setup()

    onCleanup(() => {
      if (unsubscribe) {
        unsubscribe()
      }
      ObservatoryBroadcaster.unobserve(sid)
    })
  })

  const currentTask = () => state()?.currentTask
  const progress = () => state()?.progress
  const action = () => state()?.action || "idle"

  const actionIcon = () => {
    const icons: Record<string, string> = {
      thinking: "💭",
      reading: "📖",
      writing: "✏️",
      executing: "⚡",
      planning: "📋",
      reviewing: "👀",
      idle: "⏳",
    }
    return icons[action()] || "•"
  }

  const recentActions = () => (state()?.actions || []).slice(0, 3)

  return (
    <Show when={sessionID()}>
      <box
        flexDirection="column"
        gap={1}
        backgroundColor={theme().backgroundElement}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
      >
        <box flexDirection="row" justifyContent="space-between" onMouseDown={() => setIsExpanded(!isExpanded())}>
          <text>
            <span>🤖 </span>
            <span fg={theme().text}>Agent Observatory</span>
          </text>
          <text fg={theme().textMuted}>{isExpanded() ? "▼" : "▶"}</text>
        </box>

        <Show when={!isExpanded()}>
          <box flexDirection="row" gap={1}>
            <text fg={theme().textMuted}>Status:</text>
            <text>
              {actionIcon()} {currentTask() || "Waiting..."}
            </text>
            <Show when={progress()}>
              <text fg={theme().success}>{progress()?.percent}%</text>
            </Show>
          </box>
        </Show>

        <Show when={isExpanded()}>
          <box flexDirection="column" gap={1}>
            <box flexDirection="row" gap={1}>
              <text fg={theme().textMuted}>Current:</text>
              <text fg={theme().text}>{currentTask() || "Waiting..."}</text>
            </box>

            <Show when={progress()}>
              <box flexDirection="row" gap={1}>
                <text fg={theme().textMuted}>Progress:</text>
                <text>
                  <span fg={theme().success}>{"█".repeat(Math.floor((progress()?.percent || 0) / 10))}</span>
                  <span fg={theme().textMuted}>{"░".repeat(10 - Math.floor((progress()?.percent || 0) / 10))}</span>
                </text>
                <text fg={theme().text}>{progress()?.percent}%</text>
              </box>
            </Show>

            <box flexDirection="column" gap={1}>
              <text fg={theme().textMuted}>Recent Actions:</text>
              <For each={recentActions()}>
                {(action) => {
                  const statusIcon = action.status === "running" ? "→" : action.status === "completed" ? "✓" : "✗"
                  return (
                    <box flexDirection="row" gap={1} paddingLeft={1}>
                      <text>{statusIcon}</text>
                      <text fg={theme().text}>{action.title}</text>
                    </box>
                  )
                }}
              </For>
            </box>

            <box flexDirection="row" gap={2} paddingTop={1}>
              <text fg={theme().warning} onMouseDown={() => ObservatoryBroadcaster.pause(sessionID()!)}>
                [⏸ Pause]
              </text>
              <text fg={theme().info} onMouseDown={() => ObservatoryBroadcaster.step(sessionID()!)}>
                [⏭ Step]
              </text>
              <text
                fg={theme().secondary}
                onMouseDown={() =>
                  ObservatoryCheckpoint.create(sessionID()!, "Checkpoint from TUI")
                }
              >
                [💾 Save]
              </text>
            </box>
          </box>
        </Show>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  // Register a sidebar slot for the mini observatory view
  api.slots.register({
    order: 50,
    slots: {
      sidebar_content() {
        return <MiniObservatoryView api={api} />
      },
    },
  })

  // Register a command to open the full observatory
  api.commands.register({
    name: "observatory",
    description: "Open the full observatory dashboard",
    handler: () => {
      api.route.navigate({
        type: "observatory",
        sessionID: api.state.session.find((s) => !s.time.completed)?.id,
      })
    },
  })

  // Subscribe to session events
  api.events.subscribe("session.updated", (event) => {
    const sessionID = event.sessionID

    // Auto-observe new sessions
    if (event.changes.status === "running") {
      ObservatoryBroadcaster.observe(sessionID)
    }
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
