# US-02 — Code review, round 1

| Field | Value |
|---|---|
| Story / spec | US-02 · `specs/US-02/spec.md` (version 0.1, Approved) |
| Branch / commit reviewed | `feat/us-02-plan-list` @ `7e3eaf0` (21 commits on top of `main`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **APPROVED** (no blocker or major findings; 4 minor findings to fix or justify, 3 nits) |

## Automated checks (run by the reviewer)

The reviewer ran every check on the reviewed commit. Full outputs went to files and were read in
full; the summary lines are quoted here.

| Check | Command | Result |
|---|---|---|
| Frontend lint | `frontend: npx eslint .` | exit 0, no output |
| Frontend typecheck | `npx tsc --noEmit -p tsconfig.app.json` / `-p tsconfig.spec.json` | exit 0 / exit 0 |
| Frontend build | `npm run build` | exit 0 (`main` 353.55 kB raw) |
| Frontend unit | `npm test` | **590 passed / 0 failed** (15 files) |
| Backend typecheck / lint / build | `backend: npx tsc --noEmit`, `npx eslint .`, `npm run build` | exit 0 / exit 0 / exit 0 |
| Backend tests | `npm test` | **49 passed / 0 failed** (3 files) |
| Stack | `docker compose -p mci-review up -d --build --wait` (clean volumes) | strapi and web healthy; `down -v` at the end |
| E2E, full suite, run 1 | `scripts/e2e.sh` | **78 passed** (19.1 s), exit 0 |
| E2E, full suite, run 2 | `scripts/e2e.sh` | **78 passed** (18.7 s), exit 0 |
| E2E, US-02 files ×5 | `scripts/e2e.sh e2e/us-01-03-full-flow-co.spec.ts e2e/us-02-plans-cl-content.spec.ts --repeat-each=5` | **190 passed** (54.6 s), exit 0, no flaky |
| Traceability | `scripts/trace.sh US-02` | exit 0. ACs without a test: 0 (AC-18 manual per spec). Open blocker/major: 0 |
| Traceability | `scripts/trace.sh US-01` | exit 0. ACs without a test: 0. Open blocker/major: 0 (US-01-R4-F01 minor and R4-F02 nit still open, as on `main`) |
| Secret scan (code) | `scripts/scan-secrets.sh` | exit 0: "no findings in 262 file(s); explicit exceptions: 6". All 6 `ALLOWED` lines are pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`) |
| Bisectability spot check | `git archive <sha> frontend` into a scratch dir, `tsc --noEmit -p tsconfig.app.json` | `1491d73` and `4f032ce` fail with TS2307 `./plan-store` (see F05) |
| ADR-0007 factor literals | `grep -rnE "\b(120\|110\|90)\b" frontend/src/app --include='*.ts'` (no specs) | only `shared/price-rules.ts:18,20,25,27` |
| Country literals in front-end code | `grep -rnE "'(CO\|CL\|COP\|CLP\|es-CO\|es-CL)'"` (no specs) | none |
| Dependencies | `git diff main...HEAD -- '*/package.json' '*package-lock.json'` | unchanged |

### Security probes (reviewer, clean stack, anonymous unless stated)

| Probe | `:1337` (Strapi) | `:8080` (proxy) |
|---|---|---|
| `GET /api/plans?status=draft` (also `status=DRAFT`, `status[0]=draft`, `publicationState=preview`, `hasPublishedVersion=false`, repeated `status`) | 8 published rows; no `joven`/`flex`; `publishedAt` never null | same |
| `status=draft&filters[key][$eq]=joven` / `filters[publishedAt][$null]=true` | 0 rows | 0 rows |
| Path case `/API/plans`, `/Api/plans`, `/api/Plans`, `/api/plans/` with `status=draft` | published rows only, no draft | `/API`, `/Api`: SPA HTML; `/api/Plans`: nginx 404; `/api/plans/`: published only |
| `/api//plans`, `/api/plans/../plans`, `/api/%70lans` | Strapi 404 | Strapi 404 |
| Non-Bearer `Authorization` (`foo`, `Basic …`, `bearer`, `Bearer`, `Token abc`) + `status=draft` | published only, no draft | nginx 400 for every `Authorization` header |
| `Bearer x` / `BEARER x` | 401 | 400 |
| `POST /api/plans` | 403 | 405 |
| `PUT` / `DELETE` / `GET` `/api/plans/<documentId>` (findOne, also an inactive plan) | 403 / 403 / 403 | 404 |
| `populate=*`, `populate[country][populate]=*` | plan and country attributes only (both already public) | same |
| `populate[createdBy]`, `filters[createdBy][email]`, `populate[localizations]` | 400 "Invalid key" | same |
| Inactive plans without the active filter (US-02-Q-10) | `total-plus`, `premium-plus` readable | same |
| Token with **only** `api::country.country.find` (created and deleted by the reviewer) | `/api/plans` 403 (also `status=draft`, findOne, POST); `/api/form-fields` 403; `/api/countries` 200 | — |
| After the probes | no `security-probe` plan exists; `clasico` unchanged | — |

Observation, no finding: the `country.find`-only token reads country **drafts** with
`status=draft`. That is the ADR-0002 rule as implemented since US-01 (published-only applies to
unauthenticated reads; tokens stay server-side). US-02 does not change it.

### Browser spot checks (reviewer's Playwright script, Chile, clock 2026-11-21)

| Check | 360 × 740 | 1280 × 800 |
|---|---|---|
| `scrollWidth` = `clientWidth` (no horizontal scroll) | 360 = 360 | 1280 = 1280 |
| Element at the radio's centre (z-index fix, 3b0efdd) | `INPUT`, 24 × 24 | `INPUT`, 24 × 24 |
| Mouse click on a coverage line ("Robo total") chooses the card's plan | yes | yes |
| Description of "Plan Protegido" (ids in `aria-describedby`) | "Recomendado \| Daños a terceros … \| $528.000 Precio anual" | same |
| Tab from the heading lands on the checked radio; `:focus-visible` outline | radio, 3px solid `rgb(11, 95, 255)` | same |
| ArrowRight / ArrowLeft move and choose (with wrap); store holds the key | yes, `"plan":{"key":"esencial"}` | same |
| Accessibility tree | `radiogroup "Elige tu plan"` > `radio "Plan …"` + `heading` level 2 + "Recomendado"/"Seleccionado" text + lists under level-3 headings | same |

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-02-AC-01 | `core/plan-api.ts:15-27` (one request, §7.2 params); `shared/plan.ts:58-85` (parse, sort, dedupe); `plan-list-page.html:21-65` | `plan.spec.ts`, `plan-api.spec.ts`, `plan-list-page.spec.ts` › AC-01; e2e `full-flow-co` and `plans-cl-content` › AC-01; `plan-rules.test.ts` (seed) | ✅ |
| US-02-AC-02 | `shared/plan.ts:88-90`; `plan-list-page.html:22,38-40`; `.plan--recommended` | `plan-list-page.spec.ts` › AC-02; e2e both files › AC-02 | ✅ (the visual style is an HC3 check, step 3 decision 6) |
| US-02-AC-03 | `plan-list-page.ts:99-115`; `quote-store.ts` `choosePlan` | `plan-list-page.spec.ts`, `quote-store-plan.spec.ts`; e2e `full-flow-co` › AC-03 | ✅ |
| US-02-AC-04 | `plan-list-page.ts:71-75`; `.html:10-12,74-76` | `plan-list-page.spec.ts` › AC-04 (empty, all malformed, all inactive, Atrás) | ✅ |
| US-02-AC-05 | `plan-list-page.ts:108-113`; `.html:67-69` | `plan-list-page.spec.ts` › AC-05; e2e `full-flow-co` › AC-05, `plans-cl-content` › AC-05 | ✅ |
| US-02-AC-06 | `shared/money-format.ts:9-26`, country `locale`/`currencyCode` | `money-format.spec.ts` (every row); e2e `plans-cl-content` › AC-06 | ✅ (typing: F03) |
| US-02-AC-07 | `shared/price-rules.ts:70-75` (ADR-0007 formula, integer percentages, half-up, `CLOCK` via `plan-list-page.ts:80`) | `price-rules.spec.ts` (every row, pinned clock); e2e both files › AC-07 | ✅ |
| US-02-AC-08 | API filter `isActive=true` + parser drop `plan.ts:25`; router `publishedOnlyConfig()` | `plan.spec.ts`; `plan-list-page.spec.ts` › AC-08; e2e `plans-cl-content` › AC-08; second scenario manual at HC3 (T-22) | ✅ |
| US-02-AC-09 | `shared/plan.ts:23-49,72-81` | `plan.spec.ts` (every row) | ✅ |
| US-02-AC-10 | `shared/plan.ts:82-83,88-90` | `plan.spec.ts`; `plan-list-page.spec.ts` › AC-10 | ✅ |
| US-02-AC-11 | `content-request.ts` (10 s timeout); `plan-store.ts` (no caching of failures); `LoadError` | `plan-list-page.spec.ts` › AC-11 (9.999 s, timeout, retry, invalid locale) | ✅ |
| US-02-AC-12 | content-driven rendering; no plan literals in code | e2e `plans-cl-content` › AC-12 (Node-only scoped token; teardown) | ✅ |
| US-02-AC-13 | `quote-store.ts` (plan in the v1 entry); `plan-list-page.ts:78` (re-derived step 1 output) | `quote-store-plan.spec.ts`; `plan-list-page.spec.ts` › AC-13; e2e `full-flow-co` › AC-13 | ✅ |
| US-02-AC-14 | `quote-store.ts` `prunePlan`; `plan-list-page.ts:71` | `quote-store-plan.spec.ts`; `plan-list-page.spec.ts` › AC-14 | ✅ |
| US-02-AC-15 | `core/summary-step-guard.ts:14-34`; `app.routes.ts:27` | `summary-step-guard.spec.ts`; `plan-list-page.spec.ts` › AC-15; e2e `full-flow-co` › AC-15 | ✅ |
| US-02-AC-16 | heading focus `plan-list-page.ts:56-58`; title `app.routes.ts:24`; native radios | e2e `full-flow-co` › AC-16 (focus, arrows, Tab order, visible focus); reviewer spot check | ✅ |
| US-02-AC-17 | `plan-list-page.html:14-20,32,50-63,68` | `plan-list-page.spec.ts` › AC-17 | ✅ (screen reader pass at HC3) |
| US-02-AC-18 | `plan-list-page.css:14-18` | manual at HC3 (T-22); reviewer spot check: no horizontal scroll at 360 and 1280 | 🖐 manual |
| US-02-AC-19 | `contentGet` (GET, no Authorization, no state); proxy allow-list `default.conf.template:19`; public role `permissions.ts:9-13`; `routes/plan.ts` | e2e `full-flow-co` and `plans-cl-content` › AC-19; `plan-rules.test.ts` (public role); `published-only-routes.test.ts`; reviewer probes above | ✅ |

US-01 hand-over (US-01 spec §11): US-01-AC-04, AC-18, AC-20, AC-21 (first scenario) and the
step 2 heading clause of AC-24 are covered in `full-flow-co` and pass.

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-02-R1-F01 | minor | `backend/src/documents/plan-coverages.ts:4-31`; `backend/src/api/plan/content-types/plan/schema.json:49-54` | Bespoke Document Service middleware for "at least one coverage". Strapi 5.63 already enforces the repeatable `min` outside the admin when the attribute is `required`. The comment says it "never" does, which is inaccurate | ADR-0007 D6 / ADR-0006 D4 (keep bespoke backend code to a minimum, human decision); checklist Strapi | open | |
| US-02-R1-F02 | minor | `backend/tests/plan-rules.test.ts:238-240` | The publish-of-an-existing-draft and update-with-`status: 'published'` paths of the coverage rule are not tested. Only `create` is. Mutating `context.action === 'publish'` out of `plan-coverages.ts:18` keeps every test green | Checklist Tests ("would the test catch it?"); US-02-BR-01 | open | |
| US-02-R1-F03 | minor | `frontend/src/app/shared/money-format.ts:15-21` | `as unknown as Intl.NumberFormatOptions` turns off type checking for the whole options object. Adding `ES2023.Intl` to `lib` makes `useGrouping: 'always'` type-check (verified with the installed TypeScript 6.0.3) | Checklist Angular (no `any`, weak typing) | open | |
| US-02-R1-F04 | minor | `scripts/scan-secrets.sh:42` (and the log command at `:39`) | The gate excludes **every** file under `logs/sessions/`, but the separate log scan covers only `*.jsonl`. `logs/sessions/README.md`, or any non-jsonl file put there, is scanned by neither path. The log scan is also a manual step that nothing enforces | CLAUDE.md §3, §12 (`scan-secrets.sh` exits 0); checklist Security | open | |
| US-02-R1-F05 | nit | commits `1491d73`, `4f032ce`, `6786a72` | Commit order is not bisectable: the summary guard imports `./plan-store` two commits before it exists, so `tsc -p tsconfig.app.json` fails at `1491d73` and `4f032ce`. `plan-coverages.ts` is added in `6786a72` (whose message describes its effect) but only registered in `84cfc51` | CLAUDE.md §10 (one task per commit) | open (suggest won't fix: history cannot be rewritten without a force push) | |
| US-02-R1-F06 | nit | `adr/README.md:35,37`; `specs/README.md:18`; `specs/US-02/tasks.md:13,27-34`; `FLOW.md:198` | Stale status text: ADR-0007 is called "Proposed" / "the orchestrator records acceptance"; specs README says "next: ADR-0007"; tasks.md Blockers still mentions acceptance, and T-03..T-10 still say "written, red". In FLOW.md a blank line at 198 cuts the new row off from its table | Checklist Spec conformance and traceability (state is accurate) | open | |
| US-02-R1-F07 | nit | commit `e266d9a` (`backend/tests/plan-rules.test.ts`) | A test file changed during step 4 with no recorded author agent or decision. The Gate row only says "after e266d9a test isolation". The change itself is sound: per-test cleanup, no assertion weakened | Reviewer role-scope check (CLAUDE.md §8 write scopes) | open | |

### US-02-R1-F01 — Coverage middleware duplicates what the schema can enforce

Evidence: `@strapi/core@5.63.0` `dist/services/entity-validator/index.js`:
- `addMinMax` (around lines 36-45) applies `.min(attr.min)` when
  `attr.required || (Array.isArray(value) && value.length > 0)`.
- For repeatable components, lines 98-109 call it whenever `!options.isDraft`.
- `document-service/entries.js:107-111,141-145` validate create and update with
  `isDraft: !data.publishedAt`, and `publishEntry` (`:159-197`) goes through `createEntry` with
  `publishedAt` set.

So with `"required": true` next to `"min": 1` on `coverages`, Strapi itself rejects `[]` on every
published write (create, update and publish), and drafts stay free. Today the attribute is not
`required`, so an empty array skips `min`. That is why the middleware works, but it is custom
code standing in for a one-word schema change. The comment at `plan-coverages.ts:7-9` ("never in
the Document Service") would also mislead the next maintainer.

Expected: either use the schema (and drop the middleware), or keep the middleware and correct
its comment with the reason the schema option was rejected (for example, an admin UX
difference). Both are acceptable. The human's rule is to keep bespoke backend code to a minimum.

### US-02-R1-F02 — Only the `create` branch of the coverage rule is tested

The test-engineer's note ("asserts that it rejects, not why") is **not** the real gap. The
control test "a plan with a country can be published" proves that the helper's data is otherwise
valid, and Strapi does not reject `[]` for a non-required repeatable (F01 evidence). So removing
the middleware turns the test red, even without a message assertion. The real gap is the other
branches of `plan-coverages.ts:18-25`:
- `publish` of an existing draft that has no coverages. This is the editor's normal path: save a
  draft, then publish.
- `update` with `status: 'published'` and no `coverages` in `data`, which goes through the draft
  lookup.

No test covers either. A mutation that drops `context.action === 'publish' ||` or the draft
lookup goes unnoticed. If F01 is fixed through the schema, a single "publish an existing draft
with no coverage is refused" test still pins the behaviour. Asserting the Spanish message
(`'Un plan publicado necesita al menos una cobertura.'`) would also make each test fail for the
right reason.

### US-02-R1-F03 — The money formatter's options are untyped

`money-format.ts:15-21` casts the whole object through `unknown`, so a typo such as
`maximumFractionDigit: 0` or `style: 'curency'` would compile. The comment's reasoning is right:
the ES2022 typings lack `'always'`. But the fix is available. With
`tsc --target ES2022 --lib ES2022,ES2023.Intl`, `useGrouping: 'always'` type-checks with no
cast (reviewer's scratch check with the project's TypeScript 6.0.3). A narrower cast on the one
property would also keep the rest of the object checked. AC-06 is met; this is maintainability
only.

### US-02-R1-F04 — The secret-scan exclusion is wider than the log scan that replaces it

Assessment of orchestrator point 7: separating the code gate from the log scan is sound. The
log findings are classified once and recorded (23 of them), and mixing them into the gate would
hide a new code secret among accepted ones. Two gaps remain:
1. The exclusion and its replacement do not match. `case "$f" in logs/sessions/*) continue`
   drops `logs/sessions/README.md` and any non-jsonl file under `logs/sessions/`, while the
   documented log command is `git ls-files 'logs/sessions/*.jsonl'`. A secret pasted into the
   README (the file where findings are discussed) or into a `.txt`/`.md` export is checked by
   neither path. Narrowing the exclusion to `logs/sessions/*.jsonl` closes this.
2. The log scan is procedural only (`session-handoff`), and the "count must match" rule is
   checked by nobody. A mechanical check (for example, a recorded expected count that the script
   compares, or a `trace.sh`/gate step that runs the log scan against a baseline) would make it
   a control rather than a promise. This half can be justified as `won't fix` for this project
   size, if the human prefers.

### US-02-R1-F05 — Non-bisectable commits (orchestrator point 6)

Reproduced with `git archive 1491d73 frontend` and then `tsc --noEmit -p tsconfig.app.json`:
`summary-step-guard.ts(4,27): error TS2307: Cannot find module './plan-store'`. The same holds at
`4f032ce`; `93ce8da` fixes it. Calibrated as a **nit**:
- The test-first flow already leaves `npm test` red from `56fa702` to the implementation by
  design, so bisecting this branch needs `git bisect skip` anyway.
- No rule requires every commit to build.
- It cannot be fixed without rewriting history, which §10 forbids on a pushed branch.

Suggested resolution: `won't fix`, with a lesson for the implementers (commit a module before
its first importer, and register a middleware in the commit that adds it).

### US-02-R1-F06 — Stale status text

`adr/README.md:37` says "ADR-0007, Proposed"; `:35` says "the orchestrator records acceptance"
(done: `adr/0007` has `status: Accepted`). `specs/README.md:18` says "next: ADR-0007".
`specs/US-02/tasks.md:13` (Blockers) still describes the pending acceptance, and the T-03..T-10
rows still say "written, red" although the tests are green. `FLOW.md:198` is an empty line
inside the "Where AI failed" table, so the new row at 199 renders as a loose paragraph of pipes.

### US-02-R1-F07 — Unattributed test change in step 4

`e266d9a test(backend): remove probe plans after each test…` changed `plan-rules.test.ts` after
step 3. The diff moves cleanup from `afterAll` to `afterEach`. No assertion changed, and it fixes
a real interference: published probe plans broke the seed's "exactly these plans" checks. It is
committed separately, as §10 asks. Neither the commit nor `tasks.md` says which agent wrote it,
so the reviewer cannot confirm that it stayed within the test-engineer's write scope. Record the
author and reason in the Gate history.

## Orchestrator's points, evaluated

1. **`PlanStore` cache.** Correct.
   - It is keyed by country code, so a country switch loads that country's plans.
     `QuoteStore.enterCountry` clears the chosen plan.
   - Failures are never cached: `inFlight` is deleted in `finally`, and only a non-empty result
     is stored. "Reintentar" therefore asks again (component test AC-11 "after a timeout … asks
     again").
   - An empty answer is not cached either, so neither the empty state nor the guard reuses it.
   - Staleness is limited to the current page load: a plan published while the tab stays open
     shows only after a full reload. That is exactly BR-06/AC-12 ("next full page load") and
     mirrors `FormFieldStore` (US-01-Q-16). The AC-12 e2e reloads and passes ×10. The guard and
     the page share the same list, so `/resumen` accepts precisely the plans the person saw (the
     "offered plan of this page load" wording of Q-03).

   No finding.
2. **Plan card accessibility.**
   - Native radios share `name="plan"` inside `role="radiogroup"` named by the h1. Arrow keys
     move and choose; Tab enters at the checked radio or the first one; the Tab order is group,
     "Atrás", "Continuar" (e2e AC-16 and reviewer check).
   - Each option's name is the plan name (from the label). Its description is "Recomendado",
     then the short description, then the price.
   - The global `:focus-visible` gives the radio a 3px outline, and the z-index keeps the radio
     on top of the stretched label (hit test returns `INPUT`).
   - "Recomendado" and "Seleccionado" are text, not colour only.

   For the HC3 screen-reader pass (decision 6), check that the empty state's `role="status"`
   paragraph is announced. It is inserted already filled, which some screen readers skip; the same
   pattern is used on step 1. Also check that "Elige un plan para continuar." is heard once, given
   the group's `aria-describedby` points at it. No finding.
3. **Price display.** The formatter reads `locale`/`currencyCode` from the country entry, with
   no country literal (grep). ADR-0007 is followed exactly:
   - integer percentages and `floor((n + 5000) / 10000)` with `max(1, …)`;
   - `today` from `CLOCK` (`plan-list-page.ts:80`);
   - warnings name the key only;
   - factor literals only in `price-rules.ts`.

   The `unknown` cast is F03.
4. **Backend.**
   - Plan key uniqueness: `KEYED_TYPES` extends the existing middleware cleanly (tests for same
     country, other country, rename, self-update, and no clash with form-field keys).
   - `publishedOnlyConfig()` is on the plan router, which the probes confirm.
   - The public role holds exactly `country.find`, `form-field.find` and `plan.find` (backend
     test; probes: findOne, POST, PUT and DELETE are 403; the `country.find`-only token gets 403
     on plans).
   - Coverage middleware: F01 (the schema can do it) and F02 (the "why" assertion is not the
     gap; the untested `publish`/`update` branches are).
5. **US-02-Q-10.** Only what was accepted is exposed: published inactive plans
   (`total-plus`, `premium-plus`) with their attributes and their (already public) country. Not
   exposed: drafts, under any parameter, case, path or header variant tried; admin users
   (`createdBy` is rejected); findOne; writes. No finding.
6. **Commit order.** Nit, F05.
7. **`scan-secrets.sh` default.** Sound in principle, but the exclusion is wider than its
   replacement (F04, minor).

Other checks with no finding:
- The one new `scan-secrets: allow` marker (`Authorization: 'foo'` in `plans-cl-content`) is on
  a line that matches no rule. It is inert, and the value is visibly fictitious.
- The seed matches `seed-plans.md` (backend test), is idempotent (natural key country + key,
  draft lookup) and is Spanish and fictitious.
- The proxy allow-list adds only `plans`.
- No dependency changes.
- Scope: everything in the diff is in the spec, an ADR note or the orchestrator plumbing the
  human asked for. The replaced US-01 test is step 3 decision 1. Exporting `parseIsoDate` and
  `ageOn` from `field-validators.ts` is reuse, not a behaviour change.

## Summary

Open: 0 blocker, 0 major, 4 minor (F01–F04), 3 nit (F05–F07).

Every automated AC has a passing test. The reviewer reproduced every check: lint, typecheck,
build, 590 unit tests, 49 backend tests, the full e2e suite twice (78/78) and the two US-02 e2e
files five times (190/190) on a clean stack, `trace.sh` for US-02 and US-01, and the code secret
scan. The security probes on both entry points found no draft, write or findOne exposure beyond
the inactive-plan read accepted in US-02-Q-10. The minors are maintainability, test-strength and
gate-hygiene issues; fix them or justify them before HC3.
