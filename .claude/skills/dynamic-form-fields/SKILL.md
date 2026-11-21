---
name: dynamic-form-fields
description: Contract and rules for rendering the step 1 form dynamically from Strapi field configuration - the FieldConfig type, boundary validation, validation rule semantics (legal age, vehicle year), error messages and accessibility of generated fields. Use when implementing or testing the dynamic form, mapping Strapi config to validators, or changing the form-field content type.
---

# Dynamic form fields

## Scope and precedence

- The **forms library** (Signal Forms or Reactive Forms) is decided by the forms ADR after
  SPIKE-01 (`CLAUDE.md` §7). This skill is **library-agnostic**: it defines the contract and the
  validation semantics that hold whichever API implements them.
- The contract below is **v0**. The US-01 spec may refine it. When it changes, update this
  skill in the same PR.

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

## FieldConfig contract (v0)

```ts
type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

interface FieldConfig {
  key: string;              // stable machine key, unique per country (e.g. 'documentNumber')
  type: FieldType;
  label: string;            // Spanish, from Strapi
  helpText?: string;
  placeholder?: string;
  isRequired: boolean;
  sortOrder: number;
  options?: SelectOption[]; // required and non-empty when type === 'select'
  rules: ValidationRule[];
  messages: Partial<Record<RuleKind | 'required', string>>; // Spanish error copy, from Strapi
}

interface SelectOption { value: string; label: string; sortOrder: number }

type RuleKind = 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'minAge' | 'yearRange';

type ValidationRule =
  | { kind: 'minLength' | 'maxLength'; value: number }
  | { kind: 'min' | 'max'; value: number }
  | { kind: 'pattern'; value: string }                      // ECMAScript regex source, no flags
  | { kind: 'minAge'; years: number }                       // policyholder legal age
  | { kind: 'yearRange'; maxYearsOld: number; maxYearsAhead: number };
```

**Boundary validation (`parseFieldConfigs`).** A field is dropped, with a `console.warn` that
contains no user data, if:
- its `type` is unknown,
- a `select` has no options,
- a rule is malformed,
- a `pattern` does not compile, or
- its `key` is duplicated.

The form must still render with the remaining fields. If **zero** valid fields remain, show
the error state with a retry option, never an empty form that can be submitted.

## Validation semantics (business rules from US-01)

| Rule | Semantics | Boundaries (must be unit-tested) |
|---|---|---|
| `required` | text: non-empty after trim · number: a value is present (0 is a value) · select: a value is chosen · date: a valid date is present · checkbox: `true` | Whitespace-only text is invalid |
| `minAge { years }` | Age in completed years on **today's local date** ≥ `years`. Both CO and CL use 18 per the seed, but the value comes from config. | 18th birthday today → valid; tomorrow → invalid; 29 Feb birthdays |
| `yearRange { maxYearsOld, maxYearsAhead }` | `currentYear − maxYearsOld ≤ year ≤ currentYear + maxYearsAhead`. US-01: 20 years old, 1 ahead. | Both limits inclusive; the year just outside each limit is invalid |
| `min` / `max` | Numeric value bounds, inclusive | |
| `minLength` / `maxLength` | Bounds on trimmed length, inclusive | |
| `pattern` | Full match: anchor with `^…$` if the config does not | |

- "Today" must come from an **injectable clock** (for example an `InjectionToken<() => Date>`),
  so tests can pin the date. Never call `new Date()` directly inside a validator.
- Country-specific checks (RUT check digit, plate formats) are expressed as config rules when a
  pattern is enough. A rule kind that needs code (for example `rutCheckDigit`) is a **spec
  change plus a code change**; flag it in the spec as a gap rather than hard-coding it.

## Error messages

- Show the configured message for the first failing rule, in this priority order: `required`,
  then the order of the rules in config.
- Fallback when a message is missing: a generic Spanish message (`"Revisa este campo."`) and a
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
