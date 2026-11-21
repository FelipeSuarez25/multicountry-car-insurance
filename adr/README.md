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
| [0008](0008-simulated-payment.md) | Simulated payment: a visible outcome choice, a front-end gateway boundary, no card data | Accepted | 2026-11-21 | US-03 |
| [0009](0009-terms-rich-text-rendering.md) | Terms rich text: Strapi `blocks` rendered by a whitelist component through template bindings | Accepted | 2026-11-21 | US-03 |

### Implementation notes on accepted ADRs (no decision change)

Accepted ADRs are not rewritten. When the implementation of an accepted decision changes in a way
that leaves the decision intact, the note goes here.

| ADR | Note | Since |
|---|---|---|
| 0002 | The published-only rule (ADR-0002 calls it a "global middleware") is a **route middleware** on `find`/`findOne`, attached per router through `publishedOnlyConfig()`, so that it runs after Strapi authentication. The decision (no drafts for any unauthenticated read) is unchanged. A backend test guards that every content router uses it. | c3bdb56, 345a016 (US-01-R1-F01); US-01-R2-F06 |
| 0001 | **Summary route registered by US-02 (US-02-Q-03, HC1 2026-11-21).** The route table row `/:country/resumen` keeps its address and its kind of guard; only *who builds it, and when* moves forward. US-02 registers `/:country/resumen` with **no component** (`children: []`, the same pattern ADR-0001 used for `/:country/planes` in US-01) and a `CanActivateFn` step 3 guard, defined in US-02 spec (US-02-AC-15): no valid step 1 for the route's country → `RedirectCommand` to `/<country>/datos`; no chosen plan, or a stored plan key that is not an offered plan of this page load → `RedirectCommand` to `/<country>/planes`; both with `replaceUrl: true`. US-03 attaches its page to that route without changing the address or the guard, and may extend the guard only through its own spec. No new decision: ADR-0001 fixed the addresses, the per-step guards, the `RedirectCommand`/`replaceUrl` mechanics and the "earlier story registers the route, later story attaches the page" pattern; it left the guard's content to a story spec. | US-02 spec v0.1 (US-02-Q-03, US-02-AC-15) |
| 0002 | **Terms content-type name (US-03-Q-03, HC1 2026-11-21).** ADR-0002 names the US-03 permission `api::terms.terms.find`. Strapi 5.63.0 refuses a content type whose singular and plural names are equal (`@strapi/core@5.63.0` `dist/loaders/apis.js:44-62`, `validateContentTypesUnicity`: "The plural name … should be unique"), so the type is **`api::term.term`** (singularName `term`, pluralName `terms`, as in CLAUDE.md §6). Consequently: the public permission is **`api::term.term.find`** (no `findOne`), reconciled in bootstrap with the existing three; the router is `createCoreRouter('api::term.term', publishedOnlyConfig())` with a fresh config object (US-01-R2-F03), so `backend/tests/published-only-routes.test.ts` covers it; the REST path stays **`/api/terms`**, which must be added to the GET-only allow-list in `frontend/nginx/default.conf.template` (today `countries|form-fields|plans`). The decision (public `find` only, published-only reads, GET-only proxy, no write token in the browser) is unchanged. | US-03 spec v0.1 (US-03-Q-03, §7.4) |
| 0004 | The submit gate is Signal Forms validity, as decided: `submission.action` runs only for a valid form, and `onInvalid` focuses the first invalid field in `sortOrder` with `focusBoundControl()`. A native `number`/`date` input the browser cannot read gets a Signal Forms `parse` error, and its control model is deliberately left unwritten (writing `''` would erase the visible text). The store therefore follows the control: `syncNative` is the only writer of number and date keys (`''` on `validity.badInput`), and `flushModel()` writes the other types before `completeStep1` (keyboard Enter). 40606e2 had moved the gate to the store with `ignoreValidators: 'all'`, which broke the AC-24 keyboard submit (patched in e92e2c7) and let an emptied date through (US-01-R3-F01). The human chose to restore the Signal Forms gate in eeb23e6. | e92e2c7, eeb23e6 (US-01-R3-F01, R3-F05); US-01-R3-F02 |
| 0003 | **An empty wizard state is represented by no `quote-wizard` entry (US-03-R1-F02).** A state with no step 1 values and no chosen plan leaves no entry in `sessionStorage`. a3f186c added this to `QuoteStore.persist()` (`frontend/src/app/core/quote-store.ts:167-169`) as an early `return`, which only skips the write; when an entry already exists it stays, for example after `prune()` (`:88-98`) drops every stored key because none is configured any more, so the values of removed fields remained in the tab. The fix for US-03-R1-F02 makes `persist()` **remove** any existing entry (`clearStorage()`, `:177-183`) for an empty state and then return, so the invariant "empty state ⇒ no entry" holds in every case, and ADR-0003's "the pruned state is written back" is met by removal when the pruned state is empty. Consequences: entering a country with an empty step 1 (`enterCountry`, `:42-51`) no longer writes `{country, step1: {values: {}}}`, a change to US-01 behaviour; nothing is lost, because the country is always known from the `/:country` route, which calls `enterCountry` on each entry (ADR-0001), and the entry is written on the first value or plan choice. After a successful payment, `clearQuote()` (`:58-64`) removes the entry, and a reload, a back action or "Nueva cotización" re-enters the country with an empty state, so no entry is found (US-03-AC-11). The decision of ADR-0003 (one versioned `sessionStorage` entry per tab, scoped to one country, cleared on country change and on successful payment) is unchanged. | a3f186c; fix for US-03-R1-F02 (in progress) |

## Backlog (decisions known to be needed)

Numbers are assigned when an ADR is written; this order is only provisional.

| Topic | Why it needs an ADR | Input |
|---|---|---|
| — | No pending ADR for US-01, US-02 or US-03 | — |

Covered since 2026-11-21 for US-03 (both Accepted at HC2 by the human, 2026-11-21): the simulated
payment (ADR-0008; US-03-Q-01) and the terms rich-text format and rendering (ADR-0009;
US-03-Q-02). The terms content-type name (US-03-Q-03) is an implementation note on ADR-0002 above.

Covered since 2026-11-21: the simulated price rule of US-02 (ADR-0007, Accepted: option A; US-02-Q-01) and
the summary route registered by US-02 (implementation note on ADR-0001 above; US-02-Q-03).

Covered since 2026-11-20: the multi-country content strategy (ADR-0001, which also folds in the
wizard routing and step guards candidate from US-01 spec §10), the Strapi access and security
model (ADR-0002), the front-end persistence of the wizard state (ADR-0003), and the forms library
(ADR-0004, informed by [SPIKE-01](../docs/spikes/SPIKE-01-forms.md)).
