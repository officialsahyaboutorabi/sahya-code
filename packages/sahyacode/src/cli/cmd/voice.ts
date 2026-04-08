import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { Voice } from "../../voice"

export const VoiceCommand = cmd({
  command: "voice [subcommand]",
  describe: "voice input mode — record microphone, transcribe, and send as prompt",
  builder: (yargs: Argv) => {
    return yargs
      .positional("subcommand", {
        describe: "subcommand to run (check: test voice availability)",
        type: "string",
        choices: ["check"],
      })
      .option("stt", {
        describe: "speech-to-text method",
        type: "string",
        choices: ["system", "whisper-api", "none"] as const,
        default: "system",
      })
      .option("tts", {
        describe: "text-to-speech method",
        type: "string",
        choices: ["system", "openai-tts", "none"] as const,
        default: "system",
      })
      .option("language", {
        describe: "language code for transcription (e.g. en, fr, es)",
        type: "string",
        default: "en",
      })
      .option("speak", {
        describe: "speak the transcribed text back after recording",
        type: "boolean",
        default: false,
      })
      .example("$0 voice", "record 10s of audio and print transcription")
      .example("$0 voice check", "check voice capability availability")
      .example("$0 voice --stt whisper-api --tts openai-tts", "use OpenAI for both STT and TTS")
  },
  handler: async (args) => {
    const subcommand = args.subcommand

    if (subcommand === "check") {
      await runCheck()
      return
    }

    // Default: voice input mode
    const config: Voice.VoiceConfig = {
      sttMethod: args.stt as Voice.VoiceConfig["sttMethod"],
      ttsMethod: args.tts as Voice.VoiceConfig["ttsMethod"],
      language: args.language,
    }

    await runVoiceInput(config, args.speak)
  },
})

async function runCheck(): Promise<void> {
  const width = 56

  console.log("")
  console.log("┌" + "─".repeat(width - 2) + "┐")
  console.log("│" + " VOICE CAPABILITY CHECK ".padStart((width + 22) / 2).padEnd(width - 2) + "│")
  console.log("├" + "─".repeat(width - 2) + "┤")

  const availability = await Voice.checkAvailability()

  const statusLine = (label: string, ok: boolean) => {
    const status = ok
      ? UI.Style.TEXT_SUCCESS + "✓" + UI.Style.TEXT_NORMAL
      : UI.Style.TEXT_DANGER + "✗" + UI.Style.TEXT_NORMAL
    const paddedLabel = label.padEnd(width - 8)
    console.log(`│ ${status} ${paddedLabel} │`)
  }

  statusLine("Microphone / Recording (sox rec)", availability.microphone)
  statusLine("Speech-to-text (STT)", availability.stt)
  statusLine("Text-to-speech (TTS)", availability.tts)

  console.log("├" + "─".repeat(width - 2) + "┤")
  console.log("│" + " DETAILS ".padStart((width + 9) / 2).padEnd(width - 2) + "│")
  console.log("├" + "─".repeat(width - 2) + "┤")

  for (const detail of availability.details) {
    // Wrap long detail lines to fit in box
    const chunks = chunkString(detail, width - 4)
    for (const chunk of chunks) {
      console.log("│ " + chunk.padEnd(width - 4) + " │")
    }
  }

  console.log("└" + "─".repeat(width - 2) + "┘")
  console.log("")

  if (!availability.microphone) {
    console.log(
      UI.Style.TEXT_WARNING +
        "Tip: Install sox with `brew install sox` to enable microphone recording." +
        UI.Style.TEXT_NORMAL,
    )
  }
  if (!availability.stt && !process.env.OPENAI_API_KEY) {
    console.log(
      UI.Style.TEXT_WARNING +
        "Tip: Set OPENAI_API_KEY to enable Whisper speech-to-text transcription." +
        UI.Style.TEXT_NORMAL,
    )
  }
  if (!availability.tts) {
    console.log(
      UI.Style.TEXT_WARNING +
        "Tip: On macOS the `say` command provides system TTS (usually pre-installed)." +
        UI.Style.TEXT_NORMAL,
    )
  }
}

async function runVoiceInput(config: Voice.VoiceConfig, speakBack: boolean): Promise<void> {
  if (config.sttMethod === "none") {
    console.log(
      UI.Style.TEXT_WARNING + "STT method is set to 'none'. Nothing to transcribe." + UI.Style.TEXT_NORMAL,
    )
    return
  }

  console.log(UI.Style.TEXT_INFO + "Starting voice input mode..." + UI.Style.TEXT_NORMAL)
  console.log(UI.Style.TEXT_DIM + `STT: ${config.sttMethod} | TTS: ${config.ttsMethod} | Language: ${config.language}` + UI.Style.TEXT_NORMAL)
  console.log("")

  try {
    const result = await Voice.transcribe(config)

    if (!result.text) {
      console.log(UI.Style.TEXT_WARNING + "No speech detected or transcription was empty." + UI.Style.TEXT_NORMAL)
      return
    }

    console.log("")
    console.log(UI.Style.TEXT_SUCCESS_BOLD + "Transcription:" + UI.Style.TEXT_NORMAL)
    console.log(Voice.formatTranscription(result))
    console.log("")

    if (speakBack && config.ttsMethod !== "none") {
      console.log(UI.Style.TEXT_DIM + "Speaking transcription back..." + UI.Style.TEXT_NORMAL)
      await Voice.speak(result.text, config)
    }

    // Output raw transcription to stdout for piping into other commands
    process.stdout.write(result.text + "\n")
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log("")
    UI.error(message)
    console.log("")
    console.log(
      UI.Style.TEXT_DIM +
        "Run `sahyacode voice check` to diagnose voice capability issues." +
        UI.Style.TEXT_NORMAL,
    )
    process.exit(1)
  }
}

function chunkString(str: string, maxLen: number): string[] {
  const chunks: string[] = []
  let remaining = str
  while (remaining.length > maxLen) {
    // Try to break at a space
    let breakAt = remaining.lastIndexOf(" ", maxLen)
    if (breakAt <= 0) breakAt = maxLen
    chunks.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt).trimStart()
  }
  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}
