import { useSync } from "@tui/context/sync"
import { createMemo, createSignal, Index, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../context/tui-config"
import { Installation } from "@/installation"
import { TuiPluginRuntime } from "../../plugin"
import { getScrollAcceleration } from "../../util/scroll"
import { GHOST_FRAME_MS, GHOST_FRAMES } from "./ghost-frames"

// \x01 starts a purple segment, \x02 ends it
type Seg = { text: string; colored: boolean }

function parseLine(raw: string): Seg[] {
  const segs: Seg[] = []
  let cur = ""
  let colored = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === "\x01") {
      if (cur) segs.push({ text: cur, colored })
      cur = ""
      colored = true
    } else if (ch === "\x02") {
      if (cur) segs.push({ text: cur, colored })
      cur = ""
      colored = false
    } else {
      cur += ch
    }
  }
  if (cur) segs.push({ text: cur, colored })
  return segs
}

// Pre-parse all frames once at module load — never during render
const PARSED_FRAMES: Seg[][][] = GHOST_FRAMES.map((frame) => frame.map(parseLine))

const GHOST_PURPLE = "#8b5cf6"

function GhostSidebar() {
  const [idx, setIdx] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % PARSED_FRAMES.length)
    }, GHOST_FRAME_MS)
    onCleanup(() => clearInterval(timer))
  })

  const frame = createMemo(() => PARSED_FRAMES[idx()])

  return (
    <box paddingBottom={1}>
      <Index each={frame()}>
        {(line) => (
          <text>
            {line().map((seg) =>
              seg.colored ? <span style={{ fg: GHOST_PURPLE }}>{seg.text}</span> : seg.text,
            )}
          </text>
        )}
      </Index>
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
            <GhostSidebar />
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
