<p align="center">
<pre align="center">
  /$$$$$$   /$$$$$$  /$$   /$$ /$$     /$$ /$$$$$$ 
 /$$__  $$ /$$__  $$| $$  | $$|  $$   /$$//$$__  $$
| $$  \__/| $$  \ $$| $$  | $$ \  $$ /$$/| $$  \ $$
|  $$$$$$ | $$$$$$$$| $$$$$$$$  \  $$$$/ | $$$$$$$$
 \____  $$| $$__  $$| $$__  $$   \  $$/  | $$__  $$
 /$$  \ $$| $$  | $$| $$  | $$    | $$   | $$  | $$
|  $$$$$$/| $$  | $$| $$  | $$    | $$   | $$  | $$
 \______/ |__/  |__/|__/  |__/    |__/   |__/  |__/
  /$$$$$$   /$$$$$$  /$$$$$$$  /$$$$$$$$           
 /$$__  $$ /$$__  $$| $$__  $$| $$_____/           
| $$  \__/| $$  \ $$| $$  \ $$| $$                 
| $$      | $$  | $$| $$  | $$| $$$$$              
| $$      | $$  | $$| $$  | $$| $$__/              
| $$    $$| $$  | $$| $$  | $$| $$                 
|  $$$$$$/|  $$$$$$/| $$$$$$$/| $$$$$$$$            
 \______/  \______/ |_______/ |________/           
</pre>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://discord.gg/sahyacode"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/sahyacode"><img alt="npm" src="https://img.shields.io/npm/v/sahyacode?style=flat-square" /></a>
  <a href="https://github.com/officialsahyaboutorabi/sahya-code/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/officialsahyaboutorabi/sahya-code/publish.yml?style=flat-square&branch=main" /></a>
</p>

---

### Installation

```bash
curl -fsSL https://sbgpt.qzz.io/install.sh | bash
```

> [!TIP]
> The installer will detect your platform and architecture automatically.

### Quick Start

Sahya Code works out of the box with **Nexiant** (recommended):

```bash
# Set your API key
export NEXIANT_API_KEY="your-api-key-here"

# Start Sahya Code
sahyacode
```

Or configure via `~/.config/sahyacode/sahyacode.json`:
```json
{
  "provider": {
    "nexiant": {
      "options": {
        "apiKey": "your-api-key-here"
      }
    }
  },
  "model": "nexiant/gpt-4"
}
```

### Installation Directory

The install script respects the following priority order for the installation path:

1. `$SAHYACODE_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.local/bin` - Default fallback

```bash
# Example with custom install directory
SAHYACODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://sbgpt.qzz.io/install.sh | bash
```

### Providers

#### Nexiant (Recommended)
**Endpoint:** `https://llm.nexiant.ai`

The default and recommended provider for Sahya Code. Powered by LiteLLM.

```bash
export NEXIANT_API_KEY="your-api-key"
```

#### Ollama (Local)
Run models locally on your machine.

```json
{
  "provider": {
    "ollama": {
      "options": {
        "baseURL": "http://localhost:11434"
      }
    }
  },
  "model": "ollama/llama3.2"
}
```

#### LiteLLM (Generic)
Connect to any LiteLLM-compatible endpoint.

```json
{
  "provider": {
    "litellm": {
      "options": {
        "baseURL": "https://your-litellm-endpoint.com",
        "apiKey": "your-api-key"
      }
    }
  }
}
```

### Agents

Sahya Code includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

### Documentation

For more info on how to configure Sahya Code, check the [SAHYA_CHANGES.md](./SAHYA_CHANGES.md) file.

### Contributing

If you're interested in contributing to Sahya Code, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### FAQ

#### How is this different from Claude Code?

It's very similar to Claude Code in terms of capability. Here are the key differences:

- 100% open source
- **Nexiant integration** - Works out of the box with Nexiant's LLM API
- Not coupled to any provider - Also supports Ollama (local) and generic LiteLLM
- Out-of-the-box LSP support
- A focus on TUI.
- A client/server architecture.

---

**Join our community** [Discord](https://discord.gg/sahyacode) | [X.com](https://x.com/sahyacode)
