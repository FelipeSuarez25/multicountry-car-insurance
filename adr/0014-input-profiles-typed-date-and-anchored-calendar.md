---
status: Accepted
date: 2026-11-22
decision-makers: Felipe Sabogal (direction given at HC3 and acceptance, 2026-11-22), architect subagent (proposal)
consulted: the human's verbatim HC3 feedback and decisions D1–D6 of 2026-11-22 (orchestrator brief), specs/US-04/spec.md v0.2 and the v0.3 IDs in progress (BR-17..BR-21, AC-24..AC-29), specs/US-01/spec.md (BR-01, AC-09), ADR-0004, ADR-0010, ADR-0011, ADR-0012, frontend code at 4c12499 (panel-position.ts, date-field.ts/.html, date-text.ts, calendar.html/.css, field-validators.ts, quote-form.ts/.html, field-icons.ts, tokens.css, contrast-pairs.json, contrast.spec.ts, testing/css.ts), backend/src/seed/form-fields.ts, installed @angular/cdk 22.3.0, @angular/forms 22.3.0 and @lucide/angular 1.77.0, DOM Standard (dispatch), CSS Scroll Snap 1 (scroll-padding), MDN (beforeinput, maxlength, input type=number)
informed: all agents via CLAUDE.md precedence; spec-writer (US-01 BR-01/AC-09 and US-04-Q-05 impact); test-engineer (contrast guard change, US-01-AC-09 number tests); frontend-developer; strapi-developer (seed rules)
---

# ADR-0014: Input profiles, typed-date mask and an anchored compact calendar; lighter page gradient (amends ADR-0010 and ADR-0012)

> **Acceptance note.** Accepted by the human's explicit direction at HC3 (2026-11-22);
> concrete values are the main session's recommendation, reviewed in the HC3 QA of this round.
> The human accepted it in the session on 2026-11-22 (option "Aceptar ADR-0014"), including the two
> departures from the brief: no per-country tint in the page gradient, and the reversal of the HC1
> answer to US-04-Q-05 ("no input mask").

## Context and Problem Statement

At HC3 of US-04 the human asked for six changes (brief D1–D6): on wide screens the calendar opened
**above** the birth-date field and covered the header; typing `29/20/2001` showed
"Ingresa tu fecha de nacimiento." (the Strapi `requiredMessage`); "Nombre completo" accepts digits
and no field has a maximum length; the page should be lighter, with a gradient, on every page; back
links and a country change are missing; the chooser is too plain. Three of these touch accepted
decisions: ADR-0012 §4 ("No input mask"; the parse error reuses the US-01-AC-09 message rules;
wide-screen position "below, above when there is no room"), ADR-0012 §6 (`syncNative` stays for
`number`), and ADR-0010 (page background, surfaces, icon list, contrast proof). The HC1 answer to
US-04-Q-05 ("no input mask", "no new validation message") is overridden by this HC3 direction.

Facts from the code at 4c12499:

- **Why the calendar went up.** `panelPositionStrategy()` gives the CDK two positions (below, then
  above) with `withPush(true)`. In `@angular/cdk@22.3.0` (`fesm2022/_overlay-module-chunk.mjs`,
  `_applyPosition` loop at l.1150–1202) the **first position that fits completely wins**; if none
  does, the one with the largest visible area is pushed. Below did not fit, above did, so it opened
  above. The CDK `Dialog` uses the **block** scroll strategy by default (`fesm2022/dialog.mjs`
  l.416–421), so the page cannot scroll once the calendar is open.
- **Why it looked large.** `calendar.css` already fixes the width at `--size-calendar-width`
  (21.5rem): 7 columns of about 44.6 CSS px. The ~80 px cells in the screenshot are consistent with
  a 2× device-pixel capture. The real excess is **height**: a stacked head (title row + controls
  row), a 44 px weekday row, six 44 px weeks and a full-width "Cerrar" add up to about 32rem
  (computed from `calendar.css`, not measured).
