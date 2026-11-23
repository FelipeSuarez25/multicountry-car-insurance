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

---

<!-- Evaluations for US-04 (2026-11-21). Drafted by a read-only research subagent; key claims re-verified by the orchestrator. -->

## EVAL-003: `ui-ux-pro-max` from nextlevelbuilder/ui-ux-pro-max-skill

| Item | Value |
|---|---|
| Evaluation date | 2026-11-21 |
| Evaluated by | Claude Code (Opus 5.5), subagent for the main session |
| Source URL | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (path `.claude/skills/ui-ux-pro-max/`) |
| Installed copy | Global user skills directory, 36 files, 2.4 MB, installed 2026-06-25 21:49 UTC |
| Lock entry | `skillFolderHash 11aeea42e2c5cae6f68f809db6b663dbed062105` |
| Matched commit | **`d86f44368dd412f3de1b05c5ef48c8184569096b`** (2026-06-25 11:30 UTC, "fix(scripts): force UTF-8 stdout/stderr in design_system.py on Windows (#390)") [V] |
| Latest upstream commit | `f76d1653d7467fc11fb9d9d79295a421c92ab958` (2026-11-21, "feat: add form error-handling UX guidelines (rows 131-141) (#587)"), 48 commits on the skill since the match [V] |
| Author | Next Level Builder (`LICENSE`: "Copyright (c) 2024 Next Level Builder") |
| License | **MIT** at the matched commit: root `LICENSE` exists (blob `1e71cbf`), GitHub SPDX `MIT` [V]. The SKILL.md frontmatter has no `license` field, and the skill folder has no license file [V]. |
| Activity | Not archived. About 152k stars, 16k forks, 85 open issues, last push 2026-11-21 [V] |
| Files read | `SKILL.md` (660 lines) in full. All three scripts (`search.py`, `core.py`, `design_system.py`) scanned in full for I/O, network, environment and subprocess use, with the relevant functions read. `data/_sync_all.py` read. Every CSV sampled: headers, row counts, rows relevant to US-04 (Angular stack, UX guidelines, the insurance palette, typography, icons). |

### How the installed copy was matched (it is not what the lock hash says)

- Upstream, `.claude/skills/ui-ux-pro-max/` holds `SKILL.md` plus two **symlinks**, `data` and
  `scripts`, pointing to `../../../src/ui-ux-pro-max/{data,scripts}` [V]. The installer dereferenced
  them, so the git tree hash of the installed folder is `73f51effc010ed93654c213543737b2298fa9544`,
  not the lock's `11aeea4…` [V].
- The lock's `11aeea4…` is the tree that holds the symlinks. That tree is **identical across
  `7538cfb`…`090a405`** (2026-06-21 to 2026-06-25), because data changes behind a symlink do not
  change it [V]. **The lock hash does not identify the content.**
- Per-file blob comparison of installed `data/` + `scripts/` against `src/ui-ux-pro-max/` at every
  upstream commit: 0 differing files at `d86f443`, `e3a7f27` and `9fd25fe`. Of those, only `d86f443`
  also matches the installed `SKILL.md` and predates the install time [V]. So **`d86f443` is the
  match**.
- Consequence for vendoring: `git archive` of `.claude/skills/ui-ux-pro-max` alone would ship two
  dangling symlinks. Vendoring would have to dereference `src/ui-ux-pro-max/` [I]. At HEAD the
  folder holds real files, not symlinks [V].

### What the skill instructs

- **Mandatory triggers** for any UI work ("This Skill must be invoked…", SKILL.md:16-24).
- A 10-category priority table and a long **Quick Reference** of rule IDs (SKILL.md:48-300):
  accessibility, touch, performance, style, layout, typography and colour, animation, forms,
  navigation, charts. This is the useful part.
- **Workflow:** "Step 2: Generate Design System (REQUIRED)". Run
  `python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system` (SKILL.md:363-368), then
  domain and stack searches. The path is relative and wrong for an install under `.claude/skills/` [V].
- **The stack is hard-coded to React Native:** "Stack: React Native (this project's only tech stack)"
  (SKILL.md:361), "Step 4: Stack Guidelines (React Native)" (SKILL.md:441), and "Always add
  `--stack react-native`" (SKILL.md:536). The "Common Rules" and the pre-delivery checklist are
  scoped to "App UI (iOS/Android/React Native/Flutter)" (SKILL.md:564, 624) [V].
- **Prerequisites:** it tells the agent to install Python with `brew install python3`,
  `sudo apt update && sudo apt install python3` or `winget` (SKILL.md:316-331) [V].
- **Persistence:** `--persist` writes `design-system/<slug>/MASTER.md` and `pages/*.md` into the
  current working directory (SKILL.md:382-414) [V].
- The description advertises a "shadcn/ui MCP" integration; the body has no MCP setup [V].
- **Tool requirements:** Bash and Python 3 (standard library only) [V].

### Scripts (every file)

