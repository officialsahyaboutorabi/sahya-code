declare global {
  const SAHYACODE_VERSION: string
  const SAHYACODE_CHANNEL: string
  const SAHYACODE_VERSION: string
  const SAHYACODE_CHANNEL: string
}

export const VERSION =
  typeof SAHYACODE_VERSION === "string" ? SAHYACODE_VERSION : typeof SAHYACODE_VERSION === "string" ? SAHYACODE_VERSION : "local"
export const CHANNEL =
  typeof SAHYACODE_CHANNEL === "string" ? SAHYACODE_CHANNEL : typeof SAHYACODE_CHANNEL === "string" ? SAHYACODE_CHANNEL : "local"
