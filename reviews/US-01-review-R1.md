# US-01 — Code review, round 1

| Field | Value |
|---|---|
| Story / spec | US-01 · `specs/US-01/spec.md` (version 0.3, Approved) |
| Branch / commit reviewed | `feat/us-01-data-form` @ `51f3681` (diff `main...HEAD`, 39 commits) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **CHANGES REQUESTED** |

Sources read: spec v0.3, `seed-fields.md`, ADR-0001..0005 (Accepted), `CLAUDE.md`, `tasks.md`
(including the Gate history), `docs/spikes/SPIKE-01-forms.md`, the `review-checklist`,
`strapi-content-modeling` and `dynamic-form-fields` skills. The spike branch is out of scope.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint | none configured (`frontend/package.json` and `backend/package.json` have no `lint` script, no ESLint config) | Not runnable. See US-01-R1-F08 |
| Typecheck / build (frontend) | `CI=1 NG_CLI_ANALYTICS=false npx ng build`; `npx tsc --noEmit -p tsconfig.spec.json`; `npx tsc --noEmit -p tsconfig.app.json` | Build OK (main 340.29 kB raw / 90.29 kB transfer), 0 errors, 0 warnings. Both `tsc` runs exit 0 |
| Build (backend) | `npm run build` | OK (TS compile, admin panel build) |
| Unit tests (frontend) | `npm test` | 7 files, **263 passed / 0 failed** |
| Unit tests (backend) | `npm test` | 1 file, **9 passed / 0 failed** |
| E2E | `docker compose -p mci-review up -d --build` on a fresh volume (created 05:20:43Z, `strapi` healthy, `web` up), then `npx playwright test --reporter=line` with the given env | **32 passed / 0 failed** (7.9 s). Stack removed afterwards with `down -v`. Ports 1337 and 8080 were free |
| Traceability | `bash scripts/trace.sh US-01` | ACs without tests: 0 (AC-26 manual per spec). Exit 0 before this report |
| Secrets | `bash scripts/scan-secrets.sh` | No findings in 211 files; 5 explicit exceptions (reviewed below). Exit 0 |
| Pinning | inspection of both `package.json` files | Every dependency and devDependency exact; lockfiles committed with the pins (`bc29287`, `5dee843`) |
| Extra probes (throwaway, scratchpad, not committed) | `curl` against Strapi's port and the proxy; Playwright scripts for number input, reload, a11y tree, 320/360/1280 px layout | Results quoted in the findings and in the AC table |

### Scan-secrets exceptions

