---
status: Accepted
date: 2026-11-20
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-20), architect subagent (proposal)
consulted: specs/US-01/spec.md v0.2 (Approved), specs/US-02/story.md, specs/US-03/story.md, strapi-content-modeling skill, published packages @strapi/core, @strapi/i18n, @strapi/utils 5.63.0 and @angular/router 22.3.0
informed: all agents via CLAUDE.md precedence
---

# ADR-0001: Multi-country content strategy and country context

## Context and Problem Statement

One Angular build serves Colombia and Chile, and every piece of content the wizard shows (form
fields in US-01, plans in US-02, terms and conditions in US-03) differs by country and is edited
by a non-technical business team in Strapi. We must decide (1) how Strapi models which country an
item belongs to and where country-level metadata (currency, number locale) lives, and (2) how the
Angular app knows which country it is running for, including the root address, unknown
countries, switching country (US-01-Q-01, US-01-Q-02) and, folded into this ADR, the wizard step
addresses and the step 2 guard (spec §10 candidate, US-01-Q-19, US-01-Q-27).

## Decision Drivers

- D1. "The same application and the same build serve Colombia and Chile." (source: Assessment; US-01-BR-07)
- D2. "Content differentiation strategy by country, proposed by you and documented in an ADR" (source: Assessment, multi-country)
- D3. "Content differentiated by country without duplicating the app; form and plans 100% configurable from Strapi" (source: Assessment, evaluation); "The business team, which is not technical, must be able to change the form fields and the offered plans from Strapi without requesting a deployment." (source: Assessment, business context)
- D4. "Each country has its own regulations, identity documents, currency, coverages and copy" (source: Assessment, business context). Currency and number format need a per-country home (US-02 story: "The price is shown in the country's currency and format").
- D5. Per-item draft & publish: a single field can be a draft while the rest is published (US-01-AC-13, US-01-Q-24); plans need "published and active" per item (US-02 story).
- D6. The country context must be deep-linkable and testable; root chooser and "Este país no está disponible." (US-01-Q-01 human answer, US-01-AC-17); data never crosses countries (US-01-BR-07, US-01-AC-22).
- D7. Field `key` unique per country (US-01-BR-01, spec §7.1); one request per country configuration (spec §9, performance).
- D8. Step 2 route exists with the AC-19 guard and no page of its own; browser back works per step (US-01-Q-27, US-01-Q-20, US-01-AC-19, US-01-AC-20).
- D9. Public permissions minimal (source: Assessment, security). The model must not force broad read permissions.

## Considered Options

Strapi model (the four options from the `strapi-content-modeling` skill):

1. **A. `country` collection type + `manyToOne` relation** on every per-country type.
2. **B. i18n locales as countries** (`es-CO`, `es-CL`).
3. **C. Enumeration attribute `country`** (`CO`, `CL`) on every per-country type.
4. **D. One document per country** (a `country-config` holding fields and plans as components or dynamic zones).

Country resolution in Angular:

- **R1. Path segment** `/co/…`, `/cl/…`, chooser at `/`.
- **R2. Host name** (`co.example.test`, `cl.example.test`).
- **R3. Query parameter** (`?pais=co`).
- **R4. In-app selector** with the choice kept in storage, no country in the URL.

## Decision Outcome

Chosen option: **"A. `country` collection type + relation" with "R1. Path segment"**, because A
is the only model that gives every item its own draft/publish lifecycle (D5) *and* a typed home for
country metadata (D4) without a schema change per country (D3), and R1 makes the country context
explicit, deep-linkable and testable with one build (D1, D6) without DNS or hosts-file setup.

### What is decided

**Strapi model**

- A `country` collection type (API ID `country`, draft & publish on) with: `code` (string,
  required, unique, ISO 3166-1 alpha-2 in upper case, `^[A-Z]{2}$`), `name` (Spanish, shown in the
  chooser: "Colombia", "Chile"), `currencyCode` (ISO 4217: `COP`, `CLP`), `locale` (BCP 47 tag used
  for number and currency formatting: `es-CO`, `es-CL`) and `sortOrder` (integer). Later stories
  may add country-level attributes (for example a document masking rule for US-03) through their
  own spec; this ADR fixes only where they live.
