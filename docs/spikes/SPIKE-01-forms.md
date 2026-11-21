# SPIKE-01: Signal Forms vs Reactive Forms for the Strapi-driven step 1 form

| Item | Value |
|---|---|
| Question | Which forms library fits a step 1 form built at runtime from the Strapi field configuration (`CLAUDE.md` §7, spec §10 item 2)? |
| Run by | frontend-developer subagent (Claude Opus 5.5), 2026-11-20 |
| Independent re-run | orchestrator, 2026-11-20: `@angular/core` and `@angular/forms` 22.3.0 installed, `ng build` OK, `ng test` 4 files, 38/38 passed |
| Written up by | architect subagent (Claude Opus 5.5), 2026-11-20 |
| Code | Branch `spike/01-forms`, commit `be9ae50`, folder `spikes/spike-01-forms/` (throwaway, **never merged**). GitHub: <https://github.com/FelipeSuarez25/multicountry-car-insurance/tree/spike/01-forms/spikes/spike-01-forms> |
| Decision informed | [ADR-0004](../../adr/0004-forms-library.md) (forms library) |

This document records facts only. The recommendation is in ADR-0004.

## Environment

| Item | Version or setting |
|---|---|
| Node | 24.22.1 |
| Scaffold | `npx @angular/cli@22.3.0 new spike-01-forms --directory spikes/spike-01-forms --skip-git --ssr=false --style=css --skip-install --defaults` |
| `@angular/core` / `forms` / `common` | 22.3.0 (checked in `node_modules`) |
| TypeScript | 6.0.3 |
| Vitest | 5.1.1 (through `ng test`, `@angular/build:unit-test`) |
| DOM | jsdom 31 (**no real browser**) |
| tsconfig | The CLI default has no `strict`; the spike adds `strict: true` and `resolveJsonModule: true`. `noUncheckedIndexedAccess` is off. |
| Change detection | zoneless (CLI default) |

Environment notes: `ng build` hung silently on an interactive analytics prompt until
`NG_CLI_ANALYTICS=false CI=1` were set. `npm install` printed install-script warnings (esbuild,
lmdb, msgpackr-extract); build and tests were not affected. The spike `package.json` uses `^`
ranges, which is acceptable for a throwaway spike only (`CLAUDE.md` §4 applies to `frontend/`).

## Method

- One fixture JSON that follows the `dynamic-form-fields` contract v1 (57 lines), parsed at the
  boundary into typed `FieldConfig` objects.
- A **shared, library-agnostic core** (`src/app/core/`, 209 lines): pure functions with no
  Angular import except the `CLOCK` token (`InjectionToken<() => Date>`): `parseFieldConfigs`,
  `validateField(cfg, value, today)` (required, then empty-optional skip, then integer-only,
  then rules in configuration order; the first failing message wins), `hydrate`, `toOutput`,
  `parseIsoDate`, `ageOn`. `rutCheckDigit` is not implemented.
- Two adapters with the same inputs, output and test handles: Signal Forms
  (`signal-forms/dynamic-form-signal.*`, 111 lines) and Reactive Forms with `FormRecord`
  (`reactive-forms/dynamic-form-reactive.*`, 112 lines). Each field gets **one custom
  validator** that calls `validateField`. Built-in validators (`required()`, `min()`,
  `pattern()`, `Validators.*`) were not used.
- Tests (435 lines): `criteria.spec.ts` runs the same titled test against both adapters
  (`[signal-forms] (x)` / `[reactive-forms] (x)`); `core.spec.ts` covers the core once;
  `typing.spec.ts` covers compile-time behaviour; `library-facts.spec.ts` isolates library
  behaviour outside the shared criteria.
- API facts were read from the installed `@angular/forms` typings (`types/signals.d.ts`,
  `types/_structure-chunk.d.ts`) and compiled `fesm2022/*.mjs`.
- Sensitivity check: removing `focusBoundControl()` failed `[signal-forms] (i)`; removing
  `markAllAsTouched()` failed `[reactive-forms] (h)`. Both were restored.

## Results by criterion

