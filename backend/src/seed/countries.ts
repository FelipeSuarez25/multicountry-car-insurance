/** Reference data: the two launch markets (ADR-0001). Natural key: `code`. */
export interface SeedCountry {
  code: string;
  name: string;
  currencyCode: string;
  /** BCP 47 tag. Stored and exposed as `localeTag` (`locale` is a reserved Strapi attribute; ADR-0006). */
  localeTag: string;
  sortOrder: number;
}

export const SEED_COUNTRIES: SeedCountry[] = [
  { code: 'CO', name: 'Colombia', currencyCode: 'COP', localeTag: 'es-CO', sortOrder: 10 },
  { code: 'CL', name: 'Chile', currencyCode: 'CLP', localeTag: 'es-CL', sortOrder: 20 },
];
