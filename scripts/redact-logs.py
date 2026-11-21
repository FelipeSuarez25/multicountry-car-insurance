#!/usr/bin/env python3
"""Redact exact strings (real personal data) from exported session logs, reproducibly.

Usage (run with `python3 -I`):
    REDACT_STRINGS='first,second' python3 -I scripts/redact-logs.py logs/sessions/<dir>
    REDACT_STRINGS='first,second' python3 -I scripts/redact-logs.py logs/sessions/<file>.txt

    REDACT_FILE=/path/outside/the/repo/strings.txt python3 -I scripts/redact-logs.py logs/sessions/<dir>

- Prefer REDACT_FILE (one string per line, kept outside the repository): a value typed into a command
  is recorded by the transcript and reappears, in new escaped forms, in the next export.
- It processes *.jsonl transcripts and *.txt readable exports (/export), in a directory or one file.
- Pass every form a value can take in a transcript: the plain string, and any escaped form a command
  used (for example a regex `a\\.b` is stored in JSON as `a\\\\.b`). Verify afterwards with a broad,
  case-insensitive grep that prints counts only.

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
    raw = [s for s in os.environ.get("REDACT_STRINGS", "").split(",")]
    # REDACT_FILE: a file OUTSIDE the repository with one string per line. Preferred, because the
    # strings then never appear in a command, so the transcript of the redaction run itself does not
    # record them again (each command that names a value is captured by the next export).
    if os.environ.get("REDACT_FILE"):
        raw += pathlib.Path(os.environ["REDACT_FILE"]).read_text(encoding="utf-8").splitlines()
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
