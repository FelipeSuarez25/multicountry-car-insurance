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

/** The code-owned message of text that is not a complete, existing date (US-04-BR-18, spec 8.1). */
export const DATE_TEXT_ERROR = 'Fecha no válida. Usa el formato dd/mm/aaaa.';

const GROUP_SIZES = [2, 2, 4] as const;
const SEPARATORS = '/-.';

/**
 * The date mask (US-04-BR-18, ADR-0014 section 2): a left-to-right scan of `raw` into the day (2),
 * month (2) and year (4) digits, joined with `/`. A separator typed after a one-digit day or month
 * pads it to two digits; any other character, and every digit past the eighth, is dropped. A `/`
 * is shown only once the next group has a digit, so Backspace over it is natural. The caret goes to
 * the end when it was at the end of `raw`, else right after the same count of digits it followed.
 */
export function maskDateDigits(raw: string, caret: number): { text: string; caret: number } {
  const groups: string[] = ['', '', ''];
  let group = 0;
  let digitsBeforeCaret = 0;
  let kept = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch >= '0' && ch <= '9') {
      if (groups[group].length === GROUP_SIZES[group]) group += 1;
      if (group > 2) break;
      groups[group] += ch;
      kept += 1;
      if (i < caret) digitsBeforeCaret = kept;
    } else if (SEPARATORS.includes(ch) && group < 2 && groups[group] !== '') {
      if (groups[group].length === 1) groups[group] = `0${groups[group]}`;
      if (groups[group].length === GROUP_SIZES[group]) group += 1;
    }
  }
  const text = groups.filter((g) => g !== '').join('/');
  if (caret >= raw.length) return { text, caret: text.length };
  // The caret follows the digits: right after the digitsBeforeCaret-th digit of the masked text.
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '/') seen += 1;
    if (seen === digitsBeforeCaret) return { text, caret: i + 1 };
  }
  return { text, caret: digitsBeforeCaret === 0 ? 0 : text.length };
}
