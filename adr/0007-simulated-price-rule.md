---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (chose option A at HC2, 2026-11-21; acceptance recorded by the orchestrator), architect subagent (proposal)
consulted: specs/US-02/spec.md v0.1 (Approved; §6 US-02-Q-01, §7.6, §10), specs/US-02/seed-plans.md, specs/US-01/spec.md v0.5 §7.3 and US-01-BR-04, ADR-0001..0006, installed packages @strapi/core, @strapi/utils, @strapi/database 5.63.0 and @angular/router, @angular/core 22.3.0 (versions read from each package.json under backend/ and frontend/node_modules), Strapi REST docs (populate), MDN (Number.MAX_SAFE_INTEGER)
informed: all agents via CLAUDE.md precedence; US-03 (reuses the rule)
---

# ADR-0007: Simulated price rule: formula and factors fixed in one pure front-end function

## Context and Problem Statement

Step 2 shows each plan's **final price**: its base price adjusted by "a simulated rule based on
the step 1 data. The rule is documented." (US-02 story, US-02-BR-04). The summary of US-03 must
show the same price. Spec §7.6 proposes a starting rule (a driver-age factor and a vehicle-age
factor, integer arithmetic, round half up, neutral factor with a warning when an input is
missing). At HC1 the human answered US-02-Q-01: "decided by an ADR that weighs **real
alternatives** (for example, factors configurable in Strapi); the proposed rule is the starting
point" (Felipe Sabogal, 2026-11-21). We must decide where the rule's formula and its numbers live,
where it runs, how it rounds, which "today" it uses, and how US-03 reuses it. Story: US-02
(`specs/US-02/spec.md` §4 BR-04, §5 AC-07, §7.6); consumer: US-03.

## Decision Drivers

- D1. "Price calculation may be simulated: a real rating engine is not expected." and the rule
  "is documented" (source: Assessment; US-02-BR-04). Simplicity is allowed; documentation is
  required.
- D2. "The business team, which is not technical, must be able to change the form fields and the
  offered plans from Strapi without requesting a deployment."; evaluated as "form and plans 100%
  configurable from Strapi" (source: Assessment; US-02-BR-06).
- D3. "Content differentiated by country without duplicating the app"; "Each country has its own
  regulations, identity documents, currency, coverages and copy" (source: Assessment; ADR-0001 D3,
  D4).
- D4. Step 1 values never leave the browser (source: ADR-0002, ADR-0003, US-02-BR-04,
  US-02-AC-19). The rule runs in the front end.
- D5. Public permissions minimal and justified; published content only; no write token in the
  browser (source: Assessment, security; ADR-0002 as amended by ADR-0005).
- D6. Keep bespoke backend code to a minimum (source: human decision recorded as D3 in ADR-0005 and
  D4 in ADR-0006).
- D7. Deterministic, exact prices in whole units: COP and CLP have no decimals; the result is an
  integer ≥ 1 (source: US-02-BR-03, US-02-BR-04, US-02-Q-06, US-02-Q-07).
- D8. "Today" comes from the injectable clock of US-01-Q-06, so tests pin it (source: US-01 spec
  glossary; `frontend/src/app/core/clock.ts`, `CLOCK`).
- D9. Malformed content is dropped at the boundary with a warning that names keys, never values,
  and the page keeps working (source: US-01-Q-18, US-02-Q-18, CLAUDE.md §3).
- D10. US-03 shows the same final price the person chose (source: spec §7.4 "For US-03").
- D11. Do not destabilise US-01, which is Ready for QA (source: `specs/US-01/tasks.md`).
- D12. Scope and pace of US-02: the approved spec v0.1 describes a fixed rule; anything else
  reopens the spec (source: human decision at HC2, Felipe Sabogal, 2026-11-21).

## Considered Options

1. **A. Fixed rule in a pure front-end function**: the §7.6 formula *and* its factors are typed
   constants in `price-rules.ts`, the same for both countries.
