import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import os from "os"

const execAsync = promisify(exec)

const TEMP_WAV = path.join(os.tmpdir(), "sahyacode-voice.wav")
const TEMP_MP3 = path.join(os.tmpdir(), "sahyacode-tts.mp3")

export namespace Voice {
  export interface VoiceConfig {
    /** Speech-to-text method */
    sttMethod: "system" | "whisper-api" | "none"
    /** Text-to-speech method */
    ttsMethod: "system" | "openai-tts" | "none"
    /** Language code (e.g., "en", "fr") */
    language: string
  }

  export interface TranscriptionResult {
    text: string
    confidence?: number
    language?: string
  }

  /**
   * Record audio from system microphone and transcribe it.
   * Uses macOS `rec` (sox) for recording, then OpenAI Whisper API for STT.
   */
  export async function transcribe(config: VoiceConfig): Promise<TranscriptionResult> {
    if (config.sttMethod === "none") {
      return { text: "" }
    }

    // Record audio using sox `rec`
    await recordAudio()

    // Send to OpenAI Whisper API
    const text = await transcribeWithWhisper(config.language)

    // Clean up temp file
    try {
      fs.unlinkSync(TEMP_WAV)
    } catch {
      // ignore cleanup errors
    }

    return { text }
  }

  /**
   * Speak text aloud using system TTS or OpenAI TTS.
   * On macOS: uses `say` command.
   * With OpenAI TTS: calls the TTS API and plays via `afplay`.
   */
  export async function speak(text: string, config: VoiceConfig): Promise<void> {
    if (config.ttsMethod === "none" || !text.trim()) {
      return
    }

    if (config.ttsMethod === "system") {
      await speakWithSystem(text)
    } else if (config.ttsMethod === "openai-tts") {
      await speakWithOpenAI(text)
    }
  }

  /**
   * Check if voice capabilities are available on this system.
   */
  export async function checkAvailability(): Promise<{
    microphone: boolean
    stt: boolean
    tts: boolean
    details: string[]
  }> {
    const details: string[] = []
    let microphone = false
    let stt = false
    let tts = false

    // Check for sox/rec (recording)
    const hasSox = await commandExists("rec")
    if (hasSox) {
      details.push("rec (sox): available — can record audio")
      microphone = true
      stt = true
    } else {
      details.push("rec (sox): not found — install with `brew install sox` for microphone support")
    }

    // Check for say (macOS TTS)
    const hasSay = await commandExists("say")
    if (hasSay) {
      details.push("say: available — macOS system TTS ready")
      tts = true
    } else {
      details.push("say: not found — macOS system TTS unavailable")
    }

    // Check for afplay (macOS audio playback)
    const hasAfplay = await commandExists("afplay")
    if (hasAfplay) {
      details.push("afplay: available — OpenAI TTS playback supported")
    } else {
      details.push("afplay: not found — OpenAI TTS playback unavailable")
    }

    // Check for OpenAI API key
    const hasApiKey = !!(process.env.OPENAI_API_KEY || process.env.SAHYACODE_OPENAI_API_KEY)
    if (hasApiKey) {
      details.push("OpenAI API key: configured — Whisper STT and OpenAI TTS available")
      if (!stt) stt = true // API-based STT doesn't need sox
    } else {
      details.push("OpenAI API key: not set — set OPENAI_API_KEY for Whisper STT and OpenAI TTS")
    }

    return { microphone, stt, tts, details }
  }

  /**
   * Format a TranscriptionResult for display.
   */
  export function formatTranscription(result: TranscriptionResult): string {
    const parts: string[] = []
    parts.push(result.text)
    if (result.confidence !== undefined) {
      parts.push(`(confidence: ${(result.confidence * 100).toFixed(0)}%)`)
    }
    if (result.language) {
      parts.push(`[${result.language}]`)
    }
    return parts.join(" ").trim()
  }
}

// --- Internal helpers ---

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${cmd}`)
    return true
  } catch {
    return false
  }
}

async function recordAudio(): Promise<void> {
  const hasSox = await commandExists("rec")
  if (!hasSox) {
    throw new Error(
      "sox `rec` command not found. Install with: brew install sox\n" +
        "Alternatively set sttMethod to 'whisper-api' and provide a WAV file manually.",
    )
  }

  process.stderr.write("Recording for 10 seconds... (speak now)\n")

  // rec: record 10s of mono 16kHz audio to WAV
  await execAsync(`rec -r 16000 -c 1 "${TEMP_WAV}" trim 0 10`, {
    timeout: 15_000,
  })

  process.stderr.write("Recording complete.\n")
}

async function transcribeWithWhisper(language: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.SAHYACODE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "No OpenAI API key found. Set OPENAI_API_KEY environment variable to use Whisper transcription.",
    )
  }

  if (!fs.existsSync(TEMP_WAV)) {
    throw new Error(`Audio file not found at ${TEMP_WAV}`)
  }

  const audioBuffer = fs.readFileSync(TEMP_WAV)
  const blob = new Blob([audioBuffer], { type: "audio/wav" })

  const formData = new FormData()
  formData.append("file", blob, "audio.wav")
  formData.append("model", "whisper-1")
  if (language) {
    formData.append("language", language)
  }

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Whisper API error (${response.status}): ${errorText}`)
  }

  const result = (await response.json()) as { text: string }
  return result.text.trim()
}

async function speakWithSystem(text: string): Promise<void> {
  const hasSay = await commandExists("say")
  if (!hasSay) {
    throw new Error(
      "`say` command not found. System TTS is only available on macOS.",
    )
  }

  // Escape double quotes in text before passing to shell
  const escaped = text.replace(/"/g, '\\"')
  await execAsync(`say "${escaped}"`, { timeout: 120_000 })
}

async function speakWithOpenAI(text: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.SAHYACODE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      "No OpenAI API key found. Set OPENAI_API_KEY environment variable to use OpenAI TTS.",
    )
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "alloy",
      input: text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI TTS API error (${response.status}): ${errorText}`)
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(TEMP_MP3, audioBuffer)

  const hasAfplay = await commandExists("afplay")
  if (!hasAfplay) {
    fs.unlinkSync(TEMP_MP3)
    throw new Error(
      "`afplay` not found. OpenAI TTS playback requires macOS `afplay`.",
    )
  }

  try {
    await execAsync(`afplay "${TEMP_MP3}"`, { timeout: 120_000 })
  } finally {
    try {
      fs.unlinkSync(TEMP_MP3)
    } catch {
      // ignore cleanup errors
    }
  }
}
