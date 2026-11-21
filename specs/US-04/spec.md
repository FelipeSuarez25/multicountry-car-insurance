# US-04 — Design system and visual redesign · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (English translation of the human's request, not edited; the human confirms the translation at HC1) |
| Status | Approved |
| Version | 0.2 |
| Author | spec-writer subagent (Claude Opus 5.5) |
| Approved by | v0.1: Felipe Sabogal, 2026-11-21 (HC1 round 1). v0.2: applies the ADR-driven adjustments 1–14 and the week-start decision that the human approved at that same HC1 (§13); the further alignments with the accepted ADR-0010..0013 listed in the v0.2 row of §13 are for the human to confirm. |
| Related ADRs | [ADR-0001](../../adr/0001-multi-country-content-strategy.md) (amended by ADR-0006 and [ADR-0011](../../adr/0011-country-visuals-amends-adr-0001.md)), [ADR-0003](../../adr/0003-wizard-state-persistence.md) (stored values unchanged), [ADR-0004](../../adr/0004-forms-library.md) (amended by [ADR-0012](../../adr/0012-accessible-select-and-date-picker.md)), [ADR-0009](../../adr/0009-terms-rich-text-rendering.md) (heading hierarchy), [ADR-0010](../../adr/0010-design-tokens-and-visual-language.md) (tokens and visual language), ADR-0011 (country visuals), ADR-0012 (select and date picker, lazy step 1), [ADR-0013](../../adr/0013-motion-and-reduced-motion.md) (motion and reduced motion). All Accepted; none needed (§10). |

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

**Out of scope**

