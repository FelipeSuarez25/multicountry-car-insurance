import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { STRAPI_URL, adminCredentials } from './support/env';
import { pricePattern } from './support/plans';
import {
  CL_ROWS,
  CL_TERMS_TITLE,
  CO_DRAFT_TERMS_TITLE,
  CO_TERMS_TITLE,
  HINT,
  REJECTED,
  SUMMARY_TITLE,
  acceptTerms,
  confirmedHeading,
  expectRows,
  outcome,
  pagar,
  quoteNumberPattern,
  readQuoteNumber,
  reachSummaryInChile,
  reachSummaryInColombia,
  summaryHeading,
} from './support/summary';
import { createTerms, createTermsToken, deleteStaleTerms, deleteTerms, paragraphBody } from './support/terms';
import { deleteStaleTokens, deleteToken, findCountryDocumentId, getAdminSession, type AdminSession, type ScopedToken } from './support/strapi-admin';

/**
 * US-03 for Chile and for content security, against the real stack with the seed (ADR-0002
 * topology). The browser clock is pinned to 2026-11-21 so the prices and the quote number date stay
 * stable. The completed full flow of Colombia is in `us-01-03-full-flow-co.spec.ts`.
 *
 * Covers US-03-AC-01 (CL), AC-02 (CL), AC-04 (rejected payment, then retry), AC-08, AC-14 (second
 * scenario: terms published from the Node process, the token never reaches the browser) and AC-19
 * (the draft and write scenarios: API requests from the Node process, no browser, no valid token).
 */

test.describe('US-03-AC-01 / US-03-AC-02 the Chile summary and its terms', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInChile(page);
  });

  test('US-03-AC-01 the address is "/cl/resumen", the heading "Resumen de tu cotización" has the focus and the title is right', async ({ page }) => {
    await expect(page).toHaveURL(/\/cl\/resumen$/);
    await expect(summaryHeading(page)).toBeFocused();
    await expect(page).toHaveTitle(SUMMARY_TITLE);
  });

  test('US-03-AC-01 under "Tus datos" and "Tu vehículo" I see, in this order: RUT "••.•••.678-5", Nombre completo, Fecha de nacimiento, Ciudad, Patente, Marca, Modelo, Año', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Tus datos' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Tu vehículo' })).toBeVisible();
    await expectRows(page, CL_ROWS);
    // The consent checkbox of step 1 is not a row (US-03-BR-01).
    await expect(page.getByText('Acepto el tratamiento de mis datos personales.')).toHaveCount(0);
  });

  test('US-03-AC-01 under "Plan elegido" I see "Plan Protegido", its short description and "$528.000" with "Precio anual"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Plan elegido' })).toBeVisible();
    await expect(page.getByText('Plan Protegido', { exact: true })).toBeVisible();
    await expect(page.getByText('Daños a terceros y pérdida total de tu auto.')).toBeVisible();
    await expect(page.getByText(pricePattern('$528.000'))).toBeVisible();
    await expect(page.getByText('Precio anual')).toBeVisible();
    for (const other of ['Plan Esencial', 'Plan Premium']) await expect(page.getByText(other)).toHaveCount(0);
  });

  test('US-03-AC-05 the full RUT never reaches the page: the DOM and the address hold only the masked form', async ({ page }) => {
    const html = await page.content();
    for (const hidden of ['12.345.678', '12345678', '12.345']) expect(html, hidden).not.toContain(hidden);
    expect(page.url()).not.toContain('12345678');
    await expect(page.getByText('Número oculto, termina en 678-5')).toBeAttached();
  });

  test('US-03-AC-02 I see the title "Términos y condiciones del seguro automotriz – Chile" and the heading "Condiciones generales", and not "Condiciones principales" nor the Colombia title', async ({ page }) => {
    await expect(page.getByRole('region', { name: CL_TERMS_TITLE })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Condiciones generales' })).toBeVisible();
    await expect(page.getByText('Condiciones principales')).toHaveCount(0);
    await expect(page.getByText(CO_TERMS_TITLE)).toHaveCount(0);
    await expect(page.getByText('pesos chilenos (CLP)')).toBeVisible();
    await expect(page.getByText('pesos colombianos')).toHaveCount(0);
  });

  test('US-03-AC-13 the Chile conditions are a numbered list of three items, and "ficticio" is bold', async ({ page }) => {
    const region = page.getByRole('region', { name: CL_TERMS_TITLE });
    // An ordered list has no ARIA role of its own that tells it from a bulleted one: the tag is the contract (ADR-0009).
    await expect(region.locator('ol > li')).toHaveCount(3);
    await expect(region.locator('ul')).toHaveCount(0);
    await expect(region.locator('strong')).toHaveText(['ficticio']);
  });

  test('US-03-AC-02 the pay button is disabled until I accept the terms', async ({ page }) => {
    await expect(pagar(page)).toBeDisabled();
    await acceptTerms(page).check();
    await expect(pagar(page)).toBeEnabled();
  });
});

