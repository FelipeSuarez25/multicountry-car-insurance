---
name: adr-madr
description: Writes Architecture Decision Records in MADR 4 format for this project. Use when a spec lists "ADRs needed", when choosing between technologies or patterns, or when superseding an existing ADR in adr/.
---

# ADRs (MADR 4)

## When a decision deserves an ADR

Write one if **any** of these is true:

- It affects more than one user story or more than one layer (Angular + Strapi).
- It is expensive to reverse (data model, content strategy, state management, security model).
- There were at least two reasonable options, and someone could later ask "why this one?".
- It overrides guidance from a third-party skill or a framework default.

Do **not** write an ADR for local implementation details that the spec or code review covers.

## Rules

- File: `adr/NNNN-kebab-title.md`, 4-digit sequential number. Never reuse a number. Use the
  template in [templates/adr.md](templates/adr.md).
- **At least two real alternatives**, each with honest pros and cons. A strawman option
  ("do nothing" with no merit) does not count as an alternative.
- Decision drivers must trace back to requirements: the assessment PDF, a spec `BR`/`AC`, or
  `CLAUDE.md`.
- Consequences include the **bad** ones and how they are mitigated.
- *Confirmation* says how compliance is checked: a test, a review checklist item, a script.
- Facts about libraries (versions, API stability) must be verified against the official source
  or the installed package, with a link or version. Never state them from memory.
- If a spike informed the decision, link its findings (the branch is not merged; summarise the
  results in the ADR).

## Lifecycle (the status changes only by these rules)

| Status | Who sets it | Meaning |
|---|---|---|
| `Proposed` | architect subagent | Ready for HC2. Not binding. |
| `Accepted` | **human only** | Binding (precedence level 2 in `CLAUDE.md`). Record `Decided by` and date. |
| `Rejected` | **human only** | Kept in the repo, with the reason. |
| `Superseded by ADR-NNNN` | architect, after the new ADR is accepted | Old file kept, with a link to the replacement. |

Accepted ADRs are never rewritten. A change of mind means a new ADR that supersedes the old one.

## Index

Keep `adr/README.md` updated: number, title, status, date, related stories.