- **Why "no me deja".** `DateField`'s `parse` error has `message: ''`; `QuoteForm.errorOf()` maps any
  `parse` error to `validateField(config, '')`, which is the `requiredMessage` of a required field.
- **Patterns.** `validateField` compiles `pattern` rules as `new RegExp(`^(?:${rule.value})$`)`
  with no flags, so `\p{L}` is not available to seed patterns.
- **Signal Forms listener.** `@angular/forms@22.3.0` binds a native control with a non-capture
  `nativeEl.addEventListener('input', onInput)` (`fesm2022/signals.mjs` l.1100).

## Decision Drivers

- D1. The human's HC3 direction, D1–D6 of the brief (CLAUDE.md §1); new US-04-BR-17..BR-21 and
  AC-24..AC-29 of spec v0.3.
- D2. Strapi stays the source of truth for labels, messages and validation rules (US-01-BR-01,
  ADR-0004); no change to the `dynamic-form-fields` contract v1 or to the Strapi schema (brief D2,
  D3).
- D3. No country code outside `country-visuals.ts` (ADR-0011 and its guard).
- D4. AA contrast proven by the existing guard (US-04-AC-02, ADR-0010 §4); no loose values
  (ADR-0010 §2).
- D5. Keyboard, focus trap, focus return and 44 × 44 targets unchanged (US-04-AC-09, BR-11, BR-13).
- D6. Exact pinned dependencies; no new package (CLAUDE.md §4, US-04-AC-21).

## Considered Options

| Decision | Options |
|---|---|
| A. Calendar below the field | **A1. Scroll the field up before opening when the room below is short; header excluded from the fit viewport; above only as last resort** · A2. Below only, with push · A3. Below only, with flexible dimensions (the popover shrinks and scrolls inside) |
| B. Typed date | **B1. Own pure mask in `date-text.ts` + code-owned "unreadable date" message on the parse error** · B2. A mask library (for example `ngx-mask`, `imask`) · B3. A Strapi-owned format message (new `formatMessage` attribute) |
| C. Allowed characters and max length | **C1. Front-end input-profile map by field key + a sanitising directive on a capture-phase `input` listener; `maxlength` from the Strapi `maxLength` rule** · C2. Profiles as Strapi content (new attributes on `form-field`) · C3. Derive allowed characters from the Strapi `pattern` rule · (mechanism variant) `beforeinput` + `preventDefault` |
| D. Page background | **D1. Lighter solid `--color-bg` + a translucent `--gradient-page` painted over the first viewport, texture on top** · D2. Lighter solid `--color-bg` only · D3. A gradient stretched over the whole document height |

## Decision Outcome

Chosen: **A1, B1, C1, D1**, plus the navigation and chooser presentation of §5, because they meet
the human's direction with no new dependency, no Strapi contract or schema change and no country
code in components, and each keeps the existing guards as the proof.

### What is decided

#### 1. Calendar: anchored below, compact (amends ADR-0012 §4; US-04-AC-24)

- **Header offset, one source.** `html { scroll-padding-top: calc(var(--size-header-height) +
  var(--space-2)); }` with a new semantic token `--size-header-height` (4.25rem = 44 px target +
  two `--space-3`), used as the header's `min-height`. The same rule keeps keyboard focus from
  landing under the sticky header (CSS Scroll Snap 1 §4.2: scroll-padding "should affect whether an
  element … is considered scrolled into view (e.g. for targeting or focusing operations)"; Baseline
  widely available since April 2021, MDN).
- **Before opening** (wide only, `DateField.open()`): if the room below the text box
  (`innerHeight − rect.bottom`) is smaller than the popover's maximum height, call
  `box.scrollIntoView({ block: 'start', behavior: 'instant' })`, then open. The check is a pure
  function in `panel-position.ts` (`needsScrollBeforeOpen(fieldBottom, viewportHeight,
  panelHeight, gap)`); the panel height is the new token `--size-calendar-max-height` (27rem)
  read once from the root and converted from rem.
