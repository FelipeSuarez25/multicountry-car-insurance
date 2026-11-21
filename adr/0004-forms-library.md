---
status: Accepted
date: 2026-11-20
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-20), architect subagent (proposal)
consulted: SPIKE-01 (docs/spikes/SPIKE-01-forms.md, branch spike/01-forms at be9ae50), published @angular/forms@22.3.0 typings and bundles, angular/angular CHANGELOG, angular.dev Signal Forms overview, vendored angular-developer skill (reference only, EVAL-001)
informed: all agents via CLAUDE.md precedence
---

# ADR-0004: Forms library for the Strapi-driven step 1 form

## Context and Problem Statement

Step 1 of the wizard (US-01) is a form whose fields, order, options, rules and Spanish copy all
come from Strapi at runtime (`specs/US-01/spec.md` §7.1, BR-01, BR-06). The field set is only
known after the configuration is fetched, so the form model is built at runtime. `CLAUDE.md` §7
blocks production form code until an ADR picks the forms approach, and `CLAUDE.md` §5 says the
vendored `angular-developer` skill's "You MUST use Angular's new Signal Forms API" is not
binding. SPIKE-01 built the same form twice, with Signal Forms and with Reactive Forms
(`FormRecord`), over a shared library-agnostic validation core. This ADR decides which approach
the production step 1 uses, and which parts stay outside the library.

## Decision Drivers

- **D1. Dynamic form with typed validations.** "Step 1 form generated dynamically from the
  Strapi configuration, with typed validations" (assessment); spec §9 *Typed validations*
  (configuration parsed at the boundary into a typed model; validators are pure functions with an
  injectable clock).
- **D2. Angular 21+ idioms.** "Angular 21 or later: standalone components, signals, built-in
  control flow (@if, @for), no NgModules" (assessment). Angular is pinned to **22.3.0**
  (`CLAUDE.md` §4).
- **D3. Error visibility and focus.** Errors appear after blur or after a failed "Continuar",
  update while typing once shown, and focus moves to the first invalid field in `sortOrder`
  (US-01-AC-10, US-01-Q-13).
- **D4. Hydration and pruning.** The form shows stored values on entry with no errors
  (US-01-AC-04, AC-20, AC-21); values of keys no longer configured are dropped and stale select
  values cleared (US-01-AC-23, Q-16).
- **D5. Correct empty and number semantics.** Required vs empty (`0` is a value, `''` is empty),
  integer-only numbers (US-01-AC-05, AC-08, Q-12, Q-26).
- **D6. Output shape.** Step 1 hands values to later steps in the §7.3 shape: trimmed text,
  integers, ISO dates, booleans, and `null` for an empty optional field.
- **D7. Accessibility.** Native controls, accessible name, description, required and invalid
  states, error announced once (US-01-AC-25, spec §9).
- **D8. Risk and reversibility.** Library maturity, amount of custom code, and the cost of
  switching later (`adr-madr`: hard-to-reverse decisions).

## Considered Options

1. **Signal Forms** (`@angular/forms/signals`: `form`, `FormField`, `FormRoot`, `validate`,
   `submit`) over the shared validation core.
2. **Reactive Forms** (`FormRecord<FormControl<…>>` with `ReactiveFormsModule`) over the same
   core.
3. **No forms library**: native inputs bound to plain signals (`[value]` / `(input)` /
   `(blur)`), with validation, touched state, submit and focus handled by the shared core and the
   component.

## Decision Outcome

Chosen option: **"Signal Forms over the shared validation core"**. Both libraries met every
SPIKE-01 criterion (11/11 each). The tie-breakers are D2, D3 and D5. Signal Forms keeps state in
signals with no bridges. `submit()` touches every field and `focusBoundControl()` moves focus
(D3), so neither needs a DOM lookup or an extra call. With a string model, number inputs had no
accessor surprises (D5). The Reactive Forms adapter needed `normalise()` to fix a real
functional bug: `NumberValueAccessor` wrote a number into a control declared as string, and a
valid year was read as empty. Its one typing advantage (no casts in templates) does not help D1,
because the typed contract lives in the parsed `FieldConfig` and the pure validators, not in
the form model.

### What is decided

- **Library and version:** `@angular/forms/signals` from `@angular/forms` 22.3.0 (pinned, as all
  `@angular/*`, by `CLAUDE.md` §4). The step 1 page does not import `ReactiveFormsModule`,
  `FormControl`, `FormGroup`, `FormRecord` or `@angular/forms/signals-compat`.
