# US-02 — Tasks and session state

> Single source of truth for **where this story is**. Every agent updates it when it finishes
> a step. A new session starts by reading this file (see the `session-handoff` skill).

## Status

| Field | Value |
|---|---|
| Current step | 6 Review round 1 (gate passed) |
| Branch | feat/us-02-plan-list |
| PR | — |
| Blockers | — (the orchestrator sets ADR-0007 to Accepted per the human's HC2 decision) |
| **Next action** | code-reviewer writes reviews/US-02-review-R1.md. |
| Last updated | 2026-11-21 by orchestrator (Claude Opus 5.5) |

## Tasks

Tasks are planned at spec time and may be re-scoped after HC1/HC2 without changing their IDs.
T-07 and T-20 depend on US-02-Q-03; T-07..T-09 on US-02-Q-04; T-04 and T-16 on the price-rule
ADR (US-02-Q-01).

| ID | Task | ACs | Owner (agent) | Status | Commit(s) |
|---|---|---|---|---|---|
| US-02-T-01 | ADR: simulated price rule (options: rule in code, factors per country in Strapi, factor per plan; formula, integer arithmetic and rounding, missing-input fallback, clock, reuse by US-03). Proposed default in spec §7.6 | US-02-AC-07, US-02-AC-13 | architect | done (ADR-0007: option A chosen at HC2, revised; acceptance recorded by the orchestrator) | |
| US-02-T-02 | ADR-0001 amendment or implementation note: summary route `/:country/resumen` and step 3 guard registered by US-02 (only if US-02-Q-03 is accepted) | US-02-AC-15 | architect | done (implementation note on ADR-0001 in `adr/README.md`; no amending ADR, the decision is unchanged) | |
| US-02-T-03 | Unit tests `plan.spec.ts`: boundary parser (every AC-09 row, blank lines skipped, inactive dropped, duplicates, `isRecommended` normalisation), sorting with ties, recommended resolution (first flagged offered plan) | US-02-AC-01, US-02-AC-08, US-02-AC-09, US-02-AC-10 | test-engineer | written, red: `frontend/src/app/shared/plan.spec.ts` (plus `frontend/src/app/core/plan-api.spec.ts` for the §7.2 request) | |
| US-02-T-04 | Unit tests `price-rules.spec.ts` (pinned clock, every AC-07 row incl. rounding and missing inputs with a warning that carries no value) and `money-format.spec.ts` (every AC-06 row, whitespace removed) | US-02-AC-06, US-02-AC-07 | test-engineer | written, red: `frontend/src/app/shared/price-rules.spec.ts`, `frontend/src/app/shared/money-format.spec.ts` | |
| US-02-T-05 | Unit tests `quote-store.spec.ts` (chosen plan written on choice, restored by a new instance, kept on step 1 edits, pruned when not offered and written back, entry with an invalid `plan` discarded, cleared on country switch) and `summary-step-guard.spec.ts` (AC-15 rows, `replaceUrl`) | US-02-AC-13, US-02-AC-14, US-02-AC-15 | test-engineer | written, red: `frontend/src/app/core/quote-store-plan.spec.ts` (separate file, `quote-store.spec.ts` untouched), `frontend/src/app/core/summary-step-guard.spec.ts` | |
| US-02-T-06 | Component tests `plan-list-page.spec.ts`: rendering and order, recommended highlight and edge cases, no preselection, single choice, "Continuar" with and without a plan (message, focus), empty state (empty and all-malformed responses), loading, error with 10 s timeout and retry, "Atrás", pruning of a plan no longer offered, a11y (group name, option names and descriptions, checked state, alert), focus on the heading and document title on arrival | US-02-AC-02, US-02-AC-03, US-02-AC-04, US-02-AC-05, US-02-AC-10, US-02-AC-11, US-02-AC-14, US-02-AC-17 | test-engineer | written, red: `frontend/src/app/features/plan-list/plan-list-page.spec.ts`; helpers `frontend/src/testing/plan-fixtures.ts`, `plan-dom.ts`, `content-server.ts` (plans) ; US-01 test replaced in `quote-form-page.spec.ts` (see Gate history) | |
| US-02-T-07 | E2E `frontend/e2e/us-01-03-full-flow-co.spec.ts` (clock pinned to 2026-11-21): CO plans and prices, choice, continue without a plan, keyboard path and focus, back/forward and reload keep the choice, changed vehicle year recomputes the price, network inspection; plus the US-01 hand-over (US-01-AC-04, AC-18, AC-20, AC-21 first scenario, AC-24 focus on the step 2 heading) | US-02-AC-01, US-02-AC-03, US-02-AC-05, US-02-AC-07, US-02-AC-13, US-02-AC-16, US-02-AC-19 | test-engineer | written, red: `frontend/e2e/us-01-03-full-flow-co.spec.ts`, helper `frontend/e2e/support/plans.ts` | |
| US-02-T-08 | E2E `frontend/e2e/us-02-plans-cl-content.spec.ts`: CL plans, recommended, CL price rendering, seeded draft-only and inactive plans hidden, plan added and published from the Node process (token: `plan.create`, `plan.delete`, `country.find`; teardown also on failure; nothing passed to the browser context) | US-02-AC-01, US-02-AC-02, US-02-AC-06, US-02-AC-07, US-02-AC-08, US-02-AC-12 | test-engineer | written, red: `frontend/e2e/us-02-plans-cl-content.spec.ts` | |
| US-02-T-09 | E2E API checks (Node process, no browser, no valid token): anonymous `status=draft` plan reads on Strapi's port and through the proxy return no `joven`; `POST /api/plans` through the proxy returns 405 with nothing created. In `plans-cl-content` (or `us-02-security.spec.ts`, per US-02-Q-04) | US-02-AC-19 | test-engineer | written, red: `frontend/e2e/us-02-plans-cl-content.spec.ts` (AC-19 describe; one file, no `us-02-security.spec.ts`) | |
| US-02-T-10 | Backend tests: `plan` `key` unique per country (rejected in the same country, accepted in the other), publishing a `plan` without `country` rejected; confirm `published-only-routes.test.ts` covers `api::plan.plan` | US-02-AC-09, US-02-AC-19 | test-engineer | written, red: `backend/tests/plan-rules.test.ts` (key per country, required country, attribute contract, public role, seed); `published-only-routes.test.ts` already covers `api::plan.plan`, unchanged | |
| US-02-T-11 | Strapi: `plan` collection type (§7.1; draft & publish, required `manyToOne` `country`, `basePrice` integer `min: 1`, `isActive` default true, `isRecommended` default false) and components `plan.coverage`, `plan.benefit` (`label` required); router with `publishedOnlyConfig()`; stock controller and service | US-02-AC-01, US-02-AC-08, US-02-AC-19 | strapi-developer | done | 6786a72 |
| US-02-T-12 | Strapi: extend the key-uniqueness Document Service middleware to `plan` (message in Spanish, for example "Ya existe un plan con la clave … en este país.") | US-02-AC-09 | strapi-developer | done | 2d5a708 |
| US-02-T-13 | Strapi: idempotent seed of the CO and CL plans from `specs/US-02/seed-plans.md` (natural key country code + `key`; draft-only and inactive plans included) | US-02-AC-01, US-02-AC-02, US-02-AC-07, US-02-AC-08 | strapi-developer | done | 84cfc51 |
| US-02-T-14 | Strapi bootstrap: reconcile the public role to exactly `country.find`, `form-field.find`, `plan.find` (ADR-0002) | US-02-AC-01, US-02-AC-19 | strapi-developer | done | 84cfc51 |
| US-02-T-15 | nginx proxy: add `/api/plans` to the GET-only allow-list | US-02-AC-01, US-02-AC-19 | frontend-developer | done | 7b698a2  |
| US-02-T-16 | Pure functions: price rule (per the accepted ADR; injectable clock, integer arithmetic, warning without values) and currency formatter (`Intl.NumberFormat` with the country's `locale` and `currencyCode`, no fraction digits, grouping always) | US-02-AC-06, US-02-AC-07 | frontend-developer | done | 4f032ce  |
| US-02-T-17 | Plan content API client (one request per country, `isActive` filter, narrow `fields`/`populate`, relative `/api`, 10 s timeout) and boundary parser (§7.2) | US-02-AC-01, US-02-AC-08, US-02-AC-09, US-02-AC-10, US-02-AC-11 | frontend-developer | done | 93ce8da  |
| US-02-T-18 | `QuoteStore`: chosen plan (`plan: { key }` in the version-1 entry), write on choice, prune against the offered plans, boundary validation of `plan`; typed step 1 output re-derived on entering step 2 (US-02-Q-17) | US-02-AC-03, US-02-AC-13, US-02-AC-14 | frontend-developer | done | bcd49c0  |
| US-02-T-19 | `PlanListPage` on `/:country/planes`: rendering, recommended highlight, radio group, "Seleccionado", "Continuar" and "Atrás", message and focus, focus on the heading and document title on arrival; loading, error, retry and empty states; copy of spec §8.1 | US-02-AC-01, US-02-AC-02, US-02-AC-03, US-02-AC-04, US-02-AC-05, US-02-AC-11, US-02-AC-16, US-02-AC-17 | frontend-developer | done | c389874, 3b0efdd  |
| US-02-T-20 | Summary route `/:country/resumen` with the step 3 guard and no page of its own (only if US-02-Q-03 is accepted) | US-02-AC-03, US-02-AC-15 | frontend-developer | done | 1491d73, c389874  |
| US-02-T-21 | Responsive layout of the plan list (one column at narrow widths, row/grid on wide screens, 320–1440 px, target sizes) | US-02-AC-18 | frontend-developer | done (layout; AC-18 screenshots are T-22) | c389874 (manual check at HC3)  |
| US-02-T-22 | HC3 manual checks: AC-18 screenshots of step 2 of Colombia at 360 × 740 and 1280 × 800; AC-08 published version shown while a draft change is pending (Strapi admin); AC-12 in the admin | US-02-AC-08, US-02-AC-12, US-02-AC-18 | human (HC3) | todo | |

## Gate history

| Date | Gate | Result | By | Link (spec review log / review report / PR) |
|---|---|---|---|---|
| 2026-11-21 | 1 Spec | Draft v0.1 written: 7 BR, 19 AC (4 original, 15 derived), 20 Q (4 block HC1), 1 ADR needed + 1 candidate, seed annex | spec-writer (Claude Opus 5.5) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | HC1 (round 1) | Answers recorded: Q-01 to an ADR with real alternatives; Q-02..Q-04 OK; other defaults accepted. Approval pending | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | HC1 (round 1) | **Approved**: spec v0.1 | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | 2 ADR | ADR-0007 written (Proposed): formula in code, factor tables per country as `pricing.age-band` components on `country` (option B of A–E); spec impact listed in the ADR. US-02-Q-03 recorded as an implementation note on ADR-0001. Ready for HC2 | architect (Claude Opus 5.5) | [ADR-0007](../../adr/0007-simulated-price-rule.md), [adr/README.md](../../adr/README.md) |
| 2026-11-21 | HC2 | Human chose **option A** for ADR-0007 (rule and factors fixed in one pure front-end function shared with US-03), not the proposed B. ADR-0007 revised by the architect (outcome A, strongest argument against now argues for B, B named as the upgrade path, spec impact: none); ADR-0001 note for US-02-Q-03 kept. Acceptance to be recorded by the orchestrator | Felipe Sabogal (human); revision by architect (Claude Opus 5.5) | [ADR-0007](../../adr/0007-simulated-price-rule.md) |
| 2026-11-21 | HC2 | **Accepted**: ADR-0007 (option A: rule and factors fixed in one pure front-end function, reused by US-03); US-02-Q-03 recorded as an ADR-0001 implementation note | Felipe Sabogal (human) | adr/0007 |
| 2026-11-21 | 3 Tests | Tests written, red for the right reason. Frontend: `npx tsc --noEmit -p tsconfig.spec.json` reports only TS2307 for the planned modules `price-rules`, `money-format`, `plan`, `plan.model`, `plan-api`, `summary-step-guard`; `plan-list-page.spec.ts` and `quote-store-plan.spec.ts` compile and fail at run time (no page, no `plan` in the store). `npm test` stops at the build on those TS2307, so the existing suite is verified with the new files excluded (`ng test --exclude`): 318 pass. **One US-01 test was replaced on purpose**: `quote-form-page.spec.ts` "the step 2 route has no page of its own" (US-01-Q-27, superseded because US-02 attaches its page) now asserts the step 2 heading; it is red until the page exists. Backend: `plan-rules.test.ts` fails in `beforeAll` only because `api::plan.plan` does not exist; the two existing backend files pass. E2E: `playwright test --list` loads the 6 files (78 tests). E2E and backend plan tests were not run against an implementation | test-engineer (Claude Sonnet 5.5) | commit `test(us-02): tests for the plan list` (this step) |
| 2026-11-21 | Step 3 decisions | Accepted the test-engineer's six calls: (1) the US-01 'step 2 has no page' test replaced by 'plan list page shows'; (2) unexpected plans response shape → error state with Reintentar; (3) summary guard when the plans request fails → /planes; (4) basePrice max 2,147,483,647 enforced in Strapi too; (5) focus indicator on the native radio; (6) recommended visual style and screen-reader announcement are manual HC3 checks | Felipe Sabogal (human) | 56fa702 |
| 2026-11-21 | 5 Gate | **PASSED** on a clean stack: fe build/lint, 590/590 unit, tsc 0; be tsc/lint/build, 49/49 (after e266d9a test isolation); Reactive Forms 0; factor literals only in price-rules.ts (ADR-0007); deps pinned; full e2e 78/78 ×2; US-02 e2e files ×5 = 190/190; trace US-01 and US-02 exit 0; code secret scan exit 0 (logs now scanned separately) | orchestrator (scripts, no AI) | scripts/e2e.sh output |

## Session log

| Date | Session export | Summary |
|---|---|---|
