/** Reference data: the two launch markets (ADR-0001). Natural key: `code`. */
export interface SeedCountry {
  code: string;
  name: string;
  currencyCode: string;
  locale: string;
  sortOrder: number;
}

export const SEED_COUNTRIES: SeedCountry[] = [
  { code: 'CO', name: 'Colombia', currencyCode: 'COP', locale: 'es-CO', sortOrder: 10 },
  { code: 'CL', name: 'Chile', currencyCode: 'CLP', locale: 'es-CL', sortOrder: 20 },
];
