/**
 * DOM helpers for the summary page tests (US-03). Like `dom.ts` and `plan-dom.ts`, they query what
 * a person or assistive technology perceives: headings, description lists, buttons, regions, the
 * accessible name and description, `aria-*` states. No class name or id of the implementation.
 *
 * The page contract they rely on (spec section 8, ADR-0008, ADR-0009):
 *  - `h1` "Resumen de tu cotización" with focus; four `h2`, each inside its own `section`;
 *  - the data are `dl` lists of `dt` (label) and `dd` (value); a masked value is a `dd` with an
 *    `aria-hidden="true"` element holding the bullets and a text for assistive technology;
 *  - the terms are a focusable element with `role="region"` named by the terms title;
 *  - "Pagar", "Editar mis datos" and "Cambiar plan" are `button` elements, unavailable through
 *    `aria-disabled="true"` (never the native `disabled` on "Pagar", so it keeps the focus).
 */
import { normalise } from './dom';
import { accessibleName } from './plan-dom';

/** The text a screen reader gets: every text node that is not inside an `aria-hidden="true"` element. */
export function accessibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';
  if (node.getAttribute('aria-hidden') === 'true') return '';
  return Array.from(node.childNodes).map(accessibleText).join('');
}

/** The text of the `aria-hidden="true"` elements inside, or null when there is none. */
export function hiddenFromAssistiveText(el: Element): string | null {
  const hidden = Array.from(el.querySelectorAll('[aria-hidden="true"]'));
  return hidden.length === 0 ? null : normalise(hidden.map((h) => h.textContent).join(''));
}

export interface Row {
  label: string;
  /** What a sighted person reads: the `aria-hidden` text when there is one (the masked bullets), else the text. */
  value: string;
  /** What a screen reader gets. */
  spoken: string;
}

export function h2s(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('h2'));
}

export function sectionOf(root: ParentNode, headingText: string): HTMLElement | null {
  const heading = h2s(root).find((h) => normalise(h.textContent) === headingText);
  return (heading?.closest('section') as HTMLElement | null) ?? null;
}

/** The label and value pairs of the `dl` lists of a section, in document order. */
export function rowsOf(section: ParentNode | null): Row[] {
  if (!section) return [];
  return Array.from(section.querySelectorAll('dt')).map((dt) => {
    const dd = dt.nextElementSibling as HTMLElement | null;
    if (!dd || dd.tagName !== 'DD') throw new Error(`The term "${dt.textContent}" has no description next to it`);
    return { label: normalise(dt.textContent), value: hiddenFromAssistiveText(dd) ?? normalise(dd.textContent), spoken: normalise(accessibleText(dd)) };
  });
}

export const asPairs = (rows: Row[]): [string, string][] => rows.map((r) => [r.label, r.value]);

export function payButton(root: ParentNode): HTMLButtonElement | null {
  return (
    (Array.from(root.querySelectorAll('button')).find((b) => ['Pagar', 'Procesando pago…'].includes(normalise(b.textContent))) as HTMLButtonElement | undefined) ?? null
  );
}

/** `aria-disabled="true"` or natively disabled: the person cannot act on it. */
export function isUnavailable(el: HTMLElement): boolean {
  return el.getAttribute('aria-disabled') === 'true' || el.matches(':disabled');
}

export function terms(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('[role="region"]');
}

export function regionNamed(root: ParentNode, name: string): HTMLElement | null {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="region"]')).find((r) => accessibleName(r) === name) ?? null;
}

export function headingLevel(el: Element): number | null {
  const match = /^H([1-6])$/.exec(el.tagName);
  return match ? Number(match[1]) : null;
}

export function headingsIn(el: ParentNode): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
}

/** Non-empty texts of the `role="status"` regions. */
export function statusTexts(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('[role="status"]'))
    .map((e) => normalise(e.textContent))
    .filter((t) => t.length > 0);
}

/** The elements a keyboard user can reach with Tab, in document order, as readable names (radios of a group count once). */
export function tabStops(root: ParentNode): string[] {
  const stops: string[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))) {
    if (el.getAttribute('tabindex') === '-1' || el.matches(':disabled')) continue;
    let name: string;
    if (el instanceof HTMLInputElement && el.type === 'radio') name = 'simulation group';
    else if (el instanceof HTMLInputElement && el.type === 'checkbox') name = 'checkbox';
    else if (el.getAttribute('role') === 'region') name = 'terms region';
    else if (el.tagName === 'BUTTON') name = normalise(el.textContent);
    else name = el.tagName.toLowerCase();
    if (stops[stops.length - 1] !== name) stops.push(name);
  }
  return stops;
}
