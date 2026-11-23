/**
 * Component-test helpers for the design-system controls of US-04: the custom select (ADR-0012
 * section 3) and the date field with its calendar dialog (ADR-0012 section 4). They look for what a
 * person or assistive technology perceives (roles, accessible names, ARIA states), never for a class
 * or an id of the implementation.
 *
 * DOM contract the tests rely on (spec 5, 8 and ADR-0012):
 *  - the select's popup is a `role="listbox"` with `role="option"` rows and `aria-selected`; while it
 *    is rendered, the combobox's `aria-controls` points at it and `aria-activedescendant` at the
 *    active row; both live under `document.body` in jsdom;
 *  - the date field is a text box plus a button named "Elegir fecha: <label>"; the calendar is a
 *    `role="dialog"` with `aria-modal="true"`, named (`aria-labelledby`) by the visible month and
 *    year, buttons "Elegir año", "Mes anterior", "Mes siguiente", "Cerrar", a `role="grid"` whose
 *    `role="columnheader"` cells expose the full day names and whose `role="gridcell"` cells carry
 *    `aria-label="15 de mayo de 1990"`, `aria-selected` and `aria-disabled`; the year list is a
 *    `role="listbox"` of the years;
 *  - messages for the polite live region are text inside an `[aria-live="polite"]` or
 *    `role="status"` element anywhere in the document (the CDK `LiveAnnouncer` or the component's own).
 */
import { normalise, settleUi } from './dom';

/** The accessible name: `aria-labelledby`, then `aria-label`, then the text content. */
export function nameOf(el: Element): string {
  const by = el.getAttribute('aria-labelledby');
  if (by) {
    return normalise(
      by
        .split(/\s+/)
        .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '')
        .join(' '),
    );
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return normalise(aria);
  return normalise(el.textContent);
}

/** A button found by its accessible name (an icon-only button has the name from `aria-label`). */
export function buttonNamed(root: ParentNode, name: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => nameOf(b) === name);
  if (!found) throw new Error(`No button is named "${name}"`);
  return found;
}

export function maybeButtonNamed(root: ParentNode, name: string): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => nameOf(b) === name) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Select: active row, live announcements
// ---------------------------------------------------------------------------------------------

/** The text of the row `aria-activedescendant` points at, or null when none is active. */
export function activeOptionText(combo: Element): string | null {
  const id = combo.getAttribute('aria-activedescendant');
  if (!id) return null;
  const row = combo.ownerDocument.getElementById(id);
  return row ? normalise(row.textContent) : null;
}

/** The rows with `aria-selected="true"` of a popup, as text. */
export function selectedOptionTexts(listbox: ParentNode): string[] {
  return Array.from(listbox.querySelectorAll('[role="option"][aria-selected="true"]')).map((o) => normalise(o.textContent));
}

/** Everything announced politely (CDK LiveAnnouncer or a component's own live region), joined. */
export function politeText(doc: Document = document): string {
  return Array.from(doc.querySelectorAll('[aria-live="polite"], [role="status"]'))
    .map((e) => normalise(e.textContent))
    .filter(Boolean)
    .join(' | ');
}

// ---------------------------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------------------------

export function calendarDialog(doc: Document = document): HTMLElement | null {
  return doc.querySelector<HTMLElement>('[role="dialog"]');
}

export async function openCalendar(root: ParentNode, fieldLabel: string): Promise<HTMLElement> {
  buttonNamed(root, `Elegir fecha: ${fieldLabel}`).click();
  await settleUi();
  const dialog = calendarDialog();
  if (!dialog) throw new Error('"Elegir fecha" did not open a dialog');
  return dialog;
}

/** The grid cell whose accessible name is the full date, e.g. "15 de mayo de 1990". */
export function dayCell(dialog: ParentNode, fullDate: string): HTMLElement | null {
  return Array.from(dialog.querySelectorAll<HTMLElement>('[role="gridcell"]')).find((c) => nameOf(c) === fullDate) ?? null;
}

export function dayCells(dialog: ParentNode): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>('[role="gridcell"]'));
}

/** The name of the day that has the keyboard focus (the cell, or an element inside it), or null. */
export function focusedDay(doc: Document = document): string | null {
  const active = doc.activeElement;
  const cell = active?.closest('[role="gridcell"]') ?? null;
  return cell ? nameOf(cell) : null;
}

