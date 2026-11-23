import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { sanitizeInput, type FieldInputProfile } from './field-input-profiles';

/**
 * Applies the input profile of a field to its native text box (US-04-BR-19, ADR-0014 section 3):
 * the keyboard hints and the `maxlength` as attributes, and the character filter on a capture-phase
 * `input` listener of the element itself. By the DOM dispatch order a capture listener at the target
 * runs before the non-capture one of Signal Forms, so the rewritten value is what the form reads.
 * It covers typing, paste, autofill and IME text, which `beforeinput` cannot always cancel.
 */
@Directive({
  selector: 'input[appInputProfile]',
  host: {
    '[attr.maxlength]': 'appInputProfileMax()',
    '[attr.inputmode]': 'appInputProfile().inputMode ?? null',
    '[attr.autocomplete]': 'appInputProfile().autocomplete ?? null',
    '[attr.autocapitalize]': 'appInputProfile().autocapitalize ?? null',
  },
})
export class InputProfile {
  readonly appInputProfile = input.required<FieldInputProfile>();
  /** The `maxlength`: the Strapi rule or the profile's fallback, or null for none. */
  readonly appInputProfileMax = input<number | null>(null);

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    let composing = false;
    const sanitize = (): void => {
      const raw = this.el.value;
      const { text, caret } = sanitizeInput(raw, this.el.selectionStart ?? raw.length, this.appInputProfile());
      const max = this.appInputProfileMax();
      const clamped = max !== null && text.length > max ? text.slice(0, max) : text;
      if (clamped === raw) return;
      this.el.value = clamped;
      const at = Math.min(caret, clamped.length);
      this.el.setSelectionRange(at, at);
    };
    // Not while an IME composition is active: rewriting the value would cancel or duplicate it.
    const onInput = (event: Event): void => {
      if (composing || (event as InputEvent).isComposing) return;
      sanitize();
    };
    const onCompositionStart = (): void => {
      composing = true;
    };
    const onCompositionEnd = (): void => {
      composing = false;
      sanitize();
      // The model reads the cleaned value (Chromium fires `input` before `compositionend`).
      this.el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    this.el.addEventListener('input', onInput, { capture: true });
    this.el.addEventListener('compositionstart', onCompositionStart);
    this.el.addEventListener('compositionend', onCompositionEnd);
    inject(DestroyRef).onDestroy(() => {
      this.el.removeEventListener('input', onInput, { capture: true });
      this.el.removeEventListener('compositionstart', onCompositionStart);
      this.el.removeEventListener('compositionend', onCompositionEnd);
    });
  }
}
