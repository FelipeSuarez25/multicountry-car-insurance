import type { Core } from '@strapi/strapi';
import { SEED_COUNTRIES } from './countries';
import { SEED_FORM_FIELDS, type FieldSeed } from './form-fields';

const COUNTRY = 'api::country.country';
const FORM_FIELD = 'api::form-field.form-field';

function fieldData(field: FieldSeed, countryDocumentId: string): Record<string, unknown> {
  const { draftOnly: _draftOnly, options, rules, ...attributes } = field;
  return {
    ...attributes,
    options: (options ?? []).map(([value, label], index) => ({ value, label, sortOrder: (index + 1) * 10 })),
    rules: (rules ?? []).map((rule) => ({ ...rule })),
    country: { connect: [countryDocumentId] },
  };
}

/**
 * Idempotent seed (US-01-T-17): each item is looked up by its natural key and created only when
 * missing, so a restart never duplicates or overwrites what editors changed. Published, except the
 * draft-only field (US-01-AC-13). Fields are looked up by their draft, which every document has,
 * so an unpublished seed field is not created a second time.
 */
export async function seed(strapi: Core.Strapi): Promise<void> {
  const countries = strapi.documents(COUNTRY);
  const fields = strapi.documents(FORM_FIELD);

  for (const country of SEED_COUNTRIES) {
    let existing = await countries.findFirst({ filters: { code: country.code }, status: 'draft' });
    if (!existing) existing = await countries.create({ data: country, status: 'published' });

    for (const field of SEED_FORM_FIELDS[country.code] ?? []) {
      const found = await fields.findFirst({
        filters: { key: field.key, country: { documentId: existing.documentId } },
        status: 'draft',
      });
      if (!found) {
        await fields.create({ data: fieldData(field, existing.documentId) as never, status: field.draftOnly ? 'draft' : 'published' });
        strapi.log.info(`Seed: created form field ${country.code}/${field.key}`);
      }
    }
  }
}
