import { createSignal, createEffect, onMount, onCleanup, Show, createMemo } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions, useKeyboard } from "@opentui/solid"
import { ObservatoryBroadcaster, type AgentState } from "@/observatory/stream"
import { ObservatoryBrowser } from "@/observatory/browser"
import { ObservatoryCheckpoint } from "@/observatory/checkpoint"
import { Log } from "@/util/log"

const log = Log.create({ service: "observatory.route" })

export function ObservatoryRoute() {
  const route = useRouteData("observatory")
  const sync = useSync()
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const keyboard = useKeyboard()

  const [state, setState] = createSignal<AgentState | undefined>(undefined)
  const [isPaused, setIsPaused] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [browserUrl, setBrowserUrl] = createSignal<string | null>(null)

  let unsubscribe: (() => void) | null = null
  let browser: ObservatoryBrowser.BrowserInstance | undefined

  const session = createMemo(() => sync.session.get(route.sessionID))

  onMount(async () => {
    try {
      // Start observing
      await ObservatoryBroadcaster.observe(route.sessionID)

      // Subscribe to state updates
      const stream = await ObservatoryBroadcaster.stream(route.sessionID)
      if (stream) {
        const sub = stream.subscribe({
          next: (newState) => setState(newState),
          error: (err) => setError(String(err)),
        })
        unsubscribe = () => sub.unsubscribe()
      }

      // Get initial state
      const initialState = await ObservatoryBroadcaster.getState(route.sessionID)
      if (initialState) {
        setState(initialState)
      }

      // Start browser preview if directory exists
      const dir = session()?.directory
      if (dir) {
        try {
          browser = await ObservatoryBrowser.start({
            rootDir: dir,
            liveReload: true,
          })
          setBrowserUrl(browser.url)
        } catch (err) {
          log.error("browser preview failed", { err })
        }
      }
    } catch (err) {
      setError(String(err))
    }

    // Keyboard shortcuts
    const unsubKeyboard = keyboard.subscribe((key) => {
      if (key.key === "p" && key.ctrl) {
        isPaused() ? handleResume() : handlePause()
      } else if (key.key === "s" && key.ctrl) {
        handleStep()
      } else if (key.key === "c" && key.ctrl && key.shift) {
        handleCheckpoint()
      }
    })

    return () => {
      unsubKeyboard()
    }
  })

  onCleanup(async () => {
    if (unsubscribe) {
      unsubscribe()
    }
    if (browser) {
      await browser.stop()
    }
    await ObservatoryBroadcaster.unobserve(route.sessionID)
  })

  const handlePause = async () => {
    setIsPaused(true)
    await ObservatoryBroadcaster.pause(route.sessionID)
  }

  const handleResume = async () => {
    setIsPaused(false)
    await ObservatoryBroadcaster.resume(route.sessionID)
  }

  const handleStep = async () => {
    await ObservatoryBroadcaster.step(route.sessionID)
  }

  const handleCheckpoint = async () => {
    try {
      const checkpoint = await ObservatoryCheckpoint.create(
        route.sessionID,
        "Manual checkpoint from Observatory",
      )
      // Show toast notification
    } catch (err) {
      setError(String(err))
    }
  }

  const currentTask = createMemo(() => state()?.currentTask)
  const progress = createMemo(() => state()?.progress)
  const thoughts = createMemo(() => state()?.thoughts?.slice(0, 3) || [])
  const actions = createMemo(() => (state()?.actions || []).slice(0, 8))
  const action = createMemo(() => state()?.action || "idle")

  const actionIcon = createMemo(() => {
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
  })

  const filledBlocks = createMemo(() => {
    const percent = progress()?.percent || 0
    return Math.floor(percent / 10)
  })

  const emptyBlocks = createMemo(() => 10 - filledBlocks())

  return (
    <Show
      when={!error()}
      fallback={
        <box padding={2}>
          <text fg={theme().error}>Error: {error()}</text>
        </box>
      }
    >
      <box flexDirection="column" padding={1} gap={1}>
        {/* Header */}
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme().primary} bold>
            🤖 Agent Observatory
          </text>
          <text fg={isPaused() ? theme().warning : theme().success}>
            {isPaused() ? "⏸ PAUSED" : "● LIVE"}
          </text>
        </box>

        {/* Session Info */}
        <text fg={theme().textMuted}>
          Session: {session()?.title || route.sessionID}
        </text>

        {/* Current Task */}
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={theme().textMuted}>Status: </span>
            <span>{actionIcon()} </span>
            <Show when={currentTask()} fallback={<span fg={theme().textMuted}>Waiting...</span>}>
              <span fg={theme().text}>{currentTask()}</span>
            </Show>
          </text>

          <Show when={progress()}>
            <box flexDirection="row" gap={1}>
              <text fg={theme().textMuted}>Progress:</text>
              <text>
                <span fg={theme().success}>{"█".repeat(filledBlocks())}</span>
                <span fg={theme().textMuted}>{"░".repeat(emptyBlocks())}</span>
              </text>
              <text fg={theme().text}>{progress()?.percent}%</text>
            </box>
          </Show>
        </box>

        {/* Recent Thoughts */}
        <Show when={thoughts().length > 0}>
          <box flexDirection="column" gap={1}>
            <text fg={theme().primary} bold>
              💭 Recent Thoughts
            </text>
            <box flexDirection="column" paddingLeft={2}>
              {thoughts().map((thought) => (
                <text fg={theme().text}>• {thought.text.slice(0, dimensions().width - 10)}</text>
              ))}
            </box>
          </box>
        </Show>

        {/* Recent Actions */}
        <box flexDirection="column" gap={1}>
          <text fg={theme().primary} bold>
            📋 Recent Actions
          </text>
          <box flexDirection="column" paddingLeft={1}>
            {actions().map((action) => {
              const statusIcon = action.status === "running" ? "→" : action.status === "completed" ? "✓" : "✗"
              const statusColor =
                action.status === "running"
                  ? theme().info
                  : action.status === "completed"
                    ? theme().success
                    : theme().error

              return (
                <box flexDirection="row" gap={1}>
                  <text fg={statusColor}>{statusIcon}</text>
                  <text fg={theme().text}>{action.title}</text>
                </box>
              )
            })}
          </box>
        </box>

        {/* Controls */}
        <box flexDirection="row" gap={2}>
          <Show
            when={isPaused()}
            fallback={
              <text fg={theme().warning} onMouseDown={handlePause}>
                [⏸ Pause]
              </text>
            }
          >
            <text fg={theme().success} onMouseDown={handleResume}>
              [▶ Resume]
            </text>
          </Show>
          <text fg={theme().info} onMouseDown={handleStep}>
            [⏭ Step]
          </text>
          <text fg={theme().secondary} onMouseDown={handleCheckpoint}>
            [💾 Checkpoint]
          </text>
          <Show when={browserUrl()}>
            <text fg={theme().primary}>{browserUrl()}</text>
          </Show>
        </box>

        {/* Help */}
        <text fg={theme().textMuted}>
          Ctrl+P: Pause/Resume | Ctrl+S: Step | Ctrl+Shift+C: Checkpoint | q: Quit
        </text>
      </box>
    </Show>
  )
}

