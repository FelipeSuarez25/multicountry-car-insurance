/**
 * DOM helpers for component tests. Queries go through what a person or assistive technology
 * perceives: the label text, the button name, the described-by text and the alert regions.
 * They never use component classes, ids or internal test hooks.
 */

/** Label text as a person reads it: whitespace collapsed, the required marker "*" removed. */
export function normalise(text: string | null | undefined): string {
  return (text ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

export type Control = HTMLInputElement | HTMLSelectElement;

/** All labels of the page, in document order, as text. */
export function allLabels(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('label'))
    .map((l) => normalise(l.textContent))
    .filter((t) => t.length > 0);
}

/** The control a label names (by `for` or by nesting), or null when no such label exists. */
export function maybeControl(root: ParentNode, label: string): Control | null {
  for (const l of Array.from(root.querySelectorAll('label'))) {
    if (normalise(l.textContent) === label && l.control) return l.control as Control;
  }
  return null;
}

export function control(root: ParentNode, label: string): Control {
  const found = maybeControl(root, label);
  if (!found) throw new Error(`No control is labelled "${label}"`);
  return found;
}

/** Every native control that holds a value (inputs and selects), in document order. */
export function allControls(root: ParentNode): Control[] {
  return Array.from(root.querySelectorAll<Control>('input, select'));
}

export function button(root: ParentNode, name: string): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll('button')).find((b) => normalise(b.textContent) === name);
  if (!found) throw new Error(`No button named "${name}"`);
  return found as HTMLButtonElement;
}

export function maybeButton(root: ParentNode, name: string): HTMLButtonElement | null {
  return (Array.from(root.querySelectorAll('button')).find((b) => normalise(b.textContent) === name) as HTMLButtonElement | undefined) ?? null;
}

export function typeInto(el: Control, text: string): void {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Leave a control (the "touched" moment of Signal Forms). */
export function leave(el: Control): void {
  el.dispatchEvent(new FocusEvent('blur'));
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

/** Pick the option whose visible text matches (a person chooses by what they read). */
export function choose(select: HTMLSelectElement, optionText: string): void {
  const option = Array.from(select.options).find((o) => normalise(o.textContent) === optionText);
  if (!option) throw new Error(`No option "${optionText}"`);
  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function setChecked(el: HTMLInputElement, checked: boolean): void {
  if (el.checked !== checked) el.click();
}

/**
 * Fill the form with values keyed by visible label. A `null` value leaves the control untouched.
 * Selects take the option text, checkboxes a boolean, everything else a string.
 */
export function fillForm(root: ParentNode, values: Record<string, string | boolean | null>): void {
  for (const [label, value] of Object.entries(values)) {
    if (value === null) continue;
    const el = control(root, label);
    if (el instanceof HTMLSelectElement) {
      choose(el, value as string);
    } else if (el.type === 'checkbox') {
      setChecked(el, value as boolean);
    } else {
      typeInto(el, value as string);
    }
  }
}

/** The text of every element the control points at with aria-describedby (help text, error). */
export function describedText(el: Control): string {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids
    .map((id) => normalise(el.ownerDocument.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ');
}

/** Non-empty texts of the alert regions of the page. */
export function alertTexts(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('[role="alert"]'))
    .map((e) => normalise(e.textContent))
    .filter((t) => t.length > 0);
}

/** Controls currently exposed as invalid. */
export function invalidControls(root: ParentNode): Control[] {
  return allControls(root).filter((c) => c.getAttribute('aria-invalid') === 'true');
}

export function isExposedAsRequired(el: Control): boolean {
  return el.required || el.getAttribute('aria-required') === 'true';
}

/** The labels of the controls that currently show an error, in document order. */
export function labelsWithErrors(root: ParentNode): string[] {
  return invalidControls(root).map((c) => normalise(c.labels?.[0]?.textContent));
}

/** Current value of a control as a person sees it (checkbox: boolean, select: the option text). */
export function shownValue(el: Control): string | boolean {
  if (el instanceof HTMLSelectElement) return normalise(el.selectedOptions[0]?.textContent);
  if (el.type === 'checkbox') return el.checked;
  return el.value;
}
