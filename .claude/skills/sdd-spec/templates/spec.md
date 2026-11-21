# US-XX — <Title> · Spec

| Field | Value |
|---|---|
| Story | [story.md](story.md) (verbatim, not edited) |
| Status | Draft — awaiting HC1 \| Approved \| Superseded |
| Version | 0.1 |
| Author | spec-writer subagent (<model>) |
| Approved by | — (human only, see Review log) |
| Related ADRs | ADR-NNNN, … |

## 1. Summary

One paragraph: what this increment delivers and for whom.

## 2. Scope

**In scope**
- …

**Out of scope**
- …

## 3. Glossary

| Term | Meaning in this project |
|---|---|

## 4. Business rules

| ID | Original (from story) | Refined (precise, testable) | Covered by |
|---|---|---|---|
| US-XX-BR-01 | … | … | US-XX-AC-NN |

## 5. Acceptance criteria

### US-XX-AC-01 — <original scenario title>

```gherkin
Scenario: …
  Given …
  When …
  Then …
```

### US-XX-AC-0N — <derived scenario title> (derived from US-XX-BR-NN)

```gherkin
Scenario Outline: …
  Given …
  When …
  Then …
  Examples:
    | input | expected |
```

## 6. Gaps and open questions

| ID | Gap | Why it matters | Proposed default | Human answer |
|---|---|---|---|---|
| US-XX-Q-01 | … | … | … | |

## 7. Content contract (what Strapi must provide)

Content types and fields this story needs, per country. Reference the accepted multi-country ADR.

## 8. UI states

| State | Trigger | What the user sees | Accessibility notes |
|---|---|---|---|
| Loading | | | |
| Empty | | | |
| Error | | | |
| Success | | | |

## 9. Non-functional requirements

- Accessibility: …
- Responsive: …
- Security / privacy: …
- Performance: …

## 10. ADRs

- Referenced (accepted): …
- Needed (for the architect): …

## 11. Test mapping

| AC | Level (unit / component / e2e / manual) | Planned test location |
|---|---|---|
| US-XX-AC-01 | | |

## 12. Traceability matrix (filled before HC3)

Generated with `scripts/trace.sh US-XX` and pasted here.

## 13. Review log

| Date | Who | Gate | Decision | Notes (what was corrected and why) |
|---|---|---|---|---|
