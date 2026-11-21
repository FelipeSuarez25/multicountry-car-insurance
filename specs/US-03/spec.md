# US-03 — Summary and payment · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (verbatim, not edited) |
| Status | Approved |
| Version | 0.1 |
| Author | spec-writer subagent (Claude Opus 5.5) |
| Approved by | v0.1: Felipe Sabogal, 2026-11-21 (HC1 round 1) |
| Related ADRs | [ADR-0001](../../adr/0001-multi-country-content-strategy.md) (`terms` per country with a required `country` relation; `/:country/resumen`; implementation note: summary route and `summaryStepGuard` registered by US-02), [ADR-0002](../../adr/0002-strapi-access-and-security.md) as amended by [ADR-0005](../../adr/0005-e2e-token-scope-for-relations.md) (public `find` on terms, proxy `/api/terms`, published-only reads, e2e token scope), [ADR-0003](../../adr/0003-wizard-state-persistence.md) (clear on successful payment, keep on rejected payment, terms and payment data never stored), [ADR-0006](../../adr/0006-strapi-physical-model-adjustments.md) (typed attributes, `localeTag`), [ADR-0007](../../adr/0007-simulated-price-rule.md) (`calculateFinalPrice` reused), [ADR-0008](../../adr/0008-simulated-payment.md) (simulated payment; resolves US-03-Q-01; Accepted at HC2, 2026-11-21), [ADR-0009](../../adr/0009-terms-rich-text-rendering.md) (terms rich-text format and safe rendering; resolves US-03-Q-02; Accepted at HC2, 2026-11-21). See §10. |

Sources cited in this spec:

- **Story**: [story.md](story.md).
- **Assessment**: requirements quoted verbatim from the assessment PDF by the orchestrator (not in
  the repository).
- **US-01**: [specs/US-01/spec.md](../US-01/spec.md) v0.5 (Approved): the typed step 1 output and
  reserved keys (§7.3), code-owned copy (§8.1), seed values ([seed-fields.md](../US-01/seed-fields.md)).
- **US-02**: [specs/US-02/spec.md](../US-02/spec.md) v0.1 (Approved): the stored `plan: { key }`,
  the offered plans, price display and formatting (BR-03), what it handed to US-03 (§7.4), and the
  summary route and guard (US-02-Q-03, US-02-AC-15).
- **ADR-0001..0009**: accepted ADRs (precedence level 2; ADR-0008 and ADR-0009 accepted at HC2,
  2026-11-21, for US-03-Q-01 and US-03-Q-02), with the implementation notes in
  [adr/README.md](../../adr/README.md).
- **Reviews** of US-01 (R1..R4) and US-02 (R1, R2): lessons for a new content type (published-only
  router config, anonymous variants in the draft checks, no bespoke backend code where the schema
  suffices) and the `review-checklist` items on rich text, masking and the disabled pay button.

## 1. Summary

Step 3 of the quote wizard. After choosing a plan, a person in Colombia or Chile sees a summary
of their data, their vehicle's data and the chosen plan with its final price; the document number
is partially masked. From the summary they can go back to edit their data or change the plan.
They read the terms and conditions configured in Strapi for their country, accept them, and pay.
Payment is simulated: no real gateway, no card data. While the simulated payment runs, the pay
button is locked so it cannot be submitted twice. On success the stored quote is cleared and a
confirmation with a simulated quote number is shown; on rejection a clear message is shown and the
person can try again with all their information intact. The same build serves both countries.

## 2. Scope

**In scope**

- The summary page attached to the existing route `/:country/resumen`, behind the existing
  `summaryStepGuard`, without changing the address or the guard (ADR-0001 implementation note).
- Showing step 1 values with their Strapi labels, the chosen plan and its final price (reusing
  `calculateFinalPrice`, ADR-0007, and the US-02 money formatter); masking the document number.
- "Editar mis datos" and "Cambiar plan" back to steps 1 and 2.
- A per-country terms content type in Strapi (ADR-0001), its seed for CO and CL
  ([seed-terms.md](seed-terms.md)), public read access (ADR-0002 anticipates `find` and
  `/api/terms`), safe rendering of its formatted text.
- Accepting the terms, the pay button state, the simulated payment (success and rejection), double
  submit prevention, the simulated quote number, the confirmation, and clearing the wizard state on
  success (ADR-0003).
- Loading, error, retry and "not available" states of the terms.
- Keyboard-only use, accessible names, focus management, mobile and desktop layouts.
- Completing the assessment's full-flow e2e `frontend/e2e/us-01-03-full-flow-co.spec.ts` with the
  summary, terms, payment and confirmation.

**Out of scope**

