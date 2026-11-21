# US-01 — Policyholder and vehicle data form · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (verbatim, not edited) |
| Status | Approved |
| Version | 0.5 |
| Author | spec-writer subagent (Claude Opus 5.5) |
| Approved by | v0.2: Felipe Sabogal, 2026-11-20 (HC1 round 2). v0.3: Felipe Sabogal, 2026-11-20 (HC1 round 3). v0.4: Felipe Sabogal, 2026-11-21 (HC1 round 4). v0.5: Felipe Sabogal, 2026-11-21 (HC1 round 5). |
| Related ADRs | [ADR-0001](../../adr/0001-multi-country-content-strategy.md) (multi-country content and routes), [ADR-0002](../../adr/0002-strapi-access-and-security.md) (Strapi access and security), [ADR-0003](../../adr/0003-wizard-state-persistence.md) (wizard state persistence), [ADR-0004](../../adr/0004-forms-library.md) (forms library). All Accepted at HC2, 2026-11-20 (see §10). [ADR-0006](../../adr/0006-strapi-physical-model-adjustments.md) (amends ADR-0001's physical model: structured rule attributes and the country `localeTag` attribute), Accepted 2026-11-21 at HC1 round 4 (see §10). |

Sources cited in this spec:

- **Story**: [story.md](story.md).
- **Assessment**: the requirements that apply to every story, quoted verbatim from the assessment
  PDF by the orchestrator (scope rules, technical requirements, business context). They are not
  in the repository yet.
- **Skill**: the project skills `dynamic-form-fields` (FieldConfig contract v0) and
  `strapi-content-modeling`. This spec refines that contract; the differences are listed in §7.4.
- **ADR-0001..0004**: the accepted ADRs (precedence level 2, binding since HC2). Since v0.3 the
  spec cites them by number.
- **Review R1**: [reviews/US-01-review-R1.md](../../reviews/US-01-review-R1.md), code review
  round 1 (2026-11-21), and the human decisions on it recorded in `tasks.md`, *Gate history*,
  row "6 Review (round 1)". Source of the v0.4 changes (findings US-01-R1-F02, F04, F05, F06).
- **Review R3**: [reviews/US-01-review-R3.md](../../reviews/US-01-review-R3.md), code review
  round 3 (2026-11-21), and the human decision on it recorded in `tasks.md`, *Gate history*,
  row "6 Review (round 3)". Source of the v0.5 change (finding US-01-R3-F01).

## 1. Summary

Step 1 of the quote wizard: a person in Colombia or Chile enters their own data and their
vehicle's data in a form whose fields, order, options, validations and Spanish copy all come from
Strapi, per country. The business team can add, remove, reorder or change fields in Strapi and
see the change on the next reload, with no code change and no deployment. The step blocks
progress while any field is invalid (vehicle year range and legal age included), and the data
entered is kept when the person goes to step 2 and comes back. The same build serves both
countries.

## 2. Scope

**In scope**

- Resolving the country context for step 1 from the URL and the published country list loaded
  from Strapi (ADR-0001; CO and CL in the seed), the unknown-country state, and the state shown
  when the country list cannot be loaded.
- Loading the published field configuration of that country from Strapi, validating it at the
  boundary, ordering it, and rendering it as an accessible form with the five field types
  `text`, `number`, `select`, `date`, `checkbox`.
- Validation: required, length, numeric bounds, pattern, legal age (`minAge`), vehicle year
  range (`yearRange`) and, subject to US-01-Q-09, the Chilean RUT check digit.
- Showing the configured error message next to the field, and blocking "Continuar" while the
  form is invalid.
- Navigating to the step 2 route on a valid "Continuar", and keeping the step 1 data in the
  wizard state so that it is shown again when the user returns to step 1 (in-app "Atrás" and
  browser back), surviving a reload in the same tab (ADR-0003). In US-01 this is verified with
  unit tests of the store and component tests; the end-to-end part is completed in US-02
  (US-01-Q-19, §11).
- A guard that keeps step 2 unreachable while step 1 is incomplete or invalid (AC-19), and the
  step 2 route it protects, without a page of its own (US-01-Q-27).
- Loading, error and retry states for the content request.
- The Strapi content types for countries and form fields and the idempotent seed for CO and CL
  (§7, ADR-0001).
- The Strapi access rules (public role, published-only reads, CORS, bootstrap) and the
  same-origin read-only proxy through which the browser reaches the content API (ADR-0002).
- Keyboard-only completion, accessible labels and errors, mobile and desktop layouts.

**Out of scope**

- The plan list, price rule, summary, masking and payment (US-02 and US-03). This story only
  defines the step 1 output they consume (§7.3).
- Any step 2 page, provisional or final, including its heading and its "Atrás" button (US-02).
  No placeholder step 2 is built (US-01-Q-19 rejected at HC1).
- Dependent selects (for example, models filtered by make, or cities filtered by region). The
  vehicle model is free text (US-01-Q-21).
- Cross-field validation (for example, a document-number pattern that depends on the document
  type) (US-01-Q-11).
- Field types other than the five in BR-01 (email, phone, radio, textarea, file).
- Grouping fields into sections or sub-steps (US-01-Q-25).
- Normalising or reformatting values (upper-casing plates, adding dots to a RUT). Values are
  stored trimmed, as typed (US-01-Q-10).
- Countries other than CO and CL, and languages other than Spanish for end-user copy.
- Sending step 1 data to any server. No database (Assessment).
- Editor-side tooling in Strapi (preview, validation of the editor's own input beyond the schema).

## 3. Glossary

| Term | Meaning in this project |
|---|---|
| Country context | The country for which the wizard is running: an ISO 3166-1 alpha-2 code that matches a published `country` entry in Strapi (`CO` and `CL` in the seed). It is resolved from the URL path segment (`/co/…`, `/cl/…`) as decided in ADR-0001 (US-01-Q-01). |
| Field configuration | One published Strapi entry describing one form field for one country (§7.1). |
| Field key | Stable machine name of a field, unique per country (for example `documentNumber`). Used to store values and to pass them to US-02 and US-03. Never shown to the user. |
| Reserved key | A field key that other stories rely on (§7.3, US-01-Q-08). |
| Editor | A member of the business team who edits content in the Strapi admin. Non-technical. |
| Published | A Strapi document whose published version exists. Drafts are never visible to end users. |
| Wizard | The three-step flow: step 1 data (this story), step 2 plans (US-02), step 3 summary and payment (US-03). |
| Wizard state | The step 1 values (and later the chosen plan) held on the front end between steps, in `sessionStorage` for one country, as decided in ADR-0003 (US-01-Q-15). It holds the raw editing values; the typed step 1 output (§7.3) is produced from them only on a valid "Continuar". |
| Boundary validation | Checking the Strapi response against the expected contract before using it. Invalid items are dropped and logged without user data. |
| Wire shape / logical shape | The *wire shape* is the JSON that the Strapi 5 REST API returns, with Strapi's attribute names (for example a rule's `pattern`, a country's `localeTag`). The *logical shape* is the typed model the front-end boundary parser produces from it (§7.1 `ValidationRule`, the country entry of §7.5). The mapping between the two is stated in §7.5 (added in v0.4). |
| Anonymous request | Any request to the content API that Strapi does not authenticate with a valid token: no `Authorization` header, a scheme other than `Bearer` (`foo`, `Basic …`), `Bearer` with no token, or an invalid token, on any letter case of the `/api` path, on Strapi's own port or through the proxy (added in v0.4, US-01-R1-F02). |
| Today | The current local calendar date of the browser, read from an injectable clock (US-01-Q-06). |
| Línea (CO) | Colombian term for the vehicle model name (for example "Spark GT"). In Colombia "modelo" usually means the model **year**, so the CO seed labels follow local usage (§7.2). |
| Placa / Patente | Vehicle licence plate in Colombia / Chile. |
| RUT | Chilean national tax and identity number, with a check digit (`0–9` or `K`). |

## 4. Business rules

| ID | Original (source) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-01-BR-01 | Story: "Each field is configured in Strapi with: label, type (text, number, select, date, checkbox), required flag, validations, help text, error message, order and country." | Each field configuration has: `key` (required, unique per country, see §7.1), `label` (required, non-empty), `type` (exactly one of `text`, `number`, `select`, `date`, `checkbox`), `isRequired` (boolean), `rules` (zero or more structured validation rules of the kinds in §7.1), `helpText` (optional), `errorMessage` (required, field level, used for any failure without a rule-specific message, US-01-Q-04), optional rule-specific messages, `sortOrder` (integer) and country. Only **published** configurations of the current country are rendered, sorted by `sortOrder` ascending; ties are broken by `key` ascending. A configuration that fails boundary validation is not rendered (US-01-Q-18). An empty optional field passes every rule; rules run only on non-empty values (US-01-Q-26). A `number` or `date` input whose text the browser cannot read (`validity.badInput`; for example `1e` in a number, or a partly cleared date) is not an empty optional field: it is invalid whether it is required or optional (v0.5, US-01-R3-F01; AC-09). | US-01-AC-01, US-01-AC-02, US-01-AC-08, US-01-AC-09, US-01-AC-10, US-01-AC-14, US-01-AC-16 |
| US-01-BR-02 | Story: "Select fields (for example, make or city) get their options from Strapi." | A `select` field shows exactly the options configured for it in Strapi, each with `value` and `label`, in `sortOrder` ascending. No option is pre-selected; the first entry is a non-selectable prompt "Selecciona una opción" (code-owned copy, US-01-Q-14). A `select` with zero options is invalid configuration and is not rendered. The stored value is the option `value`, not its label. | US-01-AC-07, US-01-AC-14, US-01-AC-23 |
| US-01-BR-03 | Story: "The vehicle year cannot be later than next year or more than 20 years old." | With `Y` = the calendar year of *today*, a vehicle year `v` is valid if and only if `v` is an integer and `Y − 20 ≤ v ≤ Y + 1` (both limits inclusive). On 2026-11-20 the valid range is 2006–2027. The limits 20 and 1 are parameters of the `yearRange` rule in the configuration (seeded as 20 and 1 for both countries), so the business can change them (US-01-Q-05). | US-01-AC-05 |
| US-01-BR-04 | Story: "The policyholder must be of legal age." | The birth date is valid if and only if the age in completed years on *today* is ≥ the configured `minAge` (seeded as 18 for CO and for CL). A person turns N on the anniversary of their birth date; for a 29 February birth date, in non-leap years the anniversary is 1 March (US-01-Q-07). Birth dates after today are invalid. | US-01-AC-06 |
| US-01-BR-05 | Story context: "In Colombia the identity document is usually the citizenship ID (cédula de ciudadanía) or foreigner ID (cédula de extranjería), and the vehicle is identified by its license plate (placa). In Chile the document is the RUT and the vehicle is identified by its license plate (patente)." | CO step 1 includes a document type select with options CC "Cédula de ciudadanía" and CE "Cédula de extranjería", a document number (digits only, 6–10) and a plate labelled "Placa" (3 letters + 3 digits). CL step 1 includes a document number labelled "RUT" (with or without dots and dash, check digit `0–9`/`K`, check digit verified per US-01-Q-09) and a plate labelled "Patente" (2 letters + 4 digits, or 4 letters + 2 digits). CL has no document type field. These are **seed content**, not code; the seed is summarised in §7.2 and listed in full in the annex [seed-fields.md](seed-fields.md) (US-01-Q-03). | US-01-AC-01, US-01-AC-11, US-01-AC-12 |
| US-01-BR-06 | Story context: "The business team wants to add, remove or reorder fields from Strapi without asking development for changes." Assessment: "Changing a form field or a plan in Strapi must be reflected in the app without changing code." | Publishing, unpublishing or editing a field configuration (including its order, options, rules and copy) is reflected in step 1 on the next full page load of the app, with no code change, build or deployment. No browser-side or proxy cache may delay this beyond that reload (US-01-Q-16). Unpublished (draft) changes are never shown, and no anonymous caller (glossary: any request Strapi does not authenticate, whatever its headers or path letter case) can read them, not even by asking the content API for `status=draft` (ADR-0002). | US-01-AC-03, US-01-AC-13, US-01-AC-23, US-01-AC-28 |
| US-01-BR-07 | Assessment: "The same application and the same build serve Colombia and Chile." Business context: "Each country has its own regulations, identity documents, currency, coverages and copy, so the content the app consumes changes by country." | One production build serves both countries. The supported countries are the published `country` entries in Strapi, loaded once per full page load (ADR-0001); no country code, country name or country list exists in front-end code. The country context selects which content is loaded; no country-specific branch, field list or copy exists in front-end code (wizard chrome copy excepted, US-01-Q-14; the complete list is §8.1). A country code that is not in the loaded list shows the unknown-country state and loads no form. If the country list cannot be loaded, the root chooser and the unknown-country page show a load error with "Reintentar", never "Este país no está disponible." (ADR-0001). Data entered in one country context is never shown in the other (US-01-Q-02). | US-01-AC-01, US-01-AC-17, US-01-AC-22 |
| US-01-BR-08 | Assessment: "Use a front-end strategy to persist the data; a database is not required." Story AC "Keep data when going back". | Step 1 values stay in the browser: they are held in the wizard state on the front end and never sent to Strapi or any other server. They survive moving between steps (in-app and browser navigation) and a reload in the same tab; they are kept in `sessionStorage` for one country and cleared when the tab closes, when another country's context is entered and after a successful payment (ADR-0003). The store keeps the raw editing values and writes them on every change, so a reload restores exactly what was typed, valid or not (ADR-0003, HC2). Step 1 hands its values to the next steps only through the wizard state, as the typed output of §7.3, which is produced only on a valid "Continuar". | US-01-AC-04, US-01-AC-18, US-01-AC-20, US-01-AC-21, US-01-AC-27 |

## 5. Acceptance criteria

Conventions for every scenario:

- Example values come from the seed (§7.2 and the annex [seed-fields.md](seed-fields.md)) and
  are fictitious.
- "Step 2" in a scenario means the step 2 route. Its page belongs to US-02 (US-01-Q-19,
  US-01-Q-27). Where a scenario needs that page, the note under it says what US-01 verifies and
  what is completed when US-02 exists.
- "In the context of Colombia/Chile" means the country context resolved from the URL path
  segment as decided in ADR-0001 (`/co/…`, `/cl/…`; step 1 at `/<country>/datos`, step 2 route
  at `/<country>/planes`). The scenarios do not depend on the mechanism.
- Where a scenario depends on *today*, the clock is pinned to the date given in the scenario.
- "Continuar" and "Atrás" are the step navigation buttons (code-owned copy, US-01-Q-14).

### US-01-AC-01 — Form configured by country

```gherkin
Scenario Outline: Form configured by country
  Given the seed field configurations for Colombia and for Chile are published in Strapi
  When I open the application in the context of <country>
  Then I see exactly these field labels, in this order: <labels>
  And I do not see any field configured only for the other country

  Examples:
    | country  | labels |
    | Colombia | "Tipo de documento", "Número de documento", "Nombre completo", "Fecha de nacimiento", "Ciudad", "Placa", "Marca", "Línea", "Modelo (año)", "Autorizo el tratamiento de mis datos personales." |
    | Chile    | "RUT", "Nombre completo", "Fecha de nacimiento", "Ciudad", "Patente", "Marca", "Modelo", "Año", "Acepto el tratamiento de mis datos personales." |
```

### US-01-AC-02 — Field validation

```gherkin
Scenario Outline: Field validation
  Given I am filling out the form in the context of Colombia, with today pinned to 2026-11-20
  And every other field holds a valid value
  When the field "<label>" holds <input> and I activate "Continuar"
  Then I see the message "<message>" next to the field "<label>"
  And I cannot move to the next step: I stay on step 1 and step 2 is not shown

  Examples:
    | label                                            | input                 | message |
    | Placa                                            | "AB12"                | Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123). |
    | Ciudad                                           | no option selected    | Selecciona tu ciudad. |
    | Fecha de nacimiento                              | 2010-03-01            | Debes ser mayor de edad (18 años o más) para cotizar. |
    | Modelo (año)                                     | 2005                  | El modelo debe estar entre los últimos 20 años y el próximo año. |
    | Autorizo el tratamiento de mis datos personales. | unchecked             | Debes autorizar el tratamiento de tus datos para continuar. |
    | Nombre completo                                  | "Al"                  | Ingresa tu nombre completo (entre 3 y 80 caracteres). |
```

### US-01-AC-03 — Configuration change without deployment

```gherkin
Scenario: Configuration change without deployment
  Given the business team adds and publishes in Strapi a new field for Colombia with
    key "mobilePhone", type "text", label "Teléfono celular", not required, sortOrder 35,
    error message "Ingresa un número de celular válido."
  And the running front-end build and its configuration are not changed
  When I reload the application in the context of Colombia
  Then the field "Teléfono celular" appears between "Nombre completo" and "Fecha de nacimiento"
  And the field does not appear in the context of Chile
```

### US-01-AC-04 — Keep data when going back

```gherkin
Scenario: Keep data when going back
  Given I am in the context of Colombia
  And I filled step 1 with:
    | Tipo de documento   | Cédula de ciudadanía |
    | Número de documento | 1012345678           |
    | Nombre completo     | Ana Prueba Ficticia  |
    | Fecha de nacimiento | 1990-05-15           |
    | Ciudad              | Medellín             |
    | Placa               | ABC123               |
    | Marca               | Mazda                |
    | Línea               | 3 Touring            |
    | Modelo (año)        | 2022                 |
    | Autorizo el tratamiento de mis datos personales. | checked |
  And I moved on to step 2 with "Continuar"
  When I go back to step 1 with "Atrás"
  Then every field shows the value I entered
  And no error message is shown
```

Verification in US-01 (US-01-Q-19): a unit test of the wizard store (the values are saved and
read back) and a component test (a valid "Continuar" navigates to the step 2 route; returning to
the step 1 route, as "Atrás" will do, shows every value and no error). The "Atrás" button is part
of the step 2 page, so the end-to-end part is completed when US-02 exists.

### US-01-AC-05 — Vehicle year boundaries (derived from US-01-BR-03 / Q-05, Q-12)

```gherkin
Scenario Outline: Vehicle year boundaries
  Given today is <today>
  And the vehicle year field has the rule yearRange with maxYearsOld 20 and maxYearsAhead 1
  When I enter <year> as the vehicle year
  Then the vehicle year is <result>

  Examples:
    | today      | year   | result  |
    | 2026-11-20 | 2027   | valid   |
    | 2026-11-20 | 2028   | invalid |
    | 2026-11-20 | 2006   | valid   |
    | 2026-11-20 | 2005   | invalid |
    | 2026-11-20 | 2026   | valid   |
    | 2027-01-01 | 2028   | valid   |
    | 2027-01-01 | 2006   | invalid |
    | 2026-11-20 | 2015.5 | invalid |
```

### US-01-AC-06 — Legal age boundaries (derived from US-01-BR-04 / Q-06, Q-07)

```gherkin
Scenario Outline: Legal age boundaries
  Given today is <today>
  And the birth date field has the rule minAge 18
  When I enter <birthDate> as the birth date
  Then the birth date is <result>

  Examples:
    | today      | birthDate  | result  |
    | 2026-11-20 | 2008-11-20 | valid   |
    | 2026-11-20 | 2008-11-21 | invalid |
    | 2026-11-20 | 1990-01-01 | valid   |
    | 2026-11-20 | 2026-11-21 | invalid |
    | 2026-02-28 | 2008-02-29 | invalid |
    | 2026-03-01 | 2008-02-29 | valid   |
    | 2028-02-29 | 2010-02-28 | valid   |
```

### US-01-AC-07 — Select options come from Strapi (derived from US-01-BR-02)

```gherkin
Scenario Outline: Select options come from Strapi
  Given I am in the context of <country>
  When I open the "Ciudad" select
  Then it shows the prompt "Selecciona una opción" and then exactly <options>, in this order
  And no city is selected

  Examples:
    | country  | options |
    | Colombia | "Bogotá", "Medellín", "Cali", "Barranquilla" |
    | Chile    | "Santiago", "Valparaíso", "Concepción", "Antofagasta" |
```

### US-01-AC-08 — Required and optional fields (derived from US-01-BR-01 / Q-26)

```gherkin
Scenario Outline: Required and optional fields
  Given a <required> field of type <type> with the rules <rules>
  When its value is <value>
  Then the field is <result>

  Examples:
    | required     | type     | rules                | value       | result  |
    | required     | text     | minLength 3          | "   "       | invalid |
    | required     | text     | minLength 3          | " Ana "     | valid   |
    | required     | number   | yearRange 20/1       | empty       | invalid |
    | required     | checkbox | none                 | unchecked   | invalid |
    | required     | select   | none                 | no option   | invalid |
    | required     | date     | minAge 18            | empty       | invalid |
    | not required | text     | pattern ^[0-9]{10}$  | empty       | valid   |
    | not required | text     | pattern ^[0-9]{10}$  | "123"       | invalid |
    | not required | checkbox | none                 | unchecked   | valid   |
```

### US-01-AC-09 — Which error message is shown (derived from US-01-BR-01 / Q-04)

```gherkin
Scenario Outline: Which error message is shown
  Given the CO field "Número de documento" is required, has the rule pattern ^[0-9]{6,10}$,
    the field error message "Ingresa un número de documento válido (solo números, de 6 a 10 dígitos)."
    and the rule-specific message for "required" "Ingresa tu número de documento."
  When its value is <value> and the error is shown
  Then the message is "<message>"

  Examples:
    | value     | message |
    | empty     | Ingresa tu número de documento. |
    | "12.345"  | Ingresa un número de documento válido (solo números, de 6 a 10 dígitos). |

Scenario: Generic fallback when no message can be resolved
  Given a field whose configuration reaches the front end without any usable error message
  When the field is invalid and the error is shown
  Then the message is "Revisa este campo."
  And no rule name or English text is shown to the user

Scenario: A required number the browser cannot parse fails the required check
  Given I am filling out the form in the context of Colombia, with today pinned to 2026-11-20
  And the required field "Modelo (año)" has no rule-specific message for "required"
  When I type "1e" key by key in "Modelo (año)" and activate "Continuar"
  Then I see the message "El modelo debe estar entre los últimos 20 años y el próximo año." next to it
  And "Modelo (año)" still shows "1e"
  And I stay on step 1

Scenario Outline: An optional number the browser cannot parse blocks "Continuar"
  Given I am filling out the form in the context of Colombia, with today pinned to 2026-11-20
  And every seed field holds a valid value
  And Colombia also has the published optional field "Kilometraje" (key "mileage", type "number",
    no rules, error message "Ingresa un kilometraje válido (solo números enteros).")
  When I type "<text>" key by key in "Kilometraje" and activate "Continuar"
  Then I see the message "Ingresa un kilometraje válido (solo números enteros)." next to "Kilometraje"
  And "Kilometraje" still shows "<text>"
  And I stay on step 1 and no typed step 1 output is produced
  And the wizard state holds '' for "mileage"

  Examples:
    | text  |
    | 1e    |
    | 2015e |
```

Note (added in v0.3, HC2 decision, ADR-0004; optional case changed in v0.5, US-01-R3-F01;
wording corrected and dates added in v0.5 at HC1 round 5): a `number` or `date` input whose text
the browser cannot read (`validity.badInput`; for example `abc`, `1e` or `2015e` in a number, or a
partly cleared date) has the value `''`, because of the HTML value sanitisation rules for
`<input type="number">` and `<input type="date">`, and Signal Forms reports a **parse error** on
the field, which makes it invalid. The **wizard state and `sessionStorage` hold `''`** for that
key (AC-21), while the typed text stays visible in the field. The form's own editing value for the
field is deliberately not set to `''`, because that would clear the visible text. Such a field is
**invalid until the user fixes the text**, and "Continuar" is blocked: a **required** field shows
its `requiredMessage` if configured, otherwise its `errorMessage`, as for an empty value (the
seed's CO "Modelo (año)" has no `requiredMessage`, so the field-level message is shown); an
**optional** field shows its `errorMessage`, or "Revisa este campo." when no usable message
reaches the front end (US-01-Q-04). Unlike a really empty optional field (valid, output `null`,
US-01-Q-26), it never produces a typed step 1 output (§7.3). The scenarios above use numbers; the
date case is noted under AC-18. Until v0.4 an optional field in this state was valid with output `null`;
the human decision of 2026-11-21 on US-01-R3-F01 supersedes that part of the US-01-R2-F01
decision. The app does not show a separate "not a number" message. "Kilometraje" is a test
fixture, not seed content (no seeded field is an optional number). Unit tests cover the message
resolution; a component test covers both cases with a stubbed `validity.badInput`; the CO e2e
test (`us-01-data-form-co.spec.ts`) confirms the sanitisation for the required case in a real
browser, because jsdom does not reproduce it (SPIKE-01, *Not verified* item 1).

### US-01-AC-10 — When errors are shown, and focus on a failed attempt (derived from Q-13)

```gherkin
Scenario: No errors before interaction
  Given I open step 1 in the context of Chile
  Then no error message is shown

Scenario: Error after leaving a field
  Given I am on step 1 in the context of Chile
  When I move focus into "Nombre completo" and leave it empty
  Then I see "Ingresa tu nombre completo (entre 3 y 80 caracteres)." next to it
  When I type "Ana Prueba Ficticia"
  Then the message disappears

Scenario: Failed attempt to continue
  Given I am on step 1 in the context of Chile and I have not touched any field
  When I activate "Continuar"
  Then every invalid field shows its message
  And the keyboard focus moves to the first invalid field in sortOrder, "RUT"
```

### US-01-AC-11 — Country-specific document and plate formats (derived from US-01-BR-05 / Q-03, Q-10)

```gherkin
Scenario Outline: Country-specific document and plate formats
  Given I am in the context of <country>
  When I enter <value> in "<label>"
  Then the field is <result>

  Examples:
    | country  | label               | value          | result  |
    | Colombia | Placa               | "ABC123"       | valid   |
    | Colombia | Placa               | "abc123"       | valid   |
    | Colombia | Placa               | "AB1234"       | invalid |
    | Colombia | Placa               | "ABC-123"      | invalid |
    | Colombia | Número de documento | "1012345678"   | valid   |
    | Colombia | Número de documento | "12345"        | invalid |
    | Colombia | Número de documento | "10123456789"  | invalid |
    | Chile    | Patente             | "BCDF12"       | valid   |
    | Chile    | Patente             | "AB1234"       | valid   |
    | Chile    | Patente             | "ABC123"       | invalid |
    | Chile    | RUT                 | "12.345.678-5" | valid   |
    | Chile    | RUT                 | "12345678-5"   | valid   |
    | Chile    | RUT                 | "123456785"    | valid   |
    | Chile    | RUT                 | "12.345.678"   | invalid |
```

### US-01-AC-12 — RUT check digit (derived from US-01-BR-05 / Q-09)

Applies only if US-01-Q-09 is answered "yes" (the proposed default). If it is answered "no", this
AC is retired.

```gherkin
Scenario Outline: RUT check digit
  Given I am in the context of Chile
  When I enter <rut> in "RUT"
  Then the field is <result>

  Examples:
    | rut            | result  |
    | 12.345.678-5   | valid   |
    | 12.345.678-9   | invalid |
    | 1.000.005-K    | valid   |
    | 1.000.005-k    | valid   |
    | 1.000.005-1    | invalid |
    | 11.111.111-1   | valid   |
```

### US-01-AC-13 — Only published fields are shown (derived from US-01-BR-06 / Q-24)

```gherkin
Scenario: Only published fields are shown
  Given the field "Correo electrónico" (key "email") exists for Colombia only as a draft
  When I open the application in the context of Colombia
  Then the field "Correo electrónico" is not shown
```

### US-01-AC-14 — Malformed field configuration is skipped (derived from US-01-BR-01 / Q-18)

```gherkin
Scenario Outline: Malformed field configuration is skipped
  Given the content for Colombia contains the 10 valid seed fields
  And one extra field that is malformed because <problem>
  When step 1 is rendered
  Then the 10 valid fields are rendered and the malformed one is not
  And a console warning names the field key and the problem, and contains no user-entered value

  Examples:
    | problem                                          |
    | its type is "slider"                             |
    | it is a select with zero options                 |
    | its pattern "[A-Z" does not compile              |
    | its key "plate" duplicates a field earlier in sortOrder (the earlier one is kept) |
    | its label is empty                               |
    | its minAge rule has no number of years           |
    | its pattern rule has "pattern" null and its regex in "value" |
    | its minLength rule has "value" as the text "3" instead of a number |
```

The last two rows were added in v0.4 (US-01-R1-F04): they apply the §7.5 wire-to-logical
mapping, where each rule kind reads its parameter from its own typed attribute and a missing or
wrong-type parameter makes the rule, and so the field, malformed.

### US-01-AC-15 — Content cannot be loaded (derived from Q-17)

```gherkin
Scenario: Content cannot be loaded
  Given the content backend does not answer within 10 seconds, or answers with an error
  When I open the application in the context of Chile
  Then I see "No pudimos cargar el formulario. Intenta de nuevo." and a "Reintentar" button
  And no form field and no "Continuar" button is shown
  When the content backend is available again and I activate "Reintentar"
  Then the Chile form is shown
```

### US-01-AC-16 — No valid fields (derived from US-01-BR-01 / Q-17, Q-18)

```gherkin
Scenario: No valid fields
  Given the content for Chile has no published field, or only malformed fields
  When I open the application in the context of Chile
  Then I see "No pudimos cargar el formulario. Intenta de nuevo." and a "Reintentar" button
  And no empty form that could be submitted is shown
```

### US-01-AC-17 — Unsupported country (derived from US-01-BR-07 / Q-01)

```gherkin
Scenario: Unsupported country
  Given the published countries loaded from Strapi are "Colombia" (CO) and "Chile" (CL)
  When I open the application with the country code "AR"
  Then I see "Este país no está disponible."
  And I see links to "Colombia" and "Chile" that open step 1 in that country context
  And no form field is requested or shown

Scenario Outline: The country list cannot be loaded
  Given the content backend does not answer the country list request within 10 seconds, or answers with an error
  When I open the address <address>
  Then I see "No pudimos cargar la lista de países. Intenta de nuevo." and a "Reintentar" button
  And I do not see "Este país no está disponible."
  And no country link is shown and no form field is requested or shown
  When the content backend is available again and I activate "Reintentar"
  Then I see <result>

  Examples:
    | address    | result |
    | /          | the country chooser with the links "Colombia" and "Chile" |
    | /ar/datos  | "Este país no está disponible." with the links "Colombia" and "Chile" |
    | /co/datos  | step 1 of Colombia |
```

The country links come from the published `country` entries, not from code (ADR-0001). The
second scenario was added in v0.3 (ADR-0001: "The app never claims a country is unavailable when
it simply could not check"); its copy is proposed in US-01-Q-28. The 10-second limit reuses the
US-01-Q-17 timeout.

### US-01-AC-18 — A valid form moves to step 2 (derived from US-01-BR-08 / Q-08, Q-19)

```gherkin
Scenario: A valid form moves to step 2
  Given I filled step 1 in the context of Colombia with the values of US-01-AC-04
  When I activate "Continuar"
  Then I see step 2
  And the wizard state holds the typed step 1 output (§7.3) for country "CO", with the values
    documentType "CC", documentNumber "1012345678", fullName "Ana Prueba Ficticia",
    birthDate "1990-05-15", city "MDE", plate "ABC123", make "mazda", model "3 Touring",
    vehicleYear 2022 (an integer), dataConsent true

Scenario: No typed output on an invalid "Continuar"
  Given the wizard state holds no typed step 1 output for Colombia
  And I filled step 1 in the context of Colombia with the values of US-01-AC-04, except "Modelo (año)" = "2005"
  When I activate "Continuar"
  Then I stay on step 1
  And the wizard state still holds no typed step 1 output for Colombia
  And it holds the raw editing values I typed, including "Modelo (año)" = "2005"
```

The wizard state keeps the raw editing values on every change (strings, booleans, `''`;
ADR-0003, HC2 decision); the typed output of §7.3 is produced from them only on a valid
"Continuar", and that output is what US-02 and US-03 consume.

Note (v0.5, HC1 round 5; US-01-R3-F01): the same holds when a date that was valid is cleared or
partly cleared (a date the browser cannot read, AC-09 note). "Continuar" (click or Enter) keeps
step 1, the field shows its message (CO "Fecha de nacimiento": its `requiredMessage` "Ingresa tu
fecha de nacimiento."; AC-02) and gets the focus as the first invalid field (AC-10), the wizard
state holds `''` for
`birthDate`, and no typed step 1 output carries the earlier valid date. An optional date in that
state shows its `errorMessage`, or "Revisa este campo.". Covered by component tests in
`quote-form-page.spec.ts` (stubbed `validity.badInput`).

Verification in US-01 (US-01-Q-19): a unit test of the wizard store (the typed output matches
§7.3 and is produced only on a valid "Continuar", never on an invalid one; ADR-0003
*Confirmation*) and a component test ("Continuar" navigates to the step 2 route of Colombia). "I
see step 2" is completed end to end when US-02 exists.

### US-01-AC-19 — Step 2 cannot be reached with an incomplete step 1 (derived from Q-19)

```gherkin
Scenario: Step 2 cannot be reached with an incomplete step 1
  Given the wizard state has no valid step 1 data for Colombia
  When I open step 2 of Colombia directly (deep link or typed address)
  Then I am taken to step 1 of Colombia
```

Verification in US-01: a unit test of the guard (no or invalid step 1 data for the country →
redirect to step 1 of that country; valid data → access allowed). The Q-19 answer keeps the
guard and drops only the provisional step 2 page.

### US-01-AC-20 — Browser back keeps data (derived from US-01-BR-08 / Q-20)

```gherkin
Scenario: Browser back keeps data
  Given I filled step 1 in the context of Colombia with the values of US-01-AC-04
  And I moved on to step 2 with "Continuar"
  When I use the browser's back action
  Then I see step 1 and every field shows the value I entered
```

Verification in US-01 (US-01-Q-19): a component test with the router (navigate to the step 2
route, go back in the history, step 1 shows every value) and a unit test of the store. The end
to end part is completed when US-02 exists.

### US-01-AC-21 — Data survives a reload (derived from US-01-BR-08 / Q-15)

ADR-0003 keeps the wizard state in `sessionStorage`, so this AC applies as written (the "memory
only" rewrite foreseen in v0.2 does not apply). The store keeps the raw editing values (HC2
decision), so a reload restores exactly what was typed, valid or not. The one exception is a
`number` or `date` input whose text the browser cannot read (AC-09): the store holds `''` for it, so a reload
shows the field empty and never restores a stale valid value (US-01-R2-F01 decision, unchanged
in v0.5).

```gherkin
Scenario: Data survives a reload
  Given I filled step 1 in the context of Chile and moved on to step 2
  When I reload the page in the same browser tab
  And I go back to step 1 with "Atrás"
  Then every field shows the value I entered

Scenario: An unfinished step 1 survives a reload as typed
  Given I am on step 1 in the context of Chile
  And I typed "Ana" in "Nombre completo" and "2015.5" in "Año", without activating "Continuar"
  When I reload the page in the same browser tab
  Then "Nombre completo" shows "Ana" and "Año" shows "2015.5"
  And no error message is shown
```

Verification in US-01 (US-01-Q-19): a unit test of the store (a new store instance, as after a
reload, restores the raw editing values exactly from `sessionStorage`, including an in-progress
invalid value such as `'2015.5'`; ADR-0003) and a component test (step 1 renders the restored
values, pristine). The end-to-end part of the first scenario is completed when US-02 exists.

### US-01-AC-22 — Data does not cross countries (derived from US-01-BR-07 / Q-02)

```gherkin
Scenario: Data does not cross countries
  Given I filled step 1 in the context of Colombia with the values of US-01-AC-04
  When I open the application in the context of Chile
  Then step 1 of Chile shows no value in any field
  When I open the application in the context of Colombia again
  Then step 1 of Colombia shows no value in any field
```

### US-01-AC-23 — Configuration changed while data is stored (derived from US-01-BR-06 / Q-16)

ADR-0003 keeps the wizard state in `sessionStorage`, so the reload step applies. The stored raw
values are pruned when step 1 renders with the configuration of this page load, and the pruned
state is written back (ADR-0003).

```gherkin
Scenario: Configuration changed while data is stored
  Given the wizard state holds for Colombia model "3 Touring" and city "MDE"
  And afterwards the business team unpublishes the field "Línea" and removes the city option "Medellín"
  When I reload the application and return to step 1 of Colombia
  Then the field "Línea" is not shown and "model" is no longer part of the step 1 values
  And "Ciudad" shows "Selecciona una opción" with no value
  And activating "Continuar" shows "Selecciona tu ciudad." next to "Ciudad"
```

### US-01-AC-24 — Keyboard-only completion (derived from Assessment: accessibility)

```gherkin
Scenario: Keyboard-only completion
  Given I open step 1 in the context of Colombia on a desktop viewport
  When I complete every field and activate "Continuar" using only the keyboard
    (Tab, Shift+Tab, typing, arrow keys and Space in selects and checkboxes, Enter or Space on buttons)
  Then I reach step 2
  And the Tab order of the fields matches their visual order and sortOrder
  And every focused control shows a visible focus indicator
  And on arriving at step 2 the keyboard focus is on the step heading
```

Verification in US-01: the e2e test in `us-01-data-form-co.spec.ts` checks the keyboard path, the
Tab order and the focus indicator, and that activating "Continuar" with the keyboard leads to the
step 2 address (US-01-Q-27). The focus on the step 2 heading needs the step 2 page and is
completed when US-02 exists.

### US-01-AC-25 — Accessible labels, help text and errors (derived from Assessment: accessibility)

```gherkin
Scenario: Accessible labels, help text and errors
  Given step 1 is shown in the context of Chile
  Then every control's accessible name is its configured label
  And the accessible description of "Patente" includes its help text "Ejemplo: BCDF12 o AB1234."
  And every required control is exposed as required
  When "Patente" shows the error "Ingresa una patente válida (por ejemplo, BCDF12 o AB1234)."
  Then "Patente" is exposed as invalid
  And the error text is part of its accessible description
  And the error is announced by assistive technology once, not on every keystroke
```

### US-01-AC-26 — Mobile and desktop layout (derived from Assessment: responsive)

```gherkin
Scenario Outline: Mobile and desktop layout
  Given the viewport is <width> × <height> CSS pixels
  When I open step 1 in the context of Colombia
  Then the page has no horizontal scroll
  And every label is shown above its control and is not truncated
  And every control and button has a target size of at least 24 × 24 CSS pixels
  And I can complete the form and reach step 2

  Examples:
    | width | height |
    | 360   | 740    |
    | 1280  | 800    |
```

Verification: manual, by the human at HC3, with evidence: one screenshot of step 1 of Colombia
at 360 × 740 and one at 1280 × 800, attached to the HC3 record. "Reach step 2" means the address
changes to the step 2 route (US-01-Q-27). No automated test is planned for this AC.

### US-01-AC-27 — Read-only content access, data stays in the browser (derived from US-01-BR-08 / Assessment: security)

```gherkin
Scenario: Read-only content access, data stays in the browser
  Given I complete step 1 in the context of Colombia with the values of US-01-AC-04 and reach step 2
  When I inspect every network request made by the browser during the flow
  Then every request to the content backend is a read (HTTP GET)
  And no request carries a Strapi API token with write permissions
  And no request contains any value I entered in step 1
```

"Reach step 2" means that a valid "Continuar" leads to the step 2 address (US-01-Q-27). The
requests are inspected from the first page load until that navigation.

### US-01-AC-28 — Anonymous callers cannot read drafts or write content (derived from US-01-BR-06 / ADR-0002)

New in v0.3 (HC2 decision: the ADR-0002 security check is traced as an AC). Widened in v0.4
(US-01-R1-F01/F02): "anonymous" means any request that Strapi does not authenticate (glossary),
not only a request without an `Authorization` header, and the `/api` path may use any letter
case, on Strapi's own port as well as through the proxy.

```gherkin
Scenario Outline: Anonymous requests never return draft content
  Given the seed field "Correo electrónico" (key "email") exists for Colombia only as a draft
  When an anonymous client sends <authorization> and requests the Colombia form fields at the
    path <path> with "status=draft" and "filters[key][$eq]=email" through <entry point>
  Then the response contains no field with key "email"
  And every entry the response returns, if any, has a non-null "publishedAt"

  Examples:
    | entry point                                  | path               | authorization                                      |
    | Strapi's own port (bypassing the proxy)      | "/api/form-fields" | no Authorization header                            |
    | Strapi's own port (bypassing the proxy)      | "/api/form-fields" | the header Authorization "foo"                     |
    | Strapi's own port (bypassing the proxy)      | "/api/form-fields" | the header Authorization "Basic Zm9vOmJhcg=="      |
    | Strapi's own port (bypassing the proxy)      | "/api/form-fields" | the header Authorization "Bearer" (no token)       |
    | Strapi's own port (bypassing the proxy)      | "/api/form-fields" | the header Authorization "Bearer not-a-real-token" |
    | Strapi's own port (bypassing the proxy)      | "/API/form-fields" | no Authorization header                            |
    | Strapi's own port (bypassing the proxy)      | "/Api/form-fields" | no Authorization header                            |
    | the same-origin proxy at the relative "/api" | "/api/form-fields" | no Authorization header                            |
    | the same-origin proxy at the relative "/api" | "/api/form-fields" | the header Authorization "foo"                     |
    | the same-origin proxy at the relative "/api" | "/api/form-fields" | the header Authorization "Basic Zm9vOmJhcg=="      |
    | the same-origin proxy at the relative "/api" | "/api/form-fields" | the header Authorization "Bearer" (no token)       |
    | the same-origin proxy at the relative "/api" | "/api/form-fields" | the header Authorization "Bearer not-a-real-token" |
    | the same-origin proxy at the relative "/api" | "/API/form-fields" | no Authorization header                            |
    | the same-origin proxy at the relative "/api" | "/Api/form-fields" | no Authorization header                            |

Scenario Outline: Anonymous requests never return draft countries
  When an anonymous client sends <authorization> and requests the country list at the path
    <path> with "status=draft" through <entry point>
  Then every entry the response returns, if any, has a non-null "publishedAt"

  Examples:
    | entry point                                  | path             | authorization                                |
    | Strapi's own port (bypassing the proxy)      | "/api/countries" | the header Authorization "foo"               |
    | Strapi's own port (bypassing the proxy)      | "/api/countries" | the header Authorization "Bearer" (no token) |
    | Strapi's own port (bypassing the proxy)      | "/API/countries" | no Authorization header                      |
    | the same-origin proxy at the relative "/api" | "/api/countries" | the header Authorization "foo"               |
    | the same-origin proxy at the relative "/api" | "/API/countries" | no Authorization header                      |

Scenario: Writes through the same-origin proxy are rejected
  When an anonymous client sends "POST /api/form-fields" through the same-origin proxy, with a
    Colombia field of key "securityProbe", type "text", label "Prueba"
  Then the response status is 405
  And an anonymous read of the Colombia form fields returns no field with key "securityProbe"
```

Reading the draft scenarios (v0.4): an error response (for example 400 from the proxy for any
`Authorization` header, 401 from Strapi for an invalid `Bearer` token) or a response that is not
the content API (for example the proxy answering `/API/…` with the app's `index.html`) carries no
draft and satisfies the `Then` steps. What is required is that no response ever carries a draft.
The same rows apply with each of the other publication parameters that ADR-0002's published-only
rule strips (`publicationFilter`, `hasPublishedVersion`, `publicationState`) in place of
`status=draft`.

Verification: e2e file `us-01-security.spec.ts`, as API requests from the Playwright Node
process with no browser and no valid token (ADR-0002 *Confirmation*). The
check is re-run on every Strapi upgrade (ADR-0002, *Strongest argument against*).

## 6. Gaps and open questions

Gaps marked **[Blocks HC1]** change the ACs or a contract shared with other stories, so they need
an explicit answer. For the others, the proposed default applies if the human does not answer.

| ID | Gap | Why it matters | Proposed default | Human answer |
|---|---|---|---|---|
| US-01-Q-01 | **[Blocks HC1] [ADR]** "Open the application in the context of a country": how is the country resolved (URL path, query parameter, subdomain, selector, browser locale)? What happens with no country or an unsupported one? | AC-01, AC-17 and every e2e test depend on it. The same build must serve both countries (Assessment). | Decided by the multi-country ADR. Proposal to evaluate: a country segment in the URL (`/co/…`, `/cl/…`), so it can be deep-linked, bookmarked and tested. The root address shows a country chooser (links "Colombia", "Chile"). An unsupported code shows "Este país no está disponible." with the same links (AC-17). No detection from IP or browser locale. | Decided by the ADR. The proposal (/co, /cl, chooser at the root, message "Este país no está disponible.") is the starting point. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-02 | Can the user switch country mid-flow, and what happens to the data already entered? | Fields differ by country; values from CO are meaningless in CL. Privacy. | Switching is possible only by opening the other country's context (no in-page selector in US-01). The wizard state is scoped to one country: opening another country's context discards the stored data of the previous one (AC-22). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-03 | **[Blocks HC1]** The story names some fields (document, plate, make, city, birth date implied by legal age, vehicle year) but not the complete list, labels, copy, options or patterns per country. | The seed, the e2e tests and the downstream stories (US-02 price rule, US-03 summary) depend on concrete fields. | The seed in §7.2: 10 fields for CO and 9 for CL, all five field types used, Spanish copy as written there, fictitious options. Editors can change all of it later. | OK. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-04 | **[Blocks HC1]** The story says each field has *an* error message (singular), but a field can fail for different reasons (empty vs. wrong format). Can messages contain dynamic values (for example the allowed year range)? | Defines the content model and AC-02/AC-09. A single message per field makes "required" and "wrong format" read the same. | Each field has a required field-level `errorMessage`, plus an optional message per rule (including `required`) that overrides it for that rule. Priority when several rules fail: `required` first, then the rules in configuration order. If nothing usable reaches the front end, show "Revisa este campo." Messages are static text: no placeholders such as `{min}` in US-01. | OK. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-05 | **[Blocks HC1]** "Not later than next year or more than 20 years old": are the limits inclusive? Is "years old" counted by calendar year or from a date? Are 20 and 1 fixed or configurable? | BR-03 boundaries (AC-05). A different reading changes which model years can be quoted. | Calendar years, both limits inclusive: `Y − 20 ≤ year ≤ Y + 1` (2006–2027 on 2026-11-20). 20 and 1 are parameters of the `yearRange` rule in Strapi, seeded with 20 and 1 for both countries. | OK (inclusive limits; the values 20 and 1 are configurable in Strapi). — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-06 | Which timezone defines "today" for legal age and vehicle year? | Around midnight and on 31 December / 1 January, a different timezone flips the result. | The browser's local date, read through an injectable clock so tests can pin it. Alternative for the human: the country's timezone (`America/Bogota`, `America/Santiago`). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-07 | "Legal age": what age per country? Is it content or code? How are 29 February birth dates handled? Is there an upper age limit? | BR-04 (AC-06). Regulations differ by country (business context). | 18 for CO and for CL, as the `minAge` rule on the birth date field (content, so it can differ per country). A 29 February birthday is reached on 1 March in non-leap years. Future dates are invalid. No upper age limit in US-01. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-08 | **[Blocks HC1]** The business can remove or rename any field, but US-02 (price rule "based on the step 1 data") and US-03 (masked document number, vehicle data in the summary) need specific values. Which keys are reserved, and what happens if a reserved field is missing? Who sets the `key` of a new field? | Without a stable contract, an editor's change can silently break steps 2 and 3, or remove the legal-age check. | Reserved keys (§7.3): `documentType` (CO), `documentNumber`, `fullName`, `birthDate`, `plate`, `make`, `model`, `vehicleYear`. Editors set `key` when creating a field (format `^[a-z][a-zA-Z0-9]*$`, unique per country, enforced in Strapi) and must not change it afterwards. If a reserved field is missing, step 1 still works and logs a console warning; US-02 and US-03 define their own fallback. If no published field has a `minAge` rule, step 1 still works and logs "legal age not enforced"; the seed always includes it. | OK. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-09 | **[Blocks HC1]** Should the RUT check digit (modulo 11) be verified? A regular expression cannot do it, so it needs a code-backed rule kind (`rutCheckDigit`) that editors can attach to a field. | Without it, "12.345.678-9" is accepted as a RUT. With it, the rule vocabulary grows beyond the `dynamic-form-fields` v0 contract. | Yes: add the rule kind `rutCheckDigit` (no parameters). It accepts dots and a dash or none, and `K` or `k`. It is attached to the CL "RUT" field in the seed (AC-12). | Yes: verify the RUT check digit (modulo 11). An invalid RUT would pass any pattern; it can be enabled or removed from Strapi. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-10 | Is input normalised (trim, upper case, removing dots, dashes or spaces from RUT and plates)? | Patterns, stored values and the US-03 summary depend on it. | Text values are trimmed and otherwise stored as typed. Seed patterns accept lower and upper case letters, and a RUT with or without dots and dash. Canonical formatting for display is US-03's concern. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-11 | Colombian CC and CE numbers have different formats, but a field has one pattern. Is cross-field validation (pattern depends on the selected document type) needed? | Wrongly accepted or rejected CE numbers. | No cross-field validation in US-01. One pattern for both types: digits only, 6 to 10. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-12 | Does the `number` type accept decimals or negative numbers? | Validation of the vehicle year and of any number field the business adds. | `number` fields accept integers only (negatives are subject to `min`). A decimal such as 2015.5 is invalid and shows the field's message. Decimal support is out of scope. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-13 | When are errors shown, and is "Continuar" disabled while the form is invalid? Where does the focus go on a failed attempt? | AC-02 says "I cannot move to the next step" but not how. A disabled button gives keyboard and screen-reader users no feedback. | "Continuar" is always enabled. A field's error appears after it loses focus, or for all fields after "Continuar" is activated, and updates as the user types once shown. On a failed attempt the step does not change and focus moves to the first invalid field in sortOrder (AC-10). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-14 | Which copy is in code and which in Strapi? (buttons, step heading, select prompt, loading, errors, unknown country, required marker) | The business wants to change copy per country (business context), but some copy is needed before any content loads. | Wizard chrome copy is in code, in Spanish, the same for both countries: "Continuar", "Atrás", step heading "Tus datos y los de tu vehículo", "Selecciona una opción", "Cargando formulario…", "No pudimos cargar el formulario. Intenta de nuevo.", "Reintentar", "Revisa este campo.", "Este país no está disponible.", the required marker "*" with the note "Los campos marcados con * son obligatorios." Everything about fields comes from Strapi. Moving chrome copy to Strapi is a later story. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-15 | **[Blocks HC1] [ADR]** What survives a reload or closing the tab? When is the stored data cleared? The document number and birth date are personal data. | AC-21, privacy, and US-03 ("try again without losing my information"). The Assessment asks for a front-end persistence strategy. | Decided by the persistence ADR. Proposal to evaluate: wizard state survives step changes and a reload in the same tab (for example `sessionStorage`), is scoped to one country, and is cleared when the tab closes, when the country changes (Q-02) and after a successful payment (US-03). No persistent storage across browser sessions (`localStorage`, cookies). Values are saved as they change. | Decided by the ADR; sessionStorage is the starting point. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-16 | What if the configuration changes while a user is mid-flow? How fast must a published change become visible? | Stored values may no longer match fields or options (AC-23). Caching could break AC-03. | Configuration is fetched on every full page load and not refetched on step changes. Stored values whose key is no longer configured are dropped; a stored select value whose option no longer exists is cleared; all values are revalidated on "Continuar". No caching of field configuration in the browser or any proxy beyond one page load, so the next reload shows the published change. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-17 | Loading and failure behaviour: timeout, retry, partial content. | Strapi may be down or slow (docker start-up); an empty form must never be submittable. | Show "Cargando formulario…" while loading. After 10 s without a response, or on any error, show the error state with "Reintentar" (AC-15). Zero valid fields shows the same error state (AC-16). No automatic retries. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-18 | Malformed content: unknown type, select without options, invalid regex, duplicated key, empty label, rule without its parameter, missing message. Equal `sortOrder` values. | Editors can save things the front end cannot use; one bad field must not break the whole form. | Drop the malformed field, keep the rest, and log a `console.warn` with the key and the problem but no user data (AC-14). A missing message falls back as in Q-04. Ties in `sortOrder` are broken by `key` ascending. The Strapi schema prevents as much as possible (enumerations, required attributes). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-19 | Step 2 does not exist until US-02. Can the user deep-link to step 2 without a valid step 1? | AC-04 needs a step 2; the wizard must not show plans for missing data. | US-01 ships a placeholder step 2 (heading "Elige tu plan" and "Atrás"), which US-02 replaces. Step 2 is reachable only if the stored step 1 values are valid for the current configuration; otherwise the user is taken to step 1 (AC-19). | REJECTED. No provisional step 2, because it is throwaway work. The step 2 guard (AC-19) is kept, verified with a unit test. AC-04, AC-18, AC-20 and AC-21 are verified in US-01 with unit tests of the store and component tests (navigation to the step 2 route); their e2e part is completed when US-02 exists. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-20 | Does the browser back action behave like "Atrás"? | Users use browser back; losing data there would break the story's intent. | Yes. Each step is a separate history entry; browser back from step 2 shows step 1 with its data (AC-20). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-21 | Are selects dependent (model by make, city by region)? | A dependent select needs relations in Strapi and cascading logic. | No. "Marca" and "Ciudad" are independent selects; the model ("Línea" / "Modelo") is free text. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-22 | Date entry and format: native date picker or a text field with a country format (dd/mm/aaaa)? | Keyboard access, mobile usability, and parsing errors. | Native `<input type="date">`: the browser shows it in the user's locale and gives keyboard and mobile support. The stored value is ISO `YYYY-MM-DD`. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-23 | How is AC-03 tested automatically? It needs a published field to be created in Strapi during the test. | A test that writes to Strapi needs write credentials, which must never reach the browser. | The e2e test creates and later deletes the field through the Strapi API from the Playwright **Node process**, using a token available only to the test runner (never in the front-end bundle or served config). The security ADR confirms it. Also checked by hand at HC3 in the Strapi admin. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-24 | Fields have no "active" flag (plans do). Is draft vs. published enough? How do we prove drafts are hidden? | AC-13. | Draft vs. published is enough for fields. The seed adds one draft-only field per country ("Correo electrónico", key `email`) to prove it. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-25 | "A simple form": one page or several? Sections such as "Tus datos" / "Tu vehículo"? | Layout, configuration model (a section attribute) and the number of wizard steps. | One page, one column, fields in sortOrder, no sections. Sections would need a new configuration attribute and are out of scope. | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-26 | Do validation rules apply to an empty optional field? | Otherwise an optional field with a pattern would block progress when left empty. | No. Rules run only on non-empty values; an empty optional field is valid (AC-08). | Default accepted. — Felipe Sabogal, 2026-11-20 (HC1) |
| US-01-Q-27 | **[Blocks HC1]** (new in v0.2, a consequence of the Q-19 answer) With no provisional step 2, what does the running US-01 app do after a valid "Continuar", before US-02 is merged? Does US-01 register the step 2 route at all? | The e2e tests of AC-24 and AC-27 and the HC3 check of AC-26 end with "reach step 2". The guard of AC-19 needs a route to protect. If the route does not exist, a valid "Continuar" fails or falls into the not-found handling, and those checks cannot pass. | US-01 registers the step 2 route of each country (address per the routing decision, §10) with the AC-19 guard and **no page of its own**: no heading, no copy, no buttons. US-02 attaches its page to that route without changing the address or the guard. Until then, a valid "Continuar" changes the address to step 2 and shows an empty content area (the browser back action returns to step 1 with its data); tests assert the address, not page content. Alternative: US-01 registers no step 2 route; the e2e tests of AC-24 and AC-27 stop at activating "Continuar" with a valid form, and the AC-19 guard is merged without a route. | Proposed default accepted: US-01 registers each country's step 2 route with the AC-19 guard and no page of its own; US-02 attaches its page to that route without changing the address or the guard; tests assert the address. — Felipe Sabogal, 2026-11-20 (HC1 round 2) |
| US-01-Q-28 | (new in v0.3, a consequence of ADR-0001) The country list is now content loaded from Strapi, so the root chooser and the unknown-country page have a loading state and a load-error state (§8, AC-17). ADR-0001 leaves their copy to the spec. "No pudimos cargar el formulario. Intenta de nuevo." is form-specific. What copy do they show? | Without it the developer invents end-user copy, or reuses the form message on a page that has no form. A wrong "Este país no está disponible." must never stand in for a load failure (ADR-0001). | Code-owned chrome copy, Spanish, the same for both countries, added to the US-01-Q-14 list: load error "No pudimos cargar la lista de países. Intenta de nuevo." with the existing "Reintentar"; loading "Cargando…". Same rules as the step 1 load states: 10 s timeout (US-01-Q-17), no automatic retries, error in `role="alert"`, focus on "Reintentar". | OK (proposed default accepted). — Felipe Sabogal, 2026-11-20 (HC1 round 3) |

Checklist items with no gap: *double clicks / submits* — step 1 sends nothing to a server, and a
second activation of "Continuar" while on step 2 has no effect. *Currency and number
formatting* — no amounts in step 1 (US-02). *Masking* — no masking in step 1, where the user is
typing their own data (US-03 masks the summary).

## 7. Content contract (what Strapi must provide)

This section is **logical**, except §7.5, which fixes the **wire shape** (the JSON of the
Strapi 5 REST API) and its mapping to the logical shape (v0.4). The physical model is fixed by
ADR-0001, as amended by ADR-0006 (amends ADR-0001's physical model), and implemented by the
strapi-developer following `strapi-content-modeling`: a `country` collection type (`code`
ISO 3166-1 alpha-2 upper case, unique; `name`; `currencyCode`; `localeTag`, the BCP 47 tag, named
so because Strapi reserves `locale` (ADR-0006, US-01-R1-F05); `sortOrder`; draft &
publish on) and a `form-field` collection type with a **required `manyToOne` relation
`country`**; `documents.strictRelations: true`, so an item without a country cannot be
published; `key` uniqueness per country enforced by a Document Service middleware (Strapi's
`unique` is not scoped by relation). The front end reads one country's fields in one request
filtered by `country.code`, and reads only published content through the same-origin proxy
(ADR-0002).

### 7.1 Field configuration (per country, draft & publish on)

| Attribute | Type | Rules |
|---|---|---|
| `key` | string | Required. `^[a-z][a-zA-Z0-9]*$`. Unique per country. Not shown to users. |
| `label` | string | Required, non-empty. Spanish. |
| `type` | enumeration | `text`, `number`, `select`, `date`, `checkbox`. |
| `isRequired` | boolean | Default `false`. |
| `helpText` | text | Optional. Spanish. |
| `placeholder` | string | Optional. Spanish. Never used instead of a label. |
| `errorMessage` | string | Required. Spanish. Field-level message (US-01-Q-04). |
| `sortOrder` | integer | Required. Ascending; ties by `key`. |
| `options` | list of { `value` string, `label` string, `sortOrder` integer } | Required and non-empty when `type` is `select`; ignored otherwise. `value` unique within the field. |
| `rules` | list of structured rules (below) | Zero or more, in evaluation order. Each may carry an optional `message` (Spanish) that overrides `errorMessage`. |
| `requiredMessage` | string | Optional. Overrides `errorMessage` for the `required` check. |
| `country` | required `manyToOne` relation to `country` (ADR-0001) | Exactly one country per field. Publishing without it is rejected (`strictRelations`). |

Rule kinds (structured, not free JSON). The parameters below are the **logical** `ValidationRule`
the boundary parser produces. On the wire each parameter type has its own typed attribute (for
example a pattern arrives in `pattern`, not in `value`); the wire shape and the mapping are in
§7.5 (v0.4, US-01-R1-F04, ADR-0006). No rule attribute is free JSON.

| Kind | Parameters | Applies to | Semantics |
|---|---|---|---|
| `minLength` / `maxLength` | `value` integer ≥ 0 | text | Trimmed length, inclusive. |
| `min` / `max` | `value` number | number | Inclusive. |
| `pattern` | `value` ECMAScript regex source, no flags | text | Full match (anchored if not anchored). |
| `minAge` | `years` integer > 0 | date | BR-04. |
| `yearRange` | `maxYearsOld` integer ≥ 0, `maxYearsAhead` integer ≥ 0 | number | BR-03. |
| `rutCheckDigit` | none | text | Modulo-11 check digit, accepts dots/dash and `K`/`k` (subject to US-01-Q-09). |

A rule whose kind does not apply to the field's type is malformed (US-01-Q-18).

### 7.2 Seed (US-01-Q-03): summary

The complete seed (rules, help texts, error messages, options) is in the annex
[seed-fields.md](seed-fields.md). Values are fictitious, copy is Spanish, and every entry is
published unless noted. The seed is idempotent (natural key: country code + field `key`).

Fields per country, in `sortOrder` (key → label):

| # | Colombia (CO), 10 published | Chile (CL), 9 published |
|---|---|---|
| 1 | `documentType` → Tipo de documento (select: CC, CE) | `documentNumber` → RUT (pattern + `rutCheckDigit`) |
| 2 | `documentNumber` → Número de documento | `fullName` → Nombre completo |
| 3 | `fullName` → Nombre completo | `birthDate` → Fecha de nacimiento (`minAge` 18) |
| 4 | `birthDate` → Fecha de nacimiento (`minAge` 18) | `city` → Ciudad (select) |
| 5 | `city` → Ciudad (select) | `plate` → Patente |
| 6 | `plate` → Placa | `make` → Marca (select) |
| 7 | `make` → Marca (select) | `model` → Modelo |
| 8 | `model` → Línea | `vehicleYear` → Año (`yearRange` 20 / 1) |
| 9 | `vehicleYear` → Modelo (año) (`yearRange` 20 / 1) | `dataConsent` → Acepto el tratamiento de mis datos personales. (checkbox) |
| 10 | `dataConsent` → Autorizo el tratamiento de mis datos personales. (checkbox) | — |
| draft | `email` → Correo electrónico (draft only, AC-13) | `email` → Correo electrónico (draft only) |

Reserved keys (US-01-Q-08, §7.3): `documentType` (CO only), `documentNumber`, `fullName`,
`birthDate`, `plate`, `make`, `model`, `vehicleYear`.


### 7.3 Step 1 output (consumed by US-02 and US-03 through the wizard state)

Two shapes exist (ADR-0003, HC2 decision). Only the second one is consumed by US-02 and US-03.

**Stored editing values** (written on every change; what a reload restores):

- `country`: the country code of the context (see below).
- `values`: a map from field `key` to the **raw editing value**, as typed: a string for `text`,
  `number`, `select` and `date`, a boolean for `checkbox`, and `''` for an empty field.
  In-progress invalid values (for example `'2015.5'`) are stored as typed. A `number` or `date`
  input whose text the browser cannot read (`validity.badInput`; for example `1e`, or a partly
  cleared date) is stored as `''` in the wizard state and `sessionStorage` (AC-09, AC-21), while
  the typed text stays visible and the field is invalid through the Signal Forms parse error.
  Neither the form model nor the stored values ever hold `null` (ADR-0004).

**Typed step 1 output** (produced only on a valid "Continuar"; never on an invalid one):

- `country`: an ISO 3166-1 alpha-2 code in upper case (`^[A-Z]{2}$`) that matches a published
  `country` entry loaded from Strapi in this page load (ADR-0001). `CO` and `CL` are the seeded
  values; the type is not a fixed union of them.
- `values`: a map from field `key` to value. `text` → trimmed string; `number` → integer;
  `select` → option `value`; `date` → ISO `YYYY-MM-DD` string. An empty **optional** `text`,
  `number`, `select` or `date` field → `null`. A `number` or `date` input, required or optional,
  whose text the browser cannot read is invalid, so no typed output is produced while it holds
  that text (v0.5, US-01-R3-F01, AC-09); it is never mapped to `null`. `checkbox` → always a boolean: checked → `true`,
  unchecked → `false`, also when the checkbox is optional (HC2 decision); a checkbox is never
  `null`.
- The field configuration is **not** stored: later steps read labels and option labels from the
  configuration fetched in the same page load (refetched on every full page load, ADR-0003,
  US-01-Q-16).
- Reserved keys (US-01-Q-08): `documentType` (CO only), `documentNumber`, `fullName`,
  `birthDate`, `plate`, `make`, `model`, `vehicleYear`.

### 7.4 Differences from the `dynamic-form-fields` skill contract v0

The skill says the US-01 spec may refine the contract and that the skill is updated in the same
PR. Differences proposed here:

1. A required field-level `errorMessage` plus optional per-rule overrides (`requiredMessage`,
   rule `message`), instead of only a per-rule-kind `messages` map (US-01-Q-04).
2. A new rule kind `rutCheckDigit` (US-01-Q-09).
3. `number` fields are integers only (US-01-Q-12).
4. Empty optional fields skip all rules (US-01-Q-26). The skill does not state this.
5. Rules carry an applicability by field type (§7.1); a mismatch is malformed.
6. (v0.4, US-01-R1-F04) On the wire, a rule has one typed attribute per parameter type
   (`value` number, `pattern` text, `years`, `maxYearsOld`, `maxYearsAhead` integers); no
   free-JSON attribute. The logical `ValidationRule` is unchanged (§7.5).

### 7.5 Wire shapes (Strapi 5 REST) and mapping to the logical shape (v0.4)

Added in v0.4 after code review round 1 (US-01-R1-F04, US-01-R1-F05; human decisions of
2026-11-21; physical model in ADR-0006, which amends ADR-0001's physical model). The developers
implement the backend to return exactly these shapes, and the front-end boundary parser
(`field-config.ts`, `country.ts`) maps them to the logical shapes. The test-engineer derives the
parser fixtures from them.

#### 7.5.1 Validation rule (`form.validation-rule` component, inside a form field's `rules`)

Every rule on the wire carries **all** of the attributes below. The attributes its kind does not
use are `null`. Strapi adds the component `id`, which the parser ignores.

| Wire attribute | JSON type on the wire | Used by kind(s) | Editor input (Strapi admin) |
|---|---|---|---|
| `kind` | string, one of `minLength`, `maxLength`, `min`, `max`, `pattern`, `minAge`, `yearRange`, `rutCheckDigit` | all | enumeration (required) |
| `value` | number or `null` | `minLength`, `maxLength`, `min`, `max` | numeric input |
| `pattern` | string or `null` | `pattern` | plain text input: the regex is typed as is (`^\d+$`), with no JSON quoting or doubled backslashes |
| `years` | integer or `null` | `minAge` | integer input |
| `maxYearsOld` | integer or `null` | `yearRange` | integer input |
| `maxYearsAhead` | integer or `null` | `yearRange` | integer input |
| `message` | string or `null` | all (optional override, US-01-Q-04) | text input |

The Strapi attribute types (for example `integer` versus `decimal` for `value`, `string` versus
`text` for `pattern`) and their schema-level minimums are fixed in ADR-0006; whatever they are,
the JSON types above hold. Every current use of `value` is an integer (lengths, and bounds of
integer-only `number` fields, US-01-Q-12).

Examples (wire), as returned inside `data[i].rules` of `GET /api/form-fields`:

```json
{ "id": 41, "kind": "pattern",   "value": null, "pattern": "^[A-Za-z]{3}[0-9]{3}$", "years": null, "maxYearsOld": null, "maxYearsAhead": null, "message": null }
{ "id": 42, "kind": "minLength", "value": 3,    "pattern": null, "years": null, "maxYearsOld": null, "maxYearsAhead": null, "message": "Ingresa tu nombre completo (entre 3 y 80 caracteres)." }
{ "id": 43, "kind": "minAge",    "value": null, "pattern": null, "years": 18,   "maxYearsOld": null, "maxYearsAhead": null, "message": null }
{ "id": 44, "kind": "yearRange", "value": null, "pattern": null, "years": null, "maxYearsOld": 20,   "maxYearsAhead": 1,    "message": null }
{ "id": 45, "kind": "rutCheckDigit", "value": null, "pattern": null, "years": null, "maxYearsOld": null, "maxYearsAhead": null, "message": null }
```

(The values are illustrative; the seed values are in [seed-fields.md](seed-fields.md).)

Mapping wire → logical `ValidationRule` (§7.1), applied per rule by the boundary parser:

| Wire `kind` | Parameter read from the wire | Valid when | Logical rule produced |
|---|---|---|---|
| `minLength`, `maxLength` | `value` | a JSON number, integer, ≥ 0 | `{ kind, value }` |
| `min`, `max` | `value` | a JSON number, finite | `{ kind, value }` |
| `pattern` | `pattern` | a non-empty JSON string that compiles as an ECMAScript regex with no flags | `{ kind: 'pattern', value: <pattern> }` |
| `minAge` | `years` | a JSON number, integer, > 0 | `{ kind: 'minAge', years }` |
| `yearRange` | `maxYearsOld`, `maxYearsAhead` | both JSON numbers, integers, ≥ 0 | `{ kind: 'yearRange', maxYearsOld, maxYearsAhead }` |
| `rutCheckDigit` | none | always | `{ kind: 'rutCheckDigit' }` |

Rules of the mapping:

1. The logical `ValidationRule` of §7.1 is unchanged: the logical `pattern` rule keeps its
   regex in `value`, so validators and their tests do not change. Only the parser reads a
   different wire attribute for `pattern`.
2. `message`: a non-empty string becomes the logical `message`; `null`, an empty or a blank
   string means "no override".
3. Attributes the kind does not use are **ignored**, whatever their value (an editor who
   changes a rule's kind may leave a stale value behind). They are `null` in the seed.
4. A rule is **malformed** when its `kind` is unknown, does not apply to the field's type
   (§7.1), or the parameter its kind reads is missing, `null`, of the wrong JSON type (numeric
   text such as `"3"` is a wrong type) or out of range. A malformed rule makes its field
   malformed: the field is dropped with a `console.warn` naming the field key and the problem,
   with no user data (US-01-Q-18, AC-14).

#### 7.5.2 Country (`country` collection type)

The API exposes the stored attribute name **`localeTag`**, with no renaming in the backend (no
custom controller mapping `fields`, `sort` or `filters`; human decision on US-01-R1-F05). It can
therefore be selected, sorted and filtered as `localeTag` like any other attribute. The front end
requests it by that name (for example `fields[3]=localeTag`), never as `locale`.

Example (wire), `GET /api/countries?fields[0]=code&fields[1]=name&fields[2]=currencyCode&fields[3]=localeTag&fields[4]=sortOrder&sort=sortOrder:asc`
(published content only, ADR-0002):

```json
{
  "data": [
    { "id": 1, "documentId": "…", "code": "CO", "name": "Colombia", "currencyCode": "COP", "localeTag": "es-CO", "sortOrder": 10 },
    { "id": 2, "documentId": "…", "code": "CL", "name": "Chile",    "currencyCode": "CLP", "localeTag": "es-CL", "sortOrder": 20 }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 2 } }
}
```

(`id`, `documentId` and `meta` are added by Strapi and ignored by the parser. The `sortOrder`
values are those of the current seed.)

Mapping wire → logical country entry (the front-end `Country` model):

| Wire attribute | Valid when | Logical attribute |
|---|---|---|
| `code` | a string matching `^[A-Z]{2}$` | `code` |
| `name` | a non-empty string | `name` |
| `currencyCode` | a string matching `^[A-Z]{3}$` | `currencyCode` |
| `localeTag` | a non-empty string | `locale` |
| `sortOrder` | a JSON number | `sortOrder` |

The logical attribute keeps the name `locale` (it is the BCP 47 tag that US-02 and US-03 use for
number and currency formatting); only the boundary parser knows the wire name `localeTag`. An
entry that fails any row is dropped with a `console.warn` that carries no content (ADR-0001). A
wire entry with `locale` but no `localeTag` is invalid.

## 8. UI states

| State | Trigger | What the user sees | Accessibility notes |
|---|---|---|---|
| Loading | Country resolved, configuration request in flight | Step heading and "Cargando formulario…"; no fields, no "Continuar" | Container has `aria-busy="true"`; the loading text is in a polite live region |
| Country list loading | Root chooser or unknown-country page, country list request in flight (ADR-0001) | "Cargando…" (proposed, US-01-Q-28); no country link, no "Este país no está disponible." | Container has `aria-busy="true"`; the loading text is in a polite live region |
| Country list unavailable | Root chooser or unknown-country page; the country list request times out (10 s) or fails (ADR-0001) | "No pudimos cargar la lista de países. Intenta de nuevo." (proposed, US-01-Q-28) and "Reintentar"; no country link, and never "Este país no está disponible." (AC-17) | Message in `role="alert"`; focus moves to "Reintentar" |
| Country chooser (v0.4) | Root address `/`, country list loaded (ADR-0001, US-01-Q-01) | Heading "Elige tu país" and a link to each published country (seed: "Colombia", "Chile") | The heading is the page's main heading; links are reachable by Tab |
| Unsupported country | Country list loaded, and the code in the address is not in it (US-01-Q-01, ADR-0001) | "Este país no está disponible." and a link to each published country (seed: "Colombia", "Chile") | Message is the page's main heading; links are reachable by Tab |
| Error | Timeout (10 s), network or HTTP error, or zero valid fields | "No pudimos cargar el formulario. Intenta de nuevo." and "Reintentar" | Message in `role="alert"`; focus moves to "Reintentar" |
| Partial content | Some fields malformed | The valid fields only; nothing extra is shown to the user | Console warning only (no user data) |
| Ready (pristine) | Configuration loaded | Fields in sortOrder, help texts, required marker note, "Continuar" | Label bound to every control; help text in `aria-describedby`; required exposed |
| Field invalid | Blur or failed "Continuar" | Configured message right below the field | `aria-invalid="true"`; error in `aria-describedby`; announced once |
| Failed continue | "Continuar" with invalid fields | All errors shown; step does not change | Focus on the first invalid field in sortOrder |
| Success | "Continuar" with a valid form | The address changes to the step 2 route; its page is US-02's (no page of its own in US-01, US-01-Q-27) | Focus on the step 2 heading and document title: defined and verified in US-02 |
| Back to step 1 | Browser back (and "Atrás" on step 2, once US-02 exists) | Step 1 with the stored values, no errors | Focus on the step 1 heading |

### 8.1 Code-owned chrome copy (complete list)

Added in v0.4 to keep the code-owned end-user copy in one place (US-01-R1-F06). It collects the
strings of US-01-Q-14 and US-01-Q-28 (approved at HC1; their §6 cells are unchanged) and adds two
strings approved at review round 1. Spanish, the same for both countries, in front-end code. No
other end-user string may live in front-end code (BR-07); every field-related string comes from
Strapi.

| String | Where | Source |
|---|---|---|
| "Continuar" | Step 1 button | US-01-Q-14 |
| "Atrás" | Step navigation button (on the step 2 page, US-02) | US-01-Q-14 |
| "Tus datos y los de tu vehículo" | Step 1 heading | US-01-Q-14 |
| "Selecciona una opción" | Non-selectable prompt of every `select` | US-01-Q-14 |
| "Cargando formulario…" | Step 1 loading state | US-01-Q-14 |
| "No pudimos cargar el formulario. Intenta de nuevo." | Step 1 error state | US-01-Q-14 |
| "Reintentar" | Retry button of every load-error state | US-01-Q-14 |
| "Revisa este campo." | Generic error fallback (US-01-Q-04) | US-01-Q-14 |
| "Este país no está disponible." | Unsupported-country page heading | US-01-Q-14 |
| "*" and "Los campos marcados con * son obligatorios." | Required marker and its note | US-01-Q-14 |
| "Cargando…" | Country list loading state | US-01-Q-28 |
| "No pudimos cargar la lista de países. Intenta de nuevo." | Country list error state | US-01-Q-28 |
| "Elige tu país" | Country chooser main heading (root address `/`) | Approved at review round 1 (F06), Felipe Sabogal, 2026-11-21 |
| "Cotizador de seguro de auto" | Page `<title>` (document title) of the US-01 pages; a per-step title is US-02's concern (§8 *Success*) | Approved at review round 1 (F06), Felipe Sabogal, 2026-11-21 |

The country names shown in links ("Colombia", "Chile") are content (`country.name`), not code.

## 9. Non-functional requirements

- **Accessibility (Assessment):** the step can be completed with the keyboard only (AC-24), and
  every field has an accessible label (AC-25). Native controls are used (`input` of type text,
  number, date and checkbox; `select`). Visible focus indicator. Errors are associated with their
  field and announced once. Target: WCAG 2.2 AA for step 1 (verified in part automatically and in
  part by hand at HC3, including one screen reader pass).
- **Responsive (Assessment):** usable from 320 to 1440 CSS px wide without horizontal scroll;
  verified by hand at HC3 at 360 × 740 and 1280 × 800, with screenshots as evidence (AC-26); one
  column; touch targets at least 24 × 24 CSS px.
- **Multi-country (Assessment):** one build for CO and CL; no country-specific code paths for
  fields or copy (BR-07).
- **Content-driven (Assessment, BR-06):** every field-related string, option, rule and the order
  come from Strapi. No field list is hard-coded in the front end.
- **Typed validations (Assessment):** the configuration is parsed at the boundary into a typed
  model (§7.1) before it reaches the form; validators are pure functions with an injectable clock.
- **Security / privacy (Assessment, CLAUDE.md §3):** no Strapi token with write permissions
  reaches the browser; the browser only reads content (AC-27). Public role permissions are
  minimal and justified in ADR-0002 (`find` on `country` and `form-field` only); anonymous reads
  return published content only, and the browser reaches the content API only through the
  same-origin, GET-only proxy at the relative `/api` (ADR-0002, AC-28). Step 1 values are never sent to a server or written
  to logs; console warnings contain no user data. Seed and test data are fictitious.
- **Performance:** the configuration of a country is loaded with as few requests as the content
  model allows (target: one), with options and rules populated in the same response. No request
  per keystroke. Validation runs on the client.
- **Environment (Assessment):** the stack starts with a single command (for example
  `docker compose up`) with the seed for both countries.
- **Language:** all end-user copy is Spanish; code, logs and docs are English.

## 10. ADRs

- **Referenced (accepted at HC2, 2026-11-20; binding, precedence level 2):**
  1. [ADR-0001](../../adr/0001-multi-country-content-strategy.md) — Multi-country content
     strategy and country context: `country` collection type + required `manyToOne` relation,
     `strictRelations`, `key` uniqueness middleware, country list as content, URL path segment
     (`/co`, `/cl`), root chooser, unknown-country page, country-list error state, and the wizard
     routes and step guards (folds in the v0.2 routing candidate and US-01-Q-27). Covers v0.2
     need 1 and the candidate. Used by: BR-07, §2, §3, §5 conventions, AC-17, AC-19, §7, §7.3, §8.
  2. [ADR-0002](../../adr/0002-strapi-access-and-security.md) — Strapi access and security:
     same-origin nginx proxy (GET only, allow-listed `/api/` paths, `no-store`, `Authorization`
     rejected), relative `/api` in the front end, public role with `find` only, published-only
     middleware, CORS allow-list, bootstrap (dev super admin from env vars, default Full Access
     token deleted, `allow_register` false), e2e write flow for AC-03. Covers v0.2 need 3. Used
     by: BR-06, §9, AC-03, AC-27, AC-28.
  3. [ADR-0003](../../adr/0003-wizard-state-persistence.md) — Wizard state persistence:
     `sessionStorage`, one country per entry, raw editing values written on every change, typed
     §7.3 output only on a valid "Continuar", clearing rules. Covers v0.2 need 4. Used by: BR-08,
     §3, §7.3, AC-18, AC-21, AC-22, AC-23.
  4. [ADR-0004](../../adr/0004-forms-library.md) — Forms library: Signal Forms over a shared,
     library-agnostic validation core; string editing model; a number input the browser cannot
     parse has the value `''` (HTML sanitisation) and a Signal Forms parse error, and the wizard
     state stores `''` for it (v0.5 at HC1 round 5: the same applies to an unreadable date). Covers v0.2 need 2 (SPIKE-01). Used by: §7.3, AC-09, AC-10.
- **Referenced (accepted 2026-11-21, together with spec v0.4 at HC1 round 4; binding,
  precedence level 2):**
  5. [ADR-0006](../../adr/0006-strapi-physical-model-adjustments.md) — Amends ADR-0001's
     physical model, written after code review round 1: structured rule attributes, one typed
     attribute per parameter type (US-01-R1-F04), and the country attribute `localeTag`, exposed
     by the API under that name with no backend renaming (US-01-R1-F05). Where ADR-0001 names
     the country attribute `locale`, ADR-0006 prevails. Used by: §7, §7.1, §7.4, §7.5, AC-14.
- **Implementation note (no behaviour change):** ADR-0002's published-only rule is implemented,
  since commits c3bdb56 and 345a016 (US-01-R1-F01), as a **route middleware** on `find` and
  `findOne`, applied through `publishedOnlyConfig()`, not as a global middleware. The outcome
  required by BR-06 and AC-28 is unchanged.
- **Needed:** none.

## 11. Test mapping

Planned locations follow CLAUDE.md §6 and the file names fixed in the *Confirmation* sections of
ADR-0001..0004; the test-engineer may adjust other unit and component paths. "HC3" notes are extra human checks, not a replacement for the
automated test.

US-01 has **exactly four** e2e files (HC1 round 1, correction 3); no other e2e file is added in
this story:

| E2E file | ACs |
|---|---|
| `frontend/e2e/us-01-data-form-co.spec.ts` | US-01-AC-01 (CO), US-01-AC-02, US-01-AC-09 (unparseable number, real browser; v0.3), US-01-AC-13, US-01-AC-24 (keyboard) |
| `frontend/e2e/us-01-country-context.spec.ts` | US-01-AC-01 (CL), US-01-AC-17 (both scenarios), US-01-AC-22 |
| `frontend/e2e/us-01-config-change.spec.ts` | US-01-AC-03 |
| `frontend/e2e/us-01-security.spec.ts` | US-01-AC-27, US-01-AC-28 (v0.3, ADR-0002; widened in v0.4 to every anonymous variant, US-01-R1-F02) |

Every other AC is covered by unit or component tests. AC-26 is checked by hand at HC3. The e2e
part of AC-04, AC-18, AC-20 and AC-21 needs the step 2 page and is completed when US-02 exists
(US-01-Q-19); US-02's spec owns those e2e tests.

Short names below: `field-config.spec.ts` = `frontend/src/app/shared/field-config.spec.ts`;
`field-validators.spec.ts` = `frontend/src/app/shared/field-validators.spec.ts`;
`quote-form-page.spec.ts` = `frontend/src/app/features/quote-form/quote-form-page.spec.ts`;
`quote-store.spec.ts` = `frontend/src/app/core/quote-store.spec.ts`;
`wizard-step-guard.spec.ts` = `frontend/src/app/core/wizard-step-guard.spec.ts`;
`supported-country-guard.spec.ts` = `frontend/src/app/core/supported-country-guard.spec.ts`
(ADR-0001, *Confirmation*).

| AC | Level (unit / component / e2e / manual) | Planned test location |
|---|---|---|
| US-01-AC-01 | e2e (CO and CL against seeded Strapi) + unit (sorting) | `us-01-data-form-co.spec.ts` (CO), `us-01-country-context.spec.ts` (CL), `field-config.spec.ts` |
| US-01-AC-02 | component + e2e | `quote-form-page.spec.ts`, `us-01-data-form-co.spec.ts` |
| US-01-AC-03 | e2e (writes content from the Node test process, US-01-Q-23) | `us-01-config-change.spec.ts`; plus hand check at HC3 in the Strapi admin |
| US-01-AC-04 | unit (store) + component (navigation to the step 2 route and back); e2e completed in US-02 | `quote-store.spec.ts`, `quote-form-page.spec.ts` |
| US-01-AC-05 | unit (pinned clock) | `field-validators.spec.ts` |
| US-01-AC-06 | unit (pinned clock) | `field-validators.spec.ts` |
| US-01-AC-07 | component | `quote-form-page.spec.ts` (CO and CL options) |
| US-01-AC-08 | unit | `field-validators.spec.ts` |
| US-01-AC-09 | unit + component + e2e (unparseable number in a real browser) | `field-validators.spec.ts` (message resolution, empty-value path), `quote-form-page.spec.ts` (v0.5, stubbed `validity.badInput`: required number, `requiredMessage ?? errorMessage`; optional number "Kilometraje" (CO, key `mileage`) with `1e` and `2015e`, its `errorMessage` shown, and with an empty `errorMessage`, "Revisa este campo."; optional date (AC-09 / AC-10) with its `errorMessage` and with the "Revisa este campo." fallback; in every case "Continuar" blocked, no typed output, store `''`), `us-01-data-form-co.spec.ts` ("1e" typed key by key in "Modelo (año)") |
| US-01-AC-10 | component | `quote-form-page.spec.ts` |
| US-01-AC-11 | unit (seed rule values, every row) | `field-validators.spec.ts` |
| US-01-AC-12 | unit | `field-validators.spec.ts` |
| US-01-AC-13 | e2e (seeded draft field) | `us-01-data-form-co.spec.ts` |
| US-01-AC-14 | unit | `field-config.spec.ts` (boundary parser; v0.4: fixtures use the §7.5.1 wire shape, including the two new rows) |
| US-01-AC-15 | component (mocked HTTP, fake timers) | `quote-form-page.spec.ts` |
| US-01-AC-16 | component | `quote-form-page.spec.ts` |
| US-01-AC-17 | e2e (both scenarios; the country list failure is simulated in the browser context by aborting the `/api/countries` request) + unit (country resolution: code matching, case normalisation, unknown code, list not loaded; v0.4: the country boundary parser maps wire `localeTag` to logical `locale`, §7.5.2) | `us-01-country-context.spec.ts`, `supported-country-guard.spec.ts` (ADR-0001); the parser's unit test location is the test-engineer's choice |
| US-01-AC-18 | unit (store: §7.3 typed output only on a valid "Continuar") + component (navigation to the step 2 route); e2e completed in US-02 | `quote-store.spec.ts`, `quote-form-page.spec.ts` (including the US-01-R3-F01 tests: a required CO "Fecha de nacimiento" cleared or unreadable (stubbed `validity.badInput`) after it was valid; "Continuar" by click or Enter stays on step 1, focuses the date, and no typed output carries the stale date) |
| US-01-AC-19 | unit (guard) | `wizard-step-guard.spec.ts` |
| US-01-AC-20 | unit (store) + component (router history back from the step 2 route); e2e completed in US-02 | `quote-store.spec.ts`, `quote-form-page.spec.ts` |
| US-01-AC-21 | unit (raw editing values restored exactly by a new instance) + component (step 1 renders restored values); e2e completed in US-02 | `quote-store.spec.ts`, `quote-form-page.spec.ts` |
| US-01-AC-22 | e2e + unit (store scoped per country) | `us-01-country-context.spec.ts`, `quote-store.spec.ts` |
| US-01-AC-23 | unit (hydration) + component | `quote-store.spec.ts`, `quote-form-page.spec.ts` |
| US-01-AC-24 | e2e (keyboard only, up to the step 2 address; focus on the step 2 heading completed in US-02) | `us-01-data-form-co.spec.ts`; plus hand check at HC3 |
| US-01-AC-25 | component (accessible name, description, invalid and required states) | `quote-form-page.spec.ts`; plus screen reader check at HC3 |
| US-01-AC-26 | manual (HC3: screenshots at 360 px and desktop) | None automated. The human attaches two screenshots of step 1 of Colombia, at 360 × 740 and at 1280 × 800, to the HC3 record. |
| US-01-AC-27 | e2e (network inspection) | `us-01-security.spec.ts`; plus code review and `scripts/scan-secrets.sh` |
| US-01-AC-28 | e2e (API requests from the Playwright Node process, no browser, no valid token; source ADR-0002). v0.4: every row of both draft outlines, on Strapi's own port and through the proxy: no header, non-Bearer schemes (`foo`, `Basic …`), `Bearer` with no token, an invalid `Bearer` token, and the `/API/` and `/Api/` paths; for `form-fields` and `countries` (US-01-R1-F02) | `us-01-security.spec.ts`; re-run on every Strapi upgrade |

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-01` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
| 2026-11-20 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.1 | First version from story.md and the Assessment requirements. 8 BR, 27 AC (4 original, 23 derived), 26 gaps (7 block HC1), 4 ADRs needed plus 1 candidate. |
| 2026-11-20 | Felipe Sabogal (human) | HC1 | **Changes requested** (round 1) | Answers recorded in §6 (blocking: Q-01 and Q-15 deferred to ADRs with the proposals as starting point; Q-03, Q-04, Q-05, Q-08 OK; Q-09 yes. Non-blocking: defaults accepted except **Q-19 rejected**: no provisional step 2). Corrections for v0.2: (1) move the full seed (§7.2) to the annex `seed-fields.md` and keep only a link and a summary (fields per country, reserved keys); (2) remove everything that depended on Q-19 (scope, ACs, UI states, tasks.md); (3) at most 4 US-01 e2e files: `us-01-data-form-co.spec.ts` (AC-01 CO, AC-02, AC-13, AC-24 keyboard), `us-01-country-context.spec.ts` (AC-01 CL, AC-17, AC-22), `us-01-config-change.spec.ts` (AC-03), `us-01-security.spec.ts` (AC-27); every other AC by unit or component tests; AC-26 (responsive) manual at HC3 with screenshots at both widths; update §11 and tasks.md; (4) keep all IDs (BR, AC, Q), the coverage matrix and traceability, and do not rewrite unchanged sections. T-29 authorised: the orchestrator updates the `dynamic-form-fields` skill with the §7.4 refinements. (Translated from the Spanish original in the session log.) |
| 2026-11-20 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.2 | Revision after HC1 round 1. Status set to "Draft — awaiting HC1 (round 2)". **(1) Seed annex:** §7.2 reduced to a link to `seed-fields.md`, a summary of the fields per country (key → label, in sortOrder, draft fields marked) and the reserved keys; BR-05 and the §5 conventions point to the annex. No seed value changed. *Partly applied:* the write-scope hook still allowed only `spec.md` and `tasks.md`, so `seed-fields.md` could not be created; the full seed is kept verbatim in *Annex A (staging)* at the end of this file until the orchestrator moves it (US-01-T-30). **(2) No provisional step 2 (Q-19 rejected):** §2 scope bullet about the placeholder step 2 removed; navigation and guard bullets reworded; "any step 2 page" added to out of scope; §5 convention on what "step 2" means; "Verification in US-01" notes added under AC-04, AC-18, AC-19, AC-20, AC-21, AC-24, AC-26 and AC-27 (Gherkin unchanged); §8 *Success* and *Back to step 1* rows no longer mention a placeholder; §10 routing candidate mentions Q-27. New gap **US-01-Q-27 [Blocks HC1]**: whether US-01 registers the step 2 route without a page, needed for "reach step 2" in AC-24, AC-26 and AC-27 and for the AC-19 guard. AC-19 kept and verified by a unit test only. **(3) E2E limited to 4 files:** §11 rewritten with the exact file → AC mapping requested; `us-01-data-form-cl.spec.ts`, `us-01-keyboard.spec.ts` and `us-01-responsive.spec.ts` removed; AC-07 and AC-11 now component/unit only; AC-04, AC-18, AC-20, AC-21 unit (store) + component (step 2 route), e2e completed in US-02; AC-19 unit only; AC-26 `manual` in the level column (HC3 screenshots at 360 × 740 and 1280 × 800); §9 responsive bullet aligned. **(4) IDs:** no BR, AC, Q or T renumbered or retired (none existed only for the provisional step 2); one Q added (Q-27) and two T added (T-30 move the annex, T-31 AC-26 evidence at HC3). Unchanged: §1, §3, §4 (except the BR-05 pointer), §6 rows Q-01..Q-26, §7.1, §7.3, §7.4, §12. |
| 2026-11-20 | Orchestrator (Claude Opus 5.5) for Felipe Sabogal | HC1 round 2 | Q-27 answered; T-30 done | Human answered Q-27: proposed default accepted (empty step 2 route + AC-19 guard; see §6). T-30: Annex A moved verbatim to [seed-fields.md](seed-fields.md) and the staging note removed (the spec-writer's hook ran with the definition loaded at session start, before its write scope was widened to annexes). Verified: the annex body is identical to v0.1 §7.2 except that the two country subtitles changed from bold text to `###` headings. No content or ID changed. Spec awaits the human's HC1 decision. |
| 2026-11-20 | Felipe Sabogal (human) | HC1 round 2 | **Approved** (v0.2) | Spec v0.2 approved as is. SPIKE-01 scope widened at the same checkpoint (CLAUDE.md §7). Next: step 2, ADRs. |
| 2026-11-20 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.3 | Revision after HC2 (ADR-0001..0004 Accepted). Status "Draft — awaiting HC1 (round 3)". **(1) Country type (ADR-0001):** §7.3 `country` is an ISO 3166-1 alpha-2 code checked against the published `country` entries loaded from Strapi, not `'CO' \| 'CL'`; glossary *Country context*, §2 and BR-07 aligned; seed and examples unchanged. **(2) Country list unavailable (ADR-0001):** §8 new rows *Country list loading* and *Country list unavailable* for the root chooser and the unknown-country page (error with "Reintentar", never "Este país no está disponible."); *Unsupported country* row now requires the list to be loaded. AC-17 gets a `Given` for the loaded list and a second scenario (outline over `/`, `/ar/datos`, `/co/datos`). Proposed copy "No pudimos cargar la lista de países. Intenta de nuevo." and "Cargando…" as code-owned strings, recorded as new non-blocking gap **US-01-Q-28** (consistent with Q-14; Q-14 row not edited). **(3) New AC-28 (ADR-0002, HC2 decision):** anonymous `status=draft` requests never return the seeded draft `email` field (Strapi port and proxy); `POST /api/form-fields` through the proxy returns 405. Linked to BR-06 (drafts never shown); e2e in `us-01-security.spec.ts`; §11 and the BR coverage column updated; still 4 e2e files. **(4) Tasks (ADR-0001, ADR-0002):** T-18 (public role, users-permissions defaults, `allow_register` false), T-19 (compose topology with nginx `frontend`, `.env.example`) and T-20 (relative `/api`, dev-server proxy, replacing the runtime API URL) re-scoped; added T-32 (dev super admin from env vars, delete default Full Access token), T-33 (published-only middleware, CORS allow-list), T-34 (`strictRelations`, key-uniqueness middleware, ADR-0001), T-35 (nginx GET-only allow-listed proxy, `no-store`), T-36 (`CountryStore` and its loading/error states), T-37 (`supported-country-guard.spec.ts`), T-38 (backend test of the ADR-0001 rules); other tasks reworded to cite ADR numbers (see tasks.md). **(5) §11:** AC-17's unit file is `supported-country-guard.spec.ts` (ADR-0001). **(6) Checkbox (HC2 decision):** unchecked optional checkbox → `false` in §7.3; "empty optional → `null`" now applies to text, number, select and date only. **(7) Store shape (HC2 decision, ADR-0003):** §7.3 split into stored raw editing values (written on every change) and the typed output (only on a valid "Continuar", consumed by US-02/US-03); BR-08 and glossary *Wizard state* aligned; AC-18 Gherkin reworded to "typed step 1 output" plus a second scenario (no typed output on an invalid "Continuar"); AC-21 preamble updated (sessionStorage applies) plus a second scenario (an unfinished step 1 is restored as typed); AC-23 preamble updated. AC-20 checked: no conflict, unchanged. **(8) AC-09 (HC2 decision, ADR-0004):** new scenario and note: an unparseable number (`abc`, `1e`) reaches the model as empty, so a required field shows `requiredMessage`/`errorMessage` and an optional one is empty; confirmed in a real browser by `us-01-data-form-co.spec.ts` (§11 rows and e2e table updated). **(9) ADR references:** "multi-country / persistence / security ADR" replaced by ADR-0001..0004 in the metadata, sources, §2, §3, §4, §5 conventions, §7, §7.1, §7.3, §9 and §11; §10 lists the four accepted ADRs and "Needed: none". No ID renumbered or retired; added: AC-28, Q-28, T-32..T-38. Unchanged: §1, BR-01..BR-05, Q-01..Q-27 (including all *Human answer* cells), §7.2, §7.4, §12, AC-01..AC-08, AC-10..AC-16, AC-19, AC-20, AC-22, AC-24..AC-27. Counts: 8 BR, 28 AC (4 original, 24 derived), 28 Q (none blocks HC1). |
| 2026-11-20 | Felipe Sabogal (human) | HC1 round 3 | **Approved** (v0.3) | Spec v0.3 approved as is; US-01-Q-28 default accepted. Next: step 3, tests first. |
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.4 | Revision after code review round 1 ([reviews/US-01-review-R1.md](../../reviews/US-01-review-R1.md)), applying the human decisions of Felipe Sabogal, 2026-11-21, recorded in `tasks.md`, *Gate history*, row "6 Review (round 1)". Status "Draft — awaiting HC1 (round 4)". **(1) US-01-R1-F04, structured rule attributes (human decision: typed component attributes per parameter):** new §7.5 (§7.5.1) fixes the wire shape of a rule in the Strapi 5 REST response: `kind`, `value` (number: minLength, maxLength, min, max), `pattern` (text: pattern), `years` (minAge), `maxYearsOld`/`maxYearsAhead` (yearRange), `message`; unused attributes `null`; no free JSON. Explicit wire → logical mapping; the logical `ValidationRule` of §7.1 is unchanged (a logical `pattern` rule keeps its regex in `value`). A missing, `null`, wrong-type (numeric text included) or out-of-range parameter makes the rule and its field malformed, dropped with a warning (AC-14). §7 intro and the §7.1 rule-kinds preamble point to §7.5; §7.4 item 6 added; AC-14 gets two Examples rows (`pattern` null with the regex in `value`; `minLength` `value` as text "3") and a note; §11 AC-14 row notes the wire fixtures. **(2) US-01-R1-F05, `localeTag` (human decision: the API exposes `localeTag`, no backend renaming):** §7 intro names the country attribute `localeTag` (Strapi reserves `locale`); §7.5.2 gives the country wire shape and the mapping `localeTag` → logical `locale` in the front-end boundary parser; requests select `localeTag`; §11 AC-17 row adds the parser unit test. No AC, BR or glossary entry named the country `locale` attribute, so none changed for this item. **(3) US-01-R1-F06, copy (human decision: both strings approved):** new §8.1 lists all code-owned chrome copy (US-01-Q-14 and Q-28 strings, unchanged) plus "Elige tu país" (country chooser heading) and "Cotizador de seguro de auto" (page `<title>`), marked "Approved at review round 1 (F06)"; new §8 row *Country chooser*; BR-07 points to §8.1. Q-14 and Q-28 cells untouched. **(4) US-01-R1-F02 (context of F01), AC-28 widened, ID kept:** glossary entry *Anonymous request* (any request Strapi does not authenticate: no header, non-Bearer scheme, empty or invalid `Bearer`, any letter case of `/api`, Strapi's port or the proxy); BR-06 references it; AC-28's draft outline now has 14 rows (7 variants × 2 entry points) and a `publishedAt` check, a new outline for draft countries (5 rows), and a note that error responses satisfy the `Then` and that the other publication parameters are covered by the same rows; write scenario unchanged; §11 e2e table and AC-28 row updated (still 4 e2e files). **(5) ADRs:** ADR-0006 (amends ADR-0001's physical model) referenced in the metadata and in §7 and §10 as in progress. Also: new glossary entry *Wire shape / logical shape*; sources list adds Review R1. No ID renumbered or retired; no ID added. Unchanged: §1, §2, BR-01..BR-05, BR-08, AC-01..AC-13, AC-15..AC-27, §6 (all rows and *Human answer* cells), §7.2, §7.3, §9, §12. Counts: 8 BR, 28 AC (4 original, 24 derived), 28 Q (none blocks HC1). |
| 2026-11-21 | Felipe Sabogal (human) | HC1 round 4 | **Approved** (v0.4) | Spec v0.4 approved as is, together with the acceptance of ADR-0006. Next: tests for the new wire shapes (AC-14 rows, country parser), then the backend and frontend fixes. |
| 2026-11-21 | spec-writer | editorial | v0.4 text aligned with accepted ADR-0006 and the route middleware (US-01-R2-F06); no behaviour change | Metadata *Related ADRs*: ADR-0006 linked and stated as Accepted 2026-11-21 (was "being written"). §10: the "In progress (not yet accepted)" entry replaced by a "Referenced (accepted 2026-11-21)" entry for ADR-0006, which amends ADR-0001's physical model; "Needed" now "none"; implementation note that ADR-0002's published-only rule is a route middleware on `find`/`findOne` via `publishedOnlyConfig()` (c3bdb56, 345a016). No other section, and no BR, AC or Q, changed; version and status unchanged. |
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.5 | Revision after code review round 3 ([reviews/US-01-review-R3.md](../../reviews/US-01-review-R3.md), US-01-R3-F01: with the submit gate moved off Signal Forms, an emptied required date submitted a stale value), applying the human decision of Felipe Sabogal, 2026-11-21, recorded in `tasks.md`, *Gate history*, row "6 Review (round 3)": the form goes back to letting Signal Forms decide validity on submit, and an **optional** `number` field with text the browser cannot parse (`1e`, `2015e`) is an error the user must fix. This supersedes the optional-field part of the US-01-R2-F01 human decision and the v0.4 AC-09 note. Status "Draft — awaiting HC1 (round 5)". **(1) AC-09:** the scenario "A number the browser cannot parse counts as empty" renamed "A required number the browser cannot parse fails the required check" (same steps, plus "still shows "1e""); new outline "An optional number the browser cannot parse blocks "Continuar"" (fixture field "Kilometraje", not seed; rows `1e`, `2015e`: `errorMessage` shown, text kept, step 1 kept, no typed output, store `''`); note rewritten: such a field is invalid until fixed, required → `requiredMessage ?? errorMessage`, optional → `errorMessage` or "Revisa este campo.", never `null`. **(2) BR-01:** one sentence: an unparseable number is not an empty optional field. **(3) §7.3:** stored values: an unparseable number is stored as `''`; typed output: an unparseable number (required or optional) blocks the output and is never mapped to `null`. **(4) AC-21 preamble:** one sentence making explicit the existing exception to "restores exactly what was typed": an unparseable number is stored as `''`, so a reload shows it empty (R2-F01 decision, unchanged; Gherkin unchanged). **(5) §11:** AC-09 row adds the component test (stubbed `validity.badInput`, required and optional). **(6) Sources:** Review R3 added. Unchanged as in v0.4: required unparseable number shows `requiredMessage ?? errorMessage` and blocks; typed text stays visible; store and `sessionStorage` hold `''`. No ID renumbered, retired or added. Unchanged: §1, §2, §3, BR-02..BR-08, AC-01..AC-08, AC-10..AC-20, AC-22..AC-28, §6 (all rows and *Human answer* cells), §7.1, §7.2, §7.4, §7.5, §8, §9, §10, §12. Counts: 8 BR, 28 AC (4 original, 24 derived), 28 Q (none blocks HC1). |
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.5 (corrected, version kept) | Two corrections requested by Felipe Sabogal (human) at HC1 round 5, before his decision, to match the final implementation (commit eeb23e6, `quote-form.ts`: Signal Forms decides validity on submit; a native `number` or `date` control with `validity.badInput` gets a Signal Forms parse error; its control model is deliberately not written, so the typed text stays visible; `syncNative` alone writes `''` for that key to the wizard state). **(1) "Model" wording:** the spec no longer says that unreadable text reaches the form model as `''`. AC-09 note: the input's value is `''` (HTML sanitisation), Signal Forms reports a parse error (field invalid), the wizard state and `sessionStorage` hold `''`, the text stays visible. §7.3 stored values: "raw editing value of the form model" → "raw editing value"; the unreadable-input sentence restated the same way. §10 ADR-0004 summary restated the same way. **(2) Dates too:** BR-01's v0.5 sentence, the AC-09 note, the AC-21 preamble and both §7.3 bullets now say "a `number` or `date` input the browser cannot read" (for example a partly cleared date): invalid whether required or optional; required → `requiredMessage ?? errorMessage`; optional → `errorMessage` or "Revisa este campo."; store `''`. AC-09 Gherkin unchanged (numbers, "Kilometraje" fixture kept). New note under AC-18 (no new scenario) for a cleared or partly cleared CO "Fecha de nacimiento" (US-01-R3-F01): message "Ingresa tu fecha de nacimiento.", focus, store `''`, no typed output with the old date. No ID added, renumbered or retired; no Gherkin, §6 row or *Human answer* cell changed; status unchanged. Counts: 8 BR, 28 AC (4 original, 24 derived), 28 Q (none blocks HC1). |
| 2026-11-21 | Felipe Sabogal (human) | HC1 round 5 | **Approved** (v0.5) | Approved after the requested corrections (model wording, `date` included, AC-21 preamble) and the §11 mapping update for the AC-09/AC-18 component tests (33a0c11). |
| 2026-11-21 | spec-writer (Claude Opus 5.5) | Cross-reference (US-04) | Pointer only; this spec is not rewritten | [US-04 spec](../US-04/spec.md) v0.2 (Approved at HC1, 2026-11-21; US-04-Q-04, Q-18, Q-21) supersedes, for the design-system redesign: **Q-22** (native `<input type="date">`) → a date text box typed as dd/mm/aaaa plus a calendar dialog, stored ISO value unchanged (US-04-BR-06, ADR-0012); **§9** "Native controls are used" → custom controls for `select` and `date` fields (text, number and checkbox stay native; ADR-0012 amends ADR-0004 D7); **BR-02** wording "the first entry is a non-selectable prompt" → the prompt "Selecciona una opción" is the empty shown value, not an option (US-04-BR-05); **AC-26** targets of 24 × 24 CSS px → 44 × 44, automated in US-04-AC-18 (US-04-BR-11). Test titles keep their US-01 AC IDs; the existing tests that change are listed in US-04 spec §11.1. Version and status of this spec unchanged. |