- Every per-country content type (`form-field` in US-01; `plan` in US-02; `terms` in US-03) has a
  **required `manyToOne` relation `country`** to `country`. Draft & publish is on for all of them.
- `config/api.ts` sets `documents.strictRelations: true`, so Strapi rejects publishing an item
  whose required `country` relation is empty. Verified in `@strapi/core@5.63.0`
  (`services/document-service/entries.js`, `services/entity-validator/index.js`): required
  relations are enforced only when this flag is `true`, and never for drafts.
- `key` uniqueness **per country** is enforced server-side by a Document Service middleware
  (`strapi.documents.use`, present in `@strapi/core@5.63.0`) or a lifecycle check on
  create/update/publish of `form-field`. Strapi's `unique` is not scoped by relation, so it cannot
  be used for this.
- The front end reads a country's fields in one request:
  `GET /api/form-fields?filters[country][code][$eq]=CO&populate[…]&sort=sortOrder:asc&pagination[pageSize]=100`
  (exact `populate` per the US-01 content type). Filtering through the relation needs `find` on
  `country` for the reader (verified: `@strapi/utils@5.63.0`
  `validate/visitors/throw-restricted-relations.js` checks `<target>.find` for relations used in
  filters). That permission is needed anyway for the chooser and is justified in ADR-0002.

**Country context in Angular**

- The **list of supported countries is content**: the published `country` entries, loaded once
  per full page load (`GET /api/countries?sort=sortOrder:asc`, narrow `fields[]`) into a
  `CountryStore`, validated at the boundary (`code` matches `^[A-Z]{2}$`, `name` non-empty,
  `currencyCode` matches `^[A-Z]{3}$`; invalid entries dropped with a `console.warn`). No country
  code, name or list exists in front-end code.
- The URL segment is the lower-case country code. Matching is case-insensitive; a non-canonical
  address (`/CO/datos`) redirects to the canonical lower-case one with `replaceUrl`.
- **Unknown or unpublished country** (`/ar/…`): the page shows the code-owned message "Este país
  no está disponible." and links to each loaded country (AC-17). No field configuration is
  requested. The address is kept as typed (no redirect), so the user sees what they asked for.
- **Root `/`**: country chooser listing the loaded countries as links ("Colombia", "Chile") to
  `/<code>/datos`. No detection from IP or browser locale.
- **Country list cannot be loaded** (Strapi down, timeout): the chooser and the unknown-country
  page show the same load error state as step 1 ("No pudimos cargar el formulario. Intenta de
  nuevo." is form-specific, so the copy for this state is set by the spec; see *Spec impact*) with
  "Reintentar". The app never claims a country is unavailable when it simply could not check.
- **Switching country (US-01-Q-02)**: there is no in-page selector. Switching means opening the
  other country's address (from the chooser or by typing it). Entering a supported country's
  context whose code differs from the country held in the wizard state discards the stored state
  (mechanics in ADR-0003). Visiting `/` or an unknown country does not discard anything.

**Wizard routes and step guards (folded in from the spec §10 candidate)**

| Address | Route content | Guard | Story |
|---|---|---|---|
| `/` | Country chooser page | — | US-01 |
| `/:country` | Parent route of the wizard; `canMatch: [supportedCountryGuard]` | country must be in `CountryStore` | US-01 |
| `/:country` (empty child) | `redirectTo: 'datos'` | — | US-01 |
| `/:country/datos` | Step 1 page (`QuoteFormPage`) | — | US-01 |
| `/:country/planes` | **No component** in US-01: `children: []` | `canActivate: [wizardStepGuard]` | US-01 registers it; US-02 attaches its page without changing address or guard (US-01-Q-27) |
| `/:country/resumen` | Step 3 page | guard for step 3 (defined by US-03) | US-03 |
| `/:country/**` | `redirectTo: 'datos'` | — | US-01 |
| `**` (no supported country matched) | Unknown-country page | — | US-01 |

- Step slugs are Spanish because they are user-visible (same status as the wizard chrome copy in
  US-01-Q-14); identifiers in code stay English.
- A route with `children: []` and no component is valid in `@angular/router@22.3.0`
  (`_router-chunk.mjs`, route validation error 4014 requires one of `component`,
  `loadComponent`, `redirectTo`, `children` or `loadChildren`). `redirectTo` cannot be combined
  with `canActivate`/`canMatch` on the same route (same file), which is why the redirects are
  separate child routes.
- `wizardStepGuard` is a `CanActivateFn` (`@angular/router@22.3.0`: `type CanActivateFn = (route,
  state) => MaybeAsync<GuardResult>`, `GuardResult = boolean | UrlTree | RedirectCommand`). It
  allows step 2 only if the wizard state holds step 1 values **for the route's country** that pass
  the same pure validators against the field configuration loaded in this page load. Otherwise it
  returns `new RedirectCommand(router.parseUrl('/<country>/datos'), { replaceUrl: true })`, so the
  blocked address does not stay in the history (AC-19). If the configuration cannot be loaded, it
  redirects to step 1, which shows the load error state.
- Each step is its own history entry: "Continuar" navigates normally (no `replaceUrl`), so the
  browser back action returns to step 1 (US-01-Q-20, AC-20).
- Focus on step change: the arriving step's heading receives focus (step 1 in US-01; step 2 and 3
  in their stories, spec §8).
