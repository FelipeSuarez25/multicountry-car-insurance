---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-04/story.md, specs/US-04/spec.md v0.1 (Draft; BR-05, BR-06, BR-07, BR-11, BR-13, AC-05..AC-12, AC-20, Q-04, Q-05, Q-06, Q-11, Q-12, Q-13, §8.1, §11.1), specs/US-01/spec.md (BR-01, BR-02, BR-04, AC-09 note, AC-10, AC-24, Q-22, §9), ADR-0001, ADR-0003, ADR-0004 and its implementation note, frontend/src/app/features/quote-form/quote-form.{ts,html}, frontend/src/app/shared/field-validators.ts, vendored angular-developer skill references/angular-aria.md (reference only), packed @angular/aria 22.3.0 and @angular/cdk 22.3.0, installed @angular/forms 22.3.0 and jsdom 31.0.1, angular/components CHANGELOG, angular.dev Angular Aria overview, WAI-ARIA 1.2 (combobox), a throwaway production build of a copy of frontend/ in a temporary directory
informed: all agents via CLAUDE.md precedence; test-engineer (§11.1 changes depend on the elements chosen here); frontend-developer
---

# ADR-0012: Accessible custom select and date picker on `@angular/aria` and `@angular/cdk`, bound to Signal Forms (amends ADR-0004)

## Context and Problem Statement

US-04 replaces the browser's `<select>` and `<input type="date">` of step 1 with design-system
controls: a select with an icon, search for long lists and the selected option marked, and a date
field that accepts typed dd/mm/aaaa and opens a calendar with month and year navigation and days
disabled by the `minAge` rule (US-04-BR-05, BR-06). The story requires them to be "built on
accessible primitives, not from scratch: Angular CDK (Overlay, Listbox, a11y) or `@angular/aria`
if it is stable in our version", with the WAI-ARIA combobox/listbox and date picker dialog
patterns, a bottom sheet on mobile, and validations and stored values unchanged. ADR-0004
(Accepted) chose Signal Forms with **native controls** (its driver D7) and its implementation note
makes `syncNative` the only writer of number and date keys, built on `validity.badInput`. This ADR
picks the primitives, defines how the controls plug into Signal Forms and the shared validation
core, and amends ADR-0004 where it assumed native controls (US-04-Q-04, Q-05, Q-11..Q-13).

## Decision Drivers

- D1. WAI-ARIA APG patterns: combobox with listbox popup (select-only and list autocomplete), date
  picker dialog; full keyboard map of US-04-AC-06, AC-09; focus trapped and returned; polite
  announcements (story; US-04-BR-05, BR-06, BR-13).
- D2. Built on primitives, not from scratch; exact versions, permissive licence; `@angular/cdk`
  equal to the framework version (story; US-04-BR-14; CLAUDE.md §4).
- D3. Same validation, same stored values, same error timing and focus target as before
  (US-04-BR-07, AC-11; ADR-0004: string editing model, `validateField` as the only rule engine,
  `touched && invalid`, `focusBoundControl()` on a failed submit; ADR-0003 stored shape).
- D4. The labelled, focused element is an `<input>` or `<button>` targeted by the field's
  `<label for>`, so `label.control`, `getByLabel` and the existing `aria-*` bindings keep working
  (US-04-BR-05, Q-04 constraint, Q-06, §11.1).
- D5. Typed date dd/mm/aaaa for every country, independent of the browser locale, stored as ISO;
  unreadable text behaves like the former `badInput` (US-04-BR-06, Q-05; US-01-BR-01, AC-09 note).
- D6. Disabled days come from the same pure validator, no second implementation (US-04-BR-06).
- D7. Panels: popover on wide screens, bottom sheet below 600 px; 44 × 44 px targets; no horizontal
  scroll (US-04-BR-11, AC-12, Q-13).
- D8. Bundle budgets (`angular.json`: initial 500 kB warning) kept or justified (spec §9).
- D9. Testable in jsdom component tests and Playwright e2e by role and label, never by class
  (story; spec §11.1).

## Considered Options

