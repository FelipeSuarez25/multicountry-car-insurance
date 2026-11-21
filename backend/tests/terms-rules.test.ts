import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bootStrapi, type DocumentService, type TestStrapi } from './helpers/strapi';
import { seed } from '../src/seed';

/**
 * US-03 backend rules for the `term` content type (spec 7.1, 7.3, 7.4; ADR-0001, ADR-0002,
 * ADR-0009, the US-03-Q-03 note in adr/README.md):
 *
 *  - The type is `api::term.term` (singularName `term`, pluralName `terms`: Strapi 5.63.0 refuses a
 *    type whose names are equal), a collection type with draft & publish, whose REST path is
 *    `/api/terms`.
 *  - `title` is a required string of at most 150 characters; `body` is a required `blocks`
 *    attribute (structure validated by Strapi on save, ADR-0009); `country` is a required
 *    `manyToOne` relation to `country` (`strictRelations`: publishing without it is rejected).
 *    There is no `key`, `sortOrder`, `isActive` or `version`, and no uniqueness rule: the most
 *    recently published one wins (US-03-Q-12), so two published terms of one country are accepted.
 *  - The public role holds exactly `country.find`, `form-field.find`, `plan.find` and
 *    `term.find` (no `findOne`, no write).
 *  - The seed of `specs/US-03/seed-terms.md`: the CO and CL terms published, the CO "borrador"
 *    only as a draft, and running the seed again creates nothing more.
 *
 * `published-only-routes.test.ts` walks every `api::*` content type, so the router of `term` is
 * covered there and not repeated here.
 *
 * Fictitious data only. Titles of probes start with "probe" so they never collide with the seed.
 */

const COUNTRY = 'api::country.country';
const TERM = 'api::term.term';
const CO_TITLE = 'Términos y condiciones del seguro de auto – Colombia';
const CL_TITLE = 'Términos y condiciones del seguro automotriz – Chile';
const DRAFT_TITLE = 'Términos y condiciones (borrador)';

interface TermRow {
  documentId: string;
  title: string;
  body?: unknown;
  publishedAt?: string | null;
}
type TermDocuments = DocumentService & {
  findMany(params?: { filters?: Record<string, unknown>; status?: 'draft' | 'published'; populate?: unknown; sort?: unknown }): Promise<TermRow[]>;
  findOne(params: { documentId: string; status?: 'draft' | 'published'; populate?: unknown }): Promise<TermRow | null>;
};
type Attribute = { type: string; required?: boolean; maxLength?: number; relation?: string; target?: string };
type Node = { type: string; level?: number; format?: string; bold?: boolean; text?: string; children?: Node[] };

const textNode = (text: string): Node => ({ type: 'text', text });
const validBody = (text = 'Texto de prueba.'): Node[] => [{ type: 'paragraph', children: [textNode(text)] }];
const flatText = (nodes: Node[] | undefined): string => (nodes ?? []).map((n) => n.text ?? flatText(n.children)).join('');

