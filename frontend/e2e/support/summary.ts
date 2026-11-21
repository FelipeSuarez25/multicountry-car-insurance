import { expect, type Locator, type Page } from '@playwright/test';
import { continuar } from './form';
import { plan, reachPlansInChile, reachPlansInColombia } from './plans';

/**
 * Helpers for step 3 (the summary, the terms and the payment). Everything on the page is found the
 * way a person or assistive technology finds it: by role, accessible name or visible text. The
 * data are description lists, so a row is a `term` and a `definition`. Values are fictitious
 * (specs/US-01/seed-fields.md, specs/US-03/seed-terms.md).
 */

export const SUMMARY_HEADING = 'Resumen de tu cotización';
export const SUMMARY_TITLE = 'Resumen de tu cotización | Cotizador de seguro de auto';
export const CONFIRMED_HEADING = 'Pago confirmado';
export const CONFIRMED_TITLE = 'Pago confirmado | Cotizador de seguro de auto';
export const ACCEPT = 'Acepto los términos y condiciones';
export const HINT = 'Acepta los términos y condiciones para pagar.';
export const REJECTED = 'El pago fue rechazado y no se realizó ningún cobro. Puedes intentarlo de nuevo.';
export const SIMULATION = 'Simulación de pago (no se realiza ningún cobro)';

export const CO_TERMS_TITLE = 'Términos y condiciones del seguro de auto – Colombia';
export const CL_TERMS_TITLE = 'Términos y condiciones del seguro automotriz – Chile';
export const CO_DRAFT_TERMS_TITLE = 'Términos y condiciones (borrador)';

/** Spec 5, US-03-AC-01 (visible values; the masked document number is shown as bullets). */
export const CO_ROWS: [string, string][] = [
  ['Tipo de documento', 'Cédula de ciudadanía'],
  ['Número de documento', '••••••5678'],
  ['Nombre completo', 'Ana Prueba Ficticia'],
  ['Fecha de nacimiento', '15 de mayo de 1990'],
  ['Ciudad', 'Medellín'],
  ['Placa', 'ABC123'],
  ['Marca', 'Mazda'],
  ['Línea', '3 Touring'],
  ['Modelo (año)', '2022'],
];
export const CL_ROWS: [string, string][] = [
  ['RUT', '••.•••.678-5'],
  ['Nombre completo', 'Ana Prueba Ficticia'],
  ['Fecha de nacimiento', '15 de mayo de 1990'],
  ['Ciudad', 'Santiago'],
  ['Patente', 'BCDF12'],
  ['Marca', 'Kia'],
  ['Modelo', 'Rio 5'],
  ['Año', '2022'],
];

export const quoteNumberPattern = (code: string): RegExp => new RegExp(`^COT-${code}-20261121-\\d{6}$`);

/** The quote number the confirmation shows after "Tu número de cotización es" (US-03-AC-03, AC-10). */
export async function readQuoteNumber(page: Page, countryCode: string): Promise<string> {
  const text = await page.locator('body').innerText();
  const match = new RegExp(`Tu número de cotización es\\s*(COT-${countryCode}-20261121-\\d{6})(?!\\d)`).exec(text);
  expect(match, 'the confirmation shows "Tu número de cotización es" followed by the quote number').not.toBeNull();
  return (match as RegExpExecArray)[1];
}

export function summaryHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: SUMMARY_HEADING });
}
export function confirmedHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: CONFIRMED_HEADING });
}
/** "Pagar", or "Procesando pago…" while an attempt runs: the same button. */
export function pagar(page: Page): Locator {
  return page.getByRole('button', { name: /^(Pagar|Procesando pago…)$/ });
}
export function acceptTerms(page: Page): Locator {
  return page.getByRole('checkbox', { name: ACCEPT });
}
export function outcome(page: Page, name: 'Pago aprobado' | 'Pago rechazado'): Locator {
  return page.getByRole('radio', { name });
}
export function editar(page: Page): Locator {
  return page.getByRole('button', { name: 'Editar mis datos' });
}
export function cambiarPlan(page: Page): Locator {
  return page.getByRole('button', { name: 'Cambiar plan' });
}

/** The rows of the summary, in document order: terms and definitions are paired by position. */
export async function expectRows(page: Page, rows: [string, string][]): Promise<void> {
  await expect(page.getByRole('term')).toHaveText(rows.map(([label]) => label));
  const definitions = page.getByRole('definition');
  await expect(definitions).toHaveCount(rows.length);
  for (const [index, [label, value]] of rows.entries()) {
    // A masked value also carries the text for screen readers, so it is matched by the visible bullets.
    const row = definitions.nth(index);
    await (value.includes('•') ? expect(row, label).toContainText(value) : expect(row, label).toHaveText(value));
  }
}

/** Complete step 1 and step 2 in Colombia and open the summary with the chosen plan (default "Plan Total"). */
export async function reachSummaryInColombia(page: Page, planName = 'Plan Total'): Promise<void> {
  await reachPlansInColombia(page);
  await plan(page, planName).check();
  await continuar(page).click();
  await expect(page).toHaveURL(/\/co\/resumen$/);
  await expect(summaryHeading(page)).toBeVisible();
}

export async function reachSummaryInChile(page: Page, planName = 'Plan Protegido'): Promise<void> {
  await reachPlansInChile(page);
  await plan(page, planName).check();
  await continuar(page).click();
  await expect(page).toHaveURL(/\/cl\/resumen$/);
  await expect(summaryHeading(page)).toBeVisible();
}

/** What has the keyboard focus, as a readable name (used to compare the Tab order). */
export async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    if (el.tagName === 'BUTTON') return (el.textContent ?? '').trim();
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'radio') return 'simulation group';
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') return 'checkbox';
    if (el.getAttribute('role') === 'region') return 'terms region';
    if (/^H[1-6]$/.test(el.tagName)) return `heading: ${(el.textContent ?? '').trim()}`;
    return el.tagName.toLowerCase();
  });
}

export async function expectVisibleFocusIndicator(page: Page): Promise<void> {
  const visible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = getComputedStyle(el);
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== 'none';
    return outline || shadow;
  });
  expect(visible, 'a focused control must show a visible focus indicator').toBe(true);
}
