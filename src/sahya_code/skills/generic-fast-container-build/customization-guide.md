# Customization Guide for Agentic Systems

This document explains how different Agentic systems can customize and integrate the Generic Fast Container Build skill into their workflows.

## Integration Approaches

### 1. Configuration-Based Integration

Agentic systems can integrate by providing environment-specific configurations:

```bash
# Example for a Node.js-focused agent
export BUILD_RUNTIME_IMAGE="node:20-alpine"
export DEPENDENCY_CACHE_NAME="node-${PROJECT_NAME}-modules"
export BUILD_COMMAND="npm ci && npm run build"
export ARTIFACT_COPY_COMMAND='cp -a "$ARTIFACTS_TMPFS_PATH/dist" "$PROJECT_DIR/build/"'
```

### 2. Technology Detection and Auto-Configuration

Agentic systems can detect the project type and automatically configure the skill:

```javascript
// Pseudocode for an agentic system
function detectAndConfigure(projectPath) {
  if (hasFile(`${projectPath}/package.json`)) {
    return {
      BUILD_RUNTIME_IMAGE: "node:20-slim",
      DEPENDENCY_CACHE_NAME: "node-modules-cache",
      BUILD_COMMAND: "yarn install && yarn build",
      ARTIFACT_COPY_COMMAND: 'cp -a "$ARTIFACTS_TMPFS_PATH/standalone" "$PROJECT_DIR/.next/standalone"'
    };
  } else if (hasFile(`${projectPath}/requirements.txt`)) {
    return {
      BUILD_RUNTIME_IMAGE: "python:3.11-slim",
      DEPENDENCY_CACHE_NAME: "python-pip-cache",
      BUILD_COMMAND: "pip install -r requirements.txt && python -m build",
      ARTIFACT_COPY_COMMAND: 'cp -a "$ARTIFACTS_TMPFS_PATH/dist" "$PROJECT_DIR/app/dist"'
    };
  }
  // Additional technology detections...
}
```

### 3. Template Specialization

Agentic systems can create specialized templates for common technology stacks:

#### Node.js Specialization
```bash
# nodejs-build.conf
export BUILD_RUNTIME_IMAGE=node:20-slim
export DEPENDENCY_CACHE_NAME=node-modules-${PROJECT_HASH}
export OUTPUT_MOUNT_PATH=.next
export BUILD_COMMAND='if [ ! -f dependencies/.yarn-integrity ]; then yarn install --frozen-lockfile; fi && yarn build'
export ARTIFACT_COPY_COMMAND='cp -a "$ARTIFACTS_TMPFS_PATH/standalone" "$PROJECT_DIR/.next/standalone" && cp -a "$ARTIFACTS_TMPFS_PATH/static" "$PROJECT_DIR/.next/static"'
```

#### Python Specialization
```bash
# python-build.conf
export BUILD_RUNTIME_IMAGE=python:3.11-slim
export DEPENDENCY_CACHE_NAME=python-venv-${PROJECT_HASH}
export OUTPUT_MOUNT_PATH=dist
export BUILD_COMMAND='if [ ! -f dependencies/.installed ]; then pip install -r requirements.txt && touch dependencies/.installed; fi && python -m build'
export ARTIFACT_COPY_COMMAND='cp -a "$ARTIFACTS_TMPFS_PATH/dist" "$PROJECT_DIR/app/dist"'
```

## Customization Parameters

### Core Parameters
Each agentic system should customize these parameters based on the target environment:

| Parameter | Purpose | Example Values |
|-----------|---------|----------------|
| CONTAINER_RUNTIME | Container engine to use | docker, podman, nerdctl |
| BUILD_RUNTIME_IMAGE | Base image for compilation | node:20, python:3.11, golang:1.21 |
| DEPENDENCY_CACHE_NAME | Persistent cache identifier | project-deps-${hash}, lang-cache |
| BUILD_COMMAND | Technology-specific build | npm run build, mvn package, go build |
| ARTIFACT_COPY_COMMAND | Copy built artifacts | cp, rsync, tar |

### Performance Parameters
Agentic systems can optimize these based on available resources:

| Parameter | Purpose | Tuning Guidance |
|-----------|---------|-----------------|
| ARTIFACTS_TMPFS_PATH | Fast storage location | Use largest available tmpfs |
| PARALLEL_BUILDS | Concurrent build processes | Match to CPU cores |
| CACHE_RETENTION | Cache cleanup policy | Balance space vs reuse |

## API Integration Points

Agentic systems can integrate the skill through these API-like interfaces:

### 1. Pre-Build Hook
```bash
function pre_build_hook() {
  # Called before the build process starts
  # Agentic system can perform setup tasks
  validate_dependencies
  prepare_workspace
  initialize_caches
}
```

