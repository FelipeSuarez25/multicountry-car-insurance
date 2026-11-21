import { expect, test, type APIRequestContext, type Request } from '@playwright/test';
import { STRAPI_URL, adminCredentials } from './support/env';
import { continuar, field, fillColombia } from './support/form';
import {
  CL_HIDDEN_NAMES,
  CL_PLAN_NAMES,
  CL_PRICES,
  CO_PLAN_NAMES,
  createPlan,
  createPlanToken,
  deletePlan,
  deleteStalePlans,
  expectPlanNames,
  expectPrices,
  plan,
  plans,
  pricePattern,
  reachPlansInChile,
} from './support/plans';
import {
  deleteStaleTokens,
  deleteToken,
  findCountryDocumentId,
  getAdminSession,
  type AdminSession,
  type ScopedToken,
} from './support/strapi-admin';

/**
 * US-02 for Chile and for content changes, against the real stack with the seed (ADR-0002
 * topology). Today of the browser is pinned to 2026-11-21 so the prices stay stable.
 *
 * Covers US-02-AC-01 (CL), AC-02, AC-06 (CL rendering), AC-07 (CL), AC-08 (seeded rows), AC-12
 * (a plan published from the Node process; the token never reaches the browser) and AC-19 (the
 * draft and write scenarios, API requests from the Node process, no browser, no valid token).
 */

test.describe('US-02-AC-01 / US-02-AC-02 / US-02-AC-07 plans of Chile', () => {
  test.beforeEach(async ({ page }) => {
    await reachPlansInChile(page);
  });

  test('US-02-AC-01 in Chile I see exactly "Plan Esencial", "Plan Protegido", "Plan Premium", in this order', async ({ page }) => {
    await expectPlanNames(page, CL_PLAN_NAMES);
  });

  test('US-02-AC-01 / US-02-AC-08 I do not see "Plan Flex" (draft only), "Plan Premium Plus" (inactive) or any Colombia plan', async ({ page }) => {
    await expectPlanNames(page, CL_PLAN_NAMES);
    for (const hidden of [...CL_HIDDEN_NAMES, ...CO_PLAN_NAMES, 'Plan Joven', 'Plan Total Plus']) {
      await expect(page.getByText(hidden)).toHaveCount(0);
    }
  });

  test('US-02-AC-01 each plan of Chile shows its description, "Precio anual", "Coberturas" and "Beneficios"', async ({ page }) => {
    await expect(page.getByText('Cubre los daños que causes a terceros.')).toBeVisible();
    await expect(page.getByText('Daños a terceros y pérdida total de tu auto.')).toBeVisible();
    await expect(page.getByText('Cobertura completa con deducible bajo.')).toBeVisible();
    await expect(page.getByText('Precio anual')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Coberturas' })).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Beneficios' })).toHaveCount(3);
    await expect(page.getByText('Robo, hurto o uso no autorizado')).toBeVisible();
  });

  test('US-02-AC-02 "Plan Protegido" shows "Recomendado" and a distinct style, no other plan shows it, and it stays second', async ({ page }) => {
    await expect(plan(page, 'Plan Protegido')).toHaveAccessibleDescription(/Recomendado/);
    await expect(plan(page, 'Plan Esencial')).not.toHaveAccessibleDescription(/Recomendado/);
    await expect(plan(page, 'Plan Premium')).not.toHaveAccessibleDescription(/Recomendado/);
    await expect(plans(page).nth(1)).toHaveAccessibleName('Plan Protegido');
    await expect(page.getByText('Recomendado').first()).toBeVisible();
  });

  test('US-02-AC-07 the plans of Chile show "Plan Esencial" $319.000, "Plan Protegido" $528.000, "Plan Premium" $792.000', async ({ page }) => {
    await expectPrices(page, CL_PLAN_NAMES, CL_PRICES);
  });

  test('US-02-AC-06 a price of Chile is "$528.000": a point between groups of three digits, no decimals, no ISO code', async ({ page }) => {
    for (const price of CL_PRICES) await expect(page.getByText(pricePattern(price)).first()).toBeVisible();
    await expect(page.getByText(/CLP/)).toHaveCount(0);
    await expect(page.getByText(/\$\s*\d[\d.]*,\d/)).toHaveCount(0);
  });

  test('US-02-AC-05 in Chile no plan is chosen on arrival, not even the recommended "Plan Protegido"', async ({ page }) => {
    for (const name of CL_PLAN_NAMES) await expect(plan(page, name)).not.toBeChecked();
  });
});

