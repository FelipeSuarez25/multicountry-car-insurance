# Specs

One folder per user story. The spec is the source of truth (see `FLOW.md` §1, Spec-Driven
Development).

```
specs/US-NN/
├── story.md   verbatim user story (written by the human at H0, never edited)
├── spec.md    verifiable spec (spec-writer, approved by the human at HC1)
└── tasks.md   tasks + live state of the story (current step, next action, session log)
```

Templates: `.claude/skills/sdd-spec/templates/`.

| Story | Title | Status |
|---|---|---|
| US-01 | Policyholder and vehicle data form | Spec v0.2 **Approved** (HC1, 2026-11-20) — next: 2 ADRs |
| US-02 | Plan list | H0 done (story.md) |
| US-03 | Summary and payment | H0 done (story.md) |

Stories US-01..03 were transcribed from the assessment PDF by the orchestrator, at the human's
request, and verified word by word against the source (see the provenance header in each
`story.md` and FLOW.md §3, H0).
