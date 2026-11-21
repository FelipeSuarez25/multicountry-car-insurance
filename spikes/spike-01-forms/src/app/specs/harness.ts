import { OutputEmitterRef, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import fixtureJson from '../fixture/fields.json';
import { CLOCK } from '../core/clock';
import { FieldConfig, OutputValue, RawValue, RawValues } from '../core/field-config';
import { parseFieldConfigs } from '../core/parse-field-configs';
import { DynamicFormReactive } from '../reactive-forms/dynamic-form-reactive';
import { DynamicFormSignal } from '../signal-forms/dynamic-form-signal';

/** Same public test surface on both implementations. */
export interface Handle {
  submitted: OutputEmitterRef<Record<string, OutputValue>>;
  values(): RawValues;
  isValid(): boolean;
  setValue(key: string, v: RawValue): void;
  touched(key: string): boolean;
}

export const IMPLS: [string, Type<Handle>][] = [
  ['signal-forms', DynamicFormSignal as unknown as Type<Handle>],
  ['reactive-forms', DynamicFormReactive as unknown as Type<Handle>],
];

/** Fixed "today" = 2026-11-20 (local). */
export const TODAY = new Date(2026, 10, 20, 12, 0, 0);
export const fixtureConfigs = (): FieldConfig[] => parseFieldConfigs(fixtureJson, () => undefined);

export interface Mounted {
  fixture: ComponentFixture<Handle>;
  host: HTMLElement;
  cmp: Handle;
  emitted: Record<string, OutputValue>[];
  flush(): Promise<void>;
  el<T extends HTMLElement = HTMLInputElement>(key: string): T;
  type(key: string, value: string): Promise<void>;
  check(key: string, checked: boolean): Promise<void>;
  blur(key: string): Promise<void>;
  submit(): Promise<void>;
  error(key: string): string | undefined;
  alerts(): number;
}

export async function mount(
  impl: Type<Handle>,
  opts: { fields?: FieldConfig[]; stored?: Record<string, unknown>; today?: Date } = {},
): Promise<Mounted> {
  TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => opts.today ?? TODAY }] });
  const fixture = TestBed.createComponent(impl);
  fixture.componentRef.setInput('fields', opts.fields ?? fixtureConfigs());
  if (opts.stored) fixture.componentRef.setInput('stored', opts.stored);
  const host = fixture.nativeElement as HTMLElement;
  const emitted: Record<string, OutputValue>[] = [];
  fixture.componentInstance.submitted.subscribe((v) => emitted.push(v));
  const flush = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  await flush();
  const el = <T extends HTMLElement = HTMLInputElement>(key: string) => host.querySelector<T>(`#${key}`)!;
  const fire = (e: HTMLElement, ...types: string[]) => types.forEach((t) => e.dispatchEvent(new Event(t, { bubbles: true })));
  return {
    fixture, host, cmp: fixture.componentInstance, emitted, flush, el,
    type: async (key, value) => { const e = el(key); e.value = value; fire(e, 'input', 'change'); await flush(); },
    check: async (key, checked) => { const e = el(key); e.checked = checked; fire(e, 'input', 'change'); await flush(); },
    blur: async (key) => { const e = el(key); e.dispatchEvent(new FocusEvent('blur')); await flush(); },
    submit: async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await flush(); },
    error: (key) => host.querySelector(`#${key}-error`)?.textContent?.trim(),
    alerts: () => host.querySelectorAll('[role="alert"]').length,
  };
}
