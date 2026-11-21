import type { FieldConfig } from './field-config.model';
import { validateField } from './field-validators';

/**
 * The pure logic of the calendar (ADR-0012 section 4, the week-start note of adr/README.md).
 * Dates are ISO `YYYY-MM-DD` strings; "today" is a `Date` from the injectable clock; the locale is
 * the country's `localeTag`, never a country code. No Angular.
 */

const MONTH_DAYS_PROBE = 120 * 366;
export const YEARS_BACK = 120;
export const YEARS_AHEAD = 10;

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function parse(iso: string): Ymd {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function format({ year, month, day }: Ymd): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function utc(year: number, month: number, day: number): Date {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d;
}

function fromUtc(d: Date): Ymd {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function daysInMonth(year: number, month: number): number {
  return fromUtc(utc(year, month + 1, 0)).day;
}

function addDays(iso: string, days: number): string {
  const { year, month, day } = parse(iso);
  return format(fromUtc(utc(year, month, day + days)));
}

/** Moves by whole months, keeping the day of the month when it exists and clamping it otherwise. */
function addMonths(iso: string, months: number): string {
  const { year, month, day } = parse(iso);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return format({ year: targetYear, month: targetMonth, day: Math.min(day, daysInMonth(targetYear, targetMonth)) });
}

/** 1 = Monday ... 7 = Sunday, the weekday of an ISO date. */
function isoWeekday(iso: string): number {
  const { year, month, day } = parse(iso);
  return utc(year, month, day).getUTCDay() || 7;
}

type WeekInfo = { firstDay?: number };
type LocaleLike = { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };

/**
 * The first day of the week of a locale, 1 = Monday ... 7 = Sunday, from CLDR through `Intl`:
 * `getWeekInfo()`, then the older `weekInfo` accessor, then Monday (the world default). The locale
 * constructor is injectable so a test can reach the fallback paths.
 */
export function firstDayOfWeek(localeTag: string, makeLocale: (tag: string) => unknown = (tag) => new Intl.Locale(tag)): number {
  try {
    const locale = makeLocale(localeTag) as LocaleLike;
    const info = typeof locale.getWeekInfo === 'function' ? locale.getWeekInfo() : locale.weekInfo;
    const first = info?.firstDay;
    return typeof first === 'number' && first >= 1 && first <= 7 ? first : 1;
  } catch {
    return 1;
  }
}

/** The days of one month in grid order: `weekdays` are the full names, `weeks` rows of 7 ISO dates or null padding. */
export function monthGrid(year: number, month: number, localeTag: string): { weekdays: string[]; weeks: (string | null)[][] } {
  const first = firstDayOfWeek(localeTag);
  const names = new Intl.DateTimeFormat(localeTag, { weekday: 'long', timeZone: 'UTC' });
  // 2024-01-01 is a Monday
  const weekdays = Array.from({ length: 7 }, (_, i) => names.format(new Date(Date.UTC(2024, 0, 1 + ((first - 1 + i) % 7)))));
  const lead = (isoWeekday(format({ year, month, day: 1 })) - first + 7) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, i) => format({ year, month, day: i + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weekdays, weeks };
}

/** The date the focus moves to for a `KeyboardEvent.key` in the grid (arrows, Home, End, Page keys). */
export function nextFocusDate(iso: string, key: string, shift: boolean, localeTag: string): string {
  switch (key) {
    case 'ArrowLeft':
      return addDays(iso, -1);
    case 'ArrowRight':
      return addDays(iso, 1);
    case 'ArrowUp':
      return addDays(iso, -7);
    case 'ArrowDown':
      return addDays(iso, 7);
    case 'Home':
      return addDays(iso, -((isoWeekday(iso) - firstDayOfWeek(localeTag) + 7) % 7));
    case 'End':
      return addDays(iso, 6 - ((isoWeekday(iso) - firstDayOfWeek(localeTag) + 7) % 7));
    case 'PageUp':
      return addMonths(iso, shift ? -12 : -1);
    case 'PageDown':
      return addMonths(iso, shift ? 12 : 1);
    default:
      return iso;
  }
}

/** A day is disabled if and only if the field's validator rejects it (no second implementation). */
export function isDayDisabled(config: FieldConfig, iso: string, today: Date): boolean {
  return validateField(config, iso, today) !== null;
}

function isoOfLocal(date: Date): string {
  return format({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

/** The latest ISO date the field accepts, probing backwards from today with the same validator. */
export function latestValidDate(config: FieldConfig, today: Date): string {
  for (let back = 0; back <= MONTH_DAYS_PROBE; back++) {
    const candidate = isoOfLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate() - back));
    if (!isDayDisabled(config, candidate, today)) return candidate;
  }
  return isoOfLocal(today);
}

/** The years the selector offers: Y-120 to the year of the latest valid date, or to Y+10 when no rule disables days. */
export function yearRange(config: FieldConfig, today: Date): { from: number; to: number } {
  const year = today.getFullYear();
  const latest = latestValidDate(config, today);
  const to = latest === isoOfLocal(today) ? year + YEARS_AHEAD : parse(latest).year;
  return { from: year - YEARS_BACK, to };
}

/** The same month and day in another year, clamped to the month's last day (29 February → 28 February). */
export function moveToYear(iso: string, year: number): string {
  const { month, day } = parse(iso);
  return format({ year, month, day: Math.min(day, daysInMonth(year, month)) });
}

/** The year, month (1-12) and day of an ISO date. */
export function partsOf(iso: string): { year: number; month: number; day: number } {
  return parse(iso);
}

/** Today as an ISO date, from the injectable clock. */
export function isoOf(date: Date): string {
  return isoOfLocal(date);
}

/** The first day of the week as grid column order: the short names of `monthGrid`'s weekdays. */
export function shortWeekdays(localeTag: string): string[] {
  const first = firstDayOfWeek(localeTag);
  const names = new Intl.DateTimeFormat(localeTag, { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => names.format(new Date(Date.UTC(2024, 0, 1 + ((first - 1 + i) % 7)))));
}

/** "15 de mayo de 1990" and "mayo de 1990": day and month names from `Intl` with the country's locale tag. */
export function longDateName(iso: string, localeTag: string): string {
  const { year, month, day } = parse(iso);
  return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(year, month, day));
}

export function monthName(iso: string, localeTag: string): string {
  const { year, month, day } = parse(iso);
  return new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(year, month, day));
}
