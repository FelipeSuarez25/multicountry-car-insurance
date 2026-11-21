---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: reviews/US-01-review-R1.md (findings US-01-R1-F04 and US-01-R1-F05), commit 241340a, specs/US-01/spec.md §7.1 and §7.3, installed packages @strapi/utils, @strapi/core, @strapi/content-type-builder, @strapi/database 5.63.0 (backend/node_modules, versions checked in each package.json)
informed: all agents via CLAUDE.md precedence; spec-writer (spec v0.4 wire shapes use the attribute names below)
---

# ADR-0006: Strapi physical model adjustments: typed validation-rule parameters and the country `localeTag` attribute (amends ADR-0001)

## Context and Problem Statement

ADR-0001 (Accepted) fixes the Strapi model for US-01. Code review round 1 found two places where
the implementation departs from it, or from spec §7.1, without a recorded decision:

1. **Rule parameters (US-01-R1-F04).** `form.validation-rule` stores the parameter of
   `minLength`, `maxLength`, `min`, `max` and `pattern` in a free `json` attribute `value`
   (`backend/src/components/form/validation-rule.json`). Spec §7.1 says the rule kinds are
   "structured, not free JSON". Editors must type JSON (a regex needs quotes and doubled
   backslashes), and a value of the wrong type saves without error and then makes the front-end
   boundary parser drop the **whole field** (`frontend/src/app/shared/field-config.ts`), so a
   required reserved field such as `plate` can silently disappear from the form.
2. **Country locale (US-01-R1-F05).** ADR-0001 names the BCP 47 attribute of `country` `locale`.
   `locale` is a reserved attribute name in Strapi 5 (verified below), so commit 241340a stores
   it as `localeTag` and adds a custom `find` controller
   (`backend/src/api/country/controllers/country.ts`) that renames it back to `locale`, but only
   for `fields`. `sort=locale:asc` and `filters[locale][$eq]=es-CO` return
   `400 Invalid key locale` (reproduced by the reviewer). US-02 will consume this attribute for
   currency and number formatting.

The human (Felipe Sabogal, 2026-11-21) decided the direction of both points after the review.
This ADR records the options and the decision. It amends **only** these two points of
ADR-0001's "What is decided → Strapi model"; everything else in ADR-0001 stays as written.
Story: US-01 (`specs/US-01/spec.md` §7.1, §7.3).

## Decision Drivers

- D1. "The business team, which is not technical, must be able to change the form fields and the offered plans from Strapi without requesting a deployment." (source: Assessment, business context; US-01-BR-06). An editor must be able to enter a rule parameter without knowing JSON syntax or escaping.
- D2. Rule kinds are "structured, not free JSON" (source: spec §7.1); "Editors must not be able to save something the frontend cannot parse" (source: `strapi-content-modeling` skill, modeling conventions).
- D3. A malformed configuration is not rendered and the app keeps working (source: US-01-Q-18, US-01-AC-14). The boundary parser stays the last line of defence, whatever the schema.
- D4. Keep bespoke backend code to a minimum: each custom controller or middleware must be reviewed and re-verified on every Strapi upgrade (source: human decision, Felipe Sabogal, 2026-11-21, the same reasoning recorded as D3 in ADR-0005).
- D5. The country attribute that carries the number locale must be fully usable through the stock content API: `fields`, `sort` and `filters` (source: US-01-R1-F05; US-02 story, "The price is shown in the country's currency and format").
- D6. Decisions are recorded and accepted ADRs are not rewritten (source: CLAUDE.md §1; `adr-madr` skill lifecycle).

## Considered Options

Point 1, rule parameters (`form.validation-rule`):

1. **1a. Typed attributes per parameter** on the one component: numeric `value`, string
   `pattern`, integers `years`, `maxYearsOld`, `maxYearsAhead`; unused ones are null.
2. **1b. Keep the `json` `value`** and add server-side validation on save (a Document Service
   middleware or lifecycle that rejects a value of the wrong type for the rule `kind`).
3. **1c. A `string` `value`** that editors type as plain text, coerced to a number by the
   front-end parser for numeric kinds.
4. **1d. One component per rule kind in a dynamic zone** (`rules` becomes a `dynamiczone` on
   `form-field` with components such as `rule.min-length`, `rule.pattern`, `rule.min-age`,
   `rule.year-range`, `rule.rut-check-digit`, each with only its own, required, parameters).

Point 2, country locale attribute:

1. **2a. Expose `localeTag` as is**: the stored attribute and the API field are both
   `localeTag`; the front-end boundary parser maps it to its internal `locale`. The custom
   `find` controller is removed.
