#!/bin/bash
# Generic fast build script template
# This template can be customized for different technology stacks
# and integrated into various agentic systems

set -euo pipefail

# Configuration variables - these should be defined by the agentic system
# based on the detected technology stack and environment
BUILD_RUNTIME_IMAGE="${BUILD_RUNTIME_IMAGE:-node:20-slim}"  # Base image for compilation
ARTIFACTS_TMPFS_PATH="${ARTIFACTS_TMPFS_PATH:-/tmp/build-output}"  # tmpfs path for artifacts
DEPENDENCY_CACHE_NAME="${DEPENDENCY_CACHE_NAME:-app-dependencies-cache}"  # Persistent cache name
SOURCE_MOUNT_PATH="${SOURCE_MOUNT_PATH:-/app}"  # Mount path in container
OUTPUT_MOUNT_PATH="${OUTPUT_MOUNT_PATH:-.output}"  # Relative to project for artifacts
PACKAGE_DOCKERFILE="${PACKAGE_DOCKERFILE:-Dockerfile.runtime}"  # Packaging Dockerfile
CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"  # Container runtime (docker/podman)
BUILD_COMMAND="${BUILD_COMMAND:-echo 'BUILD_COMMAND not set'}"  # Technology-specific build command
ARTIFACT_COPY_COMMAND="${ARTIFACT_COPY_COMMAND:-echo 'ARTIFACT_COPY_COMMAND not set'}"  # Copy artifacts command
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
IMAGE_TAG="${IMAGE_TAG:-localhost/generic-app:latest}"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Generic Fast Container Build                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo "  Runtime: $BUILD_RUNTIME_IMAGE"
echo "  Artifacts path: $ARTIFACTS_TMPFS_PATH"
echo "  Dependency cache: $DEPENDENCY_CACHE_NAME"
echo "  Container runtime: $CONTAINER_RUNTIME"
echo ""

# Validate required variables are set
if [[ "$BUILD_COMMAND" == *"BUILD_COMMAND not set"* ]]; then
    echo "ERROR: BUILD_COMMAND must be defined for your technology stack"
    echo "Examples:"
    echo "  Node.js: 'yarn install && yarn build'"
    echo "  Python: 'pip install -r requirements.txt && python setup.py build'"
    echo "  Java: 'mvn -Dmaven.repo.local=dependencies/repository clean package'"
    exit 1
fi

if [[ "$ARTIFACT_COPY_COMMAND" == *"ARTIFACT_COPY_COMMAND not set"* ]]; then
    echo "ERROR: ARTIFACT_COPY_COMMAND must be defined for your technology stack"
    echo "Examples:"
    echo "  Node.js: 'cp -a \"\$ARTIFACTS_TMPFS_PATH/standalone\" \"\$PROJECT_DIR/.next/standalone\"'"
    echo "  Python: 'cp -a \"\$ARTIFACTS_TMPFS_PATH/lib\" \"\$PROJECT_DIR/app/lib\"'"
    echo "  Java: 'cp \"\$ARTIFACTS_TMPFS_PATH/*.jar\" \"\$PROJECT_DIR/app.jar\"'"
    exit 1
fi

# Ensure dependency cache exists
if ! $CONTAINER_RUNTIME volume inspect "${DEPENDENCY_CACHE_NAME}" &>/dev/null; then
    echo "⚠ Cache '${DEPENDENCY_CACHE_NAME}' not found. Creating..."
    $CONTAINER_RUNTIME volume create "${DEPENDENCY_CACHE_NAME}"
fi

# Phase 1: External compilation on fast storage
echo "▶ Phase 1/2 — Compiling on fast storage..."
T_START=$(date +%s)

$CONTAINER_RUNTIME run --rm \
    --network host \
    --name "generic-build-$(date +%s)" \
    -v "${PROJECT_DIR}:${SOURCE_MOUNT_PATH}:z" \
    -v "${DEPENDENCY_CACHE_NAME}:${SOURCE_MOUNT_PATH}/dependencies:z" \
    -v "${ARTIFACTS_TMPFS_PATH}:${SOURCE_MOUNT_PATH}/${OUTPUT_MOUNT_PATH}:z" \
    -w "${SOURCE_MOUNT_PATH}" \
    "${BUILD_RUNTIME_IMAGE}" \
    bash -c "
        set -e
        echo '  [build] Executing: $BUILD_COMMAND'
        $BUILD_COMMAND
        echo '  [build] Done.'
    "

T_COMPILE=$(date +%s)
echo "  ✓ Compiled in $((T_COMPILE - T_START))s"
echo ""

# Phase 2: Copy artifacts and package
echo "▶ Phase 2/2 — Packaging runtime image..."
T_PACK_START=$(date +%s)

# Execute the artifact copy command
eval "$ARTIFACT_COPY_COMMAND"

# Build runtime image
$CONTAINER_RUNTIME build \
    --file "${PROJECT_DIR}/${PACKAGE_DOCKERFILE}" \
    --tag "${IMAGE_TAG}" \
    --label "built=$(date -Iseconds)" \
    "${PROJECT_DIR}"

T_PACK=$(date +%s)
echo "  ✓ Packaged in $((T_PACK - T_PACK_START))s"
echo ""

# Summary
T_TOTAL=$(date +%s)
echo "╔══════════════════════════════════════════════════╗"
printf "║  ✓ Done in %ds                                  ║\n" $((T_TOTAL - T_START))
echo "╚══════════════════════════════════════════════════╝"
echo ""

echo "Next steps:"
echo "- Verify the built image: $CONTAINER_RUNTIME images | grep $(echo $IMAGE_TAG | cut -d: -f1)"
echo "- Run the container: $CONTAINER_RUNTIME run -p 3000:3000 $IMAGE_TAG"