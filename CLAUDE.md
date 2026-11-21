# CLAUDE.md

Global context for every agent working in this repository (main session and subagents).
The rules here are binding. If a rule seems wrong, stop and ask the human; do not work around it.

> This file is being built incrementally. The agentic flow sections (agents, checkpoints,
> traceability, session handoff) are added when the flow files are created.

## 1. Precedence of instructions

When two sources of guidance disagree, the higher one wins:

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
  are mandatory. Ignore that: Signal Forms vs Reactive Forms is decided by an ADR after
  SPIKE-01 (see §7). Until that ADR is accepted, do not write production form code.
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
| SPIKE-01 | **Signal Forms vs Reactive Forms** for the Strapi-driven step 1 form | Throwaway spike (30–60 min) on a branch that is not merged: a minimal form built from a Strapi-like JSON with a **required number**, an **empty date**, a **select**, and a **legal-age validation**. It also checks how typing degrades with a runtime model. The findings feed an ADR (alternatives, consequences); a human accepts it. | Production form code for US-01 |
