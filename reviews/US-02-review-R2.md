# US-02 — Code review, round 2

| Field | Value |
|---|---|
| Story / spec | US-02 · `specs/US-02/spec.md` (version 0.1, Approved) |
| Branch / commit reviewed | `feat/us-02-plan-list` @ `7398973` (scope: `git diff 7e9c446..HEAD`, 7 commits) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **APPROVED** (no blocker or major findings; 2 new nits) |

Round 2 is a verification round. It checks each round 1 finding against its fix commits and
reviews only the diff since `7e9c446`. The human decisions recorded in the `specs/US-02/tasks.md`
Gate history are not re-litigated: F01, F02, F03, F04 and F06 fixed; F05 won't fix; F07 recorded.

## Automated checks (run by the reviewer)

All checks were run by the reviewer on `7398973`. Full outputs went to files and were read in full.

| Check | Command | Result |
|---|---|---|
| Backend typecheck / lint / build | `backend: npx tsc --noEmit`, `npx eslint .`, `npm run build` | exit 0 / exit 0 / exit 0 |
| Backend tests | `backend: npm test` | **54 passed / 0 failed** (3 files) |
| Frontend typecheck | `npx tsc --noEmit -p tsconfig.app.json` / `-p tsconfig.spec.json` | exit 0 / exit 0 (`lib` with `ES2023.Intl` is inherited by both; neither overrides it) |
| Frontend lint | `frontend: npx eslint .` | exit 0, no output |
| Frontend build | `npm run build` | exit 0 (`main` 353.55 kB raw, unchanged) |
| Frontend unit | `npm test` | **590 passed / 0 failed** (15 files) |
| Stack | `docker compose -p mci-review up -d --build --wait` (after `down -v`) | strapi and web healthy; `down -v` at the end |
| E2E, full suite | `scripts/e2e.sh` | **78 passed** (19.3 s), exit 0 |
| Traceability | `scripts/trace.sh US-02` | exit 0. ACs without a test: 0 (AC-18 manual per spec). Open blocker/major: 0 |
| Traceability | `scripts/trace.sh US-01` | exit 0. ACs without a test: 0. Open blocker/major: 0 (US-01-R4-F01 minor, R4-F02 nit, unchanged from `main`) |
| Secret scan (code) | `scripts/scan-secrets.sh` | exit 0: "no findings in 264 file(s); explicit exceptions: 6". The 6 `ALLOWED` lines are the same pre-existing ones as in R1. 264 = 312 non-ignored files − 48 transcripts, so `logs/sessions/README.md` is now scanned |
| Log scan | `scripts/scan-logs.sh` | exit 0: "48 transcript(s); unmarked findings: 23; recorded in logs/sessions/README.md: 23" |
| Mutation (reviewer) | `required` removed from `coverages`, `npx vitest run tests/plan-rules.test.ts`, then reverted | **5 failed / 37 passed**: all five AC-09 coverage tests go red (details below). Tree clean after the revert |
| Admin editor path (reviewer) | Playwright against the throwaway stack's admin panel; the probe plans were deleted | Draft with `[]` saved; publish refused by the admin and by the server (details below) |

### Mutation check

The reviewer removed `"required": true` from `coverages` in
`backend/src/api/plan/content-types/plan/schema.json` (uncommitted), ran the plan tests, and
restored the file with `git checkout --`. `git status` was clean afterwards. Red tests:

- `US-02-AC-09 refuses to publish a plan with no coverage (min 1)`
- `US-02-AC-09 refuses to publish an existing draft that has no coverages, and no published version appears`
- `US-02-AC-09 refuses to create a draft with coverages unset (no draft without a list); …`
- `US-02-AC-09 refuses to publish a draft whose coverages an editor emptied after saving it valid`
- `US-02-AC-09 refuses to update a published plan so that it has no coverages, and the published coverages stay`

The control test (`a draft with coverages publishes, and a published plan can be updated with
other coverages`) stays green, so the red tests fail because of the rule and not because the
helper data is invalid. This matches the Strapi 5.63 validator
(`@strapi/core/dist/services/entity-validator/index.js`):
- `addMinMax` (lines 36-44) applies `min` only when the attribute is `required` or the array is
  non-empty;
- repeatables call it only when `!options.isDraft` (lines 105-110);
- `addDefault` (lines 60-74) defaults a non-required repeatable to `[]` on creation, and a
  required one to `undefined`, which `notNil()` (lines 45-58) rejects even on a draft.

On update, the check is `notNull()`, so a partial update of a draft that omits `coverages` is
still accepted.

### Admin editor path

Run on the clean review stack as the fictitious dev admin. Both probe plans were deleted (HTTP
200), before the stack was removed with `down -v`.