2. **B. Factor tables as per-country content on `country`**: the formula stays in a pure
   front-end function; the two factor tables (driver age, vehicle age) are repeatable components
   on the existing `country` content type, edited in Strapi.
3. **C. Factor tables in a separate `pricing-rule` collection type** with a required `country`
   relation, its own draft & publish, router, permission and proxy path.
4. **D. Factor tables per plan**: the same two repeatable components on each `plan`, so each plan
   has its own sensitivity to age and vehicle age (a constant per-plan multiplier is discussed
   under this option).
5. **E. Hybrid: code defaults with optional per-country overrides in Strapi**: option A's
   constants apply unless the country entry carries tables.

Not considered further, because they contradict an accepted ADR: computing the price in a custom
Strapi endpoint that receives `birthDate` and `vehicleYear` (sends step 1 values to a server:
ADR-0002, ADR-0003, US-02-BR-04); a free JSON or expression attribute holding the rule (ADR-0006
and the `strapi-content-modeling` skill forbid free JSON for editor-facing configuration).

## Decision Outcome

Chosen option: **"A. Fixed rule in a pure front-end function"** (human decision at HC2, Felipe
Sabogal, 2026-11-21), because it meets the assessment's requirement for a simulated, documented
rule completely (D1) with the smallest change: one pure function that runs in the browser (D4),
is exact and deterministic (D7), takes "today" as a parameter (D8), and is reused as is by US-03
(D10). It adds no content type, attribute, request, permission or backend code (D5, D6), leaves
the `country` type and the US-01 code untouched (D11), and is exactly what the approved spec v0.1
describes (D12). The cost, that the business cannot retune the factors without a deployment and
that both countries share them (D2, D3), is accepted; option B is the upgrade path.

### What is decided

**One pure function** (`frontend/src/app/shared/price-rules.ts`, no Angular import, no
`new Date()`):

```
calculateFinalPrice(basePrice, step1Output, today) →
  driverAge     = completed years between step1Output.values.birthDate and today
                  (same reckoning as US-01-BR-04: 29 Feb birthdays turn on 1 Mar in non-leap years)
  vehicleAge    = max(0, year(today) − step1Output.values.vehicleYear)
  driverPct     = factorPercent of the DRIVER_AGE_FACTORS band containing driverAge, else 100
  vehiclePct    = factorPercent of the VEHICLE_AGE_FACTORS band containing vehicleAge, else 100
  final         = max(1, floor((basePrice × driverPct × vehiclePct + 5000) / 10000))
```

**Factors: typed constants in the same file** (spec §7.6, expressed as whole percentages):

| `DRIVER_AGE_FACTORS` (completed years) | `factorPercent` | `VEHICLE_AGE_FACTORS` (years) | `factorPercent` |
|---|---|---|---|
| 18–25 | 120 | 0–5 | 110 |
| 26–60 | 100 | 6–10 | 100 |
| 61 and older | 110 | 11 and older | 90 |

- Each table is a `readonly` array of `{ fromYears: number; toYears: number | null; factorPercent:
  number }` (`toYears: null` means "and older"), sorted, non-overlapping, and covered by a unit
  test that asserts exactly these rows. The names `DRIVER_AGE_FACTORS` and `VEHICLE_AGE_FACTORS`
  follow CLAUDE.md §6 (constants in `UPPER_SNAKE_CASE`, in the file that owns them). The same
  constants apply to every country; no country code appears in the function.
