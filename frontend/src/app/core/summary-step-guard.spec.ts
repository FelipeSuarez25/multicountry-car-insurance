import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { summaryStepGuard } from './summary-step-guard';
import { day, fixedClock } from '../../testing/clock';
import { ContentServer } from '../../testing/content-server';
import { redirectOf, runInContext, settleGuard, stepSnapshot, stepState } from '../../testing/guards';
import { hiddenSeedPlans, seedPlanItems, toStrapiPlanItem, wizardEntryWithPlan } from '../../testing/plan-fixtures';
import { CL_VALID_RAW, CO_VALID_RAW, seedStrapiItems, WIZARD_STORAGE_KEY, wizardEntry } from '../../testing/seed-fixtures';

/**
 * US-02-AC-15 (US-02-Q-03, ADR-0001 implementation note): `/:country/resumen` is registered by US-02
 * with a step 3 guard and no page of its own. The summary opens only if step 1 is valid (else
 * `/<country>/datos`) and the stored plan key is an offered plan of this page load (else
 * `/<country>/planes`); redirects replace the blocked address in the history.
 *
 * Expected API (`frontend/src/app/core/summary-step-guard.ts`): `export const summaryStepGuard: CanActivateFn`.
 */
describe('US-02-AC-15 the summary needs a valid step 1 and a chosen plan (summaryStepGuard)', () => {
  let server: ContentServer;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CLOCK, useValue: fixedClock(day(2026, 11, 21)) },
      ],
    });
    server = new ContentServer(TestBed.inject(HttpTestingController));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  async function openSummary(country = 'co') {
    const pending = settleGuard(runInContext(() => summaryStepGuard(stepSnapshot(country), stepState(`/${country}/resumen`))));
    await server.drain();
    return pending;
  }

  describe('US-02-AC-15 Scenario Outline "The summary needs a valid step 1 and a chosen plan"', () => {
    it('US-02-AC-15 no valid step 1 data -> /co/datos, replacing the blocked address in the history', async () => {
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/datos', replaceUrl: true });
    });

    it('US-02-AC-15 no valid step 1 data and a chosen plan in the entry -> /co/datos (step 1 is checked first)', async () => {
      const invalid = { ...CO_VALID_RAW, vehicleYear: '2005' };
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', invalid, 'total'));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/datos', replaceUrl: true });
    });

    it('US-02-AC-15 valid step 1 data and no chosen plan -> /co/planes, replacing the blocked address', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/planes', replaceUrl: true });
    });

    it('US-02-AC-15 valid step 1 data and the chosen plan "joven" (draft only, so not in the published response) -> /co/planes', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'joven'));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/planes', replaceUrl: true });
    });

    it('US-02-AC-15 valid step 1 data and the chosen plan "total" -> /co/resumen is allowed', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      expect(await openSummary()).toBe(true);
    });
  });

  describe('US-02-AC-15 / US-02-AC-14 the chosen plan must be offered in this page load', () => {
    it('US-02-AC-15 a chosen plan that Strapi now marks inactive ("total-plus") is not offered -> /co/planes', async () => {
      server.plans['CO'] = [...seedPlanItems('CO'), ...hiddenSeedPlans('CO').map((p, i) => toStrapiPlanItem(p, 40 + i))];
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total-plus'));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/planes', replaceUrl: true });
    });

    it('US-02-AC-15 a chosen plan that the business team unpublished since (absent from the response) -> /co/planes', async () => {
      server.plans['CO'] = seedPlanItems('CO').filter((i) => i['key'] !== 'total');
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/planes', replaceUrl: true });
    });

    it('US-02-AC-15 a chosen plan that is malformed now (price 0) is not offered -> /co/planes', async () => {
      server.plans['CO'] = seedPlanItems('CO').map((i) => (i['key'] === 'total' ? { ...i, basePrice: 0 } : i));
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/planes', replaceUrl: true });
    });

    it('US-02-AC-15 the plan is looked up among the plans of the route country: a Colombia key is not offered in Chile', async () => {
      // Chile's step 1 is valid and "clasico" belongs to Colombia only.
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CL', CL_VALID_RAW, 'clasico'));
      expect(redirectOf(await openSummary('cl'))).toEqual({ url: '/cl/planes', replaceUrl: true });
    });

    it('US-02-AC-15 the same guard serves Chile: valid step 1 and the chosen plan "protegido" -> allowed', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CL', CL_VALID_RAW, 'protegido'));
      expect(await openSummary('cl')).toBe(true);
    });
  });

  describe('US-02-AC-15 step 1 is validated against the configuration of this page load', () => {
    it('US-02-AC-15 stored values of another country -> /co/datos', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CL', CL_VALID_RAW, 'protegido'));
      expect(redirectOf(await openSummary('co'))).toEqual({ url: '/co/datos', replaceUrl: true });
    });

    it('US-02-AC-15 a field Strapi now requires blocks the summary -> /co/datos', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      server.fields['CO'] = [
        ...seedStrapiItems('CO'),
        {
          id: 99, documentId: 'fixturedoc0099', key: 'mobilePhone', label: 'Teléfono celular', type: 'text', isRequired: true,
          helpText: null, placeholder: null, errorMessage: 'Ingresa un número de celular válido.', requiredMessage: null,
          sortOrder: 35, options: [], rules: [],
        },
      ];
      expect(redirectOf(await openSummary())).toEqual({ url: '/co/datos', replaceUrl: true });
    });

    it('US-02-AC-15 asks Strapi for the plans of the route country (the code comes from the content, upper case)', async () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntryWithPlan('CO', CO_VALID_RAW, 'total'));
      await openSummary();
      expect(server.requestsOf('plans').map((r) => r.countryCode)).toEqual(['CO']);
    });
  });
});
