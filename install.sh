#!/bin/bash
set -e

# Sahya Code Installation Script
# Install with: curl -fsSL https://sbgpt.qzz.io/install.sh | bash

# Download binaries from sahyacode repository
SOURCE_REPO="officialsahyaboutorabi/sahya-code"
INSTALL_NAME="sahyacode"
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

# Get the latest version from GitHub API
get_latest_version() {
    local api_url="https://api.github.com/repos/${SOURCE_REPO}/releases/latest"
    local version
    
    if command -v curl >/dev/null 2>&1; then
        version=$(curl -fsSL "$api_url" | grep -o '"tag_name": "[^"]*"' | cut -d'"' -f4)
    elif command -v wget >/dev/null 2>&1; then
        version=$(wget -qO- "$api_url" | grep -o '"tag_name": "[^"]*"' | cut -d'"' -f4)
    fi
    
    echo "$version"
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
    
    # Binary names use 'sahyacode' prefix in the source repo
    local binary_name="sahyacode-${platform}-${arch}${suffix}"
    
    # GitHub releases use tar.gz format
    if [ "$VERSION" = "latest" ]; then
        local latest_version
        latest_version=$(get_latest_version)
        if [ -z "$latest_version" ]; then
            echo "Error: Could not determine latest version" >&2
            exit 1
        fi
        echo "https://github.com/${SOURCE_REPO}/releases/download/${latest_version}/${binary_name}.tar.gz"
    else
        # Ensure VERSION has 'v' prefix for GitHub releases
        local version_tag="$VERSION"
        if [[ ! "$version_tag" =~ ^v ]]; then
            version_tag="v${version_tag}"
        fi
        echo "https://github.com/${SOURCE_REPO}/releases/download/${version_tag}/${binary_name}.tar.gz"
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
    
    # Download archive
    local archive_path="$TEMP_DIR/${INSTALL_NAME}.tar.gz"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$DOWNLOAD_URL" -o "$archive_path"
    elif command -v wget >/dev/null 2>&1; then
        wget -q "$DOWNLOAD_URL" -O "$archive_path"
    else
        echo "Error: curl or wget is required"
        exit 1
    fi
    
    # Extract archive
    echo "Extracting..."
    tar -xzf "$archive_path" -C "$TEMP_DIR"
    
    # Find the extracted directory (sahyacode-*)
    EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "sahyacode-*" | head -1)
    
    # Install binary - look for 'opencode' binary in the archive
    if [ -f "$EXTRACTED_DIR/bin/opencode" ]; then
        chmod +x "$EXTRACTED_DIR/bin/opencode"
        mv "$EXTRACTED_DIR/bin/opencode" "$INSTALL_DIR/${INSTALL_NAME}"
    elif [ -f "$TEMP_DIR/sahyacode" ]; then
        chmod +x "$TEMP_DIR/sahyacode"
        mv "$TEMP_DIR/sahyacode" "$INSTALL_DIR/${INSTALL_NAME}"
    elif [ -f "$TEMP_DIR/bin/sahyacode" ]; then
        chmod +x "$TEMP_DIR/bin/sahyacode"
        mv "$TEMP_DIR/bin/sahyacode" "$INSTALL_DIR/${INSTALL_NAME}"
    else
        echo "Error: Could not find sahyacode binary in archive"
        echo "Contents of temp directory:"
        find "$TEMP_DIR" -type f 2>/dev/null || true
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
