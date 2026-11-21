# Session logs

Unedited exports of the working sessions with the agents. They are evidence required by the
assessment. Procedure: the `session-handoff` skill.

| File | What it is |
|---|---|
| `YYYY-MM-DD-<id8>.jsonl` | Raw Claude Code transcript, copied from `~/.claude/projects/<project>/<session-id>.jsonl`. Includes the subagent calls and their results. |
| `YYYY-MM-DD-<id8>.txt` | Readable export produced by the human with `/export`. |

## Rules

- **Never edited**: no trimming, reformatting or redaction. Absolute local paths are kept on
  purpose (human decision, 2026-11-20).
- Each file is checked with `scripts/scan-secrets.sh` before it is committed. If a potential
  secret is found, the file is not committed until the human decides, and the decision is
  recorded below.
- The JSONL format is internal to Claude Code and may change between versions; the `.txt`
  export is the human-readable version.

## Index

| Date | Session | Stories / steps covered | Notes |
|---|---|---|---|

## Scan exceptions

| Date | File | Finding | Human decision |
|---|---|---|---|
