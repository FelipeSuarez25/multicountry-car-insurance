import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRichTextBlocks as parseRichTextBlocksImpl } from './rich-text-blocks';
import { heading, list, listItem, paragraph, seedTermsBody, text, type WireNode } from '../../testing/terms-fixtures';

/**
 * ADR-0009: the boundary parser of Strapi `blocks` (pure function, no Angular). It returns only the
 * logical, whitelisted tree; unsupported formatting degrades or is dropped with a `console.warn`
 * that names the node type or the problem and never the text, a URL or a file name.
 *
 * Expected API:
 *   `frontend/src/app/shared/rich-text-blocks.ts`:
 *     parseRichTextBlocks(value: unknown): RichTextBlock[] | null
 *   `frontend/src/app/shared/rich-text-blocks.model.ts`:
 *     RichTextSpan   = { text; bold; italic; underline; strikethrough }   (booleans, always present)
 *     RichTextList   = { ordered: boolean; items: RichTextListItem[] }
 *     RichTextListItem = { spans: RichTextSpan[]; lists: RichTextList[] }
 *     RichTextBlock  = { kind: 'paragraph'; spans } | { kind: 'heading'; depth: number; spans } | { kind: 'list'; list }
 */

interface RichTextSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}
interface RichTextListItem {
  spans: RichTextSpan[];
  lists: RichTextList[];
}
interface RichTextList {
  ordered: boolean;
  items: RichTextListItem[];
}
type RichTextBlock = { kind: 'paragraph'; spans: RichTextSpan[] } | { kind: 'heading'; depth: number; spans: RichTextSpan[] } | { kind: 'list'; list: RichTextList };
/** The contract (ADR-0009), typed here: when the module exists, this assignment checks the real signature. */
const parseRichTextBlocks: (value: unknown) => RichTextBlock[] | null = parseRichTextBlocksImpl;

const span = (value: string, marks: Partial<Omit<RichTextSpan, 'text'>> = {}): RichTextSpan => ({
  text: value,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  ...marks,
});

const textOf = (spans: readonly RichTextSpan[]): string => spans.map((s) => s.text).join('');
type ListBlock = Extract<RichTextBlock, { kind: 'list' }>;