- **Integer arithmetic.** Factors are integer **percentages** (`120` means ×1.20, `100` is
  neutral). With `basePrice ≤ 2 147 483 647` (US-02-BR-01) and the largest product of factors
  `120 × 110 = 13 200`, the numerator stays below about 2.84 × 10¹³, far below
  `Number.MAX_SAFE_INTEGER` (9 007 199 254 740 991; MDN: "'Safe' in this context refers to the
  ability to represent integers exactly and to compare them correctly"), so every step is exact
  in a JavaScript `number`. No floating-point factor is ever multiplied.
- **Rounding.** `floor((n + 5000) / 10000)` is round half up for the positive integers involved
  (49.5 → 50, 59.4 → 59; US-02-AC-07). The result is in whole units of the country's currency; it
  is never rounded to a currency-specific step (COP and CLP have no decimals, US-02-Q-07).
  Formatting stays `Intl.NumberFormat` with no fraction digits (US-02-BR-03).
- **Clock.** `today` is a parameter. Callers pass the value of the `CLOCK` injection token
  (`frontend/src/app/core/clock.ts`, `InjectionToken<() => Date>`, US-01-Q-06). Tests pin it.
- **Missing inputs.** `birthDate` or `vehicleYear` absent from the typed step 1 output (an editor
  removed the reserved field) or `null` (an empty optional field) → that factor is `100` and a
  `console.warn` names the key (`birthDate`, `vehicleYear`), never the value (US-02-BR-04,
  US-01-Q-08).
- **No band matches** (only possible for a driver under 18, whom US-01-BR-04 and the step guard
  already keep out of step 2) → that factor is `100` and a `console.warn` names the table, never
  the age. This is defensive; it changes no AC.
- The function is synchronous and has no side effects other than the warnings.
- **Security.** Nothing changes: no request is added, no permission, router or proxy rule is
  touched, and no step 1 value is sent (US-02-AC-19).
- **Reuse by US-03.** US-03 imports the same `calculateFinalPrice`, the typed step 1 output
  (re-derived as in US-02-Q-17) and the same `CLOCK`. The summary shows the price step 2 showed,
  unless "today" or the plan's published base price changed between the two computations (a
  birthday at midnight, or an editor publishing a new base price before a reload); that is the
  intended behaviour of a recomputed, never-stored price (ADR-0003, US-02-BR-06).

### Consequences

- Good, because it is the smallest change that meets D1: one pure, exhaustively unit-testable
  function, with no schema, seed, request, parser or backend code (D6, D7).
- Good, because the documented rule is exactly the running rule: the numbers are in this ADR, in
  spec §7.6 and in one file, and cannot drift through content edits.
- Good, because nothing can be misconfigured in Strapi, and step 2 has no new failure mode.
- Good, because US-01 is untouched: no change to `country`, its request or its parser (D11), and
  no Strapi volume reset is needed.
- Good, because the approved spec v0.1 needs no revision, so step 3 (tests) can start (D12).
- Bad, because changing a factor needs a code change, a review and a deployment (against D2) —
  mitigation: the factors are two small typed tables in one file; option B is the documented
  upgrade path, and the function's signature already isolates the tables, so moving them to
  content later changes the caller, not the formula.
- Bad, because Colombia and Chile get the same adjustment (against D3) — mitigation: the base
  prices, which dominate the final price, are already per country and content (US-02-BR-01); a
  per-country branch in code is forbidden (US-01-BR-07, ADR-0001), so per-country factors mean
  option B, not a code change.
- Neutral: pricing numbers in front-end code are not plan content (names, prices, coverages,
  benefits), so US-02-BR-06 ("No plan name, price, coverage or benefit exists in front-end code")
  still holds.

### Strongest argument against

Option B makes the factors content, per country, edited in Strapi and live on the next reload,
with no new permission, router, proxy path or backend code, because `country` is already public,
published-only and allow-listed. That is precisely what the assessment's evaluation criterion
rewards: "form and plans 100% configurable from Strapi" and "Content differentiated by country".
Under option A, the price a Colombian or Chilean visitor sees depends on numbers that only a
developer can change, and they are the same in both countries. A business team that wants to
make young drivers cheaper in Chile only, or soften the surcharge on old cars after a campaign,
must ask for a deployment, which is the situation the business context of the assessment
describes as the problem to solve.

**Why we accept it:** it is the human's decision for scope and pace (HC2, 2026-11-21). The
assessment explicitly allows a simulated price ("a real rating engine is not expected"), and the
approved spec v0.1 already describes this rule, so US-02 proceeds to tests without a spec
revision. Option A avoids a schema change on `country` (which US-01 depends on), a second request
with its own failure mode, a band parser with overlap and gap rules, a seed that cannot backfill
existing databases (a volume reset), and the quiet failure mode of a misconfigured band. The rule
stays fully documented in one place. Option B remains the upgrade path (see *Revisit when*).

