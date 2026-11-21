import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Route } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { supportedCountryGuard } from './supported-country-guard';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import { ContentServer } from '../../testing/content-server';
import { emptyMatchSnapshot, redirectOf, runInContext, segmentsOf, settleGuard } from '../../testing/guards';
import { seedCountryItems, strapiCountryItem } from '../../testing/seed-fixtures';

/**
 * US-01-AC-17 / US-01-BR-07 (ADR-0001): `canMatch` of `/:country`. The supported countries are the
 * published `country` entries loaded from Strapi once per page load; no code is hard-coded.
 */
describe('US-01-AC-17 supportedCountryGuard (country resolution)', () => {
  let server: ContentServer;
  let warn: ReturnType<typeof vi.spyOn>;
  const route: Route = { path: ':country' };

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
    server = new ContentServer(TestBed.inject(HttpTestingController));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function match(...paths: string[]) {
    const pending = settleGuard(runInContext(() => supportedCountryGuard(route, segmentsOf(...paths), emptyMatchSnapshot())));
    await server.drain();
    return pending;
  }

  it('US-01-AC-17 matches a code that is in the published list', async () => {
    expect(await match('co', 'datos')).toBe(true);
    expect(await match('cl', 'datos')).toBe(true);
  });

  it('US-01-AC-17 does not match a code that is not in the list ("ar"): the unknown-country page takes over', async () => {
    expect(await match('ar', 'datos')).toBe(false);
  });

  it('US-01-AC-17 an unknown code requests no form field', async () => {
    await match('ar', 'datos');
    expect(server.requestsOf('form-fields')).toEqual([]);
  });

  it('US-01-AC-17 normalises the case: "CO" redirects to the canonical lower-case address with replaceUrl', async () => {
    expect(redirectOf(await match('CO', 'datos'))).toEqual({ url: '/co/datos', replaceUrl: true });
    expect(redirectOf(await match('Cl', 'planes'))).toEqual({ url: '/cl/planes', replaceUrl: true });
  });

  it('US-01-AC-17 the list is the content, not code: a published country "PE" matches and "CO" stops matching when it is unpublished', async () => {
    server.countries = [strapiCountryItem('PE', 'Perú', 'PEN', 'es-PE', 10, 0), strapiCountryItem('CL', 'Chile', 'CLP', 'es-CL', 20, 1)];
    expect(await match('pe', 'datos')).toBe(true);
    expect(await match('co', 'datos')).toBe(false);
  });

  it('US-01-AC-17 loads the list once per page load, whatever the number of navigations', async () => {
    await match('co', 'datos');
    await match('cl', 'datos');
    await match('ar', 'datos');
    expect(server.requestsOf('countries')).toHaveLength(1);
  });

  it('US-01-AC-17 reads the list sorted by sortOrder, with GET only and no Authorization header', async () => {
    await match('co', 'datos');
    const [request] = server.requestsOf('countries');
    expect(request.method).toBe('GET');
    expect(request.url).toContain('sort=sortOrder:asc');
    expect(request.hasAuthorization).toBe(false);
  });

  it('US-01-AC-17 does not claim the country is unsupported when the list could not be loaded: it does not match, and the page shows the load error', async () => {
    server.countries = 'error';
    expect(await match('co', 'datos')).toBe(false);
    expect(server.requestsOf('form-fields')).toEqual([]);
  });

  it('US-01-AC-17 a list that does not answer within 10 seconds counts as not loaded', async () => {
    vi.useFakeTimers();
    server.countries = 'hang';
    let settled = false;
    const pending = settleGuard(runInContext(() => supportedCountryGuard(route, segmentsOf('co', 'datos'), emptyMatchSnapshot()))).then((r) => {
      settled = true;
      return r;
    });
    await server.drain();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe(false);
  });

  it('US-01-AC-17 drops invalid country entries at the boundary and warns: code, name and currency are validated', async () => {
    server.countries = [
      ...seedCountryItems(),
      strapiCountryItem('ARG', 'Argentina', 'ARS', 'es-AR', 30, 2), // code is not alpha-2
      strapiCountryItem('br', 'Brasil', 'BRL', 'pt-BR', 40, 3), // lower-case code
      strapiCountryItem('MX', '', 'MXN', 'es-MX', 50, 4), // empty name
      strapiCountryItem('UY', 'Uruguay', 'UY', 'es-UY', 60, 5), // currency is not ISO 4217 alpha-3
    ];
    expect(await match('co', 'datos')).toBe(true);
    expect(await match('arg', 'datos')).toBe(false);
    expect(await match('br', 'datos')).toBe(false);
    expect(await match('mx', 'datos')).toBe(false);
    expect(await match('uy', 'datos')).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
