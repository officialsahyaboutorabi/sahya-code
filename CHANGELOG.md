# Changelog

All notable changes to Sahya Code will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Ollama provider support for apisahyagpt.qzz.io endpoint
- Improved bordered input box design
- Web UI version

## [1.1.2] - 2026-04-01

### Changed
- **UI Refresh**: Modernized prompt design inspired by opencode
  - New prompt symbols: `❯` (normal), `◉` (thinking/plan mode)
  - Shell mode shows `[shell] ❯` prefix with green styling
  - Color-coded by mode: blue (normal), purple (thinking), amber (plan), green (shell)
  - Horizontal separator line above prompt for visual clarity
  - Simplified from bordered box approach (couldn't render bottom border properly)

### Fixed
- Welcome logo no longer wraps on standard terminal widths
- Changed Panel from `expand=True` to `expand=False` with dynamic padding
- Single-line prompt design works reliably with prompt_toolkit

## [1.1.1] - 2026-04-01

### Reverted
- Temporarily reverted UI changes due to rendering issues
- (Restored in v1.1.2 with fixes)

## [1.1.0] - 2026-04-01

### Added
- Experimental opencode-style bordered input box (╭─╮│╰─╯)
- Modern prompt symbols: ❯, ◉

### Changed
- Bottom toolbar restyled as "control bar" with color-coded sections

### Removed
- Bordered box approach (didn't work with prompt_toolkit lifecycle)

## [1.0.10] - 2026-04-01

### Added
- **Configuration Management Slash Commands**:
  - `/apikey <provider>` - Set API key for a provider interactively (secure password input)
  - `/url <provider> [url]` - View or change base URL for a provider
  - `/provider` - Switch between configured providers interactively
- Multi-provider support for switching between LiteLLM and other endpoints
- Config changes trigger automatic session reload

## [1.0.9] - 2026-04-01

### Fixed
- **Thinking Capability Re-enabled**:
  - Models with `supports_reasoning=true` now get the "thinking" capability
  - Added graceful error handling for providers that don't support `reasoning_effort` parameter
  - Try-except wrapper in `_apply_thinking_safe()` logs warning but continues without thinking
  - Works with LiteLLM which reports reasoning support but doesn't implement the parameter

## [1.0.8] - 2026-04-01

### Changed
- Simplified compact logo to just the letter "S" for narrow terminals

## [1.0.7] - 2026-04-01

### Fixed
- **Responsive Welcome Logo**:
  - Four logo variants based on terminal width:
    - Full (80+ columns) - Complete "Sahya Code" ASCII art
    - Medium (60-79 columns) - Boxed version
    - Compact (30-59 columns) - Just "S" letter
    - Minimal (<30 columns) - Text only
  - Prevents ASCII art from breaking on narrow terminals

## [1.0.6] - 2026-04-01

### Added
- **Skills Transfer from kimi-cli**:
  - Transferred all 34 skills to sahya-code
  - Created new `sahya-code-cli-help` skill for Sahya-specific documentation
  - Updated skill-creator and impeccable-design skills to reference "Sahya" instead of "Kimi"

### Skills List
- agency-agents, brainstorm-ideas, brainstorming, code-review
- commit-commands, computer-forensics, create-prd
- dispatching-parallel-agents, executing-plans
- finishing-a-development-branch, frontend-design
- generic-fast-container-build, impeccable-design
- info-leakage-prevention, react-best-practices
- receiving-code-review, requesting-code-review
- safe-encryption, secure-data-handling
- secure-model-deployment, security-guidance
- self-improving-agent, skill-creator
- subagent-driven-development, system-design
- systematic-debugging, test-driven-development
- threat-hunting, ui-developer, using-git-worktrees
- using-superpowers, verification-before-completion
- writing-plans, writing-skills

## [1.0.5] - 2026-04-01

### Fixed
- Model key format changed from `sahya:kimi-k2.5` to `kimi-k2.5`
- Fixes "Default model not found" errors

## [1.0.4] - 2026-04-01

### Fixed
- `refresh_openai_legacy_models()` now fetches from `/v1/models` endpoint correctly

## [1.0.3] - 2026-04-01

### Added
- LiteLLM endpoint configuration (https://llm.nexiant.ai)

## [1.0.0] - 2026-04-01

### Added
- Initial fork from kimi-cli v1.28.0
- Rebranded to "Sahya Code"
- Basic LiteLLM integration

---

## Version History Summary

| Version | Date | Key Change |
|---------|------|------------|
| 1.1.2 | 2026-04-01 | Modern UI with ❯ ◉ symbols |
| 1.1.1 | 2026-04-01 | Temporary revert |
| 1.1.0 | 2026-04-01 | Bordered box experiment |
| 1.0.10 | 2026-04-01 | `/apikey`, `/url`, `/provider` commands |
| 1.0.9 | 2026-04-01 | Thinking capability fixed |
| 1.0.6-1.0.8 | 2026-04-01 | Skills & logo improvements |
| 1.0.0-1.0.5 | 2026-04-01 | Initial fork & setup |

---

*See [CONTEXT.md](./CONTEXT.md) for detailed project documentation.*
