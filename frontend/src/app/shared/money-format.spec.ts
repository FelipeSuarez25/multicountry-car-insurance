import { describe, expect, it } from 'vitest';
import { formatMoney } from './money-format';

/**
 * US-02-AC-06 / US-02-BR-03: a price is formatted with `Intl.NumberFormat` currency style from the
 * country's `localeTag` (logical `locale`) and `currencyCode`; no fraction digits, grouping always
 * on, no ISO code. ICU output differs slightly between runtimes in the whitespace around the
 * symbol, so every comparison removes whitespace (US-02-Q-07).
 *
 * Expected signature: `formatMoney(amount: number, locale: string, currencyCode: string): string`.
 */

const compact = (text: string): string => text.replace(/\s+/g, '');

describe('US-02-AC-06 price in the country currency and format', () => {
  const rows: { country: string; currency: string; locale: string; amount: number; text: string }[] = [
    { country: 'Colombia', currency: 'COP', locale: 'es-CO', amount: 1540000, text: '$1.540.000' },
    { country: 'Colombia', currency: 'COP', locale: 'es-CO', amount: 935000, text: '$935.000' },
    { country: 'Colombia', currency: 'COP', locale: 'es-CO', amount: 1000, text: '$1.000' },
    { country: 'Colombia', currency: 'COP', locale: 'es-CO', amount: 50, text: '$50' },
    { country: 'Chile', currency: 'CLP', locale: 'es-CL', amount: 528000, text: '$528.000' },
    { country: 'Chile', currency: 'CLP', locale: 'es-CL', amount: 2100000, text: '$2.100.000' },
    { country: 'Chile', currency: 'CLP', locale: 'es-CL', amount: 1000, text: '$1.000' },
  ];

  for (const row of rows) {
    it(`US-02-AC-06 ${row.country} (${row.currency}, ${row.locale}): ${row.amount} is shown as "${row.text}", with no decimals and no ISO code`, () => {
      const shown = formatMoney(row.amount, row.locale, row.currency);
      expect(compact(shown)).toBe(row.text);
      expect(shown).not.toContain(row.currency);
      expect(shown).not.toMatch(/[.,]\d{1,2}$/); // no decimal part
    });
  }

  it('US-02-AC-06 grouping is always on, also for 4-digit amounts (Spanish locales may leave "1000" ungrouped)', () => {
    expect(compact(formatMoney(1000, 'es-CO', 'COP'))).toBe('$1.000');
    expect(compact(formatMoney(9999, 'es-CL', 'CLP'))).toBe('$9.999');
  });

  it('US-02-AC-06 digits below the first group are not grouped: 999 is "$999"', () => {
    expect(compact(formatMoney(999, 'es-CO', 'COP'))).toBe('$999');
  });

  it('US-02-AC-06 the largest base price of the contract is shown with every group', () => {
    expect(compact(formatMoney(2_147_483_647, 'es-CO', 'COP'))).toBe('$2.147.483.647');
  });

  it('US-02-AC-06 whole units never show a fraction, even for a value that is not a multiple of anything', () => {
    expect(compact(formatMoney(1234567, 'es-CL', 'CLP'))).toBe('$1.234.567');
  });
});

describe('US-02-BR-03 currency and locale come from the arguments, never from the code', () => {
  it('US-02-AC-06 another country (de-DE, EUR) is formatted by its own rules: the function holds no per-country table', () => {
    const shown = compact(formatMoney(1500, 'de-DE', 'EUR'));
    expect(shown).toContain('1.500');
    expect(shown).toContain('€');
    expect(shown).not.toContain('$');
  });

  it('US-02-AC-06 the same amount in two countries uses each locale: es-CO and es-CL both group with a point', () => {
    expect(compact(formatMoney(2500000, 'es-CO', 'COP'))).toBe(compact(formatMoney(2500000, 'es-CL', 'CLP')));
  });

  it('US-02-AC-06 an invalid locale tag is rejected, not swallowed (the page then shows its error state, spec section 8)', () => {
    expect(() => formatMoney(1000, 'es_CO', 'COP')).toThrow();
  });

  it('US-02-AC-06 an invalid currency code is rejected, not swallowed', () => {
    expect(() => formatMoney(1000, 'es-CO', 'PESOS')).toThrow();
  });
});
