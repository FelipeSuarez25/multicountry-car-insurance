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
| 2026-11-20 → 2026-11-21 | `2026-11-21-067ab97b/` (session `067ab97b…`): `main-session.jsonl` (orchestrator, one session resumed after a Claude Code restart and after context compactions) and `subagents/` (70 subagent transcripts) | Flow setup; third-party skill evaluation; H0 intake US-01..03; **US-01, US-02 and US-03 end to end** (specs, ADR-0001..0009, SPIKE-01, tests first, implementation, gates, review rounds, HC3 merges of PRs #3, #5 and #7); the human's request for US-04 (design system and visual redesign) | Exported at the US-03 closure. It **supersedes** the snapshot taken after the US-01 merge. The session continues with US-04, so a final export at the end of US-04 will supersede this one and add the readable `/export` text (human decision, 2026-11-21). Redactions below. |

## Personal data (redaction policy)

**Policy (human decision, Felipe Sabogal, 2026-11-21).** Personal data in the logs is handled by its own
rule, separate from the secret rule: a secret can be rotated, personal data cannot, so personal data is
**redacted**, not accepted as an exception.

- **What.** Claude Code injects the human's account e-mail into the context of every session, so every
  main transcript contains it, and every future one will. The e-mail of the account and its domain, in
  every literal form a transcript holds (including the escaped forms that appeared in the orchestrator's
  own search and redaction commands), are replaced by `[REDACTED-PERSONAL]`. Nothing else is touched;
  the rest of the logs stays unedited.
- **How.** `scripts/redact-logs.sh` (mechanical byte replacement through `scripts/redact-logs.py`; every
  JSONL line re-validated; count per file). The values come from `REDACT_PERSONAL_FILE`, a file kept
  **outside** the repository, one value per line, so no value is ever typed into a command: the transcript
  records every command and would capture the value again in a new escaped form.
- **Block.** `scripts/scan-secrets.sh` (the gate, and `scripts/scan-logs.sh` for the transcripts) and the
  versioned hook `.githooks/pre-commit` (enabled with `git config --local core.hooksPath .githooks`)
  fail when the domain still appears in any file. The check compares SHA-256 hashes of words
  (`scripts/check-personal-data.py`, `scripts/personal-data.sha256`), so the value is not written in the
  repository either. No allow marker applies to personal data.
- **Values are never written here**, not even in this README.
- **Git history is not rewritten by agents.** The domain reached `main` once, inside a subagent transcript
  merged with PR #4 (commit `bbc333a`): 3 occurrences, as the name of a plugin in that subagent's tool
  list. It is removed from the tree from the US-03 closure on, but it stays in the history and in PR #4
  on GitHub. Before the repository is shared, the human decides how to clean it (rewrite the history
  himself or recreate the repository). Agents never force-push.

| Export | File | Occurrences → `[REDACTED-PERSONAL]` |
|---|---|---|
| US-01 snapshot (superseded; marker `[redacted-email]`) | `main-session.jsonl` | 3 addresses + 4 local parts |
| US-03 closure (supersedes the snapshot) | `2026-11-21-067ab97b/main-session.jsonl` | 161 |
| same | `2026-11-21-067ab97b/subagents/agent-a6dbd418bd7886c8d.jsonl` | 3 (the domain, as a plugin name) |

Verification after redaction: the hash check reports no personal data in any exported file, and every
JSONL line still parses. Counts are exact: each occurrence is counted once (the first version of the
script counted a part again inside the full address).

## Scan exceptions

| Date | File | Finding | Human decision |
|---|---|---|---|
> **Correction (2026-11-21).** The first version of this table, merged in PR #4, listed one
> exception. The scanner actually reported **23 unmarked findings** in that export. The
> orchestrator had read only the last lines of the scanner output. All 23 were then classified by a
> script that never prints values. The complete classification is below; no log was edited for it.

| Date | Where (`2026-11-21-067ab97b/`) | Finding | Classification (verified) | Human decision |
|---|---|---|---|---|
| 2026-11-21 | 7 subagent transcripts (`a075d5c9…`, `a2ffb675…`, `a3deae29…`, `a6282abb…`, `a650a409…`, `a83f4bb7…`, `adcd7645…`) and `main-session.jsonl` | `strapi-or-generic-secret-assignment`, `bearer-header` | Fictitious only: `.env.example` placeholders (`toBeModified…`), the e2e helper's `test…` secrets, the negative-test bearer value, `docker-compose.yml` `${VAR:-}` lines, and agents quoting files that carry the `scan-secrets: allow (…)` markers | Accepted (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | `main-session.jsonl` (2 matches) | `strapi-or-generic-secret-assignment` | `realLookingValue1234567890`: a fictitious value the orchestrator wrote to test the scanner (exact match verified) | Accepted (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | `main-session.jsonl` (the line where the scanner's rules were written; 2 matches) | `private-key` | The scanner's own rule text (`-----BEGIN [A-Z ]*PRIVATE KEY-----`) as written into `scripts/scan-secrets.sh`; no key material follows | Accepted (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | `subagents/agent-a69213286f947f6bb.jsonl:54` (one token, 2 matches) | `jwt` | **Real token**: a Strapi admin *refresh* token for the fictitious dev admin (`userId 1`) of the throwaway stack `mci-db` (R2-F04 persistence check). It **expired at 2026-11-21T16:16:25Z**, and it was signed with an `ADMIN_JWT_SECRET` generated inside that stack's volume, **which was deleted** (`down -v`), so it cannot be validated anywhere. | Accepted as an exception; the log stays unedited (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | several subagent transcripts | `bearer-header` / `strapi-or-generic-secret-assignment` reported as `ALLOWED` | Lines that carry the repo's explicit `scan-secrets: allow (…)` markers | Already justified by the markers |

<!-- scan-findings: 23 -->

**Procedure from now on** (`session-handoff` skill): run `scripts/scan-logs.sh` on the full export
and read its complete output. It fails when the number of unmarked findings (`SECRET?` lines)
differs from the `scan-findings` count above. Classify every new finding without printing its value,
record it in this table and update the count before a log is committed.
