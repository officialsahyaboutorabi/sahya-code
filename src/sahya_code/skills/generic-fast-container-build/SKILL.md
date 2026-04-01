---
name: fast-container-build-generic
description: Accelerate container builds by separating compilation from packaging. Adaptable methodology for various container runtimes and application frameworks.
---

# Generic Fast Container Build Skill

Accelerate container builds from lengthy processes to rapid iteration cycles by separating compilation from packaging.

## Overview

This skill provides a generic methodology for accelerating container builds by decoupling the compilation phase from the packaging phase. The approach can be adapted to various container runtimes (Docker, Podman, containerd) and application frameworks (Node.js, Python, Java, etc.).

## When to Use

Use this skill when:
- Building applications in containers for local development
- Experiencing slow container builds due to repeated dependency installations
- Working with container runtimes that support volume mounting and tmpfs
- Need fast iterative build-test cycles for containerized applications
- Dealing with large dependency trees that slow down builds

## Core Principles

### 1. Separate Compilation from Packaging
Instead of combining all steps in a single container build, split the process:

```
Traditional: [Source] → [Install + Compile + Package] → [Image]
Fast Build:  [Source] → [Compile externally] → [Package prebuilt output] → [Image]
```

### 2. Leverage High-Speed Storage
Use tmpfs (RAM disk) or SSD storage for build outputs to accelerate I/O operations.

### 3. Cache Dependencies Persistently
Store dependencies in persistent volumes or caches to avoid reinstalling on every build.

### 4. Thin Packaging Layer
Create a minimal packaging layer that only copies prebuilt artifacts.

## Generic Implementation Pattern

### Phase 1: External Compilation
- Mount source code into a build container
- Mount persistent dependency cache
- Mount tmpfs for build output
- Execute compilation step
- Copy artifacts to project directory

### Phase 2: Packaging
- Use thin Dockerfile that only copies prebuilt artifacts
- Build runtime image from prebuilt output
- Apply minimal runtime configuration

### Phase 3: Deployment (Optional)
- Restart/redeploy services with new image
- Perform health checks
- Rollback if necessary

## Adapting to Different Technologies

### For Node.js Applications
- Use persistent volume for node_modules
- Output to tmpfs directory (e.g., .next for Next.js)
- Configure standalone output in framework settings

### For Python Applications
- Use persistent volume for virtual environment or pip cache
- Output compiled bytecode to tmpfs
- Consider using pip cache mounts for faster installs

### For Java Applications
- Use persistent volume for Maven/.m2 or Gradle/.gradle caches
- Output compiled classes/JARs to tmpfs
- Leverage incremental compilation features

### For Go Applications
- Use persistent volume for module cache (go mod cache)
- Output binaries to tmpfs
- Consider using build cache mounts

## Configuration Variables Template

When implementing this skill, define these generic variables:

```
BUILD_RUNTIME_IMAGE: Base image for compilation (e.g., node:20, python:3.11)
ARTIFACTS_TMPFS_PATH: Path in tmpfs for build output (e.g., /tmp/build-output)
DEPENDENCY_CACHE_NAME: Name of persistent cache/volume for dependencies
SOURCE_MOUNT_PATH: Path where source code is mounted in container
OUTPUT_MOUNT_PATH: Path where build artifacts are placed
PACKAGE_DOCKERFILE: Dockerfile for packaging phase
CONTAINER_RUNTIME: Container runtime to use (docker, podman, etc.)
```

## Benefits Across Technologies

| Scenario | Traditional | Fast Build |
|----------|-------------|------------|
| First build (cold) | Variable | Reduced by caching |
| Code change only | Full rebuild | **Significant improvement** |
| Dependency added | Full rebuild | Moderate improvement |
| After reboot | Full rebuild | **Significant improvement** |

## Implementation Guidelines

### 1. Identify Build Artifacts
Determine what files need to be copied from compilation to packaging phase.

### 2. Set Up Dependency Caching
Configure persistent storage for dependencies that don't change frequently.

### 3. Configure Fast Storage
Use tmpfs or SSD storage for build output to accelerate I/O.

### 4. Create Thin Packaging Layer
Design packaging Dockerfile to only copy necessary prebuilt artifacts.

### 5. Implement Build Script
Create orchestration script that manages both phases.

## Generic Build Script Template

