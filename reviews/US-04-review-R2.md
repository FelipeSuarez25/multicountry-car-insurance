# US-04 — Code review, round 2

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.2, Approved) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `dea6fd8` (11 commits since R1 `e489301`; 34 since `main`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-22 |
| Verdict | **APPROVED** (0 blocker, 0 major, 0 minor; 1 new nit) |

Reviewed against spec v0.2; `tasks.md` (Gate history: "Review R1 decisions" by Felipe Sabogal, 2026-11-22,
`b74470e`, and "Gate (attempt 2)"); the new FLOW.md rule "the approved design wins; the test adapts";
ADR-0010, ADR-0012 and ADR-0013 (Accepted); `CLAUDE.md`; review round 1; and the vendored
`.claude/skills/frontend-design/SKILL.md` (no global copy used). Human decisions applied: F03 and F04
restore the approved design and adapt the tests; F01, F02 and F05–F08 are fixed; F09 is kept and judged at HC3.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0, no output |
| Build (frontend) | `npx ng build` | exit 0, no budget warning. Initial **458.67 kB raw / 102.99 kB transfer** (R1: 458.23 / 102.95); lazy `quote-form-page` 195.77 kB |
| Unit (frontend) | `npx ng test --watch=false` | **1285 passed / 0 failed** (39 files) |
| Backend | `git diff --name-only e489301..HEAD -- backend` | 0 files. Nothing changed since R1 (backend vs `main`: 0 files), so the backend was not re-run. The orchestrator's gate 2 reports 86/86 |
| E2E | `docker compose -p us04-review-r2 up -d --build --wait` (fresh volume), then `scripts/e2e.sh` | **176 passed / 0 failed** (5.8 min, 8 files). The stack was removed with `down -v` and nothing was left running |
| Traceability | `scripts/trace.sh US-04` | Before this report: exit 1, only because R1-F01/F02 (major) were still `open` in R1. ACs without a test: 0 (AC-22 and AC-23 are manual per the spec). After this report: see the Summary |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 477 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); no personal data |
| Dependencies | `git diff --name-only e489301..HEAD -- '*package*.json'` | 0 files |
| Guard mutation (F05) | A copy of `frontend/` in the scratchpad (tracked files untouched): `disableAnimations: true` → `false` in `panel-overlay.ts:45`, then `ng test --include design-guards.spec.ts` | **Fails** as it should: "US-04-AC-17 every CDK overlay and dialog is created with disableAnimations: true" (1 failed / 58 passed) |
| Comment stripper sanity | `stripComments` re-implemented verbatim in a scratch script, run over every non-test `.ts`/`.html` under `frontend/src` | No file is swallowed (the lowest kept ratio is 0.74). Call sites raw = stripped: `date-field.ts` 1/1, `panel-overlay.ts` 1/1, each with 1 `disableAnimations: true` in code |
| Role and scope per commit | `git show --name-only` for each commit | The fix commits touch only production files (`frontend/src/**`, `contrast-pairs.json`, `tokens.css`). The test commits touch only tests and `src/testing/**`. `dea6fd8` touches only docs and screenshots. Every `fix` commit has `Resolves:` and `Refs:` |

### Browser re-run of the R1 evidence (own Playwright probes against the stack, Chromium of `@playwright/test`)

