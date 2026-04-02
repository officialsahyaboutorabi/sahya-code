#!/bin/bash
set -e

echo "Building SahyaCode for local macOS..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

cd packages/opencode

echo "Installing dependencies..."
bun install

echo "Building for macOS ARM64..."
bun build --compile --target=bun-darwin-arm64 ./src/index.ts --outfile ./bin/sahyacode-darwin-arm64

echo "Creating sahyacode symlink..."
ln -sf sahyacode-darwin-arm64 ./bin/sahyacode

echo ""
echo "Build complete! Binary location:"
echo "  $(pwd)/bin/sahyacode-darwin-arm64"
echo ""
echo "To install locally, run:"
echo "  cp $(pwd)/bin/sahyacode-darwin-arm64 ~/.local/bin/sahyacode"
echo ""
echo "Or to test directly:"
echo "  $(pwd)/bin/sahyacode --version"
