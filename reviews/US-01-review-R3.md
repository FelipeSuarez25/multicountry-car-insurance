# US-01 — Code review, round 3

| Field | Value |
|---|---|
| Story / spec | US-01 · `specs/US-01/spec.md` (version 0.4, Approved) |
| Branch / commit reviewed | `feat/us-01-data-form` @ `6a81afe` (diff `323600f..HEAD`, 12 commits; touched areas re-checked against `main...HEAD`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **CHANGES REQUESTED** (1 major: US-01-R3-F01, a regression introduced by the R2-F01 fix) |

Sources read: `reviews/US-01-review-R2.md`, spec v0.4 (AC-02, AC-09 and its note, AC-10, AC-18,
AC-21, §7.3, §10), ADR-0004 (*What is decided*, *Consequences*), the implementation-notes table in
`adr/README.md`, `CLAUDE.md`, `FLOW.md` (row "The orchestrator misdiagnosed…"), `specs/US-01/tasks.md`
(Gate history up to "5 Gate (after R2 fixes, final)"), the installed `@angular/forms` 22.3.0
`submit()` source, and the `review-checklist`, `strapi-content-modeling` and `dynamic-form-fields`
skills. The human decisions after R2 (R2-F01 follows the spec; R2-F04 fixed before HC3; R2-F02, F03,
F05 and F06 fixed in this round) are taken as given.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | Exit 0, no output |
| Lint (backend) | `npm run lint` | Exit 0, no output |
| Build / typecheck (frontend) | `CI=1 NG_CLI_ANALYTICS=false npx ng build`; `npx tsc --noEmit -p tsconfig.app.json`; `npx tsc --noEmit -p tsconfig.spec.json` | Build exit 0 (main 340.54 kB raw / 90.36 kB transfer); both `tsc` exit 0 |
| Build / typecheck (backend) | `npx tsc --noEmit -p tsconfig.json`; `npm run build` | Both exit 0 |
| Unit tests (frontend) | `npm test` | 8 files, **309 passed / 0 failed** |
| Unit tests (backend) | `npm test` | 2 files, **12 passed / 0 failed** (includes the new `published-only-routes.test.ts`) |
| Guard mutation (backend, scratch copies, tracked files untouched) | (a) `country` router without `publishedOnlyConfig()`; (b) `publishedOnlyConfig` returning one shared object | (a) fails: "api::country.country.find: the route does not carry global::published-only"; (b) fails: "api::form-field.form-field.find: auth.scope is ["api::country.country.find"]". The guard catches both regressions it was written for |
| E2E | Clean stack `docker compose -p mci-review up -d --build --wait` (no prior `mci-review` resources; ports free), then **only** `scripts/e2e.sh` | Run 1: **38/38**. Run 2: **38/38**. `scripts/e2e.sh e2e/us-01-data-form-co.spec.ts --repeat-each=15`: **195/195**. Run 3 after `up -d --build --force-recreate` (persisted DB with the residue of runs 1-2): **38/38**. No JWT (`eyJ…`) in any output. Stack removed with `down -v` |
| E2E 429 path | 4 wrong-password logins (HTTP 400; a 5th returned 429), then `scripts/e2e.sh e2e/us-01-config-change.spec.ts` | `globalSetup` printed "Strapi admin login rate limited (HTTP 429): waiting 300 s for the window to pass, once.", then **2/2 passed** (5.0 min, `real 302 s`) |
| Traceability | `bash scripts/trace.sh US-01` | Before this report: exit 0, ACs without tests 0 (AC-26 manual), open blocker/major 0. With this report, R3-F01 (major) is open, so it exits 1 until the fix is verified |
| Secrets | `bash scripts/scan-secrets.sh` | No findings in 221 files; 6 explicit exceptions, all unchanged since R2 (justified there). Exit 0 |
| Pinning | `git diff 323600f..HEAD -- '*package*.json'` | No dependency change in this round |
| Browser probes (throwaway Playwright scripts in the scratchpad, against the review stack) | See R3-F01, R3-F05 and *Open points* | |
| Persistence probe (R2-F04) | `ls /data` in the container; `documentId`s of `/api/form-fields` before and after `up -d --build --force-recreate` | `/data/data.db` (1.1 MB) in the volume, `/app/data` absent; same 19 `documentId`s after recreation, no "Seed: created" lines |

## AC verification

Unchanged from R2 unless stated. Every AC still has its test, and every test passes on a clean stack.

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-01-AC-01 | as R2 | as R2 | ✅ |
| US-01-AC-02 | as R2; gate now in `quote-form.ts:64-77` | as R2 | ⚠️ "I cannot move to the next step" fails for a required **date** cleared to an incomplete value while it shows its error (US-01-R3-F01). The Examples rows pass |
| US-01-AC-03 | as R2 | `e2e/us-01-config-change.spec.ts` (shared admin session, be39451) | ✅ |
| US-01-AC-04 | as R2 | as R2 | ✅ |
| US-01-AC-05 | as R2 | as R2 | ✅ |
| US-01-AC-06 | as R2 | as R2 | ✅ |
| US-01-AC-07 | as R2 | as R2 | ✅ |
| US-01-AC-08 | as R2 | as R2 | ✅ |
| US-01-AC-09 | `quote-form.ts:126-129` (`syncNumber`), `:135-143` (`errorOf`), `quote-form.html:39` | `quote-form-page.spec.ts` (5 new tests: store `''`, storage `''`, required message, `requiredMessage`, optional → `null`), `e2e/us-01-data-form-co.spec.ts:68` (`badInput` stays true, storage `''`) | ✅ Now follows the v0.3 note: store/storage/output `''`, an optional field valid (probe: optional "2015e" + Enter or click → `/co/planes`, stored `''`), text stays visible |
| US-01-AC-10 | focus now in the submission `action` (`quote-form.ts:74-76`) | as R2 | ⚠️ In the R3-F01 case no focus move happens, because the page navigates |
| US-01-AC-11 | as R2 | as R2 | ✅ |
| US-01-AC-12 | as R2 | as R2 | ✅ |
| US-01-AC-13 | as R2 | as R2 | ✅ |
| US-01-AC-14 | as R2 | as R2 | ✅ |
| US-01-AC-15 | as R2 | as R2 | ✅ |
| US-01-AC-16 | as R2 | as R2 | ✅ |
| US-01-AC-17 | as R2 | as R2 | ✅ |
| US-01-AC-18 | as R2 | as R2 | ⚠️ In the R3-F01 case a typed output is produced with a `birthDate` the screen no longer shows |
| US-01-AC-19 | as R2 | as R2 | ✅ |
| US-01-AC-20 | as R2 | as R2 | ✅ |
| US-01-AC-21 | store written by `syncNumber` | `quote-form-page.spec.ts` (storage `''`), e2e storage assertion | ✅ Probe: "2015e" + reload → field empty, stored `''` (the human's R2-F01 decision) |
| US-01-AC-22 | as R2 | as R2 | ✅ |
| US-01-AC-23 | as R2 | as R2 | ✅ |
| US-01-AC-24 | `flushModel()` before submit (e92e2c7) | `e2e/us-01-data-form-co.spec.ts:151,237` | ✅ 195/195 in the repeated file; probe: text typed then Enter 10/10 |
| US-01-AC-25 | as R2 | as R2 | ✅ |
| US-01-AC-26 | as R2 | Manual at HC3 (T-31) | 🖐 manual, pending HC3 |
| US-01-AC-27 | as R2 | as R2 | ✅ |
| US-01-AC-28 | as R2 | as R2, plus `backend/tests/published-only-routes.test.ts` (R2-F03) | ✅ |

## Findings

R2 findings carry their round 3 status. New findings are `US-01-R3-FNN`.

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-01-R2-F01 | minor | `frontend/src/app/features/quote-form/quote-form.ts`, `quote-form.html` | The F03 fix departed from the AC-09 note | Spec v0.4 AC-09, AC-21, ADR-0004 | fixed (per the human decision; the fix introduced US-01-R3-F01) | 782d052 (tests), 40606e2, e92e2c7 |
| US-01-R2-F02 | nit | `frontend/e2e/us-01-data-form-co.spec.ts` | AC-09 e2e could not see whether the text survives | Checklist (tests fail when behaviour breaks) | fixed | 778f3e9 |
| US-01-R2-F03 | minor | `backend/src/utils/published-only-config.ts` | No automated guard on the per-router published-only config | ADR-0002, US-01-BR-06 | fixed | 6495aa9 |
| US-01-R2-F04 | minor | `backend/config/database.ts` | SQLite file outside the volume | Compose intent, `strapi-content-modeling` | fixed | e4755af |
| US-01-R2-F05 | minor | `README.md` | DB reset after `f39ff8d` not documented | ADR-0006, CLAUDE.md §12 | fixed | 63a05b7 |
| US-01-R2-F06 | nit | `specs/US-01/spec.md`, `tasks.md`, ADR-0002 | Stale references after R1 | CLAUDE.md §1, §9 | fixed | 2fae33a, d1e78f3 |
| US-01-R3-F01 | major | `frontend/src/app/features/quote-form/quote-form.ts:62-77`; `quote-form.html:48-56` | Regression from 40606e2: submission now ignores Signal Forms validity (`ignoreValidators: 'all'`) and decides on the store, but only **number** inputs write unparseable state to the store. A required **date** that was valid and is then partly cleared shows "Ingresa tu fecha de nacimiento." with `aria-invalid="true"`, yet "Continuar" goes to `/co/planes` (also `/cl/planes`) with the old `birthDate` that is no longer on screen. At `323600f` the same steps stay on `/co/datos` with focus on the date | US-01-AC-02 ("I cannot move to the next step"), US-01-AC-10, US-01-AC-18 (output = what was typed), ADR-0004 (*Focus on a failed attempt*, *Error visibility*) | open | |
| US-01-R3-F02 | minor | `adr/README.md` (implementation notes); ADR-0004 *What is decided* | The submission mechanism no longer matches ADR-0004's text (`onInvalid` focus, `touched && invalid` visibility, Signal Forms validity as the gate), and a number control's Signal Forms model now deliberately differs from the store. No implementation note records it | CLAUDE.md §1 (record decisions), §9 (traceability); ADR-0004 | open | |
| US-01-R3-F03 | minor | `README.md:74-90` ("Run the tests"), `README.md:68-72` ("Try the configuration") | The README's e2e command builds the env by hand. FLOW.md now requires `scripts/e2e.sh`. And since R2-F04, content edited by following "Try the configuration" persists, so the documented e2e run then fails (the suite asserts the exact seeded field list). Nothing tells the reader to use a fresh volume or a separate project | FLOW.md (row "misdiagnosed", rule adopted), checklist (maintainability), CLAUDE.md §12 (e2e pass) | open | |
| US-01-R3-F04 | nit | `docker-compose.yml:8-10`; `.env.example:17` | The compose comment still justifies `[::1]:1337` with the disproven reason ("`localhost` resolves to ::1 first … Node 17+ keeps that order"). `.env.example` says "127.0.0.1 only". The binding works on this host but was not needed, and it adds a possible start-up failure on hosts without an IPv6 loopback (not reproduced) | CLAUDE.md §1 (decisions recorded where they apply), FLOW.md correction | open | |
| US-01-R3-F05 | nit | `frontend/src/app/features/quote-form/quote-form.ts:84-98`, `:126-129` | Two writers for number keys: `syncNumber` writes `''` on `badInput`, while `flushModel` writes any model value that changed since its last run. If a parseable change is still unflushed when an unparseable input arrives without a `beforeinput` (so no `tick()`), the later flush overwrites `''` with the stale number. Not reproduced (probes P3 and P4 below) | Checklist (state handling), maintainability | open | |

### US-01-R3-F01 — A partly cleared date passes "Continuar" while it shows its error

**Steps to reproduce** (review stack, Chromium, also in a throwaway Playwright probe):

1. Open `/co/datos` and fill every field with the US-01-AC-04 values (birth date `1990-05-15`).
2. Click "Fecha de nacimiento" and press Backspace once (the first segment is cleared), then Tab.
3. Activate "Continuar".

| | `323600f` (before 40606e2, served from a `git archive` copy) | `6a81afe` (HEAD, review stack) |
|---|---|---|
| Date control | `value ''`, `validity.badInput true` | same |
| Error shown | "Ingresa tu fecha de nacimiento.", `aria-invalid="true"` | same |
| Stored `birthDate` | `"1990-05-15"` | `"1990-05-15"` |
| After "Continuar" | stays on `/co/datos`, focus on `field-birthDate` | **navigates to `/co/planes`**, no focus move |

The same steps on `/cl/datos` (valid Chilean values, then the birth date partly cleared) also
reach `/cl/planes`.

**Why.** Signal Forms reports a `parse` error for any native input with `validity.badInput`, and it
does not write the model. Before 40606e2 that parse error made the form invalid, and `submit()`
ran `onInvalid`. Now `ignoreValidators: 'all'` always runs `action`, and `completeStep1` validates
the **store**. Only number inputs have `syncNumber`, so a date's store value stays at the last
complete date. The screen and the store disagree: the error says the field is empty, the gate says
it is valid. The typed output then carries a value the person removed.

**Severity: major.** It is a regression of a passing behaviour, and it lets an invalid-looking form
submit (AC-02, AC-10). It is not a blocker: the value passed on is one the person typed earlier and
is valid, and no data is lost. No unit, component or e2e test covers a `badInput` date. jsdom cannot
produce one, so the component suite would need the same `validity` stub as the number tests in
782d052.

**Suggested direction (optional).** Keep one rule for every native control that can report
`badInput` (number **and** date): its store value is `''` while `badInput` is true, matching the
AC-09 note's "handled as empty". Or keep Signal Forms parse errors in the gate for those
controls. In both cases, add a component test with the `validity` stub and an e2e row for the date.
The spec does not mention incomplete dates. "Handled as empty" is the reading consistent with what
the screen shows already. If the team prefers another behaviour, it needs a spec note.

### US-01-R3-F02 — ADR-0004 no longer describes the submission path

ADR-0004 *What is decided* says: errors are shown when `touched() && invalid()`, and on a failed
attempt `onInvalid` focuses the first invalid field. Since 40606e2:

- the gate is `QuoteStore.completeStep1` (store values), with `ignoreValidators: 'all'`;
- focus is chosen in `action` from `validateField` on the store values;
- `errorOf` shows the parse-branch message without checking `invalid()`;
- for a number with unparseable text, the Signal Forms model keeps the last parseable text while the
  store, the storage and the output hold `''`.

**Answer to open point 1.** The *observable* behaviour now matches spec v0.4 for number fields:
AC-09 note (optional valid, required → `requiredMessage ?? errorMessage`, output `null`), AC-21
(reload restores `''`), and the human's R2-F01 decision (text stays visible). Spec §7.3 calls the
stored values "the raw editing value of the form model", and those are `''`. So I do not see a new
spec question for numbers, and no new human decision is needed for them. The *mechanism* departs
from ADR-0004's text, and the divergence of two models is exactly what produced R3-F01. That
belongs in the `adr/README.md` implementation-notes table, which exists for this case (accepted
ADRs are not rewritten). The note should be written after R3-F01 is fixed, so it describes the
final design.

What bypassing the validators keeps and loses, checked against the 22.3.0 source of `submit()`:
`node.markAsTouched()` runs **before** the `ignoreValidators` branch, so touched state and error
visibility after a submit attempt are kept. `focusBoundControl()` is still used, from `action`. What
is lost is Signal Forms' own parse-error gate: before, it caught every `badInput` control, and now
nothing does except `syncNumber` for numbers (R3-F01). A smaller side effect: `submit()` now returns
`true` (a "successful" submission) for an invalid attempt, because `action` returns `undefined`.
Nothing reads it today, so this is not a finding.

**Minor.**

### US-01-R3-F03 — The README's test instructions no longer hold

- `README.md` "Run the tests" builds the e2e env by hand. That is the pattern FLOW.md now says to
  avoid ("run e2e only through `scripts/e2e.sh`"). The README predates the script (63a05b7 comes
  before ea0b751), so it was not updated.
- Open point 5 (does anything depend on reset-on-rebuild?): the seed (idempotent, look-up by
  natural key) and the e2e cleanups (`deleteStaleTokens`, `deleteStaleFields`) do not. Run 3 passed
  38/38 on a persisted, recreated database. What does depend on it is the README's own sequence.
  "Try the configuration without a deployment" tells the reader to edit, reorder or add a CO field
  and publish it. Since e4755af that change survives `up --build`. The e2e suite asserts the exact
  seeded field list (AC-01, AC-13), so the documented e2e run then fails, with no hint. Before
  e4755af, a rebuild silently reset the content.

**Minor.** Documentation only. The suggested fix is a line saying that e2e expects the seeded
baseline (`docker compose down -v`, or a separate `-p` project), plus `scripts/e2e.sh` as the
command.

### US-01-R3-F04 — Leftovers of the IPv6 diagnosis (open point 3)

FLOW.md's corrected row is accurate. `tasks.md` (Gate row "after R2 fixes + correction") and the
R2 review text are consistent with it (R2 only reported that both loopbacks answer). Two places
still carry the old story:

- `docker-compose.yml:8`: "Both loopbacks: `localhost` resolves to ::1 first on many hosts (Node
  17+ keeps that order)". The correction says Node 24 reaches an IPv4-only server through
  `localhost` (`autoSelectFamily`), so this is the disproven rationale.
- `.env.example:17`: "published on 127.0.0.1 only". That contradicts compose and the README
  ("127.0.0.1 and ::1").

**Is the extra binding harmless?** On this host, yes: the stack starts, both loopbacks are
published (`127.0.0.1:1337` and `[::1]:1337` in `docker compose ps`), and the LAN address was
refused in the R2 probe (the port list is unchanged). The remaining risk is that publishing on
`[::1]` makes `docker compose up` depend on an IPv6 loopback existing. On a Linux host with IPv6
disabled, Docker may fail to bind that address and refuse to start the service. I did not reproduce
this (macOS, Docker Desktop). Since the binding is not needed, removing it or keeping it with a
correct comment are both reasonable, and the human can choose. **Nit.**

### US-01-R3-F05 — `syncNumber` and `flushModel` both write number keys (open points 1 and 2)

The invariant that keeps them from fighting is that a `badInput` input event never changes the
Signal Forms model, and that `beforeinput` runs `appRef.tick()` (which flushes the effect) before
each keystroke. A path that changes the text without `beforeinput` and before the next change
detection could leave a pending parseable model change. That change would then overwrite the `''`
that `syncNumber` wrote. Probes:

- P3: type "2015", then `keyboard.insertText('e')` (no keydown or `beforeinput` keystroke), then
  Enter, 10 times: always stayed on `/co/datos`, stored `''`, `badInput` true.
- P4: type "2015e" with no delay, then Enter, 20 times: never left step 1, stored `''`.

So the race is theoretical in Chromium today. **Nit**: one writer per key (for example
`flushModel` skipping keys owned by `syncNumber`, or `syncNumber` updating `synced`) would remove
the ordering dependency. A fix for R3-F01 is a natural place to do this.

## Open points from the orchestrator

1. **R2-F01 design.** See R3-F02 (consistency with the spec and ADR-0004, and what bypassing the
   validators keeps and loses), R3-F05 (races) and R3-F01 (what it loses for non-number controls).
2. **e92e2c7, is the fix complete?** For the "store one write behind" class, yes. `flushModel()` runs
   synchronously at the start of `action`, reads the current model for **every** field type, and
   is reached by both Enter (implicit submission) and a mouse click (same `submit` event). Evidence:
   AC-24 195/195; P5 (text typed, then Enter at once) 10/10 reached `/co/planes`; P2 optional number
   reached `/co/planes` with Enter and with a click. It does not cover the date case (R3-F01). That is
   a different gap of the same design: there the store is not behind, it is never written.
3. **FLOW.md correction (ea0b751).** The correction is accurate and well placed. `scripts/e2e.sh`
   uses `set -euo pipefail`, exports each variable separately (no word-splitting), lets the caller
   override, and passes the arguments through. Leftovers: R3-F04 (compose comment, `.env.example`)
   and R3-F03 (README e2e command).
4. **be39451, JWT handling and the 429 wait.** Safe. The JWT is set in `process.env` by
   `globalSetup` and read by the workers in the Node runner. It is never passed to `page.*`,
   `addInitScript`, cookies or storage. Errors print a status code and a fixed text only
   (`expectOk`), and the 429 messages contain no token. I found no `eyJ…` in any e2e output of this
   review. Playwright's `retain-on-failure` traces record request headers, so a failed AC-03 or
   AC-28 run keeps the JWT in `frontend/test-results/`. That folder is git-ignored and local, and
   the per-test login before this commit did the same. The browser *process* inherits the runner's
   environment, but page scripts cannot read it. The wait is bounded: one wait of `Retry-After`, or
   the documented 5-minute window when Strapi sends none (it does not), capped at 5 min 15 s, then a
   second 429 fails with a clear message. **Live run:** with the window exhausted, `globalSetup`
   printed "Strapi admin login rate limited (HTTP 429): waiting 300 s for the window to pass,
   once.", retried once, and the file passed 2/2 after 302 s. The fallback `getAdminSession` →
   `loginAdmin` (only when `globalSetup` did not run) would hit the 30 s test timeout before the
   5-minute wait ends, so its failure would read as a timeout. That is outside the configured path
   and not a finding.
5. **R2-F04 (e4755af).** Fixed and verified (`/data/data.db` in the volume, same `documentId`s after
   `--force-recreate --build`). The seed and the e2e suite do not depend on a reset (run 3).
   `npm run develop` still resolves `.tmp/data.db` (a relative path keeps `path.join`). The
   backend tests set a relative `.tmp/…` file, so they are unaffected. The README now documents
   persistence and the one-time reset (R2-F05). The only dependency left is the README sequence in
   R3-F03.

## Verification of previous round

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|
| US-01-R2-F01 | 782d052 (tests, before the fix), 40606e2, e92e2c7 | fixed | Behaviour matches the human decision and the AC-09/AC-21 notes for numbers: unit (5 new tests) and e2e green, and probes P2 and P6 confirm optional → valid and `null`, and reload → `''`. The fix introduced a regression for dates (R3-F01). Mechanism note: R3-F02 |
| US-01-R2-F02 | 778f3e9 | fixed | Asserts `validity.badInput === true` before and after the failed submit, plus storage `''`. Mental mutation: wiping the text (the R1 behaviour) makes `badInput` false, so the test fails. Storing the last parseable text fails the storage poll |
| US-01-R2-F03 | 6495aa9 | fixed | Walks every `api::` content type and checks `find`/`findOne` for `global::published-only` and for a scope equal to its own handler. Both mutations above fail with clear messages. A future **single type** has no `findOne` route and would be reported as "no route found". `terms` is a per-country collection type (ADR-0001), so this is only a heads-up for later stories |
| US-01-R2-F04 | e4755af | fixed | `path.isAbsolute` keeps `/data/data.db`; verified in the container and across recreation |
| US-01-R2-F05 | 63a05b7 | fixed | README has run, test and reset instructions, including the one-time reset after `f39ff8d` for Docker and for `npm run develop`. ADR-0006's "reset the Strapi volume" is now accurate. A newer README gap is R3-F03 |
| US-01-R2-F06 | 2fae33a, d1e78f3 | fixed | Spec metadata and §10 state ADR-0006 as Accepted and add the route-middleware note. T-33 carries the note. `adr/README.md` has the implementation-notes table with the ADR-0002 row. ADR-0002 itself is untouched, as required |

## Notes (no finding)

- **Scope and roles.** Test-only commits (782d052, 778f3e9, 6495aa9, be39451) touch only test files
  and the Playwright config. Fix commits (40606e2, e92e2c7, e4755af) touch no test. The tests for
  R2-F01 (782d052) precede the fix (40606e2). Orchestrator commits (2fae33a, ea0b751, 6a81afe) touch
  flow files, `scripts/e2e.sh`, `tasks.md` and `adr/README.md`, as allowed for plumbing. d1e78f3
  mixes a spec-writer edit (`spec.md`) and an orchestrator edit (`adr/README.md`) and says so in its
  body. No scope creep.
- **Commits.** Every `fix`/`test` commit has `Refs:`, and each finding fix has `Resolves:`.
  e92e2c7 states "Fixes regression from 40606e2". The co-author trailer in the subagent commits
  names Sonnet 5.5, which matches the agents that authored them.
- **Multi-country / Angular / security.** No hard-coded country values were added. There are still
  exactly two casts (`text`, `flag`) plus one `event.target as HTMLInputElement` in `syncNumber`,
  which is a DOM narrowing, not a form-field cast. `field-validators.ts` still imports nothing from
  `@angular/forms`. No dependency changed. The scan is clean.

## Summary

Open: 0 blocker, **1 major** (R3-F01), 2 minor (R3-F02, R3-F03), 2 nit (R3-F04, R3-F05).

All six R2 findings are verified fixed. All checks pass on a clean stack: lint both sides, builds and
`tsc`, 309/309 unit, 12/12 backend, e2e 38/38 three times, 195/195 repeated CO file, the 429 path
exercised live, trace 0 ACs without a test, and a clean secret scan. The verdict is CHANGES
REQUESTED because the R2-F01 fix moved the submission gate to the store without covering every
control that can hold unparseable input. A required date can be submitted while it shows its error
(R3-F01). The tests do not catch it, because none produces a `badInput` date.

Routing: R3-F01 to the frontend-developer, with a test from the test-engineer first (component test
with the `validity` stub, plus an e2e row). R3-F02 to the orchestrator or architect after R3-F01
(implementation note). R3-F03 and R3-F04 to the orchestrator (README, compose comment,
`.env.example`). R3-F05 together with R3-F01.
