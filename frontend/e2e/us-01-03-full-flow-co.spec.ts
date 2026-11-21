import { expect, test, type Page, type Request } from '@playwright/test';
import { BASE_URL, STRAPI_URL } from './support/env';
import { CO_CONSENT, CO_VALID, continuar, expectFieldEmpty, field, fillColombia } from './support/form';
import {
  CL_VALID,
  CO_HIDDEN_NAMES,
  CO_PLAN_NAMES,
  CO_PRICES,
  CL_PLAN_NAMES,
  HEADING,
  TITLE,
  TODAY,
  atras,
  expectEntered,
  expectPlanNames,
  expectPrices,
  fillChile,
  plan,
  plans,
  pricePattern,
  reachPlansInColombia,
} from './support/plans';
import {
  CL_TERMS_TITLE,
  CO_ROWS,
  CO_TERMS_TITLE,
  CONFIRMED_TITLE,
  HINT,
  SIMULATION,
  SUMMARY_TITLE,
  acceptTerms,
  cambiarPlan,
  confirmedHeading,
  editar,
  expectRows,
  expectVisibleFocusIndicator,
  focusedName,
  outcome,
  pagar,
  quoteNumberPattern,
  readQuoteNumber,
  reachSummaryInColombia,
  summaryHeading,
} from './support/summary';

/**
 * The full flow of Colombia against the real stack with the seed (ADR-0002 topology), started by
 * US-02 and extended by US-03 with the summary and the payment (so the file never needs renaming,
 * CLAUDE.md section 6). Today of the browser is pinned to 2026-11-21 so the prices stay stable.
 *
 * Covers US-02-AC-01 (CO), AC-03, AC-05 (continue without a plan), AC-07 (CO), AC-13, AC-16,
 * AC-19 (first scenario) and the end-to-end parts that US-01 handed over: US-01-AC-04, AC-18,
 * AC-20, AC-21 (first scenario, Chile) and the focus on the step 2 heading of AC-24.
 *
 * US-03 completes the flow with the summary, the terms, the payment and the confirmation:
 * US-03-AC-01 (CO), AC-02 (CO), AC-03, AC-05 (second scenario), AC-07, AC-09, AC-10 (format),
 * AC-11, AC-13 (CO terms), AC-14 (first scenario), AC-15, AC-16 (keyboard only) and AC-19 (first
 * scenario). Chile, the rejected payment and the terms security rows are in
 * `us-03-summary-payment-cl.spec.ts`. The payment takes its real 1.5 s (ADR-0008): the page clock
 * is pinned with `setFixedTime`, which keeps timers running.
 */

const HEADING_LOCATOR = (page: Page) => page.getByRole('heading', { level: 1, name: HEADING });

test.describe('US-02-AC-01 / US-02-AC-07 plans and final prices in Colombia', () => {
  test.beforeEach(async ({ page }) => {
    await reachPlansInColombia(page);
  });

  test('US-02-AC-01 / US-01-AC-18 after a valid "Continuar" I see step 2: exactly "Plan Básico", "Plan Clásico", "Plan Total", in this order', async ({ page }) => {
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expectPlanNames(page, CO_PLAN_NAMES);
  });

  test('US-02-AC-01 I do not see "Plan Joven" (draft only), "Plan Total Plus" (inactive) or any Chile plan', async ({ page }) => {
    await expectPlanNames(page, CO_PLAN_NAMES);
    for (const hidden of [...CO_HIDDEN_NAMES, ...CL_PLAN_NAMES, 'Plan Flex', 'Plan Premium Plus']) {
      await expect(page.getByText(hidden)).toHaveCount(0);
    }
  });

  test('US-02-AC-01 each plan shows its short description, "Precio anual", and its coverages and benefits under "Coberturas" and "Beneficios"', async ({ page }) => {
    await expect(page.getByText('Protección esencial frente a los daños que causes a terceros.')).toBeVisible();
    await expect(page.getByText('Cubre los daños a terceros y la pérdida total de tu vehículo.')).toBeVisible();
    await expect(page.getByText('Protección completa, también para daños parciales.')).toBeVisible();
    await expect(page.getByText('Precio anual')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Coberturas' })).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Beneficios' })).toHaveCount(3);
    await expect(page.getByText('Pérdida total por hurto')).toBeVisible();
    await expect(page.getByText('Conductor elegido (2 servicios al año)')).toBeVisible();
  });

  test('US-02-AC-07 the plans show these final prices: "Plan Básico" $935.000, "Plan Clásico" $1.540.000, "Plan Total" $2.310.000', async ({ page }) => {
    await expectPrices(page, CO_PLAN_NAMES, CO_PRICES);
    for (const price of CO_PRICES) await expect(page.getByText(pricePattern(price)).first()).toBeVisible();
    // The base price is never shown, only the final price (US-02-Q-08).
    await expect(page.getByText(pricePattern('$850.000'))).toHaveCount(0);
  });

  test('US-02-AC-02 "Plan Clásico" is the recommended plan of Colombia and stays second', async ({ page }) => {
    await expect(plan(page, 'Plan Clásico')).toHaveAccessibleDescription(/Recomendado/);
    await expect(plan(page, 'Plan Básico')).not.toHaveAccessibleDescription(/Recomendado/);
    await expect(plan(page, 'Plan Total')).not.toHaveAccessibleDescription(/Recomendado/);
    await expect(page.getByText('Recomendado').first()).toBeVisible();
    await expectPlanNames(page, CO_PLAN_NAMES); // "Plan Clásico" stays second
  });
});

