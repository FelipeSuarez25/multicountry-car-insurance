/**
 * Calendar helpers for the injectable clock (US-01-Q-06): "today" is a local calendar date read
 * through the `CLOCK` token. Tests never depend on the real current date.
 */

/** A local date at 09:30 (month is 1-12), so the time of day never decides a result by accident. */
export function day(year: number, month: number, dayOfMonth: number, hours = 9, minutes = 30, seconds = 0): Date {
  return new Date(year, month - 1, dayOfMonth, hours, minutes, seconds);
}

/** A `CLOCK` value that always answers the given instant (a fresh Date each call). */
export function fixedClock(now: Date): () => Date {
  return () => new Date(now.getTime());
}

/** The date the spec pins for most scenarios: 2026-11-20 (valid vehicle years 2006-2027). */
export const SPEC_TODAY = day(2026, 11, 20);
