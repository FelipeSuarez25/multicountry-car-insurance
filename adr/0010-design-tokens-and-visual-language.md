---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: specs/US-04/story.md, specs/US-04/spec.md v0.1 (Draft; §4 BR-01..BR-04, BR-12, BR-14, §5 AC-01, AC-02, AC-04, AC-19, AC-21, AC-23, §6 Q-01, Q-03, Q-08, Q-09, Q-10, §9), docs/qa/US-04/before/, frontend/src (styles.css, component styles, static-guards.spec.ts, angular.json budgets, nginx/default.conf.template), vendored frontend-design skill (EVAL-005, with the CLAUDE.md §5 overrides), principles of pbakaus/impeccable restated with credit (EVAL-004), npm registry and packed packages (@lucide/angular 1.77.0, lucide-angular 1.0.0, @ng-icons/core and @ng-icons/lucide 36.1.0, @fontsource-variable/archivo and @fontsource-variable/atkinson-hyperlegible-next 5.3.0, stylelint 18.1.0, stylelint-declaration-strict-value 1.13.0), a throwaway production build of a copy of frontend/ in a temporary directory, a contrast script (WCAG 2.x relative luminance)
informed: all agents via CLAUDE.md precedence; test-engineer (AC-01, AC-02, AC-04, AC-19, AC-21 guards read the files named here); frontend-developer
---

# ADR-0010: Design tokens and visual language (theme, palette, type, scales, icons, flags)

## Context and Problem Statement

US-04 redesigns every page of the wizard on a tokenized design system (`specs/US-04/spec.md` §1,
BR-01..BR-04, BR-12). Today the front end has twelve colour custom properties in `styles.css`
and literal lengths, colours and fonts spread over six component style files. The story asks for
tokens in one file in three tiers with no loose values in components, AA contrast proven over
gradients and a dotted texture, two self-hosted font families, one icon library imported icon by
icon, and flags. The human's visual direction (spec "Sources") pins the look: a deep near-black
background with a subtle dotted texture, a violet/indigo accent, a recommended plan card with a
vertical violet gradient and a soft glow, rounded cards with thin borders, pill segmented
controls, check-circle icons in lists, large bold display headings and high-contrast light
primary buttons. The story's first deliverable is this proposal with an example palette and type
scale (story, "First deliverable"). This ADR decides the token architecture and how it is
enforced, the theme (US-04-Q-01), the palette and its contrast proof (Q-03), the type (Q-08), the
scales, the icon library and field-key map (Q-09) and the flag assets (Q-10). Where the flags and
the per-country accent come from, and how that squares with ADR-0001, is ADR-0011.

## Decision Drivers

- D1. One token file, three tiers, no loose values in components, checked automatically
  (US-04-BR-01, US-04-AC-01; CLAUDE.md §9: "checked mechanically").
- D2. WCAG 2.2 AA: 4.5:1 text, 3:1 large text, UI component boundaries, focus indicators and
  meaningful icons, at every gradient stop and over the texture (US-04-BR-02, US-04-AC-02; story
  rules "AA contrast"). The pair list must be machine-readable so the test does not guess (AC-02
  note).
- D3. The human's visual direction above is the brief. CLAUDE.md §5 (`frontend-design`
  overrides): "the brief's words win, including when the approved direction matches one of the
  skill's generated defaults"; no aesthetic risk beyond the accepted ADR; the wizard is a task flow.
- D4. At most two font families, self-hosted, WOFF2, `font-display: swap`, at most the weights the
  type scale uses, no third-party origin at runtime (US-04-BR-12, US-04-AC-19; ADR-0002: the
  browser talks only to its own origin).
- D5. One icon library, icons imported one by one, no icon font, no runtime fetch, decorative icons
  hidden; exact version, permissive licence, compatible with `@angular/core` 22.3.0 (US-04-BR-04,
  BR-14; CLAUDE.md §4).
- D6. No `innerHTML` anywhere in the front end (ADR-0009; `static-guards.spec.ts`, US-03-AC-13;
  spec §9 "no `innerHTML` for icons or flags").
- D7. Bundle budgets of `angular.json` (initial 500 kB warning / 1 MB error; component style 4 kB
  warning / 8 kB error) are kept or a change is justified (spec §9, Performance).
- D8. Few new dependencies, each pinned exactly, licence reviewed (US-04-BR-14; CLAUDE.md §4).

## Considered Options

Four sub-decisions, each with its own options. The chosen one is marked.

**A. Enforcing "no loose values"**

1. **A1. A static-guard test in Vitest** (chosen) that reads the style files, like the existing
   `static-guards.spec.ts` of ADR-0008 and ADR-0009.
2. **A2. Stylelint** `18.1.0` with `stylelint-declaration-strict-value` `1.13.0` (both MIT), pinned
   devDependencies, run by `npm run lint`.

**B. Theme (US-04-Q-01)**

1. **B1. Dark only** (chosen), `color-scheme: dark`; semantic tokens structured so a light theme can
   be added later by redefining the semantic tier.
2. **B2. Dark and light following `prefers-color-scheme`**, no switch.

**C. Icon library (US-04-Q-09)**