test.describe('US-02-AC-03 / US-02-AC-05 choosing a plan and continuing', () => {
  test.beforeEach(async ({ page }) => {
    await reachPlansInColombia(page);
  });

  test('US-02-AC-05 on arrival no plan is chosen, not even the recommended one', async ({ page }) => {
    for (const name of CO_PLAN_NAMES) await expect(plan(page, name)).not.toBeChecked();
    await expect(page.getByText('Seleccionado')).toHaveCount(0);
  });

  test('US-02-AC-03 I select "Plan Total": it is checked and shows "Seleccionado", the wizard state holds "total", and "Continuar" opens "/co/resumen"', async ({ page }) => {
    await plan(page, 'Plan Total').check();
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await expect(page.getByText('Seleccionado')).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('quote-wizard') ?? '{}').plan))
      .toEqual({ key: 'total' });

    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/resumen$/);
  });

  test('US-02-AC-05 choosing another plan replaces the choice: only "Plan Total" is chosen', async ({ page }) => {
    await plan(page, 'Plan Básico').check();
    await plan(page, 'Plan Total').check();
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await expect(plan(page, 'Plan Básico')).not.toBeChecked();
    await expect(page.getByText('Seleccionado')).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('quote-wizard') ?? '{}').plan))
      .toEqual({ key: 'total' });
  });

  test('US-02-AC-05 "Continuar" with no chosen plan stays on "/co/planes", shows "Elige un plan para continuar.", focuses "Plan Básico" and chooses nothing', async ({ page }) => {
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Elige un plan para continuar.' })).toBeVisible();
    await expect(plan(page, 'Plan Básico')).toBeFocused();
    for (const name of CO_PLAN_NAMES) await expect(plan(page, name)).not.toBeChecked();
  });
});

test.describe('US-02-AC-13 / US-01-AC-04 / US-01-AC-20 the chosen plan and the data are kept', () => {
  test.beforeEach(async ({ page }) => {
    await reachPlansInColombia(page);
  });

  test('US-01-AC-04 / US-02-AC-13 "Atrás" shows step 1 with every value I entered and no error; "Continuar" shows "Plan Total" still chosen', async ({ page }) => {
    await plan(page, 'Plan Total').check();
    await atras(page).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    await expectEntered(page, CO_VALID);
    await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveCount(0);

    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Total')).toBeChecked();
  });

  test('US-01-AC-20 the browser back action from step 2 shows step 1 with every value I entered', async ({ page }) => {
    await page.goBack();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    await expectEntered(page, CO_VALID);
  });

  test('US-02-AC-13 changing "Modelo (año)" to 2015 keeps "Plan Clásico" chosen and recomputes its price from $1.540.000 to $1.260.000', async ({ page }) => {
    await plan(page, 'Plan Clásico').check();
    await expect(plan(page, 'Plan Clásico')).toHaveAccessibleDescription(pricePattern('$1.540.000'));

    await atras(page).click();
    await expect(field(page, 'Modelo (año)')).toHaveValue('2022');
    await field(page, 'Modelo (año)').fill('2015');
    await continuar(page).click();

    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Clásico')).toBeChecked();
    await expect(plan(page, 'Plan Clásico')).toHaveAccessibleDescription(pricePattern('$1.260.000'));
  });

  test('US-02-AC-13 a reload on the plan list keeps the chosen plan and its price', async ({ page }) => {
    await plan(page, 'Plan Clásico').check();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
    await expect(plan(page, 'Plan Clásico')).toBeChecked();
    await expect(plan(page, 'Plan Clásico')).toHaveAccessibleDescription(pricePattern('$1.540.000'));
  });
});

