# Multi-country car insurance (CO / CL)

A single Angular application and build that sells car insurance in **Colombia** and **Chile**.
Form fields, plans and terms are managed per country in **Strapi** by the business team, with no
deploys needed. It is built through an **AI-driven development flow** with Claude Code.

> **Status:** the agentic flow is set up. The application (`frontend/`, `backend/`,
> `docker-compose.yml`) has not been built yet; the run instructions below will be completed
> when it is.

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
├── frontend/          Angular 22.3 app (standalone, signals, Vitest, Playwright)   — pending
├── backend/           Strapi 5 project with seed data for CO and CL               — pending
├── docker-compose.yml One-command startup                                         — pending
├── specs/             One folder per user story: story, spec, tasks
├── adr/               Architecture Decision Records (MADR)
├── reviews/           Code review reports
├── logs/sessions/     Unedited agent session exports
├── docs/              Skill evaluations, spike findings
├── scripts/           trace.sh (traceability), scan-secrets.sh
└── .claude/           agents, skills, hooks, settings (Claude Code)
```

## Running the project

*To be completed with the implementation.* The target is a single `docker compose up`, which
starts Strapi with seed data for both countries plus the Angular app.

## Requirements not met

*None declared yet. Any requirement we decide not to meet will be listed here, with the reason.*