2. **2b. Keep the renaming controller and complete it**: also translate `sort` and `filters`
   (and any nested form of them) from `locale` to `localeTag`.
3. **2c. Another attribute name** chosen for readability (for example `numberLocale` or
   `formatLocale`), exposed as is.

## Decision Outcome

Chosen options: **"1a. Typed attributes per parameter"** and **"2a. Expose `localeTag` as is"**.

1a, because each parameter gets a Strapi type the admin enforces on save (a number field cannot
hold `"tres"`, a regex is typed as plain text with no escaping), which meets D1 and D2 with a
one-file schema change and no custom backend code (D4), while keeping one repeatable component
and the current `rules` shape that the front end, seed and tests already use. 2a, because it uses
the stock controller, so `fields`, `sort` and `filters` all work (D5), and it removes custom code
instead of extending it (D4).

### What is decided (amendment to ADR-0001, "What is decided → Strapi model")

**`form.validation-rule` component** (`backend/src/components/form/validation-rule.json`):

| Attribute | Strapi type | Used by kind | Notes |
|---|---|---|---|
| `kind` | `enumeration` (unchanged) | all | Required. `minLength`, `maxLength`, `min`, `max`, `pattern`, `minAge`, `yearRange`, `rutCheckDigit`. |
| `value` | `decimal` (replaces `json`) | `minLength`, `maxLength`, `min`, `max` | Numeric. Integer ≥ 0 for `minLength`/`maxLength` (checked at the boundary). |
| `pattern` | `string` (new) | `pattern` | ECMAScript regex source, no flags, typed as plain text. |
| `years` | `integer`, `min: 1` (unchanged) | `minAge` | |
| `maxYearsOld` | `integer`, `min: 0` (unchanged) | `yearRange` | |
| `maxYearsAhead` | `integer`, `min: 0` (unchanged) | `yearRange` | |
| `message` | `string` (unchanged) | all | Optional rule-specific message. |

- Parameters a kind does not use are left empty and arrive as `null`. Strapi cannot make an
  attribute required depending on `kind`, so the front-end boundary parser still checks that the
  kind's own parameter is present and in range. The rule semantics of spec §7.1 do not change;
  only where the `pattern` parameter lives changes (`pattern` instead of `value`). The exact
  wire shape, and how a non-null unused parameter is treated, are fixed in spec v0.4.
- The seed (`backend/src/seed/form-fields.ts`), the annex `specs/US-01/seed-fields.md`, the
  front-end parser and its fixtures, and the AC-03 e2e payload move the regex from `value` to
  `pattern`.
- `decimal` was chosen over `float` because both are read back as a JavaScript number
  (`@strapi/database@5.63.0` `dist/fields/index.js:26-27` maps `float` and `decimal` to
  `NumberField`, whose `fromDB` returns `_.toNumber(value)`; `dist/query/helpers/transform.js:21`
  keeps `null` as `null`), and `decimal` stores values such as `0.1` exactly in the database.

**`country` content type** (`backend/src/api/country/content-types/country/schema.json`):

- The BCP 47 attribute is named **`localeTag`** (string, required), in storage and on the wire.
  ADR-0001's `locale` is replaced by `localeTag` everywhere it refers to the Strapi attribute
  (the model list, and the "narrow `fields[]`" request of the chooser, which asks for
  `localeTag`).
- `backend/src/api/country/controllers/country.ts` goes back to
  `factories.createCoreController('api::country.country')`.
- The front-end boundary parser (`frontend/src/app/shared/country.ts`) reads `localeTag` from the
  response and maps it to the internal `Country.locale` (or another internal name the spec
  chooses). Validation of the value is unchanged.
- ADR-0002's public role table still holds: `api::country.country.find` exposes "country code,
  name, currency, locale", and the locale is now carried by `localeTag`.

### Consequences

- Good, because an editor types `3` into a number field and `^[A-Za-z]{3}[0-9]{3}$` into a text
  field; Strapi refuses a non-number in `value` on save (`@strapi/core@5.63.0`
  `dist/services/entity-validator/validators.js:329-364`: `decimal` uses `floatValidator`,
  `yup.number()` with a finite-number test), so the wrong-type case of F04 can no longer reach
  the front end (D1, D2).
- Good, because both points end with **less** custom backend code: the country controller is
  deleted and no validation middleware is added (D4).
- Good, because `localeTag` works with every stock query parameter (`fields`, `sort`, `filters`),
  so US-02 can filter or sort on it without new backend work (D5).
