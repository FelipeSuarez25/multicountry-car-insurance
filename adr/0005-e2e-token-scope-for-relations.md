---
status: Accepted
date: 2026-11-21
decision-makers: Felipe Sabogal (accepted at HC2, 2026-11-21), architect subagent (proposal)
consulted: strapi-developer (runtime evidence, gate attempt 1), commit e5ba5ff, published packages @strapi/utils, @strapi/core, @strapi/admin, @strapi/content-manager 5.63.0
informed: all agents via CLAUDE.md precedence
---

# ADR-0005: Scope of the temporary e2e API token when the created content has relations (amends ADR-0002)

## Context and Problem Statement

ADR-0002 (Accepted) lets the AC-03 end-to-end test create a `form-field` through Strapi's own port
with a temporary `custom` API token scoped to `api::form-field.form-field.create` and `.delete`
only (ADR-0002, "End-to-end writes for AC-03", step 3). A `form-field` has a required `country`
relation (ADR-0001). In gate attempt 1 of US-01, `POST /api/form-fields` with
`country: { connect: [<documentId>] }` failed with `400 ValidationError "Invalid key country"`
(`details.key = "country"`, `source = "body"`). Strapi 5.63.0 refuses a relation key in the
input unless the caller may **read** the relation target. The strapi-developer confirmed at runtime
that the same payload succeeds once `api::country.country.find` is added to the token. This ADR
decides how the e2e write gets past that check. It amends ADR-0002 **only** in the scope of the
temporary e2e token. Everything else in ADR-0002 stays as it is. Story: US-01
(`specs/US-01/spec.md`, US-01-AC-03, US-01-Q-23).

## Decision Drivers

- D1. "No Strapi token with write permissions may reach the browser. Public role permissions minimal and justified" (source: Assessment, security; CLAUDE.md §3; ADR-0002 D1). Any write credential stays minimal and lives only in the Playwright Node process.
- D2. AC-03 is automated: the test creates a published field linked to a country during the run, then deletes it (US-01-AC-03, US-01-Q-23).
- D3. Keep bespoke code off security-relevant paths: every custom controller on a write endpoint has to be reviewed and re-verified on each Strapi upgrade (human decision, Felipe Sabogal, 2026-11-21; ADR-0002 already carries one such custom piece, the published-only middleware).
- D4. Do not change the public role or the read path decided in ADR-0002 (Accepted ADRs are binding, CLAUDE.md §1).

## Considered Options

1. **Widen the temporary token**: `form-field.create`, `form-field.delete` and
   `api::country.country.find` (read-only).
2. **Custom `form-field` create controller**: validate the payload without `country`, then attach
   one validated country `documentId` before calling the document service; the token keeps the
   ADR-0002 scope. Implemented in commit e5ba5ff, to be reverted.
3. **Admin API (content-manager) write path**: no content-API token at all; the test uses the admin
   JWT it already obtains in ADR-0002 step 2 and calls
   `POST /content-manager/collection-types/api::form-field.form-field/actions/publish` (create and
   publish in one request) and `DELETE /content-manager/collection-types/api::form-field.form-field/:id`.

## Decision Outcome

Chosen option: **"1. Widen the temporary token with `country.find`"**, because it uses Strapi's
own relation-permission rule as designed and needs no custom code on a write endpoint (D3). The
only right it adds is a read of country data, which the public role already exposes (D1). The
AC-03 test then works with the stock controller (D2), and the public role and read path are
unchanged (D4).

### What is decided (amendment to ADR-0002, step 3 of "End-to-end writes for AC-03")

- The temporary `custom` API token created by the AC-03 test setup has exactly these permissions:
  `api::form-field.form-field.create`, `api::form-field.form-field.delete` and
  `api::country.country.find`. Nothing else. Lifespan and teardown stay as in ADR-0002 (7 days,
  deleted in teardown, also on failure).
- The custom `create` in `backend/src/api/form-field/controllers/form-field.ts` added by e5ba5ff
  is reverted to `factories.createCoreController('api::form-field.form-field')`.
- General rule for later stories: when a test token must write a document with relations, it gets
  `find` on each relation target, and on nothing more. ADR-0002's public role table does not
  change.

### Consequences

- Good, because the form-field write path is Strapi's stock controller again: input validation,
  sanitisation and the relation check all run unchanged (D3).
- Good, because the added permission matches what is already public. `api::country.country.find`
  is in the public role (ADR-0002 table), so the token learns nothing about published countries
  that an anonymous caller cannot learn.
- Bad, because the token's scope is no longer "write only". It now includes a read, and later
  stories will add one `find` per relation target (for example US-02 if a plan test writes plans
  with a `country` relation). Mitigation: the scope list sits in one place in the e2e setup, and
  review checks it against this ADR.
- Bad, because a token holder can read **draft** countries. The published-only middleware
  (`backend/src/middlewares/published-only.ts`) keeps publication parameters on any request that
  carries an `Authorization` header, so `GET /api/countries?status=draft` with this token returns
  drafts, which the public role cannot see. Mitigation: the token exists only in the Playwright
  Node process for the length of the test, is deleted in teardown, and country records hold no
  secret data (code, name, currency, locale).
- Neutral: Strapi checks the **token's own** permissions, not the public role's
  (`content-api-token.js` `verify`, see More Information). The public `country.find` therefore does
  not satisfy the check, and the token needs the permission itself.

### Strongest argument against

