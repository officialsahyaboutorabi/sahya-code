import { createSignal, onMount, onCleanup, Show } from "solid-js"
import { useRoute, useRouteData } from "@tui/context/route"
import { useTheme } from "@tui/context/theme"
import { useKeyboard } from "@opentui/solid"
import { Observatory } from "@/observatory"
import { Log } from "@/util/log"

const log = Log.create({ service: "observatory.route" })

export function ObservatoryRoute() {
  const route = useRouteData("observatory")
  const { theme } = useTheme()
  const keyboard = useKeyboard()
  
  const [state, setState] = createSignal(Observatory.getState())
  const [browserUrl] = createSignal("http://localhost:3456")
  let interval: ReturnType<typeof setInterval> | null = null

  onMount(() => {
    // Update state periodically
    interval = setInterval(() => {
      setState(Observatory.getState())
    }, 500)

    // Keyboard shortcuts
    const unsubKeyboard = keyboard.subscribe((key) => {
      if (key.key === "q" || (key.key === "c" && key.ctrl)) {
        handleBack()
      }
    })

    return () => {
      unsubKeyboard()
    }
  })

  onCleanup(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  const handleBack = () => {
    const routeCtx = useRoute()
    routeCtx.navigate({ type: "home" })
  }

  const currentState = state()

  return (
    <box flexDirection="column" width="100%" height="100%" padding={2}>
      {/* Header */}
      <box flexDirection="row" marginBottom={1}>
        <text bold color={theme().accent}>
          🔭 Observatory
        </text>
        <box flexGrow={1} />
        <text color={theme().textMuted}>
          Press 'q' or Ctrl+C to exit
        </text>
      </box>

      {/* Status Bar */}
      <box 
        flexDirection="row" 
        backgroundColor={theme().bgSecondary}
        padding={1}
        marginBottom={1}
        borderStyle="round"
      >
        <text>Status: </text>
        <text color={currentState.status === "running" ? theme().success : theme().text}>
          {currentState.status.toUpperCase()}
        </text>
        <box flexGrow={1} />
        <text>Progress: {currentState.progress}%</text>
      </box>

      {/* Current Task */}
      <Show when={currentState.currentTask}>
        <box flexDirection="column" marginBottom={1} borderStyle="round" padding={1}>
          <text bold color={theme().accent}>Current Task:</text>
          <text>{currentState.currentTask}</text>
        </box>
      </Show>

      {/* Progress Bar */}
      <box flexDirection="row" marginBottom={1}>
        <box 
          width={`${currentState.progress}%`} 
          height={1}
          backgroundColor={theme().accent}
        />
        <box 
          width={`${100 - currentState.progress}%`} 
          height={1}
          backgroundColor={theme().bgSecondary}
        />
      </box>

      {/* Recent Thoughts */}
      <box flexDirection="column" flexGrow={1} borderStyle="round" padding={1}>
        <text bold marginBottom={1}>Recent Activity:</text>
        <Show 
          when={currentState.thoughts.length > 0}
          fallback={<text color={theme().textMuted}>No activity yet...</text>}
        >
          {currentState.thoughts.map((thought, i) => (
            <text key={i} color={i === 0 ? theme().text : theme().textMuted}>
              • {thought}
            </text>
          ))}
        </Show>
      </box>

      {/* Browser Preview URL */}
      <box flexDirection="row" marginTop={1} padding={1} borderStyle="round">
        <text>Browser Preview: </text>
        <text color={theme().accent}>{browserUrl()}</text>
      </box>

      {/* Last Action */}
      <Show when={currentState.lastAction}>
        <box flexDirection="row" marginTop={1}>
          <text color={theme().textMuted}>Last: {currentState.lastAction}</text>
        </box>
      </Show>
    </box>
  )
}
