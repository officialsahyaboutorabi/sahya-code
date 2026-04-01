from __future__ import annotations


class SahyaCodeException(Exception):
    """Base exception class for Kimi Code CLI."""

    pass


class ConfigError(SahyaCodeException, ValueError):
    """Configuration error."""

    pass


class AgentSpecError(SahyaCodeException, ValueError):
    """Agent specification error."""

    pass


class InvalidToolError(SahyaCodeException, ValueError):
    """Invalid tool error."""

    pass


class SystemPromptTemplateError(SahyaCodeException, ValueError):
    """System prompt template error."""

    pass


class MCPConfigError(SahyaCodeException, ValueError):
    """MCP config error."""

    pass


class MCPRuntimeError(SahyaCodeException, RuntimeError):
    """MCP runtime error."""

    pass