- **Validation stays in the core, not in the library.** Validation and message resolution are
  pure functions in `field-validators.ts` (`CLAUDE.md` §6). They import nothing from
  `@angular/forms` and get "today" from the injectable clock (US-01-Q-06). Each field gets
  exactly one `validate()` that calls the shared function and returns
  `{ kind: 'custom', message }`. Signal Forms built-in validators (`required()`, `min()`,
  `pattern()`, …) are not used. The rule order, the empty-optional skip (Q-26) and the message
  priority (Q-04) are configuration semantics, and keeping them in one function keeps this
  decision reversible (D8).
- **Editing model:** `Record<string, string | boolean>`. `text`, `number`, `select` and `date`
  hold strings (`''` = empty); `checkbox` holds a boolean. The model never holds `null`. This
  deliberately differs from the vendored skill's "use `0` for numbers": `0` is a valid value, so
  it cannot mean empty (D5, AC-08). `number` fields use a native `<input type="number">` bound to
  the string model, and integer-only is a validator rule (Q-12).
- **Output mapping:** the §7.3 values come from a pure `toOutput(configs, model)`: trimmed text,
  integer, option value, ISO date, boolean, and `null` for an empty optional field. The output is
  never read back into the form model; hydration goes through `hydrate()`.
- **Hydration and pruning:** the model is created from `hydrate(configs, storedValues)`, which
  keeps only configured keys and converts stored values to the editing model, **before** `form()`
  is called. Signal Forms does not drop unknown keys by itself (SPIKE-01 row g). Clearing a stale
  select value and writing the pruned state back belong to the store (ADR-0003).
- **Lifecycle:** the form is built once per configuration load, in the injection context of the
  component that owns it (a field initialiser of a form component created when the configuration
  is ready). `form()` is not called inside `computed()`, because it creates an effect
  (`NG0602`). A different configuration (another country) means a new component instance, not a
  rebuilt form inside a live one.
- **Error visibility:** an error is shown when `touched() && invalid()`, and only the first
  message (the core already resolves one message per field). "Continuar" calls `submit()` (or
  uses `FormRoot` with `submission` options). `submit()` marks every field as touched.
- **Focus on a failed attempt:** in `onInvalid`, focus the first invalid field in the
  configuration's `sortOrder` with `focusBoundControl()`.
- **Typing at the template boundary:** the runtime union `string | boolean` does not compile
  against native controls (SPIKE-01, *Typing*). Two narrowing accessors (`FieldTree<string>`
  and `FieldTree<boolean>`), selected by the field `type` in a static `@switch`, are the only
  casts allowed. They live in the step 1 form component and nowhere else.
- **Accessibility attributes** (`aria-invalid`, `aria-describedby`, `aria-required`, error
  element) are bound explicitly in the template, as in the spike. `provideSignalFormsConfig` is
  not relied on unless a later review shows it covers AC-25.

### Consequences

- Good, because the form state is signals end to end (D2): `valid()`, `touched()`, `errors()`
  feed the template and the wizard store with no `toSignal` or `valueChanges` bridges.
- Good, because blur and failed-submit visibility share one condition, and focus uses a library
  API instead of DOM queries by id (D3). The spike's sensitivity check proves the test catches its
  removal.
- Good, because the string editing model avoids the accessor writing `number | null` into a
  string-typed state (D5). Integer-only and required-vs-empty stay explicit, testable rules.
- Good, because the validation core is library-agnostic (209 lines in the spike) and is
  unit-tested without Angular forms. Switching library later means rewriting one adapter of
  about 110 lines plus its template, not the rules (D8).
- Bad, because Signal Forms has been public API only since **22.0.0 (2026-06-03)**, about five
  and a half months, and the `forms` scope has had **39** fix, perf or feat entries between
  22.0.0 and 22.3.0 in the CHANGELOG. Mitigation: pinned 22.3.0; the parts we use are small
  (`form`, `validate`, `submit`, `FormField`, `FormRoot`, `focusBoundControl`), all
  `@publicApi 22.0`; no async validators, no `debounce`, no `hidden`/`disabled` logic; validation
  semantics live outside the library.
- Bad, because the runtime model loses static typing in templates and needs two casts. A cast
  cannot catch a mismatch between a field's `type` and the accessor used. Mitigation: the
  accessor is picked in the same `@switch` branch that renders the control; a component test
  renders every field type and asserts the DOM value, and the review checklist rejects other
  casts on form fields.
- Bad, because an unknown key on the field tree compiles but throws at runtime
  (`TypeError: f.<key> is not a function`). Mitigation: the template iterates only over the
  parsed configuration, from which the model is built; no code indexes the tree by a literal key.
