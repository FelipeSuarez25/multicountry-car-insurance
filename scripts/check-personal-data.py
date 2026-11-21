#!/usr/bin/env python3
"""Block real personal data (the human's account e-mail domain) without writing it in the repository.

Usage (run with `python3 -I`):
    python3 -I scripts/check-personal-data.py <file>...

Policy (human decision, Felipe Sabogal, 2026-11-21; see logs/sessions/README.md, "Personal data"):
secrets can be rotated, personal data cannot, so personal data is redacted from the logs and must
never be committed. The value itself cannot appear here, so this check compares the SHA-256 of every
lowercase alphanumeric word of each file with the hashes in scripts/personal-data.sha256.

It prints `PERSONAL? <file>: <n> occurrence(s)` for each file that contains a blocked word, never the
word, and exits 1 if any file does. Called by scripts/scan-secrets.sh and the .githooks/pre-commit hook.
"""
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HASHES = {
    line.split()[0]
    for line in (ROOT / "scripts" / "personal-data.sha256").read_text(encoding="utf-8").splitlines()
    if line.strip() and not line.startswith("#")
}
WORD = re.compile(rb"[a-z0-9]+")


def main() -> int:
    found = 0
    for name in sys.argv[1:]:
        path = pathlib.Path(name)
        if not path.is_file():
            continue
        data = path.read_bytes().lower()
        cache: dict[bytes, bool] = {}
        count = 0
        for word in WORD.findall(data):
            hit = cache.get(word)
            if hit is None:
                hit = cache[word] = hashlib.sha256(word).hexdigest() in HASHES
            count += hit
        if count:
            print(f"PERSONAL? {name}: {count} occurrence(s) of blocked personal data (value not shown)")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
