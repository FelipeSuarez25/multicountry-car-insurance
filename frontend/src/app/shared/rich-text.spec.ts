import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RichText } from './rich-text';
import { parseRichTextBlocks } from './rich-text-blocks';
import type { RichTextBlock } from './rich-text-blocks.model';
import { normalise } from '../../testing/dom';
import { heading, list, listItem, paragraph, seedTermsBody, text, type WireNode } from '../../testing/terms-fixtures';

/**
 * ADR-0009: the renderer of the whitelisted tree. Content reaches the DOM only as text; element
 * names come from fixed template branches; no `[innerHTML]`, no sanitiser bypass.
 *
 * Expected API (`frontend/src/app/shared/rich-text.ts`):
 *   @Component({ selector: 'app-rich-text', ... }) class RichText
 *     inputs: `blocks: readonly RichTextBlock[]` (required), `headingLevel: 2 | 3 | 4 | 5 | 6`
 *     (the level of a heading of `depth` 0; a heading is `min(6, headingLevel + depth)`).
 *   Marks: bold -> strong, italic -> em, underline -> u, strikethrough -> s (nested in that order).
 *   Lists: ordered -> ol, unordered -> ul; a nested list is a `ul|ol` inside the `li` of its item.
 *   `\n` inside a text is kept by CSS (`white-space: pre-line`); no `br` is built.
 */

