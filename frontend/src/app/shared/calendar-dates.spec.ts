import { describe, expect, it } from 'vitest';
import { firstDayOfWeek, isDayDisabled, latestValidDate, monthGrid, nextFocusDate, yearRange } from './calendar-dates';
import type { FieldConfig } from './field-config.model';
import { validateField } from './field-validators';
import { day } from '../../testing/clock';
import { seedField } from '../../testing/seed-fixtures';

/**
 * US-04-AC-09 / AC-10 / BR-06: the calendar's pure logic (ADR-0012 section 4 and the week-start
 * implementation note of `adr/README.md`). Nothing here imports Angular.
 *
 * Contract expected from `shared/calendar-dates.ts` (dates are ISO `YYYY-MM-DD` strings, "today" is
 * a `Date` from the injectable clock, the locale is the country's `localeTag`, never a country code):
 *   firstDayOfWeek(localeTag: string, makeLocale?: (tag: string) => unknown): number
 *       1 = Monday ... 7 = Sunday. Reads `makeLocale(tag).getWeekInfo().firstDay`, else
 *       `makeLocale(tag).weekInfo.firstDay`, else 1 (Monday). `makeLocale` defaults to
 *       `(tag) => new Intl.Locale(tag)` and exists so a test can inject the fallback path.
 *   monthGrid(year: number, month: number /* 1-12 *\/, localeTag: string): { weekdays: string[]; weeks: (string | null)[][] }
 *       `weekdays`: the 7 full day names from Intl in grid order; `weeks`: rows of 7 ISO dates, null
 *       for the cells that belong to the neighbouring months.
 *   nextFocusDate(iso: string, key: string, shift: boolean, localeTag: string): string
 *       `key` is a KeyboardEvent.key: ArrowLeft/Right/Up/Down, Home, End, PageUp, PageDown.
 *   isDayDisabled(config: FieldConfig, iso: string, today: Date): boolean   // validateField(...) !== null
 *   latestValidDate(config: FieldConfig, today: Date): string               // latest ISO date the field accepts
 *   yearRange(config: FieldConfig, today: Date): { from: number; to: number }
 */

const CL = 'es-CL';
const CO = 'es-CO';
const birthDate = (): FieldConfig => seedField('CO', 'birthDate');
const optionalDate = (): FieldConfig => ({
  key: 'inspectionDate',
  type: 'date',
  label: 'Fecha de revisión',
  isRequired: false,
  sortOrder: 95,
  errorMessage: 'Ingresa una fecha válida.',
  rules: [],
});

describe('US-04-AC-09 the first day of the week comes from the locale, not from a country code (human decision at HC1)', () => {
  it('US-04-AC-09 es-CO starts on Sunday (7) and es-CL on Monday (1), from the real Intl data', () => {
    expect(firstDayOfWeek(CO)).toBe(7);
    expect(firstDayOfWeek(CL)).toBe(1);
  });

  it('US-04-AC-09 an injected locale that offers getWeekInfo() is used', () => {
    expect(firstDayOfWeek('xx', () => ({ getWeekInfo: () => ({ firstDay: 7 }) }))).toBe(7);
    expect(firstDayOfWeek('xx', () => ({ getWeekInfo: () => ({ firstDay: 6 }) }))).toBe(6);
  });

  it('US-04-AC-09 the older weekInfo accessor is used when getWeekInfo does not exist', () => {
    expect(firstDayOfWeek('xx', () => ({ weekInfo: { firstDay: 7 } }))).toBe(7);
  });

  it('US-04-AC-09 getWeekInfo wins over weekInfo when both exist', () => {
    expect(firstDayOfWeek('xx', () => ({ getWeekInfo: () => ({ firstDay: 7 }), weekInfo: { firstDay: 1 } }))).toBe(7);
  });

  it('US-04-AC-09 with neither API (Firefox before 153, Safari before 15.4, Chrome before 99) the fallback is Monday, also for es-CO', () => {
    expect(firstDayOfWeek(CO, () => ({}))).toBe(1);
    expect(firstDayOfWeek(CL, () => ({}))).toBe(1);
  });
});

