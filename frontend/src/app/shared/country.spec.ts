import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseCountries } from './country';
import { seedCountryItems, strapiCountryItem, strapiListResponse, type StrapiItem } from '../../testing/seed-fixtures';

/** A wire entry of spec 7.5.2, overridable attribute by attribute. */
function wire(overrides: Record<string, unknown> = {}): StrapiItem {
  return { ...strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 30, 2), ...overrides };
}

describe('US-01-AC-17 country boundary parser (spec 7.5.2)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  const warnedText = (): string => warn.mock.calls.map((a: unknown[]) => a.map(String).join(' ')).join('\n');

  it('US-01-AC-17 maps the wire "localeTag" to the logical "locale" and ignores id, documentId and meta', () => {
    const parsed = parseCountries(strapiListResponse(seedCountryItems()));
    expect(parsed).toEqual([
      { code: 'CO', name: 'Colombia', currencyCode: 'COP', locale: 'es-CO', sortOrder: 10 },
      { code: 'CL', name: 'Chile', currencyCode: 'CLP', locale: 'es-CL', sortOrder: 20 },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('US-01-AC-17 sorts the countries by sortOrder, with ties broken by code', () => {
    const parsed = parseCountries(
      strapiListResponse([wire({ code: 'PE', sortOrder: 30 }), wire({ code: 'CL', sortOrder: 10 }), wire({ code: 'CO', sortOrder: 10 })]),
    );
    expect(parsed.map((c) => c.code)).toEqual(['CL', 'CO', 'PE']);
  });

  it('US-01-AC-17 drops an entry that has "locale" but no "localeTag", with a warning', () => {
    const entry = wire();
    delete entry['localeTag'];
    entry['locale'] = 'es-PE';
    const parsed = parseCountries(strapiListResponse([...seedCountryItems(), entry]));
    expect(parsed.map((c) => c.code)).toEqual(['CO', 'CL']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['is missing', undefined],
    ['is null', null],
    ['is empty', ''],
    ['is a number', 5],
  ])('US-01-AC-17 drops an entry whose "localeTag" %s, with a warning', (_name, value) => {
    const entry = wire();
    if (value === undefined) delete entry['localeTag'];
    else entry['localeTag'] = value;
    expect(parseCountries(strapiListResponse([entry]))).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['code is lower case', { code: 'pe' }],
    ['code has three letters', { code: 'PER' }],
    ['code has one letter', { code: 'P' }],
    ['code is not a string', { code: 51 }],
    ['code is missing', { code: undefined }],
    ['name is empty', { name: '' }],
    ['name is blank', { name: '   ' }],
    ['name is not a string', { name: null }],
    ['currencyCode has two letters', { currencyCode: 'PE' }],
    ['currencyCode has four letters', { currencyCode: 'PENN' }],
    ['currencyCode is lower case', { currencyCode: 'pen' }],
    ['currencyCode is not a string', { currencyCode: 604 }],
    ['sortOrder is text', { sortOrder: '30' }],
    ['sortOrder is null', { sortOrder: null }],
    ['sortOrder is missing', { sortOrder: undefined }],
  ])('US-01-AC-17 drops an entry whose %s, keeps the valid ones and warns without content', (_name, overrides) => {
    const parsed = parseCountries(strapiListResponse([...seedCountryItems(), wire(overrides)]));
    expect(parsed.map((c) => c.code)).toEqual(['CO', 'CL']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warnedText()).not.toContain('Perú');
    expect(warnedText()).not.toContain('es-PE');
  });

  it('US-01-AC-17 accepts the boundary values: two-letter code, three-letter currency, sortOrder 0 and negative', () => {
    const parsed = parseCountries(strapiListResponse([wire({ sortOrder: 0 }), wire({ code: 'UY', sortOrder: -5 })]));
    expect(parsed.map((c) => [c.code, c.sortOrder])).toEqual([['UY', -5], ['PE', 0]]);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['a string', 'oops'],
    ['an object without data', {}],
    ['a response whose data is not a list', { data: 'oops' }],
  ])('US-01-AC-17 returns an empty list, without throwing, for %s', (_name, body) => {
    expect(() => parseCountries(body)).not.toThrow();
    expect(parseCountries(body)).toEqual([]);
  });

  it('US-01-AC-17 drops entries that are not objects', () => {
    expect(parseCountries({ data: [1, null, 'x', []] })).toEqual([]);
  });
});
