import type { Type } from '@angular/core';
import { FlagChile } from './flags/flag-chile';
import { FlagColombia } from './flags/flag-colombia';

/**
 * Presentation only (ADR-0011, which amends ADR-0001). The flag and the accent key of a country,
 * looked up by ISO code. No behaviour, validation, routing, guard, price, copy or request reads
 * this map. An unknown code gets no flag and no accent: the UI shows a neutral globe and the
 * brand accent, so a country published in Strapi works with no deployment.
 */
export interface CountryVisuals {
  flag: Type<unknown> | null;
  /** A key of the `[data-country-accent]` blocks of `tokens.css`, never a colour. */
  accent: 'co' | 'cl' | null;
}

const NONE: CountryVisuals = { flag: null, accent: null };

const BY_CODE: Record<string, CountryVisuals> = {
  'CO': { flag: FlagColombia, accent: 'co' },
  'CL': { flag: FlagChile, accent: 'cl' },
};

export function countryVisuals(code: string): CountryVisuals {
  const visuals = Object.hasOwn(BY_CODE, code.toUpperCase()) ? BY_CODE[code.toUpperCase()] : NONE;
  return { ...visuals };
}
