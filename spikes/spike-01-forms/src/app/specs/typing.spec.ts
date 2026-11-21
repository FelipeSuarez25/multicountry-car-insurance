// (e) Typing. Compile-time facts: a wrong expectation (or an unused @ts-expect-error) fails `ng test`/`ng build`.
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AbstractControl, FormControl, FormGroup, FormRecord } from '@angular/forms';
import { FieldTree, form } from '@angular/forms/signals';
import { RawValue, RawValues } from '../core/field-config';

describe('(e) typing', () => {
  it('[signal-forms] static model: keys and value types are precise', () => {
    TestBed.runInInjectionContext(() => {
      const f = form(signal({ vehicleYear: '', acceptsOffers: false }));
      expectTypeOf(f.vehicleYear().value()).toEqualTypeOf<string>();
      expectTypeOf(f.acceptsOffers().value()).toEqualTypeOf<boolean>();
      // @ts-expect-error unknown key on a static model
      f.nope;
      // @ts-expect-error wrong value type
      f.vehicleYear().value.set(2020);
    });
  });

  it('[signal-forms] runtime model Record<string, string | boolean>: any key accepted, value is the union', () => {
    TestBed.runInInjectionContext(() => {
      const f = form(signal<RawValues>({ vehicleYear: '' }));
      // Runtime fact: the compile-time-accepted unknown key is undefined / not callable at runtime.
      expect(() => f['anythingAtAll']()).toThrow(TypeError);
      const typesOnly = () => {
      expectTypeOf(f['anythingAtAll']().value()).toEqualTypeOf<RawValue>(); // any key accepted, no undefined (noUncheckedIndexedAccess is off)
      expectTypeOf(f['x']().value()).toEqualTypeOf<RawValue>();
      f['x']().value.set('ok');
      f['x']().value.set(true);
      // @ts-expect-error numbers rejected at compile time
      f['x']().value.set(5);
      // The union is NOT assignable to the native-control bindings (this is the NG template error captured in FINDINGS):
      // @ts-expect-error FieldTree<string | boolean> is not a FieldTree<string>
      const asString: FieldTree<string> = f['x'];
      void asString;
      };
      void typesOnly;
    });
  });

  it('[reactive-forms] static FormGroup: keys and control types are precise', () => {
    const g = new FormGroup({
      vehicleYear: new FormControl('', { nonNullable: true }),
      acceptsOffers: new FormControl(false, { nonNullable: true }),
    });
    expectTypeOf(g.controls.vehicleYear).toEqualTypeOf<FormControl<string>>();
    expectTypeOf(g.getRawValue()).toEqualTypeOf<{ vehicleYear: string; acceptsOffers: boolean }>();
    // @ts-expect-error unknown key on a static group
    g.controls.nope;
    // @ts-expect-error wrong value type
    g.controls.vehicleYear.setValue(2020);
  });

  it('[reactive-forms] runtime FormRecord<FormControl<string | boolean>>: any key accepted, value is the union', () => {
    const r = new FormRecord<FormControl<RawValue>>({});
    expect(r.controls['anythingAtAll']).toBeUndefined(); // typed FormControl<RawValue>, undefined at runtime
    expect(r.get('x')).toBeNull();
    const typesOnly = () => {
    expectTypeOf(r.controls['anythingAtAll']).toEqualTypeOf<FormControl<RawValue>>();
    const got: AbstractControl | null = r.get('x');
    void got;
    // @ts-expect-error get() may return null
    r.get('x').value;
    expectTypeOf(r.value).toEqualTypeOf<Partial<Record<string, RawValue>>>();
    expectTypeOf(r.getRawValue()).toEqualTypeOf<Record<string, RawValue>>();
    // @ts-expect-error numbers rejected at compile time
    r.controls['x'].setValue(5);
    };
    void typesOnly;
    // Runtime, not compile time: <input type="number"> writes number | null into this control (see criteria (e)).
  });

});
