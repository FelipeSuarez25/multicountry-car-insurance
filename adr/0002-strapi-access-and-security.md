---
status: Accepted
date: 2026-11-20
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-20), architect subagent (proposal)
consulted: specs/US-01/spec.md v0.2 (Approved), published packages @strapi/core, @strapi/utils, @strapi/admin, @strapi/plugin-users-permissions 5.63.0, Strapi REST docs (status parameter), Docker Official Image "nginx" docs
informed: all agents via CLAUDE.md precedence
---

# ADR-0002: Strapi access and security model

## Context and Problem Statement

The browser must read published content (countries and form fields in US-01, plans in US-02,
terms in US-03) from Strapi, and nothing else. We must decide how the browser reaches Strapi
(directly or through a proxy, anonymously or with a token), how the same build learns the API
address in every environment, how we avoid caches that would hide a newly published change, and
how the AC-03 end-to-end test creates content without a write credential ever reaching the
browser (US-01-Q-23). Inputs: US-01-AC-27, US-01-AC-03, US-01-AC-13, US-01-BR-06, US-01-Q-16.

## Decision Drivers

- D1. "No Strapi token with write permissions may reach the browser. Public role permissions minimal and justified" (source: Assessment, security; CLAUDE.md §3). Evaluated as "token and permission security" (source: Assessment, evaluation).
- D2. "The same application and the same build serve Colombia and Chile." (source: Assessment; US-01-BR-07). The build must not embed an environment-specific API address.
- D3. "Changing a form field or a plan in Strapi must be reflected in the app without changing code." (source: Assessment); visible on the next full page load, no cache delaying it (US-01-BR-06, US-01-Q-16).
- D4. "The whole project starts with a single command (for example docker compose up), with seed data for both countries" (source: Assessment, environment). Nothing may require a manual admin step to make the app work.
- D5. Drafts are never visible to end users (US-01-BR-06, US-01-AC-13).
- D6. AC-03 is automated: a test publishes a field during the run (US-01-Q-23), and the browser sees only GET requests without write tokens (US-01-AC-27).
- D7. Business editors use the Strapi admin, which must stay reachable (Assessment, business context).

## Considered Options

1. **Direct access with the public role**: the browser calls Strapi cross-origin with no token;
   the public role has `find`/`findOne` on the read types; the API URL comes from a runtime
   `config.json`.
2. **Same-origin nginx proxy + public role**: the nginx container that serves the Angular build
   forwards `GET /api/<allow-listed types>` to Strapi; the browser calls the relative path `/api`;
   Strapi's public role has only `find` on the read types and Strapi itself forces published
   content for anonymous requests.
3. **Same-origin nginx proxy injecting a read-only API token**: the public role has no content
   permissions; nginx adds `Authorization: Bearer <read token>` to proxied requests; the token
   lives only in the proxy's environment.

## Decision Outcome

Chosen option: **"2. Same-origin nginx proxy + public role"**, because it meets D1 with no token
anywhere near the browser and no secret to provision at start-up (D4), gives the same build a
relative API address that works in every environment (D2), and places the cache and method rules
in one small config file (D3, D6). The extra safeguard that matters most, forcing published
content, is enforced **inside Strapi**, so it holds even for requests that bypass the proxy (D5,
D7).

### What is decided

**Topology (docker compose)**

- `frontend`: nginx (Docker Official Image) serving the Angular build on one origin, and proxying
  `/api/` to Strapi. The upstream address comes from an environment variable through the image's
  template mechanism (`/etc/nginx/templates/*.template` processed with `envsubst` into
  `/etc/nginx/conf.d` at container start; Docker Official Image "nginx" docs). The browser bundle
  contains no host name.
- `strapi`: exposes its own port for the admin panel used by editors (D7). The content API on that
  port is protected by the Strapi-side rules below, not by the proxy.
- Development (`ng serve`) uses the Angular dev-server proxy for `/api`, so the code path is the
  same relative URL. No `environment.ts` API URL, no runtime `config.json` (nothing to configure).

**Proxy rules (nginx)**

- Only `GET` (and the implicit `HEAD`) on an allow-list of paths: `/api/countries` and
  `/api/form-fields` in US-01; US-02 and US-03 add `/api/plans` and `/api/terms` through their
  specs. Any other method or path under `/api/` returns `405` or `404` without reaching Strapi.
- Responses under `/api/` carry `Cache-Control: no-store`; no `proxy_cache` is configured.
  `index.html` is served with `Cache-Control: no-cache`; hashed build assets may be cached long-term
  (their names change on every build).
- Requests carrying an `Authorization` header are rejected (`400`), so the proxy can never be used
  to replay a token from a browser.

**Strapi rules (bootstrap code, idempotent, applied on every start; no manual admin clicks)**

- Public role: **exactly** `api::country.country.find` and `api::form-field.form-field.find` in
  US-01 (US-02 adds `api::plan.plan.find`, US-03 `api::terms.terms.find`). No `findOne`: the app
  never reads a single document by `documentId`. Justification per permission is in the table
  below. Bootstrap reconciles the role to this list (removes anything else) on every start.
