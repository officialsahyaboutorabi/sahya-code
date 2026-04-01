---
name: sahya-code-cli-help
description: Answer Sahya Code CLI usage, configuration, and troubleshooting questions. Use when user asks about Sahya Code CLI installation, setup, configuration, slash commands, keyboard shortcuts, MCP integration, providers, environment variables, how something works internally, or any questions about Sahya Code CLI itself.
---

# Sahya Code CLI Help

Help users with Sahya Code CLI questions by consulting documentation and source code.

## Strategy

1. **Prefer official documentation** for most questions
2. **Read local source** when in sahya-code project itself, or when user is developing with sahya-code as a library (e.g., importing from `sahya_code` in their code)
3. **Clone and explore source** for complex internals not covered in docs - **ask user for confirmation first**

## Documentation

Base URL: `https://officialsahyaboutorabi.github.io/sahya-code/`

Fetch documentation index to find relevant pages:

```
https://officialsahyaboutorabi.github.io/sahya-code/llms.txt
```

### Page URL Pattern

- English: `https://officialsahyaboutorabi.github.io/sahya-code/en/...`

### Topic Mapping

| Topic | Page |
|-------|------|
| Installation, first run | `/en/guides/getting-started.md` |
| Config files | `/en/configuration/config-files.md` |
| Providers, models | `/en/configuration/providers.md` |
| Environment variables | `/en/configuration/env-vars.md` |
| Slash commands | `/en/reference/slash-commands.md` |
| CLI flags | `/en/reference/sahya-command.md` |
| Keyboard shortcuts | `/en/reference/keyboard.md` |
| MCP | `/en/customization/mcp.md` |
| Agents | `/en/customization/agents.md` |
| Skills | `/en/customization/skills.md` |
| FAQ | `/en/faq.md` |

## Source Code

Repository: `https://github.com/officialsahyaboutorabi/sahya-code`

When to read source:

- In sahya-code project directory (check `pyproject.toml` for `name = "sahya-code"`)
- User is importing `sahya_code` as a library in their project
- Question about internals not covered in docs (ask user before cloning)