test.describe('US-02-AC-13 / US-01-AC-21 a reload on step 2 in Chile (first scenario of US-01-AC-21)', () => {
  test('US-02-AC-13 / US-01-AC-21 I chose "Plan Protegido" in Chile and reloaded: it is still chosen with "$528.000"; after "Atrás" every field shows the value I entered', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await fillChile(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/cl\/planes$/);
    await plan(page, 'Plan Protegido').check();
    await expect(plan(page, 'Plan Protegido')).toHaveAccessibleDescription(pricePattern('$528.000'));

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
    await expect(page).toHaveURL(/\/cl\/planes$/);
    await expect(plan(page, 'Plan Protegido')).toBeChecked();
    await expect(plan(page, 'Plan Protegido')).toHaveAccessibleDescription(pricePattern('$528.000'));

    await atras(page).click();
    await expect(page).toHaveURL(/\/cl\/datos$/);
    await expect(field(page, 'Patente')).toBeVisible();
    await expectEntered(page, CL_VALID);
  });
});

test.describe('US-02-AC-16 / US-01-AC-24 keyboard-only plan choice (Colombia, desktop)', () => {
  // US-04 spec 11.1: no locale override (the date is dd/mm/aaaa whatever the browser locale).
  test.use({ viewport: { width: 1280, height: 800 } });

  /** The description of what has focus: a button by its text, a plan option as "plan group". */
  async function focused(page: Page): Promise<string> {
    return page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return 'none';
      if (el.tagName === 'BUTTON') return (el.textContent ?? '').trim();
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'radio') return 'plan group';
      return el.tagName.toLowerCase();
    });
  }

  async function expectVisibleFocusIndicator(page: Page): Promise<void> {
    const visible = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== 'none';
      return outline || shadow;
    });
    expect(visible, 'a focused control must show a visible focus indicator').toBe(true);
  }

  test('US-02-AC-16 the heading has the focus and the document title is right; Tab reaches the group, the arrow keys choose, Tab goes to "Atrás" then "Continuar", Enter opens "/co/resumen"', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    // Step 1 is completed with the keyboard at its last step: fields are filled, then Tab and Enter move on.
    // The keyboard path through the fields is US-01-AC-24's own test (us-01-data-form-co.spec.ts).
    await fillColombia(page);
    await field(page, CO_CONSENT).focus();
    await page.keyboard.press('Tab');
    await expect(continuar(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/planes$/);

    // Arrival: the keyboard focus is on the step heading, and the document title (also US-01-AC-24).
    await expect(HEADING_LOCATOR(page)).toBeFocused();
    await expect(page).toHaveTitle(TITLE);

    // Tab: the plan group, on its first plan.
    await page.keyboard.press('Tab');
    await expect(plan(page, 'Plan Básico')).toBeFocused();
    expect(await focused(page)).toBe('plan group');
    await expectVisibleFocusIndicator(page);

    // Down arrow twice: "Plan Total" is focused and chosen.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(plan(page, 'Plan Total')).toBeFocused();
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await expectVisibleFocusIndicator(page);

    // Tab until "Continuar": the order is the plan group, "Atrás", "Continuar".
    const order: string[] = ['plan group'];
    for (let i = 0; i < 6 && order[order.length - 1] !== 'Continuar'; i++) {
      await page.keyboard.press('Tab');
      const now = await focused(page);
      if (now !== order[order.length - 1]) {
        order.push(now);
        await expectVisibleFocusIndicator(page);
      }
    }
    expect(order).toEqual(['plan group', 'Atrás', 'Continuar']);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/resumen$/);
  });

  test('US-02-AC-05 / US-02-AC-16 "Continuar" by keyboard with no chosen plan keeps step 2, announces the message and moves the focus to "Plan Básico"', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillColombia(page);
    await field(page, CO_CONSENT).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(HEADING_LOCATOR(page)).toBeFocused();

    // Tab to "Continuar" without choosing: the group, "Atrás", "Continuar".
    for (let i = 0; i < 6 && (await focused(page)) !== 'Continuar'; i++) await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('Continuar');
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Elige un plan para continuar.' })).toBeVisible();
    await expect(plan(page, 'Plan Básico')).toBeFocused();
  });
});

