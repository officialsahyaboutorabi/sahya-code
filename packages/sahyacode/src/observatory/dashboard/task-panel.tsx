import { createMemo, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import type { AgentState } from "../stream/events"

export interface TaskPanelProps {
  state: () => AgentState | undefined
}

export function TaskPanel(props: TaskPanelProps) {
  const { theme } = useTheme()

  const currentTask = createMemo(() => props.state()?.currentTask)
  const progress = createMemo(() => props.state()?.progress)
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

  const actionLabel = createMemo(() => {
    switch (action()) {
      case "thinking":
        return "Thinking"
      case "reading":
        return "Reading"
      case "writing":
        return "Writing"
      case "executing":
        return "Executing"
      case "planning":
        return "Planning"
      case "reviewing":
        return "Reviewing"
      case "idle":
        return "Idle"
      default:
        return action()
    }
  })

  const filledBlocks = createMemo(() => {
    const percent = progress()?.percent || 0
    return Math.floor(percent / 10)
  })

  const emptyBlocks = createMemo(() => 10 - filledBlocks())

  return (
    <box flexDirection="column" gap={1}>
      <text style={{ fg: theme().primary, bold: true }}>📋 Current Task</text>

      <box flexDirection="row" gap={1} paddingTop={1}>
        <text style={{ fg: theme().textMuted }}>Status:</text>
        <text>
          <span>{actionIcon()} </span>
          <span style={{ fg: theme().text }}>{actionLabel()}</span>
        </text>
      </box>

      <box flexDirection="row" gap={1}>
        <text style={{ fg: theme().textMuted }}>Task:</text>
        <Show when={currentTask()} fallback={<text style={{ fg: theme().textMuted }}>Waiting for input...</text>}>
          <text style={{ fg: theme().text }}>{currentTask()}</text>
        </Show>
      </box>

      <Show when={progress()}>
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={1}>
            <text style={{ fg: theme().textMuted }}>Progress:</text>
            <text>
              <span style={{ fg: theme().success }}>{"█".repeat(filledBlocks())}</span>
              <span style={{ fg: theme().textMuted }}>{"░".repeat(emptyBlocks())}</span>
            </text>
            <text style={{ fg: theme().text }}>{progress()?.percent}%</text>
          </box>
          <Show when={progress()?.step && progress()?.totalSteps}>
            <text style={{ fg: theme().textMuted, paddingLeft: 10 }}>
              Step {progress()?.step} of {progress()?.totalSteps}
            </text>
          </Show>
        </box>
      </Show>
    </box>
  )
}
