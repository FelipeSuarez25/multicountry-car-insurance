# US-04 — Code review, round 1

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.2, Approved; §13 human decisions incl. the v0.2 confirmation and the week-start fallback) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `dcb0afe` (22 commits since `main`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **CHANGES REQUESTED** (0 blocker, 2 major, 4 minor, 3 nit) |

Reviewed against spec v0.2, `tasks.md` (Gate history: test conventions accepted by the orchestrator,
gate attempt 1 passed), ADR-0010, ADR-0011, ADR-0012, ADR-0013 (all Accepted), the `adr/README.md`
implementation notes (ADR-0012 week start, ADR-0004), ADR-0001 as amended by ADR-0011, ADR-0004 as
amended by ADR-0012, ADR-0003, ADR-0009, `CLAUDE.md` (§4 exact pins, §5 incl. the `frontend-design`
overrides), the vendored `.claude/skills/frontend-design/SKILL.md`, and `docs/qa/US-04/{before,after}/`.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0, no output |
| Build (frontend) | `npx ng build` | exit 0, no budget warning. Initial **458.23 kB raw / 102.95 kB transfer** (`chunk-SQQYX5QO` 382.44, `main` 61.27, styles 14.53); lazy `quote-form-page` 195.73 kB raw / 46.16 kB |
| Unit (frontend) | `npm test` (`ng test --watch=false`) | **1276 passed / 0 failed** (39 files) |
| Backend | `git diff --name-only main...HEAD -- backend` | 0 files (backend lint/tests not re-run: nothing changed; AC-11 third scenario holds) |
| E2E | `docker compose -p us04-review-r1 up -d --build`, then `scripts/e2e.sh` | **168 passed / 0 failed** (4.7 min, 8 files). Stack removed with `down -v`; nothing left running |
| Traceability | `scripts/trace.sh US-04` | exit 0 · ACs without test: 0 (AC-22, AC-23 manual per spec) · open blocker/major findings: 0 before this report |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 476 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); personal data none |
| Dependencies | `package.json`, lockfile, installed `package.json` licences | Exact pins only. Lockfile adds exactly 5 packages (`@angular/aria` 22.3.0 MIT, `@angular/cdk` 22.3.0 MIT, `@lucide/angular` 1.77.0 ISC, `@fontsource-variable/archivo` 5.3.0 OFL-1.1, `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0 OFL-1.1); `parse5`/`entities` were already in the tree (jsdom). `package.json` and lockfile change in the same commit (`e2079d0`) |
| Guard mutation tests | Copy of `frontend/` in the scratchpad (tracked files untouched), mutated, `ng test --include` on `design-guards.spec.ts` and `contrast.spec.ts` | See below: every mutation is caught **except** `disableAnimations: false` (F05) |

**Guard mutations (all on a copy).** Reported as expected: `padding: 13px`, `color: #ff0000`,
`rebeccapurple`, `box-shadow: 0 0 0 2px …`, `margin: calc(2px + var(--space-1))`, `width: 10vw`,
`font: 700 1rem/1.2 Arial`, `z-index: 5`, `var(--primitive-violet-400)` in a component, `@media
(max-width: 600px)`, a `transition` outside the no-preference block, an `animation` inside `@media
(hover: hover)` only, `transition: opacity 200ms ease`, an `https://` URL in a component CSS,
`"CL"` in `step-indicator.ts`, `data-x="CO"` in `custom-select.html`, and `--primitive-ink-500` darkened to
`#5A5A6C` (contrast test: `control-border … 2.18:1, needs 3:1`). **Not reported:**
`disableAnimations: false` in `panel-overlay.ts:45` (F05).

**Browser checks (own Playwright scripts against the stack, Chromium of `@playwright/test` 1.65.1).**

- Select-only "Tipo de documento" (CO): Enter, Space, ArrowDown open with the first option active
  (`aria-activedescendant` resolves); ArrowDown stops at the last (no wrap); Home/End; Escape closes
  with the value and focus unchanged; ArrowDown+Space chooses ("CE" stored); a printable key on the
  collapsed button opens on the first match; Alt+ArrowDown opens on the chosen option; Tab with the
  list open commits and moves on to "Número de documento"; pointer click outside closes without a change.
- Searchable "Marca" (CO): Enter on the collapsed input opens the list, the URL stays `/co/datos` and
  no submit happens (the two alerts present afterwards are the `touched` errors of fields the probe
  had left); typing "maz" filters to "Mazda", announces "1 opción" (CDK live announcer), Enter
  stores `mazda`; reopening selects the whole text (`[0,5]`); "xyz" shows and announces
  "No encontramos opciones para «xyz»."; Escape restores "Mazda"; Ctrl+A selects all on macOS;
  Tab commits ("u" → Renault, focus to "Línea"); typing "Ki" then clicking outside restores "Renault".
- `aria-controls` is absent while collapsed and present and resolving while expanded, never dangling
  (accepted relaxation).
- Calendar (CL, today pinned 2026-11-21): Enter on "Elegir fecha" opens a dialog
  (`aria-modal="true"`, named "noviembre de 2008"), focus on 21/11/2008; `app-root` and the other
  `body` children get `aria-hidden="true"`; Tab and Shift+Tab cycle only through "Elegir año", "Mes
  anterior", "Mes siguiente", the focused day and "Cerrar"; ArrowRight/Down, Home (Monday 24/11),
  End (Sunday 30/11), PageUp (30/10), Shift+PageUp (30/10/2007) behave as AC-09; "Elegir año" opens a
  listbox "Año" 1906–2008 with the current year selected; Home and typing "1990" move there; Enter
  returns to the grid on 29/10/1990; a disabled day (`aria-disabled`) ignores a click; a backdrop
  click and Escape close and return focus to "Elegir fecha"; Enter on a day stores the ISO date and
  shows dd/mm/aaaa. Focused day: 3 px solid `#C0B0FE` outline.
- 360 × 740 with `reducedMotion: 'reduce'`: "Ciudad" sheet and calendar sheet open, full width,
  bottom edge 740, no horizontal scroll, days ≥ 46.6 × 44; `document.getAnimations()` empty and every
  computed duration `0s`; CDK backdrop has `cdk-overlay-backdrop-noop-animation`. With motion
  allowed the select sheet fades (opacity 0.597 at +30 ms), it does not slide (F03).
- Network through the whole CO flow: one origin only (`http://localhost:8080`); fonts are the two
  WOFF2 files under `/fonts/`, one per family per document load.
- Step indicator accessibility tree: list "Progreso de la cotización" with items "Tus datos Paso 1
  de 3" etc. (separate text nodes); after "Nueva cotización" the indicator resets to step 1 current.
- Field icons, radio pixels, plan heading focus: see F01, F02, F04.

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-04-AC-01 | `styles/tokens.css`, `styles.css`, component CSS | `design-guards.spec.ts` AC-01 block (mutations bite) | ✅ |
| US-04-AC-02 | `tokens.css`, `styles/contrast-pairs.json` | `contrast.spec.ts` | ⚠️ every listed pair passes; the native plan radio, which the list cannot see, fails 3:1 on the recommended card (F02); some real pairs are unlisted (F07) |
| US-04-AC-03 | `shared/country-visuals.ts`, `shared/flags/*`, `country-flag.ts`, `wizard-shell.html`, country pages | `country-visuals.spec.ts`, `design-guards.spec.ts` AC-03, `country-chooser-page.spec.ts`, `wizard-chrome.spec.ts` | ✅ |
| US-04-AC-04 | `shared/field-icons.ts`, `quote-form.html:7,23-25` | `field-icons.spec.ts`, `quote-form-page.spec.ts` AC-04 | ❌ the icons of the three select fields are in the DOM but painted over (F01); the tests assert the DOM only |
| US-04-AC-05 | `shared/custom-select.{ts,html}` | `custom-select.spec.ts`, `quote-form-page.spec.ts`, e2e | ✅ (verified in the browser) |
| US-04-AC-06 | `custom-select.ts:170-207` | `custom-select.spec.ts` (both kinds), e2e | ✅ (verified in the browser; see F06 on the extra tweaks) |
| US-04-AC-07 | `select-search.ts`, `custom-select.ts:99-105` | `select-search.spec.ts`, `custom-select.spec.ts` | ✅ |
| US-04-AC-08 | `date-text.ts`, `date-field.ts:51-72` | `date-text.spec.ts`, `date-field.spec.ts`, e2e (en-US, es-CO) | ✅ |
| US-04-AC-09 | `calendar.{ts,html}`, `calendar-dates.ts`, `date-field.ts:81-105` | `calendar-dates.spec.ts`, `date-field.spec.ts`, e2e | ✅ (verified; see F08 nit) |
| US-04-AC-10 | `calendar-dates.ts` (`isDayDisabled` = `validateField`) | `calendar-dates.spec.ts`, `date-field.spec.ts` | ✅ |
| US-04-AC-11 | `quote-form.ts` (store writer per ADR-0012 §6) | e2e stored object, whole suite, backend diff 0 | ✅ |
| US-04-AC-12 | `panel-overlay.ts`, `panel-position.ts`, `styles.css:402-417` | e2e (three viewports) | ✅ geometry; ⚠️ sheet motion deviates from ADR-0013 (F03) |
| US-04-AC-13 | `step-indicator.*`, `wizard-shell.*`, `wizard-progress-store.ts` | `wizard-chrome.spec.ts`, `summary-page.spec.ts` | ✅ |
| US-04-AC-14 | `animate.enter="page-enter"` on each page | e2e (MutationObserver) | ✅ (see F04 on the plan heading timing) |
| US-04-AC-15 | skeletons in the four places | page specs (deferred HTTP) | ✅ |
| US-04-AC-16 | `plan-list-page.html:29-34` | `plan-list-page.spec.ts`, e2e | ✅ |
| US-04-AC-17 | no-preference blocks, `tokens.css:239-251`, `disableAnimations: true` | e2e, `design-guards.spec.ts` | ✅ behaviour (verified); ⚠️ one guard is blind (F05) |
| US-04-AC-18 | mobile-first CSS | e2e matrix | ✅ |
| US-04-AC-19 | `tokens.css:14-29`, `index.html`, `angular.json` assets | e2e, `design-guards.spec.ts` | ✅ (network verified) |
| US-04-AC-20 | headings unchanged, `:focus-visible` | page specs, e2e | ✅ (see F09 nit) |
| US-04-AC-21 | `frontend/package.json` | `design-guards.spec.ts` | ✅ |
| US-04-AC-22 | `docs/qa/US-04/after/` (45 files) + `before/00-paises-*` | manual | ✅ set complete; the select icon gap of F01 is visible in `after/01-*` |
| US-04-AC-23 | — | manual (HC3) | — (notes for HC3 at the end) |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R1-F01 | major | `frontend/src/app/shared/custom-select.css:1-4`; `frontend/src/app/features/quote-form/quote-form.css:20-28`; `quote-form.html:23-25` | The field icons of every `select` field ("Tipo de documento", "Ciudad", "Marca") are rendered but painted over by the select itself, leaving an empty indent | US-04-AC-04, US-04-BR-04; checklist "tests fail when the behaviour breaks" | open | |
| US-04-R1-F02 | major | `frontend/src/app/features/plan-list/plan-list-page.css:41-47` (`.plan__radio`, native, `accent-color` only) | The plan radio is drawn by the browser: ring `#858585`, fill `#3B3B3B`. On the recommended card the ring is **2.4:1** (fill 1.3:1), below the 3:1 control minimum; it is outside `contrast-pairs.json`, so no test sees it | US-04-AC-02 (row "input and interactive card border"), US-04-BR-02, ADR-0010 §4 D2; checklist a11y | open | |
| US-04-R1-F03 | minor | `frontend/src/app/shared/custom-select.css:120-121,139-147`; `frontend/src/app/shared/calendar.css:121,137-145` (b4cafae, 94dd193) | Bottom sheets fade instead of the ADR-0013 slide, changed so the AC-12 e2e can read the final box at once; the deviation is not recorded | ADR-0013 §2 ("Bottom sheet open … translateY(100%) → 0"); CLAUDE.md §1 (traceable decisions); cf. US-03-R1-F03 | open | |
| US-04-R1-F04 | minor | `frontend/src/app/features/plan-list/plan-list-page.ts:58-62` (96129dc) | Step 2 now focuses its `h1` only after the plans load; until then the focus is on `body` (the removed "Continuar"). A change to US-02 behaviour, not recorded | US-02 §8 "Arrival", ADR-0001 (focus on the arriving heading), US-04-BR-07/BR-09 ("focus on the arriving h1 as today") | open | |
| US-04-R1-F05 | minor | `frontend/src/testing/design-guards.ts:244-248`; `frontend/src/app/shared/panel-overlay.ts:16,45` | The `disableAnimations: true` guard counts matches in comments: `disableAnimations: false` in `panel-overlay.ts:45` passes because line 16 of the doc comment contains the phrase | US-04-AC-17 (by-construction guard), ADR-0013 §4; checklist "tests fail when the behaviour breaks" | open | |
| US-04-R1-F06 | minor | `frontend/src/app/shared/custom-select.ts:148-150, 152-164, 172-177` | Three select tweaks to justify or remove: the "detail 0 only opens" claim is false in Chromium; Ctrl+A select-all is not in the spec and overrides the macOS line-start key; a global `appRef.tick()` is queued on every keydown and click | Spec scope (BR-05, AC-06); checklist "effect/side effects", maintainability | open | |
| US-04-R1-F07 | nit | `frontend/src/styles/contrast-pairs.json` | Real pairs not listed (they pass today): `--color-text-on-brand` on `--color-brand` ("Seleccionado" badge, current step marker) and `--color-focus` on `--color-surface-hover` (active option outline) | US-04-AC-02 note ("the list of pairs … so the test reads it rather than guessing") | open | |
| US-04-R1-F08 | nit | `frontend/src/app/shared/calendar.ts:90-95` | Escape inside the year list closes the whole calendar instead of returning to the grid | UX consistency (spec §8 "Year selector: Enter chooses and returns to the grid") | open | |
| US-04-R1-F09 | nit | `frontend/src/styles.css:52-54,87-90` | On arrival by keyboard or on a direct load, the focused `h1` (tabindex −1) shows the 3 px ring as a full-width box around the gradient heading (visible in every `after/` capture) | HC3 visual decision (AC-23); not an a11y defect | open | |

### US-04-R1-F01 — Select fields show no field icon (major)

`quote-form.html:23-25` renders `<span class="control__icon">` before the control, positioned
absolutely with `z-index: var(--z-base)` (= 0, `quote-form.css:20-28`). Text, number and date
controls are not positioned, so the icon paints above them. `app-custom-select` has
`:host { position: relative; }` (`custom-select.css:1-4`) and comes **after** the icon in tree order
in the same stacking context. Positioned boxes with `z-index: auto`/`0` paint in tree order, so the
select's own background (`--component-input-bg`) covers the icon. The select still gets
`input--icon`, so its text is indented past an empty slot.

Evidence (own script, 1280 × 800, `/co/datos`, clip screenshot of each `.control__icon` box,
brightest pixel): "Tipo de documento" 33, "Ciudad" 33, "Marca" 33 (the input background); every
other field 193 (the icon). `nextElementSibling` position: `app-custom-select` → `relative`,
everything else `static`. Same in `docs/qa/US-04/after/01-datos-*` and `01b-*`, both countries.

Why the tests pass: `field-icons.spec.ts` checks the map, and the AC-04 block of
`quote-form-page.spec.ts` checks that the `svg` is in the DOM and `aria-hidden`. jsdom does no
painting, and the e2e suite does not look. AC-04 says the field "shows the icon"; the AC-04 note
("the test asserts the mapping table, not pixels") limits what the unit test proves, not what the
feature must do.

Expected: all nine mapped icons (and the default) visible inside their controls. Suggested
direction: a stacking order for the icon above the control (a `--z-` token, not a literal), or
render the icon inside `CustomSelect`/`DateField`. Add a check that would fail today, for example an
e2e that compares the icon box of each field against the control background (note:
`elementFromPoint` skips the icon because of `pointer-events: none`, so it cannot be used).

### US-04-R1-F02 — Plan radio boundary below 3:1 on the recommended card (major)

The plan radio stays native (spec §2) and is styled only with `accent-color`. Under
`color-scheme: dark`, Chromium draws an unchecked radio as a `#3B3B3B` disc with a thin `#858585`
ring (measured at device scale 4 on the running app, `radio-basic`/`radio-recommended` crops;
computed `appearance: auto`). Contrast with WCAG 2.x luminance:

| Where | Ring `#858585` | Fill `#3B3B3B` |
|---|---|---|
| Plain plan card `#14131E` | ≈ 5.0:1 (passes) | ≈ 1.6:1 |
| Recommended card at the radio (`#5B22B5` sampled; token top stop `#6427C4`) | **≈ 2.4:1 (fails 3:1)** | ≈ 1.3:1 |

The consent and terms checkboxes use the same UA ring on `#0B0B14`, ≈ 5.3:1, so they pass. The
checked radio (`#D5C7FF` dot) is clearly distinct.

So on the recommended plan, the one card the brief makes loudest, the control that people choose
with has a boundary below the 3:1 that US-04-BR-02 and the AC-02 row "input and interactive card
border" require for controls. The orchestrator's "dark grey on dark" impression comes from the fill
(1.3–1.6:1); on plain cards the ring passes. No test can catch this: `contrast-pairs.json` lists only
token pairs, and the radio colours come from the browser, not from `tokens.css`.

Expected: every control boundary ≥ 3:1 against its real background, including the recommended
gradient at every stop. Suggested direction: draw the radio from tokens (for example
`appearance: none` with a token border and dot, which keeps the native semantics), then add rows
such as "radio border on `--color-surface` and on `--gradient-plan-recommended`" to
`contrast-pairs.json`. Check the forced-colors fallback if `appearance` changes.

### US-04-R1-F03 — Bottom sheets fade instead of the ADR-0013 slide (minor)

ADR-0013 §2 (Accepted) decides: "Bottom sheet open | `animate.enter` on the sheet |
translateY(100%) → 0". The branch uses an opacity fade for both sheets. The CSS comment gives the
reason: "it fades in and never slides, so its box is its final box from the first frame". That is
the AC-12 e2e reading the sheet box right after opening (verified: with motion allowed, opacity
0.597 at +30 ms and the box already final). This is the US-03-R1-F03 pattern again: production
motion was changed to fit the timing of a test. Users get no harm (and a fade is gentler), so it is
minor. But it is an unrecorded deviation from an accepted ADR.

Expected, one of: (a) restore the slide and make the AC-12 test wait for the sheet's animations to
finish (for example `Promise.all(el.getAnimations().map(a => a.finished))`) before measuring, or
(b) keep the fade and record it as an ADR-0013 implementation note in `adr/README.md` that the human
accepts. This cannot be closed as "won't fix" without (b).

### US-04-R1-F04 — Plan heading focused only after the plans load (minor)

Before (main): `afterNextRender(() => heading.focus())` on arrival, unless the load had failed. Now
(`plan-list-page.ts:58-62`) an `effect` waits for a status other than `loading`/`error`. Measured
after "Continuar" on step 1: `activeElement` is `BODY` with 0 plans in the DOM, then `H1` about 50 ms
later (local stack, warm cache). On a slow network (the plan request has a 10 s timeout), keyboard and
screen-reader users have no focus anchor while "Cargando planes…" is shown. US-02 §8 *Arrival* says
"Focus on the h1" on navigation, and US-04-BR-09 says "focus on the arriving h1 as today". The
commit gives no rationale. The likely driver is the US-02-AC-16 e2e (heading focused, then Tab must
reach the plan group, `us-01-03-full-flow-co.spec.ts:249-306`): while the plans load, Tab from the
`h1` reaches "Atrás". That is the e2e driving a behaviour change again.

Arguably this is a reasonable UX choice (the user hears the heading when the plans are there), but it
belongs to the human. Expected: revert to focus on arrival and make the test wait for the plan
group before pressing Tab; or keep it, record it (ADR-0001 implementation note or a US-02 Review log
row, with the human's decision), and add a test for focus during loading.

### US-04-R1-F05 — The `disableAnimations` guard counts comments (minor)

`cdkAnimationUse()` (`design-guards.ts:244-248`) counts call sites and `disableAnimations: true`
matches in the raw source text. `panel-overlay.ts` has the phrase in its doc comment (line 16) and in
the code (line 45). Mutation on a copy: `disableAnimations: false` at line 45 →
`design-guards.spec.ts` "every CDK overlay and dialog is created with disableAnimations: true"
**still passes** (other mutations in the same run were caught). The runtime AC-17 e2e would not catch
it at desktop size either: the select popover has no backdrop, so the CDK 1 ms backdrop transition
only appears with the sheet. Expected: strip comments before matching, or match
`disableAnimations` inside each call's options object, and add a self-test row with a commented-out
`disableAnimations: true` next to a `false`.

### US-04-R1-F06 — Select tweaks to justify or remove (minor)

The brief asked to check these frontend-developer tweaks; three need action:

1. **Click with `detail === 0`** (`custom-select.ts:152-164`). The comment says such a click "only
   ever opens the list, so activating an open select leaves it open". In Chromium it does not: with
   the list open, `el.click()` (detail 0) and a synthetic `MouseEvent('click', { detail: 0 })` both
   **close** it (closed → open → closed in my probe). The only caller that relies on it is the jsdom
   helper `openCombobox()` (`testing/dom.ts:131-133`, `combo.click()`). Either make the claim true
   and test it in e2e, or drop the handler and fix the comment. Assistive technology that activates a
   control with a detail-0 click toggles it, which is acceptable; a wrong comment is not.
2. **Ctrl+A** (`custom-select.ts:172-177`). Select-all on Ctrl+A is not in the spec (§8.1, AC-06/07
   list no such key), and no test uses it (`grep` finds none). On Windows and Linux the browser
   already does this. On macOS, Ctrl+A is the standard "move to line start" text key, so the tweak
   only changes macOS behaviour, against the platform convention. Remove it, or record the reason.
3. **`render()`** (`custom-select.ts:148-150`) queues `ApplicationRef.tick()` (a full application
   change detection) on every keydown and click of every select, to win a race with "a key sent
   right after open". It is a timing workaround in production code. If it must stay, document why
   in an implementation note and limit it to the open transition.

The other tweaks checked out in the browser: Enter on a collapsed searchable select opens it without
submitting; opening a searchable select selects its text; the calendar handles Escape itself (the CDK
listener keys on `keyCode`).

### US-04-R1-F07 — Unlisted contrast pairs (nit)

`contrast-pairs.json` misses pairs that are really used: `--color-text-on-brand` on `--color-brand`
(the "Seleccionado" badge, `plan-list-page.css:67-70`, and the current step marker icon,
`step-indicator.css:74-78`), and `--color-focus` on `--color-surface-hover` (the active option
outline, `custom-select.css:80-84`). All pass today (≈ 7.5:1), but the list exists so that a later
colour change fails the gate. Add them; the radio rows of F02 belong here too. (Disabled text,
`#7E7E93`, is exempt under WCAG 1.4.3 and correctly absent.)

### US-04-R1-F08 — Escape in the year list closes the dialog (nit)

With the year list open, Escape closes the whole calendar and returns focus to "Elegir fecha"
(verified). Enter returns to the grid, so Escape returning to the grid (and only a second Escape
closing) would be more consistent. The APG does not cover the year view; this is a suggestion.

### US-04-R1-F09 — Focus ring box around the arriving `h1` (nit, HC3 decision)

`h1:focus:not(:focus-visible) { outline: none; }` keeps the ring whenever the browser treats the
programmatic focus as visible: on a direct load and after keyboard navigation (my probe: `/co/datos`
on load → `H1`, `:focus-visible` true, outline solid). Every `after/` capture shows a full-width
violet box around the heading. Keeping it is correct for keyboard users. Hiding it on headings with
`tabindex="-1"` is also allowed (WCAG 2.4.7 covers operable components). The human decides at HC3.

## Notes for HC3 (no finding)

- **Gradient headings:** the stops are `#F6F6FB` and `#C0B0FE` on the page background, 18.2:1 and
  10.2:1 (8.8:1 over the texture), so readability holds. On two-line headings the second line is
  visibly more violet (by design, ADR-0010 §4). `forced-colors` fallback present (`styles.css:77-83`).
- **Slashed zeros:** Atkinson Hyperlegible Next draws a slashed zero by design (prices "$ 1.400.000",
  "10 de marzo"). That is the legibility trait ADR-0010 §5 chose the face for; the human decides.
- **Bundle:** initial 458.23 kB raw / 102.95 kB transfer (baseline 381.44 / 98.94). Searching the
  built chunks: `@angular/cdk` overlay, `ngCombobox` and the live announcer appear only in the lazy
  `quote-form-page` chunk; the initial growth is the eager Lucide icons (≈ 3.2 kB raw each, ADR-0010 §7)
  and the new shell. Nothing avoidable found that is worth a finding; transfer grew by about 4 kB.
- **Scope:** `WizardShell`, `WizardProgressStore` and the route `data.step` are presentation only
  (AC-03, AC-13). The confirmed flag resets on "Nueva cotización" (verified). No backend, seed or
  Strapi text change. The rewritten US-01..03 tests keep or raise their strength: shown value **and**
  stored value, a longer leak list in `us-01-security.spec.ts`. The post-implementation test commit
  `a16c82d` (test-engineer) tightens one test and splits another without dropping assertions.
- **Commits:** every `feat`/`fix`/`test` commit carries `Refs:`. Tests and production code are in
  separate commits by role. The three `fix(us-04)` commits (94dd193, b4cafae, 96129dc) say what changed
  but not why. F03, F04 and F06 are exactly the "why" a reviewer cannot recover from them.

## Summary

Open: 0 blocker, 2 major (F01, F02), 4 minor (F03–F06), 3 nit (F07–F09).
