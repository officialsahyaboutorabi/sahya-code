---
name: sahyacode-cli-help
description: Answer Sahya Code CLI usage, configuration, and troubleshooting questions. Use when user asks about Sahya Code CLI installation, setup, configuration, slash commands, keyboard shortcuts, MCP integration, providers, environment variables, how something works internally, or any questions about Sahya Code CLI itself.
---

# Sahya Code CLI Help

Help users with Sahya Code CLI questions by consulting documentation and source code.

## Strategy

1. **Prefer official documentation** for most questions
2. **Read local source** when in sahya-code project itself, or when user is developing with sahya-code as a library (e.g., importing from `sahya_code` in their code)
3. **Clone and explore source** for complex internals not covered in docs - **ask user for confirmation first**

## Documentation

Base URL: `https://github.com/officialsahyaboutorabi/sahya-code`

### Topic Mapping

| Topic | Location |
|-------|----------|
| Installation, first run | `README.md` |
| Config files | `ARCHITECTURE.md` |
| Providers, models | `ARCHITECTURE.md` |
| Environment variables | `README.md` |
| CLI flags | `README.md` |

## Source Code

Repository: `https://github.com/officialsahyaboutorabi/sahya-code`

Key modules:
- `sahya_code.cli` - CLI entry points and commands
- `sahya_code.config` - Configuration management
- `sahya_code.llm` - LLM provider integration
- `sahya_code.soul` - Agent runtime
- `sahya_code.tools` - Built-in tools

## Common Questions

### Installation
```bash
pip install sahya-code
# or
curl -fsSL https://sbgpt.qzz.io/install.sh | bash
```

### Configuration
Set your Nexiant LLM API key:
```bash
export SAHYA_API_KEY="your-api-key"
export SAHYA_BASE_URL="https://llm.nexiant.ai"
```

### Usage
```bash
sahya-code                    # Interactive mode
sahya-code "Your prompt"      # One-shot mode
sahya-code web                # Web interface
sahya-code update             # Update to latest version
```

## Troubleshooting

- **Invalid tools error**: Check that config file uses correct tool paths
- **LLM provider error**: Verify API key and endpoint URL
- **Model not found**: Check model name in config matches available models
