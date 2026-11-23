# US-04 — Design system and visual redesign · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (English translation of the human's request, not edited; the human confirms the translation at HC1) |
| Status | Approved |
| Version | 0.4 |
| Author | spec-writer subagent (Claude Opus 5.5) |
| Approved by | v0.1: Felipe Sabogal, 2026-11-21 (HC1 round 1). v0.2: applies the ADR-driven adjustments 1–14 and the week-start decision that the human approved at that same HC1 (§13); the further alignments with the accepted ADR-0010..0013 listed in the v0.2 row of §13 are for the human to confirm. v0.3: changes **directed by the human at HC3 round 1** (2026-11-22, CLAUDE.md §1): BR-17..BR-21, AC-24..AC-29 and the amendments in the v0.3 row of §13. The concrete values (sizes, profiles, max lengths, copy) are the main session's recommendation ("como lo recomiendes"); the human reviews them in the HC3 QA of this round. Status stays `Approved`. v0.4: changes **directed by the human at HC3 round 2** (2026-11-22, CLAUDE.md §1): BR-22, BR-23, AC-30, AC-31, Q-28..Q-30 and the amendments in the v0.4 row of §13 (header style, favicon and app icons). The concrete values are the main session's recommendation (decisions D8, D9); the human reviews them in the HC3 QA of round 2. Status stays `Approved`. |
| Related ADRs | [ADR-0001](../../adr/0001-multi-country-content-strategy.md) (amended by ADR-0006 and [ADR-0011](../../adr/0011-country-visuals-amends-adr-0001.md)), [ADR-0003](../../adr/0003-wizard-state-persistence.md) (stored values unchanged), [ADR-0004](../../adr/0004-forms-library.md) (amended by [ADR-0012](../../adr/0012-accessible-select-and-date-picker.md)), [ADR-0009](../../adr/0009-terms-rich-text-rendering.md) (heading hierarchy), [ADR-0010](../../adr/0010-design-tokens-and-visual-language.md) (tokens and visual language), ADR-0011 (country visuals), ADR-0012 (select and date picker, lazy step 1), [ADR-0013](../../adr/0013-motion-and-reduced-motion.md) (motion and reduced motion). All Accepted. **v0.3:** ADR-0014 "Input profiles, typed-date mask and anchored calendar; page background" (amends ADR-0012 and ADR-0010) is needed, written by the architect in parallel (§10); [Accepted](../../adr/0014-input-profiles-typed-date-and-anchored-calendar.md) by the human, 2026-11-22 (commit `6b52ac2`). |

Sources cited in this spec:

- **Story**: [story.md](story.md).
- **US-01** [spec](../US-01/spec.md) v0.5 (Approved): field types, reserved keys, BR-01 (unreadable input is invalid), BR-02 (select prompt), BR-04 (`minAge`), AC-09 note (badInput semantics), AC-10 (error timing, focus), AC-24/25/26, Q-22 (native date input), §8.1 copy, §9 ("Native controls are used"); seed in [seed-fields.md](../US-01/seed-fields.md).
- **US-02** [spec](../US-02/spec.md) and **US-03** [spec](../US-03/spec.md) (Approved): plan cards as native radios, "Recomendado", summary sections, terms region, simulation radio group, focus order (US-02-AC-16, US-03-AC-16), §8.1 copy.
- **Existing tests**: `frontend/e2e/*.spec.ts` (7 files) and `frontend/e2e/support/*.ts`; component tests and helpers in `frontend/src/**` (`testing/dom.ts`, `quote-form-page.spec.ts`, `static-guards.spec.ts`).
- **ADRs** (Accepted at HC2, 2026-11-21): ADR-0010 (tokens, palette, type, icons, flags), ADR-0011
  (country visuals; amends ADR-0001), ADR-0012 (`@angular/aria` + `@angular/cdk`, Signal Forms
  binding, lazy step 1; amends ADR-0004), ADR-0013 (motion). v0.2 applies their *Spec impact*
  sections.
- **Evidence**: [docs/qa/US-04/README.md](../../docs/qa/US-04/README.md) (`before/` set; native popups not capturable).
- **Visual direction** given by the human with the brief (reference screenshot, inspiration only): dark near-black background with a subtle dotted texture; violet/indigo accent; recommended card with a violet vertical gradient and soft glow; rounded cards with thin borders; pill-shaped segmented toggles; check-circle icons in feature lists; large bold display headings with a soft text gradient; high-contrast white primary buttons.

## 1. Summary

