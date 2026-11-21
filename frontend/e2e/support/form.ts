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

/**
 * US-01-AC-04 values for Colombia. Selects use the visible option text; the date is what a person
 * types and sees, dd/mm/aaaa (US-04-Q-05), stored as 1990-05-15.
 */
export const CO_VALID: Record<string, string | boolean> = {
  'Tipo de documento': 'Cédula de ciudadanía',
  'Número de documento': '1012345678',
  'Nombre completo': 'Ana Prueba Ficticia',
  'Fecha de nacimiento': '15/05/1990',
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
  // The popup of a select is a listbox labelled by the field label too (spec 8): only the control itself is "the field".
  return page.getByLabel(labelPattern(label)).and(page.locator('input, select, textarea, button'));
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

/** The text a select shows while nothing is chosen (US-04-BR-05). */
export const PROMPT = 'Selecciona una opción';

/** Field label to the key the wizard state stores it under (seed-fields.md), for the fields whose stored value differs from what is shown. */
export const STORED_KEY: Record<string, string> = {
  'Tipo de documento': 'documentType',
  'Fecha de nacimiento': 'birthDate',
  Ciudad: 'city',
  Marca: 'make',
};

/** Option label to stored value of the seeded selects (the option `value` Strapi holds). */
export const STORED_OPTION: Record<string, Record<string, string>> = {
  'Tipo de documento': { 'Cédula de ciudadanía': 'CC', 'Cédula de extranjería': 'CE' },
  Ciudad: { Bogotá: 'BOG', Medellín: 'MDE', Cali: 'CLO', Barranquilla: 'BAQ', Santiago: 'SCL', Valparaíso: 'VAP', Concepción: 'CCP', Antofagasta: 'ANF' },
  Marca: { Chevrolet: 'chevrolet', Renault: 'renault', Mazda: 'mazda', Kia: 'kia', Toyota: 'toyota', Suzuki: 'suzuki', Hyundai: 'hyundai' },
};

/** "15/05/1990" to "1990-05-15". */
export function isoOf(display: string): string {
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
}

/** What the wizard state (sessionStorage `quote-wizard`) holds for a key, or undefined. */
export async function storedValue(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const raw = sessionStorage.getItem('quote-wizard');
    return raw === null ? undefined : (JSON.parse(raw) as { step1?: { values?: Record<string, unknown> } }).step1?.values?.[k];
  }, key);
}

/** Every key the wizard state holds, as an object (empty when there is no entry). */
export async function storedValues(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('quote-wizard');
    return raw === null ? {} : ((JSON.parse(raw) as { step1?: { values?: Record<string, unknown> } }).step1?.values ?? {});
  });
}

/** True for the combobox of a select field (a button when select-only, an input when searchable). */
export async function isCombobox(control: Locator): Promise<boolean> {
  return (await control.getAttribute('role')) === 'combobox';
}

/** What a combobox shows: the text of a select-only button, the input value of a searchable select. */
export async function expectShown(control: Locator, shown: string): Promise<void> {
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  await (tag === 'input' ? expect(control).toHaveValue(shown) : expect(control).toHaveText(shown));
}

/** An empty select shows the prompt: the text of a button, the placeholder of an input whose value is empty (US-04 spec 11.1). */
export async function expectPrompt(control: Locator): Promise<void> {
  const tag = await control.evaluate((el) => el.tagName.toLowerCase());
  if (tag === 'input') {
    await expect(control).toHaveValue('');
    await expect(control).toHaveAttribute('placeholder', PROMPT);
  } else {
    await expect(control).toHaveText(PROMPT);
  }
}

/** Choose an option of a select with the pointer, as a person does, and check what is shown. */
export async function chooseOption(page: Page, label: string, optionText: string): Promise<void> {
  const control = field(page, label);
  await control.click();
  await page.getByRole('option', { name: optionText, exact: true }).click();
  await expectShown(control, optionText);
}

/** Fill one control by label with the gesture that suits its kind (US-04 spec 11.1: a combobox is opened and an option clicked). */
export async function fillField(page: Page, label: string, value: string | boolean): Promise<void> {
  const control = field(page, label);
  if (await isCombobox(control)) {
    await chooseOption(page, label, value as string);
    return;
  }
  const type = await control.evaluate((el) => (el as HTMLInputElement).type);
  if (type === 'checkbox') {
    if (value) await control.check();
    else await control.uncheck();
  } else {
    await control.fill(value as string);
  }
}

/** Every empty control of step 1 shows nothing: text boxes and the date box are '', selects show the prompt (US-03-AC-11, US-01-AC-22). */
export async function expectFieldEmpty(page: Page, label: string): Promise<void> {
  const control = field(page, label);
  if (await isCombobox(control)) await expectPrompt(control);
  else await expect(control, label).toHaveValue('');
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
