import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanApi } from './plan-api';
import { seedPlanItems } from '../../testing/plan-fixtures';
import { strapiListResponse } from '../../testing/seed-fixtures';

/**
 * Spec 7.2: one request per page load, through the relative `/api` proxy, published content only,
 * read-only. `PlanApi.list(countryCode)` returns the parsed, sorted, offered plans (boundary parser).
 *
 * Expected API (`frontend/src/app/core/plan-api.ts`): `@Injectable({ providedIn: 'root' }) class PlanApi
 * { list(countryCode: string): Observable<Plan[]> }`.
 */
describe('US-02 PlanApi (the plans request of spec 7.2)', () => {
  let http: HttpTestingController;
  let api: PlanApi;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(PlanApi);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('US-02-AC-01 asks once for the plans of the country code, by the published country code, active only', () => {
    api.list('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/plans');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('filters[country][code][$eq]')).toBe('CO');
    expect(req.request.params.get('filters[isActive][$eq]')).toBe('true');
    req.flush(strapiListResponse([]));
    http.verify();
  });

  it('US-02-AC-01 selects only the attributes it uses and populates only the label of the coverages and the benefits', () => {
    api.list('CL').subscribe();
    const req = http.expectOne((r) => r.url === '/api/plans');
    const fields = ['key', 'name', 'shortDescription', 'basePrice', 'sortOrder', 'isRecommended', 'isActive'];
    fields.forEach((name, i) => expect(req.request.params.get(`fields[${i}]`), `fields[${i}]`).toBe(name));
    expect(req.request.params.get('populate[coverages][fields][0]')).toBe('label');
    expect(req.request.params.get('populate[benefits][fields][0]')).toBe('label');
    req.flush(strapiListResponse([]));
  });

  it('US-02-AC-01 sorts by sortOrder then key and asks for up to 100 plans', () => {
    api.list('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/plans');
    expect(req.request.params.get('sort[0]')).toBe('sortOrder:asc');
    expect(req.request.params.get('sort[1]')).toBe('key:asc');
    expect(req.request.params.get('pagination[pageSize]')).toBe('100');
    req.flush(strapiListResponse([]));
  });

  it('US-02-AC-19 the request is a GET on the relative /api with no Authorization header and no body', () => {
    api.list('CO').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/plans'));
    expect(req.request.url.startsWith('/api/')).toBe(true);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.body).toBeNull();
    req.flush(strapiListResponse([]));
  });

  it('US-02-AC-19 nothing from the wizard state goes into the request: the only variable part is the country code', () => {
    sessionStorage.setItem('quote-wizard', JSON.stringify({ version: 1, country: 'CO', step1: { values: { fullName: 'Ana Prueba Ficticia', documentNumber: '1012345678' } } }));
    api.list('CO').subscribe();
    const req = http.expectOne((r) => r.url === '/api/plans');
    const sent = decodeURIComponent(req.request.urlWithParams);
    expect(sent).not.toContain('Ana');
    expect(sent).not.toContain('1012345678');
    req.flush(strapiListResponse([]));
    sessionStorage.clear();
  });

  it('US-02-AC-01 emits the parsed plans: offered only, sorted, in the logical shape', async () => {
    const result = new Promise<{ key: string }[]>((resolve) => api.list('CO').subscribe(resolve));
    http.expectOne((r) => r.url === '/api/plans').flush(strapiListResponse(seedPlanItems('CO')));
    expect((await result).map((p) => p.key)).toEqual(['basico', 'clasico', 'total']);
  });

  it('US-02-AC-11 an HTTP error is an error of the observable (the page shows its error state)', async () => {
    const failure = new Promise<unknown>((resolve) => api.list('CO').subscribe({ error: resolve }));
    http.expectOne((r) => r.url === '/api/plans').flush({ error: { status: 500 } }, { status: 500, statusText: 'Internal Server Error' });
    expect(await failure).toBeTruthy();
  });

  it('US-02-AC-11 a request that is not answered fails at 10 seconds, not before (9.999 s is still pending)', async () => {
    vi.useFakeTimers();
    let failed: unknown = null;
    api.list('CO').subscribe({ error: (e: unknown) => (failed = e) });
    http.expectOne((r) => r.url === '/api/plans');
    await vi.advanceTimersByTimeAsync(9_999);
    expect(failed).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(failed).not.toBeNull();
  });
});
