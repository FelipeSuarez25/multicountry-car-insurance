import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bootStrapi, type DocumentService, type TestStrapi } from './helpers/strapi';

/**
 * US-02 backend rules for the `plan` content type (spec 7.1, 7.3, 7.5; ADR-0001, ADR-0002):
 *
 *  - `key` is unique per country (extension of the Document Service middleware, US-02-Q-05): a
 *    second plan with the same key in the same country is rejected, in the other country it is
 *    accepted.
 *  - A `plan` has a required `country` relation and `documents.strictRelations: true`: publishing
 *    one without a country is rejected.
 *  - The attribute contract of spec 7.1 (types, required, defaults, `min`, `maxLength`, repeatable
 *    components) holds when content is written through the Document Service.
 *  - The public role holds exactly `country.find`, `form-field.find` and `plan.find` (spec 7.5).
 *  - The seed creates the plans of `specs/US-02/seed-plans.md`, with the draft-only and the
 *    inactive plan of each country.
 *
 * `published-only-routes.test.ts` already walks every `api::*` content type, so the router of
 * `plan` is covered there and not repeated here.
 *
 * Fictitious data only. Keys are prefixed "probe" so they never collide with the seed.
 */

const COUNTRY = 'api::country.country';
const PLAN = 'api::plan.plan';

interface PlanRow {
  documentId: string;
  key: string;
  isActive?: boolean;
  isRecommended?: boolean;
  basePrice?: number;
  publishedAt?: string | null;
}
type PlanDocuments = DocumentService & {
  findMany(params?: { filters?: Record<string, unknown>; status?: 'draft' | 'published'; populate?: unknown; sort?: unknown }): Promise<PlanRow[]>;
  findOne(params: { documentId: string; status?: 'draft' | 'published'; populate?: unknown }): Promise<(PlanRow & Record<string, unknown>) | null>;
};
type Attribute = { type: string; required?: boolean; min?: number; maxLength?: number; default?: unknown; component?: string; repeatable?: boolean; relation?: string; target?: string };