1. **A. `@angular/aria` 22.3.0 for the combobox, listbox and year list, with `@angular/cdk`
   22.3.0** for overlay positioning, the calendar dialog (focus trap and return), live
   announcements and breakpoints; the calendar grid's date navigation as a pure function.
2. **B. `@angular/cdk` 22.3.0 only**: Overlay, `ActiveDescendantKeyManager` (and `cdk/listbox` for
   the year list), `Dialog`, `LiveAnnouncer`; the combobox roles, states and key handling wired by
   hand around the key manager.
3. **C. Angular Material 22.3.0** (`mat-select` / `mat-autocomplete`, `mat-datepicker` with its
   multi-year view), restyled to the design system.

Building the widgets from scratch is excluded by the story.

## Decision Outcome

Chosen option: **"A. `@angular/aria` + `@angular/cdk`"**, because `@angular/aria` is stable at
22.x (the developer-preview tag was removed in 22.0.0) and implements the APG combobox wiring that
option B would have us write by hand (role and states, `aria-activedescendant`, key relay,
typeahead, close on focus-out), which is closest to "from scratch" (D1, D2). It works on an
`<input>` (editable) and on a `<button>` (select-only), so the labelled element stays a labelable
native element (D4). The CDK supplies what `@angular/aria` does not have: overlay positioning with
a bottom sheet, a modal dialog with focus trap and return, and the live announcer. Material (C)
would bring a complete date picker but a select host that a `<label for>` cannot target and a
theming system that competes with our token tiers.

### What is decided

#### 1. Packages (new dependencies)

| Package | Version | Licence | Peers (verified) | Why |
|---|---|---|---|---|
| `@angular/cdk` | **22.3.0** | MIT | `@angular/core`, `common`, `forms`, `platform-browser` `^22.0.0 \|\| ^23.0.0`; `rxjs ^6.5.3 \|\| ^7.4.0`; deps `tslib`, `parse5` | Overlay, Dialog, a11y (`LiveAnnouncer`), layout (`BreakpointObserver`) |
| `@angular/aria` | **22.3.0** | MIT | `@angular/cdk` **`22.3.0`** (exact), `@angular/core ^22.0.0 \|\| ^23.0.0` | `Combobox`, `ComboboxPopup`, `ComboboxWidget`, `Listbox`, `Option` |

Both equal the framework version; an Angular upgrade (CLAUDE.md §4) moves all `@angular/*`
packages together. Installed with `npm install -E`.

#### 2. Components and pure functions (names per CLAUDE.md §6)

| File | Identifier | Role |
|---|---|---|
| `shared/custom-select.ts` (+ `.html`, `.css`) | `CustomSelect` (`app-custom-select`) | Select-only or searchable combobox, `FormValueControl<string>` |
| `shared/date-field.ts` | `DateField` (`app-date-field`) | Date text box + "Elegir fecha" button, `FormValueControl<string>` |
| `shared/calendar.ts` | `Calendar` (`app-calendar`) | Dialog content: month label, year list, grid, buttons |
| `shared/date-text.ts` | `parseDateText()`, `formatDateText()` | Pure, typed-date grammar of Q-05 |
| `shared/calendar-dates.ts` | `monthGrid()`, `nextFocusDate()`, `isDayDisabled()`, `latestValidDate()`, `yearRange()` | Pure, injectable "today" |
| `shared/select-search.ts` | `filterOptions()`, `normaliseForSearch()`, `SEARCH_THRESHOLD = 4` | Pure, accent- and case-insensitive contains |

#### 3. The custom select

- **Focus element.** Select-only (fewer than `SEARCH_THRESHOLD` options): a
  `<button type="button" ngCombobox>`; `@angular/aria` treats any non-`input`/`textarea` element as
  non-editable (`_combobox-chunk.mjs`: `isEditable` checks the tag), so Enter, Space and ArrowDown
  open it and printable keys are relayed to the list for typeahead. Searchable (at or above the
  threshold): an `<input type="text" ngCombobox>`; typing expands it and writes the filter text.
  Either element gets `id="field-<key>"` (input `controlId`), so the existing `<label for>` targets
  it. Its accessible name is the label; for the button variant `aria-labelledby` also points at the
  label, so the shown value is not folded into the name in any browser.