describe('ADR-0009 parseRichTextBlocks (US-03-AC-13 whitelist, degradation and malformed bodies)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const warned = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');
  const parse = (value: unknown): RichTextBlock[] => {
    const result = parseRichTextBlocks(value);
    if (result === null) throw new Error('expected blocks, got null');
    return result;
  };
  /** A body that always has some text, so a dropped node does not turn the whole body into `null`. */
  const withText = (...nodes: WireNode[]): WireNode[] => [paragraph(text('Texto base.')), ...nodes];

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('US-03-AC-13 the seed bodies parse to the expected tree, with no warning', () => {
    it('US-03-AC-13 the Colombia seed: two paragraphs, a heading of depth 0, a bulleted list of three items, a paragraph', () => {
      const blocks = parse(seedTermsBody('CO'));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'heading', 'list', 'paragraph']);
      expect(blocks[0]).toEqual({
        kind: 'paragraph',
        spans: [
          span('Este documento es '),
          span('ficticio', { bold: true }),
          span(' y se usa solo para demostrar el cotizador. No constituye una oferta real de seguro.'),
        ],
      });
      expect(blocks[2]).toEqual({ kind: 'heading', depth: 0, spans: [span('Condiciones principales')] });
      const listBlock = blocks[3] as ListBlock;
      expect(listBlock.list.ordered).toBe(false);
      expect(listBlock.list.items.map((i) => textOf(i.spans))).toEqual([
        'La vigencia de la póliza es de un año desde la fecha de pago.',
        'El precio mostrado es anual y está expresado en pesos colombianos (COP).',
        'Puedes retractarte dentro de los 10 días siguientes al pago.',
      ]);
      expect(listBlock.list.items.every((i) => i.lists.length === 0)).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    });

    it('US-03-AC-13 the Chile seed: the list is numbered and the heading is "Condiciones generales"', () => {
      const blocks = parse(seedTermsBody('CL'));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph', 'heading', 'list', 'paragraph']);
      expect(textOf((blocks[2] as { spans: RichTextSpan[] }).spans)).toBe('Condiciones generales');
      expect((blocks[3] as ListBlock).list.ordered).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('ADR-0009 supported nodes', () => {
    it('ADR-0009 a paragraph keeps its text as one span with all marks false', () => {
      expect(parse([paragraph(text('Hola'))])).toEqual([{ kind: 'paragraph', spans: [span('Hola')] }]);
    });

    it('ADR-0009 the marks bold, italic, underline and strikethrough are kept on their span', () => {
      const blocks = parse([
        paragraph(text('a', { bold: true }), text('b', { italic: true }), text('c', { underline: true }), text('d', { strikethrough: true }), text('e', { bold: true, italic: true })),
      ]);
      expect((blocks[0] as { spans: RichTextSpan[] }).spans).toEqual([
        span('a', { bold: true }),
        span('b', { italic: true }),
        span('c', { underline: true }),
        span('d', { strikethrough: true }),
        span('e', { bold: true, italic: true }),
      ]);
    });

    it('ADR-0009 the inline `code` mark is ignored and its text is kept, with no warning', () => {
      const blocks = parse([paragraph(text('monospace', { code: true }))]);
      expect(blocks).toEqual([{ kind: 'paragraph', spans: [span('monospace')] }]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('ADR-0009 an ordered list keeps `ordered: true` and an unordered list `ordered: false`', () => {
      const blocks = parse([list('ordered', listItem(text('uno'))), list('unordered', listItem(text('dos')))]);
      expect(blocks.map((b) => (b as ListBlock).list.ordered)).toEqual([true, false]);
    });

    it('ADR-0009 the marks of a list item text are kept', () => {
      const blocks = parse([list('unordered', listItem(text('negrita', { bold: true }), text(' normal')))]);
      expect((blocks[0] as ListBlock).list.items[0].spans).toEqual([span('negrita', { bold: true }), span(' normal')]);
    });
  });

  describe('ADR-0009 heading depth is relative to the smallest heading level of the document', () => {
    const depths = (blocks: RichTextBlock[]): number[] => blocks.filter((b) => b.kind === 'heading').map((b) => (b as { depth: number }).depth);

    it('ADR-0009 a single heading of level 2 has depth 0, and so has a single heading of level 3', () => {
      expect(depths(parse(withText(heading(2, text('A')))))).toEqual([0]);
      expect(depths(parse(withText(heading(3, text('A')))))).toEqual([0]);
    });

    it('ADR-0009 levels 2, 3 and 5 have depths 0, 1 and 3', () => {
      expect(depths(parse(withText(heading(2, text('A')), heading(3, text('B')), heading(5, text('C')))))).toEqual([0, 1, 3]);
    });

    it('ADR-0009 levels 4 and 1 have depths 3 and 0 (the smallest level is the reference wherever it is)', () => {
      expect(depths(parse(withText(heading(4, text('A')), heading(1, text('B')))))).toEqual([3, 0]);
    });

    it('ADR-0009 the boundary levels 1 and 6 are valid', () => {
      expect(depths(parse(withText(heading(1, text('A')), heading(6, text('B')))))).toEqual([0, 5]);
    });

    it('ADR-0009 a heading of level 0 or 7 is a node of the wrong shape: dropped, warning "heading"', () => {
      const blocks = parse(withText(heading(0, text('cero')), heading(7, text('siete'))));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph']);
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warned()).toContain('heading');
      expect(warned()).not.toContain('cero');
      expect(warned()).not.toContain('siete');
    });
  });

  describe('ADR-0009 nested lists attach to the preceding item (valid ul > li > ul)', () => {
    const items = (blocks: RichTextBlock[], index = 0) => (blocks[index] as ListBlock).list.items;

    it("ADR-0009 a list sibling after an item is that item's nested list", () => {
      const blocks = parse([list('unordered', listItem(text('A')), list('ordered', listItem(text('A1')), listItem(text('A2'))), listItem(text('B')))]);
      const rows = items(blocks);
      expect(rows.map((i) => textOf(i.spans))).toEqual(['A', 'B']);
      expect(rows[0].lists).toHaveLength(1);
      expect(rows[0].lists[0].ordered).toBe(true);
      expect(rows[0].lists[0].items.map((i) => textOf(i.spans))).toEqual(['A1', 'A2']);
      expect(rows[1].lists).toEqual([]);
    });

    it('ADR-0009 a nested list that comes first goes to a new, empty item', () => {
      const blocks = parse([list('unordered', list('unordered', listItem(text('solo'))), listItem(text('B')))]);
      const rows = items(blocks);
      expect(rows).toHaveLength(2);
      expect(rows[0].spans).toEqual([]);
      expect(rows[0].lists).toHaveLength(1);
      expect(textOf(rows[1].spans)).toBe('B');
    });

    it('ADR-0009 two nested lists in a row both attach to the same preceding item', () => {
      const blocks = parse([list('unordered', listItem(text('A')), list('unordered', listItem(text('x'))), list('ordered', listItem(text('y'))))]);
      expect(items(blocks)[0].lists.map((l) => l.ordered)).toEqual([false, true]);
    });

    it('ADR-0009 lists nested several levels deep keep their structure', () => {
      const blocks = parse([list('unordered', listItem(text('L1')), list('unordered', listItem(text('L2')), list('unordered', listItem(text('L3')))))]);
      const l2 = items(blocks)[0].lists[0];
      expect(textOf(l2.items[0].spans)).toBe('L2');
      expect(textOf(l2.items[0].lists[0].items[0].spans)).toBe('L3');
      expect(warn).not.toHaveBeenCalled();
    });

    const build = (levels: number): WireNode => {
      let inner: WireNode = list('unordered', listItem(text(`nivel ${levels}`)));
      for (let level = levels - 1; level >= 1; level--) inner = list('unordered', listItem(text(`nivel ${level}`)), inner);
      return inner;
    };
    const depthOf = (l: RichTextList): number => 1 + Math.max(0, ...l.items.flatMap((i) => i.lists.map(depthOf)));

    it('ADR-0009 six levels of lists render, with no warning', () => {
      const blocks = parse([build(6)]);
      expect(depthOf((blocks[0] as ListBlock).list)).toBe(6);
      expect(warn).not.toHaveBeenCalled();
    });

    it('ADR-0009 the 7th level is dropped with the warning "list-depth" and its text is never logged', () => {
      const blocks = parse([build(7)]);
      expect(depthOf((blocks[0] as ListBlock).list)).toBe(6);
      expect(JSON.stringify(blocks)).not.toContain('nivel 7');
      expect(warned()).toContain('list-depth');
      expect(warned()).not.toContain('nivel');
    });

    it('ADR-0009 a much deeper list keeps exactly 6 levels', () => {
      const blocks = parse([build(12)]);
      expect(depthOf((blocks[0] as ListBlock).list)).toBe(6);
      expect(warned()).toContain('list-depth');
    });
  });

  describe('ADR-0009 formatting the app does not support degrades, with a warning that names the type only', () => {
    it('ADR-0009 a link becomes its text children; url, rel and target are dropped; warning "link"', () => {
      const link: WireNode = { type: 'link', url: 'https://example.invalid/privado?token=abc', rel: 'noopener', target: '_blank', children: [text('política completa', { bold: true })] };
      const blocks = parse([paragraph(text('Lee la '), link, text('.'))]);
      const spans = (blocks[0] as { spans: RichTextSpan[] }).spans;
      expect(textOf(spans)).toBe('Lee la política completa.');
      expect(spans.find((s) => s.text === 'política completa')?.bold).toBe(true);
      expect(JSON.stringify(blocks)).not.toContain('example.invalid');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warned()).toContain('link');
      expect(warned()).not.toContain('example.invalid');
      expect(warned()).not.toContain('política completa');
    });

    it('ADR-0009 a link inside a list item also keeps only its text', () => {
      const link: WireNode = { type: 'link', url: 'https://example.invalid/x', children: [text('ver')] };
      const blocks = parse([list('unordered', listItem(text('Mira '), link))]);
      expect(textOf((blocks[0] as ListBlock).list.items[0].spans)).toBe('Mira ver');
    });

    it('ADR-0009 a quote becomes a paragraph with its text; warning "quote"', () => {
      const blocks = parse([{ type: 'quote', children: [text('Cita de prueba')] }]);
      expect(blocks).toEqual([{ kind: 'paragraph', spans: [span('Cita de prueba')] }]);
      expect(warned()).toContain('quote');
      expect(warned()).not.toContain('Cita de prueba');
    });

    it('ADR-0009 a code block becomes a paragraph with its text kept; warning "code"', () => {
      const blocks = parse([{ type: 'code', language: 'plaintext', children: [text('const x = 1;')] }]);
      expect(blocks).toEqual([{ kind: 'paragraph', spans: [span('const x = 1;')] }]);
      expect(warned()).toContain('code');
      expect(warned()).not.toContain('const x');
    });

    it('ADR-0009 an image is dropped; warning "image", and the file name is never logged', () => {
      const image: WireNode = { type: 'image', image: { name: 'logo-secreto.png', url: '/uploads/logo-secreto.png', alternativeText: 'Logo' }, children: [text('')] };
      const blocks = parse(withText(image));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph']);
      expect(warned()).toContain('image');
      expect(warned()).not.toContain('logo-secreto');
      expect(JSON.stringify(blocks)).not.toContain('uploads');
    });

    it('ADR-0009 an unknown node type is dropped; the warning names it when it is a short identifier', () => {
      const blocks = parse(withText({ type: 'table', children: [text('celda')] }));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph']);
      expect(warned()).toContain('table');
      expect(warned()).not.toContain('celda');
    });

    it('ADR-0009 an unknown type that is not a short identifier is reported as "unknown", never echoed (it may be markup)', () => {
      const blocks = parse(withText({ type: '<img src=x onerror=alert(1)>', children: [text('x')] }, { type: 'a'.repeat(33), children: [text('y')] }, { type: 'Table2', children: [] }));
      expect(blocks).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(warned()).toContain('unknown');
      expect(warned()).not.toContain('<img');
      expect(warned()).not.toContain('onerror');
      expect(warned()).not.toContain('a'.repeat(33));
      expect(warned()).not.toContain('Table2');
    });

    it('ADR-0009 a type that is not a string is reported as "unknown"', () => {
      const blocks = parse(withText({ type: 42, children: [] }, { children: [] }));
      expect(blocks).toHaveLength(1);
      expect(warned()).toContain('unknown');
    });

    it('ADR-0009 a paragraph with no `children`, a text with a non-string `text` and a list with an unknown `format` are dropped, each with a warning naming its type', () => {
      const blocks = parse(withText({ type: 'paragraph' }, paragraph({ type: 'text', text: 42 }, text('queda')), { type: 'list', format: 'checklist', children: [listItem(text('x'))] }));
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'paragraph']);
      expect(textOf((blocks[1] as { spans: RichTextSpan[] }).spans)).toBe('queda');
      const logged = warned();
      expect(logged).toContain('paragraph');
      expect(logged).toContain('text');
      expect(logged).toContain('list');
      expect(warn).toHaveBeenCalledTimes(3);
    });

    it('ADR-0009 one warning per fallen-back node: three links give three warnings', () => {
      const link = (label: string): WireNode => ({ type: 'link', url: 'https://example.invalid', children: [text(label)] });
      parse([paragraph(link('uno'), text(' '), link('dos'), text(' '), link('tres'))]);
      expect(warn).toHaveBeenCalledTimes(3);
    });

    it('ADR-0009 no warning contains any text of the body, the name of an image or an URL', () => {
      const secret = 'TEXTO-CONFIDENCIAL-1012345678';
      parse([
        paragraph(text(secret), { type: 'link', url: `https://example.invalid/${secret}`, children: [text(secret)] }),
        { type: 'quote', children: [text(secret)] },
        { type: 'image', image: { name: secret }, children: [text('')] },
        { type: `x-${secret}`, children: [] },
      ]);
      expect(warn).toHaveBeenCalled();
      expect(warned()).not.toContain(secret);
      expect(warned()).not.toContain('1012345678');
    });
  });

  describe('ADR-0009 blank content', () => {
    it('ADR-0009 a paragraph, a heading or an item whose spans are all blank is dropped silently (editors leave empty paragraphs)', () => {
      const blocks = parse([paragraph(text('Texto')), paragraph(text('   ')), paragraph(text('')), heading(2, text(' ')), list('unordered', listItem(text('uno')), listItem(text('')))]);
      expect(blocks.map((b) => b.kind)).toEqual(['paragraph', 'list']);
      expect((blocks[1] as ListBlock).list.items).toHaveLength(1);
      expect(warn).not.toHaveBeenCalled();
    });

    it('ADR-0009 an empty array is malformed: null, with the warning "body"', () => {
      expect(parseRichTextBlocks([])).toBeNull();
      expect(warned()).toContain('body');
    });

    it('ADR-0009 a body of only blank paragraphs is malformed: null, with the warning "body"', () => {
      expect(parseRichTextBlocks([paragraph(text('')), paragraph(text('  \n '))])).toBeNull();
      expect(warned()).toContain('body');
    });

    it('ADR-0009 a body whose only text is in dropped nodes (an image and an unknown type) is malformed: null', () => {
      expect(parseRichTextBlocks([{ type: 'image', image: {}, children: [text('')] }, { type: 'table', children: [text('x')] }])).toBeNull();
    });

    it('ADR-0009 a value that is not an array is malformed: null, with the warning "body"', () => {
      for (const value of [null, undefined, 'texto plano', 42, { type: 'paragraph' }, true]) {
        warn.mockClear();
        expect(parseRichTextBlocks(value), String(value)).toBeNull();
        expect(warned(), String(value)).toContain('body');
      }
    });

    it('ADR-0009 an array of things that are not nodes (null, numbers, strings) is malformed: null', () => {
      expect(parseRichTextBlocks([null, 1, 'x', []])).toBeNull();
    });
  });

  describe('US-03-AC-13 editor input is never turned into anything but text', () => {
    const payloads = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '<b>negrita</b>'];
    for (const payload of payloads) {
      it(`US-03-AC-13 ${payload} in a paragraph stays one span of literal text`, () => {
        const blocks = parse([paragraph(text(payload))]);
        expect(blocks).toEqual([{ kind: 'paragraph', spans: [span(payload)] }]);
        expect(warn).not.toHaveBeenCalled();
      });

      it(`US-03-AC-13 ${payload} in a heading, a list item and a link text stays literal text`, () => {
        const blocks = parse([heading(2, text(payload)), list('unordered', listItem(text(payload))), paragraph({ type: 'link', url: 'https://example.invalid', children: [text(payload)] })]);
        expect(textOf((blocks[0] as { spans: RichTextSpan[] }).spans)).toBe(payload);
        expect(textOf((blocks[1] as ListBlock).list.items[0].spans)).toBe(payload);
        expect(textOf((blocks[2] as { spans: RichTextSpan[] }).spans)).toBe(payload);
      });
    }

    it('US-03-AC-13 the parser never returns the wire objects: no url, rel, target, language, image or level key survives', () => {
      const wire = [
        heading(3, text('t')),
        paragraph({ type: 'link', url: 'https://example.invalid', rel: 'noopener', target: '_blank', children: [text('l')] }),
        { type: 'code', language: 'ts', children: [text('c')] },
      ];
      const serialised = JSON.stringify(parse(wire));
      for (const key of ['url', 'rel', 'target', 'language', 'level', 'children', 'format', '"type"']) expect(serialised, key).not.toContain(key);
    });

    it('US-03-AC-13 the input is not changed by the parser', () => {
      const wire = seedTermsBody('CO');
      const before = JSON.stringify(wire);
      parse(wire);
      expect(JSON.stringify(wire)).toBe(before);
    });
  });

  /**
   * US-03-R1-F04. Limits these tests assume: link nesting is bounded (a link inside a link is not a
   * supported shape or is cut at a small fixed depth; recursion never follows 10 000 levels), and
   * nothing spreads an array into call arguments (`Math.min(...levels)`) so a body of 200 000
   * headings cannot hit the engine's argument limit. Either a result or `null` is accepted, never a throw.
   */
  describe('US-03-R1-F04 hostile bodies never throw', () => {
    it('US-03-R1-F04 links nested 10 000 levels: no throw (no RangeError), a result or null, and a warning', () => {
      let node: WireNode = text('fondo');
      for (let level = 0; level < 10_000; level++) node = { type: 'link', url: 'https://example.invalid', children: [node] };
      const body = [paragraph(text('Texto base.'), node)];
      let result: RichTextBlock[] | null | undefined;
      expect(() => (result = parseRichTextBlocks(body))).not.toThrow();
      expect(result === null || Array.isArray(result)).toBe(true);
      expect(warn).toHaveBeenCalled();
      expect(warned()).not.toContain('fondo');
      expect(warned()).not.toContain('example.invalid');
    });

    it('US-03-R1-F04 a body of 200 000 headings: no throw (no RangeError from a spread), a result or null', () => {
      const body = Array.from({ length: 200_000 }, (_, i) => heading(1 + (i % 6), text('titulo')));
      let result: RichTextBlock[] | null | undefined;
      expect(() => (result = parseRichTextBlocks(body))).not.toThrow();
      expect(result === null || Array.isArray(result)).toBe(true);
      if (result === null) expect(warned()).toContain('body');
      expect(warned()).not.toContain('titulo');
    });

    it('US-03-R1-F04 a body of 200 000 paragraphs and one of 200 000 list items do not throw either', () => {
      expect(() => parseRichTextBlocks(Array.from({ length: 200_000 }, () => paragraph(text('p'))))).not.toThrow();
      expect(() => parseRichTextBlocks([list('unordered', ...Array.from({ length: 200_000 }, () => listItem(text('i'))))])).not.toThrow();
    });
  });
});
