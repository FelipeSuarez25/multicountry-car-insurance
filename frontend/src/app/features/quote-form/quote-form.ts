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

  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private readonly clock = inject(CLOCK);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);

  protected form!: FieldTree<RawValues>;

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
   * The message to show (spec AC-09): input the browser cannot parse keeps the last parseable text
   * in the model and Signal Forms reports a parse error without a message, so that case is
   * evaluated as an empty value: `requiredMessage ?? errorMessage`. The field stays invalid while
   * the unparseable text is on screen, so "Continuar" never accepts it.
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
