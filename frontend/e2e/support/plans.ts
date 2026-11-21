import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { continuar, field, fillColombia, fillField } from './form';
import type { AdminSession, ScopedToken } from './strapi-admin';

/**
 * Helpers for step 2 (the plan list) and for the US-02 write flow of the e2e tests. Everything on
 * the page is found by role, name or visible text: plans are native radios (US-02-Q-13), so a plan
 * is `getByRole('radio', { name: <plan name> })`. Values are fictitious (specs/US-02/seed-plans.md).
 */

export const HEADING = 'Elige tu plan';
export const TITLE = 'Elige tu plan | Cotizador de seguro de auto';

/** The browser clock of every US-02 e2e test, so that the prices are stable (spec section 11). */
export const TODAY = new Date('2026-11-21T10:00:00');

export const CO_PLAN_NAMES = ['Plan Básico', 'Plan Clásico', 'Plan Total'];
export const CL_PLAN_NAMES = ['Plan Esencial', 'Plan Protegido', 'Plan Premium'];
/** Final prices of the seed with the step 1 values below at 2026-11-21 (US-02-AC-07). */
export const CO_PRICES = ['$935.000', '$1.540.000', '$2.310.000'];
export const CL_PRICES = ['$319.000', '$528.000', '$792.000'];
/** Seeded plans that are never offered: draft only or inactive (US-02-AC-01, AC-08). */
export const CO_HIDDEN_NAMES = ['Plan Joven', 'Plan Total Plus'];
export const CL_HIDDEN_NAMES = ['Plan Flex', 'Plan Premium Plus'];

export const CL_CONSENT = 'Acepto el tratamiento de mis datos personales.';

/** "I completed step 1 in Chile" of US-02 spec section 5. */
export const CL_VALID: Record<string, string | boolean> = {
  RUT: '12.345.678-5',
  'Nombre completo': 'Ana Prueba Ficticia',
  'Fecha de nacimiento': '1990-05-15',
  Ciudad: 'Santiago',
  Patente: 'BCDF12',
  Marca: 'Kia',
  Modelo: 'Rio 5',
  Año: '2022',
  [CL_CONSENT]: true,
};

export async function fillChile(page: Page, overrides: Record<string, string | boolean | null> = {}): Promise<void> {
  const values: Record<string, string | boolean | null> = { ...CL_VALID, ...overrides };
  for (const [label, value] of Object.entries(values)) {
    if (value === null) continue;
    await fillField(page, label, value);
  }
}

/** A price as the page may write it: whitespace between the symbol and the digits is allowed (BR-03). */
export function pricePattern(price: string): RegExp {
  const digits = price.replace(/[^\d.]/g, '').replace(/\./g, '\\.');
  return new RegExp(`\\$\\s*${digits}(?![\\d.])`);
}

export function plan(page: Page, name: string): Locator {
  return page.getByRole('radio', { name, exact: true });
}

export function plans(page: Page): Locator {
  return page.getByRole('radio');
}

export function atras(page: Page): Locator {
  return page.getByRole('button', { name: 'Atrás' });
}

/** The plan names shown, in order (each option's accessible name is its plan name, US-02-AC-17). */
export async function expectPlanNames(page: Page, names: string[]): Promise<void> {
  await expect(plans(page)).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(plans(page).nth(index)).toHaveAccessibleName(name);
  }
}

/** The final price of each plan is part of its accessible description (US-02-AC-17). */
export async function expectPrices(page: Page, names: string[], prices: string[]): Promise<void> {
  for (const [index, name] of names.entries()) {
    await expect(plan(page, name)).toHaveAccessibleDescription(pricePattern(prices[index]));
  }
}

/** Every control of step 1 shows the value that was entered (US-01-AC-04, AC-20, AC-21); no error is shown. */
export async function expectEntered(page: Page, values: Record<string, string | boolean>): Promise<void> {
  for (const [label, value] of Object.entries(values)) {
    const control = field(page, label);
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    const type = await control.evaluate((el) => (el as HTMLInputElement).type);
    if (tag === 'select') {
      await expect.poll(() => control.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim()), { message: label }).toBe(value);
    } else if (type === 'checkbox') {
      await (value ? expect(control).toBeChecked() : expect(control).not.toBeChecked());
    } else {
      await expect(control, label).toHaveValue(value as string);
    }
    await expect(control).not.toHaveAttribute('aria-invalid', 'true');
  }
}

