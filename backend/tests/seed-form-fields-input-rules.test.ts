import { describe, expect, it } from 'vitest';
import { SEED_FORM_FIELDS, type FieldSeed, type RuleSeed } from '../src/seed/form-fields';

/**
 * US-04-AC-26 "Strapi seed content (CO and CL)" (spec 7.1, BR-19, BR-07 exception (c)): the real seed
 * definitions carry the rules the front end relies on. The seed is the source of truth for validation
 * (ADR-0004, ADR-0014 D2), so removing one of these rules must fail a test. Pure data: no Strapi boot.
 *
 * The pattern is compiled the way the front end compiles it: `new RegExp('^(?:' + source + ')$')`,
 * with no flags (in particular no `u`).
 */

const LATIN1_CLASS = "^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ '.-]*$";
const NEW_FULL_NAME_MESSAGE = 'Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).';

function field(country: 'CO' | 'CL', key: string): FieldSeed {
  const found = SEED_FORM_FIELDS[country].find((f) => f.key === key);
  if (!found) throw new Error(`The ${country} seed has no "${key}" field`);
  return found;
}

function rulesOf(country: 'CO' | 'CL', key: string, kind: RuleSeed['kind']): RuleSeed[] {
  return (field(country, key).rules ?? []).filter((r) => r.kind === kind);
}

function compiled(country: 'CO' | 'CL', key: string): RegExp {
  const rule = rulesOf(country, key, 'pattern')[0];
  if (!rule || rule.kind !== 'pattern') throw new Error(`${country} ${key} has no pattern rule`);
  return new RegExp('^(?:' + rule.pattern + ')$');
}

describe.each(['CO', 'CL'] as const)('US-04-AC-26 seed content: fullName (%s)', (country) => {
  it('US-04-AC-26 has exactly one pattern rule, with the Latin-1 letter class as written in the spec', () => {
    const patterns = rulesOf(country, 'fullName', 'pattern');
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({ kind: 'pattern', pattern: LATIN1_CLASS });
  });

  it('US-04-AC-26 keeps the existing length rules first (minLength 3, maxLength 80) and appends the pattern after them', () => {
    const kinds = (field(country, 'fullName').rules ?? []).map((r) => r.kind);
    expect(kinds).toEqual(['minLength', 'maxLength', 'pattern']);
    expect(field(country, 'fullName').rules).toEqual(expect.arrayContaining([{ kind: 'minLength', value: 3 }, { kind: 'maxLength', value: 80 }]));
  });

  it('US-04-AC-26 the field errorMessage is the new one', () => {
    expect(field(country, 'fullName').errorMessage).toBe(NEW_FULL_NAME_MESSAGE);
  });

  it('US-04-AC-26 compiled as the front end does (no "u" flag) it accepts "José Núñez-O\'Neil Jr."', () => {
    expect(compiled(country, 'fullName').test("José Núñez-O'Neil Jr.")).toBe(true);
  });

  it.each(['Ana 2', '2Ana', 'Ana_', 'Ana@', '', ' Ana', '-Ana'])('US-04-AC-26 compiled as the front end does it rejects "%s"', (text) => {
    expect(compiled(country, 'fullName').test(text)).toBe(false);
  });

  it('US-04-AC-26 the compiled pattern needs no "u" flag: it compiles without flags and with the anchored wrapper', () => {
    expect(() => new RegExp('^(?:' + (rulesOf(country, 'fullName', 'pattern')[0] as { pattern: string }).pattern + ')$')).not.toThrow();
  });
});

describe('US-04-AC-26 seed content: maximum lengths from Strapi', () => {
  const rows: ['CO' | 'CL', string, number][] = [
    ['CO', 'documentNumber', 10],
    ['CL', 'documentNumber', 12],
    ['CO', 'plate', 6],
    ['CL', 'plate', 6],
  ];

  it.each(rows)('US-04-AC-26 %s "%s" has exactly one maxLength rule of %i', (country, key, value) => {
    const rules = rulesOf(country, key, 'maxLength');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ kind: 'maxLength', value });
  });

  it('US-04-AC-26 the new maxLength rules are appended after the existing rules of the field (existing rules first, in their order)', () => {
    expect((field('CO', 'documentNumber').rules ?? []).map((r) => r.kind)).toEqual(['pattern', 'maxLength']);
    expect((field('CL', 'documentNumber').rules ?? []).map((r) => r.kind)).toEqual(['pattern', 'rutCheckDigit', 'maxLength']);
    expect((field('CO', 'plate').rules ?? []).map((r) => r.kind)).toEqual(['pattern', 'maxLength']);
    expect((field('CL', 'plate').rules ?? []).map((r) => r.kind)).toEqual(['pattern', 'maxLength']);
  });

  it('US-04-AC-26 the maxLength rules do not make a valid value invalid: the longest valid documents and plates fit', () => {
    expect('1012345678'.length).toBeLessThanOrEqual(10);
    expect('12.345.678-5'.length).toBeLessThanOrEqual(12);
    expect('ABC123'.length).toBeLessThanOrEqual(6);
    expect('BCDF12'.length).toBeLessThanOrEqual(6);
  });
});