test.describe('US-03-AC-08 "Pagar" follows the terms checkbox (Chile)', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInChile(page);
  });

  test('US-03-AC-08 "Pagar" is disabled and "Acepta los términos y condiciones para pagar." is its accessible description', async ({ page }) => {
    await expect(pagar(page)).toBeDisabled();
    await expect(pagar(page)).toHaveAccessibleDescription(HINT);
    await expect(page.getByText(HINT)).toBeVisible();
    // It stays in the focus order: a keyboard user can reach it and hear why it is disabled.
    await pagar(page).focus();
    await expect(pagar(page)).toBeFocused();
  });

  test('US-03-AC-08 activating the disabled "Pagar" starts no payment attempt and I stay on the summary', async ({ page }) => {
    await pagar(page).click({ force: true });
    await pagar(page).press('Enter');
    await expect(pagar(page)).toHaveText('Pagar');
    await expect(page.getByRole('button', { name: 'Procesando pago…' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/cl\/resumen$/);
    await expect(confirmedHeading(page)).toHaveCount(0);
  });

  test('US-03-AC-08 checking "Acepto los términos y condiciones" enables "Pagar" and hides the hint; unchecking disables it again', async ({ page }) => {
    await acceptTerms(page).check();
    await expect(pagar(page)).toBeEnabled();
    await expect(page.getByText(HINT)).toHaveCount(0);
    await acceptTerms(page).uncheck();
    await expect(pagar(page)).toBeDisabled();
    await expect(page.getByText(HINT)).toBeVisible();
  });
});

