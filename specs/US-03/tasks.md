# US-03 — Tasks and session state

> Single source of truth for **where this story is**. Every agent updates it when it finishes
> a step. A new session starts by reading this file (see the `session-handoff` skill).

## Status

| Field | Value |
|---|---|
| Current step | 2 ADR (HC1 passed: spec v0.1 Approved) |
| Branch | feat/us-03-summary-payment |
| PR | — |
| Blockers | HC1: six blocking gaps in spec §6 (US-03-Q-01..Q-06); Q-03 also needs a human edit of CLAUDE.md §6 if its default is accepted |
| **Next action** | architect writes the simulated-payment ADR (Q-01) and the terms rich-text ADR (Q-02) and the ADR-0002 implementation note for the `term` type (Q-03); then HC2. |
| Last updated | 2026-11-21 by orchestrator (Claude Opus 5.5) |

## Tasks

Tasks are planned at spec time and may be re-scoped after HC1/HC2 without changing their IDs.
T-06, T-16 and the simulation part of T-17 depend on the payment ADR (US-03-Q-01); T-05, T-11,
T-12 and T-15 on the terms-format ADR (US-03-Q-02); T-10..T-13 on the content-type name
(US-03-Q-03); T-17 and T-08 on US-03-Q-06 (confirmation route).

