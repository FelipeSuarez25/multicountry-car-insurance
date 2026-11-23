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

const MAX_DIGITS = 8;

function joinGroups(groups: string[]): string {
  return groups.filter((g) => g !== '').join('/');
}

/** The digits of a text, in order. */
export function dateDigits(text: string): string {
  return text.replace(/\D/g, '');
}

/** The date text of up to 8 digits, with `/` after the 2nd and 4th digit once a digit follows. */
function flow(digits: string): string {
  const d = digits.slice(0, MAX_DIGITS);
  return joinGroups([d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)]);
}

/**
 * The date mask (US-04-BR-18, ADR-0014 section 2). Only a separator the person just typed at the
 * end of the text (or in a whole text arriving at once) pads the one-digit day or month before it
 * (`5/` becomes `05`). Every other edit
 * (Backspace, Delete, insert in the middle, select and replace, paste) is re-derived from the
 * digits in order, at most 8, with `/` after the 2nd and 4th digit; a separator already shown is
 * never read as typed. A `/` is shown only once the next group has a digit. The caret goes to the
 * end when it was at the end of `raw`, else right after the same count of digits it followed.
 */
export function maskDateDigits(raw: string, caret: number): { text: string; caret: number } {
  const atEnd = caret >= raw.length;
  // An edit at the end of the text is typing or a whole-text paste: a typed separator pads its group.
  if (atEnd) {
    const text = padTypedSeparator(raw);
    return { text, caret: text.length };
  }
  if (dateDigits(raw).length > MAX_DIGITS && caret > 0) {
    // A digit typed inside a full date is ignored: it must not shift the year into another date.
    return maskDateDigits(raw.slice(0, caret - 1) + raw.slice(caret), caret - 1);
  }
  const text = flow(dateDigits(raw));
  const digitsBeforeCaret = Math.min(dateDigits(raw.slice(0, caret)).length, MAX_DIGITS);
  if (digitsBeforeCaret === 0) return { text, caret: 0 };
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '/') seen += 1;
    if (seen === digitsBeforeCaret) return { text, caret: i + 1 };
  }
  return { text, caret: text.length };
}

/** A left-to-right scan of `raw`: a separator after a one-digit day or month pads it to two digits. */
function padTypedSeparator(raw: string): string {
  const groups: string[] = ['', '', ''];
  let group = 0;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (groups[group].length === GROUP_SIZES[group]) group += 1;
      if (group > 2) break;
      groups[group] += ch;
    } else if (SEPARATORS.includes(ch) && group < 2 && groups[group] !== '') {
      if (groups[group].length === 1) groups[group] = `0${groups[group]}`;
      if (groups[group].length === GROUP_SIZES[group]) group += 1;
    }
  }
  return joinGroups(groups);
}
