# US-02 — Plan list · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (verbatim, not edited) |
| Status | Approved |
| Version | 0.1 |
| Author | spec-writer subagent (Claude Opus 5.5) |
| Approved by | v0.1: Felipe Sabogal, 2026-11-21 (HC1 round 1) |
| Related ADRs | [ADR-0001](../../adr/0001-multi-country-content-strategy.md) (country relation, routes, step guards), [ADR-0002](../../adr/0002-strapi-access-and-security.md) as amended by [ADR-0005](../../adr/0005-e2e-token-scope-for-relations.md) (public `plan.find`, proxy `/api/plans`, published-only reads, e2e token scope), [ADR-0003](../../adr/0003-wizard-state-persistence.md) (chosen plan in the wizard state; prices not stored), [ADR-0006](../../adr/0006-strapi-physical-model-adjustments.md) (`localeTag`; typed attributes). **Needed:** simulated price rule (US-02-Q-01); candidate: summary route and guard before US-03 (US-02-Q-03). See §10. |

Sources cited in this spec:

- **Story**: [story.md](story.md).
- **Assessment**: requirements quoted verbatim from the assessment PDF by the orchestrator (not in
  the repository).
- **US-01**: [specs/US-01/spec.md](../US-01/spec.md) v0.5 (Approved). US-02 consumes its typed
  step 1 output (§7.3), reuses its glossary, conventions and code-owned copy (§8.1), and completes
  the end-to-end parts it handed over (US-01-Q-19, US-01-Q-27).
- **ADR-0001..0006**: accepted ADRs (precedence level 2), with the implementation notes in
  [adr/README.md](../../adr/README.md).
- **Reviews R1..R4** of US-01: lessons for a new content type (published-only router config,
  `strictRelations`, typed attributes instead of free JSON, draft vs active).

## 1. Summary

Step 2 of the quote wizard: after a valid step 1, a person in Colombia or Chile sees the plans
the business team offers in their country, in the order configured in Strapi, each with its
name, short description, coverages, benefits and a final price in the country's currency and
format. The final price is the plan's base price adjusted by a simulated, documented rule that
uses the step 1 data (driver age and vehicle age, proposed in US-02-Q-01). One plan can be
highlighted as recommended. The person chooses exactly one plan and moves on to the summary
(US-03). The choice survives going back to step 1 and a reload. If the country has no plan on
offer, a clear message says so. Plans, prices and copy are content: changing them in Strapi is
reflected on the next page load with no code change. The same build serves both countries.

## 2. Scope

**In scope**

