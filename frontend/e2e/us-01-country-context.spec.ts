import { expect, test, type Page } from '@playwright/test';
import { CL_LABELS, expectPrompt, field, fillField, storedValues, visibleLabels } from './support/form';

/**
 * The country context against the real stack with the seed (ADR-0001, ADR-0003).
 * Covers US-01-AC-01 (Chile), AC-17 (both scenarios) and AC-22.
 */

const COUNTRIES_ERROR = 'No pudimos cargar la lista de países. Intenta de nuevo.';
const UNSUPPORTED = 'Este país no está disponible.';

/** Collect the content API requests a page makes (to prove what was and was not requested). */
function trackFormFieldRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/form-fields')) urls.push(decodeURIComponent(url.pathname + url.search));
  });
  return urls;
}

test.describe('US-01-AC-01 form configured by country (Chile)', () => {
  test('US-01-AC-01 in the context of Chile I see exactly these field labels, in this order', async ({ page }) => {
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    expect(await visibleLabels(page)).toEqual(CL_LABELS);
  });

  test('US-01-AC-01 I do not see any field that is configured only for Colombia', async ({ page }) => {
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await expect(page.getByLabel('Tipo de documento')).toHaveCount(0);
    await expect(page.getByLabel(/^Placa/)).toHaveCount(0);
    await expect(page.getByLabel('Correo electrónico')).toHaveCount(0);
  });

  test('US-01-AC-01 the address is case-insensitive and goes to the canonical lower-case one', async ({ page }) => {
    await page.goto('/CL/datos');
    await expect(page).toHaveURL(/\/cl\/datos$/);
    await expect(field(page, 'Patente')).toBeVisible();
  });
});

test.describe('US-01-AC-17 unsupported country', () => {
  test('US-01-AC-17 "/ar/datos" says the country is not available, links to Colombia and Chile, and requests no field', async ({ page }) => {
    const formFieldRequests = trackFormFieldRequests(page);
    await page.goto('/ar/datos');

    await expect(page.getByText(UNSUPPORTED)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Colombia' })).toHaveAttribute('href', /\/co\/datos$/);
    await expect(page.getByRole('link', { name: 'Chile' })).toHaveAttribute('href', /\/cl\/datos$/);
    await expect(page.getByLabel(/Nombre completo/)).toHaveCount(0);
    expect(formFieldRequests).toEqual([]);
    await expect(page).toHaveURL(/\/ar\/datos$/); // the address is kept as typed
  });

  test('US-01-AC-17 the link to Colombia opens step 1 in the Colombian context', async ({ page }) => {
    await page.goto('/ar/datos');
    await page.getByRole('link', { name: 'Colombia' }).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
  });

  test('US-01-AC-17 the root address is a chooser with links to the published countries', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Colombia' })).toHaveAttribute('href', /\/co\/datos$/);
    await expect(page.getByRole('link', { name: 'Chile' })).toHaveAttribute('href', /\/cl\/datos$/);
    await expect(page.getByText(UNSUPPORTED)).toHaveCount(0);
  });
});

test.describe('US-01-AC-17 the country list cannot be loaded', () => {
  const addresses: { address: string; result: string }[] = [
    { address: '/', result: 'the country chooser with the links "Colombia" and "Chile"' },
    { address: '/ar/datos', result: '"Este país no está disponible." with the links "Colombia" and "Chile"' },
    { address: '/co/datos', result: 'step 1 of Colombia' },
  ];

  for (const { address, result } of addresses) {
    test(`US-01-AC-17 at ${address} a failed country list shows the load error, never "no disponible", and Reintentar leads to ${result}`, async ({ page }) => {
      const formFieldRequests = trackFormFieldRequests(page);
      // The failure is simulated in the browser context, as US-01-Q-28 / ADR-0001 plan: abort the request.
      await page.route(/\/api\/countries/, (route) => route.abort());

      await page.goto(address);
      await expect(page.getByRole('alert').filter({ hasText: COUNTRIES_ERROR })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reintentar' })).toBeFocused();
      await expect(page.getByText(UNSUPPORTED)).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Colombia' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Chile' })).toHaveCount(0);
      expect(formFieldRequests).toEqual([]);

      // The content backend is available again.
      await page.unroute(/\/api\/countries/);
      await page.getByRole('button', { name: 'Reintentar' }).click();

      if (address === '/co/datos') {
        await expect(field(page, 'Placa')).toBeVisible();
      } else {
        await expect(page.getByRole('link', { name: 'Colombia' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Chile' })).toBeVisible();
        if (address === '/ar/datos') await expect(page.getByText(UNSUPPORTED)).toBeVisible();
        else await expect(page.getByText(UNSUPPORTED)).toHaveCount(0);
      }
      await expect(page.getByRole('alert').filter({ hasText: COUNTRIES_ERROR })).toHaveCount(0);
    });
  }
});

test.describe('US-01-AC-22 data does not cross countries', () => {
  /**
   * US-04 spec 11.1: a select shows the prompt (the text of a select-only button, the empty value AND the
   * placeholder of a searchable input) and the wizard state holds no non-empty value for it. Text boxes
   * (the date box included), number boxes and checkboxes are checked as before.
   */
  async function expectEmptyStep1(page: Page, yearLabel: 'Modelo (año)' | 'Año'): Promise<void> {
    for (const box of await page.getByRole('textbox').all()) await expect(box).toHaveValue('');
    // US-04 spec 11.1.1: the year is a text box now (the textbox loop covers it); name it so the check cannot become vacuous.
    await expect(field(page, yearLabel)).toHaveValue('');
    expect(await page.getByRole('spinbutton').count(), 'no spinbutton is left in step 1').toBe(0);
    for (const box of await page.getByRole('checkbox').all()) await expect(box).not.toBeChecked();
    const combos = await page.getByRole('combobox').all();
    expect(combos.length, 'the step 1 selects are comboboxes').toBeGreaterThan(0);
    for (const combo of combos) await expectPrompt(combo);
    const stored = await storedValues(page);
    for (const key of ['documentType', 'city', 'make']) expect(stored[key] ?? '', `${key} in the wizard state`).toBe('');
  }

  test('US-01-AC-22 what I typed in Colombia is not shown in Chile, nor in Colombia again', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillField(page, 'Número de documento', '1012345678');
    await fillField(page, 'Nombre completo', 'Ana Prueba Ficticia');
    await fillField(page, 'Placa', 'ABC123');
    await fillField(page, 'Modelo (año)', '2022');
    await fillField(page, 'Ciudad', 'Medellín');

    // The data is really kept for this country: a reload in the same tab shows it again.
    await page.reload();
    await expect(field(page, 'Nombre completo')).toHaveValue('Ana Prueba Ficticia');

    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await expectEmptyStep1(page, 'Año');

    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await expectEmptyStep1(page, 'Modelo (año)');
    await expect(field(page, 'Nombre completo')).toHaveValue('');
  });

  test('US-01-AC-22 data typed in Chile is not shown in Colombia', async ({ page }) => {
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await fillField(page, 'RUT', '12.345.678-5');
    await fillField(page, 'Patente', 'BCDF12');

    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await expectEmptyStep1(page, 'Modelo (año)');
  });
});
