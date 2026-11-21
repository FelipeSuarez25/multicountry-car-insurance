# US-01 — Code review, round 4

| Field | Value |
|---|---|
| Story / spec | US-01 · `specs/US-01/spec.md` (version 0.5, Approved at HC1 round 5) |
| Branch / commit reviewed | `feat/us-01-data-form` @ `bb465ff` (diff `6031583..HEAD`, 7 commits; `bb465ff` only adds a `tasks.md` gate row) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **APPROVED** (0 blocker, 0 major; 1 minor and 1 nit to fix or justify before HC3) |

Sources read: `reviews/US-01-review-R3.md`, spec v0.5 (BR-01, AC-09 and its note, AC-18 note, AC-21
preamble, §7.3, §10, §11, Review log), the ADR-0004 row in the `adr/README.md` implementation-notes
table, `CLAUDE.md`, `FLOW.md` (row "The orchestrator misdiagnosed…"), `specs/US-01/tasks.md` (Gate
history up to "5 Gate (after R3 fixes)"), and the `review-checklist`, `strapi-content-modeling` and
`dynamic-form-fields` skills. The human decisions since R3 are taken as given: the Signal Forms
submit gate is restored; under spec v0.5 an unreadable `number` or `date` is invalid whether
required or optional, the store and `sessionStorage` hold `''`, and the typed text stays visible;
R3-F03 and R3-F04 were handled by the orchestrator.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | Exit 0, no output |
| Lint (backend) | `npm run lint` | Exit 0, no output |
| Build / typecheck (frontend) | `CI=1 NG_CLI_ANALYTICS=false npx ng build`; `npx tsc --noEmit -p tsconfig.app.json`; `npx tsc --noEmit -p tsconfig.spec.json` | Build exit 0 (initial 341.57 kB raw / 91.10 kB transfer); both `tsc` exit 0 |
| Build / typecheck (backend) | `npx tsc --noEmit -p tsconfig.json`; `npm run build` | Both exit 0 |
| Unit tests (frontend) | `npm test` | 8 files, **319 passed / 0 failed** |
| Unit tests (backend) | `npm test` | 2 files, **12 passed / 0 failed** |
| E2E | Clean stack `docker compose -p mci-review up -d --build --wait` (no earlier `mci-review` containers or volumes; ports 1337 and 8080 free). Strapi published on `127.0.0.1:1337` only (`docker compose ps`). Then **only** `scripts/e2e.sh` | Full suite run 1: **40/40** (8.6 s). `scripts/e2e.sh e2e/us-01-data-form-co.spec.ts --repeat-each=15`: **225/225** (1.1 min). Full suite run 2 (after the browser probes): **40/40** (12.6 s). Three admin logins in total. No `eyJ` in any output. Stack removed with `down -v` |
| Traceability | `bash scripts/trace.sh US-01` | Before this report: ACs without tests 0 (AC-26 manual), open blocker/major 1 (R3-F01, still open in the R3 file). With this report: **exit 0**, ACs without tests 0, open blocker/major 0 (open: R4-F01 minor, R4-F02 nit) |
| Secrets | `bash scripts/scan-secrets.sh` | No findings in 222 files; 6 explicit exceptions, the same 6 as in R2/R3. Exit 0 |
| Pinning | `git diff 6031583..HEAD --stat` | No `package.json` or lockfile change in this round |
| Browser probes (throwaway Playwright scripts in the scratchpad, against the review stack; optional fixtures injected with `page.route` on `/api/form-fields`, nothing committed) | See *Probes* below | |

## Probes

All in Chromium, locale `en-US`, clock pinned to 2026-11-20.

