import type { Core } from '@strapi/strapi';

/**
 * ADR-0002 / US-01-T-33: anonymous content API reads are always published-only.
 *
 * The REST API accepts `status=draft` from any caller allowed to `find`, so with a public `find`
 * anyone could read drafts. This global middleware removes the publication parameters from every
 * content API request that carries no credential. A request that does carry an `Authorization`
 * header keeps them: an API token may read drafts (the editors' tooling), an invalid one is
 * refused with 401 by Strapi's own authentication, and a users-permissions JWT has no content
 * permissions (US-01-T-18).
 *
 * Re-verify on every Strapi upgrade: a new publication parameter would have to be added here
 * (US-01-AC-28 checks it with the seeded draft field).
 */
const PUBLICATION_PARAMS = ['status', 'publicationFilter', 'hasPublishedVersion', 'publicationState'] as const;

const publishedOnly: Core.MiddlewareFactory = () => {
  return async (ctx, next) => {
    if (ctx.path.startsWith('/api/') && !ctx.get('authorization')) {
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