1. **C1. `@lucide/angular` `1.77.0`** (chosen): one standalone component per icon.
2. **C2. `@ng-icons/core` `36.1.0` + `@ng-icons/lucide` `36.1.0`**: one generic `<ng-icon>` and
   icon SVG strings registered by name.
3. **C3. `lucide-angular` `1.0.0`**, the package the story names (verified non-viable, see below).

**D. Font families (US-04-Q-08)**

1. **D1. Archivo (display, width axis) + Atkinson Hyperlegible Next (text)** (chosen).
2. **D2. One family only**: Atkinson Hyperlegible Next for everything.
3. **D3. The spec's starting candidates**: "Sora" or "Space Grotesk" + "Inter".

## Decision Outcome

Chosen options: **A1 static guard, B1 dark only, C1 `@lucide/angular@1.77.0`, D1 Archivo +
Atkinson Hyperlegible Next**, because they meet D1–D8 with **three** new runtime dependencies
(one icon package, two font packages) and no new tooling. A1 extends a guard pattern the gate
already runs. B1 is the brief. C1 is the maintained Angular package of the library the story
proposes, renders through template bindings (D6) and hides icons by default. D1 grounds the type
in the subject: plates, RUT and document numbers need unambiguous glyphs, and the display face
comes from a Latin American foundry with a width axis that makes the bold display headings of
the brief a deliberate treatment, not a default.

### What is decided

#### 1. Files and tiers

| File | Holds | Rule |
|---|---|---|
| `frontend/src/styles/tokens.css` | Every custom property of the app, the two `@font-face` rules, the `prefers-reduced-motion` and country-accent overrides of tokens (ADR-0011, ADR-0013) | The **only** file that declares a custom property (`--…:`) or `@font-face`. Listed first in `angular.json` `styles`. |
| `frontend/src/styles/contrast-pairs.json` | The AC-02 pair list (format in §4) | Read by the contrast test; never by the app. |
| `frontend/src/styles.css` | Reset, element defaults, focus style, utility classes (`.visually-hidden`) | Semantic and component tokens only. |
| component `*.css` | Component styles | Semantic and component tokens only; no primitive. |

Tier prefixes (the guard keys on them):

| Tier | Prefix | Examples | Who may reference it |
|---|---|---|---|
| Primitive | `--primitive-` | `--primitive-violet-400`, `--primitive-ink-950` | `tokens.css` only |
| Semantic | `--color-`, `--font-`, `--text-`, `--leading-`, `--tracking-`, `--weight-`, `--space-`, `--size-`, `--radius-`, `--border-`, `--shadow-`, `--gradient-`, `--texture-`, `--duration-`, `--ease-`, `--z-`, `--breakpoint-`, `--focus-` | `--color-text-muted`, `--space-4`, `--duration-base` | any style file |
| Component | `--component-<name>-` | `--component-button-primary-bg`, `--component-plan-recommended-gradient` | any style file |

Value forms allowed **inside `tokens.css`** (so the contrast test can resolve every pair without
a CSS engine): primitives are 6-digit hex (`#RRGGBB`); a translucent colour is
`color-mix(in srgb, var(--primitive-…) N%, transparent)`; a gradient is
`linear-gradient(<angle>deg, var(--…) P%, …)` or, for the texture only,
`radial-gradient(...)` of one translucent colour token; everything else is a `var()` or a length,
number, duration or `cubic-bezier()`.

#### 2. "No loose values": the static guard (A1)