| # | Steps | Result |
|---|---|---|
| P1 | R3-F01 repeat, CO: fill every field (birth date `1990-05-15`), focus "Fecha de nacimiento", Backspace, Tab ×3, then "Continuar" by **click** | Stays on `/co/datos`, focus `field-birthDate`, stored `birthDate` `''`, no `1990-05-15` anywhere in storage |
| P2 | Same as P1, then Enter in "Nombre completo" | Same result |
| P3 | P1 and P2 on `/cl/datos` (valid Chilean values) | Both stay on `/cl/datos`, focus on the date, stored `''` |
| P4 | P1, then type the month again (`05`), Tab, "Continuar" | Value `1990-05-15`, stored `1990-05-15`, reaches `/co/planes` |
| P5 | P1, then reload | Field empty, stored `''` (AC-21 exception in spec v0.5) |
| P6 | Optional number fixture "Kilometraje" (spec v0.5 AC-09), texts `1e`, `2015e`, `e`; click and Enter | All 6 stay on `/co/datos`, focus `field-mileage`, message "Ingresa un kilometraje válido (solo números enteros).", `badInput` still true (text kept), stored `''` |
| P7 | Same fixture left empty; click and Enter | Both reach `/co/planes` (an empty optional field stays valid) |
| P8 | Optional date fixture "Fecha de revisión": valid `2026-01-10`, waited, Backspace, leave; click and Enter | Stays on `/co/datos`, focus on the date, its `errorMessage` shown with `aria-invalid="true"`, stored `''` |
| P9 | Optional date fixture empty, then only the month typed (`05`), leave; click and Enter | Stays, focus on the date, message shown. Chromium fires **no** `input` event here (counted 0); Signal Forms still reports the parse error, and the store keeps `''` |
| P10 | Required birth date empty, then only the month typed; click and Enter | Stays, focus on the date |
| P11 | Required birth date completed (by `fill` or by typing `05151990`), then Backspace after 0, 20, 25, 30, 35, 40, 50, 150 ms, leave, click | **0 and 20 ms: the control shows `1990-05-15` again, the store holds `''`, "Continuar" does nothing** (no navigation, no message, focus on `<body>`). 25 ms and more: correct (P1 behaviour). See US-01-R4-F01 |
| P12 | Optional date fixture: `fill('2026-01-10')`, then Backspace at once, leave, click | Control shows `2026-01-10`, store `''`, **navigates to `/co/planes`**; the typed output maps the date to `null` (`completeStep1` builds the output from the store). See US-01-R4-F01 |

## AC verification

Unchanged from R3 unless stated. Every AC has its test, and every test passes on a clean stack.

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-01-AC-01 | as R3 | as R3 | ✅ |
| US-01-AC-02 | Signal Forms gate restored, `quote-form.ts:62-78` (no `ignoreValidators`) | as R3, plus `quote-form-page.spec.ts` (US-01-R3-F01 describe: cleared and unreadable date, click and Enter) and `e2e/us-01-data-form-co.spec.ts:63-109` | ✅ R3-F01 fixed (P1-P3). See R4-F01 for a sub-frame timing case |
| US-01-AC-03 | as R3 | as R3 | ✅ |
| US-01-AC-04 | as R3 | as R3 | ✅ |
| US-01-AC-05 | as R3 | as R3 | ✅ |
| US-01-AC-06 | as R3 | as R3 | ✅ |
| US-01-AC-07 | as R3 | as R3 | ✅ |
| US-01-AC-08 | as R3 | as R3 | ✅ |
| US-01-AC-09 | `syncNative` (`quote-form.ts:131-134`), `errorOf` (`:141-149`), `quote-form.html:39,51` | `quote-form-page.spec.ts` (required number; `requiredMessage`; optional "Kilometraje" `1e`/`2015e`; empty `errorMessage` fallback; optional date with `errorMessage` and with the fallback), `e2e/us-01-data-form-co.spec.ts:111` ("1e") | ✅ Matches spec v0.5 (P6-P9). Test titles still carry the v0.4 wording (R4-F02) |
| US-01-AC-10 | `onInvalid` → first `invalid()` field in `sortOrder` → `focusBoundControl()` (`quote-form.ts:74-77`) | as R3, plus the R3-F01 tests (focus on the date) | ✅ |
| US-01-AC-11 | as R3 | as R3 | ✅ |
| US-01-AC-12 | as R3 | as R3 | ✅ |
| US-01-AC-13 | as R3 | as R3 | ✅ |
| US-01-AC-14 | as R3 | as R3 | ✅ |
| US-01-AC-15 | as R3 | as R3 | ✅ |
| US-01-AC-16 | as R3 | as R3 | ✅ |
| US-01-AC-17 | as R3 | as R3 | ✅ |
| US-01-AC-18 | as R3; store for dates written by `syncNative` | as R3, plus the R3-F01 component and e2e tests | ✅ No stale date in the output (P1-P3). R4-F01 is the remaining timing case |
| US-01-AC-19 | as R3 | as R3 | ✅ |
| US-01-AC-20 | as R3 | as R3 | ✅ |
| US-01-AC-21 | `syncNative` (numbers and dates) | `quote-form-page.spec.ts` (storage `''`), e2e storage assertions | ✅ P5 |
| US-01-AC-22 | as R3 | as R3 | ✅ |
| US-01-AC-23 | as R3 | as R3 | ✅ |
| US-01-AC-24 | `flushModel()` at the start of `action`, now skipping number and date keys | `e2e/us-01-data-form-co.spec.ts` (AC-24 block) | ✅ 225/225 in the repeated file |
| US-01-AC-25 | as R3 | as R3 | ✅ |
| US-01-AC-26 | as R3 | Manual at HC3 (T-31) | 🖐 manual, pending HC3 |
| US-01-AC-27 | as R3 | as R3 | ✅ |
| US-01-AC-28 | as R3 | as R3 | ✅ |