| R1 item | What was measured | Result |
|---|---|---|
| F01 icons | `/co/datos` and `/cl/datos` at 1280 × 800 and 360 × 740. Each `.control__icon` was scrolled into view, its box clipped, and the brightest pixel taken. Computed `z-index` and the next sibling were also read | All 9 CO and 8 CL icons reach **204** (the icon stroke), including "Tipo de documento", "Ciudad" and "Marca" (sibling `app-custom-select`); R1 measured 33 for these. Computed `z-index: 1` (`--z-icon`). The icons stay under the sticky header (`--z-header` 10) and under the overlay backdrop (see `after/01b-*-360x740`) |
| F02 radio | Plans of CO and CL at 1280 and 360. Pixels sampled on the rendered radio ring, at its centre, and just outside the ring (above and to the left), unchecked and checked, ratios computed from those rendered colours | Plain card: ring `#D8D0FF` on `#14131E`, **12.60:1**. Recommended card: ring on `#6226C0`/`#6125BE` (rendered at the radio), **5.62–5.79:1**. Checked: white disc **18.39:1** (plain), **8.21–8.32:1** (recommended). By token at every gradient stop: ring 5.47 (`#6427C4`), 7.25 (`#4F1B9E`), 11.52 (`#16154D`); disc 7.99 / 10.59 / 16.82. `appearance: none`, 2 px border. Keyboard focus on the radio: 3 px solid `#C0B0FE`, offset 2 px, `:focus-visible` true. With `forcedColors: 'active'`, unchecked shows a `ButtonText` ring and checked shows a `Highlight` fill (computed values only; Playwright emulates only the media query) |
| F03 sheet | 360 × 740 with motion allowed: "Ciudad" opened, then read at +30 ms and again after every finite animation finished. The same for the calendar | +30 ms: animation `sheet-enter` (transform, 200 ms) on `.panel--sheet`, computed `matrix(1,0,0,1,0,261)`, so it is mid-slide. At rest: width 360, bottom 740. Calendar: `calendar-sheet-enter` (transform, 200 ms). The AC-12 e2e and `panelBox()` now wait for `getAnimations()` to settle |
| F03 reduced motion | `reducedMotion: 'reduce'`: select sheet open, calendar open, step change | `document.getAnimations()` is empty in all three; no element has a non-zero animation duration |
| F04 heading | `/cl/datos` → "Continuar", with the plans request held by `page.route` | During loading: `activeElement` is the `H1` "Elige tu plan", `aria-busy="true"`, 0 radios, status "Cargando planes…". After the plans are released: still the `H1`, and Tab reaches `radio#plan-esencial`. With a 500 on plans: the focus is on "Reintentar" (error path unchanged) |
| F06 Ctrl/Cmd+A | macOS (`darwin`): "Bog" typed in "Ciudad", caret at 3 | `Control+A` → selection `[0,0]` (the macOS line-start default, not swallowed). `Meta+A` → `[0,3]` (select all) |
| F06 click toggle | "Tipo de documento": a pointer click, then another, then two script clicks (`el.click()`, detail 0) | `true → false → true → false → true` (open/closed). The list toggles whatever carries the click, and the false claim in the comment is gone |
| F06 open-transition render | Enter → ArrowDown → Enter with gaps of 0, 30 and 100 ms, 3 runs each, on "Tipo de documento" and "Marca" | Correct choice every time (CE; renault, then mazda and kia from the hydrated value). See the F06 notes for one sub-frame case |
| F08 year list | CL, date 15/05/1990, calendar → "Elegir año" → Enter → Home (1906) → Escape → Escape | First Escape: dialog still open, year list gone, grid shown, focus on "15 de mayo de 1990" (the Home move discarded), value unchanged. Second Escape: dialog closed, focus on "Elegir fecha: Fecha de nacimiento" |

## Verification of previous round

