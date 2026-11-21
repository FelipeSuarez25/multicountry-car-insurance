---
name: session-handoff
description: Procedure to start and end a working session so work can resume from the repository alone - read state from tasks.md, update it at the end, and export the unedited session log to logs/sessions/. Use at the start of every session, before ending a session, and before any context compaction.
---

# Session handoff

All flow state lives in the repository. There is no external memory, so a session that ends
without this procedure loses context.

## Session start

1. Read `CLAUDE.md` and `FLOW.md`.
2. Find the active story: the most recent `specs/US-XX/tasks.md` whose *Current step* is not
   `Ready for QA`.
3. Read that `tasks.md`, then the spec and the ADRs it references.
4. Check that git matches `tasks.md`: `git status`, `git branch --show-current`, and
   `git log --oneline -10`. If they disagree (for example, a task is marked done but has no
   commit), **report it to the human before continuing**.
5. State the *Next action* back to the human in one sentence and continue from there.

## Session end (or before compaction)

1. Update `specs/US-XX/tasks.md`:
   - task statuses and commit SHAs
   - *Current step*, *Blockers*, *Next action* (concrete and actionable by a fresh session)
   - *Last updated*
   - a row in the *Session log* table
2. Export the session log, **unedited**:
   - Raw transcript: copy
     `~/.claude/projects/-Users-cristiansabogal-Proyectos-multicountry-car-insurance/<session-id>.jsonl`
     to `logs/sessions/YYYY-MM-DD-<first-8-of-session-id>.jsonl`. The session id is the file
     name; the newest file is usually the current session.
   - Readable export: the **human** runs `/export logs/sessions/YYYY-MM-DD-<id8>.txt`
     (plain text).
   - Copy only `*.jsonl` session files. Never copy anything else from `~/.claude`.
3. Run the secret scan on the new log files (`scripts/scan-secrets.sh logs/sessions/<files>`).
   - If it finds something: **do not commit the log and do not edit it.** Report it to the human,
     who decides (rotate the secret, then commit the log with a note in
     `logs/sessions/README.md`).
4. Commit: `docs(logs): export session YYYY-MM-DD <id8>` plus the `tasks.md` update.

## Rules

- Logs are evidence, so they are never edited, trimmed or reformatted. Absolute local paths stay
  as they are (human decision, 2026-11-20).
- A session that changes state but has no `tasks.md` update is an incomplete step. The
  reviewer flags it.