## Findings

R3 findings carry their round 4 status. New findings are `US-01-R4-FNN`.

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-01-R3-F01 | major | `frontend/src/app/features/quote-form/quote-form.ts`, `quote-form.html` | A partly cleared required date passed "Continuar" while showing its error | US-01-AC-02, AC-10, AC-18, ADR-0004 | fixed | 6e2077e (tests), eeb23e6, 33a0c11 (tests) |
| US-01-R3-F02 | minor | `adr/README.md` | No implementation note for the submission mechanism | CLAUDE.md §1, §9; ADR-0004 | fixed | 2dfb49e |
| US-01-R3-F03 | minor | `README.md` | README e2e steps built the env by hand and ignored persisted content | FLOW.md, CLAUDE.md §12 | fixed | 98f2bc4 |
| US-01-R3-F04 | nit | `docker-compose.yml`, `.env.example` | `[::1]` binding justified by the disproven IPv6 diagnosis | CLAUDE.md §1, FLOW.md | fixed | 98f2bc4 |
| US-01-R3-F05 | nit | `frontend/src/app/features/quote-form/quote-form.ts` | Two writers for number keys | Checklist (state handling) | fixed | eeb23e6 |
| US-01-R4-F01 | minor | `frontend/src/app/features/quote-form/quote-form.html:48-57` (date input: no pre-input flush); `quote-form.ts:64-73` (`action`), `:131-134` (`syncNative`) | If a date is edited into an unreadable state within about one frame (under 25 ms) of the keystroke that completed it, Signal Forms' pending model-to-DOM write puts the old date back on screen without an `input` event. The store keeps `''`. Required date: "Continuar" silently does nothing (no message, no focus move). Optional date: the step completes and the output carries `null` while the screen shows a date. Reproduced only with automated keystrokes (P11, P12) | Checklist (state handling, "store holds exactly what the user sees"), US-01-AC-10, US-01-AC-18 | open | |
| US-01-R4-F02 | nit | `frontend/src/app/features/quote-form/quote-form-page.spec.ts:590`; `frontend/e2e/us-01-data-form-co.spec.ts:111,128` | Test titles and a comment keep wording spec v0.5 dropped: "reaches the model and the store as empty (R2-F01)", "counts as empty", "The model and the stored state hold ''" | CLAUDE.md §9 (test titles are the trace), checklist (clear naming) | open | |

### US-01-R4-F01 — A date edited within one frame of being completed shows a value the store does not hold

**Mechanism.** When a date becomes complete, its `input` event updates the Signal Forms model, and
Signal Forms writes the model back into the control on the next change detection. For numbers,
`(beforeinput)="flushBindings()"` runs that write before the next keystroke (the R1-F03 fix). The
date input has no such hook, and Chromium fires no `beforeinput` for date segments anyway (P11
counted 0 `beforeinput` events). So if the next keystroke (Backspace) lands before that change
detection:

1. Backspace clears a segment. The `input` event fires with `badInput`, and `syncNative` stores `''`.
   The model is not written (by design).
2. The pending write puts the model value (`1990-05-15`) back into the control. No `input` event
   fires, so `syncNative` never sees it. The control is valid again, and Signal Forms has no parse
   error.
3. The screen shows a valid date. The store holds `''`.

**Effect** (P11, P12):

- Required "Fecha de nacimiento": `submission.action` runs (the form is valid). `flushModel()`
  skips date keys, and `completeStep1` fails on the store's `''`. The `action` has no branch for
  that case, so nothing happens: no navigation, no message, focus on `<body>`. The person sees a
  complete, valid form and a "Continuar" that does nothing (AC-10 expects a focus move on a failed
  attempt). It stays that way until the date is edited again. A reload shows the field empty.
- Optional date: the step completes, and `toOutput` maps the store's `''` to `null`, while the
  screen shows the date (AC-18: the output is what was typed).

