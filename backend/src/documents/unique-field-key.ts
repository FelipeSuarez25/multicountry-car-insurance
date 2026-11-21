import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * ADR-0001 / US-01-T-34: a `form-field` `key` is unique per country.
 *
 * Strapi's `unique` is global (or per locale), never scoped by a relation, so it is enforced here,
 * as a Document Service middleware on create, update and publish. Drafts are compared because
 * every document always has a draft row, so the draft is the current state of the content.
 */

const FORM_FIELD = 'api::form-field.form-field';
const GUARDED_ACTIONS = new Set(['create', 'update', 'publish']);

type Relation = unknown;

/** The documentId a relation value points to, whatever shape the caller used (string, { documentId }, connect, set). */
function relatedDocumentId(value: Relation): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return relatedDocumentId(value[0]);
  if (value && typeof value === 'object') {
    const shape = value as Record<string, unknown>;
    if (typeof shape['documentId'] === 'string') return shape['documentId'];
    if ('set' in shape) return relatedDocumentId(shape['set']);
    if ('connect' in shape) return relatedDocumentId(shape['connect']);
  }
  return undefined;
}

export function registerUniqueFieldKey(strapi: Core.Strapi): void {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== FORM_FIELD || !GUARDED_ACTIONS.has(context.action)) return next();

    const params = (context.params ?? {}) as { documentId?: string; data?: Record<string, unknown> };
    const documents = strapi.documents(FORM_FIELD);
    const data = params.data ?? {};
    let key = typeof data['key'] === 'string' ? data['key'] : undefined;
    let countryId = 'country' in data ? relatedDocumentId(data['country']) : undefined;

    // Whatever the call does not change comes from the stored draft (update, publish).
    if (params.documentId && (key === undefined || (!('country' in data) && countryId === undefined))) {
      const current = await documents.findOne({
        documentId: params.documentId,
        status: 'draft',
        fields: ['key'],
        populate: { country: { fields: ['documentId'] } },
      });
      if (current) {
        key ??= current['key'] as string;
        if (!('country' in data)) countryId = (current['country'] as { documentId?: string } | null)?.documentId;
      }
    }

    // Without a key or a country there is nothing to compare; a missing country is rejected on publish (strictRelations).
    if (key && countryId) {
      const clash = await documents.findFirst({
        status: 'draft',
        fields: ['documentId'],
        filters: {
          key: { $eq: key },
          country: { documentId: { $eq: countryId } },
          ...(params.documentId ? { documentId: { $ne: params.documentId } } : {}),
        },
      });
      if (clash) {
        throw new errors.ApplicationError(`Ya existe un campo con la clave "${key}" en este país.`);
      }
    }
    return next();
  });
}
