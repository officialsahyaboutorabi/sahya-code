#!/bin/bash
# Generic fast container build skill installer
# This script installs the generic skill components into a target directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$(pwd)}"
CONFIG_FILE="${2:-config.env}"

if [[ ! -d "$TARGET_DIR" ]]; then
    echo "Error: Target directory does not exist: $TARGET_DIR"
    exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  Generic Fast Container Build Skill - Installer  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Target directory: $TARGET_DIR"
echo "Configuration file: $CONFIG_FILE"
echo ""

# Create templates directory if it doesn't exist
TEMPLATES_DIR="$TARGET_DIR/templates"
mkdir -p "$TEMPLATES_DIR"

# Copy template files
echo "▶ Copying template files..."

cp "$SCRIPT_DIR/../templates/generic-build-template.sh" "$TARGET_DIR/fast-build-generic.sh"
cp "$SCRIPT_DIR/../templates/Dockerfile.generic" "$TEMPLATES_DIR/Dockerfile.generic"

# Create a sample configuration file if it doesn't exist
if [[ ! -f "$TARGET_DIR/$CONFIG_FILE" ]]; then
    cat > "$TARGET_DIR/$CONFIG_FILE" << 'EOF'
# Configuration for Generic Fast Container Build
# Customize these values for your specific technology stack

# Container runtime (docker or podman)
export CONTAINER_RUNTIME=podman

# Base image for compilation phase
export BUILD_RUNTIME_IMAGE=node:20-slim

# Path in tmpfs for build artifacts
export ARTIFACTS_TMPFS_PATH=/tmp/app-build

# Name of persistent dependency cache
export DEPENDENCY_CACHE_NAME=my-app-deps-cache

# Mount path for source code in container
export SOURCE_MOUNT_PATH=/app

# Relative path for output artifacts
export OUTPUT_MOUNT_PATH=.output

# Dockerfile for packaging phase
export PACKAGE_DOCKERFILE=Dockerfile.runtime

# Technology-specific build command
export BUILD_COMMAND="yarn install && yarn build"

# Command to copy artifacts from tmpfs to project
export ARTIFACT_COPY_COMMAND='cp -a "$ARTIFACTS_TMPFS_PATH/standalone" "$PROJECT_DIR/.next/standalone" && cp -a "$ARTIFACTS_TMPFS_PATH/static" "$PROJECT_DIR/.next/static"'

# Image tag for the final build
export IMAGE_TAG=localhost/my-app:latest

# Runtime base image for the final container
export RUNTIME_BASE_IMAGE=node:20-slim

# Application artifacts path in the runtime container
export APP_ARTIFACTS_PATH=.output/

# Port to expose
export APP_PORT=3000

# Command to start the application
export APP_START_COMMAND="node server.js"
EOF
    echo "✓ Created sample configuration file: $CONFIG_FILE"
else
    echo "○ Configuration file already exists: $CONFIG_FILE"
fi

# Make scripts executable
chmod +x "$TARGET_DIR/fast-build-generic.sh"

echo ""
echo "✓ Template files installed"
echo ""

# Instructions
echo "═══════════════════════════════════════════════════"
echo "NEXT STEPS:"
echo "═══════════════════════════════════════════════════"
echo ""
echo "1. Review and customize the configuration in $CONFIG_FILE"
echo "2. Create your specific Dockerfile.runtime based on Dockerfile.generic"
echo "3. Run the build script:"
echo "   source $CONFIG_FILE && ./fast-build-generic.sh"
echo ""
echo "For more information, see the SKILL.md documentation."