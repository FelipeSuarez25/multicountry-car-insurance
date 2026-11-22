import { expect, test, type Locator, type Page } from '@playwright/test';
import { CO_VALID, continuar, expectDescribedBy, expectFieldEmpty, field, fillColombia, storedValue } from './support/form';
import { CL_VALID, HEADING, TODAY, expectEntered, plan, reachPlansInChile, reachPlansInColombia } from './support/plans';
import { acceptTerms, confirmedHeading, pagar, reachSummaryInChile, reachSummaryInColombia } from './support/summary';
import { VIEWPORTS, calendarDialog, dateButton, expectFocusIndicatorOnActive, expectNoHorizontalScroll, expectTargetsAtLeast44, settleAnimations } from './support/design';

/**
 * US-04 HC3 round 1 (spec v0.3, ADR-0014) against the real stack with the seed: the calendar below the
 * date field (AC-24), the typed date (AC-25), input profiles (AC-26), the page background (AC-27), the
 * back links and the country chip link (AC-28) and the richer chooser (AC-29). Today of the browser is
 * pinned to 2026-11-21 (the Strapi seed content for AC-26 needs `docker compose -p mci-demo down -v`
 * when the database was seeded before this change, spec 7.1).
 *
 * Playwright `fill()` sends the whole value in one input event: for the date box that is a paste (BR-18).
 * `pressSequentially()` and `keyboard.type()` are the real typing.
 */

const BIRTH = 'Fecha de nacimiento';
const UNREADABLE = 'Fecha no válida. Usa el formato dd/mm/aaaa.';
const CHIP_CO = 'Cambiar país (actual: Colombia)';
const CHIP_CL = 'Cambiar país (actual: Chile)';

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

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const b = await locator.boundingBox();
  if (!b) throw new Error('The element has no box');
  return { left: b.x, right: b.x + b.width, top: b.y, bottom: b.y + b.height, width: b.width, height: b.height };
}

const header = (page: Page): Locator => page.getByRole('banner');
const backLink = (page: Page, name: string): Locator => page.getByRole('link', { name, exact: true });
const BACK_LINKS = ['Cambiar país', 'Volver a tus datos', 'Volver a planes'];

