import { expect, test, type APIRequestContext, type Request } from '@playwright/test';
import { BASE_URL, STRAPI_URL, adminCredentials } from './support/env';
import { createScopedToken, deleteStaleTokens, deleteToken, getAdminSession } from './support/strapi-admin';
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

  // F02 of review R1: the published-only rule must not depend on how the caller spells the request.
  // Fictitious header values: none of them is a credential.
  const NON_BEARER_HEADERS: Record<string, string>[] = [
    { Authorization: 'foo' }, // scan-secrets: allow (fictitious value, negative test for ADR-0002)
    { Authorization: 'Basic Zm9vOmJhcg==' }, // scan-secrets: allow (fictitious value "foo:bar", negative test for ADR-0002)
    { Authorization: 'Bearer' }, // scan-secrets: allow (scheme without a token, negative test for ADR-0002)
    { authorization: 'x' }, // scan-secrets: allow (fictitious value, negative test for ADR-0002)
  ];
  const PATH_PREFIXES = ['/api', '/API', '/Api'];

  type ApiResponse = Awaited<ReturnType<APIRequestContext['get']>>;

  async function items(response: ApiResponse): Promise<{ key?: string; publishedAt?: string | null }[]> {
    // The proxy answers an unknown (upper-case) path with the SPA's HTML page: no rows, no draft.
    if (!response.ok() || !(response.headers()['content-type'] ?? '').includes('json')) return [];
    const body = (await response.json()) as { data?: { key?: string; publishedAt?: string | null }[] };
    return body.data ?? [];
  }

  /** The caller must never be served a draft: not as the email field, not as an unpublished row. */
  async function expectNoDraft(response: ApiResponse, what: string): Promise<void> {
    expect(response.status(), `${what}: the request must not crash the server`).toBeLessThan(500);
    const rows = await items(response);
    expect(rows.map((r) => r.key ?? ''), `${what}: draft email field`).not.toContain('email');
    expect(rows.filter((r) => r.publishedAt === null).length, `${what}: rows with publishedAt null (drafts)`).toBe(0);
    expect(await response.text(), `${what}: draft label`).not.toContain('Correo electrónico');
  }

  test('US-01-AC-28 on Strapi\'s own port a non-Bearer Authorization value does not reveal the draft "email" field', async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const headers of NON_BEARER_HEADERS) {
        const name = `Authorization "${Object.values(headers)[0]}"`;
        await expectNoDraft(await strapi.get('/api/form-fields', { params: DRAFT_QUERY, headers }), name);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 on Strapi\'s own port a non-lower-case path does not reveal the draft "email" field, with or without a header', async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const prefix of PATH_PREFIXES) {
        await expectNoDraft(await strapi.get(`${prefix}/form-fields`, { params: DRAFT_QUERY }), `${prefix} no header`);
      }
      for (const prefix of PATH_PREFIXES) {
        for (const headers of NON_BEARER_HEADERS) {
          await expectNoDraft(
            await strapi.get(`${prefix}/form-fields`, { params: DRAFT_QUERY, headers }),
            `${prefix} Authorization "${Object.values(headers)[0]}"`,
          );
        }
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 on Strapi\'s own port the other publication parameters stay closed for the header and path variants', async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const extra of EXTRA_PUBLICATION_PARAMS) {
        const params = { 'filters[key][$eq]': 'email', 'filters[country][code][$eq]': 'CO', ...extra };
        await expectNoDraft(await strapi.get('/api/form-fields', { params, headers: NON_BEARER_HEADERS[0] }), `${JSON.stringify(extra)} header`);
        await expectNoDraft(await strapi.get('/API/form-fields', { params }), `${JSON.stringify(extra)} upper-case path`);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 on Strapi\'s own port status=draft on countries returns only published rows, for every header and path variant', async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      // Control: the published list is readable and non-empty, so "only published" is meaningful.
      const published = await strapi.get('/api/countries');
      expect(published.ok()).toBe(true);
      expect((await items(published)).length).toBeGreaterThan(0);

      await expectNoDraft(await strapi.get('/api/countries', { params: { status: 'draft' } }), 'plain');
      for (const headers of NON_BEARER_HEADERS) {
        await expectNoDraft(
          await strapi.get('/api/countries', { params: { status: 'draft' }, headers }),
          `Authorization "${Object.values(headers)[0]}"`,
        );
      }
      for (const prefix of ['/API', '/Api']) {
        await expectNoDraft(await strapi.get(`${prefix}/countries`, { params: { status: 'draft' } }), `${prefix} no header`);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-01-AC-28 through the proxy the upper-case path and the non-Bearer Authorization variants reveal no draft', async ({ request }) => {
    for (const prefix of PATH_PREFIXES) {
      await expectNoDraft(await request.get(`${prefix}/form-fields`, { params: DRAFT_QUERY }), `proxy ${prefix}`);
      await expectNoDraft(await request.get(`${prefix}/countries`, { params: { status: 'draft' } }), `proxy ${prefix} countries`);
    }
    for (const headers of NON_BEARER_HEADERS) {
      await expectNoDraft(await request.get('/api/form-fields', { params: DRAFT_QUERY, headers }), `proxy Authorization "${Object.values(headers)[0]}"`);
    }
  });

  test('US-01-AC-28 a request with a valid scoped token is still allowed what ADR-0005 permits (country find), and an invalid Bearer is refused', async ({ playwright }) => {
    // Guards against fixing F01 by refusing every Authorization header. Only the permitted read is
    // asserted: what the token may see with status=draft is deliberately not constrained here.
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    const { email, password } = adminCredentials();
    const tokenName = 'US-01-AC-28 e2e token';
    const session = await getAdminSession(strapi, email, password);
    await deleteStaleTokens(strapi, session, tokenName);
    const token = await createScopedToken(strapi, session, tokenName);
    try {
      const allowed = await strapi.get('/api/countries', { headers: { Authorization: `Bearer ${token.accessKey}` } });
      expect(allowed.status()).toBe(200);
      expect((await items(allowed)).length).toBeGreaterThan(0);

      const invalid = await strapi.get('/api/form-fields', {
        params: DRAFT_QUERY,
        headers: { Authorization: 'Bearer not-a-real-token-for-a-negative-test' }, // scan-secrets: allow (fictitious value, negative test for ADR-0002)
      });
      expect(invalid.status()).toBe(401);
    } finally {
      await deleteToken(strapi, session, token.id);
      await strapi.dispose();
    }
  });
});
