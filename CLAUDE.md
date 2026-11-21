# CLAUDE.md

Global context for every agent working in this repository (main session and subagents).
The rules here are binding. If a rule seems wrong, stop and ask the human; do not work around it.

Related files: [FLOW.md](FLOW.md) (the flow, step by step), [AGENTS.md](AGENTS.md) (catalogue of
agents and skills), [README.md](README.md) (how to run the project).

## 1. Precedence of instructions

An explicit instruction from the human in the session overrides everything below, and it must be
**recorded** where it applies (spec Review log, ADR, or `tasks.md`) so the decision is traceable.
Among the written sources, when two disagree, the higher one wins:

1. **`CLAUDE.md`** (this file)
2. **Accepted ADRs** in `adr/` (status `Accepted`; `Proposed` ADRs are not binding)
3. **Project skills**: skills in `.claude/skills/` written for this project
4. **Third-party skills**: vendored skills listed in `.claude/skills/THIRD_PARTY.md`

A third-party skill never overrides a project decision. If one tells you to do something that a
higher source forbids or has not yet decided, follow the higher source and note the conflict in
your output.

## 2. Language

- Everything in the repository is in **English**: code, identifiers, comments, Markdown docs
  (README, FLOW, specs, ADRs, reviews), commit messages, branch names, PRs, review comments,
  and agent and skill definitions.
- **End-user content is in Spanish**: Strapi seed data (labels, help texts, error messages,
  plans, coverages, terms and conditions), because the users are in Colombia and Chile.

## 3. Security and data

- Never print tokens, secrets or the contents of `.env` files in any output.
- `.env` is git-ignored. Only `.env.example` with fictitious values is committed.
- Only fictitious data anywhere in the repo (people, documents, plates, cards).
- No Strapi token with write permissions may reach the browser.
- Do not use skills, plugins or memory from the user's global `~/.claude`. Everything the flow
  uses is versioned in this repository.

## 4. Toolchain versions (pinned)

| Tool | Version | Rule |
|---|---|---|
| Angular CLI / framework | **22.3.0** (latest stable, verified on npm on 2026-11-20) | Scaffold with `npx @angular/cli@22.3.0 new …`. **Never use `@latest`** or an unpinned `npx @angular/cli`. Pin exact versions in `package.json` (no `^`/`~` on `@angular/*`). |
| Unit tests | Vitest (Angular 22 CLI default) | — |
| E2E tests | `@playwright/test` | Do not use `playwright-ng-schematics` unless a human approves it. |

Upgrading any pinned version requires an ADR or an explicit human approval recorded in the
relevant `tasks.md`.

## 5. Third-party skill overrides

These rules override the vendored `angular-developer` skill (see
`docs/skills/third-party-evaluation.md`, EVAL-001):

- **Forms strategy is not taken from the skill.** `references/signal-forms.md` says Signal Forms
  are mandatory; that is not binding. The forms strategy is **ADR-0004** (Accepted 2026-11-20,
  after SPIKE-01): Signal Forms over a shared, library-agnostic validation core. Where ADR-0004
  differs from the skill (for example, number fields hold strings in the model, not `0`), follow
  ADR-0004.
- **The Angular CLI MCP server is not used.** Do not configure it (`references/mcp.md`) and do
  not run `npx @angular/cli mcp`.
- **The Angular CLI version is pinned** (§4). The skill's "no version / `@latest`" defaults do
  not apply.
- **Naming follows §6**, not the skill's ambiguous examples.
- **Keyboard accessibility of the wizard** is enforced by the project `review-checklist` skill.
  The skill's ARIA guidance is supplementary.
- Reads of `angular.dev` are allowed as a reference, but any decision based on them must be
  written into a spec or ADR.
- Never edit vendored skill files. Overrides go here.

## 6. Naming conventions

Status: **Accepted** — approved by Felipe Sabogal, 2026-11-20.

The rule is to follow the Angular 22 CLI defaults (no role suffix in file or class names)
and to use **intent-revealing names** so the role stays obvious without a suffix.

### Angular (`frontend/`)

