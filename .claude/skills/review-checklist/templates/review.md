# US-XX — Code review, round N

| Field | Value |
|---|---|
| Story / spec | US-XX · `specs/US-XX/spec.md` (version x.y) |
| Branch / commit reviewed | `feat/us-xx-…` @ `<sha>` |
| Reviewer | code-reviewer subagent (<model>) |
| Date | YYYY-MM-DD |
| Verdict | APPROVED \| CHANGES REQUESTED |

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint | | |
| Typecheck / build | | |
| Unit tests | | x passed / y failed |
| E2E | | |
| Traceability | `scripts/trace.sh US-XX` | ACs without tests: … |

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-XX-AC-01 | `path:line` | `path` › test name | ✅ / ⚠️ / ❌ |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-XX-RN-F01 | major | `path:line` | What is wrong and how to reproduce it | AC / ADR / checklist item | open \| fixed \| won't fix (reason) | |

### US-XX-RN-F01 — <short title>

Details, evidence, expected behaviour. A suggested direction is optional; the reviewer does not
write the fix.

## Verification of previous round (from round 2 onward)

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|

## Summary

Open: x blocker, y major, z minor, w nit.
