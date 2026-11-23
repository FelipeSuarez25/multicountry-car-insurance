# US-04 — Code review, round 3

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.3, Approved; HC3 round 1 changes BR-17..BR-21, AC-24..AC-29) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `20604cc` (9 commits since R2 `f35353e`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-22 |
| Verdict | **CHANGES REQUESTED** (0 blocker, 3 major, 2 minor, 3 nit) |

Reviewed against spec v0.3 (§4 BR-17..BR-21, §5 AC-24..AC-29, §7.1, §7.2, §11, §11.1.1, §13 v0.3 row),
ADR-0014 (Accepted by the human, 2026-11-22), ADR-0004/0010/0011/0012 as amended, `CLAUDE.md`, the
`review-checklist`, `dynamic-form-fields` and `strapi-content-modeling` skills, and reviews R1 and R2.
Scope: `git diff f35353e..HEAD`.

## Automated checks (run by the reviewer unless marked "gate")

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0, no output |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.spec.json --noEmit` | exit 0 / exit 0 |
| Unit (frontend) | `npx ng test --watch=false` | **1429 passed / 0 failed** (40 files) |
| Build (gate) | `g-febuild.txt` | Initial 469.62 kB raw / 104.34 kB transfer (R2: 458.67 / 102.99); lazy `quote-form-page` 199.12 kB; no budget warning |
| Backend (gate) | `g-belint.txt`, `g-bebuild.txt`, `g-betest.txt` | lint clean; build ok; **86 / 86** passed (4 files). No new backend test (see F03) |
| E2E (gate, not run by the reviewer as instructed) | `g-e2e1.txt` | Run 1: **253 passed** (5.0 min). Run 2 (`g-e2e2.txt`) was still running when this report was written |
| Traceability | `scripts/trace.sh US-04` | ACs without test: 0 (AC-22, AC-23 manual). Open blocker/major before this report: 0 (R2-F01 nit still marked open in R2; fixed, see below). After this report: exit 1 because of F01–F03 |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 487 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); personal data none |
| Dependencies | `git diff --name-only f35353e..HEAD -- '*package*.json'` | 0 files (no new package, AC-21 holds) |
| Role and scope per commit | `git show --name-only` for each commit | Clean. `bd2fe3e` touches only `backend/src/seed/form-fields.ts` (BR-07 exception (c)). `eadddf2` touches only production frontend files and `tasks.md`. `a898c63`, `84e17aa`, `20604cc` touch only tests and `src/testing/**`. Docs commits touch only spec/ADR files. Every `feat`/`test` commit has `Refs:`; `4c12499` has `Resolves: US-04-R2-F01` |
| Mask probe | `node --experimental-strip-types` on `src/app/shared/date-text.ts` (no file written) | See F01 |
| IME probe | headless Chromium of `@playwright/test`, `page.setContent` with an input that has the same capture-phase rewrite as `InputProfile`, CDP `Input.imeSetComposition` / `Input.insertText` (no app, no stack) | See F02 |

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-04-AC-24 | `shared/panel-position.ts:19-68` (`needsScrollBeforeOpen`, `revealRoomBelow`, header-aware `withViewportMargin`), `shared/date-field.ts:89-93`, `styles.css:15-16` (`scroll-padding-top`), `shared/calendar.html`/`.css` (one head row, footer row, 1.75rem weekday row, 27rem max height), `shared/site-header.css` (`--size-header-height`) | `e2e/us-04-hc3-round1.spec.ts` › AC-24 (3 placement rows, compact sizes, Escape with the field low); `us-04-design-system.spec.ts` AC-12 now "below only" | ✅ Sheet path unchanged (`calendar--sheet` keeps `--size-sheet-max-height`). "Opens above" is unreachable at the BR-11 sizes, as the spec says |
| US-04-AC-25 | `shared/date-text.ts:38-78`, `shared/date-field.ts:51-74`, `date-field.html` (`maxlength="10"`), `quote-form.ts` `errorOf` | `date-text.spec.ts`, `date-field.spec.ts`, `quote-form-page.spec.ts`, e2e AC-25 | ⚠️ Every scenario row passes; edits away from the end of the text are broken (F01) |
| US-04-AC-26 | `shared/field-input-profiles.ts`, `shared/input-profile.ts`, `quote-form.html:51-66`, `quote-form.ts:57-62,138-150`; seed `backend/src/seed/form-fields.ts` | `field-input-profiles.spec.ts`, `field-validators.spec.ts`, `quote-form-page.spec.ts`, e2e AC-26 | ⚠️ Front end OK for keyboard and paste; IME not handled (F02); the seed side has no test (F03) |
| US-04-AC-27 | `tokens.css` (`--gradient-page`, `--color-bg` → ink-925, surfaces one step up), `styles.css:20-25`, `contrast-pairs.json` (+`--gradient-page` in every page-background row) | `design-guards.spec.ts` AC-27 block (semantic token, token stops, luminance floor, body paint, self-test); `contrast.spec.ts` (texture over the lightest stop, per-stop expansion, self-tests); e2e AC-27 on six pages | ✅ The guard is stricter than before (texture worst case now over `#231541`). Every pair passes |
| US-04-AC-28 | `shared/back-link.ts`/`.css`, `shared/site-header.*`, `quote-form-page.html:2`, `plan-list-page.html:2`, `summary-page.html:2-4` (hidden after payment), `wizard-shell.html` | `wizard-chrome.spec.ts` (incl. the country-list error case), `summary-page.spec.ts`, e2e AC-28 | ✅ Chip name "Cambiar país (actual: <Strapi name>)" contains the visible name; arrow and flag `aria-hidden`; 44 px min box; no country code outside `country-visuals.ts` (`accentOf` goes through `countryVisuals`) |
| US-04-AC-29 | `features/country/country-chooser-page.html`/`.ts`/`country-page.css`, `tokens.css` `[data-choice-accent]` | `country-chooser-page.spec.ts`, e2e AC-29 | ✅ with F04 (list semantics) and F07 (icon map duplicated) |
| US-04-AC-08 / AC-11 (regressions) | `errorOf` maps any `parse` error to `DATE_TEXT_ERROR`; `syncNative`, `flushBindings`, `nativeKeys` removed; number fields are `type="text"` with the digits profile; `flushModel` writes every key | US-01 e2e and component tests changed exactly as §11.1.1 lists (verified one by one below) | ✅ Stored values for accepted input unchanged; the ADR-0004 single-writer rule holds (`flushModel` only) |

### Test changes checked against §11.1.1 and the human request

- `us-01-data-form-co.spec.ts`: the `fullName` message row, the two "required date partly cleared" tests
  (only `MESSAGE` changed) and the US-01-AC-09 "1e" test (now shows and stores "1", then the yearRange
  message, `aria-invalid`, stays on `/co/datos`) match §11.1.1. Shown **and** stored are still asserted.
- `us-01-country-context.spec.ts`: the spinbutton loop is replaced by a named year text box check plus
  `spinbutton` count 0, so the check cannot become vacuous. Stronger, as listed.
- `us-04-design-system.spec.ts`: AC-08 message regex and AC-12 "below only". Stricter, as listed.
- `20604cc` (three "defective" e2e checks), judged faithful:
  1. `getByRole('banner', { includeHidden: true })`: the open modal sets `aria-hidden` on the page (AC-09),
     so the header was unreachable by role while the calendar is open. It is used for geometry and for
     "exactly one link". `includeHidden` can only count more links, so it does not loosen anything.
  2. Stored `''` vs an absent key: the AC-25 invalid rows now accept "absent" as `''`. ADR-0003 writes no
     entry for an all-empty state, and the date model never changes from `''`. A stale ISO value still
     fails, so the assertion keeps its strength.
  3. `fromTopOfDocument()`: `blur()` leaves Chromium's sequential-navigation starting point at the old
     element, so "Tab from the top" was not what the test did. A temporary first child is focused and
     removed, and the test now waits for the arrival focus on the `h1` first. This matches the Gherkin
     "When I press Tab from the top of the document".
  4. `settleAnimations()` before `placeFieldLow` measures at rest. This is a flake fix with no change
     to the assertion.
- `84e17aa`: `tabStops()` names links instead of collapsing them to `a` (stricter), and the US-03-AC-16
  sequence gains the two leading stops, with the rest unchanged. Faithful to AC-28, but not listed in
  §11.1.1 (F06).

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R3-F01 | major | `frontend/src/app/shared/date-text.ts:64-66`; `shared/date-field.ts:65-74`; `shared/date-field.html` (`maxlength="10"`) | The date mask breaks edits away from the end of the text. Separators that are already shown are treated like typed separators, so they pad. Backspace inside the month deletes nothing; correcting the day turns it into `01`, which `maxlength` then locks; inserting a digit shifts the year into a valid but wrong date (`06/01/0519`), which `minAge` accepts | BR-18 ("Backspace removes the character before the caret"), US-04-Q-23 (mid-text caret handling per ADR-0014), ADR-0014 §2; checklist "tests fail when the behaviour breaks" | open | |
| US-04-R3-F02 | major | `frontend/src/app/shared/input-profile.ts:28-38` | The capture-phase sanitiser rewrites `el.value` during IME composition. There is no `isComposing` / `compositionend` handling. In a Chromium composition emulation, composing `a`→`ab`→`abc` in an uppercase field gives **`AABABCABC`**, and a dead-key `´` composition is cancelled and restarted. ADR-0014 §3 says the mechanism "covers … IME text"; no test covers composition | ADR-0014 §3; BR-19 ("the rest of the text is kept"); checklist a11y/keyboard and mobile | open | |
| US-04-R3-F03 | major | `backend/src/seed/form-fields.ts:34-62`; `backend/tests/` (no new test); `frontend/e2e/us-04-hc3-round1.spec.ts:345-375` | No test reads the real seed rules. The spec's test mapping for AC-26 requires a backend seed test, and none was added. The e2e `maxlength` rows expect the same values as the front-end fallbacks (10/12/6), so they pass without the Strapi `maxLength` rules. The `fullName` `pattern` is checked only through the front-end fixture. Removing `fullNamePattern` or the three `maxLength` rules from the seed leaves every test green | spec §11 (AC-26 row: "backend unit (seed content rows)", "a backend seed test (`backend/tests/`)"); AC-26 "Strapi seed content" scenario; checklist "missing test for an AC" | open | |
| US-04-R3-F04 | minor | `frontend/src/app/features/country/country-page.css` `.how__steps` (`list-style: none`) | WebKit (Safari + VoiceOver) drops list semantics from an `ol` with `list-style: none` unless it has `role="list"`, so "Cómo funciona" is not announced as a list of 3 there | AC-29 ("an ordered list of exactly three items"); checklist a11y | open | |
| US-04-R3-F05 | minor | `specs/US-01/seed-fields.md:13,28`; `specs/US-04/tasks.md` Status block, T-28, T-40 | The US-01 seed annex still shows the old `fullName` message and rules, and the US-01 Review log row is missing (T-40 `todo`), although spec §7.1 says they "are updated to match". The `tasks.md` Status block is stale: "Blockers: ADR-0014 must be Accepted", T-28 "in progress", "T-32..T-35 implemented, uncommitted" | spec §7.1; `CLAUDE.md` §1 (decisions recorded where they apply) and §11 (state lives in `tasks.md`) | open | |
| US-04-R3-F06 | nit | `frontend/src/app/features/summary/summary-page.spec.ts:1259-1260`; `src/testing/summary-dom.ts:105` | The US-03-AC-16 tab-order test changed (faithfully: two leading stops added, links now named), but §11.1.1, which calls itself the "complete list", does not list it. Its "Not affected" note talks only about the e2e keyboard tests | spec §11.1.1; BR-07 ("a test changes only as listed") | open | |
| US-04-R3-F07 | nit | `frontend/src/app/features/country/country-chooser-page.html:33-44` | The chooser repeats the step-to-icon mapping in a local `@switch` (UserRound / ShieldCheck / Receipt) instead of taking it from the step indicator. If an indicator icon changes, the two diverge silently, and the spec asks for "the step indicator's icon for that step" | maintainability; AC-29 | open | |
| US-04-R3-F08 | nit | `shared/field-input-profiles.ts:22,32` vs seed `fullNamePattern` | The `fullName` filter lets in any `\p{L}`, but the seed pattern accepts only Latin-1 letters. A name such as "Łukasz" can be typed and then fails with "…solo letras…". This is as specified (§7.2 and §7.1); flagged for the HC3 values review (T-39) | spec §7.1/§7.2, US-04-Q-27 | open | |

### US-04-R3-F01 — The date mask breaks edits away from the end of the text

`maskDateDigits` rescans the whole raw text. A `/` that is **already shown** after a one-digit group
pads that group (`date-text.ts:64-65`), exactly like a separator the person just typed. Once a digit
is deleted or inserted inside the text, a group can hold a single digit next to an existing `/`.
Results of the pure function (the same call `DateField.onInput` makes with `selectionStart`):

| Starting text, action | Raw after the browser edit (caret) | Shown (caret) | Expected per BR-18 |
|---|---|---|---|
| `15/05/1990`, caret after the month's `5`, Backspace | `15/0/1990` (4) | `15/00/1990` (4) | `15/0/1990`-like: the `5` removed |
| `15/00/1990` (4), Backspace again | `15/0/1990` (3) | `15/00/1990` (**2**) | the `0` removed. Here nothing is removed and the caret jumps back: the month cannot be cleared from the middle |
| `15/05/1990`, caret after `15/0`, Backspace | `15/5/1990` (3) | `15/05/1990` (2) | the `0` removed. Here the text is unchanged and only the caret moves |
| `15/05/1990`, caret after the day's `5`, Backspace | `1/05/1990` (1) | `01/05/1990` (1) | `1/05/1990`-like. Here the day silently becomes `01` |
| `15/05/1990`, select the day `15` and type `1` | `1/05/1990` (1) | `01/05/1990` (1) | then typing `6` should give `16/05/1990`, but the box is already 10 characters, so `maxlength="10"` blocks the `6`: the day cannot be re-typed |
| `01/05/1990` with `maxlength` removed or bypassed, caret 1, type `6` | `061/05/1990` (2) | **`06/01/0519`** | a **valid** date (`parseDateText` → `0519-01-06`); the only rule is `minAge`, so it is accepted and stored |

So a person correcting a typo in the day or month (a common action) gets a silently changed value or
a box that does not respond. The only way out is to select all and re-type. The AC-25 rows and
`date-text.spec.ts` exercise only edits at the end of the text, plus one mid-text insertion whose
digit shift is asserted as intended (`15/095/1990` → `15/09/5199`). This is why the gate is green.
BR-18 states "Backspace removes the character before the caret" without limiting it to the end, and
Q-23 defers mid-text caret handling to ADR-0014, whose §2 promises "Backspace natural".

Expected: Backspace and Delete anywhere remove exactly one digit (a separator goes with its digit). A
digit typed or deleted in one group does not pad a neighbouring group and does not shift digits across
the day/month/year boundaries in a way that yields a different valid date. Add unit rows for
mid-text Backspace, Delete and select-and-replace of the day and of the month, plus one e2e
(`press('ArrowLeft')` ×N, `Backspace`, then type). One possible direction, not prescriptive: pad only
on a separator that is the character just inserted, which needs `InputEvent.data`/`inputType`, or
mask from the digit string while keeping the edited group's digit count.

### US-04-R3-F02 — The input-profile directive does not handle IME composition

`InputProfile` rewrites `el.value` and the selection on every `input` event, including
`insertCompositionText` events fired while an IME composition is active (`isComposing === true`).
Writing the value mid-composition makes the browser cancel or desync the composition. Angular's own
`DefaultValueAccessor` buffers composition for this reason (`@angular/forms` `COMPOSITION_BUFFER_MODE`,
`forms.mjs:159-211`). The ADR's reason for choosing an `input` listener over `beforeinput` was that it
"covers paste, autofill and IME text".

Evidence (headless Chromium from the repo's `@playwright/test`, an input with the same capture-phase
"filter, write value, set caret" logic, composition driven by CDP `Input.imeSetComposition`):

- Uppercase transform (the `plate` and RUT profiles): composing `a`, `ab`, `abc` and then committing
  `abc` leaves **`AABABCABC`**. This is the known duplicated-text failure of Android keyboards such as
  Gboard, which compose every word. `autocapitalize="characters"` lowers the risk on `plate`, but it does
  not remove it (the person can switch caps off, and the RUT `k` is composed lowercase).
- Dead key (macOS Spanish layout, `´` then `e` for "é", the `fullName` row "José Núñez"): the `´`
  composition text is not a letter, so it is dropped. The log shows the composition cancelled and a
  second `compositionstart`. Under CDP the final value is still "José", because CDP drives the commit.
  With a real OS input method the cancelled dead-key state may not survive, so a real macOS check is
  needed. This half is unverified on a real device and is reported as a risk.

Playwright's `pressSequentially`/`fill` never compose, so the 253 e2e tests cannot see this. Expected:
do not rewrite while `isComposing` is true; sanitise once on `compositionend` (or on the following
`input` with `isComposing === false`), with a unit/component test that dispatches composition events.
At HC3 (T-39), check the plate and name fields on an Android phone and with macOS dead keys.

### US-04-R3-F03 — No test exercises the real seed rules

The spec's test mapping (§11, AC-26 row) lists "backend unit (seed content rows)" and "a backend
seed test (`backend/tests/`)". `bd2fe3e` changes only `backend/src/seed/form-fields.ts`, and
`backend/tests/` gained nothing (the gate's 86 tests are the R2 set). On the front end:

- `frontend/src/testing/seed-fixtures.ts` mirrors the seed by hand, so the `field-validators` and
  `quote-form-page` rows test the fixture, not the seed.
- The e2e attribute rows expect `maxlength` 10 / 12 / 6, which are also the profiles' `fallbackMax`
  (`field-input-profiles.ts:41-43`), so they pass whether or not Strapi sends the `maxLength` rules.
- The only e2e that reaches the seed's new content is "Al" (`minLength` with the new `errorMessage`). The
  "Ana 2" hydration scenario that would hit the seed `pattern` exists only as a component test with
  the fixture.

Mental mutation: delete `fullNamePattern` from both countries, or the three `{ kind: 'maxLength' }`
entries, in the seed → no unit, backend or e2e test fails. The seed is the source of truth for
validation (ADR-0004, ADR-0014 D2), so this AC-26 scenario ("Strapi seed content (CO and CL)") is
effectively untested. Expected: a backend test over the seed definitions (rules in order, existing
rules first, new ones appended, `fullName` message), and/or an e2e that reads `/api/form-fields` for CO
and CL, or that hydrates "Ana 2" through `sessionStorage` against the stack.

### US-04-R3-F04 — "Cómo funciona" loses list semantics in WebKit

`.how__steps { list-style: none }` on the `ol`. Safari removes list semantics from such lists for
VoiceOver unless `role="list"` is present, so the ordered list of three steps (AC-29) is not
announced as a list there. Chromium, which the tests use, keeps the role, so the component and e2e
tests cannot catch it. Check it in the HC3 screen-reader pass.

### US-04-R3-F05 — Traceability documents not updated

Spec §7.1 says the fixtures and `specs/US-01/seed-fields.md` "are updated to match (§11.1, task
US-04-T-40)". The fixtures were updated, but the annex still lists `fullName` with "minLength 3,
maxLength 80" and the old message, and `documentNumber`/`plate` without `maxLength`. The US-01 spec has
no Review log row for the US-01-AC-09 number behaviour and the date message that ADR-0014 changed.
T-40 is `todo`. `specs/US-04/tasks.md` also still says ADR-0014 needs acceptance and that the
implementation is uncommitted. This does not block QA, but it must be closed before HC3 (DoD:
`tasks.md` state, recorded decisions).

### US-04-R3-F06 / F07 / F08

See the table. F08 is spec-conformant and is listed only so the human sees the mismatch when reviewing
the recommended values (Q-27).

## Other observations (no finding)

- Capture-phase ordering: `InputProfile` registers `{ capture: true }` on the element itself.
  `@angular/forms@22.3.0` registers a plain listener (`signals.mjs:1100`). By DOM dispatch, capture at
  the target runs first, so Signal Forms reads the sanitised value. `quote-form-page.spec.ts`
  ("the sanitised value is what is written to the browser storage") would fail if the order flipped.
- Caret: `sanitizeInput` keeps the caret after the kept characters that preceded it (iterates code
  points; `transform` is applied only to ASCII and `k`, so no length change). The paste e2e and unit
  tests assert the caret at the end.
- `maxlength` comes from the Strapi rule first (`maxLengthFor`) and works for unknown fields (the
  `mobilePhone` fixture). The RUT variant is chosen by the `rutCheckDigit` rule, not by country.
- Number fields: `type="text"`, `inputmode="numeric"`, string model (ADR-0004). `validateField`'s
  integer check still rejects a hydrated `2015.5`. `syncNative`, `flushBindings` and `ApplicationRef`
  are gone with no remaining caller. The single-writer rule holds through `flushModel`, and `typed()`
  writes `''` only for a key absent from the store.
- Paste truncation by `maxlength` before the filter (for example, CO "1.012.345.678" pasted gives
  "1012345") is the documented ADR-0014 trade-off, accepted by the human; not raised again.
- Calendar: the header offset comes from `scroll-padding-top` (one source), `revealRoomBelow` scrolls
  only on wide screens and instantly (ADR-0013), and the sheet keeps `--size-sheet-max-height`.
- Tokens only: new CSS uses tokens throughout; `design-guards.spec.ts` (no loose values, country-code
  guard) passes. `[data-choice-accent]` lives in `tokens.css` next to `[data-country-accent]`, and the
  code reaches it only through `countryVisuals()`.
- Contrast: with the dots composited over the lightest stop `#231541`, every `contrast-pairs.json` row
  passes. `--color-choice-accent` resolves to the same primitives as the already-proven
  `--color-country-accent`.
- Security: no `innerHTML` or `bypassSecurityTrust*` was added. The front end sends nothing new to
  Strapi (seed content only, written server-side in bootstrap). No token or env change.
- Seed: the pattern is anchored, written as an explicit Latin-1 class with no `u` flag (it compiles under
  `new RegExp('^(?:…)$')`), and the new rules are appended after the existing ones. The create-only rule
  is unchanged, so existing databases keep the old content (documented reset with `down -v`).

## Verification of previous round

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|
| US-04-R2-F01 (nit) | `4c12499` | yes, fixed | The R1-F04 loading test is retitled to what it checks. The "plans arrive" test now asserts the 3 plan names and radios and that `document.activeElement` is still the `h1`. The duplicate `dispatchEvent` in the Cmd+A test is removed. Test-only commit with `Resolves:` |
| US-04-R1-F09 (nit, deferred to HC3) | — | still deferred | Human decision `b74470e`; judged at HC3 |

## Summary

Open: 0 blocker, 3 major (F01, F02, F03), 2 minor (F04, F05), 3 nit (F06, F07, F08).

The HC3 round 1 work is mostly correct. Calendar placement, the gradient and its contrast proof,
back links, the chip link, the chooser, the removal of `syncNative`, and the faithful test fixes
(`20604cc`, `84e17aa`) are all good. The date mask fails on the ordinary action of correcting a digit
in the middle (F01). The input filter is unsafe under IME composition, which the ADR claims to cover
(F02). The seed side of AC-26 has no test that would fail if the rules were lost (F03).
