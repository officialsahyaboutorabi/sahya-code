#!/usr/bin/env python3
"""
Setup script for Sahya Code TUI.

This script installs Node.js dependencies for the TUI.
"""

import subprocess
import sys
from pathlib import Path


def check_node():
    """Check if Node.js is installed."""
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            check=True,
        )
        print(f"✓ Node.js found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ Node.js not found")
        return False


def check_npm():
    """Check if npm is installed."""
    try:
        result = subprocess.run(
            ["npm", "--version"],
            capture_output=True,
            text=True,
            check=True,
        )
        print(f"✓ npm found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("✗ npm not found")
        return False


def install_dependencies(tui_dir: Path):
    """Install npm dependencies."""
    print("\n📦 Installing TUI dependencies...")
    try:
        subprocess.run(
            ["npm", "install"],
            cwd=tui_dir,
            check=True,
        )
        print("✓ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        return False


def build_tui(tui_dir: Path):
    """Build the TUI."""
    print("\n🔨 Building TUI...")
    try:
        subprocess.run(
            ["npm", "run", "build"],
            cwd=tui_dir,
            check=True,
        )
        print("✓ TUI built successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to build TUI: {e}")
        return False


def main():
    """Main setup function."""
    print("=" * 60)
    print("Sahya Code TUI Setup")
    print("=" * 60)

    # Check prerequisites
    print("\n🔍 Checking prerequisites...")
    if not check_node():
        print("\n❌ Node.js is required but not installed.")
        print("Please install Node.js from https://nodejs.org/")
        print("Or using your package manager:")
        print("  macOS: brew install node")
        print("  Ubuntu/Debian: sudo apt-get install nodejs npm")
        sys.exit(1)

    if not check_npm():
        print("\n❌ npm is required but not installed.")
        sys.exit(1)

    # Find TUI directory
    tui_dir = Path(__file__).parent.parent / "src" / "sahya_code" / "tui"
    if not tui_dir.exists():
        print(f"\n❌ TUI directory not found: {tui_dir}")
        sys.exit(1)

    print(f"\n📁 TUI directory: {tui_dir}")

    # Install dependencies
    if not install_dependencies(tui_dir):
        sys.exit(1)

    # Build TUI
    if not build_tui(tui_dir):
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ TUI setup complete!")
    print("=" * 60)
    print("\nYou can now use the TUI with:")
    print("  sahya-code tui")
    print("\nFor help:")
    print("  sahya-code tui --help")


if __name__ == "__main__":
    main()