A visual redesign of the whole quoting wizard (country chooser, step 1 form, plan list, summary,
payment and confirmation) on a tokenized design system, for people in Colombia and Chile on
phone, tablet and desktop. It adds country flags and a per-country accent, icons, an accessible
custom select and date picker (replacing the browser's native ones), a step indicator, step
transitions, skeletons and micro-animations that all honour `prefers-reduced-motion`, a
mobile-first responsive layout with 44 × 44 px targets, and self-hosted typography. Behaviour,
validation, stored values, routes and the Strapi contracts do not change; the existing tests keep
passing with the same strength, adapted only where a native element is replaced (§11.1).

**v0.3 (HC3 round 1, directed by the human):** the calendar opens compact and directly below the
date field on wide screens; the date box formats as typed (dd/mm/aaaa) and shows a clear message for
a date that is not valid; every text and number field filters the characters it accepts and has a
maximum length (with three Strapi seed content changes); the page background is lighter with a
gradient on every page; every wizard step has a back link and the header country chip links to the
country chooser; the chooser gets the app header, a lead text and a "Cómo funciona" list. These
change some behaviour on purpose; BR-07 lists the exceptions.

**v0.4 (HC3 round 2, directed by the human):** the app header becomes a translucent violet layer
that continues the page gradient, with a gradient bottom edge and an original decorative brand mark
before the product name (BR-22); the app gets its own favicon, a PNG fallback, an Apple touch icon
and a `theme-color`, replacing the Angular default favicon (BR-23). Visual only: no behaviour,
route, stored value, copy or Strapi content changes.

## 2. Scope

**In scope**

- A token file (primitive → semantic → component) and the restyling of every existing page and
  shared component through tokens only.
- Theme, palette, gradients, dotted background texture, type scale, two font families
  self-hosted (US-04-Q-01, Q-03, Q-08; ADR-0010).
- Flags of CO and CL as SVG on the country chooser and in a new wizard header; per-country accent
  token (US-04-Q-02, Q-10; ADR-0011).
- One icon library (`@lucide/angular` 1.77.0, ADR-0010); icons inside step 1 inputs (by field key,
  with a default), in the step indicator, plan cards (check-circle in coverage and benefit lists),
  help, error and success messages (US-04-Q-09).
- Custom select (with search for long lists) and custom date picker (typed entry, calendar with
  month and year navigation, `minAge`-disabled days), built on `@angular/aria` and `@angular/cdk`
  22.3.0, bound to the existing Signal Forms model (ADR-0004 as amended by ADR-0012), with bottom
  sheet on mobile (US-04-Q-04, Q-05, Q-11, Q-12, Q-13).
- Lazy loading of the step 1 page (`loadComponent` on `/:country/datos`, ADR-0012 §7) so the new
  packages and step 1 icons stay out of the initial bundle; the route address and guards are
  unchanged.
- New interface microcopy owned by the front end (§8.1).
- Step indicator, step enter transition, hover/focus/active/disabled states, soft validation
  feedback, skeletons, interactive plan cards, summary and confirmation micro-animations
  (US-04-Q-14..Q-17).
- `prefers-reduced-motion`, responsive layout at 360 × 740, 768 × 1024 and 1280 × 800.
- Adapting existing tests where a native element is replaced, as listed in §11.1, and new tests.
- After screenshots in `docs/qa/US-04/after/` (US-04-Q-19).
- **v0.3 (HC3 round 1):** compact calendar anchored below the date field on wide screens (BR-17);
  typed-date mask and the code-owned invalid-date message (BR-18); input profiles by field key
  (allowed characters, `maxlength`, keyboard hints) and three Strapi **seed content** changes, no
  schema change (BR-19, §7.1); lighter gradient page background on every page and a richer country
  chooser with the app header (BR-20); back links on the wizard steps and the header country chip as
  a link to the chooser (BR-21); refreshed after screenshots (BR-15).
- **v0.4 (HC3 round 2):** header restyle on every page that shows the app header (chooser, three
  wizard steps, confirmation): translucent token-built surface with `backdrop-filter`, solid,
  reduced-transparency and forced-colors fallbacks, `--gradient-header-edge` bottom edge, decorative
  brand mark, product name in the display family, chip kept as specified in BR-21 (BR-22); own
  `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` and `<meta name="theme-color">` in
  `frontend/public/` and `frontend/src/index.html`, Angular default `favicon.ico` removed (BR-23);
  after screenshots refreshed again (BR-15).

**Out of scope**

- ~~Any change to route addresses (step 1 only becomes lazy-loaded, above), guards, the wizard state, validation rules or messages, prices, masking,
  payment simulation, or the Strapi schema, seed, permissions and proxy (story: "Logic, the
  contracts with Strapi and the texts that come from Strapi do not change").~~ **v0.3:** any change
  to route addresses (step 1 only becomes lazy-loaded, above), guards, the wizard state shape,
  prices, masking, payment simulation, or the Strapi schema, permissions and proxy. Validation rules,
  messages and the seed change only as BR-18 and BR-19 say (human decision at HC3 round 1).
- Rewriting help texts, placeholders or error messages that come from Strapi (US-04-Q-07).
- A light theme or a theme switch (US-04-Q-01; ADR-0010: dark only).
- An in-wizard country switcher (US-01-Q-02 stands). **v0.3:** changing country goes through the
  country chooser (`/`), reached by the "Cambiar país" back link and the header chip link (BR-21);
  no switcher widget inside the wizard.
- Changing the native `number`, `text`, `checkbox` and `radio` controls into custom widgets; they
  are restyled only. **v0.3:** `number` fields render as `<input type="text" inputmode="numeric">`
  (BR-19); still a native text box, not a custom widget.
- Logos, names, slogans or texts of any real insurer or company; a brand name for the product.
- Adoption of the third-party design skills `ui-ux-pro-max`, `impeccable`, `frontend-design`: they
  are evaluated separately (task US-04-T-01; per `tasks.md` *Gate history*, the first two were
  rejected and `frontend-design` adopted with adjustments, CLAUDE.md §5); no requirement of this
  spec depends on any of them.

## 3. Glossary

Terms of the US-01..US-03 glossaries keep their meaning.

| Term | Meaning in this project |
|---|---|
| Token | A CSS custom property declared in the single token file (BR-01). |
| Primitive / semantic / component token | Raw values (`--primitive-violet-400`), roles (`--color-text-muted`, `--space-4`), and per-component bindings (`--component-button-primary-bg`). Prefixes per ADR-0010 §1. Components use semantic or component tokens only. |
| Loose value | A literal colour, length, font, shadow, gradient, duration, easing or z-index in a component style instead of a `var(--…)` (allowed literals in BR-01). |
| Country accent | The per-country accent colour token, set from the current country context (BR-03). |
| Custom select | The design-system replacement for a `select` field: a WAI-ARIA combobox with a listbox popup (BR-05). A **select-only** custom select (fewer than 4 options) has a `<button>` as its combobox element; a **searchable** one has an `<input>` (ADR-0012 §3). |
| Searchable select | A custom select whose option count reaches the search threshold; typing filters the options (US-04-Q-11). |
| Date field | The design-system replacement for a `date` field: a text box for typed entry plus an "Elegir fecha" button that opens the calendar (BR-06). |
| Calendar | The WAI-ARIA date picker dialog opened from the date field. |
| Shown value | What a control displays: the option label of a custom select, the dd/mm/aaaa text of a date field. An empty select-only custom select shows the prompt "Selecciona una opción" as its button text; an empty searchable one shows the prompt as its placeholder, and its input value (`inputValue()`) is `''`. |
| Stored value | The value in the editing model and in the `quote-wizard` entry (ADR-0003, ADR-0004): option `value`, ISO `YYYY-MM-DD`, or `''`. Unchanged by US-04. |
| Panel | The popup of a custom select or the calendar: an anchored popover on wide screens, a bottom sheet below `--breakpoint-sheet` (37.5em, 600 CSS px; US-04-Q-13, ADR-0010 §6). |
| Wizard header | New top bar on the wizard pages with the product name and the country chip (flag + country name). |
| Step indicator | New progress display of the three wizard steps (US-04-Q-17). |
| Input profile | (v0.3) The front-end presentation and behaviour entry for a field, chosen by field `key` (by type for an unmapped `number` field): allowed characters, letter case, fallback maximum length and keyboard hints (`inputmode`, `autocomplete`, `autocapitalize`). It filters what can be typed or pasted; it never replaces the Strapi validation rules (BR-19, §7.2). |
| Date mask | (v0.3) The typing behaviour of the date text box: digits only, `/` inserted after the day and the month (BR-18). |
| Back link | (v0.3) The "Volver…"/"Cambiar país" link above the `h1` of a wizard step (BR-21). |
| Country chip link | (v0.3) The header country chip (flag + country name) as a link to the country chooser (BR-21). |
| App header | (v0.4) The `SiteHeader` shown on the chooser, the three wizard steps and the confirmation (not on the unknown-country page): brand mark, product name and, with a resolved country, the chip link (BR-22). "Wizard header" is the same component with the chip. |
| Brand mark | (v0.4) Our own decorative logo mark: a rounded square with a violet gradient and a white shield-with-check glyph, inline SVG, `aria-hidden`; the same design is the favicon (BR-22, BR-23). |
| Header solid fallback | (v0.4) The opaque token colour of the header used without `backdrop-filter` support and under `prefers-reduced-transparency: reduce`; also the `theme-color` (BR-22, BR-23). |

## 4. Business rules

| ID | Original (story) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-04-BR-01 | "Tokens as CSS custom properties in a single source file (color, typography, spacing, radii, shadows, gradients, animation durations and easing curves, z-index). Primitive → semantic → component tokens. No loose values in components." | Exactly one file, `frontend/src/styles/tokens.css` (ADR-0010 §1), declares custom properties and `@font-face`, in three tiers with distinct prefixes (`--primitive-`; the semantic prefixes of ADR-0010 §1; `--component-`). Every other style file (`styles.css` and every component `.css`) uses only `var(--…)` for colour, font family, font size, font weight, line height, letter spacing, spacing (margin, padding, gap), radius, border width, shadow, gradient, duration, easing and z-index. Allowed literals: `0`, `auto`, `none`, `inherit`, `initial`, `unset`, `currentColor`, `transparent`, the `forced-colors` system colours (`Canvas`, `CanvasText`, `LinkText`, `Highlight`, `HighlightText`, `ButtonText`, `ButtonFace`, `GrayText`), percentages, `fr`, unitless `1`, keyword values, and breakpoints inside `@media`/`@container` conditions (custom properties cannot be used there), each a `min-width` equal to a `--breakpoint-*` value of the token file. The only other media features allowed in conditions are `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme` and `(hover: hover)` (ADR-0010 §2, ADR-0013 §2). Component styles reference semantic or component tokens, never primitives. Enforced by a static guard with a sensitivity self-test (ADR-0010 §2). **v0.4 (HC3 round 2, BR-22):** `prefers-reduced-transparency` joins the allowed media features, and an `@supports` condition that tests `backdrop-filter` may hold a literal value in its condition (as breakpoints do in `@media`); `backdrop-filter` values are tokens (`var(--…)`) like every other value. | US-04-AC-01, US-04-AC-30 |
| US-04-BR-02 | "Subtle gradients in backgrounds, headers and the primary button, making sure the text on top meets WCAG AA contrast." Rules: "AA contrast". Brief: dark near-black background, violet accent, recommended card gradient, gradient display headings, white primary buttons. | Theme: dark only (US-04-Q-01, ADR-0010 §3). Every text/background token pair used in the UI meets WCAG 2.2 AA: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold) and for UI component boundaries, focus indicators and meaningful icons against adjacent colours. Over a gradient, the ratio holds at **every** gradient stop; over the dotted texture, it holds against the background with the dot colour composited at its opacity (worst case). The 3:1 boundary minimum applies to controls and **interactive** cards (plan cards); non-interactive panels (summary sections) may use a decorative hairline below 3:1, which WCAG 1.4.11 does not require to reach 3:1 (ADR-0010 §4). Gradient text has a solid-colour fallback used under `forced-colors: active`. Palette and gradients per ADR-0010 §4; country accents per ADR-0011 (US-04-Q-03). | US-04-AC-02, US-04-AC-23 |
| US-04-BR-03 | "Flags of Colombia and Chile in SVG (a licensed library or our own optimized SVGs), visible in the country selector/context and in the wizard header. A per-country accent color through tokens. The flag is decorative next to the country name (`aria-hidden`), never the only indicator." | The country chooser links and the wizard header show the flag SVG of the country next to its Strapi `name`. The flag is `aria-hidden="true"`, has no text content and is not focusable; the link's accessible name stays the country name ("Colombia", "Chile"). The country accent token takes the current country's value on the wizard pages; a published country with no flag or accent in the front end shows a neutral globe icon and the brand accent (US-04-Q-02). Mechanism: the presentation-only map `frontend/src/app/shared/country-visuals.ts` keyed by ISO code, returning a flag component and an accent key, never a colour (ADR-0011, which amends ADR-0001). Quoted country codes appear in production `.ts`/`.html` only in that file, and `data-country-accent` selectors only in `tokens.css`; a static guard enforces it, replacing ADR-0001's review grep (ADR-0011 *Confirmation*). No behaviour, validation, routing, guard, price, copy or request reads the map. | US-04-AC-03 |
| US-04-BR-04 | "Icons: a single library with SVG icons imported individually … inside the inputs (document, name, date, city, plate, make, model, year), in the wizard steps, in the plans, in help, error and success messages. The input icon comes from a front-end mapping by field key, with a generic default icon for new fields … Decorative icons `aria-hidden`; icons that carry meaning have a label." | One icon library, icons imported one by one (no full-set import, no icon font, no runtime fetch): `@lucide/angular` 1.77.0, ISC (US-04-Q-09, ADR-0010 §7). Step 1: every `text`, `number`, `select` and `date` field shows the icon mapped from its `key` (§7.2), or the default icon for any other key; `checkbox` fields show none. Icons in steps, plan lists (check-circle), help, error and success messages. Every icon that sits next to text saying the same thing is decorative: `aria-hidden="true"`, not focusable, no `<title>` and no text content, so no accessible name or `textContent` of a control changes. An icon without adjacent text (an icon-only button) has an accessible name from §8.1. | US-04-AC-04, US-04-AC-20 |
| US-04-BR-05 | "Select: our own dropdown in the design system's style, with an icon, search when the list is long (e.g. cities, makes), and the selected option marked." "Built on accessible primitives, not from scratch … Full accessibility per the WAI-ARIA patterns (combobox/listbox …): arrows, Enter, Escape, Home/End … screen-reader announcements." | Every `select` field renders a custom select following the WAI-ARIA combobox pattern with a listbox popup (select-only below the search threshold, editable with list filtering at or above it, US-04-Q-11). The element that takes focus is the element the field's `<label for>` points at (a `<button>` for a select-only, an `<input type="text">` for a searchable select, ADR-0012 §3, so `label.control`, `getByLabel` and `labels[0]` keep working) and carries `role="combobox"`, `aria-expanded`, `aria-required`, `aria-invalid` and `aria-describedby` as the native control did, plus `aria-controls` referring to the listbox **while the list is rendered** (`@angular/aria` omits it while collapsed, at least before the first open; ADR-0012 *Consequences*; checked with a screen reader at HC3). Empty, the prompt "Selecciona una opción" is its shown value: the button's text for a select-only, the placeholder for a searchable select (whose input value is then `''`). The prompt is not an option (supersedes the "first entry is a non-selectable prompt" wording of US-01-BR-02, US-04-Q-04). The listbox contains exactly the configured options in `sortOrder`; the selected option is marked visually (check icon + style) and with `aria-selected="true"`. Choosing an option stores its `value` (unchanged). Keyboard per US-04-AC-06; built on `@angular/aria` 22.3.0 and `@angular/cdk` 22.3.0 (US-04-Q-04, ADR-0012). | US-04-AC-05, US-04-AC-06, US-04-AC-07, US-04-AC-12 |
| US-04-BR-06 | "Calendar (birth date): our own date picker with month navigation and fast year navigation (a year selector …), days disabled according to the rules (minAge), and the date can also be typed by hand." Same accessibility clause as BR-05: "date picker dialog … focus trapped and returned on close". | Every `date` field renders a text box (the labelled control) and an "Elegir fecha" button that opens the calendar (WAI-ARIA date picker dialog). Typed entry: format dd/mm/aaaa for every country, independent of the browser locale, parsed and stored as ISO `YYYY-MM-DD` (US-04-Q-05). Text that is not a complete, existing date is treated exactly like the former `validity.badInput` (US-01-BR-01, US-01-AC-09 note): stored `''`, text kept visible, field invalid whether required or optional, same message resolution. Calendar: month navigation, year selector, keyboard per US-04-AC-09, a CDK modal dialog (ADR-0012 §4) with focus trapped while open, a backdrop, the page behind hidden from assistive technology (`aria-hidden="true"`), and focus returned to "Elegir fecha" on close. The first day of the week (grid column order and the week bounds of Home/End) follows the country's locale (`localeTag`) from CLDR week data: Sunday for es-CO, Monday for es-CL. It is derived from the locale at runtime, with no country code or per-country table in the date picker (human decision at HC1, 2026-11-21). A day is disabled if and only if the shared validator of the field (the same pure function used for validation, no second implementation) rejects that date for a reason other than "required" (with the seed's `minAge` 18: every day after the 18th anniversary limit and every future day). Disabled days can still be typed; typing one shows the configured message (validation unchanged). **v0.3 (HC3):** the typed entry gets a mask and text that is not a complete, existing date shows the code-owned message "Fecha no válida. Usa el formato dd/mm/aaaa." instead of the former `badInput` message resolution (BR-18 supersedes the "same message resolution" clause above; stored `''` unchanged). On wide screens the calendar is a compact popover directly below the date text box (BR-17). | US-04-AC-08, US-04-AC-09, US-04-AC-10, US-04-AC-12, US-04-AC-24, US-04-AC-25 |
| US-04-BR-07 | "Validations and the stored value do not change." "Logic, the contracts with Strapi and the texts that come from Strapi do not change; it is a visual change. The existing e2e tests must keep passing without being loosened; if a selector changes, it is adjusted using accessible roles/labels, not CSS classes." | For the same user input, the editing model, the `quote-wizard` entry, the typed step 1 output, the error shown, the focus target on a failed "Continuar", the routes, the prices, the summary and the payment behave exactly as before US-04. No file under `backend/` changes. Every existing unit, component and e2e test passes; a test changes only as listed in §11.1, where each change keeps or raises the assertion's strength and finds elements by role, label or visible text (never by class or id). **v0.3 HC3 exception (human decision at HC3 round 1, 2026-11-22; CLAUDE.md §1):** "behaviour unchanged" does not apply to exactly these points, and to nothing else: (a) the date mask and the invalid-date message (BR-18); (b) characters outside a field's input profile are not entered, text fields get `maxlength`, `number` fields become `type="text"` text boxes (BR-19); (c) the Strapi seed content changes of §7.1 (fullName `pattern` rule and `errorMessage`, `maxLength` rules), so `backend/src/seed/form-fields.ts` is the only `backend/` file that changes (plus any backend test of it); (d) the back links and the country chip link, two new Tab stops at the top of each wizard step (BR-21); (e) the chooser header and copy (BR-20). For the same accepted input, the stored values, routes, prices, summary and payment stay as before (AC-11 first scenario unchanged). | US-04-AC-11 |
| US-04-BR-08 | "Supporting text: clear microcopy in help texts, placeholders, empty states and errors … Business content keeps coming from Strapi; only interface texts live in the front end." | Front-end copy added by US-04 is exactly §8.1 (Spanish, same for both countries). Existing code-owned strings (US-01..US-03 §8.1) and every Strapi text stay unchanged (US-04-Q-07). Day and month names come from `Intl` with the country's `localeTag`, not from literals. | US-04-AC-07, US-04-AC-09, US-04-AC-11, US-04-AC-13 |
| US-04-BR-09 | "Interactions and animation: an animated wizard step indicator, transition between steps, hover/focus/active/disabled states, validation with soft feedback, skeletons while Strapi loads, plan selection with interactive cards, and a summary with micro-animations." | Step indicator per US-04-Q-17 (not focusable, current step exposed with `aria-current="step"`). Step change: enter-only transition of the arriving page (no two pages in the DOM at once), focus on the arriving `h1` as today (US-04-Q-14). Every interactive control has distinct hover, focus-visible, active and disabled (including `aria-disabled`) styles. Soft feedback: an error appears with a short fade and its icon, no shaking, no colour-only signal. Skeletons replace the loading text visually on step 1, step 2, the terms region and the country list, while the existing loading text stays in its live region (US-04-Q-15). Plan cards: a pointer click anywhere on a card chooses its plan; the native radio stays the keyboard and accessibility control. Summary and confirmation micro-animations per US-04-Q-16. Mechanism: Angular native `animate.enter` and CSS on the duration and easing tokens, no animation library, no `animate.leave` on pages (ADR-0013). Movement uses `transform` and `opacity` only; state changes may transition paint-only properties (colours, border colour, shadow); the 2 px card lift on hover applies only under `(hover: hover)`. | US-04-AC-13, US-04-AC-14, US-04-AC-15, US-04-AC-16, US-04-AC-23 |
| US-04-BR-10 | "Everything honors `prefers-reduced-motion`: no movement if the user asks for it." | With `prefers-reduced-motion: reduce`, every CSS animation and transition and every Angular enter/leave animation has a computed duration of 0 s (or none), `document.getAnimations()` is empty, and no element changes position, size or rotation over time (skeleton shimmer, step transition, panel slide, indicator fill, spinner, micro-animations all off). States still change instantly. By construction (ADR-0013 §3): outside `tokens.css` every `animation*`/`transition*` declaration sits inside `@media (prefers-reduced-motion: no-preference)`; `tokens.css` sets every `--duration-*` and `--delay-*` to `0ms` under `reduce`; every CDK overlay and dialog is created with `disableAnimations: true`. A static guard checks the three. | US-04-AC-17 |
| US-04-BR-11 | "Responsive, mobile-first: … at least 360×740, 768×1024 and 1280×800, with no horizontal scroll, touch targets of at least 44×44 px, and a layout that reorganizes (for example, plans in a column on mobile and in a grid on desktop)." | At each of the three viewports, on every page and with a select panel or the calendar open: `document.documentElement.scrollWidth ≤ window.innerWidth`; every interactive element (link, button, combobox, text box, option, calendar day, and for a native checkbox or radio the box of the input together with its `<label>`) has a hit box of at least 44 × 44 CSS px. Styles are written mobile-first (base styles for the narrowest width, `min-width` queries upward). Plans: one column at 360 px, at least two columns at 1280 px. This raises the 24 × 24 px of US-01-AC-26, US-02-AC-18 and US-03-AC-18 to 44 × 44 (US-04-Q-18). On a phone, a searchable select's bottom sheet fits above the on-screen keyboard: the search input, the active option and at least one option row stay visible while the keyboard is up (manual HC3 phone check, AC-12 note; ADR-0012 *Spec impact* 5). | US-04-AC-12, US-04-AC-18 |
| US-04-BR-12 | "Typography: at most 2 families, loaded efficiently." | At most two `@font-face` families (Archivo and Atkinson Hyperlegible Next, ADR-0010 §5, US-04-Q-08). Each family is **one variable WOFF2 file** (latin subset), self-hosted on the app origin (`/fonts/…`), `font-display: swap`; "at most the weights the type scale uses" means each `@font-face` `font-weight` descriptor is limited to the range the scale uses (Archivo `700 800`, Atkinson Hyperlegible Next `400 700`), not one file per weight. `font-family` declarations name at most those two families plus a system fallback stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) of **local** fonts that are never downloaded; the fallback names are not counted as families. No request to a third-party origin at runtime for fonts, icons, flags or styles. | US-04-AC-19 |
| US-04-BR-13 | "Accessibility: visible focus everywhere, tab order intact, AA contrast, heading hierarchy per ADR-0009." | Every focusable element shows a focus indicator drawn on the focused element itself (outline or box-shadow, ≥ 3:1 against adjacent colours). The Tab order of every page is the one of US-01-AC-24, US-02-AC-16 and US-03-AC-16, plus only the "Elegir fecha" button after each date text box; ~~the wizard header and the step indicator add no Tab stop~~ **v0.3:** the step indicator adds no Tab stop; on each wizard step the country chip link (header) and then the back link (BR-21) are the first two Tab stops, before the content; the order after the `h1` is unchanged. Each page keeps exactly one `h1` (the step heading), the existing `h2`/`h3` levels and the ADR-0009 terms levels; visual size comes from tokens and never changes a heading level; header, indicator, panels and calendar add no heading element. | US-04-AC-06, US-04-AC-09, US-04-AC-20, US-04-AC-28 |
| US-04-BR-14 | "Exact versions of any new dependency, license reviewed." | Every new dependency is added with `npm install -E`, has an exact version in `frontend/package.json`, is listed in the relevant ADR with its version, license and justification, and its license is permissive (MIT, ISC, Apache-2.0, BSD, OFL-1.1 for fonts) unless the human accepts another. Accepted additions: `@lucide/angular` 1.77.0 (ISC), `@fontsource-variable/archivo` 5.3.0 (OFL-1.1), `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0 (OFL-1.1) (ADR-0010); `@angular/cdk` 22.3.0 (MIT), `@angular/aria` 22.3.0 (MIT) (ADR-0012). No animation library (ADR-0013). | US-04-AC-21 |
| US-04-BR-15 | "Evidence in `docs/qa/US-04/`: before/after screenshots of CO and CL at the three sizes, for every wizard step, including the select and the calendar open." | `docs/qa/US-04/after/` holds the same file set as `before/` (same names) plus the country chooser, the select panel open and the calendar open, for CO and CL at the three sizes (US-04-Q-19). | US-04-AC-22 |
| US-04-BR-16 | "Do not copy brands, logos, names or texts of any real insurer." | No logo, brand name, slogan, illustration or text of any real company appears in the code, assets or screenshots; the reference screenshots are not stored. The header shows only the existing generic product name "Cotizador de seguro de auto". **v0.4:** plus our own decorative brand mark (BR-22), which is also the favicon (BR-23): an original drawing with no text, no real company's logo, shape or colour scheme. | US-04-AC-23, US-04-AC-30, US-04-AC-31 |
| US-04-BR-17 | (HC3 round 1, human, 2026-11-22) "mira como se ve el calendario, deberia desplegarlo ahi abajo" (screenshot: on a wide screen the calendar opens above the field, covers the header, day cells ~80 px). | From `--breakpoint-sheet` (600 CSS px) up, the calendar dialog is a popover **directly below the date text box**: its top edge is 0–16 CSS px below the text box's bottom edge and its left edge within 8 CSS px of the text box's left edge (shifted left only as far as needed to stay inside the viewport). Before it opens, if the space between the text box's bottom and the viewport bottom is smaller than the popover's height, the page scrolls so that the date field sits just below the sticky wizard header, and the popover then opens below it. It opens **above** only as the last fallback, when the viewport height minus the header height is smaller than the text box height plus the popover height. The popover never overlaps the sticky wizard header and lies entirely inside the viewport. **Compact:** width ≤ 22rem (352 CSS px); day cells 44–48 CSS px wide and tall (the 44 × 44 minimum of BR-11, not larger); month/year header, "Elegir año", "Mes anterior", "Mes siguiente" and "Cerrar" sized to match (each ≥ 44 × 44); total height target ≤ 26rem (416 CSS px), limit 28rem (448 CSS px), with six week rows shown. Below `--breakpoint-sheet` the bottom sheet of AC-12 is unchanged. Modal dialog, keyboard, focus trap, focus return and ARIA are unchanged (AC-09). Mechanism per ADR-0014. | US-04-AC-24 |
| US-04-BR-18 | (HC3 round 1) "si escribo la fecha mira que no me deja" (screenshot: "29/20/2001" typed, message "Ingresa tu fecha de nacimiento."). | **Mask.** The date text box accepts digits as typed; any other typed character is dropped, except a separator (`/`, `-`, `.`): typed after a one-digit day or month it pads that group with a leading zero ~~and shows `/` ("5/" → "05/")~~ ("5/" → "05"); typed right after a complete two-digit day or month it ~~shows `/` once~~ closes that group ("15/" → "15"); anywhere else it is dropped. **v0.3 alignment with ADR-0014 §2 (review US-04-R4-F04, 2026-11-22):** a `/` is never shown at the end of the text; it appears only once the next group has a digit (keys "5/" show "05"; a further "5" shows "05/5"). A `/` is inserted automatically between the day and the month and between the month and the year as soon as the next digit is typed ("150" → "15/0"; `15051990` → "15/05/1990"). At most 8 digits (`maxlength` 10). Backspace removes the character before the caret; a separator left with no digit after it goes with the digit before it ("15/05/1990" + End + 4 × Backspace → "15/05"). `inputmode="numeric"`; placeholder "dd/mm/aaaa" and hint kept. **Paste:** text that the existing typed-date parser accepts (US-04-Q-05: `d/m/yyyy` with `/`, `-` or `.`, or `ddmmyyyy`) is shown as dd/mm/aaaa ("15.05.1990" → "15/05/1990", "5/5/1990" → "05/05/1990"); other pasted text goes through the mask digit by digit. **Stored value** unchanged: ISO `YYYY-MM-DD` for a complete, existing date, else `''` (ADR-0003, ADR-0004). A complete valid date typed by hand is accepted and stored exactly as the same date chosen in the calendar. **Message.** On a field whose text is not empty but is not a complete, existing date (incomplete, such as "15/05/199" or "15/05"; impossible, such as "29/20/2001", "31/02/1990", "29/02/2001"), the error is the code-owned "Fecha no válida. Usa el formato dd/mm/aaaa.", for required **and** optional date fields (US-04-Q-24), replacing the former `badInput` message resolution (US-01-AC-09 note) for dates. An empty required field keeps `requiredMessage` ?? `errorMessage` ("Ingresa tu fecha de nacimiento."); a real date that fails a rule keeps the rule's message ("Debes ser mayor de edad (18 años o más) para cotizar."). Error timing (after leaving the field or a submit attempt) and focus on a failed "Continuar" unchanged. **v0.3 clarification (review US-04-R3-F01, 2026-11-22; edits away from the end of the text):** a `/` already shown in the box is never treated as newly typed; only a separator typed **at the end** of the text pads a one-digit group as above. Any other edit (Backspace or Delete anywhere, a digit inserted or typed over a selection in the middle) re-derives the text from the digits in their order, at most 8, with `/` after the 2nd and the 4th digit; the caret is placed after the same number of digits that preceded it once the edit is applied (immediately after that digit, before a `/` that follows it; at the start when no digit precedes it). An insertion into a text that already holds 8 digits is ignored (text and caret unchanged). So Backspace or Delete removes exactly one digit (a separator goes with its digit), and an edit never silently yields a different complete date: "15/05/1990" with the caret after the month's "5" + Backspace → "15/01/990" is not a complete date (7 digits) and shows the invalid-date message once the field is left; typing "1" over a selected day "15" → "10/51/990" (incomplete) rather than a padded "01/05/1990". **v0.3 clarification (review US-04-R4-F05, 2026-11-22; IME composition in the date box; decision relayed by the main session):** as for the profiled fields (BR-19 v0.3 clarification), while an input method composition is active in the date text box (between `compositionstart` and `compositionend`, or an `input` event with `isComposing` true), the mask is not applied and the text and caret are not rewritten; the mask runs once on the committed text when the composition ends, with the same rules as for typing (digits kept, other characters dropped, `/` placement, caret by digit count). So a composition that commits "15" into an empty box leaves "15", and one that commits "1a5" leaves "15"; the text is never duplicated and the composition is not cancelled by a rewrite. Verified under US-04-AC-25. | US-04-AC-25, US-04-AC-08 |
| US-04-BR-19 | (HC3 round 1) "valida los inputs si son de type text, number, etcc, porque en nombre me deja escribir numero y con un maximo de caractes en cada input como lo recomiendes". | Each `text` and `number` field of step 1 takes an **input profile** from the front-end map of §7.2, by field `key`; an unmapped `number` field takes the "digits" profile; any other unmapped field has no character filter. Characters outside the profile are dropped as they are typed or pasted; the rest of the text is kept and the caret stays after the last kept character of the edit. Letter case is applied as typed where the profile says so (plate: upper case, shown and stored). The `maxlength` attribute of every `text` field is the value of its Strapi `maxLength` rule when present (so it works for new Strapi fields), else the profile's maximum, else none. `number` fields render as `<input type="text" inputmode="numeric">` (role textbox, no longer spinbutton) so the filter and `maxlength` work; the model keeps the string (ADR-0004). The filter applies to what the person types or pastes, not to values hydrated from the wizard state, which are shown as stored and validated as before (US-04-Q-26). Validation stays in the shared core with the Strapi rules as the source of truth; the filter adds no validation message. **Strapi seed content** (no schema change, contract v1 unchanged, §7.1): `fullName` (CO, CL) gains a `pattern` rule for letters, space, `'`, `.`, `-` (US-04-Q-27) and its `errorMessage` becomes "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)."; `documentNumber` gains `maxLength` 10 (CO) and 12 (CL, RUT); `plate` gains `maxLength` 6 (CO, CL). Mechanism per ADR-0014. **v0.3 clarification (review US-04-R3-F02, 2026-11-22; IME composition):** while an input method composition is active (between `compositionstart` and `compositionend`, or an `input` event with `isComposing` true), the filter and the letter case are not applied and the value and caret are not rewritten; the filter applies once to the committed text when the composition ends, with the same rules as for typing (characters outside the profile dropped, the rest kept, case applied, caret after the last kept character). So composing "abc" in the plate field leaves "ABC", never duplicated text, and a dead-key accent ("´" then "e" → "é") in `fullName` is not cancelled. | US-04-AC-26 |
| US-04-BR-20 | (HC3 round 1) "El fondo si puedes hacerlo un poco mas claro y con degradado quedaria bien." "[the country chooser] esta muy simple visualmente, puedes agregarle como un texto de más un header, y lo mismo del bg para todas." | **Background.** The page background is one semantic gradient token `--gradient-page` with `--color-bg` as the solid fallback, applied to `body` on every page (country chooser, wizard steps, confirmation, unknown country). Its lightest stop is lighter (higher relative luminance) than the v0.2 background `--primitive-ink-950`, and no stop is darker than it; a violet tint near the top fades into the dark base (the country accent may tint it lightly on wizard pages). Every text and UI pair of AC-02 holds at **every** stop of `--gradient-page`, the lightest included, in `contrast-pairs.json`; input and interactive card borders keep ≥ 3:1 against every stop (surface tokens adjusted if needed, through tokens only, BR-01). The dotted texture may stay if those ratios hold with it composited. **Chooser.** The country chooser shows the app header (product name "Cotizador de seguro de auto", no country chip, no step indicator, no focusable element); then the `h1` "Elige tu país" (unchanged), the lead paragraph, the country links, and an `h2` "Cómo funciona" with an ordered list of the three steps, each with the step indicator's icon for that step (`aria-hidden`), the step name and a one-line description (§8.1; order on the page per US-04-Q-25). Country links are larger cards with the flag, the country name and a chevron (both icons `aria-hidden`), the country accent on hover and focus; their accessible names stay exactly the country names (AC-03). All new text is code-owned (§8.1); no Strapi content changes for this. CLAUDE.md §5 ("no extra sections the spec does not ask for") is satisfied because this spec now asks for exactly these. | US-04-AC-27, US-04-AC-29, US-04-AC-02 |
| US-04-BR-21 | (HC3 round 1) "tambien agregarle flechas para regresar a un modulo anterior o si quiere cambiar quizas de colombia a chile." | **Back links.** Each wizard step shows, below the step indicator and above the `h1`, a link (`<a routerLink>`, not a button) with a left-arrow icon (Lucide `ArrowLeft`, `aria-hidden`), a 44 × 44 CSS px hit box and a visible focus indicator: step 1 "Cambiar país" → `/`; step 2 "Volver a tus datos" → `/<cc>/datos` (entered values kept, as with "Atrás" today); step 3 "Volver a planes" → `/<cc>/planes` (chosen plan kept). No back link on the payment confirmation, on the unknown-country page, on the chooser, or while the country list cannot be loaded. The existing "Atrás", "Editar mis datos" and "Cambiar plan" buttons stay. Arrival focus and title follow the existing rules of the target page. **Country chip link.** The header country chip becomes a link to `/` with the accessible name "Cambiar país (actual: {country name from Strapi})", for example "Cambiar país (actual: Colombia)"; the visible country name stays (a visible "Cambiar país" hint on wide screens is optional); the flag stays decorative. It is shown wherever the wizard header is shown for a resolved country (the three steps and the confirmation). **Change of country.** Choosing a different country on the chooser discards the other country's stored data (the existing US-01 `enterCountry` rule); choosing the same country keeps it; no confirmation dialog. **Header layout.** At every viewport the header content (product name and chip) lies inside `--size-content-max` and its padding; the chip is never clipped (its box lies inside the viewport). | US-04-AC-28, US-04-AC-13 |
| US-04-BR-22 | (HC3 round 2, human, 2026-11-22) "al header dale un estilo mas novedoso y con tonos acorde a las pantallas" (give the header a more novel style, with tones that match the screens). Decision D8 of the main session. | Applies to the app header wherever it is shown (chooser, steps 1–3, confirmation; the unknown-country page still has none, Q-17). **Surface:** the header background is no longer `--color-surface-raised`; it is the component token `--component-header-bg`, a semi-transparent colour built from tokens over the page gradient's violet (`color-mix(in srgb, var(--primitive-violet-950) N%, transparent)` in `tokens.css`, alpha < 1), with `backdrop-filter: var(--component-header-backdrop)` (a blur and a saturate, values in tokens). **Fallbacks:** where `backdrop-filter` is not supported, and under `@media (prefers-reduced-transparency: reduce)`, the background is the opaque token `--component-header-bg-solid` and `backdrop-filter` is `none`; under `forced-colors: active` the header uses system colours (`Canvas` background, `CanvasText` text) with a visible solid bottom border of at least 1 CSS px. **Bottom edge:** the grey hairline is replaced by a 1 CSS px line painted with the semantic token `--gradient-header-edge` (violet-400 → middle stop → transparent, left to right); on a page with a resolved country the middle stop is the country accent (`--color-country-accent`), elsewhere a brand violet; the accent is decorative here and is never the colour of any text in the header. **Brand mark:** before the product name, an inline SVG mark (rounded square, violet gradient, white shield-with-check glyph; our own drawing; Lucide geometry may inspire the glyph but no third-party logo), `aria-hidden="true"`, not focusable, no `<title>`, no text content, size `--size-brand-mark` (2rem); it adds nothing to the header's accessible content or `textContent`. **Product name:** "Cotizador de seguro de auto" (unchanged copy, not a heading, not a link) in the display family (Archivo), coloured with `--gradient-display-text` (text gradient, solid fallback under `forced-colors`, BR-02) or `--color-brand`; every colour of it meets ≥ 4.5:1 against the header solid fallback and against `--component-header-bg` composited over the lightest `--gradient-page` stop (and per US-04-Q-28), as rows of `contrast-pairs.json`. **Chip:** unchanged semantics and checks of BR-21 / AC-28 (link to `/`, name "Cambiar país (actual: {país})", flag `aria-hidden`, ≥ 44 × 44, visible focus ≥ 3:1 against the header backgrounds); restyled as a pill with a subtle ring or inner glow in the country accent; no visible "Cambiar" hint (US-04-Q-29). **Size and layout:** the rendered header height equals `--size-header-height` (± 1 CSS px) at 360, 768 and 1280 (the token is updated if the height changes, since the calendar scroll padding uses it); mark, product name and chip lie inside the viewport and the header box; the product name is never clipped or ellipsised and wraps to at most two lines (narrow screens). **Motion:** none on the surface, edge or mark; chip state transitions follow BR-09/BR-10. Tokens only (BR-01), within ADR-0010, ADR-0013 and ADR-0014. | US-04-AC-30, US-04-AC-01, US-04-AC-02, US-04-AC-23 |
| US-04-BR-23 | (HC3 round 2) "y crea un favicon" (and create a favicon). Decision D9 of the main session. | **Icons:** our own icon, the brand mark of BR-22 simplified to read at 16 × 16 (thick strokes, no thin detail), as three files in `frontend/public/`: `favicon.svg` (primary; square `viewBox`; shapes only, no `<text>`, no `<script>`, no external reference (**v0.4 alignment, review US-04-R6-F05:** apart from the SVG namespace declaration `xmlns="http://www.w3.org/2000/svg"`, required for a standalone SVG, no "http" and no "//", and no `href`/`xlink:href` other than a local `#id`); ≤ 4 kB), `favicon-32.png` (PNG 32 × 32, fallback; US-04-Q-30) and `apple-touch-icon.png` (PNG 180 × 180, no alpha channel). PNGs are rendered from the SVG with the Playwright Chromium already in the devDependencies and committed; no new dependency (BR-14). The Angular default `frontend/public/favicon.ico` is deleted (US-04-Q-30). **`frontend/src/index.html`** has exactly: `<link rel="icon" type="image/svg+xml" href="favicon.svg">`, `<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">`, `<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">` and `<meta name="theme-color" content="#RRGGBB">` whose value equals the resolved value of `--component-header-bg-solid` in `tokens.css`; and no link to `favicon.ico` or of type `image/x-icon`. **Served:** the web container (nginx) answers `GET` of each icon URL with `200` and the matching `Content-Type` (`image/svg+xml`, `image/png`); because unknown paths fall back to `index.html` with `200 text/html`, the content type is part of the check. Same origin only (BR-12). Fictitious brand only (BR-16). | US-04-AC-31, US-04-AC-23 |

## 5. Acceptance criteria

The story has no Gherkin scenarios, so every AC is derived. Conventions:

- "I completed step 1 in Colombia / Chile" uses the values of US-01-AC-04 / US-02 §5 conventions;
  the date is typed as "15/05/1990" (stored "1990-05-15").
- Today is pinned to **2026-11-21** unless a scenario says otherwise.
- "Narrow" is 360 × 740, "tablet" 768 × 1024, "desktop" 1280 × 800 CSS px.
- Copy in quotes that is not Strapi content is in §8.1.

### US-04-AC-01 — Tokens in one file, no loose values (derived from US-04-BR-01)

```gherkin
Scenario: Tokens in one file, no loose values
  Given the production style files of frontend/src
  Then exactly one file declares custom properties, in three tiers with distinct prefixes
  And no other style file contains a hex, rgb(), hsl(), oklch() or named colour, a px/rem/em length outside @media and @container conditions,
    a font-family name, a box-shadow or gradient literal, a ms/s duration, a cubic-bezier() or a numeric z-index
  And no component style file references a primitive token
  And every breakpoint used in a @media or @container condition is a min-width equal to one --breakpoint-* value of the token file
  And every other media feature in a condition is prefers-reduced-motion, forced-colors, prefers-color-scheme or (hover: hover)
  And the guard reports a fixture string with one violation of each kind (sensitivity self-test)
```

### US-04-AC-02 — AA contrast of the token pairs (derived from US-04-BR-02)

```gherkin
Scenario Outline: AA contrast of the token pairs
  Given the token file declares the pair <foreground> on <background> as used in the UI
  When the WCAG 2.2 contrast ratio is computed (at every stop of a gradient background, and against the dotted texture composited at its opacity)
  Then the ratio is at least <minimum>

  Examples:
    | foreground                         | background                               | minimum |
    | body text                          | page background                          | 4.5     |
    | muted text (help, captions)        | page background and card surface         | 4.5     |
    | error text                         | page background and card surface         | 4.5     |
    | primary button text                | primary button background (every stop)   | 4.5     |
    | text on the recommended card       | recommended card gradient (every stop)   | 4.5     |
    | display heading gradient text      | page background (every stop)             | 3       |
    | focus indicator                    | page background and card surface         | 3       |
    | input and interactive card border  | page background and card surface         | 3       |
    | country accent (each country)      | page background and header surface       | 3       |
```

