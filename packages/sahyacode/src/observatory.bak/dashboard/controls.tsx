import { Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useKeyboard } from "@opentui/solid"
import { onMount } from "solid-js"

export interface ControlsProps {
  onPause: () => void
  onResume: () => void
  onStep: () => void
  onStop: () => void
  onPreview: () => void
  onCheckpoint: () => void
  isPaused: () => boolean
}

export function Controls(props: ControlsProps) {
  const { theme } = useTheme()
  const keyboard = useKeyboard()

  onMount(() => {
    const unsubscribe = keyboard.subscribe((key) => {
      if (key.key === "p" && key.ctrl) {
        props.isPaused() ? props.onResume() : props.onPause()
      } else if (key.key === "s" && key.ctrl) {
        props.onStep()
      } else if (key.key === "x" && key.ctrl) {
        props.onStop()
      } else if (key.key === "v" && key.ctrl) {
        props.onPreview()
      } else if (key.key === "c" && key.ctrl) {
        props.onCheckpoint()
      }
    })

    return () => unsubscribe()
  })

  return (
    <box flexDirection="column" gap={1}>
      <text style={{ fg: theme().primary, bold: true }}>🎮 Controls</text>

      <box flexDirection="row" gap={2} paddingTop={1}>
        <Show
          when={props.isPaused()}
          fallback={
            <box
              backgroundColor={theme().warning}
              paddingLeft={1}
              paddingRight={1}
              paddingTop={0}
              paddingBottom={0}
              onMouseDown={props.onPause}
            >
              <text style={{ fg: theme().background }}>⏸ Pause (Ctrl+P)</text>
            </box>
          }
        >
          <box
            backgroundColor={theme().success}
            paddingLeft={1}
            paddingRight={1}
            paddingTop={0}
            paddingBottom={0}
            onMouseDown={props.onResume}
          >
            <text style={{ fg: theme().background }}>▶ Resume (Ctrl+P)</text>
          </box>
        </Show>

        <box
          backgroundColor={theme().info}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
          onMouseDown={props.onStep}
        >
          <text style={{ fg: theme().background }}>⏭ Step (Ctrl+S)</text>
        </box>

        <box
          backgroundColor={theme().error}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
          onMouseDown={props.onStop}
        >
          <text style={{ fg: theme().background }}>⏹ Stop (Ctrl+X)</text>
        </box>
      </box>

      <box flexDirection="row" gap={2}>
        <box
          backgroundColor={theme().primary}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
          onMouseDown={props.onPreview}
        >
          <text style={{ fg: theme().background }}>🌐 Preview (Ctrl+V)</text>
        </box>

        <box
          backgroundColor={theme().secondary}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={0}
          paddingBottom={0}
          onMouseDown={props.onCheckpoint}
        >
          <text style={{ fg: theme().background }}>💾 Checkpoint (Ctrl+C)</text>
        </box>
      </box>

      <box paddingTop={1}>
        <text style={{ fg: theme().textMuted }}>Press Ctrl+C to create a checkpoint</text>
      </box>
    </box>
  )
}