test.describe('US-02-AC-19 no step 1 data leaves the browser on step 2', () => {
  test('US-02-AC-19 from step 1 to the summary every request is a GET without an Authorization header, and none contains a step 1 value', async ({ page }) => {
    const requests: Request[] = [];
    page.on('request', (request) => requests.push(request));

    await reachPlansInColombia(page);
    await plan(page, 'Plan Total').check();
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/resumen$/);

    const apiRequests = requests.filter((r) => new URL(r.url()).pathname.startsWith('/api/'));
    expect(apiRequests.map((r) => new URL(r.url()).pathname)).toContain('/api/plans');
    expect(apiRequests.map((r) => r.method()).filter((m) => m !== 'GET')).toEqual([]);

    // The browser only talks to the front end origin: Strapi's own port is never contacted.
    const strapiOrigin = new URL(STRAPI_URL).origin;
    const frontendOrigin = new URL(BASE_URL).origin;
    expect(requests.map((r) => new URL(r.url()).origin).filter((o) => o === strapiOrigin && o !== frontendOrigin)).toEqual([]);

    const carrying: string[] = [];
    for (const request of requests) {
      if ('authorization' in (await request.allHeaders())) carrying.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
    expect(carrying).toEqual([]);

    const entered = ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring', '1990-05-15', '15/05/1990', 'Medellín'];
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

test.describe('US-02-AC-15 the summary address needs a valid step 1 and a chosen plan', () => {
  test('US-02-AC-15 opening "/co/resumen" directly with a valid step 1 and no chosen plan takes me to "/co/planes"', async ({ page }) => {
    await reachPlansInColombia(page);
    await page.goto('/co/resumen');
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plans(page)).toHaveCount(3);
  });
});

test.describe('US-01-AC-18 an invalid "Continuar" keeps step 1 (the other side of "I see step 2")', () => {
  test('US-01-AC-18 "Modelo (año)" 2005 stays on step 1 and step 2 is not shown', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillColombia(page, { 'Modelo (año)': '2005' });
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(HEADING_LOCATOR(page)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------
// US-03: the summary, the terms, the payment and the confirmation (Colombia)
// ---------------------------------------------------------------------------------------------

test.describe('US-03-AC-01 / US-03-AC-02 / US-03-AC-05 / US-03-AC-13 / US-03-AC-14 the Colombia summary and its terms', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInColombia(page);
  });

  test('US-03-AC-01 the address is "/co/resumen", the heading "Resumen de tu cotización" is shown and has the keyboard focus, and the title is right', async ({ page }) => {
    await expect(page).toHaveURL(/\/co\/resumen$/);
    await expect(summaryHeading(page)).toBeVisible();
    await expect(summaryHeading(page)).toBeFocused();
    await expect(page).toHaveTitle(SUMMARY_TITLE);
  });

  test('US-03-AC-01 under "Tus datos" and "Tu vehículo" I see, in this order: Tipo de documento, Número de documento "••••••5678", Nombre completo, Fecha de nacimiento, Ciudad, Placa, Marca, Línea, Modelo (año)', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Tus datos' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Tu vehículo' })).toBeVisible();
    await expectRows(page, CO_ROWS);
    // The consent checkbox of step 1 is not a row (US-03-BR-01).
    await expect(page.getByText('Autorizo el tratamiento de mis datos personales.')).toHaveCount(0);
  });

  test('US-03-AC-01 under "Plan elegido" I see "Plan Total", its short description and "$2.310.000" with "Precio anual"; no other plan', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Plan elegido' })).toBeVisible();
    await expect(page.getByText('Plan Total', { exact: true })).toBeVisible();
    await expect(page.getByText('Protección completa, también para daños parciales.')).toBeVisible();
    await expect(page.getByText(pricePattern('$2.310.000'))).toBeVisible();
    await expect(page.getByText('Precio anual')).toBeVisible();
    for (const other of ['Plan Básico', 'Plan Clásico']) await expect(page.getByText(other)).toHaveCount(0);
  });

  test('US-03-AC-05 the full number "1012345678" and its start "101234" are not in the DOM, the document title or the address; the number is masked "••••••5678" and read as "Número oculto, termina en 5678"', async ({ page }) => {
    const html = await page.content();
    for (const hidden of ['1012345678', '101234']) expect(html, hidden).not.toContain(hidden);
    expect(await page.title()).not.toContain('101234');
    expect(page.url()).not.toContain('101234');
    await expect(page.getByText('••••••5678')).toBeVisible();
    await expect(page.getByText('Número oculto, termina en 5678')).toBeAttached();
  });

  test('US-03-AC-02 I see the title "Términos y condiciones del seguro de auto – Colombia" and the heading "Condiciones principales", and not "Condiciones generales"; the pay button is disabled until I accept', async ({ page }) => {
    await expect(page.getByRole('region', { name: CO_TERMS_TITLE })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Condiciones principales' })).toBeVisible();
    await expect(page.getByText('Condiciones generales')).toHaveCount(0);
    await expect(page.getByText(CL_TERMS_TITLE)).toHaveCount(0);
    await expect(page.getByText('pesos colombianos (COP)')).toBeVisible();
    await expect(pagar(page)).toBeDisabled();
    await expect(pagar(page)).toHaveAccessibleDescription(HINT);
    await acceptTerms(page).check();
    await expect(pagar(page)).toBeEnabled();
  });

  test('US-03-AC-13 "Condiciones principales" is an h4 inside the terms, whose title is an h3, the three conditions are items of one bulleted list, and "ficticio" is bold', async ({ page }) => {
    const region = page.getByRole('region', { name: CO_TERMS_TITLE });
    const inner = region.getByRole('heading', { name: 'Condiciones principales' });
    await expect(inner).toBeVisible();
    const level = await inner.evaluate((el) => Number(el.tagName.substring(1)));
    expect(level, 'the body heading is an h4 (ADR-0009, headingLevel 4)').toBe(4);
    await expect(page.getByRole('heading', { level: 3, name: CO_TERMS_TITLE })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Términos y condiciones', exact: true })).toBeVisible();
    await expect(region.getByRole('list')).toHaveCount(1);
    await expect(region.getByRole('listitem')).toHaveCount(3);
    await expect(region.getByRole('listitem').first()).toContainText('La vigencia de la póliza');
    await expect(region.locator('strong')).toHaveText(['ficticio']);
  });

  test('US-03-AC-02 the terms are a named region that a keyboard user can focus', async ({ page }) => {
    const region = page.getByRole('region', { name: CO_TERMS_TITLE });
    await region.focus();
    await expect(region).toBeFocused();
  });

  test('US-03-AC-14 I do not see "Borrador no publicado" (the Colombia draft) nor any text of the Chile terms', async ({ page }) => {
    await expect(page.getByRole('region', { name: CO_TERMS_TITLE })).toBeVisible();
    await expect(page.getByText('Borrador no publicado')).toHaveCount(0);
    await expect(page.getByText('Términos y condiciones (borrador)')).toHaveCount(0);
    for (const chile of ['Condiciones generales', 'pesos chilenos', 'Ley aplicable: Chile']) await expect(page.getByText(chile)).toHaveCount(0);
  });
});

test.describe('US-03-AC-03 / US-03-AC-09 / US-03-AC-10 / US-03-AC-11 / US-03-AC-15 the payment and the confirmation (Colombia)', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInColombia(page);
  });

  test('US-03-AC-03 I accept, click pay: the button is locked and reads "Procesando pago…", then I see "Pago confirmado" and "Tu número de cotización es" followed by COT-CO-20261121-NNNNNN', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(pagar(page)).toBeDisabled();
    await expect(pagar(page)).toHaveText('Procesando pago…');
    await expect(confirmedHeading(page)).toBeVisible();
    const number = await readQuoteNumber(page, 'CO');
    expect(number).toMatch(quoteNumberPattern('CO'));
    await expect(page).toHaveURL(/\/co\/resumen$/);
    await expect(page.getByText('Este es un pago simulado; no se realizó ningún cobro real.')).toBeVisible();
  });

  test('US-03-AC-10 the quote number is not stored, not in the address and not in the document title', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    const number = await readQuoteNumber(page, 'CO');
    expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))).not.toContain(number);
    expect(page.url()).not.toContain(number);
    expect(await page.title()).not.toContain(number);
  });

  test('US-03-AC-03 the confirmation moves the keyboard focus to "Pago confirmado", and the title is "Pago confirmado | Cotizador de seguro de auto"', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeFocused();
    await expect(page).toHaveTitle(CONFIRMED_TITLE);
  });

  test('US-03-AC-15 the page offers the group "Simulación de pago (no se realiza ningún cobro)" with "Pago aprobado" selected, and has no field for a card number, expiry date, security code or bank account', async ({ page }) => {
    await expect(page.getByRole('group', { name: SIMULATION })).toBeVisible();
    await expect(outcome(page, 'Pago aprobado')).toBeChecked();
    await expect(outcome(page, 'Pago rechazado')).not.toBeChecked();
    // Counting every form control is the guard for "no card field": the checkbox and the two radios, nothing else.
    await expect(page.locator('input, select, textarea')).toHaveCount(3);
    for (const name of [/tarjeta/i, /vencimiento|expira/i, /seguridad|cvv|cvc/i, /cuenta|iban/i]) await expect(page.getByLabel(name)).toHaveCount(0);
  });

  test('US-03-AC-15 no network request is sent between the activation of "Pagar" and the confirmation, and the outcome arrives about 1.5 seconds after it', async ({ page }) => {
    await acceptTerms(page).check();
    const during: string[] = [];
    let armed = false;
    page.on('request', (request) => {
      if (armed) during.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    armed = true;
    const startedAt = Date.now(); // Node clock: the page clock is pinned, so the page cannot measure the delay
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    const elapsed = Date.now() - startedAt;
    armed = false;
    expect(during, 'requests between the activation and the confirmation').toEqual([]);
    expect(elapsed, 'the simulated processing time is 1.5 s').toBeGreaterThanOrEqual(1400);
    expect(elapsed).toBeLessThan(4000);
  });

  test('US-03-AC-09 three activations within 200 ms (click, Enter, click) process one attempt; while it runs the terms checkbox, the simulation choice, "Editar mis datos" and "Cambiar plan" cannot be used; one confirmation with one quote number', async ({ page }) => {
    await acceptTerms(page).check();
    // The second and third activations hit a button that is already locked: `force` skips Playwright's own "enabled" wait.
    await pagar(page).click();
    await page.keyboard.press('Enter');
    await pagar(page).click({ force: true });

    await expect(pagar(page)).toBeDisabled();
    await expect(acceptTerms(page)).toBeDisabled();
    await expect(outcome(page, 'Pago aprobado')).toBeDisabled();
    await expect(outcome(page, 'Pago rechazado')).toBeDisabled();
    await expect(editar(page)).toBeDisabled();
    await expect(cambiarPlan(page)).toBeDisabled();
    await editar(page).click({ force: true });
    await cambiarPlan(page).click({ force: true });
    await expect(page).toHaveURL(/\/co\/resumen$/);

    await expect(confirmedHeading(page)).toBeVisible();
    await expect(confirmedHeading(page)).toHaveCount(1);
    expect(((await page.locator('body').innerText()).match(/COT-CO-/g) ?? []).length, 'one quote number').toBe(1);
  });

  test('US-03-AC-11 on the confirmation sessionStorage has no "quote-wizard" entry; "Nueva cotización" leads to "/co/datos" with every step 1 field empty', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('quote-wizard'))).toBeNull();

    await page.getByRole('button', { name: 'Nueva cotización' }).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    // US-04 spec 11.1: text boxes and the date box are '', the selects show the prompt.
    for (const label of ['Tipo de documento', 'Número de documento', 'Nombre completo', 'Fecha de nacimiento', 'Ciudad', 'Placa', 'Marca', 'Línea', 'Modelo (año)']) {
      await expectFieldEmpty(page, label);
    }
    await expect(field(page, CO_CONSENT)).not.toBeChecked();
  });

  test('US-03-AC-11 I reload the page on the confirmation: "/co/datos", every field empty, no plan chosen', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    for (const label of ['Número de documento', 'Nombre completo', 'Placa', 'Línea', 'Modelo (año)']) await expect(field(page, label), label).toHaveValue('');
    expect(await page.evaluate(() => sessionStorage.getItem('quote-wizard'))).toBeNull();
  });

  test('US-03-AC-11 I use the browser back action on the confirmation: "/co/datos", every field empty, no plan chosen', async ({ page }) => {
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    for (const label of ['Número de documento', 'Nombre completo', 'Placa', 'Línea', 'Modelo (año)']) await expect(field(page, label), label).toHaveValue('');
    expect(await page.evaluate(() => sessionStorage.getItem('quote-wizard'))).toBeNull();
  });
});