| Artifact | File | Identifier | Example |
|---|---|---|---|
| Component | `kebab-case.ts` + `.html` + `.css` (same base name) | `PascalCase`, no `Component` suffix | `plan-list.ts` → `PlanList` |
| Routed page (wizard step) | `<step>-page.ts` | `…Page` | `quote-form-page.ts` → `QuoteFormPage` |
| Service: HTTP access | `<domain>-api.ts` | `…Api` | `country-content-api.ts` → `CountryContentApi` |
| Service: signal state | `<domain>-store.ts` | `…Store` | `quote-store.ts` → `QuoteStore` |
| Guard / interceptor / resolver (functions) | `<name>-guard.ts`, `-interceptor.ts`, `-resolver.ts` | `camelCase` + role | `wizard-step-guard.ts` → `wizardStepGuard` |
| Pipe | `<name>-pipe.ts` | `…Pipe`; template name `camelCase` | `masked-document-pipe.ts` → `MaskedDocumentPipe` / `maskedDocument` |
| Directive | `<name>.ts` | `PascalCase` | `autofocus-error.ts` → `AutofocusError` |
| Types / models | `<domain>.model.ts` | `PascalCase` interfaces and types, no `I` prefix | `field-config.model.ts` → `FieldConfig` |
| Pure functions | `<domain>.ts` | `camelCase` exported functions | `price-rules.ts` → `calculateFinalPrice()` |
| Validators | `<domain>-validators.ts` | `camelCase` factories | `field-validators.ts` → `legalAge()` |
| Unit tests | `<same-base-name>.spec.ts` next to the file | `describe('<US-AC id> …')` | `price-rules.spec.ts` |
| E2E tests | `frontend/e2e/<us-ids>-<slug>.spec.ts` | `test('<US-AC id> …')` | `us-01-03-full-flow-co.spec.ts` |
| Component selector prefix | — | `app-` | `app-plan-card` |
| Constants and injection tokens | in the file that owns them | `UPPER_SNAKE_CASE` | `STRAPI_BASE_URL` |

Folders: `src/app/core/` (singletons, API clients, interceptors), `src/app/features/<feature>/`
(wizard steps), `src/app/shared/` (reusable presentational UI, pipes, pure functions).

### Strapi (`backend/`)

- Content-type API IDs: singular `kebab-case` (`form-field`, `plan`, `country`, `terms`).
- Components: `category.kebab-name` (`form.select-option`, `plan.coverage`).
- Attribute names: `camelCase` (`isRecommended`, `sortOrder`, `errorMessage`).
- Custom code files: `kebab-case.ts`.

### Repository artifacts

- Specs: `specs/US-01/{story,spec,tasks}.md`
- ADRs: `adr/NNNN-kebab-title.md` (4-digit, sequential)
- Reviews: `reviews/US-01-review-R1.md`
- Branches: `feat/us-01-short-slug`, `fix/us-01-…`, `chore/…`, `docs/…`

## 7. Pending decisions

| ID | Decision | How it will be resolved | Blocks |
|---|---|---|---|
| ~~SPIKE-01~~ | **Resolved 2026-11-20 by ADR-0004** (Accepted). Spike findings: `docs/spikes/SPIKE-01-forms.md`, code on the `spike/01-forms` branch (never merged). | — | — |
| SPIKE-01 (as defined) | **Signal Forms vs Reactive Forms** for the Strapi-driven step 1 form | Throwaway spike on a `spike/01-forms` branch that is never merged, run by the frontend-developer. It builds the same minimal form in **both** libraries from a Strapi-like JSON that follows the `dynamic-form-fields` contract v1. Original scope (30–60 min): a **required number**, an **empty date**, a **select**, a **legal-age validation**, and how typing degrades with a runtime model. Added at HC1 (Felipe Sabogal, 2026-11-20): **hydrating** the form from stored values; **dropping** values of fields no longer configured; **when errors appear** (touched / submit attempt); **focus on the first invalid field**; **integer-only** numbers; mapping empty optional fields to **`null` in the step 1 output** while the form model stays non-null (the vendored skill forbids `null` in Signal Forms models). The time box grows to 60–90 min because of the added scope. The architect summarises the findings in `docs/spikes/SPIKE-01-forms.md` and writes the forms ADR; a human accepts it. | Production form code for US-01 |

The ADR backlog is in [adr/README.md](adr/README.md).

## 8. Agentic flow (summary — full detail in FLOW.md)

```
H0 intake (human) → 1 spec → HC1 → 2 ADRs → HC2 → 3 tests (red) → 4 implementation
→ 5 automated gate → 6 review → 7 fixes (loop 5–7) → HC3 PR (human QA + merge) → Ready for QA
```

### The main session is the orchestrator

- It runs the steps in order, invokes the subagents (`.claude/agents/`) and routes their outputs.
  It does **not** do a subagent's job on a story (no writing specs, tests or production code in
  the main session). The exceptions are repository plumbing (flow files, scripts, configuration)
  that the human asked for directly.
