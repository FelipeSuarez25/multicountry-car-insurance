import { factories } from '@strapi/strapi';

/**
 * `locale` is a reserved Strapi attribute name (the Document Service system field), so the BCP 47
 * tag of a country is stored in `localeTag`. The contract of ADR-0001 and spec 7.3 (and every
 * consumer) calls it `locale`, so the content API keeps answering `locale`: a `fields[]=locale`
 * selection is mapped to `localeTag`, and the attribute is renamed in the response.
 */
const API_NAME = 'locale';
const STORED_NAME = 'localeTag';

type CountryItem = Record<string, unknown>;

function renameInFields(fields: unknown): unknown {
  if (typeof fields === 'string') return fields === API_NAME ? STORED_NAME : fields;
  if (Array.isArray(fields)) return fields.map((name) => (name === API_NAME ? STORED_NAME : name));
  return fields;
}

function toApiShape(item: CountryItem): CountryItem {
  if (!(STORED_NAME in item)) return item;
  const { [STORED_NAME]: tag, ...rest } = item;
  return { ...rest, [API_NAME]: tag };
}

export default factories.createCoreController('api::country.country', () => ({
  async find(ctx) {
    const query = ctx.query as Record<string, unknown>;
    if ('fields' in query) ctx.query = { ...query, fields: renameInFields(query['fields']) } as typeof ctx.query;
    const result = (await super.find(ctx)) as { data: CountryItem[]; meta: unknown };
    return { ...result, data: result.data.map(toApiShape) };
  },
}));