| Location | Value | Verdict |
|---|---|---|
| `backend/tests/helpers/strapi.ts:40-43` | `test-admin-jwt-secret`, `test-api-token-salt`, `test-transfer-token-salt`, `test-encryption-key` for a throwaway Strapi in Vitest | Justified: visibly fictitious, test-only, protect nothing |
| `frontend/e2e/us-01-security.spec.ts:145` | `Bearer not-a-real-token-for-a-negative-test` | Justified: negative test of the proxy's `Authorization` rejection (ADR-0002) |

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-01-AC-01 | `frontend/src/app/shared/field-config.ts:143-169` (parse + sort), `core/form-field-api.ts:13-21` (one request per country), `quote-form.html:3`; seed `backend/src/seed/form-fields.ts:37-62` | `e2e/us-01-data-form-co.spec.ts:12,18`, `e2e/us-01-country-context.spec.ts:23,29,37`, `quote-form-page.spec.ts:89-154`, `field-config.spec.ts:42` | ✅ |
| US-01-AC-02 | `shared/field-validators.ts:65-112`; `quote-form.ts:52-55,67-70`; `quote-form.html:73-75` | `e2e/us-01-data-form-co.spec.ts:50` (6 rows), `quote-form-page.spec.ts:214-246` | ✅ |
| US-01-AC-03 | Content-driven rendering (no code path per field); proxy `no-store` `frontend/nginx/default.conf.template:41-45`; e2e write flow per ADR-0002/0005 | `e2e/us-01-config-change.spec.ts:59,123` (token scope = form-field create/delete + country find, created and deleted in Node only) | ✅ |
| US-01-AC-04 | `core/quote-store.ts:44-48` (write on change), `quote-form.ts:46,75-88` (hydrate + sync) | `quote-store.spec.ts:54`, `quote-form-page.spec.ts:485,528,537` (e2e part handed to US-02 per Q-19) | ✅ |
| US-01-AC-05 | `field-validators.ts:73,100-104` (integer only, `yearRange` inclusive) | `field-validators.spec.ts:27` (all 8 rows, pinned clock) | ✅ |
| US-01-AC-06 | `field-validators.ts:19-33,95-98` | `field-validators.spec.ts:70` (all 7 rows incl. 29 Feb) | ✅ |
| US-01-AC-07 | `field-config.ts:75-86` (options sorted), `quote-form.html:29-32` (disabled prompt, no pre-selection) | `quote-form-page.spec.ts:169,178,186,194` | ✅ |
| US-01-AC-08 | `field-validators.ts:56-68` | `field-validators.spec.ts:109,161` | ✅ |
| US-01-AC-09 | `field-validators.ts:51-53,66-67,78`; `quote-form.ts:105-125` (unparseable number) | `field-validators.spec.ts:213`, `e2e/us-01-data-form-co.spec.ts:68,84` | ✅ (UX side effect in US-01-R1-F03) |
| US-01-AC-10 | `quote-form.ts:67-70` (focus first invalid in sortOrder), `quote-form.ts:119` (`touched && invalid`) | `quote-form-page.spec.ts:248-319`, `e2e/us-01-data-form-co.spec.ts:228` | ✅ |
| US-01-AC-11 | Seed rules `backend/src/seed/form-fields.ts:39,44,52,57`; `field-validators.ts:92-94` (anchored full match) | `field-validators.spec.ts:289` (every row; seed values mirrored in `src/testing/seed-fixtures.ts`, checked equal to `seed-fields.md`) | ✅ |
| US-01-AC-12 | `field-validators.ts:36-49,106-108` | `field-validators.spec.ts:335` (all 6 rows) | ✅ |
| US-01-AC-13 | Seed draft-only `email` (`seed/index.ts:38`); REST default `published`; `published-only.ts` | `e2e/us-01-data-form-co.spec.ts:27` | ✅ for the browser path; the anonymous-draft guarantee behind it is broken, see US-01-R1-F01 |
| US-01-AC-14 | `field-config.ts:36-73,89-135,143-169` (drop + warn with key and reason, earlier duplicate kept) | `field-config.spec.ts:131`, `quote-form-page.spec.ts:424` | ✅ |
| US-01-AC-15 | `core/content-request.ts:5,11-13` (10 s timeout), `quote-form-page.ts:44-62`, `shared/load-error.ts` (alert + focus on "Reintentar") | `quote-form-page.spec.ts:321-398` (fake timers, 9.999 s / 10 s) | ✅ |
| US-01-AC-16 | `quote-form-page.ts:52-55`, `form-field-store.ts:24` (empty result not cached) | `quote-form-page.spec.ts:401,411`, `field-config.spec.ts:251` | ✅ |
| US-01-AC-17 | `app.routes.ts:9-23`, `core/supported-country-guard.ts`, `core/country-store.ts`, `features/country/*` | `e2e/us-01-country-context.spec.ts:45-80` (both scenarios, 3 addresses), `supported-country-guard.spec.ts:17`, `quote-form-page.spec.ts:646` | ✅ |
| US-01-AC-18 | `quote-store.ts:70-79`, `shared/field-values.ts:28-41`, `quote-form.ts:61-66` | `quote-store.spec.ts:119`, `field-values.spec.ts:18`, `quote-form-page.spec.ts:437-468` | ✅ |
| US-01-AC-19 | `core/wizard-step-guard.ts:12-30`, `app.routes.ts:18` | `wizard-step-guard.spec.ts:18`, `quote-form-page.spec.ts:549` | ✅ |
| US-01-AC-20 | Normal navigation (no `replaceUrl`) `quote-form.ts:63`; heading focus `quote-form-page.ts:39-41` | `quote-form-page.spec.ts:499,517` | ✅ |
| US-01-AC-21 | `quote-store.ts:81-120` (restore + boundary validation) | `quote-store.spec.ts:89`, `quote-form-page.spec.ts:558,568,577`. Probe: typed "Ana" and "2015.5" in CL, reload → "Ana", "2015.5", 0 alerts | ✅ (see US-01-R1-F03 for unparseable input) |
| US-01-AC-22 | `quote-store.ts:34-42`, `quote-form-page.ts:35` | `e2e/us-01-country-context.spec.ts:118,141`, `quote-store.spec.ts:172`, `quote-form-page.spec.ts:627,638` | ✅ |
| US-01-AC-23 | `quote-store.ts:51-61`, `quote-form-page.ts:56` | `quote-store.spec.ts:220`, `field-values.spec.ts:69`, `quote-form-page.spec.ts:590,612` | ✅ |
| US-01-AC-24 | Native controls, global `:focus-visible` (`src/styles.css:34-37`), DOM order = sortOrder | `e2e/us-01-data-form-co.spec.ts:142,228` (heading focus on step 2 handed to US-02) | ✅ |
| US-01-AC-25 | `quote-form.html:9-75` (`label for`, `aria-describedby` help + error, `aria-invalid`, `aria-required`, `role="alert"`) | `quote-form-page.spec.ts:695-746`. Probe: every CL control has `aria-required="true"`, help texts in `aria-describedby` | ✅ (see US-01-R1-F10) |
| US-01-AC-26 | One-column layout, 2.75 rem controls, 1.5 rem checkbox | Manual at HC3 (T-31). Probe only: no horizontal scroll at 320, 360 and 1280 px; no control or link under 24 × 24 px | 🖐 manual, pending HC3 |
| US-01-AC-27 | `core/content-request.ts` (GET, relative `/api`, no headers), nginx GET-only / `Authorization` → 400 | `e2e/us-01-security.spec.ts:15` | ✅ |
| US-01-AC-28 | `backend/src/middlewares/published-only.ts`, `config/middlewares.ts:18`, `bootstrap/permissions.ts`, nginx allow-list | `e2e/us-01-security.spec.ts:85-138` | ❌ The rule fails for anonymous callers on Strapi's port (US-01-R1-F01); the tests do not cover it (US-01-R1-F02) |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-01-R1-F01 | blocker | `backend/src/middlewares/published-only.ts:20` | Anonymous callers can read drafts on Strapi's port: any non-Bearer `Authorization` value (`foo`, `Basic …`, `Bearer` with no token) or an upper-case path (`/API/…`) skips the published-only rule | US-01-BR-06, US-01-AC-28, ADR-0002 ("Published only for anonymous reads"), CLAUDE.md §3 | open | |
| US-01-R1-F02 | major | `frontend/e2e/us-01-security.spec.ts:85-117` | AC-28 checks only the no-header, lower-case path, so F01 passes the gate. ADR-0002 relies on this check as the only guard of the draft rule | US-01-AC-28, ADR-0002 (*Strongest argument against*, *Confirmation*), checklist "Tests fail when the behaviour breaks" | open | |
| US-01-R1-F03 | minor | `frontend/src/app/features/quote-form/quote-form.ts:105-110`, `:112-116` | The AC-09 fix erases what the person typed: typing "1e" leaves an empty input, and "1e5" ends up as "5". The `errorOf` comment now contradicts the code | ADR-0004 (unparseable reaches the *model* as empty), checklist "small UX inconsistency" | open | |
| US-01-R1-F04 | minor | `backend/src/components/form/validation-rule.json:14-16` | Rule `value` is a free `json` attribute. Editors must type JSON (a pattern needs quotes and doubled backslashes), and a wrong value silently drops the whole field from the form | Spec §7.1 ("structured, not free JSON"), `strapi-content-modeling` skill, US-01-BR-06 | open | |
| US-01-R1-F05 | minor | `backend/src/api/country/content-types/country/schema.json:32`, `backend/src/api/country/controllers/country.ts:26-33` | `locale` is stored as `localeTag`, which differs from the ADR-0001 model and is not recorded anywhere. The custom `find` maps only `fields`: `sort=locale` and `filters[locale]` return 400 | ADR-0001 ("What is decided", Strapi model), CLAUDE.md §1 (record decisions) | open | |
| US-01-R1-F06 | minor | `frontend/src/app/features/country/country-chooser-page.html:2`, `frontend/src/index.html:5` | Code-owned end-user copy that is not in the approved list: heading "Elige tu país" and document title "Cotizador de seguro de auto" | US-01-BR-07, US-01-Q-14, US-01-Q-28 | open | |
| US-01-R1-F07 | minor | `docker-compose.yml:6`, `:19-20` | The dev super admin gets a password that is public in the repo, and Strapi's port is published on all interfaces, so anyone on the same network can log in to the admin with full rights | ADR-0002 (dev admin mitigation names `.env.example` / `.env` only), checklist Security | open | |
| US-01-R1-F08 | minor | `frontend/package.json:4-11`, `backend/package.json` scripts | No linter is configured, so the DoD item "Lint … pass" cannot be checked | CLAUDE.md §12, review-checklist procedure step 3 | open | |
| US-01-R1-F09 | minor | `specs/US-01/tasks.md:13`, `:37-40`, `:55-56`, `:85` | A blank line inside *Gate history* ends the table, so every row from step 3 to gate attempt 3 renders as one paragraph. *Blockers* is stale, T-11..T-14 still say "not run", and T-29/T-30 have no SHAs | CLAUDE.md §9 and §11 (traceability, tasks.md is the source of truth) | open | |
| US-01-R1-F10 | nit | `frontend/src/app/features/quote-form/quote-form.ts:12` | `REQUIRED` and `metadata` are imported and never used. Required state is exposed only through `aria-required` (native `required` and the Signal Forms `required()` state are false) | Maintainability; step 3 decision "`required`/`aria-required` on the control" (met through `aria-required`) | open | |
| US-01-R1-F11 | nit | `frontend/Dockerfile:2`, `:11`, `backend/Dockerfile:1` | Base images use floating tags (`node:24-alpine`, `nginx:1.29-alpine`, `node:24-bookworm-slim`) | Spirit of CLAUDE.md §4 (exact pins; §4 covers npm only) | open | |

