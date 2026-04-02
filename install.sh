#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
# Auto-detect: if pyproject.toml exists, we're in local mode, otherwise PyPI
if [ -f "$(dirname "$0")/pyproject.toml" ] || [ -f "pyproject.toml" ]; then
  INSTALL_MODE="local"  # Default to local if source is present
else
  INSTALL_MODE="pypi"   # Default to PyPI for curl installs
fi
SKIP_TUI=false
PYTHON_VERSION="3.13"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --pypi)
      INSTALL_MODE="pypi"
      shift
      ;;
    --local)
      INSTALL_MODE="local"
      shift
      ;;
    --skip-tui)
      SKIP_TUI=true
      shift
      ;;
    --python)
      PYTHON_VERSION="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --local        Install from local source (default if source available)"
      echo "  --pypi         Install from PyPI (default for curl installs)"
      echo "  --skip-tui     Skip TUI (Node.js) setup"
      echo "  --python VER   Python version to use (default: 3.13)"
      echo "  --help, -h     Show this help message"
      echo ""
      echo "Examples:"
      echo "  curl -fsSL https://sbgpt.qzz.io/install.sh | bash    # Install from PyPI"
      echo "  ./install.sh                                         # Install from local source"
      echo "  ./install.sh --pypi                                  # Install from PyPI"
      echo "  ./install.sh --skip-tui                              # Install without TUI"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      echo "Run '$0 --help' for usage information." >&2
      exit 1
      ;;
  esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}" >&2
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Install uv if not present
install_uv() {
  if command -v uv >/dev/null 2>&1; then
    print_success "uv is already installed"
    return
  fi

  print_info "Installing uv..."
  
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://astral.sh/uv/install.sh | sh
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://astral.sh/uv/install.sh | sh
  else
    print_error "curl or wget is required to install uv."
    exit 1
  fi

  # Source the env file to get uv in PATH
  if [ -f "$HOME/.local/bin/env" ]; then
    . "$HOME/.local/bin/env"
  elif [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
  fi

  if ! command -v uv >/dev/null 2>&1; then
    print_error "uv not found after installation. Please restart your shell and try again."
    exit 1
  fi
  
  print_success "uv installed successfully"
}

# Check Python version
check_python() {
  print_info "Checking Python ${PYTHON_VERSION}..."
  
  if ! uv python find "${PYTHON_VERSION}" >/dev/null 2>&1; then
    print_info "Python ${PYTHON_VERSION} not found, installing..."
    uv python install "${PYTHON_VERSION}"
  fi
  
  print_success "Python ${PYTHON_VERSION} is ready"
}

# Install from PyPI
install_from_pypi() {
  print_info "Installing Sahya Code from PyPI..."
  uv tool install --python "${PYTHON_VERSION}" sahya-code
  print_success "Sahya Code installed from PyPI"
}

# Install from local source
install_from_local() {
  print_info "Installing Sahya Code from local source..."
  
  cd "${SCRIPT_DIR}"
  
  # Check if we're in the right directory
  if [ ! -f "pyproject.toml" ]; then
    print_error "pyproject.toml not found. Are you in the sahya-code directory?"
    exit 1
  fi
  
  # Install in editable mode with all dependencies
  uv tool install --python "${PYTHON_VERSION}" --editable .
  
  print_success "Sahya Code installed from local source"
}

# Setup TUI dependencies
setup_tui() {
  if [ "$SKIP_TUI" = true ]; then
    print_warning "Skipping TUI setup (--skip-tui was specified)"
    return
  fi

  print_info "Setting up TUI (Terminal User Interface)..."
  
  # Check for Node.js
  if ! command -v node >/dev/null 2>&1; then
    print_warning "Node.js not found. TUI will not be available."
    print_info "To use the TUI, install Node.js 18+:"
    print_info "  macOS:    brew install node"
    print_info "  Ubuntu:   sudo apt-get install nodejs npm"
    print_info "  Or visit: https://nodejs.org/"
    return
  fi
  
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js 18+ required for TUI. Current version: $(node --version)"
    print_info "Please upgrade Node.js to use the TUI"
    return
  fi
  
  print_success "Node.js $(node --version) is installed"
  
  # Find TUI directory based on install mode
  local TUI_DIR=""
  
  if [ "$INSTALL_MODE" = "local" ]; then
    # Local install - TUI is in the source directory
    TUI_DIR="${SCRIPT_DIR}/src/sahya_code/tui"
  else
    # PyPI install - TUI should be in the package directory
    # Try to find the package location
    local PACKAGE_DIR=$(uv run python -c "import sahya_code; print(sahya_code.__path__[0])" 2>/dev/null || echo "")
    if [ -n "$PACKAGE_DIR" ]; then
      TUI_DIR="${PACKAGE_DIR}/tui"
    fi
  fi
  
  # Install TUI dependencies
  if [ -d "$TUI_DIR" ]; then
    print_info "Installing TUI dependencies in ${TUI_DIR}..."
    cd "$TUI_DIR"
    
    if [ -f "package.json" ]; then
      if npm install; then
        print_success "TUI dependencies installed successfully"
        print_info "You can now use: sahya-code --tui"
      else
        print_error "Failed to install TUI dependencies"
        print_info "You can try manually: cd ${TUI_DIR} && npm install"
        exit 1
      fi
    else
      print_warning "TUI package.json not found at ${TUI_DIR}"
    fi
  else
    print_warning "TUI directory not found at ${TUI_DIR}"
    print_info "TUI may not be included in this installation method"
  fi
}

# Create config directory and example config
setup_config() {
  print_info "Setting up configuration..."
  
  CONFIG_DIR="${HOME}/.config/sahya"
  mkdir -p "$CONFIG_DIR"
  
  # Create example config if it doesn't exist
  if [ ! -f "$CONFIG_DIR/config.toml" ]; then
    cat > "$CONFIG_DIR/config.toml" << 'EOF'
# Sahya Code Configuration
# Get your API key from: https://kimi.com/coding

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
# api_key = "your-api-key-here"  # Or set SAHYA_API_KEY environment variable
EOF
    print_success "Example config created at ${CONFIG_DIR}/config.toml"
    print_warning "Please edit the config file and add your API key"
  fi
}

# Main installation
main() {
  print_header
  
  # Check if installation directory is writable
  INSTALL_DIR="${HOME}/.local/bin"
  if [ -d "$INSTALL_DIR" ] && [ ! -w "$INSTALL_DIR" ]; then
    print_error "Installation directory $INSTALL_DIR is not writable"
    print_info "Please check permissions or choose a different installation method"
    exit 1
  fi
  
  # Install uv
  install_uv
  
  # Check Python
  check_python
  
  # Install based on mode
  if [ "$INSTALL_MODE" = "pypi" ]; then
    install_from_pypi
  else
    install_from_local
  fi
  
  # Setup TUI
  setup_tui
  
  # Setup config
  setup_config
  
  # Check TUI status for final message
  local TUI_STATUS=""
  if [ "$SKIP_TUI" = false ] && command -v node >/dev/null 2>&1; then
    local NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
      TUI_STATUS="available"
    fi
  fi
  
  # Final message
  echo ""
  echo -e "${GREEN}====================================${NC}"
  echo -e "${GREEN}  Installation Complete!${NC}"
  echo -e "${GREEN}====================================${NC}"
  echo ""
  echo "Usage:"
  echo "  sahya-code                    # Start Shell UI (default)"
  if [ "$TUI_STATUS" = "available" ]; then
    echo "  sahya-code --tui              # Start TUI (opencode-style)"
    echo "  sahya-code tui                # Alternative TUI command"
  fi
  echo "  sahya-code 'Your prompt'      # Run with a prompt"
  echo "  sahya-code --help             # Show all options"
  echo ""
  echo "UI Modes:"
  echo "  Shell UI (default)  - Inline terminal interface"
  if [ "$TUI_STATUS" = "available" ]; then
    echo "  TUI                 - Full-screen opencode-style interface"
  else
    echo "  TUI                 - Not installed (requires Node.js 18+)"
  fi
  echo ""
  echo "Configuration:"
  echo "  Config file: ~/.config/sahya/config.toml"
  echo ""
  
  if [ "$INSTALL_MODE" = "local" ]; then
    echo "Development:"
    echo "  cd ${SCRIPT_DIR}"
    echo "  uv run sahya-code              # Run without installing"
    echo "  uv run pytest                  # Run tests"
    echo ""
  fi
  
  # Check if API key is set
  if [ -z "${SAHYA_API_KEY:-}" ]; then
    print_warning "SAHYA_API_KEY environment variable not set"
    print_info "Add your API key to ~/.config/sahya/config.toml"
    print_info "Or set the environment variable:"
    print_info "  export SAHYA_API_KEY='your-api-key-here'"
  fi
  
  print_success "Happy coding with Sahya! 🤖"
  echo ""
}

main "$@"
