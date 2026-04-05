import { createMemo, For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import type { AgentState, ActionEntry } from "../stream/events"

export interface TimelineProps {
  state: () => AgentState | undefined
  maxActions?: number
}

function formatDuration(ms?: number): string {
  if (!ms) return ""
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function ActionStatusIcon(props: { status: ActionEntry["status"] }) {
  const { theme } = useTheme()

  const config = createMemo(() => {
    switch (props.status) {
      case "running":
        return { icon: "→", color: theme().info }
      case "completed":
        return { icon: "✓", color: theme().success }
      case "error":
        return { icon: "✗", color: theme().error }
      case "pending":
        return { icon: "⏳", color: theme().warning }
      default:
        return { icon: "•", color: theme().textMuted }
    }
  })

  return <text style={{ fg: config().color }}>{config().icon}</text>
}

function ActionTypeIcon(props: { type: ActionEntry["type"] }) {
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

  return <text>{icon()}</text>
}

function TimelineItem(props: { action: ActionEntry }) {
  const { theme } = useTheme()

  return (
    <box flexDirection="row" gap={1} paddingLeft={1}>
      <box width={8}>
        <text style={{ fg: theme().textMuted }}>{formatTime(props.action.timestamp)}</text>
      </box>
      <ActionStatusIcon status={props.action.status} />
      <text> </text>
      <ActionTypeIcon type={props.action.type} />
      <text> </text>
      <box flexDirection="column" flexGrow={1}>
        <text style={{ fg: theme().text }}>{props.action.title}</text>
        <Show when={props.action.description}>
          <text style={{ fg: theme().textMuted }}>{props.action.description}</text>
        </Show>
      </box>
      <Show when={props.action.duration}>
        <text style={{ fg: theme().textMuted }}>{formatDuration(props.action.duration)}</text>
      </Show>
    </box>
  )
}

export function Timeline(props: TimelineProps) {
  const { theme } = useTheme()
  const maxActions = () => props.maxActions ?? 20

  const actions = createMemo(() => {
    const all = props.state()?.actions || []
    return all.slice(0, maxActions())
  })

  return (
    <box flexDirection="column" gap={1}>
      <text style={{ fg: theme().primary, bold: true }}>⏱️ Action Timeline</text>

      <box flexDirection="column" gap={1} paddingTop={1}>
        <For
          each={actions()}
          fallback={
            <text style={{ fg: theme().textMuted, paddingLeft: 2 }}>No actions recorded yet...</text>
          }
        >
          {(action) => <TimelineItem action={action} />}
        </For>
      </box>
    </box>
  )
}