- **Position strategy (wide):** positions stay "below, start-aligned" then "above", but
  `withViewportMargin({ top: <header offset in px>, bottom: GAP, start: GAP, end: GAP })`
  (`ViewportMargin` object form, `@angular/cdk@22.3.0` typings l.311–316). The CDK fit viewport
  then excludes the sticky header (`_getNarrowedViewportRect`, l.1679), so "above" can only win
  when it fits **below the header**, which after the scroll happens only when the viewport is
  shorter than header + field + popover. The header offset in px is read from
  `getComputedStyle(documentElement).scrollPaddingTop`.
- **Compact layout:** one head row (month-year title, previous, next); weekday row height
  `--size-calendar-weekday` (1.75rem, not interactive, so the 44 px minimum does not apply); day
  cells exactly `--size-target-min` (44 × 44); a footer row with "Elegir año" and "Cerrar" side by
  side; padding `--space-3`. Width stays `--size-calendar-width` (21.5rem ≤ 22rem). The pane's
  `max-height` is `--size-calendar-max-height`. A six-week month is 44 + 28 + 264 + 44 px plus gaps and
  padding ≈ 26.75rem (computed, not measured): about 12 px over the spec's 26rem design target,
  inside its tested 28rem limit; a five-week month is ≈ 24rem.
- Narrow screens: bottom sheet unchanged. Keyboard, ARIA, focus trap and return unchanged.

#### 2. Typed date: mask and unreadable-date message (amends ADR-0012 §4; US-04-AC-25)

- **Mask (pure, `date-text.ts`):** `maskDateDigits(raw: string, caret: number): { text: string;
  caret: number }`, a left-to-right scan into three groups (day 2, month 2, year 4 digits). A digit
  goes into the current group, or into the next one when the current is full. A typed or pasted
  separator (`/`, `-`, `.`) closes a non-empty day or month group, padding one digit to two
  (`5/` → `05`); any other character is dropped; digits beyond 8 are dropped. The output joins the
  groups with `/`, and a `/` is shown only once the next group has a digit (`15` shows `15`, `150`
  shows `15/0`, `5/5/1990` shows `05/05/1990`). Never showing a trailing `/` is what makes
  Backspace natural: `15/05/1990`, End, Backspace × 4 → `15/05`; once more → `15/0`
  (US-04-AC-25). The caret goes to the end when it was at the end of `raw`, otherwise after the
  same count of digits it followed.
- **Where it runs:** `DateField.onInput` masks, writes `el.value` and the caret, then calls
  `this.text.set(masked)`. `format` already returns `lastTyped` while it parses to the model value,
  so the masked text is what stays on screen. Template: `maxlength="10"`, `inputmode="numeric"`
  (already), placeholder `dd/mm/aaaa` (kept). `parseDateText` is unchanged and still accepts every
  AC-08 input.
- **Message:** `DATE_TEXT_ERROR = 'Fecha no válida. Usa el formato dd/mm/aaaa.'` (code-owned
  microcopy, spec §8.1) exported from `date-text.ts` and set as the `parse` error's `message`.
  `errorOf()` shows a `parse` error's own message when it is non-empty; the old rule (requiredMessage
  / errorMessage) stays only for a `parse` error without one. Result: empty → Strapi
  `requiredMessage`; incomplete or impossible text → `DATE_TEXT_ERROR`; a real date under 18 →
  Strapi `minAge` message (the model holds the ISO date, so `validateField` runs). Error timing
  unchanged (touched or submit attempt). The model stays ISO or `''`.

#### 3. Input profiles (amends ADR-0004's implementation note and ADR-0012 §6; US-04-AC-26)

