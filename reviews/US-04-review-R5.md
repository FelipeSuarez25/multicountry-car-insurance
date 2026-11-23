# US-04 — Code review, round 5

| Field | Value |
|---|---|
| Story / spec | US-04 · `specs/US-04/spec.md` (version 0.3, Approved; BR-18/Q-23 aligned with ADR-0014 §2 and BR-18 IME clarification added in `7d388cb`, 2026-11-22) |
| Branch / commit reviewed | `feat/us-04-design-system` @ `7d388cb` (2 commits since R4 `321aeb5`: `54f57b5` test, `7d388cb` docs) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-22 |
| Verdict | **APPROVED** (gate attempt 5 e2e green in both runs). 0 blocker, 0 major, 1 minor, 1 nit open. R3-F08 and R1-F09 stay with the human at HC3 |

Reviewed against spec v0.3, ADR-0014 §2, `CLAUDE.md`, the `review-checklist`, `dynamic-form-fields` and
`strapi-content-modeling` skills, and review R4. Scope: `git diff 321aeb5..HEAD`. The human decided to
continue after the loop-limit escalation ("Seguir: arreglar y R5", `tasks.md` Gate history), so this
round is allowed.

**No production code changed since R4.** `git diff --name-only b8cf48e..HEAD -- frontend/src backend/src
backend/config frontend/e2e` lists only test files: `frontend/e2e/us-04-r3-fixes.spec.ts`,
`quote-form-page.spec.ts`, `date-field.spec.ts` and `date-text.spec.ts`. `321aeb5..HEAD` also touches
`backend/tests/seed-form-fields-input-rules.test.ts`, `specs/US-04/spec.md` and `specs/US-04/tasks.md`.
No `package.json` or lockfile changed (0 files).

## Automated checks

