import { describe, expect, it } from 'vitest';
import { inputProfileFor, sanitizeInput } from './field-input-profiles';
import type { FieldConfig, FieldType } from './field-config.model';
import { seedField } from '../../testing/seed-fixtures';

/**
 * US-04-AC-26 / US-04-BR-19 (US-04-Q-26, US-04-Q-27, ADR-0014 section 3): the input profile of a
 * field, chosen by `key`, then by `type`, as pure functions (no Angular import).
 *
 * Contract expected from `shared/field-input-profiles.ts`:
 *   inputProfileFor(config: FieldConfig): {
 *     allows(char: string): boolean;          // one character; false means it is never entered
 *     transform?: 'uppercase';
 *     inputMode?: string; autocomplete?: string; autocapitalize?: string;
 *     fallbackMax?: number;                   // the maxlength when Strapi has no maxLength rule
 *   }
 *   sanitizeInput(raw: string, caret: number, profile): { text: string; caret: number }
 *     drops the characters the profile does not allow, applies the transform, and keeps the caret
 *     right after the same count of kept characters. The maximum length is applied by the
 *     directive (component spec), not by this function.
 * An "absent" attribute of the AC table is `undefined` here.
 */

const field = (key: string, type: FieldType, rules: FieldConfig['rules'] = []): FieldConfig => ({
  key,
  type,
  label: 'Campo de prueba',
  isRequired: false,
  sortOrder: 10,
  errorMessage: 'Revisa este campo.',
  rules,
});

describe('US-04-AC-26 characters outside the field profile are not entered (the AC table, filter part)', () => {
  const rows: [string, string, string, string, string][] = [
    // country, key, typed, shown by the filter alone, note
    ['CO', 'fullName', 'Ana 2', 'Ana ', 'digit dropped, the space stays'],
    ['CO', 'fullName', "José Núñez-O'Neil Jr.", "José Núñez-O'Neil Jr.", 'accents, hyphen, apostrophe and dot stay'],
    ['CO', 'documentNumber', '1.012.345.678', '1012345678', 'dots dropped'],
    ['CL', 'documentNumber', '12.345.678-k', '12.345.678-K', 'k is shown as K'],
    ['CO', 'plate', 'abc-123x', 'ABC123X', 'hyphen dropped, uppercase (the 6-character limit is the directive)'],
    ['CL', 'plate', 'bcdf12', 'BCDF12', 'uppercase'],
    ['CO', 'model', '3 Touring+', '3 Touring', '+ dropped'],
    ['CO', 'vehicleYear', '20e2.5', '2025', 'letter and dot dropped'],
    ['CL', 'vehicleYear', 'abc', '', 'nothing allowed in the text is left'],
  ];

  it.each(rows)('US-04-AC-26 %s %s: typing "%s" leaves "%s" (%s)', (country, key, typed, shown) => {
    const profile = inputProfileFor(seedField(country as 'CO' | 'CL', key));
    expect(sanitizeInput(typed, typed.length, profile).text).toBe(shown);
  });

  it('US-04-AC-26 pasting "Ana 2 Prueba" into the name leaves "Ana  Prueba" (two spaces) with the caret at the end', () => {
    const profile = inputProfileFor(seedField('CO', 'fullName'));
    expect(sanitizeInput('Ana 2 Prueba', 12, profile)).toEqual({ text: 'Ana  Prueba', caret: 11 });
  });

  it('US-04-AC-26 text that is already allowed is returned unchanged, with the same caret (idempotent)', () => {
    const profile = inputProfileFor(seedField('CO', 'fullName'));
    expect(sanitizeInput('Ana', 2, profile)).toEqual({ text: 'Ana', caret: 2 });
    expect(sanitizeInput('', 0, profile)).toEqual({ text: '', caret: 0 });
  });

  it('US-04-AC-26 the caret stays after the same number of kept characters when a character before it is dropped', () => {
    const profile = inputProfileFor(seedField('CO', 'fullName'));
    expect(sanitizeInput('A1na', 2, profile)).toEqual({ text: 'Ana', caret: 1 });
    expect(sanitizeInput('A1na', 4, profile)).toEqual({ text: 'Ana', caret: 3 });
  });

  it('US-04-AC-26 the uppercase transform keeps the caret (a character is replaced, not removed)', () => {
    const profile = inputProfileFor(seedField('CO', 'plate'));
    expect(sanitizeInput('abc', 2, profile)).toEqual({ text: 'ABC', caret: 2 });
  });
});