| Finding | Severity | Fix commit | Status | Notes |
|---|---|---|---|---|
| US-04-R1-F01 | major | `e3172ac`; test `85f5ad7`, `09db7bf` | fixed | The icon gets `z-index: var(--z-icon)` (new token `--z-icon: 1`, `quote-form.css:24`, `tokens.css:157`), so it paints above the positioned `app-custom-select`. Every icon is now painted (see the browser table). The new e2e (`us-04-design-system.spec.ts`, "US-04-R1-F01 …") hit-tests each icon after making SVGs hit-testable; under the old `--z-base` the select host would be topmost and the test would fail. The `09db7bf` change adds `scrollIntoView` before `elementFromPoint`. Without it, fields below the fold returned `null` and failed wrongly. A `null` or a different topmost element still fails, and `checked < 8` still fails, so the test is not weaker |
| US-04-R1-F02 | major | `b02ed68`; tests `85f5ad7` | fixed | The radio stays a native `<input type="radio">` (keyboard and semantics unchanged) and is drawn from tokens: `appearance: none`, a 2 px `--component-plan-radio-border` (violet-200) ring, and a `--component-plan-radio-dot` (white) fill when checked (`plan-list-page.css:42-57`), with a forced-colors fallback (`:134-139`). The rendered ratios are ≥ 5.47:1 on every surface and gradient stop. `contrast-pairs.json` has rows `plan-radio-ring` and `plan-radio-dot` over `--color-surface` and `--gradient-plan-recommended`, so a darker token now fails `contrast.spec.ts`. Craft (vendored `frontend-design`): the checked state is a solid light disc, not a ring plus dot. It reads clearly next to the "Seleccionado" badge and the chosen-card border; the look is for the HC3 visual pass, not a defect |
| US-04-R1-F03 | minor | `3540309`; tests `85f5ad7` | fixed | Human decision applied: `@keyframes sheet-enter` / `calendar-sheet-enter` are back to `translateY(100%) → none` (ADR-0013 §2), still inside the no-preference block. The tests adapt: `settleAnimations()` (`e2e/support/design.ts:137-145`) is awaited by `panelBox()` and `targetProblems()`. It polls until no finite animation is running, so it cannot pass early, and a stuck animation times out. A reduced-motion e2e asserts 0 animations right after opening. Verified in the browser (mid-slide at +30 ms, final box at rest, nothing under reduce) |
| US-04-R1-F04 | minor | `f24db92`; tests `85f5ad7` | fixed | Human decision applied: `afterNextRender` in the constructor focuses the `h1` on arrival unless the load already failed (`plan-list-page.ts:55-59`), so it is the pre-US-04 behaviour again. The e2e now waits for the 3 plans before pressing Tab (`us-01-03-full-flow-co.spec.ts`, three places), which is the test adapting. Verified with a held request (above). One test-title problem: see R2-F01 |
| US-04-R1-F05 | minor | no production change; `stripComments` and self-test in `85f5ad7` | fixed | `cdkAnimationUse()` strips `//`, `/* */` and `<!-- -->` comments, skipping string literals (`src/testing/design-guards.ts:244-273`). The self-test covers a commented `true` next to a `false`, and a URL with `//` inside a string. The mutation `false` at `panel-overlay.ts:45` is now caught (above) |
| US-04-R1-F06 | minor | `d912452`; tests `85f5ad7`, `09db7bf` | fixed | (1) The detail-0 handler and its false comment are gone; the control toggles on every click (verified, plus e2e and unit tests). (2) The Ctrl+A override is gone; the macOS default is kept (verified), and the AC-07 e2e now clears with `ControlOrMeta+A`, the platform select-all. That is a test fix, not a weakening: the test is about filtering, not Ctrl+A. (3) The global `ApplicationRef.tick()` is replaced by `ChangeDetectorRef.detectChanges()` on this component's own view, queued as a microtask only from a closed control (`custom-select.ts:155-159, 167`) and run only if the control is then expanded, so it runs only on the open transition. The panel portal uses this component's `ViewContainerRef`, so the list is inside the refreshed view. The reason is documented in the JSDoc and the commit message. **Judgement on the remaining workaround:** acceptable. It is local, it has a bounded cost (one view, once per open), and it changes no behaviour a person can see. Its purpose is to make the first key after "open" reach a ready list. Limit observed: with **zero** delay between keys, Enter → Enter on a select-only control that already has a value leaves the list open (6/6 runs). With 16 ms or more (one frame) it closes (12/12). No person or assistive technology sends two keys within the same frame, so this is no finding; it shows the microtask narrows the race rather than removing it. Should a future e2e need sub-frame keys, fix the code, not the timing |
| US-04-R1-F07 | nit | `665bf91` | fixed | Rows `text-on-brand` (min 4.5) and `focus-on-hover` (min 3) added; no token value changed. The unit test requires both rows |
| US-04-R1-F08 | nit | `87ad356`; tests `85f5ad7` | fixed | `Calendar.onKeydown`: with the year list open, Escape stops propagation (so the CDK listener does not close the dialog), returns to the grid and refocuses the day (`calendar.ts:93-104`). A second Escape closes the dialog. Verified in the browser; unit and e2e tests cover both presses |
| US-04-R1-F09 | nit | — | deferred to HC3 | Human decision (Gate history, `b74470e`): the focus ring box around the arriving `h1` is kept and judged at HC3. It is still visible in every refreshed `after/` capture |

## Design versus tests this round (FLOW.md rule of 2026-11-22)

No fix changed the approved design to suit a test. F03 and F04 went the other way: the design was restored
and the e2e now waits (`settleAnimations()`; `expect(plans(page)).toHaveCount(3)` before Tab). The other
behaviour changes come from review findings, not from a red test: the select icons painted (F01), the token
radio (F02), dropping the Ctrl+A and detail-0 tweaks (F06) and Escape in the year list (F08). Test-helper
changes: `openCombobox()` (`src/testing/dom.ts:130-144`) no longer clicks an already-open list. That is
correct now that a click toggles, and the helper still throws if no listbox opens. Neither `09db7bf` change
removes an assertion (see F01 and F06 above). The one remaining production timing aid (the F06
open-transition render) is older than this round, has been narrowed, and changes nothing visible.

