# US-03 — Code review, round 2

| Field | Value |
|---|---|
| Story / spec | US-03 · `specs/US-03/spec.md` (version 0.1, Approved; §7.3 seed rule added after review R1, human decision) |
| Branch / commit reviewed | `feat/us-03-summary-payment` @ `d4b91e0` (10 commits since R1 `ed0756e`) |
| Reviewer | code-reviewer subagent (Claude Opus 5.5) |
| Date | 2026-11-21 |
| Verdict | **APPROVED** (0 blocker, 0 major; 1 new nit) |

Reviewed against spec v0.1 (including the §7.3 seed rule and the Review log row of 2026-11-21),
`tasks.md` (Gate history: "Review R1 decisions", "Gate (attempt 2)"), ADR-0003, ADR-0008, ADR-0009,
the `adr/README.md` implementation notes, `CLAUDE.md`, and review round 1.

## Automated checks (run by the reviewer)

| Check | Command | Result |
|---|---|---|
| Lint (frontend) | `npm run lint` | exit 0 |
| Build (frontend) | `npx ng build` | exit 0 (initial total 382.27 kB) |
| Unit (frontend) | `npx ng test --watch=false` | **956 passed / 0 failed** (28 files) |
| Lint (backend) | `npm run lint` | exit 0 |
| Typecheck (backend) | `npx tsc --noEmit -p .` | exit 0 |
| Tests (backend) | `npm test` | **86 passed / 0 failed** (4 files) |
| E2E | `docker compose -p us03-review-r2 up -d --build --wait` (fresh volume), then `scripts/e2e.sh` | **124 passed / 0 failed** (1.1 min). AC-16 test re-run `--repeat-each=3`: 3 passed. Stack removed with `down -v` afterwards |
| Traceability | `scripts/trace.sh US-03` | before this report: exit 1, only because R1-F01 (major) was still `open` in R1; ACs without tests 0; AC-18 manual (per spec); "Related ADRs (from spec)" now lists ADR-0001 … ADR-0009. After this report: see Summary |
| Secrets | `scripts/scan-secrets.sh` | exit 0 · 317 files · 6 explicit exceptions, all pre-existing (`backend/tests/helpers/strapi.ts:40-43`, `frontend/e2e/us-01-security.spec.ts:146,272`); none new |
| Dependencies | `git diff ed0756e..HEAD --stat` | no `package.json` or lockfile change |

## Verification of previous round

