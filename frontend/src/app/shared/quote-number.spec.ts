import { describe, expect, it } from 'vitest';
import { formatQuoteNumber } from './quote-number';
import { day } from '../../testing/clock';

/**
 * US-03-AC-10 / US-03-Q-07 (ADR-0008): the simulated quote number is
 * `COT-<country code>-<YYYYMMDD of today>-<6 digits>`. The date is the browser's local date, read
 * through the injectable clock by the caller; the digits come from an injectable source.
 *
 * Expected API (`frontend/src/app/shared/quote-number.ts`):
 *   formatQuoteNumber(countryCode: string, today: Date, digits: number): string
 */
describe('US-03-AC-10 simulated quote number', () => {
  const rows: [Date, string, number, string][] = [
    [day(2026, 11, 21), 'CO', 482913, 'COT-CO-20261121-482913'],
    [day(2026, 11, 21), 'CL', 7, 'COT-CL-20261121-000007'],
    [day(2027, 1, 5), 'CO', 999999, 'COT-CO-20270105-999999'],
  ];
  for (const [today, code, digits, expected] of rows) {
    it(`US-03-AC-10 ${code} on ${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()} with ${digits} gives ${expected}`, () => {
      expect(formatQuoteNumber(code, today, digits)).toBe(expected);
    });
  }

  it('US-03-AC-10 the digits are zero-padded to 6: 0 -> "000000", 12 -> "000012", 123456 stays', () => {
    expect(formatQuoteNumber('CO', day(2026, 11, 21), 0)).toBe('COT-CO-20261121-000000');
    expect(formatQuoteNumber('CO', day(2026, 11, 21), 12)).toBe('COT-CO-20261121-000012');
    expect(formatQuoteNumber('CO', day(2026, 11, 21), 123456)).toBe('COT-CO-20261121-123456');
  });

  it('US-03-AC-10 the country code is upper case, whatever case the caller holds', () => {
    expect(formatQuoteNumber('co', day(2026, 11, 21), 5)).toBe('COT-CO-20261121-000005');
  });

  it('US-03-AC-10 the date is the local calendar date: late in the evening it is still that day', () => {
    expect(formatQuoteNumber('CO', day(2026, 11, 21, 23, 59, 59), 1)).toBe('COT-CO-20261121-000001');
    expect(formatQuoteNumber('CO', day(2026, 12, 1, 0, 0, 1), 1)).toBe('COT-CO-20261201-000001');
  });

  it('US-03-AC-10 month and day are two digits, the year four: 2026-03-04', () => {
    expect(formatQuoteNumber('CL', day(2026, 3, 4), 42)).toBe('COT-CL-20260304-000042');
  });

  it('US-03-AC-10 the shape is always COT-<2 letters>-<8 digits>-<6 digits>', () => {
    for (const digits of [0, 1, 99, 100000, 999999]) {
      expect(formatQuoteNumber('CO', day(2026, 11, 21), digits)).toMatch(/^COT-[A-Z]{2}-\d{8}-\d{6}$/);
    }
  });
});