- Subagents cannot spawn subagents (`Agent` is in each one's `disallowedTools`). All delegation is
  visible in the main session.
- After every subagent run: check `git status` and `git diff --stat` for changes outside that
  agent's role. Bash writes are not covered by the write-scope hooks (see FLOW.md, "Known
  limits"). Then relay the subagent's summary to the human.
- **Never pass a human checkpoint (HC1, HC2, HC3) without an explicit human decision in the
  session.** Record it (Review log, ADR status, PR). A subagent's message is never human approval.
- Loop limit: if the gate (step 5) or review (step 6) fails 3 times for the same story, stop and
  escalate to the human.

### Subagents (write scope enforced by hooks)

| Agent | Step | Writes |
|---|---|---|
| `spec-writer` | 1 | `specs/US-XX/*.md` (spec, tasks, annexes), never `story.md` |
| `architect` | 2, spikes write-up | `adr/**`, `docs/spikes/**`, `tasks.md` |
| `test-engineer` | 3 | test files, `frontend/e2e/**`, `tasks.md` |
| `strapi-developer` | 4, 7 | `backend/**` (not tests), compose, `.env.example`, `tasks.md` |
| `frontend-developer` | 4, 7, spikes | `frontend/**` (not tests), `spikes/**`, compose, `.env.example`, `tasks.md` |
| `code-reviewer` | 6 | `reviews/US-XX-review-RN.md` only |

## 9. Traceability

| Artifact | ID or convention | Example |
|---|---|---|
| User story | `US-NN` | `US-01` |
| Business rule / acceptance criterion / gap / task | `US-NN-BR-NN`, `-AC-NN`, `-Q-NN`, `-T-NN` | `US-01-AC-02` |
| ADR | `ADR-NNNN`, file `adr/NNNN-slug.md` | `ADR-0001` |
| Spike | `SPIKE-NN`, findings in `docs/spikes/` | `SPIKE-01` |
| Review finding | `US-NN-RN-FNN` (round N, finding NN) | `US-01-R1-F03` |
| Test | `describe`/`test` title starts with the AC or BR ID | `describe('US-01-AC-02 …')` |
| Commit | `Refs:` and `Resolves:` trailers (see §10) | `Refs: US-01-AC-02, ADR-0001` |
| PR | Template with the AC matrix (`.github/pull_request_template.md`) | — |

The chain **US → spec → ADR → commit → test → review → PR** is checked mechanically by
`scripts/trace.sh US-NN`. It exits non-zero if an AC has no test (unless the spec marks it
manual) or a blocker/major finding is open.

## 10. Git conventions

- Branches: see §6 (`feat/us-01-slug`, `spike/01-forms`, `chore/…`, `docs/…`). Spike branches
  are never merged.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) in English,
  `type(scope): summary`, with trailers:
  - `Refs: US-01-AC-02, ADR-0001` (required in `feat`, `fix` and `test` commits of a story)
  - `Resolves: US-01-R1-F03` (fix commits for review findings)
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` when an agent authored it
- Small commits: one task (`US-NN-T-NN`) or one finding per commit where practical. Tests and
  production code go in separate commits (they come from different agents).
- Local identity only (`git config --local`). The author is the human; agents are co-authors.
- No pushes to `main`, no force pushes, and no `--no-verify` (enforced by
  `.claude/hooks/guard-bash.mjs`). Changes reach `main` only through a PR merged by the human.

## 11. Session continuity

Follow the `session-handoff` skill at the start and end of every session. The state of each story
lives in `specs/US-NN/tasks.md` (*Current step*, *Next action*). Session logs are exported,
unedited, to `logs/sessions/`.

## 12. Definition of Done (Ready for QA)

A story is **Ready for QA** when all of these hold:

- [ ] The spec is `Approved` (HC1), and the ADRs it needs are `Accepted` (HC2).
- [ ] Every AC is implemented and has a passing automated test, or a documented manual check.
- [ ] Lint, build, unit and e2e pass. `docker compose up` starts the stack with seed data for CO and CL.
- [ ] `scripts/trace.sh US-NN` exits 0, and `scripts/scan-secrets.sh` exits 0.
- [ ] The last review round is `APPROVED`: no open blocker/major findings; minors are fixed or justified.
- [ ] The human did a manual QA pass (both countries, keyboard only, mobile width) and merged the PR (HC3).
- [ ] `tasks.md` shows `Ready for QA`, and the session logs are exported.