| File | Behaviour | Risk |
|---|---|---|
| `scripts/search.py` | CLI entry point. Parses arguments and calls `core.search`, `core.search_stack` or `design_system.generate_design_system`. Prints results. Re-wraps stdout and stderr as UTF-8 (`:23-26`). [V] | Low |
| `scripts/core.py` | BM25 search over the CSVs in `DATA_DIR = Path(__file__).parent.parent / "data"` (`:14`). Read-only `open(...,'r')` (`:170`). No network, environment, subprocess or eval. [V] | None |
| `scripts/design_system.py` | Builds the recommendation from the CSVs. Reads env `COLORTERM` (`:265`), only to colour terminal swatches. **Writes files** in `persist_design_system()`: `base_dir = Path(output_dir) if output_dir else Path.cwd()` (`:582`), `mkdir(parents=True)` (`:595-596`), and it **overwrites** `MASTER.md` and page files without a check (`:602-611`). No network or subprocess. [V] | Medium: unguarded writes into the current directory (the project root when run from there) |
| `data/_sync_all.py` | Maintainer tool. **Rewrites the skill's own `colors.csv` and `ui-reasoning.csv`** in place (`:240-243`, `:399-402`). No network. [V] | Medium: running it mutates vendored files |
| `data/*.csv`, `data/stacks/*.csv` | Data only. `design.csv` (1,776 lines) and `draft.csv` (1,779 lines) are Chinese-language prose style prompts with the header "此文件仅作为设计备份/参考文档，当前搜索引擎与 CLI 不会读取" (backup and reference only; the engine and CLI do not read it) [V]. `core.py` `CSV_CONFIG` does not reference them [V]. | None (dead weight, 210 KB) |

No script makes network calls, launches a browser, executes a shell, downloads code or reads
secrets [V]. URLs appear only as data: 1,923 `fonts.google.com` specimen links, 148
`fonts.googleapis.com` CSS URLs, and documentation links [V].

### Data quality relevant to US-04

- **Palettes fail WCAG AA at the matched commit.** WCAG contrast computed for all 161 rows of
  `colors.csv` [V]:

  | Pair | Rows below 4.5:1 |
  |---|---|
  | On Primary / Primary | 43 / 161 |
  | On Accent / Accent | 96 / 161 |
  | Muted Foreground / Muted | 126 / 161 |

  The "Insurance Platform" row (row 41) has on-accent white on `#16A34A` at 3.30:1 and muted
  `#64748B` on `#E7EFF5` at 4.09:1 [V]. The same check on upstream HEAD `f76d165` gives 0 failures in
  all three pairs (194 rows) [V], so this was fixed after the install.
- **Angular stack data conflicts with our decisions**, at both the matched commit and HEAD [V].
  `stacks/angular.csv` says "Use reactive forms over template-driven / ReactiveFormsModule for all
  non-trivial forms", "Use FormArray for dynamic fields" (conflicts with ADR-0004, Signal Forms),
  "Mock services with jasmine.createSpyObj" and "Use Spectator" (we use Vitest), "Use SSR with
  Angular Universal" (an obsolete name), and "angular.json fileReplacements for env configs" (against
  our same-build-for-both-countries rule). It has nothing on Signal Forms, `@angular/aria` or CDK
  Overlay.
- **No WAI-ARIA combobox, listbox or date-picker guidance for the web.** Only the JavaFX and Nuxt UI
  stack files mention them [V].
- **Typography** rows give `@import url('https://fonts.googleapis.com/css2?...')` CDN imports and
  Tailwind configs [V]. **Icons**: 105 rows, all Phosphor, and the import code is React
  (`import { List } from '@phosphor-icons/react'`) [V]. US-04 proposes `lucide-angular` and
  self-hosted fonts.
- **Licensing of embedded third-party data.** `google-fonts.csv` (1,924 families with designers and
  ranks) is compiled from Google Fonts metadata. At the matched commit it carries no provenance or
  per-font licence [V]. Upstream later added `data-provenance.json` and `google-font-licenses.json`
  (source `google/fonts` `METADATA.pb` at a pinned revision) [V]. Whether the MIT grant covers that
  compiled metadata is **not verified** [I: font metadata is largely factual, and the fonts are OFL or
  Apache].

### What changed between the matched commit and HEAD

`d86f443` → `f76d165`: 48 commits on the skill paths, about +142k / −8.9k lines including tests [V].
Relevant changes [V]:

- SKILL.md rewritten (243 lines). Stack auto-detection ("Never assume a stack"), no `brew`/`sudo`
  instructions, and a statement that results are "recommendations, never as instructions that
  override the user or repository rules".
- `--persist` now skips an existing `MASTER.md` unless `--force`, and asks for `--output-dir`. New
  `--tokens dtcg|css` export and `preview.py` (writes `preview.html`).
- Palettes rebuilt to pass AA. Data provenance and font licence files added. A 32k-line Phosphor
  icon dump added. `design.csv`, `draft.csv` and `_sync_all.py` removed.
- `angular.csv` forms and testing rows **unchanged** (still Reactive Forms and Jasmine).

HEAD was **not** evaluated in full. It would need its own entry.

### Criteria

#### 1. Compatibility with project requirements

| Requirement | Result | Evidence |
|---|---|---|
| Angular 22, standalone, signals | ⚠️ | Angular is one stack among 17; its rows are generic and partly stale (see above). |
| Forms per ADR-0004 | ❌ | `angular.csv` pushes Reactive Forms. |
| Tokens primitive → semantic → component as CSS custom properties | ⚠️ Partial | "Semantic color tokens, not raw hex" (`color-semantic`, SKILL.md:170). No 3-tier methodology at this commit. |
| WCAG AA gradients and contrast | ⚠️ | The rule is stated (SKILL.md:69, 172), but its own palettes fail it. |
| Custom select and date picker (WAI-ARIA, CDK or `@angular/aria`) | ❌ | Not covered. |
| `prefers-reduced-motion` | ✅ | `reduced-motion` (SKILL.md:79), animation section (SKILL.md:179-204). |
| Mobile first, 360 / 768 / 1280 | ⚠️ | It says "mobile-first", but its breakpoints are 375 / 768 / 1024 / 1440 (SKILL.md:146) and the checklist targets native apps. |
| At most 2 font families, loaded efficiently | ⚠️ | Pairs are 2 families, but delivered through the Google Fonts CDN. |

#### 2. Conflicts with CLAUDE.md, ADRs and project skills

| # | Rule in the skill | Conflict | Resolution if adopted |
|---|---|---|---|
| U1 | Stack hard-coded to React Native (SKILL.md:361, 441, 536) | Wrong stack. Every stack query is misrouted. | It would need an override, but a vendored file cannot be edited. |
| U2 | `angular.csv`: Reactive Forms, FormArray | ADR-0004 (Signal Forms) | ADR-0004 wins (CLAUDE.md §1). |
| U3 | `angular.csv`: Jasmine, Spectator, Universal, fileReplacements | CLAUDE.md §4 (Vitest), ADR-0001 (one build) | CLAUDE.md wins. |
| U4 | `brew install`, `sudo apt install` (SKILL.md:316-331) | Installs global tools (CLAUDE.md §3 spirit) | Forbid. |
| U5 | `--persist` writes `design-system/` into the current directory and overwrites | A new root folder outside every agent's write scope. Bash writes bypass the scope hooks (FLOW.md "Known limits"). | Forbid `--persist`. |
| U6 | Google Fonts CDN `@import` in typography data | US-04: fonts "loaded efficiently". CDN requests send each visitor's IP to a third party, and the fonts are not versioned in the repo. | Self-host the fonts (an ADR decides). |
| U7 | Phosphor React icon imports | US-04: one icon library for Angular (`lucide-angular` proposed) | The ADR decides. |
| U8 | `color-palette-from-product`: "Choose palette from product/industry" | Against the story: no copying of real insurers' brands. A generic "insurance blue" is the category default. | Palette per the design-system ADR. |
| U9 | Mandatory triggers on every UI task | It competes with `angular-developer` and the project skills on the same tasks | Restrict the grant (EVAL-001 adjustment 5). |

No conflict with ADR-0009 (the skill does not suggest `innerHTML`) [V: no matches].

#### 3. Security

- No network, browser, subprocess, eval or downloads in any script [V].
- File writes: `design_system.py:582-611` (into the current directory) and `_sync_all.py` (into its
  own data files) [V].
- Environment: reads only `COLORTERM` [V].
- **Supply chain:** the lock hash cannot be used to verify the content (symlinks). Pinning must be
  by commit and by per-file blob hashes of the dereferenced files [V].

#### 4. Value beyond our own skills and the vendored `angular-developer`

| Area | Value |
|---|---|
| Quick Reference rule IDs (a11y, touch 44 px, forms, animation 150–300 ms, exit faster than enter, reduced motion, `number-tabular`, `focus-management`, `error-summary`) | **Medium.** Concise, but it overlaps `review-checklist` and WCAG. We can restate the few missing items ourselves. |
| Palettes and font pairings | **Low.** It fails AA at this commit, pushes the category default, and uses the CDN. |
| Angular stack guidance | **Negative.** It conflicts with ADR-0004 and our toolchain. |
| Select, date picker, combobox | **None.** The vendored `angular-developer` `references/angular-aria.md` already covers `ngCombobox` and `ngListbox` [V]. |

### Verdict: **REJECT** (installed commit `d86f443`)

Reasons:

1. At this commit it is not built for our stack. SKILL.md fixes the stack to React Native and gives
   wrong script paths, and `angular.csv` contradicts ADR-0004 and our toolchain (Reactive Forms,
   Jasmine, Spectator, Universal, fileReplacements).
2. Its distinctive asset is the data, and the data is weak for US-04. 43, 96 and 126 of 161 palette
   pairs fail AA. Fonts come through the Google Fonts CDN. Icons are Phosphor for React. There is no
   combobox or date-picker guidance.
3. Its valuable part, the generic checklist, mostly duplicates `review-checklist` and WCAG. The rest
   would need overrides that cannot be applied without editing vendored files: the stack line, the
   `brew`/`sudo` lines, and `--persist`.

If the human still wants it, a **new evaluation of HEAD `f76d165`** is the path, not this copy. HEAD
fixes the palettes, the stack default and persistence safety, but keeps the Angular forms and testing
conflicts. Vendoring it would need: dereferenced files, only `SKILL.md`, `references/` and `data/`,
no `scripts/`, and overrides U2–U9 in CLAUDE.md §5.

---

## EVAL-004: `impeccable` from pbakaus/impeccable

| Item | Value |
|---|---|
| Evaluation date | 2026-11-21 |
| Source URL | https://github.com/pbakaus/impeccable (path `.agents/skills/impeccable/`) |
| Installed copy | Global agents skills directory (symlinked into the global Claude skills directory), 57 files, 2.2 MB, installed 2026-09-15 03:43 UTC. Skill `metadata.version 4.3.1`, engine `scripts/VERSION` `0.1.5` [V] |
| Lock entry | `skillFolderHash de1582a945304f9d2823f08986a01dd0cc2d2042` |
| Matched commit | **`0a4e72a254f3b175c95b36b82e5f2e60fa63f116`** (2026-09-15 00:46 UTC, github-actions bot, "Sync generated provider output"). The computed tree hash of the installed folder equals the lock hash and `0a4e72a:.agents/skills/impeccable` [V]. |
| Latest upstream commit | `b49177d32788f2dc585c42831d845dacf1ebed2c` (2026-11-18, "Carry engine 0.1.27 checksums into every harness's skill copy"). **148 commits** on the skill folder since the match. Skill 4.10.0, engine 0.1.27 [V]. |
| Author | Paul Bakaus (repository owner); generated output committed by a bot |
| License | **Apache-2.0** (root `LICENSE` at `0a4e72a`, GitHub SPDX `Apache-2.0`) [V]. `NOTICE.md` credits `ehmo/platform-design-skills` (MIT) for `reference/ios.md` and `reference/android.md` [V]. The skill folder has no license file [V]. `scripts/modern-screenshot.umd.js` is a minified third-party bundle **with no licence header**, and NOTICE does not list it [V]. Its upstream licence (modern-screenshot, believed MIT) was **not verified** [I]. `scripts/data/font-index.json` (1.1 MB of glyph metrics for Google Fonts families) has no provenance [V]. |
| Activity | Not archived. About 114k stars, 6.8k forks, last push 2026-11-21. Very high churn: 576 commits on the skill path [V]. |
| Files read | `SKILL.md` in full. `scripts/impeccable` (launcher) in full. `reference/craft-floor.md`, `hooks.md`, `live-setup.md` (setup and CSP sections), `colorize.md`, `animate.md` (motion and a11y sections) read. The other references and the `agents/*.toml` files scanned by pattern and section. `live-browser*.js` scanned for every network, storage and eval site, with the context of each `fetch` read. `impeccable.cmd` not read line by line [I: the Windows twin of the launcher]. |

### What the skill instructs

- **Persona and scope:** "Go all out. No hedging, no shortcuts" and "Dream big and bold"
  (SKILL.md:11-12) [V].
- **Setup step 1, every session:** "Run `<skill-base-dir>/scripts/impeccable context` once per
  session … The launcher runs a self-contained binary that ships next to it or is downloaded once on
  first run" (SKILL.md:17) [V]. A "Launcher unavailable" fallback exists (SKILL.md:21) [V].
- **22 commands** (`shape`, `init`, `document`, `extract`, `critique`, `audit`, `polish`, `bolder`,
  `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`,
  `overdrive`, `clarify`, `adapt`, `optimize`, `live`, `generate`), plus `pin`, `hooks` and `doctor`
  (SKILL.md:41-80) [V].
- **Writes project artifacts:**
  - `PRODUCT.md` and `DESIGN.md` at the project root (`init.md`, `document.md`) [V];
  - `.impeccable/` (config, `design.json`, `mocks/`, `review/`, `build/`, `live/`) [V];
  - hook manifests in `.claude/settings.local.json`, `.codex/hooks.json`, `.cursor/hooks.json` and the
    **committed** `.github/hooks/impeccable.json` (`hooks.md:17`, `:106`) [V].
- **Spawns its own subagents** (`impeccable-finish-reviewer`, `-documenter`, `-asset-producer`,
  `-manual-edit-applier`; `new-work.md:137-145`). It uses image generation for "comps"
  (`visualize.md`, `new-work.md:87-108`) and screenshots desktop and mobile [V].
- **Live mode** injects `<script src="http://localhost:PORT/live.js">` into the app's HTML shell and
  offers to patch the project's CSP for `http://localhost:8400` (`live-setup.md`) [V].
- Unpinned `npx impeccable detect`, `npx impeccable ignores` and `npx impeccable update`
  (`hooks.md:15`, `:65`; `doctor.md:9`) [V].
- **Tool requirements:** Bash/sh, a downloaded native binary, curl or wget, a browser and screenshots,
  optional image generation, structured questions to the user, and subagent spawning [V].

### Scripts (every file)

| File | Behaviour | Risk |
|---|---|---|
| `scripts/impeccable` (sh launcher) | Resolves and **`exec`s an engine binary**, in this order. (1) `$IMPECCABLE_BIN` from the environment, exec'd **without validation** (`:41-42`). (2) A sibling `bin/<os>-<arch>/impeccable`, which is not shipped in the installed copy (`:58-65`). (3) `~/.impeccable/bin/impeccable` (`:71-73`). (4) A version-pinned cache `${IMPECCABLE_HOME:-~/.impeccable}/bin/<VERSION>/` (`:78-81`). (5) Any `impeccable` on `PATH` (`:83-84`). (6) Otherwise it **downloads** `https://github.com/pbakaus/impeccable/releases/download/engine-v0.1.5/impeccable-<os>-<arch>` (base overridable by env `IMPECCABLE_DOWNLOAD_BASE`, `:122`) with `curl -fsSL` or `wget` (`:97-99`). It verifies the download against a `.sha256` fetched **from the same origin** (`:156-158`), then `chmod +x` and stores it in `~/.impeccable/bin/` **outside the project** (`:127`, `:182-196`). It reads env `HOME`, `IMPECCABLE_BIN`, `IMPECCABLE_HOME`, `IMPECCABLE_DOWNLOAD_BASE`, `IMPECCABLE_SKILL_DIR`, `IMPECCABLE_SELF` and `IMPECCABLE_LAUNCHER_PROBE`. [V] | **High:** it runs an opaque native binary, downloaded from the network, cached in the user's home, and whose integrity check trusts the same server. |
| Engine binary (not in the skill) | Built from the Rust `crates/` in the same repository (`cli`, `detect`, `browser`, `context`, `comp`…). Release `engine-v0.1.5` exists, published 2026-09-08, with darwin, linux and windows assets and `.sha256` files [V]. **On this machine `~/.impeccable/bin/0.1.5` and `~/.impeccable/update-check.json` already exist** (keys `lastCheck`, `latestVersion`, `notifiedVersion`), so the engine was downloaded and runs update checks [V]. Its behaviour (file I/O, the localhost server, update checks, any image-API calls) was **not audited**, and reproducibility from source was not checked. | **High / unverified** |
| `scripts/impeccable.cmd` | Windows twin of the launcher [I]. | Same as above |
| `scripts/live-browser.js` (547 KB) | Overlay injected into the user's running app. Uses `fetch` and `EventSource` only to `http://localhost:PORT` with a token: `/source?path=…` (reads project source through the engine), `/manual-edit-stash`, `/annotation` (uploads screenshots), `/agent-target-*`, `/events`, `/status`, `/design-system.json` (lines 3808–12748). It also fetches the page's own stylesheets and fonts (`:8443`, `:8470`). Uses `localStorage` and `sessionStorage`. No third-party hosts [V]. | Medium: dev-only, but it gives a local server read and write access to source, and it requires editing `index.html` and the CSP. |
| `scripts/live-browser-session.js`, `-dom.js`, `-ignores.js` | Browser helpers (session state in `localStorage`, DOM utilities). No network [V]. | Low |
| `scripts/modern-screenshot.umd.js` | Minified third-party DOM-to-image library [V]. | Licence attribution gap |
| `scripts/data/font-index.json`, `font-index-failures.json` | Font metric index used for font matching [V]. | Provenance unknown |
| `scripts/command-metadata.json`, `VERSION` | Data [V]. | None |
| `agents/*.toml`, `agents/openai.yaml` | Codex-format subagent definitions (finish reviewer, documenter, asset producer, manual-edit applier) [V]. | Requires subagent spawning |