### US-01-R1-F01 — Anonymous draft reads on Strapi's port (published-only middleware bypass)

The middleware strips `status`, `publicationFilter`, `hasPublishedVersion` and `publicationState`
only when `ctx.path.startsWith('/api/') && !ctx.get('authorization')`. Neither condition matches
how Strapi authenticates or routes:

1. **Header presence is not authentication.** Strapi's content-API strategies (API token,
   users-permissions JWT) only consider `Bearer <token>`. Any other `Authorization` value is
   ignored, the request falls back to the **public role**, and the publication parameters are
   kept. The comment at lines 8-11 ("an invalid one is refused with 401") is true only for
   `Bearer <something>`.
2. **The path check is case-sensitive, Strapi's router is not.** `/API/form-fields` reaches the
   same `find` route without passing the `/api/` test.

Evidence, fresh `mci-review` stack (seeded draft `email` field in CO and CL), Strapi's own port:

```
GET /api/form-fields?status=draft&filters[key][$eq]=email                         -> 200, data: []      (correct)
  + Authorization: Bearer garbage                                                  -> 401                 (correct)
  + Authorization: foo | Basic Zm9vOmJhcg== | Bearer | x                            -> 200, 2 drafts (ids 9, 28, publishedAt null)
GET /API/form-fields?status=draft&filters[key][$eq]=email   (no header at all)     -> 200, 2 drafts
GET /Api/form-fields?status=draft&...                       (no header at all)     -> 200, 2 drafts
GET /api/countries?status=draft  + Authorization: foo                              -> 200, draft countries
```