- Any change to route addresses (step 1 only becomes lazy-loaded, above), guards, the wizard state, validation rules or messages, prices, masking,
  payment simulation, or the Strapi schema, seed, permissions and proxy (story: "Logic, the
  contracts with Strapi and the texts that come from Strapi do not change").
- Rewriting help texts, placeholders or error messages that come from Strapi (US-04-Q-07).
- A light theme or a theme switch (US-04-Q-01; ADR-0010: dark only).
- An in-wizard country switcher (US-01-Q-02 stands).
- Changing the native `number`, `text`, `checkbox` and `radio` controls into custom widgets; they
  are restyled only.
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

## 4. Business rules

| ID | Original (story) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-04-BR-01 | "Tokens as CSS custom properties in a single source file (color, typography, spacing, radii, shadows, gradients, animation durations and easing curves, z-index). Primitive → semantic → component tokens. No loose values in components." | Exactly one file, `frontend/src/styles/tokens.css` (ADR-0010 §1), declares custom properties and `@font-face`, in three tiers with distinct prefixes (`--primitive-`; the semantic prefixes of ADR-0010 §1; `--component-`). Every other style file (`styles.css` and every component `.css`) uses only `var(--…)` for colour, font family, font size, font weight, line height, letter spacing, spacing (margin, padding, gap), radius, border width, shadow, gradient, duration, easing and z-index. Allowed literals: `0`, `auto`, `none`, `inherit`, `initial`, `unset`, `currentColor`, `transparent`, the `forced-colors` system colours (`Canvas`, `CanvasText`, `LinkText`, `Highlight`, `HighlightText`, `ButtonText`, `ButtonFace`, `GrayText`), percentages, `fr`, unitless `1`, keyword values, and breakpoints inside `@media`/`@container` conditions (custom properties cannot be used there), each a `min-width` equal to a `--breakpoint-*` value of the token file. The only other media features allowed in conditions are `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme` and `(hover: hover)` (ADR-0010 §2, ADR-0013 §2). Component styles reference semantic or component tokens, never primitives. Enforced by a static guard with a sensitivity self-test (ADR-0010 §2). | US-04-AC-01 |
| US-04-BR-02 | "Subtle gradients in backgrounds, headers and the primary button, making sure the text on top meets WCAG AA contrast." Rules: "AA contrast". Brief: dark near-black background, violet accent, recommended card gradient, gradient display headings, white primary buttons. | Theme: dark only (US-04-Q-01, ADR-0010 §3). Every text/background token pair used in the UI meets WCAG 2.2 AA: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold) and for UI component boundaries, focus indicators and meaningful icons against adjacent colours. Over a gradient, the ratio holds at **every** gradient stop; over the dotted texture, it holds against the background with the dot colour composited at its opacity (worst case). The 3:1 boundary minimum applies to controls and **interactive** cards (plan cards); non-interactive panels (summary sections) may use a decorative hairline below 3:1, which WCAG 1.4.11 does not require to reach 3:1 (ADR-0010 §4). Gradient text has a solid-colour fallback used under `forced-colors: active`. Palette and gradients per ADR-0010 §4; country accents per ADR-0011 (US-04-Q-03). | US-04-AC-02, US-04-AC-23 |
| US-04-BR-03 | "Flags of Colombia and Chile in SVG (a licensed library or our own optimized SVGs), visible in the country selector/context and in the wizard header. A per-country accent color through tokens. The flag is decorative next to the country name (`aria-hidden`), never the only indicator." | The country chooser links and the wizard header show the flag SVG of the country next to its Strapi `name`. The flag is `aria-hidden="true"`, has no text content and is not focusable; the link's accessible name stays the country name ("Colombia", "Chile"). The country accent token takes the current country's value on the wizard pages; a published country with no flag or accent in the front end shows a neutral globe icon and the brand accent (US-04-Q-02). Mechanism: the presentation-only map `frontend/src/app/shared/country-visuals.ts` keyed by ISO code, returning a flag component and an accent key, never a colour (ADR-0011, which amends ADR-0001). Quoted country codes appear in production `.ts`/`.html` only in that file, and `data-country-accent` selectors only in `tokens.css`; a static guard enforces it, replacing ADR-0001's review grep (ADR-0011 *Confirmation*). No behaviour, validation, routing, guard, price, copy or request reads the map. | US-04-AC-03 |
| US-04-BR-04 | "Icons: a single library with SVG icons imported individually … inside the inputs (document, name, date, city, plate, make, model, year), in the wizard steps, in the plans, in help, error and success messages. The input icon comes from a front-end mapping by field key, with a generic default icon for new fields … Decorative icons `aria-hidden`; icons that carry meaning have a label." | One icon library, icons imported one by one (no full-set import, no icon font, no runtime fetch): `@lucide/angular` 1.77.0, ISC (US-04-Q-09, ADR-0010 §7). Step 1: every `text`, `number`, `select` and `date` field shows the icon mapped from its `key` (§7.2), or the default icon for any other key; `checkbox` fields show none. Icons in steps, plan lists (check-circle), help, error and success messages. Every icon that sits next to text saying the same thing is decorative: `aria-hidden="true"`, not focusable, no `<title>` and no text content, so no accessible name or `textContent` of a control changes. An icon without adjacent text (an icon-only button) has an accessible name from §8.1. | US-04-AC-04, US-04-AC-20 |
| US-04-BR-05 | "Select: our own dropdown in the design system's style, with an icon, search when the list is long (e.g. cities, makes), and the selected option marked." "Built on accessible primitives, not from scratch … Full accessibility per the WAI-ARIA patterns (combobox/listbox …): arrows, Enter, Escape, Home/End … screen-reader announcements." | Every `select` field renders a custom select following the WAI-ARIA combobox pattern with a listbox popup (select-only below the search threshold, editable with list filtering at or above it, US-04-Q-11). The element that takes focus is the element the field's `<label for>` points at (a `<button>` for a select-only, an `<input type="text">` for a searchable select, ADR-0012 §3, so `label.control`, `getByLabel` and `labels[0]` keep working) and carries `role="combobox"`, `aria-expanded`, `aria-required`, `aria-invalid` and `aria-describedby` as the native control did, plus `aria-controls` referring to the listbox **while the list is rendered** (`@angular/aria` omits it while collapsed, at least before the first open; ADR-0012 *Consequences*; checked with a screen reader at HC3). Empty, the prompt "Selecciona una opción" is its shown value: the button's text for a select-only, the placeholder for a searchable select (whose input value is then `''`). The prompt is not an option (supersedes the "first entry is a non-selectable prompt" wording of US-01-BR-02, US-04-Q-04). The listbox contains exactly the configured options in `sortOrder`; the selected option is marked visually (check icon + style) and with `aria-selected="true"`. Choosing an option stores its `value` (unchanged). Keyboard per US-04-AC-06; built on `@angular/aria` 22.3.0 and `@angular/cdk` 22.3.0 (US-04-Q-04, ADR-0012). | US-04-AC-05, US-04-AC-06, US-04-AC-07, US-04-AC-12 |
| US-04-BR-06 | "Calendar (birth date): our own date picker with month navigation and fast year navigation (a year selector …), days disabled according to the rules (minAge), and the date can also be typed by hand." Same accessibility clause as BR-05: "date picker dialog … focus trapped and returned on close". | Every `date` field renders a text box (the labelled control) and an "Elegir fecha" button that opens the calendar (WAI-ARIA date picker dialog). Typed entry: format dd/mm/aaaa for every country, independent of the browser locale, parsed and stored as ISO `YYYY-MM-DD` (US-04-Q-05). Text that is not a complete, existing date is treated exactly like the former `validity.badInput` (US-01-BR-01, US-01-AC-09 note): stored `''`, text kept visible, field invalid whether required or optional, same message resolution. Calendar: month navigation, year selector, keyboard per US-04-AC-09, a CDK modal dialog (ADR-0012 §4) with focus trapped while open, a backdrop, the page behind hidden from assistive technology (`aria-hidden="true"`), and focus returned to "Elegir fecha" on close. The first day of the week (grid column order and the week bounds of Home/End) follows the country's locale (`localeTag`) from CLDR week data: Sunday for es-CO, Monday for es-CL. It is derived from the locale at runtime, with no country code or per-country table in the date picker (human decision at HC1, 2026-11-21). A day is disabled if and only if the shared validator of the field (the same pure function used for validation, no second implementation) rejects that date for a reason other than "required" (with the seed's `minAge` 18: every day after the 18th anniversary limit and every future day). Disabled days can still be typed; typing one shows the configured message (validation unchanged). | US-04-AC-08, US-04-AC-09, US-04-AC-10, US-04-AC-12 |
| US-04-BR-07 | "Validations and the stored value do not change." "Logic, the contracts with Strapi and the texts that come from Strapi do not change; it is a visual change. The existing e2e tests must keep passing without being loosened; if a selector changes, it is adjusted using accessible roles/labels, not CSS classes." | For the same user input, the editing model, the `quote-wizard` entry, the typed step 1 output, the error shown, the focus target on a failed "Continuar", the routes, the prices, the summary and the payment behave exactly as before US-04. No file under `backend/` changes. Every existing unit, component and e2e test passes; a test changes only as listed in §11.1, where each change keeps or raises the assertion's strength and finds elements by role, label or visible text (never by class or id). | US-04-AC-11 |
| US-04-BR-08 | "Supporting text: clear microcopy in help texts, placeholders, empty states and errors … Business content keeps coming from Strapi; only interface texts live in the front end." | Front-end copy added by US-04 is exactly §8.1 (Spanish, same for both countries). Existing code-owned strings (US-01..US-03 §8.1) and every Strapi text stay unchanged (US-04-Q-07). Day and month names come from `Intl` with the country's `localeTag`, not from literals. | US-04-AC-07, US-04-AC-09, US-04-AC-11, US-04-AC-13 |
| US-04-BR-09 | "Interactions and animation: an animated wizard step indicator, transition between steps, hover/focus/active/disabled states, validation with soft feedback, skeletons while Strapi loads, plan selection with interactive cards, and a summary with micro-animations." | Step indicator per US-04-Q-17 (not focusable, current step exposed with `aria-current="step"`). Step change: enter-only transition of the arriving page (no two pages in the DOM at once), focus on the arriving `h1` as today (US-04-Q-14). Every interactive control has distinct hover, focus-visible, active and disabled (including `aria-disabled`) styles. Soft feedback: an error appears with a short fade and its icon, no shaking, no colour-only signal. Skeletons replace the loading text visually on step 1, step 2, the terms region and the country list, while the existing loading text stays in its live region (US-04-Q-15). Plan cards: a pointer click anywhere on a card chooses its plan; the native radio stays the keyboard and accessibility control. Summary and confirmation micro-animations per US-04-Q-16. Mechanism: Angular native `animate.enter` and CSS on the duration and easing tokens, no animation library, no `animate.leave` on pages (ADR-0013). Movement uses `transform` and `opacity` only; state changes may transition paint-only properties (colours, border colour, shadow); the 2 px card lift on hover applies only under `(hover: hover)`. | US-04-AC-13, US-04-AC-14, US-04-AC-15, US-04-AC-16, US-04-AC-23 |
| US-04-BR-10 | "Everything honors `prefers-reduced-motion`: no movement if the user asks for it." | With `prefers-reduced-motion: reduce`, every CSS animation and transition and every Angular enter/leave animation has a computed duration of 0 s (or none), `document.getAnimations()` is empty, and no element changes position, size or rotation over time (skeleton shimmer, step transition, panel slide, indicator fill, spinner, micro-animations all off). States still change instantly. By construction (ADR-0013 §3): outside `tokens.css` every `animation*`/`transition*` declaration sits inside `@media (prefers-reduced-motion: no-preference)`; `tokens.css` sets every `--duration-*` and `--delay-*` to `0ms` under `reduce`; every CDK overlay and dialog is created with `disableAnimations: true`. A static guard checks the three. | US-04-AC-17 |
| US-04-BR-11 | "Responsive, mobile-first: … at least 360×740, 768×1024 and 1280×800, with no horizontal scroll, touch targets of at least 44×44 px, and a layout that reorganizes (for example, plans in a column on mobile and in a grid on desktop)." | At each of the three viewports, on every page and with a select panel or the calendar open: `document.documentElement.scrollWidth ≤ window.innerWidth`; every interactive element (link, button, combobox, text box, option, calendar day, and for a native checkbox or radio the box of the input together with its `<label>`) has a hit box of at least 44 × 44 CSS px. Styles are written mobile-first (base styles for the narrowest width, `min-width` queries upward). Plans: one column at 360 px, at least two columns at 1280 px. This raises the 24 × 24 px of US-01-AC-26, US-02-AC-18 and US-03-AC-18 to 44 × 44 (US-04-Q-18). On a phone, a searchable select's bottom sheet fits above the on-screen keyboard: the search input, the active option and at least one option row stay visible while the keyboard is up (manual HC3 phone check, AC-12 note; ADR-0012 *Spec impact* 5). | US-04-AC-12, US-04-AC-18 |
| US-04-BR-12 | "Typography: at most 2 families, loaded efficiently." | At most two `@font-face` families (Archivo and Atkinson Hyperlegible Next, ADR-0010 §5, US-04-Q-08). Each family is **one variable WOFF2 file** (latin subset), self-hosted on the app origin (`/fonts/…`), `font-display: swap`; "at most the weights the type scale uses" means each `@font-face` `font-weight` descriptor is limited to the range the scale uses (Archivo `700 800`, Atkinson Hyperlegible Next `400 700`), not one file per weight. `font-family` declarations name at most those two families plus a system fallback stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) of **local** fonts that are never downloaded; the fallback names are not counted as families. No request to a third-party origin at runtime for fonts, icons, flags or styles. | US-04-AC-19 |
| US-04-BR-13 | "Accessibility: visible focus everywhere, tab order intact, AA contrast, heading hierarchy per ADR-0009." | Every focusable element shows a focus indicator drawn on the focused element itself (outline or box-shadow, ≥ 3:1 against adjacent colours). The Tab order of every page is the one of US-01-AC-24, US-02-AC-16 and US-03-AC-16, plus only the "Elegir fecha" button after each date text box; the wizard header and the step indicator add no Tab stop. Each page keeps exactly one `h1` (the step heading), the existing `h2`/`h3` levels and the ADR-0009 terms levels; visual size comes from tokens and never changes a heading level; header, indicator, panels and calendar add no heading element. | US-04-AC-06, US-04-AC-09, US-04-AC-20 |
| US-04-BR-14 | "Exact versions of any new dependency, license reviewed." | Every new dependency is added with `npm install -E`, has an exact version in `frontend/package.json`, is listed in the relevant ADR with its version, license and justification, and its license is permissive (MIT, ISC, Apache-2.0, BSD, OFL-1.1 for fonts) unless the human accepts another. Accepted additions: `@lucide/angular` 1.77.0 (ISC), `@fontsource-variable/archivo` 5.3.0 (OFL-1.1), `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0 (OFL-1.1) (ADR-0010); `@angular/cdk` 22.3.0 (MIT), `@angular/aria` 22.3.0 (MIT) (ADR-0012). No animation library (ADR-0013). | US-04-AC-21 |
| US-04-BR-15 | "Evidence in `docs/qa/US-04/`: before/after screenshots of CO and CL at the three sizes, for every wizard step, including the select and the calendar open." | `docs/qa/US-04/after/` holds the same file set as `before/` (same names) plus the country chooser, the select panel open and the calendar open, for CO and CL at the three sizes (US-04-Q-19). | US-04-AC-22 |
| US-04-BR-16 | "Do not copy brands, logos, names or texts of any real insurer." | No logo, brand name, slogan, illustration or text of any real company appears in the code, assets or screenshots; the reference screenshots are not stored. The header shows only the existing generic product name "Cotizador de seguro de auto". | US-04-AC-23 |

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
    | es-CO  | 29/02/2001   | 29/02/2001   |            | "Ingresa tu fecha de nacimiento." |
    | es-CO  | 31/04/1990   | 31/04/1990   |            | "Ingresa tu fecha de nacimiento." |
    | es-CO  | 15/05/199    | 15/05/199    |            | "Ingresa tu fecha de nacimiento." |
    | es-CO  | 15/05/90     | 15/05/90     |            | "Ingresa tu fecha de nacimiento." |
    | es-CO  | 01/03/2010   | 01/03/2010   | 2010-03-01 | "Debes ser mayor de edad (18 años o más) para cotizar." |

Scenario: A stored date is shown in the display format
  Given the wizard state holds "1990-05-15" for "birthDate" in Colombia
  When step 1 is shown
  Then "Fecha de nacimiento" shows "15/05/1990" with no error

Scenario: An unreadable optional date blocks "Continuar"
  Given Colombia also has the optional date field "Fecha de revisión" (key "inspectionDate", errorMessage "Ingresa una fecha válida.")
  And every other field holds a valid value
  When I type "10/13/2026" in "Fecha de revisión" and activate "Continuar"
  Then I see "Ingresa una fecha válida." next to it, I stay on step 1, the focus is on "Fecha de revisión"
  And the wizard state holds "" for "inspectionDate"
```

