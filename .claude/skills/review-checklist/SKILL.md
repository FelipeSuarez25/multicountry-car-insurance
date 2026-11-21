---
name: review-checklist
description: Code review procedure, checklist, severities and report format for this project. Use when reviewing a story branch or PR (code-reviewer subagent), when verifying fixes for review findings, or when a developer self-checks before requesting review.
---

# Code review checklist

The reviewer **finds** problems and **never fixes them**. Each finding is concrete (file:line),
reproducible, and tied to a rule (spec AC/BR, ADR, `CLAUDE.md`, or a checklist item below).
Write the report with [templates/review.md](templates/review.md) at
`reviews/US-XX-review-RN.md` (N = review round, starting at 1).

## Procedure

1. Read `specs/US-XX/spec.md`, the accepted ADRs it references, and `tasks.md`.
2. Get the diff: `git diff main...HEAD` (plus `git log main..HEAD` for commit traceability).
3. Run the automated checks yourself and paste a summary of the results (lint, typecheck, unit,
   e2e, build). **Do not trust a developer's claim that the tests pass.**
4. Walk through **every AC**: find the code that implements it and the test that proves it. Run
   `scripts/trace.sh US-XX`.
5. Go through the checklist. Record every finding with a severity.
6. Verdict: `APPROVED` (no open blocker/major findings) or `CHANGES REQUESTED`.

In round N+1, verify each earlier finding against its fix commit, set its status, and add any
new findings.

## Severities

| Severity | Meaning | Blocks merge? |
|---|---|---|
| **blocker** | Violates security rules, breaks an AC, loses user data, or does not build | Yes |
| **major** | AC partially met, missing state handling, a11y failure, missing test for an AC, ADR violation | Yes |
| **minor** | Maintainability, weak typing, unclear naming, a small UX inconsistency | No (fix or justify) |
| **nit** | Style or preference | No |

A `minor`/`nit` may be closed as `won't fix` with a justification. A `blocker`/`major` may not.

## Checklist

### Spec conformance and traceability
- [ ] Every AC is implemented, and nothing was implemented that the spec does not ask for (scope creep).
- [ ] Every AC has at least one test named with its ID, and the test asserts behaviour, not
      implementation details.
- [ ] Commits reference US/AC/ADR IDs, and fix commits reference finding IDs.

### Security
- [ ] No Strapi token with write permissions in frontend code, environment files, the bundle or
      network calls.
- [ ] The Strapi public role only has the `find`/`findOne` permissions justified in the ADR.
- [ ] No secrets or `.env` contents committed; `.env.example` holds fictitious values only.
- [ ] Every `scan-secrets: allow (<reason>)` exception (listed by `scripts/scan-secrets.sh`) is
      justified: the value is visibly fictitious and the reason holds. New exceptions are findings to confirm.
- [ ] Every dependency in every `package.json` is pinned exactly (no `^`, `~` or ranges; `CLAUDE.md` §4),
      and the lockfile is updated in the same commit.
- [ ] Rich text from Strapi (terms, help texts) is rendered safely: no `bypassSecurityTrust*`, and
      `[innerHTML]` only with Angular sanitisation.
- [ ] Sensitive data (document numbers) is masked as the spec says and is not logged to the console.
- [ ] Only fictitious data in seeds, fixtures and tests.

### Multi-country and configurability
- [ ] No hard-coded country-specific values in code (labels, field lists, currency, document
      types, plans, terms). They come from Strapi, per the multi-country ADR.
- [ ] Adding or reordering a field or plan in Strapi requires no code change. Verify against
      the AC scenario.
- [ ] Currency and number formatting comes from the country's configuration or locale (CLP and
      COP have no decimals in display).
- [ ] The same build serves both countries (no per-country build flags).

### Angular (see CLAUDE.md overrides; the vendored angular-developer skill is reference only)
- [ ] Standalone components only; no NgModules authored; `@if/@for/@switch` with `track`.
- [ ] State in signals (`signal`, `computed`, `linkedSignal`, `resource`/`httpResource`).
      `effect` is used only for real side effects.
- [ ] `inject()` instead of constructor injection; `input()`/`output()`/`model()` APIs.
- [ ] No `any`. Strapi responses are typed and validated at the boundary (malformed content
      does not crash the app).
- [ ] Loading, empty and error states exist for every remote call, with a retry where the spec
      asks for one.
- [ ] Naming follows `CLAUDE.md` §6.
- [ ] Forms follow the accepted forms ADR (not the third-party skill's default).

### Strapi
- [ ] Content types follow the `strapi-content-modeling` skill and the multi-country ADR.
- [ ] The seed is idempotent and creates **published** content for both CO and CL.
- [ ] Public permissions are set in code (bootstrap), not by hand in the admin panel.

### Accessibility (keyboard-only completion is a hard requirement)
- [ ] The whole wizard can be completed with Tab / Shift+Tab / Enter / Space / arrow keys. Check it.
- [ ] Every field has a programmatic label. Help and error texts are linked via `aria-describedby`;
      invalid fields have `aria-invalid`.
- [ ] On a failed submit, focus moves to the first invalid field (or an error summary).
- [ ] On a step change, focus moves to the step heading, and the step change is announced.
- [ ] Plan selection uses a native radio group or an equivalent ARIA pattern. The recommended
      badge is not conveyed by colour alone.
- [ ] Visible focus indicator; contrast ≥ 4.5:1 for text.
- [ ] Disabled pay button: its state is perceivable, and the reason (terms not accepted) is explained.

### Responsive
- [ ] Usable at 360 px wide and on desktop. No horizontal scroll; touch targets ≥ 44 px.

### Tests
- [ ] Unit tests cover the logic (validators, price rule, masking, config mapping), including boundaries.
- [ ] E2E tests use role or label locators (`getByRole`, `getByLabel`), have no fixed sleeps, and
      run against the seeded stack.
- [ ] Tests fail when the behaviour breaks: mentally mutate the code. Would the test catch it?

### Language
- [ ] Code, comments and docs in English; end-user content (seed) in Spanish.