- Bad, because all SPIKE-01 evidence comes from jsdom: real focus, native date and number UI,
  `badInput` and screen reader announcements are unverified. Under the HTML value sanitisation
  rule for `type=number`, unparseable input such as `1e` makes `element.value` `''`, so it
  would show the "required" message rather than the format message. The spike did not exercise
  this. Mitigation: the CO e2e (US-01-T-11) exercises keyboard and
  validation in a real browser; the HC3 manual pass includes a screen reader check (spec §9).
- Neutral: Reactive Forms remains fully supported in 22.3.0 (`FormRecord` and
  `ReactiveFormsModule` are `@publicApi`, not deprecated). Later stories may revisit if a form
  needs something Signal Forms lacks.

### Strongest argument against

Signal Forms has been public API only since 22.0.0, about five and a half months, with 39
forms-scope fix, perf or feat entries through 22.3.0. All SPIKE-01 evidence comes from jsdom, not
a real browser. For a form built at runtime its typing benefit largely disappears: the template
needed casts, and an unknown key compiles but throws at runtime. Reactive Forms `FormRecord` is
the long-established path for runtime-keyed forms; in the spike it compiled with no casts, and
`setValue` throws on stale keys.

**Why we accept it:** only APIs tagged `@publicApi 22.0` are used, with no async validators,
`debounce` or `hidden`/`disabled` logic, on a pinned 22.3.0. Validation semantics live outside
the library, so switching to Reactive Forms means rewriting one adapter of about 110 lines plus
its template, not the rules (D8). The Reactive adapter was not free of risk either: it needed
`normalise()` to fix a real bug where `NumberValueAccessor` wrote `number | null` into a
string-typed control (D5). The real-browser gap is covered by the CO e2e (US-01-T-11) and the
HC3 screen reader check.

### Confirmation

- **Tests (test-engineer, step 3):** component tests in `quote-form-page.spec.ts` for
  US-01-AC-10 (no errors on entry; error after blur; all errors and focus on the first invalid
  field in `sortOrder` after a failed "Continuar", checked through `document.activeElement`),
  US-01-AC-04 / AC-23 (hydrated values shown, pristine, stale key dropped, stale select shows the
  prompt) and US-01-AC-05 (`2015.5` invalid). Unit tests of `toOutput` for every §7.3 mapping.
- **Static checks (code-reviewer, step 6):**
  `grep -rnE "ReactiveFormsModule|FormControl|FormGroup|FormRecord|signals-compat" frontend/src/app`
  returns nothing. `field-validators.ts` imports nothing from `@angular/forms`. `form(` does not
  appear inside a `computed(`. The only `as unknown as FieldTree` casts are the two accessors.
- **Version:** `frontend/package.json` pins `@angular/forms` to exactly `22.3.0`.

## Pros and Cons of the Options

### 1. Signal Forms over the shared validation core

SPIKE-01 adapter: `signal-forms/dynamic-form-signal.ts` + `.html` (111 lines).

- Good, because it is the signal-native forms API, and Angular's own guide says "Signal Forms
  work best in new applications built with signals" (angular.dev Signal Forms overview, read
  2026-11-20). That matches D2.
- Good, because `submit()` touches the whole tree (verified in `@angular/forms@22.3.0`
  `fesm2022/_validation_errors-chunk.mjs`, `submit` calls `node.markAsTouched()`), and
  `FieldState.focusBoundControl()` is public API. Together they cover D3 with no custom
  plumbing (SPIKE-01 rows h, i).
- Good, because a string model on number and date inputs reads `element.value` with no
  conversion. Required-vs-empty and integer-only worked with no workaround (row a).
- Good, because hydration is "build the model, then the form", and the output maps cleanly to
  §7.3 with a non-null model (rows f, j; D4, D6).
- Bad, because it has been public for about 5.5 months, with steady fixes in 22.x (see
  *Consequences*).
- Bad, because the runtime union does not compile against native controls, so two casts are
  needed (row e).
- Bad, because `form()` creates an effect: it needs an injection context and cannot run inside
  `computed()` (`NG0602`).
- Bad, because the model does not prune unknown keys. Pruning must happen before the model is
  built (row g).

### 2. Reactive Forms (`FormRecord`) over the shared validation core

SPIKE-01 adapter: `reactive-forms/dynamic-form-reactive.ts` + `.html` (112 lines).

- Good, because `FormRecord` is the long-established, documented path for forms keyed at
  runtime, and it is fully supported and not deprecated in 22.3.0 (`@publicApi` in
  `types/forms.d.ts`).
- Good, because `[formControl]` accepts `FormControl<string | boolean>` with **no casts**, and
  `controls[key]` / `get(key)` give an honest `undefined` / `null` for unknown keys (row e).
- Good, because `FormGroup.setValue` throws on extra keys, a built-in guard against stale
  stored keys (row g).
- Good, because it works with standalone components (`ReactiveFormsModule` is imported into the
  component; we write no NgModule), so D2's "no NgModules" is met.
