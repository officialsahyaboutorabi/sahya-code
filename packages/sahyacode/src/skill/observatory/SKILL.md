---
name: observatory
description: Live observatory mode — build projects incrementally with live browser preview at http://localhost:3456/
---

The user has opened the Observatory live preview. The browser at http://localhost:3456/ mirrors every file you write in real time.

## Your two directories

| | Path | Role |
|---|---|---|
| **Live-view** | `/Users/sahyaboutorabi/live-view` | **Write files here** — The browser serves from this directory. All project files should be written directly to this location. |
| **Project** | The active session directory | Original project location — files will be copied here after the build is complete. |

## Rules for building in Observatory mode

1. **Write `index.html` first** — even a bare skeleton. The browser waits for this file; the moment it appears the status page auto-navigates to the project preview.
   - **Write to:** `/Users/sahyaboutorabi/live-view/index.html`
   - **Important:** Always include `<meta charset="UTF-8">` as the first meta tag to avoid encoding issues

2. **Build incrementally, layer by layer** — each file write triggers a live browser reload. The user is watching. Make each step visible:
   - `/Users/sahyaboutorabi/live-view/index.html` — HTML skeleton with proper charset and viewport meta tags
   - `/Users/sahyaboutorabi/live-view/style.css` — layout, colours, typography
   - `/Users/sahyaboutorabi/live-view/main.js` / `app.js` — core interactivity
   - Additional pages, components, assets — all written to `/Users/sahyaboutorabi/live-view/`

3. **Always write to the live-view directory** — Write all files directly to `/Users/sahyaboutorabi/live-view/`. The browser serves from here and will show changes immediately.

4. **Never hardcode the project directory path** — The project directory is for final copy only. All live building happens in live-view.

## HTML Template (Standard)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
  <script src="main.js"></script>
</body>
</html>
```

## React Projects

For React projects in Observatory mode, you have several options:

### Option 1: React via CDN (Quick Prototyping)

Write a single HTML file that loads React from CDN with Babel standalone for JSX:

**`/Users/sahyaboutorabi/live-view/index.html`**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    /* Write CSS here or link to style.css */
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // Write React code here
    function App() {
      return <h1>Hello React!</h1>;
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>
```

### Option 2: Vite Dev Server (Full React Project)

If the project uses Vite, start the dev server and Observatory will proxy it:

```bash
cd /Users/sahyaboutorabi/live-view
npm create vite@latest . -- --template react
npm install
npm run dev
```

The Observatory will detect the dev server and show it in the preview.

### Option 3: Pre-built React Files

If you have a build process, write the built files to live-view:

```html
<!-- /Users/sahyaboutorabi/live-view/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <link rel="stylesheet" href="./assets/index-abc123.css">
</head>
<body>
  <div id="root"></div>
  <script src="./assets/index-abc123.js" type="module"></script>
</body>
</html>
```

## Voice Mode in Observatory

SahyaCode supports voice interactions that can be used alongside Observatory mode:

- **Speech-to-Text (STT)**: Record audio and transcribe it to text using OpenAI Whisper API
- **Text-to-Speech (TTS)**: Have the assistant speak responses aloud

### Requirements

- **macOS** with `sox` installed (`brew install sox`) for microphone support
- **OpenAI API key** set in `OPENAI_API_KEY` environment variable

### Using Voice with Observatory

Voice mode works in parallel with Observatory:

1. **In Chat**: Use voice commands to describe what you want to build
2. **In Observatory**: The browser will live-reload as files are written based on your voice input
3. **Combined**: Speak naturally — the transcription will be processed as your input while you watch the live preview

To use voice mode, run the voice command before or during your Observatory session.

## After the build is complete

Tell the user:
- The browser at http://localhost:3456/ shows the finished project
- They can click **"Move to Original Location"** in the browser to copy all files back to the project directory
- They can visit **http://localhost:3456/~observatory/replay** for an animated code-editor playback of the entire build

## Summary

```
/observe          → browser opens at http://localhost:3456/
write index.html  → browser navigates from waiting page to project
write each file   → browser live-reloads; user watches build happen
done              → tell user about "Move to Original Location" + replay
```