A Vitest spec (extending `frontend/src/app/static-guards.spec.ts` or a new `design-guards.spec.ts`,
test-engineer's choice) reads every `*.css` under `frontend/src` and asserts, with comments
stripped:

- Only `tokens.css` contains a custom-property declaration or `@font-face`.
- Outside `tokens.css`, no hex colour, `rgb(`/`rgba(`/`hsl(`/`hwb(`/`lab(`/`lch(`/`oklab(`/`oklch(`/
  `color-mix(`, no named colour other than `transparent`, `currentColor`, `inherit` and the
  `forced-colors` system colours (`Canvas`, `CanvasText`, `LinkText`, `Highlight`,
  `HighlightText`, `ButtonText`, `ButtonFace`, `GrayText`); no `font-family` value other than
  `var(--…)` or `inherit`; no `px`/`rem`/`em`/`ch`/`vw`/`vh` length outside `@media`/`@container`
  conditions; no `ms`/`s` duration, `cubic-bezier(`, gradient function, `box-shadow`/`text-shadow`
  literal or numeric `z-index`. Allowed literals: those listed in US-04-BR-01.
- No component style file references `--primitive-`.
- Every length in a `@media`/`@container` condition equals one `--breakpoint-*` value of
  `tokens.css`, and only `min-width` is used (mobile-first, US-04-BR-11), except the
  `prefers-reduced-motion`, `forced-colors` and `prefers-color-scheme` media features.
- A sensitivity self-test: a fixture string with one violation of each kind must be reported
  (the guard must not pass by finding nothing). Same idea as the "the guard looks at something"
  test of US-03-AC-13.

Third-party CSS that Angular libraries inject themselves (the CDK overlay styles, ADR-0012) is not
in `frontend/src` and is out of the guard's scope; our overrides of it live in `styles.css` and
use tokens.

#### 3. Theme (B1)

Dark only. `:root { color-scheme: dark; }`. No `prefers-color-scheme` branch, no switch. The
semantic tier is the only one components see, so a later light theme redefines semantic tokens
in one block of `tokens.css` and needs its own contrast rows; nothing in components changes.

#### 4. Palette (example values, verified)

Built as OKLCH ramps (even lightness steps at a fixed hue; a principle restated from
`pbakaus/impeccable` `colorize.md`, Apache-2.0, credited per EVAL-004) and stored as sRGB hex for
exact contrast computation. The near-black is tinted with the brand hue (286°) so neutrals and
violet read as one family. This is the brief's "deep near-black" (CLAUDE.md §5: the brief wins
over the skill's "tinted near-black" calibration note); the deliberate part is the shared hue.

| Primitive | Hex | OKLCH (L C h) | Role (semantic token) |
|---|---|---|---|
| `ink-950` | `#0B0B14` | 0.155 0.018 286 | page background `--color-bg`; text on light buttons |
| `ink-900` | `#14131E` | 0.195 0.022 286 | card surface `--color-surface` |
| `ink-850` | `#1D1C2A` | 0.235 0.026 286 | raised surface: header, inputs, panels, calendar `--color-surface-raised` |
| `ink-800` | `#272736` | 0.28 0.028 286 | hover and active option row `--color-surface-hover` |
| `ink-700` | `#3B3B4C` | 0.36 0.03 286 | decorative hairline of non-interactive panels `--color-border-subtle` |
| `ink-500` | `#7E7E93` | 0.60 0.032 286 | control and interactive-card border `--color-border-control`, flag ring, disabled text |
| `ink-300` | `#BCBCCC` | 0.80 0.022 286 | muted text, decorative icons `--color-text-muted` |
| `ink-50` | `#F6F6FB` | 0.975 0.006 286 | body text `--color-text` |
| `violet-200` | `#D8D0FF` | 0.88 0.07 293 | bottom stop of the primary button; muted text on the recommended card |
| `violet-300` | `#C0B0FE` | 0.80 0.12 293 | focus ring `--color-focus`, links, display-gradient end, "Recomendado" badge |
| `violet-400` | `#AA8FFF` | 0.72 0.17 293 | brand: selected, current step, chosen plan border, selected day `--color-brand` |
| `violet-500` | `#9060FB` | 0.62 0.22 293 | glow colour (decorative) |
| `violet-700` | `#6427C4` | 0.46 0.22 293 | recommended gradient top |
| `violet-800` | `#4F1B9E` | 0.39 0.19 293 | recommended gradient middle |
| `indigo-950` | `#16154D` | 0.24 0.10 277 | recommended gradient bottom |
| `red-300` | `#FF9592` | 0.78 0.13 22 | error text, icon, border `--color-error` |
| `green-300` | `#74E29F` | 0.83 0.14 155 | success, completed step, check-circles `--color-success` |
| `white` | `#FFFFFF` | — | primary button top stop, text on the recommended card, texture dots |

Country primitives (flag artwork and accents) are listed in ADR-0011.

Gradients and texture:

| Token | Value (in `tokens.css`) |
|---|---|
| `--gradient-plan-recommended` | `linear-gradient(180deg, violet-700 0%, violet-800 45%, indigo-950 100%)` |
| `--gradient-button-primary` | `linear-gradient(180deg, white 0%, violet-200 100%)` |
| `--gradient-display-text` | `linear-gradient(180deg, ink-50 0%, violet-300 100%)` (text clipped; solid `--color-text` fallback under `forced-colors: active`) |
| `--texture-dots` | `radial-gradient(circle, color-mix(in srgb, white 7%, transparent) 1px, transparent 1.5px)` on `--texture-dots-gap` = `1.5rem`, page background only |
| `--shadow-glow-brand` | violet-400 at 35% as a 1 px ring + violet-500 at 45% blurred 64 px, offset 24 px (decorative) |

**Contrast table** (computed with a script: WCAG 2.x relative luminance, `(L1 + 0.05) / (L2 + 0.05)`;
"bg + dot" is the worst case of the texture: white at 7% over `ink-950` = `#1C1C24`):

| Foreground | On | Ratio (worst first) | Minimum | Result |
|---|---|---|---|---|
| text `#F6F6FB` | bg / bg + dot / surface / raised / hover | 18.18 / **15.71** / 17.08 / 15.57 / **13.63** | 4.5 | pass |
| muted `#BCBCCC` | bg / bg + dot / surface / raised / hover | 10.45 / 9.03 / 9.81 / 8.95 / **7.84** | 4.5 | pass |
| link `#C0B0FE` | bg / bg + dot / surface / raised / hover | 10.15 / 8.77 / 9.53 / 8.69 / **7.61** | 4.5 | pass |
| error `#FF9592` | bg / bg + dot / surface / raised / hover | 9.29 / 8.03 / 8.73 / 7.96 / **6.97** | 4.5 | pass |
| success `#74E29F` | bg / bg + dot / surface / raised / hover | 12.24 / 10.57 / 11.49 / 10.48 / **9.18** | 4.5 | pass |
| control border `#7E7E93` | bg / surface / raised / hover | 4.94 / 4.64 / 4.23 / **3.70** | 3 | pass |
| focus ring `#C0B0FE` | bg / bg + dot / surface / raised | 10.15 / 8.77 / 9.53 / 8.69 | 3 | pass |
| focus ring `#C0B0FE` | recommended card at top / middle / bottom stop | **4.14** / 5.49 / 8.72 | 3 | pass |
| brand / selected `#AA8FFF` | bg / surface / raised | 7.54 / 7.08 / **6.46** | 3 | pass |
| decorative icon `#BCBCCC` | surface / raised | 9.81 / **8.95** | 3 | pass |
| button text `#0B0B14` | primary button at top `#FFFFFF` / bottom `#D8D0FF` stop | 19.59 / **13.42** | 4.5 | pass |
| primary button edge `#D8D0FF` | bg / surface | 13.42 / **12.60** | 3 | pass |
| text on recommended card `#FFFFFF` | gradient at top / middle / bottom stop | **7.99** / 10.59 / 16.82 | 4.5 | pass |
| muted on recommended card `#D8D0FF` | gradient at top / middle / bottom stop | **5.47** / 7.25 / 11.52 | 4.5 | pass |
| check-circle on recommended card `#74E29F` | gradient top stop | **4.99** | 3 | pass |
| recommended card border `#AA8FFF` | bg / surface | 7.54 / **7.08** | 3 | pass |
| display heading gradient, `#F6F6FB` stop | bg / bg + dot | 18.18 / **15.71** | 3 (large) | pass |
| display heading gradient, `#C0B0FE` stop | bg / bg + dot | 10.15 / **8.77** | 3 (large) | pass |
| text on selected day / segment on `#0B0B14` | `#AA8FFF` | **7.54** | 4.5 | pass |
| "Recomendado" badge text `#0B0B14` | `#C0B0FE` | **10.15** | 4.5 | pass |
| active option text `#F6F6FB` | `#272736` | **13.63** | 4.5 | pass |
| selected-option check `#C0B0FE` | `#272736` | **7.61** | 3 | pass |
| country accents | see ADR-0011 | ≥ 5.84 | 3 | pass |

Every gradient stop passes even the 4.5:1 text minimum, so the display heading does not depend on
the large-text exemption. Disabled text (`#7E7E93`, 4.23 on raised) is exempt under WCAG 1.4.3 and
also carries a non-colour cue (spec §8). The decorative hairline `ink-700` (`#3B3B4C`) is used only
on non-interactive panels (summary sections); WCAG 1.4.11 does not require it to reach 3:1, see
*Spec impact* 2.

**Machine-readable pair list** (`frontend/src/styles/contrast-pairs.json`): an array of
`{ "id", "fg", "bg", "min", "ac" }`, where `fg` is one token name and `bg` is a list of token names;
a gradient token in `bg` expands to all its stops; the pseudo-token `"texture-worst"` means the
texture dot colour composited over `--color-bg`. The test resolves names through `var()` chains
in `tokens.css` down to hex and fails if a name does not resolve. Example rows:

```json
[
  { "id": "body-text", "fg": "--color-text", "bg": ["--color-bg", "texture-worst", "--color-surface", "--color-surface-raised", "--color-surface-hover"], "min": 4.5, "ac": "US-04-AC-02" },
  { "id": "recommended-text", "fg": "--component-plan-recommended-text", "bg": ["--gradient-plan-recommended"], "min": 4.5, "ac": "US-04-AC-02" },
  { "id": "focus-ring", "fg": "--color-focus", "bg": ["--color-bg", "texture-worst", "--color-surface", "--color-surface-raised", "--gradient-plan-recommended"], "min": 3, "ac": "US-04-AC-02" }
]
```

The final hex values may be tuned at implementation; any change must keep every row of the file
passing, and the table above is then regenerated by the test output, not by hand.

#### 5. Typography (D1)

| Role | Family | Why this one | Package and file (self-hosted) |
|---|---|---|---|
| Display (h1, h2, prices) | **Archivo**, variable `wght` 100–900 and `wdth` 62–125 | A grotesque from Omnibus-Type, an independent foundry from Buenos Aires (omnibus-type.com, read 2026-11-21), designed for print and screen. The width axis lets headings run semi-expanded and heavy (`wdth` 112–125, `wght` 700–800): the type treatment carries the brief's "large bold display headings" instead of a size bump on a default face. | `@fontsource-variable/archivo` **5.3.0** (OFL-1.1), file `files/archivo-latin-wdth-normal.woff2`, **90,104 bytes** |
| Text (body, labels, inputs, buttons) | **Atkinson Hyperlegible Next**, variable `wght` 200–800 | Designed to increase character recognition for low-vision readers with "unambiguous, distinctive elements" (googlefonts/atkinson-hyperlegible-next README, read 2026-11-21). The wizard asks for plates (`ABC123`), RUT and document numbers, where `0/O`, `1/l/I` and `5/S` confusions are real errors. | `@fontsource-variable/atkinson-hyperlegible-next` **5.3.0** (OFL-1.1), file `files/atkinson-hyperlegible-next-latin-wght-normal.woff2`, **33,996 bytes** |

Loading:

- Only the `latin` subset files are shipped (`unicode-range` `U+0000-00FF, U+0131, U+0152-0153,
  U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122,
  U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`, copied from the package CSS). It covers Spanish
  (`á é í ó ú ñ ü ¿ ¡ « »`), `$`, and `…` (used in "Cargando…"). No italic files: the terms' italic
  (ADR-0009) is synthesised by the browser.
- The two files are copied by `angular.json` `assets` entries from `node_modules/@fontsource-variable/*/files`
  to `/fonts/` (stable names, so the text face can be preloaded). Verified on a throwaway copy of
  `frontend/` with `@angular/build` 22.3.0: both files land in `dist/frontend/browser/fonts/` and
  an absolute `url('/fonts/…')` in CSS is left as written. The packages' own CSS is **not** imported.
- `@font-face` in `tokens.css`: `font-display: swap`; `font-weight` limited to the range the scale
  uses (Archivo `700 800`, `font-stretch` `100% 125%`; Atkinson `400 700`).
- `index.html` preloads the text face only:
  `<link rel="preload" href="/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>`.
  The display face is not preloaded (few elements; swap).
- Fallback stack after each family: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  (local fonts, never downloaded), declared once in `tokens.css`.
- The OFL text ships inside each package (`LICENSE`); the font files keep their names; no Reserved
  Font Name is touched.

**Example type scale** (sizes from the classic scale of Bringhurst's *The Elements of Typographic
Style*: 14, 16, 18, 21, 24, 36, 48):

| Token | Size | Line height | Family / weight / width | Tracking | Used for |
|---|---|---|---|---|---|
| `--text-display` | `clamp(2rem, 1.25rem + 3.2vw, 3rem)` = 32 px at 360 → 48 px at 1280 | 1.05 | Archivo 800, `wdth` 125 | −0.02em | the page `h1`, with `--gradient-display-text` |
| `--text-price` | 2.25rem (36 px) | 1.1 | Archivo 800, `wdth` 112 | −0.01em | prices on plan cards and the summary |
| `--text-heading` | 1.5rem (24 px) | 1.25 | Archivo 700, `wdth` 112 | 0 | `h2` (plan names, summary sections) |
| `--text-subheading` | 1.3125rem (21 px) | 1.3 | Archivo 700, `wdth` 100 | 0 | `h3` ("Coberturas", "Beneficios", terms title) |
| `--text-lead` | 1.125rem (18 px) | 1.5 | Atkinson 400 | 0 | step intro and plan description |
| `--text-body` | 1rem (16 px) | 1.55 | Atkinson 400; labels and buttons 600 | 0 | body, inputs (16 px also avoids iOS input zoom), labels, buttons |
| `--text-small` | 0.875rem (14 px) | 1.45 | Atkinson 400 / 600 | 0.01em | help, errors, badges, step labels, captions |

No text below 14 px. No all-caps labels (the `frontend-design` skill's list of generated-page
tells; also harder to read). Paragraph measure `--size-measure: 68ch` (under 80 characters).
Weights used in total: Archivo 700, 800; Atkinson 400, 600 (and 700 only if a review asks for it).

#### 6. Other scales

| Scale | Tokens |
|---|---|
| Spacing (4 px base) | `--space-1` 0.25rem, `-2` 0.5rem, `-3` 0.75rem, `-4` 1rem, `-5` 1.5rem, `-6` 2rem, `-7` 3rem, `-8` 4rem |
| Radius (by hierarchy, not one radius everywhere) | `--radius-control` 0.5rem (inputs, options, days), `--radius-card` 0.875rem (plan cards, panels), `--radius-feature` 1.5rem (recommended card, sheet top corners), `--radius-pill` 999rem (segmented control, chips, badges) |
| Border width | `--border-width-hairline` 1px, `--border-width-selected` 2px, `--focus-ring-width` 3px, `--focus-ring-offset` 2px |
| Sizes | `--size-target-min` 2.75rem (44 px, BR-11), `--size-option-min` 3rem (48 px rows, Q-13), `--size-icon` 1.25rem, `--size-icon-small` 1rem, `--size-flag-height` 1rem, `--size-content-max` 72rem |
| Shadows | `--shadow-panel` (popover and sheet), `--shadow-glow-brand` (recommended and chosen plan), `--shadow-none` |
| z-index | `--z-base` 0, `--z-header` 10, `--z-overlay` 1000 (equals the CDK overlay container's own `z-index: 1000`, verified in `@angular/cdk@22.3.0` overlay styles; documented, not overridden) |
| Breakpoints (mobile-first, `em` so they follow zoom) | `--breakpoint-sheet` 37.5em (600 px: below it panels are bottom sheets, Q-13; at or above it plans go to two columns), `--breakpoint-wide` 64em (1024 px: three plan columns, wider form) |
| Motion | durations and easings: ADR-0013 |

#### 7. Icons (C1)

- Package: **`@lucide/angular` `1.77.0`**, licence **ISC**, peer `@angular/core >=17.0.0` and
  `@angular/common >=17.0.0` (satisfied by 22.3.0), `sideEffects: false`, unpacked 20.9 MB
  (registry; npm view, 2026-11-21). Each icon is its own standalone component with an attribute
  selector on `<svg>` (`LucideIdCard` → `svg[lucideIdCard]`), imported one by one in the component
  that uses it. The icons render through template bindings (`[attr.d]`, `@for`), not `innerHTML`
  (packed `fesm2022/lucide-angular.mjs`). With no `title` input the icon gets
  `aria-hidden="true"` automatically (`hasA11yProp: title != null` → `aria-hidden`), and we never
  pass `title`, so no icon adds accessible text or `textContent` (BR-04).
- Icon sizes and colours come from CSS tokens (`width`/`height: var(--size-icon)`,
  `color: currentColor`), not from the `size` input.
- **Field-key map** (`frontend/src/app/shared/field-icons.ts`, a pure map plus
  `iconForField(config)`; names verified as exports of `@lucide/angular@1.77.0`):

  | Field key | Icon | Field key | Icon |
  |---|---|---|---|
  | `documentType` | `LucideIdCard` | `plate` | `LucideRectangleHorizontal` |
  | `documentNumber` | `LucideHash` | `make` | `LucideCar` |
  | `fullName` | `LucideUser` | `model` | `LucideCarFront` |
  | `birthDate` | `LucideCalendar` | `vehicleYear` | `LucideCalendarRange` |
  | `city` | `LucideMapPin` | **any other** `text`/`number`/`select`/`date` key | `LucidePencilLine` (default) |
  | `checkbox` fields | none | | |

- Other icons: help `LucideInfo`, error `LucideCircleAlert`, success and list items
  `LucideCircleCheck`, select chevron `LucideChevronDown`, selected option `LucideCheck`, search
  `LucideSearch`, close `LucideX`, months `LucideChevronLeft`/`LucideChevronRight`, date button
  `LucideCalendarDays`, processing `LucideLoaderCircle`, unknown-country fallback `LucideEarth`,
  step indicator `LucideUserRound` / `LucideShieldCheck` / `LucideReceipt`. Avoid
  `credit-card`-style names and any class or file named `…card…` in `.ts`/`.html` of files without
  the "no se realiza ningún cobro" copy: the US-03-AC-15 guard (`/tarjeta|\bcard\b/i`) would fail.
- **Bundle impact, measured** (production build of a copy of `frontend/` at HEAD in a temporary
  directory, `@angular/build` 22.3.0; baseline initial `main` 381.44 kB raw / 98.94 kB transfer):
  1 icon +11.33 kB raw / +2.26 kB transfer; 22 icons +78.24 kB raw / **+4.20 kB** transfer. Each
  icon compiles its own copy of the shared template (about 3.2 kB raw each), which compresses
  well. ADR-0012 keeps the initial bundle under the 500 kB warning by lazy-loading step 1.

#### 8. Flags

Our own SVGs, one standalone component per flag under `frontend/src/app/shared/flags/`, written by
hand from the published constructions (no library): Colombia 2:3, three horizontal bands 2:1:1
yellow/blue/red; Chile 2:3, two equal bands white over red, a blue square canton the height of the
white band, a white five-pointed star centred in the canton on a circle whose diameter is half the
canton side (Wikipedia, "Flag of Colombia" and "Flag of Chile", read 2026-11-21; neither law fixes
exact colours, so the colour values are the published approximations, ADR-0011). Each is `viewBox`
geometry only (`rect`, one `polygon`), fills from component tokens through CSS classes (no hex in
templates), `aria-hidden="true"`, `focusable="false"`, no `<title>`, no text; under 1 kB of
template each. A 1 px `--color-border-control` ring (4.23:1 on the header) separates the dark blue
areas from the near-black background. Where the flags appear and what replaces them for other
countries: ADR-0011.

### Consequences

- Good, because every value has one home and one name; the guard makes "no loose values" a gate
  failure, not a review comment (D1), at zero dependency cost (D8).
- Good, because the contrast proof is a test over the real token file: a tuned colour that breaks a
  pair fails the gate, gradients included (D2).
- Good, because the semantic tier isolates components from raw values: a light theme or a palette
  change touches `tokens.css` only.
- Good, because the icon package is the maintained one, compatible with Angular 22.3.0, hides
  icons by default and has no `innerHTML` path (D5, D6); the transfer cost of 22 icons is about
  4 kB.
- Good, because both fonts are OFL-1.1, same-origin, and the text face is chosen for the exact
  data the form collects.
- Bad, because a regex-based CSS guard is weaker than a real parser: a construct it does not
  anticipate (a value split across lines, an escape) could slip through — mitigation: the style
  files are small and simple; the sensitivity self-test covers each rule; the code-reviewer still
  reads the CSS; A2 remains the upgrade path.
- Bad, because `@lucide/angular` costs about 3.2 kB **raw** per icon (each icon is a component), so
  the raw initial size grows faster than the transfer size — mitigation: icons used only on step 1
  move to the lazy chunk (ADR-0012); budgets are measured on every build.
- Bad, because the Archivo width-axis file is 90 kB, about 55 kB more than its weight-only file
  (`archivo-latin-wght-normal.woff2`, 34,928 bytes) — mitigation: not preloaded, `swap`, used only
  for headings and prices, cached after the first visit; if HC2 prefers bytes over the width
  treatment, switching to the weight-only file is a one-line change.
- Bad, because a 3:1 border on every interactive card and input is heavier than the "thin, subtle"
  borders of the reference — mitigation: 1 px width, and subtle hairlines stay on non-interactive
  panels only (*Spec impact* 2).
- Neutral: the dark-only theme means users with a light-mode preference get the dark UI; that is
  the brief.

### Strongest argument against

Stylelint (A2) is the standard tool for exactly this rule: it parses CSS with PostCSS, reports
the line and column in the editor while the developer types, has a maintained
`declaration-strict-value` plugin, and `stylelint-config-standard` would catch a whole class of
other CSS mistakes for free. A home-made regex guard re-implements a parser badly, will drift as
the CSS grows, and gives feedback only when the test suite runs. Adding two pinned, MIT-licensed
devDependencies is a small price for that.

**Why we accept it:** the rule set here is narrow and project-specific (tier prefixes, "no
primitive in components", breakpoints that must equal token values, a single declaring file), so
Stylelint would need custom rules or plugin configuration for most of it anyway, plus a lint-step
change. The repository already enforces ADR rules as Vitest static guards that run in the gate
(ADR-0008, ADR-0009), and the sensitivity self-test makes a silent pass visible. If the guard
proves brittle during implementation or review, A2 is a contained switch: add the two
devDependencies through a superseding note and delete the guard.

### Confirmation

- `static-guards` / `design-guards` (US-04-AC-01, AC-19, AC-21): the rules of §2; at most two
  `@font-face` families, both WOFF2 with `font-display: swap`, `src` same-origin (`/fonts/…`);
  `frontend/package.json` versions exact and the dependency names equal the pre-US-04 list plus
  exactly `@lucide/angular`, `@fontsource-variable/archivo`,
  `@fontsource-variable/atkinson-hyperlegible-next`, and the additions of ADR-0012.
- `contrast.spec.ts` (US-04-AC-02): a pure WCAG ratio function with known reference values
  (black/white 21, `#777777` on white about 4.48), and every row of `contrast-pairs.json` resolved
  from `tokens.css`.
- `field-icons.spec.ts` (US-04-AC-04): every key of §7 maps to its icon; an unknown key of each
  non-checkbox type gets the default; `checkbox` gets none.
- Component tests (AC-04, AC-20): every `svg` in the wizard is `aria-hidden="true"`; accessible
  names and `textContent` of the buttons of AC-04 unchanged.
- HC3 visual review (AC-23): the look matches §4–§8.

## Pros and Cons of the Options

### A1. Static guard in Vitest (chosen)

- Good, because it runs in the existing gate with no new dependency and follows the repository's
  pattern for ADR rules (`static-guards.spec.ts`).
- Good, because project-specific rules (tiers, breakpoints equal to tokens, single declaring file)
  are a few lines each.
- Bad, because it is regex-based (no CSS parser) and reports only at test time.

### A2. Stylelint 18.1.0 + `stylelint-declaration-strict-value` 1.13.0

Verified on npm (2026-11-21): `stylelint@18.1.0` MIT, 19 direct dependencies;
`stylelint-declaration-strict-value@1.13.0` MIT, peer `stylelint >=16 <=18`.

- Good, because it is a real parser with editor feedback and a large rule ecosystem.
- Bad, because the tier, breakpoint and single-file rules still need custom configuration or a
  plugin; two more devDependencies (with their transitive tree) and a lint-step change.

### B1. Dark only (chosen)

- Good, because it is the brief, halves the contrast rows and the screenshot set.
- Bad, because there is no light alternative for people who prefer one.

### B2. Dark and light by `prefers-color-scheme`

- Good, because it respects the system preference.
- Bad, because every AC-02 row and every AC-22 screenshot doubles, and the brief describes only the
  dark look; the light palette would be invented, not briefed.

### C1. `@lucide/angular` 1.77.0 (chosen)

- Good, because it is the Lucide team's current Angular package (the README links a migration guide
  from `lucide-angular`), standalone and signal-based, compatible with 22.3.0, ISC.
- Good, because rendering uses template bindings only and icons are hidden by default.
- Bad, because each icon is a compiled component: +78.24 kB raw for 22 icons (measured).

### C2. `@ng-icons/core` 36.1.0 + `@ng-icons/lucide` 36.1.0

Verified: `@ng-icons/core` MIT, peer `@angular/core >=22.0.0`; `@ng-icons/lucide` ISC.

- Good, because one generic component and SVG strings make it small: +13.27 kB raw / +2.50 kB
  transfer for the same 22 icons (measured).
- Bad, because it inserts the SVG string with `innerHTML` (`fesm2022/ng-icons-core.mjs:458`, `:486`)
  inside the library. Our guard would not see it, but it is the exact path ADR-0009 and spec §9
  rule out for icons.
- Bad, because icons are registered and referenced by string name (`name="lucideIdCard"`), so a typo
  is a runtime blank, not a compile error; two packages to keep in step.

### C3. `lucide-angular` 1.0.0 (the name in the story)

- Bad, because it is **deprecated** ("Package deprecated. Please use @lucide/angular instead.",
  `npm view lucide-angular deprecated`), its last release is 1.0.0 (2026-03-23), and its peer range
  is `@angular/core 13.x - 21.x`: `npm install -E lucide-angular@1.0.0` against the project's
  dependencies fails with `ERESOLVE` (reproduced in a temporary copy). Not viable without
  `--legacy-peer-deps`, which CLAUDE.md §4 pinning does not allow us to paper over.

### D1. Archivo + Atkinson Hyperlegible Next (chosen)

- Good, because each face has a job tied to this product: legibility of IDs and plates; a width
  axis for the display treatment the brief asks for.
- Good, because both are OFL-1.1 variable fonts with a Latin subset that covers Spanish.
- Bad, because the display file is 90 kB.

### D2. One family (Atkinson Hyperlegible Next only)

- Good, because it is the lightest (34 kB) and the most consistent.
- Bad, because the brief's "large bold display headings" would rely on size alone; the skill and
  the brief both ask for a type treatment with character, and the face has no width axis.

### D3. "Sora" or "Space Grotesk" + "Inter" (the spec's starting candidates)

- Good, because they are popular, well-hinted and available on Fontsource.
- Bad, because they are the families any generated UI reaches for; the vendored `frontend-design`
  skill asks to choose typefaces "deliberately, not the default families" (CLAUDE.md §5 adopts the
  skill with overrides that do not touch this rule), and neither is chosen for this product's
  data.

## Spec impact (reported to the orchestrator; the spec is not edited here)

1. **US-04-Q-09** names `lucide-angular` (ISC) as the default. That package is deprecated and does
   not install against Angular 22.3.0; the chosen package is **`@lucide/angular` 1.77.0**. The map
   in Q-09 is kept with Lucide component names (§7).
2. **US-04-AC-02** row "input and card border, 3:1": this ADR reads "card" as an **interactive**
   card (plan cards, which are pointer targets). Non-interactive panels (summary sections) keep a
   decorative hairline below 3:1, which WCAG 1.4.11 allows. The human confirms at HC1/HC2.
3. **US-04-BR-12** "at most the weights the type scale uses": with variable fonts there is one file
   per family covering a range; the rule is met by limiting the `font-weight` descriptor to the
   used range (§5). **US-04-AC-19** "two families plus a generic fallback": the fallback stack
   names local system fonts that are never downloaded; the guard counts `@font-face` families.
4. **US-04-Q-08** candidates are replaced by §5.
5. **US-04-Q-03** starting values are replaced by §4 (and ADR-0011 for the accents).
6. Spec §8 mentions a "Seleccionado" badge on the chosen plan, but §8.1 does not list that string.
   Either add it to §8.1 or drop the badge (the native radio state plus border and glow already
   show the choice).

## More Information

- **Verified on 2026-11-21** (npm registry with `npm view`, packages fetched with `npm pack` into a
  temporary directory, and a production build of a copy of `frontend/` in a temporary directory;
  nothing installed in the project):
  - `@lucide/angular@1.77.0`: ISC, peers `>=17.0.0`, `sideEffects: false`, dist-tag `latest`;
    `lucide-angular`: latest `1.0.0`, deprecated, peers `13.x - 21.x`, `ERESOLVE` against 22.3.0.
  - `@ng-icons/core@36.1.0` MIT, `@ng-icons/lucide@36.1.0` ISC.
  - `@fontsource-variable/archivo@5.3.0` and `@fontsource-variable/atkinson-hyperlegible-next@5.3.0`:
    OFL-1.1; file sizes above from the packed `files/` directories; axes from `metadata.json`.
  - `stylelint@18.1.0` MIT; `stylelint-declaration-strict-value@1.13.0` MIT.
  - Build measurements (raw / estimated transfer of initial `main`): baseline 381.44 / 98.94 kB;
    +1 Lucide icon 392.77 / 101.20; +22 Lucide icons 459.68 / 103.14; +22 icons via `@ng-icons`
    394.71 / 101.44.
  - Contrast numbers: computed with a throwaway Node script (OKLCH → sRGB with Ottosson's matrices,
    gamut-mapped by chroma reduction; WCAG 2.x relative luminance). The production test recomputes
    them from `tokens.css`.
- **Credit:** OKLCH ramps, "3:1 for controls, icons and focus indicators" and "reduced motion
  reduces movement, not feedback" are restated from `pbakaus/impeccable` at `0a4e72a`
  (`colorize.md`, `animate.md`; Apache-2.0), as EVAL-004 allows; no file was copied.
- **Skill conflicts (CLAUDE.md §1, §5):** the `frontend-design` skill lists a near-black background
  with one accent and gradient-washed cards among generated defaults; the brief asks for exactly
  that look, so the brief wins (§5 override). The skill's "spend your boldness in one place" is
  applied: the recommended plan card (gradient and glow) and the display type are the two loud
  elements; everything else is quiet.
- **Related ADRs:** ADR-0011 (country visuals, amends ADR-0001), ADR-0012 (select and date picker,
  amends ADR-0004; lazy step 1), ADR-0013 (motion tokens and reduced motion), ADR-0009 (no
  `innerHTML`; heading levels), ADR-0002 (same origin only).
- **Revisit when:** a light theme is requested; the CSS guard misses a real violation in review;
  `@lucide/angular` changes its rendering to `innerHTML` or drops Angular 22 from its peers; the
  initial bundle passes the 500 kB warning even with step 1 lazy.
