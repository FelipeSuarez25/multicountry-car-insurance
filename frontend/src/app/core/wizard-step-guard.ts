import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { CountryStore } from './country-store';
import { FormFieldStore } from './form-field-store';
import { QuoteStore } from './quote-store';

/**
 * Step 2 is reachable only when the wizard state holds step 1 values for the route's country that
 * pass the same validators against this page load's configuration (ADR-0001, US-01-AC-19).
 * Otherwise it redirects to step 1, replacing the blocked address in the history.
 */
export const wizardStepGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const countries = inject(CountryStore);
  const fields = inject(FormFieldStore);
  const quote = inject(QuoteStore);

  const param = (route.paramMap.get('country') ?? route.parent?.paramMap.get('country') ?? '').toLowerCase();
  const toStep1 = new RedirectCommand(router.parseUrl(`/${param}/datos`), { replaceUrl: true });

  await countries.ensureLoaded();
  const country = countries.find(param);
  if (!country || quote.country() !== country.code) return toStep1;
  try {
    const configs = await fields.load(country.code);
    return configs.length > 0 && quote.isStep1Valid(configs) ? true : toStep1;
  } catch {
    return toStep1;
  }
};
