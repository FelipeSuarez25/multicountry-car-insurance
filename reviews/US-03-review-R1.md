# US-03 — Code review, round 1

| Field | Value |
|---|---|
| Story / spec | US-03 · `specs/US-03/spec.md` (version 0.1, Approved) |
| Branch / commit reviewed | `feat/us-03-summary-payment` @ `b97e7fd` (17 commits on `main`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **CHANGES REQUESTED** (1 major) |

Reviewed against spec v0.1, `tasks.md` (Gate history, including the human's step 3 test decisions),
ADR-0008 and ADR-0009 (Accepted), the `adr/README.md` implementation notes (ADR-0002 `term`,
ADR-0001 summary route), ADR-0003, ADR-0007 and `CLAUDE.md`.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0 |
| Build (frontend) | `npx ng build` | exit 0 (initial total 382.19 kB) |
| Unit (frontend) | `npx ng test --watch=false` | **945 passed / 0 failed** (27 files) |
| Lint (backend) | `npm run lint` | exit 0 |
| Typecheck (backend) | `npx tsc --noEmit -p .` | exit 0 |
| Tests (backend) | `npm test` | **81 passed / 0 failed** (4 files) |
| E2E | `docker compose -p us03-review-r1 up -d --build` (fresh volume), then `scripts/e2e.sh` | **124 passed / 0 failed** (1.2 min). Stack removed with `down -v` afterwards |
| Traceability | `scripts/trace.sh US-03` | exit 0 · ACs without tests: 0 · AC-18 manual (per spec) · open blocker/major: 0 (before this report) |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 315 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); none new |
| Dependencies | `git diff main...HEAD -- '*/package.json' '*/package-lock.json'` | no change (ADR-0008, ADR-0009: no new dependency) |
| Unsafe sinks | `grep -rnE "innerHTML\|outerHTML\|insertAdjacentHTML\|bypassSecurityTrust\|DomSanitizer" frontend/src/app` (non-spec) | no match |
| Card vocabulary (ADR-0008) | `grep -rniE "cc-(number\|exp\|csc)\|card\|tarjeta\|cvv\|cvc\|iban" frontend/src/app` (non-spec) | only the CSS class `card` and the word "discarded"; no card field or token |
| `@defer` / lazy chunks | `grep -rn "@defer\|loadComponent" frontend/src/app` | no match |

### Live security probes of `/api/terms` (own stack, anonymous)

Strapi port `127.0.0.1:1337`, CO filter, seeded CO draft "Términos y condiciones (borrador)":

| Probe | Result |
|---|---|
| `status=draft`; `/API/terms` and `/Api/Terms` with `status=draft`; `publicationState=preview`; `status[0]=draft`; `hasPublishedVersion=false&status=draft` | 200, only the published CO entry (`publishedAt` set) |
| `filters[publishedAt][$null]=true`; `filters[title][$contains]=borrador&status=draft`; `filters[$or][0][publishedAt][$null]=true&status=draft` | 200, `[]` |
| `Authorization: foo`, `Basic …`, `Bearer ` (empty) + `status=draft` | 200, published entry only; `Bearer abc` → 401 |
| `GET /api/terms/:id` (findOne) | 403 |
| `POST`, `PUT /api/terms/:id`, `DELETE /api/terms/:id` | 403 |
| `populate=*`, `populate[country][populate]=*` | only the published country's public fields (code, name, currency, localeTag, sortOrder, timestamps); `populate[createdBy]`, `populate[localizations]` → 400 |
| Public role, read through the admin API | exactly `country.find`, `form-field.find`, `plan.find`, `term.find` |

Proxy `localhost:8080`: `GET /api/terms` and `/api/terms/` with `status=draft` → published only;
`/api/./terms` → normalised, published only; `POST`/`PUT`/`DELETE`/`OPTIONS` → 405;
`Authorization: Bearer x` → 400; `/api/terms/x` → 404; `/API/terms` → SPA `index.html` (never
reaches Strapi); `/api/%74erms`, `/api/terms;x`, `/api/terms%2F..%2Fplans` → 404; `//api/terms` → 400.
No draft leaked on any path.

### Hostile `blocks` bodies through `parseTerms` (bundled with esbuild into the scratchpad, run in Node)

| Input | Result |
|---|---|
| Text `<script>alert(1)</script>` | kept as a literal span; no warning |
| `link` with `url: "javascript:alert(1)"` | text "click" kept, URL dropped, warning `link` |
| Node `type: "<img src=x onerror=alert(1)>"` | dropped, warning `unknown` (the markup is never echoed) |
| `image` with a remote URL | dropped, warning `image` |
| `__proto__` keys, `bold: "true"` (string), extra `onclick`/`style`/`class`/`href` attributes | ignored; marks only from `=== true`; nothing but `text` and four booleans survives |
| `text` not a string (object with `toString`) | dropped, then entry skipped (`body`) |
| Heading `level` 99, 2.5, `"2"` | dropped, warning `heading` |
| Lists nested 5 000 levels | 6 levels kept, one `list-depth` warning |
| 200 000 paragraphs | parsed in 50 ms |
| **`link` nested 200 000 levels** | **`RangeError: Maximum call stack size exceeded`** (see F04) |
| **300 000 headings** | **`RangeError` from `Math.min(...levels)`** (see F04) |

`RichText` (`frontend/src/app/shared/rich-text.html`) emits only fixed elements (`p`, `h2`–`h6`,
`ul`/`ol`/`li`, `strong`/`em`/`u`/`s`) and `{{ span.text }}`; no property or attribute is bound
from content. No `innerHTML`, sanitiser bypass or attribute binding from content anywhere in
`frontend/src/app`. ADR-0009 holds.

## AC verification

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-03-AC-01 | `features/summary/summary-page.ts:98-118`, `shared/summary-rows.ts:49-65` | `summary-page.spec.ts` › AC-01 (CO, CL, price); e2e `full-flow-co`, `summary-payment-cl` | ✅ |
| US-03-AC-02 | `core/terms-api.ts`, `summary-page.html:77-99`, backend `api/term/**`, seed `seed/terms.ts` | `summary-page.spec.ts` › AC-02; e2e both files | ✅ |
| US-03-AC-03 | `summary-page.ts:159-180`, `summary-page.html:4-15,124-126` | `summary-page.spec.ts` › AC-03; e2e `full-flow-co` | ✅ |
| US-03-AC-04 | `summary-page.ts:173-178`, `summary-page.html:128-130` | `summary-page.spec.ts` › AC-04; e2e `summary-payment-cl` | ✅ |
| US-03-AC-05 | `shared/document-mask.ts`, `summary-page.html:32-36` | `document-mask.spec.ts` (every row); e2e DOM/title/URL | ✅ |
| US-03-AC-06 | `shared/summary-rows.ts:33-62` | `summary-rows.spec.ts` (every row) | ✅ |
| US-03-AC-07 | `summary-page.ts:146-152,186-189` | e2e `full-flow-co` › AC-07; component | ✅ |
| US-03-AC-08 | `summary-page.ts:81-83`, `summary-page.html:120-126` (`aria-disabled`, `aria-describedby`) | `summary-page.spec.ts` › AC-08; e2e CL | ✅ |
| US-03-AC-09 | three layers: `summary-page.ts:160-161` (sync guard), `simulated-payment-gateway.ts:42` (in-flight), `summary-page.html:59,72,105,109,124` (lock) | gateway spec, component (fake and real gateway), e2e | ✅ |
| US-03-AC-10 | `shared/quote-number.ts`, `core/random-digits.ts` (unbiased rejection sampling, `crypto.getRandomValues`) | `quote-number.spec.ts`, `random-digits.spec.ts`, e2e format | ✅ |
| US-03-AC-11 | `core/quote-store.ts:58-64` (`clearQuote`), `summary-page.ts:168-172` (order of ADR-0008) | `quote-store-clear.spec.ts`, component, e2e (confirmation, "Nueva cotización", reload, back) | ✅ (see F02 on a3f186c) |
| US-03-AC-12 | `summary-page.ts:121-136`, `summary-page.html:79-89`; 10 s via `content-request.ts` | `summary-page.spec.ts` › AC-12 (error, timeout 9.999/10 s, retry, none, all malformed) | ✅ (see F04) |
| US-03-AC-13 | `shared/rich-text-blocks.ts`, `shared/rich-text.*` | `rich-text-blocks.spec.ts`, `rich-text.spec.ts`, component XSS rows | ✅ |
| US-03-AC-14 | `shared/terms.ts:41-48` (own `publishedAt` sort), published-only router | `terms.spec.ts`, component, e2e AC-14 (Node publish + teardown) | ✅ as written; see F01 for a restart |
| US-03-AC-15 | `simulated-payment-gateway.ts` (1500 ms timer, no `HttpClient`), `summary-page.html:109-119` | gateway spec (1499/1500 ms, `HttpTestingController.verify`), component (3 controls only), e2e (0 requests, 1.4–4 s) | ✅ |
| US-03-AC-16 | `summary-page.ts:95,172`, `app.routes.ts:28`, `summary-page.html:92` | component focus/title/order; e2e keyboard path | ⚠️ the arrow-key scroll check never runs at 1280×800 (F03); real scroll is an HC3 check per the human's decision |
| US-03-AC-17 | `summary-page.html` (h2 sections, `dl`, named region, `fieldset`/`legend`, `aria-busy` on `.summary` only, status region outside it, alert next to "Pagar") | `summary-page.spec.ts` › AC-17 | ✅ (screen-reader pass at HC3) |
| US-03-AC-18 | `summary-page.css` | manual (HC3). Reviewer measurement: no horizontal scroll at 360×740 and 1280×800; "Pagar" 44 px high, checkbox 24×24 with a clickable label | 🖐 manual |
| US-03-AC-19 | `api/term/routes/term.ts` (`publishedOnlyConfig()`), `bootstrap/permissions.ts:10-15`, nginx allow-list | e2e both files, backend `terms-rules.test.ts`, `published-only-routes.test.ts`; live probes above | ✅ |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-03-R1-F01 | major | `backend/src/seed/index.ts:72-85`; root cause `specs/US-03/spec.md:554` (§7.3 natural key) | After an editor changes the title of a seeded terms entry (or deletes it and publishes new terms), the next Strapi start re-creates the fictitious seed terms **published now**; because the most recently published terms win (BR-07), the site shows the seed instead of the editor's terms. Reproduced on the review stack | US-03-BR-07; `strapi-content-modeling` ("business users change content without deploys"; idempotent seed); the seed's own contract (`seed/index.ts:25-26`: "never … overwrites what editors changed") | open | |
| US-03-R1-F02 | minor | `frontend/src/app/core/quote-store.ts:167-169` (a3f186c) | `persist()` now *returns* for an empty state instead of removing the entry. When `prune()` drops every stored key (all fields removed from the configuration) the old entry, with the values of removed fields, stays in `sessionStorage`. ADR-0003 says "the pruned state is written back". The behaviour change to US-01 is not recorded | ADR-0003 (*When it is read*, *When it is written*); CLAUDE.md §1 (record decisions) | open | |
| US-03-R1-F03 | minor | `frontend/e2e/us-01-03-full-flow-co.spec.ts:671-674`; `frontend/src/app/features/summary/summary-page.css:81` (8daae83) | The AC-16 arrow-key scroll assertion is conditional (`if (overflows)`), and since 8daae83 the CO terms do not overflow at 1280×800 (scrollHeight 340 = clientHeight 340), so it never runs. The real cause is the animated keyboard scroll (scrollTop 0 right after ArrowDown, 40 px 600 ms later at 360×740). A production style was changed to step around a test timing problem | US-03-AC-16; checklist "Tests fail when the behaviour breaks" | open | |
| US-03-R1-F04 | minor | `frontend/src/app/shared/rich-text-blocks.ts:44,131`; `frontend/src/app/core/terms-api.ts:22` | Recursion through nested `link` nodes is unbounded, and `Math.min(...levels)` spreads every heading. Deep or very large bodies throw `RangeError` from `parseTerms`, so **one** malformed entry turns the whole terms section into the error state ("No pudimos cargar…") instead of being skipped with a warning | Spec §7.2 ("A malformed entry is skipped"); ADR-0009 parser table; checklist "malformed content does not crash the app" | open | |
| US-03-R1-F05 | minor | `README.md` (no change on the branch) | ADR-0009 mitigates the silent loss of links, images, quotes and code blocks with "the supported formatting is documented for editors in the README by the developers". The README has no such section | ADR-0009 *Consequences* (mitigation) | open | |
| US-03-R1-F06 | nit | `adr/README.md:40`; `specs/US-03/spec.md:10`; `specs/US-03/tasks.md` T-01, T-02 | Stale status text: `adr/README.md` still says "Proposed … (HC2 pending)" for ADR-0008/0009; the spec header lists ADR-0008/0009 only as "Needed", so `trace.sh` prints "Related ADRs: ADR-0001…ADR-0007"; T-01/T-02 still read "Proposed; HC2 pending" | CLAUDE.md §9 (traceability) | open | |

### US-03-R1-F01 — A Strapi restart puts the seed terms back over the editor's terms (major)

**Evidence (review stack `us03-review-r1`, fresh volume):**

1. Through the admin API, as an editor would in the Content Manager, the CO terms title was
   changed to "Términos y condiciones del seguro de auto – Colombia (versión 2027)" and published
   (update 200, publish 200). `GET /api/terms?filters[country][code][$eq]=CO` returned only that
   entry.
2. `docker compose -p us03-review-r1 restart strapi`. The log printed
   `Seed: created terms CO/Términos y condiciones del seguro de auto – Colombia`.
3. The same request now returned two published entries:
   `[('…Colombia', '2026-11-21T20:01:57.533Z'), ('…Colombia (versión 2027)', '2026-11-21T20:01:51.964Z')]`.
   `parseTerms` shows the most recent one, so the summary shows the **fictitious seed text**, not
   the editor's terms.

The same happens when an editor deletes the seeded entry and publishes new terms with another title.
This is the normal way to replace terms, since the spec has no versioning (US-03-Q-12). Container
restarts happen on every `docker compose up` and every deploy. Fields and plans use technical
natural keys (`key`) that editors don't rename, and their duplicates don't win by publication date.
The terms use the editor-facing `title` as their key, and the newest published entry wins, so a
restart overrides business content.

**Why major:** BR-07's promise ("managed by the business team from Strapi … reflected on the next
full page load") breaks after a routine restart. The person then sees, and accepts, terms that the
business has withdrawn. No data is deleted, so this is not a blocker.

**Direction (not a fix):** §7.3 fixes the natural key, so the spec-writer and the human have to
decide this, not the strapi-developer alone. Options: seed a country's terms only when that country
has **no** terms document at all (any status), or keep a seed marker that editors don't edit. Add a
backend test: rename or delete the seeded entry, re-run the seed, and check that no new published
entry appears.

### US-03-R1-F02 — `persist()` skips the write instead of clearing (minor)

`quote-store.ts:169`: `if (plan === null && Object.keys(this.valuesSignal()).length === 0) return;`

- The goal of a3f186c (an empty state leaves no entry) is reasonable. ADR-0003 does not require an
  entry before the first value, and every US-01 unit and e2e test still passes (945/945, 124/124).
  But the guard returns, it doesn't remove, so the invariant "empty state ⇒ no entry" holds only
  when storage was already empty. In `prune()` (`:88-98`), if every stored key is no longer
  configured, `valuesSignal` becomes `{}` and nothing is written. The previous entry, with the
  values of the removed fields (possibly personal data), stays in the tab until the person types
  again. ADR-0003 says "The pruned state is written back." The UI doesn't show the stale values
  (they are pruned again on every load), so the impact is small. That's why this is minor.
- The commit came from test assertions that go further than the spec. US-03-AC-11 requires "no
  `quote-wizard` entry" only *on the confirmation*; for reload, back and "Nueva cotización" it
  requires empty fields and no plan. The e2e tests (`us-01-03-full-flow-co.spec.ts:564,575`) and
  the d530005 unit test also require `null` storage on step 1. That stricter reading is defensible
  (data minimisation), but it changes US-01 behaviour (entering a country used to write
  `{country, values: {}}`) and should be recorded.
- **Direction:** replace the `return` with `clearStorage()` (then return), so the invariant holds
  in every case. Record it as an **ADR-0003 implementation note** in `adr/README.md` ("an empty
  wizard state is represented by no entry; entering a country writes nothing until the first
  value"). Later stories read ADR-0003 to learn when the entry exists, so the note is needed.

### US-03-R1-F03 — The AC-16 scroll check is vacuous at desktop size (minor)

Measured with Playwright on the review stack, with a valid CO entry:

| Viewport | Terms region scrollHeight / clientHeight | scrollTop right after ArrowDown | after 600 ms |
|---|---|---|---|
| 1280×800 | 340 / 340 (no overflow) | 0 | 0 |
| 360×740 | 580 / 382 | 0 | 40 |

- The keyboard scroll works. Chromium animates it, so a synchronous `scrollTop` read just after the
  key press sees 0. Raising `max-height` from `min(20rem, 50vh)` to `min(24rem, 60vh)` doesn't fix
  that read. It removes the overflow on the desktop e2e viewport, so `if (overflows)` is false and
  the assertion is skipped. With any change that breaks arrow-key scrolling (for example, removing
  `tabindex="0"` while keeping the focus order through another element), this line would still pass.
- The human decided "AC-16 real scroll checked at HC3", so the AC isn't left without evidence, and
  24rem is an acceptable design on its own (AC-18 doesn't constrain the height; on mobile the region
  still scrolls). That's why this is minor. Still, the automated check now asserts nothing, and a
  production style was tuned for a test-timing issue.
- **Direction (test-engineer):** make the check unconditional and wait for the animation, e.g.
  `await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0)`. Make sure the
  region overflows in that test, either with a viewport height where the seed overflows or with an
  explicit `expect(overflows).toBe(true)` precondition. The frontend-developer can then keep or
  revert the 24rem value on design grounds alone.

### US-03-R1-F04 — Unbounded recursion and spread in the blocks parser (minor)

- `parseInline` calls itself for every `link` child (`rich-text-blocks.ts:44`) with no depth limit.
  Lists are capped at 6 levels, but inline nesting isn't. A body with `link` nested 200 000 levels
  throws `RangeError: Maximum call stack size exceeded`.
- `Math.min(...levels)` (`:131`) spreads one argument per heading. 300 000 headings throw
  `RangeError`.
- `parseTerms` runs inside `map` in `TermsApi.load` (`terms-api.ts:22`), so the throw becomes an
  observable error. The page shows the **error** state with "Reintentar" for every entry, including
  a well-formed older one that should have been shown. Spec §7.2 says a malformed entry is skipped
  with a warning.
- Strapi's blocks validator rejects these shapes when they're saved through the admin or REST (link
  children are text nodes), so this only matters if the database or the API is compromised. That's
  why this is minor (defence in depth). No XSS path exists either way.
- **Direction:** cap the inline recursion (Strapi allows no nesting below `link`, so one level is
  enough) and reduce the heading levels with a loop. Alternatively, catch inside `parseItem` so that
  any exception skips only that entry with a value-free warning. Add a unit row for each case.

### US-03-R1-F05 — Editor guidance on supported formatting is missing (minor)

ADR-0009 accepts that links, images, quotes and code blocks typed in the admin are flattened or
dropped "silently for the editor". The mitigation it records is a README section for editors that
lists what the site renders (paragraphs, headings, bulleted and numbered lists, bold, italic,
underline, strikethrough) and what it drops. `git diff main...HEAD -- README.md` is empty. Add the
section in Spanish or English, whichever the README uses for the business team, so editors know
before HC3.

### US-03-R1-F06 — Stale status text (nit)

- `adr/README.md:40-42`: "Proposed on 2026-11-21 for US-03 (HC2 pending) …". Both ADRs are Accepted
  (index rows 0008/0009 are correct).
- `specs/US-03/spec.md:10`: "**Needed:** simulated payment design …; terms rich-text format …". The
  spec doesn't list ADR-0008/0009 as related, so `scripts/trace.sh US-03` prints
  `Related ADRs (from spec): ADR-0001 … ADR-0007`. A spec revision (spec-writer) can update the
  header without changing any AC (both ADRs declare "Spec impact: none that changes an AC").
- `specs/US-03/tasks.md` T-01/T-02 still say "ADR-0008 Proposed … HC2 pending". The Gate history
  row says Accepted.

## Focus items requested by the orchestrator

1. **`term` / `/api/terms` security:** no finding. Drafts never leak on any probed path, case,
   publication parameter, filter, non-Bearer header or entry point. findOne and writes are 403 on
   Strapi; the proxy is GET/HEAD-only (405) and refuses `Authorization` (400). `populate` exposes
   only the published country. The public role holds exactly four `find` permissions (read from the
   admin API). The router uses a fresh `publishedOnlyConfig()`.
2. **XSS / ADR-0009:** no XSS finding. Content reaches the DOM only through text interpolation, and
   every hostile body is rendered literally or dropped. Robustness gap: F04.
3. **ADR-0008:** conforms. No `HttpClient` in the gateway; no request between activation and
   confirmation (component `HttpTestingController.verify()` and e2e). No card fields or
   `autocomplete="cc-*"`; three form controls only. All three double-submit layers are present
   (`processing` is set before any `await`; the gateway `inFlight` flag; `aria-disabled` plus early
   returns, with natively disabled checkbox and fieldset). `DestroyRef` aborts the controller, and
   the delay clears its timer and rejects. The page returns on `signal.aborted`, so nothing is
   cleared or drawn. Order on approval: number → `clearQuote()` → `confirmed` → title → focus.
   Nothing is cleared on rejection. `COT-<CC>-<local YYYYMMDD>-<6 digits>` comes from `CLOCK` and
   unbiased `crypto.getRandomValues` sampling (limit 4 294 000 000 < 2³², a multiple of 10⁶). The
   status region sits outside the `aria-busy` subtree, as does the rejection alert next to "Pagar".
   "Pagar" keeps focus. On confirmation, focus goes to the h1 after render. No `@defer`.
4. **a3f186c:** see F02 (minor; needs an ADR-0003 implementation note and `clearStorage()`
   instead of `return`). No US-01 test regressed.
5. **8daae83:** see F03 (minor; the AC-16 automated scroll evidence is vacuous. The fix is a
   polling, unconditional assertion, not a CSS change).
6. **Terms error state with its own alert instead of `LoadError`:** correct and intended.
   `LoadError` moves focus to "Reintentar" in `afterNextRender` (`shared/load-error.ts:30`), while
   spec §8 requires the focus to stay on the h1 for the terms error ("the error is not caused by
   the user"). The local `role="alert"` paragraph plus a "Reintentar" button meets the spec, and
   `summary-page.spec.ts` › "US-03-AC-12 … the focus stays on the heading" covers it. The
   duplication is small. If it grows, an input on `LoadError` (for example to opt out of the focus
   move) would remove it. No finding.
7. **Test quality / d530005:** no weakening. In `summary-page.spec.ts:900`, `not.toContain('1012345678')`
   became `toBeNull()`, which is stricter. In `static-guards.spec.ts:72-76`, the old
   `endsWith('payment-gateway.ts')` matched both files, so `toHaveLength(1)` could never pass. It
   now checks **both** files by exact basename, which widens the guard. Overall the tests assert
   behaviour through roles, names, routes, storage and recorded requests. A mental mutation of each
   double-submit layer, of `clearQuote`, of the mask's k, of the abort path and of the
   timeout is caught by at least one test. The exception is F03.

Scope: no change outside the story's spec. Production and test commits are separate and come from
the right roles (test-engineer: `67462f5`, `f5878f4`, `d530005`; strapi-developer: `eb0f059`;
frontend-developer: `2ddf444` … `8daae83`). Every `feat`/`fix`/`test` commit has a `Refs:` trailer.
No dependency changed. Seed and fixtures are fictitious and in Spanish; code, comments and docs
are in English.

## Summary

Open: 0 blocker, 1 major (F01), 4 minor (F02–F05), 1 nit (F06).
