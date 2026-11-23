# US-04 — Code review, round 6

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.4, Approved; HC3 round 2 changes directed by the human 2026-11-22: BR-22, BR-23, AC-30, AC-31, Q-28..Q-30) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `a837b97` (3 commits since R5 `af831aa`: `231bd32` docs, `848bac5` feat, `a837b97` test) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-22 |
| Verdict | **APPROVED**, provided gate attempt 6 ends green (its e2e was still running when this review was written, see below). 0 blocker, 0 major, 4 minor, 5 nit open |

Reviewed against spec v0.4 (BR-01 and BR-16 as amended, BR-22, BR-23, AC-30, AC-31, Q-28..Q-30,
§10, §11.1.2), ADR-0010, ADR-0011, ADR-0013, ADR-0014, `CLAUDE.md`, the `review-checklist` skill
and review R5. The human's request was "al header dale un estilo mas novedoso y con tonos acorde a
las pantallas, y crea un favicon". Scope: `git diff af831aa..HEAD`.

**Scope check.** `848bac5` (frontend-developer) touches only `frontend/public/**`,
`frontend/src/index.html`, `site-header.{css,html}`, `tokens.css` and `contrast-pairs.json`, all
inside its role. `a837b97` (test-engineer) touches only spec files, `frontend/e2e/**`,
`frontend/src/testing/design-guards.ts` (a test helper), and `tasks.md`. `231bd32` touches only
`specs/US-04/`. No `backend/**`, `package.json` or lockfile changed, so there are no new
dependencies. Every commit has `Refs:` trailers. `231bd32` resolves R5-F01 and `a837b97` resolves R5-F02.

## Automated checks (run by the reviewer)

The reviewer did not run e2e and did not touch Docker, because the main session is running gate
attempt 6 on a fresh stack. The gate files I read are under
`/private/tmp/claude-502/-Users-cristiansabogal-Proyectos-multicountry-car-insurance/067ab97b-afa7-4129-b205-146de5718a1c/scratchpad/` (`g6-*.txt`).

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npx eslint .` | exit 0 (gate `g6-felint.txt` empty, same) |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.spec.json --noEmit` | exit 0 / exit 0 |
| Build | gate `g6-febuild.txt` | ok, initial 473.40 kB raw / 105.05 kB transfer (+3.34 kB raw vs gate 5) |
| Unit (frontend) | `npx ng test --watch=false` | **43 files, 1507 / 1507 passed** (gate 5: 1458) |
| Backend tests | not re-run by the reviewer (it would compete with the running e2e); gate `g6-betest.txt` | **116 passed, 3 skipped, 1 suite failed**: `tests/published-only-routes.test.ts` `HookTimeoutError: Hook timed out in 10000ms` in its setup hook. No backend file changed since gate 5 (119/119). This looks like load: it ran at 20:14, at the same time as the reviewer's unit run. **The main session must re-run the backend tests on their own before it calls the gate green** |
| E2E | gate attempt 6 (main session) | in progress when this review was written (run 1 at 156/307, 0 failures so far). Not judged here |
| Icons served by the web container | gate `bzhpnjwbt.output` | `favicon.svg 200 image/svg+xml 536`, `favicon-32.png 200 image/png 1349`, `apple-touch-icon.png 200 image/png 6986`. These byte lengths match the committed files (`wc -c`: 536 / 1349 / 6986) |
| Traceability | `scripts/trace.sh US-04` | exit 0. ACs without a test: 0. AC-30 is linked to `header-style.spec.ts`, `contrast.spec.ts`, `site-header.spec.ts` and `us-04-hc3-round2.spec.ts`; AC-31 to `app-icons.spec.ts` and `us-04-hc3-round2.spec.ts`. trace.sh still lists R5-F01/F02 as open, because their status lives in R5; this round marks them fixed |
| Secrets | `scripts/scan-secrets.sh` | exit 0: 499 files, 6 explicit exceptions (unchanged from R5), personal data none |
| PNG headers | `file public/*.png` | `apple-touch-icon.png` 180 × 180, 8-bit RGB (colour type 2, no alpha). `favicon-32.png` 32 × 32 RGBA. Both images inspected visually: they show the mark (violet gradient square, white shield, violet check), with no text and nothing taken from a third party |