- Field configuration and countries are fetched once per full page load and kept in memory for
  that page load only (US-01-Q-16); nothing about content is stored across reloads (ADR-0003).

### Consequences

- Good, because every field, plan and term has its own draft/publish state, ordering and audit
  history in the Strapi admin (D5), and the seed's draft-only `email` field (AC-13) is expressible.
- Good, because currency and number locale have one typed home that US-02 and US-03 reuse (D4).
- Good, because adding a third country is content work (a `country` entry plus its fields, plans
  and terms) with no schema change and no front-end change (D3), unless that country needs new
  code-backed rules.
- Good, because the URL carries the country: deep links, bookmarks, e2e tests and the AC-19 guard
  all work from the address alone (D6, D8).
- Bad, because editors must pick the country on every item; an item saved without one is invalid
  — mitigation: required relation + `strictRelations: true` blocks publishing it, and the
  frontend only queries filtered by country, so an orphan is never shown.
- Bad, because `key` uniqueness per country needs custom server code (Strapi `unique` is global) —
  mitigation: one Document Service middleware with a unit or integration test; the front end also
  drops duplicates at the boundary (AC-14).
- Bad, because there is no editor tool to copy the CO form to CL (i18n would offer "fill from
  another locale") — mitigation: acceptable for two countries; the seed creates both.
- Bad, because the chooser and the unknown-country page now depend on Strapi being reachable —
  mitigation: they show a load error with "Reintentar" instead of a wrong "not available".
- Bad, because the public role needs `find` on `country` in addition to `form-field` — mitigation:
  `country` holds only public, non-sensitive metadata; justified in ADR-0002.
- Neutral: the step 2 address exists in US-01 with an empty content area until US-02 (accepted at
  HC1, US-01-Q-27).

### Strongest argument against

Option B (i18n locales `es-CO` / `es-CL`) gives per-country `key` uniqueness for free: Strapi
scopes its `unique` check by locale (verified in `@strapi/core@5.63.0`), and the admin lets
editors fill one country's content from another's. Option A gives up both: uniqueness per country
needs custom server code that we must write, test and keep working across Strapi upgrades, and
editors have no tool to copy the CO form to CL. Making the country list content also means the
country chooser and the unknown-country page depend on Strapi being reachable, where a hard-coded
list would not.

**Why we accept it:** option B copies non-localised attributes to every locale on save (verified
in `@strapi/i18n@5.63.0`), so one wrong checkbox on a price silently overwrites the other
country's value; it mixes language with market and still needs a second mechanism for country
metadata (D3, D4). The uniqueness middleware is one small, tested piece, the front end also drops
duplicates (AC-14), copying is a minor cost with two countries, and the Strapi dependency is
surfaced as a load error with "Reintentar", never as a wrong "not available".

### Confirmation

- E2E `us-01-country-context.spec.ts`: CL fields only in `/cl/datos` (AC-01), `/ar/datos` shows
  the message and both links and makes no `form-fields` request (AC-17), no data across countries
  (AC-22).
- Unit tests: `supported-country-guard.spec.ts` (code matching, case normalisation, unknown code,
  list not loaded) and `wizard-step-guard.spec.ts` (AC-19: no or invalid data → `RedirectCommand`
  to `/<country>/datos` with `replaceUrl`; valid data → `true`; data of another country → redirect).
- Review checklist: no country code, country name or field list literal in `frontend/src`
  (`grep -rnE "'(CO|CL)'" frontend/src` returns only tests and fixtures); every per-country content
  type has a required `country` relation; `config/api.ts` has `strictRelations: true`.
- Seed check: restarting Strapi does not duplicate countries (natural key `code`).

## Pros and Cons of the Options

### A. `country` collection type + relation

- Good, because per-item draft & publish, ordering and filtering (`filters[country][code][$eq]`).
- Good, because country metadata (currency, locale) is a typed, editable entry.
- Good, because "market" and "language" stay separate concepts.
- Bad, because the relation must be set on each item and enforced (`strictRelations`).
- Bad, because per-country uniqueness of `key` needs custom code.

### B. i18n locales as countries (`es-CO`, `es-CL`)

Both locales exist in Strapi's ISO list (`@strapi/i18n@5.63.0`, `constants/iso-locales.json.js`).

- Good, because Strapi scopes `unique` by locale (verified in `@strapi/core@5.63.0`
  `services/entity-validator/validators.js`: the unique query adds `locale`), so `key` is unique
  per country with no custom code.
- Good, because the admin can fill one locale from another (copy CO to CL).
- Bad, because non-localised attributes are **copied to every locale** on save (verified:
  `@strapi/i18n@5.63.0` `services/localizations.js` `syncNonLocalizedAttributes`, called from
  `bootstrap.js`). One wrong "localised" checkbox on `basePrice` and a CO edit overwrites the CL
  price.
- Bad, because it mixes language with market: a country with two languages, or English copy for
  a market, collides with the one-locale-per-country mapping.
- Bad, because there is no natural home for country metadata (currency) other than a separate
  localised single type, so a second mechanism is needed anyway.

### C. Enumeration attribute `country`

- Good, because it is the simplest schema and filter (`filters[country][$eq]=CO`).
- Bad, because adding a country is a schema change, that is, code and a deployment (against D3).
- Bad, because there is no place for currency or locale; they would end up in front-end code,
  which BR-07 forbids.

### D. One document per country (`country-config` with components)

- Good, because one request returns everything for a country.
- Bad, because draft & publish applies to the whole document: one field cannot stay a draft while
  the others are published (breaks AC-13 and the "published and active" plan rule of US-02
  without an extra flag).
- Bad, because reordering, auditing and editing a single field means editing a large document;
  error-prone for non-technical editors.

### R1. Path segment (chosen)

- Good, because deep links, bookmarks and tests address a country directly; works on `localhost`.
- Good, because the guard and the unknown-country state derive from the URL only.
- Bad, because a user can type another country's address; mitigated by Q-02 (switching discards
  the other country's data).

### R2. Host name

- Good, because it looks natural for country sites.
- Bad, because local `docker compose up` would need hosts-file or wildcard DNS setup, against the
  single-command start (Assessment, environment).

### R3. Query parameter

- Good, because it needs no routing change.
- Bad, because it must be propagated on every navigation and is easily lost; it is a weaker key
  for guards and tests.

### R4. In-app selector stored in the browser

- Good, because URLs stay short.
- Bad, because the country is invisible and not linkable; e2e tests must drive the selector; a
  stored choice silently decides which content a user sees.

## Spec impact (reported to the orchestrator; the spec is not edited here)

1. Spec §7.3 types `country` as `'CO' | 'CL'`. With a content-driven country list it becomes an
   ISO alpha-2 code validated against the loaded countries.
2. Spec §8 has no state for "country list could not be loaded" on the chooser and the
   unknown-country page; its copy needs to be chosen (US-01-Q-14 owns chrome copy).
3. AC-17's links come from Strapi; they are absent while the load error is shown.

## More Information

- Verified sources (all on 2026-11-20, packages fetched with `npm pack` into a temporary directory):
  `@strapi/core@5.63.0`, `@strapi/i18n@5.63.0`, `@strapi/utils@5.63.0`, `@angular/router@22.3.0`
  (files cited inline).
- Related ADRs: ADR-0002 (who may read `country` and `form-field`, and how), ADR-0003 (wizard state
  scope per country and clearing on switch), ADR-0004 (forms library, reserved).
- Revisit when: a country needs more than one language, a country needs code-backed rules that
  content cannot express, or the business needs to copy whole forms between countries often.