/** Complete step 1 for Colombia (US-01-AC-04 values) and activate "Continuar". */
export async function reachPlansInColombia(page: Page): Promise<void> {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/co/datos');
  await expect(field(page, 'Placa')).toBeVisible();
  await fillColombia(page);
  await continuar(page).click();
  await expect(page).toHaveURL(/\/co\/planes$/);
  await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
}

export async function reachPlansInChile(page: Page): Promise<void> {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/cl/datos');
  await expect(field(page, 'Patente')).toBeVisible();
  await fillChile(page);
  await continuar(page).click();
  await expect(page).toHaveURL(/\/cl\/planes$/);
  await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
}

// ---------------------------------------------------------------------------------------------
// Write flow for US-02-AC-12 (ADR-0005 general rule, spec 7.5): Node process only
// ---------------------------------------------------------------------------------------------

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
/** Exactly these three permissions (spec 7.5): create and delete of `plan`, and `country.find` for the relation. */
export const PLAN_TOKEN_SCOPE = ['api::plan.plan.create', 'api::plan.plan.delete', 'api::country.country.find'];

async function expectOk(response: { ok(): boolean; status(): number }, what: string): Promise<void> {
  // Status and a fixed description only: response bodies may carry tokens.
  if (!response.ok()) throw new Error(`${what} failed with HTTP ${response.status()}`);
}

export async function createPlanToken(api: APIRequestContext, session: AdminSession, name: string): Promise<ScopedToken> {
  const response = await api.post('/admin/api-tokens', {
    headers: { Authorization: `Bearer ${session.jwt}` },
    data: {
      name,
      description: 'Temporary token of the US-02-AC-12 end-to-end test; deleted in teardown.',
      type: 'custom',
      lifespan: SEVEN_DAYS_MS,
      permissions: PLAN_TOKEN_SCOPE,
    },
  });
  await expectOk(response, 'Creating the scoped API token');
  const body = (await response.json()) as { data?: { id?: number; accessKey?: string } };
  if (body.data?.id === undefined || !body.data.accessKey) throw new Error('Strapi returned no API token');
  return { id: body.data.id, accessKey: body.data.accessKey };
}

export interface NewPlan {
  key: string;
  name: string;
  shortDescription: string;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  isRecommended: boolean;
  coverages: string[];
}

/** A REST POST publishes immediately unless `status=draft` is passed (ADR-0002, Strapi REST docs). */
export async function createPlan(api: APIRequestContext, token: ScopedToken, countryDocumentId: string, plan: NewPlan): Promise<string> {
  const { coverages, ...attributes } = plan;
  const response = await api.post('/api/plans', {
    headers: { Authorization: `Bearer ${token.accessKey}` },
    data: { data: { ...attributes, coverages: coverages.map((label) => ({ label })), country: { connect: [countryDocumentId] } } },
  });
  await expectOk(response, 'Creating the plan');
  const body = (await response.json()) as { data?: { documentId?: string } };
  if (!body.data?.documentId) throw new Error('Strapi returned no documentId for the new plan');
  return body.data.documentId;
}

export async function deletePlan(api: APIRequestContext, token: ScopedToken, documentId: string): Promise<void> {
  const response = await api.delete(`/api/plans/${documentId}`, { headers: { Authorization: `Bearer ${token.accessKey}` } });
  await expectOk(response, 'Deleting the plan');
}

/** Pre-test cleanup: deletes published plans left with the test's key by a crashed run (read is public). */
export async function deleteStalePlans(api: APIRequestContext, token: ScopedToken, key: string): Promise<void> {
  const response = await api.get('/api/plans', { params: { 'filters[key][$eq]': key, 'pagination[pageSize]': '100' } });
  await expectOk(response, 'Reading leftover plans');
  const body = (await response.json()) as { data?: { documentId?: string }[] };
  for (const stale of body.data ?? []) {
    if (stale.documentId) await deletePlan(api, token, stale.documentId);
  }
}
