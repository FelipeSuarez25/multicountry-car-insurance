import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootStrapi, type DocumentService, type TestStrapi } from './helpers/strapi';

/**
 * US-01-T-38: the ADR-0001 Strapi rules for the `form-field` content type.
 *
 *  - `key` is unique per country (Document Service middleware, US-01-T-34): a second field with
 *    the same key in the same country is rejected, in the other country it is accepted.
 *  - A `form-field` has a required `country` relation and `documents.strictRelations: true`:
 *    publishing one without a country is rejected.
 *
 * Fictitious data only. Keys are prefixed "probe" so they never collide with the seed.
 */

const COUNTRY = 'api::country.country';
const FORM_FIELD = 'api::form-field.form-field';

describe('US-01-AC-01 / US-01-AC-14 ADR-0001 form-field rules (key per country, required country)', () => {
  let strapi: TestStrapi;
  let dispose: () => Promise<void>;
  let countries: DocumentService;
  let fields: DocumentService;
  let colombia: string;
  let chile: string;
  const created: string[] = [];

  /** A country by its natural key, created when the seed has not already created it. */
  async function ensureCountry(code: string, name: string, currencyCode: string, locale: string, sortOrder: number): Promise<string> {
    const existing = await countries.findFirst({ filters: { code }, status: 'published' });
    if (existing) return existing.documentId;
    const made = await countries.create({ data: { code, name, currencyCode, locale, sortOrder }, status: 'published' });
    return made.documentId;
  }

  function fieldData(key: string, countryDocumentId?: string): Record<string, unknown> {
    return {
      key,
      label: 'Campo de prueba',
      type: 'text',
      isRequired: false,
      sortOrder: 10,
      errorMessage: 'Revisa este campo.',
      ...(countryDocumentId ? { country: { connect: [countryDocumentId] } } : {}),
    };
  }

  async function createField(key: string, country: string | undefined, status: 'draft' | 'published' = 'published'): Promise<string> {
    const made = await fields.create({ data: fieldData(key, country), status });
    created.push(made.documentId);
    return made.documentId;
  }

  beforeAll(async () => {
    const booted = await bootStrapi();
    strapi = booted.strapi;
    dispose = booted.dispose;
    // A readable failure while the content types are not defined yet (US-01-T-15, US-01-T-16).
    expect(Object.keys(strapi.contentTypes), 'the content types of ADR-0001 must exist').toEqual(
      expect.arrayContaining([COUNTRY, FORM_FIELD]),
    );
    countries = strapi.documents(COUNTRY);
    fields = strapi.documents(FORM_FIELD);
    colombia = await ensureCountry('CO', 'Colombia', 'COP', 'es-CO', 10);
    chile = await ensureCountry('CL', 'Chile', 'CLP', 'es-CL', 20);
  }, 240_000);

  afterAll(async () => {
    if (fields) {
      for (const documentId of created) await fields.delete({ documentId }).catch(() => undefined);
    }
    if (dispose) await dispose();
  }, 60_000);

  it('US-01-AC-14 documents.strictRelations is true, so a required relation is enforced on publish (ADR-0001)', () => {
    expect(strapi.config.get('api.documents.strictRelations')).toBe(true);
  });

  it('US-01-AC-14 rejects a second form-field with the same key in the same country (published)', async () => {
    await createField('probeSameKey', colombia);
    await expect(createField('probeSameKey', colombia)).rejects.toThrow();
  }, 60_000);

  it('US-01-AC-14 rejects the duplicate key also when the second field is only a draft', async () => {
    await createField('probeDraftDup', colombia);
    await expect(createField('probeDraftDup', colombia, 'draft')).rejects.toThrow();
  }, 60_000);

  it('US-01-AC-14 accepts the same key in the other country', async () => {
    await createField('probeTwoCountries', colombia);
    await expect(createField('probeTwoCountries', chile)).resolves.toEqual(expect.any(String));
  }, 60_000);

  it('US-01-AC-14 rejects renaming a field to a key that another field of the same country already has', async () => {
    await createField('probeRenameTarget', colombia);
    const other = await createField('probeRenameSource', colombia);
    await expect(fields.update({ documentId: other, data: { key: 'probeRenameTarget' } })).rejects.toThrow();
  }, 60_000);

  it('US-01-AC-14 does not treat a field as a duplicate of itself: updating its other attributes works', async () => {
    const own = await createField('probeSelfUpdate', colombia);
    await expect(fields.update({ documentId: own, data: { label: 'Otra etiqueta de prueba' } })).resolves.toBeDefined();
  }, 60_000);

  it('US-01-AC-01 refuses to publish a form-field that has no country', async () => {
    await expect(createField('probeNoCountryPublished', undefined, 'published')).rejects.toThrow();
  }, 60_000);

  it('US-01-AC-01 refuses to publish an existing draft that has no country', async () => {
    // Strapi never enforces required relations on drafts (ADR-0001), so the draft exists; publishing it must fail.
    const draft = await createField('probeNoCountryDraft', undefined, 'draft');
    await expect(fields.publish({ documentId: draft })).rejects.toThrow();
  }, 60_000);

  it('US-01-AC-01 a form-field with a country can be published (the rules do not block valid content)', async () => {
    const id = await createField('probeValidPublished', colombia, 'draft');
    await expect(fields.publish({ documentId: id })).resolves.toBeDefined();
  }, 60_000);
});
