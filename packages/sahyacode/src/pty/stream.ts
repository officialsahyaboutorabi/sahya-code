import { spawn as nodeSpawn } from "child_process"

export namespace PtyStream {
  export interface StreamChunk {
    type: "stdout" | "stderr" | "exit"
    data: string
    timestamp: number
    pid?: number
  }

  export function spawn(
    command: string,
    args: string[],
    options: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): AsyncIterable<StreamChunk> {
    return {
      [Symbol.asyncIterator]() {
        const chunks: StreamChunk[] = []
        const waiters: Array<(done: boolean) => void> = []
        let done = false

        const proc = nodeSpawn(command, args, {
          cwd: options.cwd,
          env: options.env,
          stdio: ["ignore", "pipe", "pipe"],
        })

        function push(chunk: StreamChunk) {
          chunks.push(chunk)
          const waiter = waiters.shift()
          if (waiter) waiter(false)
        }

        proc.stdout!.on("data", (buf: Buffer) => {
          push({ type: "stdout", data: buf.toString(), timestamp: Date.now(), pid: proc.pid })
        })

        proc.stderr!.on("data", (buf: Buffer) => {
          push({ type: "stderr", data: buf.toString(), timestamp: Date.now(), pid: proc.pid })
        })

        proc.on("close", (code) => {
          push({ type: "exit", data: String(code ?? 0), timestamp: Date.now(), pid: proc.pid })
          done = true
          for (const waiter of waiters) waiter(true)
          waiters.length = 0
        })

        return {
          next(): Promise<IteratorResult<StreamChunk>> {
            if (chunks.length > 0) {
              return Promise.resolve({ value: chunks.shift()!, done: false })
            }
            if (done) {
              return Promise.resolve({ value: undefined as any, done: true })
            }
            return new Promise<boolean>((resolve) => {
              waiters.push(resolve)
            }).then((isDone) => {
              if (chunks.length > 0) {
                return { value: chunks.shift()!, done: false }
              }
              return { value: undefined as any, done: isDone }
            })
          },
          return(): Promise<IteratorResult<StreamChunk>> {
            try {
              proc.kill()
            } catch {}
            return Promise.resolve({ value: undefined as any, done: true })
          },
        }
      },
    }
  }

  export function shell(
    cmd: string,
    options: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): AsyncIterable<StreamChunk> {
    return spawn("/bin/sh", ["-c", cmd], options)
  }

  export async function collect(
    stream: AsyncIterable<StreamChunk>,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    let stdout = ""
    let stderr = ""
    let exitCode = 0

    for await (const chunk of stream) {
      if (chunk.type === "stdout") stdout += chunk.data
      else if (chunk.type === "stderr") stderr += chunk.data
      else if (chunk.type === "exit") exitCode = parseInt(chunk.data, 10) || 0
    }

    return { stdout, stderr, exitCode }
  }
}