- The step 2 page at the existing route `/:country/planes`, behind the existing
  `wizardStepGuard` (ADR-0001; US-01-Q-27: "US-02 attaches its page to that route without
  changing the address or the guard").
- A `plan` content type in Strapi with a required `country` relation, draft & publish, the
  attributes of BR-01, and the components `plan.coverage` and `plan.benefit` (§7.1).
- The idempotent seed of the CO and CL plans (§7.3, annex [seed-plans.md](seed-plans.md)),
  including one draft-only and one inactive plan per country.
- Public read access to plans: `api::plan.plan.find` on the public role, the router with
  `publishedOnlyConfig()`, and `/api/plans` on the proxy allow-list (ADR-0002 anticipates all
  three for US-02).
- Loading one country's offered plans in one request, boundary validation, ordering.
- The simulated price rule as a pure, documented function (decided by the ADR of US-02-Q-01),
  and currency formatting from the country's `currencyCode` and `localeTag` (ADR-0006).
- The recommended highlight, single selection, "Continuar" to the summary address, "Atrás" to
  step 1.
- Keeping the chosen plan in the wizard state (ADR-0003: "`plan` is added by US-02 (an
  identifier of the chosen plan only, defined in its spec)").
- Loading, error, retry and empty ("no plans available") states.
- Keyboard-only use, accessible names, focus on arrival, mobile and desktop layouts.
- The end-to-end parts of US-01 that need the step 2 page: US-01-AC-04, US-01-AC-18 ("I see
  step 2"), US-01-AC-20, US-01-AC-21 (first scenario) and the "focus on the step 2 heading"
  clause of US-01-AC-24 (US-01 spec §11: "US-02's spec owns those e2e tests").
- Subject to US-02-Q-03: registering the summary route `/:country/resumen` with its guard and no
  page of its own.

**Out of scope**

- The summary page, terms, masking and payment (US-03). US-02 only defines the step 2 output
  that US-03 consumes (§7.4).
- A side-by-side comparison table, filters, user-chosen sorting, a plan detail page.
- Structured coverage data (limits, deductibles as numbers): a coverage is a line of Spanish text
  (US-02-Q-12).
- Payment frequency options (monthly instalments), discounts, coupons, taxes.
- Price rule parameters edited in Strapi, unless the ADR for US-02-Q-01 chooses that option.
- A real rating engine ("Price calculation may be simulated: a real rating engine is not
  expected.", Assessment).
- Choosing a plan through the URL; preselecting a plan.
- More than one currency per country; currencies other than COP and CLP in the seed.
- Images or icons per plan.

## 3. Glossary

Terms defined in the US-01 glossary (country context, published, wizard, wizard state, boundary
validation, wire shape / logical shape, anonymous request, today, editor) keep their meaning.

| Term | Meaning in this project |
|---|---|
| Plan | One Strapi `plan` document for one country (§7.1). |
| Offered plan | A plan that is shown on step 2: published, `isActive` true, related to the current country, and well-formed at the boundary (BR-02, US-02-Q-18). |
| Plan key | Stable machine name of a plan, unique per country (for example `clasico`). Stored in the wizard state as the chosen plan; never shown to the user (US-02-Q-05). |
| Base price | The plan's annual price in whole units of the country's currency, as configured in Strapi (US-02-Q-06, US-02-Q-08). |
| Final price | The price shown to the user: the base price adjusted by the price rule for the current step 1 data and today (BR-04). Never stored; recomputed on every display (ADR-0003). |
| Price rule | The simulated, deterministic function `(basePrice, step 1 output, today) → final price`, decided and documented in the ADR of US-02-Q-01. |
| Driver age | The completed years between the step 1 `birthDate` and today (same reckoning as US-01-BR-04). |
| Vehicle age | `Y − vehicleYear`, where `Y` is today's calendar year; a next-year model (`−1`) counts as 0. |
| Recommended plan | The offered plan shown with the "Recomendado" highlight (BR-01, US-02-Q-09). |
| Chosen plan | The plan the user selected on step 2, held in the wizard state by its plan key. |
| Summary | Step 3 of the wizard, at `/:country/resumen` (ADR-0001), owned by US-03. |
| Whole units | Pesos without a fractional part. COP and CLP prices are shown without decimals. |

## 4. Business rules

| ID | Original (source) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-02-BR-01 | Story: "Each plan is configured in Strapi with: name, short description, base price, currency, coverages, benefits, order, recommended flag, active status and country." | Each plan has: `key` (required, `^[a-z][a-z0-9-]*$`, unique per country, US-02-Q-05), `name` (required, non-empty), `shortDescription` (required, non-empty), `basePrice` (required integer, `1 ≤ basePrice ≤ 2 147 483 647`, whole units, annual; US-02-Q-06, Q-08), `coverages` (one or more lines of text, in configured order), `benefits` (zero or more lines of text, in configured order), `sortOrder` (integer), `isRecommended` (boolean, default `false`), `isActive` (boolean, default `true`) and a required `country` relation (ADR-0001). **Currency** is the country's `currencyCode`, not a plan attribute (US-02-Q-02, blocking). A plan that fails boundary validation is not shown and is logged with its key and problem, never with user data (US-02-Q-18). Among the offered plans, at most one is shown as recommended: the first in display order whose `isRecommended` is `true` (US-02-Q-09). | US-02-AC-01, US-02-AC-02, US-02-AC-09, US-02-AC-10 |
| US-02-BR-02 | Story: "Only published and active plans for the country are shown." | A plan is shown on step 2 of country C if and only if its published version exists, that published version has `isActive = true`, it is related to C, and it is well-formed (BR-01). Draft-only plans, published plans with `isActive = false`, plans of other countries and malformed plans are never shown. When a published plan also has unpublished draft changes, the **published** version is shown (US-02-Q-10). Offered plans are shown in `sortOrder` ascending; ties are broken by `key` ascending (US-02-Q-11). The recommended plan keeps its configured position. With zero offered plans, step 2 shows the "no plans available" state (US-02-Q-15). | US-02-AC-01, US-02-AC-04, US-02-AC-08 |
| US-02-BR-03 | Story: "The price is shown in the country's currency and format (Colombian pesos or Chilean pesos)." | A price is formatted with the standard ECMAScript `Intl.NumberFormat` currency formatting, using the current country's `localeTag` (logical `locale`, ADR-0006) and `currencyCode` (ADR-0001), both read from Strapi. No currency, symbol or locale is hard-coded per country. Observable result for the seed (`es-CO`/`COP`, `es-CL`/`CLP`): the symbol "$", "." between every group of three digits (also for 4-digit amounts), no decimal separator and no decimals, no ISO code (US-02-Q-07). Whitespace between the symbol and the digits is allowed and ignored by tests. Each price carries the code-owned caption "Precio anual" (US-02-Q-08). | US-02-AC-06 |
| US-02-BR-04 | Story: "The final price may be adjusted by a simulated rule based on the step 1 data. The rule is documented." Assessment: "Price calculation may be simulated: a real rating engine is not expected." | The final price of each offered plan is `priceRule(basePrice, step 1 typed output, today)`, a pure, deterministic function documented in an ADR (US-02-Q-01, blocking, ADR needed). It runs in the browser; no step 1 value is sent to any server to compute it (ADR-0002, ADR-0003). "Today" is the injectable clock of US-01-Q-06. The result is an integer ≥ 1 in whole units. If a step 1 input the rule needs is missing (the editor removed the reserved field) or `null` (an empty optional field), that input's adjustment is neutral and a `console.warn` names the key, never the value (US-01-Q-08: "US-02 and US-03 define their own fallback"). The **proposed default rule** is in §7.6; the Examples of AC-07 and the prices in other ACs use it and are updated if the ADR decides otherwise. | US-02-AC-07, US-02-AC-13, US-02-AC-19 |
| US-02-BR-05 | Story: "Only one plan can be selected." | At most one plan is chosen at any time. Choosing a plan replaces any earlier choice. No plan is chosen on first arrival, the recommended one included (US-02-Q-09, Q-13). "Continuar" is always enabled; with no chosen plan it keeps step 2, shows "Elige un plan para continuar." and moves focus to the plan group (US-02-Q-13). With a chosen plan it moves on to the summary address (US-02-Q-03). | US-02-AC-03, US-02-AC-05, US-02-AC-15 |
| US-02-BR-06 | Assessment: "Changing a form field or a plan in Strapi must be reflected in the app without changing code."; "form and plans 100% configurable from Strapi". | Publishing, unpublishing, activating, deactivating or editing a plan (name, description, price, coverages, benefits, order, recommended flag) is reflected on step 2 on the next full page load, with no code change, build or deployment; no browser or proxy cache delays it (US-01-Q-16, ADR-0002). No plan name, price, coverage or benefit exists in front-end code. Unpublished drafts are never readable by an anonymous caller, also with `status=draft` (ADR-0002). | US-02-AC-08, US-02-AC-12, US-02-AC-14, US-02-AC-19 |
| US-02-BR-07 | Assessment: "Use a front-end strategy to persist the data; a database is not required." ADR-0003. | The chosen plan is held in the wizard state (ADR-0003, `sessionStorage`, one country) as its plan key only, written when it is chosen. It survives going back to step 1, browser back and a reload in the same tab; editing step 1 data keeps it, and its final price is recomputed (US-02-Q-14). It is discarded when another country's context is entered (ADR-0003), when the stored plan key is not an offered plan of this page load (US-02-Q-14), and after a successful payment (US-03). Names, prices and coverages are never stored (ADR-0003: "Not stored: … plans, prices"). | US-02-AC-13, US-02-AC-14, US-02-AC-19 |

## 5. Acceptance criteria

Conventions for every scenario:

- Plan values come from the seed (§7.3, annex [seed-plans.md](seed-plans.md)); step 1 values come
  from the US-01 seed. All are fictitious.
- "I completed step 1 in Colombia" means the values of US-01-AC-04 (birth date 1990-05-15,
  "Modelo (año)" 2022) and a valid "Continuar". "I completed step 1 in Chile" means: RUT
  "12.345.678-5", Nombre completo "Ana Prueba Ficticia", Fecha de nacimiento 1990-05-15, Ciudad
  "Santiago", Patente "BCDF12", Marca "Kia", Modelo "Rio 5", Año 2022, consent checked.
- Unless stated otherwise, today is pinned to **2026-11-21**. With the proposed price rule (§7.6)
  both example drivers are 36 (factor 1.00) and both vehicles are 4 years old (factor 1.10).
- Addresses follow ADR-0001: step 1 `/<country>/datos`, step 2 `/<country>/planes`, summary
  `/<country>/resumen`. "Move on to the summary" means the address changes to the summary route;
  the summary page belongs to US-03 (US-02-Q-03).
- Prices are compared with whitespace removed (BR-03).
- "Continuar" and "Atrás" are the existing code-owned buttons (US-01 §8.1); the other step 2
  copy is in §8.1.

### US-02-AC-01 — Plans for the country

```gherkin
Scenario Outline: Plans for the country
  Given the seed plans for Colombia and Chile are in Strapi
  And I completed the step 1 form in <country>
  When I reach the plans step
  Then I see exactly these plans, in this order: <plans>
  And I do not see <hidden>

  Examples:
    | country  | plans                                               | hidden |
    | Colombia | "Plan Básico", "Plan Clásico", "Plan Total"         | "Plan Joven" (draft only), "Plan Total Plus" (inactive), any Chile plan |
    | Chile    | "Plan Esencial", "Plan Protegido", "Plan Premium"   | "Plan Flex" (draft only), "Plan Premium Plus" (inactive), any Colombia plan |
```

Each shown plan displays its name, short description, final price with "Precio anual", its
coverages under "Coberturas" and, when it has any, its benefits under "Beneficios", in the
configured order (annex).

### US-02-AC-02 — Recommended plan

```gherkin
Scenario: Recommended plan
  Given "Plan Protegido" is marked as recommended in Strapi for Chile
  When I view the plan list in Chile
  Then "Plan Protegido" shows the text "Recomendado" and a distinct visual style
  And no other plan shows "Recomendado"
  And "Plan Protegido" stays in its configured position, second
```

The highlight is text plus style, never colour alone (WCAG 1.4.1).

### US-02-AC-03 — Plan selection

```gherkin
Scenario: Plan selection
  Given I completed step 1 in Colombia and I am on the plan list
  When I select "Plan Total"
  Then "Plan Total" is marked as chosen: it is checked and shows "Seleccionado"
  And the wizard state holds the plan key "total" for Colombia
  When I activate "Continuar"
  Then I move on to the summary: the address is "/co/resumen"
```

### US-02-AC-04 — No plans available

```gherkin
Scenario: No plans available
  Given there are no active plans for Chile
    (every Chile plan is unpublished, inactive or malformed)
  And I completed step 1 in Chile
  When I reach the plans step
  Then I see the message "No hay planes disponibles para tu país en este momento."
  And no plan and no "Continuar" button is shown
  And "Atrás" takes me to step 1 of Chile with my data
```

### US-02-AC-05 — Only one plan can be chosen (derived from US-02-BR-05 / Q-09, Q-13)

```gherkin
Scenario: No plan is chosen on arrival
  Given I completed step 1 in Chile
  When I reach the plans step for the first time
  Then no plan is marked as chosen, not even the recommended "Plan Protegido"

Scenario: Choosing another plan replaces the choice
  Given I am on the plan list of Colombia and "Plan Básico" is chosen
  When I select "Plan Total"
  Then only "Plan Total" is marked as chosen
  And the wizard state holds the plan key "total"

Scenario: Continuing without a chosen plan
  Given I am on the plan list of Colombia and no plan is chosen
  When I activate "Continuar"
  Then I stay on "/co/planes"
  And I see "Elige un plan para continuar."
  And the keyboard focus moves to the first plan option, "Plan Básico"
  And no plan becomes chosen
```

### US-02-AC-06 — Price in the country's currency and format (derived from US-02-BR-03 / Q-07)

```gherkin
Scenario Outline: Price in the country's currency and format
  Given the country <country> has currencyCode <currency> and localeTag <locale> in Strapi
  When a final price of <amount> is shown
  Then the shown text, with whitespace removed, is "<text>"
  And it has no decimal part and no ISO currency code

  Examples:
    | country  | currency | locale | amount  | text       |
    | Colombia | COP      | es-CO  | 1540000 | $1.540.000 |
    | Colombia | COP      | es-CO  | 935000  | $935.000   |
    | Colombia | COP      | es-CO  | 1000    | $1.000     |
    | Colombia | COP      | es-CO  | 50      | $50        |
    | Chile    | CLP      | es-CL  | 528000  | $528.000   |
    | Chile    | CLP      | es-CL  | 2100000 | $2.100.000 |
    | Chile    | CLP      | es-CL  | 1000    | $1.000     |
```

### US-02-AC-07 — Final price from the step 1 data (derived from US-02-BR-04 / Q-01)

The Examples apply the **proposed default rule** of §7.6. If the ADR of US-02-Q-01 decides
another rule, this AC keeps its ID and its Examples are rewritten at the next spec revision.

```gherkin
Scenario Outline: Final price of the seed plans
  Given I completed step 1 in <country>
  When I reach the plans step
  Then the plans show these final prices: <prices>

  Examples:
    | country  | prices |
    | Colombia | "Plan Básico" $935.000, "Plan Clásico" $1.540.000, "Plan Total" $2.310.000 |
    | Chile    | "Plan Esencial" $319.000, "Plan Protegido" $528.000, "Plan Premium" $792.000 |

Scenario Outline: Price rule boundaries
  Given today is 2026-11-21 and a plan has the base price <base>
  And the step 1 output has birthDate <birthDate> and vehicleYear <vehicleYear>
  When the final price is computed
  Then it is <final>

  Examples:
    | base    | birthDate  | vehicleYear | final   | why |
    | 1000000 | 1990-05-15 | 2022        | 1100000 | age 36 (1.00), vehicle 4 (1.10) |
    | 1000000 | 2001-11-21 | 2022        | 1320000 | age 25 today (1.20), vehicle 4 (1.10) |
    | 1000000 | 2000-11-21 | 2022        | 1100000 | age 26 today (1.00) |
    | 1000000 | 1965-11-21 | 2020        | 1100000 | age 61 today (1.10), vehicle 6 (1.00) |
    | 1000000 | 1965-11-22 | 2020        | 1000000 | age 60 (1.00), vehicle 6 (1.00) |
    | 1000000 | 1990-05-15 | 2027        | 1100000 | next-year model counts as 0 (1.10) |
    | 1000000 | 1990-05-15 | 2021        | 1100000 | vehicle 5 (1.10) |
    | 1000000 | 1990-05-15 | 2016        | 1000000 | vehicle 10 (1.00) |
    | 1000000 | 1990-05-15 | 2015        | 900000  | vehicle 11 (0.90) |
    | 1000000 | 2001-11-21 | 2015        | 1080000 | 1.20 × 0.90 |
    | 45      | 1990-05-15 | 2022        | 50      | 49.5 rounds half up |
    | 45      | 2001-11-21 | 2022        | 59      | 59.4 rounds down |
    | 1000000 | null       | 2015        | 900000  | birthDate missing or null: age factor 1.00, warning |
    | 1000000 | 1990-05-15 | null        | 1000000 | vehicleYear missing or null: vehicle factor 1.00, warning |
```

### US-02-AC-08 — Which plans are visible (derived from US-02-BR-02, BR-06 / Q-10)

```gherkin
Scenario Outline: Which plans are visible
  Given a Colombia context
  And a plan "Plan Prueba" that is <publication>, has isActive <active> and belongs to <owner>
  When I reach the plans step of Colombia
  Then "Plan Prueba" is <result>

  Examples:
    | publication    | active | owner    | result    |
    | published      | true   | Colombia | shown     |
    | published      | false  | Colombia | not shown |
    | draft only     | true   | Colombia | not shown |
    | published      | true   | Chile    | not shown |

Scenario: A published plan with unpublished changes shows the published version
  Given "Plan Clásico" for Colombia is published with base price 1400000
  And an editor saved, without publishing, a draft of it with base price 1600000
  When I reach the plans step of Colombia
  Then "Plan Clásico" shows the final price "$1.540.000"
```

### US-02-AC-09 — Malformed plan is skipped (derived from US-02-BR-01 / Q-18)

```gherkin
Scenario Outline: Malformed plan is skipped
  Given the plans response for Colombia contains the 3 offered seed plans
  And one extra active plan that is malformed because <problem>
  When step 2 is rendered
  Then the 3 seed plans are shown and the malformed one is not
  And a console warning names the plan key and the problem, and contains no step 1 value

  Examples:
    | problem |
    | its basePrice is 0 |
    | its basePrice is 850000.5 |
    | its basePrice is the text "850000" |
    | it has no coverage |
    | every coverage label is blank |
    | its name is empty |
    | its shortDescription is null |
    | its key "Plan 4" does not match ^[a-z][a-z0-9-]*$ |
    | its key "clasico" duplicates a plan earlier in sortOrder (the earlier one is kept) |
    | its sortOrder is null |
```

A blank coverage or benefit line is skipped with a warning; the plan stays if one coverage
remains (US-02-Q-18).

Note (drafts, confirmed at HC3, US-02-R2-F01): Strapi enforces "at least one coverage" only on
published content. An editor may save a draft with an empty coverage list (`[]`), but cannot
publish it, or update a published plan to have no coverage. A plan cannot be created, even as a
draft, with `coverages` unset. See §7.1.

### US-02-AC-10 — Recommended edge cases (derived from US-02-BR-01 / Q-09)

```gherkin
Scenario Outline: Recommended edge cases
  Given the offered plans of Colombia are "Plan Básico", "Plan Clásico", "Plan Total"
  And <flagged> have isRecommended true
  When I view the plan list
  Then "Recomendado" is shown on <highlighted>

  Examples:
    | flagged                                        | highlighted |
    | "Plan Clásico" only                            | "Plan Clásico" only |
    | no plan                                        | no plan |
    | "Plan Básico" and "Plan Total"                 | "Plan Básico" only (first in order), and a console warning |
    | only "Plan Total Plus", which is inactive      | no plan |
```

### US-02-AC-11 — Plans cannot be loaded (derived from Q-15)

```gherkin
Scenario: Plans cannot be loaded
  Given I completed step 1 in Chile
  And the content backend does not answer the plans request within 10 seconds, or answers with an error
  When I reach the plans step
  Then I see "No pudimos cargar los planes. Intenta de nuevo." and a "Reintentar" button
  And no plan and no "Continuar" button is shown, and "Atrás" is available
  When the content backend is available again and I activate "Reintentar"
  Then the Chile plans are shown
```

### US-02-AC-12 — Plan change without deployment (derived from US-02-BR-06)

```gherkin
Scenario: Plan change without deployment
  Given the business team adds and publishes in Strapi a plan for Chile with
    key "auto-nuevo", name "Plan Auto Nuevo", shortDescription "Para autos de hasta 2 años.",
    basePrice 400000, sortOrder 15, isActive true, isRecommended false,
    one coverage "Pérdida total por daño"
  And the running front-end build and its configuration are not changed
  And I completed step 1 in Chile
  When I reach the plans step of Chile
  Then "Plan Auto Nuevo" appears between "Plan Esencial" and "Plan Protegido" with the final price "$440.000"
  And it does not appear in the plans step of Colombia
```

### US-02-AC-13 — The chosen plan is kept (derived from US-02-BR-07, BR-04 / Q-14)

```gherkin
Scenario: Back to step 1 and forward again
  Given I completed step 1 in Colombia and chose "Plan Total"
  When I go back to step 1 with "Atrás"
  Then every step 1 field shows the value I entered
  When I activate "Continuar"
  Then "Plan Total" is still marked as chosen

Scenario: Reload on the plan list
  Given I completed step 1 in Chile and chose "Plan Protegido"
  When I reload the page in the same browser tab
  Then "Plan Protegido" is still marked as chosen with the final price "$528.000"

Scenario: Changing step 1 data recomputes the price and keeps the choice
  Given I completed step 1 in Colombia and chose "Plan Clásico", shown at "$1.540.000"
  When I go back to step 1, change "Modelo (año)" to 2015 and activate "Continuar"
  Then "Plan Clásico" is still marked as chosen
  And it shows the final price "$1.260.000"
```

### US-02-AC-14 — A chosen plan that is no longer offered is dropped (derived from US-02-BR-06, BR-07 / Q-14)

```gherkin
Scenario Outline: A chosen plan that is no longer offered is dropped
  Given the wizard state holds the chosen plan "clasico" for Colombia
  And afterwards the business team <change> "Plan Clásico"
  When I reload the page on the plans step of Colombia
  Then no plan is marked as chosen and the wizard state holds no chosen plan
  And activating "Continuar" shows "Elige un plan para continuar."

  Examples:
    | change |
    | unpublishes |
    | sets isActive to false on |
```

### US-02-AC-15 — The summary needs a valid step 1 and a chosen plan (derived from US-02-BR-05 / Q-03)

Applies only if US-02-Q-03 is answered with the proposed default (US-02 registers the summary
route and its guard). Otherwise this AC moves to US-03 and is retired here.

```gherkin
Scenario Outline: The summary needs a valid step 1 and a chosen plan
  Given the wizard state for Colombia has <state>
  When I open "/co/resumen" directly (deep link or typed address)
  Then I am at <address>

  Examples:
    | state                                             | address      |
    | no valid step 1 data                              | /co/datos    |
    | valid step 1 data and no chosen plan              | /co/planes   |
    | valid step 1 data and the chosen plan "joven" (draft only) | /co/planes |
    | valid step 1 data and the chosen plan "total"     | /co/resumen  |
```

Redirects replace the blocked address in the history (as AC-19 of US-01).

### US-02-AC-16 — Keyboard-only plan choice (derived from Assessment: accessibility)

```gherkin
Scenario: Keyboard-only plan choice
  Given I completed step 1 in Colombia using only the keyboard, on a desktop viewport
  When step 2 is shown
  Then the keyboard focus is on the heading "Elige tu plan"
  And the document title is "Elige tu plan | Cotizador de seguro de auto"
  When I press Tab
  Then the focus is on the plan group, on its first plan "Plan Básico"
  When I press the Down arrow key twice
  Then "Plan Total" is focused and chosen
  When I press Tab until "Continuar" is focused and press Enter
  Then the address is "/co/resumen"
  And every focused control showed a visible focus indicator
  And the Tab order was: plan group, "Atrás", "Continuar"
```

The first two `Then` steps also complete the "focus on the step 2 heading" clause of US-01-AC-24.

### US-02-AC-17 — Accessible plan options (derived from Assessment: accessibility)

```gherkin
Scenario: Accessible plan options
  Given step 2 is shown in Chile
  Then the plans are exposed as one single-choice group whose accessible name is "Elige tu plan"
  And each option's accessible name is its plan name, for example "Plan Protegido"
  And the accessible description of "Plan Protegido" includes "Recomendado" and "$528.000"
  And each option exposes whether it is checked
  And "Coberturas" and "Beneficios" are headings followed by lists
  When I activate "Continuar" with no chosen plan
  Then "Elige un plan para continuar." is announced by assistive technology once
```

### US-02-AC-18 — Mobile and desktop layout (derived from Assessment: responsive)

```gherkin
Scenario Outline: Mobile and desktop layout
  Given the viewport is <width> × <height> CSS pixels
  When I open step 2 in Colombia after completing step 1
  Then the page has no horizontal scroll
  And the plans are in <layout>
  And every plan's name, price, coverages and benefits are visible without opening anything
  And every control has a target size of at least 24 × 24 CSS pixels
  And I can choose a plan and move on to the summary

  Examples:
    | width | height | layout |
    | 360   | 740    | one column, in configured order |
    | 1280  | 800    | a row or grid read left to right, top to bottom, in configured order |
```

Verification: manual at HC3, with one screenshot of step 2 of Colombia at each size attached to
the HC3 record (as US-01-AC-26).

### US-02-AC-19 — Read-only plan access, step 1 data stays in the browser (derived from US-02-BR-04, BR-06, BR-07 / Assessment: security)

```gherkin
Scenario: No step 1 data leaves the browser on step 2
  Given I completed step 1 in Colombia with the values of US-01-AC-04
  When I reach the plans step, choose "Plan Total" and move on to the summary
  Then every request to the content backend during that time is an HTTP GET without an Authorization header
  And no request contains any step 1 value I entered

Scenario Outline: Anonymous requests never return draft plans
  When an anonymous client sends <authorization> and requests the plans at the path <path>
    with "status=draft" and "filters[key][$eq]=joven" through <entry point>
  Then the response contains no plan with key "joven"
  And every entry the response returns, if any, has a non-null "publishedAt"

  Examples:
    | entry point                                  | path          | authorization                  |
    | Strapi's own port (bypassing the proxy)      | "/api/plans"  | no Authorization header        |
    | Strapi's own port (bypassing the proxy)      | "/API/plans"  | no Authorization header        |
    | Strapi's own port (bypassing the proxy)      | "/api/plans"  | the header Authorization "foo" |
    | the same-origin proxy at the relative "/api" | "/api/plans"  | no Authorization header        |

Scenario: Writes through the same-origin proxy are rejected
  When an anonymous client sends "POST /api/plans" through the same-origin proxy with a
    Colombia plan of key "security-probe"
  Then the response status is 405
  And an anonymous read of the Colombia plans returns no plan with key "security-probe"
```

The draft rows are fewer than US-01-AC-28 because the published-only middleware is shared and
already covered there in every variant; these rows prove that the `plan` router uses it. The
backend test `published-only-routes.test.ts` (US-01-R2-F03) walks every `api::*` content type, so
it covers `plan` with no change.

## 6. Gaps and open questions

Gaps marked **[Blocks HC1]** change ACs, a contract shared with US-03, or the story's own text, so
they need an explicit answer. For the others, the proposed default applies if the human does not
answer.

| ID | Gap | Why it matters | Proposed default | Human answer |
|---|---|---|---|---|
| US-02-Q-01 | **[Blocks HC1] [ADR]** "Adjusted by a simulated rule based on the step 1 data. The rule is documented." Which inputs, which formula, where it lives (code or Strapi), rounding, fallback for missing inputs, and which "today"? | Every displayed price and AC-07 depend on it, and US-03 must show the same final price. There are real alternatives: a fixed rule in code; rule factors as country content in Strapi (configurable per country, more model and boundary work); factors per plan. | Decided by an ADR (§10). Proposal to evaluate (§7.6): a pure front-end function in code, the same for both countries, `final = roundHalfUp(basePrice × ageFactor × vehicleFactor)`, age factor 1.20 (18–25), 1.00 (26–60), 1.10 (61+); vehicle factor 1.10 (0–5 years), 1.00 (6–10), 0.90 (11+); computed with integer arithmetic; missing or `null` input → factor 1.00 and a warning without the value; today from the injectable clock (US-01-Q-06). US-03 calls the same function. | Decided by an ADR that weighs real alternatives (for example, factors configurable in Strapi); the proposed rule is the starting point. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-02 | **[Blocks HC1]** The story lists "currency" as a plan attribute, while ADR-0001 puts `currencyCode` on the country and BR-03 says "the country's currency". If a plan has its own currency, what happens when it differs from the country's? | A per-plan currency can contradict the country (a CLP plan in Colombia), and the content contract and seed change with the answer. This departs from the story's literal attribute list, so a human decides. | No `currency` attribute on `plan`: a plan's currency is its country's `currencyCode` (one source, no mismatch possible). Alternative: a `currencyCode` on the plan that must equal the country's; a mismatch makes the plan malformed (dropped, AC-09). | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-03 | **[Blocks HC1]** (same situation as US-01-Q-27) "I can move on to the summary", but the summary is US-03. Does US-02 register `/:country/resumen` before its page exists, and which guard protects it? ADR-0001's route table says the step 3 guard is "defined by US-03". | AC-03, AC-15, AC-16 and AC-19 end at the summary address. Without the route, "Continuar" falls into the `/:country/**` redirect to step 1, and those checks cannot pass. | US-02 registers `/:country/resumen` with a step 3 guard and **no page of its own** (tests assert the address); US-03 attaches its page without changing the address or the guard. The guard allows the summary only if step 1 is valid (else `/<country>/datos`) and the stored plan key is an offered plan of this page load (else `/<country>/planes`), with `replaceUrl` (AC-15). The architect records this as an amendment or implementation note on ADR-0001 (§10). Alternative: no summary route in US-02; "Continuar" with a chosen plan is verified by a component test of the navigation call, and AC-15 moves to US-03. | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-04 | **[Blocks HC1]** Which e2e files does US-02 add? US-01 has exactly four. The assessment's "at least one e2e test of the full flow for one country" will span US-01 to US-03. | §11 and the test tasks derive from it; each e2e file costs run time on the gate. | Two new files (six in total): `frontend/e2e/us-01-03-full-flow-co.spec.ts`, created now with steps 1 and 2 (and the US-01 hand-over), extended by US-03 with the summary and payment, so the full-flow file never needs renaming (CLAUDE.md §6 example); and `frontend/e2e/us-02-plans-cl-content.spec.ts` for Chile, seeded visibility, the configuration change and the plan security rows. Alternative: three files, moving the API security rows to `us-02-security.spec.ts`. | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-05 | How is a plan identified in the wizard state and in the seed? Strapi's `documentId` or an editor-set key? Is it unique per country? | US-03 reads the chosen plan from the state; the seed needs a natural key to stay idempotent. | A required `key` attribute (`^[a-z][a-z0-9-]*$`), set by the editor when creating the plan and not changed afterwards. Unique per country, enforced by extending the existing `form-field` key middleware (ADR-0001) to `plan`; the front end also keeps only the first of duplicated keys (AC-09). The state stores `plan: { key }` (§7.4). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-06 | How is money stored? Minor units or whole pesos? Limits? | COP and CLP are shown without decimals; a decimal or text price must not reach the screen. | `basePrice` is a Strapi `integer` in whole pesos, `min: 1`; the integer limit (2 147 483 647) is the maximum. A non-integer, text, 0 or negative value makes the plan malformed (AC-09). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-07 | "The country's format": which symbol, separators, decimals? Is the ISO code shown, given both countries use "$"? How are 4-digit amounts grouped (Spanish locales may leave "1000" ungrouped)? | Tests need exact strings; ICU output differs slightly between runtimes (spaces). | Standard `Intl.NumberFormat` currency style with the country's `localeTag` and `currencyCode`, no fraction digits, grouping always on ("$1.000"). No ISO code: each person sees only their own country. Tests compare with whitespace removed (AC-06). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-08 | Is the price annual or monthly? Is it labelled? | A bare amount is ambiguous for an insurance premium. | Annual premium. Each price shows the code-owned caption "Precio anual". The base price is not shown, only the final price. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-09 | Recommended: what if no plan, or several, are flagged? Is it moved to the top? Is it preselected? | The story says "highlight one plan"; the editor can flag several. Preselection would bias the choice. | At most one highlight: the first flagged offered plan in display order; extra flags log a warning. A flagged plan that is not offered highlights nothing. Position unchanged. Never preselected (AC-05, AC-10). Enforcing one flag in Strapi is not done (it would need custom backend code, ADR-0006 D4). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-10 | Active vs published: what is `isActive` for if drafts exist? Default value? What if a published plan has newer unpublished changes? Can anonymous callers read inactive plans? | Editors need to know which switch hides a plan; the request filter and the boundary must agree. | Publishing makes a plan available; `isActive = false` hides a published plan without unpublishing it (for example a paused offer). `isActive` defaults to `true`. The published version is shown even when a newer draft exists (AC-08). Inactive published plans are readable through the public API by a caller who omits the filter; accepted, as they are not secret (unreleased plans stay drafts). The front end requests `isActive = true` and also drops any inactive plan at the boundary. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-11 | Ties in `sortOrder`? | Order must be deterministic for tests. | `sortOrder` ascending, ties by `key` ascending (as US-01-BR-01). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-12 | What are coverages and benefits: free text, or structured (limit, deductible)? Is order configurable? | Defines the content model and the layout. | Two repeatable components with one required text attribute `label` each (`plan.coverage`, `plan.benefit`); limits are part of the text. Order is the order in the Strapi editor (no `sortOrder`). At least one coverage; benefits optional (the "Beneficios" heading is hidden when there are none). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-13 | How is a plan chosen, and what does "Continuar" do with no choice? | "Marked as chosen" must be observable and keyboard-accessible; a disabled button gives no feedback (US-01-Q-13). | Native single-choice semantics (a radio group named "Elige tu plan"), arrow keys move and choose. The chosen plan is checked and shows "Seleccionado". "Continuar" always enabled; with no choice: message "Elige un plan para continuar." in an alert, focus on the first option (AC-05). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-14 | What happens to the chosen plan when the person edits step 1, reloads, or the plan stops being offered? | Prices depend on step 1; US-03 must never receive a plan that is not on offer. | Kept on step 1 edits (price recomputed, AC-13), kept on reload, cleared and written back when the stored key is not an offered plan of this page load (AC-14), cleared with the whole entry on country switch (ADR-0003) and after a successful payment (US-03). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-15 | Loading, error and empty states; what if every plan is malformed? | Strapi can be slow or down; an empty list must never look like a broken page. | "Cargando planes…" while loading; after 10 s or on any error the error state with "Reintentar" (AC-11), no automatic retries (as US-01-Q-17). Zero offered plans, including the case where every plan is malformed, shows the "no plans available" state (AC-04), because retrying would not help. "Atrás" is available in every state. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-16 | Which step 2 copy is in code? | Same rule as US-01-Q-14: chrome copy in code, content in Strapi. | The strings of §8.1, Spanish, the same for both countries. Everything about a plan comes from Strapi. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-17 | After a reload on step 2, the typed step 1 output is gone: ADR-0003 persists only the raw editing values, and the typed output is produced on a valid "Continuar". Where does step 2 get it? | Without it the price rule has no input after a reload. | On entering step 2 (also after a reload), the typed step 1 output is derived again from the stored raw values with the field configuration of this page load, through the same function as "Continuar" (US-01 §7.3). The existing `wizardStepGuard` already validates them, so step 2 only renders with a valid output. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-18 | Which malformed plan content is dropped, and how? | Editors can save content the front end cannot use; one bad plan must not break the list. | The rows of AC-09: drop the plan, keep the rest, `console.warn` with key and problem and no user data. A blank coverage or benefit line is skipped with a warning; a plan with no non-blank coverage is malformed. A missing or non-boolean `isRecommended` is `false`; `isActive` must be `true`. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-19 | Mobile layout of several plan cards with long coverage lists; comparison? | Usability at 360 px (Assessment: "Works on mobile and desktop"). | One column at narrow widths, a row or grid on wide screens, always in configured order; all content visible (no accordions); no comparison table (out of scope). Verified by hand at HC3 (AC-18). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-02-Q-20 | What do "Atrás" and the browser back action do on step 2? | Users expect to edit their data without losing the choice. | "Atrás" navigates to `/<country>/datos` (a new history entry, like "Continuar"); browser back does the same through the history. Both keep the step 1 values and the chosen plan. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |

Checklist items with no gap: *double clicks / submits* — step 2 sends nothing to a server; a
second "Continuar" while navigating has no effect. *Timezone of today* — US-01-Q-06 applies.
*Masking* — no personal data is shown on step 2.

## 7. Content contract (what Strapi must provide)

Logical model below; the physical model follows ADR-0001 (required `manyToOne` `country`
relation, `strictRelations: true` already set), ADR-0006 (typed attributes, no free JSON) and the
`strapi-content-modeling` conventions.

### 7.1 `plan` collection type (per country, draft & publish on)

| Attribute | Strapi type | Rules |
|---|---|---|
| `key` | string, required | `^[a-z][a-z0-9-]*$`. Unique per country (Document Service middleware, US-02-Q-05). Not shown to users. |
| `name` | string, required | Spanish, non-empty. |
| `shortDescription` | string, required, `maxLength: 200` | Spanish, non-empty. |
| `basePrice` | integer, required, `min: 1` | Annual, whole units of the country's currency (US-02-Q-06, Q-08). |
| `coverages` | repeatable component `plan.coverage`, `required`, `min: 1` | Order as edited. Draft rule (Strapi 5.63, confirmed at HC3, US-02-R2-F01): a draft may hold an empty list (`[]`, what the admin sends when an editor deletes every row); a plan cannot be created, even as a draft, with `coverages` unset; publishing, or updating a published plan, requires at least one coverage (AC-09). |
| `benefits` | repeatable component `plan.benefit` | Zero or more. Order as edited. |
| `sortOrder` | integer, required | Ascending; ties by `key`. |
| `isRecommended` | boolean, default `false` | US-02-Q-09. |
| `isActive` | boolean, default `true` | US-02-Q-10. |
| `country` | required `manyToOne` relation to `country` | ADR-0001; publishing without it is rejected (`strictRelations`). |

No `currency` attribute, subject to US-02-Q-02.

Components: `plan.coverage` and `plan.benefit`, each with one attribute `label` (string, required,
Spanish).

### 7.2 Wire shape and mapping

Request (one per page load, through the proxy, published content only, ADR-0002):

```
GET /api/plans?filters[country][code][$eq]=CO&filters[isActive][$eq]=true
  &fields[0]=key&fields[1]=name&fields[2]=shortDescription&fields[3]=basePrice
  &fields[4]=sortOrder&fields[5]=isRecommended&fields[6]=isActive
  &populate[coverages][fields][0]=label&populate[benefits][fields][0]=label
  &sort[0]=sortOrder:asc&sort[1]=key:asc&pagination[pageSize]=100
```

Example response item (illustrative; Strapi adds `id`, `documentId`, component `id` and `meta`,
which the parser ignores):

```json
{ "id": 7, "documentId": "…", "key": "clasico", "name": "Plan Clásico",
  "shortDescription": "Cubre los daños a terceros y la pérdida total de tu vehículo.",
  "basePrice": 1400000, "sortOrder": 20, "isRecommended": true, "isActive": true,
  "coverages": [ { "id": 31, "label": "Pérdida total por daños" } ],
  "benefits": [ { "id": 52, "label": "Asistencia en carretera 24/7" } ] }
```

Mapping wire → logical `Plan` (boundary parser, US-02-Q-18):

| Wire attribute | Valid when | Logical attribute |
|---|---|---|
| `key` | string matching `^[a-z][a-z0-9-]*$`, first occurrence in display order | `key` |
| `name` | non-blank string | `name` |
| `shortDescription` | non-blank string | `shortDescription` |
| `basePrice` | JSON number, integer, 1 ≤ n ≤ 2 147 483 647 (numeric text is a wrong type) | `basePrice` |
| `sortOrder` | JSON number, integer | `sortOrder` |
| `isActive` | `true` (anything else: not offered, dropped) | — |
| `isRecommended` | `true` → `true`; anything else → `false` | `isRecommended` |
| `coverages` | array; items with a non-blank `label` kept, blank ones skipped with a warning; ≥ 1 kept | `coverages: string[]` |
| `benefits` | array or `null`/absent (→ empty); blank items skipped with a warning | `benefits: string[]` |

The parser sorts by `sortOrder`, then `key`, and does not rely on the server sort.

### 7.3 Seed (summary)

Full copy in the annex [seed-plans.md](seed-plans.md). Natural key: country code + `key`.

| Country | Offered, in order (key → name, basePrice) | Recommended | Not offered (proves AC-01, AC-08) |
|---|---|---|---|
| CO (COP, es-CO) | `basico` → Plan Básico 850000; `clasico` → Plan Clásico 1400000; `total` → Plan Total 2100000 | `clasico` | `joven` → Plan Joven (draft only, sortOrder 25); `total-plus` → Plan Total Plus (published, `isActive` false) |
| CL (CLP, es-CL) | `esencial` → Plan Esencial 290000; `protegido` → Plan Protegido 480000; `premium` → Plan Premium 720000 | `protegido` | `flex` → Plan Flex (draft only, sortOrder 15); `premium-plus` → Plan Premium Plus (published, `isActive` false) |

### 7.4 Wizard state and the step 2 output (consumed by US-03)

- The ADR-0003 entry (`version` 1) gains `plan`: `{ "key": "<plan key>" }` or absent/`null` when
  no plan is chosen. Example:
  `{ "version": 1, "country": "CO", "step1": { "values": { … } }, "plan": { "key": "total" } }`.
  A `plan` that is not an object with a string `key` makes the entry invalid, which ADR-0003
  discards with a warning.
- Written when a plan is chosen; pruned when the key is not an offered plan of this page load
  (AC-14); never holds names or prices (ADR-0003).
- Step 1 input of the price rule: the typed step 1 output of US-01 §7.3, re-derived from the
  stored raw values with this page load's configuration when step 2 is entered (US-02-Q-17). The
  rule reads the reserved keys `birthDate` (ISO date or `null`) and `vehicleYear` (integer or
  `null`), subject to US-02-Q-01.
- **For US-03:** the chosen plan is `plan.key`. US-03 reads the plan from the offered plans of
  its own page load and computes the final price with the same price rule, step 1 output and
  clock, so the summary shows the price the person chose.

### 7.5 Access (ADR-0002, ADR-0005)

- Public role: add exactly `api::plan.plan.find` (no `findOne`), reconciled in bootstrap.
  Justification: step 2 (BR-02); data exposed: names, descriptions, prices, coverages and
  benefits, public by nature (shown to every visitor); see US-02-Q-10 for inactive plans.
- Router: `createCoreRouter('api::plan.plan', publishedOnlyConfig())`, a fresh config object
  (US-01-R2-F03; checked by `published-only-routes.test.ts`).
- Proxy: add `/api/plans` to the GET-only allow-list.
- E2E write token for AC-12 (ADR-0005 general rule): exactly `api::plan.plan.create`,
  `api::plan.plan.delete` and `api::country.country.find`; created and deleted in the Playwright
  Node process only.

### 7.6 Proposed default price rule (subject to the ADR of US-02-Q-01)

```
final = roundHalfUp(basePrice × ageFactor × vehicleFactor)    (integer arithmetic, result ≥ 1)

driver age (completed years on today)   ageFactor      vehicle age (Y − vehicleYear, min 0)   vehicleFactor
18–25                                   1.20           0–5                                     1.10
26–60                                   1.00           6–10                                    1.00
61 or more                              1.10           11 or more                              0.90
birthDate missing or null               1.00 + warn    vehicleYear missing or null             1.00 + warn
```

Ages below 18 cannot reach step 2 (US-01-BR-04, guard). The factors are illustrative, not
actuarial.

## 8. UI states

| State | Trigger | What the user sees | Accessibility notes |
|---|---|---|---|
| Loading | Step 2 entered, plans request in flight | Heading "Elige tu plan", "Cargando planes…", "Atrás"; no plan, no "Continuar" | Container `aria-busy="true"`; loading text in a polite live region |
| Error | Timeout (10 s), network or HTTP error, or the country cannot be formatted (invalid `localeTag`/`currencyCode` rejected by `Intl`) | "No pudimos cargar los planes. Intenta de nuevo.", "Reintentar", "Atrás" | Message in `role="alert"`; focus moves to "Reintentar" |
| Empty | Zero offered plans (AC-04) | "No hay planes disponibles para tu país en este momento.", "Atrás"; no "Continuar" | Message in a polite live region |
| Ready | Plans loaded | Plans in order: name, "Recomendado" on the highlighted one, short description, final price + "Precio anual", "Coberturas" list, "Beneficios" list; "Atrás", "Continuar" | Radio group named "Elige tu plan"; option name = plan name; description includes price and "Recomendado" |
| Plan chosen | A plan selected | The plan is checked and shows "Seleccionado" | Checked state exposed |
| Failed continue | "Continuar" with no plan | "Elige un plan para continuar." near the group | `role="alert"`, announced once; focus on the first option |
| Arrival | Navigation to step 2 (from "Continuar", deep link, reload or back) | Step 2 | Focus on the `h1` "Elige tu plan"; document title per §8.1 |
| Success | "Continuar" with a chosen plan | The address changes to `/<country>/resumen` (page owned by US-03, US-02-Q-03) | Focus on the summary heading: US-03 |

### 8.1 Code-owned copy added by US-02

Spanish, the same for both countries, in front-end code; extends US-01 §8.1. Proposed in
US-02-Q-08, Q-13, Q-15 and Q-16.

| String | Where |
|---|---|
| "Elige tu plan" | Step 2 heading and the accessible name of the plan group |
| "Elige tu plan \| Cotizador de seguro de auto" | Step 2 document title |
| "Recomendado" | Highlight of the recommended plan |
| "Seleccionado" | Marker on the chosen plan |
| "Precio anual" | Caption of every final price |
| "Coberturas" / "Beneficios" | Headings of a plan's lists |
| "Cargando planes…" | Loading state |
| "No pudimos cargar los planes. Intenta de nuevo." | Error state (with the existing "Reintentar") |
| "No hay planes disponibles para tu país en este momento." | Empty state |
| "Elige un plan para continuar." | "Continuar" with no chosen plan |

"Continuar", "Atrás" and "Reintentar" already exist (US-01 §8.1).

## 9. Non-functional requirements

- **Accessibility (Assessment: "The wizard can be completed using only the keyboard, and fields
  have accessible labels"):** native radio semantics, visible focus, focus on the heading on
  arrival, errors announced once (AC-16, AC-17). WCAG 2.2 AA for step 2; screen reader pass at
  HC3.
- **Responsive (Assessment: "Works on mobile and desktop"):** 320–1440 CSS px with no horizontal
  scroll; one column on narrow screens; targets ≥ 24 × 24 CSS px (AC-18, manual).
- **Multi-country (Assessment: "The same application and the same build serve Colombia and
  Chile"; "Content differentiated by country without duplicating the app"):** no plan, price,
  currency, symbol or locale literal per country in front-end code; currency and locale come from
  the `country` entry.
- **Content-driven (Assessment: "form and plans 100% configurable from Strapi"):** BR-06, AC-12.
- **Security / privacy (Assessment: "No Strapi token with write permissions may reach the
  browser. Public role permissions minimal and justified"):** one added public permission,
  justified in §7.5; reads through the GET-only proxy; drafts never anonymous (AC-19). The price
  is computed in the browser, so no step 1 value is sent (AC-19). Warnings carry keys, never
  values. Seed and test data fictitious ("Use fictitious data only.", Assessment).
- **Performance:** one plans request per page load with components populated; no refetch on
  selection; the price rule is a synchronous pure function.
- **Testing (Assessment: "Unit tests for the relevant logic and at least one e2e test of the
  full flow for one country"):** the price rule, the formatter, the parser and the store are unit
  tested; the CO full-flow e2e is started here (US-02-Q-04).
- **Language:** end-user copy Spanish; code, logs and docs English.

## 10. ADRs

- **Referenced (accepted, binding):**
  1. ADR-0001 — `plan` gets a required `manyToOne` `country` relation; `strictRelations`; step 2
     route `/:country/planes` with `wizardStepGuard`; step 3 route `/:country/resumen`; focus on
     the arriving step's heading. Used by: BR-01, BR-02, §7.1, AC-15, AC-16.
  2. ADR-0002 (amended by ADR-0005) — public role adds `api::plan.plan.find`, proxy allow-list
     adds `/api/plans` (both anticipated by ADR-0002 for US-02), published-only reads via
     `publishedOnlyConfig()` (implementation note in `adr/README.md`), `no-store`; e2e token gets
     `find` on each relation target (ADR-0005). Used by: BR-06, §7.5, AC-12, AC-19.
  3. ADR-0003 — `plan` in the wizard state as an identifier only; plans and prices not stored;
     cleared on country switch and after payment. Used by: BR-07, §7.4, AC-13, AC-14.
  4. ADR-0006 — the country's number locale is `localeTag` on the wire, `locale` in the front
     end; typed attributes, no free JSON. Used by: BR-03, §7.1.
  5. ADR-0004 applies to the step 1 form only; step 2 has no Strapi-driven form.
- **Needed (for the architect):**
  1. **Simulated price rule** (US-02-Q-01): options at least (a) fixed rule in front-end code,
     (b) rule factors as per-country content in Strapi, (c) a factor per plan; inputs, formula,
     rounding and integer arithmetic, fallback for missing inputs, clock, and reuse by US-03.
     Proposed default in §7.6.
  2. **Candidate** — summary route and step 3 guard registered by US-02 (US-02-Q-03): ADR-0001's
     route table assigns the step 3 guard to US-03. The architect decides whether an amendment
     to ADR-0001 or an implementation note in `adr/README.md` records it.

## 11. Test mapping

Planned locations follow CLAUDE.md §6; the test-engineer may adjust unit and component paths.
E2E files are subject to US-02-Q-04 (proposed default below). Short names:
`plan.spec.ts` = `frontend/src/app/shared/plan.spec.ts` (boundary parser);
`price-rules.spec.ts` = `frontend/src/app/shared/price-rules.spec.ts`;
`money-format.spec.ts` = `frontend/src/app/shared/money-format.spec.ts`;
`quote-store.spec.ts` = `frontend/src/app/core/quote-store.spec.ts`;
`summary-step-guard.spec.ts` = `frontend/src/app/core/summary-step-guard.spec.ts`;
`plan-list-page.spec.ts` = `frontend/src/app/features/plan-list/plan-list-page.spec.ts`;
`full-flow-co` = `frontend/e2e/us-01-03-full-flow-co.spec.ts`;
`plans-cl-content` = `frontend/e2e/us-02-plans-cl-content.spec.ts`.

| E2E file (proposed, US-02-Q-04) | ACs |
|---|---|
| `full-flow-co` | US-02-AC-01 (CO), AC-03, AC-05 (continue without a plan), AC-07 (CO), AC-13, AC-16, AC-19 (first scenario); US-01 hand-over: US-01-AC-04, US-01-AC-18, US-01-AC-20, US-01-AC-21 (first scenario), US-01-AC-24 (focus on the step 2 heading) |
| `plans-cl-content` | US-02-AC-01 (CL), AC-02, AC-06 (CL rendering), AC-07 (CL), AC-08 (seeded rows), AC-12, AC-19 (draft and write scenarios, Node process, no browser) |

E2E tests pin the browser clock to 2026-11-21 so the prices stay stable.

| AC | Level | Planned test location |
|---|---|---|
| US-02-AC-01 | e2e (CO, CL) + unit (sorting) | `full-flow-co`, `plans-cl-content`, `plan.spec.ts` |
| US-02-AC-02 | component + e2e | `plan-list-page.spec.ts`, `plans-cl-content` |
| US-02-AC-03 | component + e2e | `plan-list-page.spec.ts`, `full-flow-co` |
| US-02-AC-04 | component (mocked empty response and all-malformed response) | `plan-list-page.spec.ts` |
| US-02-AC-05 | component + e2e (continue without a plan) | `plan-list-page.spec.ts`, `full-flow-co` |
| US-02-AC-06 | unit (every row) + e2e (rendered CL price) | `money-format.spec.ts`, `plans-cl-content` |
| US-02-AC-07 | unit (pinned clock, every row) + e2e (seed prices) | `price-rules.spec.ts`, `full-flow-co`, `plans-cl-content` |
| US-02-AC-08 | unit (parser drops inactive) + e2e (seeded draft-only and inactive plans) + manual (published version with a pending draft, in the Strapi admin at HC3) | `plan.spec.ts`, `plans-cl-content`; HC3 check |
| US-02-AC-09 | unit (every row) | `plan.spec.ts` |
| US-02-AC-10 | unit (recommended resolution) + component | `plan.spec.ts`, `plan-list-page.spec.ts` |
| US-02-AC-11 | component (mocked HTTP, fake timers) | `plan-list-page.spec.ts` |
| US-02-AC-12 | e2e (writes from the Node process, ADR-0005 scope) | `plans-cl-content`; plus HC3 check in the Strapi admin |
| US-02-AC-13 | unit (store) + e2e | `quote-store.spec.ts`, `full-flow-co` |
| US-02-AC-14 | unit (store pruning) + component | `quote-store.spec.ts`, `plan-list-page.spec.ts` |
| US-02-AC-15 | unit (guard; subject to US-02-Q-03) | `summary-step-guard.spec.ts` |
| US-02-AC-16 | e2e (keyboard only) | `full-flow-co`; plus HC3 check |
| US-02-AC-17 | component (roles, names, descriptions, checked state, alert) | `plan-list-page.spec.ts`; plus screen reader check at HC3 |
| US-02-AC-18 | manual (HC3 screenshots at 360 × 740 and 1280 × 800) | None automated |
| US-02-AC-19 | e2e (network inspection; API requests from Node) + backend (router guard, existing) | `full-flow-co`, `plans-cl-content`, `backend/tests/published-only-routes.test.ts` |

Backend tests (no AC of their own, they support BR-01 and BR-06): `plan` `key` unique per
country, publishing a `plan` without `country` rejected (extend
`backend/tests/form-field-country-rules.test.ts` or add `plan-country-rules.test.ts`).

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-02` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.1 | First version from story.md, the Assessment requirements, US-01 spec v0.5 and ADR-0001..0006. 7 BR, 19 AC (4 original, 15 derived), 20 gaps (4 block HC1: Q-01 price rule [ADR], Q-02 plan currency, Q-03 summary route, Q-04 e2e files), 1 ADR needed plus 1 candidate. Seed annex [seed-plans.md](seed-plans.md). |
| 2026-11-21 | Felipe Sabogal (human) | HC1 | Answers recorded (round 1) | Q-01: decided by an ADR with real alternatives (proposed rule as the starting point); Q-02, Q-03, Q-04 OK; all other defaults accepted. Spec approval pending the human's explicit decision. (Translated from the Spanish original in the session log.) |
| 2026-11-21 | Felipe Sabogal (human) | HC1 | **Approved** (v0.1) | Approved as is; the answers recorded above need no text change (Q-01 goes to ADR-0007). |
| 2026-11-21 | Felipe Sabogal (human) | HC3 | Draft rule confirmed (US-02-R2-F01) | §7.1 and AC-09 note updated by the spec-writer; no behaviour change |
| 2026-11-21 | spec-writer (Claude Opus 5.5) | Cross-reference (US-04) | Pointer only; this spec is not rewritten | [US-04 spec](../US-04/spec.md) v0.2 (Approved at HC1, 2026-11-21; US-04-Q-18, Q-21) supersedes **AC-18**'s target size of 24 × 24 CSS px with 44 × 44 for every interactive element (radio input together with its label), automated in US-04-AC-18 (US-04-BR-11). Plans stay native radios; the "Recomendado" and "Seleccionado" markers are kept and restyled (US-04 §8, §8.1). Test titles keep their US-02 AC IDs. Version and status of this spec unchanged. |
