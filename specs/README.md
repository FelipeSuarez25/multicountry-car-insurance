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
| US-01 | Policyholder and vehicle data form | Not started |
| US-02 | Plan list | Not started |
| US-03 | Summary and payment | Not started |
