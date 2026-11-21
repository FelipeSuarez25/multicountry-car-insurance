#!/usr/bin/env bash
# Redact real personal data from exported session logs before they are committed.
#
#   REDACT_PERSONAL_FILE=/path/outside/the/repo/personal.txt scripts/redact-logs.sh [path...]
#
# Policy (human decision, Felipe Sabogal, 2026-11-21; logs/sessions/README.md, "Personal data"):
# - Secrets can be rotated, personal data cannot. Claude Code injects the human's account e-mail into
#   every session's context, so every transcript contains it. It is replaced, mechanically, by
#   [REDACTED-PERSONAL]; nothing else in the logs is touched.
# - The values to redact (the account e-mail, its domain, and any escaped form of them that a command
#   used) live in REDACT_PERSONAL_FILE, one per line, OUTSIDE the repository. They are never typed into
#   a command, because the transcript records every command and would capture them again.
# - Default path: logs/sessions. Processes *.jsonl transcripts and *.txt (/export) files; every JSONL
#   line must still parse. Prints the count per file, then runs the personal-data check on the result.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

: "${REDACT_PERSONAL_FILE:?set REDACT_PERSONAL_FILE to a file outside the repository (one value per line)}"
case "$(cd "$(dirname "$REDACT_PERSONAL_FILE")" && pwd)/" in
  "$PWD"/*) echo "redact-logs: REDACT_PERSONAL_FILE must be outside the repository" >&2; exit 2 ;;
esac

targets=("$@"); [ ${#targets[@]} -gt 0 ] || targets=(logs/sessions)
for t in "${targets[@]}"; do
  REDACT_FILE="$REDACT_PERSONAL_FILE" python3 -I scripts/redact-logs.py "$t"
done

files=()
while IFS= read -r f; do files+=("$f"); done < <(find "${targets[@]}" -type f \( -name '*.jsonl' -o -name '*.txt' \) | sort)
python3 -I scripts/check-personal-data.py "${files[@]}" && echo "redact-logs: personal-data check clean on ${#files[@]} file(s)"
