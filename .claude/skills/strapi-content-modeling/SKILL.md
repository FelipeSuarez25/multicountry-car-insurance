---
name: strapi-content-modeling
description: Strapi 5 conventions for this project - content types, components, draft & publish, country differentiation, idempotent seed for CO/CL, public role permissions and REST querying. Use when creating or changing anything under backend/, writing the seed, or deciding what the frontend may query.
---

# Strapi 5 content modeling

Verified against `@strapi/strapi` / `@strapi/types` **5.63.0** (npm `latest` on 2026-11-20).
Re-verify any API you use against the installed version. **Never write Strapi 4 syntax**
(`entityService`, `data.attributes`, numeric `id` as the public identifier).

## Non-negotiable rules

1. **Country strategy comes from ADR-0001** (multi-country content strategy). This skill
   describes the options and mechanics; it does not choose. If ADR-0001 is not `Accepted`, stop.
2. **Business users change content without deploys.** Anything a non-technical user must
   change (fields, options, validations, copy, plans, terms) is content, not code or schema.
3. **Schema changes are code** (`src/api/**/content-types/**/schema.json`, components). They go
   through the normal flow (spec → review → PR).
4. **Draft & publish on** for every type the business edits. The frontend only sees published content.
5. **No write tokens reach the browser.** The frontend reads either through the public role
   (`find`/`findOne` only, justified per type in the security ADR) or through a read-only
   token held server-side. It never uses a full-access token.
6. **Seed data is in Spanish, fictitious, and covers both CO and CL.**

## Strapi 5 facts to rely on

- Documents are identified by `documentId` (string). Use it in references, never the numeric `id`.
- REST responses are **flattened**: `data[i].label`, not `data[i].attributes.label`.
- The REST API returns **published** versions by default (`status=published`). Use `status=draft`
  only in admin or internal tooling, never from the frontend.
- Server-side, use the **Document Service API**: `strapi.documents('api::plan.plan')`, with
  `findMany`, `findFirst`, `create`, `update`, `delete`, `publish`, `unpublish` and `discardDraft`.
  `create` accepts `status: 'published'` to create and publish in one call.
- Relations and components are **not populated by default**. Populate explicitly and narrowly:
  `populate[options]=true`, or the object syntax for nested data.
- Filters: `filters[country][code][$eq]=CO`. Sort: `sort=sortOrder:asc`. Pagination:
  `pagination[pageSize]=100`. Keep the page size explicit; the default is 25.
- Build query strings with `qs` (or an equivalent typed helper). Do not hand-concatenate them.

## Country differentiation: options to weigh in ADR-0001

| Option | Mechanism | Watch out for |
|---|---|---|
| A. `country` collection type + relation | `country` (code `CO`/`CL`, name, currency, locale, document types…) and a `manyToOne` relation on `form-field`, `plan`, `terms` | Editors must set the relation every time; it filters cleanly with `filters[country][code]` |
| B. i18n locales as countries | Locales such as `es-CO` and `es-CL`, with the content localised per locale | Mixes *language* with *market*; non-localised fields are shared across locales (risky for prices); a third country in English would collide |
| C. Enumeration field `country` | `enumeration: ['CO','CL']` on each type | Adding a country needs a schema change (a deploy); there is no place for per-country metadata (currency, locale) |
| D. Single type per country / dynamic zones per country | One `country-config` document holding the fields and plans as components | Huge documents; harder to reorder, publish or audit individual fields; no per-item draft/publish |

Country-level metadata (currency code, number locale, document types, legal age, masking rule)
needs a home, wherever the per-item data lives.

## Modeling conventions

- API IDs are singular kebab-case (`form-field`, `plan`, `country`, `terms`). Attributes are
  `camelCase`. Components are `category.kebab-name` (`form.select-option`, `form.validation-rule`,
  `plan.coverage`).
- Ordering uses an explicit integer `sortOrder` attribute, never creation date.
- Booleans are named as states: `isRequired`, `isRecommended`, `isActive`.
- Business-facing enumerations (field `type`: `text | number | select | date | checkbox`) are
  enumerations in the schema, so editors cannot type invalid values.
- The validation config must be **structured** (components or typed attributes), not free JSON.
  Editors must not be able to save something the frontend cannot parse. If a JSON attribute is
  unavoidable, the frontend validates it at the boundary (see `dynamic-form-fields`).
- Every user-visible string (label, help text, error message, plan name, coverage text, terms)
  is a content field. Never derive copy in code.
- Money: store the base price as an **integer in minor units** or as a whole number, depending on
  the currency. COP and CLP are displayed without decimals. Store the ISO 4217 currency code
  (`COP`, `CLP`) on the country.

## Seed (`backend/src/index.ts` → `bootstrap`, or `backend/src/seed/`)

- **Idempotent:** look each item up by a natural key (country code + field key, country code +
  plan slug) and create it only if it is missing. A restart must never duplicate data.
- Create content **published** (`status: 'published'`).
- Seed both countries, at minimum:
  - CO: document type (CC / CE), document number, plate (*placa*), plus the shared fields.
  - CL: RUT, plate (*patente*), plus the shared fields.
  - Shared fields: birth date, make (select), model, year, city (select), etc. (exact list per the US-01 spec).
- Seed ≥ 3 plans per country, one `isRecommended`; plus one inactive or unpublished plan per
  country to prove the filtering.
- Seed the terms and conditions per country.
- **Public role permissions are set in the bootstrap code:** only `find`/`findOne` on the
  content types the frontend reads. They are documented and justified in the security ADR.
  Never rely on manual admin clicks.
- No real data: fictitious names, invented document numbers and plates.

## Querying from the frontend

- Read only what is needed (`fields[]`, narrow `populate`).
- Every response is typed in the frontend and validated at the boundary.
- Handle: Strapi unreachable, empty result, partially malformed items (skip the item, log a
  warning, keep the rest working).
