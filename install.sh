#!/bin/bash
set -e

# Sahya Code Installation Script
# Install with: curl -fsSL https://sbgpt.qzz.io/install.sh | bash

REPO="officialsahyaboutorabi/sahya-code"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
VERSION="${VERSION:-latest}"

# Detect platform and architecture
detect_platform() {
    local platform arch
    platform=$(uname -s | tr '[:upper:]' '[:lower:]')
    arch=$(uname -m)
    
    case "$platform" in
        linux)
            platform="linux"
            ;;
        darwin)
            platform="darwin"
            ;;
        mingw*|msys*|cygwin*)
            platform="windows"
            ;;
        *)
            echo "Unsupported platform: $platform"
            exit 1
            ;;
    esac
    
    case "$arch" in
        x86_64|amd64)
            arch="x64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        armv7l|arm)
            arch="arm"
            ;;
        *)
            echo "Unsupported architecture: $arch"
            exit 1
            ;;
    esac
    
    echo "${platform}-${arch}"
}

# Check for AVX2 support (Linux only)
check_avx2() {
    if [ -f /proc/cpuinfo ]; then
        if grep -q "avx2" /proc/cpuinfo 2>/dev/null; then
            echo ""
        else
            echo "-baseline"
        fi
    else
        echo ""
    fi
}

# Check for musl libc (Linux only)
check_musl() {
    if [ -f /etc/alpine-release ]; then
        echo "-musl"
        return
    fi
    
    if command -v ldd >/dev/null 2>&1; then
        if ldd --version 2>&1 | grep -qi musl; then
            echo "-musl"
            return
        fi
    fi
    
    echo ""
}

# Get the download URL
get_download_url() {
    local platform_arch=$1
    local platform=$(echo "$platform_arch" | cut -d- -f1)
    local arch=$(echo "$platform_arch" | cut -d- -f2)
    
    local suffix=""
    
    if [ "$platform" = "linux" ]; then
        suffix="$(check_avx2)$(check_musl)"
    elif [ "$platform" = "darwin" ] && [ "$arch" = "x64" ]; then
        # macOS Intel - check for AVX2
        if sysctl -n hw.optional.avx2_0 2>/dev/null | grep -q "1"; then
            suffix=""
        else
            suffix="-baseline"
        fi
    fi
    
    local binary_name="sahyacode-${platform}-${arch}${suffix}"
    
    if [ "$VERSION" = "latest" ]; then
        echo "https://github.com/${REPO}/releases/latest/download/${binary_name}.tar.gz"
    else
        echo "https://github.com/${REPO}/releases/download/${VERSION}/${binary_name}.tar.gz"
    fi
}

# Main installation
main() {
    echo "Installing Sahya Code..."
    
    # Detect platform
    PLATFORM_ARCH=$(detect_platform)
    echo "Detected platform: $PLATFORM_ARCH"
    
    # Create install directory
    mkdir -p "$INSTALL_DIR"
    
    # Download URL
    DOWNLOAD_URL=$(get_download_url "$PLATFORM_ARCH")
    echo "Downloading from: $DOWNLOAD_URL"
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # Download and extract
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$DOWNLOAD_URL" -o "$TEMP_DIR/sahyacode.tar.gz"
    elif command -v wget >/dev/null 2>&1; then
        wget -q "$DOWNLOAD_URL" -O "$TEMP_DIR/sahyacode.tar.gz"
    else
        echo "Error: curl or wget is required"
        exit 1
    fi
    
    echo "Extracting..."
    tar -xzf "$TEMP_DIR/sahyacode.tar.gz" -C "$TEMP_DIR"
    
    # Install binary
    if [ -f "$TEMP_DIR/sahyacode" ]; then
        mv "$TEMP_DIR/sahyacode" "$INSTALL_DIR/"
        chmod +x "$INSTALL_DIR/sahyacode"
    elif [ -f "$TEMP_DIR/bin/sahyacode" ]; then
        mv "$TEMP_DIR/bin/sahyacode" "$INSTALL_DIR/"
        chmod +x "$INSTALL_DIR/sahyacode"
    else
        echo "Error: Could not find sahyacode binary in archive"
        exit 1
    fi
    
    # Create opencode symlink for backward compatibility
    if [ ! -L "$INSTALL_DIR/opencode" ]; then
        ln -sf "$INSTALL_DIR/sahyacode" "$INSTALL_DIR/opencode" 2>/dev/null || true
    fi
    
    echo ""
    echo "Sahya Code installed successfully to: $INSTALL_DIR/sahyacode"
    echo ""
    
    # Check if install dir is in PATH
    case ":$PATH:" in
        *":$INSTALL_DIR:"*)
            echo "You can now run: sahyacode"
            ;;
        *)
            echo "Add $INSTALL_DIR to your PATH:"
            echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
            echo ""
            echo "Then run: sahyacode"
            ;;
    esac
    
    # Verify installation
    if command -v "$INSTALL_DIR/sahyacode" >/dev/null 2>&1; then
        echo ""
        "$INSTALL_DIR/sahyacode" --version 2>/dev/null || true
    fi
}

# Run main function
main "$@"