| # | Criterion (source) | Signal Forms (`@angular/forms/signals`) | Reactive Forms (`FormRecord`) |
|---|---|---|---|
| a | Required number: empty vs `0` vs value; integer-only (`CLAUDE.md` §7, AC-05, AC-08) | **Works.** Model holds a **string** (`''` = empty); a string model on `<input type="number">` falls through to `element.value`. With a `number` model, clearing the input writes `null` and `2020.5` reaches the model, so integer-only is a validator, not a type. | **Works with a workaround.** `NumberValueAccessor` writes `number \| null` even into a `FormControl<string \| boolean>`; numeric `2020` was treated as empty until a `normalise()` step was added (validator input and output mapping). `nonNullable: true` does not stop the accessor writing `null`. Forcing `DefaultValueAccessor` was not tried. |
| b | Empty date, required vs optional; empty optional skips `minAge` (AC-06, AC-08) | **Works.** ISO string or `''`; string model on `type=date` falls through to `element.value`. | **Works**, same behaviour (`DefaultValueAccessor` handles `type=date` as a string). |
| c | Select required, nothing pre-selected (AC-07, BR-02) | **Works.** Model `''` plus placeholder `<option value="">`; `selectedIndex === 0`; options in `sortOrder`. | **Works**, same. |
| d | Legal age with an injectable clock (AC-06) | **Works.** `CLOCK` provided in TestBed; 18th birthday today valid, tomorrow invalid (today 2026-11-20). 29 February covered in `core.spec.ts`. | **Works**, same. |
| e | Typing with a runtime-built model (assessment: "typed validations") | Static model: precise keys and types. Runtime `Record<string, string \| boolean>`: any key compiles; an unknown key throws `TypeError` at runtime. The union **does not compile** against native controls, so two cast helpers were needed (see *Typing*). | Static `FormGroup`: precise. `FormRecord<FormControl<string \| boolean>>`: `controls[key]` typed (runtime `undefined` for an unknown key), `get(key)` nullable, `getRawValue()` → `Record<string, string \| boolean>`. `[formControl]` accepts the union **with no cast**. The runtime number value is `number \| null` despite the declared type. |
| f | Hydration from stored values (AC-04, AC-21) | **Works.** Model built from `hydrate(configs, stored)` before `form()`; `2020` → `'2020'`; pristine, untouched, no errors on entry; DOM shows input, select and checkbox values. A stored select value that is no longer an option keeps its model value, the select shows the placeholder, and the form is invalid. | **Works**, same results. |
| g | Drop stored values of keys no longer configured (AC-23) | **Works only because `hydrate()` filters by configuration before the model exists.** The model signal is the source of truth: an extra key written into it stays in `form().value()`. | **Works** through the same `hydrate()`. `FormGroup.setValue` with an extra key **throws**; `patchValue` ignores it. |
| h | When errors become visible (AC-10) | `submit()` marks the root as touched, which propagates to every field, so one condition `touched() && invalid()` covers blur and failed submit. Typing alone does not touch. After a failed submit: 3 alerts (birthDate, make, vehicleYear); optional fields stay quiet. | Needs an explicit `record.markAllAsTouched()` in the submit handler (removing it fails the test). `touched` is a plain property, not a signal; re-render worked because blur and `ngSubmit` are template listeners (zoneless). Same visible behaviour. |
| i | Focus on the first invalid field after a failed submit (AC-10) | **Works with a built-in API**: `onInvalid` → `root[key]().focusBoundControl()` on the first invalid field in `sortOrder`. `document.activeElement` checked across 3 consecutive attempts. | **No focus API on controls.** Workaround: `host.querySelector('#' + key).focus()` (id = key). Same result. |
| j | Output maps empty optional to `null` while the model stays non-null (§7.3, `CLAUDE.md` §7) | **Works.** Model `Record<string, string \| boolean>` (`''` / `false`); `toOutput()` produces `null`, integers and trimmed text; the model keeps what was typed (`'   '` stays in the model, output is `null`). | **Works** with the same `toOutput()`, after the `normalise()` workaround from (a). |

Totals: `[signal-forms]` a–j 11/11, `[reactive-forms]` a–j 11/11, core 8/8, typing 4/4, library
facts 4/4; 38/38 overall. `ng build` succeeds.

Checkbox note: an unchecked optional checkbox is output as `false`, not `null` (see unverified
item 5).

## Typing observations

- **Signal Forms, static model** (`signal({ vehicleYear: '', acceptsOffers: false })`):
  `f.vehicleYear().value()` is `string`; `f.nope` and `.value.set(2020)` are compile errors.