- **Attributes.** `@angular/aria` binds `role="combobox"`, `aria-expanded`,
  `aria-activedescendant`, `aria-controls`, `aria-haspopup` and `aria-autocomplete` (packed
  `fesm2022/combobox.mjs` host bindings). The form binds `aria-required`, `aria-invalid` and
  `aria-describedby` through inputs of `CustomSelect` exactly as today (ADR-0004: bound
  explicitly), applied to the focus element.
- **List.** `<ul ngComboboxWidget ngListbox>` inside `<ng-template ngComboboxPopup>`, with
  `focusMode="activedescendant"`, `selectionMode="explicit"`, `[wrap]="false"`; one `ngOption` per
  configured option in `sortOrder`, `aria-selected` from the listbox; the selected one shows
  `LucideCheck` (hidden) and a style. The prompt "Selecciona una opción" is not an option: it is the
  button's text when the value is `''`, and the input's placeholder for a searchable select.
- **Behaviour owned by `CustomSelect`** (not provided by `@angular/aria`, each tied to a test row):
  Alt+ArrowDown opens on the current option (AC-06); Tab with the list open commits the active
  option and lets focus move (AC-06); on a collapsed select-only, a printable key opens and moves to
  the first match (AC-06); Escape or leaving a searchable select restores the shown label and clears
  the filter without changing the value (AC-07); filtering through `filterOptions()` with the first
  match active (Q-11); the result count or the empty text announced politely through the CDK
  `LiveAnnouncer` (AC-07, §8.1); a pointer click outside closes without changing the value.
- **Panel placement.** A `cdkConnectedOverlay` inside the popup template, anchored to the combobox,
  `cdkConnectedOverlayUsePopover="inline"`: in browsers with the Popover API the panel is a native
  popover in the top layer, inserted next to the trigger (`@angular/cdk@22.3.0`
  `createOverlayRef` defaults `usePopover` to `true` when `showPopover` exists;
  `FlexibleOverlayPopoverLocation` `'inline'` inserts it next to the trigger). Below
  `--breakpoint-sheet` (`BreakpointObserver` with `(min-width: 37.5em)` false) the same panel uses a
  global position strategy anchored to the viewport bottom: full width, at most 85% of the viewport
  height, scrollable list, backdrop, option rows of 48 px, and a "Cerrar" button for touch
  (`tabindex="-1"`, since focus stays on the combobox and Escape or Tab close it for keyboard users).
  Overlays are created with `disableAnimations: true` (ADR-0013).

#### 4. The date field and the calendar

- **Text box.** `<input type="text" inputmode="numeric" id="field-<key>">`, placeholder
  "dd/mm/aaaa", hint "Formato: dd/mm/aaaa" first in `aria-describedby`. No input mask.
- **Parsing (pure, `date-text.ts`).** `parseDateText(text)` returns `''` for blank text, the ISO
  `YYYY-MM-DD` for `d/m/yyyy` with `/`, `-` or `.` separators (1–2 digit day and month) or exactly
  8 digits `ddmmyyyy`, and `null` for anything else, including impossible dates (31/04, 29/02 of a
  non-leap year) and 2-digit years (Q-05). `formatDateText(iso)` returns `dd/mm/yyyy`. Every AC-08
  row is a unit test. The function lives next to the validators and imports nothing from Angular.
