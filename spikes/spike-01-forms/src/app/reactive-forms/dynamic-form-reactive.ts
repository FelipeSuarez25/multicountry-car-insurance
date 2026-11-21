import { Component, ElementRef, computed, inject, input, output, untracked } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { CLOCK } from '../core/clock';
import { FieldConfig, OutputValue, RawValue, RawValues } from '../core/field-config';
import { hydrate, toOutput } from '../core/form-values';
import { validateField } from '../core/validate-field';

/**
 * Workaround: NumberValueAccessor writes `number | null` into the control for <input type="number">,
 * even though the control is declared FormControl<string | boolean>. Normalise back to the model contract.
 */
export function normalise(v: unknown): RawValue {
  return v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : (v as RawValue);
}

@Component({
  selector: 'app-dynamic-form-reactive',
  imports: [ReactiveFormsModule],
  templateUrl: './dynamic-form-reactive.html',
})
export class DynamicFormReactive {
  readonly fields = input.required<FieldConfig[]>();
  readonly stored = input<Record<string, unknown>>({});
  readonly submitted = output<Record<string, OutputValue>>();

  private readonly clock = inject(CLOCK);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly state = computed(() => {
    const configs = this.fields();
    const initial = hydrate(configs, untracked(this.stored));
    const record = new FormRecord<FormControl<RawValue>>({});
    for (const cfg of configs) {
      const validator: ValidatorFn = (c) => {
        const message = validateField(cfg, normalise(c.value), this.clock());
        return message ? { custom: message } : null;
      };
      record.addControl(cfg.key, new FormControl<RawValue>(initial[cfg.key], { nonNullable: true, validators: [validator] }));
    }
    return { configs, record };
  });

  // Test handles (same shape on both implementations).
  values(): RawValues { return this.raw(); }
  private raw(): RawValues { return Object.fromEntries(Object.entries(this.state().record.getRawValue()).map(([k, v]) => [k, normalise(v)])); }
  /** Un-normalised control value, to show what the accessor really wrote. */
  controlValue(key: string): unknown { return this.state().record.controls[key].value; }
  isValid(): boolean { return this.state().record.valid; }
  setValue(key: string, v: RawValue): void { this.state().record.controls[key].setValue(v); }
  touched(key: string): boolean { return this.state().record.controls[key].touched; }

  protected ctl(key: string): FormControl<RawValue> { return this.state().record.controls[key]; }
  protected message(key: string): string { return this.ctl(key).errors?.['custom'] as string; }
  protected showError(key: string): boolean { const c = this.ctl(key); return c.touched && c.invalid; }

  protected describedBy(cfg: FieldConfig): string | null {
    const ids = [cfg.helpText ? `${cfg.key}-help` : '', this.showError(cfg.key) ? `${cfg.key}-error` : ''].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  protected onSubmit(): void {
    const { configs, record } = this.state();
    record.markAllAsTouched(); // not implied by submit in Reactive Forms
    if (record.invalid) {
      const first = configs.find((c) => record.controls[c.key].invalid);
      // No focus API on controls: DOM lookup by id.
      if (first) this.host.nativeElement.querySelector<HTMLElement>(`#${first.key}`)?.focus();
      return;
    }
    this.submitted.emit(toOutput(configs, this.raw()));
  }
}
