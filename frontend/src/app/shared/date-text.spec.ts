import { describe, expect, it } from 'vitest';
import { DATE_TEXT_ERROR, formatDateText, maskDateDigits, parseDateText } from './date-text';

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

/**
 * US-04-AC-25 / US-04-BR-18 (ADR-0014 section 2): the date mask, as a pure function.
 *
 * Contract expected from `shared/date-text.ts` (no Angular import):
 *   maskDateDigits(raw: string, caret: number): { text: string; caret: number }
 *     a left-to-right scan into day (2), month (2) and year (4) digits; a `/`, `-` or `.` closes a
 *     non-empty day or month group and pads one digit to two; any other character is dropped; digits
 *     beyond 8 are dropped; a `/` is shown only once the next group has a digit (so "15" stays "15",
 *     "150" is "15/0"). The caret goes to the end when it was at the end of `raw`, otherwise right
 *     after the same count of digits it followed.
 *   DATE_TEXT_ERROR = 'Fecha no válida. Usa el formato dd/mm/aaaa.'
 */

/** What the person sees after typing the keys one at a time, each key appended at the caret (the end). */
function typeKeys(keys: string): string {
  let shown = '';
  for (const key of keys) {
    const raw = shown + key;
    shown = maskDateDigits(raw, raw.length).text;
  }
  return shown;
}

/** What the person sees after pressing Backspace `times` times at the end of `start`. */
function backspace(start: string, times: number): string {
  let shown = start;
  for (let i = 0; i < times; i++) {
    const raw = shown.slice(0, -1);
    shown = maskDateDigits(raw, raw.length).text;
  }
  return shown;
}

describe('US-04-AC-25 the date box formats as I type (every row of the AC table, key by key)', () => {
  const rows: [string, string][] = [
    ['15051990', '15/05/1990'],
    ['15/05/1990', '15/05/1990'],
    ['15-05-1990', '15/05/1990'],
    ['150', '15/0'],
    ['5/5/1990', '05/05/1990'],
    ['15a05b1990', '15/05/1990'],
    ['150519901', '15/05/1990'],
  ];

  it.each(rows)('US-04-AC-25 typing "%s" shows "%s"', (keys, shown) => {
    expect(typeKeys(keys)).toBe(shown);
  });

  it('US-04-AC-25 a separator is not shown until the next group has a digit ("15" stays "15", "15/" is "15", "150" is "15/0")', () => {
    expect(typeKeys('15')).toBe('15');
    expect(typeKeys('15/')).toBe('15');
    expect(typeKeys('1505')).toBe('15/05');
    expect(typeKeys('1505/')).toBe('15/05');
  });

  it('US-04-AC-25 a separator pads a one-digit day or month to two digits, and an empty group ignores it', () => {
    expect(typeKeys('5/')).toBe('05');
    expect(typeKeys('5/5/')).toBe('05/05');
    expect(typeKeys('/')).toBe('');
    expect(typeKeys('//')).toBe('');
  });

  it('US-04-AC-25 an empty text stays empty and never gains a separator', () => {
    expect(maskDateDigits('', 0)).toEqual({ text: '', caret: 0 });
  });

  it('US-04-AC-25 at most 8 digits are kept (the ninth is dropped), so the text is at most 10 characters (maxlength 10)', () => {
    expect(maskDateDigits('1505199012', 10).text).toBe('15/05/1990');
    expect(maskDateDigits('15/05/19901', 11).text).toBe('15/05/1990');
  });
});

describe('US-04-AC-25 Backspace over a separator', () => {
  it('US-04-AC-25 "15/05/1990", End, Backspace 4 times shows "15/05"; once more shows "15/0"', () => {
    expect(backspace('15/05/1990', 4)).toBe('15/05');
    expect(backspace('15/05/1990', 5)).toBe('15/0');
  });

  it('US-04-AC-25 each Backspace removes one digit or one separator at most (no digit is lost twice)', () => {
    expect(backspace('15/05/1990', 1)).toBe('15/05/199');
    expect(backspace('15/05/1990', 3)).toBe('15/05/1');
    expect(backspace('15/05/1990', 6)).toBe('15');
  });
});

describe('US-04-AC-25 pasting a date (the whole text arrives in one event, as with Playwright fill())', () => {
  const rows: [string, string][] = [
    ['15/05/1990', '15/05/1990'],
    ['15-05-1990', '15/05/1990'],
    ['15.05.1990', '15/05/1990'],
    ['15051990', '15/05/1990'],
    ['5/5/1990', '05/05/1990'],
  ];

  it.each(rows)('US-04-AC-25 pasting "%s" shows "%s" with the caret at the end', (pasted, shown) => {
    expect(maskDateDigits(pasted, pasted.length)).toEqual({ text: shown, caret: shown.length });
  });

  it('US-04-AC-25 a masked text is a fixed point (masking it again changes nothing)', () => {
    for (const text of ['', '15', '15/0', '15/05', '15/05/1', '15/05/1990', '05/05/1990']) {
      expect(maskDateDigits(text, text.length).text).toBe(text);
    }
  });
});

describe('US-04-AC-25 the caret follows the digits', () => {
  it('US-04-AC-25 at the end of the raw text the caret goes to the end of the masked text', () => {
    expect(maskDateDigits('1505', 4)).toEqual({ text: '15/05', caret: 5 });
    expect(maskDateDigits('15051990', 8)).toEqual({ text: '15/05/1990', caret: 10 });
  });

  it('US-04-AC-25 elsewhere the caret stays right after the same number of digits it followed', () => {
    // US-04-R3-F01 supersedes the former expectation ("15/095/1990" -> "15/09/5199", a shifted year): a 9 typed
    // after "15/0" of a full text (8 digits) is ignored, so the date does not change and the caret stays after the 0.
    const out = maskDateDigits('15/095/1990', 5);
    expect(out.text).toBe('15/05/1990');
    expect(out.caret).toBe(4);
    expect(maskDateDigits('1505', 1)).toEqual({ text: '15/05', caret: 1 });
    expect(maskDateDigits('1505', 0)).toEqual({ text: '15/05', caret: 0 });
  });
});