The reviewer ran every check except the e2e, which the main session runs as gate attempt 5 on a
freshly rebuilt stack. The reviewer did not run e2e and did not touch Docker.

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0. Gate `g5-felint.txt`: empty, same |
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.spec.json --noEmit` | exit 0 / exit 0 |
| Unit (frontend) | `npx ng test --watch=false` | **1458 passed / 0 failed** (40 files; R4: 1456, +2 `DateField` composition rows). Gate `g5-unit.txt`: same 1458 / 40 |
| Build (gate) | `g5-febuild.txt` | ok; lazy `quote-form-page` 200.03 kB raw / 47.50 kB transfer, unchanged from gate 4 (no production change) |
| Backend | `npm test`, `npm run lint` (reviewer); gate `g5-belint.txt`, `g5-bebuild.txt`, `g5-betest.txt` | lint clean; build ok (admin panel built); **119 / 119** passed (5 files; R4: 116, the vacuous test became 4 seed-reading rows) |
| **E2E (gate attempt 5; not run by the reviewer)** | `g5-e2e1.txt`, `g5-e2e2.txt` | **Run 1: 270 passed / 0 failed (4.9 min). Run 2: 270 passed / 0 failed (4.5 min).** This includes the four R4-F01 tests, the two new date-message tests that leave via "Placa", and the "type again" test, which failed in both gate-4 runs (gate 4: 267 / 3) |
| Traceability | `scripts/trace.sh US-04` | Before this report: ACs without test 0 (AC-22 and AC-23 are manual); exit 1 only because R4-F01 was still open in R4. AC-25 now lists `frontend/e2e/us-04-r3-fixes.spec.ts`, and AC-26 lists it plus the backend seed test (R4-F03). After this report: **exit 0**, open blocker/major 0; R5-F01 (minor) and R5-F02 (nit) are listed |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 492 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); personal data none |
| Dependencies | `git diff --name-only 321aeb5..HEAD -- '*package*.json'` | 0 files |
| Role and scope per commit | `git show --stat` | Clean. `54f57b5` (test-engineer) touches only test files; trailers `Refs: US-04-AC-25, US-04-AC-26`, `Resolves: US-04-R4-F01, F03, F05, F06`. `7d388cb` (spec-writer) touches only `specs/US-04/{spec,tasks}.md`; trailers `Refs: US-04-BR-18, US-04-AC-25`, `Resolves: US-04-R4-F02, F04`. Both have the co-author line |
| Pre-fix probe | `node --experimental-strip-types` with `maskDateDigits` from `ac8c0a1^` (copied to the scratchpad, no tracked file touched) | See R4-F01 below: every value the fixed e2e tests assert differs from what the pre-fix mask gives |

## Verification of previous round

| ID | Severity | Fix commit | Status | Notes |
|---|---|---|---|---|
| US-04-R4-F01 | major | `54f57b5` | fixed | Details below. Both causes are removed: the tests leave the field by focusing "Placa" (`leaveDateField`, `us-04-r3-fixes.spec.ts:32-34`), and they place the caret with `setSelectionRange`, then poll `selectionStart` until it equals the target (`placeCaret`, `:26-29`). They would fail against the pre-fix code. The `maxlength` row (`:78-88`) is still weak, but the weakness is stated in a comment and the unit and component tests cover the mask branch, which I accept. Gate 5: all tests in the file pass in both runs |
| US-04-R4-F02 | minor | `7d388cb` | fixed | T-40..T-51 are now up to date with commits, and R4 fix tasks T-52..T-58 and the Gate history rows (gate 3, gate 4, the loop-limit decision) were added. The block went stale again with the next commits; that is a new finding, R5-F01 |
| US-04-R4-F03 | minor | `54f57b5` | fixed | Every R3-fix test title now starts with the AC: `US-04-AC-25 R3-F01 …` (date edits, in the e2e, `date-text.spec.ts` and `date-field.spec.ts`) and `US-04-AC-26 R3-F02/R3-F03 …` (composition and seed rules, in the e2e and `quote-form-page.spec.ts`). `grep` finds no `describe/it/test('US-04-R3-…` left. `trace.sh` links the e2e file to AC-25 and AC-26 |
| US-04-R4-F04 | nit | `7d388cb` | fixed | BR-18 and the Q-23 proposed default now say "5/" → "05" and "15/" → "15". They add an alignment sentence matching ADR-0014 §2 (a `/` is shown only once the next group has a digit), and spec §13 has a row for it. The Human answer cell is untouched. One leftover is in test code, outside the spec-writer's role: the `date-text.spec.ts:259` comment. It is tracked as R5-F02 |
| US-04-R4-F05 | nit | `54f57b5` (test), `7d388cb` (BR-18 clarification) | fixed | Two component rows in `date-field.spec.ts:428-461` (`US-04-AC-25 R4-F05 …`) dispatch `compositionstart`, then `input` with `isComposing: true`, then `compositionend`, on the real routed field. Mutation analysis below. The behaviour is now specified: BR-18 has a v0.3 IME clarification that mirrors BR-19, for the human to confirm at HC3 |
| US-04-R4-F06 | nit | `54f57b5` | fixed | `seed-form-fields-input-rules.test.ts:83-92` is now an `it.each` over (CO/CL × `documentNumber`/`plate`). It reads `rulesOf(country, key, 'maxLength')[0]` from the real `SEED_FORM_FIELDS`, throws if the rule is missing, and compares against `rule.value`. Mental mutation: lowering a seeded `maxLength` below the longest valid value (for example a plate to 5), or deleting the rule, fails it |
| US-04-R3-F08 | nit | — | deferred to HC3 | As specified (§7.1/§7.2, Q-27). T-49, human decision at the HC3 values review |
| US-04-R1-F09 | nit | — | deferred to HC3 | Human decision `b74470e`; unchanged |

### R4-F01 verification in detail

The changes in `frontend/e2e/us-04-r3-fixes.spec.ts`:

- `typedWithCaretAt(page, left)` types "15/05/1990" and then calls `placeCaret(box, 10 - left)`. It no
  longer uses `ArrowLeft`. Because the caret position is polled, a placement that fails stops the test
  before the key press, so the test cannot pass by accident.
- Both message tests (`:49-56` month, `:58-64` day) leave with `leaveDateField` (focus "Placa"). This
  is how the passing AC-25 rows in `us-04-hc3-round1.spec.ts` leave the field. `DateField.onFocusout`
  (`date-field.ts:95-100`) sees a `relatedTarget` outside the host and emits `touch`, so the
  description and `aria-invalid` are reached. R4 confirmed that path in a browser.
- The "type again" test (`:90-96`) places the caret at the end of "10/51/990" (9) with `placeCaret`,
  instead of pressing `End`. R4's browser probe showed that this flow gives `10/51/9900`.

Would the tests fail against the pre-fix behaviour? I ran the pre-fix `maskDateDigits` (`ac8c0a1^`) on
the text that the browser holds after each key. `onInput` before the fix passed the raw value straight
to the mask, with no Backspace/Delete pre-step.

| e2e test | Browser text after the key (caret) | Pre-fix result | Asserted now |
|---|---|---|---|
| Backspace on the month's 5 | `15/0/1990` (4) | `15/00/1990` | `15/01/990` |
| Backspace on the day's 5 / Delete before it | `1/05/1990` (1) | `01/05/1990` | `10/51/990` |
| Backspace right after the first `/` | `1505/1990` (2) | `15/05/1990` (the `/` comes back, nothing removed) | `10/51/990` |
| Type again after the day deletion | `01/05/1990` (10 characters, so `maxlength` blocks the `0`) | `01/05/1990` | `10/51/9900` |

Every value assertion therefore fails on the pre-fix code. The two message tests fail at their value
step, before the message is checked. The day case would also fail at the message step, because the
pre-fix `01/05/1990` is a different complete valid date that would be stored silently.

**The `:78-88` row ("a digit typed into a full text is ignored").** It now asserts the caret at 1
before typing, so it no longer passes by accident because of the caret position. It still passes
whether or not `maskDateDigits` has its "more than 8 digits" branch, because the browser's
`maxlength="10"` drops the keystroke first. The test says so in a comment and only pins the
user-visible result.

I accept this as is:

- The branch is a defence for input that bypasses `maxlength` (IME commits, programmatic or assistive
  input). An e2e test cannot produce that input without either removing the attribute or using CDP.
- The branch is covered at two lower levels, and both would fail on mutation:
  - unit: `date-text.spec.ts` rows `061/05/1990` → `01/05/1990` and `15/005/1990` → `15/05/1990`;
  - component: `date-field.spec.ts` "a digit typed into the day/month of a full text is ignored",
    which dispatches the 11-character value with `insertText`.
- The e2e row still protects something real: if `maxlength` were dropped from `date-field.html` and
  the branch were also broken, it would fail.

No finding.

### R4-F05 mutation analysis (`DateField` composition)

The test is `composeDate(['1a', '15a', '15a05'], '15a05')`. It expects the box to show
`['1a', '15a', '15a05']` while composing and `15/05` after `compositionend`. Two mutations:

- **Remove the `isComposing` return at `date-field.ts:67`.** The first `input` reaches
  `maskDateDigits('1a', 2)`, which drops the `a`, so `seen[0]` becomes `1`. The `seen` assertion fails.
- **Remove `(compositionend)="onInput($event)"` at `date-field.html:16`.** Nothing masks the committed
  `15a05`, so `box.value` stays `15a05`. The `15/05` assertion fails.

The second row commits `15051990`. It checks both the shown `15/05/1990` and the stored ISO
`1990-05-15` after leaving the field, which ties the compositionend path to the stored value.

`scratchpad/df.bak` is byte-identical to the committed `date-field.ts`, and `git status` is clean, so
any temporary mutation made while writing these tests was reverted.

## Findings (this round)

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-04-R5-F01 | minor | `specs/US-04/tasks.md:9-15` (Status block), `:75-79` (T-52..T-56) | `tasks.md` is stale again after the R4 fix commits. It says the work is still to do or uncommitted, but `54f57b5` and `7d388cb` already did and committed it. Details below | `CLAUDE.md` §11 (state lives in `tasks.md`), §12 DoD; each agent updates `tasks.md` when it finishes | open | |
| US-04-R5-F02 | nit | `frontend/src/app/shared/date-text.spec.ts:259` (block comment above the `US-04-AC-25 R3-F01 maskDateDigits` describe) | The comment still says "only a separator typed at the end of the text pads, "5/" -> "05/"". The aligned BR-18, ADR-0014 §2 and the test 25 lines below (`"5/" -> "05"`, `maskDateDigits('5/', 2).text` is `'05'`) say "05". This is the test-code half of R4-F04, which the spec-writer could not edit | `CLAUDE.md` §1 (keep sources consistent with the accepted ADR); checklist "Language / docs" | open | |

### US-04-R5-F01 — `tasks.md` is stale again after the R4 fixes

`tasks.md` at HEAD `7d388cb` says:

- "Current step": "R4 fixes in progress (docs R4-F02/F04 done, **uncommitted**; tests R4-F01/F03/F05/F06
  **to do**)".