- Real payment gateways, card or bank data of any kind, real charges ("Payment is simulated: a
  button that leads to a confirmation screen or a mock gateway. Do not integrate real payment
  gateways or use real card data.", Assessment).
- Issuing a policy, sending e-mails, PDFs or receipts, storing quotes on a server ("a database is
  not required", Assessment).
- Versioning of the terms or recording which version was accepted (US-03-Q-12).
- Requiring the person to scroll to the end of the terms before accepting (US-03-Q-12).
- Editing data inline on the summary; returning from step 1 straight to the summary (US-03-Q-11).
- Masking any value other than the document number; reformatting typed values (plates, RUT).
- Payment instalments, discounts, taxes.

## 3. Glossary

Terms defined in the US-01 and US-02 glossaries (country context, published, wizard state, typed
step 1 output, reserved key, offered plan, plan key, final price, today, editor) keep their meaning.

| Term | Meaning in this project |
|---|---|
| Summary | Step 3 of the wizard at `/:country/resumen`: the person's data, the chosen plan, the terms and the pay action. |
| Terms | The terms and conditions of one country: one published Strapi document of the terms content type (§7.1). |
| Accepting the terms | Checking the code-owned checkbox "Acepto los términos y condiciones". Held in the page's memory only (US-03-Q-10). |
| Masked document number | The display form of the reserved `documentNumber` value defined in BR-02. Computed at display time; never stored (ADR-0003). |
| Simulated payment | A front-end-only stand-in for a payment gateway, with a deterministic outcome and no card data (BR-08, US-03-Q-01). |
| Payment attempt | One activation of "Pagar" that the simulated payment accepts, from the start of processing to its outcome. |
| Quote number | The simulated identifier shown on the confirmation (US-03-Q-07). Not stored and not sent anywhere. |
| Confirmation | What the person sees after a successful payment (US-03-Q-06, US-03-Q-13). |

## 4. Business rules

| ID | Original (source) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-03-BR-01 | Story: "The summary shows the policyholder's data, the vehicle's data and the chosen plan with its final price." | The summary shows, from the typed step 1 output re-derived on entry (US-02-Q-17) and the field configuration of this page load: one row per configured field that has a non-empty value, except `checkbox` fields, with the field's Strapi `label` and its display value (US-03-Q-05). Rows are grouped under "Tu vehículo" (reserved keys `plate`, `make`, `model`, `vehicleYear`) and "Tus datos" (every other key), each in `sortOrder`; a group with no rows is not shown. Display values: `select` → the option's Strapi label; `date` → long Spanish date from the country's `locale` ("15 de mayo de 1990"); `number` → digits with no grouping ("2022"); `text` → as entered (trimmed), except `documentNumber` (BR-02). The chosen plan (`plan.key`) is shown with its name, short description and final price `calculateFinalPrice(basePrice, step 1 output, today)` (ADR-0007), formatted as in US-02-BR-03 with the caption "Precio anual" (US-03-Q-14). | US-03-AC-01, US-03-AC-06 |
| US-03-BR-02 | Story: "The document number is shown partially masked." | The value of the reserved key `documentNumber` is shown masked (US-03-Q-04): let *n* be the number of letters and digits in the value; the last *k* = min(4, ⌊n/2⌋) letters and digits stay visible, every earlier letter or digit becomes "•" (U+2022), and every other character (dots, dashes, spaces) stays in place. The same function applies to every country (no country branch). The full number never appears in the DOM, the document title, the URL or a log on the summary or confirmation. The rule applies only to `documentNumber`. | US-03-AC-05 |
| US-03-BR-03 | Story: "From the summary the person can go back to edit their data or change the plan." | "Editar mis datos" navigates to `/<country>/datos` and "Cambiar plan" to `/<country>/planes`, each as a new history entry. Step 1 values and the chosen plan are kept (ADR-0003, US-02-BR-07). The person returns to the summary through the normal flow (step 1 "Continuar" → step 2 → "Continuar"); the price is recomputed. Leaving the summary discards the terms acceptance and the payment simulation choice (US-03-Q-10, Q-11). Both actions are unavailable during a payment attempt (BR-05). | US-03-AC-07 |
| US-03-BR-04 | Story: "The pay button is enabled only after accepting the terms and conditions." | "Pagar" is enabled if and only if the terms of the country are shown (loaded and well-formed) **and** "Acepto los términos y condiciones" is checked **and** no payment attempt is in progress. Otherwise it is perceivably disabled (`aria-disabled="true"`, stays focusable), activating it does nothing, and the reason is shown next to it and linked to it (US-03-Q-17). Unchecking disables it again. | US-03-AC-02, US-03-AC-08, US-03-AC-12 |
| US-03-BR-05 | Story: "The payment cannot be submitted twice." | One activation of an enabled "Pagar" starts exactly one payment attempt. From that moment until the outcome, "Pagar" is disabled and reads "Procesando pago…", the terms checkbox, the simulation choice, "Editar mis datos" and "Cambiar plan" are unavailable, and further activations (click, Enter, Space, repeated quickly) start no other attempt. After a success no further attempt is possible; after a rejection a new attempt is possible (BR-08). | US-03-AC-03, US-03-AC-09 |
| US-03-BR-06 | Story: "On successful payment, a confirmation with a simulated quote number is shown." | On a successful attempt the wizard state is deleted (the `quote-wizard` entry and the store's in-memory state; ADR-0003: "Entry deleted before the confirmation is shown") and then the confirmation is shown with a quote number of the format `COT-<country code>-<YYYYMMDD of today>-<6 digits>` (US-03-Q-07), kept in memory only. After that, a reload or the browser back action leads to an empty step 1 of the same country through the existing guards. | US-03-AC-03, US-03-AC-10, US-03-AC-11 |
| US-03-BR-07 | Story context: "accept the terms and conditions, whose text varies by country and is managed by the business team from Strapi." | The summary shows the terms of the current country: the published terms documents related to that country, the most recently published one if there are several, skipping malformed ones (US-03-Q-12). Draft-only terms and terms of other countries are never shown, and no anonymous caller can read drafts (ADR-0002). Publishing a change is reflected on the next full page load with no code change. The text keeps its formatting (headings, paragraphs, lists, bold, italic) and is rendered without executing anything an editor typed (US-03-Q-02). No terms text exists in front-end code. | US-03-AC-02, US-03-AC-12, US-03-AC-13, US-03-AC-14, US-03-AC-19 |
| US-03-BR-08 | Story context: "Payment is simulated for this test." Story scenario "Rejected payment". Assessment: "Payment is simulated: a button that leads to a confirmation screen or a mock gateway. Do not integrate real payment gateways or use real card data." | The payment runs entirely in the browser, sends no request and asks for no card, bank or personal data. Its outcome is deterministic and selectable (proposed: a visible "Simulación de pago" choice, US-03-Q-01, ADR needed); processing takes a fixed simulated time (proposed 1.5 s). A rejected attempt shows a clear message, clears nothing (ADR-0003: "Rejected payment: Nothing cleared"), keeps the terms accepted and the simulation choice, and lets the person retry. | US-03-AC-04, US-03-AC-15, US-03-AC-19 |

## 5. Acceptance criteria

Conventions for every scenario:

- "I completed step 1 in Colombia" means the values of US-01-AC-04; "in Chile" means the values in
  the US-02 spec §5 conventions (RUT "12.345.678-5", Nombre completo "Ana Prueba Ficticia", Fecha
  de nacimiento 1990-05-15, Ciudad "Santiago", Patente "BCDF12", Marca "Kia", Modelo "Rio 5",
  Año 2022, consent checked). All values are fictitious seed values.
- "I chose a plan" means "Plan Total" in Colombia and "Plan Protegido" in Chile, then "Continuar"
  on step 2. Today is pinned to **2026-11-21** (final prices $2.310.000 and $528.000, US-02-AC-07).
- Terms are the seed of [seed-terms.md](seed-terms.md).
- "The simulated payment fails / succeeds" means the outcome of the simulated payment is set to
  rejected / approved. With the proposed default of US-03-Q-01 that is the "Simulación de pago"
  choice "Pago rechazado" / "Pago aprobado"; if the ADR decides another mechanism, only this
  convention changes.
- Prices are compared with whitespace removed (US-02-BR-03). Code-owned copy is in §8.1.

### US-03-AC-01 — Complete summary

```gherkin
Scenario Outline: Complete summary
  Given I completed step 1 in <country> and I chose a plan
  When I reach the summary
  Then the address is "/<code>/resumen" and I see the heading "Resumen de tu cotización"
  And under "Tus datos" I see, in this order: <holder rows>
  And under "Tu vehículo" I see, in this order: <vehicle rows>
  And under "Plan elegido" I see "<plan>", its short description and "<price>" with "Precio anual"

  Examples:
    | country  | code | holder rows | vehicle rows | plan | price |
    | Colombia | co | "Tipo de documento" "Cédula de ciudadanía"; "Número de documento" "••••••5678"; "Nombre completo" "Ana Prueba Ficticia"; "Fecha de nacimiento" "15 de mayo de 1990"; "Ciudad" "Medellín" | "Placa" "ABC123"; "Marca" "Mazda"; "Línea" "3 Touring"; "Modelo (año)" "2022" | Plan Total | $2.310.000 |
    | Chile    | cl | "RUT" "••.•••.678-5"; "Nombre completo" "Ana Prueba Ficticia"; "Fecha de nacimiento" "15 de mayo de 1990"; "Ciudad" "Santiago" | "Patente" "BCDF12"; "Marca" "Kia"; "Modelo" "Rio 5"; "Año" "2022" | Plan Protegido | $528.000 |
```

The consent checkbox is not listed (BR-01). The price equals the one shown on step 2 for the same
data and day (ADR-0007).

### US-03-AC-02 — Terms by country

```gherkin
Scenario Outline: Terms by country
  Given I am on the summary in <country>
  When I view the terms and conditions
  Then I see the title "<title>" and the heading "<heading>" of the <country> terms in Strapi
  And I do not see "<other heading>"
  And the pay button is disabled until I accept them

  Examples:
    | country  | title                                                    | heading                 | other heading           |
    | Colombia | Términos y condiciones del seguro de auto – Colombia     | Condiciones principales | Condiciones generales   |
    | Chile    | Términos y condiciones del seguro automotriz – Chile     | Condiciones generales   | Condiciones principales |
```

### US-03-AC-03 — Successful payment

```gherkin
Scenario: Successful payment
  Given I am on the summary in Colombia and I accepted the terms
  And the simulated payment succeeds
  When I click pay
  Then the button is locked while the payment is processed: it is disabled and reads "Procesando pago…"
  And I see the confirmation heading "Pago confirmado"
  And I see "Tu número de cotización es" followed by a number matching ^COT-CO-20261121-\d{6}$
```

### US-03-AC-04 — Rejected payment

```gherkin
Scenario: Rejected payment
  Given I am on the summary in Chile and I accepted the terms
  And the simulated payment fails
  When I click pay
  Then I see the message "El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo."
  And I am still on "/cl/resumen" with my data, "Plan Protegido" at "$528.000", and the terms still accepted
  And "Pagar" is enabled again
  When the simulated payment succeeds and I click pay
  Then I see the confirmation heading "Pago confirmado"
```

A reload after the rejection also keeps the data and the plan (ADR-0003); the terms acceptance is
reset by the reload (US-03-Q-10).

### US-03-AC-05 — Masked document number (derived from US-03-BR-02 / Q-04)

```gherkin
Scenario Outline: Masked document number
  When the document number <value> is masked
  Then the shown text is <masked>
  And the accessible text is "Número oculto, termina en <tail>"

  Examples:
    | value          | masked         | tail   | why |
    | "1012345678"   | "••••••5678"   | 5678   | 10 digits, last 4 visible |
    | "12.345.678-5" | "••.•••.678-5" | 678-5  | separators stay in place |
    | "123456785"    | "•••••6785"    | 6785   | RUT typed without dots and dash |
    | "12345678-K"   | "•••••678-K"   | 678-K  | check digit K |
    | "12345678"     | "••••5678"     | 5678   | 8 characters |
    | "123456"       | "•••456"       | 456    | 6 characters: half visible |
    | "AB"           | "•B"           | B      | 2 characters |
    | "1"            | "•"            | (none) | nothing visible; accessible text is "Número oculto" |

Scenario: The full number never reaches the page
  Given I completed step 1 in Colombia with Número de documento "1012345678"
  When I reach the summary
  Then the page's DOM, the document title and the address do not contain "1012345678" nor "101234"
```

### US-03-AC-06 — How step 1 values are shown (derived from US-03-BR-01 / Q-05)

```gherkin
Scenario Outline: How step 1 values are shown
  Given the Colombia field configuration of this page load
  And the typed step 1 output has <key> = <value>
  When the summary is shown
  Then <result>

  Examples:
    | key           | value                          | result |
    | documentType  | "CC"                           | the row "Tipo de documento" shows "Cédula de ciudadanía" (the option label) |
    | birthDate     | "1990-05-15"                   | the row "Fecha de nacimiento" shows "15 de mayo de 1990" |
    | vehicleYear   | 2022                           | the row "Modelo (año)" shows "2022" (no thousands separator) |
    | model         | "3 Touring"                    | the row "Línea" is under "Tu vehículo" |
    | dataConsent   | true                           | no row for the consent checkbox |
    | mobilePhone   | null (an editor-added optional text field, left empty) | no row for "Teléfono celular" |
    | mobilePhone   | "3001234567" (editor-added)    | the row "Teléfono celular" is under "Tus datos", in sortOrder, unmasked |
```

### US-03-AC-07 — Edit data or change the plan (derived from US-03-BR-03 / Q-11)

```gherkin
Scenario: Edit my data
  Given I am on the summary in Colombia and I accepted the terms
  When I activate "Editar mis datos"
  Then the address is "/co/datos" and every field shows the value I entered
  When I change "Modelo (año)" to 2015 and activate "Continuar"
  Then I am on "/co/planes" and "Plan Total" is still chosen
  When I activate "Continuar"
  Then the summary shows "Modelo (año)" "2015" and "Plan Total" at "$1.890.000"
  And "Acepto los términos y condiciones" is unchecked and "Pagar" is disabled

Scenario: Change the plan
  Given I am on the summary in Colombia
  When I activate "Cambiar plan"
  Then the address is "/co/planes" and "Plan Total" is chosen
  When I choose "Plan Básico" and activate "Continuar"
  Then the summary shows "Plan Básico" at "$935.000"
```

$1.890.000 = 2 100 000 × 1.00 × 0.90 (vehicle 11 years old, ADR-0007).

### US-03-AC-08 — Pay enabled only with accepted terms (derived from US-03-BR-04 / Q-17)

```gherkin
Scenario: Pay button follows the terms checkbox
  Given I am on the summary in Chile and the terms are shown
  Then "Pagar" is disabled and the text "Acepta los términos y condiciones para pagar." is its accessible description
  When I activate "Pagar"
  Then no payment attempt starts and I stay on the summary
  When I check "Acepto los términos y condiciones"
  Then "Pagar" is enabled and the hint is not shown
  When I uncheck it
  Then "Pagar" is disabled again
```

### US-03-AC-09 — The payment cannot be submitted twice (derived from US-03-BR-05 / Q-08)

```gherkin
Scenario: The payment cannot be submitted twice
  Given I am on the summary in Colombia, I accepted the terms and the simulated payment succeeds
  When I activate "Pagar" three times within 200 ms (click, Enter and click)
  Then exactly one payment attempt is processed
  And during processing "Pagar", the terms checkbox, the simulation choice, "Editar mis datos" and "Cambiar plan" cannot be activated
  And exactly one confirmation with one quote number is shown
```

### US-03-AC-10 — Simulated quote number (derived from US-03-BR-06 / Q-07)

```gherkin
Scenario Outline: Simulated quote number
  Given today is <today>, the country is <code> and the random source yields <digits>
  When a payment succeeds
  Then the quote number is "<number>"

  Examples:
    | today      | code | digits | number                 |
    | 2026-11-21 | CO   | 482913 | COT-CO-20261121-482913 |
    | 2026-11-21 | CL   | 000007 | COT-CL-20261121-000007 |
    | 2027-01-05 | CO   | 999999 | COT-CO-20270105-999999 |
```

The quote number is not written to `sessionStorage`, not sent in any request and not put in the
address or the document title.

### US-03-AC-11 — The quote is closed after a successful payment (derived from US-03-BR-06 / Q-13, ADR-0003)

```gherkin
Scenario: The quote is closed after a successful payment
  Given I completed a successful payment in Colombia and I see the confirmation
  Then sessionStorage has no "quote-wizard" entry
  When I activate "Nueva cotización"
  Then the address is "/co/datos" and every step 1 field is empty

Scenario Outline: Leaving the confirmation
  Given I completed a successful payment in Colombia and I see the confirmation
  When I <action>
  Then the address is "/co/datos", every step 1 field is empty and no plan is chosen

  Examples:
    | action |
    | reload the page |
    | use the browser back action |
```

### US-03-AC-12 — Terms cannot be loaded or are not available (derived from US-03-BR-04, BR-07 / Q-12)

```gherkin
Scenario: Terms cannot be loaded
  Given I am on the summary in Colombia
  And the content backend does not answer the terms request within 10 seconds, or answers with an error
  Then the summary data and the plan are shown
  And in the terms section I see "No pudimos cargar los términos y condiciones. Intenta de nuevo." and "Reintentar"
  And there is no terms checkbox and "Pagar" is disabled
  When the content backend is available again and I activate "Reintentar"
  Then the Colombia terms are shown

Scenario: No terms available
  Given there are no published, well-formed terms for Chile
  When I am on the summary in Chile
  Then I see "Los términos y condiciones no están disponibles en este momento. No es posible pagar."
  And there is no terms checkbox and "Pagar" is disabled
```

### US-03-AC-13 — Terms content is rendered safely (derived from US-03-BR-07 / Q-02)

```gherkin
Scenario: Formatting is kept
  When the Colombia seed terms are shown
  Then "Condiciones principales" is a heading inside the terms
  And the three conditions are items of one bulleted list
  And "ficticio" is emphasised as bold

Scenario Outline: Editor input is never executed
  Given the published terms contain the text <text>
  When the terms are shown
  Then the text <text> is displayed literally
  And no element, attribute or script from it is added to the page

  Examples:
    | text |
    | "<img src=x onerror=alert(1)>" |
    | "<script>alert(1)</script>" |
    | "<b>negrita</b>" |
```

With the proposed default format (US-03-Q-02), a link is shown as its text only, an image is
dropped and a quote or code block is shown as a plain paragraph; each drop logs a `console.warn`
naming the node type, never the text. Front-end code uses no `bypassSecurityTrust*` and no
unsanitised `[innerHTML]` (review checklist).

### US-03-AC-14 — Which terms are shown (derived from US-03-BR-07 / Q-12)

```gherkin
Scenario: Draft and other-country terms are never shown
  Given the seed terms
  When I am on the summary in Colombia
  Then I do not see "Borrador no publicado" nor any text of the Chile terms

Scenario: Terms change without deployment
  Given the business team publishes in Strapi new terms for Chile titled
    "Términos y condiciones de prueba – Chile" with one paragraph "Texto de prueba publicado."
  And the running front-end build and its configuration are not changed
  When I reload the summary in Chile
  Then I see "Términos y condiciones de prueba – Chile" and "Texto de prueba publicado."
  And I do not see "Condiciones generales"
  And the Colombia summary still shows the Colombia terms
```

The second scenario also proves "most recently published wins". The test deletes the new terms in
teardown, also on failure.

### US-03-AC-15 — Simulated payment, no card data (derived from US-03-BR-08 / Q-01)

Written for the proposed default of US-03-Q-01; rewritten at the next spec revision if the ADR
decides otherwise (the ID stays).

```gherkin
Scenario: Simulated payment, no card data
  Given I am on the summary in Colombia
  Then I see the group "Simulación de pago (no se realiza ningún cobro)" with the options "Pago aprobado" and "Pago rechazado"
  And "Pago aprobado" is selected
  And the page has no field for a card number, expiry date, security code or bank account
  When I accept the terms and activate "Pagar"
  Then no network request is sent between the activation and the confirmation
  And the outcome is shown 1.5 seconds after the activation (simulated processing time)
```

### US-03-AC-16 — Keyboard-only summary and payment (derived from Assessment: accessibility)

```gherkin
Scenario: Keyboard-only summary and payment
  Given I completed step 1 and chose "Plan Total" in Colombia using only the keyboard, on a desktop viewport
  When the summary is shown
  Then the keyboard focus is on the heading "Resumen de tu cotización"
  And the document title is "Resumen de tu cotización | Cotizador de seguro de auto"
  When I press Tab repeatedly
  Then the focus order is: "Editar mis datos", "Cambiar plan", the terms region, "Acepto los términos y condiciones", the simulation group, "Pagar"
  And the terms region can be scrolled with the arrow keys while focused
  When I press Space on "Acepto los términos y condiciones", Tab to "Pagar" and press Enter
  Then the focus is on the heading "Pago confirmado"
  And the document title is "Pago confirmado | Cotizador de seguro de auto"
  And every focused control showed a visible focus indicator
```

### US-03-AC-17 — Accessible summary and payment (derived from Assessment: accessibility)

```gherkin
Scenario: Accessible summary and payment
  Given the summary is shown in Chile
  Then "Tus datos", "Tu vehículo", "Plan elegido" and "Términos y condiciones" are headings of level 2
  And each data row exposes its label and value as a term and its description
  And the terms are a region whose accessible name is the terms title
  And the terms checkbox has the accessible name "Acepto los términos y condiciones"
  And the simulation options are one radio group with an accessible name
  When a payment attempt is in progress
  Then the summary is marked busy and "Procesando pago…" is announced once
  When the payment is rejected
  Then the rejection message is announced once by assistive technology and the focus stays on "Pagar"
```

### US-03-AC-18 — Mobile and desktop layout (derived from Assessment: responsive)

```gherkin
Scenario Outline: Mobile and desktop layout
  Given the viewport is <width> × <height> CSS pixels
  When I open the summary in Colombia after choosing a plan
  Then the page has no horizontal scroll
  And every data row, the plan, the price and the terms region are readable without zooming
  And every control has a target size of at least 24 × 24 CSS pixels
  And I can accept the terms, pay and see the confirmation

  Examples:
    | width | height |
    | 360   | 740    |
    | 1280  | 800    |
```

Verification: manual at HC3, with screenshots of the CO summary and of the confirmation at each
size attached to the HC3 record (as US-02-AC-18).

### US-03-AC-19 — Read-only terms access, data stays in the browser (derived from US-03-BR-07, BR-08 / Assessment: security)

```gherkin
Scenario: No personal data leaves the browser on the summary and payment
  Given I completed step 1 in Colombia with the values of US-01-AC-04 and chose "Plan Total"
  When I reach the summary, accept the terms, pay and see the confirmation
  Then every request to the content backend during that time is an HTTP GET without an Authorization header
  And no request contains any step 1 value I entered, the plan key or the quote number

Scenario Outline: Anonymous requests never return draft terms
  When an anonymous client sends <authorization> and requests the terms at the path <path>
    with "status=draft" and the Colombia country filter through <entry point>
  Then the response contains no entry titled "Términos y condiciones (borrador)"
  And every entry the response returns, if any, has a non-null "publishedAt"

  Examples:
    | entry point                                  | path          | authorization                  |
    | Strapi's own port (bypassing the proxy)      | "/api/terms"  | no Authorization header        |
    | Strapi's own port (bypassing the proxy)      | "/API/terms"  | no Authorization header        |
    | Strapi's own port (bypassing the proxy)      | "/api/terms"  | the header Authorization "foo" |
    | the same-origin proxy at the relative "/api" | "/api/terms"  | no Authorization header        |

Scenario: Writes through the same-origin proxy are rejected
  When an anonymous client sends "POST /api/terms" through the same-origin proxy with Colombia terms titled "security-probe"
  Then the response status is 405
  And an anonymous read of the Colombia terms returns no entry titled "security-probe"
```

The REST path `/api/terms` holds for either answer of US-03-Q-03. The backend test
`published-only-routes.test.ts` walks every `api::*` content type and covers the terms router
with no change.

## 6. Gaps and open questions

Gaps marked **[Blocks HC1]** change ACs, a content contract, a binding rule or need an ADR, so they
need an explicit answer. For the others, the proposed default applies if the human does not answer.

| ID | Gap | Why it matters | Proposed default | Human answer |
|---|---|---|---|---|
| US-03-Q-01 | **[Blocks HC1] [ADR]** How does the simulated payment decide success or failure **deterministically**, so that "Given the simulated payment fails" can be set up and the e2e can test the rejected path with the same build? How long does processing take? Is any payment data asked for? | AC-03, AC-04, AC-09, AC-15 and both e2e files depend on it. No card data may be used (Assessment), and the same build serves tests and users, so a test-only switch in code is not available. It is a design that a real gateway would later replace. | Decided by an ADR (§10). Proposal: a visible, code-owned "Simulación de pago (no se realiza ningún cobro)" radio group on the summary with "Pago aprobado" (selected by default) and "Pago rechazado"; no card fields at all. A front-end simulated payment service takes the outcome, waits a fixed 1.5 s through an injectable delay (fake timers in unit tests), sends no request and resolves to success or rejection. Alternatives for the ADR: a mock gateway page with "Aprobar" / "Rechazar" after "Pagar" (the outcome is not set before the click, so the story's "Given … fails, When I click pay" reads differently); a fake card form with fictitious test card numbers (invites real card entry); a hidden trigger (a magic data value or a URL parameter: not discoverable, test-only behaviour in production). | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-02 | **[Blocks HC1] [ADR]** Terms content model and rendering: plain text, Markdown (`richtext`) or Strapi `blocks`? How is editor-managed formatted text rendered without XSS? | Determines the content type, the parser, whether a new dependency is added, and the security review item "Rich text from Strapi is rendered safely". The same choice is likely to apply to future rich content (help texts). | Decided by an ADR (§10). Proposal: Strapi `blocks` (structured JSON from the admin's rich-text editor, no free JSON typed by editors, ADR-0006), rendered by a small Angular component that maps a whitelist of nodes to elements through template bindings only: paragraph, heading (shown one level below the section heading), ordered and unordered list, text with bold, italic, underline and strikethrough. A link shows its text only, a quote or code block is shown as a paragraph, an image is dropped; each fallback logs a warning naming the node type. No `[innerHTML]`, no sanitiser bypass, no new dependency. Alternatives: `richtext` Markdown with a parser library and `[innerHTML]` through Angular's sanitiser (new pinned dependency, HTML string path); plain `text` split into paragraphs on blank lines (no formatting, safest). | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-03 | **[Blocks HC1]** CLAUDE.md §6 and ADR-0002 name the content type `terms` (`api::terms.terms.find`, `/api/terms`). Strapi 5.63.0 refuses a content type whose singular and plural names are equal: `backend/node_modules/@strapi/core/dist/loaders/apis.js:44-62` (`validateContentTypesUnicity` pushes the singular name, then throws "The plural name … should be unique" for the same plural). | The backend would not start. CLAUDE.md is precedence level 1, so the spec cannot silently pick another name. | singularName `term`, pluralName `terms`: API ID `api::term.term`, public permission `api::term.term.find`, REST path `/api/terms` (the proxy path of ADR-0002 is unchanged). The human updates the CLAUDE.md §6 example; the architect records an implementation note on ADR-0002 (permission name only, decision unchanged). Alternative: singular `terms-and-conditions`, plural `terms-and-conditions-entries` (path and permission both change). | OK; CLAUDE.md §6 example corrected by the orchestrator (singular `term`, plural `terms`). — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-04 | **[Blocks HC1]** Masking rule: which characters are shown? Same rule for both countries, or per country in Strapi (ADR-0001 foresaw "a document masking rule" on `country`)? Mask character? What does a screen reader hear? | Privacy (story rule), AC-05 values, and the `review-checklist` masking item. | BR-02: keep the last min(4, ⌊n/2⌋) letters and digits, replace earlier letters and digits with "•", keep separators in place; one rule in a pure front-end function for every country (no country branch; a per-country rule on `country` is the upgrade path, as ADR-0007 option B). The masked string is hidden from assistive technology and replaced by "Número oculto, termina en <tail>". Masking happens at display time on the full stored value (ADR-0003). | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-05 | **[Blocks HC1]** Which step 1 data are shown and how? The form is editor-defined (keys can be added or removed) and has no sections (US-01-Q-25), but the story names "policyholder's data" and "vehicle's data". Select values, dates, numbers, empty optional fields, checkboxes? | Defines AC-01 and AC-06. A wrong reading either hides data the person must confirm or shows codes ("CC") instead of labels. | BR-01: every configured field with a non-empty value except checkboxes, with its Strapi label; groups by reserved key (`plate`, `make`, `model`, `vehicleYear` → "Tu vehículo"; every other key → "Tus datos"); select → option label; date → `Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })` on the ISO date ("15 de mayo de 1990"); number → plain digits; text as entered. Alternative: an optional enumeration `summaryGroup` (`holder`, `vehicle`, `hidden`) on `form-field`, so editors place new fields (schema, seed and parser change on US-01's content type). | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-06 | **[Blocks HC1]** Where is the confirmation: a state of the `/resumen` page, or a fourth route (for example `/:country/confirmacion`)? | ADR-0001's route table has no confirmation route; adding one needs an ADR-0001 note or amendment and a guard. It changes AC-03, AC-11 and the e2e. | A state of the summary page at `/:country/resumen`: after success the page replaces its content with the confirmation, moves focus to "Pago confirmado" and changes the document title. No new route, guard or ADR. A reload or back afterwards goes through the existing guards to an empty step 1 (AC-11). Alternative: `/:country/confirmacion`, navigated with `replaceUrl`, with a guard that requires an in-memory confirmation (else `/<country>/datos`); needs an ADR-0001 implementation note by the architect. | OK. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-07 | Quote number format and source. | AC-10; must be visibly simulated, fictitious and testable. | `COT-<country code>-<YYYYMMDD>-<6 digits>`, date from the injectable clock (US-01-Q-06), digits from `crypto.getRandomValues` behind an injectable source, zero-padded. Kept in memory only; never stored, sent, logged or put in the URL. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-08 | Double submit: what is locked, for how long, and how is it shown? | Story rule; the review checklist requires the state to be perceivable. | BR-05: an in-flight flag in the payment service plus `aria-disabled` on every action of the page during the attempt, "Pagar" reads "Procesando pago…", the summary has `aria-busy="true"`. A reload during processing abandons the attempt and clears nothing. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-09 | Rejected payment: which message, what is kept, where does the focus go? | "A clear error message" and "try again without losing my information" (story). | BR-08: the message of AC-04 in a `role="alert"` region next to "Pagar"; step 1 values, plan, terms acceptance and simulation choice kept; focus stays on "Pagar". The message disappears when a new attempt starts. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-10 | Is the terms acceptance stored? | ADR-0003 lists terms under "Not stored"; a stored acceptance would also outlive changed terms. | In the page's memory only: kept after a rejected payment, reset on reload and when leaving the summary. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-11 | What do "go back to edit data / change the plan" do to the state, and where does the person land afterwards? | Story rule 3; data must not be lost, and a changed step 1 can change the price. | BR-03: plain navigation to steps 1 and 2 with everything kept (US-02-AC-13); back to the summary through the normal flow, so the person sees the recomputed price on step 2 first. Browser back from the summary goes to step 2. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-12 | Terms: per country, how many, which one if several, versioned, loading/error/empty, must the person scroll to the end? | BR-07, AC-12, AC-14. Strapi cannot enforce "one per country" without bespoke code (ADR-0007, option C analysis). | One terms type with a required `country` relation (ADR-0001). The front end requests the country's published terms sorted by `publishedAt` descending and shows the first well-formed one; a second one logs a warning. No versioning or record of acceptance. "Cargando términos y condiciones…" while loading; 10 s timeout or error → error with "Reintentar" (no automatic retry); none well-formed → "not available" message. Pay is impossible in every state but "shown". Terms are shown inline in a focusable scrollable region; no scroll-to-end requirement. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-13 | What does the confirmation show, and what happens afterwards? | ADR-0003: "the confirmation keeps only the simulated quote number in memory". | "Pago confirmado", "Tu número de cotización es" + number, "Este es un pago simulado; no se realizó ningún cobro real.", and "Nueva cotización" → `/<country>/datos` (empty). No plan, price or personal data on the confirmation. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-14 | Which plan details does the summary show? | "The chosen plan with its final price" (story). | Name, short description, final price with "Precio anual". Coverages and benefits are reachable through "Cambiar plan". | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-15 | Which summary copy is in code? | Same rule as US-01-Q-14 and US-02-Q-16. | §8.1, Spanish, the same for both countries; the terms text, field labels, option labels and plan content come from Strapi. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-16 | Which e2e files does US-03 add? | §11; run time of the gate. | One new file (seven in total): `frontend/e2e/us-03-summary-payment-cl.spec.ts` (CL summary and masking, CL terms, rejected payment and retry, terms change through the Node process, terms API security rows). `us-01-03-full-flow-co.spec.ts` is completed with the CO summary, terms, payment, confirmation and keyboard path. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-03-Q-17 | Disabled "Pagar": native `disabled` or `aria-disabled`? | A natively disabled button leaves the Tab order, so keyboard and screen-reader users cannot discover why (review checklist: "its state is perceivable, and the reason … is explained"). | `aria-disabled="true"`, focusable, activation ignored, with the hint "Acepta los términos y condiciones para pagar." visible and referenced by `aria-describedby` while the terms are shown and not accepted. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |

Checklist items with no gap: *deep links* — `summaryStepGuard` (US-02-AC-15) already protects the
summary; US-03 does not change it. *Configuration change mid-flow* — fields and plans are loaded
once per page load and the guards revalidate them; the price is recomputed (ADR-0007). *Country
switch* — ADR-0003 clears the state. *Currency formatting* — US-02-BR-03 is reused. *Timezone of
today* — US-01-Q-06.

## 7. Content contract (what Strapi must provide)

Logical model below; the physical model follows ADR-0001 (required `manyToOne` `country` relation,
`strictRelations: true` already set), ADR-0006 (typed attributes, no free JSON) and the
`strapi-content-modeling` conventions. Names subject to US-03-Q-03.

### 7.1 Terms collection type (per country, draft & publish on)

| Attribute | Strapi type | Rules |
|---|---|---|
| `title` | string, required, `maxLength: 150` | Spanish, non-blank. Shown as the terms heading and the region's accessible name. |
| `body` | `blocks` per ADR-0009 (US-03-Q-02), required | Spanish formatted text. |
| `country` | required `manyToOne` relation to `country` | ADR-0001; publishing without it is rejected (`strictRelations`). |

No `key`, `sortOrder`, `isActive` or `version`: unpublishing is how an editor withdraws terms, and
the most recently published one wins (US-03-Q-12). No bespoke backend code (no uniqueness
middleware).

### 7.2 Wire shape and mapping

Request (one per summary entry and per "Reintentar", through the proxy, published only, 10 s
timeout):

```
GET /api/terms?filters[country][code][$eq]=CO&fields[0]=title&fields[1]=body
  &fields[2]=publishedAt&sort[0]=publishedAt:desc&pagination[pageSize]=10
```

Mapping wire → logical `Terms` (boundary parser):

| Wire attribute | Valid when | Logical attribute |
|---|---|---|
| `title` | non-blank string | `title` |
| `body` | `blocks` per ADR-0009 (US-03-Q-02): an array whose supported nodes yield at least one non-blank text | `blocks` (the whitelisted, typed node tree) |
| `publishedAt` | ISO date-time string | used for ordering only |

The parser sorts by `publishedAt` descending itself and does not rely on the server sort. A
malformed entry is skipped with a `console.warn` naming the problem, never the text.

### 7.3 Seed (summary)

Full text in the annex [seed-terms.md](seed-terms.md).

**Seed rule (human decision, US-03-R1-F01, Felipe Sabogal, 2026-11-21).** The seed creates a
country's seed terms (the published document and, for CO, the draft-only document below) **only
when that country has no terms document at all**, neither draft nor published. Once an editor has
any terms for a country, the seed never creates, updates or republishes terms for that country
again: renaming, replacing, unpublishing, or deleting and recreating terms in the Strapi admin
survives a restart. The check is per country, so CO and CL are decided independently. Edge case:
if an editor deletes every terms document of a country, the next restart seeds the fictitious
terms again, because they are the documented starting content. This replaces the earlier
"natural key country code + `title`" rule for terms; the seed of other content types is unchanged.

| Country | Published | Draft only |
|---|---|---|
| CO | "Términos y condiciones del seguro de auto – Colombia" (5 blocks, bulleted list, heading "Condiciones principales") | "Términos y condiciones (borrador)" |
| CL | "Términos y condiciones del seguro automotriz – Chile" (5 blocks, numbered list, heading "Condiciones generales") | — |

### 7.4 Access (ADR-0002, ADR-0005)

- Public role: add exactly the terms `find` (`api::term.term.find` with the US-03-Q-03 default),
  reconciled in bootstrap; no `findOne`. Justification: the summary must show the country's terms
  (BR-07); data exposed: published terms text, public by nature.
- Router: `createCoreRouter(<terms uid>, publishedOnlyConfig())` with a fresh config object
  (US-01-R2-F03).
- Proxy: add `/api/terms` to the GET-only allow-list.
- E2E write token for AC-14 (ADR-0005 general rule): exactly terms `create`, terms `delete` and
  `api::country.country.find`; created and deleted in the Playwright Node process only.

### 7.5 What US-03 reads from the wizard state and the page load

- From the `quote-wizard` entry (ADR-0003): the raw step 1 values (re-derived into the typed
  output with this page load's field configuration, US-02-Q-17) and `plan.key`. US-03 adds
  **nothing** to the entry: no terms acceptance, simulation choice, payment data or quote number.
- From this page load's content: field configuration (labels, option labels, types, `sortOrder`),
  the offered plans (name, short description, `basePrice`), the country (`code`, `currencyCode`,
  `locale`) and the terms.
- On success, the whole entry is deleted and the store's in-memory step 1 values and plan are
  reset (BR-06).

## 8. UI states

| State | Trigger | What the user sees | Accessibility notes |
|---|---|---|---|
| Arrival | Navigation to the summary (guard passed) | Heading "Resumen de tu cotización", "Tus datos", "Tu vehículo", "Plan elegido", the edit buttons, the terms section, the simulation group, "Pagar" (disabled) | Focus on the `h1`; document title per §8.1 |
| Terms loading | Terms request in flight | "Cargando términos y condiciones…" in the terms section; no checkbox | Section `aria-busy="true"`; polite live region |
| Terms error | Timeout (10 s), network or HTTP error, unexpected response shape | "No pudimos cargar los términos y condiciones. Intenta de nuevo.", "Reintentar" | `role="alert"`; focus stays on the heading (the error is not caused by the user); "Reintentar" reachable by Tab |
| Terms not available | Zero well-formed published terms | "Los términos y condiciones no están disponibles en este momento. No es posible pagar." | Polite live region |
| Terms shown, not accepted | Terms loaded | Terms title and text in a scrollable region, unchecked checkbox, hint "Acepta los términos y condiciones para pagar.", "Pagar" `aria-disabled` | Region `tabindex="0"`, named by the title; hint in `aria-describedby` of "Pagar" |
| Ready to pay | Checkbox checked | "Pagar" enabled; hint hidden | — |
| Processing | "Pagar" activated | "Procesando pago…" on the button; every action unavailable | Page `aria-busy="true"`; status announced once |
| Rejected | Simulated payment rejected | AC-04 message next to "Pagar"; everything kept and enabled again | `role="alert"`; focus stays on "Pagar" |
| Confirmation | Simulated payment succeeded | "Pago confirmado", quote number, simulation notice, "Nueva cotización" | Focus on the confirmation `h1`; document title per §8.1 |

### 8.1 Code-owned copy added by US-03

Spanish, the same for both countries, in front-end code; extends US-01 §8.1 and US-02 §8.1.
"Reintentar" and "Precio anual" already exist.

| String | Where |
|---|---|
| "Resumen de tu cotización" | Summary heading |
| "Resumen de tu cotización \| Cotizador de seguro de auto" | Summary document title |
| "Tus datos" / "Tu vehículo" / "Plan elegido" / "Términos y condiciones" | Section headings |
| "Editar mis datos" / "Cambiar plan" | Back actions |
| "Número oculto, termina en {tail}" / "Número oculto" | Accessible text of the masked document number |
| "Cargando términos y condiciones…" | Terms loading |
| "No pudimos cargar los términos y condiciones. Intenta de nuevo." | Terms error |
| "Los términos y condiciones no están disponibles en este momento. No es posible pagar." | No terms |
| "Acepto los términos y condiciones" | Terms checkbox label |
| "Acepta los términos y condiciones para pagar." | Hint of the disabled "Pagar" |
| "Simulación de pago (no se realiza ningún cobro)" / "Pago aprobado" / "Pago rechazado" | Simulation group (subject to US-03-Q-01) |
| "Pagar" / "Procesando pago…" | Pay button and its processing label |
| "El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo." | Rejected payment |
| "Pago confirmado" | Confirmation heading |
| "Pago confirmado \| Cotizador de seguro de auto" | Confirmation document title |
| "Tu número de cotización es" | Before the quote number |
| "Este es un pago simulado; no se realizó ningún cobro real." | Confirmation notice |
| "Nueva cotización" | Confirmation action |

## 9. Non-functional requirements

- **Accessibility (Assessment: "The wizard can be completed using only the keyboard, and fields
  have accessible labels"):** focus on the heading on arrival and on confirmation, description
  lists for data, a named focusable terms region, a labelled checkbox, a named radio group, a
  perceivable disabled "Pagar" with its reason, alerts announced once (AC-16, AC-17). WCAG 2.2 AA;
  screen reader pass at HC3.
- **Responsive (Assessment: "Works on mobile and desktop"):** 320–1440 CSS px without horizontal
  scroll; one column on narrow screens; targets ≥ 24 × 24 CSS px (AC-18, manual).
- **Multi-country (Assessment: "The same application and the same build serve Colombia and
  Chile"):** no terms text, field label, plan, currency, date format or masking branch per country
  in front-end code; dates and prices use the country's `locale` and `currencyCode` from Strapi.
- **Security / privacy (Assessment: "No Strapi token with write permissions may reach the
  browser. Public role permissions minimal and justified"; "Use fictitious data only."):** one
  added public permission (§7.4); reads through the GET-only proxy; drafts never anonymous; no
  request during payment; no card data; masking at display time; no value, quote number or terms
  text in logs; rich text rendered without executing editor input (AC-13, AC-19). Seed and test
  data fictitious.
- **Persistence (Assessment: "Use a front-end strategy to persist the data; a database is not
  required."):** ADR-0003 unchanged; US-03 adds nothing to storage and deletes the entry on success.
- **Performance:** one terms request per summary entry; summary data comes from content already
  loaded by the guards in this page load; the price rule and masking are synchronous pure functions.
- **Testing (Assessment: "Unit tests for the relevant logic and at least one e2e test of the full
  flow for one country"):** masking, value display, quote number, terms parser and the simulated
  payment are unit tested; the CO full-flow e2e is completed end to end (US-03-Q-16).
- **Language:** end-user copy Spanish; code, logs and docs English.

## 10. ADRs

- **Referenced (accepted, binding):**
  1. ADR-0001 — terms content type with a required `manyToOne` `country`; `strictRelations`;
     `/:country/resumen` with `summaryStepGuard` (implementation note: built by US-02, US-03
     attaches the page only); focus on the arriving step's heading. Used by: BR-07, §7.1, AC-16.
  2. ADR-0002 (amended by ADR-0005) — terms `find` on the public role and `/api/terms` on the
     proxy (both anticipated for US-03), `publishedOnlyConfig()`, `no-store`; e2e token with `find`
     on relation targets. Used by: BR-07, §7.4, AC-14, AC-19.
  3. ADR-0003 — entry deleted before the confirmation on success; nothing cleared on rejection;
     terms and payment data never stored; masking at display time. Used by: BR-02, BR-06, BR-08,
     AC-04, AC-11.
  4. ADR-0006 — typed attributes, no free JSON (relevant to the terms `body` format). Used by: §7.1.
  5. ADR-0007 — `calculateFinalPrice` in `frontend/src/app/shared/price-rules.ts`, imported, not
     copied, with the same `CLOCK`. Used by: BR-01, AC-01, AC-07.
  6. ADR-0004 applies to the step 1 form only; the summary's checkbox and radio group are plain
     controls, not a Strapi-driven form.
  7. [ADR-0008](../../adr/0008-simulated-payment.md) — simulated payment (US-03-Q-01; Accepted at
     HC2, 2026-11-21): visible simulation choice, processing time and its injection for tests, the
     gateway service boundary a real gateway would replace, no request and no card data; unit
     test `simulated-payment-gateway.spec.ts`. Used by: BR-05, BR-06, BR-08, AC-03, AC-04, AC-09, AC-15.
  8. [ADR-0009](../../adr/0009-terms-rich-text-rendering.md) — terms rich text (US-03-Q-02;
     Accepted at HC2, 2026-11-21): `body` is a Strapi `blocks` attribute rendered by a whitelist
     component through template bindings. Used by: BR-07, §7.1, §7.2, AC-13.
- **Needed (for the architect):** none. The two ADRs this spec asked for (US-03-Q-01, US-03-Q-02)
  are ADR-0008 and ADR-0009 above.
- **Implementation notes (no new decision), if the defaults are accepted:** the terms permission
  name `api::term.term.find` on ADR-0002 (US-03-Q-03). Only if US-03-Q-06 takes the alternative:
  a confirmation route on ADR-0001.

## 11. Test mapping

Planned locations follow CLAUDE.md §6; the test-engineer may adjust unit and component paths.
Short names: `document-mask.spec.ts` = `frontend/src/app/shared/document-mask.spec.ts`;
`summary-rows.spec.ts` = `frontend/src/app/shared/summary-rows.spec.ts` (rows, groups, display
values); `quote-number.spec.ts` = `frontend/src/app/shared/quote-number.spec.ts`;
`terms.spec.ts` = `frontend/src/app/shared/terms.spec.ts` (boundary parser and selection);
`terms-api.spec.ts` = `frontend/src/app/core/terms-api.spec.ts`;
`rich-text.spec.ts` = `frontend/src/app/shared/rich-text.spec.ts` (renderer component);
`payment.spec.ts` = the simulated payment service test, named `simulated-payment-gateway.spec.ts`
per ADR-0008 (US-03-Q-01);
`quote-store-clear.spec.ts` = `frontend/src/app/core/quote-store-clear.spec.ts`;
`summary-page.spec.ts` = `frontend/src/app/features/summary/summary-page.spec.ts`;
`full-flow-co` = `frontend/e2e/us-01-03-full-flow-co.spec.ts`;
`summary-payment-cl` = `frontend/e2e/us-03-summary-payment-cl.spec.ts` (proposed, US-03-Q-16).

| E2E file | ACs |
|---|---|
| `full-flow-co` (completed) | US-03-AC-01 (CO), AC-02 (CO), AC-03, AC-05 (second scenario), AC-07, AC-08 (CO variant optional), AC-09, AC-11, AC-14 (first scenario), AC-15, AC-16, AC-19 (first scenario) |
| `summary-payment-cl` (new) | US-03-AC-01 (CL), AC-02 (CL), AC-04, AC-08, AC-14 (second scenario, Node-process writes), AC-19 (draft and write scenarios, Node process, no browser) |

E2E tests pin the browser clock to 2026-11-21 (prices and quote number date).

| AC | Level | Planned test location |
|---|---|---|
| US-03-AC-01 | e2e (CO, CL) + component | `full-flow-co`, `summary-payment-cl`, `summary-page.spec.ts` |
| US-03-AC-02 | e2e (CO, CL) + component | `full-flow-co`, `summary-payment-cl`, `summary-page.spec.ts` |
| US-03-AC-03 | component (fake timers) + e2e | `summary-page.spec.ts`, `full-flow-co` |
| US-03-AC-04 | component + e2e | `summary-page.spec.ts`, `summary-payment-cl` |
| US-03-AC-05 | unit (every row) + e2e (DOM, title, address) | `document-mask.spec.ts`, `full-flow-co` |
| US-03-AC-06 | unit (every row) | `summary-rows.spec.ts` |
| US-03-AC-07 | e2e | `full-flow-co` |
| US-03-AC-08 | component + e2e (CL) | `summary-page.spec.ts`, `summary-payment-cl` |
| US-03-AC-09 | unit (in-flight flag) + component + e2e | `payment.spec.ts`, `summary-page.spec.ts`, `full-flow-co` |
| US-03-AC-10 | unit (pinned clock, injected random source) + e2e (format) | `quote-number.spec.ts`, `full-flow-co` |
| US-03-AC-11 | unit (store clear on success only) + e2e | `quote-store-clear.spec.ts`, `full-flow-co` |
| US-03-AC-12 | component (mocked HTTP, fake timers, empty and all-malformed responses) | `summary-page.spec.ts` |
| US-03-AC-13 | unit (parser whitelist) + component (renderer, XSS rows) | `terms.spec.ts`, `rich-text.spec.ts` |
| US-03-AC-14 | unit (selection, ordering) + e2e (seeded draft hidden; publish from Node) | `terms.spec.ts`, `full-flow-co`, `summary-payment-cl`; plus HC3 check in the Strapi admin |
| US-03-AC-15 | component (no card fields, default option, no HTTP call) + e2e (network) | `summary-page.spec.ts`, `full-flow-co` |
| US-03-AC-16 | e2e (keyboard only) | `full-flow-co`; plus HC3 check |
| US-03-AC-17 | component (roles, names, descriptions, live regions) | `summary-page.spec.ts`; plus screen reader check at HC3 |
| US-03-AC-18 | manual (HC3 screenshots at 360 × 740 and 1280 × 800) | None automated |
| US-03-AC-19 | e2e (network inspection; API requests from Node) + backend (router guard, existing) | `full-flow-co`, `summary-payment-cl`, `backend/tests/published-only-routes.test.ts` |

Backend test (supports BR-07 and §7.4, no AC of its own): `backend/tests/terms-rules.test.ts` —
publishing terms without `country` is rejected, the public role is reconciled to exactly
`country.find`, `form-field.find`, `plan.find` and the terms `find`, and the seed creates the CO
and CL published terms and the CO draft once (idempotent). Idempotency follows the §7.3 seed rule
(US-03-R1-F01): a country that already has any terms document (draft or published, including
editor-renamed or replaced terms) gets nothing created, updated or republished on a restart; a
country with no terms document at all is seeded again.

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-03` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.1 | First version from story.md, the Assessment requirements, US-01 spec v0.5, US-02 spec v0.1, ADR-0001..0007 and the US-01/US-02 reviews. 8 BR, 19 AC (4 original, 15 derived), 17 gaps (6 block HC1: Q-01 simulated payment [ADR], Q-02 terms format and rendering [ADR], Q-03 terms content-type name vs Strapi, Q-04 masking rule, Q-05 which data are shown, Q-06 confirmation route), 2 ADRs needed. Seed annex [seed-terms.md](seed-terms.md). |
| 2026-11-21 | Felipe Sabogal (human) | HC1 | **Approved** (v0.1) | Q-01..Q-06 accepted as proposed (Q-01 and Q-02 go to ADRs; Q-03 requires the CLAUDE.md §6 correction, done by the orchestrator); all other defaults accepted. (Translated from the Spanish original in the session log.) |
| 2026-11-21 | Felipe Sabogal (human) | Review R1 | Seed rule decided (US-03-R1-F01); header ADR list updated (F06) | §7.3 updated by the spec-writer; seed rule also stated in §11 (backend test note) and in the annex [seed-terms.md](seed-terms.md) (old "country code + `title`" natural key removed); §10 lists ADR-0008/0009 as referenced (Accepted at HC2) and no ADR as needed; Sources, §7.1, §7.2 and §11 name ADR-0008/0009 instead of "the ADR of US-03-Q-01/Q-02". |