### Confirmation

- Unit tests `price-rules.spec.ts` (clock pinned to 2026-11-21): every US-02-AC-07 row; the two
  tables equal the §7.6 rows exactly; integer exactness at the bound (`basePrice` 2 147 483 647
  with the largest factors); result ≥ 1; missing and `null` inputs warn with the key and without
  the value.
- E2E (`full-flow-co`, `plans-cl-content`): the seed prices of US-02-AC-07 with the browser clock
  pinned; US-02-AC-13 recomputation after a changed vehicle year.
- Review checklist: `price-rules.ts` has no Angular import and no `new Date()`; factor literals
  appear only in `price-rules.ts` and its tests; no country code or per-country branch in the
  rule; US-03 imports `calculateFinalPrice` rather than copying it.

## Pros and Cons of the Options

### A. Fixed rule in a pure front-end function (chosen)

`price-rules.ts` holds both the formula and the §7.6 factors; US-03 imports it.

- Good, because it is the smallest change: one pure function, no schema, seed, request or parser.
- Good, because nothing can be misconfigured, and the documented rule is exactly the running rule
  (D1).
- Good, because it has no new failure mode on step 2, and US-01 is untouched (D11).
- Good, because it matches the approved spec v0.1 (D12).
- Bad, because changing a factor needs a code change and a deployment (against D2).
- Bad, because both countries get the same adjustment; differentiating them would need a
  per-country branch in code, which US-01-BR-07 and ADR-0001 forbid (against D3).

### B. Factor tables as per-country content on `country`

New component `pricing.age-band` (`fromYears` integer `min: 0`, `toYears` optional integer,
`factorPercent` integer `min: 1`, `max: 1000`); `country` gains repeatable `driverAgeFactors` and
`vehicleAgeFactors`; step 2 loads them with a separate `GET /api/countries?filters[code][$eq]=…`
request that populates the two components; the formula is the same as in A.

- Good, because the numbers are content per country, editable without a deployment (D2, D3).
- Good, because it reuses the country's existing public `find`, `publishedOnlyConfig()` router
  and proxy path: components need no permission of their own (verified below) (D5, D6).
- Good, because the formula stays a documented pure function (D1, D7).
- Bad, because Strapi cannot validate band consistency (overlaps, gaps, `toYears < fromYears`;
  there is no cross-item validation of repeatable components, verified below), so the front end
  needs a band parser (D9), and a misconfigured band fails quietly as a neutral price.
- Bad, because the tables share draft & publish and the editing screen with the country entry
  that US-01 depends on.
- Bad, because step 2 makes a second request with its own failure mode, and the create-only seed
  cannot add the tables to an existing database (a volume reset).
- Bad, because the approved spec would need a revision (scope, contract, BR-04, BR-06, AC-11, §9).

### C. Separate `pricing-rule` collection type

One document per country with a required `country` relation and the same two repeatable
components.

- Good, because pricing has its own draft & publish, history and admin entry, apart from the
  country's identity attributes.
- Good, because its permission could later differ from `country`'s.
- Bad, because it adds a public permission `api::pricing-rule.pricing-rule.find`, a router with
  `publishedOnlyConfig()`, a proxy allow-list entry, a bootstrap reconciliation change, and
  `country.find` for the relation filter (against D5, D6).
- Bad, because "exactly one rule per country" is not expressible in Strapi (`unique` is not
  scoped by relation, ADR-0001): it needs a Document Service middleware like the field-key one, or
  a front-end "first one wins" rule (against D6).

### D. Factor tables per plan

The two components on each `plan`, read in the plans request.

- Good, because one request carries plans and factors: no second request and no new failure
  mode.