### Criteria

#### 1. Compatibility with project requirements

| Requirement | Result | Evidence |
|---|---|---|
| Angular | ⚠️ Framework-neutral | Live-mode tables list React, Next, Nuxt, Svelte and Astro, with no Angular row (`live-setup.md`) [V]. The design guidance itself is CSS-level. |
| Tokens primitive → semantic → component | ✅ | `colorize.md:49` ("Define primitive values and semantic tokens… Theme changes should normally remap semantic roles"), `extract.md:41`, `document.md:45` ("Components may reference primitives; primitives may not reference each other") [V]. |
| WCAG AA, including non-text | ✅ Strong | `colorize.md:55-63`: 4.5:1 body text, 3:1 large text, **3:1 controls, icons and focus indicators**. Check states, overlays and both themes. OKLCH ramp guidance (`:65`) [V]. |
| Reduced motion | ✅ Strong | `animate.md:77`: reduce spatial movement but keep meaningful feedback. `audit.md:15` flags a global `0.01ms` kill switch [V]. US-04 says "no movement", which is compatible. |
| Custom select and date picker | ❌ | No WAI-ARIA combobox or date-picker guidance (only a `critique.md:504` mention) [V]. |
| Microcopy, errors, i18n | ✅ | `clarify.md` (persistent labels, actionable errors), `harden.md` (Intl date, number and currency formats, long strings) [V]. |
| At most 2 families, efficient loading | ✅ | `typeset.md:52` ("Load only used font assets and weights… metric-compatible fallbacks"), and the craft floor's "self-host" [V]. |

#### 2. Conflicts with CLAUDE.md, ADRs and project skills

| # | Rule in the skill | Conflict |
|---|---|---|
| I1 | Setup step 1 runs and downloads a native binary into `~/.impeccable` | CLAUDE.md §3 ("Everything the flow uses is versioned in this repository"; nothing from the global user setup). It is an unpinned, unreviewed executable outside the repository. |
| I2 | `hooks on` writes `.claude/settings.local.json` and the committed `.github/hooks/impeccable.json` | Our hooks (`.claude/hooks/*.mjs`) and settings are project plumbing that only the human changes. A design hook would inject reminders into every agent's context. |
| I3 | Live mode edits `index.html` and patches the CSP | Out of scope for any story agent. It changes the served shell. |
| I4 | `npx impeccable …` with no version | CLAUDE.md §4 (pinned tools; never `@latest` or unpinned `npx`). |
| I5 | Spawns its own subagents | CLAUDE.md §8: subagents cannot spawn subagents (`Agent` is in `disallowedTools`); all delegation is visible in the main session. |
| I6 | `PRODUCT.md`, `DESIGN.md` and `.impeccable/` as "durable product truth" and "visual authority" | It competes with `specs/US-04/spec.md` and the design-system ADR as the source of truth. It sits outside every write scope and outside traceability (CLAUDE.md §9). |
| I7 | "Go all out", "Dream big and bold", `bolder`, `overdrive`, `delight`, image-generated comps | Scope creep against an approved spec (`review-checklist`: "nothing was implemented that the spec does not ask for"). |
| I8 | Self-served detector ignores written by the agent (`hooks.md`, "Triage findings") | A reviewer-independent suppression channel. Exceptions in this project are recorded in the review or spec, not in a tool config. |
| I9 | Image generation and the "use real, verified imagery" stock URLs (`new-work.md:124`) | Fictitious-data and brand rules (CLAUDE.md §3; US-04: no real insurer assets). Remote assets. |

No conflict with ADR-0004 or ADR-0009 (no forms library or `innerHTML` advice) [V].

#### 3. Security

- **Executes an opaque native binary** fetched from GitHub releases on first run, cached in the
  user's home. The checksum comes from the same origin, so it guards against corruption, not a
  compromised release (`scripts/impeccable:122-196`) [V].
- **Environment-controlled exec:** `IMPECCABLE_BIN` is exec'd without a probe (`:41-42`), and
  `IMPECCABLE_DOWNLOAD_BASE` redirects the download (`:122`) [V].
- **Already active on this machine:** an engine cache and an update-check file exist in the user's
  home [V].
- **Writes outside the project** (`~/.impeccable`) and into agent configuration
  (`.claude/settings.local.json`) [V].
- **Churn:** 148 commits and 20 releases in about 2 months on the skill path. The engine went from
  0.1.5 to 0.1.27 [V]. HEAD adds an `engine-checksums.txt` shipped inside the skill (the launcher at
  HEAD verifies against it), which improves the trust chain. That is not in the installed copy [V].

#### 4. Value beyond our own skills