The list of pairs is `frontend/src/styles/contrast-pairs.json` (format in ADR-0010 §4), resolved
from `tokens.css`, so the test reads it rather than guessing. Display headings meet 3:1 only if
they are large text (BR-02); with ADR-0010's values every stop also passes 4.5:1. "Interactive
card" means a plan card (a pointer target); the decorative hairline of non-interactive panels
(summary sections, `--color-border-subtle`) has no row, as WCAG 1.4.11 allows (BR-02).
**v0.3:** "page background" means every stop of `--gradient-page`, the lightest included (BR-20,
AC-27); the pair list is regenerated from the new tokens.

### US-04-AC-03 — Flags and country context (derived from US-04-BR-03 / Q-02, Q-10)

```gherkin
Scenario Outline: Flags and country context
  When I open <page>
  Then I see the flag of <country> next to the text "<country>"
  And the flag is hidden from assistive technology, is not focusable and has no text content
  And <accessible check>

  Examples:
    | page            | country  | accessible check |
    | "/"             | Colombia | the link's accessible name is exactly "Colombia" |
    | "/"             | Chile    | the link's accessible name is exactly "Chile" |
    | "/co/datos"     | Colombia | the wizard header shows "Colombia" as text and the page has one h1 |
    | "/cl/planes"    | Chile    | the wizard header shows "Chile" as text and the page has one h1 |

Scenario: A country without front-end visuals
  Given a published country "Perú" with code "PE" exists only in Strapi
  When the country chooser is shown
  Then "Perú" is shown with the neutral globe icon and the brand accent, and no error

Scenario: Country codes stay in the country-visuals map
  Given the production .ts and .html files under frontend/src
  Then a quoted 'CO', 'CL', "CO" or "CL" literal appears only in src/app/shared/country-visuals.ts
  And a data-country-accent selector appears only in src/styles/tokens.css
  And every flag component under src/app/shared/flags/ has no text node and its root svg has aria-hidden="true" and focusable="false"
```

The second scenario is a unit test of the country-visuals lookup and a component test with a
fixture country (no Strapi change). The third is a static guard (ADR-0011 *Confirmation*); it
replaces ADR-0001's review grep, which ADR-0011 amends.

### US-04-AC-04 — Field icons by key, with a default (derived from US-04-BR-04 / Q-09)

```gherkin
Scenario Outline: Field icons by key
  Given step 1 is shown in Colombia
  Then the field "<label>" (key <key>) shows the icon <icon>, hidden from assistive technology
  And the field's accessible name is still exactly "<label>"

  Examples:
    | label               | key            | icon                       |
    | Tipo de documento   | documentType   | LucideIdCard               |
    | Número de documento | documentNumber | LucideHash                 |
    | Nombre completo     | fullName       | LucideUser                 |
    | Fecha de nacimiento | birthDate      | LucideCalendar             |
    | Ciudad              | city           | LucideMapPin               |
    | Placa               | plate          | LucideRectangleHorizontal  |
    | Marca               | make           | LucideCar                  |
    | Línea               | model          | LucideCarFront             |
    | Modelo (año)        | vehicleYear    | LucideCalendarRange        |

Scenario: Default icon and checkbox
  Given Colombia also has the editor-added text field "Teléfono celular" (key "mobilePhone")
  Then "Teléfono celular" shows the default icon LucidePencilLine
  And the consent checkbox shows no input icon

Scenario: Icons add no accessible text
  When any page of the wizard is shown
  Then every icon element is aria-hidden or has an accessible name from §8.1
  And the accessible names of "Continuar", "Atrás", "Pagar", "Reintentar", "Editar mis datos", "Cambiar plan" and "Nueva cotización" are unchanged
```

The icons are `@lucide/angular` 1.77.0 components, mapped in `frontend/src/app/shared/field-icons.ts`
(ADR-0010 §7, §7.2 below); the test asserts the mapping table, not pixels.

### US-04-AC-05 — Custom select: choose and show (derived from US-04-BR-05)

```gherkin
Scenario: Custom select: choose and show
  Given step 1 is shown in Colombia
  Then "Tipo de documento" (select-only) is a combobox whose text is "Selecciona una opción", collapsed, required
  And "Ciudad" (searchable) is a combobox with the placeholder "Selecciona una opción" and an empty input value, collapsed, required
  And the wizard state holds "" for "documentType" and "city"
  When I activate "Ciudad"
  Then a listbox opens with exactly the options "Bogotá", "Medellín", "Cali", "Barranquilla", in this order, none selected
  And "Ciudad" has aria-expanded="true" and aria-controls referring to that listbox
  When I choose "Medellín"
  Then the listbox closes, "Ciudad" shows "Medellín" (its input value) and keeps the focus
  And the wizard state holds "MDE" for "city"
  When I open "Ciudad" again
  Then "Medellín" is marked as selected (aria-selected="true" and a check icon) and no other option is
```

"Shows" means the visible text of a select-only (`<button>`) and the input value of a searchable
select (`<input>`), ADR-0012 §3. `aria-controls` is asserted only while the list is open
(BR-05).

### US-04-AC-06 — Custom select keyboard (derived from US-04-BR-05, BR-13)

```gherkin
Scenario Outline: Custom select keyboard
  Given "Marca" in Colombia has the focus, <state>
  When I press <keys>
  Then <result>

  Examples:
    | state                                   | keys                         | result |
    | collapsed, empty                        | Enter                        | the listbox opens and "Chevrolet" is the active option (aria-activedescendant) |
    | collapsed, empty                        | Space                        | select-only: the listbox opens and the first option is active; searchable: a space is typed into the filter |
    | collapsed, empty                        | ArrowDown                    | the listbox opens and "Chevrolet" is the active option |
    | collapsed, showing "Mazda"              | Alt+ArrowDown                | the listbox opens and "Mazda" is the active option |
    | open, active "Chevrolet"                | ArrowDown, ArrowDown         | "Mazda" is the active option; nothing is stored yet |
    | open, active "Chevrolet"                | End                          | "Toyota" is the active option |
    | open, active "Toyota"                   | Home                         | "Chevrolet" is the active option |
    | open, active "Toyota"                   | ArrowDown                    | "Toyota" stays active (no wrap) |
    | open, active "Kia"                      | Enter                        | the listbox closes, "Marca" shows "Kia", stores "kia", focus stays on "Marca" |
    | open, active "Kia", showing "Mazda"     | Escape                       | the listbox closes, "Marca" still shows "Mazda", focus stays on "Marca" |
    | open, active "Kia"                      | Tab                          | "Kia" is chosen, the listbox closes and the focus moves to "Línea" |
    | collapsed, empty                        | typing "maz"                 | the listbox opens with "Mazda" active (accent- and case-insensitive match) |
```

And: the combobox exposes `aria-expanded` true/false as it opens and closes, and `aria-controls`
refers to the listbox while it is open; a pointer click
outside the open panel closes it without changing the value. "Marca" has 5 options, so with the
proposed threshold (US-04-Q-11) it is a searchable select and typing filters; the rows hold for
both kinds, and the component test also runs them on "Tipo de documento" (2 options, select-only,
where Space chooses the active option instead of typing).

### US-04-AC-07 — Select search for long lists (derived from US-04-BR-05, BR-08 / Q-11)

```gherkin
Scenario Outline: Select search for long lists
  Given step 1 is shown in Chile
  When I type "<text>" in "<field>"
  Then the listbox shows <options>
  And <announcement> is announced politely

  Examples:
    | field  | text    | options                      | announcement |
    | Ciudad | "valpa" | only "Valparaíso"            | "1 opción" |
    | Ciudad | "CONCE" | only "Concepción"            | "1 opción" |
    | Marca  | "u"     | "Suzuki", "Hyundai" in order | "2 opciones" |
    | Marca  | "xyz"   | no option and the text "No encontramos opciones para «xyz»." | "No encontramos opciones para «xyz»." |

Scenario: Short lists have no search
  Given step 1 is shown in Colombia
  Then "Tipo de documento" (2 options) is a select-only combobox: typing does not show a text cursor or filter, it only moves the active option (type-ahead)

Scenario: Leaving a search without choosing
  Given "Ciudad" in Chile shows "Santiago" and I typed "xyz"
  When I press Escape, or move the focus away
  Then "Ciudad" shows "Santiago" and the wizard state still holds "SCL"
```

### US-04-AC-08 — Typed date (derived from US-04-BR-06, BR-07 / Q-05)

```gherkin
Scenario Outline: Typed date
  Given step 1 is shown in Colombia and the browser locale is <locale>
  When I type "<typed>" in "Fecha de nacimiento" and leave the field
  Then the field shows "<shown>"
  And the wizard state holds "<stored>" for "birthDate"
  And <error>

  Examples:
    | locale | typed        | shown        | stored     | error |
    | es-CO  | 15/05/1990   | 15/05/1990   | 1990-05-15 | no error |
    | en-US  | 15/05/1990   | 15/05/1990   | 1990-05-15 | no error |
    | es-CL  | 5/5/1990     | 05/05/1990   | 1990-05-05 | no error |
    | es-CO  | 15-05-1990   | 15/05/1990   | 1990-05-15 | no error |
    | es-CO  | 15.05.1990   | 15/05/1990   | 1990-05-15 | no error |
    | es-CO  | 15051990     | 15/05/1990   | 1990-05-15 | no error |
    | es-CO  | 29/02/2000   | 29/02/2000   | 2000-02-29 | no error |
    | es-CO  | 29/02/2001   | 29/02/2001   |            | ~~"Ingresa tu fecha de nacimiento."~~ "Fecha no válida. Usa el formato dd/mm/aaaa." (v0.3) |
    | es-CO  | 31/04/1990   | 31/04/1990   |            | ~~"Ingresa tu fecha de nacimiento."~~ "Fecha no válida. Usa el formato dd/mm/aaaa." (v0.3) |
    | es-CO  | 15/05/199    | 15/05/199    |            | ~~"Ingresa tu fecha de nacimiento."~~ "Fecha no válida. Usa el formato dd/mm/aaaa." (v0.3) |
    | es-CO  | 15/05/90     | 15/05/90     |            | ~~"Ingresa tu fecha de nacimiento."~~ "Fecha no válida. Usa el formato dd/mm/aaaa." (v0.3) |
    | es-CO  | 01/03/2010   | 01/03/2010   | 2010-03-01 | "Debes ser mayor de edad (18 años o más) para cotizar." |

Scenario: A stored date is shown in the display format
  Given the wizard state holds "1990-05-15" for "birthDate" in Colombia
  When step 1 is shown
  Then "Fecha de nacimiento" shows "15/05/1990" with no error

Scenario: An unreadable optional date blocks "Continuar"
  Given Colombia also has the optional date field "Fecha de revisión" (key "inspectionDate", errorMessage "Ingresa una fecha válida.")
  And every other field holds a valid value
  When I type "10/13/2026" in "Fecha de revisión" and activate "Continuar"
  Then I see ~~"Ingresa una fecha válida."~~ "Fecha no válida. Usa el formato dd/mm/aaaa." (v0.3, US-04-Q-24) next to it, I stay on step 1, the focus is on "Fecha de revisión"
  And the wizard state holds "" for "inspectionDate"
```

~~An empty stored value with text in the box (rows with an empty `stored`) is the former
`badInput` case: required fields show `requiredMessage` if configured, else `errorMessage`;
optional fields show `errorMessage` or "Revisa este campo." (US-01-AC-09 note, unchanged).~~
**v0.3 (HC3, BR-18):** an empty stored value with text in the box (rows with an empty `stored`)
shows "Fecha no válida. Usa el formato dd/mm/aaaa." for required and optional date fields; an
empty box keeps `requiredMessage` ?? `errorMessage` for a required field. With the mask (BR-18,
AC-25) the separators of rows typed with `-` or `.` are shown as `/` as they are typed; the shown
and stored results of every row are unchanged. "Fecha de revisión" is a test fixture, as in the
existing component test.

### US-04-AC-09 — Calendar (derived from US-04-BR-06, BR-13 / Q-12)

```gherkin
Scenario: Choose a birth date with the calendar
  Given step 1 is shown in Chile, "Fecha de nacimiento" is empty and today is 2026-11-21
  When I activate "Elegir fecha"
  Then a modal dialog opens, named by its visible month and year "noviembre de 2008"
  And the focus is on 21 November 2008 (the latest selectable day)
  When I activate "Elegir año" and choose 1990
  Then the grid shows "noviembre de 1990"
  When I activate "Mes anterior" 6 times
  Then the grid shows "mayo de 1990"
  When I choose the day 15
  Then the dialog closes, the focus is on "Elegir fecha"
  And "Fecha de nacimiento" shows "15/05/1990" and the wizard state holds "1990-05-15"

Scenario Outline: Calendar keyboard
  Given the calendar is open in <country> on <date> with the focus on that day
  When I press <key>
  Then the focus is on <result>

  Examples:
    | country  | date        | key             | result |
    | Chile    | 15/05/1990  | ArrowRight      | 16/05/1990 |
    | Chile    | 15/05/1990  | ArrowLeft       | 14/05/1990 |
    | Chile    | 15/05/1990  | ArrowDown       | 22/05/1990 |
    | Chile    | 15/05/1990  | ArrowUp         | 08/05/1990 |
    | Chile    | 15/05/1990  | Home            | 14/05/1990 (Monday: first day of the es-CL week) |
    | Chile    | 15/05/1990  | End             | 20/05/1990 (Sunday: last day of the es-CL week) |
    | Colombia | 15/05/1990  | Home            | 13/05/1990 (Sunday: first day of the es-CO week) |
    | Colombia | 15/05/1990  | End             | 19/05/1990 (Saturday: last day of the es-CO week) |
    | Chile    | 15/05/1990  | PageDown        | 15/06/1990 |
    | Chile    | 31/05/1990  | PageUp          | 30/04/1990 (clamped to the month's last day) |
    | Chile    | 15/05/1990  | Shift+PageUp    | 15/05/1989 |
    | Chile    | 29/02/2000  | Shift+PageDown  | 28/02/2001 |
    | Chile    | 15/05/1990  | Enter           | the dialog closes, the field shows "15/05/1990", focus on "Elegir fecha" |
    | Chile    | 15/05/1990  | Escape          | the dialog closes, the field value is unchanged, focus on "Elegir fecha" |

Scenario: Focus stays in the calendar
  Given the calendar is open
  When I press Tab repeatedly, or Shift+Tab repeatedly
  Then the focus cycles through "Elegir año", "Mes anterior", "Mes siguiente", the grid and "Cerrar" only
  And a backdrop covers the page behind, so a pointer click there does not reach the page
  And the page content behind the dialog is hidden from assistive technology (aria-hidden="true" on the siblings of the overlay container)

Scenario Outline: Calendar names and first day of the week
  Given the calendar is open in <country> on May 1990
  Then the grid's column headers expose the full Spanish day names in the order <order>
  And each day cell's accessible name is the full date, for example "15 de mayo de 1990"
  And the selected day has aria-selected="true"

  Examples:
    | country  | order |
    | Colombia | "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado" |
    | Chile    | "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo" |
```

15/05/1990 is a Tuesday. The first day of the week comes from the country `localeTag` and CLDR
week data (BR-06; human decision at HC1), not from a country code: the unit test of the grid and
of `nextFocusDate` takes the locale tag as input, and Home/End move to the first and last day of
that locale's week. The CDK dialog does not set the HTML `inert` attribute (ADR-0012 §4); the
focus trap, the backdrop and `aria-hidden` are asserted instead, the focus trap and the backdrop
in e2e (jsdom has no real focus trapping), `aria-hidden` in the component test.
**v0.3:** on wide screens the dialog is a compact popover directly below the date text box
(BR-17, AC-24); everything in this AC is unchanged.

### US-04-AC-10 — Days disabled by the rules (derived from US-04-BR-06 / Q-12)

```gherkin
Scenario Outline: Days disabled by the rules
  Given today is <today> and "Fecha de nacimiento" has the rule minAge 18
  When the calendar shows <day>
  Then <day> is <state>

  Examples:
    | today      | day        | state |
    | 2026-11-21 | 2008-11-21 | enabled (turns 18 today) |
    | 2026-11-21 | 2008-11-22 | disabled (aria-disabled="true", cannot be chosen by click or Enter) |
    | 2026-11-21 | 2026-11-27 | disabled (future) |
    | 2026-02-28 | 2008-02-29 | disabled (anniversary on 1 March in non-leap years) |
    | 2026-03-01 | 2008-02-29 | enabled |

Scenario: Typing a disabled day keeps the validation
  Given today is 2026-11-21
  When I type "22/11/2008" in "Fecha de nacimiento" and leave the field
  Then I see "Debes ser mayor de edad (18 años o más) para cotizar." and the wizard state holds "2008-11-22"

Scenario: A date field without minAge
  Given the optional date field "Fecha de revisión" has no rules
  When its calendar is open
  Then no day is disabled and the year selector offers 1906 to 2036
```

### US-04-AC-11 — Behaviour and stored values unchanged (derived from US-04-BR-07, BR-08)

```gherkin
Scenario: The same input stores the same values
  Given today is 2026-11-21
  When I complete step 1 in Colombia with the custom controls (pointer for selects, calendar for the date)
  And I activate "Continuar"
  Then sessionStorage "quote-wizard" holds for step 1 exactly the values the pre-US-04 build stored for the same input:
    documentType "CC", documentNumber "1012345678", fullName "Ana Prueba Ficticia", birthDate "1990-05-15",
    city "MDE", plate "ABC123", make "mazda", model "3 Touring", vehicleYear "2022", dataConsent true
  And I am on "/co/planes" with "Plan Total" at "$2.310.000"

Scenario: Existing suites keep passing at the same strength
  When the gate runs lint, build, unit, component and e2e
  Then every pre-US-04 test passes
  And every changed test is listed in spec §11.1 with its replacement assertion

Scenario: Strapi content unchanged
  Then the branch has no change under backend/ compared with main at 66fc262
    ~~(no exception)~~ except backend/src/seed/form-fields.ts and tests of the seed (v0.3, BR-07 HC3 exception, BR-19)
  And no Strapi schema, permission or proxy file changes
```

The stored `vehicleYear` is the string of the editing model (ADR-0004, ADR-0003). The test-engineer
confirms the exact stored object on `main` before writing the expectation.
**v0.3 HC3 exception:** the first scenario still holds unchanged (every value in it is accepted by
the input profiles of BR-19). Behaviour changes are limited to the list in BR-07 (a)–(e); the
second scenario's "pre-US-04 test" set is changed only as §11.1 lists, including its HC3 round 1
subsection.

### US-04-AC-12 — Panels on narrow and wide screens (derived from US-04-BR-05, BR-06, BR-11 / Q-13)

```gherkin
Scenario Outline: Panels on narrow and wide screens
  Given the viewport is <viewport> and step 1 is shown in Colombia
  When I open "<control>"
  Then the panel is <placement>
  And every option or day in it has a hit box of at least 44 × 44 CSS px
  And the page has no horizontal scroll

  Examples:
    | viewport   | control             | placement |
    | 360 × 740  | Ciudad              | a bottom sheet: full viewport width, bottom edge at the viewport bottom, at most 85% of the viewport height, with "Cerrar" |
    | 360 × 740  | Elegir fecha        | a bottom sheet as above |
    | 768 × 1024 | Ciudad              | a popover anchored to "Ciudad", not wider than the viewport |
    | 1280 × 800 | Elegir fecha        | a popover anchored to the date field; v0.3: directly below the date text box, compact (AC-24) |
```

**v0.3:** the exact placement and size of the calendar popover from `--breakpoint-sheet` up are
AC-24; the narrow-screen bottom sheet rows are unchanged.

**HC3 phone check (manual, BR-11):** on a real phone (both countries), focus "Ciudad" and type
into it: the bottom sheet sits above the on-screen keyboard, and the search input, the active
option and at least one option row stay visible while the keyboard is up. The e2e viewport has
no on-screen keyboard, so this part is manual. If it fails, the ADR-0012 fallback (a sheet with
its own search box, a dialog) changes the ARIA pattern on narrow screens and needs a spec change
first (ADR-0012 *Spec impact* 5).

### US-04-AC-13 — Step indicator and wizard header (derived from US-04-BR-09, BR-08 / Q-17)

```gherkin
Scenario Outline: Step indicator and wizard header
  Given I am on <page> in Colombia
  Then the step indicator lists "Tus datos", "Plan", "Resumen y pago" in this order
  And <current> has aria-current="step" and the text "Paso <n> de 3" is available to assistive technology
  And steps before it are marked "completado"
  And ~~neither the indicator nor the header contains a focusable element or a heading~~
  And (v0.3) the indicator contains no focusable element, the header's only focusable element is the country chip link (AC-28), and neither contains a heading

  Examples:
    | page          | current          | n |
    | "/co/datos"   | "Tus datos"      | 1 |
    | "/co/planes"  | "Plan"           | 2 |
    | "/co/resumen" | "Resumen y pago" | 3 |

Scenario: Indicator on the confirmation
  When the payment is confirmed
  Then all three steps are marked "completado" and none has aria-current
```

### US-04-AC-14 — Step transition keeps focus and one page (derived from US-04-BR-09 / Q-14)

```gherkin
Scenario: Step transition keeps focus and one page
  Given motion is allowed and I completed step 1 in Colombia
  When I activate "Continuar"
  Then at no moment during the transition does the document contain more than one h1 or more than one main
  And the focus ends on the h1 "Elige tu plan" and the document title is "Elige tu plan | Cotizador de seguro de auto"
  And the transition lasts at most the "slow" duration token
```

The transition is enter-only (`animate.enter` on the arriving page, no `animate.leave`), so the
leaving page is removed at once (ADR-0013 §2). The "slow" token is `--duration-slow` (320 ms); the
page enter uses `--duration-base` (200 ms). A `MutationObserver` installed before "Continuar"
records the maximum `h1` and `main` counts (ADR-0013 §4).

### US-04-AC-15 — Skeletons while content loads (derived from US-04-BR-09 / Q-15)

```gherkin
Scenario Outline: Skeletons while content loads
  Given the content backend has not answered the <request> request yet
  When <place> is shown
  Then skeleton shapes are shown, hidden from assistive technology
  And the text "<loading text>" is still in the polite live region
  When the content arrives
  Then the skeleton is replaced by the content

  Examples:
    | request     | place                  | loading text |
    | form fields | step 1 in Colombia     | Cargando formulario… |
    | plans       | step 2 in Colombia     | Cargando planes… |
    | terms       | the summary terms      | Cargando términos y condiciones… |
    | countries   | the country chooser    | Cargando… |
```

### US-04-AC-16 — Interactive plan cards (derived from US-04-BR-09)

```gherkin
Scenario: Interactive plan cards
  Given step 2 is shown in Chile
  When I click the short description of "Plan Premium"
  Then the radio "Plan Premium" is checked and no other plan is
  And "Plan Protegido" keeps the "Recomendado" badge and the recommended style
  And each coverage and benefit item shows a check-circle icon hidden from assistive technology
  When I use the arrow keys in the plan group
  Then the choice follows the native radio behaviour of US-02-AC-16, unchanged
```

### US-04-AC-17 — Reduced motion (derived from US-04-BR-10)

```gherkin
Scenario: Reduced motion
  Given the browser reports prefers-reduced-motion: reduce
  When I go through step 1 (opening "Ciudad" and the calendar), step 2, the summary and the confirmation in Colombia
  Then at every page and with every panel open, every element's computed animation-duration and transition-duration are 0s
  And document.getAnimations() returns an empty list

Scenario: Reduced motion by construction
  Given the production style files and sources of frontend/src
  Then outside tokens.css every animation and transition declaration is inside a @media (prefers-reduced-motion: no-preference) block
  And tokens.css sets every --duration-* and --delay-* token to 0ms under prefers-reduced-motion: reduce
  And every CDK overlay and dialog is created with disableAnimations: true
```

The second scenario is the static guard of ADR-0013 §4. `disableAnimations` matters because the
CDK backdrop otherwise keeps a 1 ms transition under reduced motion (ADR-0013 §3).

### US-04-AC-18 — Responsive at the three sizes (derived from US-04-BR-11 / Q-18)