async function expectNoBackLinks(page: Page, where: string): Promise<void> {
  for (const name of BACK_LINKS) await expect(backLink(page, name), `${where}: no link "${name}"`).toHaveCount(0);
}

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-24 the calendar opens below the date field, compact', () => {
  const rows: { name: string; viewport: { width: number; height: number }; country: 'co' | 'cl'; low: boolean }[] = [
    { name: '1280 x 800, Colombia, page at the top', viewport: VIEWPORTS.desktop, country: 'co', low: false },
    { name: '1280 x 800, Chile, the field bottom 60 px above the viewport bottom', viewport: VIEWPORTS.desktop, country: 'cl', low: true },
    { name: '768 x 1024, Colombia, page at the top', viewport: VIEWPORTS.tablet, country: 'co', low: false },
  ];

  /**
   * Put the bottom edge of the date box exactly `gap` px above the viewport bottom: scroll down when the field is lower
   * than that, otherwise add an empty spacer before the form (a test-only layout aid: the page has to be tall enough for
   * "the field starts low on the page" to be reachable at 1280 x 800).
   */
  async function placeFieldLow(page: Page, gap: number): Promise<void> {
    await field(page, BIRTH).evaluate((el, g) => {
      const wanted = window.innerHeight - g;
      const delta = el.getBoundingClientRect().bottom - wanted;
      if (delta > 0) {
        window.scrollBy(0, delta);
      } else {
        const spacer = document.createElement('div');
        spacer.setAttribute('aria-hidden', 'true');
        spacer.style.height = `${-delta + window.scrollY}px`;
        const form = el.closest('form');
        form?.parentElement?.insertBefore(spacer, form);
        window.scrollTo(0, window.scrollY);
      }
    }, gap);
    const viewportHeight = (page.viewportSize() as { height: number }).height;
    await expect.poll(async () => Math.round((await boxOf(field(page, BIRTH))).bottom)).toBeGreaterThanOrEqual(viewportHeight - gap - 1);
    await expect.poll(async () => Math.round((await boxOf(field(page, BIRTH))).bottom)).toBeLessThanOrEqual(viewportHeight - gap + 1);
  }

  for (const row of rows) {
    test(`US-04-AC-24 ${row.name}: "Elegir fecha" opens the dialog 0 to 16 px below the date box, aligned to its left edge, inside the viewport and not under the header`, async ({ page }) => {
      await page.setViewportSize(row.viewport);
      await (row.country === 'co' ? openCo(page) : openCl(page));
      if (row.low) await placeFieldLow(page, 60);

      await dateButton(page).click();
      const dialog = calendarDialog(page);
      await expect(dialog).toBeVisible();
      await settleAnimations(page);

      const anchor = await boxOf(field(page, BIRTH));
      const box = await boxOf(dialog);
      const head = await boxOf(header(page));
      const gap = box.top - anchor.bottom;
      expect(gap, `the dialog top is ${gap.toFixed(1)} px from the date box bottom`).toBeGreaterThanOrEqual(-0.5);
      expect(gap, `the dialog top is ${gap.toFixed(1)} px from the date box bottom`).toBeLessThanOrEqual(16.5);
      expect(Math.abs(box.left - anchor.left), 'left edges').toBeLessThanOrEqual(8.5);
      const inner = page.viewportSize() as { width: number; height: number };
      expect(box.left).toBeGreaterThanOrEqual(-0.5);
      expect(box.top).toBeGreaterThanOrEqual(-0.5);
      expect(box.right).toBeLessThanOrEqual(inner.width + 0.5);
      expect(box.bottom).toBeLessThanOrEqual(inner.height + 0.5);
      expect(box.top, 'the dialog does not overlap the wizard header').toBeGreaterThanOrEqual(head.bottom - 0.5);
    });
  }

  test('US-04-AC-24 1280 x 800, Chile, calendar open on May 1990: at most 352 x 448 px; day cells 44 to 48 px square; "Elegir año", "Mes anterior", "Mes siguiente" and "Cerrar" at least 44 x 44', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await openCl(page);
    await field(page, BIRTH).fill('15/05/1990');
    await dateButton(page).click();
    const dialog = calendarDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName('mayo de 1990');
    await settleAnimations(page);

    const box = await boxOf(dialog);
    expect(box.width, 'dialog width').toBeLessThanOrEqual(352.5);
    expect(box.height, 'dialog height').toBeLessThanOrEqual(448.5);
    const cells = await dialog.getByRole('gridcell').all();
    expect(cells.length).toBeGreaterThanOrEqual(28);
    for (const cell of cells) {
      const b = await boxOf(cell);
      expect(b.width, 'day cell width').toBeGreaterThanOrEqual(43.5);
      expect(b.width, 'day cell width').toBeLessThanOrEqual(48.5);
      expect(b.height, 'day cell height').toBeGreaterThanOrEqual(43.5);
      expect(b.height, 'day cell height').toBeLessThanOrEqual(48.5);
    }
    for (const name of ['Elegir año', 'Mes anterior', 'Mes siguiente', 'Cerrar']) {
      const b = await boxOf(dialog.getByRole('button', { name }));
      expect(b.width, `"${name}" width`).toBeGreaterThanOrEqual(43.5);
      expect(b.height, `"${name}" height`).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('US-04-AC-24 1280 x 800, Chile, the field low on the page: Escape closes the dialog, the focus is on "Elegir fecha" and "Fecha de nacimiento" is visible in the viewport (below the header)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await openCl(page);
    await placeFieldLow(page, 60);
    await dateButton(page).click();
    await expect(calendarDialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendarDialog(page)).toHaveCount(0);
    await expect(dateButton(page)).toBeFocused();
    const anchor = await boxOf(field(page, BIRTH));
    const head = await boxOf(header(page));
    expect(anchor.top, 'the date box is not under the header').toBeGreaterThanOrEqual(head.bottom - 0.5);
    expect(anchor.bottom, 'the date box is inside the viewport').toBeLessThanOrEqual(VIEWPORTS.desktop.height + 0.5);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-25 the typed date: mask and a clear message', () => {
  const rows: [string, string][] = [
    ['15051990', '15/05/1990'],
    ['15/05/1990', '15/05/1990'],
    ['15-05-1990', '15/05/1990'],
    ['150', '15/0'],
    ['5/5/1990', '05/05/1990'],
    ['15a05b1990', '15/05/1990'],
    ['150519901', '15/05/1990'],
  ];

  for (const [keys, shown] of rows) {
    test(`US-04-AC-25 typing the keys "${keys}" one at a time shows "${shown}"`, async ({ page }) => {
      await openCo(page);
      const date = field(page, BIRTH);
      await date.focus();
      await date.pressSequentially(keys);
      await expect(date).toHaveValue(shown);
    });
  }

  test('US-04-AC-25 Backspace over a separator: from "15/05/1990", End and Backspace 4 times shows "15/05", once more "15/0"', async ({ page }) => {
    await openCo(page);
    const date = field(page, BIRTH);
    await date.focus();
    await date.pressSequentially('15051990');
    await expect(date).toHaveValue('15/05/1990');
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
    await expect(date).toHaveValue('15/05');
    await page.keyboard.press('Backspace');
    await expect(date).toHaveValue('15/0');
  });

  for (const [pasted, shown] of [
    ['15/05/1990', '15/05/1990'],
    ['15-05-1990', '15/05/1990'],
    ['15.05.1990', '15/05/1990'],
    ['15051990', '15/05/1990'],
    ['5/5/1990', '05/05/1990'],
  ]) {
    test(`US-04-AC-25 pasting "${pasted}" (fill() sends the whole value in one input event) shows "${shown}"`, async ({ page }) => {
      await openCo(page);
      const date = field(page, BIRTH);
      await date.fill(pasted);
      await expect(date).toHaveValue(shown);
    });
  }

  const messageRows: [string, string, string, string | null][] = [
    ['15051990', '15/05/1990', '1990-05-15', null],
    ['29202001', '29/20/2001', '', UNREADABLE],
    ['31021990', '31/02/1990', '', UNREADABLE],
    ['29022001', '29/02/2001', '', UNREADABLE],
    ['1505199', '15/05/199', '', UNREADABLE],
    ['1505', '15/05', '', UNREADABLE],
    ['01032010', '01/03/2010', '2010-03-01', 'Debes ser mayor de edad (18 años o más) para cotizar.'],
  ];

  for (const [typed, shown, stored, message] of messageRows) {
    test(`US-04-AC-25 typing "${typed}" and leaving the field shows "${shown}", stores "${stored}" and ${message === null ? 'shows no error' : `shows "${message}"`}`, async ({ page }) => {
      await openCo(page);
      const date = field(page, BIRTH);
      await date.focus();
      await date.pressSequentially(typed);
      await field(page, 'Placa').focus();
      await expect(date).toHaveValue(shown);
      await expect.poll(() => storedValue(page, 'birthDate')).toBe(stored);
      if (message === null) {
        await expect(date).not.toHaveAttribute('aria-invalid', 'true');
      } else {
        await expect(date).toHaveAttribute('aria-invalid', 'true');
        await expectDescribedBy(page, BIRTH, message);
      }
    });
  }

  test('US-04-AC-25 nothing typed and leaving the field shows the Strapi required message "Ingresa tu fecha de nacimiento."', async ({ page }) => {
    await openCo(page);
    const date = field(page, BIRTH);
    await date.focus();
    await field(page, 'Placa').focus();
    await expectDescribedBy(page, BIRTH, 'Ingresa tu fecha de nacimiento.');
  });

  test('US-04-AC-25 no message while typing: "150" without leaving the field shows no message and is not aria-invalid', async ({ page }) => {
    await openCo(page);
    const date = field(page, BIRTH);
    await date.focus();
    await date.pressSequentially('150');
    await expect(date).toHaveValue('15/0');
    await expect(date).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(UNREADABLE)).toHaveCount(0);
  });

  test('US-04-AC-25 the text box has inputmode numeric, maxlength 10 and the placeholder "dd/mm/aaaa"', async ({ page }) => {
    await openCo(page);
    const date = field(page, BIRTH);
    await expect(date).toHaveAttribute('inputmode', 'numeric');
    await expect(date).toHaveAttribute('maxlength', '10');
    await expect(date).toHaveAttribute('placeholder', 'dd/mm/aaaa');
  });

  test('US-04-AC-25 a typed date completes step 1: every field of Colombia, "15/05/1990" typed with the keyboard (no calendar), "Continuar" reaches /co/planes and stores 1990-05-15', async ({ page }) => {
    await openCo(page);
    await fillColombia(page, { [BIRTH]: null });
    const date = field(page, BIRTH);
    await date.focus();
    await date.pressSequentially('15/05/1990');
    await expect(date).toHaveValue('15/05/1990');
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeVisible();
    expect(await storedValue(page, 'birthDate')).toBe('1990-05-15');
  });

  test('US-04-AC-25 an invalid date blocks "Continuar": "29/20/2001" stays on /co/datos, the focus is on the date box and it is described by "Fecha no válida. Usa el formato dd/mm/aaaa."', async ({ page }) => {
    await openCo(page);
    await fillColombia(page, { [BIRTH]: '29/20/2001' });
    await continuar(page).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expect(field(page, BIRTH)).toBeFocused();
    await expectDescribedBy(page, BIRTH, UNREADABLE);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-26 input profiles and maximum lengths (real typing)', () => {
  const typingRows: [string, 'co' | 'cl', string, string, string][] = [
    ['Nombre completo', 'co', 'Ana 2', 'Ana ', 'digits are not entered'],
    ['Nombre completo', 'co', "José Núñez-O'Neil Jr.", "José Núñez-O'Neil Jr.", 'accents, hyphen, apostrophe and dot stay'],
    ['Número de documento', 'co', '1.012.345.678', '1012345678', 'dots are not entered'],
    ['Número de documento', 'co', '123456789012', '1234567890', 'at most 10 digits'],
    ['RUT', 'cl', '12.345.678-k', '12.345.678-K', 'k is shown as K'],
    ['RUT', 'cl', '12.345.678-5x9', '12.345.678-5', 'at most 12 characters, x is not entered'],
    ['Placa', 'co', 'abc-123x', 'ABC123', 'uppercase, no hyphen, at most 6'],
    ['Patente', 'cl', 'bcdf12', 'BCDF12', 'uppercase'],
    ['Línea', 'co', '3 Touring+', '3 Touring', '+ is not entered'],
    ['Modelo (año)', 'co', '20e2.5', '2025', 'digits only'],
    ['Modelo (año)', 'co', '20225', '2022', 'at most 4 digits'],
    ['Año', 'cl', 'abc', '', 'letters are not entered'],
  ];

  for (const [label, country, typed, shown, note] of typingRows) {
    test(`US-04-AC-26 ${country.toUpperCase()} "${label}": typing "${typed}" shows "${shown}" (${note}) and the wizard state holds the same`, async ({ page }) => {
      await (country === 'co' ? openCo(page) : openCl(page));
      const control = field(page, label);
      await control.focus();
      await control.pressSequentially(typed);
      await expect(control).toHaveValue(shown);
      const key = { 'Nombre completo': 'fullName', 'Número de documento': 'documentNumber', RUT: 'documentNumber', Placa: 'plate', Patente: 'plate', Línea: 'model', 'Modelo (año)': 'vehicleYear', Año: 'vehicleYear' }[label] as string;
      await expect.poll(() => storedValue(page, key)).toBe(shown);
    });
  }

  test('US-04-AC-26 pasting "Ana 2 Prueba" into "Nombre completo" shows "Ana  Prueba"', async ({ page }) => {
    await openCo(page);
    const name = field(page, 'Nombre completo');
    await name.fill('Ana 2 Prueba');
    await expect(name).toHaveValue('Ana  Prueba');
  });

  const attributeRows: [string, 'co' | 'cl', string, string | null, string | null, string | null][] = [
    ['Nombre completo', 'co', '80', null, 'name', 'words'],
    ['Número de documento', 'co', '10', 'numeric', null, null],
    ['RUT', 'cl', '12', 'text', null, null],
    ['Placa', 'co', '6', null, 'off', 'characters'],
    ['Línea', 'co', '40', null, null, null],
    ['Modelo (año)', 'co', '4', 'numeric', null, null],
    ['Año', 'cl', '4', 'numeric', null, null],
  ];

  for (const [label, country, maxlength, inputmode, autocomplete, autocapitalize] of attributeRows) {
    test(`US-04-AC-26 ${country.toUpperCase()} "${label}" is a text box (type text) with maxlength ${maxlength}, inputmode ${inputmode ?? '(absent)'}, autocomplete ${autocomplete ?? '(absent)'} and autocapitalize ${autocapitalize ?? '(absent)'}`, async ({ page }) => {
      await (country === 'co' ? openCo(page) : openCl(page));
      const control = field(page, label);
      await expect(control).toHaveAttribute('type', 'text');
      await expect(control).toHaveAttribute('maxlength', maxlength);
      for (const [name, value] of [['inputmode', inputmode], ['autocomplete', autocomplete], ['autocapitalize', autocapitalize]] as const) {
        if (value === null) await expect(control).not.toHaveAttribute(name, /.*/);
        else await expect(control).toHaveAttribute(name, value);
      }
    });
  }

  test('US-04-AC-26 the seed still validates what the filter cannot see: a name of 2 letters "Al" shows the new message after "Continuar"', async ({ page }) => {
    await openCo(page);
    await fillColombia(page, { 'Nombre completo': 'Al' });
    await continuar(page).click();
    await expectDescribedBy(page, 'Nombre completo', 'Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).');
    await expect(page).toHaveURL(/\/co\/datos$/);
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-27 the same lighter gradient background on every page', () => {
  /** The body's background-image holds the gradient of --gradient-page and its colour is --color-bg, resolved by the browser. */
  async function expectPageBackground(page: Page, where: string): Promise<void> {
    const result = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.backgroundImage = 'var(--gradient-page)';
      probe.style.backgroundColor = 'var(--color-bg)';
      document.body.appendChild(probe);
      const wanted = getComputedStyle(probe);
      const gradient = wanted.backgroundImage;
      const colour = wanted.backgroundColor;
      probe.remove();
      const body = getComputedStyle(document.body);
      return { gradient, colour, image: body.backgroundImage, bodyColour: body.backgroundColor };
    });
    expect(result.gradient, `${where}: --gradient-page resolves to a gradient`).toContain('linear-gradient');
    expect(result.image, `${where}: the body's background-image holds the gradient of --gradient-page`).toContain(result.gradient);
    expect(result.bodyColour, `${where}: the body's background-color is --color-bg`).toBe(result.colour);
  }

  test('US-04-AC-27 the country chooser "/"', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu país' })).toBeVisible();
    await expectPageBackground(page, '/');
  });

  test('US-04-AC-27 "/co/datos"', async ({ page }) => {
    await openCo(page);
    await expectPageBackground(page, '/co/datos');
  });

  test('US-04-AC-27 "/cl/planes"', async ({ page }) => {
    await reachPlansInChile(page);
    await expectPageBackground(page, '/cl/planes');
  });

  test('US-04-AC-27 "/co/resumen"', async ({ page }) => {
    await reachSummaryInColombia(page);
    await expectPageBackground(page, '/co/resumen');
  });

  test('US-04-AC-27 the payment confirmation in Chile', async ({ page }) => {
    await reachSummaryInChile(page);
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await expectPageBackground(page, 'the payment confirmation');
  });

  test('US-04-AC-27 "/ar/datos" (unknown country)', async ({ page }) => {
    await page.goto('/ar/datos');
    await expect(page.getByText('Este país no está disponible.')).toBeVisible();
    await expectPageBackground(page, '/ar/datos');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-28 back links, the country chip link and the change of country', () => {
  test('US-04-AC-28 step 1 "/co/datos" completed but not submitted: "Cambiar país" leads to "/", and opening "Colombia" again shows the same step 1 values', async ({ page }) => {
    await openCo(page);
    await fillColombia(page);
    await backLink(page, 'Cambiar país').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu país' })).toBeVisible();
    await page.getByRole('link', { name: 'Colombia', exact: true }).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expectEntered(page, CO_VALID);
  });

  test('US-04-AC-28 step 2 "/co/planes": "Volver a tus datos" leads to /co/datos with the entered values and the focus on its h1', async ({ page }) => {
    await reachPlansInColombia(page);
    await backLink(page, 'Volver a tus datos').click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expectEntered(page, CO_VALID);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });

  test('US-04-AC-28 step 3 "/co/resumen" with "Plan Total": "Volver a planes" leads to /co/planes with "Plan Total" checked and the focus on its h1', async ({ page }) => {
    await reachSummaryInColombia(page, 'Plan Total');
    await backLink(page, 'Volver a planes').click();
    await expect(page).toHaveURL(/\/co\/planes$/);
    await expect(plan(page, 'Plan Total')).toBeChecked();
    await expect(page.getByRole('heading', { level: 1, name: HEADING })).toBeFocused();
  });

  test('US-04-AC-28 each back link sits below the step indicator and above the h1, and the arrow icon is hidden from assistive technology', async ({ page }) => {
    await openCo(page);
    const link = backLink(page, 'Cambiar país');
    await expect(link).toBeVisible();
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    const indicator = await boxOf(page.getByRole('list', { name: 'Progreso de la cotización' }));
    const back = await boxOf(link);
    const h1 = await boxOf(page.getByRole('heading', { level: 1 }));
    expect(back.top, 'below the step indicator').toBeGreaterThanOrEqual(indicator.bottom - 0.5);
    expect(h1.top, 'above the h1').toBeGreaterThanOrEqual(back.bottom - 0.5);
  });

  test('US-04-AC-28 no back link on the payment confirmation in Colombia, on "/ar/datos" and on the chooser', async ({ page }) => {
    await reachSummaryInColombia(page);
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await expectNoBackLinks(page, 'the confirmation');

    await page.goto('/ar/datos');
    await expect(page.getByText('Este país no está disponible.')).toBeVisible();
    await expectNoBackLinks(page, '/ar/datos');

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Elige tu país' })).toBeVisible();
    await expectNoBackLinks(page, '/');
  });

  for (const [address, chip, country] of [
    ['/co/datos', CHIP_CO, 'Colombia'],
    ['/cl/datos', CHIP_CL, 'Chile'],
  ] as const) {
    test(`US-04-AC-28 at ${address} the header has exactly one link, named "${chip}", with the address "/", the text "${country}" and the flag hidden from assistive technology`, async ({ page }) => {
      await page.clock.setFixedTime(TODAY);
      await page.goto(address);
      await expect(header(page).getByRole('link')).toHaveCount(1);
      const link = header(page).getByRole('link', { name: chip, exact: true });
      await expect(link).toHaveAttribute('href', '/');
      await expect(link).toContainText(country);
      await expect(link.locator('svg').first()).toHaveAttribute('aria-hidden', 'true');
    });
  }

  test('US-04-AC-28 the payment confirmation in Chile: the header has one link "Cambiar país (actual: Chile)" to "/"', async ({ page }) => {
    await reachSummaryInChile(page);
    await acceptTerms(page).check();
    await pagar(page).click();
    await expect(confirmedHeading(page)).toBeVisible();
    await expect(header(page).getByRole('link')).toHaveCount(1);
    await expect(header(page).getByRole('link', { name: CHIP_CL, exact: true })).toHaveAttribute('href', '/');
  });

  test('US-04-AC-28 Colombia to Chile: after step 1 in Colombia, the chip then "Chile" leads to /cl/datos with every field empty and no Colombian value stored', async ({ page }) => {
    await reachPlansInColombia(page);
    await header(page).getByRole('link', { name: CHIP_CO, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('link', { name: 'Chile', exact: true }).click();
    await expect(page).toHaveURL(/\/cl\/datos$/);
    await expect(field(page, 'Patente')).toBeVisible();
    for (const label of Object.keys(CL_VALID)) {
      if (typeof CL_VALID[label] === 'boolean') await expect(field(page, label)).not.toBeChecked();
      else await expectFieldEmpty(page, label);
    }
    const stored = await page.evaluate(() => sessionStorage.getItem('quote-wizard') ?? '');
    for (const colombian of ['Ana Prueba Ficticia', '1012345678', 'ABC123', '3 Touring', '"CO"']) expect(stored).not.toContain(colombian);
  });

  test('US-04-AC-28 back to the same country: the chip then "Colombia" leads to /co/datos and step 1 shows the entered values', async ({ page }) => {
    await reachPlansInColombia(page);
    await header(page).getByRole('link', { name: CHIP_CO, exact: true }).click();
    await page.getByRole('link', { name: 'Colombia', exact: true }).click();
    await expect(page).toHaveURL(/\/co\/datos$/);
    await expectEntered(page, CO_VALID);
  });

  test.describe('Tab order and targets at the top of a step (1280 x 800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    const rows: [string, string, (page: Page) => Promise<void>][] = [
      ['/co/datos', 'Cambiar país', openCo],
      ['/co/planes', 'Volver a tus datos', reachPlansInColombia],
      ['/co/resumen', 'Volver a planes', (page) => reachSummaryInColombia(page)],
    ];

    for (const [address, link, reach] of rows) {
      test(`US-04-AC-28 at ${address} the first Tab stop is the country chip link and the second is "${link}", each with a visible focus indicator and a hit box of at least 44 x 44`, async ({ page }) => {
        await reach(page);
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.press('Tab');
        const chip = header(page).getByRole('link', { name: CHIP_CO, exact: true });
        await expect(chip).toBeFocused();
        await expectFocusIndicatorOnActive(page, 'the country chip link');
        const chipBox = await boxOf(chip);
        expect(chipBox.width).toBeGreaterThanOrEqual(43.5);
        expect(chipBox.height).toBeGreaterThanOrEqual(43.5);
        await page.keyboard.press('Tab');
        const second = backLink(page, link);
        await expect(second).toBeFocused();
        await expectFocusIndicatorOnActive(page, `"${link}"`);
        const box = await boxOf(second);
        expect(box.width).toBeGreaterThanOrEqual(43.5);
        expect(box.height).toBeGreaterThanOrEqual(43.5);
        await expectTargetsAtLeast44(page, address);
      });
    }
  });

  for (const viewport of [VIEWPORTS.narrow, VIEWPORTS.tablet, VIEWPORTS.desktop]) {
    test(`US-04-AC-28 ${viewport.width} x ${viewport.height}: the country chip link's box lies inside the viewport and inside the header's content box`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openCo(page);
      const chip = await boxOf(header(page).getByRole('link', { name: CHIP_CO, exact: true }));
      const content = await header(page).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return { left: r.left + parseFloat(s.paddingLeft), right: r.right - parseFloat(s.paddingRight), top: r.top + parseFloat(s.paddingTop), bottom: r.bottom - parseFloat(s.paddingBottom) };
      });
      expect(chip.left).toBeGreaterThanOrEqual(-0.5);
      expect(chip.right).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(chip.left, 'inside the header content box (left)').toBeGreaterThanOrEqual(content.left - 0.5);
      expect(chip.right, 'inside the header content box (right)').toBeLessThanOrEqual(content.right + 0.5);
      expect(chip.top, 'inside the header content box (top)').toBeGreaterThanOrEqual(content.top - 0.5);
      expect(chip.bottom, 'inside the header content box (bottom)').toBeLessThanOrEqual(content.bottom + 0.5);
      await expectNoHorizontalScroll(page, `(header at ${viewport.width})`);
    });
  }
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-AC-29 a richer country chooser', () => {
  for (const viewport of [VIEWPORTS.narrow, VIEWPORTS.tablet, VIEWPORTS.desktop]) {
    test(`US-04-AC-29 ${viewport.width} x ${viewport.height}: the header, the h1, the lead paragraph, the two country links and "Cómo funciona" with its three steps are visible, with no horizontal scroll and targets of at least 44 x 44`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(header(page)).toContainText('Cotizador de seguro de auto');
      await expect(header(page).getByRole('link')).toHaveCount(0);
      await expect(header(page).getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: 'Elige tu país' })).toBeVisible();
      await expect(
        page.getByText('Cotiza el seguro de tu auto en pocos minutos. Elige el país donde está matriculado tu vehículo para ver los planes y precios disponibles.'),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'Colombia', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Chile', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Cómo funciona' })).toBeVisible();
      const items = page.getByRole('listitem').filter({ hasText: /Cuéntanos sobre ti|Compara coberturas|Revisa, acepta/ });
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText('Tus datos');
      await expect(items.nth(0)).toContainText('Cuéntanos sobre ti y tu vehículo.');
      await expect(items.nth(1)).toContainText('Plan');
      await expect(items.nth(1)).toContainText('Compara coberturas y precios.');
      await expect(items.nth(2)).toContainText('Resumen y pago');
      await expect(items.nth(2)).toContainText('Revisa, acepta los términos y paga.');
      await expectNoHorizontalScroll(page, `(chooser at ${viewport.width})`);
      await expectTargetsAtLeast44(page, `(chooser at ${viewport.width})`);
    });
  }

  test('US-04-AC-29 pressing Tab from the top of the chooser reaches "Colombia" and then "Chile", and nothing else of the page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Colombia', exact: true })).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Colombia', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Chile', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName ?? 'none'), 'the focus leaves the page content after the second link').not.toBe('A');
  });
});
