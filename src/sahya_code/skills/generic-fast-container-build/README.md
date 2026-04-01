# Generic Fast Container Build Skill

A technology-agnostic methodology for accelerating container builds by separating compilation from packaging. This skill can be adapted to various programming languages, frameworks, and container runtimes.

## Overview

This skill provides a generic approach to accelerate container builds by decoupling the compilation phase from the packaging phase. The methodology can be applied to different technology stacks including Node.js, Python, Java, Go, and others.

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Source Code   │────→│  Compile Phase   │────→│  Package Phase  │
│                 │     │                  │     │                 │
│  - src/         │     │  - tmpfs output  │     │  - Copy to      │
│  - dependencies │     │  - dependency    │     │    project dir  │
│  - config       │     │    cache         │     │  - build image  │
└─────────────────┘     │  - build         │     │                 │
                        └──────────────────┘     └─────────────────┘
                                 ~fast              ~minimal time
```

## Quick Start for Agentic Systems

1. **Identify target technology** (Node.js, Python, Java, etc.)

2. **Define configuration variables** based on your technology stack:
   - Build runtime image
   - Dependency cache name
   - Artifacts path
   - Build commands
   - Artifact copy commands

3. **Customize the generic template** with your specific values

4. **Implement the orchestration** in your agent's build process

## Configuration Template

The skill uses these configurable parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| BUILD_RUNTIME_IMAGE | Base image for compilation | node:20-slim, python:3.11 |
| ARTIFACTS_TMPFS_PATH | Path in tmpfs for build output | /tmp/build-output |
| DEPENDENCY_CACHE_NAME | Name of persistent cache/volume | app-dependencies-cache |
| SOURCE_MOUNT_PATH | Path where source code is mounted | /app |
| OUTPUT_MOUNT_PATH | Path for build artifacts | .output, dist, target |
| PACKAGE_DOCKERFILE | Dockerfile for packaging phase | Dockerfile.runtime |
| CONTAINER_RUNTIME | Container runtime to use | docker, podman |
| BUILD_COMMAND | Technology-specific build command | yarn build, mvn package |
| ARTIFACT_COPY_COMMAND | Command to copy artifacts | cp -a, rsync |

## Technology-Specific Examples

### Node.js Applications
```bash
export BUILD_RUNTIME_IMAGE="node:20-slim"
export DEPENDENCY_CACHE_NAME="node-modules-cache"
export OUTPUT_MOUNT_PATH=".next"
export BUILD_COMMAND="yarn install && yarn build"
export ARTIFACT_COPY_COMMAND="cp -a /tmp/build/standalone ./.next/standalone"
```

### Python Applications
```bash
export BUILD_RUNTIME_IMAGE="python:3.11-slim"
export DEPENDENCY_CACHE_NAME="pip-cache"
export OUTPUT_MOUNT_PATH="dist"
export BUILD_COMMAND="pip install -r requirements.txt && python setup.py build"
export ARTIFACT_COPY_COMMAND="cp -a /tmp/build/lib ./app/lib"
```

### Java Applications
```bash
export BUILD_RUNTIME_IMAGE="maven:3-openjdk-17"
export DEPENDENCY_CACHE_NAME="maven-repo-cache"
export OUTPUT_MOUNT_PATH="target"
export BUILD_COMMAND="mvn -Dmaven.repo.local=/cache/repo clean package"
export ARTIFACT_COPY_COMMAND="cp /tmp/build/*.jar ./app.jar"
```

## Integration with Agentic Systems

Agentic systems can implement this skill by:

1. **Parameter Injection**: Injecting the appropriate configuration values based on the detected technology stack

2. **Template Specialization**: Creating specialized templates for common technology stacks

3. **Monitoring**: Tracking build times and performance improvements

4. **Adaptive Configuration**: Automatically tuning parameters based on project characteristics

5. **Error Handling**: Implementing fallback mechanisms if the fast build approach fails

## Expected Improvements

The generic fast build approach typically provides:

- **Code changes**: 70-90% reduction in build time
- **Dependency changes**: 50-70% reduction in build time  
- **Cold builds**: 20-40% reduction in build time
- **Consistent performance**: Predictable build times regardless of dependency tree size

## Requirements

- Container runtime (Docker, Podman, etc.)
- Access to mount volumes and tmpfs
- Ability to execute shell commands
- Sufficient RAM for tmpfs (typically 1-4GB depending on project size)

## Troubleshooting

### Build artifacts not found
- Verify that the OUTPUT_MOUNT_PATH matches the actual build output location
- Check that ARTIFACT_COPY_COMMAND correctly identifies and copies the right files

### Cache not persisting
- Ensure the DEPENDENCY_CACHE_NAME is consistent between builds
- Verify that the container runtime supports named volumes

### Performance not improved
- Confirm that ARTIFACTS_TMPFS_PATH is actually using tmpfs (check with `df -T /tmp`)
- Verify that the build process is I/O bound rather than CPU bound

## Extending the Skill

Agentic systems can extend this skill by:

- Adding support for additional technology stacks
- Implementing automatic detection of project types
- Creating performance benchmarks and optimization suggestions
- Adding integration with cloud build services
- Implementing distributed build capabilities