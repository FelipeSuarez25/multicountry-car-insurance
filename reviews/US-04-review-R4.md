# US-04 — Code review, round 4

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.3, Approved; v0.3 clarifications of BR-18, Q-23 and BR-19 from review R3, 2026-11-22) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `b8cf48e` (3 commits since R3 `7b47038`: `07849f9` docs, `ac8c0a1` fix, `b8cf48e` test) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-22 |
| Verdict | **CHANGES REQUESTED** (0 blocker, 1 major, 2 minor, 3 nit open; R3-F08 and R1-F09 stay with the human at HC3) |

Reviewed against spec v0.3 (BR-18 and BR-19 with their "v0.3 clarification" paragraphs, Q-23, §11.1.1, §13
2026-11-22 rows), ADR-0014 §2–§3, `CLAUDE.md`, the `review-checklist`, `dynamic-form-fields` and
`strapi-content-modeling` skills, and review R3. Scope: `git diff 7b47038..HEAD`.

The production fixes for all three R3 majors are correct and I verified them in a real browser. The
verdict is CHANGES REQUESTED only because the gate is red: three of the new e2e tests fail
deterministically in both gate runs, and a fourth passes without testing anything. All four are defects
in the test file, not in the app (R4-F01).

## Automated checks (run by the reviewer unless marked "gate")

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0, no output (gate `g4-felint.txt`: empty, same) |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.spec.json --noEmit` | exit 0 / exit 0 |
| Unit (frontend) | `npx ng test --watch=false` | **1456 passed / 0 failed** (40 files; R3: 1429). Gate `g4-unit.txt`: same 1456 / 40 |
| Build (gate) | `g4-febuild.txt` | Initial 470.06 kB raw / 104.38 kB transfer (R3: 469.62 / 104.34); lazy `quote-form-page` 200.03 kB; no budget warning |
| Backend | `npm test`, `npm run lint` (reviewer); gate `g4-belint.txt`, `g4-bebuild.txt`, `g4-betest.txt` | lint clean; build ok; **116 / 116** passed (5 files; R3: 86 / 4). New file: `backend/tests/seed-form-fields-input-rules.test.ts` |
| **E2E (gate; not run by the reviewer, as instructed)** | `g4-e2e1.txt`, `g4-e2e2.txt` | **Run 1: 267 passed, 3 failed (5.4 min). Run 2: 267 passed, 3 failed (4.8 min).** The same three tests fail in both runs: `us-04-r3-fixes.spec.ts:35`, `:44`, `:75` (R4-F01). The other 14 new tests (F01 Backspace/Delete/select, F02 CDP composition ×3, F03 Strapi API ×6) pass |
| Browser probe of the failures | headless Chromium of `@playwright/test` against the gate's stack at `http://localhost:8080/co/datos`, run **after** gate run 2 had finished; read-only (GETs only, nothing stored server-side) | Root causes in R4-F01; the app does what the decision says once the caret is really placed |
| Traceability | `scripts/trace.sh US-04` | ACs without test: 0 (AC-22, AC-23 manual). With this report: 1 open major (R4-F01), so it exits 1 |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 491 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); personal data none |
| Dependencies | `git diff --name-only 7b47038..HEAD -- '*package*.json'` | 0 files |
| Role and scope per commit | `git show --name-only` for each commit | Clean. `07849f9` touches only `specs/US-01/{seed-fields,spec}.md` and `specs/US-04/{spec,tasks}.md`. `ac8c0a1` touches only production frontend files (no test, no `tasks.md`). `b8cf48e` touches only test files (`backend/tests/`, `frontend/e2e/`, `*.spec.ts`). Trailers: `ac8c0a1` `Resolves: US-04-R3-F01, F02, F04, F07`; `07849f9` `Resolves: R3-F05, F06`; `b8cf48e` `Resolves: R3-F03`; all three have `Refs:` |
| Mask probe | `node --experimental-strip-types` importing `src/app/shared/date-text.ts`, with the `DateField.onInput` pre-step (Backspace/Delete over a `/`) and the browser's `maxlength="10"` emulated (no file written) | See "R3-F01 evidence" |
| IME probe | headless Chromium, `page.setContent` with the new `InputProfile` logic (capture `input` skipped while composing, sanitise plus a synthetic `input` on `compositionend`, a bubbling "model" listener), CDP `Input.imeSetComposition` / `Input.insertText` | See "R3-F02 evidence" |

## Verification of previous round

