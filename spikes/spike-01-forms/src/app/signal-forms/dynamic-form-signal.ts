import { Component, Injector, computed, inject, input, output, signal, untracked } from '@angular/core';
import { FieldTree, FormField, FormRoot, form, submit, validate } from '@angular/forms/signals';
import { CLOCK } from '../core/clock';
import { FieldConfig, OutputValue, RawValue, RawValues } from '../core/field-config';
import { hydrate, toOutput } from '../core/form-values';
import { validateField } from '../core/validate-field';

@Component({
  selector: 'app-dynamic-form-signal',
  imports: [FormField, FormRoot],
  templateUrl: './dynamic-form-signal.html',
})
export class DynamicFormSignal {
  readonly fields = input.required<FieldConfig[]>();
  readonly stored = input<Record<string, unknown>>({});
  readonly submitted = output<Record<string, OutputValue>>();

  private readonly clock = inject(CLOCK);
  private readonly injector = inject(Injector);

  /** Rebuilt whenever the config changes; hydrated from `stored` at build time. */
  protected readonly state = computed(() => {
    const configs = this.fields();
    const model = signal<RawValues>(hydrate(configs, untracked(this.stored)));
    // form() creates an effect() internally: calling it inside computed() throws NG0602 unless untracked.
    const f = untracked(() => form(
      model,
      (p) => {
        for (const cfg of configs) {
          validate(p[cfg.key], ({ value }) => {
            const message = validateField(cfg, value(), this.clock());
            return message ? { kind: 'custom', message } : undefined;
          });
        }
      },
      {
        injector: this.injector,
        submission: {
          action: async () => {
            this.submitted.emit(toOutput(configs, model()));
            return undefined;
          },
          onInvalid: (root) => {
            const first = configs.find((c) => root[c.key]().invalid());
            if (first) root[first.key]().focusBoundControl();
          },
        },
      },
    ));
    return { configs, model, f };
  });

  // Test handles (same shape on both implementations).
  values(): RawValues { return this.state().model(); }
  isValid(): boolean { return this.state().f().valid(); }
  setValue(key: string, v: RawValue): void { this.state().f[key]().value.set(v); }
  touched(key: string): boolean { return this.state().f[key]().touched(); }
  async submitNow(): Promise<boolean> { return submit(this.state().f); }

  // Workaround: a runtime-built model is Record<string, string | boolean>; the native-control bindings
  // reject that union (see FINDINGS), so the template goes through these narrowed accessors.
  protected str(key: string): FieldTree<string> { return this.state().f[key] as unknown as FieldTree<string>; }
  protected bool(key: string): FieldTree<boolean> { return this.state().f[key] as unknown as FieldTree<boolean>; }

  protected describedBy(cfg: FieldConfig, showError: boolean): string | null {
    const ids = [cfg.helpText ? `${cfg.key}-help` : '', showError ? `${cfg.key}-error` : ''].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }
}
