/**
 * DOM helpers for component tests. Queries go through what a person or assistive technology
 * perceives: the label text, the button name, the described-by text and the alert regions.
 * They never use component classes, ids or internal test hooks.
 *
 * US-04 (spec 11.1): the step 1 controls are no longer native selects and date inputs. A `select`
 * field is a combobox (`<button role="combobox">` for a select-only list, `<input role="combobox">`
 * for a searchable one, ADR-0012 section 3) whose popup is a `role="listbox"` that the CDK renders
 * under `document.body`, outside the component root in jsdom (ADR-0012 section 8). A `date` field is
 * a text box that shows dd/mm/aaaa. Helpers that act on them are therefore asynchronous: they open
 * the popup, click the `role="option"` that carries the visible text, and wait for the UI to settle.
 */
import { TestBed } from '@angular/core/testing';
import { expect } from 'vitest';
import { pump } from './content-server';

/** The prompt of an empty select (US-01-BR-02, superseded in form by US-04-BR-05: it is not an option). */
export const PROMPT = 'Selecciona una opción';

/** Label text as a person reads it: whitespace collapsed, the required marker "*" removed. */
export function normalise(text: string | null | undefined): string {
  return (text ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/** A form control as a person meets it: an input, or the button that is the combobox of a select-only list. */
export type Control = HTMLInputElement | HTMLSelectElement | HTMLButtonElement;

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

/** Every control that holds a value (inputs, selects and comboboxes), in document order (US-04 spec 11.1). */
export function allControls(root: ParentNode): Control[] {
  return Array.from(root.querySelectorAll<Control>('input, select, [role="combobox"]'));
}

export function isCombobox(el: Element): el is HTMLInputElement | HTMLButtonElement {
  return el.getAttribute('role') === 'combobox';
}

/** Let the UI settle after a gesture: change detection, effects and the macrotasks that follow (works with fake timers). */
export async function settleUi(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    TestBed.tick();
    await pump();
  }
  TestBed.tick();
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

/** The popup a combobox controls, once it is rendered (`aria-controls`, asserted only while open, BR-05). */
export function listboxOf(combo: Element): HTMLElement | null {
  const id = combo.getAttribute('aria-controls');
  return id ? combo.ownerDocument.getElementById(id) : null;
}

/** The option rows of an open popup, as text. */
export function optionTexts(listbox: ParentNode): string[] {
  return Array.from(listbox.querySelectorAll('[role="option"]')).map((o) => normalise(o.textContent));
}

/**
 * Key events as a person's keyboard produces them (keydown then keyup), then settle. Returns whether
 * the keydown was default-prevented, which is how a test sees that a key was handled by the control
 * (Space on a select-only combobox) and not left to the browser (Space typed into a search box).
 */
export async function press(el: Element, key: string, modifiers: { alt?: boolean; shift?: boolean; ctrl?: boolean } = {}): Promise<boolean> {
  const init = { key, bubbles: true, cancelable: true, altKey: !!modifiers.alt, shiftKey: !!modifiers.shift, ctrlKey: !!modifiers.ctrl };
  const down = new KeyboardEvent('keydown', init);
  el.dispatchEvent(down);
  el.dispatchEvent(new KeyboardEvent('keyup', init));
  await settleUi();
  return down.defaultPrevented;
}

/**
 * Type text one character at a time: a keydown, the value change and an input event (text boxes
 * and the searchable combobox), then a keyup. A button combobox (select-only) only gets the keys,
 * which its type-ahead reads.
 */
export async function typeKeys(el: Control, text: string): Promise<void> {
  for (const ch of text) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
    if (el instanceof HTMLInputElement) {
      el.value = el.value + ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true, cancelable: true }));
    await settleUi();
  }
}

/** Activate a combobox with the pointer (focus, then click), as a person does. Fails if no listbox opens. */
export async function openCombobox(combo: Control): Promise<HTMLElement> {
  combo.focus();
  combo.click();
  await settleUi();
  const listbox = listboxOf(combo) ?? combo.ownerDocument.querySelector<HTMLElement>('[role="listbox"]');
  if (!listbox) throw new Error('Activating the combobox did not open a listbox');
  return listbox;
}

/** Click the `role="option"` that carries the visible text, in the popup that is open. */
export async function clickOption(combo: Control, optionText: string): Promise<void> {
  const scope: ParentNode = listboxOf(combo) ?? combo.ownerDocument;
  const option = Array.from(scope.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => normalise(o.textContent) === optionText);
  if (!option) throw new Error(`No option "${optionText}" in the open list`);
  option.click();
  await settleUi();
}

/** Pick the option whose visible text matches, as a person does: open the list, click the row (US-04 spec 11.1). */
export async function choose(combo: Control, optionText: string): Promise<void> {
  await openCombobox(combo);
  await clickOption(combo, optionText);
}

export function setChecked(el: HTMLInputElement, checked: boolean): void {
  if (el.checked !== checked) el.click();
}

/**
 * Fill the form with values keyed by visible label. A `null` value leaves the control untouched.
 * Comboboxes take the option text, checkboxes a boolean, everything else a string (a date is typed
 * as dd/mm/aaaa, US-04-Q-05).
 */
export async function fillForm(root: ParentNode, values: Record<string, string | boolean | null>): Promise<void> {
  for (const [label, value] of Object.entries(values)) {
    if (value === null) continue;
    const el = control(root, label);
    if (isCombobox(el)) {
      await choose(el, value as string);
    } else if ((el as unknown as HTMLInputElement).type === 'checkbox') {
      setChecked(el as unknown as HTMLInputElement, value as boolean);
    } else {
      typeInto(el, value as string);
    }
  }
  await settleUi();
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
  return ('required' in el && (el as HTMLInputElement).required === true) || el.getAttribute('aria-required') === 'true';
}

/** The labels of the controls that currently show an error, in document order. */
export function labelsWithErrors(root: ParentNode): string[] {
  return invalidControls(root).map((c) => normalise(c.labels?.[0]?.textContent));
}

/**
 * Current value of a control as a person sees it (US-04 spec 11.1): a checkbox is a boolean; a
 * select-only combobox (a button) shows its text, so an empty one reads "Selecciona una opción";
 * a searchable combobox and every text box show their input value, so an empty searchable select
 * reads `''` (its prompt is the placeholder); a date text box shows dd/mm/aaaa.
 */
export function shownValue(el: Control): string | boolean {
  if (el.tagName === 'BUTTON') return normalise(el.textContent);
  const input = el as unknown as HTMLInputElement;
  return input.type === 'checkbox' ? input.checked : input.value;
}

/** An empty select shows the prompt: the text of a button, the placeholder of an input whose value is '' (spec 11.1). */
export function expectPrompt(el: Control): void {
  if (el.tagName === 'BUTTON') {
    expect(normalise(el.textContent)).toBe(PROMPT);
  } else {
    expect((el as unknown as HTMLInputElement).value).toBe('');
    expect(el.getAttribute('placeholder')).toBe(PROMPT);
  }
}
