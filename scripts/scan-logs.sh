#!/usr/bin/env bash
# Secret scan for exported session transcripts (logs/sessions/**/*.jsonl), with an enforced count.
#
#   scripts/scan-logs.sh
#
# Runs scripts/scan-secrets.sh on every transcript (tracked or not) and compares the number of
# unmarked findings (SECRET? lines) with the number recorded in logs/sessions/README.md, in the line
#   <!-- scan-findings: N -->
# Exit 1 if they differ: a new finding must be classified (without printing its value) and recorded,
# and the count updated, before the logs are committed (session-handoff skill). It never prints values.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

readme="logs/sessions/README.md"
recorded=$(grep -oE '<!-- scan-findings: [0-9]+ -->' "$readme" | grep -oE '[0-9]+' || true)
[ -n "$recorded" ] || { echo "scan-logs: no '<!-- scan-findings: N -->' line in $readme" >&2; exit 1; }

files=()
while IFS= read -r f; do files+=("$f"); done < <(find logs/sessions -name '*.jsonl' -type f | sort)
[ ${#files[@]} -gt 0 ] || { echo "scan-logs: no transcripts found"; exit 0; }

out=$(bash scripts/scan-secrets.sh "${files[@]}" 2>/dev/null || true)
found=$(printf '%s\n' "$out" | grep -c '^SECRET?' || true)
personal=$(printf '%s\n' "$out" | grep -c '^PERSONAL?' || true)
echo "scan-logs: ${#files[@]} transcript(s); unmarked findings: $found; recorded in $readme: $recorded; files with personal data: $personal"
if [ "$personal" != 0 ]; then
  printf '%s\n' "$out" | grep '^PERSONAL?' >&2
  echo "scan-logs: personal data found. Redact with scripts/redact-logs.sh (no exception applies)." >&2
  exit 1
fi
if [ "$found" != "$recorded" ]; then
  echo "scan-logs: MISMATCH. Classify every finding (values never printed), record it in $readme and update the count." >&2
  exit 1
fi
