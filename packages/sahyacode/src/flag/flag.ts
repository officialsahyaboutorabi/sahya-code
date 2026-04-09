import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

export namespace Flag {
  export const OTEL_EXPORTER_OTLP_ENDPOINT = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  export const OTEL_EXPORTER_OTLP_HEADERS = process.env["OTEL_EXPORTER_OTLP_HEADERS"]

  export const SAHYACODE_AUTO_SHARE = truthy("SAHYACODE_AUTO_SHARE")
  export const SAHYACODE_GIT_BASH_PATH = process.env["SAHYACODE_GIT_BASH_PATH"]
  export const SAHYACODE_CONFIG = process.env["SAHYACODE_CONFIG"]
  export declare const SAHYACODE_PURE: boolean
  export declare const SAHYACODE_TUI_CONFIG: string | undefined
  export declare const SAHYACODE_CONFIG_DIR: string | undefined
  export declare const SAHYACODE_PLUGIN_META_FILE: string | undefined
  export const SAHYACODE_CONFIG_CONTENT = process.env["SAHYACODE_CONFIG_CONTENT"]
  export const SAHYACODE_DISABLE_AUTOUPDATE = truthy("SAHYACODE_DISABLE_AUTOUPDATE")
  export const SAHYACODE_ALWAYS_NOTIFY_UPDATE = truthy("SAHYACODE_ALWAYS_NOTIFY_UPDATE")
  export const SAHYACODE_DISABLE_PRUNE = truthy("SAHYACODE_DISABLE_PRUNE")
  export const SAHYACODE_DISABLE_TERMINAL_TITLE = truthy("SAHYACODE_DISABLE_TERMINAL_TITLE")
  export const SAHYACODE_SHOW_TTFD = truthy("SAHYACODE_SHOW_TTFD")
  export const SAHYACODE_PERMISSION = process.env["SAHYACODE_PERMISSION"]
  export const SAHYACODE_DISABLE_DEFAULT_PLUGINS = truthy("SAHYACODE_DISABLE_DEFAULT_PLUGINS")
  export const SAHYACODE_DISABLE_LSP_DOWNLOAD = truthy("SAHYACODE_DISABLE_LSP_DOWNLOAD")
  export const SAHYACODE_ENABLE_EXPERIMENTAL_MODELS = truthy("SAHYACODE_ENABLE_EXPERIMENTAL_MODELS")
  export const SAHYACODE_DISABLE_AUTOCOMPACT = truthy("SAHYACODE_DISABLE_AUTOCOMPACT")
  export const SAHYACODE_DISABLE_MODELS_FETCH = truthy("SAHYACODE_DISABLE_MODELS_FETCH")
  export const SAHYACODE_DISABLE_CLAUDE_CODE = truthy("SAHYACODE_DISABLE_CLAUDE_CODE")
  export const SAHYACODE_DISABLE_CLAUDE_CODE_PROMPT =
    SAHYACODE_DISABLE_CLAUDE_CODE || truthy("SAHYACODE_DISABLE_CLAUDE_CODE_PROMPT")
  export const SAHYACODE_DISABLE_CLAUDE_CODE_SKILLS =
    SAHYACODE_DISABLE_CLAUDE_CODE || truthy("SAHYACODE_DISABLE_CLAUDE_CODE_SKILLS")
  export const SAHYACODE_DISABLE_EXTERNAL_SKILLS =
    SAHYACODE_DISABLE_CLAUDE_CODE_SKILLS || truthy("SAHYACODE_DISABLE_EXTERNAL_SKILLS")
  export declare const SAHYACODE_DISABLE_PROJECT_CONFIG: boolean
  export const SAHYACODE_FAKE_VCS = process.env["SAHYACODE_FAKE_VCS"]
  export declare const SAHYACODE_CLIENT: string
  export const SAHYACODE_SERVER_PASSWORD = process.env["SAHYACODE_SERVER_PASSWORD"]
  export const SAHYACODE_SERVER_USERNAME = process.env["SAHYACODE_SERVER_USERNAME"]
  export const SAHYACODE_ENABLE_QUESTION_TOOL = truthy("SAHYACODE_ENABLE_QUESTION_TOOL")

