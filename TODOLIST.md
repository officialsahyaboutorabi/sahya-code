# Sahya Code Development Todo List

## Completed
- [x] Clone kimi-cli repository
- [x] Analyze codebase structure
- [x] Create implementation plan
- [x] Create ARCHITECTURE.md

## In Progress
- [ ] Create CHANGELOG.md
- [ ] Rebrand package (kimi_cli → sahya_code)
- [ ] Update all internal references
- [ ] Configure custom LiteLLM provider

## Pending

### Package Structure
- [ ] Rename source directory: `src/kimi_cli` → `src/sahya_code`
- [ ] Update pyproject.toml
  - [ ] Change package name to "sahya-code"
  - [ ] Update CLI entry points (sahya, sahya-code)
  - [ ] Update module name references
  - [ ] Update workspace references

### Core Module Updates
- [ ] Update `constant.py`
  - [ ] Change NAME to "Sahya Code"
  - [ ] Update get_user_agent() to "SahyaCode/*"
- [ ] Update `__main__.py`
  - [ ] Change prog_name to "sahya"
  - [ ] Update version output
- [ ] Update `share.py`
  - [ ] Change share dir to "sahya-code"
  - [ ] Update environment variable names

### Import Updates
- [ ] Replace all `from kimi_cli` imports with `from sahya_code`
- [ ] Replace all `import kimi_cli` with `import sahya_code`
- [ ] Update tests import statements

### Configuration Updates
- [ ] Update `config.py`
  - [ ] Change config file path
  - [ ] Update default config with LiteLLM endpoint
  - [ ] Add SAHYA_* environment variable support
- [ ] Update `llm.py`
  - [ ] Add SAHYA_API_KEY support
  - [ ] Add SAHYA_BASE_URL support
  - [ ] Update augment_provider_with_env_vars function

### CLI Updates
- [ ] Update `cli/__init__.py`
  - [ ] Update help text
  - [ ] Update version callback
  - [ ] Rename main function
- [ ] Update `cli/__main__.py`
- [ ] Update all subcommand help text

### App and Soul Updates
- [ ] Update `app.py`
  - [ ] Rename KimiCLI class to SahyaCode
  - [ ] Update log file path to sahya.log
- [ ] Rename `soul/kimisoul.py` to `soul/sahyasoul.py`
  - [ ] Rename KimiSoul class to SahyaSoul
- [ ] Update all soul imports

### UI Updates
- [ ] Update `ui/shell/setup.py`
  - [ ] Replace "Kimi" with "Sahya" in prompts
- [ ] Update `ui/shell/startup.py`
  - [ ] Update branding strings
- [ ] Update `ui/shell/usage.py`
- [ ] Update other UI components

### Agent Updates
- [ ] Update `agents/default/agent.yaml`
- [ ] Update `agents/default/system.md`
- [ ] Update `agents/okabe/agent.yaml`

### Documentation
- [x] Create ARCHITECTURE.md
- [ ] Create CHANGELOG.md
- [ ] Update README.md
  - [ ] Change title and description
  - [ ] Update installation instructions
  - [ ] Update configuration examples
  - [ ] Update usage examples

### Git and Distribution
- [ ] Remove original .git directory
- [ ] Initialize new git repository
- [ ] Create initial commit
- [ ] Add GitHub remote
- [ ] Push to GitHub repository

### Verification
- [ ] Verify package installation: `pip install -e .`
- [ ] Verify CLI works: `sahya --version`
- [ ] Verify config generation
- [ ] Check for remaining kimi references

## Post-Launch
- [ ] Add CI/CD configuration
- [ ] Set up automated testing
- [ ] Create release tags
- [ ] Update documentation website
