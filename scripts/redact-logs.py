#!/usr/bin/env python3
"""Redact real personal data from exported session logs, reproducibly. Called by scripts/redact-logs.sh.

Usage (run with `python3 -I`; normally through scripts/redact-logs.sh):
    REDACT_FILE=/path/outside/the/repo/personal.txt python3 -I scripts/redact-logs.py logs/sessions/<dir-or-file>

Policy (human decision, Felipe Sabogal, 2026-11-21; logs/sessions/README.md, "Personal data"):
- The values come from REDACT_FILE, one per line, kept OUTSIDE the repository. They are never passed on a
  command line: the transcript records every command and would capture them again, in new escaped forms.
- List every form a value takes in a transcript: the plain string and any escaped form a command used
  (a regex `a\\.b` is stored in JSON as `a\\\\.b`). Longer strings are replaced first, and each
  occurrence is counted once.
- Each occurrence is replaced by `[REDACTED-PERSONAL]`. Nothing else in the file changes.
- Processes *.jsonl transcripts and *.txt readable exports (/export), in a directory or one file. Every
  JSONL line must still parse as JSON afterwards, or the file is left untouched.
- Prints per-file counts so they can be recorded in logs/sessions/README.md, never the values.

This is the only edit ever applied to exported logs: the assessment asks for unedited logs and also
forbids real personal data in the repository.
"""
import json
import os
import pathlib
import sys

REPLACEMENT = b"[REDACTED-PERSONAL]"


def main() -> int:
    if not os.environ.get("REDACT_FILE"):
        print(__doc__, file=sys.stderr)
        return 2
    raw = pathlib.Path(os.environ["REDACT_FILE"]).read_text(encoding="utf-8").splitlines()
    targets = sorted({s.strip().encode() for s in raw if s.strip()}, key=len, reverse=True)
    if not targets or len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    total = 0
    root = pathlib.Path(sys.argv[1])
    # A directory of transcripts (*.jsonl) and readable /export files (*.txt), or a single such file.
    paths = [root] if root.is_file() else [*root.rglob("*.jsonl"), *root.rglob("*.txt")]
    for path in sorted(paths):
        if path.suffix not in (".jsonl", ".txt"):
            continue
        data = path.read_bytes()
        # Count on the text as it is being replaced (longest first), so a shorter target inside a
        # longer one that was already replaced is not counted twice.
        out = data
        counts = []
        for t in targets:
            counts.append(out.count(t))
            out = out.replace(t, REPLACEMENT)
        if not any(counts):
            continue
        if path.suffix == ".jsonl":
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