| ID | Severity | Fix commit | Status | Notes |
|---|---|---|---|---|
| US-04-R3-F01 | major | `ac8c0a1` (fix), `b8cf48e` (tests), `07849f9` (decision) | fixed | Production behaviour verified with the pure function, the component tests and a real browser (see "R3-F01 evidence"). Three of its e2e tests are defective and one is vacuous; that is tracked as R4-F01, not reopened here |
| US-04-R3-F02 | major | `ac8c0a1`, `b8cf48e` | fixed | See "R3-F02 evidence". The 3 CDP e2e tests pass in both gate runs |
| US-04-R3-F03 | major | `b8cf48e` | fixed | `backend/tests/seed-form-fields-input-rules.test.ts` imports the real `SEED_FORM_FIELDS`. It checks the exact `fullName` pattern (CO, CL), the rule order `minLength, maxLength, pattern`, the new `errorMessage`, the pattern compiled as the front end does (no `u` flag) with accept/reject rows, and one `maxLength` each of 10/12/6/6 appended after the existing rules. Mental mutation: deleting `fullNamePattern` or any of the three `maxLength` rules now fails this file. The 6 e2e tests in `us-04-r3-fixes.spec.ts` › R3-F03 read `/api/form-fields` for CO and CL and pass in both runs, so a stale or unseeded database fails too, and the `maxlength` rows can no longer pass on the front-end fallback alone. One test in the backend file is vacuous (R4-F06) |
| US-04-R3-F04 | minor | `ac8c0a1` | fixed | `country-chooser-page.html:32` `<ol class="how__steps" role="list">`. The VoiceOver check stays in the HC3 screen-reader pass |
| US-04-R3-F05 | minor | `07849f9` | fixed | `specs/US-01/seed-fields.md` matches the seed of `bd2fe3e` (rules in seed order; `fullName` pattern and message; `maxLength` 10/12/6). The US-01 spec Review log has the cross-reference row. T-40 is done. The `tasks.md` Status block was refreshed but went stale again with the fix commits (R4-F02) |
| US-04-R3-F06 | nit | `07849f9` | fixed | The §11.1.1 component table lists the US-03-AC-16 tab-order change (`84e17aa`). The "Not affected" note now says it covers only the e2e keyboard tests |
| US-04-R3-F07 | nit | `ac8c0a1` | fixed | New `shared/step-icon.ts` (`StepIcon`) holds the single step-to-icon `@switch`. `step-indicator.html` and `country-chooser-page.html` use it, and the chooser no longer imports the three Lucide icons. Naming follows `CLAUDE.md` §6 |
| US-04-R3-F08 | nit | — | deferred to HC3 | As specified (§7.1/§7.2, Q-27). T-49, human decision at the HC3 values review |
| US-04-R2-F01 | nit | `4c12499` | fixed | Already verified in R3. Recorded here with its ID in the first cell so that `trace.sh` stops listing it as open: R3 wrote "US-04-R2-F01 (nit)", which the script's pattern does not match |
| US-04-R1-F09 | nit | — | deferred to HC3 | Human decision `b74470e`; unchanged |

### R3-F01 evidence (mid-text date edits)

The recorded decision (BR-18 and Q-23 "v0.3 clarification", relayed by the main session, for the human
to confirm at HC3) has five parts:

- A `/` already on screen is never read as typed. Only a separator typed at the end pads.
- Every other edit re-derives the text from the digits in order (at most 8), with `/` after the 2nd and
  4th digit.
- The caret goes after the same number of digits it followed.
- An insertion into a text that already holds 8 digits is ignored.
- An edit never silently yields a different complete date.

`maskDateDigits` (`date-text.ts:70-91`) now has three paths:

1. Caret at the end: `padTypedSeparator`, the R3 scan unchanged.
2. More than 8 digits with the caret inside: drop the character before the caret and retry, so the
   insertion is ignored.
3. Otherwise: `flow(dateDigits(raw))`, with the caret mapped by digit count.

Before the mask runs, `DateField.onInput` (`date-field.ts:65-87`) checks for a Backspace or Delete that
removed only a `/`: the digit count is unchanged, the text is shorter, and the `inputType` is
`deleteContentBackward` or `deleteContentForward`. It then removes the adjacent digit instead.

Probe results on "15/05/1990" (pure function plus the `onInput` pre-step, `maxlength` 10 emulated):