test.describe('US-03-AC-07 edit my data or change the plan (Colombia)', () => {
  test.beforeEach(async ({ page }) => {
    await reachSummaryInColombia(page);
  });

  test('US-03-AC-07 "Editar mis datos" leads to "/co/datos" with every value I entered; after changing "Modelo (año)" to 2015 and "Continuar", "Plan Total" is still chosen; "Continuar" shows 2015, "Plan Total" at "$1.890.000", the terms unchecked and "Pagar" disabled', async ({ page }) => {
    await acceptTerms(page).check();
    await editar(page).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Placa')).toBeVisible();
    await expectEntered(page, CO_VALID);

    await field(page, 'Modelo (año)').fill('2015');
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Total')).toBeChecked();

    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/resumen$/);
    await expect(summaryHeading(page)).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: /^2015$/ })).toBeVisible();
    await expect(page.getByText('Plan Total', { exact: true })).toBeVisible();
    await expect(page.getByText(pricePattern('$1.890.000'))).toBeVisible();
    await expect(acceptTerms(page)).not.toBeChecked();
    await expect(pagar(page)).toBeDisabled();
  });

  test('US-03-AC-07 "Cambiar plan" leads to "/co/planes" with "Plan Total" chosen; choosing "Plan Básico" and "Continuar" shows "Plan Básico" at "$935.000"', async ({ page }) => {
    await cambiarPlan(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await plan(page, 'Plan Básico').check();
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/resumen$/);
    await expect(summaryHeading(page)).toBeVisible();
    await expect(page.getByText('Plan Básico', { exact: true })).toBeVisible();
    await expect(page.getByText(pricePattern('$935.000'))).toBeVisible();
    await expect(page.getByText('Plan Total', { exact: true })).toHaveCount(0);
  });

  test('US-03-AC-07 the browser back action from the summary goes to step 2 with "Plan Total" still chosen (US-03-Q-11)', async ({ page }) => {
    await page.goBack();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Total')).toBeChecked();
  });
});

