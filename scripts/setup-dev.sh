#!/usr/bin/env bash
set -euo pipefail

# Development setup script for Sahya Code
# This sets up the full development environment

cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo ""
  echo -e "${BLUE}====================================${NC}"
  echo -e "${BLUE}  Sahya Code Development Setup${NC}"
  echo -e "${BLUE}====================================${NC}"
  echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1" >&2; }

# Check prerequisites
check_prerequisites() {
  print_info "Checking prerequisites..."
  
  # Check for git
  if ! command -v git >/dev/null 2>&1; then
    print_error "git is required but not installed"
    exit 1
  fi
  print_success "git is installed"
  
  # Check for Node.js (optional but recommended)
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
      print_success "Node.js $(node --version) is installed"
    else
      print_warning "Node.js 18+ recommended (found $(node --version))"
    fi
  else
    print_warning "Node.js not installed (TUI will be unavailable)"
  fi
  
  # Check for ripgrep (optional)
  if command -v rg >/dev/null 2>&1; then
    print_success "ripgrep is installed"
  else
    print_warning "ripgrep not installed (some search features will be slower)"
  fi
}

# Install uv
setup_uv() {
  print_info "Setting up uv..."
  
  if command -v uv >/dev/null 2>&1; then
    print_success "uv is already installed ($(uv --version))"
    return
  fi
  
  print_info "Installing uv..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://astral.sh/uv/install.sh | sh
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://astral.sh/uv/install.sh | sh
  else
    print_error "curl or wget is required"
    exit 1
  fi
  
  # Source the env file
  if [ -f "$HOME/.local/bin/env" ]; then
    . "$HOME/.local/bin/env"
  elif [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
  fi
  
  if command -v uv >/dev/null 2>&1; then
    print_success "uv installed successfully"
  else
    print_error "uv installation failed"
    exit 1
  fi
}

# Setup Python
setup_python() {
  print_info "Setting up Python 3.13..."
  
  if ! uv python find 3.13 >/dev/null 2>&1; then
    uv python install 3.13
  fi
  
  print_success "Python 3.13 is ready"
}

# Install dependencies
install_deps() {
  print_info "Installing dependencies..."
  
  # Sync all dependencies
  uv sync --frozen --all-extras --all-packages
  
  print_success "Dependencies installed"
}

# Setup TUI
setup_tui() {
  if [ ! -d "src/sahya_code/tui" ]; then
    print_warning "TUI directory not found"
    return
  fi
  
  if ! command -v npm >/dev/null 2>&1; then
    print_warning "npm not found, skipping TUI setup"
    return
  fi
  
  print_info "Setting up TUI..."
  cd src/sahya_code/tui || { print_error "TUI directory not found"; return 1; }
  npm install
  cd ../../.. || return 1
  
  print_success "TUI dependencies installed"
}

# Setup git hooks
setup_git_hooks() {
  print_info "Setting up git hooks..."
  
  if command -v prek >/dev/null 2>&1; then
    uv tool run prek install
    print_success "Git hooks installed"
  else
    print_warning "prek not installed, skipping git hooks"
  fi
}

# Create config
create_config() {
  local config_dir="${HOME}/.config/sahya"
  
  if [ ! -f "$config_dir/config.toml" ]; then
    print_info "Creating default configuration..."
    mkdir -p "$config_dir" || { print_error "Cannot create config directory: $config_dir"; return 1; }
    
    cat > "$config_dir/config.toml" << 'EOF'
# Sahya Code Development Configuration

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
# api_key = "your-api-key-here"
EOF
    print_success "Config created at ~/.config/sahya/config.toml"
  fi
}

# Print final instructions
print_footer() {
  echo ""
  echo -e "${GREEN}====================================${NC}"
  echo -e "${GREEN}  Setup Complete!${NC}"
  echo -e "${GREEN}====================================${NC}"
  echo ""
  echo "Development Commands:"
  echo "  uv run sahya-code              # Run without installing"
  echo "  uv run pytest                  # Run tests"
  echo "  uv run ruff check .            # Lint code"
  echo "  uv run ruff format .           # Format code"
  echo ""
  echo "Install locally:"
  echo "  make install-dev               # Editable install with TUI"
  echo "  make install-local             # Simple local install"
  echo ""
  echo "Build for release:"
  echo "  make build                     # Build all packages"
  echo "  make build-bin                 # Build standalone binary"
  echo ""
  echo "Configuration:"
  echo "  Edit ~/.config/sahya/config.toml"
  echo ""
}

# Main
main() {
  print_header
  
  check_prerequisites
  setup_uv
  setup_python
  install_deps
  setup_tui
  setup_git_hooks
  create_config
  
  print_footer
}

main "$@"