test.describe('US-02-AC-08 / US-02-BR-02 which plans are visible: the seeded rows, read as the front end reads them', () => {
  type Row = { key?: string; isActive?: boolean; publishedAt?: string | null };

  async function offered(request: APIRequestContext, code: string): Promise<string[]> {
    const response = await request.get('/api/plans', {
      params: {
        'filters[country][code][$eq]': code,
        'filters[isActive][$eq]': 'true',
        'sort[0]': 'sortOrder:asc',
        'sort[1]': 'key:asc',
        'pagination[pageSize]': '100',
      },
    });
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data?: Row[] };
    return (body.data ?? []).map((r) => r.key ?? '');
  }

  test('US-02-AC-08 through the proxy, Colombia has exactly "basico", "clasico", "total" offered: "joven" (draft only) and "total-plus" (inactive) are not', async ({ request }) => {
    expect(await offered(request, 'CO')).toEqual(['basico', 'clasico', 'total']);
  });

  test('US-02-AC-08 through the proxy, Chile has exactly "esencial", "protegido", "premium" offered: "flex" (draft only) and "premium-plus" (inactive) are not', async ({ request }) => {
    expect(await offered(request, 'CL')).toEqual(['esencial', 'protegido', 'premium']);
  });

  test('US-02-AC-08 the plans of one country are never returned for the other', async ({ request }) => {
    const co = await offered(request, 'CO');
    const cl = await offered(request, 'CL');
    expect(co.filter((key) => cl.includes(key))).toEqual([]);
  });
});