describe('US-04-AC-26 the profile of each seed field (hints and fallback maximum, ADR-0014 section 3 table)', () => {
  it('US-04-AC-26 fullName: letters, space, apostrophe, hyphen and dot; autocomplete name, autocapitalize words, fallback 80', () => {
    const p = inputProfileFor(seedField('CO', 'fullName'));
    for (const ch of ['a', 'Z', 'é', 'ñ', 'Ü', ' ', "'", '-', '.']) expect(p.allows(ch), `allows "${ch}"`).toBe(true);
    for (const ch of ['2', '+', '_', '/', ',']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.autocomplete).toBe('name');
    expect(p.autocapitalize).toBe('words');
    expect(p.inputMode ?? undefined).toBeUndefined();
    expect(p.fallbackMax).toBe(80);
  });

  it('US-04-AC-26 documentNumber without a rutCheckDigit rule (Colombia): digits only, inputmode numeric, fallback 10', () => {
    const p = inputProfileFor(seedField('CO', 'documentNumber'));
    for (const ch of ['0', '5', '9']) expect(p.allows(ch)).toBe(true);
    for (const ch of ['.', '-', 'k', 'K', ' ', 'a']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.inputMode).toBe('numeric');
    expect(p.fallbackMax).toBe(10);
    expect(p.autocomplete ?? undefined).toBeUndefined();
    expect(p.autocapitalize ?? undefined).toBeUndefined();
  });

  it('US-04-AC-26 documentNumber with a rutCheckDigit rule (Chile): digits . - k K, shown in uppercase, inputmode text, fallback 12', () => {
    const p = inputProfileFor(seedField('CL', 'documentNumber'));
    for (const ch of ['0', '5', '.', '-', 'k', 'K']) expect(p.allows(ch), `allows "${ch}"`).toBe(true);
    for (const ch of ['x', 'a', ' ', '+']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.transform).toBe('uppercase');
    expect(p.inputMode).toBe('text');
    expect(p.fallbackMax).toBe(12);
  });

  it('US-04-AC-26 the RUT variant follows the rutCheckDigit rule, never the country: the same key without the rule is the digits profile', () => {
    const withRule = inputProfileFor(field('documentNumber', 'text', [{ kind: 'rutCheckDigit' }]));
    const without = inputProfileFor(field('documentNumber', 'text', [{ kind: 'pattern', value: '^[0-9]{6,10}$' }]));
    expect(withRule.allows('k')).toBe(true);
    expect(without.allows('k')).toBe(false);
  });

  it('US-04-AC-26 plate: letters and digits in uppercase; autocapitalize characters, autocomplete off, fallback 6', () => {
    const p = inputProfileFor(seedField('CO', 'plate'));
    for (const ch of ['a', 'Z', '7']) expect(p.allows(ch)).toBe(true);
    for (const ch of ['-', ' ', '.', 'é']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.transform).toBe('uppercase');
    expect(p.autocapitalize).toBe('characters');
    expect(p.autocomplete).toBe('off');
    expect(p.fallbackMax).toBe(6);
  });

  it('US-04-AC-26 model: letters, digits, space, hyphen, dot and slash; fallback 40, no other hint', () => {
    const p = inputProfileFor(seedField('CO', 'model'));
    for (const ch of ['a', '3', ' ', '-', '.', '/']) expect(p.allows(ch), `allows "${ch}"`).toBe(true);
    for (const ch of ['+', '_', ',']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.fallbackMax).toBe(40);
    expect(p.inputMode ?? undefined).toBeUndefined();
    expect(p.autocomplete ?? undefined).toBeUndefined();
    expect(p.autocapitalize ?? undefined).toBeUndefined();
  });

  it.each(['CO', 'CL'] as const)('US-04-AC-26 %s vehicleYear (a number field): digits only, inputmode numeric, fallback 4', (country) => {
    const p = inputProfileFor(seedField(country, 'vehicleYear'));
    for (const ch of ['0', '9']) expect(p.allows(ch)).toBe(true);
    for (const ch of ['e', '.', '-', '+', ' ']) expect(p.allows(ch), `rejects "${ch}"`).toBe(false);
    expect(p.inputMode).toBe('numeric');
    expect(p.fallbackMax).toBe(4);
  });
});

describe('US-04-AC-26 fields the front end does not know', () => {
  it('US-04-AC-26 an unknown text key has no filter and no fallback maximum', () => {
    const p = inputProfileFor(field('mobilePhone', 'text', [{ kind: 'maxLength', value: 15 }]));
    for (const ch of ['3', ' ', '-', 'a', '+', '(', 'é']) expect(p.allows(ch), `allows "${ch}"`).toBe(true);
    expect(p.transform ?? undefined).toBeUndefined();
    expect(p.fallbackMax ?? undefined).toBeUndefined();
    expect(sanitizeInput('300 123-4567', 12, p).text).toBe('300 123-4567');
  });

  it('US-04-AC-26 an unknown number key is digits only with inputmode numeric and no fallback maximum ("12e3.4" shows "1234")', () => {
    const p = inputProfileFor(field('mileage', 'number'));
    expect(p.inputMode).toBe('numeric');
    expect(p.fallbackMax ?? undefined).toBeUndefined();
    expect(sanitizeInput('12e3.4', 6, p).text).toBe('1234');
  });

  it('US-04-AC-26 select, date and checkbox fields (and their keys) get no character filter', () => {
    for (const type of ['select', 'date', 'checkbox'] as const) {
      const p = inputProfileFor(field('city', type));
      expect(p.allows('x'), type).toBe(true);
    }
  });
});