Through the proxy (`:8080`) the same requests are refused: `Authorization` → 400, and `/API/…`
falls through to `index.html`. But ADR-0002 states that drafts stay unreadable "even when
someone calls Strapi's port directly", and port 1337 is published on every interface
(`docker-compose.yml:6`). The `status=draft` filter is the only control left on that port, and it
is open. This breaks BR-06 ("no anonymous caller can read them, not even by asking the content
API for `status=draft`") and the first AC-28 scenario. The leaked data is low-sensitivity, but the
AC and the ADR rule are explicit. Severity: **blocker** (security rule, AC broken).

Expected: an anonymous request (no **valid** API token) never receives non-published content,
whatever its headers or path casing. Suggested direction (optional): decide on the
authentication result rather than the raw header, for example by forcing `status` after Strapi
has authenticated the request (route-level middleware or policy on the content API that checks
the authenticated strategy), or by rejecting unknown `Authorization` schemes. Also compare the
path case-insensitively. Strapi has its own `strapi::query` parsing, so re-check
`publicationState` and future parameters (ADR-0002 *Strongest argument against*).

### US-01-R1-F02 — AC-28 tests miss the anonymous variants

`us-01-security.spec.ts` sends `status=draft` (and three other publication parameters) with no
`Authorization` header and lower-case paths only. All 32 e2e tests pass while F01 is open, so the
test would not catch a regression either. ADR-0002 says the draft rule "is guarded by an
automated anonymous request for the seeded draft field, re-run on every Strapi upgrade", so that
guard must cover the bypasses found above: at least one non-Bearer `Authorization` value, an
empty `Bearer`, and a non-lower-case `/API/` path, on Strapi's port, for `form-fields` (and
ideally `countries`). This is a test-engineer task, separate from the F01 fix commit (CLAUDE.md
§10).

### US-01-R1-F03 — Unparseable number input is wiped from the screen

`onNumberInput` sets the model to `''` whenever `validity.badInput` is true. Signal Forms then
writes `''` back to the control, so the text the person sees is erased while they type. Probe in
Chromium on CL "Año", typed key by key:

| Typed | Input shows | Stored raw value |
|---|---|---|
| `2015.5` | `2015.5` | `"2015.5"` |
| `1e` | *(empty)* | `""` |
| `-5` | `-5` | `"-5"` |
| `1e5` | `5` | `"5"` |

AC-09 and AC-21 still pass as the spec defines them: the v0.3 note says an unparseable number
reaches the **model** as `''`, and AC-21's example `2015.5` is parseable and restored exactly.
On open point 3: the interplay is acceptable against the spec. A reload after "1e" shows an
empty field, which matches the stored `''`. ADR-0004, however, does not decide to rewrite the
DOM, and the AC-09 e2e asserts only `inputValue() === ''`, which a sanitised number input
returns whether or not the text is still visible. Effects: the person cannot see what they
typed, and a valid scientific-notation entry like `1e5` becomes `5` with no feedback. Low
practical impact for a year field, so **minor**. Also, the `errorOf` comment (lines 112-116)
says unparseable input "never reaches the model (it keeps the last parseable text)", which the
code now contradicts. Either keep the DOM text and stop only the stale model write, or record
this behaviour in ADR-0004.

### US-01-R1-F04 — Rule `value` is free JSON

`form.validation-rule` gives `kind` an enumeration and gives `years`, `maxYearsOld` and
`maxYearsAhead` typed integers, but `value` (used by `minLength`, `maxLength`, `min`, `max`,
`pattern`) is a `json` attribute. For editors this means:

- A pattern must be typed as a JSON string. The RUT pattern is stored as
  `"^[0-9]{1,2}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9kK]$"` (seed `form-fields.ts:52`). An editor who
  types `^\d+$` gets a JSON error, or a different regex if the escaping is wrong.
- A wrong type (`"tres"` for `minLength`, a number for `pattern`) saves without error, and
  `parseFieldConfigs` then drops the **whole field** (`field-config.ts:104`). A required reserved
  field such as `plate` would silently disappear from the form.

The front end does validate at the boundary, so the app does not crash and US-01-Q-18 is met.
But spec §7.1 says "Rule kinds (structured, not free JSON)", and `strapi-content-modeling` says
editors must not be able to save something the front end cannot parse, with JSON acceptable
only when unavoidable. Here it is avoidable (for example a numeric `value` and a string
`pattern`). On open point 5: this is a real deviation, but its impact is bounded, so
**minor**. It needs either a schema change or a human decision recorded in the spec or ADR-0001.

### US-01-R1-F05 — `localeTag` deviates from ADR-0001 without a record

