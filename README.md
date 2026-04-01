# Sahya Code

Sahya Code is a CLI-based AI coding agent that helps you write, edit, and understand code through natural language interaction. It is a customized fork of [kimi-cli](https://github.com/MoonshotAI/kimi-cli), pre-configured to work with LiteLLM endpoints.

## Features

- 🤖 AI-powered coding assistance
- 📝 Code reading, writing, and editing
- 🔍 Web search and fetch capabilities
- 🐚 Shell command execution
- 🔧 Extensible tool system with MCP support
- 💻 Terminal UI with rich formatting
- 🌐 Web interface for browser-based interaction

## Installation

```bash
pip install sahya-code
```

## Configuration

### API Key

Set your API key as an environment variable:

```bash
export SAHYA_API_KEY="sk-VBkuXAOO7e2kV5-uWpz84A"
```

Or configure interactively on first run using the setup wizard.

### Custom Endpoint

Sahya Code uses a LiteLLM-compatible endpoint by default:
- **URL:** `https://llm.nexiant.ai`
- **Protocol:** OpenAI-compatible API

To use a different endpoint:

```bash
export SAHYA_BASE_URL="https://your-endpoint.com"
```

### Configuration File

You can also configure via the config file at `~/.local/share/sahya-code/config.toml`:

```toml
default_model = "default"

[models.default]
provider = "sahya"
model = "kimi-k2.5"
max_context_size = 256000
capabilities = ["image_in", "thinking"]

[providers.sahya]
type = "openai_legacy"
base_url = "https://llm.nexiant.ai"
api_key = "sk-VBkuXAOO7e2kV5-uWpz84A"
```

## Usage

Start Sahya Code:

```bash
sahya
```

Or with a specific prompt:

```bash
sahya "Explain this codebase to me"
```

### Available Commands

```bash
sahya --help              # Show help
sahya --version           # Show version
sahya web                 # Start web interface
sahya mcp list            # List MCP servers
sahya mcp add <name> ...  # Add MCP server
```

### Interactive Commands

Once in the shell, you can use:

- `Ctrl+X` - Toggle between agent mode and shell mode
- `/help` - Show available slash commands
- `/exit` or `Ctrl+D` - Exit

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SAHYA_API_KEY` | API key for authentication | Required |
| `SAHYA_BASE_URL` | LiteLLM endpoint URL | `https://llm.nexiant.ai` |
| `SAHYA_SHARE_DIR` | Config and data directory | `~/.local/share/sahya-code` |
| `SAHYA_CACHE_DIR` | Cache directory | `~/.cache/sahya-code` |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [TODOLIST.md](TODOLIST.md) - Development roadmap

## Requirements

- Python 3.12 or higher
- API key for the LiteLLM endpoint

## Acknowledgments

Sahya Code is based on [kimi-cli](https://github.com/MoonshotAI/kimi-cli) by Moonshot AI.

## License

[Apache License 2.0](LICENSE)
