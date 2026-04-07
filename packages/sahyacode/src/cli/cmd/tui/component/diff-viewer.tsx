import { TextAttributes, ScrollBoxRenderable, RGBA } from "@opentui/core"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { createMemo, createSignal, For, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"
import { DialogConfirm } from "@tui/ui/dialog-confirm"
import type { Snapshot } from "@/snapshot"
import { spawnSync } from "child_process"

// ─── Diff line types ───────────────────────────────────────────────────────────

type DiffLineKind = "addition" | "deletion" | "context" | "hunk" | "file"

interface DiffLine {
  kind: DiffLineKind
  text: string
}

// ─── Parser ────────────────────────────────────────────────────────────────────

function parseDiff(diffs: Snapshot.FileDiff[]): DiffLine[] {
  const lines: DiffLine[] = []

  for (const fd of diffs) {
    const status = fd.status ?? "modified"
    const statusLabel = status === "added" ? " (new file)" : status === "deleted" ? " (deleted)" : ""
    lines.push({ kind: "file", text: `${fd.file}${statusLabel}  +${fd.additions} -${fd.deletions}` })

    const before = (fd.before ?? "").split("\n")
    const after = (fd.after ?? "").split("\n")

    if (status === "added") {
      lines.push({ kind: "hunk", text: `@@ -0,0 +1,${after.length} @@` })
      for (const l of after) lines.push({ kind: "addition", text: `+${l}` })
    } else if (status === "deleted") {
      lines.push({ kind: "hunk", text: `@@ -1,${before.length} +0,0 @@` })
      for (const l of before) lines.push({ kind: "deletion", text: `-${l}` })
    } else {
      // Unified diff with up to 3 lines of context
      const CONTEXT = 3
      const ops = computeUnifiedDiff(before, after)
      let i = 0
      while (i < ops.length) {
        // find next changed region
        let start = i
        while (start < ops.length && ops[start].kind === "context") start++
        if (start >= ops.length) break

        const chunkStart = Math.max(0, start - CONTEXT)
        let end = start
        while (end < ops.length && !(ops[end].kind === "context")) end++
        const chunkEnd = Math.min(ops.length, end + CONTEXT)

        // compute line numbers for hunk header
        const beforeStart = ops[chunkStart].beforeLine
        const afterStart = ops[chunkStart].afterLine
        const beforeCount = ops.slice(chunkStart, chunkEnd).filter((o) => o.kind !== "addition").length
        const afterCount = ops.slice(chunkStart, chunkEnd).filter((o) => o.kind !== "deletion").length
        lines.push({ kind: "hunk", text: `@@ -${beforeStart},${beforeCount} +${afterStart},${afterCount} @@` })

        for (let j = chunkStart; j < chunkEnd; j++) {
          const op = ops[j]
          if (op.kind === "addition") lines.push({ kind: "addition", text: `+${op.text}` })
          else if (op.kind === "deletion") lines.push({ kind: "deletion", text: `-${op.text}` })
          else lines.push({ kind: "context", text: ` ${op.text}` })
        }
        i = chunkEnd
      }
    }
  }

  return lines
}

interface DiffOp {
  kind: "addition" | "deletion" | "context"
  text: string
  beforeLine: number
  afterLine: number
}

/**
 * Minimal Myers-style LCS diff — produces addition/deletion/context ops
 * suitable for generating a unified diff view.
 */
function computeUnifiedDiff(before: string[], after: string[]): DiffOp[] {
  const m = before.length
  const n = after.length
  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = before[i - 1] === after[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const ops: DiffOp[] = []
  let i = m
  let j = n
  const raw: DiffOp[] = []
  let beforeLine = m
  let afterLine = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      raw.push({ kind: "context", text: before[i - 1], beforeLine: i, afterLine: j })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ kind: "addition", text: after[j - 1], beforeLine: i + 1, afterLine: j })
      j--
    } else {
      raw.push({ kind: "deletion", text: before[i - 1], beforeLine: i, afterLine: j + 1 })
      i--
    }
  }

  raw.reverse()

  // Renumber with real 1-based line numbers
  let bl = 1
  let al = 1
  for (const op of raw) {
    op.beforeLine = bl
    op.afterLine = al
    if (op.kind !== "addition") bl++
    if (op.kind !== "deletion") al++
    ops.push(op)
  }

  return ops
}

