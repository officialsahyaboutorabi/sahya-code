import { useSync } from "@tui/context/sync"
import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../context/tui-config"
import { Installation } from "@/installation"
import { TuiPluginRuntime } from "../../plugin"

import { getScrollAcceleration } from "../../util/scroll"

// Tiny Ghost ASCII art frames for sidebar (fits in 38 char width)
const ghostFrames = [
  [
    "   +==*%%*==+   ",
    "  +*++    ++*+  ",
    "  *+=  ** =+*   ",
    "  *oo $@@$ oo*  ",
    "  x** $$$$ **x  ",
    "  =+~ @@@@ ~+=  ",
    "  +++ $$$$ +++  ",
    "  =   @@@@   =  ",
  ],
  [
    "   +==*%%*==+   ",
    "  +*++    ++*+  ",
    "  *+=  ** =+*   ",
    "  *oo $@@$ oo*  ",
    "  x** @@@@ **x  ",
    "  =+~ $$$$ ~+=  ",
    "  +++ @@@@ +++  ",
    "  =   $$$$   =  ",
  ],
  [
    "   +==*%%*==+   ",
    "  +*++    ++*+  ",
    "  *+=  ** =+*   ",
    "  *oo $@@$ oo*  ",
    "  x** $$$$ **x  ",
    "  =+~ @@@@ ~+=  ",
    "  +++ $$$$ +++  ",
    "  =   @@@@   =  ",
  ],
]

function GhostSidebar(props: { primary: string }) {
  const [frameIndex, setFrameIndex] = createSignal(0)
  
  const interval = setInterval(() => {
    setFrameIndex((i) => (i + 1) % ghostFrames.length)
  }, 400)
  
  onCleanup(() => clearInterval(interval))

  return (
    <box flexDirection="column" alignItems="center" paddingY={1} opacity={0.25}>
      {ghostFrames[frameIndex()].map((line) => (
        <text fg={props.primary}>{line}</text>
      ))}
    </box>
  )
}

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const session = createMemo(() => sync.session.get(props.sessionID))
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))

  return (
    <Show when={session()}>
      <box
        backgroundColor={theme.backgroundPanel}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox
          flexGrow={1}
          scrollAcceleration={scrollAcceleration()}
          verticalScrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.background,
              foregroundColor: theme.borderActive,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingRight={1}>
            <TuiPluginRuntime.Slot
              name="sidebar_title"
              mode="single_winner"
              session_id={props.sessionID}
              title={session()!.title}
              share_url={session()!.share?.url}
            >
              <box paddingRight={1}>
                <text fg={theme.text}>
                  <b>{session()!.title}</b>
                </text>
                <Show when={session()!.share?.url}>
                  <text fg={theme.textMuted}>{session()!.share!.url}</text>
                </Show>
              </box>
            </TuiPluginRuntime.Slot>
            <TuiPluginRuntime.Slot name="sidebar_content" session_id={props.sessionID} />
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <GhostSidebar primary={theme.primary} />
          <TuiPluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>•</span> <b>Sahya</b>
              <span style={{ fg: theme.text }}>
                <b>Code</b>
              </span>{" "}
              <span>{Installation.VERSION}</span>
            </text>
          </TuiPluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
