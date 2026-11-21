import {
  Component,
  Injector,
  OnInit,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FieldTree, FormField, FormRoot, REQUIRED, form, metadata, validate } from '@angular/forms/signals';
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

  protected errorOf(key: string): string | null {
    const state = this.form[key]();
    return state.touched() && state.invalid() ? (state.errors()[0]?.message ?? null) : null;
  }

  protected describedBy(config: FieldConfig, error: string | null): string | null {
    const ids = [
      config.helpText ? `${config.key}-help` : '',
      error ? `${config.key}-error` : '',
    ].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  }
}
