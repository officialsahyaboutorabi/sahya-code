from __future__ import annotations

import os
from pathlib import Path


def get_share_dir() -> Path:
    """Get the share directory for sahya-code."""
    if share_dir := os.getenv("SAHYA_SHARE_DIR"):
        share_dir = Path(share_dir)
    elif xdg_data_home := os.getenv("XDG_DATA_HOME"):
        share_dir = Path(xdg_data_home) / "sahya-code"
    else:
        share_dir = Path.home() / ".local" / "share" / "sahya-code"
    share_dir.mkdir(parents=True, exist_ok=True)
    return share_dir


def get_cache_dir() -> Path:
    """Get the cache directory for sahya-code."""
    if cache_dir := os.getenv("SAHYA_CACHE_DIR"):
        cache_dir = Path(cache_dir)
    elif xdg_cache_home := os.getenv("XDG_CACHE_HOME"):
        cache_dir = Path(xdg_cache_home) / "sahya-code"
    else:
        cache_dir = Path.home() / ".cache" / "sahya-code"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir
