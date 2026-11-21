import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRichTextBlocks } from './rich-text-blocks';
import { parseTerms as parseTermsImpl } from './terms';
import { strapiListResponse, type StrapiItem } from '../../testing/seed-fixtures';
import {
  CL_TERMS_TITLE,
  CO_DRAFT_TERMS_TITLE,
  CO_TERMS_TITLE,
  paragraph,
  seedTermsBody,
  simpleTermsItem,
  text,
  toStrapiTermItem,
} from '../../testing/terms-fixtures';

/**
 * US-03 spec 7.2 / US-03-Q-12: the boundary parser and the selection of the terms of one country.
 * It receives the whole Strapi response and returns the terms to show: the most recently published
 * well-formed entry (it sorts by `publishedAt` itself and does not trust the server sort), with the
 * body parsed by `parseRichTextBlocks` (ADR-0009). A malformed entry is skipped with a warning that
 * names the problem and never the text. No well-formed entry is `null` ("not available"); a
 * response that is not a list at all throws (the page then shows its error state, as `parsePlans`).
 *
 * Expected API:
 *   `frontend/src/app/shared/terms.ts`:        parseTerms(body: unknown): Terms | null
 *   `frontend/src/app/shared/terms.model.ts`:  interface Terms { title: string; blocks: RichTextBlock[] }
 */

interface Terms {
  title: string;
  blocks: { kind: string }[];
}
/** The contract, typed here: when the module exists, this assignment checks the real signature. */
const parseTerms: (body: unknown) => Terms | null = parseTermsImpl;

const OLDER = '2026-11-20T08:00:00.000Z';
const NEWER = '2026-11-21T09:30:00.000Z';

