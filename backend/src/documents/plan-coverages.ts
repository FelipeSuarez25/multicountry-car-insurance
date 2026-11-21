import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * US-02-BR-01 / US-02-AC-09: a published plan has at least one coverage.
 *
 * Strapi enforces the `min` of a repeatable component in the admin panel only, never in the
 * Document Service, so the schema's `min: 1` is backed here: any call that would leave a published
 * version without coverages is refused (create or update with `status: 'published'`, and publish).
 * Drafts may be incomplete while an editor works.
 */
const PLAN = 'api::plan.plan';

export function registerPlanCoverages(strapi: Core.Strapi): void {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== PLAN) return next();
    const params = (context.params ?? {}) as { documentId?: string; status?: string; data?: Record<string, unknown> };
    const publishing = context.action === 'publish' || (['create', 'update'].includes(context.action) && params.status === 'published');
    if (!publishing) return next();

    let coverages: unknown = params.data?.['coverages'];
    if (coverages === undefined && params.documentId) {
      const draft = await strapi.documents(PLAN).findOne({ documentId: params.documentId, status: 'draft', populate: { coverages: true } });
      coverages = draft?.['coverages'];
    }
    if (!Array.isArray(coverages) || coverages.length === 0) {
      throw new errors.ApplicationError('Un plan publicado necesita al menos una cobertura.');
    }
    return next();
  });
}
