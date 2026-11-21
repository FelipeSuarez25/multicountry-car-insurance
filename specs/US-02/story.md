<!--
Provenance (not part of the story)
- Source: "Technical assessment -Frontend.pdf", pages 6–7, section "Functional user stories"
- Source SHA-256: 4d7ea38eb1109983175f0fe9af57f4361a524452dbef137974f491e44ec84e4e
- Transcribed: 2026-11-20 by Claude Code (Opus 5.5, main session) at the explicit request of
  Felipe Sabogal. This deviates from H0, where the human writes the story (FLOW.md §3); the
  human decision is recorded here and in FLOW.md.
- Fidelity: the text is verbatim. The only change is that Gherkin lines wrapped by the PDF page
  width were joined back into one line. The heading levels are Markdown.
- Status: verbatim input. Never edit; refinements belong in spec.md.
-->

# US-02 – Plan list

## Story

As a person getting a quote, I want to see the plans available for my country with their price and coverages, so that I can choose the one that best fits my needs.

## Context

Plans, coverages, benefits and prices change by country and are managed by the business team from Strapi. The business team wants to highlight one plan as “recommended” and control the order in which plans appear.

## Business rules

- Each plan is configured in Strapi with: name, short description, base price, currency, coverages, benefits, order, recommended flag, active status and country.
- Only published and active plans for the country are shown.
- The price is shown in the country’s currency and format (Colombian pesos or Chilean pesos).
- The final price may be adjusted by a simulated rule based on the step 1 data. The rule is documented.
- Only one plan can be selected.

## Acceptance criteria

```gherkin
Scenario: Plans for the country
  Given I completed the step 1 form
  When I reach the plans step
  Then I see only the active and published plans for my country, in the configured order

Scenario: Recommended plan
  Given a plan is marked as recommended in Strapi
  When I view the plan list
  Then that plan is visually distinguished from the others

Scenario: Plan selection
  Given I am on the plan list
  When I select a plan
  Then it is marked as chosen
  And I can move on to the summary

Scenario: No plans available
  Given there are no active plans for my country
  When I reach the plans step
  Then I see a message explaining that no plans are available
```