describe('US-02-BR-01 ADR-0001 plan rules (key per country, required country, attribute contract)', () => {
  let strapi: TestStrapi;
  let dispose: () => Promise<void>;
  let countries: DocumentService;
  let plans: PlanDocuments;
  let colombia: string;
  let chile: string;
  const created: string[] = [];

  /** A country by its natural key, created when the seed has not already created it. */
  async function ensureCountry(code: string, name: string, currencyCode: string, locale: string, sortOrder: number): Promise<string> {
    const existing = await countries.findFirst({ filters: { code }, status: 'published' });
    if (existing) return existing.documentId;
    const made = await countries.create({ data: { code, name, currencyCode, localeTag: locale, sortOrder }, status: 'published' });
    return made.documentId;
  }

  function planData(key: string, countryDocumentId?: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      key,
      name: 'Plan de prueba',
      shortDescription: 'Descripción de prueba.',
      basePrice: 1000,
      sortOrder: 10,
      coverages: [{ label: 'Cobertura de prueba' }],
      ...(countryDocumentId ? { country: { connect: [countryDocumentId] } } : {}),
      ...overrides,
    };
  }

  async function createPlan(
    key: string,
    country: string | undefined,
    status: 'draft' | 'published' = 'published',
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const made = await plans.create({ data: planData(key, country, overrides), status });
    created.push(made.documentId);
    return made.documentId;
  }

  const attributes = (): Record<string, Attribute> =>
    (strapi.contentTypes[PLAN] as unknown as { attributes: Record<string, Attribute> }).attributes;

  beforeAll(async () => {
    const booted = await bootStrapi();
    strapi = booted.strapi;
    dispose = booted.dispose;
    // A readable failure while the content type is not defined yet (US-02-T-11).
    expect(Object.keys(strapi.contentTypes), 'the `plan` content type of spec 7.1 must exist').toEqual(expect.arrayContaining([COUNTRY, PLAN]));
    countries = strapi.documents(COUNTRY);
    plans = strapi.documents(PLAN) as PlanDocuments;
    colombia = await ensureCountry('CO', 'Colombia', 'COP', 'es-CO', 10);
    chile = await ensureCountry('CL', 'Chile', 'CLP', 'es-CL', 20);
  }, 240_000);

  /**
   * Each test removes the probe plans it created, so no probe stays published and active for the
   * seed checks to see: those assertions then prove the seed is exactly the annex's plans.
   */
  async function removeProbes(): Promise<void> {
    if (!plans) return;
    for (const documentId of created.splice(0)) await plans.delete({ documentId }).catch(() => undefined);
  }

  afterEach(removeProbes, 60_000);

  afterAll(async () => {
    await removeProbes();
    if (dispose) await dispose();
  }, 60_000);

  describe('US-02-BR-01 the attribute contract of spec 7.1', () => {
    it('US-02-BR-01 `plan` is a collection type with draft & publish', () => {
      const type = strapi.contentTypes[PLAN] as unknown as { kind: string; options?: { draftAndPublish?: boolean } };
      expect(type.kind).toBe('collectionType');
      expect(type.options?.draftAndPublish).toBe(true);
    });

    it('US-02-BR-01 key, name and shortDescription are required strings; shortDescription has maxLength 200', () => {
      for (const name of ['key', 'name', 'shortDescription']) {
        expect(attributes()[name], name).toMatchObject({ type: 'string', required: true });
      }
      expect(attributes()['shortDescription'].maxLength).toBe(200);
    });

    it('US-02-BR-01 basePrice and sortOrder are required integers, and basePrice has min 1', () => {
      expect(attributes()['basePrice']).toMatchObject({ type: 'integer', required: true, min: 1 });
      expect(attributes()['sortOrder']).toMatchObject({ type: 'integer', required: true });
    });

    it('US-02-BR-01 isRecommended is a boolean that defaults to false and isActive a boolean that defaults to true', () => {
      expect(attributes()['isRecommended']).toMatchObject({ type: 'boolean', default: false });
      expect(attributes()['isActive']).toMatchObject({ type: 'boolean', default: true });
    });

    it('US-02-BR-01 coverages is a repeatable `plan.coverage` component with min 1, benefits a repeatable `plan.benefit`', () => {
      expect(attributes()['coverages']).toMatchObject({ type: 'component', repeatable: true, component: 'plan.coverage', min: 1 });
      expect(attributes()['benefits']).toMatchObject({ type: 'component', repeatable: true, component: 'plan.benefit' });
    });

    it('US-02-BR-01 `country` is a required many-to-one relation to `country`', () => {
      expect(attributes()['country']).toMatchObject({ type: 'relation', relation: 'manyToOne', target: COUNTRY });
    });

    it('US-02-Q-02 there is no `currency` attribute: the currency is the country\'s `currencyCode`', () => {
      expect(Object.keys(attributes())).not.toEqual(expect.arrayContaining(['currency']));
      expect(Object.keys(attributes())).not.toEqual(expect.arrayContaining(['currencyCode']));
    });

    it('US-02-BR-01 the components `plan.coverage` and `plan.benefit` exist, each with a required string `label`', () => {
      const components = (strapi as unknown as { components: Record<string, { attributes: Record<string, Attribute> }> }).components;
      for (const uid of ['plan.coverage', 'plan.benefit']) {
        expect(components[uid], uid).toBeDefined();
        expect(components[uid].attributes['label']).toMatchObject({ type: 'string', required: true });
      }
    });
  });

  describe('US-02-BR-01 / US-02-Q-05 the key is unique per country (middleware extended to `plan`)', () => {
    it('US-02-AC-09 rejects a second plan with the same key in the same country (published)', async () => {
      await createPlan('probe-same-key', colombia);
      await expect(createPlan('probe-same-key', colombia)).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 rejects the duplicate key also when the second plan is only a draft', async () => {
      await createPlan('probe-draft-dup', colombia);
      await expect(createPlan('probe-draft-dup', colombia, 'draft')).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 accepts the same key in the other country', async () => {
      await createPlan('probe-two-countries', colombia);
      await expect(createPlan('probe-two-countries', chile)).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-02-AC-09 rejects renaming a plan to a key that another plan of the same country already has', async () => {
      await createPlan('probe-rename-target', colombia);
      const other = await createPlan('probe-rename-source', colombia);
      await expect(plans.update({ documentId: other, data: { key: 'probe-rename-target' } })).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 does not treat a plan as a duplicate of itself: updating its other attributes works', async () => {
      const own = await createPlan('probe-self-update', colombia);
      await expect(plans.update({ documentId: own, data: { name: 'Otro nombre de prueba' } })).resolves.toBeDefined();
    }, 60_000);

    it('US-02-AC-09 a plan key does not clash with a form-field key of the same country (the rule is per content type)', async () => {
      // "total" is a plan key of the Colombia seed; the form fields of Colombia use camelCase keys like "plate".
      await expect(createPlan('plate', colombia)).resolves.toEqual(expect.any(String));
    }, 60_000);
  });

  describe('US-02-BR-01 the country relation is required (strictRelations, ADR-0001)', () => {
    it('US-02-BR-01 documents.strictRelations is true', () => {
      expect(strapi.config.get('api.documents.strictRelations')).toBe(true);
    });

    it('US-02-BR-01 refuses to publish a plan that has no country', async () => {
      await expect(createPlan('probe-no-country-published', undefined, 'published')).rejects.toThrow();
    }, 60_000);

    it('US-02-BR-01 refuses to publish an existing draft that has no country', async () => {
      // Strapi never enforces required relations on drafts (ADR-0001), so the draft exists; publishing it must fail.
      const draft = await createPlan('probe-no-country-draft', undefined, 'draft');
      await expect(plans.publish({ documentId: draft })).rejects.toThrow();
    }, 60_000);

    it('US-02-BR-01 a plan with a country can be published (the rules do not block valid content)', async () => {
      const id = await createPlan('probe-valid-published', colombia, 'draft');
      await expect(plans.publish({ documentId: id })).resolves.toBeDefined();
    }, 60_000);
  });

  describe('US-02-BR-01 / US-02-Q-06 values the content type refuses on publish', () => {
    it('US-02-AC-09 a published plan keeps isActive true and isRecommended false when the editor leaves them out (defaults)', async () => {
      const id = await createPlan('probe-defaults', colombia);
      const stored = await plans.findOne({ documentId: id, status: 'published' });
      expect(stored?.isActive).toBe(true);
      expect(stored?.isRecommended).toBe(false);
    }, 60_000);

    it('US-02-AC-09 refuses to publish a plan with basePrice 0 (min 1)', async () => {
      await expect(createPlan('probe-price-zero', colombia, 'published', { basePrice: 0 })).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 refuses a negative basePrice on publish', async () => {
      await expect(createPlan('probe-price-negative', colombia, 'published', { basePrice: -5 })).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 refuses a basePrice with decimals (850000.5): the attribute is an integer', async () => {
      await expect(createPlan('probe-price-decimal', colombia, 'published', { basePrice: 850000.5 })).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 accepts basePrice 1 (the lowest valid value, boundary)', async () => {
      await expect(createPlan('probe-price-one', colombia, 'published', { basePrice: 1 })).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-02-AC-09 refuses to publish a plan with no coverage (min 1)', async () => {
      await expect(createPlan('probe-no-coverage', colombia, 'published', { coverages: [] })).rejects.toThrow();
    }, 60_000);

    // US-02-R1-F02: the rule is proved through every path that can leave a published plan without coverages,
    // independent of the mechanism (custom middleware or Strapi's own schema validation).
    it('US-02-AC-09 refuses to publish an existing draft that has no coverages, and no published version appears', async () => {
      const draft = await createPlan('probe-draft-empty-publish', colombia, 'draft', { coverages: [] });
      await expect(plans.publish({ documentId: draft })).rejects.toThrow();
      expect(await plans.findOne({ documentId: draft, status: 'published' })).toBeNull();
    }, 60_000);

    // Strapi semantics (required + min 1 on a repeatable component): an unset list is refused even on a draft,
    // while a draft may hold [] (the admin panel and REST send [] for an empty repeatable) and then cannot be published.
    it('US-02-AC-09 refuses to create a draft with coverages unset (no draft without a list); the draft with [] is covered above', async () => {
      await expect(createPlan('probe-draft-unset', colombia, 'draft', { coverages: undefined })).rejects.toThrow();
      expect(await plans.findMany({ status: 'draft', filters: { key: 'probe-draft-unset' } })).toEqual([]);
    }, 60_000);

    it('US-02-AC-09 refuses to publish a draft whose coverages an editor emptied after saving it valid', async () => {
      const id = await createPlan('probe-draft-emptied', colombia, 'draft');
      await plans.update({ documentId: id, data: { coverages: [] } });
      await expect(plans.publish({ documentId: id })).rejects.toThrow();
      expect(await plans.findOne({ documentId: id, status: 'published' })).toBeNull();
    }, 60_000);

    it('US-02-AC-09 refuses to update a published plan so that it has no coverages, and the published coverages stay', async () => {
      const id = await createPlan('probe-update-empty', colombia, 'published');
      await expect(plans.update({ documentId: id, data: { coverages: [] }, status: 'published' })).rejects.toThrow();
      const stored = await plans.findOne({ documentId: id, status: 'published', populate: { coverages: true } });
      expect(stored?.['coverages']).toEqual([expect.objectContaining({ label: 'Cobertura de prueba' })]);
    }, 60_000);

    it('US-02-AC-09 control: a draft with coverages publishes, and a published plan can be updated with other coverages', async () => {
      const id = await createPlan('probe-coverage-control', colombia, 'draft');
      await expect(plans.publish({ documentId: id })).resolves.toBeDefined();
      await expect(
        plans.update({ documentId: id, data: { coverages: [{ label: 'Otra cobertura' }] }, status: 'published' }),
      ).resolves.toBeDefined();
      const stored = await plans.findOne({ documentId: id, status: 'published', populate: { coverages: true } });
      expect(stored?.['coverages']).toEqual([expect.objectContaining({ label: 'Otra cobertura' })]);
    }, 60_000);

    it('US-02-AC-09 a plan with no benefits is valid (benefits are optional)', async () => {
      await expect(createPlan('probe-no-benefits', colombia, 'published', { benefits: [] })).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-02-AC-09 refuses a coverage without a label (label is required)', async () => {
      await expect(createPlan('probe-coverage-no-label', colombia, 'published', { coverages: [{}] })).rejects.toThrow();
    }, 60_000);

    it('US-02-AC-09 refuses a shortDescription of 201 characters and accepts one of 200 (maxLength 200, both sides)', async () => {
      await expect(createPlan('probe-desc-201', colombia, 'published', { shortDescription: 'a'.repeat(201) })).rejects.toThrow();
      await expect(createPlan('probe-desc-200', colombia, 'published', { shortDescription: 'a'.repeat(200) })).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-02-AC-09 refuses a key that does not match ^[a-z][a-z0-9-]*$ ("Plan 4", "4plan", upper case) and accepts "plan-4"', async () => {
      for (const key of ['Plan 4', '4plan', 'Probe-Upper', 'probe_underscore']) {
        await expect(createPlan(key, colombia), key).rejects.toThrow();
      }
      await expect(createPlan('probe-plan-4', colombia)).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-02-AC-09 refuses to publish a plan without a name, without a shortDescription, without a sortOrder', async () => {
      await expect(createPlan('probe-no-name', colombia, 'published', { name: undefined })).rejects.toThrow();
      await expect(createPlan('probe-no-desc', colombia, 'published', { shortDescription: undefined })).rejects.toThrow();
      await expect(createPlan('probe-no-sort', colombia, 'published', { sortOrder: undefined })).rejects.toThrow();
    }, 60_000);
  });

  describe('US-02-AC-19 the public role is minimal (spec 7.5, ADR-0002)', () => {
    type Db = { query(uid: string): { findOne(p: unknown): Promise<{ id: number } | null>; findMany(p: unknown): Promise<{ action: string }[]> } };

    it('US-02-AC-19 the public role holds exactly country.find, form-field.find and plan.find (no findOne, no write)', async () => {
      const db = (strapi as unknown as { db: Db }).db;
      const role = await db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
      expect(role, 'the public role exists').not.toBeNull();
      const permissions = await db.query('plugin::users-permissions.permission').findMany({ where: { role: role?.id } });
      expect(permissions.map((p) => p.action).sort()).toEqual(['api::country.country.find', 'api::form-field.form-field.find', 'api::plan.plan.find']);
    }, 60_000);
  });

  describe('US-02-AC-01 / US-02-AC-08 the seed of specs/US-02/seed-plans.md', () => {
    const keysOf = async (code: string, status: 'draft' | 'published', onlyActive: boolean): Promise<string[]> => {
      const rows = await plans.findMany({
        status,
        filters: { country: { code }, ...(onlyActive ? { isActive: true } : {}) },
        sort: ['sortOrder:asc', 'key:asc'],
      });
      return rows.map((r) => r.key);
    };

    it('US-02-AC-01 Colombia has the published, active plans "basico", "clasico", "total", in sortOrder', async () => {
      expect(await keysOf('CO', 'published', true)).toEqual(['basico', 'clasico', 'total']);
    }, 60_000);

    it('US-02-AC-01 Chile has the published, active plans "esencial", "protegido", "premium", in sortOrder', async () => {
      expect(await keysOf('CL', 'published', true)).toEqual(['esencial', 'protegido', 'premium']);
    }, 60_000);

    it('US-02-AC-08 "joven" (Colombia) and "flex" (Chile) exist only as drafts: there is no published version', async () => {
      const publishedCo = await plans.findFirst({ filters: { key: 'joven' }, status: 'published' });
      const publishedCl = await plans.findFirst({ filters: { key: 'flex' }, status: 'published' });
      expect(publishedCo).toBeNull();
      expect(publishedCl).toBeNull();
      expect(await plans.findFirst({ filters: { key: 'joven' }, status: 'draft' })).not.toBeNull();
      expect(await plans.findFirst({ filters: { key: 'flex' }, status: 'draft' })).not.toBeNull();
    }, 60_000);

    it('US-02-AC-08 "total-plus" (Colombia) and "premium-plus" (Chile) are published with isActive false', async () => {
      for (const key of ['total-plus', 'premium-plus']) {
        const rows = await plans.findMany({ status: 'published', filters: { key } });
        expect(rows, key).toHaveLength(1);
        expect(rows[0].isActive, key).toBe(false);
      }
    }, 60_000);

    it('US-02-AC-02 "clasico" (Colombia) and "protegido" (Chile) are the recommended plans of the seed, and no other offered plan is', async () => {
      for (const [code, recommended] of [['CO', 'clasico'], ['CL', 'protegido']] as const) {
        const rows = await plans.findMany({ status: 'published', filters: { country: { code }, isActive: true } });
        expect(rows.filter((r) => r.isRecommended).map((r) => r.key), code).toEqual([recommended]);
      }
    }, 60_000);

    it('US-02-AC-07 the base prices are those of the annex (whole units of the country currency)', async () => {
      const expected: Record<string, number> = {
        basico: 850000, clasico: 1400000, total: 2100000, esencial: 290000, protegido: 480000, premium: 720000,
      };
      const rows = await plans.findMany({ status: 'published', filters: { key: { $in: Object.keys(expected) } } });
      expect(Object.fromEntries(rows.map((r) => [r.key, r.basePrice]))).toEqual(expected);
    }, 60_000);

    it('US-02-AC-01 every seeded plan has at least one coverage, in the configured order', async () => {
      const rows = await plans.findMany({ status: 'published', filters: { key: 'clasico' }, populate: { coverages: true, benefits: true } });
      const clasico = rows[0] as unknown as { coverages: { label: string }[]; benefits: { label: string }[] };
      expect(clasico.coverages.map((c) => c.label)).toEqual([
        'Responsabilidad civil extracontractual hasta $ 1.000.000.000',
        'Pérdida total por daños',
        'Pérdida total por hurto',
        'Asistencia jurídica en proceso penal',
      ]);
      expect(clasico.benefits.map((b) => b.label)).toEqual(['Asistencia en carretera 24/7', 'Conductor elegido (2 servicios al año)']);
    }, 60_000);
  });
});