An empty stored value with text in the box (rows with an empty `stored`) is the former
`badInput` case: required fields show `requiredMessage` if configured, else `errorMessage`;
optional fields show `errorMessage` or "Revisa este campo." (US-01-AC-09 note, unchanged).
"Fecha de revisión" is a test fixture, as in the existing component test.

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
```

The stored `vehicleYear` is the string of the editing model (ADR-0004, ADR-0003). The test-engineer
confirms the exact stored object on `main` before writing the expectation.

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
    | 1280 × 800 | Elegir fecha        | a popover anchored to the date field |
```

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
  And neither the indicator nor the header contains a focusable element or a heading

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
before; README limitation).

### US-04-AC-23 — Visual quality and originality (derived from US-04-BR-02, BR-09, BR-16)

```gherkin
Scenario: Visual quality and originality
  When the human reviews the after screenshots and the running app at HC3, in CO and CL, at the three sizes
  Then the visual language follows ADR-0010 (theme, palette, gradients, type scale, icons, flags) and ADR-0011 (country accents)
  And the recommended plan card, display headings, primary buttons and segmented toggles look as ADR-0010 describes
  And hover, active, disabled and soft-feedback states and the micro-animations behave as described in §8
  And no logo, name, slogan or text of a real company appears
```

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
| US-04-Q-05 | **[Blocks HC1]** Date typed entry: format, accepted variants, how it maps to ISO, and what an incomplete or impossible date does. | Changes the US-01-AC-24 keyboard path (today: segments typed in the browser locale) and the R3-F01 tests; must keep the `badInput` semantics. | dd/mm/aaaa for every country, independent of browser locale; accepted: `d/m/yyyy` with `/`, `-` or `.` separators (1–2 digit day and month), or exactly 8 digits `ddmmyyyy`; 4-digit year only. Re-displayed as dd/mm/aaaa on leaving the field. Incomplete, impossible (31/04, 29/02 of a non-leap year) or 2-digit-year text → stored `''`, text kept, invalid with the existing message rules (no new validation message; a more specific "Ingresa una fecha válida (dd/mm/aaaa)." would be a validation-copy change and is not proposed). Placeholder and hint "dd/mm/aaaa" are code-owned (§8.1); the hint is part of the accessible description. No input mask that inserts characters while typing. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-06 | **[Blocks HC1]** "Existing e2e tests keep passing without being loosened": which assertions change, and is the rewrite of §11.1 acceptable? Some tests assert native elements by definition (component test "every field type renders its native control": `tagName: 'SELECT'`, `type: 'date'`; `HTMLSelectElement.options`; `toHaveValue('CC')` on a select; native date segments in `en-US`). | Without an explicit list, the test-engineer would guess, and a silent weakening (for example `allControls()` no longer seeing selects, so `invalidControls()` misses them) would go unnoticed. | Approve §11.1 as the complete list. Rule: each replaced assertion asserts both what the person sees (shown value, role, name, state) and what is stored (`quote-wizard` value), so it is at least as strong; no test is deleted without a replacement; helpers find custom controls by role (`combobox`, `option`, `dialog`, `grid`, `gridcell`), never by class or id. | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-07 | **[Blocks HC1]** The story asks for "clear microcopy in help texts, placeholders, empty states and errors" but also says "the texts that come from Strapi do not change". Help texts, placeholders and field errors come from Strapi. | Scope: a seed change would touch `backend/` and the Strapi texts asserted by tests. | Strapi texts (help, placeholders, field errors, labels, plans, terms) are **not** changed. US-04 adds only code-owned interface copy (§8.1: search, calendar, date hint, step indicator, header, sheet close). Existing code-owned strings (empty and error states of US-01..US-03) also stay unchanged, because tests assert them and they were approved. Better Strapi copy is a later content task for editors. Alternative: revise seed help texts and placeholders in this story (backend change, test updates). | OK as proposed. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-08 | **[ADR]** The two font families and how they are loaded. | BR-12; performance; licence. | A display family for headings and a text family for everything else, both OFL-1.1 variable fonts, self-hosted as WOFF2 subsets (Latin + Latin-1 for Spanish) from the app origin, `font-display: swap`, the text font preloaded. ~~Candidates for the ADR: display "Sora" or "Space Grotesk", text "Inter".~~ Source either `@fontsource-variable/*` npm packages (pinned) or committed files with the OFL text. No Google Fonts or other CDN. **v0.2:** replaced by ADR-0010 §5: display **Archivo** (`wght` and `wdth` axes), text **Atkinson Hyperlegible Next**, from `@fontsource-variable/archivo` 5.3.0 and `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0, one latin-subset variable WOFF2 file per family copied to `/fonts/`, weight ranges limited to the scale, text face preloaded, local system fallback stack (BR-12). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-09 | **[ADR]** Icon library, exact version, licence, import style; the field-key → icon map and the default icon. | BR-04; bundle size; Angular 22 compatibility. | ~~`lucide-angular` (ISC) at an exact version the architect verifies against `@angular/core` 22.3.0 peer ranges; alternative `lucide-static` SVGs inlined at build time if the Angular wrapper lags.~~ **v0.2:** **`@lucide/angular` 1.77.0** (ISC), ADR-0010 §7: `lucide-angular` is deprecated and its peer range (`@angular/core` 13.x–21.x) does not accept Angular 22. The map below is kept, as Lucide components (`LucideIdCard`, …, default `LucidePencilLine`; AC-04). Individual imports only. Map (lucide names, verified in the ADR): `documentType` id-card, `documentNumber` hash, `fullName` user, `birthDate` calendar, `city` map-pin, `plate` rectangle-horizontal, `make` car, `model` car-front, `vehicleYear` calendar-range; default `pencil-line`. Messages: help `info`, error `circle-alert`, success `circle-check`; plan lists `circle-check`. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-10 | Flag source and licence. | BR-03; licence and size. | Our own optimised SVGs (~~national flags are public-domain designs~~ **v0.2:** drawn from the official constructions, that is the proportions and geometry; no law fixes the flag colours, so the colour values are published approximations, ADR-0010 §8 and ADR-0011; Colombia three bands 2:1:1; Chile two bands, blue canton, white star), each < 1 kB, inline, `aria-hidden`. Alternative: `flag-icons` (MIT), larger and brings every country. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-11 | Select search: threshold, matching, empty result. | BR-05; the story's examples (cities, makes) have 4–5 options in the seed. | Search when the field has **4 or more** options (seed: cities 4 and makes 5 searchable, "Tipo de documento" 2 not), as one constant. Matching: option label contains the typed text, case- and accent-insensitive; order kept; first match active. Empty result: "No encontramos opciones para «texto»." Result count announced politely ("1 opción" / "N opciones"). Escape or leaving restores the shown value. **v0.2:** `SEARCH_THRESHOLD = 4` in `select-search.ts` (ADR-0012 §2); on phones, the HC3 check of AC-12 (sheet above the on-screen keyboard). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-12 | Calendar details: year range, initial month, week start, disabled days for fields without `minAge`, buttons. | BR-06; AC-09, AC-10. | ~~Week starts Monday;~~ **v0.2 (human decision at HC1):** the first day of the week follows the country locale from CLDR (Sunday for es-CO, Monday for es-CL), derived from the `localeTag`, with no country code in the date picker (BR-06, AC-09). Names from `Intl` with the country `localeTag`. Year selector range: with `minAge` N, from Y−120 to the year of the latest valid date; without it, Y−120 to Y+10 (Y = year of today, injectable clock). Initial focus: the stored date if valid, else the latest valid date (with `minAge`), else today. Buttons "Elegir año", "Mes anterior", "Mes siguiente", "Cerrar"; selection by click, Enter or Space on a day (no "Aceptar" button). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-13 | Mobile panel: bottom sheet or full screen, and the breakpoint. | BR-05, BR-06, AC-12. | Bottom sheet below **600 CSS px** viewport width (360 → sheet; 768 and 1280 → anchored popover), max 85% of the viewport height, scrollable list, backdrop, "Cerrar" button, option rows ≥ 48 px. Full screen is not used. **v0.2:** the breakpoint is the token `--breakpoint-sheet` (37.5em = 600 px, ADR-0010 §6); placement by CDK position strategies (ADR-0012 §3); the sheet must fit above the on-screen keyboard (AC-12 HC3 phone check). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-14 | **[ADR]** Motion approach and the step transition. | BR-09, BR-10; bundle weight and maintenance. | Angular native `animate.enter` / `animate.leave` with CSS keyframes and transitions driven by duration and easing tokens; no animation library (Motion or GSAP add weight for effects CSS covers). Step transition is **enter-only** (fade + 8 px rise, "base" duration) so only one page is ever in the DOM; router `withViewTransitions()` is an alternative for the ADR. Reduced motion: duration tokens set to `0ms` and keyframes disabled under the media query. **v0.2:** decided as proposed by ADR-0013 (option A, enter-only step transition); reduced motion is applied by construction (animations declared only inside `prefers-reduced-motion: no-preference`, tokens `0ms` under `reduce`, CDK `disableAnimations: true`; BR-10, AC-17). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-15 | Skeletons: where, and what happens to the loading text that tests assert. | BR-09; AC-15; existing tests assert "Cargando…" texts. | Skeletons on step 1 (field-shaped blocks), step 2 (three card shapes), the terms region and the country list; `aria-hidden`; static under reduced motion. The existing loading text stays in its live region (visually hidden next to the skeleton), so no test or announcement changes. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-16 | Which screens get micro-animations, and which effects? | BR-09; must not interfere with announcements or tests. | Step indicator fill; select and calendar panel open/close; error text fade-in; plan card hover lift and choose (border and glow); summary sections fade in with a short stagger (≤ 400 ms total); "Pagar" processing spinner; confirmation check-circle ~~draw~~ **v0.2:** scale and fade (scale 0.85 → 1 with opacity, `--duration-slow`; `transform`/`opacity` only, since a stroke draw animates `stroke-dashoffset`; ADR-0013 §2). No counting-up of prices or changing numbers (screen readers would read intermediate values). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-17 | Step indicator and wizard header: labels, interactivity, confirmation state, contents. | BR-09, BR-13; Tab order tests (US-03-AC-16) must not change. | Indicator steps "Tus datos", "Plan", "Resumen y pago"; not interactive (no links back; "Atrás", "Editar mis datos" and "Cambiar plan" remain the ways back); `aria-current="step"`, visually hidden "Paso n de 3" and "completado"; on the confirmation all completed. Header: the text "Cotizador de seguro de auto" (not a heading, not a link) and the country chip (flag + Strapi country name); no focusable element. Shown on the wizard pages, not on the chooser or the unknown-country page. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-18 | 44 × 44 px targets: everywhere, and what about earlier ACs that said 24 × 24? | BR-11; US-01-AC-26, US-02-AC-18, US-03-AC-18 are manual ACs with 24 × 24. | 44 × 44 for every interactive element, measured as in BR-11; it supersedes the 24 × 24 of those ACs, and AC-18 automates it. No exception for inline links (there are none in the wizard today). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-19 | Evidence: which files, who captures them, and the missing "before" of the country chooser. | BR-15; the before set has no chooser page and could not show native popups open. | The orchestrator captures `after/` with the same script and data as `before/`, plus `00-paises-*` in both sets (the "before" chooser captured from `main` before implementation starts, task US-04-T-06). Names per AC-22. README updated with the after table. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-20 | Automated accessibility scan: add `@axe-core/playwright` (MPL-2.0, dev only) or not? | Contrast and ARIA errors could be caught automatically; adds a dependency with a weak-copyleft licence. | No new test dependency: contrast is checked on token pairs (AC-02), roles and names in component tests, the rest by the HC3 screen reader and visual pass. Alternative: add `@axe-core/playwright` pinned, run on every page at the three sizes (BR-14 licence exception needed). | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-21 | Do the approved US-01..US-03 specs get updated for what US-04 supersedes (Q-04, Q-18)? | Traceability: a reader of US-01 would still read "native date input". | Not rewritten. After HC1 the spec-writer adds one Review log row to each affected spec pointing to US-04 (US-01: Q-22, §9, BR-02 prompt wording, AC-26; US-02: AC-18; US-03: AC-18). Test titles keep their original AC IDs. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |
| US-04-Q-22 | Segmented pill toggles: where? | Reference style; must keep native semantics. | The US-03 "Simulación de pago" group is styled as a pill segmented control; it stays a native radio group (tests and US-03-AC-17 unchanged). No other segmented control is introduced. | Default accepted. — Felipe Sabogal, 2026-11-21 (HC1) |

Checklist items with no gap: *country context, deep links, persistence, concurrency, draft vs
published, formatting of prices and dates on the summary, masking, security of content access*
are unchanged by a visual story (BR-07). *Configuration change mid-flow*: icons fall back to the
default for new keys (AC-04), selects with more options become searchable (Q-11).

## 7. Content contract (what Strapi must provide)

### 7.1 Strapi

**No change.** US-04 reads the same content as US-01..US-03 (ADR-0001, ADR-0006). The country
`name` and `localeTag` already provided are enough for the header, the calendar names and the
calendar's first day of the week. ADR-0011 keeps the flag and accent in the front end, so no
`country` attribute is added.

### 7.2 Front-end presentation maps (code, not content)

| Map | Key | Value | Fallback |
|---|---|---|---|
| Field icon (`shared/field-icons.ts`, ADR-0010 §7) | field `key` | `@lucide/angular` component for `documentType`, `documentNumber`, `fullName`, `birthDate`, `city`, `plate`, `make`, `model`, `vehicleYear` (names in AC-04) | `LucidePencilLine` for any other key of type `text`, `number`, `select`, `date`; none for `checkbox` |
| Country visuals (`shared/country-visuals.ts`, ADR-0011) | country `code`, upper-cased (`'CO'`, `'CL'`) | flag component and accent key (`'co'`, `'cl'`); the colour values live only in `tokens.css` | `{ flag: null, accent: null }`: `LucideEarth` and the brand accent |

Both maps are presentation only: no behaviour, validation or copy depends on them.

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

## 9. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA; WAI-ARIA APG combobox (select-only and list autocomplete) and
  date picker dialog patterns; visible focus on the focused element; Tab order unchanged except the
  "Elegir fecha" stop; one `h1` per page; decorative icons and flags hidden; `forced-colors`
  fallbacks for gradient text and borders; screen reader pass at HC3 (NVDA or VoiceOver) on the
  select (both kinds, including how a collapsed combobox without `aria-controls` is announced,
  ADR-0012), the calendar, the year list and the step indicator.
- **Responsive:** mobile-first CSS (`min-width` queries on the `--breakpoint-*` tokens); 320–1440
  CSS px with no horizontal scroll (verified at 360, 768, 1280); 44 × 44 px targets; bottom sheet
  below `--breakpoint-sheet` (600 px), fitting above the on-screen keyboard on phones (HC3 phone
  check, AC-12).
- **Multi-country:** one build; no country branch except the presentation map
  `country-visuals.ts` (ADR-0011, enforced by the static guard of AC-03); calendar names, date
  formatting and the first day of the week from `Intl`/CLDR and the country `localeTag`, with no
  country code in the date picker; the date text format is the same for every country.
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
- **Needed:** none.

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

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-04` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
| 2026-11-21 | spec-writer (Claude Opus 5.5) | 1 Spec | Draft v0.1 | First version from story.md (translation, to be confirmed by the human), the human's visual brief, US-01..US-03 specs, ADR-0001..0009 and the existing tests. 16 BR, 23 AC (0 original: the story has no scenarios; 23 derived), 22 gaps (6 block HC1: Q-01 theme, Q-02 country visuals vs ADR-0001, Q-04 primitives and US-01 supersessions, Q-05 typed date, Q-06 test changes of §11.1, Q-07 Strapi microcopy contradiction), 4 ADRs needed. |
| 2026-11-21 | Felipe Sabogal (human) | HC1 | **Approved** (v0.1) | The six blocking gaps (Q-01, Q-02, Q-04, Q-05, Q-06, Q-07) accepted as proposed; every other default accepted; the `story.md` translation confirmed. The 14 adjustments that ADR-0010..0013 force are approved and go into v0.2, plus a human decision: the calendar's first day of the week follows the country locale (CLDR: Sunday for es-CO, Monday for es-CL). (Translated from the Spanish session.) |
| 2026-11-21 | spec-writer | v0.2 | ADR-driven adjustments 1–14 approved at HC1; week start per locale | Revision after HC1 and HC2 (ADR-0010..0013 Accepted), applying their *Spec impact* sections. Status kept `Approved` (human pre-approval of items 1–14 and the week start, row above); version 0.2. **(1) Q-09:** icon package `@lucide/angular` 1.77.0 (`lucide-angular` deprecated, peers stop at Angular 21); old text struck, v0.2 note; BR-04, §2, §7.2; AC-04 Examples now name the Lucide components and the default `LucidePencilLine`. **(2) AC-02:** row "input and card border" → "input and interactive card border"; note and BR-02: non-interactive panels (summary sections) keep a decorative hairline, allowed by WCAG 1.4.11. **(3) BR-12 / AC-19:** one variable WOFF2 file per family with the `font-weight` range limited to the scale; the system fallback stack names local fonts, never downloaded, not counted as families; AC-19 `Then` lines reworded accordingly. **(4) Q-08 / Q-03:** starting fonts and colours struck and replaced by references to ADR-0010 §4–§5 (Archivo + Atkinson Hyperlegible Next; palette) and ADR-0011 (Colombia `#FFCD00`, Chile `#F66E5E`); values not duplicated. **(5) "Seleccionado":** kept; it is the existing US-02 marker (US-02 §8, §8.1, US-02-AC-03), so §8.1 lists it among reused strings, not as new copy; §8 row says so. **(6) Q-10:** "public-domain designs" → drawn from the official constructions; flag colours are published approximations (no law fixes them). **(7) Empty searchable select:** prompt = placeholder and `inputValue()` `''` (select-only: button text); glossary *Custom select* and *Shown value*, BR-05, §8, AC-05 (now also asserts "Tipo de documento" text, stored `''`, and `aria-controls` while open), §11.1 preamble defines "shows the prompt", `expectEmptyStep1`, US-03-AC-11 row, US-01-AC-07/AC-23 rows, `dom.ts` `shownValue`. **(8) AC-09:** "page behind is inert" → focus trap (Tab and Shift+Tab), backdrop, `aria-hidden="true"` on the page behind; BR-06, §8 aligned; note on what jsdom and e2e assert. **(9) `aria-controls`:** asserted only while the list is open (BR-05, AC-05, AC-06 note, §8, §11.1 AC-01 row and `dom.ts` lookup); HC3 screen reader note in §9. **(10) Week start (human decision):** BR-06, Q-12 (old "Monday" struck), §7.1, §8, §9; AC-09 keyboard outline gains a `country` column and two Colombia rows (Home → Sunday 13/05/1990, End → Saturday 19/05/1990); "Calendar names" becomes an outline with the column order per country (es-CO Sunday first, es-CL Monday first); §11 AC-09 adds the unit level. **(11) Phone keyboard:** BR-11 and an AC-12 note: HC3 phone check that the searchable select's bottom sheet fits above the on-screen keyboard; Q-11, Q-13, §9, §11 AC-12 row. **(12) Q-16:** confirmation check-circle scales and fades (transform/opacity) instead of a stroke draw; §8 row. **(13) BR-01 / AC-01:** media conditions also accept `(hover: hover)` (plus `prefers-reduced-motion`, `forced-colors`, `prefers-color-scheme`), breakpoints `min-width` only; also the `forced-colors` system colours as allowed literals and the guard's sensitivity self-test (ADR-0010 §2). **(14) AC-17:** `getAnimations()` returns an empty list; BR-10 adds the by-construction rules, and AC-17 gains a second scenario "Reduced motion by construction" (static guard, ADR-0013 §4). **Further alignments with the accepted ADRs (for the human to confirm):** step 1 lazy-loaded (`loadComponent`, ADR-0012 §7) in §2 scope, out of scope (route addresses unchanged), §9 and §11 preamble; AC-03 gains a third scenario "Country codes stay in the country-visuals map" (static guard replacing ADR-0001's review grep, ADR-0011), BR-03 and Q-02 note; BR-09 and Q-14 name the motion mechanism (ADR-0013) and allow paint-only state transitions, §9 *Performance* reworded the same way; BR-14 and an AC-21 note list the five accepted dependencies; AC-14 note (enter-only, token values); AC-23 names ADR-0010/0011; §7.1 no Strapi attribute; §7.2 file names and values; glossary token prefixes and panel breakpoint; Q-01, Q-04, Q-13 v0.2 notes; §2 skills bullet (EVAL outcome); §9 *Maintainability* uses the ADR file names; §10 lists ADR-0010..0013 as accepted with what they amend (ADR-0011 → ADR-0001, ADR-0012 → ADR-0004) and *Needed: none*; §11 short names (`calendar-dates`, `select-search`, `field-icons`, `country-visuals`) and rows AC-01, 03, 04, 07, 09, 12, 14, 17, 19. *Human answer* cells untouched; replaced default text struck through, not deleted. No ID renumbered, retired or added. Counts: 16 BR, 23 AC (0 original, 23 derived), 22 Q (none open). Review log rows pointing here added to US-01, US-02 and US-03 specs (US-04-Q-21, task US-04-T-26). |
