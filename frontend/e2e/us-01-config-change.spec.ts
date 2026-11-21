import { expect, test, type APIRequestContext, type Request } from '@playwright/test';
import { STRAPI_URL, adminCredentials } from './support/env';
import { CL_LABELS, CO_LABELS, field, visibleLabels } from './support/form';
import {
  createField,
  createScopedToken,
  deleteField,
  deleteToken,
  findCountryDocumentId,
  loginAdmin,
  type AdminSession,
  type ScopedToken,
} from './support/strapi-admin';

/**
 * US-01-AC-03: a field published in Strapi appears on the next reload with no code change and no
 * deployment. The content is written from the Node test process following the ADR-0002 write flow;
 * the credentials never reach the browser context.
 */

test.describe.configure({ mode: 'serial' });

test.describe('US-01-AC-03 configuration change without deployment', () => {
  let api: APIRequestContext;
  let session: AdminSession | undefined;
  let token: ScopedToken | undefined;
  let createdDocumentId: string | undefined;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({ baseURL: STRAPI_URL });
  });

  // Teardown deletes the field, then the token, even when the test failed. Each step is attempted.
  test.afterAll(async () => {
    const failures: string[] = [];
    if (token && createdDocumentId) {
      try {
        await deleteField(api, token, createdDocumentId);
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
    expect(failures, 'teardown must delete the field and the scoped token').toEqual([]);
  });

  test('US-01-AC-03 a new published field for Colombia appears between "Nombre completo" and "Fecha de nacimiento" on reload, and not in Chile', async ({ page }) => {
    const browserRequests: Request[] = [];
    page.on('request', (request) => browserRequests.push(request));

    // Before: the seeded form.
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    expect(await visibleLabels(page)).toEqual(CO_LABELS);

    // The business team adds and publishes the field (key mobilePhone, sortOrder 35, not required).
    const { email, password } = adminCredentials();
    session = await loginAdmin(api, email, password);
    token = await createScopedToken(api, session, 'us-01-ac-03-e2e');
    const countryDocumentId = await findCountryDocumentId(api, 'CO');
    createdDocumentId = await createField(api, token, countryDocumentId, {
      key: 'mobilePhone',
      type: 'text',
      label: 'Teléfono celular',
      isRequired: false,
      sortOrder: 35,
      errorMessage: 'Ingresa un número de celular válido.',
    });

    // The running front end and its configuration are not touched. I reload.
    await page.reload();
    await expect(field(page, 'Teléfono celular')).toBeVisible();
    const labels = await visibleLabels(page);
    expect(labels).toEqual([
      'Tipo de documento',
      'Número de documento',
      'Nombre completo',
      'Teléfono celular',
      'Fecha de nacimiento',
      'Ciudad',
      'Placa',
      'Marca',
      'Línea',
      'Modelo (año)',
      'Autorizo el tratamiento de mis datos personales.',
    ]);

    // It is optional: no required marker semantics, and leaving it empty does not block the form.
    await expect(field(page, 'Teléfono celular')).not.toHaveAttribute('aria-required', 'true');

    // The field does not appear in the context of Chile.
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    expect(await visibleLabels(page)).toEqual(CL_LABELS);
    await expect(page.getByLabel('Teléfono celular')).toHaveCount(0);

    // The browser under test only read: no write method, no Authorization header (ADR-0002).
    expect(browserRequests.length).toBeGreaterThan(0);
    expect(browserRequests.filter((r) => r.method() !== 'GET' && r.method() !== 'HEAD').map((r) => r.method())).toEqual([]);
    const withAuthorization: string[] = [];
    for (const request of browserRequests) {
      if ('authorization' in (await request.allHeaders())) withAuthorization.push(request.method());
    }
    expect(withAuthorization).toEqual([]);
  });

  test('US-01-AC-03 after the teardown the field is gone again on the next reload', async ({ page }) => {
    // Runs after the test above (serial mode). Cleanup is explicit here so that the order is visible;
    // afterAll repeats nothing because a deleted field cannot be deleted twice.
    expect(token && createdDocumentId, 'the previous test must have created the field').toBeTruthy();
    await deleteField(api, token!, createdDocumentId!);
    createdDocumentId = undefined;

    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await expect(page.getByLabel('Teléfono celular')).toHaveCount(0);
    expect(await visibleLabels(page)).toEqual(CO_LABELS);
  });
});
