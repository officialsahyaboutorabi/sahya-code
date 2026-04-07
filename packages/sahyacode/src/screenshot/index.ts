import fs from "fs/promises"
import path from "path"
import { Process } from "@/util/process"
import { platform } from "os"

export namespace Screenshot {
  export interface ImageData {
    base64: string
    mimeType: string
  }

  /** Supported image MIME types for vision APIs */
  export const SUPPORTED_MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }

  /**
   * Reads an image file from disk and returns it as base64 + MIME type,
   * ready to be embedded in a multimodal API message part.
   */
  export async function fromFile(filePath: string): Promise<ImageData> {
    const resolved = path.resolve(filePath)
    const ext = path.extname(resolved).toLowerCase()
    const mimeType = SUPPORTED_MIME_TYPES[ext]

    if (!mimeType) {
      throw new Error(
        `Unsupported image format: "${ext}". Supported formats: ${Object.keys(SUPPORTED_MIME_TYPES).join(", ")}`,
      )
    }

    const buffer = await fs.readFile(resolved)
    const base64 = buffer.toString("base64")
    return { base64, mimeType }
  }

  /**
   * Reads an image from the system clipboard.
   * Uses osascript on macOS, wl-paste/xclip on Linux.
   * Returns undefined if no image is in the clipboard.
   */
  export async function fromClipboard(): Promise<ImageData | undefined> {
    const os = platform()

    if (os === "darwin") {
      const tmpfile = path.join(
        process.env["TMPDIR"] || "/tmp",
        `sahyacode-screenshot-${Date.now()}.png`,
      )
      try {
        await Process.run(
          [
            "osascript",
            "-e",
            'set imageData to the clipboard as "PNGf"',
            "-e",
            `set fileRef to open for access POSIX file "${tmpfile}" with write permission`,
            "-e",
            "set eof fileRef to 0",
            "-e",
            "write imageData to fileRef",
            "-e",
            "close access fileRef",
          ],
          { nothrow: true },
        )
        const buffer = await fs.readFile(tmpfile)
        if (buffer.length === 0) return undefined
        return { base64: buffer.toString("base64"), mimeType: "image/png" }
      } catch {
        return undefined
      } finally {
        await fs.rm(tmpfile, { force: true }).catch(() => {})
      }
    }

    if (os === "linux") {
      // Try Wayland first
      try {
        const wayland = await Process.run(["wl-paste", "-t", "image/png"], { nothrow: true })
        if (wayland.stdout.byteLength > 0) {
          return {
            base64: Buffer.from(wayland.stdout).toString("base64"),
            mimeType: "image/png",
          }
        }
      } catch {}

      // Fall back to X11/xclip
      try {
        const x11 = await Process.run(
          ["xclip", "-selection", "clipboard", "-t", "image/png", "-o"],
          { nothrow: true },
        )
        if (x11.stdout.byteLength > 0) {
          return {
            base64: Buffer.from(x11.stdout).toString("base64"),
            mimeType: "image/png",
          }
        }
      } catch {}

      return undefined
    }

    return undefined
  }

  /**
   * System prompt addition injected when a screenshot is attached.
   * Instructs the LLM to implement the UI faithfully as production code.
   */
  export const SYSTEM_PROMPT_ADDITION = `The user has provided a UI screenshot. Implement it faithfully as production-quality code. Match the layout, colors, typography, and spacing exactly. Use semantic HTML5, modern CSS (flexbox/grid), and React if the project uses it. Do not add placeholder comments — write real, working code.`
}
