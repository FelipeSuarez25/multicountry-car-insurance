import { expect, type Locator, type Page } from '@playwright/test';
import { field } from './form';

/**
 * Helpers for the US-04 design-system tests. Everything is found by role, accessible name or visible
 * text; the few in-page measurements (hit boxes, computed durations, geometry of a panel) read the DOM
 * and computed styles, never a class or an id of the implementation.
 */

export const VIEWPORTS = {
  narrow: { width: 360, height: 740 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

/** "document.documentElement.scrollWidth <= window.innerWidth" (US-04-BR-11). */
export async function expectNoHorizontalScroll(page: Page, where = ''): Promise<void> {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll, `horizontal scroll ${where}: scrollWidth ${scroll} > innerWidth ${inner}`).toBeLessThanOrEqual(inner);
}

/**
 * Every visible interactive element has a hit box of at least 44 x 44 CSS px (US-04-BR-11, AC-18). A
 * checkbox or radio is measured as its input together with its label. Elements hidden from assistive
 * technology (the page behind a modal dialog, decorative parts) and visually hidden ones (1 px) are skipped.
 * Returns what failed, as readable text.
 */
export async function targetProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44;
    const EPS = 0.5;
    const selector = 'a[href], button, [role="button"], [role="combobox"], [role="option"], [role="gridcell"], input:not([type="hidden"]), select, textarea';
    const nameOf = (el: Element): string => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const problems: string[] = [];
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const isChoice = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');
      const rects = (isChoice ? [r, ...Array.from(el.labels ?? []).map((l) => l.getBoundingClientRect())] : [r]).filter((x) => x.width > 0 && x.height > 0);
      if (rects.length === 0 || (rects.length === 1 && rects[0].width <= 1 && rects[0].height <= 1)) continue;
      const width = Math.max(...rects.map((x) => x.right)) - Math.min(...rects.map((x) => x.left));
      const height = Math.max(...rects.map((x) => x.bottom)) - Math.min(...rects.map((x) => x.top));
      if (isChoice ? width < MIN - EPS || height < MIN - EPS : r.width < MIN - EPS || r.height < MIN - EPS) {
        problems.push(`${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} "${nameOf(el)}" is ${(isChoice ? width : r.width).toFixed(1)} x ${(isChoice ? height : r.height).toFixed(1)}`);
      }
    }
    return problems;
  });
}

export async function expectTargetsAtLeast44(page: Page, where = ''): Promise<void> {
  expect(await targetProblems(page), `interactive elements under 44 x 44 px ${where}`).toEqual([]);
}

/** A visible focus indicator on the element that has the focus: an outline or a box-shadow drawn on it itself. */
export async function expectFocusIndicatorOnActive(page: Page, what: string): Promise<void> {
  const visible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const style = getComputedStyle(el);
    return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
  });
  expect(visible, `${what}: a focused control must show a focus indicator on itself`).toBe(true);
}

/** The row `aria-activedescendant` points at, as text, or null. */
export async function activeOptionText(control: Locator): Promise<string | null> {
  return control.evaluate((el) => {
    const id = el.getAttribute('aria-activedescendant');
    const row = id ? document.getElementById(id) : null;
    return row ? (row.textContent ?? '').replace(/\s+/g, ' ').trim() : null;
  });
}

/** A visible focus indicator on the active option row (the row aria-activedescendant points at). */
export async function expectActiveOptionIndicator(control: Locator, what: string): Promise<void> {
  const visible = await control.evaluate((el) => {
    const id = el.getAttribute('aria-activedescendant');
    const row = id ? document.getElementById(id) : null;
    if (!row) return false;
    const style = getComputedStyle(row);
    return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
  });
  expect(visible, `${what}: the active option row must show a focus indicator on itself`).toBe(true);
}

/** The accessible name of the element that has the focus: a day cell by its full date, otherwise aria-label or text. */
export async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return 'none';
    const cell = el.closest('[role="gridcell"]');
    const named = (cell ?? el).getAttribute('aria-label');
    return (named ?? el.textContent ?? el.tagName).replace(/\s+/g, ' ').trim();
  });
}

export function calendarDialog(page: Page): Locator {
  return page.getByRole('dialog');
}

export function dateButton(page: Page, label = 'Fecha de nacimiento'): Locator {
  return page.getByRole('button', { name: `Elegir fecha: ${label}` });
}

/** The label of a Spanish full date as the calendar names its days: "15 de mayo de 1990". */
export function longDate(tag: string, year: number, month: number, day: number): string {
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}

/** Choose 15/05/1990 with the calendar (today pinned to 2026-11-21 opens on November 2008): year list, six months back, the day. */
export async function chooseBirthDateWithCalendar(page: Page): Promise<void> {
  await dateButton(page).click();
  const dialog = calendarDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Elegir año' }).click();
  await page.getByRole('option', { name: '1990', exact: true }).click();
  for (let i = 0; i < 6; i++) await dialog.getByRole('button', { name: 'Mes anterior' }).click();
  await dialog.getByRole('gridcell', { name: '15 de mayo de 1990' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(dateButton(page)).toBeFocused();
  await expect(field(page, 'Fecha de nacimiento')).toHaveValue('15/05/1990');
}

/**
 * The box of the open panel of a select or of the calendar. On narrow screens the panel of a select is the
 * ancestor of its listbox that also holds the "Cerrar" button (the bottom sheet); otherwise the listbox itself.
 */
export async function panelBox(page: Page, kind: 'select' | 'calendar'): Promise<{ left: number; right: number; top: number; bottom: number; width: number; height: number }> {
  return page.evaluate((k) => {
    let panel: Element | null;
    if (k === 'calendar') {
      panel = document.querySelector('[role="dialog"]');
    } else {
      const listbox = document.querySelector('[role="listbox"]');
      const close = Array.from(document.querySelectorAll('button')).find((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === 'Cerrar') ?? null;
      let node: Element | null = listbox;
      while (node && close && !node.contains(close)) node = node.parentElement;
      panel = close && node ? node : listbox;
    }
    if (!panel) throw new Error('No open panel');
    const r = panel.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  }, kind);
}

/** Computed animation and transition durations are all 0s, and no animation runs (US-04-AC-17). */
export async function motionProblems(page: Page): Promise<{ elements: string[]; animations: number }> {
  return page.evaluate(() => {
    const zero = (value: string): boolean => value.split(',').every((v) => v.trim() === '0s' || v.trim() === '');
    const elements: string[] = [];
    for (const el of [document.documentElement, ...Array.from(document.querySelectorAll('*'))]) {
      for (const pseudo of [null, '::before', '::after'] as const) {
        const style = getComputedStyle(el, pseudo);
        if (!zero(style.animationDuration) || !zero(style.transitionDuration)) {
          elements.push(`${el.tagName.toLowerCase()}${pseudo ?? ''} animation ${style.animationDuration} transition ${style.transitionDuration}`);
        }
      }
    }
    return { elements, animations: document.getAnimations().length };
  });
}

export async function expectNoMotion(page: Page, where: string): Promise<void> {
  const found = await motionProblems(page);
  expect(found.elements, `${where}: computed durations other than 0s`).toEqual([]);
  expect(found.animations, `${where}: document.getAnimations() must be empty`).toBe(0);
}