- Bad, because a rule can still be saved without the parameter its kind needs (for example
  `minLength` with an empty `value`, or `pattern` with an invalid regex), and the boundary
  parser then drops the field — mitigation: the component's admin description lists which
  attribute each kind uses (as today), the parser logs a warning without user data (US-01-Q-18),
  and spec v0.4 keeps the malformed-rule cases in AC-14. 1d would remove the missing-parameter
  case; see *Strongest argument against*.
- Bad, because the component has fields that are meaningless for most kinds, and the admin shows
  all of them for every rule — mitigation: per-attribute descriptions; acceptable with eight
  kinds.
- Bad, because the wire name `localeTag` differs from the conceptual name in ADR-0001 and the
  US-02 story ("locale") — mitigation: the rename is confined to the boundary parser; this ADR
  and spec v0.4 record it.
- Bad, because existing development databases hold rule rows with the old `json` `value` and
  country rows that are already correct; the idempotent seed only creates missing items, so it
  will not rewrite old rule rows — mitigation: development data is disposable; reset the Strapi
  volume (or delete the seeded fields) after the schema change, and state this in the commit.
- Neutral: the public and e2e permissions of ADR-0002 and ADR-0005 do not change.

### Strongest argument against

**Against 1a (typed attributes):** option 1d makes invalid rules impossible to save, not merely
less likely. With one component per kind in a dynamic zone, each component carries only its own
parameters, marked `required`, so the admin will not save a `minLength` rule without a length, and
editors never see `years` next to a regex. Option 1a keeps a "pick a kind, then guess which of
five fields to fill" form, in which a missing parameter still saves and still makes the field
vanish from step 1, the exact failure mode F04 complained about, only narrower.

**Why we accept it:** 1d is viable in Strapi 5.63.0 only on the content type (the content-type
builder allows `dynamiczone` for content types but not inside components:
`@strapi/content-type-builder@5.63.0` `dist/server/controllers/validation/content-type.js:35-41`
vs `component.js:18-22`), so it replaces `rules` with a polymorphic list of eight components. Every
response item gains a `__component` discriminator, the populate needs the fragment syntax
(`populate[rules][on][...]`, validated in `@strapi/utils@5.63.0` `dist/validate/validators.js:621`),
the boundary parser, seed, fixtures and AC-03 payload change shape, and a new rule kind becomes a
new component rather than a new enum value. That is a large change to code that passed every
other review item, made in a fix round. 1a removes the reported wrong-type and escaping problems
with one schema edit, and the remaining missing-parameter case is caught at the boundary (D3).
If editors produce malformed rules in practice, 1d is the upgrade path (see *Revisit when*).

**Against 2a (expose `localeTag`):** option 2b keeps the contract ADR-0001 and the US-02 story
were written against: the API says `locale`, the domain says `locale`, and nobody downstream
needs to know about a Strapi naming restriction. 2a leaks a storage workaround into the public
wire contract for good, and any later consumer (another front end, an export) has to learn the
mapping too.

**Why we accept it:** making 2b complete means rewriting `locale` inside `sort` (string, array
and object forms) and inside arbitrarily nested `filters` (`$and`, `$or`, `$not`), on every
route that can reach `country` (including `filters[country][locale]` on `form-field`), and
keeping that in step with Strapi's query parser on each upgrade. It is also shadowed by Strapi's
own `locale` query parameter (`@strapi/utils@5.63.0` `dist/content-api-constants.js:14`). That is
exactly the bespoke code D4 asks us to avoid, for a cosmetic gain. The mapping in the front end is
one line in a parser that already exists.

### Confirmation

- Schema check (review checklist): `validation-rule.json` has no `json` attribute; `value` is
  `decimal`, `pattern` is `string`. `country/schema.json` has `localeTag` and no `locale`.
  `backend/src/api/country/controllers/country.ts` is the plain `createCoreController`.
- Runtime check (strapi-developer, recorded in the review response):
  `GET /api/countries?fields[0]=code&fields[1]=localeTag&sort=localeTag:asc&filters[localeTag][$eq]=es-CO`
  returns `200` with `localeTag: "es-CO"` and only CO.