describe('US-03-BR-07 ADR-0009 the `term` content type (name, attributes, country relation)', () => {
  let strapi: TestStrapi & { apis: Record<string, { routes: Record<string, { routes?: { method: string; path: string; handler: string }[] }> }> };
  let dispose: () => Promise<void>;
  let countries: DocumentService;
  let terms: TermDocuments;
  let colombia: string;
  const created: string[] = [];

  async function ensureCountry(code: string, name: string, currencyCode: string, locale: string, sortOrder: number): Promise<string> {
    const existing = await countries.findFirst({ filters: { code }, status: 'published' });
    if (existing) return existing.documentId;
    const made = await countries.create({ data: { code, name, currencyCode, localeTag: locale, sortOrder }, status: 'published' });
    return made.documentId;
  }

  function termData(title: string, countryDocumentId?: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { title, body: validBody(), ...(countryDocumentId ? { country: { connect: [countryDocumentId] } } : {}), ...overrides };
  }

  async function createTerm(title: string, country: string | undefined, status: 'draft' | 'published' = 'published', overrides: Record<string, unknown> = {}): Promise<string> {
    const made = await terms.create({ data: termData(title, country, overrides), status });
    created.push(made.documentId);
    return made.documentId;
  }

  const attributes = (): Record<string, Attribute> => (strapi.contentTypes[TERM] as unknown as { attributes: Record<string, Attribute> }).attributes;

  beforeAll(async () => {
    const booted = await bootStrapi();
    strapi = booted.strapi as typeof strapi;
    dispose = booted.dispose;
    // A readable failure while the content type is not defined yet (US-03-T-11).
    expect(Object.keys(strapi.contentTypes), 'the `term` content type (api::term.term) of spec 7.1 must exist').toEqual(expect.arrayContaining([COUNTRY, TERM]));
    countries = strapi.documents(COUNTRY);
    terms = strapi.documents(TERM) as TermDocuments;
    colombia = await ensureCountry('CO', 'Colombia', 'COP', 'es-CO', 10);
  }, 240_000);

  async function removeProbes(): Promise<void> {
    if (!terms) return;
    for (const documentId of created.splice(0)) await terms.delete({ documentId }).catch(() => undefined);
  }
  afterEach(removeProbes, 60_000);
  afterAll(async () => {
    await removeProbes();
    if (dispose) await dispose();
  }, 60_000);

  describe('US-03-Q-03 the name and the REST path', () => {
    it('US-03-Q-03 the type is a collection type named `term` (plural `terms`), with draft & publish', () => {
      const type = strapi.contentTypes[TERM] as unknown as { kind: string; info: { singularName: string; pluralName: string }; options?: { draftAndPublish?: boolean } };
      expect(type.kind).toBe('collectionType');
      expect(type.info.singularName).toBe('term');
      expect(type.info.pluralName).toBe('terms');
      expect(type.options?.draftAndPublish).toBe(true);
    });

    it('US-03-Q-03 there is no content type `api::terms.terms` (Strapi would refuse equal singular and plural names)', () => {
      expect(Object.keys(strapi.contentTypes)).not.toContain('api::terms.terms');
    });

    it('US-03-AC-19 the REST path of `find` is /terms (served as /api/terms), and its handler is api::term.term.find', () => {
      const routes = Object.values(strapi.apis['term']?.routes ?? {}).flatMap((router) => router.routes ?? []);
      const find = routes.find((r) => r.handler === 'api::term.term.find');
      expect(find?.method).toBe('GET');
      expect(find?.path).toBe('/terms');
    });
  });

  describe('US-03 spec 7.1 the attribute contract', () => {
    it('US-03 spec 7.1 `title` is a required string of at most 150 characters', () => {
      expect(attributes()['title']).toMatchObject({ type: 'string', required: true, maxLength: 150 });
    });

    it('ADR-0009 `body` is a required `blocks` attribute (not richtext, not text, not free JSON)', () => {
      expect(attributes()['body']).toMatchObject({ type: 'blocks', required: true });
    });

    it('ADR-0001 `country` is a required many-to-one relation to `country`', () => {
      expect(attributes()['country']).toMatchObject({ type: 'relation', relation: 'manyToOne', target: COUNTRY });
    });

    it('US-03 spec 7.1 there is no key, sortOrder, isActive or version: unpublishing withdraws terms, the most recent wins', () => {
      for (const name of ['key', 'sortOrder', 'isActive', 'version', 'isRecommended']) expect(Object.keys(attributes()), name).not.toContain(name);
    });

    it('ADR-0001 documents.strictRelations is true', () => {
      expect(strapi.config.get('api.documents.strictRelations')).toBe(true);
    });
  });

  describe('ADR-0001 the country relation is required', () => {
    it('US-03-BR-07 refuses to publish terms that have no country', async () => {
      await expect(createTerm('probe sin país publicado', undefined, 'published')).rejects.toThrow();
    }, 60_000);

    it('US-03-BR-07 refuses to publish an existing draft that has no country', async () => {
      const draft = await createTerm('probe borrador sin país', undefined, 'draft');
      await expect(terms.publish({ documentId: draft })).rejects.toThrow();
      expect(await terms.findOne({ documentId: draft, status: 'published' })).toBeNull();
    }, 60_000);

    it('US-03-BR-07 terms with a country can be published (the rules do not block valid content)', async () => {
      const id = await createTerm('probe con país', colombia, 'draft');
      await expect(terms.publish({ documentId: id })).resolves.toBeDefined();
    }, 60_000);
  });

  describe('US-03 spec 7.1 / ADR-0009 values the content type refuses or accepts on publish', () => {
    it('US-03 spec 7.1 refuses terms with no title, with an empty title and with a title of 151 characters; accepts 150 (both sides of the limit)', async () => {
      await expect(createTerm('', colombia)).rejects.toThrow();
      await expect(createTerm('x', colombia, 'published', { title: undefined })).rejects.toThrow();
      await expect(createTerm('a'.repeat(151), colombia)).rejects.toThrow();
      await expect(createTerm('probe-' + 'a'.repeat(144), colombia)).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('ADR-0009 refuses to publish terms with no body (missing or null)', async () => {
      await expect(createTerm('probe sin cuerpo', colombia, 'published', { body: undefined })).rejects.toThrow();
      await expect(createTerm('probe cuerpo nulo', colombia, 'published', { body: null })).rejects.toThrow();
    }, 60_000);

    it('ADR-0009 accepts a valid `blocks` body and stores it as the same JSON', async () => {
      const id = await createTerm('probe cuerpo válido', colombia, 'published', { body: validBody('Texto guardado.') });
      const stored = await terms.findOne({ documentId: id, status: 'published' });
      expect(flatText((stored?.body as Node[])[0].children)).toBe('Texto guardado.');
    }, 60_000);

    it('ADR-0009 refuses a body whose node type Strapi does not know (the structure is validated on save)', async () => {
      await expect(createTerm('probe nodo desconocido', colombia, 'published', { body: [{ type: 'table', children: [textNode('x')] }] })).rejects.toThrow();
    }, 60_000);

    it('ADR-0009 refuses a link with a javascript: URL (only http, https, ftp, mailto and tel are accepted)', async () => {
      const body = [{ type: 'paragraph', children: [{ type: 'link', url: 'javascript:alert(1)', children: [textNode('clic')] }] }];
      await expect(createTerm('probe enlace peligroso', colombia, 'published', { body })).rejects.toThrow();
    }, 60_000);

    it('US-03-Q-12 two published terms of the same country are accepted (no uniqueness rule: the most recent wins)', async () => {
      await createTerm('probe primeros términos', colombia);
      await expect(createTerm('probe segundos términos', colombia)).resolves.toEqual(expect.any(String));
    }, 60_000);

    it('US-03-AC-14 terms with the same title in the same country are accepted too (no bespoke middleware)', async () => {
      await createTerm('probe mismo título', colombia);
      await expect(createTerm('probe mismo título', colombia)).resolves.toEqual(expect.any(String));
    }, 60_000);
  });

  describe('US-03-AC-19 the public role is minimal (spec 7.4, ADR-0002)', () => {
    type Db = { query(uid: string): { findOne(p: unknown): Promise<{ id: number } | null>; findMany(p: unknown): Promise<{ action: string }[]> } };

    it('US-03-AC-19 the public role holds exactly country.find, form-field.find, plan.find and term.find (no findOne, no write)', async () => {
      const db = (strapi as unknown as { db: Db }).db;
      const role = await db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
      expect(role, 'the public role exists').not.toBeNull();
      const permissions = await db.query('plugin::users-permissions.permission').findMany({ where: { role: role?.id } });
      expect(permissions.map((p) => p.action).sort()).toEqual([
        'api::country.country.find',
        'api::form-field.form-field.find',
        'api::plan.plan.find',
        'api::term.term.find',
      ]);
    }, 60_000);

    it('US-03-AC-19 the authenticated role holds no content permission either', async () => {
      const db = (strapi as unknown as { db: Db }).db;
      const role = await db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
      const permissions = role ? await db.query('plugin::users-permissions.permission').findMany({ where: { role: role.id } }) : [];
      expect(permissions.filter((p) => p.action.startsWith('api::'))).toEqual([]);
    }, 60_000);
  });

  describe('US-03-AC-02 / US-03-AC-13 / US-03-AC-14 the seed of specs/US-03/seed-terms.md', () => {
    const publishedOf = (code: string) => terms.findMany({ status: 'published', filters: { country: { code } } });

    it('US-03-AC-02 Colombia has exactly one published terms: "Términos y condiciones del seguro de auto – Colombia"', async () => {
      const rows = await publishedOf('CO');
      expect(rows.map((r) => r.title)).toEqual([CO_TITLE]);
    }, 60_000);

    it('US-03-AC-02 Chile has exactly one published terms: "Términos y condiciones del seguro automotriz – Chile"', async () => {
      const rows = await publishedOf('CL');
      expect(rows.map((r) => r.title)).toEqual([CL_TITLE]);
    }, 60_000);

    it('US-03-AC-14 "Términos y condiciones (borrador)" exists only as a draft of Colombia: no published version', async () => {
      const published = await terms.findMany({ status: 'published', filters: { title: DRAFT_TITLE } });
      expect(published).toEqual([]);
      const drafts = await terms.findMany({ status: 'draft', filters: { title: DRAFT_TITLE } });
      expect(drafts).toHaveLength(1);
      expect(JSON.stringify(drafts[0].body)).toContain('Borrador no publicado');
      const related = await terms.findMany({ status: 'draft', filters: { title: DRAFT_TITLE, country: { code: 'CO' } } });
      expect(related).toHaveLength(1);
    }, 60_000);

    it('US-03-AC-14 no published terms mentions the draft text, and none belongs to two countries', async () => {
      const everything = await terms.findMany({ status: 'published' });
      expect(JSON.stringify(everything.map((r) => r.body))).not.toContain('Borrador no publicado');
    }, 60_000);

    it('US-03-AC-13 the Colombia body is the annex: two paragraphs, a heading of level 2 "Condiciones principales", a bulleted list of three items, a paragraph; "ficticio" in bold', async () => {
      const [row] = await publishedOf('CO');
      const body = row.body as Node[];
      expect(body.map((n) => n.type)).toEqual(['paragraph', 'paragraph', 'heading', 'list', 'paragraph']);
      expect(body[2].level).toBe(2);
      expect(flatText(body[2].children)).toBe('Condiciones principales');
      expect(body[3].format).toBe('unordered');
      const items = (body[3].children ?? []).filter((n) => n.type === 'list-item');
      expect(items).toHaveLength(3);
      expect(items.map((i) => flatText(i.children))).toEqual([
        expect.stringContaining('La vigencia de la póliza es de un año desde la fecha de pago.'),
        expect.stringContaining('El precio mostrado es anual y está expresado en pesos colombianos (COP).'),
        expect.stringContaining('Puedes retractarte dentro de los 10 días siguientes al pago.'),
      ]);
      const bold = (body[0].children ?? []).filter((n) => n.bold === true);
      expect(bold.map((n) => n.text)).toEqual(['ficticio']);
      expect(flatText(body[0].children)).toContain('Este documento es ficticio y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro.');
      expect(flatText(body[4].children)).toBe('Ley aplicable: Colombia. Texto de prueba sin validez legal.');
    }, 60_000);

    it('US-03-AC-13 the Chile body is the annex: the heading is "Condiciones generales" and the list is numbered', async () => {
      const [row] = await publishedOf('CL');
      const body = row.body as Node[];
      expect(body.map((n) => n.type)).toEqual(['paragraph', 'paragraph', 'heading', 'list', 'paragraph']);
      expect(flatText(body[2].children)).toBe('Condiciones generales');
      expect(body[3].format).toBe('ordered');
      expect((body[3].children ?? []).filter((n) => n.type === 'list-item')).toHaveLength(3);
      expect(JSON.stringify(body)).toContain('pesos chilenos (CLP)');
      expect(JSON.stringify(body)).not.toContain('pesos colombianos');
      expect(flatText(body[4].children)).toBe('Ley aplicable: Chile. Texto de prueba sin validez legal.');
    }, 60_000);

    it('US-03-AC-14 the seed is idempotent: running it twice more creates no document and changes no title', async () => {
      const snapshot = async (): Promise<string[]> => {
        const drafts = await terms.findMany({ status: 'draft' });
        const published = await terms.findMany({ status: 'published' });
        return [...drafts.map((r) => `draft:${r.title}`), ...published.map((r) => `published:${r.title}`)].sort();
      };
      const before = await snapshot();
      expect(before.length).toBeGreaterThanOrEqual(5); // 3 drafts (CO, CL, CO borrador) and 2 published at least
      await seed(strapi as never);
      await seed(strapi as never);
      expect(await snapshot()).toEqual(before);
    }, 120_000);
  });
});