describe('US-03 terms boundary parser and selection', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');
  const parse = (items: StrapiItem[]) => parseTerms(strapiListResponse(items));

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('US-03-AC-02 the seed terms are mapped to the logical shape', () => {
    it('US-03-AC-02 the Colombia seed gives its title and the parsed blocks, and nothing else', () => {
      const terms = parse([toStrapiTermItem({ title: CO_TERMS_TITLE, body: seedTermsBody('CO'), publishedAt: NEWER })]);
      expect(terms).toEqual({ title: CO_TERMS_TITLE, blocks: parseRichTextBlocks(seedTermsBody('CO')) });
      expect(Object.keys(terms ?? {}).sort()).toEqual(['blocks', 'title']);
    });

    it('US-03-AC-02 the Chile seed gives its own title and its numbered list', () => {
      const terms = parse([toStrapiTermItem({ title: CL_TERMS_TITLE, body: seedTermsBody('CL'), publishedAt: NEWER })]);
      expect(terms?.title).toBe(CL_TERMS_TITLE);
      expect(terms?.blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'heading', 'list', 'paragraph']);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-03-AC-02 id and documentId of the wire are ignored', () => {
      const terms = parse([toStrapiTermItem({ title: CO_TERMS_TITLE, body: seedTermsBody('CO'), publishedAt: NEWER })]);
      expect(JSON.stringify(terms)).not.toContain('documentId');
      expect(JSON.stringify(terms)).not.toContain('fixtureterms');
    });
  });

  describe('US-03-AC-14 which terms are shown: the most recently published well-formed one', () => {
    it('US-03-AC-14 with two published entries, the one with the later publishedAt wins', () => {
      const older = simpleTermsItem('Términos antiguos', 'Texto antiguo.', OLDER, 0);
      const newer = simpleTermsItem('Términos nuevos', 'Texto nuevo.', NEWER, 1);
      expect(parse([older, newer])?.title).toBe('Términos nuevos');
    });

    it('US-03-AC-14 the response order does not matter (the server sort is not trusted): newer first or last', () => {
      const older = simpleTermsItem('Términos antiguos', 'Texto antiguo.', OLDER, 0);
      const newer = simpleTermsItem('Términos nuevos', 'Texto nuevo.', NEWER, 1);
      expect(parse([newer, older])?.title).toBe('Términos nuevos');
      expect(parse([older, newer])?.title).toBe('Términos nuevos');
    });

    it('US-03-AC-14 instants are compared as instants, not as text: an offset time that is later wins', () => {
      const earlierText = simpleTermsItem('A', 'a', '2026-11-21T10:00:00.000Z', 0);
      // 2026-11-21T09:00:00-05:00 is 14:00 UTC, later than 10:00 UTC although its text sorts lower.
      const laterInstant = simpleTermsItem('B', 'b', '2026-11-21T09:00:00.000-05:00', 1);
      expect(parse([earlierText, laterInstant])?.title).toBe('B');
    });

    it('US-03-AC-14 a draft (publishedAt null) is never shown, even when it is the only valid-looking entry: the result is null', () => {
      const draft = simpleTermsItem(CO_DRAFT_TERMS_TITLE, 'Borrador no publicado: este texto nunca debe mostrarse.', null);
      expect(parse([draft])).toBeNull();
    });

    it('US-03-AC-14 a draft next to a published entry is skipped, the published one is shown', () => {
      const draft = simpleTermsItem(CO_DRAFT_TERMS_TITLE, 'Borrador no publicado: este texto nunca debe mostrarse.', null, 0);
      const published = toStrapiTermItem({ title: CO_TERMS_TITLE, body: seedTermsBody('CO'), publishedAt: OLDER }, 1);
      const terms = parse([draft, published]);
      expect(terms?.title).toBe(CO_TERMS_TITLE);
      expect(JSON.stringify(terms)).not.toContain('Borrador');
    });

    it('US-03-AC-14 when more than one well-formed entry exists a warning is logged, and it names no title or text', () => {
      parse([simpleTermsItem('Términos antiguos', 'Texto antiguo.', OLDER, 0), simpleTermsItem('Términos nuevos', 'Texto nuevo.', NEWER, 1)]);
      expect(warn).toHaveBeenCalled();
      expect(warned()).not.toContain('Términos');
      expect(warned()).not.toContain('Texto');
    });

    it('US-03-AC-14 a single well-formed entry logs no warning', () => {
      parse([simpleTermsItem('Términos únicos', 'Texto único.', NEWER)]);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('US-03-AC-12 malformed entries are skipped with a warning that never names the text', () => {
    const good = (): StrapiItem => simpleTermsItem('Términos válidos', 'Texto válido.', OLDER, 9);
    const base = { title: 'Título de prueba', body: [paragraph(text('Cuerpo de prueba.'))], publishedAt: NEWER };

    const malformed: [string, unknown][] = [
      ['a blank title', { ...base, title: '   ' }],
      ['an empty title', { ...base, title: '' }],
      ['a missing title', { ...base, title: undefined }],
      ['a title that is not a string', { ...base, title: 42 }],
      ['a null body', { ...base, body: null }],
      ['a missing body', { ...base, body: undefined }],
      ['an empty body array', { ...base, body: [] }],
      ['a body of only blank paragraphs', { ...base, body: [paragraph(text('  '))] }],
      ['a body that is a plain string (a text attribute instead of blocks)', { ...base, body: 'Texto plano' }],
      ['a body whose only text sits in unsupported nodes', { ...base, body: [{ type: 'image', image: {}, children: [text('')] }] }],
      ['a missing publishedAt', { ...base, publishedAt: undefined }],
      ['a null publishedAt (a draft)', { ...base, publishedAt: null }],
      ['a publishedAt that is not a date', { ...base, publishedAt: 'ayer por la tarde' }],
      ['a publishedAt that is a number', { ...base, publishedAt: 1_700_000_000 }],
    ];
    for (const [what, entry] of malformed) {
      it(`US-03-AC-12 ${what}: the entry is skipped and the next well-formed one is shown`, () => {
        const terms = parse([{ id: 1, documentId: 'x', ...(entry as object) }, good()]);
        expect(terms?.title).toBe('Términos válidos');
        expect(warn).toHaveBeenCalled();
        expect(warned()).not.toContain('Título de prueba');
        expect(warned()).not.toContain('Cuerpo de prueba');
        expect(warned()).not.toContain('Texto plano');
      });

      it(`US-03-AC-12 ${what}: when it is the only entry the result is null ("not available")`, () => {
        expect(parse([{ id: 1, documentId: 'x', ...(entry as object) }])).toBeNull();
      });
    }

    it('US-03-AC-12 an item that is not an object (null, a number, a string, an array) is skipped', () => {
      expect(parse([null as never, 7 as never, 'x' as never, [] as never, good()])?.title).toBe('Términos válidos');
    });

    it('US-03-AC-12 a malformed entry that is the most recent does not hide an older well-formed one', () => {
      const brokenNewest = { ...simpleTermsItem('Roto', 'Texto roto.', '2026-12-01T00:00:00.000Z', 0), body: [] };
      expect(parse([brokenNewest, good()])?.title).toBe('Términos válidos');
    });
  });

  describe('US-03-AC-12 empty and unexpected responses', () => {
    it('US-03-AC-12 a list with no entries is null: "not available" (not an error)', () => {
      expect(parse([])).toBeNull();
    });

    it('US-03-AC-12 a response that is not a list throws, so that the page shows its error state', () => {
      for (const body of [null, undefined, 'texto', 42, [], {}, { data: null }, { data: 'x' }, { data: {} }, { error: { status: 500 } }]) {
        expect(() => parseTerms(body), JSON.stringify(body)).toThrow();
      }
    });
  });

  describe('US-03-AC-13 the body is parsed by the whitelist parser', () => {
    it('US-03-AC-13 an XSS string in the body reaches the result as literal text of a span', () => {
      const payload = '<img src=x onerror=alert(1)>';
      const terms = parse([simpleTermsItem('Términos', payload, NEWER)]);
      expect(terms?.blocks).toEqual(parseRichTextBlocks([paragraph(text(payload))]));
      expect(JSON.stringify(terms?.blocks)).toContain(payload);
    });

    it('US-03-AC-13 an unsupported node inside a valid body is degraded as the parser says and the entry is still shown', () => {
      const body = [paragraph(text('Texto principal.')), { type: 'image', image: { name: 'x.png' }, children: [text('')] }];
      const terms = parse([toStrapiTermItem({ title: 'Términos', body, publishedAt: NEWER })]);
      expect(terms?.blocks.map((b) => b.kind)).toEqual(['paragraph']);
    });
  });
});
