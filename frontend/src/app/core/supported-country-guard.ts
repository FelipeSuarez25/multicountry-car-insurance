import { inject } from '@angular/core';
import { CanMatchFn, RedirectCommand, Router } from '@angular/router';
import { CountryStore } from './country-store';

/**
 * `canMatch` of `/:country` (ADR-0001). Matches only a country in the published list; a code in
 * another case redirects to the canonical lower-case address. When the list cannot be loaded it
 * does not match, and the fall-through page shows the load error instead of "not available".
 */
export const supportedCountryGuard: CanMatchFn = async (_route, segments) => {
  const countries = inject(CountryStore);
  const router = inject(Router);
  await countries.ensureLoaded();
  const requested = segments[0]?.path;
  if (requested === undefined || countries.status() !== 'ready') return false;
  const country = countries.find(requested);
  if (!country) return false;
  const canonical = country.code.toLowerCase();
  if (requested === canonical) return true;
  const rest = segments.slice(1).map((s) => s.path);
  return new RedirectCommand(router.parseUrl('/' + [canonical, ...rest].join('/')), { replaceUrl: true });
};
