import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TermsApi } from './terms-api';
import { strapiListResponse } from '../../testing/seed-fixtures';
import { CL_TERMS_TITLE, CO_TERMS_TITLE, seedTermsItems, simpleTermsItem } from '../../testing/terms-fixtures';

/**
 * US-03 spec 7.2: one terms request per summary entry (and per "Reintentar"), through the relative
 * `/api` proxy, published content only, read-only, with a 10 s timeout.
 *
 *   GET /api/terms?filters[country][code][$eq]=CO&fields[0]=title&fields[1]=body
 *       &fields[2]=publishedAt&sort[0]=publishedAt:desc&pagination[pageSize]=10
 *
 * Expected API (`frontend/src/app/core/terms-api.ts`):
 *   @Injectable({ providedIn: 'root' }) class TermsApi { load(countryCode: string): Observable<Terms | null> }
 * `Terms | null` is what `parseTerms` returns (the most recent well-formed terms, or null).
 */
describe('US-03 TermsApi (the terms request of spec 7.2)', () => {
  let http: HttpTestingController;
  let api: TermsApi;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(TermsApi);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('US-03-AC-02 asks once for the terms of the country code, by the published country code', () => {
    api.load('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/terms');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('filters[country][code][$eq]')).toBe('CO');
    req.flush(strapiListResponse([]));
    http.verify();
  });

  it('US-03-AC-02 the same call for Chile uses "CL"', () => {
    api.load('CL').subscribe();
    const req = http.expectOne((r) => r.url === '/api/terms');
    expect(req.request.params.get('filters[country][code][$eq]')).toBe('CL');
    req.flush(strapiListResponse([]));
  });

  it('US-03-AC-02 selects only title, body and publishedAt (spec 7.2)', () => {
    api.load('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/terms');
    expect(req.request.params.get('fields[0]')).toBe('title');
    expect(req.request.params.get('fields[1]')).toBe('body');
    expect(req.request.params.get('fields[2]')).toBe('publishedAt');
    req.flush(strapiListResponse([]));
  });

  it('US-03-AC-14 sorts by publishedAt descending and asks for up to 10 entries', () => {
    api.load('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/terms');
    expect(req.request.params.get('sort[0]')).toBe('publishedAt:desc');
    expect(req.request.params.get('pagination[pageSize]')).toBe('10');
    req.flush(strapiListResponse([]));
  });

  it('US-03-AC-19 the query has exactly the parameters of spec 7.2: no status=draft, no populate, nothing from the wizard state', () => {
    sessionStorage.setItem('quote-wizard', JSON.stringify({ version: 1, country: 'CO', step1: { values: { fullName: 'Ana Prueba Ficticia', documentNumber: '1012345678' } }, plan: { key: 'total' } }));
    api.load('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/terms');
    expect(req.request.params.keys().sort()).toEqual(
      ['fields[0]', 'fields[1]', 'fields[2]', 'filters[country][code][$eq]', 'pagination[pageSize]', 'sort[0]'].sort(),
    );
    const sent = decodeURIComponent(req.request.urlWithParams);
    for (const leaked of ['Ana', '1012345678', 'total', 'draft', 'populate']) expect(sent).not.toContain(leaked);
    req.flush(strapiListResponse([]));
    sessionStorage.clear();
  });

  it('US-03-AC-19 the request is a GET on the relative /api with no Authorization header and no body', () => {
    api.load('CO').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/terms'));
    expect(req.request.url.startsWith('/api/')).toBe(true);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body).toBeNull();
    req.flush(strapiListResponse([]));
  });

  it('US-03-AC-02 emits the parsed terms of the country: its title and its blocks', async () => {
    const result = new Promise<unknown>((resolve) => api.load('CO').subscribe(resolve));
    http.expectOne((r) => r.url === '/api/terms').flush(strapiListResponse(seedTermsItems('CO')));
    expect(await result).toMatchObject({ title: CO_TERMS_TITLE });
  });

  it('US-03-AC-14 with two published entries it emits the most recently published one', async () => {
    const result = new Promise<unknown>((resolve) => api.load('CL').subscribe(resolve));
    http
      .expectOne((r) => r.url === '/api/terms')
      .flush(
        strapiListResponse([
          simpleTermsItem('Términos y condiciones de prueba – Chile', 'Texto de prueba publicado.', '2026-11-21T12:00:00.000Z', 1),
          ...seedTermsItems('CL'),
        ]),
      );
    expect(await result).toMatchObject({ title: 'Términos y condiciones de prueba – Chile' });
    expect(CL_TERMS_TITLE).not.toBe('Términos y condiciones de prueba – Chile');
  });

  it('US-03-AC-12 with no well-formed terms it emits null (not an error)', async () => {
    const result = new Promise<unknown>((resolve) => api.load('CO').subscribe(resolve));
    http.expectOne((r) => r.url === '/api/terms').flush(strapiListResponse([]));
    expect(await result).toBeNull();
  });

  it('US-03-AC-12 an HTTP error is an error of the observable (the page shows its error state)', async () => {
    const failure = new Promise<unknown>((resolve) => api.load('CO').subscribe({ error: resolve }));
    http.expectOne((r) => r.url === '/api/terms').flush({ error: { status: 500 } }, { status: 500, statusText: 'Internal Server Error' });
    expect(await failure).toBeTruthy();
  });

  it('US-03-AC-12 a response that is not a list is an error of the observable', async () => {
    const failure = new Promise<unknown>((resolve) => api.load('CO').subscribe({ error: resolve }));
    http.expectOne((r) => r.url === '/api/terms').flush({ unexpected: true });
    expect(await failure).toBeTruthy();
  });

  it('US-03-AC-12 a request that is not answered fails at 10 seconds, not before (9.999 s is still pending)', async () => {
    vi.useFakeTimers();
    let failed: unknown = null;
    api.load('CO').subscribe({ error: (e: unknown) => (failed = e) });
    http.expectOne((r) => r.url === '/api/terms');
    await vi.advanceTimersByTimeAsync(9_999);
    expect(failed).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(failed).not.toBeNull();
  });

  it('US-03-AC-12 each call is a new request: "Reintentar" asks again, nothing is cached', () => {
    api.load('CO').subscribe({ error: () => undefined });
    http.expectOne((r) => r.url === '/api/terms').flush({ error: { status: 500 } }, { status: 500, statusText: 'Internal Server Error' });
    api.load('CO').subscribe();
    http.expectOne((r) => r.url === '/api/terms').flush(strapiListResponse(seedTermsItems('CO')));
    http.verify();
  });
});
