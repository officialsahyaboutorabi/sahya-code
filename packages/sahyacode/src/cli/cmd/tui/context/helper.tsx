import { createContext, Show, useContext, type ParentProps, createEffect, on } from "solid-js"
import fs from "fs"

const CRASH_LOG = `${process.env.HOME || process.env.USERPROFILE || "/tmp"}/.sahyacode/crash.log`
function crashLog(label: string, data: Record<string, unknown>) {
  const line = JSON.stringify({ time: new Date().toISOString(), label, ...data }) + "\n"
  try { fs.appendFileSync(CRASH_LOG, line) } catch {}
}

export function createSimpleContext<T, Props extends Record<string, any>>(input: {
  name: string
  init: ((input: Props) => T) | (() => T)
}) {
  const ctx = createContext<T>()

  return {
    provider: (props: ParentProps<Props>) => {
      const init = input.init(props)
      const ready = () => init.ready
      if (ready() === false) {
        crashLog("provider_blocked", { name: input.name })
        setTimeout(() => {
          if (ready() === false) {
            crashLog("provider_still_blocked", { name: input.name })
          }
        }, 5000)
      }
      createEffect(
        on(
          ready,
          (r, was) => {
            if (was === false && r !== false) {
              crashLog("provider_ready", { name: input.name, ready: r })
            }
          },
        ),
      )
      return (
        // @ts-expect-error
        <Show when={true}>
          <ctx.Provider value={init}>{props.children}</ctx.Provider>
        </Show>
      )
    },
    use() {
      const value = useContext(ctx)
      if (!value) throw new Error(`${input.name} context must be used within a context provider`)
      return value
    },
  }
}
