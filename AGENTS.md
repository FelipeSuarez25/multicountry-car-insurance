# AGENTS.md

Catalogue of the AI agents and skills used in this repository.

- **Binding conventions** for every agent are in [CLAUDE.md](CLAUDE.md). If you use a tool
  other than Claude Code that reads `AGENTS.md`, read `CLAUDE.md` first: it is the single source
  of rules, and this file does not repeat them.
- **The flow** (order, checkpoints, approval criteria) is in [FLOW.md](FLOW.md).

## Subagents (`.claude/agents/`)

Every subagent has `Agent` disallowed (no nested delegation) and a `PreToolUse` hook that
enforces its write scope (`.claude/hooks/enforce-write-scope.mjs`).

| Agent | Model | Flow step | Inputs | Outputs | Allowed tools | Write scope (enforced) |
|---|---|---|---|---|---|---|
| [spec-writer](.claude/agents/spec-writer.md) | Opus 5.5 | 1 Spec | `story.md`, accepted ADRs, `CLAUDE.md` | `spec.md`, `tasks.md` | Read, Grep, Glob, Write, Edit, Skill | `specs/US-NN/spec.md`, `specs/US-NN/tasks.md` |
| [architect](.claude/agents/architect.md) | Opus 5.5 | 2 ADRs, spike write-ups | approved spec (*ADRs needed*), spike results | `adr/NNNN-*.md` (Proposed), `docs/spikes/*` | Read, Grep, Glob, Write, Edit, Bash (read-only use), WebFetch, Skill | `adr/**`, `docs/spikes/**`, `tasks.md` |
| [test-engineer](.claude/agents/test-engineer.md) | Sonnet 5.5 | 3 Tests first | approved spec, accepted ADRs | unit, component and e2e tests (red) | Read, Grep, Glob, Write, Edit, Bash, Skill | `**/*.spec.ts`, `**/*.test.ts`, `frontend/e2e/**`, `frontend/src/testing/**`, `backend/tests/**`, `tasks.md` |
| [strapi-developer](.claude/agents/strapi-developer.md) | Sonnet 5.5 | 4 Implementation, 7 Fixes | approved spec, ADRs, tests | content types, seed, permissions | Read, Grep, Glob, Write, Edit, Bash, Skill | `backend/**` except tests, `docker-compose.yml`, `.env.example`, `tasks.md` |
| [frontend-developer](.claude/agents/frontend-developer.md) | Sonnet 5.5 | 4 Implementation, 7 Fixes, spikes | approved spec, ADRs, red tests | Angular code | Read, Grep, Glob, Write, Edit, Bash, Skill | `frontend/**` except tests, `spikes/**`, `docker-compose.yml`, `.env.example`, `tasks.md` |
| [code-reviewer](.claude/agents/code-reviewer.md) | Opus 5.5 | 6 Review | branch diff, spec, ADRs, previous rounds | review report | Read, Grep, Glob, Write, Bash (verification only), Skill (**no Edit**) | `reviews/US-NN-review-RN.md` |

The main session (Opus 5.5) is the **orchestrator**: it runs the flow, invokes the agents,
checks their diffs, and talks to the human. It does not do the agents' work on stories.

## Skills (`.claude/skills/`)

| Skill | Origin | What it encapsulates | Preloaded by |
|---|---|---|---|
| [sdd-spec](.claude/skills/sdd-spec/SKILL.md) | Project | Spec and tasks templates, gap-detection checklist, ID scheme, HC1 quality bar | spec-writer |
| [adr-madr](.claude/skills/adr-madr/SKILL.md) | Project | MADR 4 template, when an ADR is needed, status lifecycle (only humans accept) | architect |
| [strapi-content-modeling](.claude/skills/strapi-content-modeling/SKILL.md) | Project | Strapi 5 facts (verified on 5.63.0), country-differentiation options, seed and permission rules | architect, strapi-developer, code-reviewer |
| [dynamic-form-fields](.claude/skills/dynamic-form-fields/SKILL.md) | Project | `FieldConfig` contract, boundary validation, rule semantics (legal age, year range), accessible errors | test-engineer, frontend-developer, code-reviewer |
| [test-from-spec](.claude/skills/test-from-spec/SKILL.md) | Project | AC→test mapping, ID naming, Vitest zoneless and Playwright patterns, test-first DoD | test-engineer |
| [review-checklist](.claude/skills/review-checklist/SKILL.md) | Project | Review procedure, severities, checklist (security, multi-country, a11y, Angular, Strapi), report template | code-reviewer |
| [session-handoff](.claude/skills/session-handoff/SKILL.md) | Project | Session start and end procedure, `tasks.md` update, unedited log export | orchestrator |
| [angular-developer](.claude/skills/angular-developer/SKILL.md) | **Third-party**: angular/skills@97c663a, MIT ([provenance](.claude/skills/THIRD_PARTY.md), [evaluation](docs/skills/third-party-evaluation.md)) | Up-to-date Angular 22 API reference (Signal Forms, signals, testing, routing) | frontend-developer. Precedence is lowest (`CLAUDE.md` §1); overrides are in `CLAUDE.md` §5. |

## Deterministic helpers (no AI)

| Script | Purpose |
|---|---|
| `scripts/trace.sh US-NN` | Traceability matrix; fails on untested ACs or open blocker/major findings |
| `scripts/scan-secrets.sh [files]` | Minimal secret scan (prints the rule and location, never the value) |
| `.claude/hooks/enforce-write-scope.mjs` | Per-agent write scope (fails closed) |
| `.claude/hooks/guard-bash.mjs` | Blocks `.env` access, environment dumps, pushes to `main`, force pushes, merges, `--no-verify`, unpinned Angular CLI |
