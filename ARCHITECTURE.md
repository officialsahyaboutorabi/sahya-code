# Sahya Code Architecture

## Overview

Sahya Code is a CLI-based AI coding agent forked from [kimi-cli](https://github.com/MoonshotAI/kimi-cli). It provides an interactive terminal interface for AI-assisted software development tasks, configured to work with a custom LiteLLM endpoint.

## System Architecture

### Core Components

#### 1. CLI Layer (`cli/`)
- **Entry Point:** `__main__.py` - Application entry point
- **Command Router:** `__init__.py` - Typer-based CLI with subcommands
- **Subcommands:**
  - `web.py` - Web interface server
  - `vis.py` - Visualization/tracing interface
  - `mcp.py` - MCP (Model Context Protocol) management
  - `plugin.py` - Plugin management
  - `export.py` - Session export functionality
  - `info.py` - System information

#### 2. Agent System (`soul/`)
- **SahyaSoul:** (`sahyasoul.py`) Main agent orchestration class
- **Runtime:** (`agent.py`) Execution environment for agents
- **Context:** (`context.py`) Session context management
- **Toolset:** (`toolset.py`) Available tools registry
- **Slash Commands:** (`slash.py`) Interactive command processing
- **Dynamic Injections:** Plan mode and YOLO mode behavior modifiers

#### 3. LLM Integration (`llm.py`)
- **Provider Abstraction:** Via kosong library supporting multiple backends
- **Supported Providers:**
  - `openai_legacy` - OpenAI-compatible API (used for LiteLLM)
  - `openai_responses` - OpenAI Responses API
  - `anthropic` - Claude/Anthropic API
  - `gemini` - Google Gemini API
  - `vertexai` - Google Vertex AI
- **Custom Configuration:** Pre-configured for LiteLLM endpoint
- **Capabilities:** Model capability detection (image_in, video_in, thinking, always_thinking)

#### 4. Configuration (`config.py`)
- **Pydantic Models:** Type-safe configuration validation
- **Format Support:** TOML and JSON configuration files
- **Structure:**
  - `LLMProvider` - Provider endpoint configuration
  - `LLMModel` - Model-specific settings
  - `LoopControl` - Agent execution limits
  - `BackgroundConfig` - Background task settings
  - `MCPConfig` - MCP client configuration
- **Default Location:** `~/.local/share/sahya-code/config.toml`

#### 5. Tools (`tools/`)
- **File Operations:**
  - `file/read.py` - Read text files
  - `file/read_media.py` - Read images/videos
  - `file/write.py` - Write files
  - `file/replace.py` - String replacement
  - `file/glob.py` - File pattern matching
  - `file/grep_local.py` - Content search
- **Shell:** (`shell/__init__.py`) Command execution
- **Web:**
  - `web/search.py` - Web search
  - `web/fetch.py` - Web page fetching
- **Agent:** (`agent/__init__.py`) Subagent delegation
- **User Interaction:** (`ask_user/__init__.py`) Interactive prompts
- **Background:** (`background/__init__.py`) Background task management
- **Planning:** (`plan/`, `think/`) Planning and thinking tools

#### 6. Wire Protocol (`wire/`)
- **Communication:** Client/server messaging
- **JSON-RPC:** (`jsonrpc.py`) RPC protocol implementation
- **File Transfer:** (`file.py`) File upload/download
- **Approval System:** Integration with approval runtime
- **Types:** (`types.py`) Message type definitions

#### 7. Web UI (`web/`)
- **Framework:** FastAPI-based web interface
- **API Endpoints:** (`api/`) REST API for sessions, config
- **Session Management:** (`store/sessions.py`) Session persistence
- **Real-time:** WebSocket communication
- **Authentication:** (`auth.py`) OAuth and API key handling

#### 8. Subagents (`subagents/`)
- **Builder:** (`builder.py`) Code implementation agent
- **Explorer:** (`registry.py`, `core.py`) Codebase exploration
- **Store:** (`store.py`) Subagent instance management
- **Runner:** (`runner.py`) Execution coordination
- **Git Context:** (`git_context.py`) Git integration

#### 9. Skills System (`skills/`)
- **Modular Skills:** YAML-based skill definitions
- **Loading:** Dynamic skill discovery and loading
- **Built-in Skills:**
  - `kimi-cli-help` - Help documentation
  - `skill-creator` - Skill creation guidance
  - `writing-plans` - Plan writing assistance
  - And more...

## Data Flow

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   CLI    │────▶│ SahyaSoul   │────▶│   LLM       │
│   Input     │     │  (Typer) │     │   (Agent)   │     │  Provider   │
└─────────────┘     └──────────┘     └──────┬──────┘     └─────────────┘
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                        ┌─────────┐   ┌─────────┐   ┌─────────┐
                        │  Tools  │   │  Shell  │   │   Web   │
                        │         │   │         │   │         │
                        └────┬────┘   └────┬────┘   └────┬────┘
                             │             │             │
                             └─────────────┴─────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │     Tool Results         │
                              │  (Returned to Agent)     │
                              └────────────┬─────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │  Response to User        │
                              └──────────────────────────┘
```

## Custom Provider Configuration

### LiteLLM Endpoint Setup

Sahya Code is pre-configured to work with LiteLLM proxy endpoints:

**Default Configuration:**
- **Endpoint URL:** `https://llm.nexiant.ai`
- **Protocol:** OpenAI-compatible API (`openai_legacy`)
- **Authentication:** Bearer token in Authorization header

**Environment Variables:**
```bash
# Required: API key for authentication
export SAHYA_API_KEY="sk-VBkuXAOO7e2kV5-uWpz84A"

# Optional: Override endpoint URL
export SAHYA_BASE_URL="https://llm.nexiant.ai"

# Optional: Model-specific settings
export SAHYA_MODEL_NAME="gpt-4o"
export SAHYA_MODEL_MAX_CONTEXT_SIZE="128000"
```

**Configuration File (`~/.local/share/sahya-code/config.toml`):**
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

## Security Considerations

1. **API Key Storage:**
   - Keys stored using Pydantic `SecretStr` (masked in logs)
   - Config file should have restricted permissions (600)
   - Support for keyring integration

2. **OAuth Support:**
   - OAuth2 flow for enterprise authentication
   - Token refresh handling
   - Secure credential storage

3. **Sandboxing:**
   - Shell commands run in user context
   - File operations restricted to working directory
   - Approval system for destructive operations

## Extension Points

### 1. MCP (Model Context Protocol)
- **Purpose:** Connect external tools and data sources
- **Configuration:** Via `sahya mcp` commands or config file
- **Transport:** HTTP or stdio
- **Authentication:** OAuth or API keys

### 2. Plugin System
- **Location:** `plugin/`
- **Manager:** `plugin/manager.py`
- **Tools:** Custom tool registration
- **Lifecycle:** Load, enable, disable hooks

### 3. Hook System
- **Configuration:** `hooks/config.py`
- **Engine:** `hooks/engine.py`
- **Runner:** `hooks/runner.py`
- **Use Cases:** Custom pre/post processing

### 4. Custom Agents
- **Definition:** YAML files in `agents/`
- **Inheritance:** Extend base agents
- **Tools:** Custom tool sets
- **Prompts:** Custom system prompts

## Directory Structure

```
sahya-code/
├── src/sahya_code/          # Main package
│   ├── agents/              # Default agent definitions
│   ├── cli/                 # CLI implementation
│   ├── soul/                # Agent runtime
│   ├── tools/               # Built-in tools
│   ├── wire/                # Communication protocol
│   ├── web/                 # Web UI
│   ├── subagents/           # Subagent system
│   ├── skills/              # Built-in skills
│   ├── ui/                  # User interfaces
│   ├── utils/               # Utility functions
│   └── config.py            # Configuration management
├── tests/                   # Unit tests
├── tests_e2e/              # End-to-end tests
├── docs/                    # Documentation
└── pyproject.toml          # Package configuration
```

## Technology Stack

- **Python:** 3.12+ (type hints, modern syntax)
- **Pydantic:** Configuration validation and serialization
- **Typer:** CLI framework
- **Rich:** Terminal formatting and UI
- **Kosong:** LLM provider abstraction
- **FastAPI:** Web UI backend
- **WebSockets:** Real-time communication
- **TOML:** Configuration file format

## Performance Considerations

1. **Context Management:**
   - Automatic context compaction at 85% capacity
   - Configurable reserved tokens for responses
   - Session state persistence

2. **Background Tasks:**
   - Async execution with configurable limits
   - Heartbeat monitoring
   - Automatic cleanup

3. **Caching:**
   - File content caching
   - Web fetch caching
   - Config file caching

## Development Guidelines

1. **Type Safety:** Strict type checking with Pyright
2. **Error Handling:** Structured exceptions with context
3. **Logging:** Loguru-based with rotation and retention
4. **Testing:** pytest with async support
5. **Code Style:** Ruff for linting and formatting