test.describe('US-02-AC-12 / US-02-BR-06 plan change without deployment', () => {
  const TOKEN_NAME = 'us-02-ac-12-e2e';
  const KEY = 'auto-nuevo';

  test.describe.configure({ mode: 'serial' });

  let api: APIRequestContext;
  let session: AdminSession | undefined;
  let token: ScopedToken | undefined;
  let createdDocumentId: string | undefined;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: STRAPI_URL });
  });

  // Teardown deletes the plan, then the token, even when the test failed. Each step is attempted.
  test.afterAll(async () => {
    const failures: string[] = [];
    if (token && createdDocumentId) {
      try {
        await deletePlan(api, token, createdDocumentId);
      } catch (error) {
        failures.push(String(error));
      }
    }
    if (session && token) {
      try {
        await deleteToken(api, session, token.id);
      } catch (error) {
        failures.push(String(error));
      }
    }
    await api.dispose();
    expect(failures, 'teardown must delete the plan and the scoped token').toEqual([]);
  });

  test('US-02-AC-12 a plan published for Chile appears between "Plan Esencial" and "Plan Protegido" with "$440.000" on reload, and not in Colombia', async ({ page }) => {
    const browserRequests: Request[] = [];
    page.on('request', (request) => browserRequests.push(request));

    // Pre-test cleanup of leftovers of a crashed run, then the scoped token for this run.
    const { email, password } = adminCredentials();
    session = await getAdminSession(api, email, password);
    await deleteStaleTokens(api, session, TOKEN_NAME);
    token = await createPlanToken(api, session, TOKEN_NAME);
    await deleteStalePlans(api, token, KEY);

    // Before: the seeded plans of Chile.
    await reachPlansInChile(page);
    await expectPlanNames(page, CL_PLAN_NAMES);

    // The business team adds and publishes the plan (sortOrder 15, base price 400000).
    const chile = await findCountryDocumentId(api, 'CL');
    createdDocumentId = await createPlan(api, token, chile, {
      key: KEY,
      name: 'Plan Auto Nuevo',
      shortDescription: 'Para autos de hasta 2 años.',
      basePrice: 400000,
      sortOrder: 15,
      isActive: true,
      isRecommended: false,
      coverages: ['Pérdida total por daño'],
    });

    // The running front end and its configuration are not touched. I reload.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu plan' })).toBeVisible();
    await expectPlanNames(page, ['Plan Esencial', 'Plan Auto Nuevo', 'Plan Protegido', 'Plan Premium']);
    await expect(plan(page, 'Plan Auto Nuevo')).toHaveAccessibleDescription(pricePattern('$440.000'));
    await expect(page.getByText('Pérdida total por daño').first()).toBeVisible();

    // It does not appear in the plans step of Colombia.
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillColombia(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expectPlanNames(page, CO_PLAN_NAMES);
    await expect(page.getByText('Plan Auto Nuevo')).toHaveCount(0);

    // The browser under test only read: no write method, no Authorization header (ADR-0002, ADR-0005).
    expect(browserRequests.length).toBeGreaterThan(0);
    expect(browserRequests.filter((r) => r.method() !== 'GET' && r.method() !== 'HEAD').map((r) => r.method())).toEqual([]);
    const withAuthorization: string[] = [];
    for (const request of browserRequests) {
      if ('authorization' in (await request.allHeaders())) withAuthorization.push(request.method());
    }
    expect(withAuthorization).toEqual([]);
  });

  test('US-02-AC-12 after the teardown the plan is gone again on the next reload', async ({ page }) => {
    // Runs after the test above (serial mode). Cleanup is explicit here so that the order is visible;
    // afterAll repeats nothing because a deleted plan cannot be deleted twice.
    expect(token && createdDocumentId, 'the previous test must have created the plan').toBeTruthy();
    await deletePlan(api, token!, createdDocumentId!);
    createdDocumentId = undefined;

    await reachPlansInChile(page);
    await expectPlanNames(page, CL_PLAN_NAMES);
    await expect(page.getByText('Plan Auto Nuevo')).toHaveCount(0);
  });
});

