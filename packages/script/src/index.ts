import { $ } from "bun"
import semver from "semver"
import path from "path"

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = {
  SAHYACODE_CHANNEL: process.env["SAHYACODE_CHANNEL"],
  SAHYACODE_BUMP: process.env["SAHYACODE_BUMP"],
  SAHYACODE_VERSION: process.env["SAHYACODE_VERSION"],
  SAHYACODE_RELEASE: process.env["SAHYACODE_RELEASE"],
  // Keep backward compatibility with OPENCODE_ prefix
  OPENCODE_CHANNEL: process.env["OPENCODE_CHANNEL"],
  OPENCODE_BUMP: process.env["OPENCODE_BUMP"],
  OPENCODE_VERSION: process.env["OPENCODE_VERSION"],
  OPENCODE_RELEASE: process.env["OPENCODE_RELEASE"],
}

const CHANNEL = await (async () => {
  if (env.SAHYACODE_CHANNEL) return env.SAHYACODE_CHANNEL
  if (env.OPENCODE_CHANNEL) return env.OPENCODE_CHANNEL
  if (env.SAHYACODE_BUMP || env.OPENCODE_BUMP) return "latest"
  const version = env.SAHYACODE_VERSION || env.OPENCODE_VERSION
  if (version && !version.startsWith("0.0.0-")) return "latest"
  return await $`git branch --show-current`.text().then((x) => x.trim())
})()

const IS_PREVIEW = CHANNEL !== "latest"

const VERSION = await (async () => {
  if (env.SAHYACODE_VERSION) return env.SAHYACODE_VERSION
  if (env.OPENCODE_VERSION) return env.OPENCODE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  // For sahyacode, use a default version since it may not be published to npm yet
  const version = await fetch("https://registry.npmjs.org/opencode-ai/latest")
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data: any) => data.version)
    .catch(() => "1.0.0") // Fallback version
  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const t = (env.SAHYACODE_BUMP || env.OPENCODE_BUMP)?.toLowerCase()
  if (t === "major") return `${major + 1}.0.0`
  if (t === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()

const bot = ["actions-user", "sahyacode", "sahyacode-agent[bot]", "opencode", "opencode-agent[bot]"]
const teamPath = path.resolve(import.meta.dir, "../../../.github/TEAM_MEMBERS")
const team = [
  ...(await Bun.file(teamPath)
    .text()
    .then((x) => x.split(/\r?\n/).map((x) => x.trim()))
    .then((x) => x.filter((x) => x && !x.startsWith("#")))),
  ...bot,
]

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!(env.SAHYACODE_RELEASE || env.OPENCODE_RELEASE)
  },
  get team() {
    return team
  },
}
console.log(`sahyacode script`, JSON.stringify(Script, null, 2))
