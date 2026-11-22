import { expect, test, type Page, type Request } from '@playwright/test';
import { BASE_URL } from './support/env';
import { continuar, expectPrompt, expectShown, field, fillColombia, storedValue, storedValues } from './support/form';
import { CL_PLAN_NAMES, CO_PLAN_NAMES, HEADING, TITLE, TODAY, fillChile, plan, plans, pricePattern } from './support/plans';
import { acceptTerms, confirmedHeading, pagar, summaryHeading } from './support/summary';
import {
  VIEWPORTS,
  activeOptionText,
  calendarDialog,
  chooseBirthDateWithCalendar,
  dateButton,
  expectActiveOptionIndicator,
  expectFocusIndicatorOnActive,
  expectNoHorizontalScroll,
  expectNoMotion,
  expectTargetsAtLeast44,
  focusedName,
  longDate,
  panelBox,
} from './support/design';

/**
 * US-04 against the real stack with the seed (ADR-0002 topology): the custom select and the calendar
 * with a real keyboard, the typed date in three browser locales, the panels at three viewports, the
 * step transition, the plan cards, reduced motion, the responsive matrix, same-origin fonts and
 * assets, and the focus indicators of the new controls. Today of the browser is pinned to 2026-11-21.
 *
 * Covers US-04-AC-05, AC-06, AC-08, AC-09, AC-11, AC-12, AC-14, AC-16, AC-17, AC-18, AC-19, AC-20.
 * The manual parts (a phone's on-screen keyboard, screen readers, the visual review) are HC3.
 */

const CITY = 'Ciudad';
const BIRTH = 'Fecha de nacimiento';

async function openCo(page: Page): Promise<void> {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/co/datos');
  await expect(field(page, 'Placa')).toBeVisible();
}