test.describe('US-02-AC-19 anonymous callers cannot read draft plans or write plans (Node process, no browser, no valid token)', () => {
  const DRAFT_QUERY = { status: 'draft', 'filters[key][$eq]': 'joven' };
  const PUBLISHED_QUERY = { 'filters[country][code][$eq]': 'CO' };

  type ApiResponse = Awaited<ReturnType<APIRequestContext['get']>>;
  type Row = { key?: string; publishedAt?: string | null };

  async function rows(response: ApiResponse): Promise<Row[]> {
    // The proxy answers an unknown (upper-case) path with the SPA's HTML page: no rows, no draft.
    if (!response.ok() || !(response.headers()['content-type'] ?? '').includes('json')) return [];
    const body = (await response.json()) as { data?: Row[] };
    return body.data ?? [];
  }

  /** The caller must never be served the draft-only plan "joven", nor an unpublished row. */
  async function expectNoDraftPlan(response: ApiResponse, what: string): Promise<void> {
    expect(response.status(), `${what}: the request must not crash the server`).toBeLessThan(500);
    const found = await rows(response);
    expect(found.map((r) => r.key ?? ''), `${what}: draft plan "joven"`).not.toContain('joven');
    expect(found.filter((r) => typeof r.publishedAt !== 'string').length, `${what}: rows with publishedAt null (drafts)`).toBe(0);
    expect(await response.text(), `${what}: draft plan name`).not.toContain('Plan Joven');
  }

  test("US-02-AC-19 on Strapi's own port, with no Authorization header, status=draft returns no \"joven\" and every row is published", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      // Control: the same anonymous caller does get the published plans, so an empty answer is meaningful.
      const published = await strapi.get('/api/plans', { params: PUBLISHED_QUERY });
      expect(published.ok()).toBe(true);
      expect((await rows(published)).map((r) => r.key)).toContain('basico');

      await expectNoDraftPlan(await strapi.get('/api/plans', { params: DRAFT_QUERY }), '/api/plans');
    } finally {
      await strapi.dispose();
    }
  });

  test("US-02-AC-19 on Strapi's own port the upper-case path \"/API/plans\" returns no \"joven\" and no draft row", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      await expectNoDraftPlan(await strapi.get('/API/plans', { params: DRAFT_QUERY }), '/API/plans');
    } finally {
      await strapi.dispose();
    }
  });

  test("US-02-AC-19 on Strapi's own port the header Authorization \"foo\" does not reveal the draft \"joven\"", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      await expectNoDraftPlan(
        await strapi.get('/api/plans', {
          params: DRAFT_QUERY,
          headers: { Authorization: 'foo' }, // scan-secrets: allow (fictitious value, negative test for ADR-0002)
        }),
        'Authorization "foo"',
      );
    } finally {
      await strapi.dispose();
    }
  });

  test('US-02-AC-19 through the same-origin proxy at the relative "/api", status=draft returns no "joven" and every row is published', async ({ request }) => {
    const published = await request.get('/api/plans', { params: PUBLISHED_QUERY });
    expect(published.ok()).toBe(true);
    expect((await rows(published)).map((r) => r.key)).toContain('basico');

    await expectNoDraftPlan(await request.get('/api/plans', { params: DRAFT_QUERY }), 'proxy /api/plans');
  });

  test('US-02-AC-19 the other publication parameters do not reveal the draft plan either (Strapi port and proxy)', async ({ playwright, request }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      const extras: Record<string, string>[] = [{ publicationFilter: 'never-published' }, { hasPublishedVersion: 'false' }, { publicationState: 'preview' }];
      for (const extra of extras) {
        await expectNoDraftPlan(await strapi.get('/api/plans', { params: { ...DRAFT_QUERY, ...extra } }), `Strapi ${JSON.stringify(extra)}`);
        await expectNoDraftPlan(await request.get('/api/plans', { params: { ...DRAFT_QUERY, ...extra } }), `proxy ${JSON.stringify(extra)}`);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-02-AC-19 POST /api/plans through the same-origin proxy is rejected with 405 and nothing is created', async ({ request, playwright }) => {
    const response = await request.post('/api/plans', {
      data: {
        data: {
          key: 'security-probe',
          name: 'Plan Prueba',
          shortDescription: 'Prueba de seguridad.',
          basePrice: 1000,
          sortOrder: 999,
          isActive: true,
          isRecommended: false,
          coverages: [{ label: 'Cobertura de prueba' }],
        },
      },
    });
    expect(response.status()).toBe(405);

    // An anonymous read of the Colombia plans returns no "security-probe", on both entry points.
    const probe = { 'filters[country][code][$eq]': 'CO', 'filters[key][$eq]': 'security-probe' };
    expect((await rows(await request.get('/api/plans', { params: probe }))).map((r) => r.key)).not.toContain('security-probe');
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      expect((await rows(await strapi.get('/api/plans', { params: probe }))).map((r) => r.key)).not.toContain('security-probe');
      expect((await rows(await strapi.get('/api/plans', { params: PUBLISHED_QUERY }))).map((r) => r.key)).not.toContain('security-probe');
    } finally {
      await strapi.dispose();
    }
  });

  test('US-02-AC-19 the proxy answers the other write methods on plans with 405 (or 404) and creates nothing', async ({ request }) => {
    for (const method of ['put', 'delete', 'patch'] as const) {
      const response = await request[method]('/api/plans/anyDocumentId', { data: { data: { name: 'x' } } });
      expect([404, 405]).toContain(response.status());
    }
  });
});
