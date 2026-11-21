#!/usr/bin/env bash
# Lightweight secret scan (no AI, no network). Used before committing session logs and in the
# automated gate. It reports file:line and the rule name only; it never prints the matched value.
#
#   scripts/scan-secrets.sh                 scan all tracked + untracked (non-ignored) files
#   scripts/scan-secrets.sh <file>...       scan specific files (e.g. new session logs)
#
# Exit 1 if anything is found. This is a safety net, not a replacement for a real scanner
# (e.g. gitleaks), which a team setup should add (see FLOW.md, "team of 5").
#
# Exceptions: a line is skipped only if it carries an explicit, justified marker on the same line:
#   scan-secrets: allow (<reason>)        e.g. // scan-secrets: allow (fictitious value, negative test)
# Allowed lines are counted and listed in the output so reviewers see every exception
# (human decision, 2026-11-20).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

RULES=(
  "github-token|gh[pousr]_[A-Za-z0-9]{36,}"
  "github-fine-grained-pat|github_pat_[A-Za-z0-9_]{50,}"
  "aws-access-key|AKIA[0-9A-Z]{16}"
  "private-key|-----BEGIN [A-Z ]*PRIVATE KEY-----"
  "anthropic-key|sk-ant-[A-Za-z0-9_-]{20,}"
  "openai-key|sk-[A-Za-z0-9]{40,}"
  "slack-token|xox[abprs]-[A-Za-z0-9-]{10,}"
  "jwt|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"
  "bearer-header|[Aa]uthorization[\"' :]+Bearer [A-Za-z0-9._-]{20,}"
  "strapi-or-generic-secret-assignment|(API_TOKEN|ADMIN_JWT_SECRET|JWT_SECRET|APP_KEYS|API_TOKEN_SALT|TRANSFER_TOKEN_SALT|ENCRYPTION_KEY)[\"' ]*[=:][\"' ]*[A-Za-z0-9+/=_-]{16,}"
)

if [ $# -gt 0 ]; then
  files=("$@")
else
  # Default (the gate): every tracked and untracked, non-ignored file EXCEPT the exported session
  # transcripts (logs/sessions/**/*.jsonl). Transcripts quote fictitious values from the code and are
  # checked by scripts/scan-logs.sh against the findings recorded in logs/sessions/README.md. Mixing
  # them in would let a new secret in the code hide among accepted log findings. Every other file
  # under logs/ (README, /export text) is still scanned here.
  files=()
  while IFS= read -r f; do
    case "$f" in logs/sessions/*.jsonl) continue ;; esac
    files+=("$f")
  done < <(git ls-files --cached --others --exclude-standard)
fi

found=0
allowed=0
for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.env.example) allow_placeholders=1 ;;
    *) allow_placeholders=0 ;;
  esac
  for rule in "${RULES[@]}"; do
    name="${rule%%|*}"
    pattern="${rule#*|}"
    while IFS=: read -r line _; do
      [ -n "$line" ] || continue
      # Explicit, justified exception on the same line (reason in parentheses is mandatory).
      if sed -n "${line}p" "$f" | grep -qE 'scan-secrets: allow \([^)]+\)'; then
        echo "ALLOWED $f:$line  [$name] (explicit scan-secrets: allow marker)"
        allowed=$((allowed + 1))
        continue
      fi
      # .env.example may contain assignments, but only with obvious placeholder values.
      if [ "$allow_placeholders" = 1 ] && sed -n "${line}p" "$f" | grep -qiE 'change[-_]?me|example|placeholder|toBeModified|fake|dummy'; then
        continue
      fi
      echo "SECRET? $f:$line  [$name]"
      found=1
    done < <(grep -nE -- "$pattern" "$f" 2>/dev/null | cut -d: -f1 | sed 's/$/:/' || true)
  done
done

if [ "$found" = 1 ]; then
  echo "Potential secrets found. Do not commit; report to the human." >&2
  exit 1
fi
echo "scan-secrets: no findings in ${#files[@]} file(s); explicit exceptions: ${allowed}."
