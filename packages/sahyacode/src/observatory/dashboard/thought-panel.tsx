import { createMemo, For } from "solid-js"
import { useTheme } from "@tui/context/theme"
import type { AgentState, ThoughtEntry } from "../stream/events"

export interface ThoughtPanelProps {
  state: () => AgentState | undefined
  maxThoughts?: number
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

function ThoughtItem(props: { thought: ThoughtEntry; index: number }) {
  const { theme } = useTheme()
  const opacity = 1 - props.index * 0.15

  return (
    <box flexDirection="column" paddingLeft={1}>
      <box flexDirection="row" gap={1}>
        <text style={{ fg: theme().textMuted }}>💭</text>
        <text style={{ fg: theme().textMuted }}>{formatTime(props.thought.timestamp)}</text>
      </box>
      <text style={{ fg: theme().text, opacity }}>{props.thought.text}</text>
    </box>
  )
}

export function ThoughtPanel(props: ThoughtPanelProps) {
  const { theme } = useTheme()
  const maxThoughts = () => props.maxThoughts ?? 5

  const thoughts = createMemo(() => {
    const all = props.state()?.thoughts || []
    return all.slice(0, maxThoughts())
  })

  const hasThoughts = createMemo(() => thoughts().length > 0)

  return (
    <box flexDirection="column" gap={1}>
      <text style={{ fg: theme().primary, bold: true }}>🧠 Thought Process</text>

      <box flexDirection="column" gap={1} paddingTop={1}>
        <For
          each={thoughts()}
          fallback={
            <text style={{ fg: theme().textMuted, paddingLeft: 2 }}>No thoughts recorded yet...</text>
          }
        >
          {(thought, index) => <ThoughtItem thought={thought} index={index()} />}
        </For>
      </box>
    </box>
  )
}