- Bad, because `NumberValueAccessor` writes `number | null` into a control declared as
  `string | boolean`, and `nonNullable` does not prevent it. In the spike this made a valid year
  read as empty until `normalise()` was added to both the validator input and the output mapping
  (row a; D5). The declared type misdescribes the runtime value.
- Bad, because a failed submit touches nothing unless `markAllAsTouched()` is called, and there
  is no focus API, so focus needs a DOM lookup by id (rows h, i; D3).
- Bad, because control state (`touched`, `valid`) is not signals. A signals-based wizard needs
  bridges, or relies on template events to re-render under zoneless change detection (D2).

### 3. No forms library: native inputs bound to plain signals

Not built in SPIKE-01. Assessed from the shared core, which already does all parsing,
validation, hydration and output mapping without any forms API.

- Good, because there is no adapter mismatch at all: each input binds `[value]` to a
  `string`/`boolean` signal and writes `element.value` / `element.checked` back. There are no
  casts and no value accessors.
- Good, because it has the smallest dependency surface. Nothing changes if a forms API changes
  in a later Angular release (D8).
- Good, because every behaviour (touched-on-blur, show-all-on-submit, focus) is explicit code
  that the tests read directly.
- Bad, because it re-implements what both libraries already provide: per-field touched state,
  submit handling, invalid aggregation, and focus by DOM lookup. That is more custom code to
  test and review (D3, D8).
- Bad, because there is no spike evidence for it. Its D3/D7 behaviour would be unproven until
  the production tests run.
- Bad, because a hand-rolled form in an assessment that grades "technical quality" on
  Angular 21+ idioms is a weaker signal than using the framework's forms API (D2).

## More Information

- **Spike:** [docs/spikes/SPIKE-01-forms.md](../docs/spikes/SPIKE-01-forms.md). Code on branch
  `spike/01-forms`, commit `be9ae50` (never merged):
  <https://github.com/FelipeSuarez25/multicountry-car-insurance/tree/spike/01-forms/spikes/spike-01-forms>.
  38/38 tests passed, re-run independently by the orchestrator with `@angular/core` and
  `@angular/forms` 22.3.0.
- **Verified facts (2026-11-20):**
  - npm `@angular/forms` dist-tag `latest` = `22.3.0`, published 2026-11-18; `22.0.0` published
    2026-06-03 (`npm view @angular/forms time`).
  - angular/angular `CHANGELOG.md`, release **22.0.0 (2026-06-03)**, forms: commit
    [`7745365910`](https://github.com/angular/angular/commit/7745365910771d97c91e9b640c2c26a99bfa5a6d)
    "graduate signal forms APIs to public API". It matches EVAL-001, criterion 5
    (`docs/skills/third-party-evaluation.md`).
  - Published `@angular/forms@22.3.0` typings (`npm pack` into a temp dir): `form`, `submit`,
    `FormField`, `FormRoot`, `validate`, `FieldState` (which declares `focusBoundControl`),
    `FormSubmitOptions` (`onInvalid`, `ignoreValidators`) and `provideSignalFormsConfig` are
    tagged `@publicApi 22.0`. The `@experimental` items are WebMCP-related
    (`experimentalWebMcpTool`, `provideExperimentalWebMcpForms`), which we do not use.
    `FormRecord`, `ReactiveFormsModule` and `NumberValueAccessor` are `@publicApi` with no class
    deprecation.
  - CHANGELOG `forms` scope between 22.0.0 and 22.3.0: 39 fix, perf or feat entries.
  - angular.dev Signal Forms overview (unversioned page, read 2026-11-20): "Signal Forms work
    best in new applications built with signals." "If you're working with an existing
    application that uses reactive forms, reactive forms remain a solid choice."
- **Third-party skill conflict (`CLAUDE.md` §1, §5):** the vendored `signal-forms.md` says
  "MUST use Signal Forms" and "Use 0 for numbers, NOT null". This ADR reaches Signal Forms on
  its own drivers, not because of the skill. It **departs** from the skill on number fields
  (string model, `''` for empty) and does not use the skill's built-in validators for
  config-driven rules.
- **Related ADRs:** ADR-0001 (routes; the step 1 page at `/:country/datos`), ADR-0003 (the
  store that provides `storedValues`, prunes stale keys and options, and receives `toOutput`).
- **Revisit when:** a real-browser test or the HC3 pass shows focus, number or date behaviour
  that Signal Forms cannot meet; an Angular upgrade (which needs its own ADR, `CLAUDE.md` §4)
  changes a Signal Forms API we use; or a later story needs dynamic form features (arrays,
  cross-field rules) that the spike did not cover.
