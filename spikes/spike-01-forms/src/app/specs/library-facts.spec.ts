// Library facts that sit outside the shared criteria (support for criteria e, g, j).
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';

@Component({ selector: 'app-sig-num', imports: [FormField], template: '<input id="n" type="number" [formField]="f.n" />' })
class SigNum {
  readonly model = signal<{ n: number }>({ n: 0 });
  readonly f = form(this.model);
}

@Component({ selector: 'app-rf-num', imports: [ReactiveFormsModule], template: '<input id="n" type="number" [formControl]="c" />' })
class RfNum {
  readonly c = new FormControl(0, { nonNullable: true });
}

async function typeInto(fixture: { detectChanges(): void; whenStable(): Promise<unknown>; nativeElement: HTMLElement }, value: string) {
  const el = fixture.nativeElement.querySelector('#n') as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('library facts', () => {
  it('(g) [signal-forms] the model is the source of truth: extra keys written to it stay in form().value()', () => {
    TestBed.runInInjectionContext(() => {
      const model = signal<Record<string, string>>({ a: '' });
      const f = form(model);
      model.set({ a: '', stale: 'x' });
      expect(f().value()).toEqual({ a: '', stale: 'x' }); // nothing drops it: filtering must happen before building the model
    });
  });

  it('(g) [reactive-forms] setValue throws on an extra key, patchValue ignores it', () => {
    const g = new FormGroup({ a: new FormControl('', { nonNullable: true }) });
    expect(() => g.setValue({ a: 'x', stale: 'y' } as never)).toThrow();
    g.patchValue({ a: 'x', stale: 'y' } as never);
    expect(g.getRawValue()).toEqual({ a: 'x' });
  });

  it('(e) [signal-forms] number model 0 + native <input type=number> cleared -> model becomes null at runtime', async () => {
    const fixture = TestBed.createComponent(SigNum);
    await fixture.whenStable();
    await typeInto(fixture, '');
    expect(fixture.componentInstance.model().n).toBeNull(); // declared number, actually number | null
    await typeInto(fixture, '2020.5');
    expect(fixture.componentInstance.model().n).toBe(2020.5); // decimals reach the model: integer-only needs a validator
  });

  it('(e) [reactive-forms] FormControl<number> nonNullable + native <input type=number> cleared -> value is null at runtime', async () => {
    const fixture = TestBed.createComponent(RfNum);
    await fixture.whenStable();
    await typeInto(fixture, '');
    expect(fixture.componentInstance.c.value).toBeNull(); // nonNullable only protects reset(), not the accessor
    await typeInto(fixture, '2020.5');
    expect(fixture.componentInstance.c.value).toBe(2020.5);
  });
});