| Area | Value |
|---|---|
| Contrast table incl. 3:1 for controls, icons and focus; OKLCH ramps; tinted secondary text on coloured surfaces (`colorize.md`) | **High** for the design-system ADR |
| Reduced motion as "reduce, not erase feedback", exit faster than enter, no bounce by reflex, animate transform and opacity, `will-change` only during animation (`animate.md`) | **High** |
| Craft floor bans (gradient text, glass as decoration, nested cards, emoji as icons, ghost cards, eyebrow labels), and "browser surfaces" (selection, caret, focus ring, tabular numerals) | **Medium-high:** a review lens for US-04 |
| `clarify.md` and `harden.md` (microcopy, Intl formats, long strings) | **Medium** |
| Select, date picker, CDK, `@angular/aria` | **None** (covered by the vendored `angular-developer` `angular-aria.md`) |

### Verdict: **REJECT** (as a vendored skill)

Reasons:

1. Its required entry point runs a downloaded, opaque native binary from the user's home directory,
   with environment-controlled exec and same-origin checksums. That directly contradicts CLAUDE.md
   §3 and §4. The engine is already cached and doing update checks on this machine.
2. It writes agent and CI configuration (`.claude/settings.local.json`, a committed
   `.github/hooks/impeccable.json`), patches the app shell and CSP for live mode, and keeps its own
   sources of truth (`PRODUCT.md`, `DESIGN.md`, `.impeccable/`). None of these fit our write scopes,
   hooks or traceability.
3. Its workflow assumes subagent spawning, image-generated comps and "go all out" ambition, which
   are incompatible with CLAUDE.md §8 and an approved-spec flow. Excluding `scripts/` and `agents/`
   would still leave a SKILL.md whose step 1 and half of its commands depend on them, and vendored
   files cannot be edited.

**Recommended alternative (no vendoring):** the architect may cite specific principles from
`reference/colorize.md`, `animate.md`, `craft-floor.md`, `clarify.md` and `typeset.md` at commit
`0a4e72a` in the US-04 design-system ADR. Restate them in our own words, credit the source
(Apache-2.0, attribution), and do not copy files.

---

## EVAL-005: `frontend-design` from anthropics/skills

| Item | Value |
|---|---|
| Evaluation date | 2026-11-21 |
| Source URL | https://github.com/anthropics/skills (path `skills/frontend-design/`) |
| Installed copy | Global user skills directory: `SKILL.md` (56 lines) and `LICENSE.txt`, installed 2026-06-25 |
| Lock entry | `skillFolderHash 0d5b74a14bdf3ebcd64f352d06376a2ef05ed296`, plugin name `example-skills` |
| Matched commit | **`2235be7c60b551f5de82ade908fd3816455afcda`** (2026-06-09, "Update frontend-design skill (#1293)"). The computed tree hash of the installed folder equals the lock hash and `2235be7:skills/frontend-design` [V]. |
| Latest upstream commit (skill path) | **`41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`** (2026-09-03, "Update frontend-design skill to avoid generic design defaults (#1713)"), tree `d79e2a5bb4df4a386c2adcdd9ab8709bba28c3f6`. It is unchanged at repository HEAD `e4bb5d9` (2026-11-16) [V]. Only 4 commits ever touched the path. |
| Author | Anthropic |
| License | **Apache-2.0**: `LICENSE.txt` in the skill folder (full Apache 2.0 text, no filled-in copyright line), and frontmatter `license: Complete terms in LICENSE.txt` [V]. The repository has **no root LICENSE**; GitHub reports `license: null` [V]. The README says "Many skills in this repo are open source (Apache 2.0)", and only `docx`, `pdf`, `pptx` and `xlsx` are "source-available" [V]. The licence file covers the whole skill folder. |
| Activity | Not archived. About 198k stars, last push 2026-11-16 [V] |
| Files read | Both versions of `SKILL.md` in full; `LICENSE.txt` |

### The second copy (plugin marketplace)

The claude-plugins-official marketplace copy (`plugins/frontend-design/`, plugin.json
`version 1.1.1`) has SKILL.md blob `a5333457…`, which **equals `41bbe19`**. Its `LICENSE.txt` blob
`f433b1a…` is identical to the installed one [V]. So the plugin copy is the newer upstream version
and the skills-directory copy is the older one. That the plugin copy comes from the
claude-plugins-official repository was not verified there; it is inferred from the blob match [I].

Substantive differences, `2235be7` (installed) → `41bbe19` (latest) [V]:

| Topic | Installed `2235be7` | Latest `41bbe19` |
|---|---|---|
| Unspecified subject | "pin it yourself … and state your choice" | "identify it yourself … **and confirm with the client** … as a proposal" |
| Typefaces | "a characterful display face …, a complementary body face, and a utility face" (2+ roles, can be 3 families) | "**use one family or two**, and if two, make them clearly distinct". Line length under 80 characters. Typographic style per *The Elements of Typographic Style*. |
| Typographic tells | not listed | Avoid: accenting a single word in a headline, ALL-CAPS labels, unnecessary labels above content |
| Motion | "page-load sequence, scroll-triggered reveal, hover micro-interactions, ambient atmosphere" | "Use non-user-triggered motion sparingly … fade-and-slide-up entrances on each section and hover transitions on every card are the generic default"; "Motion that answers a person's action … is welcome when it shows what changed" |
| Calibration list of AI defaults | 3 looks | 5. Adds the "SaaS-card kit" (identical rounded cards, the same grey shadow, **gradient washes as decoration**) and "template chrome" (eyebrows, middle-dot meta, `→` on buttons, mono data labels) |
| Plan | colour, type, layout, **signature** | colour, type, layout (with alignment), **principles** |
| Showing ideas | "do a lot of this planning … in your thinking, and only show ideas to the user when you have higher confidence" | removed |
| Quality floor | responsive, focus, reduced motion | adds "visually accessible, harmonious color palettes" |
| Memory | "If there's any information in your memory about the human's preferences … use that as a hint" | the same clause (client wording) |

