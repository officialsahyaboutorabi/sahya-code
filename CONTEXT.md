# Sahya Code - Project Context & Memory

**Last Updated:** 2026-04-01  
**Current Version:** 1.1.2  
**Repository:** https://github.com/officialsahyaboutorabi/sahya-code  
**PyPI:** https://pypi.org/project/sahya-code/

---

## Project Overview

Sahya Code is a fork of kimi-cli (v1.28.0) adapted for use with LiteLLM and other OpenAI-compatible endpoints. It provides an AI coding companion with a terminal-based UI.

### Key Differentiators from kimi-cli
- LiteLLM integration (nexiant.ai endpoint)
- Multi-provider support ( configurable via `/provider`, `/apikey`, `/url`)
- Modern UI with opencode-inspired prompt symbols
- 35+ skills transferred from kimi-cli

---

## Architecture

### Core Components

```
src/sahya_code/
├── auth/           # Authentication & platform management
│   ├── oauth.py   # OAuth flow, model selection
│   └── platforms.py # ModelInfo, refresh_openai_legacy_models()
├── config.py      # Pydantic configuration models
├── llm.py         # LLM factory, thinking capability handling
├── soul/          # Core agent logic
│   ├── sahyasoul.py # Main soul implementation
│   └── slash.py   # Slash command registry
└── ui/shell/      # Terminal UI
    ├── prompt.py  # Prompt rendering, bottom toolbar
    ├── slash.py   # Slash command implementations
    ├── __init__.py # Shell class, welcome banner
    └── theme.py   # Color themes (dark/light)
```

### Model Key Format
- **Simple IDs:** `kimi-k2.5` (NOT `sahya:kimi-k2.5`)
- This prevents "Default model not found" errors

### Thinking Capability
- LiteLLM reports `supports_reasoning=true` but doesn't support `reasoning_effort` parameter
- We handle this gracefully with try-except in `_apply_thinking_safe()`
- Models with `thinking` in name get `always_thinking` capability

---

## Current UI Design (v1.1.2)

### Prompt Symbols
| Mode | Symbol | Style Class |
|------|--------|-------------|
| Normal | `❯` | `prompt-symbol` (blue) |
| Thinking | `◉` | `prompt-symbol-thinking` (purple) |
| Plan | `◉` | `prompt-symbol-plan` (amber) |
| Shell | `[shell] ❯` | `prompt-mode-shell` + `prompt-symbol-shell` (green) |

### Layout
```
╭──────────────────────────────────────────────────────────────╮
│  Welcome to Sahya Code CLI                                   │
│  Send /help for help information.                            │
│                                                              │
│  Directory: ~/projects                                       │
│  Session: abc123                                             │
│  Model: kimi-k2.5                                            │
╰──────────────────────────────────────────────────────────────╯

User: what's the weather?

Assistant: The weather is sunny today.

────────────────────────────────────────────────────────────────
❯ _

yolo  agent (kimi-k2.5 ●)  ~/projects  main*  tip: press tab to complete
                                                     context: 10.8% (13.8k/128k)
```

### Theme Colors (Dark Mode)
- `prompt-symbol`: `#4f9fff` (blue)
- `prompt-symbol-thinking`: `#a855f7` (purple)
- `prompt-symbol-plan`: `#f59e0b` (amber)
- `prompt-symbol-shell`: `#10b981` (green)
- `running-prompt-separator`: `#4a5568` (gray)

---

## Configuration

### Default Config Location
`~/.local/share/sahya-code/config.toml`

