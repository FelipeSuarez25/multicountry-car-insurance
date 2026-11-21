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
| 2026-11-20 → 2026-11-21 | `2026-11-21-067ab97b/` (session `067ab97b…`): `main-session.jsonl` (orchestrator, one session resumed once after a Claude Code restart) and `subagents/` (47 subagent transcripts) | Flow setup; third-party skill evaluation; H0 intake US-01..03; **US-01 end to end** (spec v0.1→v0.5, ADR-0001..0006, SPIKE-01, tests first, implementation, 3 gate attempts, review rounds R1–R4, HC3 merge of PR #3); US-02 spec v0.1 | Snapshot taken after the US-01 merge; the session continues, so a later export will supersede `main-session.jsonl`. One redaction applied (below). |

## Redactions

The assessment asks for unedited logs and also forbids real personal data in the repository. The
only edit ever applied is the removal of the human's real e-mail address (human decision, Felipe
Sabogal, 2026-11-21). It came from the session's system context, plus fragments of it that appear in
the orchestrator's own search commands. The address is not written anywhere in this repository.

| File | What | Occurrences | How |
|---|---|---|---|
| `2026-11-21-067ab97b/main-session.jsonl` | the full address | 3 → `[redacted-email]` | exact byte replacement; every line re-validated as JSON |
| same | its local part followed by `@` (in the orchestrator's grep commands) | 4 → `[redacted-email-local-part]` | same |
| same | re-run with `scripts/redact-logs.py` (full address, local part, domain) | 0 (verified idempotent) | `REDACT_STRINGS=… python3 -I scripts/redact-logs.py logs/sessions/<dir>` |

No subagent transcript contained the address. Later exports use `scripts/redact-logs.py` (replacement
`[redacted]`) and add a row here with the counts.

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
| 2026-11-21 | `main-session.jsonl:519` (2 matches) | `private-key` | The scanner's own rule text (`-----BEGIN [A-Z ]*PRIVATE KEY-----`) as written into `scripts/scan-secrets.sh`; no key material follows | Accepted (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | `subagents/agent-a69213286f947f6bb.jsonl:54` (one token, 2 matches) | `jwt` | **Real token**: a Strapi admin *refresh* token for the fictitious dev admin (`userId 1`) of the throwaway stack `mci-db` (R2-F04 persistence check). It **expired at 2026-11-21T16:16:25Z**, and it was signed with an `ADMIN_JWT_SECRET` generated inside that stack's volume, **which was deleted** (`down -v`), so it cannot be validated anywhere. | Accepted as an exception; the log stays unedited (Felipe Sabogal, 2026-11-21) |
| 2026-11-21 | several subagent transcripts | `bearer-header` / `strapi-or-generic-secret-assignment` reported as `ALLOWED` | Lines that carry the repo's explicit `scan-secrets: allow (…)` markers | Already justified by the markers |

**Procedure from now on** (`session-handoff` skill): run the scanner on the **full** export and
read the **complete** output. The number of `SECRET?` lines must equal the number of findings
classified in this table before a log is committed.