- **Binding (`transformedValue`).** `DateField` keeps the shown text with Signal Forms'
  `transformedValue(value, { parse, format })` (`@publicApi 22.0`, `@angular/forms@22.3.0`
  typings). `parse` returns `{ value: iso }`, `{ value: '' }` for blank, and
  `{ value: '', error: { kind: 'parse', message: '' } }` for unreadable text, so the stored value
  is `''` and the field is invalid through a `parse` error, which Signal Forms reports to the bound
  field automatically and which the existing `errorOf()` already maps to the US-01-AC-09 message
  rules (no new message). **Verified hazard:** in `@angular/forms@22.3.0`
  (`fesm2022/signals.mjs`, `transformedValue`), the raw value is a `linkedSignal(() =>
  format(value()))`, so writing `''` to the model would recompute the shown text to `''` and erase
  what the person typed (the R1-F03 failure of US-01 in a new form). Therefore `format(iso)` returns
  the last typed text whenever that text parses to `iso` (unreadable text parses to `''`), and
  `formatDateText(iso)` otherwise. On blur a readable text is normalised to dd/mm/aaaa. A calendar
  choice writes the model, and the text follows through `format`. AC-08's empty-`stored` rows prove
  it in a component test.
- **"Elegir fecha".** A `<button type="button">` after the text box, accessible name
  "Elegir fecha: {label}", `LucideCalendarDays` hidden. It is the one new Tab stop (US-04-BR-13).
- **Calendar dialog.** Opened with the CDK `Dialog`: `ariaModal: true`, labelled by the visible
  month-and-year text (not a heading, US-04-BR-13), `autoFocus` on the day that holds the roving
  `tabindex="0"`, focus returned to "Elegir fecha" on close by passing that button as
  `restoreFocus` (the CDK default, `restoreFocus = true`, returns to whatever was focused before
  opening, verified in `fesm2022/dialog.mjs`; passing the element also covers browsers where a
  pointer click does not focus a button), backdrop, `disableAnimations: true`. The CDK dialog marks the siblings of the overlay container `aria-hidden="true"` while
  open (`fesm2022/dialog.mjs`, `_hideNonDialogContentFromAssistiveTechnology`) and traps Tab. Wide
  screens: a flexible connected position strategy anchored to the date field; below
  `--breakpoint-sheet`: the bottom-sheet strategy of §3.
- **Grid.** A `<table role="grid">`, columns Monday first with full day names from
  `Intl.DateTimeFormat(<country locale tag>, { weekday: 'long' })`, one `role="gridcell"` per day
  with `aria-label` "15 de mayo de 1990" (`{ day, month: 'long', year }`; Node 24 ICU gives exactly
  "15 de mayo de 1990" and "mayo de 1990" for es-CO and es-CL), `aria-selected` on the stored day,
  `aria-disabled="true"` on disabled days (still reachable with arrows, not choosable). Roving
  tabindex. Keys go through the pure `nextFocusDate(date, key, shift)`: arrows ±1 day / ±7 days
  crossing months, Home/End to Monday/Sunday of the week, PageUp/PageDown ±1 month clamped to the
  month's last day, Shift+PageUp/PageDown ±1 year clamped (29/02/2000 → 28/02/2001), Enter/Space
  choose, Escape closes. `@angular/aria`'s `ngGrid` is not used: it moves only inside the rendered
  rows (arrows, Home/End, Ctrl+Home/End in `_widget-chunk.mjs`) and has no PageUp/PageDown, so the
  calendar would override most keys anyway.
- **Year list.** "Elegir año" swaps the grid for an `ngListbox` (`focusMode="roving"`,
  `selectionMode="explicit"`, `[wrap]="false"`) of the years of `yearRange()`, the current year
  selected; Enter chooses, returns to the grid on the same day and month of the chosen year (clamped).
- **Disabled days and range (D6).** `isDayDisabled(config, iso, today)` is
  `validateField(config, iso, today) !== null` (the value is never empty, so "required" never
  applies). `latestValidDate()` probes backwards from today with the same function;
  `yearRange()` is [Y−120, year of the latest valid date] when the field has any rule that
  disables days, else [Y−120, Y+10] (Q-12). No `minAge` arithmetic is written twice.

#### 5. Signal Forms integration (D3)

