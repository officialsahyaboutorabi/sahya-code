import type { Argv } from "yargs"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { Config } from "../../config/config"
import { Auth } from "../../auth"

export const CustomProviderCommand = {
  command: "provider <action>",
  describe: "Manage custom AI providers",
  builder: (yargs: Argv) => {
    return yargs
      .positional("action", {
        describe: "Action to perform",
        type: "string",
        choices: ["add", "list", "remove", "set-key"],
      })
      .option("name", { describe: "Provider name", type: "string" })
      .option("url", { describe: "API Base URL", type: "string" })
      .option("api-key", { describe: "API key", type: "string" })
      .option("global", { describe: "Use global config", type: "boolean", default: false })
  },
  handler: async (args: { action: string; name?: string; url?: string; apiKey?: string; global?: boolean }) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro("Custom Provider")

    const config = args.global ? await Config.getGlobal() : await Config.get()
    const updateFn = args.global ? Config.updateGlobal : Config.update

    if (args.action === "add") {
      const name = args.name || await prompts.text({
        message: "Provider name",
        validate: (v) => v ? undefined : "Required"
      })
      if (prompts.isCancel(name)) { prompts.outro("Cancelled"); return }

      const url = args.url || await prompts.text({
        message: "API URL",
        validate: (v) => { try { new URL(v); return undefined } catch { return "Invalid URL" } }
      })
      if (prompts.isCancel(url)) { prompts.outro("Cancelled"); return }

      const apiKey = args.apiKey || await prompts.text({ message: "API Key (optional)", placeholder: "sk-..." })
      if (prompts.isCancel(apiKey)) { prompts.outro("Cancelled"); return }

      const spinner = prompts.spinner()
      spinner.start("Adding provider...")

      try {
        if (apiKey && typeof apiKey === "string" && apiKey.trim()) {
          await Auth.set(name as string, apiKey)
        }

        await updateFn({
          ...config,
          provider: {
            ...config.provider,
            [name as string]: {
              base: "openai-compatible",
              env: [],
              options: { baseURL: url },
              models: {},
            },
          },
        })

        spinner.stop("Provider added!")
        prompts.log.info(`Provider: ${name}`)
        prompts.log.info(`URL: ${url}`)
      } catch (err) {
        spinner.stop("Failed")
        prompts.log.error(String(err))
      }
    }
    else if (args.action === "list") {
      const providers = config.provider || {}
      const custom = Object.entries(providers).filter(([_, p]) => p?.options?.baseURL)
      if (custom.length === 0) {
        prompts.log.info("No custom providers. Add one with: sahyacode provider add")
      } else {
        for (const [name, p] of custom) {
          console.log(`${name}: ${p?.options?.baseURL}`)
        }
      }
    }
    else if (args.action === "remove") {
      const name = args.name || await prompts.text({ message: "Provider name", validate: (v) => v ? undefined : "Required" })
      if (prompts.isCancel(name)) { prompts.outro("Cancelled"); return }
      if (!config.provider?.[name as string]) { prompts.log.error("Not found"); return }

      const confirm = await prompts.confirm({ message: `Remove ${name}?`, initialValue: false })
      if (!confirm) { prompts.outro("Cancelled"); return }

      await Auth.remove(name as string).catch(() => {})
      const { [name as string]: _, ...rest } = config.provider || {}
      await updateFn({ ...config, provider: rest })
      prompts.log.success("Removed")
    }
    else if (args.action === "set-key") {
      const name = args.name || await prompts.text({ message: "Provider name", validate: (v) => v ? undefined : "Required" })
      if (prompts.isCancel(name)) { prompts.outro("Cancelled"); return }
      if (!config.provider?.[name as string]) { prompts.log.error("Not found"); return }

      const key = args.apiKey || await prompts.password({ message: "API Key", validate: (v) => v ? undefined : "Required" })
      if (prompts.isCancel(key)) { prompts.outro("Cancelled"); return }

      await Auth.set(name as string, key as string)
      prompts.log.success("API key set")
    }

    prompts.outro("Done")
  },
}
