import { createSignal, createMemo, createEffect, onMount, Show, For } from "solid-js"
import { useTheme } from "@tui/context/theme"
import type { AgentState, ThoughtEntry, ActionEntry } from "../stream/events"

export interface LayoutProps {
  state: () => AgentState | undefined
  onPause: () => void
  onResume: () => void
  onStep: () => void
  onStop: () => void
  onPreview: () => void
  isPaused: () => boolean
}

function ProgressBar(props: { percent: number; width: number }) {
  const { theme } = useTheme()
  const filled = createMemo(() => Math.floor((props.percent / 100) * props.width))
  const empty = createMemo(() => props.width - filled())

  return (
    <text>
      <span style={{ fg: theme().success }}>{"█".repeat(filled())}</span>
      <span style={{ fg: theme().textMuted }}>{"░".repeat(empty())}</span>
    </text>
  )
}

function ActionIcon(props: { type: ActionEntry["type"]; status: ActionEntry["status"] }) {
  const { theme } = useTheme()

  const icon = createMemo(() => {
    switch (props.type) {
      case "tool":
        return "🔧"
      case "file":
        return "📄"
      case "llm":
        return "🤖"
      case "thought":
        return "💭"
      case "checkpoint":
        return "💾"
      default:
        return "•"
    }
  })

  const statusIcon = createMemo(() => {
    switch (props.status) {
      case "running":
        return "→"
      case "completed":
        return "✓"
      case "error":
        return "✗"
      case "pending":
        return "⏳"
      default:
        return "•"
    }
  })

  const color = createMemo(() => {
    switch (props.status) {
      case "running":
        return theme().info
      case "completed":
        return theme().success
      case "error":
        return theme().error
      case "pending":
        return theme().warning
      default:
        return theme().textMuted
    }
  })

  return (
    <text>
      <span style={{ fg: color() }}>{statusIcon()}</span>
      <span> </span>
      <span>{icon()}</span>
    </text>
  )
}

export function DashboardLayout(props: LayoutProps) {
  const { theme } = useTheme()
  const [width, setWidth] = createSignal(80)

  onMount(() => {
    setWidth(process.stdout.columns || 80)
  })

  const currentTask = createMemo(() => props.state()?.currentTask)
  const progress = createMemo(() => props.state()?.progress)
  const thoughts = createMemo(() => props.state()?.thoughts || [])
  const actions = createMemo(() => (props.state()?.actions || []).slice(0, 10))
  const action = createMemo(() => props.state()?.action || "idle")

  const actionIcon = createMemo(() => {
    switch (action()) {
      case "thinking":
        return "💭"
      case "reading":
        return "📖"
      case "writing":
        return "✏️"
      case "executing":
        return "⚡"
      case "planning":
        return "📋"
      case "reviewing":
        return "👀"
      case "idle":
        return "⏳"
      default:
        return "•"
    }
  })

  const borderStyle = () => ({
    fg: theme().border,
  })

  const headerStyle = () => ({
    fg: theme().primary,
    bold: true,
  })

  return (
    <box flexDirection="column" gap={1} padding={1}>
      {/* Header */}
      <box flexDirection="row" justifyContent="space-between">
        <text style={headerStyle()}>🤖 Agent Observatory</text>
        <text fg={theme().textMuted}>
          <Show when={props.isPaused()}>⏸ PAUSED</Show>
          <Show when={!props.isPaused()}>● LIVE</Show>
        </text>
      </box>

      <text style={borderStyle()}>{"─".repeat(width() - 2)}</text>

      {/* Current Task */}
      <box flexDirection="column" gap={1}>
        <text>
          <span style={{ fg: theme().textMuted }}>Current: </span>
          <span fg={theme().text}>{actionIcon()} </span>
          <Show when={currentTask()} fallback={<span fg={theme().textMuted}>Waiting...</span>}>
            <span fg={theme().text}>{currentTask()}</span>
          </Show>
        </text>

        <Show when={progress()}>
          <box flexDirection="row" gap={1}>
            <text style={{ fg: theme().textMuted }}>Progress:</text>
            <ProgressBar percent={progress()?.percent || 0} width={Math.min(40, width() - 25)} />
            <text style={{ fg: theme().text }}>{progress()?.percent}%</text>
            <Show when={progress()?.step && progress()?.totalSteps}>
              <text style={{ fg: theme().textMuted }}>
                ({progress()?.step}/{progress()?.totalSteps})
              </text>
            </Show>
          </box>
        </Show>
      </box>

      {/* Thoughts Panel */}
      <Show when={thoughts().length > 0}>
        <text style={borderStyle()}>{"─".repeat(width() - 2)}</text>
        <box flexDirection="column" gap={1}>
          <text style={{ fg: theme().primary, bold: true }}>💭 Recent Thoughts</text>
          <For each={thoughts()}>
            {(thought) => (
              <box paddingLeft={2}>
                <text style={{ fg: theme().textMuted }}>• </text>
                <text style={{ fg: theme().text }}>{thought.text.slice(0, width() - 8)}</text>
              </box>
            )}
          </For>
        </box>
      </Show>

      {/* Actions Timeline */}
      <text style={borderStyle()}>{"─".repeat(width() - 2)}</text>
      <box flexDirection="column" gap={1}>
        <text style={{ fg: theme().primary, bold: true }}>📋 Recent Actions</text>
        <For each={actions()}>
          {(action) => (
            <box flexDirection="row" gap={1} paddingLeft={1}>
              <ActionIcon type={action.type} status={action.status} />
              <text>
                <span style={{ fg: theme().text }}>{action.title}</span>
                <Show when={action.description}>
                  <span style={{ fg: theme().textMuted }}>
                    {" "}
                    {action.description!.slice(0, width() - action.title.length - 15)}
                  </span>
                </Show>
              </text>
            </box>
          )}
        </For>
        <Show when={actions().length === 0}>
          <text style={{ fg: theme().textMuted, paddingLeft: 2 }}>No actions yet...</text>
        </Show>
      </box>

      {/* Controls */}
      <text style={borderStyle()}>{"─".repeat(width() - 2)}</text>
      <box flexDirection="row" gap={2}>
        <text>
          <Show
            when={props.isPaused()}
            fallback={
              <span style={{ fg: theme().warning }} onMouseDown={props.onPause}>
                [⏸ Pause]
              </span>
            }
          >
            <span style={{ fg: theme().success }} onMouseDown={props.onResume}>
              [▶ Resume]
            </span>
          </Show>
        </text>
        <text style={{ fg: theme().info }} onMouseDown={props.onStep}>
          [⏭ Step]
        </text>
        <text style={{ fg: theme().error }} onMouseDown={props.onStop}>
          [⏹ Stop]
        </text>
        <text style={{ fg: theme().primary }} onMouseDown={props.onPreview}>
          [🌐 Preview]
        </text>
      </box>
    </box>
  )
}