| Step | Variant A: new plan, coverage row left as the admin pre-fills it | Variant B: the pre-filled coverage row deleted (`coverages (0)*`) |
|---|---|---|
| Payload of "Save" | `coverages: [{ __temp_key__ }]`: one blank row | `coverages: []` |
| Save the draft | 201; the draft holds `[{ label: null }]` | 201; the draft holds `[]` |
| "Publish" in the admin | Blocked on the client: "There are validation errors…", `label` "This value is required." | Blocked on the client: "There are validation errors…", "The value is too low (min: 1)." |
| Publish via the admin API (bypassing the client) | — | 400 `ValidationError`: "coverages field must have at least 1 items" (plus "country must be defined", since the probe had no country) |
| Published version afterwards | none | none |

So an editor can save an incomplete draft and cannot publish it without a coverage. Since the
middleware was removed, the server message is Strapi's English yup text instead of the Spanish
"Un plan publicado necesita al menos una cobertura.". The admin panel is in English and shows
its own client-side message first, so this is no finding.

## AC verification

Only AC-09 (backend side) and AC-06 (typing) are touched by the diff since `7e9c446`. All other
AC rows of round 1 stand: the code is unchanged, and the full e2e and unit suites pass.

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-02-AC-09 (backend: a published plan has ≥ 1 coverage) | `schema.json:49-55` (`required: true`, `min: 1`); the middleware is removed | `plan-rules.test.ts:238-279` (create, publish of a draft, unset on draft, emptied draft, update of a published plan, control); mutation-proven | ✅ |
| US-02-AC-09 (front end boundary) | `shared/plan.ts` (unchanged) | `plan.spec.ts` (unchanged) | ✅ |
| US-02-AC-06 | `shared/money-format.ts:13-21`: typed `Intl.NumberFormatOptions`, no cast | `money-format.spec.ts`; e2e `plans-cl-content` › AC-06 | ✅ |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-02-R2-F01 | nit | `specs/US-02/spec.md:563` (§7.1, `coverages` row) vs `backend/src/api/plan/content-types/plan/schema.json:53` | The spec's content contract lists `coverages` as "repeatable component `plan.coverage`, `min: 1`". The schema now also has `required: true`. That adds a draft-level rule the spec does not state: a plan cannot be **created**, even as a draft, with `coverages` unset (`[]` is accepted on a draft). To record at HC3 | Checklist Spec conformance (the spec is the source of truth for the content contract) | open | |
| US-02-R2-F02 | nit | `logs/sessions/README.md:62-64` | The edited paragraph reads "…the `scan-findings` count above. run the scanner on the **full** export…": a lowercase sentence start, and the old manual procedure is repeated after the new one | Checklist Language (clear docs) | open | |

### US-02-R2-F01 — The spec's §7.1 does not reflect `required` on `coverages`

**Does the new draft rule conflict with spec v0.1?** No.
- The spec talks about drafts only as "not shown" or "never readable anonymously" (BR-02, BR-06,
  AC-08, AC-19). It sets no rule for what a draft may hold.
- The published-plan rule it does set (BR-01, Q-12: "at least one coverage") is enforced on
  every path that produces a published version. The mutation and the five tests above prove it.
- The new restriction affects only a programmatic `create` that omits `coverages` (Document
  Service or REST). The admin always sends a list: `[]` or the pre-filled blank row (variant A
  and B above), so editors never hit it. The seed and the AC-12 e2e plan creation pass on a
  clean stack.

