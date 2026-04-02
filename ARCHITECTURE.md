# Sahya Code Architecture

This document describes the architecture of Sahya Code, focusing on the installation system, version management, and build process.

## Table of Contents

- [Overview](#overview)
- [Version Management](#version-management)
- [Installation System](#installation-system)
- [Build Process](#build-process)
- [Upgrade Flow](#upgrade-flow)
- [Release Process](#release-process)

---

## Overview

Sahya Code is a terminal-based AI coding agent. The architecture consists of:

- **CLI Application** (`packages/opencode/`): Main TypeScript/Bun application
- **Install Script** (`sahyagpt/install.sh`): curl-based installer hosted at sbgpt.qzz.io
- **Version Tracking** (`version.txt`): Single source of truth for current version
- **GitHub Releases**: Binary distribution via GitHub releases

---

## Version Management

### Version Sources

```
┌─────────────────┐
│   version.txt   │  ← Source of truth (e.g., "v2.13.4")
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌─────────────────────┐
│ GitHub │ │  Installation.check │
│Releases│ │  (latest version)   │
└────────┘ └─────────────────────┘
```

### How Version Flows

1. **version.txt** - Contains current version (e.g., `v2.13.4`)
2. **Build-time** - `OPENCODE_VERSION` env var bakes version into binary
3. **Runtime** - Binary reports version via `--version`
4. **Update check** - Installation.latest() reads version.txt from GitHub

### Key Files

| File | Purpose |
|------|---------|
| `version.txt` | Source of truth for current version |
| `packages/opencode/src/installation/meta.ts` | Runtime version constants |
| `packages/script/src/index.ts` | Build-time version resolution |

### Version Format

- **version.txt**: `v2.13.4` (with 'v' prefix)
- **Binary**: `2.13.4` (without 'v' prefix, or `0.0.0-main-*` if not set)
- **GitHub Releases**: `v2.13.4` (tag)

---

## Installation System

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    INSTALLATION SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │ Install Script│─────▶│ GitHub Releases│────▶│ Binary   │  │
│  │(sbgpt.qzz.io)│      │                │      │          │  │
│  └──────────────┘      └──────────────┘      └──────────┘  │
│         │                                              │    │
│         │                                              │    │
│         ▼                                              ▼    │
│  ┌──────────────┐                            ┌──────────┐  │
│  │  ~/.local/   │                            │  TUI     │  │
│  │  bin/        │                            │  Notif.  │  │
│  └──────────────┘                            └──────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Install Script Flow

```
curl -fsSL https://sbgpt.qzz.io/install.sh | bash
                    │
                    ▼
┌─────────────────────────────────────┐
│ 1. Detect platform/arch             │
│    (darwin-arm64, linux-x64, etc.)  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 2. Get latest version from GitHub   │
│    API: /releases/latest            │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 3. Download tar.gz                  │
│    sahyacode-{platform}-{arch}.tar.gz
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 4. Extract archive                  │
│    tar -xzf ...                     │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 5. Find binary                      │
│    sahyacode-*/bin/opencode         │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 6. Install to ~/.local/bin/         │
│    mv opencode ~/.local/bin/sahyacode
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ 7. Create symlink                   │
│    ln -s sahyacode opencode         │
└─────────────────────────────────────┘
```

### Archive Structure

```
sahyacode-darwin-arm64.tar.gz
└── sahyacode-darwin-arm64/
    ├── bin/
    │   └── opencode          ← Actual binary (named 'opencode' internally)
    └── package.json
```

**Note**: The binary inside is named `opencode` for backward compatibility with the original codebase, but gets renamed to `sahyacode` during installation.

---

## Build Process

### Build Flow

```
Environment: OPENCODE_VERSION="2.13.4"
                     │
                     ▼
┌─────────────────────────────────────────┐
│ bun run script/build.ts --single        │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌───────┐   ┌───────┐   ┌──────────┐
│ Build │   │ Embed │   │ Package  │
│  App  │   │Version│   │  tar.gz  │
└───┬───┘   └───┬───┘   └────┬─────┘
    │           │            │
    └───────────┼────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ dist/sahyacode-darwin-arm64/bin/opencode│
└─────────────────────────────────────────┘
```

### Key Build Steps

1. **Compile TypeScript** - Bun compiles TS to native binary
2. **Embed Version** - `OPENCODE_VERSION` → `OPENCODE_VERSION` define
3. **Embed Migrations** - SQL migrations baked into binary
4. **Smoke Test** - Run `--version` to verify build
5. **Package** - Create tar.gz archive

### Critical: Version Embedding

The version is embedded at **compile time** via `define`:

```typescript
// packages/opencode/script/build.ts
Bun.build({
  define: {
    OPENCODE_VERSION: `'${Script.version}'`,
    // ...
  }
})
```

**Script.version** comes from `packages/script/src/index.ts`:

```typescript
const VERSION = await (async () => {
  if (env.OPENCODE_VERSION) return env.OPENCODE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${TIMESTAMP}`
  // ...
})()
```

**Without `OPENCODE_VERSION` env var**, the binary will report `0.0.0-main-TIMESTAMP`.

---

## Upgrade Flow

### Automatic Update Check

```
┌──────────────┐
│  TUI Startup │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Installation.info│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────┐
│ Compare VERSION  │────▶│ Latest from  │
│ with latest      │     │ version.txt  │
└────────┬─────────┘     └──────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│Update │ │ No update│
│avail. │ │ needed   │
└───┬───┘ └──────────┘
    │
    ▼
┌──────────────────┐
│ Show notification│
│ "v2.13.4 is      │
│  available"      │
└──────────────────┘
```

### Upgrade Command Flow

```
sahyacode upgrade
       │
       ▼
┌──────────────────┐
│ Detect method    │
│ (curl/npm/brew)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Get target ver   │
│ (default: latest)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ method = "curl"  │────▶ Download install.sh
│                  │       Run with VERSION=target
└──────────────────┘
```

### Upgrade via curl (default)

```typescript
// packages/opencode/src/installation/index.ts
const upgradeCurl = Effect.fnUntraced(function* (target: string) {
  // 1. Download install.sh
  const response = yield* httpOk.execute(
    HttpClientRequest.get("https://sbgpt.qzz.io/install.sh")
  )
  const body = yield* response.text
  
  // 2. Execute with VERSION env var
  const proc = ChildProcess.make("bash", [], {
    stdin: Stream.make(bodyBytes),
    env: { VERSION: target },  // ← Key: tells install.sh which version
    extendEnv: true,
  })
  
  // 3. Run installer
  const handle = yield* spawner.spawn(proc)
  // ...
})
```

---

## Release Process

### Manual Release Steps

```bash
# 1. Update version
echo "v2.13.4" > version.txt
git add version.txt
git commit -m "chore: bump version to v2.13.4"

# 2. Build with version
export OPENCODE_VERSION="2.13.4"
cd packages/opencode
bun run script/build.ts --single

# 3. Package
cd dist/sahyacode-darwin-arm64
tar -czf ../../../sahyacode-darwin-arm64.tar.gz .

# 4. Tag and push
git tag v2.13.4
git push origin v2.13.4

# 5. Create release
gh release create v2.13.4 \
  --title "v2.13.4" \
  --notes "Release notes..." \
  sahyacode-darwin-arm64.tar.gz
```

### Automated Release (GitHub Actions)

The `.github/workflows/publish.yml` handles:
1. Version bumping
2. Multi-platform builds
3. Creating GitHub release
4. Uploading binaries

---

## Common Issues & Solutions

### Issue: Binary shows `0.0.0-main-*`

**Cause**: `OPENCODE_VERSION` env var not set during build

**Fix**:
```bash
export OPENCODE_VERSION="2.13.4"
bun run script/build.ts --single
```

### Issue: Upgrade shows `vv2.13.3`

**Cause**: UI adds 'v' prefix to version that already has it

**Fix**: In `app.tsx`, remove hardcoded 'v':
```typescript
// Before: `SahyaCode v${version} is available`
// After:  `SahyaCode ${version} is available`
```

### Issue: Install fails with 404

**Cause**: Install script expects raw binary but gets tar.gz

**Fix**: Update install.sh to extract archive:
```bash
tar -xzf "$archive_path" -C "$TEMP_DIR"
mv "$EXTRACTED_DIR/bin/opencode" "$INSTALL_DIR/sahyacode"
```

### Issue: Can't find binary in archive

**Cause**: Binary is at `sahyacode-*/bin/opencode`, not root

**Fix**: Update install.sh path detection

---

## File Reference

| File | Purpose |
|------|---------|
| `version.txt` | Current version (source of truth) |
| `packages/opencode/src/installation/index.ts` | Installation & upgrade logic |
| `packages/opencode/src/installation/meta.ts` | Version constants |
| `packages/opencode/src/cli/cmd/tui/app.tsx` | Update notifications UI |
| `packages/opencode/script/build.ts` | Build script |
| `packages/script/src/index.ts` | Script utilities & version resolution |
| `install.sh` | Local install script |
| `sahyagpt/install.sh` | Public install script (sbgpt.qzz.io) |

---

## See Also

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [SAHYA_CHANGES.md](./SAHYA_CHANGES.md) - Rebranding details
- [README.md](./README.md) - User documentation
