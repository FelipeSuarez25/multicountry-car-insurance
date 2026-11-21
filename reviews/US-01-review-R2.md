# US-01 — Code review, round 2

| Field | Value |
|---|---|
| Story / spec | US-01 · `specs/US-01/spec.md` (version 0.4, Approved) |
| Branch / commit reviewed | `feat/us-01-data-form` @ `772d636` (diff `476849c..HEAD`, 20 commits, plus a re-check of the touched areas against `main...HEAD`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **APPROVED** (no open blocker/major; 4 minor and 2 nit open, see Summary. US-01-R2-F01 needs a recorded human decision before HC3) |

Sources read: `reviews/US-01-review-R1.md`, spec v0.4 (§5 AC-09, AC-14, AC-21, AC-28; §7.5; §8.1;
§10), ADR-0001..0006 (all Accepted), `CLAUDE.md`, `specs/US-01/tasks.md` (Gate history up to
"5 Gate (after R1 fixes)"), FLOW.md diff, and the `review-checklist`, `strapi-content-modeling`
and `dynamic-form-fields` skills. Human decisions after round 1 (F04 typed attributes, F05
`localeTag` exposed, F06 copy approved, fix F03/F07/F08/F10/F11 now) are taken as given.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` (`eslint .`) | Exit 0, no output. Spec files are linted too |
| Lint (backend) | `npm run lint` (`eslint .`) | Exit 0, no output (`tests/` and `src/admin/` are ignored) |
| Build / typecheck (frontend) | `CI=1 NG_CLI_ANALYTICS=false npx ng build`; `npx tsc --noEmit -p tsconfig.spec.json`; `npx tsc --noEmit -p tsconfig.app.json` | Build OK (main 340.24 kB raw / 90.24 kB transfer), no warnings. Both `tsc` runs exit 0 |
| Build / typecheck (backend) | `npx tsc --noEmit -p tsconfig.json`; `npm run build` | Exit 0; admin panel built |
| Unit tests (frontend) | `npm test` | 8 files, **304 passed / 0 failed** |
| Unit tests (backend) | `npm test` | 1 file, **9 passed / 0 failed** |
| E2E | `docker compose -p mci-review up -d --build --wait` (ports 1337 and 8080 were free; no prior `mci-review` resources), then the given `npx playwright test` | **38 passed / 0 failed** (8.3 s). Then `us-01-data-form-co.spec.ts --repeat-each=5`: **65/65** (AC-09 race not reproduced). Stack removed with `down -v` |
| Traceability | `bash scripts/trace.sh US-01` | ACs without tests: 0 (AC-26 manual per spec). Before this report: exit 1 only because R1 statuses were still `open`; re-run after writing it, see Summary |
| Secrets | `bash scripts/scan-secrets.sh` | No findings in 217 files; 6 explicit exceptions (one new, reviewed below). Exit 0 |
| Pinning | inspection of both `package.json` files; lockfile diff | New devDependencies exact (`eslint` 10.15.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.73.0, `angular-eslint` 22.3.0); lockfiles updated in the same commits (`7476019`, `f33d527`) |
| Security probes (throwaway, scratchpad) | `curl` and a Node script on :1337 and :8080; scoped-token probe; LAN probe | All closed. Details under "Security probes" |
| Browser probes (throwaway Playwright script) | CO "Modelo (año)" typed key by key: `1e`, `1e5`, `2015e`, `2015.5`, `-5`, `1e-`; 30 rapid `1e` typings; reload | Results in US-01-R2-F01 |
| Schema upgrade probe | Round-1 backend image (`git archive 476849c backend`) seeded a DB file, then the current image started on that file | Results in US-01-R2-F04 and US-01-R2-F05 |

### Scan-secrets exceptions

| Location | Value | Verdict |
|---|---|---|
| `backend/tests/helpers/strapi.ts:40-43` | `test-admin-jwt-secret`, `test-api-token-salt`, `test-transfer-token-salt`, `test-encryption-key` | Unchanged since R1. Justified |
| `frontend/e2e/us-01-security.spec.ts:146` | `Bearer not-a-real-token-for-a-negative-test` | Unchanged since R1. Justified |
| `frontend/e2e/us-01-security.spec.ts:272` (**new**) | `Bearer not-a-real-token-for-a-negative-test` | Justified: the same fictitious literal, used for the AC-28 "invalid Bearer → 401" row on Strapi's port (spec v0.4 AC-28) |

The markers on lines 154-157 (`foo`, `Basic Zm9vOmJhcg==` = "foo:bar", `Bearer`, `x`) do not
match any scanner rule, so they are not counted. The values are visibly fictitious.

### Security probes (fresh `mci-review` stack, seeded draft `email` in CO and CL)

| Probe | :1337 (Strapi) | :8080 (proxy) |
|---|---|---|
| `GET {/api,/API,/Api,/aPi}/form-fields?status=draft&filters[key][$eq]=email`, with no header, `foo`, `Basic …`, `Bearer`, `Bearer ` (trailing space), `x` | 200, 0 rows, every variant | `/api` + header → 400; `/api` no header → 200, 0 rows; other casings → SPA `index.html` |
| Same, `Bearer garbage` / `bearer garbage` | 401 | 400 |
| `publicationFilter=never-published`, `hasPublishedVersion=false`, `publicationState=preview`, `status=DRAFT`, `status[0]=draft`, duplicated `status`; with and without `Authorization: foo` | 200, 0 rows each | no header → 200, 0 rows; header → 400 |
| `filters[publishedAt][$null]=true` (with and without `status=draft`) | 200, 0 rows | — |
| `populate[country][status]=draft` | 400 "status is only accepted at the root of the query" | — |
| `GET /api/countries?status=draft` with `foo`, or at `/API/countries` | 200, 2 rows, 0 with `publishedAt: null` | 400 / SPA |
| `GET /api/form-fields/xyz?status=draft` (findOne) | 403 (not public) | 404 |
| **Cross-router scope (345a016):** custom token with only `api::country.country.find` | countries 200 (and with `status=draft` it sees 2 draft rows, as ADR-0005 accepts for a valid token); **form-fields find 403**, form-fields with `status=draft` 403, form-fields findOne 403, POST form-fields 403, POST countries 403. Token deleted afterwards | — |
| Port exposure (F07) | `127.0.0.1` and `[::1]` answer `/_health` 204; the host's LAN address: connection refused | LAN 200 (the proxy, as intended) |

## AC verification

Unchanged from R1 unless stated. Every AC still has its test, and every test passes on a clean stack.

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-01-AC-01 | as R1; seed rules now in `pattern` (`backend/src/seed/form-fields.ts:39,44,52,57`) | as R1 | ✅ |
| US-01-AC-02 | as R1 | as R1 | ✅ |
| US-01-AC-03 | as R1; route config per router (`backend/src/utils/published-only-config.ts:17-22`) removed the 403 regression | `e2e/us-01-config-change.spec.ts` (green, 38/38) | ✅ |
| US-01-AC-04 | as R1 | as R1 | ✅ |
| US-01-AC-05 | as R1 | as R1 | ✅ |
| US-01-AC-06 | as R1 | as R1 | ✅ |
| US-01-AC-07 | as R1 | as R1 | ✅ |
| US-01-AC-08 | as R1 | as R1 | ✅ |
| US-01-AC-09 | `quote-form.ts:105-123`, `quote-form.html:38` (`beforeinput` flush; parse error → `requiredMessage ?? errorMessage`) | `field-validators.spec.ts`, `e2e/us-01-data-form-co.spec.ts:68,84` | ✅ for the Gherkin scenarios; the v0.3 note is not followed, see US-01-R2-F01 |
| US-01-AC-10 | as R1 | as R1 | ✅ |
| US-01-AC-11 | as R1 (seed `pattern` attribute) | as R1 | ✅ |
| US-01-AC-12 | as R1 | as R1 | ✅ |
| US-01-AC-13 | as R1; published-only now a route middleware | `e2e/us-01-data-form-co.spec.ts:27` | ✅ |
| US-01-AC-14 | `frontend/src/app/shared/field-config.ts:25-75` (wire §7.5.1: `jsonNum`, `pattern` attribute, unused attributes ignored, blank message = no override) | `field-config.spec.ts` (new rows: `pattern` null with regex in `value`; `value` "3") | ✅ Wire shape confirmed with curl (CL rules: `value` numbers, `pattern` strings, unused `null`) |
| US-01-AC-15 | as R1 | as R1 | ✅ |
| US-01-AC-16 | as R1 | as R1 | ✅ |
| US-01-AC-17 | `frontend/src/app/shared/country.ts:10-41` (`localeTag` → `locale`), `core/country-content-api.ts:19`; stock controller `backend/src/api/country/controllers/country.ts` | `country.spec.ts` (new), `supported-country-guard.spec.ts`, e2e country context | ✅ `fields`, `sort` and `filters` on `localeTag` return 200 (`filters[localeTag][$eq]=es-CO` → CO only); `fields[0]=locale` → 400 as expected |
| US-01-AC-18 | as R1 | as R1 | ✅ |
| US-01-AC-19 | as R1 | as R1 | ✅ |
| US-01-AC-20 | as R1 | as R1 | ✅ |
| US-01-AC-21 | as R1 | as R1 | ✅ for the Gherkin (`Ana`, `2015.5`); an unparseable entry is no longer restored "as typed" (US-01-R2-F01) |
| US-01-AC-22 | as R1 | as R1 | ✅ |
| US-01-AC-23 | as R1 | as R1 | ✅ |
| US-01-AC-24 | as R1 | as R1 | ✅ |
| US-01-AC-25 | as R1 (`aria-required`; dead imports removed) | as R1 | ✅ |
| US-01-AC-26 | as R1 | Manual at HC3 (T-31) | 🖐 manual, pending HC3 |
| US-01-AC-27 | as R1 | `e2e/us-01-security.spec.ts:16` | ✅ |
| US-01-AC-28 | `backend/src/middlewares/published-only.ts:28-43` (keeps publication parameters only for `ctx.state.auth.strategy.name === 'content-api-token'`), route config on both routers | `e2e/us-01-security.spec.ts:86-279` (every v0.4 row: 7 variants × 2 entry points for form-fields, 5 country rows, the other publication parameters, invalid Bearer 401, valid scoped token 200) | ✅ Probes above found no bypass |

## Findings

Round 1 findings carry their round 2 status. New findings are `US-01-R2-FNN`.

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-01-R1-F01 | blocker | `backend/src/middlewares/published-only.ts` | Anonymous draft reads on Strapi's port (non-Bearer `Authorization`, upper-case path) | US-01-BR-06, US-01-AC-28, ADR-0002 | fixed | c3bdb56, 345a016 |
| US-01-R1-F02 | major | `frontend/e2e/us-01-security.spec.ts` | AC-28 tests missed the anonymous variants | US-01-AC-28, ADR-0002 | fixed | 8d0a658 |
| US-01-R1-F03 | minor | `frontend/src/app/features/quote-form/quote-form.ts` | Unparseable number input was wiped from the screen | ADR-0004, checklist | fixed (see US-01-R2-F01 for the spec deviation the fix introduces) | a76ea4c |
| US-01-R1-F04 | minor | `backend/src/components/form/validation-rule.json` | Rule `value` was free JSON | Spec §7.1, `strapi-content-modeling` | fixed | 8520a66, f10afe1, f39ff8d, dd364a6 |
| US-01-R1-F05 | minor | `backend/src/api/country/controllers/country.ts` | `localeTag` deviation not recorded; partial renaming | ADR-0001, CLAUDE.md §1 | fixed | 8520a66, f10afe1, d84cf82, 6ccd4aa |
| US-01-R1-F06 | minor | `country-chooser-page.html:2`, `index.html:5` | Unlisted chrome copy | US-01-BR-07, Q-14, Q-28 | fixed (both strings approved, spec v0.4 §8.1) | 8520a66 |
| US-01-R1-F07 | minor | `docker-compose.yml` | Known admin password on a port published on all interfaces | ADR-0002, checklist Security | fixed | 9f4f08d, 4a82769 |
| US-01-R1-F08 | minor | `frontend/package.json`, `backend/package.json` | No linter | CLAUDE.md §12 | fixed | 7476019, f33d527 |
| US-01-R1-F09 | minor | `specs/US-01/tasks.md` | Broken Gate history table, stale task state | CLAUDE.md §9, §11 | fixed | e6a1611 |
| US-01-R1-F10 | nit | `frontend/src/app/features/quote-form/quote-form.ts:12` | Unused `REQUIRED` / `metadata` imports | Maintainability | fixed | dce1165 |
| US-01-R1-F11 | nit | `frontend/Dockerfile`, `backend/Dockerfile` | Floating base image tags | Spirit of CLAUDE.md §4 | fixed | 1d65723, 595e11c |
| US-01-R2-F01 | minor | `frontend/src/app/features/quote-form/quote-form.ts:105-123`, `quote-form.html:38` | The F03 fix departs from the approved AC-09 note: unparseable input no longer reaches the model as `''`. The model and the store keep the last parseable text (`2015e` → stored `"2015"`), an **optional** number field with unparseable text is now invalid and blocks "Continuar" (the spec says it is empty, valid, output `null`), and a reload restores `2015` instead of what was typed | Spec v0.4 AC-09 note, AC-21 preamble ("restores exactly what was typed"), ADR-0004 (*unparseable reaches the model as empty*), CLAUDE.md §1 (record decisions) | open | |
| US-01-R2-F02 | nit | `frontend/e2e/us-01-data-form-co.spec.ts:68-81` | The AC-09 e2e asserts `toHaveValue('')`, which a sanitised number input returns whether or not the typed text is still visible, so a regression of F03 (text wiped) passes. No test pins the stored raw value for an unparseable entry | Checklist "Tests fail when the behaviour breaks" | open | |
| US-01-R2-F03 | minor | `backend/src/utils/published-only-config.ts:1-22`, `backend/src/api/*/routes/*.ts` | The published-only rule and per-router scopes now depend on every content-API router calling `publishedOnlyConfig()`. Only a code comment guards this. No test fails if a new router (US-02 `plan`, US-03 `terms`) omits it, and no test covers the cross-router scope leak fixed in 345a016 | ADR-0002 (*Published only for anonymous reads*), US-01-BR-06, checklist "Tests fail when the behaviour breaks" | open | |
| US-01-R2-F04 | minor | `backend/config/database.ts:15`, `:61-66`; `docker-compose.yml:27-28` | The SQLite file is not in the `strapi-data` volume. `path.join(__dirname, '..', '..', '/data/data.db')` resolves to `/app/data/data.db` inside the container layer, so every container recreation (`docker compose down`, `up --build`) silently discards the database, including any content an editor changed in the admin | Compose intent (named volume at `/data`), `strapi-content-modeling` ("business users change content without deploys"), DoD (`docker compose up`) | open | |
| US-01-R2-F05 | minor | `adr/0006-strapi-physical-model-adjustments.md` *Consequences*; `README.md` "Running the project" | A database created before `f39ff8d` must be reset: after the upgrade every `pattern` rule has `pattern: null` and `value: null`, so `documentNumber` and `plate` are dropped from step 1 in both countries. The reset is stated only in the `f39ff8d` commit body and in ADR-0006, which says "reset the Strapi volume" (the volume does not hold the DB, F04). The README has no run instructions | ADR-0006 *Consequences* ("state this in the commit"), CLAUDE.md §12 (stack starts with seed data), checklist (maintainability) | open | |
| US-01-R2-F06 | nit | `specs/US-01/spec.md:10`, `:1076-1082`; `specs/US-01/tasks.md` T-33; `adr/0002-strapi-access-and-security.md:97` | Stale text after the R1 fixes: the spec still calls ADR-0006 "being written" and "not yet accepted". T-33 and ADR-0002 still describe a **global** middleware, but it is now a route middleware (ADR-0002 is Accepted, so a note belongs in a later ADR or in `tasks.md`) | CLAUDE.md §1, §9 (traceability) | open | |

### US-01-R2-F01 — The F03 fix changes the AC-09 semantics without a recorded decision

**What changed.** `a76ea4c` removed `onNumberInput` (the code that wrote `''` to the model on
`badInput`). Now the model keeps the last parseable text. Signal Forms adds a `parse` error,
and `errorOf` maps it to `validateField(config, '', …) ?? config.errorMessage`.

Browser probe (Chromium, CO "Modelo (año)", typed key by key, then Tab):

| Typed | `validity.badInput` (text visible) | `inputValue()` | Stored raw value | Error shown |
|---|---|---|---|---|
| `1e` | true | `''` | `"1"` | "El modelo debe estar entre…" |
| `2015e` | true | `''` | `"2015"` | same |
| `1e5` | false | `1e5` | (parsed) | same (out of range); R1 gave `5` |
| `2015.5` | false | `2015.5` | `"2015.5"` | same |
| `2015` | false | `2015` | `"2015"` | none |

With `2015e` on screen, "Continuar" stays on step 1 and focus goes to the first invalid field.
After a **reload**, the field shows `2015`, which is valid and has no error. The visible
behaviour for the seeded (required) fields matches the AC-09 Gherkin: the message is right and
the step is blocked. Thirty rapid `1e` typings never lost the text (the gate-attempt-2 race is
gone).

**Where it departs from the approved text:**

1. AC-09 note (v0.3, HC2 decision): unparseable input "reaches the form model as empty
   (`''`)", and an **optional** field "is treated as empty, so it is valid and its output is
   `null`". Now an optional number field with `1e` is invalid. `validateField(config, '')`
   returns `null` for an optional field, so `errorOf` falls back to `errorMessage` and
   "Continuar" is blocked. No seed field is an optional number, so no AC example breaks, but
   the content model allows one (US-01-BR-06), and no test covers it.
2. AC-21 preamble: "a reload restores exactly what was typed, valid or not". `2015e` comes back
   as a valid `2015`. Before `a76ea4c` it came back empty, which matched the AC-09 note.
3. The ADR-0004 decision text ("unparseable numbers reach the model as empty") no longer
   describes the code.

**Assessment (open point 1).** This is a spec deviation, not an implementation detail inside
the spec. The developer declared it, which is correct, but it needs a human decision recorded
in the spec (a v0.5 AC-09 / AC-21 note) or in `tasks.md`. Two consistent outcomes:
(a) accept it: "unparseable text stays visible, the field is invalid whether required or not,
with `requiredMessage ?? errorMessage`, and the stored value is the last parseable text", which
I find defensible UX because it never silently submits `null` for something the person typed;
or (b) restore the note's semantics for the model and store (write `''`) while keeping the text
visible. **Minor**: no seeded behaviour or AC example breaks, and the impact is limited to
unseeded optional number fields and a reload edge case. It may not be closed as "won't fix"
by an agent alone, because CLAUDE.md §1 requires the decision to be recorded.

**On the `ApplicationRef.tick()`-on-`beforeinput` approach.** It is sound for this app:

- Cost: one synchronous application-wide change detection per keystroke, on `type=number`
  inputs only. The view tree is one form, so the cost is negligible. Do not copy the pattern
  to large trees or high-frequency events.
- Side effects: `tick()` also runs pending effects early, here the persistence effect that
  writes `sessionStorage`, which is harmless. `beforeinput` is dispatched by the user agent
  outside change detection, so the "tick called recursively" error cannot occur. In dev mode
  `tick()` also runs `checkNoChanges`.
- Fragility: it depends on the 22.3.0 timing of the deferred Signal Forms model-to-DOM write,
  which is not a documented contract. An Angular upgrade can change it. The AC-09 e2e
  (`toHaveValue('')`) is what would catch that race again (it is how gate attempt 2 caught it),
  so it should stay. Spin-button and arrow-key steps do not fire `beforeinput`, but they always
  produce parseable values, so they cannot trigger the race.

### US-01-R2-F02 — The AC-09 e2e cannot see whether the typed text survives

`toHaveValue('')` holds both when `1e` is visible (sanitised read) and when the field was
wiped (the R1 behaviour). An assertion on `validity.badInput === true` (or `:invalid` with a
non-empty native state) would pin F03. Once R2-F01 is decided, a component or e2e check of the
stored raw value for an unparseable entry would pin that too. **Nit**: test-engineer task.

### US-01-R2-F03 — The route-config dependency has no automated guard (open point 3)

Since `c3bdb56`/`345a016`, the published-only rule runs only where a router passes
`publishedOnlyConfig()`, and each router must get **fresh** config objects, or Strapi's in-place
`auth.scope` mutation leaks scopes across routers (FLOW.md row "A regression hid a second
security bug"). Today both routers do this, and my probes confirm both properties (anonymous
drafts closed, `country.find`-only token → `form-fields` 403). Guards in place:

- a comment in `published-only-config.ts` ("A new content type's router MUST use this config");
- AC-28 e2e, which covers `form-fields` and `countries` only.

Not in place: nothing fails if US-02 adds `api::plan.plan` with a plain `createCoreRouter`.
Its drafts would then be readable anonymously with `?status=draft`, and the US-02 author would
have to remember to extend AC-28. Nothing would fail either if someone turned the function back
into a shared constant. The `strapi-content-modeling` skill and the `review-checklist` do not
mention the requirement.

Suggested direction (optional): a backend Vitest test that boots Strapi (the helper exists) and,
for every content-API route whose handler is `api::*.find` or `api::*.findOne`, asserts that
`config.middlewares` contains `global::published-only` and that `config.auth.scope` names only
its own handler. Also add a one-line checklist item. **Minor**: no current defect, but the next
story is exactly the case.

### US-01-R2-F04 — The SQLite database lives outside the volume

`backend/Dockerfile` sets `DATABASE_FILENAME=/data/data.db` and declares `VOLUME /data`, and
compose mounts `strapi-data:/data`. But `backend/config/database.ts:61-66` builds the path with
`path.join(__dirname, '..', '..', sqliteFilename)`. `path.join` does not treat an absolute
segment as a root, so the file is `/app/data/data.db`. Evidence on the review stack:
`ls /data` → only `dev-secrets.sh`; `ls /app/data` → `data.db` (1.1 MB). A second container on
the same named volume started from scratch (internal migrations ran, and the seed created 21
fields again with new `documentId`s).

Effects: the dev secrets persist but the content does not. An editor's change (for example one
made during the HC3 manual pass to check AC-03 by hand) is lost on `docker compose down` or on
any `up --build` that recreates the container, with no warning. Pre-existing since `5cc304d`
(scaffolding); I missed it in round 1. **Minor**: development and demo stack only, and the seed
recreates the baseline. But the compose file's intent (a named volume) is not met.
Strapi-developer task: for example, use `path.resolve` or accept absolute filenames.

### US-01-R2-F05 — A DB reset is required after `f39ff8d`, but a developer will not see it (open point 4)

**Is a reset needed? Yes, for any database file that survives the upgrade.** Probe: the round-1
backend (`476849c`) seeded a DB file, then the current image started on the same file. Strapi
migrated the column, and every pattern rule then read
`{"kind":"pattern","value":null,"pattern":null}`. By spec §7.5.1 rule 4 that rule is malformed,
so `documentNumber` and `plate` are dropped (with a console warning) in **both** countries. The
idempotent seed does not repair them (0 "Seed: created" lines). Numeric rules survived
(`minLength` 3, `maxLength` 80).

Who is affected: a local `npm run develop` (`.tmp/data.db`), or any setup that keeps the DB
file. With the current compose file the container rebuild discards the DB anyway (R2-F04), which
hides the problem, so it reappears once R2-F04 is fixed.

Where it is documented: the `f39ff8d` commit body and ADR-0006 *Consequences* ("reset the
Strapi volume"), which points at the wrong thing given R2-F04. There is nothing in the README:
its "Running the project" section is still "To be completed". Nor is there anything in
`tasks.md` *Next action*. **Minor**: add a short "after pulling schema changes" note where the
run instructions live (README), with the exact command, and correct the target once R2-F04 is
fixed.

### US-01-R2-F06 — Stale references after the round 1 fixes

- `spec.md:10` ("ADR-0006 … being written after code review round 1") and `:1076-1082`
  ("In progress (v0.4, not yet accepted) … Until it is accepted, ADR-0001 still names the
  attribute `locale`"), although ADR-0006 was accepted at the same HC as v0.4.
- `tasks.md` T-33 and ADR-0002 line 97 say "global middleware". It is now a route middleware
  applied through `publishedOnlyConfig()`. The outcome (published-only for anything Strapi does
  not authenticate with an API token) is the same, and arguably stricter. ADR-0002 is Accepted
  and is not rewritten, so the mechanism change belongs in `tasks.md` (T-33 text and commit
  list: `c3bdb56`, `345a016`) or as a note in a later ADR.

**Nit.**

## Verification of previous round (from round 2 onward)

| Finding | Fix commit | Verified? | Notes |
|---|---|---|---|
| US-01-R1-F01 | c3bdb56, 345a016 | fixed | Route middleware after authentication; keeps parameters only for `content-api-token` (fail-closed). Every R1 bypass, plus `/aPi`, `Bearer ` and `status` variants, now returns 0 drafts on :1337 (table above). A valid token still sees drafts, which confirms the strategy name and the ordering |
| US-01-R1-F02 | 8d0a658 | fixed | Written before the fix (test-first). Covers non-Bearer values, empty `Bearer`, `/API` and `/Api`, the other publication parameters, countries, the proxy, and a valid-token control. Mental mutation: restoring the R1 header check fails the `foo` rows, and dropping the router config fails all `status=draft` rows |
| US-01-R1-F03 | a76ea4c | fixed | Text stays visible (`1e`, `2015e`), `1e5` is no longer turned into `5`, and the `errorOf` comment matches the code. The fix introduces a spec deviation, tracked as US-01-R2-F01 |
| US-01-R1-F04 | 8520a66, f10afe1, f39ff8d, dd364a6 | fixed | `value` is `decimal`, `pattern` is `string`, there is no `json` attribute, and the seed is moved. The parser requires JSON numbers and reads `pattern`. The wire shape matches §7.5.1 (curl). Follows the human decision and ADR-0006 |
| US-01-R1-F05 | 8520a66, f10afe1, d84cf82, 6ccd4aa | fixed | Stock controller; `fields`, `sort` and `filters` on `localeTag` work; the front end requests `localeTag` and maps it to `locale`; an entry with only `locale` is dropped (unit test). Recorded in ADR-0006 and spec §7.5.2 |
| US-01-R1-F06 | 8520a66 | fixed | Both strings are approved and listed in spec §8.1 with the human's name and date. No code change needed |
| US-01-R1-F07 | 9f4f08d, 4a82769 | fixed | Published on `127.0.0.1` and `[::1]` only; the LAN address is refused; `.env.example` warns. The proxy on 8080 does not expose `/admin` (it serves the SPA) |
| US-01-R1-F08 | 7476019, f33d527 | fixed | ESLint on both sides with pinned versions; both exit 0. Open point 2: allowing a leading `_` for intentionally unused bindings (`varsIgnorePattern`/`argsIgnorePattern`) is the standard `typescript-eslint` convention, keeps the test-engineer's files untouched, and only exempts names that opt in. Acceptable. The backend uses an `eslint-disable-next-line` for the same case (`seed/index.ts:10`); the inconsistency is cosmetic |
| US-01-R1-F09 | e6a1611 | fixed | Gate history is one table; *Blockers*, T-11..T-14 and the T-29/T-30 SHAs are updated |
| US-01-R1-F10 | dce1165 | fixed | Imports removed; required state is still exposed through `aria-required` |
| US-01-R1-F11 | 1d65723, 595e11c | fixed | `node:24.22.3-bookworm-slim`, `node:24.22.3-alpine3.24`, `nginx:1.29.8-alpine` |

## Notes (no finding)

- **Scope and roles.** Test files changed only in `test(...)` commits (`8d0a658`, `f10afe1`).
  No implementation commit touches a test. `8d0a658` precedes the fix `c3bdb56`. The lint
  commit `7476019` touched the country controller (two lines), later replaced by `d84cf82`. No
  scope creep: ESLint, image pins and port binding were requested fixes, and FLOW.md/ADR index
  edits are orchestrator documentation.
- **Commits.** Every `fix`/`test` commit has `Refs:`, and the finding fixes have `Resolves:`.
  `345a016` fixes a regression of a fix and says so ("Fixes regression from c3bdb56"). That is
  acceptable, and it also closes the cross-router leak.
- **Security design of the new middleware.** It is fail-closed: an unknown or renamed
  authentication strategy strips the parameters for everyone, which degrades to "published only"
  and does not leak. Only `find`/`findOne` get it, which is correct: the public role has no
  write action, and a token that can write keeps its parameters anyway.
- **Multi-country / ADR-0004 / Angular checklist.** No new hard-coded country values. Still
  Signal Forms only, still exactly two casts, and `field-validators.ts` still imports nothing
  from `@angular/forms`. `inject()` is used for `ApplicationRef`.

## Summary

Open: 0 blocker, 0 major, 4 minor (R2-F01, R2-F03, R2-F04, R2-F05), 2 nit (R2-F02, R2-F06).

All 11 round 1 findings are verified fixed. The F01 blocker and the F02 major hold under a wider
probe than round 1 used, and the cross-router scope leak is closed. All checks pass on a clean
stack: lint both sides, builds, 304/304 unit, 9/9 backend, 38/38 e2e (plus 65/65 repeated CO
e2e), trace with 0 ACs without a test, and a clean secret scan with 6 justified exceptions.

Before HC3: the human decides US-01-R2-F01 and records the decision (spec note or `tasks.md`).
The other minors are fixed or justified: R2-F03 (strapi-developer and test-engineer, before
US-02 adds a router), R2-F04 (strapi-developer), R2-F05 (README/ADR note after R2-F04). Nits:
R2-F02 (test-engineer), R2-F06 (spec-writer and orchestrator).
