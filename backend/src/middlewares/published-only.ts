import type { Core } from '@strapi/strapi';

/**
 * ADR-0002 / US-01-T-33: content API reads are published-only unless a valid API token is used.
 *
 * The REST API accepts `status=draft` from any caller allowed to `find`, so with a public `find`
 * anyone could read drafts. This middleware removes the publication parameters from every request
 * that Strapi did not authenticate with a valid API token.
 *
 * It is a ROUTE middleware (`config.middlewares: ['global::published-only']` on each content API
 * router, see `routes/*.ts`), not a global one: Strapi authenticates inside the route handler
 * (`compose-endpoint`: route info -> authenticate -> authorize -> policies -> route middlewares ->
 * controller), so the result in `ctx.state.auth` exists only from here on. A global middleware runs
 * before it and could only guess from the `Authorization` header, and Strapi ignores every value
 * that is not a valid `Bearer <token>` (the request then falls back to the public role).
 *
 * Fail closed: only `ctx.state.auth.strategy.name === 'content-api-token'` (a valid API token,
 * checked by Strapi itself) keeps the parameters. The public role, a users-permissions JWT, a
 * malformed or missing header all get published content. An invalid Bearer token never gets here
 * (401 from the authentication step). The path is not inspected, so the case of `/api` is moot.
 *
 * Re-verify on every Strapi upgrade: a new publication parameter would have to be added here
 * (US-01-AC-28 checks it with the seeded draft field), and so does the strategy name.
 */
const PUBLICATION_PARAMS = ['status', 'publicationFilter', 'hasPublishedVersion', 'publicationState'] as const;
const API_TOKEN_STRATEGY = 'content-api-token';

const publishedOnly: Core.MiddlewareFactory = () => {
  return async (ctx, next) => {
    const strategy = (ctx.state as { auth?: { strategy?: { name?: string } } }).auth?.strategy?.name;
    if (strategy !== API_TOKEN_STRATEGY) {
      const query = { ...(ctx.query as Record<string, unknown>) };
      let changed = false;
      for (const param of PUBLICATION_PARAMS) {
        if (param in query) {
          delete query[param];
          changed = true;
        }
      }
      if (changed) ctx.query = query as typeof ctx.query;
    }
    return next();
  };
};

export default publishedOnly;