**Likelihood.** Reproduced at 0 and 20 ms between the completing keystroke and Backspace, both by
`fill` and by `keyboard.type('05151990')`. Never at 25 ms or more (two runs each at 25, 30, 35 and
40 ms). A person would have to press Backspace within about one frame of the last digit, so I
could not make this happen at human speed. That is why this is **minor** and not major. It is the
ordering class R3-F05 described: the store now has one writer per key, but the DOM still has two
(the user and Signal Forms' deferred write), and `syncNative` only sees the first.

The fix for R3-F01 itself is sound. Before eeb23e6, dates were stored from the model, so the store
and the restored screen agreed in this case. The divergence is new with `syncNative` on dates.

**Suggested direction (optional).** Make the store and the gate agree at submit time, not only on
`input` events. For example, re-read each number and date control (`validity.badInput`, `value`)
in `action` before `completeStep1`, or flush pending bindings before date edits (a `keydown`
hook, since no `beforeinput` arrives). Independently, `action` should not end silently when
`completeStep1` returns `null`: focus the first field that the core validator rejects, as
40606e2 did. Fix before HC3, or justify (a person cannot reach this timing), in the next round.

### US-01-R4-F02 — Stale wording in test titles (orchestrator point 3)

- `quote-form-page.spec.ts:590`: `describe('US-01-AC-09 / US-01-AC-21 a number the browser cannot
  parse reaches the model and the store as empty (R2-F01)')`. Spec v0.5 says the opposite about the
  model ("the form's own editing value for the field is deliberately not set to `''`"), and the
  block now also holds the v0.5 optional-number and optional-date cases. "(R2-F01)" points to a
  decision whose optional part v0.5 supersedes.
- `e2e/us-01-data-form-co.spec.ts:111`: `describe('US-01-AC-09 a number the browser cannot parse
  counts as empty')` is the v0.4 scenario name. v0.5 renamed it "A required number the browser
  cannot parse fails the required check".
- `e2e/us-01-data-form-co.spec.ts:128`: the comment "The model and the stored state hold ''" has
  the same model claim.

The assertions are correct and match v0.5. Only the titles and the comment are stale. Test titles
are what `trace.sh` and the PR matrix show, and the model claim is the exact wording that spec v0.5
corrected. **Nit.** This is for the test-engineer (test files).

## Points from the orchestrator

1. **Is the restored gate complete?** Yes, apart from R4-F01. `submission` has no
   `ignoreValidators`, so `action` runs only for a valid form. `onInvalid` picks the first field in
   `configs` order (sorted by `sortOrder`, ties by key, at the boundary) whose state is `invalid()`,
   then calls `focusBoundControl()`. Click and Enter both reach it through the form's `submit` event
   (P1-P3, P6, P8-P10; component tests use `requestSubmit()` for Enter). Coverage by type:
   - **number**: required and optional with unreadable text (P6, component, e2e).
   - **date**: cleared, partly cleared, and partly typed from empty (P8-P10, component, e2e).
     P9 matters: Chromium fires no `input` event when an empty date gets only a month, and Signal
     Forms still reports the parse error (evidently it reads `validity` without that event), so the gate does not depend
     on `syncNative` for this.
   - **text, select, checkbox**: unchanged validators through `validateField` (AC-02 rows, AC-24).

   No stale value reaches the output or the store in any probe at human speed. `errorOf` now
   checks `invalid()` first, so a parse error can no longer show a message on a valid field.
2. **`syncNative` and `flushModel()`.** R3-F05 as written is fixed. `flushModel` skips the keys in
   `nativeKeys` (number and date), so `syncNative` is the only writer of those keys. `synced` still
   records them, which is harmless. `syncNative` reads the control's `validity` and `value` at the
   `input` event, so its order relative to the `FormField` listener does not matter. What remains
   is R4-F01: the DOM can change after the last `input` event (Signal Forms' deferred write), and
   the store does not see it. For numbers, `flushBindings()` on `beforeinput` closes that window. I
   found no number path that reaches it (spinner arrows and paste give parseable text or fire
   `beforeinput`). Mutation reasoning on the new tests: putting back `ignoreValidators: 'all'` fails
   the focus assertions (the action has no focus code now) and the optional-number tests (store
   `''` is a valid optional). Removing `(input)` from the date fails the store `''` assertions (unit
   and e2e storage). Removing the `nativeKeys` skip is not caught, but with the model unwritten on
   `badInput` it changes nothing observable.
3. **Spec v0.5 wording vs code.** It matches. Parse error: `errorOf` handles the `parse` kind. Store
   `''`: `syncNative`. No form-model write: none in the code. Dates are included in BR-01, the AC-09
   note, the AC-18 note, the AC-21 preamble and both §7.3 bullets. Required vs optional messages:
   `validateField(config, '')`, falling back to `errorMessage` or "Revisa este campo." (P6, P8,
   component tests). The §11 rows name tests that exist. The describe at line 590 is R4-F02
   (nit): the assertions are right, and only the title and one comment keep the dropped wording.
4. **ADR-0004 implementation-note row.** Accurate for every claim I checked: the gate, `onInvalid`
   and `focusBoundControl()`, the parse error with the control model left unwritten, `syncNative`
   as the only writer of number and date keys, `flushModel()` for the other types before
   `completeStep1`, and the history (40606e2, e92e2c7, R3-F01, eeb23e6). Two precision points, not
   findings. First, `completeStep1` still validates the store a second time inside `action`, so
   there are two gates that must agree (R4-F01 shows when they do not). Second, "the store
   therefore follows the control" holds per `input` event, not for writes Signal Forms makes to
   the control. If R4-F01 is fixed, the row could mention the store re-check.
5. **IPv6 leftovers.** None in code or config. `git grep` for `::1`/`IPv6` outside `reviews/` and
   `logs/` finds only the corrected FLOW.md row, the new compose comment (which states the
   correction: IPv4 loopback is enough, and the old binding rested on a misdiagnosis), and
   `tasks.md` history rows. `.env.example` ("127.0.0.1 only") and the README now agree with compose.
   The stack ran with only `127.0.0.1:1337`, and Node reached it through `localhost` in every e2e
   run (AC-03 and AC-28 use `E2E_STRAPI_URL=http://localhost:1337`). That confirms the correction.
   The README's new e2e note (fresh stack or a separate `-p` project, same ports, one admin login
   per `scripts/e2e.sh` run) is accurate.

## Verification of previous round

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|
| US-01-R3-F01 | 6e2077e (tests first), eeb23e6, 33a0c11 (tests) | fixed | P1-P3 (CO and CL, click and Enter): stays on step 1, focus on the date, store `''`, no stale date. Component tests for cleared and `badInput` dates, by click and by Enter, plus 2 e2e tests (in the 225/225 run). A residual timing case is R4-F01 |
| US-01-R3-F02 | 2dfb49e | fixed | ADR-0004 row added to the implementation-notes table, written after the final design as suggested, and accurate (point 4). ADR-0004 itself untouched |
| US-01-R3-F03 | 98f2bc4 | fixed | README uses `scripts/e2e.sh` and explains the seeded-baseline requirement and the login limit |
| US-01-R3-F04 | 98f2bc4 | fixed | `[::1]` binding removed. The compose comment states the corrected reason. `.env.example`, README and compose agree. The stack starts and e2e passes on 127.0.0.1 only |
| US-01-R3-F05 | eeb23e6 | fixed | One writer per key in the store (`nativeKeys` skip in `flushModel`). The deeper ordering issue, between the DOM and the store, is R4-F01 |

## Notes (no finding)

- **Scope and roles.** Test commits 6e2077e and 33a0c11 touch only test files. 6e2077e comes
  before the fix eeb23e6, and eeb23e6 touches only `quote-form.ts` and `quote-form.html`.
  98f2bc4 (README, compose) is orchestrator plumbing the human asked for. 2dfb49e mixes a
  spec-writer edit (`spec.md`) and an architect edit (`adr/README.md`) and says so in its body.
  bb465ff only adds a `tasks.md` row. No scope creep: the optional-number and optional-date
  behaviour is spec v0.5, and "Kilometraje"/"Fecha de revisión" are test fixtures, not seed.
- **Commits.** `fix`/`test` commits have `Refs:`. eeb23e6, 6e2077e, 98f2bc4 and 2dfb49e have
  `Resolves:`.
- **Angular / typing / security.** Still exactly two casts (`text`, `flag`) plus the DOM
  narrowing in `syncNative`. No new dependency. No hard-coded country value. The scan is clean.

## Summary

Open: 0 blocker, 0 major, 1 minor (R4-F01), 1 nit (R4-F02).

All five R3 findings are verified fixed, including the major R3-F01 (probes in CO and CL, click
and Enter, plus new component and e2e tests). Every check passes on a clean stack: lint on both
sides, builds and `tsc`, 319/319 unit, 12/12 backend, full e2e 40/40 twice, the CO file 225/225
over 15 repeats, a clean secret scan, and trace with 0 ACs without a test. Spec v0.5 and the
ADR-0004 note match the code. The verdict is **APPROVED**. R4-F01 is a real store/screen
divergence, but only at sub-frame keystroke timing, so it is minor. It should be fixed or
justified before HC3, because when it happens the failure is silent (AC-10). R4-F02 is a rename
for the test-engineer.

Routing: R4-F01 to the frontend-developer (a test-engineer test first, if it is fixed; the P11
timing reproduces it deterministically with `fill` followed at once by Backspace). R4-F02 to the
test-engineer.
