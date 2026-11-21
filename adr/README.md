# Architecture Decision Records

Format: MADR 4 (see the `adr-madr` skill). Only a human sets an ADR to `Accepted` or `Rejected`.
Accepted ADRs are binding (`CLAUDE.md` §1, level 2) and are never rewritten; they are superseded.

## Index

| ADR | Title | Status | Date | Stories |
|---|---|---|---|---|
| [0001](0001-multi-country-content-strategy.md) | Multi-country content strategy and country context (includes wizard routes and step guards) | Accepted (amended by ADR-0006) | 2026-11-20 | US-01, US-02, US-03 |
| [0002](0002-strapi-access-and-security.md) | Strapi access and security model | Accepted (amended by ADR-0005) | 2026-11-20 | US-01, US-02, US-03 |
| [0003](0003-wizard-state-persistence.md) | Front-end persistence of the wizard state | Accepted | 2026-11-20 | US-01, US-02, US-03 |
| [0004](0004-forms-library.md) | Forms library for the Strapi-driven step 1 form (Signal Forms over a shared validation core) | Accepted | 2026-11-20 | US-01 |
| [0005](0005-e2e-token-scope-for-relations.md) | Scope of the temporary e2e API token when the created content has relations (amends ADR-0002) | Accepted | 2026-11-21 | US-01 |
| [0006](0006-strapi-physical-model-adjustments.md) | Strapi physical model adjustments: typed validation-rule parameters and the country `localeTag` attribute (amends ADR-0001) | Accepted | 2026-11-21 | US-01, US-02 |

Note: the amendment of ADR-0001 by ADR-0006 is binding only once the human accepts ADR-0006 at
HC2. Until then ADR-0006 is `Proposed`, and ADR-0001 stays as written.

## Backlog (decisions known to be needed)

Numbers are assigned when an ADR is written; this order is only provisional.

| Topic | Why it needs an ADR | Input |
|---|---|---|
| — | No pending ADR for US-01 | — |

Covered since 2026-11-20: the multi-country content strategy (ADR-0001, which also folds in the
wizard routing and step guards candidate from US-01 spec §10), the Strapi access and security
model (ADR-0002), the front-end persistence of the wizard state (ADR-0003), and the forms library
(ADR-0004, informed by [SPIKE-01](../docs/spikes/SPIKE-01-forms.md)).