- The users-permissions defaults on the public role (`auth.callback`, `auth.connect`,
  `auth.forgotPassword`, `auth.resetPassword`, `auth.register`, `auth.emailConfirmation`,
  `auth.sendEmailConfirmation`, `auth.refresh`) are removed, and the advanced setting
  `allow_register` is set to `false`. Verified in `@strapi/plugin-users-permissions@5.63.0`:
  `services/users-permissions.js` (`DEFAULT_PERMISSIONS`) and `bootstrap/index.js`
  (`allow_register: true` by default). The app has no end-user accounts, so these endpoints are
  unneeded attack surface. Note: the plugin recreates its defaults only when the permissions table
  is empty (`syncPermissions`), which never happens while our `find` permissions exist.
- The authenticated role gets no content permissions.
- **Published only for anonymous reads.** The REST API accepts `status=draft` from any caller
  that has `find` (verified: `@strapi/utils@5.63.0` `content-api-constants.js` lists `status` as an
  allowed query parameter; `@strapi/core@5.63.0` `core-api/service/core-service.js` defaults it to
  `published` only when absent; the Strapi REST docs page on `status` states no permission
  requirement for `status=draft`). With a plain public `find`, anyone could read drafts with
  `?status=draft`. A Strapi global middleware therefore removes `status`, `publicationFilter` and
  `hasPublishedVersion` from content API requests that are not authenticated by an API token, so
  the default (`published`) always applies to anonymous reads.
- CORS (`strapi::cors`, default `origin: '*'` in `@strapi/core@5.63.0` `middlewares/cors.js`) is
  restricted to an environment-driven allow-list, empty by default: the browser reaches the
  content API same-origin through nginx and never needs CORS.
- Strapi creates a default "Full Access" API token on a fresh database with no admin user and no
  token (`@strapi/admin@5.63.0` `bootstrap.js`, `createDefaultAPITokensIfNeeded`). It never
  reaches the browser, but it is an unused write credential: bootstrap deletes the default
  "Full Access" token, and it is never copied into any `.env`.

| Public permission | Why it is needed | Data exposed |
|---|---|---|
| `api::country.country.find` | Chooser, unknown-country links, currency and locale (ADR-0001); required by Strapi to filter `form-field` by `country.code` | Country code, name, currency, locale. Public by nature. |
| `api::form-field.form-field.find` | Step 1 form (US-01-BR-01) | Labels, rules, options, Spanish copy. Public by nature (shown to every visitor). |

**Caching**

- No HTTP cache interceptor and no service worker caching of `/api/` in Angular; content is loaded
  once per full page load and held in memory (US-01-Q-16, ADR-0001).
- No Strapi REST cache plugin. Strapi 5.63.0 core sets no `Cache-Control` on content API
  responses (no occurrence in `@strapi/core@5.63.0/dist`); nginx adds `no-store`.

**End-to-end writes for AC-03 (US-01-Q-23)**

- The write credential exists only in the **Playwright Node process**. Flow:
  1. Bootstrap creates a development super admin from `STRAPI_ADMIN_EMAIL` /
     `STRAPI_ADMIN_PASSWORD` when no admin user exists (fictitious values in `.env.example`; real
     `.env` git-ignored). The human uses the same account at HC3.
  2. The test's setup logs in to the admin API (`POST /admin/login`, verified in
     `@strapi/admin@5.63.0` `routes/authentication.js`; the response includes an access token)
     directly against Strapi's port, not through nginx.
  3. It creates a **custom** API token (`POST /admin/api-tokens`, type `custom`, verified in
     `routes/api-tokens.js` and `services/constants.js`: types `read-only`, `full-access`,
     `custom`) scoped to `api::form-field.form-field.create` and `.delete`, with the shortest
     lifespan Strapi accepts (7 days; the validator accepts only `null`, 7, 30 or 90 days).
  4. It creates the `mobilePhone` field with `POST /api/form-fields` on Strapi's port. A REST
     `POST` publishes immediately unless `status=draft` is passed (Strapi REST docs, `status`
     page), which is what AC-03 needs.
  5. Teardown deletes the field and then the token (`DELETE /admin/api-tokens/:id`), also when the
     test fails.
- The token and the admin JWT are never passed to `page.evaluate`, `page.route`,
  `addInitScript`, cookies or storage of the browser context. The browser under test talks only to
  nginx, which rejects any `Authorization` header and any non-GET method.

### Consequences

- Good, because no token of any kind is ever sent by the browser or stored on disk by the app (D1).
- Good, because the same build runs in compose, in `ng serve` and in any future host: the API path
  is relative (D2).
- Good, because drafts stay unreadable even when someone calls Strapi's port directly with
  `?status=draft` (D5).
- Good, because one start command is enough: no token has to be generated and copied before the
  front end works (D4).
- Bad, because anyone who can reach Strapi's port can call the two public `find` endpoints
  directly, bypassing the proxy's allow-list — mitigation: the data is public by nature, drafts are
  blocked in Strapi, and the role has no other permission. Rate limiting is out of scope.
