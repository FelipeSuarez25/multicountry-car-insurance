#!/usr/bin/env python3
"""Redact exact strings (real personal data) from exported session logs, reproducibly.

Usage (run with `python3 -I`):
    REDACT_STRINGS='first,second' python3 -I scripts/redact-logs.py logs/sessions/<dir>

- The strings to redact come from the REDACT_STRINGS environment variable (comma-separated), so the
  real values are never written into the repository. Longer strings are replaced first.
- Each occurrence is replaced by `[redacted]`. Nothing else in the file changes.
- Every JSONL line must still parse as JSON afterwards, or the file is left untouched.
- Prints per-file counts so the change can be recorded in logs/sessions/README.md.

This is the only edit ever applied to exported logs (human decision, 2026-11-21): the assessment asks
for unedited logs and also forbids real personal data in the repository.
"""
import json
import os
import pathlib
import sys

REPLACEMENT = b"[redacted]"


def main() -> int:
    raw = os.environ.get("REDACT_STRINGS", "")
    targets = sorted({s.strip().encode() for s in raw.split(",") if s.strip()}, key=len, reverse=True)
    if not targets or len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    total = 0
    for path in sorted(pathlib.Path(sys.argv[1]).rglob("*.jsonl")):
        data = path.read_bytes()
        counts = [data.count(t) for t in targets]
        if not any(counts):
            continue
        out = data
        for t in targets:
            out = out.replace(t, REPLACEMENT)
        for line in out.splitlines():
            if line.strip():
                json.loads(line)  # raises: the file is left untouched
        path.write_bytes(out)
        total += sum(counts)
        print(f"{path}: {sum(counts)} occurrence(s) redacted")
    print(f"total redacted: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