- **Map (pure, `frontend/src/app/shared/field-input-profiles.ts`):** `inputProfileFor(config)`
  returns `{ allows(char): boolean; transform?: 'uppercase'; inputMode; autocomplete?;
  autocapitalize?; fallbackMax? }`, chosen by `config.key`, then by `config.type`, like
  `field-icons.ts`. It is presentation and keystroke behaviour only: validity is still decided by
  `validateField` on the Strapi rules.

  | Key / type | Allowed | Hints | Fallback max |
  |---|---|---|---|
  | `fullName` | `\p{L}`, space, `'`, `-`, `.` | `autocomplete="name"`, `autocapitalize="words"` | 80 |
  | `documentNumber` without `rutCheckDigit` | digits | `inputmode="numeric"` | 10 |
  | `documentNumber` with a `rutCheckDigit` rule | digits, `.`, `-`, `k`/`K` (shown `K`) | `inputmode="text"` | 12 |
  | `plate` | letters, digits; uppercase | `autocapitalize="characters"`, `autocomplete="off"` | 6 |
  | `model` | letters, digits, space, `-`, `.`, `/` | — | 40 |
  | any `number` field (e.g. `vehicleYear`) | digits | `inputmode="numeric"` | 4 for `vehicleYear` |
  | any other key | no filter | — | none |

  The RUT variant is chosen by the **presence of a `rutCheckDigit` rule**, never by country code
  (D3). The filter's own predicates use the `u` flag; it is front-end code, not a Strapi pattern.
- **`maxlength`** on every text and number input = the field's Strapi `maxLength` rule value when
  present, else the profile's fallback, else no attribute. Generic, so new Strapi fields get it.
- **Mechanism:** a directive `input-profile.ts` → `InputProfile` (`[appInputProfile]`, CLAUDE.md §6)
  on the native `<input>`, registering `addEventListener('input', …, { capture: true })` on the
  element itself. By the DOM Standard dispatch algorithm, capture listeners at the target run before
  non-capture ones, so the directive rewrites `el.value` (drop disallowed characters, apply the
  transform, clamp to the max, keep the caret after the same count of kept characters) **before**
  Signal Forms' non-capture listener reads it. A pure `sanitizeInput(raw, caret, profile)` does the
  work and is unit-tested. It also covers paste, autofill and IME text, which `beforeinput` cannot
  always cancel (MDN: the event "may fire but be non-cancelable … by IME … details vary by browser").
