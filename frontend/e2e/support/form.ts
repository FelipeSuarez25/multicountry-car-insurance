import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Helpers for the step 1 form. Everything is found the way a person or assistive technology finds
 * it: by label, by role, by visible text. Values are fictitious (specs/US-01/seed-fields.md).
 */

export const CO_LABELS = [
  'Tipo de documento',
  'Número de documento',
  'Nombre completo',
  'Fecha de nacimiento',
  'Ciudad',
  'Placa',
  'Marca',
  'Línea',
  'Modelo (año)',
  'Autorizo el tratamiento de mis datos personales.',
];

export const CL_LABELS = [
  'RUT',
  'Nombre completo',
  'Fecha de nacimiento',
  'Ciudad',
  'Patente',
  'Marca',
  'Modelo',
  'Año',
  'Acepto el tratamiento de mis datos personales.',
];

/** US-01-AC-04 values for Colombia. Selects use the visible option text. */
export const CO_VALID: Record<string, string | boolean> = {
  'Tipo de documento': 'Cédula de ciudadanía',
  'Número de documento': '1012345678',
  'Nombre completo': 'Ana Prueba Ficticia',
  'Fecha de nacimiento': '1990-05-15',
  Ciudad: 'Medellín',
  Placa: 'ABC123',
  Marca: 'Mazda',
  Línea: '3 Touring',
  'Modelo (año)': '2022',
  'Autorizo el tratamiento de mis datos personales.': true,
};

export const CO_CONSENT = 'Autorizo el tratamiento de mis datos personales.';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A label, allowing the optional required marker ("Placa *") a form may add after it. */
export function labelPattern(label: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(label)}\\s*(\\*|\\(obligatorio\\))?\\s*$`);
}

export function field(page: Page, label: string): Locator {
  return page.getByLabel(labelPattern(label));
}

export function continuar(page: Page): Locator {
  return page.getByRole('button', { name: 'Continuar' });
}

/**
 * The visible labels of the form, in document order. `<label>` has no ARIA role that lists them,
 * so this is the one CSS locator; the order of labels is what AC-01 asserts.
 */
export async function visibleLabels(page: Page): Promise<string[]> {
  const texts = await page.locator('label').allInnerTexts();
  return texts.map((t) => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim()).filter((t) => t.length > 0);
}

/** Fill one control by label with the gesture that suits its kind. */
export async function fillField(page: Page, label: string, value: string | boolean): Promise<void> {
  const control = field(page, label);
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  const type = await control.evaluate((el) => (el as HTMLInputElement).type);
  if (tag === 'select') {
    await control.selectOption({ label: value as string });
  } else if (type === 'checkbox') {
    if (value) await control.check();
    else await control.uncheck();
  } else {
    await control.fill(value as string);
  }
}

/** Fill the whole Colombia form; `overrides` replace values, `null` leaves a field untouched. */
export async function fillColombia(page: Page, overrides: Record<string, string | boolean | null> = {}): Promise<void> {
  const values: Record<string, string | boolean | null> = { ...CO_VALID, ...overrides };
  for (const [label, value] of Object.entries(values)) {
    if (value === null) continue;
    await fillField(page, label, value);
  }
}

export async function expectDescribedBy(page: Page, label: string, message: string): Promise<void> {
  await expect(field(page, label)).toHaveAccessibleDescription(new RegExp(escapeRegExp(message)));
}

/** Escape text for use inside a RegExp built by a test. */
export const escape = escapeRegExp;
