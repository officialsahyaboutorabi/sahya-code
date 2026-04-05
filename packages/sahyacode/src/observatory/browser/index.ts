import { PreviewServer } from "./server"
import { FileSync } from "./sync"
import { Log } from "@/util/log"

export namespace ObservatoryBrowser {
  const log = Log.create({ service: "observatory.browser" })

  export interface Options {
    port?: number
    hostname?: string
    rootDir: string
    liveReload?: boolean
  }

  export interface BrowserInstance {
    url: string
    previewPort: number
    syncPort?: number
    stop: () => Promise<void>
  }

  export async function start(options: Options): Promise<BrowserInstance> {
    const previewPort = options.port || 3456
    const syncPort = options.liveReload ? previewPort + 1 : undefined

    log.info("starting browser preview", { port: previewPort, liveReload: options.liveReload })

    // Start preview server
    const preview = await PreviewServer.start({
      port: previewPort,
      hostname: options.hostname,
      rootDir: options.rootDir,
      watch: options.liveReload,
    })

    let sync: FileSync.SyncServer | undefined

    // Start file sync server for live reload
    if (options.liveReload && syncPort) {
      sync = await FileSync.startLiveReload({
        port: syncPort,
        rootDir: options.rootDir,
        debounceMs: 100,
      })
    }

    return {
      url: preview.url,
      previewPort,
      syncPort,
      stop: async () => {
        await preview.stop()
        if (sync) {
          await sync.stop()
        }
      },
    }
  }
}

export { PreviewServer, FileSync }
