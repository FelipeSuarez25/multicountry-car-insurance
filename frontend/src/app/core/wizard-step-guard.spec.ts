import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { wizardStepGuard } from './wizard-step-guard';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import { ContentServer } from '../../testing/content-server';
import { redirectOf, runInContext, settleGuard, stepSnapshot, stepState } from '../../testing/guards';
import { CL_VALID_RAW, CO_VALID_RAW, WIZARD_STORAGE_KEY, seedStrapiItems, wizardEntry } from '../../testing/seed-fixtures';

/**
 * US-01-AC-19 (ADR-0001): step 2 is reachable only when the wizard state holds step 1 values for
 * the route's country that pass the same pure validators against the configuration loaded in this
 * page load. Otherwise the guard returns a RedirectCommand to /<country>/datos with replaceUrl.
 */
describe('US-01-AC-19 step 2 cannot be reached with an incomplete step 1 (wizardStepGuard)', () => {
  let server: ContentServer;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CLOCK, useValue: fixedClock(SPEC_TODAY) },
      ],
    });
    server = new ContentServer(TestBed.inject(HttpTestingController));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  async function enterStep2(country = 'co') {
    const pending = settleGuard(runInContext(() => wizardStepGuard(stepSnapshot(country), stepState(`/${country}/planes`))));
    await server.drain();
    return pending;
  }

  it('US-01-AC-19 redirects to step 1 of the country when there is no step 1 data, and replaces the blocked address in the history', async () => {
    const result = await enterStep2();
    expect(redirectOf(result)).toEqual({ url: '/co/datos', replaceUrl: true });
  });

  it('US-01-AC-19 redirects when the stored values are invalid (vehicle year 2005)', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', { ...CO_VALID_RAW, vehicleYear: '2005' }));
    expect(redirectOf(await enterStep2())).toEqual({ url: '/co/datos', replaceUrl: true });
  });

  it('US-01-AC-19 redirects when the stored values are incomplete (no city)', async () => {
    const { city: _city, ...withoutCity } = CO_VALID_RAW;
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', withoutCity));
    expect(redirectOf(await enterStep2())).toEqual({ url: '/co/datos', replaceUrl: true });
  });

  it('US-01-AC-19 redirects when the stored values belong to another country', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CL', CL_VALID_RAW));
    expect(redirectOf(await enterStep2('co'))).toEqual({ url: '/co/datos', replaceUrl: true });
  });

  it('US-01-AC-19 allows step 2 when the stored values are valid for the country', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
    expect(await enterStep2()).toBe(true);
  });

  it('US-01-AC-19 / AC-21 allows step 2 after a reload: the stored raw values are what counts, no typed output is needed', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
    // A fresh TestBed injector means a fresh store with no typed output, as after a reload.
    expect(await enterStep2()).toBe(true);
  });

  it('US-01-AC-19 uses the country of the route: valid Chile values open step 2 of Chile', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CL', CL_VALID_RAW));
    expect(await enterStep2('cl')).toBe(true);
  });

  it('US-01-AC-19 validates against the configuration of this page load: a field Strapi now requires blocks step 2', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
    server.fields['CO'] = [
      ...seedStrapiItems('CO'),
      {
        id: 99, documentId: 'fixturedoc0099', key: 'mobilePhone', label: 'Teléfono celular', type: 'text', isRequired: true,
        helpText: null, placeholder: null, errorMessage: 'Ingresa un número de celular válido.', requiredMessage: null,
        sortOrder: 35, options: [], rules: [],
      },
    ];
    expect(redirectOf(await enterStep2())).toEqual({ url: '/co/datos', replaceUrl: true });
  });

  it('US-01-AC-19 asks Strapi for the fields of the route country (the code comes from the content, upper case)', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
    await enterStep2();
    expect(server.requestsOf('form-fields').map((r) => r.countryCode)).toEqual(['CO']);
  });

  it('US-01-AC-19 redirects to step 1 when the configuration cannot be loaded (step 1 shows the load error)', async () => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
    server.fields['CO'] = 'error';
    expect(redirectOf(await enterStep2())).toEqual({ url: '/co/datos', replaceUrl: true });
  });
});
