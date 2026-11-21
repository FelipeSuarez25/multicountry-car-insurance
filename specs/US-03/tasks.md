# US-03 — Tasks and session state

> Single source of truth for **where this story is**. Every agent updates it when it finishes
> a step. A new session starts by reading this file (see the `session-handoff` skill).

## Status

| Field | Value |
|---|---|
| Current step | 7 Fixes (review R1: changes requested) |
| Branch | feat/us-03-summary-payment |
| PR | — |
| Blockers | none |
| **Next action** | fix R1 findings (spec-writer F01 note, architect F02 note, test-engineer tests, then strapi-developer and frontend-developer) |
| Last updated | 2026-11-21 by orchestrator (Claude Opus 5.5) |

## Tasks

Tasks are planned at spec time and may be re-scoped after HC1/HC2 without changing their IDs.
T-06, T-16 and the simulation part of T-17 depend on the payment ADR (US-03-Q-01); T-05, T-11,
T-12 and T-15 on the terms-format ADR (US-03-Q-02); T-10..T-13 on the content-type name
(US-03-Q-03); T-17 and T-08 on US-03-Q-06 (confirmation route).

| ID | Task | ACs | Owner (agent) | Status | Commit(s) |
|---|---|---|---|---|---|
| US-03-T-01 | ADR: simulated payment design (outcome source, processing time and its injection, service boundary, no request, no card data). Proposed default in spec US-03-Q-01 | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-15 | architect | done (ADR-0008 Accepted at HC2, 2026-11-21: visible outcome choice, `PaymentGateway` boundary) | |
| US-03-T-02 | ADR: terms rich-text format and safe rendering (`blocks` + whitelist renderer vs Markdown + sanitised `[innerHTML]` vs plain text; dependency impact; degradation of unsupported nodes). Proposed default in spec US-03-Q-02 | US-03-AC-13 | architect | done (ADR-0009 Accepted at HC2, 2026-11-21: `blocks` + whitelist renderer, no `[innerHTML]`) | |
| US-03-T-03 | Implementation note on ADR-0002 for the terms permission name (US-03-Q-03); and, only if US-03-Q-06 takes the alternative, a confirmation-route note on ADR-0001 | US-03-AC-19, US-03-AC-11 | architect | done (ADR-0002 implementation note in `adr/README.md`: `api::term.term`, `api::term.term.find`, `publishedOnlyConfig()`, `/api/terms` on the nginx allow-list; no ADR-0001 note, US-03-Q-06 kept the default) | |
| US-03-T-04 | Unit tests: `document-mask.spec.ts` (every AC-05 row, accessible tail), `summary-rows.spec.ts` (every AC-06 row: groups, option labels, long date per `locale`, plain year, empty optional and checkbox omitted, editor-added field), `quote-number.spec.ts` (every AC-10 row, pinned clock, injected random source) | US-03-AC-05, US-03-AC-06, US-03-AC-10 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-05 | Unit and component tests: `terms.spec.ts` (parser, whitelist, malformed entries skipped, `publishedAt` ordering, warning without text), `terms-api.spec.ts` (§7.2 request, relative `/api`, 10 s timeout), `rich-text.spec.ts` (formatting kept; AC-13 XSS rows rendered literally; fallbacks per the ADR) | US-03-AC-13, US-03-AC-14, US-03-AC-12 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-06 | Unit tests: simulated payment service (outcome per the ADR, fixed delay with fake timers, single in-flight attempt, no HTTP call) and `quote-store-clear.spec.ts` (entry and in-memory state deleted on success only; nothing cleared on rejection) | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-11 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-07 | Component tests `summary-page.spec.ts`: rows and plan with price, terms states (loading, error with 10 s timeout and retry, not available, shown), pay button rules and hint, processing lock, rejection (message, kept state, focus), confirmation (focus, title, quote number), no card fields, a11y roles, names and live regions, focus on arrival and document title. Replace any US-02 test that asserts the summary route has no page | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-04, US-03-AC-08, US-03-AC-09, US-03-AC-12, US-03-AC-15, US-03-AC-17 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-08 | E2E: complete `frontend/e2e/us-01-03-full-flow-co.spec.ts` (clock pinned to 2026-11-21): CO summary and masking (DOM, title, address), CO terms and draft hidden, pay disabled → accept → pay → locked → confirmation and quote number format, storage cleared, reload/back/"Nueva cotización" → empty step 1, edit data and change plan, double activation, keyboard-only path and focus, network inspection (GET only, no values, no request during payment) | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-05, US-03-AC-07, US-03-AC-09, US-03-AC-10, US-03-AC-11, US-03-AC-14, US-03-AC-15, US-03-AC-16, US-03-AC-19 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-09 | E2E: new `frontend/e2e/us-03-summary-payment-cl.spec.ts`: CL summary and RUT masking, CL terms, pay button rules, rejected payment then retry to success, terms published from the Node process (token: terms `create`/`delete`, `country.find`; teardown also on failure; nothing passed to the browser context), anonymous draft reads (four rows) and proxy `POST` → 405 | US-03-AC-01, US-03-AC-02, US-03-AC-04, US-03-AC-08, US-03-AC-14, US-03-AC-19 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-10 | Backend test `backend/tests/terms-rules.test.ts`: publishing terms without `country` rejected; public role reconciled to exactly `country.find`, `form-field.find`, `plan.find` and the terms `find`; seed idempotent (CO and CL published, CO draft only); confirm `published-only-routes.test.ts` covers the terms router | US-03-AC-14, US-03-AC-19 | test-engineer | done (red, written first) | 67462f5, f5878f4 |
| US-03-T-11 | Strapi: terms collection type (§7.1; name per US-03-Q-03, `body` per the ADR of US-03-Q-02, draft & publish, required `manyToOne` `country`), router with `publishedOnlyConfig()` (fresh object), stock controller and service | US-03-AC-02, US-03-AC-14, US-03-AC-19 | strapi-developer | done | eb0f059 |
| US-03-T-12 | Strapi: idempotent seed of the terms from `specs/US-03/seed-terms.md` (natural key country code + `title`; CO draft only) and bootstrap reconciliation adding the terms `find` to the public role | US-03-AC-02, US-03-AC-13, US-03-AC-14, US-03-AC-19 | strapi-developer | done (seed and public `term.find`) | eb0f059 |
| US-03-T-13 | nginx proxy: add `/api/terms` to the GET-only allow-list | US-03-AC-02, US-03-AC-19 | frontend-developer | done | 2ddf444 |
| US-03-T-14 | Pure functions: document masking (BR-02), summary rows and display values (BR-01: groups, option labels, long date from `locale` in UTC, plain numbers), quote number (injectable clock and random source) | US-03-AC-05, US-03-AC-06, US-03-AC-10 | frontend-developer | done | daafceb |
| US-03-T-15 | Terms API client (one request, §7.2, 10 s timeout), boundary parser and selection, and the rich-text renderer per the ADR (no `bypassSecurityTrust*`, no unsanitised `[innerHTML]`) | US-03-AC-02, US-03-AC-12, US-03-AC-13, US-03-AC-14 | frontend-developer | done | 7a5d6de |
| US-03-T-16 | Simulated payment service per the ADR (no request, no card data, fixed injectable delay, single in-flight attempt) and the `QuoteStore` clear on success (entry and in-memory state) | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-11, US-03-AC-15 | frontend-developer | done | f11e522, a3f186c |
| US-03-T-17 | `SummaryPage` attached to `/:country/resumen` (address and `summaryStepGuard` unchanged): rows, plan and price via `calculateFinalPrice` and the US-02 formatter, edit actions, terms section and states, checkbox, simulation group, pay button rules, processing lock, rejection, confirmation (US-03-Q-06), focus and document titles, copy of spec §8.1 | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-04, US-03-AC-07, US-03-AC-08, US-03-AC-09, US-03-AC-11, US-03-AC-12, US-03-AC-15, US-03-AC-16, US-03-AC-17 | frontend-developer | done | 55e94d6 |
| US-03-T-18 | Responsive layout of the summary and confirmation (one column at narrow widths, terms region height, 320–1440 px, target sizes) | US-03-AC-18 | frontend-developer | done | 55e94d6, 8daae83 |
| US-03-T-19 | HC3 manual checks: AC-18 screenshots of the CO summary and confirmation at 360 × 740 and 1280 × 800; screen reader pass (masked number, terms region, alerts); AC-14 terms change in the Strapi admin | US-03-AC-14, US-03-AC-17, US-03-AC-18 | human (HC3) | todo | |