- **Signal Forms, runtime model** (`signal<Record<string, string | boolean>>`): `f['anything']`
  compiles as `FieldTree<string | boolean>`; an unknown key throws
  `TypeError: f.<key> is not a function` at runtime.
- **Signal Forms, binding the union in a template does not compile.** Captured `ng build` errors:
  text → `TS2322: Type 'WritableSignal<RawValue>' is not assignable to type '{ (): string; set: (v: string) => void; } | { (): number | null; set: (v: number | null) => void; }'`;
  checkbox → `Type 'RawValue' is not assignable to type 'boolean'`; number →
  `Type 'RawValue' is not assignable to type 'string | number | null'`; date →
  `Type 'RawValue' is not assignable to type 'string | number | Date | null'`.
  `FieldTree<string | boolean>` is not assignable to `FieldTree<string>`. Workaround: `str(key)`
  and `bool(key)` accessors doing `as unknown as FieldTree<string>` / `FieldTree<boolean>`
  (2 casts, chosen per field type in a static `@switch`).
- Value types accepted by native controls in Signal Forms: text → `string`; number →
  `string | number | null`; date → `string | number | Date | null`; checkbox → `boolean`.
- **Reactive Forms**, `FormRecord<FormControl<string | boolean>>`: `controls[key]` is
  `FormControl<string | boolean>` (no `undefined` because `noUncheckedIndexedAccess` is off);
  `get(key)` is nullable; `setValue(5)` is a compile error; `[formControl]` compiles with no cast.
- **Both:** the types describe the model, not what native controls write at runtime (`null` from
  a cleared number input).
- `form()` inside `computed()` throws `NG0602: effect() cannot be called from within a reactive
  context`, because `form()` creates an effect. The adapter wraps it in
  `untracked(() => form(...))`. `form()` also needs an injection context or `{ injector }`.
  Building a `FormRecord` inside `computed()` had no such issue.

## Gotchas found

1. A cleared `<input type="number">` writes `null` into a `number` model (Signal Forms) or a
   `nonNullable` control (Reactive Forms). Declared types do not protect against it.
2. Decimals reach the model in both libraries; integer-only must be a validator.
3. Reactive Forms: `NumberValueAccessor` overrides the declared control type, which produced a
   real functional bug in the spike (a valid year read as empty) until `normalise()` was added.
4. Signal Forms: the model is the source of truth and does not drop unknown keys; filtering by
   configuration must happen before the model is built.
5. Signal Forms: `form()` cannot be called inside `computed()` without `untracked`.
6. Reactive Forms: a failed submit does not touch the controls unless `markAllAsTouched()` is
   called; there is no control-level focus API.
7. Both: a configuration change while mounted rebuilds the form from `stored`; values typed since
   mount are lost unless the caller keeps `stored` current.
8. Tooling: `ng build` needs `NG_CLI_ANALYTICS=false CI=1` in a non-interactive shell.

## Not verified (open)

1. Everything ran in jsdom. Not checked in a real browser: focus and scroll behaviour, native
   `date` and `number` UI, `badInput` handling (`NativeInputParseError` exists in the source but
   was not exercised), mobile keyboards, screen reader announcement of `role="alert"`.
2. Blur was simulated with `new FocusEvent('blur')` and typing with `input`/`change` events; real
   event ordering was not covered.
3. Reactive Forms with a string model through `DefaultValueAccessor` (for example
   `type="text" inputmode="numeric"` or a custom accessor) was not tried.
4. `rutCheckDigit` was not implemented.
5. Output of an unchecked optional checkbox: `false` in the spike. Spec §7.3 says both
   "checkbox → boolean" and "empty optional field → `null`".
6. Whether step 1 can receive a different configuration while mounted (country switch) is a spec
   and routing question.
7. Async validators and `submit({ ignoreValidators })` were not exercised.
8. A dynamic `[type]` binding together with `[formField]` was avoided (static `@switch`
   branches), so it is unverified.
9. Bundle size, performance with many fields and SSR were not measured.
10. Error visibility is hand-built in both (`touched && invalid`); `provideSignalFormsConfig`
    (class and ARIA auto-binding) was not explored.
11. The vendored `signal-forms.md` forbids `null` in the model; the spike confirms that a non-null
    model with `null` only in the mapped output works, but also that `null` can still appear at
    runtime in a `number` model through native inputs (row a).
12. A third approach, binding native inputs to plain signals with no forms library, was not
    built. ADR-0004 weighs it from the shared-core evidence only.
