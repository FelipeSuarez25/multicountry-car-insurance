# Third-party skill evaluations

Every external skill is evaluated **before** installation. Each one is read from its
source repository (not from a registry summary) and checked against the project
requirements and our own conventions (`CLAUDE.md`, `AGENTS.md`, `.claude/skills/`).
Only a human can approve an installation. Approved skills are recorded in
`.claude/skills/THIRD_PARTY.md`.

Verdict scale: **ADOPT** · **ADOPT WITH ADJUSTMENTS** · **REJECT**.

---

## EVAL-001 — `angular-developer` from angular/skills

| Item | Value |
|---|---|
| Evaluation date | 2026-11-20 |
| Evaluated by | Claude Code (Opus 5.5), main session |
| Source URL | https://github.com/angular/skills (path `angular-developer/`) |
| Evaluated commit | `97c663a02b376a19eccc60f75909f20f15a2c9c1` (2026-11-20 17:10 UTC) |
| Upstream origin | Generated from `angular/angular` → `skills/dev-skills/`, upstream commit `8b15295e8c7f1543d41dadb5955279702be52c16` (see `BUILD_INFO`) |
| Author | Google LLC / Angular team (`metadata.author: Copyright 2026 Google LLC`) |
| Skill version | `1.0` (frontmatter, so it is not useful for pinning; we pin by commit) |
| License | MIT, declared in the SKILL.md frontmatter. The mirror repo has **no LICENSE file** and GitHub reports `license: null`. The upstream `angular/angular` repo is MIT. |
| Status | **Active.** Not archived; synced from `angular/angular` several times a day (last push 2026-11-20). |
| Files read | `SKILL.md` (150 lines) + 44 reference files (5,171 lines). Read in full: `SKILL.md`, `testing-fundamentals.md`, `e2e-testing.md`, `mcp.md`, `reactive-forms.md`, `naming-conventions.md` (core rules), `signal-forms.md` (all key sections). The remaining references were scanned by pattern (see the security section). |

### Criteria reviewed

#### 1. Compatibility with project requirements

Latest stable Angular at evaluation time: **22.3.0** (npm `latest`; `next` = 22.3.0-rc.0).
The assessment requires Angular 21 or later, so 22.x qualifies.

| Requirement | Result | Evidence |
|---|---|---|
| Angular 21+ / latest stable | ✅ | Targets "latest versions"; tells the agent to detect the project's version first (SKILL.md rule 1). |
| Standalone, no NgModules | ✅ | `components.md`: standalone is the default since v19. `NgModule` appears only in the standalone migration guide and in `TestBed` explanations. |
| Signals | ✅ | `signal`, `computed`, `linkedSignal`, `resource`, `httpResource`, signal inputs, outputs and queries. |
| Built-in control flow `@if/@for` | ✅ | All templates use `@if/@for/@switch`; no `*ngIf/*ngFor` anywhere. |
| Vitest | ✅ | `testing-fundamentals.md` assumes Vitest, zoneless, and an "Act, Wait, Assert" pattern with `await fixture.whenStable()`. `cli.md` still mentions Karma as a possible runner (neutral). |
| Playwright | ⚠️ Neutral | `e2e-testing.md` lists 5 frameworks and suggests `ng add playwright-ng-schematics`, a community package, not an official Angular one. It does not conflict, but it brings no Playwright guidance of its own. |
| Keyboard accessibility | ⚠️ Partial | `angular-aria.md` covers keyboard interaction for complex widgets (listbox, combobox, tabs…). Nothing on wizard focus management, focus on errors or `aria-describedby` for field errors. Our `review-checklist` must still cover this. |

#### 2. Conflicts with our CLAUDE.md and own skills

| # | Rule in the skill | Conflict | Resolution |
|---|---|---|---|
| C1 | `signal-forms.md`: "You MUST use Angular's new Signal Forms API for all form-related functionality" and "Do NOT import FormControl, FormGroup…" | It decides the forms strategy before our ADR does, and it contradicts `SKILL.md`, which allows Reactive Forms for complex or existing forms. | Precedence rule in `CLAUDE.md`: **CLAUDE.md > accepted ADRs > own skills > third-party skills**. The forms ADR decides. |
| C2 | SKILL.md rule 2 / `ng new`: "do not specify a version unless prompted"; falls back to `npx @angular/cli@latest` | Non-reproducible scaffolding. | `CLAUDE.md` pins the CLI version (`npx @angular/cli@22.3.x`). The skill's own Step 1 honours an explicit version. |
| C3 | `mcp.md`: configure the Angular CLI MCP server via `npx -y @angular/cli mcp` | User rule: no external tools; all context lives in the repo. | `CLAUDE.md`: do not configure MCP servers. The file stays unmodified so provenance is preserved, but it is not followed. |
| C4 | SKILL.md: "read the documentation at angular.dev" when the references are not enough | Remote reads; the context should live in the repo. | Read-only reads of `angular.dev` are allowed, but any decision based on them must be written into a spec or ADR. |
| C5 | `naming-conventions.md`: v20+ suffixless naming ("Intent over Role"), but also "respect existing project conventions"; its own examples are inconsistent (`auth.ts` → `class AuthService`) | Ambiguous until we decide. | `CLAUDE.md` states the naming convention explicitly (proposal: v22 CLI defaults, suffixless files). |
| C6 | `e2e-testing.md`: `ng add playwright-ng-schematics` | Pulls in a community dependency. | Playwright setup follows our `test-from-spec` skill (`@playwright/test` directly). The schematic is not used unless a human approves it. |
| C7 | SKILL.md rule 3: run `ng build` after generating code | None. It matches our automated gate. | Keep. |