- `CustomSelect` and `DateField` implement `FormValueControl<string>` (`@publicApi 22.0`): a
  required `value = model<string>()`, a `touch` output emitted when focus leaves the whole widget
  (control, button, panel), and a `focus()` method that focuses the labelled element. The form
  template binds them with the existing narrowing accessor `[formField]="text(config.key)"`; no new
  cast (ADR-0004's "two accessors are the only casts" holds).
- `focusBoundControl()` calls the control's `focus()` when it is implemented (typings of
  `FormUiControl.focus`: "If the focus method is not implemented, Signal Forms will attempt to focus
  the host element"), so a failed "Continuar" focuses the combobox or the date text box (AC-10 of
  US-01, unchanged).
- The components declare **no** inputs named `invalid`, `required`, `touched`, `errors` or
  `disabled`: `FormField` auto-binds inputs with those names (`FormUiControl`), which would show
  `aria-invalid` before the field is touched. The form passes the shown-error state explicitly.
- Stored values: option `value`, ISO date or `''`, as before (ADR-0003, ADR-0004).

#### 6. Store writer (amends the ADR-0004 implementation note)

`date` keys leave the `nativeKeys` set of `quote-form.ts`: the date model now holds `''` for
unreadable text, so the model is the truth and `flushModel()` writes date keys like text and select
keys. `syncNative` and `validity.badInput` remain for `number` only.

#### 7. Lazy step 1 (D8)

Measured on a throwaway copy of `frontend/` (production build, `@angular/build` 22.3.0; baseline
initial `main` 381.44 kB raw / 98.94 kB transfer): `@angular/aria` combobox and listbox with CDK
overlay, dialog, a11y and layout **+125.40 kB raw / +27.81 kB transfer**; CDK alone **+99.29 /
+22.58**. With the icons of ADR-0010, an eager build would pass the 500 kB warning. The
`/:country/datos` route therefore uses `loadComponent` for `QuoteFormPage`, so these packages and
the step 1 icons load in a lazy chunk. The address, the guards and the "focus the arriving `h1`"
rule of ADR-0001 are unchanged; the existing static guard forbids lazy loading only in the summary
feature (US-03-AC-03). The budgets of `angular.json` are not changed.

#### 8. What tests can and cannot see

- **Component tests (jsdom 31.0.1).** jsdom has no `showPopover` and no `inert` (checked in the
  installed package), so the CDK falls back to its overlay container under `document.body`: panels
  and the calendar render **outside** the component's root. Helpers find them through the
  combobox's `aria-controls` (once rendered) or by role in `document`, as spec §11.1 already plans.
  The overlay container is torn down between tests.
- **E2E (Playwright).** Page-wide role queries are unaffected by where the panel sits. Focus trap,
  real key sequences, bottom-sheet geometry and the 44 px boxes are proven here.

### Consequences

- Good, because the APG combobox wiring comes from a maintained Angular package, not from our code
  (D1, D2), and the date logic that is ours is pure and unit-tested row by row.
- Good, because the labelled element stays a native `<input>` or `<button>`: `<label for>`,
  `label.control`, `getByLabel` and the `aria-*` bindings keep working (D4); §11.1's changes stay
  by role and label.
- Good, because validation, messages, stored values and the submit focus rule do not change
  (D3): `validateField` is still the only rule engine, now also deciding disabled days (D6).
- Good, because the bundle stays within budget by moving step 1 to a lazy chunk (D8).
- Bad, because `@angular/aria` has been stable only since 22.0.0 (2026-06-03, about five and a half
  months) and its combobox was rewritten in that release (legacy combobox removed,
  `SimpleCombobox` promoted to `Combobox`, `values` renamed `value`) — mitigation: pinned 22.3.0;
  the use is confined to `CustomSelect` and the year list; every keyboard row is a test.
- Bad, because `@angular/aria` renders the popup lazily, so `aria-controls` is absent while the
  combobox is collapsed, at least until the list has been opened once (host binding `[attr.aria-controls]: _pattern.popupId()`, and the popup
  widget registers only when rendered), while WAI-ARIA 1.2 says authors "MUST set aria-controls on a
  combobox element to a value that refers to the combobox popup element" — mitigation: the gap is
  reported to the spec (*Spec impact* 3) and checked with a screen reader at HC3. `preserveContent`
  (an inherited input of `Combobox`) keeps the popup template rendered after the first open, but
  the listbox sits inside the CDK overlay's own template, which is detached on close, so the
  developer must confirm in a component test whether the reference survives a close; if the human
  requires strict conformance, option B can replace `@angular/aria` inside `CustomSelect` without
  touching the form.
