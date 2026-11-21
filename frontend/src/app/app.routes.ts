import { Routes } from '@angular/router';
import { supportedCountryGuard } from './core/supported-country-guard';
import { summaryStepGuard } from './core/summary-step-guard';
import { wizardStepGuard } from './core/wizard-step-guard';
import { CountryChooserPage } from './features/country/country-chooser-page';
import { UnknownCountryPage } from './features/country/unknown-country-page';
import { PlanListPage } from './features/plan-list/plan-list-page';
import { SummaryPage } from './features/summary/summary-page';
import { WizardShell } from './features/wizard/wizard-shell';

const APP_TITLE = 'Cotizador de seguro de auto';
const PLANS_TITLE = `Elige tu plan | ${APP_TITLE}`;
const SUMMARY_TITLE = `Resumen de tu cotización | ${APP_TITLE}`;

/** Wizard routes per ADR-0001. Step slugs are Spanish because they are user-visible. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: CountryChooserPage },
  {
    path: ':country',
    canMatch: [supportedCountryGuard],
    // The default title of every wizard page; a step with its own title overrides it.
    title: APP_TITLE,
    // The header, the country chip and the step indicator frame every wizard page (US-04-AC-03, AC-13).
    component: WizardShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'datos' },
      // Step 1 is a lazy chunk, so the select, the calendar and their icons stay out of the initial bundle (ADR-0012 section 7).
      { path: 'datos', loadComponent: () => import('./features/quote-form/quote-form-page').then((m) => m.QuoteFormPage), data: { step: 1 } },
      { path: 'planes', canActivate: [wizardStepGuard], title: PLANS_TITLE, component: PlanListPage, data: { step: 2 } },
      // Step 3: the summary, payment and confirmation share this address (US-03-Q-06).
      { path: 'resumen', canActivate: [summaryStepGuard], title: SUMMARY_TITLE, component: SummaryPage, data: { step: 3 } },
      { path: '**', redirectTo: 'datos' },
    ],
  },
  { path: '**', component: UnknownCountryPage },
];
