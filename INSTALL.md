# Installation Guide

## Quick Install (End Users)

The fastest way to install Sahya Code:

```bash
curl -fsSL https://your-domain.com/install.sh | sh
```

Or with `wget`:

```bash
wget -qO- https://your-domain.com/install.sh | sh
```

> **Note:** Replace `your-domain.com` with your actual hosting URL.

## Manual Install

### Prerequisites

- **Python 3.12+** (3.13 recommended)
- **uv** - Python package manager ([install guide](https://docs.astral.sh/uv/getting-started/installation/))
- **Node.js 18+** (optional, for TUI)

### From PyPI (Recommended for Users)

```bash
# Install uv first if you don't have it
curl -fsSL https://astral.sh/uv/install.sh | sh

# Install Sahya Code
uv tool install --python 3.13 sahya-code
```

### From Source (For Developers)

```bash
# Clone the repository
git clone https://github.com/yourusername/sahya-code.git
cd sahya-code

# Quick setup
./scripts/setup-dev.sh

# Or manual setup
uv sync --all-packages
uv tool install --editable .

# Setup TUI (optional)
cd src/sahya_code/tui && npm install
```

## Makefile Install Targets

For development, use the Makefile:

```bash
# Development install (editable with all deps)
make install-dev

# Local install from source
make install-local

# Install from PyPI
make install

# Install only TUI dependencies
make install-tui

# Uninstall
make uninstall

# Reinstall
make reinstall
```

## Install Script Options

The `install.sh` script supports various options:

```bash
# Show help
./install.sh --help

# Install from PyPI (production)
./install.sh --pypi

# Install from local source (development)
./install.sh --local

# Skip TUI setup
./install.sh --skip-tui

# Use specific Python version
./install.sh --python 3.12
```

## Post-Installation

### 1. Configure API Key

Edit `~/.config/sahya/config.toml`:

```toml
[providers.sahya]
type = "openai_legacy"
base_url = "https://llm.nexiant.ai"
api_key = "your-api-key-here"
```

Or set environment variable:

```bash
export SAHYA_API_KEY='your-api-key-here'
```

### 2. Verify Installation

```bash
# Check version
sahya-code --version

# Start interactive mode
sahya-code

# Start TUI (if Node.js is installed)
sahya-code tui
```

## Platform-Specific Notes

### macOS

```bash
# Install dependencies with Homebrew
brew install node ripgrep

# Then run install script
./install.sh
```

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y nodejs npm ripgrep

# Then run install script
./install.sh
```

### Windows

Use WSL2 for best compatibility:

```bash
# In WSL2
./install.sh
```

Or use the PyInstaller binary from releases.

## Uninstallation

```bash
# Uninstall tool
uv tool uninstall sahya-code

# Remove config (optional)
rm -rf ~/.config/sahya

# Remove data (optional)
rm -rf ~/.local/share/sahya-code
```

## Troubleshooting

### `sahya-code: command not found`

Restart your shell or run:

```bash
source ~/.local/bin/env
```

### TUI not working

Ensure Node.js 18+ is installed:

```bash
node --version  # Should be v18+
```

Then reinstall TUI deps:

```bash
cd src/sahya_code/tui && npm install
```

### Permission errors

Make sure `~/.local/bin` is in your PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Building from Source

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed build instructions.

```bash
# Build all packages
make build

# Build standalone binary
make build-bin

# Run tests
make test
```