- Bad, because the published-only rule is custom middleware that a Strapi upgrade could make
  incomplete (for example a new publication query parameter) — mitigation: an automated check
  (below) requests the seeded draft field anonymously; re-verify on every Strapi upgrade.
- Bad, because the e2e setup depends on Strapi's admin API (`/admin/login`, `/admin/api-tokens`),
  which is what the admin panel uses but is less documented than the REST API — mitigation: it is
  used only by tests; if it changes, only the AC-03 test breaks, and the HC3 manual check of AC-03
  in the admin remains.
- Bad, because a development admin account is created from environment variables — mitigation:
  fictitious values only in `.env.example`, `.env` git-ignored, and `scripts/scan-secrets.sh`.
- Neutral: nginx is needed anyway to serve the Angular build; the proxy adds a few lines of
  configuration, not a new service.

### Strongest argument against

Strapi's own port, which stays open for the admin panel, still answers the public `find`
endpoints to anyone who can reach it, and those requests skip the proxy's method and path
allow-list entirely. On that port, keeping drafts hidden rests only on custom published-only
middleware, which a Strapi upgrade could quietly make incomplete (for example through a new
publication query parameter) without any error. Option 3 (proxy-injected read-only token, empty
public role) would close Strapi's port to anonymous content reads altogether.

**Why we accept it:** the two exposed endpoints serve data that is public by nature, and the
public role has no other permission. Option 3 needs the token to exist before nginx starts,
which breaks the single start command (D4), and it gives the browser the same effective access
through the proxy, so its gain is limited to the direct port. The draft rule is guarded by an
automated anonymous request for the seeded draft field, re-run on every Strapi upgrade.

### Confirmation

- E2E `us-01-security.spec.ts` (AC-27): every browser request to `/api/` is a `GET`, none has an
  `Authorization` header, none contains a step 1 value.
- Check in the same file (an API request from the Node process, no browser): anonymous
  `GET /api/form-fields?status=draft&filters[key][$eq]=email` on Strapi's port returns no `email`
  field; `POST /api/form-fields` through nginx returns `405`.
- E2E `us-01-config-change.spec.ts` (AC-03) follows the write flow above; review checks that the
  token is created and deleted in Node only.
- Review checklist: bootstrap reconciles the public role to the table above; `allow_register` is
  `false`; no `Authorization` header and no Strapi host name in `frontend/src`;
  `scripts/scan-secrets.sh` exits 0.

## Pros and Cons of the Options

### 1. Direct access with the public role

- Good, because there is no proxy configuration at all.
- Bad, because the browser needs Strapi's absolute address, so the build needs a runtime
  `config.json` fetched before bootstrap (`provideAppInitializer`, present in
  `@angular/core@22.3.0`), a second artefact per environment.
- Bad, because Strapi's CORS (default `origin: '*'`) must be opened to the front-end origin.
- Bad, because caching and method rules can only live in Strapi.

### 2. Same-origin nginx proxy + public role (chosen)

- Good, because no token exists in the read path; nothing to provision.
- Good, because the API address is relative; CORS can be closed.
- Good, because method, path and cache rules sit in one reviewed file.
- Bad, because Strapi's own port still answers the public `find` endpoints (mitigated as above).

### 3. Same-origin nginx proxy injecting a read-only API token

- Good, because the public role can be empty: Strapi's port answers `403` to anonymous content
  requests.
- Bad, because the token must exist before nginx starts: Strapi generates the key randomly at
  creation (`@strapi/admin@5.63.0` `services/api-token.js`, `crypto.randomBytes`), so a single
  `docker compose up` would need Strapi to write the secret to a shared volume or to insert a
  pre-hashed key using its internal hashing, both fragile (D4).
- Bad, because the `read-only` type grants `find`/`findOne` on **every** content type, including
  future ones, and `status=draft` is still accepted; a `custom` token narrows it, but the
  published-only rule is still needed.
- Bad, because the proxy then grants anyone who reaches it the token's rights, so the browser's
  effective access is the same as option 2: the security gain is only on Strapi's direct port.

## More Information

- Verified sources (2026-11-20; packages fetched with `npm pack` into a temporary directory):
  `@strapi/core@5.63.0`, `@strapi/utils@5.63.0`, `@strapi/admin@5.63.0`,
  `@strapi/plugin-users-permissions@5.63.0`, `@angular/core@22.3.0` (files cited inline);
  https://docs.strapi.io/cms/api/rest/status (REST default `published`, `POST`/`PUT` publish
  unless `status=draft`); https://hub.docker.com/_/nginx (environment variables via templates).
- Related ADRs: ADR-0001 (which types are per country, and why `country` must be readable),
  ADR-0003 (step 1 values never leave the browser).
- Revisit when: the app gains end-user accounts, content that is not public appears, Strapi's
  port must be reachable from the internet without the proxy, or Strapi adds a permission for
  reading drafts through the content API.
