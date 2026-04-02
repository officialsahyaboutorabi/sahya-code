import { createMemo, createSignal, Index, onCleanup, onMount } from "solid-js"
import { useTheme } from "../../context/theme"
import { GHOST_FRAME_MS, GHOST_FRAMES } from "./ghost-frames"

// \x01 starts a colored (purple) segment, \x02 ends it
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

// Pre-parse all frames at module load time so parsing never happens during render
const PARSED: Seg[][][] = GHOST_FRAMES.map((frame) => frame.map(parseLine))

const PURPLE = "#8b5cf6"

export function GhostAnimation() {
  const { theme } = useTheme()
  const [idx, setIdx] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % PARSED.length)
    }, GHOST_FRAME_MS)
    onCleanup(() => clearInterval(timer))
  })

  const frame = createMemo(() => PARSED[idx()])

  return (
    <box paddingBottom={1}>
      <text fg={theme.textMuted}>👻</text>
      <Index each={frame()}>
        {(line) => (
          <text>
            {line().map((seg) =>
              seg.colored ? <span style={{ fg: PURPLE }}>{seg.text}</span> : seg.text,
            )}
          </text>
        )}
      </Index>
    </box>
  )
}
