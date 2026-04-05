#!/bin/bash
set -e

echo "Building SahyaCode for local platform..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

cd packages/opencode

echo "Installing dependencies..."
bun install

# Detect platform and architecture
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$PLATFORM" in
    linux)
        PLATFORM="linux"
        ;;
    darwin)
        PLATFORM="darwin"
        ;;
    mingw*|msys*|cygwin*)
        PLATFORM="windows"
        ;;
    *)
        echo "Unsupported platform: $PLATFORM"
        exit 1
        ;;
esac

case "$ARCH" in
    x86_64|amd64)
        ARCH="x64"
        ;;
    arm64|aarch64)
        ARCH="arm64"
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

TARGET="bun-${PLATFORM}-${ARCH}"
OUTPUT_NAME="sahyacode-${PLATFORM}-${ARCH}"

echo "Building for ${PLATFORM}-${ARCH}..."
bun build --compile --target=${TARGET} ./src/index.ts --outfile ./bin/${OUTPUT_NAME}

# Create symlink for convenience
cd bin
ln -sf ${OUTPUT_NAME} sahyacode 2>/dev/null || true

echo ""
echo "Build complete! Binary location:"
echo "  $(pwd)/${OUTPUT_NAME}"
echo ""
echo "To install locally, run:"
echo "  cp $(pwd)/${OUTPUT_NAME} ~/.local/bin/sahyacode"
echo ""
echo "Or to test directly:"
echo "  $(pwd)/sahyacode --version"