```gherkin
Scenario Outline: Responsive at the three sizes
  Given the viewport is <width> × <height>
  When I open, in <country>, the country chooser, step 1, step 1 with "Ciudad" open, step 1 with the calendar open,
    step 1 after a failed "Continuar", step 2, the summary and the confirmation
  Then no page has horizontal scroll
  And every interactive element has a hit box of at least 44 × 44 CSS px (checkbox and radio: input plus its label)
  And on step 2 the plans are <plan layout>

  Examples:
    | width | height | country  | plan layout |
    | 360   | 740    | Colombia | in one column (each card's left edge at the same x) |
    | 360   | 740    | Chile    | in one column |
    | 768   | 1024   | Colombia | in one or more columns, without overflow |
    | 768   | 1024   | Chile    | in one or more columns, without overflow |
    | 1280  | 800    | Colombia | in at least two columns (at least two cards share a top y) |
    | 1280  | 800    | Chile    | in at least two columns |
```

### US-04-AC-19 — Fonts and assets are local (derived from US-04-BR-12 / Q-08)

```gherkin
Scenario: Fonts and assets are local
  When I go through the whole flow in Colombia
  Then every request the browser sends goes to the app's own origin
  And every font request is a WOFF2 file under /fonts/, at most one file per family and at most two families
  And the production styles declare at most two @font-face families, each with one WOFF2 src on the app origin, font-display: swap and a font-weight range
  And any other family name in a font-family declaration is a local system fallback that is never requested
```

With variable fonts each family is one file covering a weight range (BR-12, ADR-0010 §5); the
static guard counts `@font-face` families, and the e2e counts font requests.

### US-04-AC-20 — Accessibility kept (derived from US-04-BR-13, BR-04)

```gherkin
Scenario Outline: Heading outline per page
  When <page> is shown in Chile
  Then the heading outline is exactly <outline>

  Examples:
    | page          | outline |
    | step 1        | h1 "Tus datos y los de tu vehículo" |
    | step 2        | h1 "Elige tu plan"; h2 per plan name; h3 "Coberturas" / "Beneficios" under each |
    | summary       | h1 "Resumen de tu cotización"; h2 "Tus datos", "Tu vehículo", "Plan elegido", "Términos y condiciones"; h3 terms title; terms body from h4 (ADR-0009) |
    | confirmation  | h1 "Pago confirmado" |

Scenario: Visible focus on the new controls
  When I focus "Ciudad", "Fecha de nacimiento", "Elegir fecha", a calendar day and a select option row with the keyboard
  Then each shows a focus indicator on the focused element (outline or box-shadow)
```

The keyboard order is proven by the existing tests of US-01-AC-24, US-02-AC-16 and US-03-AC-16,
which keep their assertions (§11.1). Screen reader pass at HC3.

### US-04-AC-21 — New dependencies pinned and licensed (derived from US-04-BR-14)

```gherkin
Scenario: New dependencies pinned and licensed
  Then every version in frontend/package.json is exact (no ^, ~ or range)
  And the dependency names are exactly the pre-US-04 list plus the additions accepted in the US-04 ADRs
  And each addition is listed in its ADR with exact version and license
```

The accepted additions are the five of BR-14: `@lucide/angular` 1.77.0,
`@fontsource-variable/archivo` 5.3.0, `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0,
`@angular/cdk` 22.3.0 and `@angular/aria` 22.3.0.

### US-04-AC-22 — Before and after evidence (derived from US-04-BR-15 / Q-19)

```gherkin
Scenario: Before and after evidence
  Then docs/qa/US-04/after/ contains, for CO and CL at 360x740, 768x1024 and 1280x800:
    00-paises, 01-datos, 01b-datos-select-open, 01c-datos-calendar-open, 01d-datos-errors,
    02-planes, 03-resumen, 04-confirmacion
  And docs/qa/US-04/before/ contains 00-paises for the same sizes, captured from main before any US-04 change
  And no screenshot has horizontal scroll or real personal data
```

`01b`/`01c` "after" names replace "focused" with "open" (the native popups could not be captured
before; README limitation). **v0.3:** after HC3 round 1 is implemented, the whole `after/` set is
captured again with the same names (task US-04-T-38); `before/` is not touched.

### US-04-AC-23 — Visual quality and originality (derived from US-04-BR-02, BR-09, BR-16)

```gherkin
Scenario: Visual quality and originality
  When the human reviews the after screenshots and the running app at HC3, in CO and CL, at the three sizes
  Then the visual language follows ADR-0010 (theme, palette, gradients, type scale, icons, flags) and ADR-0011 (country accents)
  And the recommended plan card, display headings, primary buttons and segmented toggles look as ADR-0010 describes
  And hover, active, disabled and soft-feedback states and the micro-animations behave as described in §8
  And no logo, name, slogan or text of a real company appears
```

### v0.3 acceptance criteria (HC3 round 1, directed by the human, 2026-11-22)

Same conventions as above. Today is pinned to **2026-11-22** in these scenarios unless they say
otherwise.

### US-04-AC-24 — Calendar below the date field, compact (derived from US-04-BR-17)

```gherkin
Scenario Outline: The calendar opens below the date field on wide screens
  Given the viewport is <viewport> and step 1 is shown in <country>
  And <scroll>
  When I activate "Elegir fecha"
  Then the calendar dialog's top edge is between 0 and 16 CSS px below the bottom edge of "Fecha de nacimiento"
  And its left edge is within 8 CSS px of the left edge of "Fecha de nacimiento"
  And the dialog lies entirely inside the viewport
  And its top edge is at or below the bottom edge of the wizard header (no overlap)

  Examples:
    | viewport   | country  | scroll |
    | 1280 × 800 | Colombia | the page is scrolled to the top |
    | 1280 × 800 | Chile    | the page is scrolled so that the bottom edge of "Fecha de nacimiento" is 60 CSS px above the viewport bottom |
    | 768 × 1024 | Colombia | the page is scrolled to the top |

Scenario: Compact calendar
  Given the viewport is 1280 × 800 and the calendar is open in Chile on May 1990
  Then the dialog is at most 352 CSS px wide and at most 448 CSS px tall
  And every day cell is at least 44 and at most 48 CSS px wide and tall
  And "Elegir año", "Mes anterior", "Mes siguiente" and "Cerrar" each have a hit box of at least 44 × 44 CSS px

Scenario: Closing returns the focus and the page position is usable
  Given the viewport is 1280 × 800 and the calendar opened below "Fecha de nacimiento" after the page scrolled
  When I press Escape
  Then the dialog closes, the focus is on "Elegir fecha" and "Fecha de nacimiento" is visible in the viewport
```

At 360 × 740 the bottom sheet of AC-12 is unchanged. The ≤ 26rem (416 px) height is the design
target, checked at HC3; the test asserts the 28rem (448 px) limit. "Opens above" (BR-17 last
fallback) is not reachable at the three viewports of BR-11 and is not tested.

### US-04-AC-25 — Typed date: mask and a clear message (derived from US-04-BR-18 / Q-23, Q-24)

```gherkin
Scenario Outline: The date box formats as I type
  Given step 1 is shown in Colombia and "Fecha de nacimiento" is empty
  When I type the keys "<keys>" one at a time in "Fecha de nacimiento"
  Then the field shows "<shown>"

  Examples:
    | keys        | shown      |
    | 15051990    | 15/05/1990 |
    | 15/05/1990  | 15/05/1990 |
    | 15-05-1990  | 15/05/1990 |
    | 150         | 15/0       |
    | 5/5/1990    | 05/05/1990 |
    | 15a05b1990  | 15/05/1990 |
    | 150519901   | 15/05/1990 |

Scenario: Backspace over a separator
  Given "Fecha de nacimiento" shows "15/05/1990" and has the focus
  When I press End and then Backspace 4 times
  Then the field shows "15/05"
  When I press Backspace once more
  Then the field shows "15/0"

Scenario Outline: Pasting a date
  Given step 1 is shown in Colombia and "Fecha de nacimiento" is empty
  When I paste "<pasted>" into "Fecha de nacimiento"
  Then the field shows "<shown>"

  Examples:
    | pasted     | shown      |
    | 15/05/1990 | 15/05/1990 |
    | 15-05-1990 | 15/05/1990 |
    | 15.05.1990 | 15/05/1990 |
    | 15051990   | 15/05/1990 |
    | 5/5/1990   | 05/05/1990 |

Scenario Outline: The message after leaving the date field
  Given step 1 is shown in Colombia
  When I type "<typed>" in "Fecha de nacimiento" and leave the field
  Then the field shows "<shown>"
  And the wizard state holds "<stored>" for "birthDate"
  And <error>

  Examples:
    | typed      | shown      | stored     | error |
    | 15051990   | 15/05/1990 | 1990-05-15 | no error |
    | 29202001   | 29/20/2001 |            | "Fecha no válida. Usa el formato dd/mm/aaaa." with aria-invalid="true" |
    | 31021990   | 31/02/1990 |            | "Fecha no válida. Usa el formato dd/mm/aaaa." |
    | 29022001   | 29/02/2001 |            | "Fecha no válida. Usa el formato dd/mm/aaaa." |
    | 1505199    | 15/05/199  |            | "Fecha no válida. Usa el formato dd/mm/aaaa." |
    | 1505       | 15/05      |            | "Fecha no válida. Usa el formato dd/mm/aaaa." |
    | (nothing)  |            |            | "Ingresa tu fecha de nacimiento." |
    | 01032010   | 01/03/2010 | 2010-03-01 | "Debes ser mayor de edad (18 años o más) para cotizar." |

Scenario: No message while typing
  Given step 1 is shown in Colombia
  When I type "150" in "Fecha de nacimiento" without leaving it
  Then no message is shown for "Fecha de nacimiento" and it is not aria-invalid

Scenario: A typed date completes step 1 end to end
  Given step 1 is shown in Colombia
  When I complete every field with the values of AC-11, typing "15/05/1990" in "Fecha de nacimiento" with the keyboard (no calendar)
  And I activate "Continuar"
  Then I am on "/co/planes" and sessionStorage "quote-wizard" holds birthDate "1990-05-15"

Scenario: An invalid date blocks "Continuar"
  Given every other field of Colombia holds a valid value and "Fecha de nacimiento" shows "29/20/2001"
  When I activate "Continuar"
  Then I stay on "/co/datos", the focus is on "Fecha de nacimiento"
  And it is described by "Fecha no válida. Usa el formato dd/mm/aaaa."
```

The text box has `inputmode="numeric"`, `maxlength="10"` and the placeholder "dd/mm/aaaa". The
optional-date case is AC-08's third scenario (v0.3 message).

### US-04-AC-26 — Input profiles and maximum lengths (derived from US-04-BR-19 / Q-26, Q-27)

```gherkin
Scenario Outline: Characters outside the field's profile are not entered
  Given step 1 is shown in <country>
  When I type "<typed>" in "<label>"
  Then the field shows "<shown>"
  And the wizard state holds "<shown>" for "<key>"

  Examples:
    | country  | label               | key            | typed                  | shown                  |
    | Colombia | Nombre completo     | fullName       | Ana 2                  | Ana␠                   |
    | Colombia | Nombre completo     | fullName       | José Núñez-O'Neil Jr.  | José Núñez-O'Neil Jr.  |
    | Colombia | Número de documento | documentNumber | 1.012.345.678          | 1012345678             |
    | Colombia | Número de documento | documentNumber | 123456789012           | 1234567890             |
    | Chile    | RUT                 | documentNumber | 12.345.678-k           | 12.345.678-K           |
    | Chile    | RUT                 | documentNumber | 12.345.678-5x9         | 12.345.678-5           |
    | Colombia | Placa               | plate          | abc-123x               | ABC123                 |
    | Chile    | Patente             | plate          | bcdf12                 | BCDF12                 |
    | Colombia | Línea               | model          | 3 Touring+             | 3 Touring              |
    | Colombia | Modelo (año)        | vehicleYear    | 20e2.5                 | 2025                   |
    | Colombia | Modelo (año)        | vehicleYear    | 20225                  | 2022                   |
    | Chile    | Año                 | vehicleYear    | abc                    | (empty)                |

Scenario: Pasting keeps only the allowed characters
  Given step 1 is shown in Colombia and "Nombre completo" is empty
  When I paste "Ana 2 Prueba" into "Nombre completo"
  Then the field shows "Ana  Prueba" with the caret at the end

Scenario Outline: Attributes of each field
  Given step 1 is shown in <country>
  Then "<label>" is a text box (role textbox, type="text") with maxlength <maxlength>, inputmode <inputmode>, autocomplete <autocomplete> and autocapitalize <autocapitalize>

  Examples:
    | country  | label               | maxlength | inputmode | autocomplete | autocapitalize |
    | Colombia | Nombre completo     | 80        | (absent)  | name         | words          |
    | Colombia | Número de documento | 10        | numeric   | (absent)     | (absent)       |
    | Chile    | RUT                 | 12        | text      | (absent)     | (absent)       |
    | Colombia | Placa               | 6         | (absent)  | off          | characters     |
    | Colombia | Línea               | 40        | (absent)  | (absent)     | (absent)       |
    | Colombia | Modelo (año)        | 4         | numeric   | (absent)     | (absent)       |
    | Chile    | Año                 | 4         | numeric   | (absent)     | (absent)       |

Scenario: Fields the front end does not know
  Given Colombia also has the editor-added text field "Teléfono celular" (key "mobilePhone", rule maxLength 15) and the optional number field "Kilometraje" (key "mileage", no rules)
  Then "Teléfono celular" has maxlength 15 and typing "300 123-4567" shows "300 123-4567"
  And "Kilometraje" is a text box with inputmode numeric and no maxlength, and typing "12e3.4" shows "1234"

Scenario: The seed rules still validate what the filter cannot see
  Given the wizard state of Colombia holds fullName "Ana 2" (stored before this change)
  When step 1 is shown
  Then "Nombre completo" shows "Ana 2"
  When I activate "Continuar"
  Then "Nombre completo" is described by "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." and I stay on step 1