### What the skill instructs

It is pure prose guidance. Plan a compact token system (4–6 named hex colours, type roles, layout
with ASCII wireframes), review the plan against "generic defaults", then build. Keep a quality floor
(responsive, visible focus, reduced motion), take screenshots for self-critique, and follow
microcopy rules: active voice, action names consistent across the flow, errors that state cause and
fix, sentence case [V]. **No scripts, no commands, no URLs, no tools required** (screenshots are
optional) [V].

### Criteria

#### 1. Compatibility

| Requirement | Result | Evidence |
|---|---|---|
| Stack | ✅ Neutral | No framework is mentioned. |
| Tokens primitive → semantic → component | ⚠️ Partial | "compact token system" with named colours; no tiering. |
| Max 2 families | ⚠️ installed / ✅ latest | `2235be7` invites 3 roles; `41bbe19` says "one family or two". |
| Reduced motion, focus, responsive | ✅ | "Quality floor" paragraph. |
| Gradients | ✅ latest | `41bbe19` flags "gradient washes as decoration" as a default to avoid, which fits "subtle gradients". |
| Microcopy | ✅ Strong | "More on writing in design". |
| Select, date picker | ❌ | Not covered (covered by `angular-developer`). |

#### 2. Conflicts

| # | Rule in the skill | Conflict | Resolution |
|---|---|---|---|
| F1 | "If there's any information in your memory about the human's preferences … use that as a hint" | CLAUDE.md §3: no memory from the user's global configuration. | Override: use only repository artifacts (story, spec, ADRs). |
| F2 | Installed: "pin it yourself … state your choice". Latest: "identify it yourself … confirm with the client". | Our subject and scope come from `story.md` and the approved spec. Choices go through HC1 and HC2. | Override: the brief is the approved spec. Undecided axes become spec questions (`US-04-Q-NN`), not silent choices. |
| F3 | "take one real aesthetic risk", "the hero is a thesis", "the signature element" | Written for landing pages. The wizard is a task flow. Scope creep against the spec. | Override: aesthetic choices are limited to what the spec and the design-system ADR approve. |
| F4 | Installed: "only show ideas to the user when you have higher confidence" | Traceability: design decisions must be written into the spec or ADR (CLAUDE.md §5, §9). | Vendor `41bbe19`, which removes it. |
| F5 | Installed: 3 type roles | US-04: max 2 families | Vendor `41bbe19` ("one family or two"). |
| F6 | "Consider written content … come up with copy and placeholder content" | End-user text is Spanish. Business text stays in Strapi (US-04 rules). | Override: the skill guides only interface microcopy in the front end, in Spanish. Strapi content is never invented or changed. |

No conflict with ADR-0004 or ADR-0009, the pinned versions or naming [V: nothing in the text touches
them].

#### 3. Security

No scripts, no executable content, no URLs or domains, no hidden Unicode found in the read [V]. It
asks for screenshots "if your environment supports it", which is harmless.

#### 4. Value

| Area | Value |
|---|---|
| Microcopy rules (action-named buttons, consistent verbs, errors give cause and fix, empty states invite action) | **Medium-high** for the US-04 microcopy scope |
| Anti-default calibration (latest: SaaS-card kit, gradient washes, eyebrow chrome) and the "plan → review against brief → build" discipline | **Medium:** a lens against a templated look, useful to the spec-writer and architect when proposing the palette and type scale |
| Typography (one or two families, line length, scale) | **Medium** |
| Tokens, contrast numbers, reduced motion details, select and date picker | **Low or none** (the ADR and `review-checklist` own these) |

### Verdict: **ADOPT WITH ADJUSTMENTS** (vendor `41bbe19`, not the installed `2235be7`)

Reasons:

1. Low risk and clean provenance: a single prose file, Apache-2.0 with the licence file inside the
   folder, from Anthropic, rarely changed (4 commits), no executable content.
2. It fills a gap the other skills do not: microcopy discipline and an explicit check against
   generic AI defaults. US-04 asks for both.
3. The latest version already removes two conflicts of the installed one (3 type families, and hiding
   ideas until confident) and aligns with "subtle gradients" and "max 2 families". The remaining
   conflicts (memory, self-chosen subject, aesthetic risk, invented copy) can be resolved by
   precedence and a few CLAUDE.md §5 lines.

**Required adjustments, if approved:**

1. Vendor `skills/frontend-design/` at commit `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` with
   `git archive` (2 files) into `.claude/skills/frontend-design/`. Verify that the tree hash equals
   `d79e2a5bb4df4a386c2adcdd9ab8709bba28c3f6`. Do not copy the global copy (`2235be7`).
2. Record it in `.claude/skills/THIRD_PARTY.md` (source, commit, tree hash, Apache-2.0, note that the
   repository root has no LICENSE but the folder ships `LICENSE.txt`).
3. Add to CLAUDE.md §5 the overrides F1 (no memory, only repository artifacts), F2 (the brief is the
   approved spec; open axes become spec questions), F3 (no aesthetic risk beyond the approved ADR,
   wizard = task flow) and F6 (interface microcopy only, in Spanish; Strapi content untouched).
4. Grant it to `spec-writer` (microcopy and design questions), `architect` (design-system ADR), and
   `frontend-developer` and `code-reviewer` (as a lens). Not to `strapi-developer` or
   `test-engineer`.

---

## Comparison