## Gate history

| Date | Gate | Result | By | Link (spec review log / review report / PR) |
|---|---|---|---|---|
| 2026-11-21 | 1 Spec | Draft v0.1 written: 8 BR, 19 AC (4 original, 15 derived), 17 Q (6 block HC1), 2 ADRs needed, seed annex `seed-terms.md` | spec-writer (Claude Opus 5.5) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | HC1 (round 1) | **Approved**: spec v0.1; Q-01..Q-06 as proposed, CLAUDE.md §6 corrected, other defaults accepted | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | 2 ADR | ADR-0008 (simulated payment: visible outcome choice, option A of A–E; backend mock endpoint excluded by ADR-0002) and ADR-0009 (terms rich text: `blocks` + whitelist renderer, option D of A–D) written as Proposed, each with *Strongest argument against* and *Spec impact* (no AC change). US-03-Q-03 recorded as an ADR-0002 implementation note. Ready for HC2 | architect (Claude Opus 5.5) | [ADR-0008](../../adr/0008-simulated-payment.md), [ADR-0009](../../adr/0009-terms-rich-text-rendering.md), [adr/README.md](../../adr/README.md) |
| 2026-11-21 | HC2 | **Accepted**: ADR-0008 (simulated payment, option A) and ADR-0009 (terms as Strapi blocks with a whitelist renderer, option D); ADR-0002 implementation note for the `term` type | Felipe Sabogal (human) | adr/0008, adr/0009 |
| 2026-11-21 | 3 Tests | Tests written first and red for the right reason: `tsc -p tsconfig.spec.json` has only TS2307 for the planned modules; `backend/tests/terms-rules.test.ts` fails only because `api::term.term` does not exist (and the replaced public-role assertion of `plan-rules.test.ts` for the missing `term.find`); `playwright test --list` loads 124 tests in 7 files. Every existing frontend test (590) and backend test stays green. The page, pure-function, gateway, store, terms and renderer tests were also run against throwaway prototypes outside the repository (all green) to prove they are coherent and not red for a test defect. 19 AC and 8 BR are covered, AC-18 is manual (spec). | test-engineer (Claude Sonnet 5.5) | this file, `scripts/trace.sh US-03` |
| 2026-11-21 | Step 3 test decisions | **Decided**: (1) terms title is an `h3` under the `h2` section and the body renders with `headingLevel` 4; (2) a select value with no matching option, or an invalid date string, is shown raw (row kept); (3) nested lists render up to 6 levels, a 7th is dropped with the `list-depth` warning; (4) accepted as proposed: the names `maskDocumentNumber`, `buildSummaryRows`, `parseTerms`, `TermsApi.load`, `QuoteStore.clearQuote`; a value-free warning when a country has more than one published terms; AC-15 measured with a 1.4–4 s tolerance; AC-16 real scroll checked at HC3 | Felipe Sabogal (human) | test commit 67462f5 |
| 2026-11-21 | Gate (attempt 1) | **PASSED** (run by the orchestrator on a clean stack): frontend lint 0, build 0, unit 945/945; backend lint 0, build 0, 81/81; e2e 124/124 twice (7 files, US-01..US-03); `trace.sh` US-01/02/03 exit 0 (US-03: ACs without test 0); code scan exit 0 (6 known exceptions); log scan 23 = 23. Before the gate, two test defects found by the frontend-developer were confirmed by the orchestrator and fixed by the test-engineer (d530005) | orchestrator | d530005 |
| 2026-11-21 | Review R1 decisions | **Decided**: F01 (major) the terms seed creates a country's terms only when that country has no terms document at all (draft or published); spec §7.3 note and a backend test. F02..F05 and F06 fixed now | Felipe Sabogal (human) | [R1](../../reviews/US-03-review-R1.md) |

## Session log

| Date | Session export | Summary |
|---|---|---|
