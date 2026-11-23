import { expect, test, type Page } from '@playwright/test';
import { expectDescribedBy, field } from './support/form';
import { TODAY } from './support/plans';

/**
 * US-04 review round 3 (reviews/US-04-review-R3.md), against the real stack with the seed:
 *  - US-04-R3-F01 edits in the middle of the typed date, with the real keyboard.
 *  - US-04-R3-F02 IME composition on "Placa", driven through the Chrome DevTools Protocol
 *    (`Input.imeSetComposition`, `Input.insertText`); `fill()` and `pressSequentially()` never compose.
 *  - US-04-R3-F03 the Strapi content really carries the rules the front end relies on.
 */

const BIRTH = 'Fecha de nacimiento';
const UNREADABLE = 'Fecha no válida. Usa el formato dd/mm/aaaa.';

async function openCo(page: Page): Promise<void> {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/co/datos');
  await expect(field(page, 'Placa')).toBeVisible();
}

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R3-F01 the typed date can be corrected in the middle', () => {
  /** Types the full date, then moves the caret `left` positions from the end. */
  async function typedWithCaretAt(page: Page, left: number): Promise<ReturnType<typeof field>> {
    await openCo(page);
    const box = field(page, BIRTH);
    await box.focus();
    await box.pressSequentially('15/05/1990');
    await expect(box).toHaveValue('15/05/1990');
    for (let i = 0; i < left; i++) await page.keyboard.press('ArrowLeft');
    return box;
  }

  test('US-04-R3-F01 Backspace on the month\'s 5 (caret after it) shows "15/01/990", and leaving shows the invalid-date message', async ({ page }) => {
    const box = await typedWithCaretAt(page, 5);
    await page.keyboard.press('Backspace');
    await expect(box).toHaveValue('15/01/990');
    await page.keyboard.press('Tab');
    await expectDescribedBy(page, BIRTH, UNREADABLE);
    await expect(box).toHaveAttribute('aria-invalid', 'true');
  });

  test('US-04-R3-F01 Backspace on the day\'s 5 (caret after it) shows "10/51/990" (digits in order, "/" after the 2nd and 4th) and leaving shows the invalid-date message', async ({ page }) => {
    const box = await typedWithCaretAt(page, 8);
    await page.keyboard.press('Backspace');
    await expect(box).toHaveValue('10/51/990');
    await page.keyboard.press('Tab');
    await expectDescribedBy(page, BIRTH, UNREADABLE);
  });

  test('US-04-R3-F01 Backspace right after a "/" removes the digit before it, not only the "/"', async ({ page }) => {
    const box = await typedWithCaretAt(page, 7);
    await page.keyboard.press('Backspace');
    await expect(box).toHaveValue('10/51/990');
  });

  test('US-04-R3-F01 Delete on the day\'s 5 (caret before it) gives the same digits in order: "10/51/990"', async ({ page }) => {
    const box = await typedWithCaretAt(page, 9);
    await page.keyboard.press('Delete');
    await expect(box).toHaveValue('10/51/990');
  });

  test('US-04-R3-F01 a digit typed into a full text is ignored (no "06/01/0519"), the date stays "01/05/1990"', async ({ page }) => {
    await openCo(page);
    const box = field(page, BIRTH);
    await box.focus();
    await box.pressSequentially('01/05/1990');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('6');
    await expect(box).toHaveValue('01/05/1990');
  });

  test('US-04-R3-F01 after a deletion the person can type again: "15/05/1990", Backspace on the day\'s 5, End, "0" gives "10/51/9900"', async ({ page }) => {
    const box = await typedWithCaretAt(page, 8);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('End');
    await page.keyboard.press('0');
    await expect(box).toHaveValue('10/51/9900');
  });

  test('US-04-R3-F01 select the day, type "1", then "6" after it: the day can be re-typed ("16/05/1990")', async ({ page }) => {
    const box = await typedWithCaretAt(page, 0);
    await box.evaluate((el: HTMLInputElement) => el.setSelectionRange(0, 2));
    await page.keyboard.press('1');
    await expect(box).toHaveValue('10/51/990');
    await page.keyboard.press('6');
    await expect(box).toHaveValue('16/05/1990');
  });

  test('US-04-R3-F01 select all and type "2" replaces the whole text', async ({ page }) => {
    const box = await typedWithCaretAt(page, 0);
    await box.selectText();
    await page.keyboard.press('2');
    await expect(box).toHaveValue('2');
    await page.keyboard.press('0');
    await expect(box).toHaveValue('20');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R3-F02 IME composition on a profile field (CDP)', () => {
  test('US-04-R3-F02 "Placa": composing "a", "ab", "abc" and committing "abc" ends as "ABC", not "AABABCABC"', async ({ page }) => {
    await openCo(page);
    const plate = field(page, 'Placa');
    await plate.focus();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['a', 'ab', 'abc']) {
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    }
    await cdp.send('Input.insertText', { text: 'abc' });
    await expect(plate).toHaveValue('ABC');
    await expect.poll(async () => page.evaluate(() => JSON.parse(sessionStorage.getItem('quote-wizard') ?? '{}').step1?.values?.plate)).toBe('ABC');
  });

  test('US-04-R3-F02 "Placa": a composition with characters outside the profile ("ab-1") ends as "AB1"', async ({ page }) => {
    await openCo(page);
    const plate = field(page, 'Placa');
    await plate.focus();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ['a', 'ab', 'ab-', 'ab-1']) {
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    }
    await cdp.send('Input.insertText', { text: 'ab-1' });
    await expect(plate).toHaveValue('AB1');
  });

  test('US-04-R3-F02 "Placa": typing after a composition goes on from the committed text ("ABC" + "1" = "ABC1")', async ({ page }) => {
    await openCo(page);
    const plate = field(page, 'Placa');
    await plate.focus();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'abc', selectionStart: 3, selectionEnd: 3 });
    await cdp.send('Input.insertText', { text: 'abc' });
    await page.keyboard.press('1');
    await expect(plate).toHaveValue('ABC1');
  });
});