- **Number fields** render as `<input type="text" inputmode="numeric">` (MDN, input type=number:
  "If spinbutton is not an important feature … consider not using type="number". Instead, use
  inputmode="numeric""; `maxlength` is not among its attributes). The model stays a string
  (ADR-0004). With no native number input left, `validity.badInput` cannot happen: the `nativeKeys`
  set, `syncNative` and `flushBindings` are removed, and `flushModel()` writes number keys like
  every other key. `validateField`'s integer check (`/^-?\d+$/`) still rejects a hydrated
  `2015.5`, with the Strapi `errorMessage`.
- **Seed content** (strapi-developer; no schema change): `fullName` CO and CL get a `pattern` rule
  written as an explicit class, because seed patterns compile without the `u` flag:
  `[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '.-]*`, with errorMessage "Ingresa tu nombre
  completo, solo letras (entre 3 y 80 caracteres)."; `documentNumber` CO `maxLength` 10, CL 12;
  `plate` CO and CL `maxLength` 6. Existing databases keep the seed's create-only rule; the demo is
  reset with `docker compose -p mci-demo down -v`.

#### 4. Page background (amends ADR-0010 §4 and §6; US-04-AC-27)

- New primitives `--primitive-violet-950: #231541`, `--primitive-ink-925: #11101C` and
  `--primitive-ink-750: #31303F`.
- `--color-bg: var(--primitive-ink-925)` (solid base and fallback; lighter than ink-950).
- `--gradient-page: linear-gradient(180deg, var(--primitive-violet-950) 0%,
  var(--primitive-ink-925) 100%)`: every stop is a token and none is darker than ink-950
  (US-04-AC-27). Painted on `body` of every page under the dot texture:
  `background: var(--texture-dots) 0 0 / var(--texture-dots-gap) var(--texture-dots-gap) repeat,
  var(--gradient-page) top / 100% var(--size-page-gradient) no-repeat, var(--color-bg)`, with
  `--size-page-gradient: 40rem`. The last stop equals `--color-bg`, so long pages have no seam.
- **No per-country tint** in the page gradient (the brief allowed it as optional): it would need
  one contrast proof per accent and a second place where accents are used, against ADR-0011's single
  accent selector. Revisit at HC3 if the human wants it.
- Surfaces move one step up so they stay apart from the lighter base: `--color-surface` → ink-850,
  `--color-surface-raised` → ink-800, `--color-surface-hover` → ink-750. Panels keep their border.
- **Contrast proof.** Lightest stop = `#231541`. Computed with the WCAG formula
  (scratch script, same formula as `testing/contrast.ts`), worst cases over that stop with the
  dots composited: text 12.83, muted 7.37, link and focus 7.16, error 6.56, success 8.63, brand
  5.32, control border 3.48, accent CO 9.20, CL 4.81; over `--color-surface-hover` (#31303F): muted
  6.89, focus 6.70, control border 3.26. All meet their minimums.
- **Guard change (test-engineer):** `--gradient-page` is added to every page-level `bg` list in
  `contrast-pairs.json` (`bgColours` already expands a gradient into its stops), and
  `texture-worst` is composited over the **lightest** stop of `--gradient-page` instead of over
  `--color-bg` (`contrast.spec.ts`, `bgColours`).

#### 5. Back links, country link and chooser (amends ADR-0010 §7; US-04-AC-28, AC-29)

- The wizard header becomes a shared presentational component `site-header.ts` → `SiteHeader`
  (`app-site-header`), used by the chooser (no country) and the wizard shell. The country chip is
  an `<a routerLink="/">` named "Cambiar país (actual: <Strapi country name>)": it contains the
  visible name (WCAG 2.5.3); the flag stays decorative. Header content stays inside
  `--size-content-max` with its padding.
- Back links are `<a routerLink>` with `LucideArrowLeft` (`aria-hidden`; export verified in
  `@lucide/angular@1.77.0`), 44 × 44 hit box, visible focus, between the step indicator and the
  `h1`: datos → "Cambiar país" (`/`), planes → "Volver a tus datos", resumen → "Volver a planes";
  none after payment. Leaving and re-entering a country keeps ADR-0001's `enterCountry` rule (same
  country keeps data, another discards it); no new dialog.
- The chooser adds a lead paragraph and an `h2` "Cómo funciona" with an ordered list of the three
  steps, reusing the step indicator's icons. Copy is code-owned (spec §8.1). This adds to the
  CLAUDE.md §5 frontend-design override at the human's request; nothing else is added.

### Amendments to accepted ADRs (explicit; the accepted files are not edited)

**ADR-0012** (Accepted 2026-11-21): §4 "No input mask" is replaced by §2 above; §4 "the existing
`errorOf()` already maps [the parse error] to the US-01-AC-09 message rules (no new message)"
becomes "the parse error carries `DATE_TEXT_ERROR`"; §4 "Wide screens: a flexible connected
position strategy anchored to the date field" gains §1 above (scroll first, header margin, compact
size); §6 "`syncNative` and `validity.badInput` remain for `number` only" becomes "are removed".

**ADR-0010** (Accepted 2026-11-21): §4 palette gets the new primitives, `--color-bg`, surfaces and
`--gradient-page` of §4 above, and its contrast table is proven against the gradient's lightest
stop; §6 scales get `--size-header-height`, `--size-calendar-max-height`,
`--size-calendar-weekday`, `--size-page-gradient`; §7 gets `LucideArrowLeft` and the input-profile
map as a second presentation/behaviour map next to the icon map.

