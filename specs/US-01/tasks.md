# US-01 — Tasks and session state

> Single source of truth for **where this story is**. Every agent updates it when it finishes
> a step. A new session starts by reading this file (see the `session-handoff` skill).

## Status

| Field | Value |
|---|---|
| Current step | 2 ADR (HC1 passed: spec v0.2 approved) |
| Branch | feat/us-01-data-form |
| PR | — |
| Blockers | none (all 27 gaps answered) |
| **Next action** | Step 2: the architect writes the ADRs listed in spec §10 as Proposed. The forms ADR waits for SPIKE-01 (CLAUDE.md §7), run by the frontend-developer on a `spike/01-forms` branch. Then HC2. |
| Last updated | 2026-11-20 by orchestrator (Claude Opus 5.5) |

## Tasks

Tasks are planned at spec time and may be split or re-scoped after HC2 (ADRs) without changing
their IDs. No production form code is written before the forms ADR is accepted (CLAUDE.md §7).
US-01 has exactly four e2e files (spec §11). No provisional step 2 page is built (US-01-Q-19).

| ID | Task | ACs | Owner (agent) | Status | Commit(s) |
|---|---|---|---|---|---|
| US-01-T-01 | ADR: multi-country content strategy (Strapi model + country resolution in Angular, unsupported country, switching) | US-01-AC-01, US-01-AC-17, US-01-AC-22 | architect | todo | |
| US-01-T-02 | ADR: Strapi access and security model (public role vs read-only proxy, runtime API URL, no caching that breaks BR-06, how e2e writes test content) | US-01-AC-27, US-01-AC-03 | architect | todo | |
| US-01-T-03 | ADR: front-end persistence of wizard state (storage, scope per country, clearing) | US-01-AC-04, US-01-AC-20, US-01-AC-21, US-01-AC-22, US-01-AC-23 | architect | todo | |
| US-01-T-04 | SPIKE-01 on `spike/01-forms` (not merged): runtime form from §7.1 JSON, incl. hydration from a store, removed-field values, error timing, focus on first invalid, integer-only number | US-01-AC-02, US-01-AC-04, US-01-AC-05, US-01-AC-06, US-01-AC-10, US-01-AC-23 | frontend-developer | todo | |
| US-01-T-05 | SPIKE-01 write-up and ADR: forms library | US-01-AC-02, US-01-AC-10 | architect | todo | |
| US-01-T-06 | ADR or ADR section: wizard routing and step guards, including the step 2 route before its page exists (US-01-Q-27) (candidate, architect decides) | US-01-AC-18, US-01-AC-19, US-01-AC-20, US-01-AC-24 | architect | todo | |
| US-01-T-07 | Unit tests: boundary parser and sorting of field configuration | US-01-AC-01, US-01-AC-14, US-01-AC-16 | test-engineer | todo | |
| US-01-T-08 | Unit tests: validators and message resolution with pinned clock (required, length, pattern, minAge, yearRange, rutCheckDigit, integer numbers; every row of the seed format table) | US-01-AC-05, US-01-AC-06, US-01-AC-08, US-01-AC-09, US-01-AC-11, US-01-AC-12 | test-engineer | todo | |
| US-01-T-09 | Unit tests: wizard store (save, §7.3 shape, hydration, restore by a new instance as after a reload, scope per country, removed keys and options) and step 2 guard | US-01-AC-04, US-01-AC-18, US-01-AC-19, US-01-AC-20, US-01-AC-21, US-01-AC-22, US-01-AC-23 | test-engineer | todo | |
| US-01-T-10 | Component tests: step 1 page (rendering, CO and CL options, errors, timing, focus, a11y attributes, load error, retry, navigation to the step 2 route, return to step 1 and router history back with values shown, restored values) | US-01-AC-02, US-01-AC-04, US-01-AC-07, US-01-AC-10, US-01-AC-15, US-01-AC-16, US-01-AC-18, US-01-AC-20, US-01-AC-21, US-01-AC-23, US-01-AC-25 | test-engineer | todo | |
| US-01-T-11 | E2E `frontend/e2e/us-01-data-form-co.spec.ts` against seeded Strapi: CO fields and order, validation, draft field hidden, keyboard-only path up to the step 2 address | US-01-AC-01, US-01-AC-02, US-01-AC-13, US-01-AC-24 | test-engineer | todo | |
| US-01-T-12 | E2E `frontend/e2e/us-01-country-context.spec.ts`: CL fields and order, unsupported country, no data across countries | US-01-AC-01, US-01-AC-17, US-01-AC-22 | test-engineer | todo | |
| US-01-T-13 | E2E `frontend/e2e/us-01-config-change.spec.ts`: configuration change without deployment (content written from the Node test process) | US-01-AC-03 | test-engineer | todo | |
| US-01-T-14 | E2E `frontend/e2e/us-01-security.spec.ts`: network inspection (re-scoped in v0.2: keyboard moved to T-11, viewports to the manual check T-31) | US-01-AC-27 | test-engineer | todo | |
| US-01-T-15 | Strapi: field configuration content type, select-option and validation-rule components, draft & publish | US-01-AC-01, US-01-AC-07, US-01-AC-13, US-01-AC-14 | strapi-developer | todo | |
| US-01-T-16 | Strapi: country model and relation per the multi-country ADR | US-01-AC-01, US-01-AC-17 | strapi-developer | todo | |
| US-01-T-17 | Strapi: idempotent seed of the CO and CL fields in `specs/US-01/seed-fields.md` (summary in spec §7.2), including the draft-only field | US-01-AC-01, US-01-AC-11, US-01-AC-12, US-01-AC-13 | strapi-developer | todo | |
| US-01-T-18 | Strapi: public role / read-only access per the security ADR, set in bootstrap code | US-01-AC-27 | strapi-developer | todo | |
| US-01-T-19 | Compose: single-command start of Strapi + front end with seed (shared with frontend-developer) | US-01-AC-01 | strapi-developer | todo | |
| US-01-T-20 | Angular scaffold pinned to 22.3.0, runtime API URL configuration | US-01-AC-01, US-01-AC-27 | frontend-developer | todo | |
| US-01-T-21 | Country context resolution and unsupported-country page | US-01-AC-01, US-01-AC-17, US-01-AC-22 | frontend-developer | todo | |
| US-01-T-22 | Content API client and boundary parser (typed FieldConfig, drop + warn, sorting) | US-01-AC-01, US-01-AC-14, US-01-AC-16 | frontend-developer | todo | |
| US-01-T-23 | Validators as pure functions with injectable clock, message resolution | US-01-AC-05, US-01-AC-06, US-01-AC-08, US-01-AC-09, US-01-AC-11, US-01-AC-12 | frontend-developer | todo | |
| US-01-T-24 | Dynamic form rendering: one control per type, labels, help, errors, error timing, focus on first invalid | US-01-AC-02, US-01-AC-07, US-01-AC-10, US-01-AC-25 | frontend-developer | todo | |
| US-01-T-25 | Wizard state store: save values, hydrate step 1, drop removed keys and options, persistence per ADR | US-01-AC-04, US-01-AC-18, US-01-AC-20, US-01-AC-21, US-01-AC-22, US-01-AC-23 | frontend-developer | todo | |
| US-01-T-26 | Wizard routing: step 2 route with the step guard and no page of its own (per the US-01-Q-27 answer), "Continuar" navigation, browser back to step 1, focus on the step 1 heading (re-scoped in v0.2: no placeholder step 2) | US-01-AC-18, US-01-AC-19, US-01-AC-20, US-01-AC-24 | frontend-developer | todo | |
| US-01-T-27 | Loading, error and retry states (10 s timeout) | US-01-AC-15, US-01-AC-16 | frontend-developer | todo | |
| US-01-T-28 | Responsive layout (one column, 320–1440 px, target sizes) | US-01-AC-26 | frontend-developer | todo | |
| US-01-T-29 | Update the `dynamic-form-fields` skill contract to match spec §7.4, in the same PR (repository plumbing, needs human request) | US-01-AC-09, US-01-AC-12 | orchestrator | done | skill updated to contract v1 (this branch) |
| US-01-T-30 | Create `specs/US-01/seed-fields.md` from spec *Annex A (staging)*, verbatim, and delete Annex A and the staging note in §7.2 (the spec-writer's write scope did not allow it in v0.2) | US-01-AC-01, US-01-AC-11, US-01-AC-13 | orchestrator | done | annex moved verbatim, diff-verified (this branch) |
| US-01-T-31 | HC3 manual check of AC-26: screenshots of step 1 of Colombia at 360 × 740 and 1280 × 800, attached to the HC3 record | US-01-AC-26 | human (HC3) | todo | |

Handed over to US-02 (not US-01 tasks): the e2e part of US-01-AC-04, US-01-AC-18, US-01-AC-20
and US-01-AC-21, and the "focus on the step 2 heading" clause of US-01-AC-24. They need the step 2
page (US-01-Q-19).

## Gate history

| Date | Gate | Result | By | Link (spec review log / review report / PR) |
|---|---|---|---|---|
| 2026-11-20 | 1 Spec | Draft v0.1 written | spec-writer (Claude Opus 5.5) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-20 | HC1 (round 1) | Changes requested: answers recorded, Q-19 rejected, 4 corrections for v0.2, T-29 authorised | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-20 | 1 Spec | Draft v0.2 written: corrections 1–4 applied (1 partly, annex staged in spec Annex A, T-30), new blocking gap Q-27, T-30 and T-31 added, no ID retired | spec-writer (Claude Opus 5.5) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-20 | HC1 (round 2) | Q-27 answered (default accepted); annex moved by the orchestrator (T-30); awaiting the approval decision | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |
| 2026-11-20 | HC1 (round 2) | **Approved**: spec v0.2 | Felipe Sabogal (human) | [spec.md §13](spec.md#13-review-log) |

## Session log

| Date | Session export | Summary |
|---|---|---|
