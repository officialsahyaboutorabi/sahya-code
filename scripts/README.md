# Installation Scripts

This directory contains installation and setup scripts for Sahya Code.

## Scripts

### `install-remote.sh`

One-line installer for remote distribution. Users can install with:

```bash
curl -fsSL https://your-domain.com/install.sh | sh
```

**Features:**
- Installs `uv` if not present
- Installs Sahya Code from PyPI
- Sets up default configuration
- Detects optional dependencies (Node.js, ripgrep)

**Usage:**

```bash
# Direct usage
./scripts/install-remote.sh

# Or hosted
curl -fsSL https://your-domain.com/install.sh | sh
```

### `setup-dev.sh`

Development environment setup script. Use this when setting up the project for development.

**Features:**
- Checks prerequisites
- Installs uv
- Sets up Python 3.13
- Installs all dependencies
- Sets up TUI
- Creates default config

**Usage:**

```bash
./scripts/setup-dev.sh
```

## Root `install.sh`

The main install script in the project root supports multiple installation modes:

```bash
# Install from local source (default)
./install.sh

# Install from PyPI
./install.sh --pypi

# Install without TUI
./install.sh --skip-tui

# Use specific Python version
./install.sh --python 3.12

# Show help
./install.sh --help
```

## Makefile Targets

Convenient Makefile targets for installation:

```bash
# Development install (editable + all deps)
make install-dev

# Local install from source
make install-local

# Install from PyPI
make install

# Install only TUI dependencies
make install-tui

# Uninstall
make uninstall

# Reinstall
make reinstall
```

## Hosting the Remote Installer

To host the remote installer:

1. Upload `scripts/install-remote.sh` to your web server
2. Ensure it's served with the correct MIME type (`text/plain` or `application/octet-stream`)
3. Provide users with the curl command:

```bash
curl -fsSL https://your-domain.com/install.sh | sh
```

### GitHub Raw (Free Hosting)

You can use GitHub's raw content URL:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/sahya-code/main/scripts/install-remote.sh | sh
```

### Security Considerations

- Always serve over HTTPS
- Consider providing a checksum for verification
- Document what the script does
- Allow users to inspect before running:

```bash
# Inspect before running
curl -fsSL https://your-domain.com/install.sh | less

# Then run
curl -fsSL https://your-domain.com/install.sh | sh
```

## Testing Install Scripts

Test the install scripts in a clean environment:

```bash
# Test in Docker
docker run -it --rm -v "$PWD":/workspace ubuntu:22.04 bash
# Then inside container:
cd /workspace && ./install.sh
```

Or use the Makefile:

```bash
# Test local install
make install-local

# Test dev install
make install-dev
```