| Action | Shown (caret) | Complete date? |
|---|---|---|
| Backspace at caret 1 … 10 | `50/51/990` (0), `10/51/990` (1), `10/51/990` (1, over `/`), `15/51/990` (2), `15/01/990` (4), `15/01/990` (4, over `/`), `15/05/990` (5), `15/05/190` (7), `15/05/190` (8), `15/05/199` (9) | none (7 digits) |
| Delete at caret 0 … 9 | `50/51/990` (0), `10/51/990` (1), `15/51/990` (2, over `/`), `15/51/990` (2), `15/01/990` (4), `15/05/990` (5, over `/`), `15/05/990` (5), `15/05/190` (7), `15/05/190` (8), `15/05/199` (9) | none |
| Backspace after the day's `5`, then type `6` | `10/51/990` (1) → `16/05/1990` (2) | the intended correction |
| Backspace after the month's `5`, then type `6` | `15/01/990` (4) → `15/06/1990` (5) | the intended correction |
| Select the day `15`, type `1`, then `6` | `10/51/990` (1) → `16/05/1990` (2) | R3's "day cannot be re-typed" case now works (9 characters, under `maxlength`) |
| Select the month `05`, type `1`, then `2` | `15/11/990` (4) → `15/12/1990` (5) | correct |
| Select the year, type `2` | `15/05/2` (7) | incomplete |
| Insert `6` at caret 1 of `01/05/1990`, `maxlength` bypassed (`061/05/1990`, 2) | `01/05/1990` (1) | unchanged, no `06/01/0519` |
| Insert at caret 0 (`615/05/1990`, 1); paste `12` inside the month with `maxlength` bypassed | `15/05/1990` (0); `15/05/1990` (2) | unchanged |
| End typing `15051990`, `5/5/1990`, `15/05/1990` key by key; End + 4 × Backspace | `15/05/1990`, `05/05/1990`, `15/05/1990`; `15/05/199` → `15/05/19` → `15/05/1` → `15/05` | unchanged from R3 (AC-25 rows) |
| `fill()` (whole text, caret at the end) `15.05.1990`, `5/5/1990`, `15051990`, `abc` | `15/05/1990`, `05/05/1990`, `15/05/1990`, `''` | unchanged |

Real browser (gate stack, after run 2):

- "15/05/1990", 5 × ArrowLeft, Backspace shows `15/01/990` with the caret at 4.
- Moving focus out of the field (two Tabs, to "Ciudad") then gives `aria-invalid="true"`, the
  description "Formato: dd/mm/aaaa / Fecha no válida. Usa el formato dd/mm/aaaa.", and no stored date.
- With the caret placed at 1 by `setSelectionRange`, typing `6` into `01/05/1990` leaves `01/05/1990`.
- Backspace on the day's `5`, caret placed at the end, then `0` gives `10/51/9900`.

Every single-digit deletion leaves 7 digits, so the result is never a complete date. The only way to reach
a different complete date is to type the 8th digit yourself, which is the intended correction.
`maxlength="10"` is kept; a 7-digit text is 9 characters, so it no longer blocks re-typing. The
typed-date message path (`transformedValue.parse` → `DATE_TEXT_ERROR`) is not touched.

Unit and component tests:

- `date-text.spec.ts` has 10 unit rows. The former "15/095/1990 → 15/09/5199" row now expects the
  unchanged date, as the decision requires.
- `date-field.spec.ts` has 13 component rows that dispatch `beforeinput`/`input` with the real
  `inputType`.

Mental mutations:

- Dropping the `deleteContentBackward` pre-step fails "Backspace right after the first /".
- Dropping the "more than 8 digits" branch fails the `061/05/1990` rows.
- Restoring padding from an on-screen `/` fails `15/0/1990`.

### R3-F02 evidence (IME composition)

`InputProfile` (`input-profile.ts:27-61`) tracks `compositionstart`/`compositionend`. It skips the capture
`input` rewrite while composing or when `isComposing` is true. On `compositionend` it sanitises once and
dispatches a bubbling `input`, so Signal Forms reads the cleaned value. The listeners are removed on
destroy. The re-dispatched event re-enters the capture listener, where the sanitiser is idempotent
(`clamped === raw` returns early).

Probe (same logic, headless Chromium, CDP):

- Composing `a`, `ab`, `abc` and committing `abc` gives the event log
  `cstart | input(isComposing) a | … abc | cend abc | input ABC`. The value is **`ABC`**, the bubbling
  model listener's last value is `ABC`, and there is one `compositionstart` (R3: `AABABCABC`).
- `ab-1` ends as `AB1`.
- A dead-key composition `´` → `é` keeps a single `compositionstart`, so it is not cancelled (R3 showed a
  restart).
- A composition in the middle of existing text (`X|Y` + `ab`) ends as `XABY`.

Tests:

- 4 component rows in `quote-form-page.spec.ts` check that nothing is rewritten while composing, that
  `ABC`/`AB1`/`Ana ` result after `compositionend`, and the stored value. Removing the `composing` guard or
  the re-dispatch fails them.
