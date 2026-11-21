import {
  Component,
  Injector,
  OnInit,
  effect,
  inject,
  input,
  signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, FormField, FormRoot, form, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { CLOCK } from '../../core/clock';
import { QuoteStore } from '../../core/quote-store';
import type { FieldConfig, RawValues } from '../../shared/field-config.model';
import { validateField } from '../../shared/field-validators';
import { hydrate } from '../../shared/field-values';

/**
 * The step 1 form (ADR-0004): Signal Forms over the shared validation core. The editing model is
 * `Record<string, string | boolean>` (never null); each field has exactly one `validate()` that
 * calls the pure `validateField`. Built once per instance, hydrated from the wizard state; a
 * different configuration means a new instance (the page recreates it).
 */
@Component({
  selector: 'app-quote-form',
  imports: [FormField, FormRoot],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css',
})
export class QuoteForm implements OnInit {
  readonly configs = input.required<FieldConfig[]>();
  readonly countryCode = input.required<string>();

  private readonly injector = inject(Injector);
  private readonly clock = inject(CLOCK);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);

  protected form!: FieldTree<RawValues>;
  private model!: WritableSignal<RawValues>;

  ngOnInit(): void {
    const configs = this.configs();
    const model = signal<RawValues>(hydrate(configs, this.quote.values()));
    this.model = model;
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
          action: async () => {
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

    // The raw editing values are written to the wizard state on every change (ADR-0003).
    let synced: RawValues = { ...model() };
    effect(
      () => {
        const current = model();
        untracked(() => {
          for (const [key, value] of Object.entries(current)) {
            if (synced[key] !== value) this.quote.setValue(key, value);
          }
          synced = { ...current };
        });
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
   * A number input the browser cannot parse (`1e`) reads back as '' and Signal Forms keeps the
   * previous text in the model. That stale text would later be written back into the DOM by the
   * deferred control binding, replacing what the user is typing, so the model follows the
   * input: unparseable counts as empty (spec AC-09).
   */
  protected onNumberInput(key: string, event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.validity.badInput && this.model()[key] !== '') {
      this.model.update((values) => ({ ...values, [key]: '' }));
    }
  }

  /**
   * The message to show (spec AC-09): input the browser cannot parse never reaches the model (it
   * keeps the last parseable text) but Signal Forms reports a parse error without a message, so
   * that case is evaluated as an empty value: `requiredMessage ?? errorMessage`.
   */
  protected errorOf(config: FieldConfig): string | null {
    const state = this.form[config.key]();
    if (!state.touched() || !state.invalid()) return null;
    const errors = state.errors();
    if (errors.some((error) => error.kind === 'parse')) {
      return validateField(config, '', this.clock()) ?? config.errorMessage;
    }
    return errors[0]?.message ?? null;
  }

  protected describedBy(config: FieldConfig, error: string | null): string | null {
    const ids = [
      config.helpText ? `${config.key}-help` : '',
      error ? `${config.key}-error` : '',
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }
}
