/**
 * DOM helpers for the step 2 component tests. Like `dom.ts`, they query what a person or assistive
 * technology perceives (roles, accessible names, described-by text), never classes or ids of the
 * implementation. The plans are native single-choice controls (US-02-Q-13), so they are radios.
 */
import { normalise } from './dom';

/** Text with every whitespace removed (prices are compared this way, spec BR-03). */
export function compact(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, '');
}

/** The accessible name of a control: aria-labelledby, then aria-label, then its <label>. */
export function accessibleName(el: HTMLElement): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    return normalise(
      labelledBy
        .split(/\s+/)
        .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '')
        .join(' '),
    );
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return normalise(aria);
  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length > 0) return normalise(Array.from(labels).map((l) => l.textContent).join(' '));
  return '';
}

/** The accessible description: the text of every element `aria-describedby` points to. */
export function accessibleDescription(el: HTMLElement): string {
  return (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => normalise(el.ownerDocument.getElementById(id)?.textContent))
    .join(' ');
}

/** Every plan option, in document order. */
export function planRadios(root: ParentNode): HTMLInputElement[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
}

/** The plan names a person can choose from, in the order they appear. */
export function planNames(root: ParentNode): string[] {
  return planRadios(root).map(accessibleName);
}

export function maybeRadio(root: ParentNode, planName: string): HTMLInputElement | null {
  return planRadios(root).find((r) => accessibleName(r) === planName) ?? null;
}

export function radio(root: ParentNode, planName: string): HTMLInputElement {
  const found = maybeRadio(root, planName);
  if (!found) throw new Error(`No plan option is named "${planName}"`);
  return found;
}

/** The names of the options that are checked (at most one is allowed). */
export function chosenNames(root: ParentNode): string[] {
  return planRadios(root)
    .filter((r) => r.checked)
    .map(accessibleName);
}

/** A person selects a plan: activating the option (a click or Space on a radio). */
export function choosePlanOption(root: ParentNode, planName: string): void {
  radio(root, planName).click();
}

/**
 * The container of one plan: the largest ancestor of its option that does not also contain another
 * plan's name. Everything the spec says "a plan shows" (description, price, lists, markers) is
 * looked up inside it, so a text can never be credited to the wrong plan.
 */
export function cardOf(root: ParentNode, planName: string, allNames: string[]): HTMLElement {
  const others = allNames.filter((n) => n !== planName);
  let current: HTMLElement = radio(root, planName);
  let best: HTMLElement = current.parentElement ?? current;
  while (current.parentElement) {
    const parent: HTMLElement = current.parentElement;
    const text = normalise(parent.textContent);
    if (others.some((n) => text.includes(n))) break;
    best = parent;
    current = parent;
  }
  return best;
}

/** The element that groups the options: a radiogroup or a fieldset. */
export function groupOf(root: ParentNode): HTMLElement | null {
  const first = planRadios(root)[0];
  return (first?.closest('[role="radiogroup"], fieldset') as HTMLElement | null) ?? null;
}

/** Accessible name of the group: aria-labelledby, aria-label, or the legend of a fieldset. */
export function groupName(group: HTMLElement): string {
  const named = accessibleName(group);
  if (named) return named;
  return normalise(group.querySelector('legend')?.textContent);
}

/** The texts of the live regions (`aria-live` or `role=status`) of the page. */
export function liveTexts(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('[aria-live], [role="status"]'))
    .map((e) => normalise(e.textContent))
    .filter((t) => t.length > 0);
}

/** `true` when the element, or an ancestor, is a polite live region. */
export function isPoliteLiveRegion(el: HTMLElement): boolean {
  const region = el.closest('[aria-live], [role="status"]');
  if (!region) return false;
  const live = region.getAttribute('aria-live');
  return live === 'polite' || (live === null && region.getAttribute('role') === 'status');
}

/** The list that follows a heading with the given text inside a card (a `ul`/`ol` right after it). */
export function listAfterHeading(card: HTMLElement, headingText: string): HTMLElement | null {
  const heading = Array.from(card.querySelectorAll('h2, h3, h4, h5, h6')).find((h) => normalise(h.textContent) === headingText);
  if (!heading) return null;
  const next = heading.nextElementSibling;
  return next && /^(UL|OL)$/.test(next.tagName) ? (next as HTMLElement) : null;
}

export function listItems(list: HTMLElement): string[] {
  return Array.from(list.querySelectorAll('li')).map((li) => normalise(li.textContent));
}

export function hasHeading(card: HTMLElement, headingText: string): boolean {
  return Array.from(card.querySelectorAll('h2, h3, h4, h5, h6')).some((h) => normalise(h.textContent) === headingText);
}
