import { expect, test, type Locator, type Page } from '@playwright/test';
import { CO_CONSENT, CO_LABELS, continuar, expectDescribedBy, field, fillColombia, visibleLabels } from './support/form';

/**
 * Step 1 for Colombia against the real stack with the seed (ADR-0002 topology).
 * Covers US-01-AC-01 (CO), AC-02, AC-09 (unparseable number, real browser), AC-13, AC-24.
 */

const TODAY = new Date('2026-11-20T10:00:00');

test.describe('US-01-AC-01 form configured by country (Colombia)', () => {
  test('US-01-AC-01 in the context of Colombia I see exactly these field labels, in this order', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    expect(await visibleLabels(page)).toEqual(CO_LABELS);
  });

  test('US-01-AC-01 I do not see any field that is configured only for Chile', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await expect(page.getByLabel('RUT')).toHaveCount(0);
    await expect(page.getByLabel('Patente')).toHaveCount(0);
  });
});

test.describe('US-01-AC-13 only published fields are shown', () => {
  test('US-01-AC-13 the draft-only field "Correo electrónico" is not shown in Colombia', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toHaveCount(0);
    await expect(page.getByText('Correo electrónico')).toHaveCount(0);
  });
});

test.describe('US-01-AC-02 field validation (today pinned to 2026-11-20)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
  });

  const rows: [string, string | boolean | null, string][] = [
    ['Placa', 'AB12', 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).'],
    ['Ciudad', null, 'Selecciona tu ciudad.'],
    ['Fecha de nacimiento', '2010-03-01', 'Debes ser mayor de edad (18 años o más) para cotizar.'],
    ['Modelo (año)', '2005', 'El modelo debe estar entre los últimos 20 años y el próximo año.'],
    [CO_CONSENT, false, 'Debes autorizar el tratamiento de tus datos para continuar.'],
    ['Nombre completo', 'Al', 'Ingresa tu nombre completo (entre 3 y 80 caracteres).'],
  ];

  for (const [label, input, message] of rows) {
    test(`US-01-AC-02 "${label}" holding ${JSON.stringify(input)} shows its message next to the field and I stay on step 1`, async ({ page }) => {
      await page.goto('/co/datos');
      await fillColombia(page, { [label]: input });
      await continuar(page).click();

      await expectDescribedBy(page, label, message);
      await expect(field(page, label)).toHaveAttribute('aria-invalid', 'true');
      await expect(page).toHaveURL(/\/co\/datos$/);
      await expect(continuar(page)).toBeVisible();
    });
  }
});

test.describe('US-01-AC-09 a number the browser cannot parse counts as empty', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
  });

  test('US-01-AC-09 "1e" typed key by key in "Modelo (año)" shows the field message and I stay on step 1', async ({ page }) => {
    await page.goto('/co/datos');
    await fillColombia(page, { 'Modelo (año)': null });

    const year = field(page, 'Modelo (año)');
    await year.focus();
    await year.pressSequentially('1e');
    // The HTML sanitisation rule for <input type="number">: unparseable text reads back as ''.
    await expect(year).toHaveValue('');

    await continuar(page).click();
    await expectDescribedBy(page, 'Modelo (año)', 'El modelo debe estar entre los últimos 20 años y el próximo año.');
    await expect(year).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/co\/datos$/);
  });

  test('US-01-AC-09 "abc" cannot even be typed into the number field, and the form still reports the year as missing', async ({ page }) => {
    await page.goto('/co/datos');
    await fillColombia(page, { 'Modelo (año)': null });
    const year = field(page, 'Modelo (año)');
    await year.focus();
    await year.pressSequentially('abc');
    await expect(year).toHaveValue('');
    await continuar(page).click();
    await expectDescribedBy(page, 'Modelo (año)', 'El modelo debe estar entre los últimos 20 años y el próximo año.');
    await expect(page).toHaveURL(/\/co\/datos$/);
  });
});