## AC verification

No AC implementation changed since R1 except through the fixes above. The R1 table stands, with these updates:

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-04-AC-02 | `tokens.css` (`--component-plan-radio-*`), `contrast-pairs.json` (4 new rows), `plan-list-page.css:42-57` | `contrast.spec.ts` › R1-F02, R1-F07; `design-guards.spec.ts` › R1-F02; e2e › R1-F02 | ✅ (R1-F02 and R1-F07 fixed) |
| US-04-AC-04 | `quote-form.css:24` (`--z-icon`) | `field-icons.spec.ts`; e2e › R1-F01 (both countries) | ✅ (R1-F01 fixed; pixels verified) |
| US-04-AC-06 / AC-07 | `custom-select.ts:138-196` | `custom-select.spec.ts` › R1-F06; e2e AC-06/AC-07, R1-F06 | ✅ |
| US-04-AC-09 | `calendar.ts:93-104` | `date-field.spec.ts` › R1-F08; e2e › R1-F08 | ✅ |
| US-04-AC-12 | `custom-select.css`, `calendar.css` (slide restored) | e2e AC-12 (measured at rest), R1-F03 (motion and reduce) | ✅ (R1-F03 fixed) |
| US-04-AC-14 / US-02 §8 Arrival | `plan-list-page.ts:55-59` | `plan-list-page.spec.ts` › R1-F04; e2e full flow | ✅ (R1-F04 fixed) |
| US-04-AC-17 | `panel-overlay.ts:45`, `date-field.ts` | `design-guards.spec.ts` (guard now sees through comments) | ✅ (R1-F05 fixed; mutation caught) |
| US-04-AC-22 | `docs/qa/US-04/after/` refreshed in `dea6fd8` | manual | ✅ The select icons and token radios are visible; the sheet capture `01b-*-360x740` is at rest |
| US-04-AC-23 | — | manual (HC3) | — |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R2-F01 | nit | `frontend/src/app/features/plan-list/plan-list-page.spec.ts:948-965`; `frontend/src/app/shared/custom-select.spec.ts:511` | The R1-F04 unit test's title says the `h1` "keeps it [the focus] when the plans arrive", but the test never asserts the focus after the plans arrive. It goes through a 10 s timeout, the error state and "Reintentar", and checks only the plan names. In the R1-F06 Cmd+A test, line 511 dispatches an event whose result is never read (a duplicate of lines 512-513) | Checklist "the test asserts behaviour"; maintainability | open | |

### US-04-R2-F01 — R1 test title claims more than it checks; one dead line (nit)

The first R1-F04 test proves what matters: the `h1` has the focus while "Cargando planes…" is shown. Its
second half does not prove what the title says, because after the timeout the page is in the error state
(the focus correctly moves to "Reintentar"), and after the retry no focus assertion follows. The e2e
covers the real case: focus on the `h1`, then the plans load, then Tab reaches the plan group. My probe
confirms the `h1` keeps the focus when held plans are released. So this is a wording and hygiene issue,
not missing coverage. Either trim the title, or release the held request instead of timing it out and
assert `document.activeElement` is still the `h1`. In `custom-select.spec.ts:511`, remove the unread
dispatch.

## Notes for HC3 (no finding)

- **F09** (focus box around the arriving `h1`) is yours to judge, as decided.
- **Plan radio look:** checked = a solid light disc inside the violet-200 ring (not a ring plus an inner
  dot). It meets contrast everywhere; whether it reads as "radio" enough is a visual call.
- **Forced colours:** only the media query could be emulated. A real Windows High Contrast check of the
  plan radio (`ButtonText` ring, `Highlight` fill) belongs to the HC3 manual pass.
- `specs/US-04/tasks.md` *Last updated* still reads "2026-11-21 by frontend-developer", although the
  status rows were updated on 2026-11-22. That field belongs to the orchestrator.

## Summary

R1: F01–F08 fixed; F09 deferred to HC3 (human decision). New: US-04-R2-F01 (nit).

Open: 0 blocker, 0 major, 0 minor, 1 nit.