test.describe('US-03-AC-16 keyboard-only: the whole flow of Colombia to the confirmation (desktop)', () => {
  // US-04 spec 11.1: no locale override (the date is dd/mm/aaaa whatever the browser locale).
  test.use({ viewport: { width: 1280, height: 800 } });

  test('US-03-AC-16 step 1 values are filled, then only the keyboard: Plan Total with the arrow keys, the summary heading has the focus, Tab order, the terms checkbox with Space, "Pagar" with Enter, the confirmation has the focus', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    // The keyboard path through the step 1 fields is US-01-AC-24's own test; here the form is filled and the keys take over.
    await fillColombia(page);
    await field(page, CO_CONSENT).focus();
    await page.keyboard.press('Tab');
    await expect(continuar(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(HEADING_LOCATOR(page)).toBeFocused();

    // Step 2: the plan group, the arrow keys choose "Plan Total", Tab to "Continuar", Enter.
    await page.keyboard.press('Tab');
    await expect(plan(page, 'Plan Básico')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(continuar(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/co\/resumen$/);

    // Arrival: the focus is on the heading, the document title is right.
    await expect(summaryHeading(page)).toBeFocused();
    await expect(page).toHaveTitle(SUMMARY_TITLE);

    // Tab: "Editar mis datos", "Cambiar plan", the terms region, the checkbox, the simulation group, "Pagar".
    const order: string[] = [];
    for (let i = 0; i < 10 && order[order.length - 1] !== 'Pagar'; i++) {
      await page.keyboard.press('Tab');
      const now = await focusedName(page);
      if (now !== order[order.length - 1]) {
        order.push(now);
        await expectVisibleFocusIndicator(page);
      }
      if (now === 'terms region') {
        // The region is focusable, so the arrow keys scroll it and keep the focus in it. The check always runs:
        // the test shortens the region so that the seed text overflows, and fails if it still does not.
        const region = page.getByRole('region', { name: CO_TERMS_TITLE });
        await region.evaluate((el) => (el.style.maxHeight = '80px'));
        expect(await region.evaluate((el) => el.scrollHeight > el.clientHeight), 'the terms region must overflow for the scroll check').toBe(true);
        await page.keyboard.press('ArrowDown');
        expect(await focusedName(page)).toBe('terms region');
        // Chromium animates the keyboard scroll: poll until it has moved.
        await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      }
      if (now === 'checkbox') {
        await page.keyboard.press('Space');
        await expect(acceptTerms(page)).toBeChecked();
      }
    }
    expect(order).toEqual(['Editar mis datos', 'Cambiar plan', 'terms region', 'checkbox', 'simulation group', 'Pagar']);
    await expect(pagar(page)).toBeEnabled();

    await page.keyboard.press('Enter');
    await expect(confirmedHeading(page)).toBeFocused();
    await expect(page).toHaveTitle(CONFIRMED_TITLE);
    expect(await readQuoteNumber(page, 'CO')).toMatch(quoteNumberPattern('CO'));
  });
});

test.describe('US-03-AC-19 no personal data leaves the browser on the summary and the payment (Colombia)', () => {
  test('US-03-AC-19 from step 1 to the confirmation every request to the content backend is a GET without an Authorization header, and none contains a value I entered, the plan key or the quote number', async ({ page }) => {
    const requests: Request[] = [];
    page.on('request', (request) => requests.push(request));

    await reachSummaryInColombia(page);
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    const number = await readQuoteNumber(page, 'CO');

    const apiRequests = requests.filter((r) => new URL(r.url()).pathname.startsWith('/api/'));
    const paths = apiRequests.map((r) => new URL(r.url()).pathname);
    expect(paths).toContain('/api/terms');
    expect(paths).toContain('/api/plans');
    expect(apiRequests.map((r) => r.method()).filter((m) => m !== 'GET')).toEqual([]);

    // The browser only talks to the front end origin: Strapi's own port is never contacted.
    const strapiOrigin = new URL(STRAPI_URL).origin;
    const frontendOrigin = new URL(BASE_URL).origin;
    expect(requests.map((r) => new URL(r.url()).origin).filter((o) => o === strapiOrigin && o !== frontendOrigin)).toEqual([]);

    const carrying: string[] = [];
    for (const request of requests) {
      if ('authorization' in (await request.allHeaders())) carrying.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
    expect(carrying).toEqual([]);

    const entered = ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring', '1990-05-15', '15/05/1990', 'Medellín', number];
    const leaks: string[] = [];
    for (const request of requests) {
      const haystack = [request.url(), decodeURIComponent(request.url()), request.postData() ?? ''].join('\n').toLowerCase();
      for (const value of entered) {
        if (haystack.includes(value.toLowerCase()) || haystack.includes(encodeURIComponent(value).toLowerCase())) {
          leaks.push(`${request.method()} ${new URL(request.url()).pathname} contains a typed value`);
        }
      }
      // The chosen plan key "total" is never sent either (it is only matched as a whole word, so "pageSize" or "sort" cannot trip it).
      if (/\btotal\b/.test(haystack)) leaks.push(`${request.method()} ${new URL(request.url()).pathname} contains the plan key`);
    }
    expect(leaks).toEqual([]);
  });
});