No conflict with `sdd-spec`, `adr-madr`, `strapi-content-modeling` or `review-checklist`.
`dynamic-form-fields` and `test-from-spec` are **complementary** (see criterion 4).

#### 3. Security: commands, remote content, anything suspicious

- **No scripts, binaries or hooks.** Only Markdown files plus `BUILD_INFO`.
- Commands found: `ng build/test/e2e/add/generate`, `npx @angular/cli@<version> new`,
  `npx @angular/cli@latest new`, `npx -y @angular/cli mcp`. The `npx` calls download npm
  packages when executed; this is covered by C2 and C3.
- External domains: only `angular.dev` (docs), `api.example.com` (examples) and `localhost`.
- No hidden or bidirectional Unicode characters, no base64, no `curl | sh`, no instructions
  aimed at secrets, credentials or files outside the project.
- **Supply-chain note:** the content changes daily and `npx skills add` installs whatever
  is at HEAD, not the evaluated commit. Mitigation: after installation, diff the installed
  files against commit `97c663a`. If they differ, stop and re-evaluate.
- Licensing: MIT requires keeping the copyright notice. Because the mirror has no LICENSE
  file, `THIRD_PARTY.md` must record the notice and point to the upstream license.

#### 4. Value beyond our own skills and CLAUDE.md

| Area | Our coverage | What angular-developer adds |
|---|---|---|
| Signal Forms API (`form`, `[formField]`, `validate`, `applyEach`, `applyWhen`, `submit`, `validateStandardSchema`) | `dynamic-form-fields` covers the Strapi→validator **contract**, not the API | **High.** Up-to-date API reference with a "Common pitfalls" table and a section on recovering from build errors. This is where an LLM is most likely to hallucinate an API that only reached stable in v22. |
| Zoneless, async-first unit testing with Vitest | `test-from-spec` covers AC-ID naming and Gherkin→test mapping | **High.** Correct `whenStable()` patterns; avoids `detectChanges()` anti-patterns. |
| `resource` / `httpResource`, `linkedSignal`, `effect` guidance | Not covered | **Medium-high.** Loading and error states for Strapi calls (graded under "technical quality"). |
| Runtime configuration (`provideAppInitializer`) | Not covered | **Medium.** Relevant because the same build must serve CO and CL and point to Strapi at runtime. |
| Routing, guards, `@defer`, `@boundary` error boundaries | Not covered | **Medium.** Wizard step guards and error isolation. |
| SSR, Tailwind, animations, MCP, deployment | Not needed | None, but harmless because they load on demand. |

#### 5. Signal Forms vs Reactive Forms (input for the forms ADR)

**What the skill says**

- `SKILL.md`: "Use Signal Forms for form management in new projects (stable in Angular v22
  and newer)." Prefer Signal Forms for new forms on v22+. For older apps or existing forms,
  keep the current strategy. Reactive Forms are listed for "complex forms".
- `signal-forms.md`: Signal Forms are "the recommended approach… (v21+)". It **mandates**
  them for all forms and forbids `FormControl/FormGroup/FormBuilder`.
- This is an **internal inconsistency**: "v21+ / MUST" against "v22+ / prefer". We checked
  the official source instead of trusting either statement:

**Verified facts (latest stable 22.3.0)**

- `angular/angular` CHANGELOG, **22.0.0 (2026-06-03)**, forms: commit `7745365910`,
  *"graduate signal forms APIs to public API"*. In v21 they were experimental.
- Published `@angular/forms@22.3.0` typings: all `@angular/forms/signals` APIs are tagged
  `@publicApi 22.0` (one is `22.1`). The only `@experimental` symbol is
  `provideExperimentalWebMcpForms`, which we do not need.
- `@angular/forms/signals-compat` (`@publicApi 22.0`) provides `compatForm` and
  `SignalFormControl` to interoperate with Reactive Forms.
- The schema API we need is exported: `required`, `min`, `max`, `pattern`, `validate`,
  `applyEach`, `applyWhen`, `metadata`, `validateStandardSchema`, `submit`.

**Implications for a Strapi-driven dynamic form (to be weighed in the ADR)**

