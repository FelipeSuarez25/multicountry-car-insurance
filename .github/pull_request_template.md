## Story

- **Story:** US-NN — <title>
- **Spec:** `specs/US-NN/spec.md` (version x.y, approved at HC1 on YYYY-MM-DD)
- **ADRs:** ADR-NNNN (Accepted), …

## Summary

What this PR delivers, in 2–4 bullets.

## Traceability matrix

<!-- Paste the output of: scripts/trace.sh US-NN -->

## Review

- Rounds: `reviews/US-NN-review-R1.md`, …
- Final verdict: APPROVED in round N
- Open findings (minor/nit only, with justification): …

## Automated gate

| Check | Result |
|---|---|
| Lint | |
| Build | |
| Unit tests (Vitest) | |
| E2E (Playwright) | |
| `docker compose up` with seed (CO + CL) | |
| `scripts/trace.sh US-NN` | exit 0 |
| `scripts/scan-secrets.sh` | exit 0 |

## Human QA (HC3, filled in by the reviewer)

- [ ] Colombia: full flow, correct fields, plans, currency and terms
- [ ] Chile: full flow, correct fields, plans, currency and terms
- [ ] Keyboard only: the wizard can be completed without a mouse, and the focus is visible
- [ ] Mobile width (360 px) and desktop
- [ ] A change in Strapi (field or plan) is reflected after a reload, without a deploy
- [ ] The Definition of Done holds (`CLAUDE.md` §12)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
