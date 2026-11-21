import { Routes } from '@angular/router';
import { supportedCountryGuard } from './core/supported-country-guard';
import { wizardStepGuard } from './core/wizard-step-guard';
import { CountryChooserPage } from './features/country/country-chooser-page';
import { UnknownCountryPage } from './features/country/unknown-country-page';
import { QuoteFormPage } from './features/quote-form/quote-form-page';

/** Wizard routes per ADR-0001. Step slugs are Spanish because they are user-visible. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: CountryChooserPage },
  {
    path: ':country',
    canMatch: [supportedCountryGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'datos' },
      { path: 'datos', component: QuoteFormPage },
      // US-02 attaches its page here without changing the address or the guard (US-01-Q-27).
      { path: 'planes', canActivate: [wizardStepGuard], children: [] },
      { path: '**', redirectTo: 'datos' },
    ],
  },
  { path: '**', component: UnknownCountryPage },
];
