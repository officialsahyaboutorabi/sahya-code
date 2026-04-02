import { TextAttributes } from "@opentui/core"
import { For, type JSX } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { logo } from "@/cli/logo"

export function Logo() {
  const { theme } = useTheme()
  const attrs = TextAttributes.BOLD

  const renderLine = (line: string): JSX.Element => {
    return (
      <text fg={theme.primary} attributes={attrs} selectable={false}>
        {line}
      </text>
    )
  }

  return (
    <box flexDirection="column" alignItems="center">
      <For each={logo.left}>
        {(line) => <box flexDirection="row">{renderLine(line)}</box>}
      </For>
    </box>
  )
}