### 2. Build Configuration Hook
```bash
function configure_build(project_type, project_path) {
  # Called to get build configuration
  # Agentic system returns appropriate configuration
  case $project_type in
    nodejs) source nodejs-build.conf ;;
    python) source python-build.conf ;;
    java) source java-build.conf ;;
  esac
}
```

### 3. Post-Build Hook
```bash
function post_build_hook() {
  # Called after successful build
  # Agentic system can perform validation, testing, or deployment
  run_tests
  validate_artifacts
  trigger_deployment
}
```

## Adaptive Configuration

Advanced agentic systems can implement adaptive configuration based on:

### Resource Availability
```bash
# Detect available resources and adjust accordingly
if [ $(nproc) -gt 8 ]; then
  export PARALLEL_JOBS=6
elif [ $(nproc) -gt 4 ]; then
  export PARALLEL_JOBS=3
else
  export PARALLEL_JOBS=1
fi

# Adjust tmpfs usage based on available RAM
AVAILABLE_RAM=$(free -g | awk '/^Mem:/{print int($7 * 0.5)}')
if [ $AVAILABLE_RAM -gt 4 ]; then
  export MAX_TMPFS_SIZE="2G"
else
  export MAX_TMPFS_SIZE="1G"
fi
```

### Historical Performance
```bash
# Track build times and adjust parameters
record_build_performance() {
  local duration=$1
  local project_hash=$2
  
  # Store performance data for future optimization
  echo "$project_hash,$duration,$(date -Iseconds)" >> ~/build-performance.csv
}

adjust_for_performance() {
  local project_hash=$1
  local historical_avg=$(get_historical_average $project_hash)
  
  if [ $historical_avg -gt 300 ]; then  # More than 5 minutes
    # Enable more aggressive caching
    export AGGRESSIVE_CACHING=true
  fi
}
```

## Error Handling and Fallbacks

Agentic systems should implement fallback strategies:

```bash
# Fallback to traditional build if fast build fails
perform_fallback_build() {
  echo "Fast build failed, falling back to traditional build"
  
  # Option 1: Traditional docker build
  if [ "$CONTAINER_RUNTIME" = "docker" ]; then
    docker build -t "$IMAGE_TAG" .
  elif [ "$CONTAINER_RUNTIME" = "podman" ]; then
    podman build -t "$IMAGE_TAG" .
  fi
  
  # Option 2: Direct execution without optimization
  # Execute build commands directly in current environment
}

# Monitor build process and trigger fallback if needed
monitor_and_fallback() {
  local timeout_duration=${FAST_BUILD_TIMEOUT:-600}  # 10 minutes
  
  timeout $timeout_duration "$BUILD_SCRIPT" || {
    log_error "Build exceeded timeout, initiating fallback"
    perform_fallback_build
  }
}
```

## Validation and Quality Assurance

Agentic systems should validate the build artifacts:

```bash
validate_build_artifacts() {
  local artifact_dir=$1
  
  # Check that expected artifacts exist
  if [ ! -f "$artifact_dir/server.js" ] && [ ! -d "$artifact_dir/standalone" ]; then
    log_error "Expected build artifacts not found in $artifact_dir"
    return 1
  fi
  
  # Verify artifact integrity
  if command -v sha256sum >/dev/null; then
    sha256sum "$artifact_dir"/* > "$artifact_dir/checksums.sha256"
  fi
  
  # Run lightweight validation tests
  run_validation_suite "$artifact_dir"
}
```

## Integration Examples

### Example 1: CI/CD Integration
```bash
# In a CI/CD pipeline
setup_fast_build_environment() {
  # Configure for CI environment
  export DEPENDENCY_CACHE_NAME="ci-${PROJECT_NAME}-${BRANCH_NAME}-deps"
  export ARTIFACTS_TMPFS_PATH="/tmp/ci-build-${BUILD_ID}"
  
  # Use CI-specific optimizations
  export BUILD_PARALLELISM=$(nproc)
}

run_ci_build() {
  source ci-build.conf
  ./fast-build-generic.sh
  validate_build_artifacts "./.output"
}
```

### Example 2: Development Environment Integration
```bash
# In a development environment
setup_dev_fast_build() {
  # Configure for developer machine
  export DEPENDENCY_CACHE_NAME="dev-${USER}-${PROJECT_NAME}-deps"
  export ARTIFACTS_TMPFS_PATH="/tmp/dev-${PROJECT_NAME}-build"
  
  # Enable developer-friendly features
  export ENABLE_INCREMENTAL_BUILD=true
  export PRESERVE_BUILD_LOGS=true
}

run_dev_build() {
  source dev-build.conf
  time ./fast-build-generic.sh
  echo "Build completed in $SECONDS seconds"
}
```

By following these customization guidelines, agentic systems can effectively adapt the Generic Fast Container Build skill to their specific requirements while maintaining the core performance benefits.