async function openCl(page: Page): Promise<void> {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/cl/datos');
  await expect(field(page, 'Patente')).toBeVisible();
}

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-11 behaviour and stored values do not change', () => {
  test('US-04-AC-11 / US-04-BR-07 completing step 1 in Colombia with the custom controls (pointer for the selects, the calendar for the date) stores exactly the values of the pre-US-04 build and reaches "Plan Total" at "$2.310.000"', async ({ page }) => {
    await openCo(page);
    await fillColombia(page, { [BIRTH]: null });
    await chooseBirthDateWithCalendar(page);
    await continuar(page).click();

    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
    expect(await storedValues(page)).toEqual({
      documentType: 'CC',
      documentNumber: '1012345678',
      fullName: 'Ana Prueba Ficticia',
      birthDate: '1990-05-15',
      city: 'MDE',
      plate: 'ABC123',
      make: 'mazda',
      model: '3 Touring',
      vehicleYear: '2022',
      dataConsent: true,
    });
    await expect(plan(page, 'Plan Total')).toHaveAccessibleDescription(pricePattern('$2.310.000'));
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-05 / AC-06 the custom select with a real keyboard (Colombia, "Marca" is searchable, "Tipo de documento" is select-only)', () => {
  test.beforeEach(async ({ page }) => {
    await openCo(page);
  });

  test('US-04-AC-05 "Ciudad" and "Marca" start collapsed with the prompt as placeholder; "Tipo de documento" shows the prompt as its text; nothing is stored', async ({ page }) => {
    await expectPrompt(field(page, CITY));
    await expectPrompt(field(page, 'Marca'));
    await expectPrompt(field(page, 'Tipo de documento'));
    for (const label of [CITY, 'Marca', 'Tipo de documento']) {
      await expect(field(page, label)).toHaveAttribute('aria-expanded', 'false');
      await expect(field(page, label)).toHaveAttribute('aria-required', 'true');
    }
    const stored = await storedValues(page);
    for (const key of ['city', 'make', 'documentType']) expect(stored[key] ?? '').toBe('');
  });

  test('US-04-AC-05 a pointer opens "Ciudad" with the 4 cities in order and none selected; choosing "Medellín" closes it, shows it, keeps the focus and stores "MDE"; reopening marks it selected', async ({ page }) => {
    const ciudad = field(page, CITY);
    await ciudad.click();
    await expect(ciudad).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option')).toHaveText(['Bogotá', 'Medellín', 'Cali', 'Barranquilla']);
    await expect(page.getByRole('option', { selected: true })).toHaveCount(0);
    const controls = await ciudad.getAttribute('aria-controls');
    expect(controls, 'aria-controls while the list is rendered').toBeTruthy();
    await expect(page.locator(`[id="${controls}"]`)).toHaveAttribute('role', 'listbox');

    await page.getByRole('option', { name: 'Medellín', exact: true }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectShown(ciudad, 'Medellín');
    await expect(ciudad).toBeFocused();
    expect(await storedValue(page, 'city')).toBe('MDE');

    await ciudad.click();
    await expect(page.getByRole('option', { selected: true })).toHaveText(['Medellín']);
  });

  test('US-04-AC-06 collapsed, empty: Enter opens the listbox and "Chevrolet" is the active option', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('Enter');
    await expect(marca).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect.poll(() => activeOptionText(marca)).toBe('Chevrolet');
  });

  test('US-04-AC-06 collapsed, empty: ArrowDown opens the listbox and "Chevrolet" is the active option', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('ArrowDown');
    await expect(marca).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOptionText(marca)).toBe('Chevrolet');
  });

  test('US-04-AC-06 collapsed, empty: on the searchable "Marca" a space is typed into the filter (the key is not swallowed); on the select-only "Tipo de documento" Space opens the list with the first option active', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('Space');
    await expect(marca).toHaveValue(' ');

    const tipo = field(page, 'Tipo de documento');
    await tipo.focus();
    await page.keyboard.press('Space');
    await expect(tipo).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOptionText(tipo)).toBe('Cédula de ciudadanía');
  });

  test('US-04-AC-06 on a select-only select, Space with the list open chooses the active option: ArrowDown, then Space stores "CE"', async ({ page }) => {
    const tipo = field(page, 'Tipo de documento');
    await tipo.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(tipo)).toBe('Cédula de extranjería');
    await page.keyboard.press('Space');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectShown(tipo, 'Cédula de extranjería');
    expect(await storedValue(page, 'documentType')).toBe('CE');
  });

  test('US-04-AC-06 open, active "Chevrolet": ArrowDown twice makes "Mazda" active and stores nothing; End makes "Toyota" active; ArrowDown on "Toyota" keeps it (no wrap); Home returns to "Chevrolet"', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => activeOptionText(marca)).toBe('Chevrolet');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(marca)).toBe('Mazda');
    expect((await storedValues(page))['make'] ?? '').toBe('');
    await page.keyboard.press('End');
    await expect.poll(() => activeOptionText(marca)).toBe('Toyota');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(marca)).toBe('Toyota');
    await page.keyboard.press('Home');
    await expect.poll(() => activeOptionText(marca)).toBe('Chevrolet');
  });

  test('US-04-AC-06 open, active "Kia": Enter closes the listbox, "Marca" shows "Kia", stores "kia" and keeps the focus', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(marca)).toBe('Kia');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectShown(marca, 'Kia');
    expect(await storedValue(page, 'make')).toBe('kia');
    await expect(marca).toBeFocused();
  });

  test('US-04-AC-06 collapsed, showing "Mazda": Alt+ArrowDown opens the list with "Mazda" active; ArrowDown makes "Kia" active; Escape closes it, "Marca" still shows "Mazda" and keeps the focus', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.click();
    await page.getByRole('option', { name: 'Mazda', exact: true }).click();
    await expectShown(marca, 'Mazda');
    await page.keyboard.press('Alt+ArrowDown');
    await expect(marca).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOptionText(marca)).toBe('Mazda');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(marca)).toBe('Kia');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectShown(marca, 'Mazda');
    expect(await storedValue(page, 'make')).toBe('mazda');
    await expect(marca).toBeFocused();
  });

  test('US-04-AC-06 open, active "Kia": Tab chooses "Kia", closes the list and moves the focus to "Línea"', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await expect.poll(() => activeOptionText(marca)).toBe('Kia');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(field(page, 'Línea')).toBeFocused();
    await expectShown(marca, 'Kia');
    expect(await storedValue(page, 'make')).toBe('kia');
  });

  test('US-04-AC-06 collapsed, empty: typing "maz" opens the list with "Mazda" active (the list is filtered)', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.focus();
    await page.keyboard.type('maz');
    await expect(marca).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('option')).toHaveText(['Mazda']);
    await expect.poll(() => activeOptionText(marca)).toBe('Mazda');
  });

  test('US-04-AC-06 a pointer click outside the open panel closes it without changing the value', async ({ page }) => {
    const marca = field(page, 'Marca');
    await marca.click();
    await page.getByRole('option', { name: 'Renault', exact: true }).click();
    await marca.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expectShown(marca, 'Renault');
    expect(await storedValue(page, 'make')).toBe('renault');
  });

  test('US-04-AC-07 typing in a searchable select filters it, Escape restores the shown value and the stored value is kept', async ({ page }) => {
    const ciudad = field(page, CITY);
    await ciudad.click();
    await page.getByRole('option', { name: 'Cali', exact: true }).click();
    await ciudad.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('xyz');
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByText('No encontramos opciones para «xyz».')).toBeVisible();
    await page.keyboard.press('Escape');
    await expectShown(ciudad, 'Cali');
    expect(await storedValue(page, 'city')).toBe('CLO');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-08 the typed date, in three browser locales (US-04-Q-05)', () => {
  for (const locale of ['es-CO', 'en-US', 'es-CL']) {
    test.describe(`browser locale ${locale}`, () => {
      test.use({ locale });

      test(`US-04-AC-08 with the browser in ${locale}, typing "15/05/1990" shows "15/05/1990", stores 1990-05-15 and shows no error`, async ({ page }) => {
        await openCo(page);
        const date = field(page, BIRTH);
        await date.fill('15/05/1990');
        await field(page, 'Placa').focus();
        await expect(date).toHaveValue('15/05/1990');
        expect(await storedValue(page, 'birthDate')).toBe('1990-05-15');
        await expect(date).not.toHaveAttribute('aria-invalid', 'true');
      });

      test(`US-04-AC-08 with the browser in ${locale}, "5/5/1990" is shown as "05/05/1990" after leaving, and "29/02/2001" stays as typed, stores nothing and shows the required message`, async ({ page }) => {
        await openCo(page);
        const date = field(page, BIRTH);
        await date.fill('5/5/1990');
        await field(page, 'Placa').focus();
        await expect(date).toHaveValue('05/05/1990');
        expect(await storedValue(page, 'birthDate')).toBe('1990-05-05');

        await date.fill('29/02/2001');
        await field(page, 'Placa').focus();
        await expect(date).toHaveValue('29/02/2001');
        expect(await storedValue(page, 'birthDate')).toBe('');
        await expect(date).toHaveAttribute('aria-invalid', 'true');
        await expect(date).toHaveAccessibleDescription(/Ingresa tu fecha de nacimiento\./);
      });
    });
  }
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-09 / AC-10 the calendar with a real keyboard', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('US-04-AC-09 Chile: Tab from the date box reaches "Elegir fecha", Enter opens a modal dialog named "noviembre de 2008" with the focus on the latest selectable day, 21 de noviembre de 2008', async ({ page }) => {
    await openCl(page);
    await field(page, BIRTH).focus();
    await page.keyboard.press('Tab');
    await expect(dateButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleName('noviembre de 2008');
    await expect.poll(() => focusedName(page)).toBe('21 de noviembre de 2008');
  });

  test('US-04-AC-09 the focus stays in the dialog: Tab and Shift+Tab cycle through "Elegir año", "Mes anterior", "Mes siguiente", the grid and "Cerrar" only', async ({ page }) => {
    await openCl(page);
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    for (const key of ['Tab', 'Shift+Tab']) {
      const seen = new Set<string>();
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press(key);
        const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
        expect(inside, `${key} press ${i + 1}: the focus is still inside the dialog`).toBe(true);
        seen.add(await focusedName(page));
      }
      for (const name of ['Elegir año', 'Mes anterior', 'Mes siguiente', 'Cerrar']) expect([...seen], `${key} reaches "${name}"`).toContain(name);
      expect([...seen].some((n) => /^\d+ de \p{L}+ de \d{4}$/u.test(n)), `${key} reaches the grid`).toBe(true);
      for (const name of seen) expect(['Elegir año', 'Mes anterior', 'Mes siguiente', 'Cerrar'].includes(name) || /^\d+ de \p{L}+ de \d{4}$/u.test(name), `unexpected stop "${name}"`).toBe(true);
    }
  });

  test('US-04-AC-09 a backdrop covers the page behind (a click there does not reach the field) and the page behind is hidden from assistive technology', async ({ page }) => {
    await openCl(page);
    const placa = field(page, 'Patente');
    const box = await placa.boundingBox();
    expect(box).not.toBeNull();
    await dateButton(page).click();
    await expect(calendarDialog(page)).toBeVisible();

    // aria-hidden on the page behind: the h1 is no longer in the accessibility tree
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
    expect(await page.getByRole('heading', { level: 1, includeHidden: true }).count()).toBe(1);

    const x = (box as { x: number; width: number }).x + 4;
    const y = (box as { y: number; height: number }).y + 4;
    const topIsPage = await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('main'), [x, y]);
    expect(topIsPage, 'the element on top at the field position is not part of the page content').toBe(false);
    await page.mouse.click(x, y);
    await expect(placa).not.toBeFocused();
    await expect(placa).toHaveValue('');
  });

  test('US-04-AC-09 Escape closes the dialog, the value is unchanged, the focus returns to "Elegir fecha" and the page is available again', async ({ page }) => {
    await openCl(page);
    await field(page, BIRTH).fill('15/05/1990');
    await dateButton(page).click();
    await expect(calendarDialog(page)).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(calendarDialog(page)).toHaveCount(0);
    await expect(dateButton(page)).toBeFocused();
    await expect(field(page, BIRTH)).toHaveValue('15/05/1990');
    expect(await storedValue(page, 'birthDate')).toBe('1990-05-15');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('US-04-AC-09 Chile: the year selector and "Mes anterior" lead to 15 de mayo de 1990; the day is chosen with Enter; the field shows "15/05/1990" and the focus is on "Elegir fecha"', async ({ page }) => {
    await openCl(page);
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await dialog.getByRole('button', { name: 'Elegir año' }).click();
    await page.getByRole('option', { name: '1990', exact: true }).click();
    await expect(dialog).toHaveAccessibleName('noviembre de 1990');
    for (let i = 0; i < 6; i++) await dialog.getByRole('button', { name: 'Mes anterior' }).click();
    await expect(dialog).toHaveAccessibleName('mayo de 1990');
    await dialog.getByRole('gridcell', { name: '15 de mayo de 1990' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(dateButton(page)).toBeFocused();
    await expect(field(page, BIRTH)).toHaveValue('15/05/1990');
    expect(await storedValue(page, 'birthDate')).toBe('1990-05-15');
  });

  const rows: { country: 'cl' | 'co'; tag: string; from: [number, number, number]; key: string; to: [number, number, number] }[] = [
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'ArrowRight', to: [1990, 5, 16] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'ArrowLeft', to: [1990, 5, 14] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'ArrowDown', to: [1990, 5, 22] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'ArrowUp', to: [1990, 5, 8] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'Home', to: [1990, 5, 14] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'End', to: [1990, 5, 20] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'PageDown', to: [1990, 6, 15] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 31], key: 'PageUp', to: [1990, 4, 30] },
    { country: 'cl', tag: 'es-CL', from: [1990, 5, 15], key: 'Shift+PageUp', to: [1989, 5, 15] },
    { country: 'cl', tag: 'es-CL', from: [2000, 2, 29], key: 'Shift+PageDown', to: [2001, 2, 28] },
    { country: 'co', tag: 'es-CO', from: [1990, 5, 15], key: 'Home', to: [1990, 5, 13] },
    { country: 'co', tag: 'es-CO', from: [1990, 5, 15], key: 'End', to: [1990, 5, 19] },
  ];

  for (const country of ['cl', 'co'] as const) {
    test(`US-04-AC-09 ${country === 'cl' ? 'Chile' : 'Colombia'}: every arrow, Home, End and Page key of the AC table moves the focus to the expected day`, async ({ page }) => {
      await (country === 'cl' ? openCl(page) : openCo(page));
      for (const row of rows.filter((r) => r.country === country)) {
        const [y, m, d] = row.from;
        await field(page, BIRTH).fill(`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`);
        await dateButton(page).click();
        await expect(calendarDialog(page)).toBeVisible();
        await expect.poll(() => focusedName(page), { message: `${row.key} from ${row.from}: opens on the typed day` }).toBe(longDate(row.tag, ...row.from));
        await page.keyboard.press(row.key);
        await expect.poll(() => focusedName(page), { message: `${row.key} from ${row.from}` }).toBe(longDate(row.tag, ...row.to));
        await page.keyboard.press('Escape');
        await expect(calendarDialog(page)).toHaveCount(0);
      }
    });
  }

  test('US-04-AC-09 Colombia starts the week on "domingo" and Chile on "lunes": the column headers expose the full day names in that order', async ({ page }) => {
    await openCo(page);
    await field(page, BIRTH).fill('15/05/1990');
    await dateButton(page).click();
    const co = calendarDialog(page).getByRole('columnheader');
    await expect(co).toHaveCount(7);
    for (const [i, name] of ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'].entries()) await expect(co.nth(i)).toHaveAccessibleName(name);
    await expect(calendarDialog(page).getByRole('gridcell', { name: '15 de mayo de 1990' })).toHaveAttribute('aria-selected', 'true');

    await openCl(page);
    await field(page, BIRTH).fill('15/05/1990');
    await dateButton(page).click();
    const cl = calendarDialog(page).getByRole('columnheader');
    for (const [i, name] of ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].entries()) await expect(cl.nth(i)).toHaveAccessibleName(name);
  });

  test('US-04-AC-10 the days after the 18th anniversary limit are disabled (aria-disabled) and cannot be chosen with a click', async ({ page }) => {
    await openCl(page);
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog.getByRole('gridcell', { name: '21 de noviembre de 2008' })).not.toHaveAttribute('aria-disabled', 'true');
    const tomorrow = dialog.getByRole('gridcell', { name: '22 de noviembre de 2008' });
    await expect(tomorrow).toHaveAttribute('aria-disabled', 'true');
    await tomorrow.click({ force: true });
    await expect(dialog).toBeVisible();
    await expect(field(page, BIRTH)).toHaveValue('');
    expect(await storedValue(page, 'birthDate') ?? '').toBe('');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-12 panels on narrow and wide screens (the phone keyboard part is the HC3 manual check)', () => {
  test('US-04-AC-12 360 x 740, "Ciudad": a bottom sheet of the full viewport width, its bottom edge at the viewport bottom, at most 85% of the height, with "Cerrar"; every option is at least 44 x 44; no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.narrow);
    await openCo(page);
    await field(page, CITY).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toBeVisible();
    const box = await panelBox(page, 'select');
    expect(Math.abs(box.width - VIEWPORTS.narrow.width), 'full viewport width').toBeLessThanOrEqual(1);
    expect(Math.abs(box.bottom - VIEWPORTS.narrow.height), 'bottom edge at the viewport bottom').toBeLessThanOrEqual(1);
    expect(box.height, 'at most 85% of the viewport height').toBeLessThanOrEqual(VIEWPORTS.narrow.height * 0.85 + 1);
    for (const option of await page.getByRole('option').all()) {
      const b = await option.boundingBox();
      expect(b?.height ?? 0).toBeGreaterThanOrEqual(43.5);
      expect(b?.width ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await expectNoHorizontalScroll(page, '(Ciudad open)');
    await expectTargetsAtLeast44(page, '(Ciudad open)');
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('US-04-AC-12 360 x 740, "Elegir fecha": a bottom sheet as above; every day is at least 44 x 44; no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.narrow);
    await openCo(page);
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cerrar' })).toBeVisible();
    const box = await panelBox(page, 'calendar');
    expect(Math.abs(box.width - VIEWPORTS.narrow.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.bottom - VIEWPORTS.narrow.height)).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(VIEWPORTS.narrow.height * 0.85 + 1);
    for (const cell of await dialog.getByRole('gridcell').all()) {
      const b = await cell.boundingBox();
      expect(b?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      expect(b?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await expectNoHorizontalScroll(page, '(calendar open)');
    await expectTargetsAtLeast44(page, '(calendar open)');
  });

  test('US-04-AC-12 768 x 1024, "Ciudad": a popover anchored to the field, not wider than the viewport; options at least 44 x 44; no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await openCo(page);
    const ciudad = field(page, CITY);
    await ciudad.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    const anchor = (await ciudad.boundingBox()) as { x: number; y: number; width: number; height: number };
    const box = await panelBox(page, 'select');
    expect(box.width).toBeLessThanOrEqual(VIEWPORTS.tablet.width);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(VIEWPORTS.tablet.width + 1);
    expect(box.left < anchor.x + anchor.width && box.right > anchor.x, 'the panel overlaps the field horizontally').toBe(true);
    const below = Math.abs(box.top - (anchor.y + anchor.height)) <= 24;
    const above = Math.abs(box.bottom - anchor.y) <= 24;
    expect(below || above, 'the panel sits against the field').toBe(true);
    for (const option of await page.getByRole('option').all()) expect((await option.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expectNoHorizontalScroll(page, '(Ciudad open)');
  });

  test('US-04-AC-12 1280 x 800, "Elegir fecha": a popover anchored to the date field; days at least 44 x 44; no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await openCo(page);
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    const anchor = (await field(page, BIRTH).boundingBox()) as { x: number; y: number; width: number; height: number };
    const box = await panelBox(page, 'calendar');
    expect(box.width).toBeLessThan(VIEWPORTS.desktop.width);
    expect(box.left < anchor.x + anchor.width + 80 && box.right > anchor.x - 80, 'the popover is next to the date field horizontally').toBe(true);
    expect(Math.abs(box.top - (anchor.y + anchor.height)) <= 40 || Math.abs(box.bottom - anchor.y) <= 40, 'the popover sits against the date field').toBe(true);
    for (const cell of await dialog.getByRole('gridcell').all()) {
      const b = await cell.boundingBox();
      expect(b?.width ?? 0).toBeGreaterThanOrEqual(43.5);
      expect(b?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await expectNoHorizontalScroll(page, '(calendar open)');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-14 the step transition keeps one page and the focus', () => {
  test('US-04-AC-14 at no moment during "Continuar" does the document hold more than one h1 or main; the focus ends on "Elige tu plan" with the right title; the page animation lasts at most the "slow" token', async ({ page }) => {
    await openCo(page);
    await fillColombia(page);
    await page.evaluate(() => {
      const w = window as unknown as { __seen: { h1: number; main: number; finite: number[] } };
      w.__seen = { h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, finite: [] };
      const sample = (): void => {
        w.__seen.h1 = Math.max(w.__seen.h1, document.querySelectorAll('h1').length);
        w.__seen.main = Math.max(w.__seen.main, document.querySelectorAll('main').length);
        for (const animation of document.getAnimations()) {
          const timing = animation.effect?.getComputedTiming();
          if (timing && Number.isFinite(timing.iterations) && !(animation.effect as KeyframeEffect).target?.closest('[aria-hidden="true"]')) {
            w.__seen.finite.push(Number(timing.duration) + Number(timing.delay ?? 0));
          }
        }
      };
      new MutationObserver(sample).observe(document, { subtree: true, childList: true, attributes: true });
      const loop = (): void => {
        sample();
        requestAnimationFrame(loop);
      };
      loop();
    });
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeFocused();
    await expect(page).toHaveTitle(TITLE);
    // the transition is over when no finite animation is running any more; the sampled data is then complete
    await expect
      .poll(() =>
        page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().iterations ?? Infinity)).length),
      )
      .toBe(0);
    const seen = await page.evaluate(() => (window as unknown as { __seen: { h1: number; main: number; finite: number[] } }).__seen);
    const slow = await page.evaluate(() => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--duration-slow').trim();
      return raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000;
    });
    expect(slow, 'the --duration-slow token is 320ms').toBe(320);
    expect(seen.h1, 'most h1 elements at one moment').toBe(1);
    expect(seen.main, 'most main elements at one moment').toBe(1);
    expect(seen.finite.length, 'the arriving page has an enter animation when motion is allowed').toBeGreaterThan(0);
    expect(Math.max(...seen.finite), 'no finite animation lasts longer than the "slow" token').toBeLessThanOrEqual(slow);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-16 interactive plan cards (Chile)', () => {
  test('US-04-AC-16 a pointer click on the short description of "Plan Premium" checks its radio and no other, and "Plan Protegido" keeps "Recomendado"', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await fillChile(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/cl\/planes$/);
    await expect(plans(page)).toHaveCount(3);
    await page.getByText('Cobertura completa con deducible bajo.').click();
    await expect(plan(page, 'Plan Premium')).toBeChecked();
    await expect(plan(page, 'Plan Protegido')).not.toBeChecked();
    await expect(plan(page, 'Plan Esencial')).not.toBeChecked();
    await expect(plan(page, 'Plan Protegido')).toHaveAccessibleDescription(/Recomendado/);
    await expect(plan(page, 'Plan Premium')).not.toHaveAccessibleDescription(/Recomendado/);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-17 reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('US-04-AC-17 with prefers-reduced-motion: reduce, step 1 (with "Ciudad" and the calendar open), step 2, the summary, the processing payment and the confirmation have 0s durations and no running animation', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await expectNoMotion(page, 'step 1');

    await field(page, CITY).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expectNoMotion(page, 'step 1 with "Ciudad" open');
    await page.keyboard.press('Escape');

    await dateButton(page).click();
    await expect(calendarDialog(page)).toBeVisible();
    await expectNoMotion(page, 'step 1 with the calendar open');
    await page.keyboard.press('Escape');
    await expect(calendarDialog(page)).toHaveCount(0);

    await continuar(page).click(); // an empty form: the soft error feedback
    await expectNoMotion(page, 'step 1 after a failed "Continuar"');

    await fillColombia(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plans(page)).toHaveCount(3);
    await expectNoMotion(page, 'step 2');

    await plan(page, 'Plan Total').check();
    await expectNoMotion(page, 'step 2 with a plan chosen');
    await continuar(page).click();
    await expect(summaryHeading(page)).toBeVisible();
    await expectNoMotion(page, 'the summary');

    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(page.getByRole('button', { name: 'Procesando pago…' })).toBeVisible();
    await expectNoMotion(page, 'the payment processing (the spinner stops, the text stays)');
    await expect(confirmedHeading(page)).toBeVisible();
    await expectNoMotion(page, 'the confirmation');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-18 responsive at the three sizes: no horizontal scroll, 44 x 44 targets, plans in one column or a grid', () => {
  const sizes = [VIEWPORTS.narrow, VIEWPORTS.tablet, VIEWPORTS.desktop];

  for (const size of sizes) {
    for (const country of ['Colombia', 'Chile'] as const) {
      test(`US-04-AC-18 / US-04-BR-11 ${size.width} x ${size.height} ${country}: the chooser, step 1 (also with "Ciudad" open, with the calendar open and after a failed "Continuar"), step 2, the summary and the confirmation`, async ({ page }) => {
        const isCo = country === 'Colombia';
        const check = async (where: string): Promise<void> => {
          await expectNoHorizontalScroll(page, `at ${size.width}x${size.height} (${country}, ${where})`);
          await expectTargetsAtLeast44(page, `at ${size.width}x${size.height} (${country}, ${where})`);
        };
        await page.setViewportSize(size);
        await page.clock.setFixedTime(TODAY);

        await page.goto('/');
        await expect(page.getByRole('link', { name: country })).toBeVisible();
        await check('country chooser');

        await page.goto(isCo ? '/co/datos' : '/cl/datos');
        await expect(field(page, isCo ? 'Placa' : 'Patente')).toBeVisible();
        await check('step 1');

        await field(page, CITY).click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await check('step 1, Ciudad open');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('listbox')).toHaveCount(0);

        await dateButton(page).click();
        await expect(calendarDialog(page)).toBeVisible();
        await check('step 1, calendar open');
        await page.keyboard.press('Escape');
        await expect(calendarDialog(page)).toHaveCount(0);

        await continuar(page).click();
        await expect(page.getByRole('alert').first()).toBeVisible();
        await check('step 1, after a failed Continuar');

        await (isCo ? fillColombia(page) : fillChile(page));
        await continuar(page).click();
        await expect(page).toHaveURL(isCo ? /\/co\/planes$/ : /\/cl\/planes$/);
        await expect(plans(page)).toHaveCount(3);
        await check('step 2');

        // The plans are one column at 360 px and two or more columns at 1280 px: the plan headings (h2) are the cards' anchors.
        const names = isCo ? CO_PLAN_NAMES : CL_PLAN_NAMES;
        const lefts: number[] = [];
        for (const name of names) {
          const box = await page.getByRole('heading', { level: 2, name }).boundingBox();
          expect(box, name).not.toBeNull();
          lefts.push(Math.round((box as { x: number }).x));
        }
        const columns = new Set(lefts.map((x) => Math.round(x / 8))).size;
        if (size.width === 360) expect(columns, `plans in one column (left edges ${lefts.join(', ')})`).toBe(1);
        if (size.width === 1280) expect(columns, `plans in at least two columns (left edges ${lefts.join(', ')})`).toBeGreaterThanOrEqual(2);

        await plan(page, names[1]).check();
        await continuar(page).click();
        await expect(summaryHeading(page)).toBeVisible();
        await check('summary');

        await acceptTerms(page).check();
        await pagar(page).click();
        await expect(confirmedHeading(page)).toBeVisible();
        await check('confirmation');
      });
    }
  }
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-19 fonts and assets are local', () => {
  test('US-04-AC-19 through the whole flow in Colombia every request goes to the app origin, and the font requests are one WOFF2 file per family under /fonts/, at most two', async ({ page }) => {
    const requests: Request[] = [];
    page.on('request', (request) => requests.push(request));
    await page.clock.setFixedTime(TODAY);
    await page.goto('/co/datos');
    await expect(field(page, 'Placa')).toBeVisible();
    await fillColombia(page);
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await plan(page, 'Plan Total').check();
    await continuar(page).click();
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();

    const origin = new URL(BASE_URL).origin;
    const remote = requests.map((r) => r.url()).filter((u) => /^https?:/.test(u) && new URL(u).origin !== origin);
    expect(remote, 'requests to any other origin').toEqual([]);

    const fonts = requests.filter((r) => r.resourceType() === 'font' || /\.(woff2?|ttf|otf)(\?|$)/.test(r.url()));
    const files = [...new Set(fonts.map((r) => new URL(r.url()).pathname))];
    expect(files.length, 'a font file is loaded').toBeGreaterThanOrEqual(1);
    expect(files.length, 'at most one file per family, two families').toBeLessThanOrEqual(2);
    for (const file of files) expect(file, 'a WOFF2 file under /fonts/').toMatch(/^\/fonts\/[a-z0-9.-]+\.woff2$/);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-20 visible focus on the new controls', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('US-04-AC-20 "Ciudad", "Fecha de nacimiento", "Elegir fecha", a calendar day and a select option row show a focus indicator on the focused element, reached with the keyboard', async ({ page }) => {
    await openCo(page);

    for (const [label, target] of [
      ['Ciudad', field(page, CITY)],
      ['Fecha de nacimiento', field(page, BIRTH)],
      ['Elegir fecha', dateButton(page)],
    ] as const) {
      await target.focus();
      await page.keyboard.press('Shift+Tab'); // arrive by keyboard so that :focus-visible applies
      await page.keyboard.press('Tab');
      await expect(target).toBeFocused();
      await expectFocusIndicatorOnActive(page, label);
    }

    await dateButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(calendarDialog(page)).toBeVisible();
    await expectFocusIndicatorOnActive(page, 'a calendar day');
    await page.keyboard.press('Escape');

    const ciudad = field(page, CITY);
    await ciudad.focus();
    await page.keyboard.press('ArrowDown');
    await expect(ciudad).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => activeOptionText(ciudad)).toBe('Bogotá');
    await expectActiveOptionIndicator(ciudad, 'a select option row');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R1-F01 the field icons are painted, not just present (US-04-AC-04)', () => {
  for (const country of ['co', 'cl'] as const) {
    test(`US-04-R1-F01 ${country === 'co' ? 'Colombia' : 'Chile'}: the icon of every text, number, select and date field is the topmost element at its own centre`, async ({ page }) => {
      await (country === 'co' ? openCo(page) : openCl(page));
      // Icons ignore the pointer, so hit-testing skips them; make them hit-testable (this changes no stacking) and ask the browser what is on top.
      await page.addStyleTag({ content: 'svg[aria-hidden="true"] { pointer-events: auto !important; }' });
      const problems = await page.evaluate(() => {
        const found: string[] = [];
        let checked = 0;
        for (const label of Array.from(document.querySelectorAll('label'))) {
          const control = label.control as HTMLInputElement | null;
          if (!control || control.type === 'checkbox') continue;
          let box: HTMLElement | null = control.parentElement;
          while (box && !box.contains(label)) box = box.parentElement;
          const icon = box?.querySelector('svg') ?? null;
          const name = (label.textContent ?? '').replace(/\*/g, '').trim();
          if (!icon) {
            found.push(`${name}: no icon`);
            continue;
          }
          const r = icon.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          checked++;
          if (r.width < 8 || r.height < 8) found.push(`${name}: icon box ${r.width}x${r.height}`);
          else if (top?.closest('svg') !== icon) found.push(`${name}: covered by <${top?.tagName.toLowerCase()}${top?.getAttribute('role') ? ` role=${top.getAttribute('role')}` : ''}>`);
        }
        if (checked < 8) found.push(`only ${checked} fields checked`);
        return found;
      });
      expect(problems).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R1-F02 the plan radio is drawn from tokens (3:1 on every plan surface)', () => {
  test('US-04-R1-F02 the plan radios are not drawn by the browser: appearance none, a visible border, and the checked one looks different', async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
    await page.goto('/cl/datos');
    await expect(field(page, 'Patente')).toBeVisible();
    await fillChile(page);
    await continuar(page).click();
    await expect(plans(page)).toHaveCount(3);
    const look = (name: string): Promise<{ appearance: string; width: number; colour: string; fill: string; shadow: string }> =>
      plan(page, name).evaluate((el) => {
        const s = getComputedStyle(el);
        return { appearance: s.appearance, width: parseFloat(s.borderTopWidth), colour: s.borderTopColor, fill: s.backgroundColor, shadow: s.boxShadow };
      });
    for (const name of ['Plan Esencial', 'Plan Protegido']) {
      const unchecked = await look(name);
      expect(unchecked.appearance, `${name} appearance`).toBe('none');
      expect(unchecked.width, `${name} border width`).toBeGreaterThanOrEqual(1);
      expect(unchecked.colour, `${name} border is not the browser's grey`).not.toMatch(/^rgb\((133, 133, 133|118, 118, 118)\)$/);
    }
    const before = await look('Plan Esencial');
    await plan(page, 'Plan Esencial').check();
    const after = await look('Plan Esencial');
    expect(JSON.stringify(after), 'the checked radio looks different').not.toBe(JSON.stringify(before));
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R1-F03 the bottom sheet slides and is measured at rest (ADR-0013 section 2)', () => {
  test('US-04-R1-F03 360 x 740 with motion: once the sheet\'s animations have finished it is full width with its bottom edge at the viewport bottom (the slide is allowed)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.narrow);
    await openCo(page);
    await field(page, CITY).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    const box = await panelBox(page, 'select'); // waits for getAnimations() to settle first
    expect(Math.abs(box.width - VIEWPORTS.narrow.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.bottom - VIEWPORTS.narrow.height)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
    await dateButton(page).click();
    await expect(calendarDialog(page)).toBeVisible();
    const cal = await panelBox(page, 'calendar');
    expect(Math.abs(cal.width - VIEWPORTS.narrow.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(cal.bottom - VIEWPORTS.narrow.height)).toBeLessThanOrEqual(1);
  });

  test.describe('with prefers-reduced-motion: reduce', () => {
    test.use({ reducedMotion: 'reduce' });

    test('US-04-R1-F03 the sheets are at rest immediately: no animation at all, full width, bottom edge at the viewport bottom', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.narrow);
      await openCo(page);
      await field(page, CITY).click();
      await expect(page.getByRole('listbox')).toBeVisible();
      expect(await page.evaluate(() => document.getAnimations().length), 'no animation right after opening').toBe(0);
      const box = await panelBox(page, 'select');
      expect(Math.abs(box.width - VIEWPORTS.narrow.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.bottom - VIEWPORTS.narrow.height)).toBeLessThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R1-F06 the select toggles on a click, whatever carries the click', () => {
  test('US-04-R1-F06 a click on an open select-only list closes it, with a real mouse click and with a script click (detail 0)', async ({ page }) => {
    await openCo(page);
    const tipo = field(page, 'Tipo de documento');
    await tipo.click();
    await expect(tipo).toHaveAttribute('aria-expanded', 'true');
    await tipo.click();
    await expect(tipo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('listbox')).toHaveCount(0);

    await tipo.click();
    await expect(tipo).toHaveAttribute('aria-expanded', 'true');
    await tipo.evaluate((el) => (el as HTMLElement).click());
    await expect(tipo).toHaveAttribute('aria-expanded', 'false');
  });

  test('US-04-R1-F06 Ctrl+A in the search box keeps the platform default: the text is selected where the platform selects it, and the key is not swallowed', async ({ page }) => {
    await openCo(page);
    const ciudad = field(page, CITY);
    await ciudad.click();
    await page.getByRole('option', { name: 'Cali', exact: true }).click();
    await ciudad.focus();
    const prevented = await ciudad.evaluate((el) => {
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R1-F08 Escape in the year list returns to the day grid', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('US-04-R1-F08 the first Escape leaves the year list for the grid (the dialog stays, the focus is on the focused day); the second closes the dialog and returns to "Elegir fecha"', async ({ page }) => {
    await openCl(page);
    await field(page, BIRTH).fill('15/05/1990');
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Elegir año' }).click();
    await expect(dialog.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('listbox')).toHaveCount(0);
    await expect(dialog.getByRole('grid')).toBeVisible();
    await expect.poll(() => focusedName(page)).toBe('15 de mayo de 1990');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(dateButton(page)).toBeFocused();
  });
});

