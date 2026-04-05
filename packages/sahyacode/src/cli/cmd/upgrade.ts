import type { Argv } from "yargs"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { Installation } from "../../installation"
import { Filesystem } from "../../util/filesystem"
import path from "path"

export const UpgradeCommand = {
  command: "upgrade [target]",
  describe: "upgrade sahyacode to the latest or a specific version",
  builder: (yargs: Argv) => {
    return yargs
      .positional("target", {
        describe: "version to upgrade to, for ex '0.1.48' or 'v0.1.48'",
        type: "string",
      })
      .option("method", {
        alias: "m",
        describe: "installation method to use",
        type: "string",
        choices: ["curl", "npm", "pnpm", "bun", "brew", "choco", "scoop"],
      })
  },
  handler: async (args: { target?: string; method?: string }) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro("Upgrade")
    const detectedMethod = await Installation.method()
    const method = (args.method as Installation.Method) ?? detectedMethod
    if (method === "unknown") {
      prompts.log.error(`sahyacode is installed to ${process.execPath} and may be managed by a package manager`)
      const install = await prompts.select({
        message: "Install anyways?",
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ],
        initialValue: false,
      })
      if (!install) {
        prompts.outro("Done")
        return
      }
    }
    prompts.log.info("Using method: " + method)
    
    // Get target version - keep 'v' prefix
    let target: string
    if (args.target) {
      target = args.target.startsWith("v") ? args.target : `v${args.target}`
    } else {
      target = await Installation.latest()
    }

    // Normalize versions for comparison (strip 'v' prefix)
    const currentVersion = Installation.VERSION.replace(/^v/, "")
    const targetVersion = target.replace(/^v/, "")
    
    if (currentVersion === targetVersion) {
      prompts.log.warn(`sahyacode upgrade skipped: v${targetVersion} is already installed`)
      prompts.outro("Done")
      return
    }

    // Check if trying to downgrade
    const compareVersions = (a: string, b: string): number => {
      const partsA = a.split('.').map(Number)
      const partsB = b.split('.').map(Number)
      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0
        const partB = partsB[i] || 0
        if (partA > partB) return 1
        if (partA < partB) return -1
      }
      return 0
    }

    if (compareVersions(targetVersion, currentVersion) < 0) {
      prompts.log.warn(`sahyacode v${currentVersion} is newer than v${targetVersion}`)
      prompts.log.info("You're already on a newer version. No upgrade needed.")
      prompts.outro("Done")
      return
    }

    prompts.log.info(`From v${currentVersion} → v${targetVersion}`)
    const spinner = prompts.spinner()
    spinner.start("Upgrading...")
    const err = await Installation.upgrade(method, targetVersion).catch((err) => err)
    if (err) {
      spinner.stop("Upgrade failed", 1)
      if (err instanceof Installation.UpgradeFailedError) {
        // necessary because choco only allows install/upgrade in elevated terminals
        if (method === "choco" && err.stderr.includes("not running from an elevated command shell")) {
          prompts.log.error("Please run the terminal as Administrator and try again")
        } else {
          prompts.log.error(err.stderr)
        }
      } else if (err instanceof Error) prompts.log.error(err.message)
      prompts.outro("Done")
      return
    }
    spinner.stop("Upgrade complete")
    prompts.outro("Done")
  },
}