Option 3 removes the content-API write token altogether. ADR-0002 step 2 already logs in to the
admin API and holds an admin JWT in the Node process, and the content-manager can create, publish
and delete the field with that JWT. So there would be no token to scope, nothing to widen as
later stories add relations, no API token row to clean up, and the test would follow the same
path an editor takes in the admin panel, which is what AC-03 describes ("the business team adds
and publishes in Strapi a new field"). Option 1 keeps a second credential and adds to its scope.

**Why we accept it:** the admin JWT belongs to the bootstrap super admin, so it has every admin
permission. Making it the write credential swaps a narrow, expiring, deletable token for a
full-power session, which is worse under D1. The content-manager routes are also internal admin
APIs whose payload format (relation `connect` shapes, locale and status handling) is less
documented than the REST API, the same risk ADR-0002 accepted only for `/admin/login` and
`/admin/api-tokens`. Option 1 grants a read on data that is already public and keeps the test on
the content API that ADR-0002 chose. Option 3 stays the fallback if the token scope grows beyond a
few `find` permissions.

### Confirmation

- E2E `frontend/e2e/us-01-config-change.spec.ts` (AC-03): the token creation request lists exactly
  the three permissions above; the test creates the `mobilePhone` field with
  `country: { connect: [<documentId>] }` through the stock controller and gets `201`; teardown
  deletes the field and the token.
- Review checklist: `backend/src/api/form-field/controllers/form-field.ts` is the plain
  `createCoreController` (no custom `create`); the e2e token scope matches this ADR; the token and
  admin JWT never enter the browser context (ADR-0002 confirmation still applies).

## Pros and Cons of the Options

### 1. Widen the temporary token with `country.find` (chosen)

- Good, because no custom code: Strapi's own `throwRestrictedRelations` check passes the normal
  way.
- Good, because the added right is read-only and matches the public role.
- Bad, because the scope grows with every relation target a test writes to.
- Bad, because the token can read draft countries (mitigated above).

### 2. Custom `form-field` create controller (commit e5ba5ff)

The controller pulls `country` out of `data`, runs `validateInput` and `sanitizeInput` on the
rest, then passes `country: <documentId>` straight to the document service.

- Good, because the token keeps the narrowest scope ADR-0002 wrote down (create and delete only).
- Good, because the document service still refuses an unknown `documentId`.
- Bad, because it deliberately bypasses Strapi's relation-permission check on a public write
  endpoint, for every caller that has `form-field.create`, not only the test. Any future token or
  role with that permission can then link a `form-field` to a country it cannot read.
- Bad, because it is bespoke security-relevant code (about 50 lines, its own relation-shape
  parser) to re-verify on every Strapi upgrade, against D3.
- Bad, because the same workaround would be needed again for every relation and every type a
  later test writes.

### 3. Admin API (content-manager) write path

Verified viable in `@strapi/content-manager@5.63.0`: `dist/server/routes/admin.js` defines
`POST /collection-types/:model/actions/publish` (handler `collection-types.publish`, policies
`admin::isAuthenticatedAdmin` and `explorer.publish`), and `dist/server/controllers/collection-types.js`
`publish` creates the document when no `id` is given ("Create a new document and publish it in one
request"). `DELETE /collection-types/:model/:id` maps to `collection-types.delete`. These routes are
served under the `/content-manager` prefix on the admin API.

- Good, because no content-API write token exists at all, so there is nothing to scope or widen.
- Good, because it follows the same path an editor's click in the admin panel takes.
- Bad, because the credential is the super admin's JWT, with full admin rights, instead of a narrow
  expiring token (D1).
- Bad, because the content-manager API is internal to the admin panel and less documented, and its
  relation payload format was not exercised in this project.
- Bad, because it contradicts the write flow in ADR-0002 (steps 3 to 5) far more than a scope
  change does, so it would need a superseding ADR rather than an amendment.

## More Information

- Verified sources (2026-11-21; each package fetched with `npm pack` into a temporary directory
  outside the repo):
  - `@strapi/utils@5.63.0` `dist/validate/visitors/throw-restricted-relations.js`:
    `ACTIONS_TO_VERIFY = ['find']`; for a regular relation, `handleRegularRelation` builds the
    scope `` `${attribute.target}.find` `` and calls `strapi.auth.verify(auth, { scope })`; if it
    fails, `throwInvalidKey({ key, path })` raises the observed `Invalid key country`
    (`dist/validate/utils.js`, `throwInvalidKey`).
  - `@strapi/utils@5.63.0` `dist/validate/index.js` `validateInput`: the restricted-relations
    visitor runs whenever the request has `auth` (`if (auth) { transforms.push(traverseEntity(throwRestrictedRelations(auth), …)) }`).
  - `@strapi/core@5.63.0` `dist/core-api/controller/collection-type.js` `create` calls
    `this.validateInput(body.data, ctx)`, which delegates to `strapi.contentAPI.validate.input`
    (`dist/core-api/controller/index.js`).
  - `@strapi/admin@5.63.0` `dist/server/server/src/strategies/content-api-token.js` `verify`: for a
    `custom` token, `scopes.every((scope) => ability.can(scope))`, so only the token's own
    permissions count (the public role is not consulted).
  - `@strapi/content-manager@5.63.0` `dist/server/routes/admin.js` and
    `dist/server/controllers/collection-types.js` (option 3, cited above).
- Runtime evidence (strapi-developer, gate attempt 1): the 400 body quoted in the context, and the
  `201` once `country.find` was added to the token.
- Related ADRs: ADR-0002 (amended here, only step 3 of the AC-03 write flow; its index status
  becomes "Accepted (amended by ADR-0005)"), ADR-0001 (the `country` relation on per-country
  types).
- Revisit when: a test token needs `find` on a type that is not in the public role, the scope list
  grows beyond a handful of `find` permissions (then reconsider option 3 in a superseding ADR), or a
  Strapi upgrade changes `ACTIONS_TO_VERIFY` or the token `verify` logic.