- Bad, because the wrapper still owns several behaviours (Alt+ArrowDown, Tab commit, collapsed
  typeahead, Escape restore, filtering, announcements, sheet) — mitigation: each maps to an AC-06/07
  row and is tested in both select kinds.
- Bad, because the date text needs a custom `format` to keep unreadable text visible (verified
  `linkedSignal` hazard) — mitigation: AC-08 rows with an empty `stored` value test exactly this.
- Bad, because jsdom cannot show the top layer, `inert` or real focus trapping — mitigation: e2e.
- Neutral: two packages of about 3.6 MB (`@angular/cdk`) and 1.2 MB (`@angular/aria`) unpacked in
  `node_modules`; only what is imported reaches the bundle.

### Strongest argument against

Option B (CDK only) builds on the most proven parts of the Angular ecosystem:
`ActiveDescendantKeyManager`, `Overlay` and `Dialog` have years of production use, while
`@angular/aria` has been stable for under six months, had its combobox rewritten with breaking
changes in 22.0.0, has had about two dozen fixes since, leaves `aria-controls` off a collapsed
combobox, has no date picker at all, and adds 26 kB raw on top of the CDK. With B every
ARIA attribute is ours to set exactly as the APG says, so the `aria-controls` gap does not exist,
and there is one primitive library to understand instead of two.

**Why we accept it:** under B the combobox's role, states, key relay, typeahead hand-off and
close-on-focus-out are hand-written: that is the "from scratch" part the story rules out, and the
part where accessibility bugs usually live. `@angular/aria` is the Angular team's implementation of
exactly that pattern, its developer-preview tag was removed in 22.0.0, and it peer-pins the same CDK
we need anyway. The decision is contained: `@angular/aria` is used only inside `CustomSelect` and
the year list, both behind `FormValueControl<string>`, so falling back to B later rewrites one
component, not the form. The 26 kB are in a lazy chunk.

### Confirmation

- Unit tests: `date-text.spec.ts` (every AC-08 row), `calendar-dates.spec.ts` (every AC-09 keyboard
  row through `nextFocusDate`, every AC-10 row with a pinned clock, year ranges of AC-10),
  `select-search.spec.ts` (AC-07 filters, accents, case).
