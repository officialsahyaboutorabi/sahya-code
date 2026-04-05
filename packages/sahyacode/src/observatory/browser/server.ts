import { createServer, IncomingMessage, ServerResponse } from "http"
import { readFile, stat, readdir } from "fs/promises"
import { createReadStream } from "fs"
import path from "path"
import { Log } from "@/util/log"

export namespace PreviewServer {
  const log = Log.create({ service: "observatory.preview" })

  export interface Options {
    port?: number
    hostname?: string
    rootDir: string
    watch?: boolean
  }

  export interface Server {
    url: string
    port: number
    hostname: string
    stop: () => Promise<void>
  }

  const MIME_TYPES: Record<string, string> = {
    ".html": "text/html",
    ".htm": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".ts": "application/typescript",
    ".jsx": "application/javascript",
    ".tsx": "application/typescript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".pdf": "application/pdf",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".webmanifest": "application/manifest+json",
  }

  function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    return MIME_TYPES[ext] || "application/octet-stream"
  }

  function injectLiveReload(html: string, port: number): string {
    const script = `
<script>
(function() {
  const ws = new WebSocket('ws://localhost:${port + 1}');
  ws.onmessage = function(event) {
    if (event.data === 'reload') {
      window.location.reload();
    }
  };
  ws.onclose = function() {
    console.log('[Observatory] Live reload disconnected');
  };
})();
</script>
`
    if (html.includes("</body>")) {
      return html.replace("</body>", `${script}</body>`)
    }
    return html + script
  }

  async function serveFile(
    filePath: string,
    res: ServerResponse,
    options: { injectReload?: boolean; reloadPort?: number } = {},
  ): Promise<void> {
    try {
      const stats = await stat(filePath)

      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, "index.html")
        try {
          await stat(indexPath)
          return serveFile(indexPath, res, options)
        } catch {
          // No index.html, serve directory listing
          return serveDirectory(filePath, res)
        }
      }

      const mimeType = getMimeType(filePath)
      res.setHeader("Content-Type", mimeType)
      res.setHeader("Cache-Control", "no-cache")

      if (options.injectReload && mimeType === "text/html" && options.reloadPort) {
        const content = await readFile(filePath, "utf-8")
        const injected = injectLiveReload(content, options.reloadPort)
        res.setHeader("Content-Length", Buffer.byteLength(injected))
        res.end(injected)
        return
      }

      res.setHeader("Content-Length", stats.size)
      const stream = createReadStream(filePath)
      stream.pipe(res)
    } catch (error) {
      res.statusCode = 404
      res.end("Not found")
    }
  }

  async function serveDirectory(dirPath: string, res: ServerResponse): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true })
      const files = entries
        .map((entry) => ({
          name: entry.name,
          isDir: entry.isDirectory(),
        }))
        .sort((a, b) => {
          if (a.isDir && !b.isDir) return -1
          if (!a.isDir && b.isDir) return 1
          return a.name.localeCompare(b.name)
        })

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Directory listing</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.5rem; border-bottom: 1px solid #eee; }
    li:hover { background: #f5f5f5; }
    a { text-decoration: none; color: #0066cc; }
    a:hover { text-decoration: underline; }
    .dir { font-weight: bold; }
  </style>
</head>
<body>
  <h1>📁 ${path.basename(dirPath) || "root"}</h1>
  <ul>
    ${files.map((f) => `<li><a href="${f.name}${f.isDir ? "/" : ""}" class="${f.isDir ? "dir" : ""}">${f.isDir ? "📁" : "📄"} ${f.name}${f.isDir ? "/" : ""}</a></li>`).join("")}
  </ul>
</body>
</html>
`
      res.setHeader("Content-Type", "text/html")
      res.end(html)
    } catch (error) {
      res.statusCode = 500
      res.end("Error reading directory")
    }
  }

  export async function start(options: Options): Promise<Server> {
    const port = options.port || 3456
    const hostname = options.hostname || "localhost"

    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`)
      const pathname = decodeURIComponent(url.pathname)

      // Security: prevent directory traversal
      const requestedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "")
      const filePath = path.join(options.rootDir, requestedPath)

      // Ensure the path is within rootDir
      if (!filePath.startsWith(path.resolve(options.rootDir))) {
        res.statusCode = 403
        res.end("Forbidden")
        return
      }

      log.info("request", { method: req.method, path: pathname })

      if (req.method === "GET") {
        await serveFile(filePath, res, {
          injectReload: options.watch,
          reloadPort: port + 1,
        })
      } else {
        res.statusCode = 405
        res.end("Method not allowed")
      }
    })

    return new Promise((resolve, reject) => {
      server.listen(port, hostname, () => {
        log.info("server started", { hostname, port })
        resolve({
          url: `http://${hostname}:${port}`,
          port,
          hostname,
          stop: () => {
            return new Promise((res) => {
              server.close(() => {
                log.info("server stopped")
                res()
              })
            })
          },
        })
      })

      server.on("error", (error) => {
        reject(error)
      })
    })
  }
}