describe('US-04-AC-25 the message for an unreadable date is code-owned copy (spec 8.1)', () => {
  it('US-04-AC-25 DATE_TEXT_ERROR is exactly "Fecha no válida. Usa el formato dd/mm/aaaa."', () => {
    expect(DATE_TEXT_ERROR).toBe('Fecha no válida. Usa el formato dd/mm/aaaa.');
  });

  it('US-04-AC-25 every "message after leaving" row maps to the stored value the AC table states (parseDateText on the masked text)', () => {
    const rows: [string, string, string | null][] = [
      ['15051990', '15/05/1990', '1990-05-15'],
      ['29202001', '29/20/2001', null],
      ['31021990', '31/02/1990', null],
      ['29022001', '29/02/2001', null],
      ['1505199', '15/05/199', null],
      ['1505', '15/05', null],
      ['', '', ''],
      ['01032010', '01/03/2010', '2010-03-01'],
    ];
    for (const [keys, shown, iso] of rows) {
      const masked = typeKeys(keys);
      expect(masked, keys).toBe(shown);
      expect(parseDateText(masked), keys).toBe(iso);
    }
  });
});

/**
 * US-04-R3-F01 (review round 3): edits away from the end of the text. The contract of
 * `maskDateDigits(raw, caret)` when `caret < raw.length` (an edit in place, not typing or pasting at
 * the end): the digits are re-flowed in order into dd/mm/aaaa. A `/` that is already shown never pads
 * a group (only a separator typed at the end of the text pads, "5/" -> "05"), so no digit is
 * invented, no group becomes "0d" and the year never shifts into a different valid date. Rules of the
 * main session for this fix where BR-18 / Q-23 / ADR-0014 section 2 are silent.
 * The Backspace-over-a-separator and select-and-type cases need the edit kind, so they are
 * component tests in `date-field.spec.ts`.
 */
describe('US-04-AC-25 R3-F01 maskDateDigits: edits in the middle of the text re-flow the digits in order', () => {
  it('US-04-AC-25 R3-F01 Backspace on the month\'s 5 ("15/0/1990", caret 4) shows "15/01/990" with the caret after the 0', () => {
    expect(maskDateDigits('15/0/1990', 4)).toEqual({ text: '15/01/990', caret: 4 });
  });

  it('US-04-AC-25 R3-F01 Backspace on the day\'s 5 ("1/05/1990", caret 1) shows "10/51/990" with the caret after the 1', () => {
    expect(maskDateDigits('1/05/1990', 1)).toEqual({ text: '10/51/990', caret: 1 });
  });

  it('US-04-AC-25 R3-F01 Backspace on the month\'s 0 ("15/5/1990", caret 3) removes the 0 and does not leave the text unchanged: "15/51/990"', () => {
    expect(maskDateDigits('15/5/1990', 3).text).toBe('15/51/990');
  });

  it('US-04-AC-25 R3-F01 a second Backspace inside the month still removes a digit: "15/1/990" (caret 3) gives "15/19/90"', () => {
    // from "15/01/990" with the caret after the 0, the browser leaves "15/1/990"; the month can be cleared from the middle
    expect(maskDateDigits('15/1/990', 3).text).toBe('15/19/90');
  });

  it('US-04-AC-25 R3-F01 a digit inserted inside the day of a full text ("061/05/1990", caret 2) is ignored: "01/05/1990", caret 1', () => {
    expect(maskDateDigits('061/05/1990', 2)).toEqual({ text: '01/05/1990', caret: 1 });
  });

  it('US-04-AC-25 R3-F01 a digit inserted inside the month of a full text ("15/005/1990", caret 5) is ignored: "15/05/1990", caret 4', () => {
    expect(maskDateDigits('15/005/1990', 5)).toEqual({ text: '15/05/1990', caret: 4 });
  });

  it('US-04-AC-25 R3-F01 a digit inserted into a text with room re-flows in order: "1/05/199" with a 6 typed at caret 1 ("16/05/199", caret 2) stays "16/05/199"', () => {
    expect(maskDateDigits('16/05/199', 2)).toEqual({ text: '16/05/199', caret: 2 });
  });

  it('US-04-AC-25 R3-F01 an edit in the middle never produces a different complete valid date (no "06/01/0519"): the 7-digit results are incomplete', () => {
    for (const [raw, caret] of [['1/05/1990', 1], ['15/0/1990', 4], ['15/5/1990', 3]] as const) {
      expect(parseDateText(maskDateDigits(raw, caret).text), raw).toBeNull();
    }
    expect(parseDateText(maskDateDigits('061/05/1990', 2).text)).toBe('1990-05-01');
  });

  it('US-04-AC-25 R3-F01 typing a separator at the END still pads (the existing rows keep working): "5/" -> "05", "15/5/" -> "15/05"', () => {
    expect(maskDateDigits('5/', 2).text).toBe('05');
    expect(maskDateDigits('15/5/', 5).text).toBe('15/05');
  });

  it('US-04-AC-25 R3-F01 a pasted text is not an edit in place: "5/5/1990" with the caret at its end still gives "05/05/1990"', () => {
    expect(maskDateDigits('5/5/1990', 8)).toEqual({ text: '05/05/1990', caret: 10 });
  });
});
