# Multi-country car insurance (CO / CL)

A single Angular application and build that sells car insurance in **Colombia** and **Chile**.
Form fields, plans and terms are managed per country in **Strapi** by the business team, with no
deploys needed. It is built through an **AI-driven development flow** with Claude Code.

> **Status:** all four stories are **Ready for QA**: US-01 (policyholder and vehicle data form),
> US-02 (plan list), US-03 (summary and payment) and US-04 (design system and visual redesign).
> US-04 was not in the assessment: it is the human's own request, run through the same flow to show
> that the flow absorbs a new requirement and two rounds of human change requests at HC3 without
> skipping a checkpoint. Reflection: [FLOW.md §7](FLOW.md#7-reflection).

## Where to look

| You want to… | Read |
|---|---|
| Understand the agentic flow, its checkpoints and the reflection | [FLOW.md](FLOW.md) |
| See the rules every agent follows | [CLAUDE.md](CLAUDE.md) |
| See the agents and skills (inputs, outputs, tools, scopes) | [AGENTS.md](AGENTS.md) |
| Read the specs per user story | [specs/](specs/) |
| Read the architecture decisions | [adr/](adr/) (index in [adr/README.md](adr/README.md)) |
| See how content differs by country, and why | [ADR-0001](adr/0001-multi-country-content-strategy.md), summary [below](#how-content-differs-by-country) |
| See the code review evidence | [reviews/](reviews/) |
| See the unedited session logs | [logs/sessions/](logs/sessions/) |
| See the QA screenshots | [docs/qa/](docs/qa/) |
| See how third-party skills were evaluated | [docs/skills/third-party-evaluation.md](docs/skills/third-party-evaluation.md) |

## How content differs by country

Decided in [ADR-0001](adr/0001-multi-country-content-strategy.md):

- **In Strapi.** A `country` collection type holds each country's metadata: code, name, currency
  and locale. Every form field, plan and terms entry has a relation to its country, with its own
  draft/publish lifecycle. Adding a country is content work, not a schema change.
- **In Angular.** There is one build, and the country is the first path segment (`/co/…`, `/cl/…`),
  so the context is explicit and deep-linkable. The app asks Strapi only for the current
  country's published content, and it formats money and dates with that country's locale and
  currency.

## Repository layout

```
├── frontend/          Angular 22.3 app (standalone, signals, Signal Forms, Vitest, Playwright, nginx image)
├── backend/           Strapi 5.63 project with seed data for CO and CL (Vitest, ESLint)
├── docker-compose.yml One-command startup: strapi + web (nginx proxy)
├── specs/             One folder per user story: story, spec, tasks
├── adr/               Architecture Decision Records (MADR)
├── reviews/           Code review reports
├── logs/sessions/     Agent session exports (personal data redacted, see its README)
├── docs/              QA screenshots, skill evaluations, spike findings
├── scripts/           trace.sh, e2e.sh, scan-secrets.sh, scan-logs.sh, redact-logs.sh, check-story-fidelity.py
├── .githooks/         Versioned pre-commit hook (blocks personal data)
└── .claude/           Agents, skills, hooks, settings (Claude Code)
```

## Running the project

### Prerequisites

- **Docker** with Compose v2 (tested with Docker Engine 29.9 and Compose v5.7).
- To run the tests outside Docker: **Node 24** (the images use `node:24.22.3`).

### Start everything with one command

```bash
docker compose up --build
```

No environment file is needed: dev-only Strapi secrets are generated on first start and kept in
the `strapi-data` volume. The first build takes a few minutes. When `strapi` is healthy:

| What | URL | Notes |
|---|---|---|
| The app | http://localhost:8080 | Country chooser; then `/co/datos` (Colombia) or `/cl/datos` (Chile) |
| Strapi admin | http://localhost:1337/admin | Fictitious dev admin: `dev.admin@example.com` / `DevOnly-Passw0rd` |
| Content API | http://localhost:8080/api/… | Same-origin nginx proxy; read-only, allow-listed paths (ADR-0002) |

Strapi's port is published on **localhost only** (127.0.0.1), because the dev admin password
is public in this repository. Never expose it on another interface. To use your own values, copy
`.env.example` to `.env` (git-ignored) and edit it.

The seed creates published content for Colombia and Chile, plus one draft field per country to
show that drafts are never served. Content you change in the admin panel is kept in the
`strapi-data` volume across restarts and rebuilds.

### For contributors: enable the versioned hook

```bash
git config --local core.hooksPath .githooks
```

The pre-commit hook blocks any commit that contains personal data. The policy is in
[logs/sessions/README.md](logs/sessions/README.md).

## Using the app

The app is a four-step wizard. The interface is in Spanish, as the users are in Colombia and Chile.

1. **Elige tu país.** Choose Colombia or Chile. You can change country later from the header chip
   or the "Cambiar país" link. Choosing another country discards the data you entered.
2. **Tus datos.** Fill in your data and your vehicle's data. The fields, their order, their
   validations and their messages come from Strapi, so they differ by country. You can type the
   birth date (`dd/mm/aaaa`) or pick it from the calendar. You must be 18 or older, and the vehicle
   can be at most 20 years old and no later than next year. Press **Continuar**.
3. **Plan.** Compare the plans offered in your country, with their coverages, benefits and final
   price. One plan may be marked as recommended. The final price is the plan's base price adjusted
   by a simulated rule based on your age and your vehicle's age
   ([ADR-0007](adr/0007-simulated-price-rule.md)). Choose one and press **Continuar**.
4. **Resumen y pago.** Review your data (the document number is partly masked), your vehicle and the
   chosen plan. From here you can **Editar mis datos** or **Cambiar plan**. Read and accept the terms
   and conditions, choose the outcome of the **simulated payment** ("Pago aprobado" or "Pago
   rechazado"; no charge is made), then press **Pagar**.
5. **Confirmation.** An approved payment shows "Pago confirmado" with a quote number
   (`COT-<country>-<date>-<6 digits>`), and **Nueva cotización** starts over. A rejected payment
   lets you try again.

Your data is kept while you move between steps and survives a reload of the same tab. Each step
has a back link. Everything works with the keyboard alone and at phone, tablet and desktop sizes.

**Fictitious data to try it:**

| | Colombia | Chile |
|---|---|---|
| Document | Cédula de ciudadanía `1012345678` | RUT `12.345.678-5` |
| Plate | `ABC123` (3 letters, 3 digits) | `BCDF12` or `AB1234` |
| Birth date | Any date at least 18 years ago, e.g. `15/05/1990` | same |
| Vehicle year | e.g. `2020` | e.g. `2019` |

## Editing content in Strapi (for editors)

Open the admin panel (http://localhost:1337/admin) and go to **Content Manager**. Every entry
belongs to one country, and **only published entries are shown on the site**: a draft is never
shown, so publish to make a change visible. Reload the app to see it, with no deploy or rebuild.

### Form fields (step 1)

**Content Manager → Campo del formulario.** Each field has a label, type (text, number, select,
date, checkbox), required flag, validation rules, help text, error message, order (`sortOrder`) and
country. Select options are edited in the field itself.

Try it: edit, reorder or add a field for Colombia, **publish** it, and reload
http://localhost:8080/co/datos. The change appears with no code change.

### Plans (step 2)

**Content Manager → Plan.** Each plan has a name, short description, base price, coverages,
benefits, order (`sortOrder`), a recommended flag, an active flag and a country. The currency comes
from the country.

- Only plans that are **published and active** are offered. Unpublish one, or turn off "active",
  to hide it.
- `sortOrder` sets the order on the page, and "recommended" highlights a plan.

### Terms and conditions (step 3)

**Content Manager → Términos y condiciones.** Edit the `body` field, a rich-text (blocks) field.
The summary page shows this formatting ([ADR-0009](adr/0009-terms-rich-text-rendering.md)):

| In the editor | On the site |
|---|---|
| Paragraphs | Shown as paragraphs |
| Headings | Shown as headings, one level below the terms title |
| Bulleted and numbered lists | Shown as lists, nested up to 6 levels (deeper lists are dropped) |
| Bold, italic, underline, strikethrough | Shown |
| Links | Only the link text is shown, with no link |
| Quotes and code blocks | Shown as plain paragraphs |
| Inline code | Shown as plain text |
| Images | Not shown |

Rules to keep in mind:

- The site shows the **newest published** terms of each country.
- The seed creates a country's example terms only when that country has no terms at all (neither draft nor published). It never creates, renames or republishes terms over your work, so a restart will not undo your edits.
- Content for end users is written in Spanish.

## Running the tests

```bash
# Unit and component tests (Vitest)
cd frontend && npm ci && npm test && npm run lint
cd backend  && npm ci && npm test && npm run lint

# End-to-end tests (Playwright), against the running stack
(cd frontend && npx playwright install chromium)
scripts/e2e.sh                         # sets the documented env; extra args go to Playwright

# Traceability matrix and scans (no AI)
scripts/trace.sh US-01                 # also US-02, US-03, US-04
scripts/scan-secrets.sh
scripts/scan-logs.sh
```

**The e2e tests expect the seeded content.** Content you changed in the admin persists in the
volume, so run the e2e suite on a fresh stack. Either run `docker compose down -v` first, or use a
separate project such as `docker compose -p e2e up --build --wait` and then
`docker compose -p e2e down -v`. The separate project uses the same ports, so stop the other stack
first. The admin login used by the AC-03 test is rate-limited to 5 per 5 minutes: each
`scripts/e2e.sh` run logs in once, and a 6th run within that window waits it out.

## Resetting the data

`docker compose down -v` removes the `strapi-data` volume: the next start seeds a fresh database
and generates new dev secrets.

**One-time reset after a seed change.** The seed is idempotent: it does not rewrite rows that
already exist. If your Strapi volume is older than one of these changes, run
`docker compose down -v` once, then `docker compose up --build`:

- **Commit `f39ff8d` (ADR-0006).** Validation rules used to be stored as free JSON. On an older
  volume, pattern rules arrive empty, and the plate and document fields drop out of step 1.
- **US-04 (ADR-0014).** These seed rules were added: letters only for the full name, and maximum
  lengths for the document number and the plate. An older volume keeps the old rules.

For local development without Docker (`cd backend && npm run develop`), delete
`backend/.tmp/data.db` once instead.

## Requirements not met

None. Any requirement we decide not to meet is listed here, with the reason.

## Known limitations (accepted and deferred)

| ID | Limitation | Why it is accepted | Decided |
|---|---|---|---|
| US-04-R3-F08 | "Nombre completo" lets any Unicode letter be typed, but the seed pattern accepts only Latin-1 letters, so a name such as "Łukasz" can be typed and is then rejected with the field's message. | The users are in Colombia and Chile; the Strapi pattern is the source of truth and the business team can widen it without a deploy. | Felipe Sabogal, 2026-11-22 (HC3 of US-04); see `reviews/US-04-review-R3.md` |
| US-04 e2e browsers | The e2e suite runs only in Chromium. Firefox and WebKit were not run. Where an API is missing, the code falls back: week start uses Monday (CLDR world default) without `Intl.Locale#getWeekInfo`, and the header uses a solid background without `backdrop-filter`. | Playwright's Chromium is the only browser installed in the gate. The fallbacks are covered by unit and static tests. | Felipe Sabogal, 2026-11-21/22 (HC1 and HC3 of US-04); ADR-0012, spec US-04 v0.4 |
| Session logs | The session logs in `logs/sessions/` are exported unedited, with one exception: every form of the human's real e-mail address and its domain is replaced by `[REDACTED-PERSONAL]`. Nothing else is touched, and the counts per file are recorded. | The assessment forbids real personal data in the repository. Secrets can be rotated; personal data cannot, so it is redacted mechanically by `scripts/redact-logs.sh` and blocked by the scans and the pre-commit hook. The policy is in [logs/sessions/README.md](logs/sessions/README.md). | Felipe Sabogal, 2026-11-21 |
| US-01-R4-F01 | **Superseded by US-04.** A date edited into an unreadable state less than ~25 ms after it was completed could leave the screen and the wizard state out of step. | No longer applies: since US-04 (ADR-0012, ADR-0014) the date and number fields are text boxes, so the native date input and its workaround no longer exist. | Accepted by Felipe Sabogal, 2026-11-21 (HC3 of US-01); `reviews/US-01-review-R4.md` |
