---
name: test-from-spec
description: Derives automated tests from an approved spec before implementation (test-first) - AC-ID naming, choosing the test level, Vitest unit/component patterns and Playwright e2e patterns for this project. Use when writing tests for a story, mapping acceptance criteria to tests, or checking that every AC has a test.
---

# Tests from spec

## Principles

1. **Tests are derived from the approved spec, not from the code.** Write them before the
   implementation (they start red). Read `spec.md` and the referenced ADRs; do not read the
   implementation to decide what to assert.
2. **Every AC has at least one automated test**, or an explicit `manual` entry in the spec's test
   mapping with a reason (for example, screen-reader output).
3. **Name tests with their IDs**, so that `scripts/trace.sh` can find them:
   ```ts
   describe('US-01-AC-02 field validation', () => {
     it('shows the configured error next to the field and blocks next step', async () => { … });
   });
   ```
   Business-rule tests use the BR ID: `describe('US-01-BR-03 vehicle year range', …)`.
4. **Assert behaviour that a user or caller can observe**: rendered text, enabled state, emitted
   value, navigation. Do not assert private fields or the call counts of internal methods.
5. **Boundaries are tested on both sides** (exactly 18 / one day short; `currentYear+1` /
   `currentYear+2`).
6. Commit tests as `test(<scope>): … Refs: US-XX-AC-NN`. Red tests on the feature branch are
   expected until the implementation lands. Never weaken a test to make it pass: if the spec is
   wrong, raise it to the human.

## Choosing the level

| What | Level | Tool |
|---|---|---|
| Pure logic: config parsing, validators, price rule, masking, currency formatting | Unit | Vitest |
| A component's behaviour with a fake store or API | Component | Vitest + TestBed (zoneless) |
| Full wizard against the real seeded Strapi | E2E | Playwright |
| Content changes without a deploy (US-01 "new published field") | E2E with setup through the Strapi admin REST API using a **test-only** token held by the test runner (never by the app) | Playwright |

## Vitest (unit and component)

- Follow the vendored `angular-developer` skill, `references/testing-fundamentals.md`: zoneless,
  **Act → `await fixture.whenStable()` → Assert**, no `fixture.detectChanges()`.
- Query the DOM by accessible role or label where possible. That also checks the labels.
- Inject a fixed clock for date rules. Never depend on the real current date.
- Fake HTTP with `provideHttpClientTesting()` and `HttpTestingController`. Build fixture
  payloads that look like Strapi 5 responses (flattened, `documentId`).

## Playwright (e2e)

- Location: `frontend/e2e/<us-ids>-<slug>.spec.ts`. Name tests with their IDs.
- **Locators:** `getByRole`, `getByLabel`, `getByText`. Use `data-testid` only when no
  accessible handle exists, and justify it in a comment.
- **No fixed waits** (`waitForTimeout`). Wait on web-first assertions (`await expect(…).toBeVisible()`).
- Runs against the `docker compose` stack with the seed. Never mock Strapi in e2e.
- Required coverage:
  - Full happy path for **one country** (CO): form → plan → summary → terms → pay → confirmation
    with a quote number.
  - The same flow **keyboard-only** (Tab, Shift+Tab, Space, Enter, arrow keys; no `click()`).
  - A country smoke test for CL: the right fields and plans are shown.
  - The rejected-payment path, if the simulated gateway can be forced to fail deterministically
    (per the US-03 spec).
- Use only fictitious data in fixtures.

## Definition of done for the test-engineer step

- [ ] Every AC in the spec's test mapping has a test, or a justified manual entry.
- [ ] The tests compile and fail for the right reason (feature missing), not because of setup errors.
- [ ] `scripts/trace.sh US-XX --no-fail` lists a test for every non-manual AC.
- [ ] `tasks.md` is updated with the test files. The test-engineer **does not edit `spec.md`**:
      §11 is the plan, and `trace.sh` shows what exists. If the plan is wrong, report it.
