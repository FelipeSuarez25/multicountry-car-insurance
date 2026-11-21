---
name: sdd-spec
description: Turns a functional user story into a verifiable spec (this project's Spec-Driven Development variant). Use when writing or revising specs/US-XX/spec.md or specs/US-XX/tasks.md, when detecting gaps in a user story, or when assigning BR/AC/Q/T identifiers.
---

# SDD spec procedure

The spec is the **source of truth**: code and tests are derived from it, never the other way
around. If the implementation needs something that the spec does not say, the spec changes
first, and the change needs human approval (HC1).

## Inputs and outputs

- **Input:** `specs/US-XX/story.md`, the user story copied verbatim by a human. Never edit it.
- **Outputs:**
  - `specs/US-XX/spec.md`, built from [templates/spec.md](templates/spec.md)
  - `specs/US-XX/tasks.md`, built from [templates/tasks.md](templates/tasks.md)
- **Read before writing:** `CLAUDE.md`, the accepted ADRs in `adr/`, and the specs of the
  other stories (to keep shared concepts consistent).

## Identifiers (never renumber; retire with ~~strikethrough~~ + reason)

| Kind | Format | Example |
|---|---|---|
| Business rule | `US-XX-BR-NN` | `US-01-BR-03` |
| Acceptance criterion | `US-XX-AC-NN` | `US-01-AC-02` |
| Gap / open question | `US-XX-Q-NN` | `US-01-Q-04` |
| Task | `US-XX-T-NN` | `US-01-T-07` |

- Each Gherkin scenario in the story becomes one AC and keeps its original title.
- ACs that **you** derive (from a business rule, a gap answer or a non-functional requirement)
  are marked `(derived from US-XX-BR-NN / Q-NN)`. Every business rule must be covered by at
  least one AC; otherwise it is not verifiable.

## Procedure

1. Read the story and copy every business rule as written. Then add a **refined** version that
   is precise and testable (numbers, boundaries, units, timezone).
2. Run the gap-detection checklist below. Each hit becomes a `Q` entry with:
   the problem, why it matters, **a proposed default**, and an empty *Human answer* field.
3. Write the ACs in Gherkin. Use concrete fictitious example values (scenario outlines with
   tables for boundaries). One behaviour per scenario.
4. Fill in the remaining template sections: content contract (what Strapi must provide),
   UI states, non-functional requirements, test mapping, and ADRs referenced or needed.
5. If a decision is architectural (it affects more than one story, is hard to reverse, or
   chooses between technologies or patterns), do **not** decide it in the spec. List it under
   *ADRs needed* for the architect.
6. Set the status to `Draft — awaiting HC1`. Write `tasks.md` (tasks are small: ≤ ~1 h of agent
   work, each tied to ACs).
7. Never mark a spec `Approved`; only the human does that in the *Review log*.

## Gap-detection checklist

Ask each question of the story. A "we don't know" answer is a gap.

- **Ambiguous words:** "simple", "clear", "suited", "usually", "partially", "etc." What exactly?
- **Boundaries:** exact limits and whether they are inclusive (age exactly 18 today? year = next
  year? 20 years counted from what date?). Which timezone defines "today"?
- **Data shape:** for each field, the type, format, min/max length, allowed characters and
  normalisation (dots/dashes in RUT, plate format, upper case).
- **Country context:** how does the app know the country (URL, selector, domain)? What happens
  with an unknown or unsupported country? Can the user switch country mid-flow?
- **Content ownership:** which texts come from Strapi and which are in code (buttons, step
  titles, generic errors)? What if Strapi content is missing or malformed?
- **States:** loading, empty, error (Strapi down, timeout), partial content, retry.
- **Persistence:** what survives a reload or back navigation? When is the stored data cleared
  (after payment? on country switch)? Is anything sensitive persisted?
- **Navigation:** can the user deep-link to step 2 or 3 without completing earlier steps? What
  does browser back do?
- **Concurrency and idempotency:** double clicks, double submits, retries.
- **Draft vs published, active vs inactive:** which combinations are visible?
- **Formatting:** currency, decimals, thousand separators, date format per country.
- **Security and privacy:** masking rules (which characters are shown), what is logged, what
  reaches the browser.
- **Accessibility:** keyboard path, focus on step change and on errors, labels, error announcements.
- **Responsive:** mobile layout of complex parts (plan comparison, summary).
- **Configuration change:** what happens if content changes while a user is mid-flow?
- **Verifiability:** can each criterion be checked by an automated test? If not, why not, and how
  will it be checked manually?

## Quality bar for HC1 (self-check before handing over)

- [ ] Every business rule is refined and covered by ≥ 1 AC.
- [ ] Every AC is observable and testable, with concrete example values.
- [ ] Every gap has a proposed default; nothing is silently assumed.
- [ ] Out-of-scope items are explicit.
- [ ] No contradiction with accepted ADRs; needed ADRs are listed.
- [ ] Each AC has a planned test level (unit / component / e2e / manual).
- [ ] `tasks.md` exists, and every task references ACs.
