/**
 * Router config for every content API router (ADR-0002, US-01-AC-28): the published-only
 * middleware runs after Strapi's authentication on each action, so it can read the auth result.
 * A new content type's router MUST use this config.
 */
const middlewares = ['global::published-only'];

export const publishedOnlyConfig = {
  config: {
    find: { middlewares },
    findOne: { middlewares },
    create: { middlewares },
    update: { middlewares },
    delete: { middlewares },
  },
};