- "Next action": "test-engineer: R4 test fixes T-52..T-55".
- "Last updated": "… **uncommitted**".
- T-52, T-53, T-54 and T-55: status `todo`, with no commit, although `54f57b5` implements all four.
- T-56: "(uncommitted)", although `7d388cb` is its commit.

The test-engineer's commit `54f57b5` did not touch `tasks.md`. The spec-writer's text was committed
after it without being refreshed.

Impact: a session resuming from the repository (the `session-handoff` skill) would re-dispatch the
test-engineer for work that is already done. This is the same pattern as R4-F02.

Expected: T-52..T-56 marked done with their commits, the Status block pointing at gate 5 and R5, and
T-57/T-58 filled in when the gate and this review are recorded. This is a documentation-only change.

### US-04-R5-F02 — Stale "05/" in a test comment

The comment at `date-text.spec.ts:259` says "5/" -> "05/". The assertions in the same `describe`
expect "05". The comment should say "05", like BR-18 and ADR-0014 §2. This is a test-engineer change,
and it can go with any later test commit.

## Other observations (no finding)

- The R4-F05 rows sit under `US-04-AC-25`. The behaviour they verify is the BR-18 v0.3 IME
  clarification. `trace.sh` counts them for AC-25 and BR-18, which is correct.
- The BR-18 and Q-23 edits keep the old wording as strikethrough (`~~…~~`) next to the new one, inside
  an `Approved` spec. This is readable and traceable, and the §13 row explains it. Version 0.3 and
  status `Approved` are unchanged, and the change is editorial (it aligns with an accepted ADR). The IME
  clarification adds behaviour the code already had. The human confirms it at HC3 together with the
  other v0.3 clarifications.
