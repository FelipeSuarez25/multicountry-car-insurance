# Multi-country car insurance (CO / CL)

A single Angular application and build that sells car insurance in **Colombia** and **Chile**.
Form fields, plans and terms are managed per country in **Strapi** by the business team, with no
deploys needed. It is built through an **AI-driven development flow** with Claude Code.

> **Status:** US-01 (policyholder and vehicle data form) is implemented and in review.
> US-02 (plan list) and US-03 (summary and payment) follow the same flow next.

## Where to look

| You want to… | Read |
|---|---|
| Understand the agentic flow, its checkpoints and the reflection | [FLOW.md](FLOW.md) |
| See the rules every agent follows | [CLAUDE.md](CLAUDE.md) |
| See the agents and skills (inputs, outputs, tools, scopes) | [AGENTS.md](AGENTS.md) |
| Read the specs per user story | [specs/](specs/) |
| Read the architecture decisions | [adr/](adr/) |
| See the code review evidence | [reviews/](reviews/) |
| See the unedited session logs | [logs/sessions/](logs/sessions/) |
| See how third-party skills were evaluated | [docs/skills/third-party-evaluation.md](docs/skills/third-party-evaluation.md) |

## Repository layout

```
├── frontend/          Angular 22.3 app (standalone, signals, Signal Forms, Vitest, Playwright, nginx image)
├── backend/           Strapi 5.63 project with seed data for CO and CL (Vitest, ESLint)
├── docker-compose.yml One-command startup: strapi + web (nginx proxy)
├── specs/             One folder per user story: story, spec, tasks
├── adr/               Architecture Decision Records (MADR)
├── reviews/           Code review reports
├── logs/sessions/     Unedited agent session exports
├── docs/              Skill evaluations, spike findings
├── scripts/           trace.sh (traceability), scan-secrets.sh
└── .claude/           agents, skills, hooks, settings (Claude Code)
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

### Try the configuration without a deployment

1. Open the admin panel, then *Content Manager → Form field*.
2. Edit, reorder (`sortOrder`) or add a field for Colombia, and **publish** it.
3. Reload http://localhost:8080/co/datos: the change appears with no code change or rebuild.

### Run the tests

```bash
# Unit and component tests (Vitest)
cd frontend && npm ci && npm test && npm run lint
cd backend  && npm ci && npm test && npm run lint

# End-to-end tests (Playwright), against the running stack
(cd frontend && npx playwright install chromium)
scripts/e2e.sh                         # sets the documented env; extra args go to Playwright

# Traceability matrix and secret scan (no AI)
scripts/trace.sh US-01
scripts/scan-secrets.sh
```

**The e2e tests expect the seeded content.** Content you changed in the admin persists in the
volume, so run the e2e suite on a fresh stack, either after `docker compose down -v` or on a
separate project such as `docker compose -p e2e up --build --wait` (then
`docker compose -p e2e down -v`; it uses the same ports, so stop the other stack first). The
admin login used by the AC-03 test is rate-limited to 5 per 5 minutes: each `scripts/e2e.sh` run
logs in once, and a 6th run within that window waits it out.

### Resetting the data

`docker compose down -v` removes the `strapi-data` volume: the next start seeds a fresh database
and generates new dev secrets.

**One-time reset after the rule-attribute change (ADR-0006).** If you created your Strapi volume
before commit `f39ff8d`, validation rules were stored as free JSON. The idempotent seed does not
rewrite existing rule rows, so pattern rules would arrive empty and the plate and document fields
would drop out of step 1. Run `docker compose down -v` once, then `docker compose up --build`.
For local development without Docker (`cd backend && npm run develop`), delete
`backend/.tmp/data.db` once instead.

## Requirements not met

*None declared yet. Any requirement we decide not to meet will be listed here, with the reason.*
