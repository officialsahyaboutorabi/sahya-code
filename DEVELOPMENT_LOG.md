# Development Log - Sahya Code

This document tracks major development milestones and architectural decisions.

## 2026-04-01 - v1.1.0 Release

### Completed Work

#### 1. Opencode-Style Chat Input UI
**Design Inspiration:** https://github.com/anomalyco/opencode

**Visual Changes:**
- **Bordered Input Box**: Rounded corners using box-drawing characters (╭─╮│╰─╯)
- **Modern Prompt Symbols**: 
  - `❯` for normal input
  - `◉` for thinking/plan mode
  - Shell mode shows "shell" label in top border
- **Control Bar**: Restyled bottom toolbar with color-coded sections:
  - Agent indicator (blue)
  - Model name (purple)
  - Mode indicator (amber)
  - Git branch with status badges
  - Background task count
  - Context usage (right-aligned)

**Technical Implementation:**
- New theme classes in `theme.py`:
  - `input-box.border`, `input-box.border-focus`
  - `prompt-symbol-*` for different modes
  - `control-bar.*` for the bottom control bar
- Modified `prompt.py`:
  - Added box drawing constants
  - Updated `_render_agent_prompt_message()` for bordered box
  - Updated `_render_shell_prompt_message()` with mode label
  - Restyled `_render_bottom_toolbar()` as control bar
  - New `_render_agent_prompt_label()` with color-coded symbols

**Files Modified:**
- `src/sahya_code/ui/theme.py` - New color styles
- `src/sahya_code/ui/shell/prompt.py` - New rendering logic

---

## 2026-04-01 - v1.0.10 Release

### Completed Work

#### 1. Configuration Management Slash Commands
**New Commands Added:**
- `/apikey <provider>` - Interactively set API key for a provider
- `/url <provider> [url]` - View or change base URL for a provider
- `/provider` - Switch between configured providers interactively

**Implementation Details:**
- Commands added to both `registry` and `shell_mode_registry`
- Config changes trigger a session reload to apply immediately
- Interactive prompts for sensitive data (API keys use password input)
- Provider switching includes model selection from the new provider

**Files Modified:**
- `src/sahya_code/ui/shell/slash.py` - Added three new slash commands

### Use Cases
1. **Quick Provider Switching**: Switch between LiteLLM and Ollama endpoints without editing config files
2. **API Key Updates**: Update API keys securely without showing them in shell history
3. **URL Changes**: Point to different instances of the same provider type

---

## 2026-04-01 - v1.0.9 Release

### Completed Work

#### 1. LiteLLM Integration Fixes
**Problem:** LiteLLM reports `supports_reasoning=true` but doesn't support `reasoning_effort` parameter, causing "invalid arguments" errors.

**Solution:**
- Re-enabled thinking capability based on `supports_reasoning` flag
- Added try-except blocks around `with_thinking()` calls in `llm.py`
- Graceful degradation: logs warning but continues if provider doesn't support thinking
- Updated `oauth.py` to re-enable default thinking selection

**Files Modified:**
- `src/sahya_code/auth/platforms.py` - Re-enabled thinking capability
- `src/sahya_code/auth/oauth.py` - Re-enabled default thinking selection
- `src/sahya_code/llm.py` - Added graceful error handling

#### 2. Skills Transfer from kimi-cli
**Work Done:**
- Transferred 34 skills from kimi-cli to sahya-code
- Created new `sahya-code-cli-help` skill
- Updated references from "Kimi" to "Sahya" in skill-creator and impeccable-design
- Removed old kimi-cli-help skill

**Skills List:**
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

#### 3. Logo and UI Improvements
**Work Done:**
- Created responsive ASCII art logo system
- Four sizes: Full (80+ cols), Medium (60-79), Compact (30-59), Minimal (<30)
- Simplified compact logo to letter "S"
- Theme-aware welcome text (white in dark, black in light)
- Fixed Rich markup syntax (`[/]` instead of `[/bold]`)

#### 4. Model Key Format Fix
**Problem:** Model keys had provider prefix (`sahya:kimi-k2.5`) causing config errors.

**Solution:**
- Changed `openai_legacy_model_key()` to return just model ID
- Config now uses simple keys like `kimi-k2.5`
- Fixed "Default model not found in models" error

#### 5. Update Mechanism
**Features:**
- Automatic version check on startup
- Displays update notification in welcome banner
- Fetches latest version from GitHub releases
- Shows upgrade command: `uv tool upgrade sahya-code`

#### 6. PyPI and GitHub Publishing
**Published Versions:**
- v1.0.4 - Initial fixes
- v1.0.5 - Model key format fix
- v1.0.6 - Skills transfer
- v1.0.7 - Logo improvements
- v1.0.8 - Compact logo fix
- v1.0.9 - Thinking capability fix

**Repository:** https://github.com/officialsahyaboutorabi/sahya-code
**PyPI:** https://pypi.org/project/sahya-code/

### Known Issues and Limitations

1. **Thinking Capability:**
   - LiteLLM reports thinking support but doesn't implement `reasoning_effort`
   - Currently handled gracefully with warning logs
   - May need LiteLLM proxy configuration update for full support

2. **Model Fetching:**
   - Embedding models are filtered out (not for chat)
   - Models must be fetched manually or on startup

3. **Provider Compatibility:**
   - Tested primarily with LiteLLM/OpenAI-compatible endpoints
   - Other providers may need additional configuration

### Next Steps (Future Work)

1. **Investigate LiteLLM Thinking Support:**
   - Research if LiteLLM proxy can be configured to support `reasoning_effort`
   - Check if models actually return reasoning content
   - Consider alternative thinking implementations

2. **Enhanced Model Management:**
   - Add model capability caching
   - Implement model-specific configuration templates
   - Add support for model routing/fallback

3. **UI Improvements:**
   - Consider OpenCode-style dock-based input bar
   - Add more theme customization options
   - Improve mobile/narrow terminal support

4. **Documentation:**
   - Create user guide for LiteLLM setup
   - Document all environment variables
   - Add troubleshooting section

### Environment Variables Reference

```bash
# Required
export SAHYA_API_KEY="your-api-key"

# Optional
export SAHYA_BASE_URL="https://llm.nexiant.ai"
export SAHYA_MODEL_NAME="kimi-k2.5"
export SAHYA_MODEL_MAX_CONTEXT_SIZE="128000"

# Legacy (still supported)
export OPENAI_API_KEY="your-key"
export OPENAI_BASE_URL="https://llm.nexiant.ai"
```

### Configuration File Location

```
~/.local/share/sahya-code/config.toml
```

### Key Architecture Decisions

1. **Model Keys:** Simple model ID without provider prefix
2. **Thinking:** Capability-based with graceful fallback
3. **Skills:** All 34 kimi-cli skills transferred and rebranded
4. **Logo:** Responsive ASCII art based on terminal width
5. **Updates:** GitHub releases with PyPI publishing
