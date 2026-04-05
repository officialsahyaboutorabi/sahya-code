declare global {
  const SAHYACODE_VERSION: string
  const SAHYACODE_CHANNEL: string
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
}

export const VERSION =
  typeof SAHYACODE_VERSION === "string" ? SAHYACODE_VERSION : typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
export const CHANNEL =
  typeof SAHYACODE_CHANNEL === "string" ? SAHYACODE_CHANNEL : typeof OPENCODE_CHANNEL === "string" ? OPENCODE_CHANNEL : "local"