`locale` is a reserved Strapi attribute, so storing `localeTag` is a sound technical choice, and
the content API still answers `locale`, so the ADR-0001 contract seen by the front end holds
(`fields[0]=locale` → `"locale":"es-CO"`, checked). But:

- ADR-0001 names the attribute `locale`, and nothing records the change: no ADR note, no spec
  §7 note, no `tasks.md` decision. Editors see `localeTag` in the admin.
- The custom `find` translates only `fields`. `sort=locale:asc` and `filters[locale][$eq]=es-CO`
  return `400 Invalid key locale` (checked), so the API's `locale` is only partly real. US-02
  (currency and number formatting) will consume it.

**Minor**: the contract used by US-01 works. Record the deviation (an ADR-0001 note or
amendment) and either document the limitation or map `sort` and `filters` too. On open point 5:
both items flagged by the strapi-developer still need a decision, and neither is recorded today.

### US-01-R1-F06 — Unlisted chrome copy

On open point 1: a page-level `h1` on the chooser is good accessibility practice (the
unknown-country page already uses its message as the heading, spec §8), and I would keep it.
But US-01-Q-14 and US-01-Q-28 list the code-owned copy exhaustively, and BR-07 allows code-owned
copy only under that exception. "Elige tu país" (`country-chooser-page.html:2`) is not in the
list, and neither is the document `<title>` "Cotizador de seguro de auto" (`index.html:5`), which
screen readers announce. **Minor**: the human should approve both strings and record them
(spec §6 Q-14/Q-28 answer or tasks.md decision), or they should be removed.

### US-01-R1-F07 — Known super-admin password on an exposed port

On open point 7: the credentials are fictitious, documented in `.env.example`, and only for
development, which is fine on its own. The problem is the combination. With no `.env`,
`docker-compose.yml:19-20` creates a super admin with `DevOnly-Passw0rd`, a value public in the
repository, and line 6 publishes 1337 on `0.0.0.0`. Anyone on the same network as a developer
or the HC3 reviewer can log in to `/admin` with full rights: content writes, API token creation.
ADR-0002's mitigation for the dev admin names only "fictitious values in `.env.example`, `.env`
git-ignored", not compose defaults. **Minor**, dev-only. Possible directions: bind the published
ports to `127.0.0.1`, or record the human's acceptance of the defaults.

### US-01-R1-F08 — No linter

Neither package defines `lint`, and `angular.json` has no lint target. The checklist asks the
reviewer to run lint, and CLAUDE.md §12 lists "Lint … pass" in the Definition of Done, so that
item is not verifiable. Unused imports (F10) are exactly what a linter would catch. **Minor**:
add a linter in a `chore` commit, or record a human decision that lint is out of scope for this
assessment.

### US-01-R1-F09 — `tasks.md` traceability defects

On open point 6: editing `tasks.md` through Bash is not a finding in itself. It did affect
content here:

