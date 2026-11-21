/**
 * The typed date of the date field (ADR-0012 section 4, US-04-Q-05): dd/mm/aaaa for every country,
 * independent of the browser locale. Pure functions, no Angular.
 */

const SEPARATED = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4})$/;
const COMPACT = /^(\d{2})(\d{2})(\d{4})$/;

function toIso(year: number, month: number, day: number): string | null {
  const probe = new Date(0);
  probe.setUTCFullYear(year, month - 1, day);
  const real = probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  if (!real || year < 1) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * `''` for blank text (nothing typed), the ISO `YYYY-MM-DD` for `d/m/yyyy` (separators `/`, `-` or
 * `.`) or exactly 8 digits `ddmmyyyy` when the date exists, and `null` for anything else (the
 * former `badInput`): incomplete, impossible, 2-digit year, letters.
 */
export function parseDateText(text: string): string | null {
  const t = text.trim();
  if (t === '') return '';
  const separated = SEPARATED.exec(t);
  if (separated) return toIso(Number(separated[4]), Number(separated[3]), Number(separated[1]));
  const compact = COMPACT.exec(t);
  if (compact) return toIso(Number(compact[3]), Number(compact[2]), Number(compact[1]));
  return null;
}

/** `YYYY-MM-DD` as `dd/mm/yyyy`; anything else (including `''`) as `''`. */
export function formatDateText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