### Environment Variables
- `SAHYA_API_KEY` - API key for authentication
- `SAHYA_BASE_URL` - Override endpoint URL (default: https://llm.nexiant.ai)

### Provider Types
- `openai_legacy` - For LiteLLM endpoints
- Future: `ollama` for Ollama endpoints

---

## Slash Commands

### Configuration Management (v1.0.10+)
| Command | Description |
|---------|-------------|
| `/apikey <provider>` | Set API key interactively (password input) |
| `/url <provider> [url]` | View or change base URL for provider |
| `/provider` | Switch between configured providers |

### Other Commands
| Command | Description |
|---------|-------------|
| `/model` | Switch LLM model or toggle thinking |
| `/theme` | Toggle dark/light theme |
| `/yolo` | Toggle auto-approve mode |
| `/plan` | Toggle plan mode |
| `/task` | Browse background tasks |
| `/sessions` | List and resume sessions |
| `/clear` | Clear context |
| `/help` | Show help |

---

## Skills (35 Total)

Located in: `src/sahya_code/skills/`

### Key Skills
- **agency-agents** - Production-ready agent personas
- **brainstorming** - Structured idea generation
- **code-review** - Automated code review
- **frontend-design** - UI/UX design principles
- **impeccable-design** - High-quality frontend patterns
- **react-best-practices** - React/Next.js optimization
- **system-design** - Distributed system design
- **test-driven-development** - TDD workflows
- **ui-developer** - Composite UI skill
- **writing-plans** - Implementation planning

### Custom Skills
- **sahya-code-cli-help** - Sahya-specific CLI help

---

## Version History

### v1.1.2 (2026-04-01) - CURRENT
- Simplified opencode-style UI
- Modern prompt symbols: ❯, ◉
- Fixed welcome logo wrapping
- Clean single-line prompt

### v1.1.1 (2026-04-01)
- Reverted UI changes (temporary)

### v1.1.0 (2026-04-01)
- Attempted bordered input box (reverted)
- Modern symbols kept

### v1.0.10 (2026-04-01)
- Added `/apikey`, `/url`, `/provider` commands
- Multi-provider support

### v1.0.9 (2026-04-01)
- Re-enabled thinking capability
- Graceful error handling for LiteLLM

### v1.0.6-1.0.8 (2026-04-01)
- Logo improvements (responsive sizes)
- Skills transfer from kimi-cli

---

## Development Setup

### Local Development
```bash
cd /Users/sahyaboutorabi/Documents/sahya-code-dev
uv build
uv tool install --force --python python3.12 dist/sahya_code-1.1.2-py3-none-any.whl
```

### Publishing to PyPI
```bash
uv build
UV_PUBLISH_TOKEN="pypi-..." uv publish dist/sahya_code-1.1.2-py3-none-any.whl dist/sahya_code-1.1.2.tar.gz
```

### Installing from PyPI
```bash
uv cache clean sahya-code
uv tool install sahya-code==1.1.2 --python python3.12
```

---

## Known Issues & TODO

### Current Limitations
1. **PyPI cache delay** - New versions take ~5-10 minutes to be installable
2. **LiteLLM thinking** - Provider reports `supports_reasoning=true` but doesn't support `reasoning_effort` parameter
3. **Logo rendering** - Panel width must be carefully managed to prevent wrapping

### Future Enhancements
- [ ] Add Ollama provider support (apisahyagpt.qzz.io)
- [ ] Improve bordered input box (find way to render bottom border)
- [ ] Add more slash commands for configuration
- [ ] Create web UI version
- [ ] Add plugin system

---

## Important Notes

### Model Capability Detection
```python
@property
def capabilities(self) -> set[ModelCapability]:
    caps: set[ModelCapability] = set()
    if self.supports_reasoning:
        caps.add("thinking")
    if "thinking" in self.id.lower():
        caps.update(("thinking", "always_thinking"))
    if self.supports_image_in:
        caps.add("image_in")
    if self.supports_video_in:
        caps.add("video_in")
    if "kimi-k2.5" in self.id.lower():
        caps.update(("image_in", "video_in"))
    return caps
```

### Thinking Error Handling
```python
def _apply_thinking_safe(chat_provider, effort: str) -> Any:
    try:
        return chat_provider.with_thinking(effort)
    except Exception as exc:
        logger.warning("Provider does not support reasoning_effort: {error}", error=exc)
        return chat_provider
```

---

## Git Workflow

### Branches
- `main` - Production releases

### Commit Messages
Format: `vX.Y.Z: Brief description`

Example:
```
v1.1.2: Fix UI - simplified opencode-style design

- Removed problematic bordered input box
- Kept modern prompt symbols
- Fixed welcome logo wrapping
```

---

## Resources

- **Original:** https://github.com/moonshot-ai/kimi-cli (v1.28.0)
- **Fork:** https://github.com/officialsahyaboutorabi/sahya-code
- **LiteLLM:** https://llm.nexiant.ai
- **Inspiration:** https://github.com/anomalyco/opencode

---

*This file should be updated whenever significant changes are made to the project architecture, UI, or configuration.*
