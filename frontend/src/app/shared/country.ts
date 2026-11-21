import type { Country } from './country.model';

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Boundary validation of the country list (ADR-0001): `code` is an upper-case ISO alpha-2 code,
 * `name` is non-empty, `currencyCode` is an ISO 4217 alpha-3 code, `localeTag` (wire) is a non-empty BCP 47 tag mapped to the logical `locale` (spec 7.5.2). Invalid entries are dropped
 * with a `console.warn` that never carries content. Sorted by `sortOrder`.
 */
export function parseCountries(response: unknown): Country[] {
  const data = isRec(response) ? response['data'] : null;
  if (!Array.isArray(data)) {
    console.warn('country list: unexpected response shape');
    return [];
  }
  const countries: Country[] = [];
  for (const raw of data) {
    if (
      isRec(raw) &&
      typeof raw['code'] === 'string' &&
      /^[A-Z]{2}$/.test(raw['code']) &&
      typeof raw['name'] === 'string' &&
      raw['name'].trim() !== '' &&
      typeof raw['currencyCode'] === 'string' &&
      /^[A-Z]{3}$/.test(raw['currencyCode']) &&
      typeof raw['localeTag'] === 'string' &&
      raw['localeTag'].trim() !== '' &&
      typeof raw['sortOrder'] === 'number'
    ) {
      countries.push({
        code: raw['code'],
        name: raw['name'],
        currencyCode: raw['currencyCode'],
        locale: raw['localeTag'],
        sortOrder: raw['sortOrder'],
      });
    } else {
      console.warn('country list: an entry was dropped (invalid code, name, currency or localeTag)');
    }
  }
  return countries.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}