Scenario Outline: Strapi seed content (CO and CL)
  Given the Strapi seed of <country>
  Then the field "<key>" has <rules> and errorMessage "<message>"

  Examples:
    | country | key            | rules                                                        | message |
    | CO      | fullName       | minLength 3, maxLength 80, pattern (letters, space, ' . -)   | Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres). |
    | CL      | fullName       | minLength 3, maxLength 80, pattern (letters, space, ' . -)   | Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres). |
    | CO      | documentNumber | pattern ^[0-9]{6,10}$, maxLength 10                          | Ingresa un número de documento válido (solo números, de 6 a 10 dígitos). |
    | CL      | documentNumber | pattern (RUT), rutCheckDigit, maxLength 12                   | Ingresa un RUT válido (por ejemplo, 12.345.678-5). |
    | CO      | plate          | pattern ^[A-Za-z]{3}[0-9]{3}$, maxLength 6                   | Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123). |
    | CL      | plate          | pattern (two formats), maxLength 6                           | Ingresa una patente válida (por ejemplo, BCDF12 o AB1234). |

Scenario Outline: The fullName pattern
  Given the seed field "fullName" of Colombia
  When the shared validator checks "<value>"
  Then the result is <result>

  Examples:
    | value                | result |
    | Ana Prueba Ficticia  | valid |
    | José Núñez-O'Neil Jr.| valid |
    | Ana 2                | "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." |
    | Al                   | "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." |
    | 'Ana                 | "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." |
```

"␠" stands for one trailing space ("Ana "). The `mobilePhone` and `mileage` fields are test
fixtures (no seed change). The seed `pattern` is evaluated by the existing validator without the
`u` flag, so the letter class is written explicitly (US-04-Q-27). The first value of each
"Strapi seed" row's rule list: existing rules keep their order and the new rules are appended after them.

### US-04-AC-27 — Lighter gradient background on every page (derived from US-04-BR-20)

```gherkin
Scenario Outline: The same background on every page
  When I open <page>
  Then the body's computed background-image is the gradient of --gradient-page
  And the body's computed background-color is the value of --color-bg

  Examples:
    | page |
    | "/" (country chooser) |
    | "/co/datos" |
    | "/cl/planes" |
    | "/co/resumen" |
    | the payment confirmation in Chile |
    | "/ar/datos" (unknown country) |

Scenario: Lighter, with contrast kept
  Given the production token file
  Then --gradient-page is a semantic token whose every colour stop is a token
  And its lightest stop has a higher relative luminance than --primitive-ink-950, and no stop has a lower one
  And contrast-pairs.json has, for every "page background" pair of AC-02, one row per stop of --gradient-page
  And every row passes its AC-02 minimum
```

The look (violet tint near the top, accent tint in the wizard, texture) is judged at HC3 (AC-23).

### US-04-AC-28 — Back links and change of country (derived from US-04-BR-21)

```gherkin
Scenario Outline: A back link on each step
  Given I am on <page> in Colombia with <state>
  Then below the step indicator and above the h1 there is a link with the accessible name exactly "<link>" and a left-arrow icon hidden from assistive technology
  When I activate "<link>"
  Then I am on "<target>"
  And <kept>

  Examples:
    | page          | state                             | link               | target      | kept |
    | "/co/datos"   | step 1 completed but not submitted | Cambiar país       | /           | the chooser is shown, and opening "Colombia" again shows the same step 1 values |
    | "/co/planes"  | step 1 completed                  | Volver a tus datos | /co/datos   | step 1 shows the entered values and the focus is on its h1 |
    | "/co/resumen" | "Plan Total" chosen               | Volver a planes    | /co/planes  | "Plan Total" is checked and the focus is on its h1 |

Scenario Outline: No back link where there is nothing to go back to
  When <place> is shown
  Then there is no link named "Cambiar país", "Volver a tus datos" or "Volver a planes" in the main content

  Examples:
    | place |
    | the payment confirmation in Colombia |
    | "/ar/datos" (unknown country) |
    | "/" (country chooser) |
    | "/co/datos" while the country list cannot be loaded |

Scenario Outline: The country chip links to the chooser
  When I am on <page>
  Then the header has exactly one link, with the accessible name exactly "Cambiar país (actual: <country>)" and the address "/"
  And it shows the text "<country>" and the flag, hidden from assistive technology

  Examples:
    | page                         | country  |
    | "/co/datos"                  | Colombia |
    | "/cl/planes"                 | Chile    |
    | the payment confirmation in Chile | Chile |

Scenario: Change from Colombia to Chile
  Given I completed step 1 in Colombia and I am on "/co/planes"
  When I activate "Cambiar país (actual: Colombia)" and then "Chile"
  Then I am on "/cl/datos", every field is empty
  And sessionStorage "quote-wizard" holds no Colombian value (US-01 enterCountry rule)

Scenario: Back to the same country keeps the data
  Given I completed step 1 in Colombia and I am on "/co/planes"
  When I activate "Cambiar país (actual: Colombia)" and then "Colombia"
  Then I am on "/co/datos" and step 1 shows the entered values

Scenario Outline: Tab order and targets at the top of a step
  Given the viewport is 1280 × 800 and <page> is shown in Colombia
  When I press Tab from the top of the document
  Then the first stop is the country chip link and the second is "<link>", each with a visible focus indicator
  And each has a hit box of at least 44 × 44 CSS px
  And the Tab order from the h1 onwards is the one of <existing AC>, unchanged

  Examples:
    | page          | link               | existing AC  |
    | "/co/datos"   | Cambiar país       | US-01-AC-24  |
    | "/co/planes"  | Volver a tus datos | US-02-AC-16  |
    | "/co/resumen" | Volver a planes    | US-03-AC-16  |

Scenario Outline: The header is not clipped
  Given the viewport is <viewport> and "/co/datos" is shown
  Then the country chip link's box lies inside the viewport and inside the header's content box

  Examples:
    | viewport   |
    | 360 × 740  |
    | 768 × 1024 |
    | 1280 × 800 |
```

Tests find the back link with an **exact** name: the chip's name also contains "Cambiar país".

### US-04-AC-29 — A richer country chooser (derived from US-04-BR-20 / Q-25)

```gherkin
Scenario: Chooser content and structure
  When I open "/"
  Then a header shows the text "Cotizador de seguro de auto" and contains no link, no button, no country chip and no step indicator
  And the heading outline is exactly: h1 "Elige tu país"; h2 "Cómo funciona"
  And right after the h1 the paragraph "Cotiza el seguro de tu auto en pocos minutos. Elige el país donde está matriculado tu vehículo para ver los planes y precios disponibles." is shown
  And then the links "Colombia" and "Chile", in the Strapi order, with accessible names exactly "Colombia" and "Chile", each showing its flag and a chevron, both hidden from assistive technology
  And then the h2 "Cómo funciona" and an ordered list of exactly three items, in this order:
    | step name      | description                           |
    | Tus datos      | Cuéntanos sobre ti y tu vehículo.     |
    | Plan           | Compara coberturas y precios.         |
    | Resumen y pago | Revisa, acepta los términos y paga.   |
  And each item shows the step indicator's icon for that step, hidden from assistive technology, then its step name and its description
  And pressing Tab from the top of the document reaches "Colombia" and then "Chile" and no other element of the page

Scenario: The country list cannot be loaded
  Given the country list request fails
  When I open "/"
  Then the header, the h1, the lead paragraph and "Cómo funciona" are shown
  And the load error and "Reintentar" behave as US-01-AC-17 (no country link)
```

The card hover and focus look with the country accent is judged at HC3 (AC-23); the 44 × 44
targets and no horizontal scroll are covered by AC-18 (chooser row).

### v0.4 acceptance criteria (HC3 round 2, directed by the human, 2026-11-22)

E2E checks run in Chromium (the project's Playwright browser). "Resolved value" of a token is the
computed value of the custom property in `tokens.css` at the element.

### US-04-AC-30 — A header that belongs to the page (derived from US-04-BR-22 / Q-28, Q-29)

```gherkin
Scenario Outline: Translucent surface with a gradient edge
  Given the viewport is 1280 × 800
  When <page> is shown
  Then the header's computed background-color is not the resolved value of --color-surface-raised
  And it equals the resolved value of --component-header-bg and its alpha is greater than 0 and less than 1
  And the header's computed backdrop-filter is not "none" and equals the resolved value of --component-header-backdrop
  And the header's bottom edge is 1 CSS px tall and painted with the resolved value of --gradient-header-edge
  And no other bottom border of the header is visible (no grey hairline)
  And the header stays at the top of the viewport after scrolling the page down by 400 CSS px

  Examples:
    | page |
    | "/" (country chooser) |
    | "/co/datos" |
    | "/cl/planes" |
    | "/co/resumen" |
    | the payment confirmation in Chile |

Scenario Outline: The edge carries the country accent only as decoration
  When <page> is shown
  Then the colour stops of the header's bottom edge include <accent>
  And no text element inside the header has the computed colour of the Colombia or Chile accent

  Examples:
    | page          | accent                                              |
    | "/co/datos"   | the resolved value of the Colombia accent           |
    | "/cl/planes"  | the resolved value of the Chile accent              |
    | "/"           | no country accent value (brand violets only)        |

Scenario Outline: Brand mark and product name
  When <page> is shown
  Then in the header's DOM order, the first element with a rendered box is an inline svg (the brand mark), and the product name follows it
  And the mark has aria-hidden="true", no tabindex, no <title>, no <desc> and an empty text content
  And its rendered box is the size of --size-brand-mark (32 × 32 CSS px at the default root size, ± 1 px)
  And the header contains no img element
  And the header's text content, with whitespace collapsed, starts with "Cotizador de seguro de auto"
  And the product name is not a heading and not a link
  And the first family of its computed font-family is "Archivo"

  Examples:
    | page        |
    | "/"         |
    | "/co/datos" |

Scenario: Product name and chip contrast
  Given the production token file and contrast-pairs.json
  Then contrast-pairs.json has one row per colour of the product name (each stop of --gradient-display-text, or --color-brand) against each header backdrop:
    | backdrop name in contrast-pairs.json | what it is                                                                                 |
    | --component-header-bg-solid          | the opaque token                                                                           |
    | header-bg-over-page-lightest         | pseudo-backdrop: --component-header-bg composited over the lightest stop of --gradient-page |
    | header-bg-over-white                 | pseudo-backdrop: --component-header-bg composited over --primitive-white (US-04-Q-28)       |
  And the same backdrops have rows for the chip's text colour (minimum 4.5:1) and for the focus indicator colour (minimum 3:1)
  And every product-name and chip-text row is at least 4.5:1
  And every row passes its minimum

Scenario: The chip keeps its link semantics
  When "/co/datos" is shown at 1280 × 800
  Then the header has exactly one link, named exactly "Cambiar país (actual: Colombia)", with the address "/"
  And the link's visible text is "Colombia" and contains no "Cambiar" hint (US-04-Q-29)
  And its hit box is at least 44 × 44 CSS px
  And when it has keyboard focus, its focus indicator is visible on the link itself

Scenario Outline: Height and no clipping
  Given the viewport is <viewport>
  When <page> is shown
  Then the header's rendered height equals the resolved value of --size-header-height, ± 1 CSS px
  And the brand mark, the product name and (where shown) the chip link each lie inside the viewport and inside the header's box
  And the product name's scrollWidth is not greater than its clientWidth, it has no text-overflow ellipsis, and it spans at most two lines
  And document.documentElement.scrollWidth is not greater than window.innerWidth

  Examples:
    | viewport   | page        |
    | 360 × 740  | "/"         |
    | 360 × 740  | "/co/datos" |
    | 768 × 1024 | "/"         |
    | 768 × 1024 | "/cl/planes" |
    | 1280 × 800 | "/"         |
    | 1280 × 800 | "/co/datos" |

Scenario: Reduced transparency
  Given the browser emulates prefers-reduced-transparency: reduce (Chromium DevTools protocol)
  When "/co/datos" is shown
  Then the header's computed background-color equals the resolved value of --component-header-bg-solid and its alpha is 1
  And the header's computed backdrop-filter is "none"

Scenario: No backdrop-filter support
  Given the production header stylesheet
  Then the translucent --component-header-bg and the backdrop-filter apply only when an @supports condition on backdrop-filter holds
  And otherwise the header background is --component-header-bg-solid

Scenario: Forced colors
  Given the browser emulates forced-colors: active
  When "/co/datos" is shown
  Then the header's computed background-color equals the computed value of the system colour Canvas
  And its bottom border is visible: style solid, width at least 1 CSS px, colour equal to the computed value of CanvasText
  And the product name's computed color equals the computed value of CanvasText and it has no background-clip text gradient

Scenario: No motion in the header
  Given prefers-reduced-motion is no-preference
  When "/co/datos" has finished loading
  Then document.getAnimations() has no animation whose target is the header element, its bottom edge or the brand mark

Scenario: Tokens
  Given the production token file and the header stylesheet
  Then tokens.css declares --component-header-bg (alpha below 1), --component-header-bg-solid (opaque), --component-header-backdrop, --gradient-header-edge and --size-brand-mark
  And the header stylesheet passes the AC-01 guard (no loose values; prefers-reduced-transparency and the @supports backdrop-filter condition allowed, BR-01 v0.4)
  And the header stylesheet does not use --color-surface-raised as its background
```

Clipping, height and the edge are also checked at 360 × 740 for "/co/resumen" by the existing
AC-28 "header is not clipped" rows. The look (how "novel" it is, how it matches the screens, the
mark at 2rem) is judged at the HC3 QA of round 2 (AC-23). The contrast of content scrolling **under**
the blurred header is covered by the worst-case row of Q-28, not measured on blurred pixels.
**v0.4 alignment (review US-04-R6-F01, F06):** `header-bg-over-page-lightest` and
`header-bg-over-white` are not tokens; they are computed pseudo-backdrops of the contrast
evaluator, which composites `--component-header-bg` (its alpha included, blur ignored) over the
named base colour. The worst case is pure white (`--primitive-white`: the top stop of
`--gradient-button-primary` and the Chile flag's white), which replaces the earlier
`--primitive-ink-50` row.

### US-04-AC-31 — Favicon, Apple touch icon and theme colour (derived from US-04-BR-23 / Q-30)

```gherkin
Scenario: The page declares our icons
  Given the production index.html
  Then it has exactly one <link rel="icon" type="image/svg+xml" href="favicon.svg">
  And exactly one <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
  And exactly one <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  And exactly one <meta name="theme-color"> whose content, compared case-insensitively, equals the resolved value of --component-header-bg-solid in tokens.css
  And no <link> has href "favicon.ico" or type "image/x-icon"

Scenario: The icon files
  Given the folder frontend/public
  Then favicon.svg has a square viewBox, contains no <text> and no <script>, and is at most 4 kB
  And favicon.svg contains no external reference: apart from the SVG namespace declaration xmlns="http://www.w3.org/2000/svg" (required for a standalone SVG), it contains no "http" and no "//", and no href or xlink:href other than a local "#id"
  And favicon-32.png is a PNG whose IHDR width and height are 32 and 32
  And apple-touch-icon.png is a PNG whose IHDR width and height are 180 and 180, with colour type 2 (no alpha channel)
  And favicon.ico does not exist (the Angular default is gone)

Scenario Outline: The web container serves each icon
  Given the stack is up (docker compose)
  When I request GET <path> from the web container
  Then the response status is 200
  And its Content-Type starts with "<type>"
  And the body is the committed file (same byte length)

  Examples:
    | path                  | type          |
    | /favicon.svg          | image/svg+xml |
    | /favicon-32.png       | image/png     |
    | /apple-touch-icon.png | image/png     |

Scenario: Same origin
  When "/" is shown
  Then the icon links resolve to the app's own origin
  And no request for an icon goes to another origin (AC-19)
```

Whether the icon reads at 16 × 16 in a browser tab, matches the header mark, and is original
(BR-16) is judged at the HC3 QA of round 2 (AC-23).

## 6. Gaps and open questions

Gaps marked **[Blocks HC1]** change an approved rule of US-01..US-03, an accepted ADR, or the
scope, so they need an explicit answer. For the others the proposed default applies if the human
does not answer. **[ADR]** marks gaps the architect resolves in an ADR (§10) in parallel to HC1.

| ID | Gap | Why it matters | Proposed default | Human answer |
|---|---|---|---|---|
| US-04-Q-01 | **[Blocks HC1] [ADR]** Theme: dark only (as the reference), light only, or both (`prefers-color-scheme` and/or a switch)? | Doubles the palette and the contrast checks if both; determines AC-02 pairs and every screenshot. | **Dark only**, `color-scheme: dark`, as the reference; light theme out of scope. Tokens are structured (semantic tier) so a light theme can be added later by redefining semantic tokens only. Alternative: both, following `prefers-color-scheme`, no switch (+ AC-02 rows per theme, double screenshots). **v0.2:** decided as proposed by ADR-0010 §3. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-02 | **[Blocks HC1] [ADR]** Per-country flag and accent vs ADR-0001 ("No country code, name or list exists in front-end code"; review grep for `'(CO\|CL)'`). Where do the flag and the accent come from? | The story requires them; ADR-0001 is binding (level 2) and the story also forbids changing the Strapi contract. One of the two must give. | A presentation-only **country-visuals map** in one front-end file, keyed by ISO code (`CO`, `CL` → flag SVG and accent token values), with a neutral fallback (globe icon, brand accent) for any other published country, so adding a country stays content-only (AC-03). The architect amends ADR-0001 (new ADR or a section of the design-system ADR marked as amending ADR-0001) and narrows its review grep to allow only that file. Alternative: add `accentColor` (hex, validated) and a flag asset to the Strapi `country` type (Strapi contract change, seed and boundary parser change, editors can break contrast). **v0.2:** decided as proposed by ADR-0011 (amends ADR-0001): `country-visuals.ts` returns a flag component and an accent key; the review grep becomes a static guard (AC-03 third scenario). | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-03 | **[ADR]** Palette and how the country accent combines with the violet brand accent. | AA contrast (BR-02); clarity of what is interactive. | Brand violet/indigo carries every interactive and selected state (primary focus ring, selected option, recommended card gradient, current step). The country accent is decorative and limited to the header country chip (flag ring and underline) and the progress line of the step indicator; it never carries meaning alone. ~~Example starting values for the ADR (to be verified there): background `#0B0B12`, surface `#15151F`, border `#2E2E42`, text `#F4F4F8`, muted `#A6A6BC`, violet `#8B5CF6`→`#6D28D9` gradient, primary button white `#FFFFFF` with text `#0B0B12`, error `#FF8A8A`, success `#5EE3A1`, CO accent `#FCD116`, CL accent a light red such as `#FF6B7A` (Chile blue fails 3:1 on near-black).~~ **v0.2:** the starting values are replaced by the palette, gradients and contrast table of ADR-0010 §4 and the country accents of ADR-0011: Colombia `#FFCD00` (the flag yellow), Chile `#F66E5E` (a lighter tint of the flag red's hue). The accent's placement is as proposed (header chip ring and underline, step indicator progress line). The ADRs are the source of every value; the spec does not repeat them. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-04 | **[Blocks HC1] [ADR]** Custom select and date picker: which accessible primitives (Angular CDK Overlay/Listbox/A11y vs `@angular/aria` at 22.3.0), and how they bind to Signal Forms and the shared validation core (ADR-0004) without changing validation or stored values. This also **supersedes** three approved US-01 decisions: Q-22 ("Native `<input type=\"date\">`"), §9 ("Native controls are used … `select`") and the BR-02 wording "the first entry is a non-selectable prompt" (the prompt becomes the empty shown value, not an option). | The story requires custom controls; ADR-0004 decided Signal Forms with native controls in mind (`syncNative`, `badInput`, `focusBoundControl`). The test changes of §11.1 depend on the element chosen. | Decided by an ADR (§10). Constraints the spec sets: the focusable element is labelable (`<input>` or `<button>`) and targeted by the field's `<label for>`; it is the control `focusBoundControl()` focuses; the model keeps strings (option value, ISO date, `''`); validation stays in `field-validators.ts`; for the date, unreadable text maps to `''` with the same message rules (BR-06), replacing the `syncNative` path for dates only. The human accepts the three US-01 supersessions with this spec. **v0.2:** decided by ADR-0012 (amends ADR-0004): `@angular/aria` 22.3.0 + `@angular/cdk` 22.3.0; `<button>` combobox for select-only, `<input>` for searchable; `FormValueControl<string>`; dates through `transformedValue`; overlays outside the component root in jsdom. The three supersessions are consistent with it (ADR-0012 *Spec impact* 6). | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-05 | **[Blocks HC1]** Date typed entry: format, accepted variants, how it maps to ISO, and what an incomplete or impossible date does. | Changes the US-01-AC-24 keyboard path (today: segments typed in the browser locale) and the R3-F01 tests; must keep the `badInput` semantics. | dd/mm/aaaa for every country, independent of browser locale; accepted: `d/m/yyyy` with `/`, `-` or `.` separators (1–2 digit day and month), or exactly 8 digits `ddmmyyyy`; 4-digit year only. Re-displayed as dd/mm/aaaa on leaving the field. Incomplete, impossible (31/04, 29/02 of a non-leap year) or 2-digit-year text → stored `''`, text kept, invalid with the existing message rules (no new validation message; a more specific "Ingresa una fecha válida (dd/mm/aaaa)." would be a validation-copy change and is not proposed). Placeholder and hint "dd/mm/aaaa" are code-owned (§8.1); the hint is part of the accessible description. ~~No input mask that inserts characters while typing.~~ **v0.3 (HC3 round 1, human decision):** a mask inserts `/` while typing, and text that is not a complete, existing date shows the code-owned "Fecha no válida. Usa el formato dd/mm/aaaa." instead of the existing message rules (BR-18, AC-25). Accepted variants and ISO mapping unchanged. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-06 | **[Blocks HC1]** "Existing e2e tests keep passing without being loosened": which assertions change, and is the rewrite of §11.1 acceptable? Some tests assert native elements by definition (component test "every field type renders its native control": `tagName: 'SELECT'`, `type: 'date'`; `HTMLSelectElement.options`; `toHaveValue('CC')` on a select; native date segments in `en-US`). | Without an explicit list, the test-engineer would guess, and a silent weakening (for example `allControls()` no longer seeing selects, so `invalidControls()` misses them) would go unnoticed. | Approve §11.1 as the complete list. Rule: each replaced assertion asserts both what the person sees (shown value, role, name, state) and what is stored (`quote-wizard` value), so it is at least as strong; no test is deleted without a replacement; helpers find custom controls by role (`combobox`, `option`, `dialog`, `grid`, `gridcell`), never by class or id. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-07 | **[Blocks HC1]** The story asks for "clear microcopy in help texts, placeholders, empty states and errors" but also says "the texts that come from Strapi do not change". Help texts, placeholders and field errors come from Strapi. | Scope: a seed change would touch `backend/` and the Strapi texts asserted by tests. | Strapi texts (help, placeholders, field errors, labels, plans, terms) are **not** changed. US-04 adds only code-owned interface copy (§8.1: search, calendar, date hint, step indicator, header, sheet close). Existing code-owned strings (empty and error states of US-01..US-03) also stay unchanged, because tests assert them and they were approved. Better Strapi copy is a later content task for editors. Alternative: revise seed help texts and placeholders in this story (backend change, test updates). **v0.3 (HC3 round 1, human decision):** one Strapi seed text changes, the `fullName` `errorMessage` (CO, CL), with rule changes for `fullName`, `documentNumber` and `plate` (BR-19, §7.1); every other Strapi text stays. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-08 | **[ADR]** The two font families and how they are loaded. | BR-12; performance; licence. | A display family for headings and a text family for everything else, both OFL-1.1 variable fonts, self-hosted as WOFF2 subsets (Latin + Latin-1 for Spanish) from the app origin, `font-display: swap`, the text font preloaded. ~~Candidates for the ADR: display "Sora" or "Space Grotesk", text "Inter".~~ Source either `@fontsource-variable/*` npm packages (pinned) or committed files with the OFL text. No Google Fonts or other CDN. **v0.2:** replaced by ADR-0010 §5: display **Archivo** (`wght` and `wdth` axes), text **Atkinson Hyperlegible Next**, from `@fontsource-variable/archivo` 5.3.0 and `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0, one latin-subset variable WOFF2 file per family copied to `/fonts/`, weight ranges limited to the scale, text face preloaded, local system fallback stack (BR-12). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-09 | **[ADR]** Icon library, exact version, licence, import style; the field-key → icon map and the default icon. | BR-04; bundle size; Angular 22 compatibility. | ~~`lucide-angular` (ISC) at an exact version the architect verifies against `@angular/core` 22.3.0 peer ranges; alternative `lucide-static` SVGs inlined at build time if the Angular wrapper lags.~~ **v0.2:** **`@lucide/angular` 1.77.0** (ISC), ADR-0010 §7: `lucide-angular` is deprecated and its peer range (`@angular/core` 13.x–21.x) does not accept Angular 22. The map below is kept, as Lucide components (`LucideIdCard`, …, default `LucidePencilLine`; AC-04). Individual imports only. Map (lucide names, verified in the ADR): `documentType` id-card, `documentNumber` hash, `fullName` user, `birthDate` calendar, `city` map-pin, `plate` rectangle-horizontal, `make` car, `model` car-front, `vehicleYear` calendar-range; default `pencil-line`. Messages: help `info`, error `circle-alert`, success `circle-check`; plan lists `circle-check`. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-10 | Flag source and licence. | BR-03; licence and size. | Our own optimised SVGs (~~national flags are public-domain designs~~ **v0.2:** drawn from the official constructions, that is the proportions and geometry; no law fixes the flag colours, so the colour values are published approximations, ADR-0010 §8 and ADR-0011; Colombia three bands 2:1:1; Chile two bands, blue canton, white star), each < 1 kB, inline, `aria-hidden`. Alternative: `flag-icons` (MIT), larger and brings every country. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-11 | Select search: threshold, matching, empty result. | BR-05; the story's examples (cities, makes) have 4–5 options in the seed. | Search when the field has **4 or more** options (seed: cities 4 and makes 5 searchable, "Tipo de documento" 2 not), as one constant. Matching: option label contains the typed text, case- and accent-insensitive; order kept; first match active. Empty result: "No encontramos opciones para «texto»." Result count announced politely ("1 opción" / "N opciones"). Escape or leaving restores the shown value. **v0.2:** `SEARCH_THRESHOLD = 4` in `select-search.ts` (ADR-0012 §2); on phones, the HC3 check of AC-12 (sheet above the on-screen keyboard). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-12 | Calendar details: year range, initial month, week start, disabled days for fields without `minAge`, buttons. | BR-06; AC-09, AC-10. | ~~Week starts Monday;~~ **v0.2 (human decision at HC1):** the first day of the week follows the country locale from CLDR (Sunday for es-CO, Monday for es-CL), derived from the `localeTag`, with no country code in the date picker (BR-06, AC-09). Names from `Intl` with the country `localeTag`. Year selector range: with `minAge` N, from Y−120 to the year of the latest valid date; without it, Y−120 to Y+10 (Y = year of today, injectable clock). Initial focus: the stored date if valid, else the latest valid date (with `minAge`), else today. Buttons "Elegir año", "Mes anterior", "Mes siguiente", "Cerrar"; selection by click, Enter or Space on a day (no "Aceptar" button). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-13 | Mobile panel: bottom sheet or full screen, and the breakpoint. | BR-05, BR-06, AC-12. | Bottom sheet below **600 CSS px** viewport width (360 → sheet; 768 and 1280 → anchored popover), max 85% of the viewport height, scrollable list, backdrop, "Cerrar" button, option rows ≥ 48 px. Full screen is not used. **v0.2:** the breakpoint is the token `--breakpoint-sheet` (37.5em = 600 px, ADR-0010 §6); placement by CDK position strategies (ADR-0012 §3); the sheet must fit above the on-screen keyboard (AC-12 HC3 phone check). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-14 | **[ADR]** Motion approach and the step transition. | BR-09, BR-10; bundle weight and maintenance. | Angular native `animate.enter` / `animate.leave` with CSS keyframes and transitions driven by duration and easing tokens; no animation library (Motion or GSAP add weight for effects CSS covers). Step transition is **enter-only** (fade + 8 px rise, "base" duration) so only one page is ever in the DOM; router `withViewTransitions()` is an alternative for the ADR. Reduced motion: duration tokens set to `0ms` and keyframes disabled under the media query. **v0.2:** decided as proposed by ADR-0013 (option A, enter-only step transition); reduced motion is applied by construction (animations declared only inside `prefers-reduced-motion: no-preference`, tokens `0ms` under `reduce`, CDK `disableAnimations: true`; BR-10, AC-17). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-15 | Skeletons: where, and what happens to the loading text that tests assert. | BR-09; AC-15; existing tests assert "Cargando…" texts. | Skeletons on step 1 (field-shaped blocks), step 2 (three card shapes), the terms region and the country list; `aria-hidden`; static under reduced motion. The existing loading text stays in its live region (visually hidden next to the skeleton), so no test or announcement changes. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-16 | Which screens get micro-animations, and which effects? | BR-09; must not interfere with announcements or tests. | Step indicator fill; select and calendar panel open/close; error text fade-in; plan card hover lift and choose (border and glow); summary sections fade in with a short stagger (≤ 400 ms total); "Pagar" processing spinner; confirmation check-circle ~~draw~~ **v0.2:** scale and fade (scale 0.85 → 1 with opacity, `--duration-slow`; `transform`/`opacity` only, since a stroke draw animates `stroke-dashoffset`; ADR-0013 §2). No counting-up of prices or changing numbers (screen readers would read intermediate values). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-17 | Step indicator and wizard header: labels, interactivity, confirmation state, contents. | BR-09, BR-13; Tab order tests (US-03-AC-16) must not change. | Indicator steps "Tus datos", "Plan", "Resumen y pago"; not interactive (no links back; "Atrás", "Editar mis datos" and "Cambiar plan" remain the ways back); `aria-current="step"`, visually hidden "Paso n de 3" and "completado"; on the confirmation all completed. Header: the text "Cotizador de seguro de auto" (not a heading, not a link) and the country chip (flag + Strapi country name); no focusable element. Shown on the wizard pages, not on the chooser or the unknown-country page. **v0.3 (HC3 round 1, human decision):** the indicator stays non-interactive; back links above the `h1` and the country chip as a link to the chooser are added (BR-21); the chooser shows the header without the chip (BR-20); the unknown-country page still has no header. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-18 | 44 × 44 px targets: everywhere, and what about earlier ACs that said 24 × 24? | BR-11; US-01-AC-26, US-02-AC-18, US-03-AC-18 are manual ACs with 24 × 24. | 44 × 44 for every interactive element, measured as in BR-11; it supersedes the 24 × 24 of those ACs, and AC-18 automates it. No exception for inline links (there are none in the wizard today). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-19 | Evidence: which files, who captures them, and the missing "before" of the country chooser. | BR-15; the before set has no chooser page and could not show native popups open. | The orchestrator captures `after/` with the same script and data as `before/`, plus `00-paises-*` in both sets (the "before" chooser captured from `main` before implementation starts, task US-04-T-06). Names per AC-22. README updated with the after table. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-20 | Automated accessibility scan: add `@axe-core/playwright` (MPL-2.0, dev only) or not? | Contrast and ARIA errors could be caught automatically; adds a dependency with a weak-copyleft licence. | No new test dependency: contrast is checked on token pairs (AC-02), roles and names in component tests, the rest by the HC3 screen reader and visual pass. Alternative: add `@axe-core/playwright` pinned, run on every page at the three sizes (BR-14 licence exception needed). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-21 | Do the approved US-01..US-03 specs get updated for what US-04 supersedes (Q-04, Q-18)? | Traceability: a reader of US-01 would still read "native date input". | Not rewritten. After HC1 the spec-writer adds one Review log row to each affected spec pointing to US-04 (US-01: Q-22, §9, BR-02 prompt wording, AC-26; US-02: AC-18; US-03: AC-18). Test titles keep their original AC IDs. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-22 | Segmented pill toggles: where? | Reference style; must keep native semantics. | The US-03 "Simulación de pago" group is styled as a pill segmented control; it stays a native radio group (tests and US-03-AC-17 unchanged). No other segmented control is introduced. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-23 | (v0.3) Date mask details the HC3 request leaves open: what a typed separator does, when `/` appears, Backspace over `/`. | AC-25 rows and the existing tests that type "15/05/1990" and "5/5/1990" character by character. | As BR-18: digits only; a typed separator pads a one-digit day or month ~~("5/" → "05/"), shows `/` once after a complete group~~ ("5/" → "05"), closes a complete group without showing a trailing `/` ("15/" → "15"; v0.3 alignment with ADR-0014 §2, review US-04-R4-F04), is dropped elsewhere; `/` appears when the next digit is typed; Backspace removes a trailing separator with the digit before it. Caret handling for edits in the middle of the text per ADR-0014. Reviewed at the HC3 QA of this round. **v0.3 clarification (review US-04-R3-F01, 2026-11-22; decision relayed by the main session):** mid-text edits as in the BR-18 clarification: an on-screen `/` is never treated as newly typed, only a `/` typed at the end pads; any other edit re-derives the text from the digits in order (max 8) with `/` after the 2nd and 4th digit, caret mapped by the digits before it; an insertion into a full 8-digit text is ignored; an edit never silently yields a different complete date. | |
| US-04-Q-24 | (v0.3) Does "Fecha no válida. Usa el formato dd/mm/aaaa." also replace the Strapi `errorMessage` of an **optional** date field for unreadable text (AC-08 third scenario: "Ingresa una fecha válida.")? | The HC3 request names only the birth date; one rule for all date fields is simpler and clearer. | Yes: same message for required and optional date fields; an empty optional field still has no error. Reviewed at the HC3 QA of this round. | |
| US-04-Q-25 | (v0.3) Order on the chooser: is "Cómo funciona" before or after the country links? | The brief lists it under the lead text; the page's single job is choosing a country, and keyboard users reach the links sooner if they come first. | h1, lead paragraph, country links, then "Cómo funciona" (AC-29). Reviewed at the HC3 QA of this round. | |
| US-04-Q-26 | (v0.3) Does the input-profile filter apply to values restored from the wizard state, and is the plate stored in upper case? | A stored "Ana 2" from before the change; data shown must match data stored. | The filter applies only to typing and pasting; restored values are shown as stored and validated by the Strapi rules (AC-26 "seed rules" scenario). The plate is shown and stored in upper case (the seed patterns accept both cases, so validation and the step 1 output are unaffected for valid plates; the summary shows the stored upper case). Reviewed at the HC3 QA of this round. | |
| US-04-Q-27 | (v0.3) The seed `fullName` pattern: the validator compiles patterns without the `u` flag, so `\p{L}` cannot be used; which letters are allowed? The front-end filter allows any Unicode letter. | A name with a letter the pattern does not list would pass the filter and fail validation. | Pattern `^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ '.-]*$` (Latin-1 letters: covers á é í ó ú ü ñ and also ç, ã, ö…; a superset of the brief's explicit Spanish class `^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '.-]*$`). A name with a letter outside Latin-1 shows the `fullName` message. Alternative: the brief's Spanish-only class. Reviewed at the HC3 QA of this round. | |
| US-04-Q-28 | (v0.4) The header is translucent and sticky, so any content can scroll under it. Against which backdrop is the product name's (and the chip's) AA contrast computed? The brief names the solid fallback and the lightest page stop only. | ~~The lightest thing that can pass under the header is the white primary button (`--primitive-ink-50`);~~ **v0.4 alignment (review US-04-R6-F01):** the lightest thing that can pass under the header is pure white, `--primitive-white` (`#FFFFFF`): the top stop of `--gradient-button-primary` and the white of the Chile flag (`--primitive-flag-cl-white`) on the chooser cards; with a low header opacity a light gradient-text stop (violet-300) over it drops below 4.5:1, and blurred pixels cannot be measured by a test. | Add a worst-case row: `--component-header-bg` composited over ~~`--primitive-ink-50`~~ **`--primitive-white`** (blur ignored, so stricter than reality), for every product-name colour and the chip text (≥ 4.5:1) and the focus indicator (≥ 3:1). The header opacity in `--component-header-bg` is set (tokens only) high enough for every row to pass. Alternative: only the two rows of the brief, with content under the header judged visually at HC3. Reviewed at the HC3 QA of round 2. **v0.4 alignment (review US-04-R6-F01, F06):** the three backdrops are named in `contrast-pairs.json` as `--component-header-bg-solid` (a token), `header-bg-over-page-lightest` and `header-bg-over-white`; the last two are computed pseudo-backdrops of the contrast evaluator (`--component-header-bg` composited over the lightest `--gradient-page` stop, and over `--primitive-white`), not tokens. The former `header-bg-over-ink-50` row is replaced by `header-bg-over-white` (ink-50 is darker than white, so it was not the worst case: at 82% violet-300 measures 5.09:1 over ink-50 and 4.97:1 over white; at 79% ink-50 still passes while white fails). | |
| US-04-Q-29 | (v0.4) Show a visible "Cambiar" hint (with a decorative `ArrowLeftRight`/`Repeat` icon) in the chip on wide screens? D8 allows it if it fits. | On step 1 the back link "Cambiar país" sits just below the header, so a second visible "Cambiar…" would duplicate it; a new hint is also new copy and changes the chip's visible label (WCAG 2.5.3 label in name). | **No hint**: the chip shows the flag and the country name only; the pill shape, the accent ring and the hover/focus states signal that it is a link; no new copy. Alternative: from 768 px up, show "Cambiar país" (existing §8.1 string) after the country name, icon `aria-hidden`, accessible name unchanged. Reviewed at the HC3 QA of round 2. | |
| US-04-Q-30 | (v0.4) PNG or ICO for the fallback icon, and what happens to the Angular default `favicon.ico`? | ICO needs an encoder (no new dependency allowed without review); browsers still request `/favicon.ico` by default, and the nginx SPA fallback answers a missing file with `index.html` (`200 text/html`), which browsers ignore as an icon. | `favicon-32.png` as the fallback (`<link rel="icon" type="image/png" sizes="32x32">`), rendered from the SVG with the existing Playwright Chromium; delete `frontend/public/favicon.ico` and its `<link>`; accept that the implicit `/favicon.ico` request returns the SPA fallback (no visible effect: every supported browser uses the declared links). Alternative: also ship a `favicon.ico` of our mark (hand-assembled ICO wrapping the 32 × 32 PNG, no dependency). Reviewed at the HC3 QA of round 2. | |

Checklist items with no gap: *country context, deep links, persistence, concurrency, draft vs
published, formatting of prices and dates on the summary, masking, security of content access*
are unchanged by a visual story (BR-07). *Configuration change mid-flow*: icons fall back to the
default for new keys (AC-04), selects with more options become searchable (Q-11).

## 7. Content contract (what Strapi must provide)

### 7.1 Strapi

~~**No change.**~~ **v0.3: no schema or contract change; three seed content changes (BR-19,
human decision at HC3 round 1).** US-04 reads the same content types as US-01..US-03 (ADR-0001,
ADR-0006). The country `name` and `localeTag` already provided are enough for the header, the chip
link name, the calendar names and the calendar's first day of the week. ADR-0011 keeps the flag and
accent in the front end, so no `country` attribute is added.

Seed changes in `backend/src/seed/form-fields.ts` (form-field `rules` and `errorMessage` only;
`dynamic-form-fields` contract v1 unchanged; rules use existing kinds):

| Country | Field `key` | Change |
|---|---|---|
| CO, CL | `fullName` | Append rule `pattern` `^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ '.-]*$` (US-04-Q-27) after `minLength` 3 and `maxLength` 80. `errorMessage` "Ingresa tu nombre completo (entre 3 y 80 caracteres)." → "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." |
| CO | `documentNumber` | Append rule `maxLength` 10 (the `pattern` `^[0-9]{6,10}$` stays). |
| CL | `documentNumber` (RUT) | Append rule `maxLength` 12 ("12.345.678-5" is 12 characters; `pattern` and `rutCheckDigit` stay). |
| CO, CL | `plate` | Append rule `maxLength` 6 (patterns stay). |

The seed only creates entries that are missing (the existing rule, not changed), so a database
seeded before this change keeps the old content; the local demo is reset with
`docker compose -p mci-demo down -v`. The front-end test fixtures that mirror the seed
(`frontend/src/testing/seed-fixtures.ts`) and the US-01 seed annex
([seed-fields.md](../US-01/seed-fields.md)) are updated to match (§11.1, task US-04-T-40).

### 7.2 Front-end presentation maps (code, not content)

| Map | Key | Value | Fallback |
|---|---|---|---|
| Field icon (`shared/field-icons.ts`, ADR-0010 §7) | field `key` | `@lucide/angular` component for `documentType`, `documentNumber`, `fullName`, `birthDate`, `city`, `plate`, `make`, `model`, `vehicleYear` (names in AC-04) | `LucidePencilLine` for any other key of type `text`, `number`, `select`, `date`; none for `checkbox` |
| Country visuals (`shared/country-visuals.ts`, ADR-0011) | country `code`, upper-cased (`'CO'`, `'CL'`) | flag component and accent key (`'co'`, `'cl'`); the colour values live only in `tokens.css` | `{ flag: null, accent: null }`: `LucideEarth` and the brand accent |
| Input profile (v0.3; file name per ADR-0014, CLAUDE.md §6) | field `key`; for unmapped keys, the field `type` | allowed characters, letter case, fallback max length, `inputmode`, `autocomplete`, `autocapitalize` (table below) | `number` type → "digits"; any other unmapped field → no filter, no fallback max, no hints |

~~Both maps are presentation only: no behaviour, validation or copy depends on them.~~ **v0.3:**
the field-icon and country-visuals maps are presentation only. The input-profile map is
presentation and **input behaviour** only: it filters what can be typed or pasted and sets the
attributes; no validation rule or message depends on it, and it is keyed by field key, never by
country (the RUT variant is chosen by the presence of a `rutCheckDigit` rule).

**v0.4:** no map changes. The header's country accent comes from the existing country-visuals
accent key (ADR-0011); the brand mark and the icons are static assets, not maps. No Strapi change
(§7.1 stays as in v0.3).

Input profiles (BR-19). `maxlength` = the field's Strapi `maxLength` rule value if present, else the
fallback below.

| Profile (key) | Allowed characters | Case | Fallback max | `inputmode` | `autocomplete` | `autocapitalize` |
|---|---|---|---|---|---|---|
| `fullName` | any Unicode letter, space, `'`, `-`, `.` | as typed | 80 | — | `name` | `words` |
| `documentNumber` without `rutCheckDigit` | digits | — | 10 | `numeric` | — | — |
| `documentNumber` with `rutCheckDigit` (RUT) | digits, `.`, `-`, `k`/`K` | `k` shown and stored as `K` | 12 | `text` | — | — |
| `plate` | ASCII letters, digits | upper case | 6 | — | `off` | `characters` |
| `model` | any Unicode letter, digits, space, `-`, `.`, `/` | as typed | 40 | — | — | — |
| `vehicleYear` | digits | — | 4 | `numeric` | — | — |
| any other `number` field ("digits") | digits | — | none | `numeric` | — | — |
| `date` fields | the date mask (BR-18) | — | 10 (`maxlength`) | `numeric` | — | — |

## 8. UI states

| State | Trigger | What the user sees | Accessibility notes |
|---|---|---|---|
| Loading | Content request in flight (fields, plans, terms, countries) | Skeleton shapes in place of the content | Skeleton `aria-hidden`; existing loading text in the polite live region; container `aria-busy` as today |
| Error / empty | As in US-01..US-03 | Same copy, restyled with an error or info icon | Unchanged roles (`alert`, `status`), focus rules unchanged |
| Select collapsed | Default | Icon, shown value, chevron; when empty, the prompt "Selecciona una opción" (button text of a select-only, placeholder of a searchable select) | `role="combobox"`, `aria-expanded="false"`; `aria-controls` may be absent (BR-05) |
| Select open | Activation, keys of AC-06 | Popover or bottom sheet with options, selected option checked | `aria-expanded="true"`, `aria-controls` → listbox, `aria-activedescendant`, listbox labelled by the field label |
| Select searching | Typing in a searchable select | Filtered options or "No encontramos opciones para «…»." | Count announced politely |
| Calendar open | "Elegir fecha" | Month and year, "Elegir año", month arrows, grid, disabled days dimmed and struck | `role="dialog"`, `aria-modal="true"`, focus trapped, backdrop, page behind `aria-hidden="true"`; first day of the week from the country locale |
| Year selector | "Elegir año" | List of years, current year marked | Listbox; Enter chooses and returns to the grid |
| Field invalid | Blur or failed "Continuar" | Message with error icon, soft fade-in, error border | Unchanged: `aria-invalid`, `aria-describedby`, announced once |
| Hover / active / disabled | Pointer, press, `disabled` / `aria-disabled` | Distinct styles per control, from component tokens | Disabled style perceivable without colour only (opacity + cursor + icon or text where already present) |
| Plan chosen | Radio checked or card click | Violet border and glow, "Seleccionado" badge (the existing US-02 marker, restyled) | Native radio state unchanged |
| Step change | "Continuar", "Atrás", back actions | Arriving page fades and rises in; indicator fill moves | Focus on the arriving `h1` (unchanged) |
| Processing payment | "Pagar" | Spinner in the button, "Procesando pago…" | Unchanged (US-03) |
| Confirmation | Payment approved | Check-circle scales and fades in (`transform` and `opacity` only, ADR-0013); indicator all completed | Unchanged focus and title |
| Reduced motion | `prefers-reduced-motion: reduce` | Every state above without movement | — |
| Calendar open, wide (v0.3) | "Elegir fecha" at ≥ `--breakpoint-sheet` | Compact popover directly below the date text box; the page scrolls first if it would not fit below; never over the sticky header | As "Calendar open" (BR-17, AC-24) |
| Date typing (v0.3) | Keys in the date text box | Digits with `/` inserted ("15/0"); other characters do not appear; no message while typing | `inputmode="numeric"`, `maxlength="10"`; no announcement per keystroke |
| Date not valid (v0.3) | Leaving the field, or "Continuar", with text that is not a complete, existing date | "Fecha no válida. Usa el formato dd/mm/aaaa." with the error icon; the text stays | `aria-invalid="true"`, message in `aria-describedby`, announced once (BR-18) |
| Filtered input (v0.3) | Typing or pasting a character outside the field's profile, or past `maxlength` | The character does not appear; the caret stays after the last kept character; no message | No announcement (the Strapi validation message appears only per the existing timing) |
| Back link (v0.3) | Wizard steps 1–3 | "← Cambiar país" / "← Volver a tus datos" / "← Volver a planes" above the h1 | `<a>` with `routerLink`; arrow `aria-hidden`; 44 × 44; visible focus (BR-21) |
| Country chip link (v0.3) | Wizard header with a resolved country | Flag + country name (optional "Cambiar país" hint on wide screens) | Accessible name "Cambiar país (actual: {país})"; flag `aria-hidden` |
| Chooser (v0.3) | "/" | Header with the product name; h1, lead paragraph, country cards (flag, name, chevron, accent on hover/focus), "Cómo funciona" with three numbered steps | One h1, one h2; icons `aria-hidden`; only the country links are Tab stops |
| Page background (v0.3) | Every page | Lighter dark gradient with a violet tint near the top (`--gradient-page`), solid `--color-bg` fallback | AA at every stop (BR-20) |
| App header (v0.4) | Chooser, steps 1–3, confirmation | Translucent violet layer, content behind softly blurred when scrolling; 1 px gradient bottom edge (country accent in the middle on wizard pages); brand mark, product name in Archivo, chip pill | Mark `aria-hidden`; one link (the chip) on wizard pages, none on the chooser; AA over the worst-case backdrop (BR-22, Q-28) |
| App header, reduced transparency or no `backdrop-filter` (v0.4) | `prefers-reduced-transparency: reduce`, or unsupported | Opaque `--component-header-bg-solid`, no blur; edge and mark unchanged | As above |
| App header, forced colors (v0.4) | `forced-colors: active` | System `Canvas` background, `CanvasText` text, solid bottom border | Gradient text replaced by a system colour (BR-02) |
| Browser tab and home-screen icon (v0.4) | Any page | Our brand mark as favicon; violet browser chrome on mobile (`theme-color`); Apple touch icon | Decorative; no accessible content (BR-23) |

### 8.1 Code-owned copy added by US-04

Spanish, the same for both countries; extends US-01/US-02/US-03 §8.1. Existing strings are
reused unchanged ("Selecciona una opción", "Cotizador de seguro de auto", loading texts, and the
US-02 plan markers "Recomendado" and "Seleccionado"). The "Seleccionado" badge of §8 is the
existing US-02 marker (US-02 §8 *Plan chosen*, US-02 §8.1, US-02-AC-03), so it is kept and
is not a new string.

| String | Where |
|---|---|
| "No encontramos opciones para «{texto}»." | Searchable select, no match |
| "1 opción" / "{n} opciones" | Search result count (polite live region, visually hidden) |
| "Escribe para buscar" | Placeholder of a searchable select while open and empty |
| "Cerrar" | Close button of a bottom sheet and of the calendar |
| "Elegir fecha" | Calendar button next to each date field (accessible name "Elegir fecha: {label}") |
| "dd/mm/aaaa" | Placeholder of the date text box |
| "Formato: dd/mm/aaaa" | Hint under the date text box, in its accessible description |
| "Elegir año" / "Mes anterior" / "Mes siguiente" | Calendar controls |
| "Tus datos" / "Plan" / "Resumen y pago" | Step indicator labels |
| "Progreso de la cotización" | Accessible name of the step indicator list |
| "Paso {n} de 3" / "completado" | Visually hidden step indicator texts |
| "Fecha no válida. Usa el formato dd/mm/aaaa." | (v0.3) Error of a date text box whose text is not a complete, existing date (BR-18) |
| "Cambiar país" | (v0.3) Back link of step 1 (→ `/`); also the optional visible hint of the header chip on wide screens |
| "Volver a tus datos" | (v0.3) Back link of step 2 (→ `/<cc>/datos`) |
| "Volver a planes" | (v0.3) Back link of step 3 (→ `/<cc>/planes`) |
| "Cambiar país (actual: {país})" | (v0.3) Accessible name of the header country chip link; `{país}` is the Strapi country `name`, for example "Cambiar país (actual: Colombia)" |
| "Cotiza el seguro de tu auto en pocos minutos. Elige el país donde está matriculado tu vehículo para ver los planes y precios disponibles." | (v0.3) Chooser lead paragraph |
| "Cómo funciona" | (v0.3) Chooser `h2` |
| "Cuéntanos sobre ti y tu vehículo." / "Compara coberturas y precios." / "Revisa, acepta los términos y paga." | (v0.3) Descriptions of the chooser steps "Tus datos", "Plan", "Resumen y pago" (step names reused from the step indicator) |

v0.3 reused strings: "Cotizador de seguro de auto" (chooser header), "Elige tu país" (chooser
`h1`, unchanged), "Tus datos", "Plan", "Resumen y pago" (chooser list). The new `fullName`
`errorMessage` "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." is **Strapi
seed content** (§7.1), not code-owned copy.

**v0.4: no new copy.** The header keeps "Cotizador de seguro de auto" and the chip name "Cambiar
país (actual: {país})"; the brand mark and the icons have no text. The optional "Cambiar" hint of
D8 is not used (US-04-Q-29); if the human chooses the alternative at HC3, it reuses the existing
"Cambiar país" string above, still no new string.

## 9. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA; WAI-ARIA APG combobox (select-only and list autocomplete) and
  date picker dialog patterns; visible focus on the focused element; Tab order unchanged except the
  "Elegir fecha" stop; one `h1` per page; decorative icons and flags hidden; `forced-colors`
  fallbacks for gradient text and borders; screen reader pass at HC3 (NVDA or VoiceOver) on the
  select (both kinds, including how a collapsed combobox without `aria-controls` is announced,
  ADR-0012), the calendar, the year list and the step indicator. **v0.3:** back links and the
  chip link are real links with visible focus and 44 × 44 targets; the date mask and the input
  filters announce nothing per keystroke; the screen reader pass at HC3 also covers the chip link
  name and the date box while typing. **v0.4:** the header brand mark is hidden from assistive
  technology; reduced-transparency and forced-colors fallbacks for the header (BR-22).
- **Performance (v0.4):** one `backdrop-filter` on the sticky header only; the icons are static
  files (`favicon.svg` ≤ 4 kB) not referenced by the bundle, so the initial bundle budget is
  unaffected beyond the inline mark.
- **Responsive:** mobile-first CSS (`min-width` queries on the `--breakpoint-*` tokens); 320–1440
  CSS px with no horizontal scroll (verified at 360, 768, 1280); 44 × 44 px targets; bottom sheet
  below `--breakpoint-sheet` (600 px), fitting above the on-screen keyboard on phones (HC3 phone
  check, AC-12).
- **Multi-country:** one build; no country branch except the presentation map
  `country-visuals.ts` (ADR-0011, enforced by the static guard of AC-03); calendar names, date
  formatting and the first day of the week from `Intl`/CLDR and the country `localeTag`, with no
  country code in the date picker; the date text format is the same for every country. **v0.3:**
  input profiles are keyed by field key, never by country code; the RUT variant follows the
  `rutCheckDigit` rule, so the AC-03 country-code guard still holds.
- **Security / privacy:** no third-party origin at runtime (fonts, icons, flags self-hosted, so no
  new CSP or proxy change); no value of the form in logs; no `innerHTML` for icons or flags (the
  existing static guard applies: icons and flags are components or inline template SVG).
- **Performance:** icons imported individually; fonts: one latin-subset variable WOFF2 file per
  family with the weight range limited to the scale (BR-12), text face preloaded; the step 1 page is
  lazy-loaded (`loadComponent`, ADR-0012 §7) so `@angular/aria`, `@angular/cdk` and the step 1
  icons stay out of the initial bundle; the production build stays within the existing
  `angular.json` budgets (initial 500 kB warning, 1 MB error; component styles 4 kB warning, 8 kB
  error), which are not changed. Movement animates `transform` and `opacity` only; state
  transitions may change paint-only properties (colours, border colour, shadow); no layout
  property is animated (ADR-0013).
- **Maintainability:** tokens in one file; new shared components and pure functions under
  `src/app/shared/` with the names of ADR-0012 §2 (`CustomSelect`, `DateField`, `Calendar`,
  `date-text.ts`, `calendar-dates.ts`, `select-search.ts`), ADR-0010 (`field-icons.ts`, flag
  components under `shared/flags/`) and ADR-0011 (`country-visuals.ts`); others per CLAUDE.md §6
  (for example `step-indicator.ts` → `StepIndicator`).
- **Language:** end-user copy Spanish; code, docs English.

## 10. ADRs

- **Referenced (accepted, binding):**
  1. ADR-0001 — country list as content; routes and focus on the arriving heading (unchanged).
     Amended by ADR-0006 (physical model) and by ADR-0011 (country codes allowed only in
     `country-visuals.ts`).
  2. ADR-0003 — stored values and their shape unchanged (AC-11).
  3. ADR-0004 — Signal Forms over the shared validation core; string editing model; error timing;
     `focusBoundControl()` on a failed submit. Amended by ADR-0012 (D7 for `select` and `date`;
     `syncNative` now writes `number` keys only).
  4. ADR-0009 — heading levels of the summary and terms (AC-20); no `innerHTML` (icons and flags).
  5. ADR-0002 / ADR-0005 — proxy and access unchanged; nothing new is fetched from Strapi or from a
     third party.
  6. **ADR-0010** (Accepted 2026-11-21) — design tokens and visual language: `tokens.css` in three
     tiers and its static guard; dark theme; palette, gradients, texture and the
     `contrast-pairs.json` list; Archivo + Atkinson Hyperlegible Next; scales and breakpoints;
     `@lucide/angular` 1.77.0 and the field-key map; own flag SVGs (US-04-Q-01, Q-03, Q-08, Q-09,
     Q-10; BR-01, BR-02, BR-04, BR-12, BR-14; AC-01, AC-02, AC-04, AC-19, AC-21, AC-23).
  7. **ADR-0011** (Accepted 2026-11-21) — country visuals as a presentation-only front-end map with
     a neutral fallback; country accents; **amends ADR-0001** and turns its review grep into a
     static guard (US-04-Q-02, Q-03, Q-10; BR-03; AC-02, AC-03).
  8. **ADR-0012** (Accepted 2026-11-21) — `@angular/aria` + `@angular/cdk` 22.3.0 for the custom
     select and date picker; `FormValueControl<string>`; `transformedValue` for dates; pure
     `date-text`, `calendar-dates`, `select-search`; CDK dialog; popover and bottom sheet; lazy
     step 1; **amends ADR-0004** (US-04-Q-04, Q-05, Q-11..Q-13; BR-05, BR-06, BR-07, BR-11;
     AC-05..AC-12). The week start of its §4 ("Monday first") is superseded by the human decision
     at HC1 (BR-06).
  9. **ADR-0013** (Accepted 2026-11-21) — native `animate.enter` + CSS on duration tokens, no
     animation library, enter-only step transition, reduced motion by construction (US-04-Q-14,
     Q-16; BR-09, BR-10; AC-14, AC-17).
- ~~**Needed:** none.~~
- **Needed (v0.3, HC3 round 1; written by the architect in parallel, must be Accepted by the
  human before implementation):**
  1. **ADR-0014 — Input profiles, typed-date mask and anchored calendar; page background**
     (amends ADR-0012 and ADR-0010). Must decide: the input-profile map (file, shape, lookup by key
     and type, RUT variant by rule) and how the filter hooks into the Signal Forms binding without
     changing the string model or the validation core (ADR-0004); caret handling of the filter and
     the date mask; `number` fields as `type="text"` and what remains of the `syncNative`/`badInput`
     path (ADR-0004 note, ADR-0012 amendment); how the date control shows "Fecha no válida…" for
     unreadable text while the model stays `''` (amends the ADR-0012 `transformedValue` and message
     resolution for dates); the CDK position strategy for the popover below the field, the
     scroll-into-view step, the never-over-the-header rule and the compact sizes (amends ADR-0012
     §3/§4); `--gradient-page`, `--color-bg`, any surface token changes and the regenerated
     `contrast-pairs.json` (amends ADR-0010 §4); new Lucide icons (`ArrowLeft`, chevron) imported
     individually (ADR-0010 §7). (US-04-Q-23..Q-27; BR-17..BR-21; AC-24..AC-28.)
     **Status:** Accepted by the human, 2026-11-22 (commit `6b52ac2`). The review R3 clarifications
     of the mid-text date edits (BR-18, R3-F01) and of IME composition (BR-19, R3-F02) are recorded
     in the spec (§13, 2026-11-22 rows); whether ADR-0014 also needs an implementation note for them
     is for the architect to judge.
- **v0.4 (HC3 round 2): no new ADR expected.** BR-22 and BR-23 stay within accepted decisions:
  ADR-0010 (tokens only, AA contrast at every backdrop, gradients, forced-colors fallbacks, own SVG
  artwork §8, `@lucide/angular` icons individually if any), ADR-0011 (country accent through the
  existing accent key), ADR-0013 (no header animation; chip transitions inside
  `prefers-reduced-motion: no-preference`) and ADR-0014 (`--gradient-page`, `SiteHeader`, chip link).
  No new dependency (PNGs rendered with the existing Playwright Chromium, BR-14). One extension to
  note: the ADR-0010 §2 static guard's allowed media features gain `prefers-reduced-transparency`,
  and `@supports` conditions on `backdrop-filter` may hold a literal (BR-01 v0.4). Whether that
  needs an implementation note in ADR-0010 or `adr/README.md` is for the architect to judge; it does
  not change the decision.

The four ADRs listed as needed in v0.1, kept for traceability (all written and Accepted at HC2,
2026-11-21, as items 6–9 above):

- ~~**Needed (for the architect; written in parallel to HC1):**~~
  1. **Design tokens and visual language** → ADR-0010 (US-04-Q-01, Q-03, Q-08, Q-09, Q-10): token tiers,
     prefixes and file; how "no loose values" is enforced (static guard test vs a linter such as
     Stylelint, pinned); theme; palette with a contrast table of every pair of AC-02 and the
     format the test reads; gradients and the dotted texture; type scale (sizes, weights, line
     heights) and the two families with source, subset, licence and loading; spacing, radii,
     shadows, z-index and breakpoint scales; icon library (exact version, licence, Angular 22
     compatibility, import style) and the field-key map; flags. Includes the example palette and
     type scale the story asks for as the first deliverable.
  2. **Country visuals vs ADR-0001** → ADR-0011 (US-04-Q-02): amend ADR-0001 for a presentation-only map keyed
     by country code with a neutral fallback, or extend the `country` content type. May be a
     section of ADR 1 if it explicitly amends ADR-0001 and updates its review grep.
  3. **Accessible custom select and date picker primitives and their ADR-0004 integration**
     → ADR-0012 (US-04-Q-04, Q-05, Q-11..Q-13): `@angular/cdk` (Overlay, `cdk/listbox` or `ListKeyManager`,
     `cdk/a11y` FocusTrap and LiveAnnouncer) at an exact version compatible with 22.3.0, vs
     `@angular/aria` at 22.3.0 (verify stability: developer preview or stable, and which patterns
     it covers: combobox, listbox, grid); from scratch is excluded by the story. Must state: the
     labelable focus element; Signal Forms custom-control binding (`FormValueControl<string>` or
     equivalent) so `[formField]`, `touched`, `focusBoundControl()` and the existing `aria-*`
     bindings work; where the overlay is attached (inside the component vs `document.body`) and
     what that means for component-test queries; typed-date parsing as a pure function next to the
     validators, mapping unreadable text to `''`; reuse of the field validator for disabled days;
     bottom sheet vs popover. It amends ADR-0004's D7 ("native controls") for `select` and `date`
     and its `syncNative` implementation note for dates.
  4. **Motion** → ADR-0013 (US-04-Q-14, Q-16): native `animate.enter` / `animate.leave` with CSS and duration
     and easing tokens vs router `withViewTransitions()` vs Motion or GSAP; bundle weight and
     maintenance; enter-only step transition; reduced-motion mechanism and how AC-17 measures it.

## 11. Test mapping

Short names: `static-guards` = `frontend/src/app/static-guards.spec.ts` (extended) or a new
`frontend/src/app/design-guards.spec.ts`; `contrast` = `frontend/src/app/shared/contrast.spec.ts`
(WCAG ratio function and the token pairs); `date-text` = `frontend/src/app/shared/date-text.spec.ts`
(parse and format, pure); `date-limits` = `frontend/src/app/shared/calendar-dates.spec.ts`
(disabled days, year range, `nextFocusDate`, grid and week start per locale tag; pure, ADR-0012);
`select-search` = `frontend/src/app/shared/select-search.spec.ts`; `field-icons` =
`frontend/src/app/shared/field-icons.spec.ts`; `country-visuals` =
`frontend/src/app/shared/country-visuals.spec.ts`;
`custom-select` / `date-field` / `step-indicator` / `wizard-header` component specs next to their
components; `quote-form-page`, `plan-list-page`, `summary-page`, `country-chooser-page` = existing
component specs; `e2e-us04` = new `frontend/e2e/us-04-design-system.spec.ts`. The test-engineer
may adjust unit and component paths. Step 1 is lazy-loaded (ADR-0012 §7): a component test that
reaches step 1 through the router awaits the lazy route; one that creates the page directly is not
affected; the e2e suites exercise the lazy route.

| AC | Level | Planned test location |
|---|---|---|
| US-04-AC-01 | unit (static guard over style files, with sensitivity self-test) | `static-guards` |
| US-04-AC-02 | unit (contrast function, every row of `contrast-pairs.json`) + manual visual check at HC3 | `contrast` |
| US-04-AC-03 | unit (country-visuals lookup, fallback; static guard on country codes, accent selectors and flag files) + component | `country-visuals`, `static-guards`, `country-chooser-page`, `wizard-header` |
| US-04-AC-04 | unit (icon map) + component | `field-icons`, `quote-form-page`, `summary-page`, `plan-list-page` |
| US-04-AC-05 | component + e2e | `custom-select`, `quote-form-page`, `e2e-us04` |
| US-04-AC-06 | component (every row, both kinds) + e2e (real keyboard) | `custom-select`, `e2e-us04` |
| US-04-AC-07 | unit (filter) + component | `select-search`, `custom-select` |
| US-04-AC-08 | unit (every row) + component + e2e (en-US and es-CO locales) | `date-text`, `date-field`, `quote-form-page`, `e2e-us04` |
| US-04-AC-09 | unit (every keyboard row and week start per locale tag) + component (names, `aria-hidden` of the page behind) + e2e (real keyboard, focus trap, backdrop) | `date-limits`, `date-field`, `e2e-us04` |
| US-04-AC-10 | unit (every row, pinned clock) + component | `date-limits`, `date-field` |
| US-04-AC-11 | e2e (stored object) + whole existing suite + review (backend diff) | `e2e-us04`, every existing spec (§11.1) |
| US-04-AC-12 | e2e (bounding boxes at three viewports) + manual (HC3 phone check: sheet above the on-screen keyboard) | `e2e-us04`; HC3 |
| US-04-AC-13 | component | `step-indicator`, `wizard-header`, page specs |
| US-04-AC-14 | e2e (`MutationObserver` during navigation, enter animation duration via `getAnimations()`) | `e2e-us04` |
| US-04-AC-15 | component (deferred HTTP responses) | `quote-form-page`, `plan-list-page`, `summary-page`, `country-chooser-page` |
| US-04-AC-16 | component + e2e (click on description) | `plan-list-page`, `e2e-us04` |
| US-04-AC-17 | e2e (`reducedMotion: 'reduce'`, computed styles, `getAnimations()` empty) + unit (static guard of ADR-0013 §4) | `e2e-us04`, `static-guards` |
| US-04-AC-18 | e2e (three viewports × two countries × pages; scroll width, hit boxes, card positions) | `e2e-us04` |
| US-04-AC-19 | e2e (request origins, font requests) + unit (static guard: `@font-face` families, WOFF2, `swap`, same-origin `src`, weight ranges) | `e2e-us04`, `static-guards` |
| US-04-AC-20 | component (heading outline per page, icons hidden) + e2e (focus indicator on new controls) + HC3 screen reader | page specs, `e2e-us04` |
| US-04-AC-21 | unit (static guard on `package.json`) | `static-guards` |
| US-04-AC-22 | manual (screenshots in `docs/qa/US-04/`, checked at HC3) | None automated |
| US-04-AC-23 | manual (HC3 visual review in CO and CL at three sizes) | None automated |
| US-04-AC-24 | e2e (bounding boxes of the dialog, the date box and the header at 1280 × 800 and 768 × 1024, incl. the field low on the page; cell and button sizes; focus return) + manual (HC3 look, 26rem target) | `e2e-us04` |
| US-04-AC-25 | unit (pure mask function: every keys, Backspace and paste row) + component (message resolution, no message while typing, blocked "Continuar" and focus) + e2e (real keyboard typing incl. "29202001", end-to-end typed date to `/co/planes`) | `date-text` (or the mask module named by ADR-0014), `date-field`, `quote-form-page`, `e2e-us04` |
| US-04-AC-26 | unit (profile lookup and filter function: every row; `maxlength` resolution; seed-fixture validator rows for the `fullName` pattern) + component (attributes, filtering on input and paste, hydrated "Ana 2", unknown fields) + e2e (real typing of the rows "Ana 2", "abc-123x", "20e2.5", "12.345.678-k") + backend unit (seed content rows) | input-profile spec (name per ADR-0014), `field-validators`, `quote-form-page`, `e2e-us04`, a backend seed test (`backend/tests/`) |
| US-04-AC-27 | unit (static guard: `--gradient-page` semantic token, stops are tokens, lightest-stop luminance; contrast rows per stop) + e2e (computed `background-image`/`background-color` of `body` on six pages) + manual (HC3 look) | `design-guards`, `contrast`, `e2e-us04` |
| US-04-AC-28 | component (links, names, hrefs, absence on confirmation/unknown/error, header link count, Tab stops) + e2e (navigation and data kept or discarded, focus indicator, 44 × 44, header not clipped at three viewports) | `wizard-chrome`, `quote-form-page`, `plan-list-page`, `summary-page`, `e2e-us04` |
| US-04-AC-29 | component (structure, outline, copy, icons hidden, Tab stops, error state) + e2e (header and copy visible at three viewports) + manual (HC3 look) | `country-chooser-page`, `e2e-us04` |
| US-04-AC-30 | unit (static: tokens declared and alpha, header stylesheet passes the AC-01 guard with the BR-01 v0.4 additions, `@supports` fallback, no `--color-surface-raised`; contrast rows of the three backdrops) + component (mark before the name, `aria-hidden`, no title/text, no img, name not heading or link, one link only on wizard pages) + e2e (computed background, alpha, `backdrop-filter`, edge image and accent stops, sticky, mark size, font family, height and clipping at three viewports, reduced transparency via CDP `Emulation.setEmulatedMedia`, `forcedColors: 'active'`, no header animation) + manual (HC3 look) | `design-guards`, `contrast`, `wizard-chrome` (or a `site-header` spec), `e2e-us04` (new file for round 2, for example `frontend/e2e/us-04-hc3-round2.spec.ts`) |
| US-04-AC-31 | unit (static: `index.html` links and `theme-color` equals the token, file checks: SVG content and size, PNG IHDR sizes and colour type, no `favicon.ico`) + e2e (GET of each icon from the web container: status, content type, byte length; same origin) + manual (HC3: reads at 16 × 16, matches the mark) | `design-guards` (or a new `app-icons.spec.ts`), `e2e-us04` (round 2 file) |

### 11.1 Changes to existing tests (complete list; US-04-Q-06)

Rule: a changed assertion checks what the person perceives **and** what is stored, by role, label
or visible text. Test titles keep their original AC IDs. Element types per ADR-0012 §3: a
select-only custom select (fewer than 4 options, for example "Tipo de documento") is a `<button>`
combobox, a searchable one (4 or more, for example "Ciudad", "Marca") an `<input>` combobox.
"Shown value" reads `inputValue()` for an input and the visible text for a button. **"Shows the
prompt"** means: for a button, its text is "Selecciona una opción"; for an input,
`inputValue()` is `''` and the placeholder is "Selecciona una opción". `aria-controls` is
asserted only while the list is open (BR-05).

**E2E helpers**

| File | Today | Change |
|---|---|---|
| `e2e/support/form.ts` `fillField` | Branches on `tagName === 'select'` → `selectOption`; else `fill` | Branch on role: `combobox` → activate it, choose `getByRole('option', { name, exact: true })`, then assert the shown value; date text box → `fill('<dd/mm/aaaa>')`; checkbox unchanged. |
| `e2e/support/form.ts` `CO_VALID` | `'Fecha de nacimiento': '1990-05-15'` | `'15/05/1990'` (display format). |
| `e2e/support/plans.ts` `CL_VALID` | `'1990-05-15'` | `'15/05/1990'`. |
| `e2e/support/plans.ts` `expectEntered` | Select: `selectedOptions[0].textContent`; others: `toHaveValue` | Combobox: shown value equals the option label **and** `quote-wizard` holds the option value; date: `toHaveValue('15/05/1990')` **and** stored `'1990-05-15'`; `aria-invalid` check unchanged. |
| `e2e/support/form.ts` `visibleLabels` | `page.locator('label')` | Unchanged; requires that panels, search boxes and the calendar add no `<label>` element to the page while closed (BR-05). |

**E2E specs**

| File | Test | Today | Change |
|---|---|---|---|
| `us-01-data-form-co.spec.ts` | US-01-AC-02 row "Fecha de nacimiento" | input `'2010-03-01'` | `'01/03/2010'`; same message and `aria-invalid`. |
| `us-01-data-form-co.spec.ts` | US-01-AC-02/10/18 "required date partly cleared" (R3-F01), 2 tests | `locale: 'en-US'`; Backspace on the first date segment; three Tabs through segments | Drop the locale override; with "15/05/1990" shown, focus the date box, press End and Backspace ("15/05/199"), press Tab until the focus leaves the date field; same assertions: message "Ingresa tu fecha de nacimiento.", `aria-invalid`, stored value does not contain "1990-05-15", "Continuar" (click and Enter) keeps `/co/datos` with the focus on the date box. |
| `us-01-data-form-co.spec.ts` | US-01-AC-24 keyboard completion | "Tipo de documento": type "Cédula de c", check `toHaveValue('CC')`; date: type "05151990" (en-US segments), check `'1990-05-15'`; "Ciudad": type "Medell", check `'MDE'`; "Marca": type "Mazd", check `'mazda'` | Selects: type the same text, press Enter, check shown value ("Cédula de ciudadanía", "Medellín", "Mazda") **and** stored value ("CC", "MDE", "mazda"); date: type "15/05/1990", check shown "15/05/1990" and stored "1990-05-15" after leaving. `tabTo` tolerates the "Elegir fecha" stop (no label, as today's segments). Focus-indicator, Tab-order, Shift+Tab and Enter-on-"Continuar" assertions unchanged. The locale override may stay (harmless) or go. |
| `us-01-data-form-co.spec.ts` | US-01-AC-24 keyboard submit on empty form | Focus on "Tipo de documento", described by its message | Unchanged (the combobox is the labelled, focused element). |
| `us-01-country-context.spec.ts` | US-01-AC-22 `expectEmptyStep1` | `getByRole('combobox')` → `toHaveValue('')` | Each combobox shows the prompt as defined above (searchable `<input>`: `toHaveValue('')` kept **and** `toHaveAttribute('placeholder', 'Selecciona una opción')`; select-only `<button>`: `toHaveText('Selecciona una opción')`) **and** `quote-wizard` has no non-empty value for its key; textbox and spinbutton loops unchanged (the date box is a textbox with value ''). |
| `us-01-03-full-flow-co.spec.ts` | US-03-AC-11 "Nueva cotización", reload and back (3 tests) | `toHaveValue('')` on every label incl. selects and date | Text boxes and date: `toHaveValue('')`; selects: shows the prompt as defined above; sessionStorage null assertions unchanged. |
| `us-01-03-full-flow-co.spec.ts`, `us-02-plans-cl-content.spec.ts`, `us-03-summary-payment-cl.spec.ts`, `us-01-config-change.spec.ts` | Every use of `fillColombia` / `fillChile` / `expectEntered` | Native helpers | No change in the specs; covered by the helper changes. |
| all | Focus descriptors in the US-02-AC-16 and US-03-AC-16 tests (`tagName === 'BUTTON'` → `textContent`, radio → group) | — | Unchanged; requires that icons in buttons add no text content (BR-04) and that plans and the simulation group stay native radios. |

**Component helpers and specs**

| File | Today | Change |
|---|---|---|
| `src/testing/dom.ts` `Control`, `allControls` | `HTMLInputElement \| HTMLSelectElement`; `querySelectorAll('input, select')` | Include the combobox element (`input, select, [role="combobox"]`), so `invalidControls()`, `labelsWithErrors()` and required checks still see every select. |
| `src/testing/dom.ts` `choose`, `fillForm`, `shownValue` | `HTMLSelectElement` value and `selectedOptions` | Open the combobox, click the `role="option"` with the text (looked up, once the list is open, through the combobox's `aria-controls` in `document`, or by role in `document`, since in jsdom the CDK overlay renders under `document.body`, outside the component root; ADR-0012 §8); `shownValue` returns the combobox's shown value (`''` for an empty searchable select); dates take "dd/mm/aaaa". |
| `quote-form-page.spec.ts` | US-01-AC-01 "every field type renders its native control" (`tagName: 'INPUT', type: 'date'`, `tagName: 'SELECT'`) | Renamed "renders its control": text → textbox; number → spinbutton (`type="number"`); date → textbox plus a button "Elegir fecha: Fecha de nacimiento"; select → `role="combobox"` with `aria-expanded="false"` while collapsed, and after opening `aria-expanded="true"` with `aria-controls` referring to the rendered listbox (not asserted while collapsed, BR-05); checkbox → checkbox. |
| `quote-form-page.spec.ts` | US-01-AC-07 option texts and prompt (`select.options`, prompt disabled, `o.value` list) | "Ciudad" (searchable) shows the prompt as defined above; the opened listbox has exactly the 4 cities in order, none `aria-selected`, and no prompt option; choosing each option stores its value (`BOG`, `MDE`, `CLO`, `BAQ`), replacing the `o.value` list. |
| `quote-form-page.spec.ts` | US-01-AC-04 hydration (`select.value === 'MDE'`), US-01-AC-23 stale select shows prompt | Shown value "Medellín" and store `'MDE'`; stale select shows the prompt as defined above and the store holds `''`. |
| `quote-form-page.spec.ts` | US-01-AC-09/10/18 date `badInput` tests (stubbed `validity.badInput`) | Type unreadable text ("15/05/199", "10/13/2026") instead of stubbing; same assertions (store `''`, message, `aria-invalid`, focus on the date box after a failed click or Enter submit). |
| `field-config.spec.ts`, `field-validators.spec.ts`, `field-values.spec.ts`, `summary-page.spec.ts` | Mentions of `'date'` as a field type or ISO values | Expected unchanged (types and stored values do not change); the test-engineer confirms. |

### 11.1.1 Changes to existing tests for v0.3 (HC3 round 1; complete list)

Same rule as §11.1: each change follows a behaviour the human changed at HC3 (BR-07 exception
(a)–(e)) and keeps shown **and** stored assertions; nothing is deleted without a replacement.
Found with a search of `frontend/e2e/*.spec.ts`, `frontend/e2e/support/*.ts`,
`frontend/src/**/*.spec.ts` and `frontend/src/testing/*.ts` for the date required message, the
`fullName` message, `spinbutton`/`type: 'number'`/`badInput`, header focusability, chooser header
absence and the calendar position. Playwright `fill()` sets the whole value in one input event,
which the date mask handles like a paste (BR-18), so `fill('15/05/1990')` and `fill('5/5/1990')`
keep working.

**E2E**

| File | Test | Today | Change |
|---|---|---|---|
| `us-01-data-form-co.spec.ts` | US-01-AC-02 / AC-10 / AC-18 "required date partly cleared" (R3-F01), 2 tests (`clearDateDigit`, `MESSAGE`) | "15/05/199" after leaving → "Ingresa tu fecha de nacimiento." | Same steps; the message is "Fecha no válida. Usa el formato dd/mm/aaaa." (BR-18); every other assertion unchanged. |
| `us-01-data-form-co.spec.ts` | US-01-AC-02 row `['Nombre completo', 'Al', …]` | "Ingresa tu nombre completo (entre 3 y 80 caracteres)." | "Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres)." (seed, §7.1). |
| `us-01-data-form-co.spec.ts` | US-01-AC-09 '"1e" typed key by key in "Modelo (año)"' | Native number: value `''`, `validity.badInput` true, stored `''`, yearRange message | Text box with the digits profile: "1e" shows "1" and stores "1" (`badInput` assertions removed: no native number control any more); "Continuar" shows "El modelo debe estar entre los últimos 20 años y el próximo año.", `aria-invalid`, stays on `/co/datos`. The `US-01-AC-09` ID stays; the title says the letter is not entered. |
| `us-01-data-form-co.spec.ts` | US-01-AC-09 '"abc" cannot even be typed into the number field' | Passes as is | Assertions unchanged; only the comment about the native number control is updated. |
| `us-01-data-form-co.spec.ts` | US-01-AC-24 keyboard completion, `tabTo('Tipo de documento', { max: 6 })` from the top | Header and indicator add no stop | Expected unchanged: the chip link and "Cambiar país" are two unlabelled stops before the first field, within `max: 6`; the test-engineer confirms. Typing "15/05/1990" key by key gives "15/05/1990" with the mask (AC-25 row). |
| `us-01-country-context.spec.ts` | US-01-AC-22 `expectEmptyStep1` | Loop over `getByRole('spinbutton')` | The year is now a textbox (covered by the textbox loop); replace the spinbutton loop with an assertion that the year text box (by label) has value `''`, so the check does not become vacuous. |
| `us-04-design-system.spec.ts` | US-04-AC-08 (es-CO and en-US) '"29/02/2001" … shows the required message' | `toHaveAccessibleDescription(/Ingresa tu fecha de nacimiento\./)` | `/Fecha no válida\. Usa el formato dd\/mm\/aaaa\./`; title updated; the rest unchanged. |
| `us-04-design-system.spec.ts` | US-04-AC-12 "1280 x 800, Elegir fecha: a popover anchored to the date field" | Accepts the popover above **or** below within 40 px | Below only, per AC-24 (or replaced by the AC-24 tests, which are stricter). The 768 × 1024 "Ciudad" test is unchanged (select panels are not in BR-17). |

**Component and unit**

| File | Test | Today | Change |
|---|---|---|---|
| `src/testing/seed-fixtures.ts` | `fullName` (CO, CL), `documentNumber`, `plate` fixtures | Old seed | Mirror §7.1: `pattern` rule and new `errorMessage` for `fullName`; `maxLength` 10 / 12 / 6. |
| `src/app/shared/field-validators.spec.ts` | line ~181 `validateField(fullName, 'Al')` | Old message | New `fullName` message; plus the AC-26 pattern rows. |
| `quote-form-page.spec.ts` | US-01-AC-02 row `['Nombre completo', 'Al', …]` and the full-message assertion near line 306 | Old message | New message. The `toContain('Ingresa tu nombre completo')` substring checks stay valid. |
| `quote-form-page.spec.ts` | US-01-AC-01 "every field type renders its control … number (spinbutton)" | `Modelo (año)`: `{ tagName: 'INPUT', type: 'number' }` | `{ tagName: 'INPUT', type: 'text' }` with `inputmode="numeric"` and role textbox; title "number (text box, numeric)". |
| `quote-form-page.spec.ts` | US-01-AC-21 "what is typed is written as it changes" | Types "2015.5" in "Año", expects stored "2015.5" | Types "2015.5", expects shown and stored "2015" (the "." is not entered). The hydration test with stored "2015.5" is unchanged (US-04-Q-26: restored values are not filtered). |
| `quote-form-page.spec.ts` | US-01-AC-09 / AC-21 number "cannot parse" block (stubbed `validity.badInput`, 7 tests incl. Kilometraje "1e"/"2015e") | Stub sets `badInput` and value `''` | The stub no longer models a reachable state (text box, digits profile). Replace each with typing: "2015e" shows and stores "2015"; "1e" shows and stores "1"; the required-message and optional-message assertions move to an empty required year (requiredMessage ?? errorMessage) and to an out-of-range value, as ADR-0014 decides for the remaining `syncNative` path. The US-01-AC-09 IDs stay. |
| `quote-form-page.spec.ts` | US-01-AC-09 / AC-10 optional date "10/13/2026" (2 tests: errorMessage / "Revisa este campo.") | Shows the field's `errorMessage` or "Revisa este campo." | Both show "Fecha no válida. Usa el formato dd/mm/aaaa." (US-04-Q-24); other assertions unchanged. |
| `quote-form-page.spec.ts` | US-01-AC-02 / AC-10 / AC-18 "required date emptied after it was valid", rows "15/05/199" | "Ingresa tu fecha de nacimiento." | "Fecha no válida. Usa el formato dd/mm/aaaa." for the unreadable row; the cleared (`''`) row keeps "Ingresa tu fecha de nacimiento.". |
| `src/app/shared/date-field.spec.ts` | US-04-AC-08 rows 29/02/2001, 31/04/1990, 15/05/199, 15/05/90 (`REQUIRED`), the "unreadable text is the former badInput" test and the optional "Fecha de revisión" test | Required / field message | "Fecha no válida. Usa el formato dd/mm/aaaa."; stored `''` and visible text unchanged. |
| `src/app/shared/date-field.spec.ts` | US-04-AC-08 "no input mask: typing '15' leaves '15'" | Asserts no `/` inserted | Replaced by the AC-25 mask rows ("150" → "15/0"); the test of "15" alone may stay with a true title. |
| `src/app/shared/wizard-chrome.spec.ts` | US-04-AC-13 "neither the indicator nor the header contains a focusable element or a heading" | Header: 0 focusable | Indicator: 0; header: exactly 1 focusable element, the chip link (AC-13 v0.3, AC-28); headings 0. |
| `src/app/shared/wizard-chrome.spec.ts` | US-04-AC-13 "the Tab order of step 3 is unchanged … first stop is 'Editar mis datos'" | First stop "Editar mis datos" | First stops: chip link, "Volver a planes", then "Editar mis datos" (AC-28). |
| `src/testing/summary-dom.ts` (helper) and `summary-page.spec.ts` | US-03-AC-16 'the keyboard order is "Editar mis datos", "Cambiar plan", the terms region, …' (added after review R3, US-04-R3-F06; commit `84e17aa`) | `tabStops()` collapsed every link to `'a'`; expected order starts with "Editar mis datos" | `tabStops()` names a link by its `aria-label`, else its text (stricter: a link is never collapsed to `'a'`). The expected order gains the two leading stops of AC-28, "Cambiar país (actual: Colombia)" then "Volver a planes", followed by the unchanged sequence "Editar mis datos", "Cambiar plan", terms region, checkbox, simulation group, "Pagar". Title and the US-03-AC-16 ID unchanged. |
| `country-chooser-page.spec.ts` | US-04-AC-03 "the chooser is not a wizard page: no wizard header and no step indicator" | `header, [role="banner"]` is null | A header with "Cotizador de seguro de auto" and no link, no chip and no `data-country-accent`; no step indicator (AC-29). |
| `contrast.spec.ts`, `design-guards.spec.ts` | Read `contrast-pairs.json` and `tokens.css` | — | Expected unchanged in code; the data changes (new rows per gradient stop). New AC-27 guard added. |

Not affected (checked): `quote-form-page.spec.ts` US-01-AC-17 link lists on `/`, `/ar/datos` and
the country-error state (`querySelectorAll('a')`): the chooser header has no link and no back link
or chip link renders without a resolved country (BR-21); `us-01-country-context.spec.ts` link
queries run on pages without the chip; the US-02-AC-16 / US-03-AC-16 **e2e** keyboard tests Tab
forward from the focused `h1`, after the new stops. (The US-03-AC-16 **component** tab-order test
does change; it is listed in the table above since review R3, US-04-R3-F06.)

### 11.1.2 Changes to existing tests for v0.4 (HC3 round 2)

~~Expected: **none**.~~ **v0.4 alignment (review US-04-R6-F04):** the expectation above was wrong.
The test-engineer changed the following in `a837b97`, recorded at the time only in `tasks.md`
(T-60), not through the spec-writer before the change as this section asked. Review R6 found
each change correct and none of them weakens an assertion:

| File | Test / helper | Change | Why it keeps the strength |
|---|---|---|---|
| `frontend/src/app/shared/wizard-chrome.spec.ts` | Three US-04-AC-03 tests: the header flag's attributes, the CO vs CL flag drawings, the neutral globe for an unknown country | The lookup is `a svg` (the flag inside the chip link) instead of the header's first `svg`, which is now the brand mark | The same flag element is found; the assertions (`aria-hidden`, `focusable`, drawing per country, globe) are unchanged |
| `frontend/src/app/shared/contrast.spec.ts` | US-04-AC-02 "rows over a gradient background" | The filter skips the `header-bg-over-*` pseudo-backdrops; the `bgColours()` helper gains the two header pseudo-backdrops (`header-bg-over-page-lightest`, `header-bg-over-white`, AC-30, Q-28) | The pseudo-backdrops are flat composited colours, not gradients; they are checked by the AC-30 rows instead |
| `frontend/src/testing/design-guards.ts` | `styleViolations` allowed media features | Adds `prefers-reduced-transparency: reduce \| no-preference` | Exactly BR-01 v0.4; the sensitivity self-tests still report a literal `backdrop-filter`, a hex background and an unknown media feature |

The existing `--color-surface-raised` rows of `contrast-pairs.json` stay: the step indicator, the
summary, the chooser and `styles.css` still use that surface. Only the AC-02 assertion message
"accent on the header surface" in `contrast.spec.ts` is outdated (US-04-R6-F08). The mark adds no
text, name, focusable element, heading or image, so the header text, link-count, Tab-order and
heading-outline assertions (AC-13, AC-28, AC-29, US-03-AC-16 component test) hold as written, and
the AC-27 body background is unchanged.

Step 7 of review R6 changes test data and helpers again: the `header-bg-over-ink-50` pseudo-backdrop
and its rows become `header-bg-over-white` (US-04-R6-F01, Q-28), and the US-04-R6-F03 and F08/F09
fixes add or reword assertions (task rows T-68..T-70 in `tasks.md`).

Separate, test-only: US-04-R5-F02, the stale "05/" comment in
`frontend/src/app/shared/date-text.spec.ts` (around line 259) is aligned with BR-18 ("5/" → "05").

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-04` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.1 | First version from story.md (translation, to be confirmed by the human), the human's visual brief, US-01..US-03 specs, ADR-0001..0009 and the existing tests. 16 BR, 23 AC (0 original: the story has no scenarios; 23 derived), 22 gaps (6 block HC1: Q-01 theme, Q-02 country visuals vs ADR-0001, Q-04 primitives and US-01 supersessions, Q-05 typed date, Q-06 test changes of §11.1, Q-07 Strapi microcopy contradiction), 4 ADRs needed. |
| 2026-11-21 | Felipe Sabogal (human) | HC1 | **Approved** (v0.1) | The six blocking gaps (Q-01, Q-02, Q-04, Q-05, Q-06, Q-07) accepted as proposed; every other default accepted; the `story.md` translation confirmed. The 14 adjustments that ADR-0010..0013 force are approved and go into v0.2, plus a human decision: the calendar's first day of the week follows the country locale (CLDR: Sunday for es-CO, Monday for es-CL). (Translated from the Spanish session.) |
| 2026-11-21 | spec-writer | v0.2 | ADR-driven adjustments 1–14 approved at HC1; week start per locale | Revision after HC1 and HC2 (ADR-0010..0013 Accepted), applying their *Spec impact* sections. Status kept `Approved` (human pre-approval of items 1–14 and the week start, row above); version 0.2. **(1) Q-09:** icon package `@lucide/angular` 1.77.0 (`lucide-angular` deprecated, peers stop at Angular 21); old text struck, v0.2 note; BR-04, §2, §7.2; AC-04 Examples now name the Lucide components and the default `LucidePencilLine`. **(2) AC-02:** row "input and card border" → "input and interactive card border"; note and BR-02: non-interactive panels (summary sections) keep a decorative hairline, allowed by WCAG 1.4.11. **(3) BR-12 / AC-19:** one variable WOFF2 file per family with the `font-weight` range limited to the scale; the system fallback stack names local fonts, never downloaded, not counted as families; AC-19 `Then` lines reworded accordingly. **(4) Q-08 / Q-03:** starting fonts and colours struck and replaced by references to ADR-0010 §4–§5 (Archivo + Atkinson Hyperlegible Next; palette) and ADR-0011 (Colombia `#FFCD00`, Chile `#F66E5E`); values not duplicated. **(5) "Seleccionado":** kept; it is the existing US-02 marker (US-02 §8, §8.1, US-02-AC-03), so §8.1 lists it among reused strings, not as new copy; §8 row says so. **(6) Q-10:** "public-domain designs" → drawn from the official constructions; flag colours are published approximations (no law fixes them). **(7) Empty searchable select:** prompt = placeholder and `inputValue()` `''` (select-only: button text); glossary *Custom select* and *Shown value*, BR-05, §8, AC-05 (now also asserts "Tipo de documento" text, stored `''`, and `aria-controls` while open), §11.1 preamble defines "shows the prompt", `expectEmptyStep1`, US-03-AC-11 row, US-01-AC-07/AC-23 rows, `dom.ts` `shownValue`. **(8) AC-09:** "page behind is inert" → focus trap (Tab and Shift+Tab), backdrop, `aria-hidden="true"` on the page behind; BR-06, §8 aligned; note on what jsdom and e2e assert. **(9) `aria-controls`:** asserted only while the list is open (BR-05, AC-05, AC-06 note, §8, §11.1 AC-01 row and `dom.ts` lookup); HC3 screen reader note in §9. **(10) Week start (human decision):** BR-06, Q-12 (old "Monday" struck), §7.1, §8, §9; AC-09 keyboard outline gains a `country` column and two Colombia rows (Home → Sunday 13/05/1990, End → Saturday 19/05/1990); "Calendar names" becomes an outline with the column order per country (es-CO Sunday first, es-CL Monday first); §11 AC-09 adds the unit level. **(11) Phone keyboard:** BR-11 and an AC-12 note: HC3 phone check that the searchable select's bottom sheet fits above the on-screen keyboard; Q-11, Q-13, §9, §11 AC-12 row. **(12) Q-16:** confirmation check-circle scales and fades (transform/opacity) instead of a stroke draw; §8 row. **(13) BR-01 / AC-01:** media conditions also accept `(hover: hover)` (plus `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme`), breakpoints `min-width` only; also the `forced-colors` system colours as allowed literals and the guard's sensitivity self-test (ADR-0010 §2). **(14) AC-17:** `getAnimations()` returns an empty list; BR-10 adds the by-construction rules, and AC-17 gains a second scenario "Reduced motion by construction" (static guard, ADR-0013 §4). **Further alignments with the accepted ADRs (for the human to confirm):** step 1 lazy-loaded (`loadComponent`, ADR-0012 §7) in §2 scope, out of scope (route addresses unchanged), §9 and §11 preamble; AC-03 gains a third scenario "Country codes stay in the country-visuals map" (static guard replacing ADR-0001's review grep, ADR-0011), BR-03 and Q-02 note; BR-09 and Q-14 name the motion mechanism (ADR-0013) and allow paint-only state transitions, §9 *Performance* reworded the same way; BR-14 and an AC-21 note list the five accepted dependencies; AC-14 note (enter-only, token values); AC-23 names ADR-0010/0011; §7.1 no Strapi attribute; §7.2 file names and values; glossary token prefixes and panel breakpoint; Q-01, Q-04, Q-13 v0.2 notes; §2 skills bullet (EVAL outcome); §9 *Maintainability* uses the ADR file names; §10 lists ADR-0010..0013 as accepted with what they amend (ADR-0011 → ADR-0001, ADR-0012 → ADR-0004) and *Needed: none*; §11 short names (`calendar-dates`, `select-search`, `field-icons`, `country-visuals`) and rows AC-01, 03, 04, 07, 09, 12, 14, 17, 19. *Human answer* cells untouched; replaced default text struck through, not deleted. No ID renumbered, retired or added. Counts: 16 BR, 23 AC (0 original, 23 derived), 22 Q (none open). Review log rows pointing here added to US-01, US-02 and US-03 specs (US-04-Q-21, task US-04-T-26). |
| 2026-11-21 | Felipe Sabogal (human) | v0.2 confirmation | **Confirmed** the v0.2 alignments outside the 14 adjustments (step 1 lazy-loaded; the country-code static guard, AC-03; reduced motion by construction, AC-17; the accepted dependencies, BR-14; wording). **Accepted** the week-start fallback: where the browser exposes no Intl week data (Firefox < 153, Safari < 15.4, Chrome < 99) the calendar starts on Monday (ADR-0012 implementation note). (Translated from the Spanish session.) |
| 2026-11-22 | Felipe Sabogal (human) | HC3 round 1 | **Changes requested** (explicit instruction, CLAUDE.md §1) | After a manual QA pass on the local stack, the human asked (Spanish, excerpts): "deberia desplegarlo ahi abajo" (calendar), "si escribo la fecha mira que no me deja", "valida los inputs si son de type text, number, etcc, porque en nombre me deja escribir numero y con un maximo de caractes en cada input como lo recomiendes", "El fondo si puedes hacerlo un poco mas claro y con degradado", "agregarle flechas para regresar a un modulo anterior o si quiere cambiar quizas de colombia a chile", "[el selector de país] esta muy simple visualmente, puedes agregarle como un texto de más un header, y lo mismo del bg para todas". The main session turned this into decisions D1–D7; their concrete values are its recommendation, reviewed by the human in the HC3 QA of this round. |
| 2026-11-22 | spec-writer (Claude Opus 5.5) | v0.3 | HC3 round 1 changes; status stays `Approved` (human-directed) | **Added:** BR-17 (D1, calendar compact and below the field), BR-18 (D2, date mask, "Fecha no válida. Usa el formato dd/mm/aaaa."), BR-19 (D3, input profiles, `maxlength`, `number` as text box, seed content changes), BR-20 (D4 background `--gradient-page` on every page + D6 richer chooser), BR-21 (D5, back links, chip link, change of country, header not clipped); AC-24 (calendar placement and size), AC-25 (mask, paste, message, end-to-end typed date), AC-26 (profiles, attributes, unknown fields, hydrated value, seed rows, `fullName` pattern), AC-27 (background on six pages, gradient tokens and contrast per stop), AC-28 (back links, chip link, change of country, Tab stops, header not clipped), AC-29 (chooser header, lead, links, "Cómo funciona" list); gaps Q-23 (mask details), Q-24 (message also for optional dates), Q-25 (chooser order), Q-26 (no filter on restored values; plate upper case), Q-27 (`fullName` pattern letter class), none blocking, defaults reviewed at the HC3 QA. **Amended (old text struck, not deleted):** §1 summary note; §2 in scope (v0.3 bullet), out of scope (logic/seed bullet, in-wizard switcher note, number control note); glossary (input profile, date mask, back link, chip link); BR-06 (mask and message, calendar placement), BR-07 (explicit HC3 exception list (a)–(e); only `backend/src/seed/form-fields.ts` may change under `backend/`), BR-13 (two new Tab stops at the top of each step; covered by AC-28); AC-02 note (every stop of `--gradient-page`); AC-08 four error cells and the optional-date message, note rewritten; AC-09 note; AC-11 Strapi scenario exception and note; AC-12 1280 row and note; AC-13 header focusability line; Q-05, Q-07, Q-17 v0.3 notes in the proposed-default column (*Human answer* cells untouched); §7.1 seed changes table (no schema change); §7.2 input-profile map and profile table; §8 eight new state rows; §8.1 new strings (listed exactly) and reused strings; §9 accessibility and multi-country notes; §10 ADR-0014 needed (amends ADR-0012 and ADR-0010); §11 rows AC-24..AC-29; new §11.1.1 with the complete list of existing tests that change. No ID renumbered or retired. Counts: 21 BR, 29 AC (0 original, 29 derived), 27 Q (Q-23..Q-27 open, non-blocking). |
| 2026-11-22 | spec-writer (Claude Opus 5.5) | v0.3 clarifications (review R3, step 7) | Clarifications; version stays 0.3, status stays `Approved` | Decisions relayed by the main session for the findings of [review R3](../../reviews/US-04-review-R3.md); for the human to confirm at the HC3 QA of this round. **(1) US-04-R3-F01, mid-text edits of the typed date:** BR-18 gains a "v0.3 clarification" paragraph and Q-23 a note in its proposed-default column (*Human answer* cell untouched): an on-screen `/` is never treated as newly typed; only a `/` typed at the end pads; any other edit re-derives the text from the digits in order (max 8) with `/` after the 2nd and 4th digit, caret placed after the same number of digits; an insertion into a full 8-digit text is ignored; so an edit never silently yields a different complete date (examples "15/05/1990" → Backspace after the month's "5" → "15/01/990"; "1" over a selected day → "10/51/990"). **(2) US-04-R3-F02, IME composition:** BR-19 gains a "v0.3 clarification": no filtering, case change or value/caret rewrite while a composition is active; the filter applies once to the committed text at `compositionend` (composing "abc" in the plate → "ABC"; a dead-key "é" is kept). **(3) US-04-R3-F06:** §11.1.1 component table gains the US-03-AC-16 tab-order row (`summary-dom.ts` `tabStops()` names links; the expected order now starts with "Cambiar país (actual: Colombia)", "Volver a planes"; commit `84e17aa`), and the "Not affected" note now says it covers only the e2e keyboard tests. **(4) Editorial:** metadata and §10 record ADR-0014 as Accepted by the human, 2026-11-22 (`6b52ac2`). **(5) US-04-R3-F05 (other files):** `specs/US-01/seed-fields.md` updated to the seed of `bd2fe3e`; US-01 spec Review log row pointing to v0.3 / ADR-0014; T-40 done; `tasks.md` Status block brought up to date and fix tasks T-41..T-48 added for R3-F01..F08. AC-25 and AC-26 Gherkin unchanged: the clarifications are verified under those AC IDs (unit rows for mid-text Backspace, Delete and select-and-replace of day and month plus one e2e, as R3-F01 asks; a component test that dispatches composition events, as R3-F02 asks). No ID added, renumbered or retired. Counts unchanged: 21 BR, 29 AC (0 original, 29 derived), 27 Q. |
| 2026-11-22 | spec-writer (Claude Opus 5.5) | v0.3 alignment and clarification (review R4, step 7) | Editorial alignment with an accepted ADR (F04) and a clarification (F05); version stays 0.3, status stays `Approved` | [Review R4](../../reviews/US-04-review-R4.md) finding **US-04-R4-F04** (nit): BR-18 said a separator typed after a one-digit group shows "05/" and that one typed after a complete group "shows `/` once", which contradicts ADR-0014 §2 (Accepted; precedence per CLAUDE.md §1): a `/` is shown only once the next group has a digit and never trails. The code and the unit tests already follow the ADR. **BR-18:** "and shows `/` ("5/" → "05/")" and "shows `/` once" struck; now "5/" → "05" and "15/" → "15", plus an alignment sentence (keys "5/" show "05"; a further "5" shows "05/5"). **Q-23** proposed-default column: same strike and replacement (*Human answer* cell untouched). AC-25 needs no change: its rows only show full texts ("5/5/1990" → "05/05/1990", "150" → "15/0"), which agree with both wordings. The matching comment in `frontend/src/app/shared/date-text.spec.ts` (around line 259) is test code, outside the spec-writer's scope (test-engineer). **US-04-R4-F05** (nit; decision relayed by the main session, for the human to confirm at the HC3 QA of this round): BR-18 gains a "v0.3 clarification" for IME composition in the date text box, mirroring BR-19's: no mask, text or caret rewrite while a composition is active; one mask pass on the committed text at `compositionend` (examples: committed "15" → "15", "1a5" → "15"). This specifies behaviour the code already has (`DateField`, `ac8c0a1`) and that R4 found untested; it is verified under US-04-AC-25 (task T-54), AC-25 Gherkin unchanged. No ID added, renumbered or retired. Counts unchanged: 21 BR, 29 AC (0 original, 29 derived), 27 Q. |
| 2026-11-22 | Felipe Sabogal (human) | HC3 round 2 | **Changes requested** (explicit instruction, CLAUDE.md §1) | After reviewing HC3 round 1 on the local stack (review R5 APPROVED, `af831aa`), the human asked (Spanish, verbatim): "al header dale un estilo mas novedoso y con tonos acorde a las pantallas, y crea un favicon." The main session turned this into decisions D8 (header) and D9 (favicon and app icons); their concrete values are its recommendation, reviewed by the human in the HC3 QA of round 2. |
| 2026-11-22 | spec-writer (Claude Opus 5.5) | v0.4 | HC3 round 2 changes; status stays `Approved` (human-directed) | **Added:** BR-22 (D8: translucent token header with `backdrop-filter`, solid / reduced-transparency / forced-colors fallbacks, `--gradient-header-edge` bottom edge with the country accent as decoration only, decorative brand mark, product name in Archivo with AA over the backdrops, chip semantics of BR-21 kept, height = `--size-header-height`, no clipping, no motion), BR-23 (D9: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` 180 × 180, `theme-color` = header solid token, Angular `favicon.ico` removed, served by the web container with the right content type); AC-30 (surface, edge, accent, mark, name, contrast rows, chip, height and clipping at three viewports, reduced transparency, no-support fallback, forced colors, no motion, tokens), AC-31 (index.html links and meta, file checks, GET from the web container with status, content type and length, same origin); gaps Q-28 (worst-case contrast under the translucent header), Q-29 (no "Cambiar" hint), Q-30 (PNG fallback, delete `favicon.ico`), none blocking, defaults reviewed at the HC3 QA of round 2. **Amended:** metadata; §1 summary note; §2 in-scope v0.4 bullet; glossary (app header, brand mark, header solid fallback); BR-01 (`prefers-reduced-transparency` and `@supports` on `backdrop-filter` allowed by the guard; covered also by AC-30); BR-16 (original brand mark allowed; covered also by AC-30, AC-31); §7.2 note (no map change); §8 four state rows; §8.1 "no new copy"; §9 accessibility and performance notes; §10 "no new ADR expected" (within ADR-0010, 0011, 0013, 0014; guard-list extension noted for the architect); §11 rows AC-30, AC-31; new §11.1.2 (no existing test expected to change; R5-F02 comment fix). No ID renumbered or retired. Counts: 23 BR, 31 AC (0 original, 31 derived), 30 Q (Q-23..Q-30 open, non-blocking). |
| 2026-11-22 | spec-writer (Claude Opus 5.5) | v0.4 alignment (review R6, step 7) | Alignment with review findings; version stays 0.4, status stays `Approved` | Findings of [review R6](../../reviews/US-04-review-R6.md) (verdict APPROVED, conditional on gate attempt 6). **US-04-R6-F01** (minor; accepted by the main session, for the human to confirm at the HC3 QA of round 2): the worst-case backdrop under the translucent header is pure white `--primitive-white` (top stop of `--gradient-button-primary`, Chile flag white), not `--primitive-ink-50`. Q-28 *Gap/Why* and *Proposed default* columns: "ink-50" struck and replaced, plus a v0.4 alignment note with R6's figures (*Human answer* cell untouched). AC-30 "Product name and chip contrast": the third backdrop is now `--component-header-bg` composited over `--primitive-white`; note under AC-30 updated. **US-04-R6-F06** (nit): the AC-30 backdrop table and Q-28 name the backdrops as in `contrast-pairs.json`: `--component-header-bg-solid`, `header-bg-over-page-lightest`, `header-bg-over-white`, and say the last two are computed pseudo-backdrops of the contrast evaluator, not tokens. **US-04-R6-F05** (nit): AC-31 "The icon files" and BR-23: no external reference, except the SVG namespace declaration `xmlns="http://www.w3.org/2000/svg"`; no other "http" or "//", and no `href`/`xlink:href` other than a local `#id` (the AC-31 `Then` line split in two). **US-04-R6-F04** (minor): §11.1.2 "Expected: none" struck and replaced by the actual changes of `a837b97` (three `wizard-chrome.spec.ts` lookups `a svg`; the AC-02 gradient-row filter and `bgColours()` pseudo-backdrops in `contrast.spec.ts`; `prefers-reduced-transparency` in the `design-guards.ts` allowed media features), with why each keeps its strength; the `--color-surface-raised` rows stay; the R6 step 7 test changes noted. **US-04-R6-F02** (minor): `tasks.md` Status block, T-59..T-65 and R6 fix rows T-68..T-73 (no spec change). No ID added, renumbered or retired. Counts unchanged: 23 BR, 31 AC (0 original, 31 derived), 30 Q. |
