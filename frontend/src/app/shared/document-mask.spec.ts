import { describe, expect, it } from 'vitest';
import { maskDocumentNumber } from './document-mask';

/**
 * US-03-BR-02 / US-03-Q-04: the document number is shown partially masked, with one rule for every
 * country. Let n be the number of letters and digits; the last k = min(4, floor(n / 2)) stay
 * visible, every earlier letter or digit becomes the bullet U+2022, every other character (dots,
 * dashes, spaces) stays in place. The accessible text replaces the masked string:
 * "Número oculto, termina en <tail>", or "Número oculto" when nothing is visible.
 *
 * Expected API (`frontend/src/app/shared/document-mask.ts`):
 *   maskDocumentNumber(value: string): { text: string; accessibleText: string }
 * `tail` is the visible part of the value, from its first visible character to its end (so
 * separators between visible characters are part of it: "678-5").
 */
describe('US-03-AC-05 masked document number', () => {
  const rows: [string, string, string, string][] = [
    ['1012345678', '••••••5678', 'Número oculto, termina en 5678', '10 digits, last 4 visible'],
    ['12.345.678-5', '••.•••.678-5', 'Número oculto, termina en 678-5', 'separators stay in place'],
    ['123456785', '•••••6785', 'Número oculto, termina en 6785', 'RUT typed without dots and dash'],
    ['12345678-K', '•••••678-K', 'Número oculto, termina en 678-K', 'check digit K'],
    ['12345678', '••••5678', 'Número oculto, termina en 5678', '8 characters'],
    ['123456', '•••456', 'Número oculto, termina en 456', '6 characters: half visible'],
    ['AB', '•B', 'Número oculto, termina en B', '2 characters'],
    ['1', '•', 'Número oculto', 'nothing visible'],
  ];

  for (const [value, masked, spoken, why] of rows) {
    it(`US-03-AC-05 ${JSON.stringify(value)} is shown as ${JSON.stringify(masked)} (${why})`, () => {
      expect(maskDocumentNumber(value).text).toBe(masked);
    });

    it(`US-03-AC-05 ${JSON.stringify(value)} is spoken as ${JSON.stringify(spoken)}`, () => {
      expect(maskDocumentNumber(value).accessibleText).toBe(spoken);
    });
  }

  describe('US-03-BR-02 the boundaries of k = min(4, floor(n / 2))', () => {
    const boundaries: [string, string][] = [
      ['ABC', '••C'], // n = 3: k = 1
      ['1234', '••34'], // n = 4: k = 2
      ['12345', '•••45'], // n = 5: k = 2
      ['1234567', '••••567'], // n = 7: k = 3
      ['123456789', '•••••6789'], // n = 9: k = 4
      ['1234567890123', '•••••••••0123'], // n = 13: k stays 4
    ];
    for (const [value, masked] of boundaries) {
      it(`US-03-BR-02 n = ${value.length}: ${JSON.stringify(value)} -> ${JSON.stringify(masked)}`, () => {
        expect(maskDocumentNumber(value).text).toBe(masked);
      });
    }
  });

  describe('US-03-BR-02 only letters and digits count and are masked', () => {
    it('US-03-BR-02 separators do not count towards n: "1.234" has n = 4, so two stay visible', () => {
      expect(maskDocumentNumber('1.234').text).toBe('•.•34');
    });

    it('US-03-BR-02 a separator inside the visible part stays, and the tail includes it', () => {
      const result = maskDocumentNumber('AB-12');
      expect(result.text).toBe('••-12');
      expect(result.accessibleText).toBe('Número oculto, termina en 12');
    });

    it('US-03-BR-02 spaces stay in place: "12 345 678" has n = 8, so four are visible', () => {
      expect(maskDocumentNumber('12 345 678').text).toBe('•• ••5 678');
    });

    it('US-03-BR-02 letters are masked like digits: "ABCDEFGH" keeps "EFGH"', () => {
      expect(maskDocumentNumber('ABCDEFGH').text).toBe('••••EFGH');
    });

    it('US-03-BR-02 the number of bullets plus visible characters equals the length of the input (nothing is added or lost)', () => {
      for (const value of ['1012345678', '12.345.678-5', '12345678-K', 'AB-12', '1']) {
        expect(maskDocumentNumber(value).text).toHaveLength(value.length);
      }
    });
  });

  describe('US-03-BR-02 the full number never appears in the result', () => {
    it('US-03-BR-02 neither the text nor the accessible text contains the hidden part', () => {
      const result = maskDocumentNumber('1012345678');
      for (const hidden of ['101234', '1012', '012345']) {
        expect(result.text).not.toContain(hidden);
        expect(result.accessibleText).not.toContain(hidden);
      }
    });
  });
});
