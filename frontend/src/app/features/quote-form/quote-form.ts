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
import { NgComponentOutlet } from '@angular/common';
import { FieldTree, FormField, FormRoot, form, validate } from '@angular/forms/signals';
import { LucideCircleAlert, LucideInfo } from '@lucide/angular';
import { Router } from '@angular/router';
import { CLOCK } from '../../core/clock';
import { QuoteStore } from '../../core/quote-store';
import type { FieldConfig, RawValues } from '../../shared/field-config.model';
import { iconForField } from '../../shared/field-icons';
import { inputProfileFor, maxLengthFor, type FieldInputProfile } from '../../shared/field-input-profiles';
import { InputProfile } from '../../shared/input-profile';
import { validateField } from '../../shared/field-validators';
import { hydrate } from '../../shared/field-values';
import { CustomSelect } from '../../shared/custom-select';
import { DATE_TEXT_ERROR } from '../../shared/date-text';
import { DateField } from '../../shared/date-field';

/**
 * The step 1 form (ADR-0004): Signal Forms over the shared validation core. The editing model is
 * `Record<string, string | boolean>` (never null); each field has exactly one `validate()` that
 * calls the pure `validateField`. Built once per instance, hydrated from the wizard state; a
 * different configuration means a new instance (the page recreates it).
 */
@Component({
  selector: 'app-quote-form',
  imports: [FormField, FormRoot, NgComponentOutlet, CustomSelect, DateField, InputProfile, LucideCircleAlert, LucideInfo],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css',
})
export class QuoteForm implements OnInit {
  readonly configs = input.required<FieldConfig[]>();
  readonly countryCode = input.required<string>();
  /** The country's locale tag, for the names of days and months in the calendar. */
  readonly localeTag = input.required<string>();

  private readonly injector = inject(Injector);
  private readonly clock = inject(CLOCK);
  private readonly quote = inject(QuoteStore);
  private readonly router = inject(Router);

  protected form!: FieldTree<RawValues>;
  /** The input profile and the `maxlength` of every field, by key (ADR-0014 section 3). */
  protected profiles = new Map<string, { profile: FieldInputProfile; max: number | null }>();
  /** Copies the editing model into the wizard state, key by key, only what changed since the last copy. */
  private flushModel: () => void = () => undefined;

  ngOnInit(): void {
    const configs = this.configs();
    this.profiles = new Map(
      configs.map((config) => {
        const profile = inputProfileFor(config);
        return [config.key, { profile, max: maxLengthFor(config, profile) }];
      }),
    );
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

    // The raw editing values are written to the wizard state on every change (ADR-0003). The model
    // is the truth for every key: a number field is a text box with the digits profile and a date
    // field maps unreadable text to '' (ADR-0012 section 6, ADR-0014 section 3).
    let synced: RawValues = { ...model() };
    this.flushModel = () => {
      const current = model();
      for (const [key, value] of Object.entries(current)) {
        if (synced[key] !== value) this.quote.setValue(key, value);
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
   * The message to show: a date text box whose text is not a complete, existing date carries its own
   * code-owned message (US-04-BR-18); otherwise the first error of the shared validator.
   */
  protected errorOf(config: FieldConfig): string | null {
    const state = this.form[config.key]();
    if (!state.touched() || !state.invalid()) return null;
    const errors = state.errors();
    if (errors.some((error) => error.kind === 'parse')) return DATE_TEXT_ERROR;
    return errors[0]?.message ?? null;
  }

  /**
   * After an input event on a text box: the wizard state holds what is shown for every key the
   * person typed in, also when the profile dropped the character and the text is still empty
   * (US-04-AC-26: the state holds "" for it).
   */
  protected typed(key: string): void {
    this.flushModel();
    if (!(key in this.quote.values())) this.quote.setValue(key, '');
  }

  /** The input profile and `maxlength` of a field; a key without one (never the case after `ngOnInit`) filters nothing. */
  protected entryOf(key: string): { profile: FieldInputProfile; max: number | null } {
    return this.profiles.get(key) ?? { profile: { allows: () => true }, max: null };
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
