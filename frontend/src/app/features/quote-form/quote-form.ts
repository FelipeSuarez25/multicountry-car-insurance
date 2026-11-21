import {
  ApplicationRef,
  Component,
  Injector,
  OnInit,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FieldTree, FormField, FormRoot, form, validate } from '@angular/forms/signals';
import { LucideCircleAlert, LucideInfo } from '@lucide/angular';
import { Router } from '@angular/router';
import { CLOCK } from '../../core/clock';
import { QuoteStore } from '../../core/quote-store';
import type { FieldConfig, RawValues } from '../../shared/field-config.model';
import { FALLBACK_MESSAGE } from '../../shared/field-config';
import { iconForField } from '../../shared/field-icons';
import { validateField } from '../../shared/field-validators';
import { hydrate } from '../../shared/field-values';
import { CustomSelect } from '../../shared/custom-select';
import { DateField } from '../../shared/date-field';

/**
 * The step 1 form (ADR-0004): Signal Forms over the shared validation core. The editing model is
 * `Record<string, string | boolean>` (never null); each field has exactly one `validate()` that
 * calls the pure `validateField`. Built once per instance, hydrated from the wizard state; a
 * different configuration means a new instance (the page recreates it).
 */
@Component({
  selector: 'app-quote-form',
  imports: [FormField, FormRoot, NgComponentOutlet, CustomSelect, DateField, LucideCircleAlert, LucideInfo],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css',
})
export class QuoteForm implements OnInit {
  readonly configs = input.required<FieldConfig[]>();
  readonly countryCode = input.required<string>();
  /** The country's locale tag, for the names of days and months in the calendar. */
  readonly localeTag = input.required<string>();

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly clock = inject(CLOCK);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);

  protected form!: FieldTree<RawValues>;
  /** Copies the editing model into the wizard state, key by key, only what changed since the last copy. */
  private flushModel: () => void = () => undefined;

  ngOnInit(): void {
    const configs = this.configs();
    const model = signal<RawValues>(hydrate(configs, this.quote.values()));
    this.form = form(
      model,
      (root) => {
        for (const config of configs) {
          validate(root[config.key], ({ value }) => {
            const message = validateField(config, value(), this.clock());
            return message ? { kind: 'custom', message } : undefined;
          });
        }
      },
      {
        injector: this.injector,
        submission: {
          // Signal Forms decides validity: every field error, parse errors included, blocks.
          action: async () => {
            // The model-to-store effect runs on the next change detection; a keyboard Enter can
            // arrive before it (Space on the consent box, then Enter). Flush it so the store
            // holds exactly what the user sees.
            this.flushModel();
            if (this.quote.completeStep1(configs) !== null) {
              await this.router.navigate(['/', this.countryCode().toLowerCase(), 'planes']);
            }
            return undefined;
          },
          onInvalid: (root) => {
            const first = configs.find((config) => root[config.key]().invalid());
            if (first) root[first.key]().focusBoundControl();
          },
        },
      },
    );

    // The raw editing values are written to the wizard state on every change (ADR-0003). Keys of
    // number fields are written only by `syncNative` (one writer per key, R3-F05): the browser may
    // hold text the model does not, and the store must follow what the control reads. A date field
    // is a text box whose unreadable text maps to '' in the model (ADR-0012 section 6), so the model
    // is the truth for dates, selects and text alike.
    const nativeKeys = new Set(configs.filter((c) => c.type === 'number').map((c) => c.key));
    let synced: RawValues = { ...model() };
    this.flushModel = () => {
      const current = model();
      for (const [key, value] of Object.entries(current)) {
        if (!nativeKeys.has(key) && synced[key] !== value) this.quote.setValue(key, value);
      }
      synced = { ...current };
    };
    effect(
      () => {
        model();
        untracked(() => this.flushModel());
      },
      { injector: this.injector },
    );
  }

  /** The two narrowing accessors of ADR-0004: the only casts, selected by the field type. */
  protected text(key: string): FieldTree<string> {
    return this.form[key] as unknown as FieldTree<string>;
  }
  protected flag(key: string): FieldTree<boolean> {
    return this.form[key] as unknown as FieldTree<boolean>;
  }

  /**
   * Runs before the browser applies a keystroke to a number input. Signal Forms writes the model
   * back into the DOM from a deferred flush; if that flush is still pending when the next key
   * makes the text unparseable (`1` then `e`), it would overwrite the text being typed with the
   * stale model value. Flushing now makes it a no-op (the DOM already holds that value), so the
   * typed text stays visible. The model is never touched here.
   */
  protected flushBindings(): void {
    this.appRef.tick();
  }

  /**
   * After every input on a number field, the only writer of that key in the store: text the
   * browser cannot parse (`validity.badInput`) is stored as '', anything else as the control reads
   * it. The control's own model is left alone on purpose: writing '' to it makes Signal Forms write
   * '' into the DOM, which erases the text the user typed (R1-F03). The text stays visible; the
   * store, the storage and the output hold '' (a reload never restores a stale valid value), and
   * the field is invalid through the Signal Forms parse error, so "Continuar" blocks.
   */
  protected syncNative(event: Event, key: string): void {
    const el = event.target as HTMLInputElement;
    this.quote.setValue(key, el.validity.badInput ? '' : el.value);
  }

  /**
   * The message to show (spec AC-09): text the browser cannot parse is an empty value for a
   * required field (`requiredMessage ?? errorMessage`); for an optional field it is an error
   * (`errorMessage`, or the fallback).
   */
  protected errorOf(config: FieldConfig): string | null {
    const state = this.form[config.key]();
    if (!state.touched() || !state.invalid()) return null;
    const errors = state.errors();
    if (errors.some((error) => error.kind === 'parse')) {
      return validateField(config, '', this.clock()) ?? (config.errorMessage.trim() || FALLBACK_MESSAGE);
    }
    return errors[0]?.message ?? null;
  }

  /** The icon component of a field by its key, or null (a checkbox has none). */
  protected iconOf(config: FieldConfig): ReturnType<typeof iconForField> {
    return iconForField(config);
  }

  protected describedBy(config: FieldConfig, error: string | null): string | null {
    const ids = [
      config.type === 'date' ? `${config.key}-hint` : '',
      config.helpText ? `${config.key}-help` : '',
      error ? `${config.key}-error` : '',
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }
}