describe('US-04-AC-09 the month grid: column order and full day names per locale', () => {
  it('US-04-AC-09 Colombia (Sunday first): the column headers are the full Spanish day names domingo ... sábado', () => {
    expect(monthGrid(1990, 5, CO).weekdays).toEqual(['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']);
  });

  it('US-04-AC-09 Chile (Monday first): lunes ... domingo', () => {
    expect(monthGrid(1990, 5, CL).weekdays).toEqual(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']);
  });

  it('US-04-AC-09 May 1990 starts on a Tuesday: two empty cells before the 1st in Colombia, one in Chile', () => {
    const co = monthGrid(1990, 5, CO).weeks;
    expect(co[0]).toEqual([null, null, '1990-05-01', '1990-05-02', '1990-05-03', '1990-05-04', '1990-05-05']);
    const cl = monthGrid(1990, 5, CL).weeks;
    expect(cl[0]).toEqual([null, '1990-05-01', '1990-05-02', '1990-05-03', '1990-05-04', '1990-05-05', '1990-05-06']);
  });

  it('US-04-AC-09 every row has 7 cells, every day of the month appears exactly once and in order, and the last row ends with null padding', () => {
    for (const tag of [CO, CL]) {
      const { weeks } = monthGrid(1990, 5, tag);
      expect(weeks.every((w: (string | null)[]) => w.length === 7)).toBe(true);
      const days = weeks.flat().filter((d: string | null): d is string => d !== null);
      expect(days).toHaveLength(31);
      expect(days[0]).toBe('1990-05-01');
      expect(days[30]).toBe('1990-05-31');
      expect([...days].sort()).toEqual(days);
    }
  });

  it('US-04-AC-09 February 2010 starts on a Monday and has 28 days: exactly 4 full rows in Chile, 5 rows in Colombia', () => {
    expect(monthGrid(2010, 2, CL).weeks).toHaveLength(4);
    expect(monthGrid(2010, 2, CL).weeks[0][0]).toBe('2010-02-01');
    expect(monthGrid(2010, 2, CO).weeks).toHaveLength(5);
  });

  it('US-04-AC-09 February 2000 has a 29th (leap), February 1900 and 2001 do not', () => {
    const lastDay = (y: number): string | null => monthGrid(y, 2, CL).weeks.flat().filter((d: string | null) => d !== null).pop() ?? null;
    expect(lastDay(2000)).toBe('2000-02-29');
    expect(lastDay(1900)).toBe('1900-02-28');
    expect(lastDay(2001)).toBe('2001-02-28');
  });
});

describe('US-04-AC-09 calendar keyboard: nextFocusDate, every row of the AC table', () => {
  const rows: [string, string, string, boolean, string, string][] = [
    // country tag, from, key, shift, to, comment
    [CL, '1990-05-15', 'ArrowRight', false, '1990-05-16', ''],
    [CL, '1990-05-15', 'ArrowLeft', false, '1990-05-14', ''],
    [CL, '1990-05-15', 'ArrowDown', false, '1990-05-22', ''],
    [CL, '1990-05-15', 'ArrowUp', false, '1990-05-08', ''],
    [CL, '1990-05-15', 'Home', false, '1990-05-14', 'Monday, first day of the es-CL week'],
    [CL, '1990-05-15', 'End', false, '1990-05-20', 'Sunday, last day of the es-CL week'],
    [CO, '1990-05-15', 'Home', false, '1990-05-13', 'Sunday, first day of the es-CO week'],
    [CO, '1990-05-15', 'End', false, '1990-05-19', 'Saturday, last day of the es-CO week'],
    [CL, '1990-05-15', 'PageDown', false, '1990-06-15', ''],
    [CL, '1990-05-31', 'PageUp', false, '1990-04-30', 'clamped to the last day of April'],
    [CL, '1990-05-15', 'PageUp', true, '1989-05-15', 'Shift+PageUp is one year back'],
    [CL, '2000-02-29', 'PageDown', true, '2001-02-28', 'Shift+PageDown, clamped'],
  ];

  it.each(rows)('US-04-AC-09 %s: %s + %s (shift %s) moves to %s %s', (tag, from, key, shift, to) => {
    expect(nextFocusDate(from, key, shift, tag)).toBe(to);
  });

  it('US-04-AC-09 the arrows cross the month and the year edges', () => {
    expect(nextFocusDate('1990-05-31', 'ArrowRight', false, CL)).toBe('1990-06-01');
    expect(nextFocusDate('1990-06-01', 'ArrowLeft', false, CL)).toBe('1990-05-31');
    expect(nextFocusDate('1990-12-31', 'ArrowRight', false, CL)).toBe('1991-01-01');
    expect(nextFocusDate('1990-12-28', 'ArrowDown', false, CL)).toBe('1991-01-04');
    expect(nextFocusDate('2000-03-01', 'ArrowLeft', false, CL)).toBe('2000-02-29');
    expect(nextFocusDate('2001-03-01', 'ArrowLeft', false, CL)).toBe('2001-02-28');
    expect(nextFocusDate('1990-05-03', 'ArrowUp', false, CL)).toBe('1990-04-26');
  });

  it('US-04-AC-09 Home and End are idempotent on the first and last day of the week, and Home on a Sunday in Chile goes back to its Monday', () => {
    expect(nextFocusDate('1990-05-14', 'Home', false, CL)).toBe('1990-05-14');
    expect(nextFocusDate('1990-05-20', 'End', false, CL)).toBe('1990-05-20');
    expect(nextFocusDate('1990-05-20', 'Home', false, CL)).toBe('1990-05-14');
    expect(nextFocusDate('1990-05-13', 'Home', false, CO)).toBe('1990-05-13');
    expect(nextFocusDate('1990-05-19', 'End', false, CO)).toBe('1990-05-19');
    expect(nextFocusDate('1990-05-13', 'End', false, CO)).toBe('1990-05-19');
  });

  it('US-04-AC-09 PageDown and PageUp are one month, clamped to the shorter month, in both directions', () => {
    expect(nextFocusDate('1990-01-31', 'PageDown', false, CL)).toBe('1990-02-28');
    expect(nextFocusDate('2000-01-31', 'PageDown', false, CL)).toBe('2000-02-29');
    expect(nextFocusDate('1990-03-31', 'PageUp', false, CL)).toBe('1990-02-28');
    expect(nextFocusDate('1990-01-15', 'PageUp', false, CL)).toBe('1989-12-15');
    expect(nextFocusDate('1990-12-15', 'PageDown', false, CL)).toBe('1991-01-15');
  });

  it('US-04-AC-09 Shift+PageUp from the leap day goes to 28 February of the previous year', () => {
    expect(nextFocusDate('2000-02-29', 'PageUp', true, CL)).toBe('1999-02-28');
    expect(nextFocusDate('2000-02-29', 'PageUp', true, CO)).toBe('1999-02-28');
  });
});

describe('US-04-AC-10 days disabled by the rules (pinned clock, every row of the AC table)', () => {
  const rows: [Date, string, boolean, string][] = [
    [day(2026, 11, 21), '2008-11-21', false, 'turns 18 today: enabled'],
    [day(2026, 11, 21), '2008-11-22', true, 'turns 18 tomorrow: disabled'],
    [day(2026, 11, 21), '2026-11-27', true, 'future: disabled'],
    [day(2026, 2, 28), '2008-02-29', true, 'the anniversary is on 1 March in non-leap years: disabled'],
    [day(2026, 3, 1), '2008-02-29', false, 'enabled on 1 March'],
  ];

  it.each(rows)('US-04-AC-10 today %s, day %s: disabled is %s (%s)', (today, iso, disabled) => {
    expect(isDayDisabled(birthDate(), iso, today)).toBe(disabled);
  });

  it('US-04-AC-10 the day before and the day after the boundary, both sides: 2008-11-20 enabled, 2008-11-22 disabled', () => {
    expect(isDayDisabled(birthDate(), '2008-11-20', day(2026, 11, 21))).toBe(false);
    expect(isDayDisabled(birthDate(), '2008-11-22', day(2026, 11, 21))).toBe(true);
    expect(isDayDisabled(birthDate(), '2008-02-28', day(2026, 2, 28))).toBe(false);
  });

  it('US-04-AC-10 a day is disabled if and only if the shared validator rejects it: no second implementation (every day of 2008 and 2026 around the boundaries)', () => {
    const config = birthDate();
    for (const today of [day(2026, 11, 21), day(2026, 2, 28), day(2026, 3, 1), day(2028, 2, 29)]) {
      for (let offset = -400; offset <= 400; offset += 7) {
        const d = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate() + offset);
        const iso = `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        expect(isDayDisabled(config, iso, today), `${iso} on ${today.toDateString()}`).toBe(validateField(config, iso, today) !== null);
      }
    }
  });

  it('US-04-AC-10 a date field without rules disables no day, not even a future one', () => {
    expect(isDayDisabled(optionalDate(), '2026-11-22', day(2026, 11, 21))).toBe(false);
    expect(isDayDisabled(optionalDate(), '1906-01-01', day(2026, 11, 21))).toBe(false);
    expect(isDayDisabled(optionalDate(), '2036-12-31', day(2026, 11, 21))).toBe(false);
  });
});

describe('US-04-AC-09 / AC-10 latest valid date and year range (US-04-Q-12)', () => {
  it('US-04-AC-09 the latest selectable day is the 18th anniversary limit: 2008-11-21 on 2026-11-21', () => {
    expect(latestValidDate(birthDate(), day(2026, 11, 21))).toBe('2008-11-21');
  });

  it('US-04-AC-10 around the 29 February birthday: 2008-02-28 on 2026-02-28, 2008-03-01 on 2026-03-01, 2006-02-28 on 2024-02-29', () => {
    expect(latestValidDate(birthDate(), day(2026, 2, 28))).toBe('2008-02-28');
    expect(latestValidDate(birthDate(), day(2026, 3, 1))).toBe('2008-03-01');
    expect(latestValidDate(birthDate(), day(2024, 2, 29))).toBe('2006-02-28');
  });

  it('US-04-AC-10 without minAge the latest day is today', () => {
    expect(latestValidDate(optionalDate(), day(2026, 11, 21))).toBe('2026-11-21');
  });

  it('US-04-AC-10 the year selector: with minAge 18 it runs from 1906 (Y-120) to 2008, without it from 1906 to 2036 (Y+10)', () => {
    expect(yearRange(birthDate(), day(2026, 11, 21))).toEqual({ from: 1906, to: 2008 });
    expect(yearRange(optionalDate(), day(2026, 11, 21))).toEqual({ from: 1906, to: 2036 });
  });

  it('US-04-AC-10 the year range follows the injected clock (Y is the year of today)', () => {
    expect(yearRange(optionalDate(), day(2030, 6, 1))).toEqual({ from: 1910, to: 2040 });
    expect(yearRange(birthDate(), day(2030, 6, 1))).toEqual({ from: 1910, to: 2012 });
  });
});