| Finding | Severity | Fix commit | Status | Notes |
|---|---|---|---|---|
| US-03-R1-F01 | major | `6d4b236` (seed); tests `092edd3`; rule in `6341a57` (spec §7.3, §11, `seed-terms.md`) | fixed | Live reproduction repeated, details below: renamed + published CO terms survive a restart; deleted + new terms with another title survive a restart and are shown on `/co/resumen`; a country with only a draft gets nothing (site shows the "no disponibles" state, as the rule implies); control: deleting every CO document and restarting seeds the annex again (log `Seed: created terms CO/…`, both documents). Backend tests (a)–(d) plus the per-country test pass, and each would fail under the old natural-key seed or under a published-only existence check |
| US-03-R1-F02 | minor | `b3fdd45`; ADR-0003 note `6341a57`, `54963e8` | fixed | `persist()` now calls `clearStorage()` for an empty state (`quote-store.ts:169-172`). Every line citation in the `adr/README.md` ADR-0003 note matches the file at HEAD: `persist` 163-178, empty branch 169-172, call 170, `clearStorage` 180-186, `prune` 88-98, `enterCountry` 42-51, `clearQuote` 58-64. The note records the US-01 behaviour change. `quote-store-prune.spec.ts` would fail with the old `return` (prune-to-empty test expects `getItem` null) |
| US-03-R1-F03 | minor | test `092edd3`; CSS kept (design decision in Gate history) | fixed | The AC-16 check is now unconditional: it sets `max-height: 80px` on the region, asserts overflow as a precondition, and polls `scrollTop > 0`. Mutations on the served bundle (the container only, restored afterwards): `overflow-y: hidden` on `.terms` → fails at `full-flow-co.spec.ts:677` (`Received: 0`); `tabindex="0"` removed → fails on the Tab order (`toEqual`). Unmutated: 3/3 pass. The inline height override means the test proves keyboard scrolling, not the production height; that is fine, since the height is a design choice (24rem is acceptable; the region still scrolls at 360×740 per R1) and real scrolling is an HC3 check by human decision |
| US-03-R1-F04 | minor | `461500b`; tests `092edd3`, `398fbd3` | fixed | A link inside a link is dropped with `link-depth` (recursion depth ≤ 2); `Math.min(...levels)` replaced by a loop. Own hostile bodies through a bundled `parseTerms`: link nested 200 000 levels, link chain inside a list item, 200 000-deep list nesting, 200 000-deep nested arrays, 1 000 000 headings (146 ms), 1 000 000 spans in a paragraph and inside a link, heading levels `-0`/`NaN`/`Infinity`/`1e308`/`"1"`/`null`, `__proto__` keys, markup in text: **no throw**; malformed entries are skipped and the older well-formed one is shown; warnings carry no text or URL. Mutation checks: without the link guard, 10 000 levels already throws `RangeError` in Node, so the unit test catches it (and `terms.spec.ts` checks the older entry is shown); a 200 000-argument spread throws (`RangeError` from 125 000), so the headings test catches a regression. `398fbd3` only changed how a test builds its input (no assertion change) |
| US-03-R1-F05 | minor | `16b77a3` | fixed | README section "Editing the terms and conditions (for editors)". Every rendering row checked against `rich-text-blocks.ts`, `rich-text.ts` and `summary-page.html` (paragraphs; headings from `headingLevel` 4, one below the `h3` title, capped at `h6`; lists to 6 levels with deeper ones dropped; four marks; link text only; quote/code as paragraphs; inline `code` mark ignored; images dropped; newest published wins; drafts never shown; the seed rule). One wording slip: see R2-F01 (nit) |
| US-03-R1-F06 | nit | `6341a57`, `54963e8` | fixed | No "HC2 pending" / "Proposed on 2026-11-21" text left in `adr/README.md` or `specs/US-03/`; spec header, Sources, §7.1, §7.2, §10, §11 cite ADR-0008/0009 as Accepted; T-01/T-02 updated; `trace.sh` now lists ADR-0008 and ADR-0009 |

### R1-F01 live reproduction (stack `us03-review-r2`, fresh volume, after the e2e run)

Edits made through the admin Content Manager API (the same calls the admin UI makes), as in R1:

| Step | Anonymous `GET /api/terms?filters[country][code][$eq]=CO` | Seed log on restart |
|---|---|---|
| Rename the CO terms to "… Colombia (versión 2027)", publish (200, 200) | one entry, "(versión 2027)" | — |
| `docker compose -p us03-review-r2 restart strapi` | still one entry, "(versión 2027)", same `documentId` and `publishedAt` | no `Seed:` line |
| Delete the CO published terms and the CO "borrador" draft (200, 200); create "Condiciones generales de la póliza de auto – Colombia 2027" and publish (200) | one entry, the new title | — |
| Restart | unchanged | no `Seed:` line |
| Summary page `/co/resumen` (Playwright, valid stored CO quote, plan `total`) | region title "Condiciones generales de la póliza de auto – Colombia 2027", body "Texto ficticio escrito por el equipo de negocio." | — |
| Edge case: unpublish it (only a draft remains), restart | `[]`; the admin still lists only the editor's draft | no `Seed:` line; page shows "Los términos y condiciones no están disponibles en este momento. No es posible pagar." |
| Control: delete that last CO document, restart | the seed CO terms again | `Seed: created terms CO/… Colombia` and `CO/Términos y condiciones (borrador)` |

