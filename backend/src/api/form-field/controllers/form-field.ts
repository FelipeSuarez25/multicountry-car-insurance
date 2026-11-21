import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const UID = 'api::form-field.form-field';

/**
 * Reduces the accepted shapes of the `country` relation to a single documentId:
 * `"<id>"`, `{ connect: ["<id>"] }`, `{ connect: [{ documentId }] }` or `{ set: [...] }`.
 */
function toCountryDocumentId(value: unknown): string {
  const invalid = () => new errors.ValidationError('Invalid key country');
  const pick = (item: unknown): string | undefined => {
    if (typeof item === 'string' && item.length > 0) return item;
    const documentId = (item as { documentId?: unknown } | null)?.documentId;
    return typeof documentId === 'string' && documentId.length > 0 ? documentId : undefined;
  };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const relation = value as { connect?: unknown; set?: unknown };
    const list = relation.connect ?? relation.set;
    if (Array.isArray(list) && list.length === 1 && pick(list[0])) return pick(list[0]) as string;
    throw invalid();
  }
  const id = pick(value);
  if (!id) throw invalid();
  return id;
}

/**
 * US-01-AC-03 / ADR-0002: the temporary end-to-end token is scoped to `form-field` create and
 * delete only. Strapi's input validation additionally demands read permission on every relation
 * target and answers 400 "Invalid key country" otherwise. The `country` relation is therefore
 * reduced here to one validated documentId and attached after the rest of the payload has passed
 * the normal validation and sanitization. The scope of the token is not widened, and the target is
 * still checked by the document service (an unknown documentId is refused).
 */
export default factories.createCoreController(UID, ({ strapi }) => ({
  async create(ctx) {
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const body = (ctx.request.body ?? {}) as { data?: Record<string, unknown> };
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }
    const { country, ...rest } = body.data;
    await this.validateInput(rest, ctx);
    const sanitizedInput = (await this.sanitizeInput(rest, ctx)) as Record<string, unknown>;
    const entity = await strapi.service(UID).create({
      ...sanitizedQuery,
      data: { ...sanitizedInput, country: toCountryDocumentId(country) },
    });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    ctx.status = 201;
    return this.transformResponse(sanitizedEntity);
  },
}));
