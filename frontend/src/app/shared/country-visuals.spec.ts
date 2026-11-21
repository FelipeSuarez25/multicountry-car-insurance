import { describe, expect, it } from 'vitest';
import { countryVisuals } from './country-visuals';

/**
 * US-04-AC-03 / US-04-BR-03 (US-04-Q-02, ADR-0011): the presentation-only country map.
 *
 * Contract expected from `shared/country-visuals.ts`:
 *   interface CountryVisuals { flag: Type<unknown> | null; accent: 'co' | 'cl' | null }
 *   countryVisuals(code: string): CountryVisuals
 * The code is upper-cased by the function; an unknown code (or '') gives `{ flag: null, accent: null }`,
 * which the UI renders as the neutral globe icon and the brand accent. The map holds no colour value
 * and no country name.
 */

describe('US-04-AC-03 country visuals lookup', () => {
  it('US-04-AC-03 "CO" has a flag component and the accent key "co"', () => {
    const visuals = countryVisuals('CO');
    expect(typeof visuals.flag).toBe('function');
    expect(visuals.accent).toBe('co');
  });

  it('US-04-AC-03 "CL" has a flag component and the accent key "cl"', () => {
    const visuals = countryVisuals('CL');
    expect(typeof visuals.flag).toBe('function');
    expect(visuals.accent).toBe('cl');
  });

  it('US-04-AC-03 the two flags are different components', () => {
    expect(countryVisuals('CO').flag).not.toBe(countryVisuals('CL').flag);
  });

  it('US-04-AC-03 the code is case-insensitive: "co" and "cl" resolve like "CO" and "CL"', () => {
    expect(countryVisuals('co')).toEqual(countryVisuals('CO'));
    expect(countryVisuals('cl')).toEqual(countryVisuals('CL'));
  });

  it('US-04-AC-03 a published country with no front-end visuals ("PE") falls back to no flag and no accent, without an error', () => {
    expect(countryVisuals('PE')).toEqual({ flag: null, accent: null });
    expect(countryVisuals('pe')).toEqual({ flag: null, accent: null });
  });

  it('US-04-AC-03 an empty or unknown code falls back the same way', () => {
    expect(countryVisuals('')).toEqual({ flag: null, accent: null });
    expect(countryVisuals('XX')).toEqual({ flag: null, accent: null });
    expect(countryVisuals('COL')).toEqual({ flag: null, accent: null });
  });

  it('US-04-AC-03 the accent is a key into the token file, never a colour', () => {
    for (const code of ['CO', 'CL']) expect(countryVisuals(code).accent).toMatch(/^[a-z]{2}$/);
  });
});