// ─── Component ─────────────────────────────────────────────────────────────────

export interface DiffViewerProps {
  /** Session ID whose session_diff to display. Required for Revert All. */
  sessionID?: string
  /** Override with explicit diffs (e.g. for a single file). Uses sync.data.session_diff[sessionID] when omitted. */
  diffs?: Snapshot.FileDiff[]
  /** Working directory used for git commit */
  directory?: string
}

export function DiffViewer(props: DiffViewerProps) {
  const { theme } = useTheme()
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const dimensions = useTerminalDimensions()

  // ── Colours ────────────────────────────────────────────────────────────────
  const green = RGBA.fromInts(95, 175, 95)
  const red = RGBA.fromInts(215, 95, 95)
  const cyan = RGBA.fromInts(95, 175, 215)
  const muted = theme.textMuted

  // ── Data ───────────────────────────────────────────────────────────────────
  const diffs = createMemo<Snapshot.FileDiff[]>(() => {
    if (props.diffs) return props.diffs
    if (!props.sessionID) return []
    return sync.data.session_diff[props.sessionID] ?? []
  })

  const hasDiff = createMemo(() => diffs().length > 0)
  const diffLines = createMemo<DiffLine[]>(() => (hasDiff() ? parseDiff(diffs()) : []))

  // ── Scroll position ────────────────────────────────────────────────────────
  let scrollBox: ScrollBoxRenderable | undefined

  const [activeAction, setActiveAction] = createSignal<"commit" | "revert" | null>(null)

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useKeyboard((evt) => {
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      scrollBox?.scrollBy(-1)
      evt.stopPropagation()
    }
    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      scrollBox?.scrollBy(1)
      evt.stopPropagation()
    }
    if (evt.name === "pageup") {
      scrollBox?.scrollBy(-10)
      evt.stopPropagation()
    }
    if (evt.name === "pagedown") {
      scrollBox?.scrollBy(10)
      evt.stopPropagation()
    }
    if (evt.name === "home") {
      scrollBox?.scrollTo(0)
      evt.stopPropagation()
    }
    if (evt.name === "end") {
      scrollBox?.scrollTo(999999)
      evt.stopPropagation()
    }
    if (evt.ctrl && evt.name === "c") {
      evt.preventDefault()
      dialog.clear()
    }
    if (evt.name === "a") {
      evt.stopPropagation()
      handleCommit()
    }
    if (evt.name === "r") {
      evt.stopPropagation()
      handleRevert()
    }
  })

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleCommit() {
    if (activeAction()) return
    if (!hasDiff()) {
      toast.show({ variant: "warning", message: "No changes to commit" })
      return
    }

    const confirmed = await DialogConfirm.show(
      dialog,
      "Approve & Commit",
      "Commit all current changes with git? This will run `git add -A && git commit -m 'chore: agent changes'` in the working directory.",
    )
    if (!confirmed) return

    setActiveAction("commit")
    try {
      const cwd = props.directory ?? process.cwd()
      const add = spawnSync("git", ["add", "-A"], { cwd, encoding: "utf8" })
      if (add.status !== 0) {
        toast.show({ variant: "error", message: `git add failed: ${add.stderr || add.stdout || "unknown error"}` })
        return
      }
      const commit = spawnSync("git", ["commit", "-m", "chore: agent changes"], { cwd, encoding: "utf8" })
      if (commit.status !== 0) {
        toast.show({ variant: "error", message: `git commit failed: ${commit.stderr || commit.stdout || "nothing to commit"}` })
        return
      }
      toast.show({ variant: "success", message: "Changes committed successfully" })
      dialog.clear()
    } finally {
      setActiveAction(null)
    }
  }

  async function handleRevert() {
    if (activeAction()) return
    if (!props.sessionID) {
      toast.show({ variant: "warning", message: "No session to revert" })
      return
    }

    const confirmed = await DialogConfirm.show(
      dialog,
      "Revert All Changes",
      "Revert all file changes made by the agent in this session? This cannot be undone.",
    )
    if (!confirmed) return

    setActiveAction("revert")
    try {
      const messages = sync.data.message[props.sessionID] ?? []
      const firstUser = messages.find((m) => m.role === "user")
      if (firstUser) {
        await sdk.client.session.revert({
          sessionID: props.sessionID,
          messageID: firstUser.id,
        })
      }
      toast.show({ variant: "success", message: "All agent changes reverted" })
      dialog.clear()
    } catch (err) {
      toast.show({ variant: "error", message: `Revert failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setActiveAction(null)
    }
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  const maxHeight = createMemo(() => Math.max(6, Math.floor(dimensions().height * 0.6)))

  return (
    <box gap={1} paddingBottom={1}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <box paddingLeft={2} paddingRight={2} flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          Review Changes
        </text>
        <text fg={muted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>

      {/* ── Summary bar ────────────────────────────────────────────────── */}
      <Show when={hasDiff()}>
        <box paddingLeft={2} paddingRight={2} flexDirection="row" gap={2}>
          <text fg={theme.text}>
            {diffs().length} file{diffs().length !== 1 ? "s" : ""}
          </text>
          <text fg={green}>
            +{diffs().reduce((s, d) => s + d.additions, 0)} additions
          </text>
          <text fg={red}>
            -{diffs().reduce((s, d) => s + d.deletions, 0)} deletions
          </text>
        </box>
      </Show>

      {/* ── Diff body ──────────────────────────────────────────────────── */}
      <Show
        when={hasDiff()}
        fallback={
          <box paddingLeft={2} paddingRight={2} paddingTop={1}>
            <text fg={muted}>No uncommitted changes in this session.</text>
          </box>
        }
      >
        <scrollbox
          paddingLeft={1}
          paddingRight={1}
          scrollbarOptions={{ visible: true }}
          ref={(r: ScrollBoxRenderable) => (scrollBox = r)}
          maxHeight={maxHeight()}
        >
          <For each={diffLines()}>
            {(line) => {
              if (line.kind === "file") {
                return (
                  <box flexDirection="row" paddingLeft={1} paddingTop={1}>
                    <text fg={cyan} attributes={TextAttributes.BOLD}>
                      {line.text}
                    </text>
                  </box>
                )
              }
              if (line.kind === "hunk") {
                return (
                  <box flexDirection="row" paddingLeft={1}>
                    <text fg={muted} attributes={TextAttributes.DIM}>
                      {line.text}
                    </text>
                  </box>
                )
              }
              if (line.kind === "addition") {
                return (
                  <box
                    flexDirection="row"
                    paddingLeft={1}
                    backgroundColor={RGBA.fromInts(0, 50, 0, 60)}
                  >
                    <text fg={green} overflow="hidden" wrapMode="none">
                      {line.text}
                    </text>
                  </box>
                )
              }
              if (line.kind === "deletion") {
                return (
                  <box
                    flexDirection="row"
                    paddingLeft={1}
                    backgroundColor={RGBA.fromInts(60, 0, 0, 60)}
                  >
                    <text fg={red} overflow="hidden" wrapMode="none">
                      {line.text}
                    </text>
                  </box>
                )
              }
              // context
              return (
                <box flexDirection="row" paddingLeft={1}>
                  <text fg={muted} attributes={TextAttributes.DIM} overflow="hidden" wrapMode="none">
                    {line.text}
                  </text>
                </box>
              )
            }}
          </For>
        </scrollbox>
      </Show>

      {/* ── Action bar ─────────────────────────────────────────────────── */}
      <box
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        flexDirection="row"
        gap={3}
        justifyContent="flex-end"
      >
        {/* Approve & Commit */}
        <Show when={hasDiff()}>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={activeAction() === "commit" ? theme.primary : RGBA.fromInts(0, 80, 0, 120)}
            onMouseUp={() => handleCommit()}
          >
            <text fg={activeAction() === "commit" ? theme.background : green}>
              {activeAction() === "commit" ? "Committing…" : "[a] Approve & Commit"}
            </text>
          </box>
        </Show>

        {/* Revert All */}
        <Show when={!!props.sessionID}>
          <box
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={activeAction() === "revert" ? theme.error : RGBA.fromInts(80, 0, 0, 120)}
            onMouseUp={() => handleRevert()}
          >
            <text fg={activeAction() === "revert" ? theme.background : red}>
              {activeAction() === "revert" ? "Reverting…" : "[r] Revert All"}
            </text>
          </box>
        </Show>

        {/* Scroll hints */}
        <text fg={muted}>↑↓ scroll</text>
      </box>
    </box>
  )
}