What the spec does not show is the mechanism, and with it the draft-level consequence. §7.1
reads as "`min: 1` only", and a maintainer who aligns the schema with the spec would remove
`required` and silently disable the rule. That is exactly the mutation above, and the tests
would catch it. Suggested resolution: when the human confirms the draft semantics at HC3, record
the decision in the spec Review log and update the §7.1 row (for example: "repeatable,
`required`, `min: 1`; a draft may hold `[]`, but `coverages` must be sent on create").

Observation, no finding: a new plan in the admin starts with one blank coverage row, which is
saved into the draft as `{ label: null }` if the editor leaves it. The draft is invisible to the
front end and cannot be published, so nothing reaches the user. The comment in
`plan-rules.test.ts:244-245` ("the admin panel and REST send [] for an empty repeatable") holds
only when the editor removes that row.

### US-02-R2-F02 — Broken sentence in the logs README

Line 62 adds the `scan-logs.sh` sentence in front of the old text without joining them. Result:
"…count above. run the scanner on the **full** export and read the **complete** output. The
number of `SECRET?` lines must equal…". The content is correct, but the paragraph now states the
procedure twice. Cosmetic only.

## Verification of previous round

| Finding | Severity (R1) | Fix commit(s) | Status | Notes |
|---|---|---|---|---|
| US-02-R1-F01 | minor | `d5b154f` (schema `required`, middleware and its registration removed); test reframed in `ae62775` | **fixed** | `plan-coverages.ts` is deleted, and `index.ts` no longer registers it. No leftover reference outside `reviews/`. The rule now comes from Strapi's own validator: verified in the source, by the mutation (5 red) and in the admin (both variants). Draft semantics: see R2-F01 (nit, no conflict) |
| US-02-R1-F02 | minor | `7348424`; `ae62775` | **fixed** | The publish-of-a-draft, emptied-draft and update-of-a-published-plan paths are tested, plus a control test. Each "refused" test also checks that no published version appeared, or that the old coverages remain. The tests assert only `rejects.toThrow()`, not the reason, but the control test and the mutation show that they fail for the right reason. `ae62775` changed one test from "an unset draft is saved, then publish is refused" to "an unset draft is refused at creation". That follows the mechanism the human chose and is recorded in the Gate history; it weakens no published-plan assertion |
| US-02-R1-F03 | minor | `7732832` | **fixed** | `lib: ["ES2022", "ES2023.Intl", "DOM", "DOM.Iterable"]` in `frontend/tsconfig.json`, inherited by the app and spec configs; `options: Intl.NumberFormatOptions` with no cast; tsc, build and the 590 unit tests pass. `DOM.Iterable` is kept, so no DOM typing is lost |
| US-02-R1-F04 | minor | `1cd234d` | **fixed** | (1) The gate now skips only `logs/sessions/*.jsonl` (a bash `case` `*` also matches `/`, so subagent transcripts are skipped too). `logs/sessions/README.md` is scanned: the file count is 264 = 312 − 48. (2) `scripts/scan-logs.sh` compares the `SECRET?` count with `<!-- scan-findings: 23 -->` and fails on a mismatch. It fails closed if the marker is missing, and a crashed scanner yields a count of 0, which is also a mismatch. It compares a count, not identities, so one finding replacing another would pass. That is the mechanism R1 suggested and acceptable at this size. `session-handoff` step 3 points to it |
| US-02-R1-F05 | nit | — | **won't fix** | Human decision (Gate history, 2026-11-21): fixing it needs a history rewrite on a pushed branch. The lesson is recorded |
| US-02-R1-F06 | nit | `09d968e` | **fixed** | `adr/README.md` says ADR-0007 is Accepted; `specs/README.md` gives the current status; the tasks.md Blockers and T-03..T-10 rows are updated; the blank lines inside the FLOW.md "Where AI failed" table are gone, so the table is contiguous. (`specs/README.md` says "review R1 APPROVED, fixing minors". It will need a refresh at HC3, which is normal state upkeep, not a finding) |
| US-02-R1-F07 | nit | `e266d9a` (the change); recorded in `09d968e` | **recorded** | The Gate history row now says that the test-engineer subagent wrote `e266d9a` during step 4 and that no assertion changed. This matches R1's reading of the diff |

### Scope and role check of the 7 commits

| Commit | Files | Role / trailers |
|---|---|---|
| `7732832` fix(frontend) | `money-format.ts`, `tsconfig.json` | frontend production code only; `Resolves: US-02-R1-F03`, `Refs: US-02-AC-06` |
| `7348424` test(backend) | `plan-rules.test.ts` | test only; `Resolves: US-02-R1-F02` |
| `1cd234d` fix(flow) | `scripts/scan-secrets.sh`, `scripts/scan-logs.sh` (new), `logs/sessions/README.md`, `session-handoff` skill | orchestrator plumbing after the human's F04 decision; `Resolves: US-02-R1-F04` |
| `09d968e` docs(us-02) | `FLOW.md`, `adr/README.md`, `specs/README.md`, `tasks.md` | docs and state; `Resolves:` F06, F05 (won't fix), F07 |
| `ae62775` test(backend) | `plan-rules.test.ts` | test only; `Refs: US-02-AC-09, US-02-R1-F01` |
| `d5b154f` fix(backend) | `schema.json`, `plan-coverages.ts` (deleted), `index.ts` | backend production code only; `Resolves: US-02-R1-F01` |
| `7398973` docs(us-02) | `tasks.md` | gate record |

Tests and production code are in separate commits. No dependency changes. No change outside
the R1 findings (no scope creep).

## Summary

Open: 0 blocker, 0 major, 0 minor, 2 nit (R2-F01, R2-F02). R1: F01, F02, F03, F04 and F06
fixed; F05 won't fix; F07 recorded.

The reviewer reproduced every check:
- backend tsc, lint and build, and 54/54 tests;
- frontend tsc, lint and build, and 590/590 tests;
- the full e2e suite on a clean stack (78/78);
- `trace.sh` for US-02 and US-01 (exit 0);
- both secret scans, read in full (code: 0 findings and 6 known exceptions; logs: 23 = 23).

Removing `required` turns all five AC-09 coverage tests red. In the admin, a draft with an
empty coverage list can be saved but not published, and the server refuses it too. The new
draft semantics do not conflict with spec v0.1. R2-F01 asks for the spec to state them when the
human confirms at HC3.
