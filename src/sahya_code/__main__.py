from __future__ import annotations

import sys
from collections.abc import Sequence
from pathlib import Path


def _prog_name() -> str:
    return Path(sys.argv[0]).name or "sahya"


def main(argv: Sequence[str] | None = None) -> int | str | None:
    args = list(sys.argv[1:] if argv is None else argv)

    if len(args) == 1 and args[0] in {"--version", "-V"}:
        from sahya_code.constant import get_version

        print(f"sahya-code, version {get_version()}")
        return 0

    from sahya_code.cli import cli

    try:
        return cli(args=args, prog_name=_prog_name())
    except SystemExit as exc:
        return exc.code


if __name__ == "__main__":
    raise SystemExit(main())