- Security: no production, configuration or dependency change. The e2e tests read
  `/api/form-fields` with the public role, as in R4. The new helpers only call `setSelectionRange`
  and `focus()`.
- Loop limit (`CLAUDE.md` §8): this is review round 5, which the human authorised after the
  escalation. If gate 5 is green, no further loop is needed for the open minor and nit.

## For the human at HC3

These decisions are not defects. They are recorded for the HC3 QA pass (T-39):

1. **US-04-R3-F08** (nit, T-49): the `fullName` filter lets any Unicode letter through, but the seed
   pattern accepts only Latin-1 letters. A name such as "Łukasz" can be typed and is then rejected with
   "…solo letras…". The question is whether to keep this or widen the seed pattern.
2. **US-04-R1-F09** (nit, `b74470e`): when a page is reached by keyboard or loaded directly, the
   focused `h1` shows the 3 px focus ring as a full-width box around the gradient heading. Visual
   decision (AC-23).
3. **The v0.3 recommendations to confirm** (spec §7.1/§7.2, BR-18..BR-21, Q-23..Q-27):
   - the **input-profile** values per field: allowed characters, letter case, keyboard hints;
   - the **maximum lengths**: `documentNumber` 10 for CO and 12 for CL, `plate` 6, `fullName` 80, and
     the profile fallbacks;
   - the code-owned **invalid-date message** "Fecha no válida. Usa el formato dd/mm/aaaa.";
   - the **back-link** copy ("Volver…" / "Cambiar país") and the country chip link;
   - the **country chooser** copy and order ("Cómo funciona" after the country links);
   - **no country tint in the page gradient**: brand violet only; the country shows through the flag
     and chip.
4. **The decisions relayed by the main session, to confirm:**
   - the BR-18/Q-23 mid-text date-edit rules (re-flow the digits, ignore an insertion into 8 digits,
     never a different complete date);
   - the BR-19 and BR-18 IME composition rules.
5. **Device checks still in T-39:** Android Gboard on "Placa" and "Nombre completo", macOS dead keys,
   and VoiceOver on the chooser's "Cómo funciona" list (R3-F04).

## Summary

Open: 0 blocker, 0 major, 1 minor (R5-F01), 1 nit (R5-F02). Deferred to HC3: R3-F08, R1-F09.

All six R4 findings are resolved:

- **F01:** the date e2e tests leave the field by focusing "Placa" and place the caret with a verified
  `setSelectionRange`, so they now fail on the pre-fix mask. The one row that `maxlength` makes weak is
  acknowledged in its comment and backed by unit and component tests.
- **F03:** test titles carry AC IDs.
- **F04:** BR-18 and Q-23 follow ADR-0014 §2.
- **F05:** the `DateField` composition path is tested, and both mutations fail.
- **F06:** the backend length test reads the seed.
- **F02:** `tasks.md` was brought up to date, but it went stale again with the next commits (R5-F01).

No production code changed since R4. Lint, typecheck, unit (1458) and backend (119) tests pass, the
scan is clean, and trace has no AC without a test. Gate attempt 5 e2e is green in both runs (270 / 270), so the
verdict is APPROVED.
