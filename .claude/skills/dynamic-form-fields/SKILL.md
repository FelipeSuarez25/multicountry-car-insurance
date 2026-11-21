---
name: dynamic-form-fields
description: Contract and rules for rendering the step 1 form dynamically from Strapi field configuration - the FieldConfig type, boundary validation, validation rule semantics (legal age, vehicle year), error messages and accessibility of generated fields. Use when implementing or testing the dynamic form, mapping Strapi config to validators, or changing the form-field content type.
---

# Dynamic form fields

## Scope and precedence

- The **forms library** (Signal Forms or Reactive Forms) is decided by the forms ADR after
  SPIKE-01 (`CLAUDE.md` §7). This skill is **library-agnostic**: it defines the contract and the
  validation semantics that hold whichever API implements them.
- The contract below is **v1**, aligned with `specs/US-01/spec.md` §7.1 and §7.3 (refinements
  listed in §7.4, authorised at HC1 by Felipe Sabogal on 2026-11-20, task US-01-T-29). **The spec
  is the source of truth.** If they ever disagree, follow the spec and update this skill in the
  same PR.

## Pipeline (each stage is a pure, unit-tested function)

```
Strapi REST response
  → parseFieldConfigs()     boundary validation: unknown or malformed → dropped + warning
  → sort by sortOrder       stable; ties broken by key
  → buildFormModel()        initial values per type
  → buildValidators()       rules → validators (library adapter)
  → render                  one control component per field type
```

Keep the parsing and validation semantics free of Angular so they can be tested without
TestBed. Only the adapter and the rendering touch the forms library.

## FieldConfig contract (v1)

```ts
type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

interface FieldConfig {
  key: string;              // /^[a-z][a-zA-Z0-9]*$/, unique per country, never shown to users
  type: FieldType;
  label: string;            // Spanish, non-empty
  helpText?: string;
  placeholder?: string;     // never a substitute for the label
  isRequired: boolean;
  sortOrder: number;        // ascending; ties broken by key
  errorMessage: string;     // Spanish, field-level message (US-01-Q-04)
  requiredMessage?: string; // overrides errorMessage for the required check
  options?: SelectOption[]; // required and non-empty when type === 'select'; ignored otherwise
  rules: ValidationRule[];  // evaluation order = config order
}

interface SelectOption { value: string; label: string; sortOrder: number } // value unique per field

type ValidationRule = { message?: string } & (               // message overrides errorMessage
  | { kind: 'minLength' | 'maxLength'; value: number }       // text
  | { kind: 'min' | 'max'; value: number }                   // number
  | { kind: 'pattern'; value: string }                       // text; ECMAScript source, no flags
  | { kind: 'minAge'; years: number }                        // date
  | { kind: 'yearRange'; maxYearsOld: number; maxYearsAhead: number } // number
  | { kind: 'rutCheckDigit' }                                // text (US-01-Q-09)
);
```

**Rule applicability by field type.** A rule on a type it does not apply to is malformed:

| Kind | Applies to |
|---|---|
| `minLength`, `maxLength`, `pattern`, `rutCheckDigit` | `text` |
| `min`, `max`, `yearRange` | `number` |
| `minAge` | `date` |

**Boundary validation (`parseFieldConfigs`).** A field is dropped, with a `console.warn` that
contains no user data, if:
- its `type` is unknown, or its `key` is invalid or duplicated,
- its `label` is empty,
- a `select` has no options, or has duplicated option values,
- a rule is malformed: unknown kind, missing or invalid parameter, or a kind that does not apply
  to the field type,
- a `pattern` does not compile.

A missing `errorMessage` does not drop the field. The fallback message is used instead, with a
warning (see *Error messages*). The exact behaviour for each malformed case is specified in
US-01-Q-18.

The form must still render with the remaining fields. If **zero** valid fields remain, show
the error state with a retry option, never an empty form that can be submitted.

## Validation semantics (business rules from US-01)

