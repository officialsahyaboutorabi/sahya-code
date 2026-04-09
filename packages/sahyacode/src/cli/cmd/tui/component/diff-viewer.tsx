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

    const patch = fd.patch ?? ""
    const patchLines = patch.split("\n")

    for (const line of patchLines) {
      if (line.startsWith("@@")) {
        lines.push({ kind: "hunk", text: line })
      } else if (line.startsWith("+")) {
        lines.push({ kind: "addition", text: line })
      } else if (line.startsWith("-")) {
        lines.push({ kind: "deletion", text: line })
      } else if (line.startsWith(" ")) {
        lines.push({ kind: "context", text: line })
      } else if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        // Skip git diff metadata lines - we already show the filename
        continue
      } else if (line === "\\ No newline at end of file") {
        lines.push({ kind: "context", text: line })
      }
    }
  }

  return lines
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