- Component tests: `custom-select.spec.ts` (AC-05, every AC-06 row on "Marca" and on "Tipo de
  documento", AC-07, `aria-expanded`, `aria-activedescendant`, `aria-selected`, prompt),
  `date-field.spec.ts` (AC-08 including the rows with empty `stored` and text kept, hydration,
  AC-09 flow and names, AC-10), `quote-form-page.spec.ts` per §11.1 (failed "Continuar" focuses the
  combobox and the date text box through `focusBoundControl()`).
- E2E `us-04-design-system.spec.ts`: real keyboard on select and calendar, focus trap and return,
  panels at three viewports (AC-12), stored object of AC-11.
- Static checks (code-reviewer): `frontend/package.json` pins `@angular/cdk` and `@angular/aria` to
  `22.3.0`; `@angular/aria` is imported only by `custom-select.ts` and `calendar.ts`; no
  `ReactiveFormsModule`/`FormControl` (ADR-0004 grep unchanged); the only `as unknown as FieldTree`
  casts are still the two accessors; `field-validators.ts`, `date-text.ts` and `calendar-dates.ts`
  import nothing from `@angular/*`.
- HC3: screen reader pass on the select (both kinds), the calendar and the year list (spec §9).

## Pros and Cons of the Options

### A. `@angular/aria` + `@angular/cdk` (chosen)

- Good, because the combobox and listbox follow the APG pattern with library-maintained ARIA and
  keyboard wiring; works on `<input>` and `<button>`.
- Good, because the CDK covers positioning, popover top layer, bottom sheet, modal focus trap and
  return, `aria-hidden` of the page behind, and announcements.
- Bad, because the library is young (stable since 22.0.0) and has gaps the wrapper fills.
- Bad, because +125.40 kB raw for both packages (measured), hence the lazy step 1.

### B. `@angular/cdk` only

- Good, because every primitive is long-established; one library; full control of every attribute.
- Good, because +99.29 kB raw (measured), 26 kB less than A.
- Bad, because the combobox ARIA wiring and key handling are hand-written around the key manager:
  more custom accessibility code to get right and to test (story: "not from scratch").
- Bad, because `cdk/listbox` expects focus inside the listbox, which does not fit a combobox whose
  focus stays on the input; only the year list could use it.

### C. Angular Material 22.3.0

`@angular/material@22.3.0`, MIT (npm view, 2026-11-21). Not measured.

- Good, because `mat-datepicker` is a complete, mature date picker with month and multi-year views
  and a pluggable date adapter; `mat-autocomplete` covers the search case.
- Bad, because `mat-select`'s focus element is the `<mat-select>` host, a custom element that a
  `<label for>` cannot target, so `label.control` and the §11.1 helpers break (D4).
- Bad, because Material's own theming (system tokens, density, typography) competes with ADR-0010's
  token tiers; restyling to the brief means overriding Material's internal structure.
- Bad, because it is the heaviest option and adds a third Angular package family to upgrade.

## Amendments to accepted ADRs (explicit; the accepted files are not edited)

**ADR-0004** (Accepted 2026-11-20):

1. Driver **D7** "Native controls, accessible name, description, required and invalid states, error
   announced once" now reads, for `select` and `date` fields only: custom controls built on
   `@angular/aria` and `@angular/cdk`, whose labelled element is a native `<input>` or `<button>`
   targeted by the field's `<label for>`, with the same accessible name, description, required and
   invalid bindings and the same one-time error announcement. `text`, `number` and `checkbox` stay
   native.
2. The **implementation note** (`adr/README.md`, ADR-0004 row): "`syncNative` is the only writer of
   number and date keys" becomes "of number keys"; date keys are written by `flushModel()` from the
   model, which holds `''` for unreadable text through `transformedValue` (§4, §6). The submit gate,
   `onInvalid` with `focusBoundControl()`, and the `parse`-error message rule are unchanged.

If this ADR is accepted, the `adr/README.md` row of ADR-0004 reads "Accepted (amended by ADR-0012)",
and the implementation-notes table gets a pointer row.

## Spec impact (reported to the orchestrator; the spec is not edited here)

1. **§11.1, AC-05 and `expectEmptyStep1`**: for a **searchable** select (an `<input>`), the prompt
   "Selecciona una opción" is the placeholder, so `inputValue()` is `''` when empty. Tests of the
   empty state should assert the placeholder (or the accessible description) plus the stored value,
   not `inputValue() === 'Selecciona una opción'`. For a select-only (a `<button>`), the prompt is
   the visible text.
2. **US-04-AC-09** "the page behind is inert": the CDK dialog gives a focus trap, a backdrop that
   takes pointer events and `aria-hidden="true"` on the page behind, not the HTML `inert`
   attribute. The scenario should assert those three (or the developer adds `inert` and the test
   checks it in e2e; jsdom has no `inert`).
3. **§11.1 `quote-form-page.spec.ts` "select → role=combobox with `aria-expanded="false"` and
   `aria-controls`"**: with `@angular/aria`, `aria-controls` is bound only while the list is
   rendered; while collapsed it is absent (at least before the first open). Either relax that
   assertion to "while expanded" or accept option B for `CustomSelect`.
4. **US-04-Q-12 / AC-09 "Monday first"**: CLDR week data (Node 24 ICU, `Intl.Locale.weekInfo`)
   gives Sunday as the first day for `es-CO` and Monday for `es-CL`. The spec fixes Monday for both
   countries; the human should confirm this is intended for Colombia.
5. **US-04-Q-11 with Q-13 on phones**: a searchable select on a 360 px screen opens a bottom sheet
   while the on-screen keyboard is up; the sheet must fit above the keyboard. The ADR keeps one
   combobox pattern at every width (focus stays in the text box); the HC3 phone pass must check
   this, and if it fails, the fallback is a sheet with its own search box (a dialog), which changes
   the ARIA pattern on narrow screens and needs a spec change.
6. **US-01 supersessions** listed in US-04-Q-04 (Q-22 native date, §9 native controls, BR-02 prompt
   as an option) are consistent with this ADR.

## More Information

- **Verified on 2026-11-21** (npm registry, `npm pack` into a temporary directory, installed
  packages in `frontend/node_modules`, and a throwaway build; nothing installed in the project):
  - `npm view @angular/aria@22.3.0`: MIT; peers `@angular/cdk 22.3.0`, `@angular/core ^22.0.0 || ^23.0.0`;
    published 2026-11-18. Entry points: `accordion`, `combobox`, `grid`, `listbox`, `menu`, `tabs`,
    `toolbar`, `tree` (each with `testing`); no date picker.
  - `npm view @angular/cdk@22.3.0`: MIT; peers as in §1; deps `tslib`, `parse5`.
  - Stability: angular/components `CHANGELOG.md`, release **22.0.0 (2026-06-03)**: "remove developer
    preview tag from aria" (#33232) and "promote simple-combobox to stable un-prefixed combobox";
    breaking: "The legacy combobox and autocomplete implementations have been removed", "Renames the
    values input/model to value in Combobox, Listbox, …". About 24 entries in the `aria` scope from
    22.0.1 to 22.3.0 (counted from a summarised read of the CHANGELOG; approximate). The packed
    typings carry no stability tags. angular.dev "Angular Aria" overview (site built at v22.3.0):
    no stability notice, a "New" label; patterns listed: Autocomplete, Listbox, Select,
    Multiselect, Combobox, Menu, Menubar, Toolbar, Accordion, Tabs, Tree, Grid.
  - API facts from packed `@angular/aria@22.3.0`: `Combobox` inputs `disabled`, `readonly`,
    `softDisabled`, `alwaysExpanded`, `tabindex`, models `expanded`, `value`; `ComboboxPopup`
    `popupType` `'listbox' | 'tree' | 'grid' | 'dialog'`; `Listbox` inputs `wrap`, `focusMode`
    (`activedescendant` | `roving`), `selectionMode` (`explicit` | `follow`), `typeaheadDelay`,
    model `value`; `DeferredContentAware.preserveContent`.
  - `@angular/forms@22.3.0`: `FormValueControl`, `FormUiControl` (`touch`, `focus()`),
    `transformedValue` and `TransformedValueSignal` are `@publicApi 22.0`; `transformedValue` builds
    the raw value with `linkedSignal` (`fesm2022/signals.mjs`).
  - jsdom 31.0.1 (`frontend/node_modules/jsdom`): no `showPopover`, no `inert` implementation.
  - WAI-ARIA 1.2, combobox role (w3.org/TR/wai-aria-1.2, read 2026-11-21): required states and
    properties `aria-controls`, `aria-expanded`.
  - Build measurements: see §7.
- **Third-party skill conflict (CLAUDE.md §1, §5):** the vendored `angular-aria.md` says "Never use
  native HTML elements like `<select>`" and shows `[formField]` bound directly to `ngCombobox`. We
  reach `@angular/aria` on our own drivers, but we do **not** bind `[formField]` to `ngCombobox`:
  its `value` model is the input's text (the search string), not the option value, so it would
  store labels or filter text. The form binds `CustomSelect`, which maps the listbox selection to
  the option value.
- **Related ADRs:** ADR-0004 (amended here), ADR-0003 (stored values unchanged), ADR-0001 (route
  address unchanged; step 1 lazy), ADR-0010 (tokens, icons, breakpoints), ADR-0013 (panel motion,
  `disableAnimations`).
- **Revisit when:** `@angular/aria` ships a date picker or changes its combobox API; the HC3 screen
  reader or phone pass fails on the select or the calendar; the `aria-controls` gap is judged a
  blocker.