```bash
#!/bin/bash
# Generic fast build script template
# Customize variables for your specific technology stack

set -euo pipefail

# Configuration - customize for your environment
BUILD_RUNTIME_IMAGE="${BUILD_RUNTIME_IMAGE:-node:20-slim}"  # Change as needed
ARTIFACTS_TMPFS_PATH="${ARTIFACTS_TMPFS_PATH:-/tmp/app-build}"  # tmpfs path
DEPENDENCY_CACHE_NAME="${DEPENDENCY_CACHE_NAME:-app-dependencies-cache}"  # Persistent cache
SOURCE_MOUNT_PATH="${SOURCE_MOUNT_PATH:-/app}"  # Mount path in container
OUTPUT_MOUNT_PATH="${OUTPUT_MOUNT_PATH:-.output}"  # Relative to project
PACKAGE_DOCKERFILE="${PACKAGE_DOCKERFILE:-Dockerfile.runtime}"  # Packaging Dockerfile
CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"  # docker or podman
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_TAG="${IMAGE_TAG:-localhost/generic-app:latest}"

echo "Starting generic fast build process..."
echo "Runtime: $BUILD_RUNTIME_IMAGE"
echo "Artifacts path: $ARTIFACTS_TMPFS_PATH"
echo "Dependency cache: $DEPENDENCY_CACHE_NAME"

# Ensure dependency cache exists
if ! $CONTAINER_RUNTIME volume inspect "${DEPENDENCY_CACHE_NAME}" &>/dev/null; then
    echo "Creating dependency cache: ${DEPENDENCY_CACHE_NAME}"
    $CONTAINER_RUNTIME volume create "${DEPENDENCY_CACHE_NAME}"
fi

# Phase 1: External compilation
echo "Phase 1: Compiling on fast storage..."
$CONTAINER_RUNTIME run --rm \
    --network host \
    -v "${PROJECT_DIR}:${SOURCE_MOUNT_PATH}:z" \
    -v "${DEPENDENCY_CACHE_NAME}:${SOURCE_MOUNT_PATH}/dependencies:z" \
    -v "${ARTIFACTS_TMPFS_PATH}:${SOURCE_MOUNT_PATH}/${OUTPUT_MOUNT_PATH}:z" \
    -w "${SOURCE_MOUNT_PATH}" \
    "${BUILD_RUNTIME_IMAGE}" \
    bash -c "
        # Install dependencies if needed (technology-specific)
        # BUILD_COMMAND: Replace with your build command
        # Examples:
        #   yarn install && yarn build
        #   pip install -r requirements.txt && python setup.py build
        #   mvn clean compile package
        #   go build -o bin/app .
    "

# Copy build artifacts from tmpfs to project directory
# ARTIFACT_COPY_COMMAND: Technology-specific artifact copying
# Examples:
#   cp -a "${ARTIFACTS_TMPFS_PATH}/standalone" "${PROJECT_DIR}/${OUTPUT_MOUNT_PATH}/standalone"
#   cp -a "${ARTIFACTS_TMPFS_PATH}/dist" "${PROJECT_DIR}/dist"
#   cp -a "${ARTIFACTS_TMPFS_PATH}/target/*.jar" "${PROJECT_DIR}/app.jar"

# Phase 2: Packaging
echo "Phase 2: Packaging runtime image..."
$CONTAINER_RUNTIME build \
    --file "${PROJECT_DIR}/${PACKAGE_DOCKERFILE}" \
    --tag "${IMAGE_TAG}" \
    "${PROJECT_DIR}"

echo "Build completed successfully!"
```

## Technology-Specific Customization Examples

### Node.js/Next.js
- BUILD_RUNTIME_IMAGE: node:20-slim
- DEPENDENCY_CACHE_NAME: app-node-modules
- OUTPUT_MOUNT_PATH: .next
- BUILD_COMMAND: if [ ! -f dependencies/.yarn-integrity ]; then yarn install --frozen-lockfile; fi && yarn build
- ARTIFACT_COPY_COMMAND: cp -a "${ARTIFACTS_TMPFS_PATH}/standalone" "${PROJECT_DIR}/.next/standalone" && cp -a "${ARTIFACTS_TMPFS_PATH}/static" "${PROJECT_DIR}/.next/static"

### Python/Django
- BUILD_RUNTIME_IMAGE: python:3.11-slim
- DEPENDENCY_CACHE_NAME: app-pip-cache
- OUTPUT_MOUNT_PATH: dist
- BUILD_COMMAND: if [ ! -f dependencies/.installed ]; then pip install -r requirements.txt && touch dependencies/.installed; fi && python setup.py build
- ARTIFACT_COPY_COMMAND: cp -a "${ARTIFACTS_TMPFS_PATH}/lib" "${PROJECT_DIR}/app/lib" && cp -a "${ARTIFACTS_TMPFS_PATH}/bin" "${PROJECT_DIR}/app/bin"

### Java/Spring Boot
- BUILD_RUNTIME_IMAGE: maven:3-openjdk-17
- DEPENDENCY_CACHE_NAME: app-maven-cache
- OUTPUT_MOUNT_PATH: target
- BUILD_COMMAND: mvn -Dmaven.repo.local=dependencies/repository clean package
- ARTIFACT_COPY_COMMAND: cp "${ARTIFACTS_TMPFS_PATH}/*.jar" "${PROJECT_DIR}/app.jar"

## Troubleshooting

### Issue: Cache not persisting
Solution: Verify that the container runtime supports named volumes and that the volume name is consistent between runs.

### Issue: Build artifacts not found
Solution: Check that the output paths in the build command match the paths used in the artifact copying step.

### Issue: Permissions problems
Solution: Ensure that the user in the build container has appropriate permissions to read/write to mounted volumes.

## Key Benefits for Agentic Systems

1. **Technology Agnostic**: Can be adapted to any programming language or framework
2. **Runtime Flexible**: Works with Docker, Podman, or other container runtimes
3. **Configurable**: Variables can be adjusted for different environments
4. **Performance Focused**: Maintains the core performance benefits regardless of implementation
5. **Modular**: Each phase can be modified independently

## Integration Points for Agentic Systems

Agentic systems can integrate this skill by:
- Providing configuration parameters based on the target technology
- Implementing the build orchestration as an agent capability
- Monitoring build performance and adjusting parameters automatically
- Integrating with CI/CD pipelines for seamless adoption