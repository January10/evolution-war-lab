#!/usr/bin/env python3
"""Independent permission and scope gate for an AI-authored staged patch."""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
ALLOWED_SINGLE = {"docs/ROADMAP.md", "ITERATION_LOG.md", "README.md", "package.json"}
REQUIRED_DOCS = {"docs/ROADMAP.md", "ITERATION_LOG.md"}
MAX_PATCH_BYTES = 110_000


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def check():
    raw = git("diff", "--cached", "--name-status", "-z").decode("utf-8")
    chunks = raw.strip("\0").split("\0") if raw else []
    if not chunks or len(chunks) % 2:
        raise ValueError("no valid staged code+test changes (or rename detected)")
    names = []
    for i in range(0, len(chunks), 2):
        status, name = chunks[i], chunks[i + 1]
        if status not in {"A", "M"}:
            raise ValueError(f"refusing deletion, rename, or unexpected status: {status} {name}")
        posix = pathlib.PurePosixPath(name)
        if (posix.is_absolute() or ".." in posix.parts or "\\" in name
                or name.startswith(".") and name not in ALLOWED_SINGLE):
            raise ValueError(f"unsafe path: {name}")
        allowed = (
            name in ALLOWED_SINGLE
            or (name.startswith("src/") and name.endswith((".js", ".css")))
            or (name.startswith("test/") and name.endswith(".test.js"))
        )
        if not allowed:
            raise ValueError(f"outside project gameplay allowlist: {name}")
        names.append(name)
    if not any(x.startswith("src/") for x in names):
        raise ValueError("must modify actual game source, not just notes")
    if not any(x.startswith("test/") for x in names):
        raise ValueError("must add or update a focused regression test")
    if not REQUIRED_DOCS.issubset(names):
        raise ValueError("must update both ITERATION_LOG.md and docs/ROADMAP.md")
    if len(names) > 9:
        raise ValueError("more than 9 paths: too much for a single iteration")
    diff = git("diff", "--cached", "--binary")
    if len(diff) > MAX_PATCH_BYTES:
        raise ValueError(f"patch too large: {len(diff)} bytes")
    git("diff", "--cached", "--check")
    for name in names:
        result = git("ls-files", "--stage", "--", name).decode("utf-8").split()
        if not result or result[0] != "100644":
            raise ValueError(f"unsafe Git file mode for {name}")
    print(f"PATCH_SCOPE_PASS files={len(names)} bytes={len(diff)}: {', '.join(names)}")


if __name__ == "__main__":
    try:
        check()
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"PATCH_SCOPE_FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
