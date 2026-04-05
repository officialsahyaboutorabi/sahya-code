import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  createMemo,
  Show,
  Switch,
  Match,
} from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import type { AgentState } from "../stream/events"
import { ObservatoryBroadcaster } from "../stream/broadcaster"
import { TaskPanel } from "./task-panel"
import { ThoughtPanel } from "./thought-panel"
import { Timeline } from "./timeline"
import { Controls } from "./controls"
import { DashboardLayout } from "./layout"

export type DashboardView = "compact" | "full" | "minimal"

export interface ObservatoryDashboardProps {
  sessionID: string
  initialView?: DashboardView
  onStop?: () => void
  onPreview?: () => void
}

export function ObservatoryDashboard(props: ObservatoryDashboardProps) {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const [state, setState] = createSignal<AgentState | undefined>(undefined)
  const [isPaused, setIsPaused] = createSignal(false)
  const [view, setView] = createSignal<DashboardView>(props.initialView || "compact")
  const [error, setError] = createSignal<string | null>(null)

  let unsubscribe: (() => void) | null = null

  onMount(async () => {
    try {
      await ObservatoryBroadcaster.observe(props.sessionID)

      const stream = await ObservatoryBroadcaster.stream(props.sessionID)
      if (stream) {
        const sub = stream.subscribe({
          next: (newState) => {
            setState(newState)
          },
          error: (err) => {
            setError(String(err))
          },
        })
        unsubscribe = () => sub.unsubscribe()
      }

      const initialState = await ObservatoryBroadcaster.getState(props.sessionID)
      if (initialState) {
        setState(initialState)
      }
    } catch (err) {
      setError(String(err))
    }
  })

  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe()
    }
    ObservatoryBroadcaster.unobserve(props.sessionID)
  })

  const handlePause = () => {
    setIsPaused(true)
    ObservatoryBroadcaster.pause(props.sessionID)
  }

  const handleResume = () => {
    setIsPaused(false)
    ObservatoryBroadcaster.resume(props.sessionID)
  }

  const handleStep = () => {
    ObservatoryBroadcaster.step(props.sessionID)
  }

  const handleStop = () => {
    if (props.onStop) {
      props.onStop()
    }
  }

  const handlePreview = () => {
    if (props.onPreview) {
      props.onPreview()
    }
  }

  const handleCheckpoint = () => {
    // Trigger checkpoint creation via event
    // This will be handled by the checkpoint module
  }

  const isWide = createMemo(() => dimensions().width > 100)

  return (
    <Show
      when={!error()}
      fallback={
        <box padding={2}>
          <text style={{ fg: theme().error }}>Error: {error()}</text>
        </box>
      }
    >
      <Switch>
        <Match when={view() === "minimal"}>
          <DashboardLayout
            state={state}
            onPause={handlePause}
            onResume={handleResume}
            onStep={handleStep}
            onStop={handleStop}
            onPreview={handlePreview}
            isPaused={isPaused}
          />
        </Match>

        <Match when={view() === "compact"}>
          <box flexDirection="column" gap={1} padding={1}>
            <TaskPanel state={state} />
            <ThoughtPanel state={state} maxThoughts={3} />
            <Controls
              onPause={handlePause}
              onResume={handleResume}
              onStep={handleStep}
              onStop={handleStop}
              onPreview={handlePreview}
              onCheckpoint={handleCheckpoint}
              isPaused={isPaused}
            />
          </box>
        </Match>

        <Match when={view() === "full"}>
          <box flexDirection="row" gap={1} padding={1}>
            <box flexDirection="column" flexGrow={1} gap={1}>
              <TaskPanel state={state} />
              <ThoughtPanel state={state} maxThoughts={5} />
              <Controls
                onPause={handlePause}
                onResume={handleResume}
                onStep={handleStep}
                onStop={handleStop}
                onPreview={handlePreview}
                onCheckpoint={handleCheckpoint}
                isPaused={isPaused}
              />
            </box>
            <Show when={isWide()}>
              <box flexDirection="column" width={60}>
                <Timeline state={state} maxActions={30} />
              </box>
            </Show>
          </box>
        </Match>
      </Switch>
    </Show>
  )
}

export * from "./layout"
export * from "./task-panel"
export * from "./thought-panel"
export * from "./timeline"
export * from "./controls"