- 3 e2e rows through CDP pass in both gate runs.

The real-device checks (Android Gboard on plate and name, macOS dead keys) remain in T-39 at HC3, as R3
asked.

### Regressions looked for (none in the app)

- End-of-text typing, End + Backspace, typed separators and whole-text paste go through
  `padTypedSeparator`, which is the R3 scan unchanged. All AC-25 rows and the US-01 date rows pass in
  both gate runs.
- Caret: at the end it goes to the end. Inside the text it goes after the same number of digits (before
  a following `/`), and to 0 when no digit precedes it. This matches the clarification.
- `maxlength="10"` is kept on the date box. The `appInputProfileMax` clamp is unchanged for profiled
  fields.
- Other profiled fields: outside a composition the filter runs on every `input` exactly as before. The
  new component row ("abc typed at once into Placa is ABC") and the existing AC-26 rows pass.
- `StepIcon` keeps `lucide-small` on the indicator and the full size on the chooser. Its host is
  `display: contents`, so the marker layout is unchanged (the AC-13/AC-29 component and e2e tests pass).

## Findings (this round)

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R4-F01 | major | `frontend/e2e/us-04-r3-fixes.spec.ts:35-42`, `:44-50`, `:75-81` (fail), `:64-73` (vacuous) | Three new e2e tests fail in both gate runs, and a fourth passes whether or not the fix exists. The cause is in the tests, not the app: a single Tab does not leave the date field, and Home/End do not move the caret here | `CLAUDE.md` §12 DoD ("lint, build, unit and e2e pass"); checklist "tests fail when the behaviour breaks"; FLOW step 5 gate | open | |
| US-04-R4-F02 | minor | `specs/US-04/tasks.md` Status block (lines 9-15) and T-41..T-48 | The fix commits did not update `tasks.md`. T-41..T-46 and T-48 are still `todo`, although `ac8c0a1`/`b8cf48e` implement them. T-40 and T-47 say "(uncommitted)", although `07849f9` committed them. "Current step" says "fixes R3-F01..F08 in progress", and "Last updated" says "uncommitted" | `CLAUDE.md` §11 (state lives in `tasks.md`), §12 DoD; each agent updates `tasks.md` when it finishes | open | |
| US-04-R4-F03 | minor | `frontend/e2e/us-04-r3-fixes.spec.ts` (all 17 tests); `date-text.spec.ts`, `date-field.spec.ts` new `describe('US-04-R3-F01 …')`; `quote-form-page.spec.ts` `it('US-04-R3-F02 …')` | The new tests are titled with finding IDs instead of the AC/BR they verify. `CLAUDE.md` §9 and §6 require titles that start with the AC or BR ID, and the spec Review log says the clarifications "are verified under those AC IDs" (AC-25, AC-26). `trace.sh` links the new e2e file to no AC or BR. If an older AC-25/AC-26 test were removed, these tests would not count | `CLAUDE.md` §9, §6 (E2E `test('<US-AC id> …')`); spec §13 2026-11-22 row | open | |
| US-04-R4-F04 | nit | `specs/US-04/spec.md` BR-18 ("…pads that group with a leading zero and shows `/` (\"5/\" → \"05/\")"); `date-text.spec.ts:259` comment | The spec says "5/" shows "05/". ADR-0014 §2 (Accepted) says a `/` appears only once the next group has a digit and never trails. The code and the unit tests (`date-text.spec.ts:165`, `:303`) give "05". The code follows the ADR; the spec sentence and the test comment do not. Pre-existing, but the v0.3 clarification quotes the rule again | `CLAUDE.md` §1 (ADR over spec mechanism; keep sources consistent) | open | |
| US-04-R4-F05 | nit | `frontend/src/app/shared/date-field.ts:67`; `date-field.html:16` | `DateField` gained composition handling (it returns when `isComposing` is true and runs again on `compositionend`), but no test covers it. Removing either part leaves every unit, component and e2e test green. BR-19's clarification covers profiled fields, and the date box is not one, so this behaviour is neither specified nor tested | checklist "tests fail when the behaviour breaks"; scope | open | |
| US-04-R4-F06 | nit | `backend/tests/seed-form-fields-input-rules.test.ts:83-88` | "the maxLength rules do not make a valid value invalid" compares the lengths of string literals (`'1012345678'.length <= 10`) and never reads the seed, so it cannot fail. Comparing against `rulesOf(...)[0].value` would make it a real check | checklist "the test asserts behaviour" | open | |

### US-04-R4-F01 — Defective e2e tests for R3-F01 (gate red)