- Line 85 is an empty line left between the *Scaffolding* row and the *3 Tests (red)* row
  (introduced in `c3ee6f4` as the table's end; later rows were appended after it). In GFM this
  ends the table, so the rows for step 3, the step 3 decisions, gate attempts 1-3 and HC2
  (ADR-0005) render as one run-on paragraph. Those are the rows that record the human decisions
  since HC1.
- Status *Blockers* (line 13) still asks for the `src/testing/**` exclusion, which `5dee843`
  already did.
- T-11..T-14 (lines 37-40) still say "listed, not run", although the gate ran them three times.
- T-29 and T-30 (lines 55-56) say "(this branch)" instead of commit SHAs (`69b18b3`, `c3ee6f4`).

**Minor**.

### US-01-R1-F10 — Unused Signal Forms imports; how "required" is exposed

On open point 2: the premise is not quite what the code does. `REQUIRED` and `metadata` are
imported (`quote-form.ts:12`) but **not used**. Required state reaches the DOM only through
`[attr.aria-required]` (`quote-form.html:13,25,42,52,63`). Probe: every CL control has
`aria-required="true"` and `required === false`, and the form has `novalidate`. That meets AC-25
("exposed as required") and the step 3 decision ("`required`/`aria-required` on the control"). I
see no a11y defect, because `aria-required` is supported on textbox, combobox, spinbutton and
checkbox. **Nit**: remove the dead imports, or wire `metadata(…, REQUIRED, …)` if the Signal
Forms `required()` state should be true (nothing reads it today).

### US-01-R1-F11 — Floating Docker base image tags

`node:24-alpine`, `nginx:1.29-alpine` and `node:24-bookworm-slim` can change under the same
build. CLAUDE.md §4 pins npm dependencies only, so this is a **nit** (reproducibility). Pin a
patch tag or a digest when convenient.

## Notes on the other open points and checklist items (no finding)

- **Open point 4**: confirmed and raised as F01. The proxy's handling is safe: 400 for any
  `Authorization`, case-sensitive allow-list. Strapi's own port is not.
- **ADR-0005 conformance**: `backend/src/api/form-field/controllers/form-field.ts` is the plain
  `createCoreController` (revert `645bd25`). The e2e token scope is exactly form-field
  `create`/`delete` + country `find`, with a 7-day lifespan, created and deleted in the Node
  process only (`e2e/support/strapi-admin.ts:17-21,50-57,97-104`). The browser context gets no
  token (asserted at `us-01-config-change.spec.ts:113-120`).
- **Public role**: reconciled in code to exactly `country.find` and `form-field.find`. The
  users-permissions defaults are removed, `allow_register` is false, and the authenticated role
  has no `api::` permissions (`bootstrap/permissions.ts`). The default Full Access token is
  deleted (`bootstrap/admin.ts:24-26`). CORS allow-list is empty by default.
- **Multi-country**: no country code, name, field list or copy in front-end code, apart from the
  chrome copy in F06. One build serves both countries. A content-only country works
  (`quote-form-page.spec.ts:154`, "PE").
- **ADR-0004**: Signal Forms only (no `ReactiveFormsModule`), one `validate()` per field over the
  pure core, exactly two casts (the narrowing accessors). `field-validators.ts` imports nothing
  from `@angular/forms`. The clock is injectable. There is no `new Date()` inside validators.
- **Angular checklist**: standalone components, `@if`/`@for`/`@switch` with `track`,
  `inject()`, `input()`/`output()`, signals for state, and `effect` used only to persist (a real
  side effect). No `any`. Responses are validated at the boundary. Naming follows CLAUDE.md §6.
- **Scope and roles**: no step 2 page (the `planes` route has `children: []`). No scope creep
  beyond F06's copy. Test files were changed only in `test(...)` commits (`d8fe3fd`, `14a8e08`,
  `7584186`, `f1fc135`), and no implementation commit touches a test. The `7584186` change
  (tolerate the date control's internal tab stops; type-ahead in selects) keeps the Tab-order
  assertion and stays within AC-24's allowed keys.
- **Commits**: every `feat`/`fix`/`test` commit carries `Refs:`. Gate fixes cite
  `Resolves: gate attempt N`, which is reasonable before any review finding existed.
- **Seed**: idempotent by natural key, published except the draft-only `email` in each
  country. Content is Spanish and fictitious and matches `seed-fields.md`.
- **Accessibility probes**: focus lands on the step heading on arrival. `:focus-visible` uses a
  3 px outline (`#0b5fff`, about 5:1 on white). Text colours (`#1b1f24`, `#4a5460`, `#b00020`,
  `#0b4f9c`) are all above 4.5:1 on white. No horizontal scroll at 320, 360 or 1280 px, and every
  target is at least 24 × 24 px (spec §9). AC-26 screenshots remain a human HC3 task (T-31).

## Verification of previous round (from round 2 onward)

Not applicable (round 1).

## Summary

Open: 1 blocker, 1 major, 7 minor, 2 nit.

Every AC has an implementation and a test, and all automated checks pass on a clean stack
(263/263 unit, 9/9 backend, 32/32 e2e). But BR-06 and AC-28 do not hold on Strapi's published
port: an anonymous caller reads drafts with a non-Bearer `Authorization` header or an upper-case
`/API/` path (F01), and the AC-28 tests do not cover it (F02). Routing: F01, F04, F05 and F07 to
strapi-developer; F02 to test-engineer; F03, F06 (after the human decides on the copy), F08,
F10 and F11 to frontend-developer or a `chore` commit; F09 to the orchestrator.