describe('ADR-0009 RichText (US-03-AC-13 formatting is kept, editor input is never executed)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function render(wire: unknown, headingLevel: 2 | 3 | 4 | 5 | 6 = 4): HTMLElement {
    const blocks = parseRichTextBlocks(wire) as RichTextBlock[];
    const fixture = TestBed.createComponent(RichText);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.componentRef.setInput('headingLevel', headingLevel);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    return fixture.nativeElement as HTMLElement;
  }
  afterEach(() => {
    document.body.replaceChildren();
  });
  const headings = (el: HTMLElement): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));

  describe('US-03-AC-13 formatting is kept (the Colombia seed)', () => {
    it('US-03-AC-13 "Condiciones principales" is a heading inside the terms', () => {
      const el = render(seedTermsBody('CO'));
      const found = headings(el).filter((h) => normalise(h.textContent) === 'Condiciones principales');
      expect(found).toHaveLength(1);
    });

    it('US-03-AC-13 the three conditions are items of one bulleted list (one ul with three li, no ol)', () => {
      const el = render(seedTermsBody('CO'));
      const lists = el.querySelectorAll('ul');
      expect(lists).toHaveLength(1);
      expect(lists[0].querySelectorAll(':scope > li')).toHaveLength(3);
      expect(el.querySelectorAll('ol')).toHaveLength(0);
      expect(Array.from(lists[0].querySelectorAll('li')).map((li) => normalise(li.textContent))).toEqual([
        'La vigencia de la póliza es de un año desde la fecha de pago.',
        'El precio mostrado es anual y está expresado en pesos colombianos (COP).',
        'Puedes retractarte dentro de los 10 días siguientes al pago.',
      ]);
    });

    it('US-03-AC-13 "ficticio" is emphasised as bold: it is inside a strong element, and only it', () => {
      const el = render(seedTermsBody('CO'));
      const strong = Array.from(el.querySelectorAll('strong'));
      expect(strong.map((s) => normalise(s.textContent))).toEqual(['ficticio']);
    });

    it('US-03-AC-13 the paragraphs are p elements and the whole text of the seed is present, in order', () => {
      const el = render(seedTermsBody('CO'));
      expect(el.querySelectorAll('p')).toHaveLength(3);
      const all = normalise(el.textContent);
      const order = ['Este documento es ficticio', 'Al aceptar, declaras', 'Condiciones principales', 'La vigencia de la póliza', 'Ley aplicable: Colombia'];
      const positions = order.map((fragment) => all.indexOf(fragment));
      expect(positions.every((p) => p >= 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });
  });

  describe('ADR-0009 the Chile seed', () => {
    it('ADR-0009 the numbered list renders as one ol with three li, and "Condiciones generales" is a heading', () => {
      const el = render(seedTermsBody('CL'));
      expect(el.querySelectorAll('ol')).toHaveLength(1);
      expect(el.querySelectorAll('ol > li')).toHaveLength(3);
      expect(el.querySelectorAll('ul')).toHaveLength(0);
      expect(headings(el).map((h) => normalise(h.textContent))).toEqual(['Condiciones generales']);
    });
  });

  describe('US-03-AC-13 editor input is never executed: it is shown literally', () => {
    const payloads = ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '<b>negrita</b>'];
    for (const payload of payloads) {
      it(`US-03-AC-13 ${payload} is displayed literally and adds no element, attribute or script`, () => {
        const el = render([paragraph(text(payload)), heading(2, text(payload)), list('unordered', listItem(text(payload)))]);
        expect(el.textContent).toContain(payload);
        expect(el.querySelectorAll('img, script, b, iframe, a, svg, style, link, object, embed')).toHaveLength(0);
        expect(el.querySelectorAll('[onerror], [onclick], [onload], [style], [src], [href]')).toHaveLength(0);
        expect(el.innerHTML).not.toContain('<img');
        expect(el.innerHTML).not.toContain('<script');
        expect(el.innerHTML).toContain('&lt;');
      });
    }

    it('US-03-AC-13 a payload inside a mark (bold) is still text', () => {
      const el = render([paragraph(text('<script>alert(1)</script>', { bold: true }))]);
      expect(normalise(el.querySelector('strong')?.textContent)).toBe('<script>alert(1)</script>');
      expect(el.querySelectorAll('script')).toHaveLength(0);
    });

    it('US-03-AC-13 the text of a link is shown and nothing is linked: no a, no href, no request to a remote host', () => {
      const el = render([paragraph(text('Ver '), { type: 'link', url: 'https://example.invalid/privacidad', rel: 'noopener', target: '_blank', children: [text('la política')] })]);
      expect(normalise(el.textContent)).toBe('Ver la política');
      expect(el.querySelectorAll('a, [href]')).toHaveLength(0);
      expect(el.innerHTML).not.toContain('example.invalid');
    });

    it('US-03-AC-13 an image node renders nothing: no img, no src, no /uploads', () => {
      const el = render([paragraph(text('Texto')), { type: 'image', image: { url: '/uploads/logo.png', name: 'logo.png' }, children: [text('')] }]);
      expect(el.querySelectorAll('img, [src]')).toHaveLength(0);
      expect(el.innerHTML).not.toContain('uploads');
    });

    it('US-03-AC-13 a quote and a code block are shown as plain paragraphs: no blockquote, pre or code element', () => {
      const el = render([{ type: 'quote', children: [text('Una cita')] }, { type: 'code', children: [text('x = 1')] }]);
      expect(el.querySelectorAll('blockquote, pre, code')).toHaveLength(0);
      expect(Array.from(el.querySelectorAll('p')).map((p) => normalise(p.textContent))).toEqual(['Una cita', 'x = 1']);
    });
  });

  describe('ADR-0009 marks', () => {
    it('ADR-0009 bold, italic, underline and strikethrough render as strong, em, u and s', () => {
      const el = render([paragraph(text('a', { bold: true }), text('b', { italic: true }), text('c', { underline: true }), text('d', { strikethrough: true }))]);
      expect(normalise(el.querySelector('strong')?.textContent)).toBe('a');
      expect(normalise(el.querySelector('em')?.textContent)).toBe('b');
      expect(normalise(el.querySelector('u')?.textContent)).toBe('c');
      expect(normalise(el.querySelector('s')?.textContent)).toBe('d');
    });

    it('ADR-0009 several marks on one text nest: the same text is inside both strong and em', () => {
      const el = render([paragraph(text('mixto', { bold: true, italic: true }))]);
      expect(normalise(el.querySelector('strong')?.textContent)).toBe('mixto');
      expect(normalise(el.querySelector('em')?.textContent)).toBe('mixto');
    });

    it('ADR-0009 an inline code mark is plain text: no code element', () => {
      const el = render([paragraph(text('x', { code: true }))]);
      expect(el.querySelectorAll('code')).toHaveLength(0);
      expect(el.textContent).toContain('x');
    });

    it('ADR-0009 line breaks inside a text are kept by CSS, no br is built', () => {
      const el = render([paragraph(text('línea uno\nlínea dos'))]);
      expect(el.querySelectorAll('br')).toHaveLength(0);
      expect(el.textContent).toContain('línea uno\nlínea dos');
    });
  });

  describe('ADR-0009 heading levels follow the headingLevel input and keep relative depths', () => {
    const levels = (el: HTMLElement): [string, number][] => headings(el).map((h) => [normalise(h.textContent), Number(h.tagName.substring(1))]);
    const body: WireNode[] = [paragraph(text('Base.')), heading(2, text('Uno')), heading(3, text('Dos')), heading(5, text('Tres'))];

    it('ADR-0009 headingLevel 4: depth 0 is an h4, depth 1 an h5, depth 3 is clamped at h6', () => {
      expect(levels(render(body, 4))).toEqual([['Uno', 4], ['Dos', 5], ['Tres', 6]]);
    });

    it('ADR-0009 headingLevel 3: the same document is h3, h4, h6', () => {
      expect(levels(render(body, 3))).toEqual([['Uno', 3], ['Dos', 4], ['Tres', 6]]);
    });

    it('ADR-0009 headingLevel 2: the same document is h2, h3, h5', () => {
      expect(levels(render(body, 2))).toEqual([['Uno', 2], ['Dos', 3], ['Tres', 5]]);
    });

    it('ADR-0009 headingLevel 6: every heading is an h6 (clamped)', () => {
      expect(levels(render(body, 6)).map(([, level]) => level)).toEqual([6, 6, 6]);
    });

    it('ADR-0009 no heading is ever above the requested level, and never an h1', () => {
      for (const level of [2, 3, 4, 5, 6] as const) {
        for (const [, rendered] of levels(render(body, level))) expect(rendered).toBeGreaterThanOrEqual(level);
        document.body.replaceChildren();
      }
    });
  });

  describe('ADR-0009 nested lists', () => {
    it('ADR-0009 a nested list renders as ul > li > ul (valid markup), and the outer item keeps its text', () => {
      const el = render([list('unordered', listItem(text('Padre')), list('unordered', listItem(text('Hijo uno')), listItem(text('Hijo dos'))), listItem(text('Otro')))]);
      const outer = el.querySelector('ul') as HTMLElement;
      expect(outer.querySelectorAll(':scope > li')).toHaveLength(2);
      const first = outer.querySelector(':scope > li') as HTMLElement;
      expect(first.querySelector(':scope > ul')).not.toBeNull();
      expect(Array.from(first.querySelectorAll(':scope > ul > li')).map((li) => normalise(li.textContent))).toEqual(['Hijo uno', 'Hijo dos']);
      expect(el.querySelectorAll('ul > ul, ol > ul, ul > ol, ol > ol')).toHaveLength(0);
    });

    it('ADR-0009 an ordered list inside a bulleted one renders as ul > li > ol', () => {
      const el = render([list('unordered', listItem(text('Padre')), list('ordered', listItem(text('Paso 1'))))]);
      expect(el.querySelector('ul > li > ol > li')?.textContent).toContain('Paso 1');
    });
  });

  describe('ADR-0009 the renderer does not fetch or run anything', () => {
    it('ADR-0009 rendering the seed adds no img, iframe, script or link element and no inline event handler', () => {
      for (const country of ['CO', 'CL'] as const) {
        const el = render(seedTermsBody(country));
        expect(el.querySelectorAll('img, iframe, script, link, a, object, embed, form, input, button')).toHaveLength(0);
        expect(el.querySelectorAll('*').length).toBeGreaterThan(5);
        for (const node of Array.from(el.querySelectorAll('*'))) {
          for (const attribute of Array.from(node.attributes)) expect(attribute.name.startsWith('on'), `${node.tagName} ${attribute.name}`).toBe(false);
        }
        document.body.replaceChildren();
      }
    });

    it('ADR-0009 an empty list of blocks renders an empty component, without error', () => {
      const fixture = TestBed.createComponent(RichText);
      fixture.componentRef.setInput('blocks', []);
      fixture.componentRef.setInput('headingLevel', 3);
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(normalise((fixture.nativeElement as HTMLElement).textContent)).toBe('');
    });
  });
});
