# Third-party skills

Skills in this directory that were **not** written for this project. Each one was evaluated
before installation (see `docs/skills/third-party-evaluation.md`) and is vendored at an exact
commit. Vendored files are never edited. Project-specific overrides live in `CLAUDE.md`, which
takes precedence (CLAUDE.md > accepted ADRs > project skills > third-party skills).

To update a vendored skill: open a new evaluation entry for the new commit, get the human
decision, re-vendor, and re-verify the hashes.

## angular-developer

| Field | Value |
|---|---|
| Skill | `angular-developer` |
| Installed at | `.claude/skills/angular-developer/` |
| Source URL | https://github.com/angular/skills/tree/97c663a02b376a19eccc60f75909f20f15a2c9c1/angular-developer |
| Commit | `97c663a02b376a19eccc60f75909f20f15a2c9c1` (2026-11-20 17:10 UTC) |
| Upstream origin | Generated from `angular/angular` `skills/dev-skills/` at `8b15295e8c7f1543d41dadb5955279702be52c16` |
| Installation date | 2026-11-20 |
| Installation method | `git archive` of the exact commit (not `npx skills add`, which installs HEAD) |
| Integrity | Directory tree hash `e3c937cb89b58606003f30ef14e42a395c14810e`, equal to `97c663a:angular-developer` (45 files) |
| Author | Google LLC (Angular team) |
| License | MIT |
| Evaluation | [EVAL-001](../../docs/skills/third-party-evaluation.md#eval-001--angular-developer-from-angularskills) — ADOPT WITH ADJUSTMENTS, approved by Felipe Sabogal on 2026-11-20 |

### License notice

The skill declares `license: MIT` and `Copyright 2026 Google LLC` in its `SKILL.md`
frontmatter. The `angular/skills` mirror repository does not ship a LICENSE file. The skill is
generated from `angular/angular`, whose MIT license applies:
https://github.com/angular/angular/blob/main/LICENSE

```
The MIT License

Copyright (c) 2010-2026 Google LLC. https://angular.dev/license

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### Project overrides (defined in `CLAUDE.md`)

- The forms strategy is decided by an ADR after SPIKE-01, not by `references/signal-forms.md`.
- The Angular CLI version is pinned (no `@latest`).
- The Angular CLI MCP server (`references/mcp.md`) is not used.
- The file naming convention is defined in `CLAUDE.md`.
- Keyboard accessibility of the wizard is enforced by the `review-checklist` skill.
- Playwright is set up with `@playwright/test`, not `playwright-ng-schematics`.

## frontend-design

| Field | Value |
|---|---|
| Skill | `frontend-design` |
| Installed at | `.claude/skills/frontend-design/` |
| Source URL | https://github.com/anthropics/skills/tree/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/frontend-design |
| Commit | `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (2026-09-03); unchanged at upstream HEAD on 2026-11-21 |
| Installation date | 2026-11-21 |
| Installation method | `git archive` of the exact commit (not `npx skills add`, which installs HEAD) |
| Integrity | Upstream tree `d79e2a5bb4df4a386c2adcdd9ab8709bba28c3f6` (2 files); every vendored blob equals upstream |
| Author | Anthropic |
| License | Apache-2.0 (`LICENSE.txt` inside the skill folder; the repository has no root license) |
| Evaluation | [EVAL-005](../../docs/skills/third-party-evaluation.md#eval-005-frontend-design-from-anthropicsskills) — ADOPT WITH ADJUSTMENTS, approved by Felipe Sabogal on 2026-11-21. Rejected in the same round: EVAL-003 `ui-ux-pro-max`, EVAL-004 `impeccable` |

### License notice

The full Apache-2.0 text ships with the skill in `.claude/skills/frontend-design/LICENSE.txt`
(unmodified). It is not repeated here.
