/**
 * Wraps a Mermaid diagram string in a self-contained HTML page that renders
 * it using the Mermaid.js CDN script.
 */
export function renderDiagramHTML(mermaid: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "loose",
    });
  </script>
  <style>
    *,
    *::before,
    *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      color: #212529;
      padding: 2rem;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      color: #343a40;
    }

    .diagram-container {
      background: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 2rem;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .mermaid {
      display: flex;
      justify-content: center;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="diagram-container">
    <pre class="mermaid">
${mermaid}
    </pre>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