| | ui-ux-pro-max | impeccable | frontend-design |
|---|---|---|---|
| Matched commit (installed) | `d86f443` (lock hash `11aeea4` is the symlink tree, not the content) | `0a4e72a` | `2235be7` |
| Latest upstream | `f76d165` (2026-11-21), +48 commits | `b49177d` (2026-11-18), +148 commits | `41bbe19` (2026-09-03) |
| License (SPDX) | MIT (repo root); skill folder has no licence; font metadata provenance unclear | Apache-2.0 (repo root) + NOTICE; skill folder has no licence; bundled screenshot library without a notice | Apache-2.0 (`LICENSE.txt` in the folder); no repo root licence |
| Executable content | 4 Python scripts, local only | sh/cmd launcher → **downloaded native binary**, 547 KB browser overlay, subagent definitions | none |
| Network | none | GitHub release download, update checks (engine), localhost server | none |
| Writes outside the task | `design-system/` in the current directory; its own data files | `~/.impeccable`, `.claude/settings.local.json`, `.github/hooks/`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/`, `index.html`, CSP | none |
| Stack fit (Angular 22) | ❌ React Native default; stale Angular data that conflicts with ADR-0004 | ⚠️ neutral; no Angular live adapter | ✅ neutral |
| Tokens methodology | weak | strong (primitive/semantic, OKLCH) | light |
| Contrast and gradients | rule stated, data fails AA | strong (includes 3:1 non-text) | quality floor; flags gradient washes (latest) |
| Reduced motion | ✅ | ✅ strong | ✅ |
| Select and date picker (WAI-ARIA, CDK, `@angular/aria`) | ❌ | ❌ | ❌ (all three: use the vendored `angular-developer` `angular-aria.md`) |
| Microcopy | basic form rules | good (`clarify`) | good |
| Scope creep risk | medium (mandatory triggers) | **high** ("go all out", `overdrive`, comps) | medium (aesthetic risk; mitigated by overrides) |
| Verdict | **REJECT** | **REJECT** | **ADOPT WITH ADJUSTMENTS** (at `41bbe19`) |

## Closing recommendation

- **Vendor only `frontend-design` at `41bbe19`**, with the four CLAUDE.md §5 overrides (F1, F2, F3,
  F6) and the THIRD_PARTY.md entry. It is the only one of the three that adds value with no
  executable content and no conflict that precedence cannot resolve.
- **Reject `impeccable` and `ui-ux-pro-max`.** Carry their few strong ideas into the US-04
  design-system ADR and, where they are review rules, into `review-checklist` (a project skill), in
  our own words with attribution:
  - from impeccable: the AA table including 3:1 for controls, icons and focus indicators; OKLCH ramps
    with reduced chroma near white and black; reduced motion that keeps meaningful feedback; theming
    browser surfaces (selection, caret, focus ring, tabular numerals); no gradient text.
  - from ui-ux-pro-max: `number-tabular` for prices; exit animations about 60–70% of the enter
    duration; touch targets of 44 px with an 8 px gap.
- **The custom select and date picker** need none of the three. The vendored `angular-developer`
  (`references/angular-aria.md`: `ngCombobox`, `ngListbox`) plus the WAI-ARIA APG patterns, decided
  in the US-04 ADR (CDK vs `@angular/aria`, with the stability check for 22.3.0), are the sources.
- **Clean up the machine (outside the repository, for the human to decide):** the impeccable engine
  is already cached in `~/.impeccable/bin/0.1.5` and records update checks. The global skills stay
  installed but must not be used by this project (CLAUDE.md §3). If the global `ui-ux-pro-max` and
  `impeccable` skills keep auto-triggering in sessions on this repository, a project-level
  instruction or setting to ignore them is advisable [I].

### Not verified

- The behaviour of the impeccable engine binary (file I/O, server endpoints, update-check traffic,
  image-generation API use), and whether the release binary is reproducible from `crates/`.
- The upstream licence of `modern-screenshot.umd.js`, and the provenance of impeccable's
  `font-index.json`.
- Whether MIT covers ui-ux-pro-max's compiled Google Fonts metadata at `d86f443`.
- `impeccable.cmd` (Windows launcher), not read line by line.
- That the frontend-design plugin copy comes from the claude-plugins-official repository at a
  specific commit (matched only by blob hash to anthropics/skills `41bbe19`).
- ui-ux-pro-max HEAD `f76d165` and impeccable HEAD `b49177d` were not evaluated in full; only the
  diffs relevant to the findings were read.

### Human decision

Decided by Felipe Sabogal, 2026-11-21, as recommended:

- **EVAL-003 `ui-ux-pro-max`: REJECTED.** Nothing vendored.
- **EVAL-004 `impeccable`: REJECTED** as a vendored skill. Nothing vendored and nothing run. The
  architect may restate a few of its principles in the US-04 design-system ADR, with credit
  (contrast of 3:1 for controls, icons and focus indicators; OKLCH colour ramps; reduced motion that
  keeps meaningful feedback).
- **EVAL-005 `frontend-design`: ADOPT WITH ADJUSTMENTS.** Vendored at `41bbe19` (not the installed
  `2235be7`), with the overrides in `CLAUDE.md` §5 and granted to the `spec-writer`, `architect`,
  `frontend-developer` and `code-reviewer` agents.

### Installation record (EVAL-005)

| Item | Value |
|---|---|
| Installed at | `.claude/skills/frontend-design/` (2 files: `SKILL.md`, `LICENSE.txt`) |
| Commit | `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (2026-09-03), unchanged at upstream HEAD on 2026-11-21 |
| Method | `git archive` of the exact commit from a blobless clone (not `npx skills add`) |
| Integrity | Upstream tree `d79e2a5bb4df4a386c2adcdd9ab8709bba28c3f6`; every vendored blob equals upstream (`LICENSE.txt` `f433b1a…`, `SKILL.md` `a533345…`) |
| Date | 2026-11-21, by the orchestrator at the human's request |