- Good, because a plan can price risk differently (a young-driver plan with a gentler age factor).
- Bad, because editors must repeat and keep in step the same tables on every plan of every
  country (six tables per country with the seed); a forgotten plan prices differently with no
  visible error.
- Bad, because it is more than the story asks: the rule is "based on the step 1 data", not per
  plan.
- Variant, a **constant per-plan multiplier**: it does not use step 1 data, so it is equivalent
  to editing `basePrice` and adds nothing to the rule.

### E. Hybrid: code defaults with optional Strapi overrides

- Good, because a fresh or misconfigured country still gets the documented factors instead of a
  neutral price.
- Bad, because there are two sources of truth: an editor cannot tell from the admin which numbers
  apply, and emptying a table brings back hidden code values instead of "no adjustment".
- Bad, because it carries all the Strapi-side cost of B plus the code tables of A.

## Spec impact

None. The approved spec v0.1 already describes option A (§7.6, US-02-BR-04, US-02-AC-07,
§11 `price-rules.spec.ts`), and its out-of-scope line "Price rule parameters edited in Strapi,
unless the ADR for US-02-Q-01 chooses that option" stays as written. Two details this ADR makes
precise do not change any AC: factors are written as whole percentages (120 for 1.20), which is
the "integer arithmetic" of §7.6; and the defensive neutral factor when no band matches is
unreachable through the UI. At the next spec revision, the header's *Related ADRs* can name
ADR-0007 instead of "Needed"; no revision is required for that.

## More Information

- Verified in the installed packages (versions from each `package.json`: `@strapi/core`,
  `@strapi/utils`, `@strapi/database`, `@strapi/strapi` 5.63.0 in `backend/node_modules`;
  `@angular/core`, `@angular/router` 22.3.0 in `frontend/node_modules`), on 2026-11-21. The Strapi
  facts support the assessment of options B to D:
  - Components need no read permission of their own: `@strapi/utils@5.63.0`
    `dist/validate/visitors/throw-restricted-relations.js` returns early unless
    `attribute.type === 'relation'`, and checks `<target>.find` only for relations.
  - A component can be populated with `fields`: `@strapi/utils@5.63.0`
    `dist/convert-query-params.js:367-385` resolves `attribute.type === 'component'` to the
    component schema and passes the sub-populate to `convertNestedPopulate`, which converts
    `fields` (lines 395-416).
  - Integer validation: `@strapi/core@5.63.0` `dist/services/entity-validator/validators.js:322-328`
    (`yup.number().integer()`); `min` is skipped for drafts (lines 75-78), `max` always applies
    (lines 81-84).
  - Repeatable components: `@strapi/core@5.63.0` `dist/services/entity-validator/index.js:35-44`
    and `92-110`: `min`/`max` on the list apply only when not a draft, and `min` only when the
    attribute is required or the list is non-empty. There is no cross-item validation.
  - `integer` is read back as a JavaScript number: `@strapi/database@5.63.0`
    `dist/fields/index.js:25` maps `integer` to the number field.
  - `CLOCK` exists as `InjectionToken<() => Date>` in `frontend/src/app/core/clock.ts`.
- Strapi REST docs, "Populate and select" (https://docs.strapi.io/cms/api/rest/populate-select,
  read 2026-11-21): "The REST API by default does not populate any relations, media fields,
  components, or dynamic zones."
- MDN, `Number.MAX_SAFE_INTEGER`
  (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER,
  read 2026-11-21): value 9 007 199 254 740 991.
- Related ADRs: ADR-0001 (where country-level attributes would live under option B), ADR-0002 and
  ADR-0005 (unchanged), ADR-0003 (prices never stored), ADR-0006 (typed attributes, no free JSON).
- Revisit when: the business needs to change the factors without a deployment, or needs different
  factors per country. The upgrade path is **option B** (per-country `pricing.age-band` tables on
  `country`), keeping `calculateFinalPrice`'s formula, rounding and fallbacks and passing the
  tables in as a parameter. Also revisit if plans need different sensitivities (option D), a rule
  input other than age and vehicle age is needed, or a real rating engine replaces the
  simulation.