export function isDayDisabledInDom(cell: Element): boolean {
  return cell.getAttribute('aria-disabled') === 'true' || cell.querySelector('[aria-disabled="true"]') !== null;
}

/** The column headers of the grid, as their accessible text, in order (abbreviations are read through `abbr[title]`). */
export function columnNames(dialog: ParentNode): string[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>('[role="columnheader"]')).map((h) => {
    const abbr = h.querySelector('abbr[title]');
    return normalise(h.getAttribute('aria-label') ?? abbr?.getAttribute('title') ?? h.textContent);
  });
}

/** Years listed by the year selector, as text. */
export function yearTexts(dialog: ParentNode): string[] {
  const list = dialog.querySelector('[role="listbox"]');
  return list ? Array.from(list.querySelectorAll('[role="option"]')).map((o) => normalise(o.textContent)) : [];
}

/** "noviembre de 2008": the name of the dialog is the visible month and year. */
export function calendarTitle(dialog: HTMLElement): string {
  return nameOf(dialog);
}

/**
 * The child of `<body>` that holds `el`: the CDK marks the siblings of its overlay container
 * `aria-hidden="true"` while a dialog is open (ADR-0012 section 4); jsdom has no `inert`.
 */
export function topLevelOf(el: Element): Element | null {
  let node: Element | null = el;
  while (node && node.parentElement !== node.ownerDocument.body) node = node.parentElement;
  return node;
}

// ---------------------------------------------------------------------------------------------
// Wizard header and step indicator (US-04-AC-03, AC-13)
// ---------------------------------------------------------------------------------------------

export const INDICATOR_NAME = 'Progreso de la cotización';
export const STEP_LABELS = ['Tus datos', 'Plan', 'Resumen y pago'];
/** Anything a keyboard user can land on, and every heading: neither the header nor the indicator may hold one. */
export const FOCUSABLE_OR_HEADING = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable], h1, h2, h3, h4, h5, h6';

/** The step indicator: a list named "Progreso de la cotización" (spec 8.1). */
export function stepIndicator(root: ParentNode): HTMLElement | null {
  return Array.from(root.querySelectorAll<HTMLElement>('ol, ul, [role="list"]')).find((l) => nameOf(l) === INDICATOR_NAME) ?? null;
}

export function indicatorItems(indicator: ParentNode): HTMLElement[] {
  return Array.from(indicator.querySelectorAll<HTMLElement>('li'));
}

/** The wizard header: a `header` (or `role="banner"`) element with the product name and the country chip. */
export function wizardHeader(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('header, [role="banner"]');
}

// ---------------------------------------------------------------------------------------------
// Back links, country chip link and chooser (US-04-AC-28, AC-29)
// ---------------------------------------------------------------------------------------------

/** A link found by its accessible name, exactly (the chip "Cambiar país (actual: Colombia)" is not the back link "Cambiar país"). */
export function maybeLinkNamed(root: ParentNode, name: string): HTMLAnchorElement | null {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]')).find((a) => nameOf(a) === name) ?? null;
}

export function linkNamed(root: ParentNode, name: string): HTMLAnchorElement {
  const found = maybeLinkNamed(root, name);
  if (!found) throw new Error(`No link is named "${name}"`);
  return found;
}

/** The names the three back links may have (AC-28); the confirmation, the chooser and the error pages have none of them. */
export const BACK_LINK_NAMES = ['Cambiar país', 'Volver a tus datos', 'Volver a planes'];

/** The back links present in a page area, by exact accessible name. */
export function backLinksIn(root: ParentNode): string[] {
  return BACK_LINK_NAMES.filter((name) => maybeLinkNamed(root, name) !== null);
}

/** True when `a` comes before `b` in document order. */
export function isBefore(a: Node, b: Node): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

/** Everything Tab reaches, in document order, as accessible names (links by name, controls by label or text). */
export function tabStopNames(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]'))
    .filter((e) => e.getAttribute('tabindex') !== '-1' && e.getAttribute('aria-hidden') !== 'true' && !(e as HTMLButtonElement).disabled)
    .map((e) => nameOf(e));
}