- Unit tests: `country.spec.ts` (parser reads `localeTag`, drops an entry without it);
  `field-config.spec.ts` (a `pattern` rule reads `pattern`; a numeric rule reads a number
  `value`; a rule missing its kind's parameter makes the field malformed, per spec v0.4 AC-14).
- `grep -rn "'locale'" frontend/src/app/core` finds no `fields[...]=locale` request.

## Pros and Cons of the Options

### 1a. Typed attributes per parameter (chosen)

- Good, because the admin type-checks each parameter on save, and a regex is plain text.
- Good, because the change is one component file; the `rules` shape (repeatable component with
  `kind`) stays.
- Good, because no backend code is added (D4).
- Bad, because a missing parameter still saves; the boundary parser must catch it.
- Bad, because every rule shows all parameter inputs in the admin.

### 1b. Keep `json` and validate on save

- Good, because the schema does not change, and invalid values are rejected on save with an
  error the editor sees.
- Good, because the check could also cover a missing parameter and an invalid regex.
- Bad, because editors still type JSON, with quotes and doubled backslashes in a regex (against
  D1); the core complaint of F04 stays.
- Bad, because it adds a custom Document Service middleware or lifecycle on the write path, to
  test and re-verify on each upgrade (against D4).

### 1c. `string` `value` coerced by the front end

- Good, because a regex is plain text and the schema change is minimal.
- Bad, because a number is also free text: `"tres"` or `"3,5"` still saves and the field still
  disappears, so the wrong-type case of F04 is not solved (against D2).
- Bad, because the coercion rules (comma vs dot, spaces, `"03"`) become front-end logic that
  editors cannot see.

### 1d. One component per rule kind in a dynamic zone

Viable in 5.63.0 on the `form-field` content type only: the content-type builder lists
`dynamiczone` in the valid types for content types
(`@strapi/content-type-builder@5.63.0` `dist/server/controllers/validation/content-type.js:35-41`)
and not for components (`component.js:18-22`). Dynamic-zone entries carry `__component`
(`@strapi/utils@5.63.0` `dist/content-types.js`, `DYNAMIC_ZONE_KEYS`).

- Good, because each kind has only its own, required, typed parameters: a rule without its
  parameter cannot be saved.
- Good, because the admin shows a clear "add a rule of type X" picker.
- Bad, because `rules` changes from a repeatable component to a polymorphic list: new populate
  syntax, a `__component` discriminator in the parser, and a new seed and fixture shape.
- Bad, because adding a rule kind means a new component (schema plus code), not an enum value.
- Bad, because it is the largest change of the four, in a review-fix round.

### 2a. Expose `localeTag` (chosen)

- Good, because the stock controller handles `fields`, `sort` and `filters` (D5).
- Good, because it deletes the custom controller (D4).
- Bad, because the wire name differs from the domain name; the parser maps it.

### 2b. Keep and complete the renaming controller

- Good, because the API keeps the name `locale` from ADR-0001 and the US-02 story.
- Bad, because a complete rename covers `sort` and nested `filters` on every route that reaches
  `country`, and must track Strapi's query parsing (against D4).
- Bad, because `locale` is also Strapi's own query parameter, so the name stays ambiguous in the
  API.

### 2c. Another attribute name (for example `numberLocale`)

- Good, because the stock controller works, as in 2a, and the name may describe the purpose
  better.
- Bad, because the implementation, seed, fixtures and spec v0.4 already use `localeTag`; a
  different name is churn with no functional gain.
- Neutral: functionally equivalent to 2a.

## More Information

- **`locale` is reserved in Strapi 5.63.0** (verified in the installed packages, 5.63.0 per their
  `package.json`):
  - `@strapi/utils@5.63.0` `dist/content-types.js:51-76`, `RESERVED_ATTRIBUTE_NAMES` contains
    `'locale'` (line 69); `isReservedAttributeName` and `getReservedAttributeNames` use it, and
    the content-type builder refuses it (`@strapi/content-type-builder@5.63.0`
    `dist/server/services/builder.js:11`, `dist/server/controllers/validation/model-schema.js:73-85`,
    "Attribute keys cannot be one of …").
  - `@strapi/utils@5.63.0` `dist/content-api-constants.js:8-23`: `locale` is one of the shared
    content-API and Document Service query parameter keys.
  - `@strapi/core@5.63.0` `dist/services/document-service/repository.js:83-132` validates and
    normalises a `locale` parameter on every Document Service call, and
    `dist/utils/transform-content-types-to-models.js:365-372` treats a `locale` attribute as the
    i18n system column in the document index.
  - The 400 on `fields[]=locale`, `sort=locale` and `filters[locale]` with the attribute stored as
    `localeTag` comes from the field validator: `@strapi/utils@5.63.0`
    `dist/validate/validators.js:393-407` throws `Invalid key` for a key that is not a scalar
    attribute of the schema.
- Review evidence: `reviews/US-01-review-R1.md`, US-01-R1-F04 and US-01-R1-F05.
- Related ADRs: ADR-0001 (amended by this ADR, in the two points above only), ADR-0002 (public
  `country.find`, unchanged), ADR-0005 (same "less bespoke backend code" reasoning).
- Revisit when: editors save rules without their parameter more than occasionally (move to 1d), a
  rule kind needs more than one parameter of a new type, or a second consumer of the country API
  needs the name `locale` (then 2b, or an API version).