// ---------------------------------------------------------------------------------------------
test.describe('US-04-R3-F03 the Strapi content carries the rules (the e2e maxlength rows must not pass on the front-end fallback)', () => {
  interface Rule { kind: string; value: number | null; pattern: string | null }
  interface Item { key: string; errorMessage: string; rules: Rule[] }

  async function seeded(page: Page, country: 'CO' | 'CL'): Promise<Record<string, Item>> {
    const response = await page.request.get('/api/form-fields', { params: { 'filters[country][code][$eq]': country, 'populate[rules]': 'true', 'pagination[pageSize]': '100' } });
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: Item[] };
    return Object.fromEntries(body.data.map((item) => [item.key, item]));
  }
  const maxLengths = (item: Item | undefined): (number | null)[] => (item?.rules ?? []).filter((r) => r.kind === 'maxLength').map((r) => r.value);

  const rows: ['CO' | 'CL', string, number][] = [
    ['CO', 'documentNumber', 10],
    ['CL', 'documentNumber', 12],
    ['CO', 'plate', 6],
    ['CL', 'plate', 6],
  ];
  for (const [country, key, value] of rows) {
    test(`US-04-R3-F03 /api/form-fields ${country} "${key}" has a maxLength rule of ${value} (the source of the maxlength attribute)`, async ({ page }) => {
      expect(maxLengths((await seeded(page, country))[key])).toEqual([value]);
    });
  }

  for (const country of ['CO', 'CL'] as const) {
    test(`US-04-R3-F03 /api/form-fields ${country} "fullName" has the Latin-1 pattern rule and the new errorMessage, and the pattern accepts "José Núñez-O'Neil Jr." and rejects "Ana 2" as the front end compiles it`, async ({ page }) => {
      const item = (await seeded(page, country))['fullName'];
      expect(item?.errorMessage).toBe('Ingresa tu nombre completo, solo letras (entre 3 y 80 caracteres).');
      const patterns = (item?.rules ?? []).filter((r) => r.kind === 'pattern');
      expect(patterns).toHaveLength(1);
      const re = new RegExp('^(?:' + patterns[0].pattern + ')$');
      expect(re.test("José Núñez-O'Neil Jr.")).toBe(true);
      expect(re.test('Ana 2')).toBe(false);
    });
  }
});
