<!--
Provenance (not part of the story)
- Source: "Technical assessment -Frontend.pdf", pages 8–9, section "Functional user stories"
- Source SHA-256: 4d7ea38eb1109983175f0fe9af57f4361a524452dbef137974f491e44ec84e4e
- Transcribed: 2026-11-20 by Claude Code (Opus 5.5, main session) at the explicit request of
  Felipe Sabogal. This deviates from H0, where the human writes the story (FLOW.md §3); the
  human decision is recorded here and in FLOW.md.
- Fidelity: the text is verbatim. The only changes are that Gherkin lines wrapped by the PDF page
  width were joined back into one line, and the "Rejected payment" scenario, split across pages 8
  and 9 in the PDF, is rejoined. The heading levels are Markdown.
- Status: verbatim input. Never edit; refinements belong in spec.md.
-->

# US-03 – Summary and payment

## Story

As a person who chose a plan, I want to review a summary of my quote and pay, so that I become insured.

## Context

Before paying, the person must confirm their data and accept the terms and conditions, whose text varies by country and is managed by the business team from Strapi. Payment is simulated for this test.

## Business rules

- The summary shows the policyholder’s data, the vehicle’s data and the chosen plan with its final price.
- The document number is shown partially masked.
- From the summary the person can go back to edit their data or change the plan.
- The pay button is enabled only after accepting the terms and conditions.
- The payment cannot be submitted twice.
- On successful payment, a confirmation with a simulated quote number is shown.

## Acceptance criteria

```gherkin
Scenario: Complete summary
  Given I chose a plan
  When I reach the summary
  Then I see my data, my vehicle’s data and the chosen plan with its final price

Scenario: Terms by country
  Given I am on the summary
  When I view the terms and conditions
  Then the text matches the one configured in Strapi for my country
  And the pay button is disabled until I accept them

Scenario: Successful payment
  Given I accepted the terms
  When I click pay
  Then the button is locked while the payment is processed
  And I see the confirmation with the quote number

Scenario: Rejected payment
  Given the simulated payment fails
  When I click pay
  Then I see a clear error message
  And I can try again without losing my information
```
