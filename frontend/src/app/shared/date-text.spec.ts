import { describe, expect, it } from 'vitest';
import { formatDateText, parseDateText } from './date-text';

/**
 * US-04-AC-08 / US-04-BR-06 (US-04-Q-05): the typed date, as a pure function (ADR-0012 section 4).
 *
 * Contract expected from `shared/date-text.ts` (no Angular import):
 *   parseDateText(text: string): string | null
 *     ''            for blank text (nothing typed)
 *     'YYYY-MM-DD' for d/m/yyyy with `/`, `-` or `.` separators (1-2 digit day and month, 4-digit
 *                   year) or exactly 8 digits ddmmyyyy, when the date exists
 *     null          for anything else: incomplete, impossible (31/04, 29/02 of a non-leap year),
 *                   2-digit or 3-digit year, letters. The component maps null to a stored '' with
 *                   the text kept visible (the former `badInput`).
 *   formatDateText(iso: string): string   'YYYY-MM-DD' -> 'dd/mm/yyyy'; '' -> ''
 */

describe('US-04-AC-08 parseDateText: every row of the AC table', () => {
  const rows: [string, string | null][] = [
    ['15/05/1990', '1990-05-15'],
    ['5/5/1990', '1990-05-05'],
    ['15-05-1990', '1990-05-15'],
    ['15.05.1990', '1990-05-15'],
    ['15051990', '1990-05-15'],
    ['29/02/2000', '2000-02-29'],
    ['29/02/2001', null],
    ['31/04/1990', null],
    ['15/05/199', null],
    ['15/05/90', null],
    ['01/03/2010', '2010-03-01'],
  ];

  it.each(rows)('US-04-AC-08 "%s" parses to %s', (text, iso) => {
    expect(parseDateText(text)).toBe(iso);
  });
});

describe('US-04-AC-08 parseDateText: the grammar around the table rows', () => {
  it('US-04-AC-08 blank text (empty or only spaces) is "" (nothing typed), not unreadable', () => {
    expect(parseDateText('')).toBe('');
    expect(parseDateText('   ')).toBe('');
  });

  it('US-04-AC-08 surrounding spaces are ignored', () => {
    expect(parseDateText('  15/05/1990 ')).toBe('1990-05-15');
  });

  it('US-04-AC-08 a 1-digit day and month are accepted with every separator, the year must have 4 digits', () => {
    expect(parseDateText('1/1/2000')).toBe('2000-01-01');
    expect(parseDateText('1-1-2000')).toBe('2000-01-01');
    expect(parseDateText('1.1.2000')).toBe('2000-01-01');
    expect(parseDateText('1/1/200')).toBeNull();
    expect(parseDateText('1/1/20000')).toBeNull();
  });

  it('US-04-AC-08 the 8-digit form needs exactly 8 digits: 7 or 9 are unreadable', () => {
    expect(parseDateText('01012000')).toBe('2000-01-01');
    expect(parseDateText('1012000')).toBeNull();
    expect(parseDateText('010120000')).toBeNull();
  });

  it('US-04-AC-08 month and day boundaries: 31/12 and 01/01 exist, 00 and 32 and month 13 do not', () => {
    expect(parseDateText('31/12/1999')).toBe('1999-12-31');
    expect(parseDateText('01/01/1900')).toBe('1900-01-01');
    expect(parseDateText('00/01/2000')).toBeNull();
    expect(parseDateText('32/01/2000')).toBeNull();
    expect(parseDateText('01/00/2000')).toBeNull();
    expect(parseDateText('10/13/2026')).toBeNull();
  });

  it('US-04-AC-08 leap years: 29/02 exists in 2000 and 2024, not in 1900, 2001 or 2100 (centuries that are not multiples of 400)', () => {
    expect(parseDateText('29/02/2000')).toBe('2000-02-29');
    expect(parseDateText('29/02/2024')).toBe('2024-02-29');
    expect(parseDateText('29/02/1900')).toBeNull();
    expect(parseDateText('29/02/2100')).toBeNull();
    expect(parseDateText('30/02/2000')).toBeNull();
  });

  it('US-04-AC-08 30-day months reject the 31st (April, June, September, November)', () => {
    for (const month of ['04', '06', '09', '11']) expect(parseDateText(`31/${month}/1990`), month).toBeNull();
    for (const month of ['01', '03', '05', '07', '08', '10', '12']) expect(parseDateText(`31/${month}/1990`), month).not.toBeNull();
  });

  it('US-04-AC-08 letters, a bare separator and a mixed-up order are unreadable (null), never a guess', () => {
    for (const text of ['abc', '//', '15/05', '15/05/', '1990-05-15x', 'hoy', '15 05 1990', '15/05/19 90']) expect(parseDateText(text), text).toBeNull();
  });

  it('US-04-AC-08 an ISO-looking text (year first) is not the typed format and is unreadable', () => {
    expect(parseDateText('1990-05-15')).toBeNull();
  });
});

describe('US-04-AC-08 formatDateText: the stored date is shown as dd/mm/aaaa', () => {
  it('US-04-AC-08 "1990-05-15" is shown as "15/05/1990" with zero padding', () => {
    expect(formatDateText('1990-05-15')).toBe('15/05/1990');
    expect(formatDateText('2000-02-29')).toBe('29/02/2000');
    expect(formatDateText('2010-03-01')).toBe('01/03/2010');
  });

  it('US-04-AC-08 an empty stored value is shown as empty text', () => {
    expect(formatDateText('')).toBe('');
  });

  it('US-04-AC-08 format and parse are inverse for a valid date', () => {
    for (const iso of ['1990-05-15', '2000-02-29', '1906-01-01', '2008-11-21']) expect(parseDateText(formatDateText(iso))).toBe(iso);
  });
});