| ID | Task | ACs | Owner (agent) | Status | Commit(s) |
|---|---|---|---|---|---|
| US-03-T-01 | ADR: simulated payment design (outcome source, processing time and its injection, service boundary, no request, no card data). Proposed default in spec US-03-Q-01 | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-15 | architect | todo | |
| US-03-T-02 | ADR: terms rich-text format and safe rendering (`blocks` + whitelist renderer vs Markdown + sanitised `[innerHTML]` vs plain text; dependency impact; degradation of unsupported nodes). Proposed default in spec US-03-Q-02 | US-03-AC-13 | architect | todo | |
| US-03-T-03 | Implementation note on ADR-0002 for the terms permission name (US-03-Q-03); and, only if US-03-Q-06 takes the alternative, a confirmation-route note on ADR-0001 | US-03-AC-19, US-03-AC-11 | architect | todo | |
| US-03-T-04 | Unit tests: `document-mask.spec.ts` (every AC-05 row, accessible tail), `summary-rows.spec.ts` (every AC-06 row: groups, option labels, long date per `locale`, plain year, empty optional and checkbox omitted, editor-added field), `quote-number.spec.ts` (every AC-10 row, pinned clock, injected random source) | US-03-AC-05, US-03-AC-06, US-03-AC-10 | test-engineer | todo | |
| US-03-T-05 | Unit and component tests: `terms.spec.ts` (parser, whitelist, malformed entries skipped, `publishedAt` ordering, warning without text), `terms-api.spec.ts` (§7.2 request, relative `/api`, 10 s timeout), `rich-text.spec.ts` (formatting kept; AC-13 XSS rows rendered literally; fallbacks per the ADR) | US-03-AC-13, US-03-AC-14, US-03-AC-12 | test-engineer | todo | |
| US-03-T-06 | Unit tests: simulated payment service (outcome per the ADR, fixed delay with fake timers, single in-flight attempt, no HTTP call) and `quote-store-clear.spec.ts` (entry and in-memory state deleted on success only; nothing cleared on rejection) | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-11 | test-engineer | todo | |
| US-03-T-07 | Component tests `summary-page.spec.ts`: rows and plan with price, terms states (loading, error with 10 s timeout and retry, not available, shown), pay button rules and hint, processing lock, rejection (message, kept state, focus), confirmation (focus, title, quote number), no card fields, a11y roles, names and live regions, focus on arrival and document title. Replace any US-02 test that asserts the summary route has no page | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-04, US-03-AC-08, US-03-AC-09, US-03-AC-12, US-03-AC-15, US-03-AC-17 | test-engineer | todo | |
| US-03-T-08 | E2E: complete `frontend/e2e/us-01-03-full-flow-co.spec.ts` (clock pinned to 2026-11-21): CO summary and masking (DOM, title, address), CO terms and draft hidden, pay disabled → accept → pay → locked → confirmation and quote number format, storage cleared, reload/back/"Nueva cotización" → empty step 1, edit data and change plan, double activation, keyboard-only path and focus, network inspection (GET only, no values, no request during payment) | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-05, US-03-AC-07, US-03-AC-09, US-03-AC-10, US-03-AC-11, US-03-AC-14, US-03-AC-15, US-03-AC-16, US-03-AC-19 | test-engineer | todo | |
| US-03-T-09 | E2E: new `frontend/e2e/us-03-summary-payment-cl.spec.ts`: CL summary and RUT masking, CL terms, pay button rules, rejected payment then retry to success, terms published from the Node process (token: terms `create`/`delete`, `country.find`; teardown also on failure; nothing passed to the browser context), anonymous draft reads (four rows) and proxy `POST` → 405 | US-03-AC-01, US-03-AC-02, US-03-AC-04, US-03-AC-08, US-03-AC-14, US-03-AC-19 | test-engineer | todo | |
| US-03-T-10 | Backend test `backend/tests/terms-rules.test.ts`: publishing terms without `country` rejected; public role reconciled to exactly `country.find`, `form-field.find`, `plan.find` and the terms `find`; seed idempotent (CO and CL published, CO draft only); confirm `published-only-routes.test.ts` covers the terms router | US-03-AC-14, US-03-AC-19 | test-engineer | todo | |
| US-03-T-11 | Strapi: terms collection type (§7.1; name per US-03-Q-03, `body` per the ADR of US-03-Q-02, draft & publish, required `manyToOne` `country`), router with `publishedOnlyConfig()` (fresh object), stock controller and service | US-03-AC-02, US-03-AC-14, US-03-AC-19 | strapi-developer | todo | |
| US-03-T-12 | Strapi: idempotent seed of the terms from `specs/US-03/seed-terms.md` (natural key country code + `title`; CO draft only) and bootstrap reconciliation adding the terms `find` to the public role | US-03-AC-02, US-03-AC-13, US-03-AC-14, US-03-AC-19 | strapi-developer | todo | |
| US-03-T-13 | nginx proxy: add `/api/terms` to the GET-only allow-list | US-03-AC-02, US-03-AC-19 | frontend-developer | todo | |
| US-03-T-14 | Pure functions: document masking (BR-02), summary rows and display values (BR-01: groups, option labels, long date from `locale` in UTC, plain numbers), quote number (injectable clock and random source) | US-03-AC-05, US-03-AC-06, US-03-AC-10 | frontend-developer | todo | |
| US-03-T-15 | Terms API client (one request, §7.2, 10 s timeout), boundary parser and selection, and the rich-text renderer per the ADR (no `bypassSecurityTrust*`, no unsanitised `[innerHTML]`) | US-03-AC-02, US-03-AC-12, US-03-AC-13, US-03-AC-14 | frontend-developer | todo | |
| US-03-T-16 | Simulated payment service per the ADR (no request, no card data, fixed injectable delay, single in-flight attempt) and the `QuoteStore` clear on success (entry and in-memory state) | US-03-AC-03, US-03-AC-04, US-03-AC-09, US-03-AC-11, US-03-AC-15 | frontend-developer | todo | |
| US-03-T-17 | `SummaryPage` attached to `/:country/resumen` (address and `summaryStepGuard` unchanged): rows, plan and price via `calculateFinalPrice` and the US-02 formatter, edit actions, terms section and states, checkbox, simulation group, pay button rules, processing lock, rejection, confirmation (US-03-Q-06), focus and document titles, copy of spec §8.1 | US-03-AC-01, US-03-AC-02, US-03-AC-03, US-03-AC-04, US-03-AC-07, US-03-AC-08, US-03-AC-09, US-03-AC-11, US-03-AC-12, US-03-AC-15, US-03-AC-16, US-03-AC-17 | frontend-developer | todo | |
| US-03-T-18 | Responsive layout of the summary and confirmation (one column at narrow widths, terms region height, 320–1440 px, target sizes) | US-03-AC-18 | frontend-developer | todo | |
| US-03-T-19 | HC3 manual checks: AC-18 screenshots of the CO summary and confirmation at 360 × 740 and 1280 × 800; screen reader pass (masked number, terms region, alerts); AC-14 terms change in the Strapi admin | US-03-AC-14, US-03-AC-17, US-03-AC-18 | human (HC3) | todo | |

## Gate history

| Date | Gate | Result | By | Link (spec review log / review report / PR) |
|---|---|---|---|---|
| 2026-11-21 | 1 Spec | Draft v0.1 written: 8 BR, 19 AC (4 original, 15 derived), 17 Q (6 block HC1), 2 ADRs needed, seed annex `seed-terms.md` | spec-writer (Claude Opus 5.5) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-21 | HC1 (round 1) | **Approved**: spec v0.1; Q-01..Q-06 as proposed, CLAUDE.md §6 corrected, other defaults accepted | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |

## Session log

| Date | Session export | Summary |
|---|---|---|
