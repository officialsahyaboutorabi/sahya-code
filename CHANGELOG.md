# Changelog

All notable changes to Sahya Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.9] - 2026-04-01

### Fixed
- Re-enabled thinking capability with graceful error handling for LiteLLM
- Models that report `supports_reasoning=true` now get the "thinking" capability
- Added try-except blocks around `with_thinking()` calls to handle providers that don't support `reasoning_effort` parameter
- Warning is logged but app continues working if provider doesn't support thinking

## [1.0.8] - 2026-04-01

### Changed
- Simplified compact logo to just the letter "S" for narrow terminals

## [1.0.7] - 2026-04-01

### Fixed
- Improved welcome logo with responsive sizes for different terminal widths
- Four logo variants: Full (80+ cols), Medium (60-79 cols), Compact (30-59 cols), Minimal (<30 cols)
- Prevents ASCII art from breaking on narrow terminals

## [1.0.6] - 2026-04-01

### Added
- Transferred all 34 skills from kimi-cli
- New `sahya-code-cli-help` skill for Sahya-specific help
- Skills include: agency-agents, code-review, system-design, react-best-practices, etc.

### Changed
- Updated skill-creator and impeccable-design skills to reference "Sahya" instead of "Kimi"
- Removed kimi-cli-help and old sahyacode-cli-help skills

## [1.0.5] - 2026-04-01

### Fixed
- Fixed model key format for openai_legacy providers (LiteLLM)
- Model keys now use just the model ID without provider prefix (e.g., "kimi-k2.5" not "sahya:kimi-k2.5")
- This fixes the "Default model not found in models" configuration error

## [1.0.4] - 2026-04-01

### Fixed
- LiteLLM integration fixes
- Disabled auto-thinking capability due to LiteLLM not supporting `reasoning_effort` parameter
- Added `refresh_openai_legacy_models()` to fetch all available models from LiteLLM endpoint
- Fixed Rich markup syntax in welcome text (use `[/]` instead of `[/bold]`)
- Made welcome text theme-aware (white in dark theme, black in light theme)
- Rebranded /feedback description from "Kimi Code CLI" to "Sahya Code CLI"
- Fixed pyproject.toml module-name format for uv compatibility

## [1.0.3] - 2026-04-01

### Added
- `sahya-code update` command to easily upgrade to the latest version
- Uses `uv tool upgrade` if available, falls back to `pip install -U`

## [1.0.2] - 2026-04-01

### Added
- Custom SAHYA ASCII art banner
- Install script at https://sbgpt.qzz.io/install.sh

### Fixed
- Updated agent YAML tool paths from `kimi_cli.tools` to `sahya_code.tools`

## [1.0.1] - 2026-04-01

### Changed
- Version output now shows "sahya-code" instead of "sahya"
- Documentation updated to use `sahya-code` command consistently
- README clarifies API key is for Nexiant LLM server

## [1.0.0] - 2026-04-01

### Added
- Initial release based on kimi-cli v1.28.0
- Custom LiteLLM endpoint support (https://llm.nexiant.ai)
- API key authentication via SAHYA_API_KEY environment variable
- Full rebranding from Kimi Code CLI to Sahya Code
- Pre-configured OpenAI-compatible provider for LiteLLM proxy
- Support for SAHYA_BASE_URL environment variable

### Changed
- **Package name:** `kimi-cli` → `sahya-code`
- **Module name:** `kimi_cli` → `sahya_code`
- **CLI command:** `kimi` → `sahya-code`
- **Config directory:** `~/.local/share/kimi` → `~/.local/share/sahya-code`
- **Log file:** `kimi.log` → `sahya.log`
- **Environment variable prefix:** `KIMI_*` → `SAHYA_*`
- **Main class:** `KimiCLI` → `SahyaCode`
- **Soul class:** `KimiSoul` → `SahyaSoul`
- **User agent:** `KimiCLI/*` → `SahyaCode/*`
- **Application name:** "Kimi Code CLI" → "Sahya Code"

### Configuration

#### Default Provider
- Type: `openai_legacy` (OpenAI-compatible API for LiteLLM)
- Endpoint: `https://llm.nexiant.ai`
- Default Model: `kimi-k2.5`
- Authentication: API key via `SAHYA_API_KEY`

#### Environment Variables
- `SAHYA_API_KEY` - API key for authentication (required)
- `SAHYA_BASE_URL` - Endpoint URL override (optional)
- `SAHYA_SHARE_DIR` - Custom share directory (optional)
- `SAHYA_CACHE_DIR` - Custom cache directory (optional)

#### Config File Location
- Default: `~/.local/share/sahya-code/config.toml`
- Format: TOML (JSON also supported)

### Removed
- Kimi-specific default configurations
- Moonshot AI-specific provider defaults
- Kimi-specific environment variable fallbacks

### Dependencies
Same as kimi-cli v1.28.0:
- Python >= 3.12
- kosong[contrib] == 0.47.0
- pydantic == 2.12.5
- typer == 0.21.1
- And other dependencies (see pyproject.toml)

## Original kimi-cli History

For complete history of the original project, see:
https://github.com/MoonshotAI/kimi-cli/blob/main/CHANGELOG.md

---

## Migration Guide

### From kimi-cli to sahya-code

1. **Uninstall kimi-cli:**
   ```bash
   pip uninstall kimi-cli
   ```

2. **Install sahya-code:**
   ```bash
   pip install sahya-code
   ```

3. **Update environment variables:**
   ```bash
   # Old
   export KIMI_API_KEY="..."
   
   # New
   export SAHYA_API_KEY="..."
   ```

4. **Migrate configuration:**
   ```bash
   # Copy old config (optional)
   mkdir -p ~/.local/share/sahya-code
   cp ~/.local/share/kimi/config.toml ~/.local/share/sahya-code/config.toml
   
   # Update config values
   sed -i '' 's/kimi/sahya/g' ~/.local/share/sahya-code/config.toml
   ```

5. **Update aliases:**
   ```bash
   # Old
   alias ai='kimi'
   
   # New
   alias ai='sahya'
   ```