| Rule | Semantics | Boundaries (must be unit-tested) |
|---|---|---|
| `required` | text: non-empty after trim · number: a value is present (0 is a value) · select: a value is chosen · date: a valid date is present · checkbox: `true` | Whitespace-only text is invalid |
| *(empty optional field)* | An optional field left empty **skips all its rules** (US-01-Q-26) | An empty optional `pattern` field is valid |
| `number` type | **Integers only** (US-01-Q-12). Decimals and non-numeric input are invalid. | `2020` valid; `2020.5` invalid |
| `rutCheckDigit` | Chilean RUT modulo-11 check digit. Dots and dash are accepted; `K`/`k` are equivalent. The value is normalised before computing. | A valid RUT with and without dots; a wrong check digit; `k` vs `K` |
| `minAge { years }` | Age in completed years on **today's local date** ≥ `years`. Both CO and CL use 18 per the seed, but the value comes from config. | 18th birthday today → valid; tomorrow → invalid; 29 Feb birthdays |
| `yearRange { maxYearsOld, maxYearsAhead }` | `currentYear − maxYearsOld ≤ year ≤ currentYear + maxYearsAhead`. US-01: 20 years old, 1 ahead. | Both limits inclusive; the year just outside each limit is invalid |
| `min` / `max` | Numeric value bounds, inclusive | |
| `minLength` / `maxLength` | Bounds on trimmed length, inclusive | |
| `pattern` | Full match: anchor with `^…$` if the config does not | |

- "Today" must come from an **injectable clock** (for example an `InjectionToken<() => Date>`),
  so tests can pin the date. Never call `new Date()` directly inside a validator.
- Country-specific checks are expressed as config rules: `pattern` when a regex is enough
  (plates, digits-only documents). A check that needs code is a **rule kind**, enabled per
  field from Strapi; it is never hard-coded by country. `rutCheckDigit` is the only such kind
  today. A new one is a spec change plus a code change; flag it in the spec as a gap.

## Error messages

- One message is shown: the first failing check, in this order: `required`, then the rules in
  config order.
  - A failing `required` shows `requiredMessage ?? errorMessage`.
  - A failing rule shows `rule.message ?? errorMessage`.
- Messages are static text with no placeholders.
- Fallback, when no usable message reaches the front end: `"Revisa este campo."` plus a
  boundary warning. Never show a rule kind or an English text to the user.
- Show errors after the field is touched, or after a submit attempt.

## Accessibility of generated fields

- `<label for>` bound to every control. Checkbox labels are clickable.
- `aria-describedby` points to the help text and to the error element (when the error is shown).
  Use `aria-invalid="true"` on invalid fields and `aria-required` when required.
- The error container uses `role="alert"` or a polite live region. Do not announce every field
  on every keystroke.
- Use native controls (`<input type=number|date|checkbox>`, `<select>`) for free keyboard support.
- On a failed submit, focus the first invalid field in `sortOrder`.

## Persistence (keep data when going back: US-01 AC)

The form value lives in the wizard state store, not in the component. Re-entering step 1
rebuilds the form from config and **hydrates** it from the store. Values for keys that are no
longer configured are dropped.

## Step 1 output (spec §7.3)

`{ country, values, fieldConfig }`, where `values` maps each `key` to:

| Type | Value |
|---|---|
| `text` | trimmed string |
| `number` | integer |
| `select` | option `value` |
| `date` | ISO `YYYY-MM-DD` string |
| `checkbox` | boolean |
| empty optional field | `null` |

Reserved keys (US-01-Q-08), consumed by US-02/US-03: `documentType` (CO only),
`documentNumber`, `fullName`, `birthDate`, `plate`, `make`, `model`, `vehicleYear`.

> **For SPIKE-01:** the output uses `null` for empty optional fields, but the vendored
> `signal-forms.md` forbids `null` inside a Signal Forms model. That is compatible only if the
> form model uses `''` or `false` internally and the conversion to `null` happens when mapping to
> the output. The spike must confirm this, together with integer-only numbers and empty dates.