- ➕ The form structure is derived from a model signal, so a model built at runtime from the
  Strapi field config plus a schema function that loops over the config is a natural fit.
  Custom rules (legal age, vehicle year range) map to `validate()`. Strapi error messages
  map to `ValidationError.message`.
- ➕ Signal-native state (`valid()`, `touched()`, `errors()`) fits a signals-only wizard
  and avoids `toSignal` bridges.
- ➖ The model shape is only known at runtime, so typing degrades to `Record<string, …>`.
  The "typed validations" requirement then depends on a typed **config** contract, not on
  the form type.
- ➖ The skill's rules: no `null` values (use `''`/`0`), no `<select multiple>`, checkboxes
  bind only to booleans, and no `min/max/value` attributes on inputs. "Required number with
  initial value `0`" and empty date fields need a spike to confirm behaviour.
- ➖ It has been stable for only about 5 months. Reactive Forms (`FormRecord`) remain the
  proven path for dynamic forms and are still supported (`ReactiveFormsModule` is imported
  into a standalone component; we author no NgModules).

### Verdict: **ADOPT WITH ADJUSTMENTS**

**Reasons:** it is official, active, MIT, has no executable content, and is aligned with
Angular 22 (standalone, signals, control flow, Vitest, zoneless). Its main value is an
up-to-date Signal Forms and testing reference that our own skills do not provide and that
models tend to get wrong. The conflicts (C1–C6) can all be resolved with precedence and
explicit rules in `CLAUDE.md`, without editing vendored files.

**Required adjustments, if approved:**

1. Install only `angular-developer`, at project scope, and verify that the installed files
   match commit `97c663a` (diff). On mismatch, stop and re-evaluate.
2. Record the source, commit, upstream commit, license and copyright notice in
   `.claude/skills/THIRD_PARTY.md`.
3. Add the precedence rule to `CLAUDE.md` (CLAUDE.md > accepted ADRs > own skills >
   third-party) and the explicit overrides C1–C6.
4. Do not modify vendored files. Overrides live in `CLAUDE.md`, so a future update is a
   clean diff to re-evaluate.
5. Grant it to `angular-developer`, `test-engineer`, `code-reviewer` and `architect` (forms
   ADR only). Do not grant it to `spec-writer` or `strapi-developer`.

### Human decision

Decision: ADOPT WITH ADJUSTMENTS — approved by Felipe Sabogal, 2026-11-20.
- Vendor the skill at the evaluated commit 97c663a (no install from HEAD).
- Precedence rule in CLAUDE.md: CLAUDE.md > accepted ADRs > project skills > third-party skills.
- Forms choice is NOT taken from the skill: it will be decided in an ADR after a spike
  (Signal Forms vs Reactive Forms: required numbers, empty dates, typing).
- Pin Angular CLI version (no @latest); MCP server suggestion is not used.
- Keyboard a11y for the wizard stays under our review-checklist.
- analogjs/angular-skills: REJECTED (deprecated, empty SKILL.md files, stale guidance).

### Installation record

- Method: `git archive` of `angular-developer/` at commit
  `97c663a02b376a19eccc60f75909f20f15a2c9c1` into `.claude/skills/angular-developer/`.
  `npx skills add` was **not** used, because it installs HEAD.
- Verification (2026-11-20): the git blob hash of each of the 45 installed files equals
  the blob in the commit tree, and the installed directory tree hash
  `e3c937cb89b58606003f30ef14e42a395c14810e` equals `97c663a:angular-developer`.
- Provenance: `.claude/skills/THIRD_PARTY.md`.

---

## EVAL-002 — analogjs/angular-skills (rejected alternative)

| Item | Value |
|---|---|
| Evaluation date | 2026-11-20 |
| Source URL | https://github.com/analogjs/angular-skills |
| HEAD commit | `18996fd1b2bf663c978065a8d5417393e72ccc6a` (2026-08-06), "Remove skill guidance, leaving deprecation tombstones" |
| License | MIT |
| Status | **Deprecated.** Repo description: "DEPRECATED - use the official Angular skills at https://github.com/angular/skills instead". The README states it is no longer maintained. Not archived. |

### Findings

- All 10 `SKILL.md` files (`angular-component`, `-di`, `-directives`, `-forms`, `-http`,
  `-routing`, `-signals`, `-ssr`, `-testing`, `-tooling`) are about 1 KB tombstones. The
  guidance was removed and only a deprecation notice with a redirect to angular/skills
  remains.
- **Additional risk:** the frontmatter `description` fields still contain the old triggers
  (for example `angular-forms`: "…Signal Forms are experimental but recommended…"). If
  installed, they would activate on form tasks, load no guidance, and carry an outdated
  claim (Signal Forms have been stable since v22.0).

### Verdict: **REJECT**

It is deprecated, contains no guidance, and its own maintainers redirect to angular/skills,
which is evaluated in EVAL-001.

### Human decision

REJECTED — approved by Felipe Sabogal, 2026-11-20 (recorded in the EVAL-001 human decision).