  // Experimental
  export const SAHYACODE_EXPERIMENTAL = truthy("SAHYACODE_EXPERIMENTAL")
  export const SAHYACODE_EXPERIMENTAL_FILEWATCHER = Config.boolean("SAHYACODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  )
  export const SAHYACODE_EXPERIMENTAL_DISABLE_FILEWATCHER = Config.boolean(
    "SAHYACODE_EXPERIMENTAL_DISABLE_FILEWATCHER",
  ).pipe(Config.withDefault(false))
  export const SAHYACODE_EXPERIMENTAL_ICON_DISCOVERY =
    SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_ICON_DISCOVERY")

  const copy = process.env["SAHYACODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
  export const SAHYACODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT =
    copy === undefined ? process.platform === "win32" : truthy("SAHYACODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
  export const SAHYACODE_ENABLE_EXA =
    truthy("SAHYACODE_ENABLE_EXA") || SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_EXA")
  export const SAHYACODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number("SAHYACODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const SAHYACODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number("SAHYACODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const SAHYACODE_EXPERIMENTAL_OXFMT = SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_OXFMT")
  export const SAHYACODE_EXPERIMENTAL_LSP_TY = truthy("SAHYACODE_EXPERIMENTAL_LSP_TY")
  export const SAHYACODE_EXPERIMENTAL_LSP_TOOL = SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_LSP_TOOL")
  export const SAHYACODE_DISABLE_FILETIME_CHECK = Config.boolean("SAHYACODE_DISABLE_FILETIME_CHECK").pipe(
    Config.withDefault(false),
  )
  export const SAHYACODE_EXPERIMENTAL_PLAN_MODE = SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_PLAN_MODE")
  export const SAHYACODE_EXPERIMENTAL_WORKSPACES = SAHYACODE_EXPERIMENTAL || truthy("SAHYACODE_EXPERIMENTAL_WORKSPACES")
  export const SAHYACODE_EXPERIMENTAL_MARKDOWN = !falsy("SAHYACODE_EXPERIMENTAL_MARKDOWN")
  export const SAHYACODE_MODELS_URL = process.env["SAHYACODE_MODELS_URL"]
  export const SAHYACODE_MODELS_PATH = process.env["SAHYACODE_MODELS_PATH"]
  export const SAHYACODE_DISABLE_EMBEDDED_WEB_UI = truthy("SAHYACODE_DISABLE_EMBEDDED_WEB_UI")
  export const SAHYACODE_DB = process.env["SAHYACODE_DB"]
  export const SAHYACODE_DISABLE_CHANNEL_DB = truthy("SAHYACODE_DISABLE_CHANNEL_DB")
  export const SAHYACODE_SKIP_MIGRATIONS = truthy("SAHYACODE_SKIP_MIGRATIONS")
  export const SAHYACODE_STRICT_CONFIG_DEPS = truthy("SAHYACODE_STRICT_CONFIG_DEPS")

  function number(key: string) {
    const value = process.env[key]
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }

  export declare const SAHYACODE_DISABLE_PROJECT_CONFIG: boolean
  export declare const SAHYACODE_CONFIG_DIR: string | undefined
  export declare const SAHYACODE_SERVER_USERNAME: string | undefined
}

// Dynamic getter for SAHYACODE_DISABLE_PROJECT_CONFIG
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "SAHYACODE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("SAHYACODE_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_TUI_CONFIG
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "SAHYACODE_TUI_CONFIG", {
  get() {
    return process.env["SAHYACODE_TUI_CONFIG"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_CONFIG_DIR
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "SAHYACODE_CONFIG_DIR", {
  get() {
    return process.env["SAHYACODE_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_PURE
// This must be evaluated at access time, not module load time,
// because the CLI can set this flag at runtime
Object.defineProperty(Flag, "SAHYACODE_PURE", {
  get() {
    return truthy("SAHYACODE_PURE")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_PLUGIN_META_FILE
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "SAHYACODE_PLUGIN_META_FILE", {
  get() {
    return process.env["SAHYACODE_PLUGIN_META_FILE"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "SAHYACODE_CLIENT", {
  get() {
    return process.env["SAHYACODE_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for SAHYACODE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "SAHYACODE_CLIENT", {
  get() {
    return process.env["SAHYACODE_CLIENT"] ?? process.env["SAHYACODE_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})

// SahyaCode flags (aliases for SAHYACODE flags with legacy support)
Object.defineProperty(Flag, "SAHYACODE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("SAHYACODE_DISABLE_PROJECT_CONFIG") || truthy("SAHYACODE_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

Object.defineProperty(Flag, "SAHYACODE_CONFIG_DIR", {
  get() {
    return process.env["SAHYACODE_CONFIG_DIR"] || process.env["SAHYACODE_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

Object.defineProperty(Flag, "SAHYACODE_SERVER_USERNAME", {
  get() {
    return process.env["SAHYACODE_SERVER_USERNAME"] || process.env["SAHYACODE_SERVER_USERNAME"]
  },
  enumerable: true,
  configurable: false,
})