test.describe('US-01-AC-24 keyboard-only completion (Colombia, desktop)', () => {
  // The date control reads typed digits in the browser locale: month, day, year in en-US.
  test.use({ locale: 'en-US', viewport: { width: 1280, height: 800 } });

  /** The accessible label text of the element that has focus, or null. */
  async function focusedLabel(page: Page): Promise<string | null> {
    return page.evaluate(() => {
      const el = document.activeElement as (HTMLInputElement | HTMLSelectElement | null);
      const text = el?.labels?.[0]?.textContent ?? null;
      return text === null ? null : text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    });
  }

  async function focusedButton(page: Page): Promise<string | null> {
    return page.evaluate(() => (document.activeElement?.tagName === 'BUTTON' ? (document.activeElement.textContent ?? '').trim() : null));
  }

  /**
   * Press Tab (or Shift+Tab) until the labelled control has focus. Focus staying on the field being left is
   * tolerated (a native date control has several tab stops: day, month, year, picker); focus landing on any
   * other field before the target fails.
   */
  async function tabTo(page: Page, label: string, options: { shift?: boolean; max?: number } = {}): Promise<void> {
    const key = options.shift ? 'Shift+Tab' : 'Tab';
    const leaving = await focusedLabel(page);
    for (let i = 0; i < (options.max ?? 6); i++) {
      await page.keyboard.press(key);
      const current = await focusedLabel(page);
      if (current === label) return;
      if (leaving !== null && current === leaving) continue;
      expect(CO_LABELS, `focus landed on "${current}" while moving to "${label}"`).not.toContain(current);
    }
    throw new Error(`"${label}" did not receive focus`);
  }

  async function expectVisibleFocusIndicator(control: Locator): Promise<void> {
    const visible = await control.evaluate((el) => {
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== 'none';
      return outline || shadow;
    });
    expect(visible, 'a focused control must show a visible focus indicator').toBe(true);
  }

  test('US-01-AC-24 I complete every field and "Continuar" with the keyboard only, in visual order, and reach the step 2 address', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();

    // Reach the first control from the top of the page.
    await tabTo(page, 'Tipo de documento', { max: 6 });
    await expect(field(page, 'Tipo de documento')).toBeFocused();
    await expectVisibleFocusIndicator(field(page, 'Tipo de documento'));

    const steps: { label: string; act: () => Promise<void>; check: () => Promise<void> }[] = [
      {
        label: 'Tipo de documento',
        act: () => page.keyboard.type('Cédula de c'),
        check: () => expect(field(page, 'Tipo de documento')).toHaveValue('CC'),
      },
      {
        label: 'Número de documento',
        act: () => page.keyboard.type('1012345678'),
        check: () => expect(field(page, 'Número de documento')).toHaveValue('1012345678'),
      },
      {
        label: 'Nombre completo',
        act: () => page.keyboard.type('Ana Prueba Ficticia'),
        check: () => expect(field(page, 'Nombre completo')).toHaveValue('Ana Prueba Ficticia'),
      },
      {
        label: 'Fecha de nacimiento',
        act: () => page.keyboard.type('05151990'),
        check: () => expect(field(page, 'Fecha de nacimiento')).toHaveValue('1990-05-15'),
      },
      {
        label: 'Ciudad',
        // Type-ahead: on macOS Chromium ArrowDown opens the select popup instead of changing the value.
        act: () => page.keyboard.type('Medell'),
        check: () => expect(field(page, 'Ciudad')).toHaveValue('MDE'),
      },
      {
        label: 'Placa',
        act: () => page.keyboard.type('ABC123'),
        check: () => expect(field(page, 'Placa')).toHaveValue('ABC123'),
      },
      {
        label: 'Marca',
        act: () => page.keyboard.type('Mazd'),
        check: () => expect(field(page, 'Marca')).toHaveValue('mazda'),
      },
      {
        label: 'Línea',
        act: () => page.keyboard.type('3 Touring'),
        check: () => expect(field(page, 'Línea')).toHaveValue('3 Touring'),
      },
      {
        label: 'Modelo (año)',
        act: () => page.keyboard.type('2022'),
        check: () => expect(field(page, 'Modelo (año)')).toHaveValue('2022'),
      },
      {
        label: CO_CONSENT,
        act: () => page.keyboard.press('Space'),
        check: () => expect(field(page, CO_CONSENT)).toBeChecked(),
      },
    ];

    for (const [index, step] of steps.entries()) {
      if (index > 0) await tabTo(page, step.label); // the Tab order is the sortOrder and the visual order
      await expect(field(page, step.label)).toBeFocused();
      await expectVisibleFocusIndicator(field(page, step.label));
      await step.act();
      await step.check();
    }

    // Shift+Tab goes back one field in the same order, and Tab returns.
    await tabTo(page, 'Modelo (año)', { shift: true });
    await expect(field(page, 'Modelo (año)')).toBeFocused();
    await tabTo(page, CO_CONSENT);

    // Past the last field, Tab reaches "Continuar"; Enter activates it.
    await page.keyboard.press('Tab');
    expect(await focusedButton(page)).toBe('Continuar');
    await expect(continuar(page)).toBeFocused();
    await expectVisibleFocusIndicator(continuar(page));
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/co\/planes$/);
  });

  test('US-01-AC-24 "Continuar" with the keyboard on an incomplete form shows the errors and keeps the focus on the first invalid field', async ({ page }) => {
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await tabTo(page, 'Tipo de documento', { max: 6 });
    // Skip every field with Tab until the button.
    for (let i = 0; i < 40 && (await focusedButton(page)) !== 'Continuar'; i++) await page.keyboard.press('Tab');
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, 'Tipo de documento')).toBeFocused();
    await expectDescribedBy(page, 'Tipo de documento', 'Selecciona el tipo de documento.');
  });
});