The edge-case behaviour (only a draft ⇒ no seed, no terms on the site, payment blocked) is what
spec §7.3 states ("Once an editor has any terms for a country, the seed never creates … terms for
that country again"), and AC-12's "none" state handles it. CL was untouched throughout.

## AC verification

No AC implementation changed since R1 except through the fixes above. The R1 table stands, with
these updates:

| AC | Implemented in | Test | Verdict |
|---|---|---|---|
| US-03-AC-11 | `core/quote-store.ts:58-64,163-186` | `quote-store-clear.spec.ts`, `quote-store-prune.spec.ts`, e2e | ✅ (R1-F02 fixed) |
| US-03-AC-12 | `summary-page.ts:121-136`, `shared/terms.ts`, `shared/rich-text-blocks.ts` | `terms.spec.ts` › R1-F04 rows; `summary-page.spec.ts` › AC-12 | ✅ (a hostile entry no longer turns the section into the error state) |
| US-03-AC-14 | `shared/terms.ts:41-48`; seed rule `backend/src/seed/index.ts:72-86` | `terms.spec.ts`; e2e AC-14; `terms-rules.test.ts` › R1-F01 | ✅ (R1-F01 fixed; live check above) |
| US-03-AC-16 | `summary-page.html:92` (`tabindex="0"`, `overflow-y: auto`) | e2e `full-flow-co.spec.ts:668-678`, unconditional | ✅ (R1-F03 fixed; mutation-tested) |
| US-03-AC-18 | `summary-page.css` | manual (HC3) | 🖐 manual |

## Findings

| ID | Severity | Location | Finding | Rule | Status | Resolution commit |
|---|---|---|---|---|---|---|
| US-03-R2-F01 | nit | `README.md:111` | The editor guide says "open **Terms**", but the Content Manager lists the type as **"Términos y condiciones"** (`schema.json` `displayName`, confirmed through `/content-manager/init`). There is no "Terms" entry for an editor to find | ADR-0009 *Consequences* (editor documentation); checklist "small UX inconsistency" | open | |

### US-03-R2-F01 — Wrong admin menu name in the editor guide (nit)

`README.md:111`: "In the Strapi admin, open **Terms** and edit the `body` field." The admin shows the
display name `Términos y condiciones`; the field label `body` is correct (no custom label is
configured). An editor will find the right entry anyway, so this is a nit. Naming the entry as the
admin shows it would fix it.

## Re-review of the diff since R1 (`git diff ed0756e..HEAD`)

- **Seed (`6d4b236`)**: the existence check runs per country on both statuses. In Strapi 5 every
  document has a draft version, so the `published` query is redundant but harmless. It does not
  touch fields, plans or countries. The comment in `seed/index.ts:25-26` ("never … overwrites what
  editors changed") is true now.
- **Store (`b3fdd45`)**: on a country change, `enterCountry` clears storage and then `persist()`
  clears again (idempotent). A state with keys holding `''` is not "empty" and is still written, as
  before. No US-01/US-02 test changed or regressed.
- **Parser (`461500b`)**: the only remaining recursion is `parseList`, which is capped at 6 levels. No
  spread into call arguments remains in `rich-text-blocks.ts`, `terms.ts` or `terms-api.ts`. The
  output and the renderer are unchanged (no new binding, no `innerHTML`).
- **Tests (`092edd3`, `398fbd3`)**: test-only commits by the test-engineer, written before the fixes.
  They assert behaviour (storage, published titles, documentIds, shown entry, scroll position). The
  backend `afterEach` wipes and re-seeds both countries, so later tests see the annex again.
- **Docs (`6341a57`, `54963e8`, `16b77a3`, `28954a3`, `d4b91e0`)**: the spec changes add the human's
  seed rule and status text only; no AC or BR changed. Each change is recorded in the Review log and
  the Gate history. `6341a57` bundles spec-writer, architect and orchestrator edits in one commit, and
  its message says who did which part. `16b77a3` was placed by the orchestrator because no agent's
  write scope covers `README.md`, as its message says. Both are traceable. Neither is a finding.
- **Scope**: no change outside the story and its R1 findings; production and test commits are
  separate; every `fix` commit has `Resolves:` and `Refs:`; no dependency changed; seed and test data
  are fictitious and in Spanish; code, comments and docs are in English.

## Summary

Open: 0 blocker, 0 major, 0 minor, 1 nit (R2-F01). All six R1 findings are fixed.
