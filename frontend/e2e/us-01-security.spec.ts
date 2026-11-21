import { expect, test, type APIRequestContext, type Request } from '@playwright/test';
import { BASE_URL, STRAPI_URL } from './support/env';
import { continuar, field, fillColombia } from './support/form';

/**
 * US-01-AC-27: read-only content access, step 1 data stays in the browser (network inspection).
 * US-01-AC-28: anonymous callers cannot read drafts or write content (ADR-0002 Confirmation).
 *
 * AC-28 runs as API requests from the Playwright Node process: no browser, no token. It is re-run
 * on every Strapi upgrade, because the published-only rule is custom middleware (ADR-0002,
 * "Strongest argument against").
 */

test.describe('US-01-AC-27 read-only content access, data stays in the browser', () => {
  test('US-01-AC-27 from the first page load to step 2 every content request is a GET, none carries a token, none contains what I typed', async ({ page }) => {
    const requests: Request[] = [];
    page.on('request', (request) => requests.push(request));

    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillColombia(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);

    const apiRequests = requests.filter((r) => new URL(r.url()).pathname.startsWith('/api/'));
    expect(apiRequests.length, 'the flow must have read content through /api').toBeGreaterThan(0);

    // Every request to the content backend is a read.
    expect(apiRequests.map((r) => r.method()).filter((m) => m !== 'GET')).toEqual([]);

    // The browser only talks to the front end origin: Strapi's own port is never contacted.
    const strapiOrigin = new URL(STRAPI_URL).origin;
    const frontendOrigin = new URL(BASE_URL).origin;
    expect(requests.map((r) => new URL(r.url()).origin).filter((o) => o === strapiOrigin && o !== frontendOrigin)).toEqual([]);

    // No request of the whole flow carries credentials.
    const carrying: string[] = [];
    for (const request of requests) {
      const headers = await request.allHeaders();
      if ('authorization' in headers) carrying.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
    expect(carrying).toEqual([]);

    // No request, to any address, contains a value entered in step 1 (URL, query or body).
    const entered = ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring', '1990-05-15', 'Medellín'];
    const leaks: string[] = [];
    for (const request of requests) {
      const haystack = [request.url(), decodeURIComponent(request.url()), request.postData() ?? ''].join('\n').toLowerCase();
      for (const value of entered) {
        if (haystack.includes(value.toLowerCase()) || haystack.includes(encodeURIComponent(value).toLowerCase())) {
          leaks.push(`${request.method()} ${new URL(request.url()).pathname} contains a typed value`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});

test.describe('US-01-AC-28 anonymous callers cannot read drafts or write content', () => {
  const DRAFT_QUERY = {
    status: 'draft',
    'filters[key][$eq]': 'email',
    'filters[country][code][$eq]': 'CO',
  };
  const PUBLISHED_QUERY = { 'filters[country][code][$eq]': 'CO' };
  const EXTRA_PUBLICATION_PARAMS: Record<string, string>[] = [
    { publicationFilter: 'never-published' },
    { hasPublishedVersion: 'false' },
    { publicationState: 'preview' },
  ];

  async function bodyKeys(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<string[]> {
    if (!response.ok()) return [];
    const body = (await response.json()) as { data?: { key?: string }[] };
    return (body.data ?? []).map((item) => item.key ?? '');
  }

  async function expectNoDraftEmail(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<void> {
    // Whatever the status (an empty list, or a refusal), the draft must not be in the response.
    expect(response.status(), 'the request must not crash the server').toBeLessThan(500);
    expect(await bodyKeys(response)).not.toContain('email');
    expect(await response.text()).not.toContain('Correo electrónico');
  }

  test("US-01-AC-28 a draft request with status=draft on Strapi's own port returns no \"email\" field", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      // Control: the same anonymous caller does get the published fields, so an empty answer is meaningful.
      const published = await strapi.get('/api/form-fields', { params: PUBLISHED_QUERY });
      expect(published.ok()).toBe(true);
      expect(await bodyKeys(published)).toContain('plate');

      await expectNoDraftEmail(await strapi.get('/api/form-fields', { params: DRAFT_QUERY }));
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 a draft request with status=draft through the same-origin proxy returns no "email" field', async ({ request }) => {
    const published = await request.get('/api/form-fields', { params: PUBLISHED_QUERY });
    expect(published.ok()).toBe(true);
    expect(await bodyKeys(published)).toContain('plate');

    await expectNoDraftEmail(await request.get('/api/form-fields', { params: DRAFT_QUERY }));
  });

  test('US-01-AC-28 the other publication parameters do not reveal the draft either', async ({ playwright, request }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const extra of EXTRA_PUBLICATION_PARAMS) {
        await expectNoDraftEmail(await strapi.get('/api/form-fields', { params: { ...DRAFT_QUERY, ...extra } }));
        await expectNoDraftEmail(await request.get('/api/form-fields', { params: { ...DRAFT_QUERY, ...extra } }));
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 POST /api/form-fields through the proxy is rejected with 405 and nothing is created', async ({ request, playwright }) => {
    const response = await request.post('/api/form-fields', {
      data: { data: { key: 'securityProbe', type: 'text', label: 'Prueba', isRequired: false, sortOrder: 999, errorMessage: 'Revisa este campo.' } },
    });
    expect(response.status()).toBe(405);

    // An anonymous read of the Colombia form fields returns no "securityProbe", on both entry points.
    const probe = { 'filters[country][code][$eq]': 'CO', 'filters[key][$eq]': 'securityProbe' };
    const viaProxy = await request.get('/api/form-fields', { params: probe });
    expect(await bodyKeys(viaProxy)).not.toContain('securityProbe');
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      expect(await bodyKeys(await strapi.get('/api/form-fields', { params: probe }))).not.toContain('securityProbe');
      expect(await bodyKeys(await strapi.get('/api/form-fields', { params: PUBLISHED_QUERY }))).not.toContain('securityProbe');
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 the proxy answers other write methods with 405 and rejects an Authorization header', async ({ request }) => {
    for (const method of ['put', 'delete', 'patch'] as const) {
      const response = await request[method]('/api/form-fields/anyDocumentId', { data: { data: { label: 'x' } } });
      expect([404, 405]).toContain(response.status());
    }
    const withToken = await request.get('/api/form-fields', {
      params: PUBLISHED_QUERY,
      headers: { Authorization: 'Bearer not-a-real-token-for-a-negative-test' }, // scan-secrets: allow (fictitious value, negative test for ADR-0002)
    });
    expect(withToken.status()).toBe(400);
  });
});
