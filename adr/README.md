# Architecture Decision Records

Format: MADR 4 (see the `adr-madr` skill). Only a human sets an ADR to `Accepted` or `Rejected`.
Accepted ADRs are binding (`CLAUDE.md` §1, level 2) and are never rewritten; they are superseded.

## Index

| ADR | Title | Status | Date | Stories |
|---|---|---|---|---|
| — | *(none yet)* | | | |

## Backlog (decisions known to be needed)

Numbers are assigned when an ADR is written; this order is only provisional.

| Topic | Why it needs an ADR | Input |
|---|---|---|
| Multi-country content strategy (Strapi model + how Angular resolves the country) | Required by the assessment; affects every story and both layers | Specs US-01..03, `strapi-content-modeling` options A–D |
| Forms library: Signal Forms vs Reactive Forms | A third-party skill mandates one; the choice is hard to reverse | SPIKE-01 (`CLAUDE.md` §7) |
| Strapi access and security model (public role vs read-only token behind a proxy; runtime config of the API URL) | Required by the assessment (no write tokens in the browser, minimal public permissions) | Specs, `docker-compose.yml` topology |
| Front-end persistence of wizard state (memory / sessionStorage / localStorage; what is stored, when it is cleared) | Privacy of document numbers; "keep data when going back"; reload behaviour | Specs US-01 and US-03 |