Gate attempt 4, both runs: `3 failed / 267 passed`. Failures:

1. **`:35` "Backspace on the month's 5 … leaving shows the invalid-date message"** and **`:44` "Backspace
   on the day's 5 …"**: the value assertion (`15/01/990`, `10/51/990`) passes. `expectDescribedBy`
   then times out and receives only "Formato: dd/mm/aaaa".
   - Cause: the test "leaves" with one `Tab`, which moves focus to the field's own "Elegir fecha" button.
     The browser probe shows `activeElement` aria-label "Elegir fecha: Fecha de nacimiento" with
     `aria-invalid` still `null`.
   - `DateField.onFocusout` (`date-field.ts:95-100`) does not mark the field touched when focus stays
     inside the field. This is the established AC-08/AC-25 behaviour.
   - A second Tab (to "Ciudad") shows the error at once.
   - The AC-25 rows in `us-04-hc3-round1.spec.ts:246` leave the field by focusing "Placa", which is why
     they pass.
2. **`:75` "after a deletion the person can type again … End, '0' gives '10/51/9900'"**: the test
   received `10/05/1990`.
   - Cause: in the app on the gate machine (macOS), `page.keyboard.press('End')` does not move the
     caret. The probe shows the caret still at 4 after End in the date box, and also in "Nombre
     completo" with no edit involved, so the date code plays no part.
   - The `0` is therefore typed at caret 1, which gives the digits `10051990` and so `10/05/1990`.
   - With the caret placed at the end by `setSelectionRange`, the same flow gives `10/51/9900`, as
     expected.
3. **`:64` "a digit typed into a full text is ignored"** passes without testing anything. `Home` does
   not move the caret either (the probe shows it still at 10). `ArrowRight` keeps it at 10, and the
   browser's `maxlength="10"` blocks the `6`. So `01/05/1990` stays unchanged whether or not the mask
   ignores mid-text insertions. Mental mutation: remove the "more than 8 digits" branch from
   `maskDateDigits`, and this e2e still passes. (The unit and component rows do catch that mutation.)

Expected:

- Leave the date field the way the AC-25 rows do (focus another field, or Tab past "Elegir fecha").
- Place the caret in a way that works on every platform, for example `setSelectionRange` (as `:83`
  already does for the selection) or a counted number of `ArrowRight`/`ArrowLeft` presses.
- Make `:64` assert the caret position before typing, so it cannot pass vacuously.

Test-only change (test-engineer). No production change is needed.

## Other observations (no finding)

- The F01/F02 decisions were relayed by the main session and recorded as clarifications for the human
  to confirm at the HC3 QA of this round (spec §13), and the implementation matches them. A different
  mid-text behaviour (for example, a digit typed over a selected day keeping the month) would be a spec
  change, not a defect of this round.
- `onInput` handles only `deleteContentBackward`/`deleteContentForward` over a `/`. A word deletion
  (Alt/Ctrl+Backspace) that removes only a `/` re-flows to the same text and only moves the caret, so
  nothing is lost or changed.
- A multi-digit paste inside a full date is trimmed by `maxlength` before the mask (browser behaviour),
  as it is for the profiled fields (the accepted ADR-0014 trade-off).
- The F03 e2e reads `/api/form-fields` through the front end's origin with the public role (GET,
  `find`), the same path the app uses. It sends no token and writes nothing.
- Security: no `innerHTML`, no `bypassSecurityTrust*`, no new request, and no env or token change.
- Loop limit (`CLAUDE.md` §8): this is gate attempt 4 and review round 4 for US-04. The orchestrator
  should decide whether escalating to the human is due before another loop.

## Summary

Open: 0 blocker, 1 major (R4-F01), 2 minor (R4-F02, R4-F03), 3 nit (R4-F04, R4-F05, R4-F06). Deferred
to HC3: R3-F08, R1-F09.

All three R3 majors are fixed in the product:

- **F01:** the date mask removes exactly one digit per Backspace or Delete anywhere, ignores insertions
  into a full date, and lets a day or month be re-typed. End-of-text typing, paste, caret placement and
  the error message are unchanged.
- **F02:** the input profile leaves the value alone during an IME composition and sanitises once when
  it ends.
- **F03:** a backend test and e2e reads of the Strapi API pin the real seed rules.

The gate is still red, because three of the new e2e tests leave the date field with a single Tab (which
stays inside the field) or rely on Home/End (which do not move the caret on the gate machine), and a
fourth passes for the same reason. Fixing those tests (R4-F01) should turn the gate green with no
production change. The minors are documentation and naming.