**ADR-0004** (Accepted 2026-11-20), implementation note: the `syncNative` writer is gone; one
writer per key still holds (`flushModel()` for every key). The decision (Signal Forms over the
shared core, string model, submit gate, `onInvalid` focus) is unchanged.

When this ADR is accepted, the `adr/README.md` rows of ADR-0010 and ADR-0012 read "Accepted
(amended by ADR-0014)" and the ADR-0004 implementation note gets a pointer row.

### Consequences

- Good, because the calendar opens below the field in every viewport that can hold it, and never
  over the sticky header.
- Good, because typed dates format themselves and a wrong date gets a message that says what is
  wrong, while empty and under-age keep the Strapi messages.
- Good, because disallowed characters never reach the model, `maxlength` follows Strapi, and the
  number field loses the badInput special case (less code, one writer path).
- Bad, because opening the calendar may scroll the page — mitigation: only when the room below is
  short, `behavior: 'instant'` (no motion), and the field stays visible under the header.
- Bad, because `maxlength` truncates a paste **before** the directive filters it, so a long paste
  with separators can lose trailing characters — mitigation: profiles' maxima match the formats
  (RUT 12 includes dots and dash); Strapi validation still reports anything wrong.
- Bad, because the input-profile map is keyed by field key in code: a new field key from Strapi
  gets no filter until a developer adds it — mitigation: the default (no filter, Strapi `maxLength`)
  is safe; validation stays in Strapi rules.
- Bad, because US-01 behaviour changes: US-01-BR-01/AC-09 "a number input the browser cannot read"
  no longer exists, and US-04-Q-05's "no mask, no new message" is reversed — mitigation: the
  spec-writer records both in the specs' Review logs; the test-engineer rewrites the US-01-AC-09
  number tests (`e2e/us-01-data-form-co.spec.ts` l.122–152, `quote-form-page.spec.ts` badInput
  stubs) to "non-digits cannot be typed; a hydrated `2015.5` is shown and invalid".
- Bad, because the contrast guard must change (texture over the lightest stop) — mitigation: the
  change makes the guard stricter, not looser.
- Neutral: the lighter base narrows the luminance gap to surfaces (surface vs lightest stop 1.00);
  panels rely on their borders near the top of the page. Judged at HC3 QA.

### Strongest argument against

A proponent of C2 would say: input behaviour is per-field configuration, and this project's rule
is that business users change fields without deploys. Keying allowed characters, uppercase and
keyboard hints to field keys in front-end code means a new or renamed Strapi field silently loses
them, and the CO/CL document variant is inferred from a validation rule rather than stated. A
Strapi `inputProfile` enumeration (`name | digits | rut | plate | free`) on `form-field` would make
the behaviour explicit, editable and testable as content.

**Why we accept it:** the human asked for no contract or schema change in this round, and US-04
is a presentation story; C2 is a `dynamic-form-fields` contract v2 plus a schema migration for both
countries. The filter never decides validity (Strapi rules do), so a missing profile degrades only
to today's behaviour. If editors start adding fields often, C2 is the follow-up and this map
becomes its fallback.

### Confirmation

- Unit: `maskDateDigits` (typing, Backspace over `/`, the four paste forms, caret), `sanitizeInput`
  and `inputProfileFor` (every table row, RUT by rule, unknown key), `needsScrollBeforeOpen`,
  `errorOf` (empty / unreadable / under-age messages).
- Component: date field shows `DATE_TEXT_ERROR` for `29/20/2001` after blur and stores `''`;
  `maxlength` equals the Strapi `maxLength`; a digit typed into "Nombre completo" never reaches the
  model.
- Contrast guard with `--gradient-page` and texture over the lightest stop (US-04-AC-02, AC-27).
- E2e at 1280×800: calendar pane top ≥ field bottom and ≥ header bottom; pane height ≤
  `--size-calendar-max-height`; back links and the chip navigate as in AC-28.