test.describe('US-03-AC-04 rejected payment in Chile, then retry', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInChile(page);
    await acceptTerms(page).check();
    await outcome(page, 'Pago rechazado').check();
  });

  test('US-03-AC-04 I see "El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo.", still on "/cl/resumen", with my data, "Plan Protegido" at "$528.000" and the terms accepted; "Pagar" is enabled again', async ({ page }) => {
    await pagar(page).click();
    await expect(page.getByRole('alert').filter({ hasText: REJECTED })).toBeVisible();
    await expect(page).toHaveURL(/\/cl\/resumen$/);
    await expectRows(page, CL_ROWS);
    await expect(page.getByText('Plan Protegido', { exact: true })).toBeVisible();
    await expect(page.getByText(pricePattern('$528.000'))).toBeVisible();
    await expect(acceptTerms(page)).toBeChecked();
    await expect(outcome(page, 'Pago rechazado')).toBeChecked();
    await expect(pagar(page)).toBeEnabled();
    await expect(pagar(page)).toHaveText('Pagar');
    // The focus stays on "Pagar": the rejection is announced by the alert, not by a move of the focus.
    await expect(pagar(page)).toBeFocused();
    await expect(confirmedHeading(page)).toHaveCount(0);
  });

  test('US-03-AC-04 nothing is cleared: the wizard entry still holds the values and the plan', async ({ page }) => {
    await pagar(page).click();
    await expect(page.getByRole('alert').filter({ hasText: REJECTED })).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('quote-wizard') ?? 'null') as { plan?: { key: string }; step1?: { values?: Record<string, unknown> } } | null);
    expect(stored?.plan).toEqual({ key: 'protegido' });
    expect(stored?.step1?.values?.['plate']).toBe('BCDF12');
  });

  test('US-03-AC-04 when the simulated payment succeeds and I click pay, I see the confirmation heading "Pago confirmado" and a quote number COT-CL-20261121-NNNNNN', async ({ page }) => {
    await pagar(page).click();
    await expect(page.getByRole('alert').filter({ hasText: REJECTED })).toBeVisible();

    await outcome(page, 'Pago aprobado').check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: REJECTED })).toHaveCount(0);
    expect(await readQuoteNumber(page, 'CL')).toMatch(quoteNumberPattern('CL'));
    expect(await page.evaluate(() => sessionStorage.getItem('quote-wizard'))).toBeNull();
  });

  test('US-03-AC-04 a reload after the rejection keeps the data and the plan, and resets the terms acceptance', async ({ page }) => {
    await pagar(page).click();
    await expect(page.getByRole('alert').filter({ hasText: REJECTED })).toBeVisible();
    await page.reload();
    await expect(summaryHeading(page)).toBeVisible();
    await expect(page).toHaveURL(/\/cl\/resumen$/);
    await expectRows(page, CL_ROWS);
    await expect(page.getByText(pricePattern('$528.000'))).toBeVisible();
    await expect(acceptTerms(page)).not.toBeChecked();
    await expect(pagar(page)).toBeDisabled();
    await expect(page.getByText(REJECTED)).toHaveCount(0);
  });
});