### Contrast verified independently (WCAG 2.x relative luminance, sRGB)

I composited `--component-header-bg` = `color-mix(in srgb, #231541 82%, transparent)` over each base
and measured the lowest-contrast foreground, `--gradient-display-text` stop 2 (violet-300 `#C0B0FE`):

| Backdrop | violet-300 | ink-50 (stop 1 / chip text) |
|---|---|---|
| solid `#231541` | 8.67:1 | 15.53:1 |
| over the lightest page stop (`#231541`) | 8.67:1 | 15.53:1 |
| over `--primitive-ink-50` `#F6F6FB` (Q-28 row) | **5.09:1** (the claimed ≈5.06 is confirmed) | 9.11:1 |
| over `--primitive-white` `#FFFFFF` (not a row, see F01) | **4.97:1** | 8.90:1 |

The focus ring (`--color-focus` = violet-300) gets the same figures, so it is ≥ 3:1 on every backdrop. All
pairs reach AA at the current 82%.

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-04-AC-30 surface and edge | `tokens.css:245-247` (`--component-header-bg` 82% violet-950, solid, backdrop `blur(0.75rem) saturate(1.6)`), `site-header.css:11-27` (solid base, `@supports (backdrop-filter)` translucent, reduced transparency solid + `none`), `border-image: var(--gradient-header-edge) 1` over a 1px transparent bottom border | `header-style.spec.ts` (tokens, `@supports`, reduced transparency, forced colors, no animation, guard); e2e `us-04-hc3-round2.spec.ts:200-246` | ✅ (e2e pending in the gate) |
| US-04-AC-30 accent as decoration | `tokens.css:185-186`, `:264-272` (redeclared under `[data-country-accent]`, see F03) | e2e `:248-277` (accent stop present and the other country's absent; no header text in an accent colour; chooser holds no accent) | ✅ |
| US-04-AC-30 mark and name | `site-header.html:3-16` (inline svg `aria-hidden="true" focusable="false"`, no title/desc/text; `<p>` product name); `site-header.css:79-90` (gradient text, Archivo via `--font-display`, heavy weight) | `site-header.spec.ts` (DOM order, a11y attrs, no img, not heading/link, chooser has no link); e2e `:279-343` (rendered size 32 px, Archivo) | ✅ |
| US-04-AC-30 contrast rows | `contrast-pairs.json` rows `header-product-name`, `header-chip-text`, `header-focus-ring` × 3 backdrops | `contrast.spec.ts:341-417` (computed and row checks, sensitivity) | ✅. The worst case is too lenient (F01) |
| US-04-AC-30 chip | `site-header.css:82-96` (pill, `--shadow-chip-glow`); link and name unchanged | `site-header.spec.ts:686`; e2e `:345-361` | ✅ |
| US-04-AC-30 height and clipping | `.header__inner` `min-height: calc(var(--size-header-height) - var(--border-width-hairline))` + 1px border | e2e `:363-398` (6 viewport rows) | pending in the gate |
| US-04-AC-30 reduced transparency / no support / forced colors / motion | `site-header.css:20-27`, `:110-126` | `header-style.spec.ts`; e2e `:400-450` (CDP `Emulation.setEmulatedMedia`, `forcedColors: 'active'`, `getAnimations()`) | ✅ |
| US-04-AC-30 tokens | `tokens.css` | `header-style.spec.ts:185-227`; `styleViolations` on the header stylesheet | ✅ |
| US-04-AC-31 index.html | `index.html:9-12` (`theme-color #231541`, svg / png 32 / apple-touch links; `favicon.ico` link gone) | `app-icons.spec.ts:67-105` | ✅ |
| US-04-AC-31 files | `public/favicon.svg` (536 B, square viewBox, shapes only), `favicon-32.png`, `apple-touch-icon.png` (colour type 2), `favicon.ico` deleted | `app-icons.spec.ts:107-156` | ✅. The SVG namespace exception is not in the spec (F05) |
| US-04-AC-31 served, same origin | nginx default MIME types (no config change needed) | e2e `:453-492`; gate curl output above | ✅ (curl confirmed; e2e pending) |
| US-04-AC-23 (originality, look) | — | manual at HC3 round 2 (T-67) | 🖐 manual |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R6-F01 | minor | `frontend/src/app/shared/contrast.spec.ts:48`, `frontend/src/styles/contrast-pairs.json` (header rows), spec Q-28 | The "worst case" backdrop is `--primitive-ink-50`, but pure white (`--primitive-white`) can also scroll under the header: the top stop of `--gradient-button-primary` and the white of the Chile flag. At 82% the white case is still AA (4.97:1), but a header alpha of 79% passes every row (ink-50 4.60:1) while the real worst case drops to 4.47:1 | AC-30 / Q-28 ("the lightest thing that can pass under the header"); checklist "tests fail when the behaviour breaks" | open | |
| US-04-R6-F02 | minor | `specs/US-04/tasks.md:10-15` (Status block), T-60..T-65 rows | `tasks.md` is stale again. *Current step* still says "step 1 (spec v0.4 written)" and *Next action* still says "test-engineer: T-60". T-59..T-63 have no commit (`231bd32`, `848bac5`, `a837b97`), and T-62/T-63 still say "uncommitted; 3 tests red from test-side defects, see report" with no record of which tests those were or how they were resolved | `CLAUDE.md` §11, §12 (same pattern as R5-F01) | open | |
| US-04-R6-F03 | minor | `frontend/src/styles/tokens.css:185-186` and `:264-272` | `--gradient-header-edge` and `--shadow-chip-glow` are declared twice with identical text, once in `:root` and once in `[data-country-accent]`. The reason is correct: a custom property resolves its `var()` where it is declared, and the rendered accent stop is proven by e2e `:248-277`. But nothing keeps the two copies equal. `header-style.spec.ts:207` reads only one value (`rawValue`), so a change to just one copy (for example the first stop or the glow alpha) changes the wizard pages or the chooser alone, and no test fails | ADR-0010 §1 (one source of truth per token); checklist "maintainability" | open | |
| US-04-R6-F04 | minor | `specs/US-04/spec.md:1699-1707` (§11.1.2); `frontend/src/app/shared/wizard-chrome.spec.ts:137,155,161,177`; `frontend/src/app/shared/contrast.spec.ts:190`; `frontend/src/testing/design-guards.ts:70-71` | §11.1.2 says no existing test is expected to change. It also says hits are listed "through the spec-writer **before** changing" them. The test-engineer changed three `wizard-chrome` lookups (`svg` → `a svg`, because the first header svg is now the mark), the AC-27 gradient-row filter, and the guard's allowed media features, and recorded this only in `tasks.md` T-60. **The changes themselves are correct and do not weaken anything**: the flag is still found and still checked for `aria-hidden`/`focusable`, the filter only skips the two pseudo-backdrops (which are not gradients), and the guard change is exactly BR-01 v0.4. The spec is simply inaccurate | spec §11.1.2; FLOW (spec is the source of truth); `CLAUDE.md` §9 traceability | open | |
| US-04-R6-F05 | nit | spec AC-31 "The icon files" (`spec.md:1217`); `frontend/src/app/app-icons.spec.ts:122-125` | AC-31 says favicon.svg contains no "http" or "//", yet a standalone SVG needs `xmlns="http://www.w3.org/2000/svg"` to render as an image. The test removes `xmlns` declarations before checking, which is the reasonable reading, but the spec does not mention that exception | spec wording vs test | open | |
| US-04-R6-F06 | nit | spec AC-30 "Product name and chip contrast" (`spec.md:1136-1143`); `contrast-pairs.json`; `contrast.spec.ts:47-48` | The rows use pseudo-backdrop names `header-bg-over-page-lightest` and `header-bg-over-ink-50`, which `bgColours()` composites in code. The spec describes these backdrops in prose but does not name them, so a reader of the JSON cannot map it to the spec without reading the test | spec wording; `CLAUDE.md` §9 | open | |
| US-04-R6-F07 | nit | `frontend/src/testing/design-guards.ts:101` (`styleViolations`) | BR-01 v0.4 allows a literal only in an `@supports` condition that tests `backdrop-filter`. The guard does not inspect `@supports` preludes at all, so any `@supports (...)` condition passes. Literals in declarations inside `@supports` are still caught. ADR-0010 §2 still lists only the old media features; spec §10 leaves the note to the architect | BR-01 v0.4; ADR-0010 §2 | open | |
| US-04-R6-F08 | nit | `frontend/src/app/shared/site-header.ts:6-11` (class JSDoc); `frontend/src/app/shared/contrast.spec.ts:187` (message "accent on the header surface") | Stale wording. The JSDoc still describes the header as "the product name and … the country chip" without the brand mark. The AC-02 assertion message calls `--color-surface-raised` "the header surface", which the header no longer uses (the row itself is still valid for the step indicator and the summary) | checklist "Language / docs" | open | |
| US-04-R6-F09 | nit | `frontend/src/app/shared/site-header.css:100` (`.mark__check { stroke-width: 2.6 }`) | A unitless geometry literal in a component stylesheet, while all other mark geometry (`rx`, paths) is in SVG attributes. BR-01 does not list stroke width and the guard does not flag it, so this is not a violation; it would be more consistent as an attribute in `site-header.html` | BR-01 (spirit); consistency | open | |

### US-04-R6-F01 — the Q-28 worst-case row is not the worst case

Evidence (computed independently, see the table above): with `--component-header-bg` composited over
`#FFFFFF`, violet-300 text is 4.968:1 at 82% (passes). Lowering the mix percentage:

| alpha | over ink-50 (tested row) | over white (untested) |
|---|---|---|
| 0.80 | 4.754 | 4.630 |
| 0.79 | **4.595 (passes)** | **4.470 (fails AA)** |
| 0.78 | 4.442 | 4.315 |

`--gradient-button-primary` starts at `--primitive-white` (`tokens.css:181`), and the Chile flag's white
(`--primitive-flag-cl-white: #FFFFFF`) is on the chooser cards. Both scroll under the sticky header. Blur
softens this in practice, which is why this is a minor and not a major: the shipped value passes. The
guard should cover the real lightest colour (`--primitive-white`), or Q-28 should say why ink-50 is
enough. Both the spec (Q-28 / AC-30 backdrop table) and the test helper have to change; route it
through the spec-writer and then the test-engineer.

### US-04-R6-F02 — tasks.md stale

Expected: *Current step* is at gate 6 / review R6. T-59 shows `231bd32`, T-60/T-61 show `a837b97`, and
T-62/T-63 show `848bac5`. The "3 tests red from test-side defects" note is replaced by what happened
(which tests, and whether they were amended in `a837b97` after the implementation existed; the red
tests were never committed on their own this round, so git history cannot show it). T-64/T-65 get
their results.

### US-04-R6-F03 — duplicated accent-carrying tokens

Possible directions (not prescriptive): declare both properties once, in a rule whose selector list
covers `:root` and `[data-country-accent]`; or add a unit assertion that both declarations have the
same text.

### US-04-R6-F04 — §11.1.2 does not match what changed

The spec-writer should replace "Expected: none" with the actual list (see the wording fixes below).

## Points raised by the test-engineer: reviewer's judgement

1. **AC-31 "http" / "//" vs `xmlns`.** The test's reading (namespace declarations are not references)
   is right and still catches any real external reference (`href`, `xlink:href`, `<image>`,
   `<foreignObject>`, `url(http…)`). Spec wording only: F05.
2. **Pseudo-backdrop names.** They are acceptable as data, but they should be named in the spec: F06.
3. **Edge painted with `border-image`; e2e accepts any 1 px painter.** Acceptable. BR-22 asks for "a 1
   CSS px line painted with `--gradient-header-edge`", and `border-bottom: 1px solid transparent` +
   `border-image: var(--gradient-header-edge) 1` is exactly that. The e2e is not vacuous: the painter
   must paint the resolved token gradient (`paintsGradient`) **and** be 1 px. The header's own border
   must not be a plain line (`:226-228`), and forced colors turns the border image off and checks a
   solid CanvasText border. No finding.
4. **Redeclaration under `[data-country-accent]`.** It is needed for correctness, but it is a drift risk: F03.
5. **§11.1.2 vs the changed tests.** The changes are correct, but the spec is wrong and the process
   step ("through the spec-writer before changing") was skipped: F04.
6. **`design-guards.ts` allows `prefers-reduced-transparency`.** It is in the test-engineer's scope (test helper)
   and matches the human-directed BR-01 v0.4. The sensitivity tests (`header-style.spec.ts:292-311`)
   still report a literal `backdrop-filter`, a hex background and an unknown media feature
   (`prefers-contrast`). No finding. The ADR-0010 §2 note and the unchecked `@supports` prelude are in F07.

## Other checks (no finding)

- **Tokens only.** `site-header.css` uses only `var(--…)`, `transparent`, system colours and keywords.
  The only literals are `1` (border-image slice), `@supports … blur(1px)` and `stroke-width` (F09).
  The component tier references component and semantic tokens only; there are no primitives in the
  component CSS.
- **Fallbacks.** The base rule is solid. `@supports (backdrop-filter: blur(1px))` enables the
  translucent background and blur; the reduced-transparency block comes later in source order and
  wins. Forced colors gives `Canvas`, a `CanvasText` bottom border with `border-image: none`, a product
  name in `CanvasText` with `-webkit-text-fill-color: currentColor` and no background image, and a
  hairline border on the chip. Safari before 18 (prefixed `-webkit-backdrop-filter` only) gets the
  solid header, which BR-22 allows.
- **No motion.** There are no `@keyframes`, `animation` or `transition` rules in `site-header.css`.
  The e2e checks `getAnimations()`.
- **Brand mark.** It is our own drawing: a rounded square, a violet-400 → violet-700 gradient, a white
  shield and a violet check. It has no text and contains no logo, name or slogan of any insurer.
  `aria-hidden="true"`, `focusable="false"`, no `<title>`/`<desc>`, so it adds no accessible content.
  A generic shield-with-check glyph is allowed by BR-22 (Lucide geometry may inspire it). Originality
  and the 16 × 16 legibility are for the human at HC3 (AC-23). The gradient uses
  `fill="url(#brand-mark-fill)"` under `<base href="/">` on deep routes. It renders in Chromium (e2e).
  The human may also glance at it in Safari during HC3.
- **Favicon SVG.** It uses literal hex colours (`#AA8FFF`, `#6427C4`), which is unavoidable in a static
  asset. They equal violet-400 and violet-700, the mark's tokens. Its check stroke (3.4) is thicker
  than the header mark's (2.6), as BR-23 asks ("simplified to read at 16 × 16").
- **index.html.** It has exactly the three links and one `theme-color` `#231541` (= the resolved
  `--component-header-bg-solid`), and the `favicon.ico` link is gone.
- **nginx.** No config change was needed; the gate's curl shows the right content types and sizes
  (see above).
- **Security.** No change to tokens, the Strapi access, or the dependencies; scan clean.
- **Language.** Code and comments are in English. There is no new Spanish copy (§8.1: "no new copy").

## Verification of previous round

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|
| US-04-R5-F01 (minor, `tasks.md` stale after R4) | `231bd32` | ✅ fixed | Status block, T-52..T-58 and Gate history rows for the R4 fixes, gate 5 and R5 are now correct. The same pattern is back for round 2: R6-F02 |
| US-04-R5-F02 (nit, stale "05/" comment) | `a837b97` | ✅ fixed | `date-text.spec.ts:259` now reads `"5/" -> "05"`, matching BR-18 / ADR-0014 §2 |
| US-04-R3-F08, US-04-R1-F09 | — | deferred to HC3 (unchanged) | Human decisions at the HC3 QA (T-49, T-67) |

## Spec wording fixes for the spec-writer (points 1, 2, 5)

1. **AC-31 "The icon files"** (`spec.md:1217`, and BR-23 "no external reference"): change "contains …
   no "http" or "//" reference" to "contains no external reference: apart from the SVG namespace
   declaration (`xmlns="http://www.w3.org/2000/svg"`, required for a standalone SVG), no "http" or
   "//", and no `href`/`xlink:href` other than a local `#id`" (F05).
2. **AC-30 "Product name and chip contrast"** (`spec.md:1136-1143`) and Q-28: name the three backdrops
   as they appear in `contrast-pairs.json`: `--component-header-bg-solid`; `header-bg-over-page-lightest`
   (= `--component-header-bg` composited over the lightest `--gradient-page` stop);
   `header-bg-over-ink-50` (= `--component-header-bg` composited over `--primitive-ink-50`). Say these
   are computed pseudo-backdrops of the contrast evaluator (F06). If F01 is accepted, Q-28's worst case
   becomes `--primitive-white` (the top stop of `--gradient-button-primary` and the Chile flag's white);
   rename the third backdrop accordingly (for example `header-bg-over-white`).
5. **§11.1.2** (`spec.md:1699-1707`): replace "Expected: none" with what changed in `a837b97`:
   - `frontend/src/app/shared/wizard-chrome.spec.ts`: three AC-03 tests (header flag attributes, CO
     vs CL flag drawings, the neutral globe for an unknown country) now look up `a svg` (the flag
     inside the chip link) instead of the header's first `svg`, which is now the brand mark. The
     assertions are unchanged.
   - `frontend/src/app/shared/contrast.spec.ts`: the AC-02 "rows over a gradient background" filter
     skips the `header-bg-over-*` pseudo-backdrops. The `bgColours()` helper gains the two header
     pseudo-backdrops.
   - `frontend/src/testing/design-guards.ts`: the allowed media features gain
     `prefers-reduced-transparency: reduce | no-preference` (BR-01 v0.4).
   - Also state that the existing `--color-surface-raised` rows stay, because the step indicator, the
     summary, the chooser and `styles.css` still use that surface, and that only the assertion message
     "accent on the header surface" is outdated (F08) (F04).

## Summary

Open: 0 blocker, 0 major, 4 minor (F01 Q-28 worst case is ink-50, not white; F02 `tasks.md` stale; F03
duplicated accent tokens; F04 §11.1.2 inaccurate), 5 nit (F05 AC-31 xmlns wording; F06 pseudo-backdrop
names; F07 `@supports` prelude unchecked / ADR-0010 §2 note; F08 stale JSDoc and assertion message; F09
`stroke-width` literal). R5-F01 and R5-F02 fixed.

**Verdict: APPROVED**, on two conditions: gate attempt 6's e2e passes in both runs, and the backend suite
passes when re-run on its own. The gate's `published-only-routes.test.ts` hook timeout is in code
this round did not touch, but it must not be waved through without a clean re-run. The minors should
be fixed or justified before HC3 (`CLAUDE.md` §12). F01 changes a test and the spec, so it needs
spec-writer → test-engineer if it is accepted.
