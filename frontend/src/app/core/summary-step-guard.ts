import { inject } from '@angular/core';
import { CanActivateFn, GuardResult, RedirectCommand, Router } from '@angular/router';
import { CountryStore } from './country-store';
import { PlanStore } from './plan-store';
import { QuoteStore } from './quote-store';
import { wizardStepGuard } from './wizard-step-guard';

/**
 * Step 3 (`/:country/resumen`) opens only with a valid step 1 (otherwise `/<country>/datos`) and
 * a chosen plan that this page load's response still offers (otherwise `/<country>/planes`).
 * A failed plans request also leads to `/planes`, where the error state offers "Reintentar".
 * Redirects replace the blocked address in the history (ADR-0001 note, US-02-AC-15).
 */
export const summaryStepGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const countries = inject(CountryStore);
  const plans = inject(PlanStore);
  const quote = inject(QuoteStore);

  const step1 = await (wizardStepGuard(route, state) as Promise<GuardResult>);
  if (step1 !== true) return step1;

  const param = (route.paramMap.get('country') ?? route.parent?.paramMap.get('country') ?? '').toLowerCase();
  const toPlans = new RedirectCommand(router.parseUrl(`/${param}/planes`), { replaceUrl: true });
  const chosen = quote.plan();
  const country = countries.find(param);
  if (!chosen || !country) return toPlans;
  try {
    const offered = await plans.load(country.code);
    return offered.some((p) => p.key === chosen.key) ? true : toPlans;
  } catch {
    return toPlans;
  }
};
