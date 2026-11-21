# Architecture Decision Records

Format: MADR 4 (see the `adr-madr` skill). Only a human sets an ADR to `Accepted` or `Rejected`.
Accepted ADRs are binding (`CLAUDE.md` §1, level 2) and are never rewritten; they are superseded.

## Index

| ADR | Title | Status | Date | Stories |
|---|---|---|---|---|
| [0001](0001-multi-country-content-strategy.md) | Multi-country content strategy and country context (includes wizard routes and step guards) | Accepted (amended by ADR-0006) | 2026-11-20 | US-01, US-02, US-03 |
| [0002](0002-strapi-access-and-security.md) | Strapi access and security model | Accepted (amended by ADR-0005) | 2026-11-20 | US-01, US-02, US-03 |
| [0003](0003-wizard-state-persistence.md) | Front-end persistence of the wizard state | Accepted | 2026-11-20 | US-01, US-02, US-03 |
| [0004](0004-forms-library.md) | Forms library for the Strapi-driven step 1 form (Signal Forms over a shared validation core) | Accepted | 2026-11-20 | US-01 |
| [0005](0005-e2e-token-scope-for-relations.md) | Scope of the temporary e2e API token when the created content has relations (amends ADR-0002) | Accepted | 2026-11-21 | US-01 |
| [0006](0006-strapi-physical-model-adjustments.md) | Strapi physical model adjustments: typed validation-rule parameters and the country `localeTag` attribute (amends ADR-0001) | Accepted | 2026-11-21 | US-01, US-02 |
| [0007](0007-simulated-price-rule.md) | Simulated price rule: formula and factors fixed in one pure front-end function | Accepted (option A, chosen by the human at HC2, 2026-11-21) | 2026-11-21 | US-02, US-03 |

### Implementation notes on accepted ADRs (no decision change)

Accepted ADRs are not rewritten. When the implementation of an accepted decision changes in a way
that leaves the decision intact, the note goes here.

| ADR | Note | Since |
|---|---|---|
| 0002 | The published-only rule (ADR-0002 calls it a "global middleware") is a **route middleware** on `find`/`findOne`, attached per router through `publishedOnlyConfig()`, so that it runs after Strapi authentication. The decision (no drafts for any unauthenticated read) is unchanged. A backend test guards that every content router uses it. | c3bdb56, 345a016 (US-01-R1-F01); US-01-R2-F06 |
| 0001 | **Summary route registered by US-02 (US-02-Q-03, HC1 2026-11-21).** The route table row `/:country/resumen` keeps its address and its kind of guard; only *who builds it, and when* moves forward. US-02 registers `/:country/resumen` with **no component** (`children: []`, the same pattern ADR-0001 used for `/:country/planes` in US-01) and a `CanActivateFn` step 3 guard, defined in US-02 spec (US-02-AC-15): no valid step 1 for the route's country → `RedirectCommand` to `/<country>/datos`; no chosen plan, or a stored plan key that is not an offered plan of this page load → `RedirectCommand` to `/<country>/planes`; both with `replaceUrl: true`. US-03 attaches its page to that route without changing the address or the guard, and may extend the guard only through its own spec. No new decision: ADR-0001 fixed the addresses, the per-step guards, the `RedirectCommand`/`replaceUrl` mechanics and the "earlier story registers the route, later story attaches the page" pattern; it left the guard's content to a story spec. | US-02 spec v0.1 (US-02-Q-03, US-02-AC-15) |
| 0004 | The submit gate is Signal Forms validity, as decided: `submission.action` runs only for a valid form, and `onInvalid` focuses the first invalid field in `sortOrder` with `focusBoundControl()`. A native `number`/`date` input the browser cannot read gets a Signal Forms `parse` error, and its control model is deliberately left unwritten (writing `''` would erase the visible text). The store therefore follows the control: `syncNative` is the only writer of number and date keys (`''` on `validity.badInput`), and `flushModel()` writes the other types before `completeStep1` (keyboard Enter). 40606e2 had moved the gate to the store with `ignoreValidators: 'all'`, which broke the AC-24 keyboard submit (patched in e92e2c7) and let an emptied date through (US-01-R3-F01). The human chose to restore the Signal Forms gate in eeb23e6. | e92e2c7, eeb23e6 (US-01-R3-F01, R3-F05); US-01-R3-F02 |

## Backlog (decisions known to be needed)

Numbers are assigned when an ADR is written; this order is only provisional.

| Topic | Why it needs an ADR | Input |
|---|---|---|
| — | No pending ADR for US-01 or US-02 (ADR-0007: option A chosen at HC2; the orchestrator records acceptance) | — |

Covered since 2026-11-21: the simulated price rule of US-02 (ADR-0007, Proposed; US-02-Q-01) and
the summary route registered by US-02 (implementation note on ADR-0001 above; US-02-Q-03).

Covered since 2026-11-20: the multi-country content strategy (ADR-0001, which also folds in the
wizard routing and step guards candidate from US-01 spec §10), the Strapi access and security
model (ADR-0002), the front-end persistence of the wizard state (ADR-0003), and the forms library
(ADR-0004, informed by [SPIKE-01](../docs/spikes/SPIKE-01-forms.md)).
