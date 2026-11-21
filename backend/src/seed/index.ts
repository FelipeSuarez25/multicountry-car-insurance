import type { Core } from '@strapi/strapi';
import { SEED_COUNTRIES } from './countries';
import { SEED_FORM_FIELDS, type FieldSeed } from './form-fields';
import { SEED_PLANS } from './plans';
import { SEED_TERMS } from './terms';

const COUNTRY = 'api::country.country';
const FORM_FIELD = 'api::form-field.form-field';
const PLAN = 'api::plan.plan';
const TERM = 'api::term.term';

function fieldData(field: FieldSeed, countryDocumentId: string): Record<string, unknown> {
  // `draftOnly` is seed metadata (read by the caller), not a content attribute: drop it here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const plans = strapi.documents(PLAN);
  const terms = strapi.documents(TERM);

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

    // Plans (US-02-T-13): same rule, natural key country code + plan key; the draft-only plan stays a draft.
    for (const plan of SEED_PLANS[country.code] ?? []) {
      const found = await plans.findFirst({
        filters: { key: plan.key, country: { documentId: existing.documentId } },
        status: 'draft',
      });
      if (!found) {
        const { draftOnly,coverages, benefits, ...attributes } = plan;
        await plans.create({
          data: {
            ...attributes,
            coverages: coverages.map((label) => ({ label })),
            benefits: benefits.map((label) => ({ label })),
            country: { connect: [existing.documentId] },
          } as never,
          status: draftOnly ? 'draft' : 'published',
        });
        strapi.log.info(`Seed: created plan ${country.code}/${plan.key}`);
      }
    }

    // Terms (US-03-T-11): natural key country code + title; the "borrador" stays a draft.
    for (const term of SEED_TERMS[country.code] ?? []) {
      const found = await terms.findFirst({
        filters: { title: term.title, country: { documentId: existing.documentId } },
        status: 'draft',
      });
      if (!found) {
        await terms.create({
          data: { title: term.title, body: term.body, country: { connect: [existing.documentId] } } as never,
          status: term.draftOnly ? 'draft' : 'published',
        });
        strapi.log.info(`Seed: created terms ${country.code}/${term.title}`);
      }
    }
  }
}
