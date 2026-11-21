import { expect, test, type Page, type Request } from '@playwright/test';
import { BASE_URL, STRAPI_URL } from './support/env';
import { CO_CONSENT, CO_VALID, continuar, field, fillColombia } from './support/form';
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

/**
 * The full flow of Colombia against the real stack with the seed (ADR-0002 topology), started by
 * US-02 and extended by US-03 with the summary and the payment (so the file never needs renaming,
 * CLAUDE.md section 6). Today of the browser is pinned to 2026-11-21 so the prices stay stable.
 *
 * Covers US-02-AC-01 (CO), AC-03, AC-05 (continue without a plan), AC-07 (CO), AC-13, AC-16,
 * AC-19 (first scenario) and the end-to-end parts that US-01 handed over: US-01-AC-04, AC-18,
 * AC-20, AC-21 (first scenario, Chile) and the focus on the step 2 heading of AC-24.
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
  // The date control reads typed digits in the browser locale; the first segment is the month in en-US.
  test.use({ locale: 'en-US', viewport: { width: 1280, height: 800 } });

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
