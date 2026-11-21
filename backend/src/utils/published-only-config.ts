/**
 * Router config for every content API router (ADR-0002, US-01-AC-28): the published-only
 * middleware runs after Strapi's authentication on each read action, so it can read the auth
 * result. A new content type's router MUST use this config.
 *
 * It is a FUNCTION on purpose: `createCoreRouter` stores `config[action]` as the route's own
 * `config`, and Strapi then mutates it in place (`defaultsDeep` adds `auth.scope: [<handler>]`).
 * A module-level constant would be one object shared by every router, so the first router to be
 * registered would fix the scope for all of them (a `form-field` route would require the
 * `country` scope, and the ADR-0005 token got 403). Each call returns fresh objects.
 *
 * Reads only: the rule strips draft/publication parameters from unauthenticated reads. Create,
 * update and delete are never reachable without a token that carries that exact action (the public
 * role has no write action, see bootstrap), and a valid token keeps its parameters anyway, so the
 * middleware would be a no-op there.
 */
export const publishedOnlyConfig = () => ({
  config: {
    find: { middlewares: ['global::published-only'] },
    findOne: { middlewares: ['global::published-only'] },
  },
});