- Static guards unchanged: no loose values, no country code outside `country-visuals.ts`, exact
  dependency list (no new package).

## Pros and Cons of the Options

### A1. Scroll first, header margin (chosen)

- Good, because the CDK keeps choosing among real positions; only the starting scroll changes.
- Bad, because the page moves when the calendar opens near the bottom of the viewport.

### A2. Below only, with push

- Good, because it is a one-line change (drop the "above" position).
- Bad, because when below does not fit, `_pushOverlayOnScreen` moves the pane **up** over the
  field (and possibly the header) to keep it on screen (`overflowBottom`, l.1404–1433).

### A3. Below only, flexible dimensions

- Good, because the pane always starts below the field, without scrolling the page.
- Bad, because the grid gets an inner scroll; the focused day can be clipped, against US-04-AC-09.

### B1. Own pure mask (chosen)

- Good, because it is ~30 lines, pure and testable, and fits the existing `transformedValue`.
- Bad, because caret handling is ours to get right (covered by unit tests).

### B2. Mask library

- Good, because caret and paste edge cases are solved upstream.
- Bad, because it adds a dependency (US-04-AC-21 list, ADR-0010) and a second input pipeline in
  front of Signal Forms' `transformedValue`.

### B3. Strapi-owned format message

- Good, because every user-facing message would be content.
- Bad, because it needs a new attribute (schema and contract change) for a message about the
  widget's format, which the human fixed in code-owned Spanish.

### C1. Front-end profile map + capture-phase sanitiser (chosen)

- Good, because no contract change, works for paste and IME, and runs before Signal Forms reads.
- Bad, because behaviour is keyed by field key in code (see Strongest argument against).

### C2. Profiles as Strapi content

- Good, because editors control it and new fields get it without a deploy.
- Bad, because it is a schema and contract change for both countries, outside this round.

### C3. Derive from the `pattern` rule

- Good, because it reuses existing content.
- Bad, because extracting an allowed-character set from an arbitrary regular expression is
  fragile; many fields have no pattern (`fullName`, `model`).

### Mechanism variant: `beforeinput` + `preventDefault`

- Good, because rejected characters never appear, even for a frame.
- Bad, because the event can be non-cancelable (IME, autocorrect, autofill; MDN), so an `input`
  fallback is needed anyway.

### D1. Lighter base + top gradient (chosen)

- Good, because it meets "más claro y con degradado" with one token and a seamless fade.
- Bad, because the contrast guard must learn the lightest stop.

### D2. Lighter solid only

- Good, because the proof is a single colour.
- Bad, because it does not give the gradient the human asked for.

### D3. Gradient over the whole document

- Good, because the tint follows the page.
- Bad, because the gradient stretches differently on each page length (step 1 vs summary), so the
  pages do not look the same.

## More Information

- Evidence: `@angular/cdk@22.3.0` `fesm2022/_overlay-module-chunk.mjs` (position loop l.1150–1202,
  push l.1404–1433, `_getNarrowedViewportRect` l.1679–1691), `types/_overlay-module-chunk.d.ts`
  (`ViewportMargin`, l.311–316), `fesm2022/dialog.mjs` (block scroll strategy, l.416–421);
  `@angular/forms@22.3.0` `fesm2022/signals.mjs` l.1100; `@lucide/angular@1.77.0` exports
  `LucideArrowLeft`; DOM Standard, dispatch steps 13–14 (capture listeners at the target first);
  W3C CSS Scroll Snap 1 §4.2; MDN `beforeinput`, `maxlength` (UTF-16 code units),
  `<input type="number">`.
- Related ADRs: ADR-0004, ADR-0010, ADR-0011, ADR-0012 (amended here), ADR-0001 (`enterCountry`
  rule reused, unchanged), ADR-0013 (no new motion: the scroll is instant).
- Revisit when: editors need to add form fields with their own input behaviour (then C2), or a
  third country brings a document format no profile covers.
