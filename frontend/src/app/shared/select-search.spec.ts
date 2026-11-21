import { describe, expect, it } from 'vitest';
import { SEARCH_THRESHOLD, filterOptions, normaliseForSearch } from './select-search';
import type { SelectOption } from './field-config.model';
import { seedField } from '../../testing/seed-fixtures';

/**
 * US-04-AC-07 / BR-05 (US-04-Q-11): the search of a long select, as pure functions (ADR-0012 section 2).
 *
 * Contract expected from `shared/select-search.ts` (no Angular import):
 *   SEARCH_THRESHOLD = 4                      // a field with this many options or more is searchable
 *   normaliseForSearch(text: string): string  // lower-case, accents removed
 *   filterOptions(options: SelectOption[], text: string): SelectOption[]
 *       the options whose label contains the normalised text, in the order given
 */

const options = (field: string, country: 'CO' | 'CL'): SelectOption[] => seedField(country, field).options ?? [];
const labels = (list: SelectOption[]): string[] => list.map((o) => o.label);

describe('US-04-AC-07 the search threshold (US-04-Q-11): 4 options or more', () => {
  it('US-04-AC-07 the threshold is 4: the seed cities (4) and makes (5) are searchable, "Tipo de documento" (2) is not', () => {
    expect(SEARCH_THRESHOLD).toBe(4);
    expect(options('city', 'CO').length >= SEARCH_THRESHOLD).toBe(true);
    expect(options('make', 'CO').length >= SEARCH_THRESHOLD).toBe(true);
    expect(options('documentType', 'CO').length >= SEARCH_THRESHOLD).toBe(false);
  });
});

describe('US-04-AC-07 normaliseForSearch', () => {
  it('US-04-AC-07 is case- and accent-insensitive', () => {
    expect(normaliseForSearch('Valparaíso')).toBe('valparaiso');
    expect(normaliseForSearch('CONCEPCIÓN')).toBe('concepcion');
    expect(normaliseForSearch('Bogotá')).toBe(normaliseForSearch('bogota'));
    expect(normaliseForSearch('Medellín')).toBe('medellin');
  });
});

describe('US-04-AC-07 filterOptions: every row of the AC table (Chile)', () => {
  it('US-04-AC-07 "valpa" shows only "Valparaíso"', () => {
    expect(labels(filterOptions(options('city', 'CL'), 'valpa'))).toEqual(['Valparaíso']);
  });

  it('US-04-AC-07 "CONCE" shows only "Concepción" (upper case, accent in the option)', () => {
    expect(labels(filterOptions(options('city', 'CL'), 'CONCE'))).toEqual(['Concepción']);
  });

  it('US-04-AC-07 "u" in the makes shows "Suzuki" and "Hyundai", in the order of the list', () => {
    expect(labels(filterOptions(options('make', 'CL'), 'u'))).toEqual(['Suzuki', 'Hyundai']);
  });

  it('US-04-AC-07 "xyz" shows no option', () => {
    expect(filterOptions(options('make', 'CL'), 'xyz')).toEqual([]);
  });
});

describe('US-04-AC-07 filterOptions: the rules around the table', () => {
  it('US-04-AC-07 matches "contains", not "starts with": "ntiago" finds "Santiago"', () => {
    expect(labels(filterOptions(options('city', 'CL'), 'ntiago'))).toEqual(['Santiago']);
  });

  it('US-04-AC-07 matches an accented option with an unaccented query and the other way round', () => {
    expect(labels(filterOptions(options('city', 'CO'), 'bogota'))).toEqual(['Bogotá']);
    expect(labels(filterOptions(options('city', 'CO'), 'medellín'))).toEqual(['Medellín']);
    expect(labels(filterOptions([{ value: 'a', label: 'Cali', sortOrder: 1 }], 'CALÍ'))).toEqual(['Cali']);
  });

  it('US-04-AC-07 empty text shows every option, in the given order, and the result is a copy', () => {
    const all = options('city', 'CO');
    const result = filterOptions(all, '');
    expect(labels(result)).toEqual(['Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
    expect(result).not.toBe(all);
  });

  it('US-04-AC-07 the options returned are the configured objects (the value to store comes with them)', () => {
    expect(filterOptions(options('city', 'CO'), 'medel')).toEqual([{ value: 'MDE', label: 'Medellín', sortOrder: 20 }]);
  });
});