test.describe('US-03-AC-02 Chile and Colombia do not share terms', () => {
  test('US-03-AC-02 the Colombia summary of the same browser shows the Colombia terms and none of the Chile text', async ({ page }) => {
    await reachSummaryInColombia(page);
    await expect(page.getByRole('region', { name: CO_TERMS_TITLE })).toBeVisible();
    await expect(page.getByText('Condiciones generales')).toHaveCount(0);
    await expect(page.getByText(CL_TERMS_TITLE)).toHaveCount(0);
    await expect(page.getByText('Borrador no publicado')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// US-03-AC-14 (second scenario): terms published from the Node process, no deployment
// ---------------------------------------------------------------------------------------------

test.describe('US-03-AC-14 terms change without deployment', () => {
  const TOKEN_NAME = 'us-03-ac-14-e2e';
  const NEW_TITLE = 'Términos y condiciones de prueba – Chile';
  const NEW_TEXT = 'Texto de prueba publicado.';

  let api: APIRequestContext;
  let session: AdminSession | undefined;
  let token: ScopedToken | undefined;
  let createdDocumentId: string | undefined;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: STRAPI_URL });
  });

  // Teardown deletes the terms (when the test did not), then the token, even when the test failed. Each step is attempted.
  test.afterAll(async () => {
    const failures: string[] = [];
    if (token && createdDocumentId) {
      try {
        await deleteTerms(api, token, createdDocumentId);
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
    expect(failures, 'teardown must delete the terms and the scoped token').toEqual([]);
  });

  test('US-03-AC-14 terms published for Chile titled "Términos y condiciones de prueba – Chile" appear on reload and replace "Condiciones generales"; Colombia still shows its own terms; once deleted, the seed terms are back', async ({ page }) => {
    // Pre-test cleanup of leftovers of a crashed run, then the scoped token for this run.
    const { email, password } = adminCredentials();
    session = await getAdminSession(api, email, password);
    await deleteStaleTokens(api, session, TOKEN_NAME);
    token = await createTermsToken(api, session, TOKEN_NAME);
    await deleteStaleTerms(api, token, NEW_TITLE);

    // Before: the seeded terms of Chile.
    await reachSummaryInChile(page);
    await expect(page.getByRole('heading', { name: 'Condiciones generales' })).toBeVisible();

    // The business team publishes new terms for Chile. The running front end and its configuration are not touched.
    const chile = await findCountryDocumentId(api, 'CL');
    createdDocumentId = await createTerms(api, token, chile, NEW_TITLE, NEW_TEXT);

    // I reload the summary in Chile: the most recently published terms win.
    await page.reload();
    await expect(summaryHeading(page)).toBeVisible();
    await expect(page.getByRole('region', { name: NEW_TITLE })).toBeVisible();
    await expect(page.getByText(NEW_TEXT)).toBeVisible();
    await expect(page.getByText('Condiciones generales')).toHaveCount(0);
    await expect(page.getByText(CL_TERMS_TITLE)).toHaveCount(0);

    // The Colombia summary still shows the Colombia terms.
    await reachSummaryInColombia(page);
    await expect(page.getByRole('region', { name: CO_TERMS_TITLE })).toBeVisible();
    await expect(page.getByText(NEW_TITLE)).toHaveCount(0);
    await expect(page.getByText(NEW_TEXT)).toHaveCount(0);

    // The browser never held a Strapi credential.
    const held = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie }));
    expect(held).not.toContain(token.accessKey);
    expect(held).not.toContain(session.jwt);

    // The terms are withdrawn: on the next reload the seed terms of Chile are back.
    await deleteTerms(api, token, createdDocumentId);
    createdDocumentId = undefined;
    await reachSummaryInChile(page);
    await expect(page.getByRole('region', { name: CL_TERMS_TITLE })).toBeVisible();
    await expect(page.getByText(NEW_TITLE)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// US-03-AC-19 (draft and write scenarios): API requests from the Node process, no browser, no token
// ---------------------------------------------------------------------------------------------

test.describe('US-03-AC-19 anonymous requests never return draft terms, and writes through the proxy are rejected', () => {
  const COLOMBIA_QUERY = { 'filters[country][code][$eq]': 'CO' };
  const DRAFT_QUERY = { ...COLOMBIA_QUERY, status: 'draft' };

  interface TermsBody {
    data?: { title?: string; publishedAt?: string | null }[];
  }
  async function bodyOf(response: APIResponse): Promise<TermsBody> {
    // An unknown path may be answered with the SPA's HTML page, or an error body: no rows, no draft.
    try {
      return (await response.json()) as TermsBody;
    } catch {
      return {};
    }
  }

  /** The caller must never be served a draft: not by its title, not as an unpublished row, not as its text. */
  async function expectNoDraft(response: APIResponse, what: string): Promise<void> {
    const text = await response.text();
    const body = await bodyOf(response);
    const rows = body.data ?? [];
    expect(rows.map((r) => r.title ?? ''), `${what}: draft title`).not.toContain(CO_DRAFT_TERMS_TITLE);
    expect(rows.filter((r) => r.publishedAt === null || r.publishedAt === undefined).length, `${what}: rows with publishedAt null (drafts)`).toBe(0);
    expect(text, `${what}: draft text`).not.toContain('Borrador no publicado');
  }

  test("US-03-AC-19 control: the published Colombia terms are readable anonymously on Strapi's own port and through the proxy", async ({ playwright, request }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const [what, context] of [['strapi', strapi], ['proxy', request]] as const) {
        const response = await context.get('/api/terms', { params: COLOMBIA_QUERY });
        expect(response.status(), what).toBe(200);
        const body = await bodyOf(response);
        expect((body.data ?? []).map((r) => r.title), what).toEqual([CO_TERMS_TITLE]);
        expect((body.data ?? []).every((r) => typeof r.publishedAt === 'string'), what).toBe(true);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test("US-03-AC-19 on Strapi's own port, no Authorization header, /api/terms with status=draft returns no draft", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      await expectNoDraft(await strapi.get('/api/terms', { params: DRAFT_QUERY }), 'no header');
    } finally {
      await strapi.dispose();
    }
  });

  test("US-03-AC-19 on Strapi's own port, no Authorization header, the upper-case path /API/terms with status=draft returns no draft", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      await expectNoDraft(await strapi.get('/API/terms', { params: DRAFT_QUERY }), 'upper-case path');
    } finally {
      await strapi.dispose();
    }
  });

  test("US-03-AC-19 on Strapi's own port, with the header Authorization \"foo\", /api/terms with status=draft returns no draft", async ({ playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      await expectNoDraft(await strapi.get('/api/terms', { params: DRAFT_QUERY, headers: { Authorization: 'foo' } }), 'Authorization foo');
    } finally {
      await strapi.dispose();
    }
  });

  test('US-03-AC-19 through the same-origin proxy at the relative "/api", no Authorization header, /api/terms with status=draft returns no draft', async ({ request }) => {
    await expectNoDraft(await request.get('/api/terms', { params: DRAFT_QUERY }), 'proxy');
  });

  test('US-03-AC-19 the other publication parameters do not reveal the draft either (publicationState, a status that is not published)', async ({ playwright, request }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      for (const extra of [{ publicationState: 'preview' }, { status: 'draft', publicationState: 'preview' }, { status: 'unpublished' }] as Record<string, string>[]) {
        await expectNoDraft(await strapi.get('/api/terms', { params: { ...COLOMBIA_QUERY, ...extra } }), JSON.stringify(extra));
        await expectNoDraft(await request.get('/api/terms', { params: { ...COLOMBIA_QUERY, ...extra } }), `proxy ${JSON.stringify(extra)}`);
      }
    } finally {
      await strapi.dispose();
    }
  });

  test('US-03-AC-19 a POST /api/terms through the same-origin proxy is rejected with 405, and an anonymous read of the Colombia terms returns no entry titled "security-probe"', async ({ request, playwright }) => {
    const strapi = await playwright.request.newContext({ baseURL: STRAPI_URL });
    try {
      const colombia = await findCountryDocumentId(strapi, 'CO');
      const probe = { data: { title: 'security-probe', body: paragraphBody('probe'), country: { connect: [colombia] } } };
      const response = await request.post('/api/terms', { data: probe });
      expect(response.status()).toBe(405);

      for (const [what, context] of [['proxy', request], ['strapi', strapi]] as const) {
        const read = await context.get('/api/terms', { params: COLOMBIA_QUERY });
        expect((await bodyOf(read)).data?.map((r) => r.title) ?? [], what).not.toContain('security-probe');
      }

      // Strapi's own port refuses the anonymous write too: nothing is created, with or without the proxy.
      const direct = await strapi.post('/api/terms', { data: probe });
      expect([401, 403, 404, 405]).toContain(direct.status());
      expect((await bodyOf(await strapi.get('/api/terms', { params: COLOMBIA_QUERY }))).data?.map((r) => r.title) ?? []).not.toContain('security-probe');
    } finally {
      await strapi.dispose();
    }
  });

  test('US-03-AC-19 the proxy answers the other write methods on /api/terms with 405 (404 for an id), and refuses an Authorization header', async ({ request }) => {
    for (const method of ['put', 'patch', 'delete'] as const) {
      const response = await request[method]('/api/terms/anyDocumentId', { data: { data: { title: 'x' } } });
      expect([404, 405], method).toContain(response.status());
    }
    const withHeader = await request.get('/api/terms', { params: COLOMBIA_QUERY, headers: { Authorization: 'Bearer placeholder' } }); // scan-secrets: allow (fictitious placeholder, not a credential)
    expect(withHeader.status()).toBe(400);
  });
});
