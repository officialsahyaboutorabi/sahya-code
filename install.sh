#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
INSTALL_MODE="local"  # "local" or "pypi"
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
      echo "  --local        Install from local source (default)"
      echo "  --pypi         Install from PyPI (for users)"
      echo "  --skip-tui     Skip TUI (Node.js) setup"
      echo "  --python VER   Python version to use (default: 3.13)"
      echo "  --help, -h     Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Install locally from source"
      echo "  $0 --pypi             # Install from PyPI"
      echo "  $0 --skip-tui         # Install without TUI dependencies"
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
  echo ""
  echo -e "${BLUE}====================================${NC}"
  echo -e "${BLUE}  Sahya Code Installer${NC}"
  echo -e "${BLUE}====================================${NC}"
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
    print_warning "Skipping TUI setup"
    return
  fi

  print_info "Setting up TUI (Node.js) dependencies..."
  
  # Check for Node.js
  if ! command -v node >/dev/null 2>&1; then
    print_warning "Node.js not found. TUI will not be available."
    print_info "To install Node.js:"
    print_info "  macOS:    brew install node"
    print_info "  Ubuntu:   sudo apt-get install nodejs npm"
    print_info "  Or visit: https://nodejs.org/"
    return
  fi
  
  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js 18+ required for TUI. Current version: $(node --version)"
    return
  fi
  
  print_success "Node.js $(node --version) is installed"
  
  # Install TUI dependencies
  TUI_DIR="${SCRIPT_DIR}/src/sahya_code/tui"
  if [ -d "$TUI_DIR" ]; then
    print_info "Installing TUI dependencies..."
    cd "$TUI_DIR"
    
    if [ -f "package.json" ]; then
      npm install
      print_success "TUI dependencies installed"
    else
      print_warning "TUI package.json not found"
    fi
  else
    print_warning "TUI directory not found at ${TUI_DIR}"
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
  
  # Final message
  echo ""
  echo -e "${GREEN}====================================${NC}"
  echo -e "${GREEN}  Installation Complete!${NC}"
  echo -e "${GREEN}====================================${NC}"
  echo ""
  echo "Usage:"
  echo "  sahya-code                    # Start interactive mode"
  echo "  sahya-code 'Your prompt'      # Run with a prompt"
  echo "  sahya-code tui                # Start TUI (if Node.js is installed)"
  echo "  sahya-code --help             # Show help"
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
