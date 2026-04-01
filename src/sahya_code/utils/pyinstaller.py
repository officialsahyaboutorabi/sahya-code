from __future__ import annotations

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

hiddenimports = collect_submodules("sahya_code.tools") + ["setproctitle"]
datas = (
    collect_data_files(
        "sahya_code",
        includes=[
            "agents/**/*.yaml",
            "agents/**/*.md",
            "deps/bin/**",
            "prompts/**/*.md",
            "skills/**",
            "tools/**/*.md",
            "web/static/**",
            "vis/static/**",
            "CHANGELOG.md",
        ],
        excludes=[
            "tools/*.md",
        ],
    )
    + collect_data_files(
        "dateparser",
        includes=["**/*.pkl"],
    )
    + collect_data_files(
        "fastmcp",
        includes=["../fastmcp-*.dist-info/*"],
    )
)
