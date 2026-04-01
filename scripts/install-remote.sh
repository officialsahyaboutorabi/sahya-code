#!/usr/bin/env bash
set -euo pipefail

# One-line installer for Sahya Code
# Usage: curl -fsSL https://your-domain.com/install.sh | sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  cat << 'EOF'
   _____            _                _____          _     
  / ____|          | |              / ____|        | |    
 | (___   __ _  ___| |__  _   _    | |     ___   __| | ___
  \___ \ / _` |/ __| '_ \| | | |   | |    / _ \ / _` |/ _ \
  ____) | (_| | (__| | | | |_| |   | |___| (_) | (_| |  __/
 |_____/ \__,_|\___|_| |_|\__, |    \_____\___/ \__,_|\___|
                           __/ |                          
                          |___/                           
EOF
  echo ""
  echo -e "${BLUE}The AI coding companion${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

# Detect OS and architecture
detect_platform() {
  local os arch
  
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(uname -m)
  
  case "$os" in
    linux)
      case "$arch" in
        x86_64)  echo "linux-x86_64" ;;
        aarch64|arm64) echo "linux-aarch64" ;;
        *) echo "unknown" ;;
      esac
      ;;
    darwin)
      case "$arch" in
        x86_64)  echo "macos-x86_64" ;;
        arm64)   echo "macos-aarch64" ;;
        *) echo "unknown" ;;
      esac
      ;;
    mingw*|msys*|cygwin*)
      echo "windows"
      ;;
    *)
      echo "unknown"
      ;;
  esac
}

# Install uv
install_uv() {
  if command -v uv >/dev/null 2>&1; then
    print_success "uv is already installed"
    return 0
  fi

  print_info "Installing uv (Python package manager)..."
  
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://astral.sh/uv/install.sh | sh
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://astral.sh/uv/install.sh | sh
  else
    print_error "curl or wget is required"
    return 1
  fi

  # Try to source the env file
  if [ -f "$HOME/.local/bin/env" ]; then
    . "$HOME/.local/bin/env"
  elif [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
  fi

  # Check if uv is now available
  if ! command -v uv >/dev/null 2>&1; then
    # Try common locations
    if [ -f "$HOME/.local/bin/uv" ]; then
      export PATH="$HOME/.local/bin:$PATH"
    elif [ -f "$HOME/.cargo/bin/uv" ]; then
      export PATH="$HOME/.cargo/bin:$PATH"
    fi
  fi

  if command -v uv >/dev/null 2>&1; then
    print_success "uv installed successfully"
    return 0
  else
    print_error "uv installation failed. Please install manually:"
    echo "  curl -fsSL https://astral.sh/uv/install.sh | sh"
    return 1
  fi
}

# Install Sahya Code
install_sahya() {
  print_info "Installing Sahya Code..."
  
  if ! command -v uv >/dev/null 2>&1; then
    print_error "uv not found. Installation failed."
    return 1
  fi

  # Install Python 3.13 if not present
  if ! uv python find 3.13 >/dev/null 2>&1; then
    print_info "Installing Python 3.13..."
    uv python install 3.13
  fi

  # Install sahya-code
  uv tool install --python 3.13 sahya-code
  
  print_success "Sahya Code installed successfully!"
}

# Setup configuration
setup_config() {
  local config_dir="${HOME}/.config/sahya"
  
  mkdir -p "$config_dir"
  
  if [ ! -f "$config_dir/config.toml" ]; then
    cat > "$config_dir/config.toml" << 'EOF'
# Sahya Code Configuration
# Documentation: https://github.com/sahya/sahya-code

# Default model to use
default_model = "default"

# Model definitions
[models.default]
provider = "sahya"
model = "kimi-k2.5"
max_context_size = 256000
capabilities = ["image_in"]

# Provider settings
[providers.sahya]
type = "openai_legacy"
base_url = "https://llm.nexiant.ai"
# Set your API key here or use SAHYA_API_KEY environment variable
# api_key = "sk-..."
EOF
    print_success "Configuration file created at ~/.config/sahya/config.toml"
  fi
}

# Check for optional dependencies
check_optional() {
  echo ""
  print_info "Optional dependencies:"
  
  # Node.js for TUI
  if command -v node >/dev/null 2>&1; then
    local node_version=$(node --version | cut -d'v' -f2)
    print_success "Node.js ${node_version} installed (TUI available)"
  else
    print_warning "Node.js not installed (TUI unavailable)"
    echo "    Install Node.js for the TUI: https://nodejs.org/"
  fi
  
  # Ripgrep for better search
  if command -v rg >/dev/null 2>&1; then
    print_success "ripgrep installed (enhanced search)"
  else
    print_warning "ripgrep not installed"
    echo "    Install ripgrep for better file search: https://github.com/BurntSushi/ripgrep"
  fi
}

# Main
main() {
  print_header
  
  local platform=$(detect_platform)
  print_info "Detected platform: $platform"
  
  # Install uv
  if ! install_uv; then
    exit 1
  fi
  
  # Install Sahya Code
  if ! install_sahya; then
    exit 1
  fi
  
  # Setup config
  setup_config
  
  # Check optional deps
  check_optional
  
  # Final output
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  echo -e "${GREEN}    Installation Complete! 🎉${NC}"
  echo -e "${GREEN}═══════════════════════════════════════${NC}"
  echo ""
  echo "Quick Start:"
  echo "  sahya-code                    # Start interactive mode"
  echo "  sahya-code 'Hello'            # Run a quick prompt"
  echo "  sahya-code tui                # Start the TUI (if Node.js installed)"
  echo ""
  echo "Configuration:"
  echo "  Edit ~/.config/sahya/config.toml to add your API key"
  echo ""
  echo "Or set environment variable:"
  echo "  export SAHYA_API_KEY='your-api-key'"
  echo ""
  
  # Check if we need to restart shell
  if ! command -v sahya-code >/dev/null 2>&1; then
    echo -e "${YELLOW}Note:${NC} Please restart your shell or run:"
    echo "  source ~/.local/bin/env"
    echo ""
  fi
}

main "$@"
