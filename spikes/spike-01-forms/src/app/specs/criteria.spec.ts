import { fixtureConfigs, IMPLS, mount } from './harness';

describe.each(IMPLS)('[%s]', (lib, impl) => {
  const VALID = { birthDate: '1990-05-01', make: 'marca-a', vehicleYear: '2020' };
  async function fillValid(m: Awaited<ReturnType<typeof mount>>) {
    await m.type('birthDate', VALID.birthDate);
    await m.type('make', VALID.make);
    await m.type('vehicleYear', VALID.vehicleYear);
  }

  it('(a) required number: empty vs 0 vs value; integer only; yearRange inclusive', async () => {
    const m = await mount(impl);
    await m.type('vehicleYear', ''); await m.blur('vehicleYear');
    expect(m.error('vehicleYear')).toBe('El año del vehículo es obligatorio.');
    await m.type('vehicleYear', '0');
    expect(m.error('vehicleYear')).toBe('El año debe estar entre los últimos 20 años y el próximo año.'); // 0 is a value
    await m.type('vehicleYear', '2020.5');
    expect(m.error('vehicleYear')).toBe('Ingresa un año de vehículo válido.');
    await m.type('vehicleYear', '2005'); expect(m.error('vehicleYear')).toBeDefined();
    await m.type('vehicleYear', '2006'); expect(m.error('vehicleYear')).toBeUndefined();
    await m.type('vehicleYear', '2027'); expect(m.error('vehicleYear')).toBeUndefined();
    await m.type('vehicleYear', '2028'); expect(m.error('vehicleYear')).toBeDefined();
    await m.type('vehicleYear', '2020'); expect(m.error('vehicleYear')).toBeUndefined();
  });

  it('(b) empty date: required vs optional; empty optional is valid and skips minAge', async () => {
    const m = await mount(impl);
    await m.blur('birthDate'); await m.blur('licenseIssueDate');
    expect(m.error('birthDate')).toBe('La fecha de nacimiento es obligatoria.');
    expect(m.error('licenseIssueDate')).toBeUndefined();
    await fillValid(m);
    expect(m.cmp.isValid()).toBe(true); // optional date still empty
    expect(m.cmp.values()['licenseIssueDate']).toBe('');
    await m.type('licenseIssueDate', '2026-06-01'); await m.blur('licenseIssueDate');
    expect(m.error('licenseIssueDate')).toBe('La licencia debe tener al menos un año.'); // rule runs once non-empty
    await m.type('licenseIssueDate', '');
    expect(m.error('licenseIssueDate')).toBeUndefined();
  });

  it('(c) select: required, no option pre-selected', async () => {
    const m = await mount(impl);
    const sel = m.el<HTMLSelectElement>('make');
    expect(sel.value).toBe('');
    expect(sel.selectedIndex).toBe(0);
    expect(sel.options[0].textContent?.trim()).toBe('Selecciona una marca');
    expect(m.cmp.values()['make']).toBe('');
    expect(Array.from(sel.options).slice(1).map((o) => o.value)).toEqual(['marca-a', 'marca-b', 'marca-c']);
    await m.blur('make');
    expect(m.error('make')).toBe('Selecciona una marca.');
    await m.type('make', 'marca-b');
    expect(m.error('make')).toBeUndefined();
    expect(m.cmp.values()['make']).toBe('marca-b');
  });

  it('(d) legal age: 18th birthday today valid, tomorrow invalid (fixed clock 2026-11-20)', async () => {
    const m = await mount(impl);
    await m.type('birthDate', '2008-11-20'); await m.blur('birthDate');
    expect(m.error('birthDate')).toBeUndefined();
    await m.type('birthDate', '2008-11-21');
    expect(m.error('birthDate')).toBe('Debes ser mayor de edad para cotizar.');
  });

  it('(e) runtime value types observed in the model after typing into native controls', async () => {
    const m = await mount(impl);
    await m.type('vehicleYear', '2020'); await m.type('birthDate', '1990-05-01'); await m.check('acceptsOffers', true);
    const v = m.cmp.values();
    expect(typeof v['vehicleYear']).toBe('string');
    expect(v['birthDate']).toBe('1990-05-01');
    expect(v['acceptsOffers']).toBe(true);
    // What the control itself holds for <input type="number">:
    const raw = lib === 'reactive-forms' ? (m.cmp as unknown as { controlValue(k: string): unknown }).controlValue('vehicleYear') : v['vehicleYear'];
    expect(typeof raw).toBe(lib === 'reactive-forms' ? 'number' : 'string');
    await m.type('vehicleYear', '');
    const cleared = lib === 'reactive-forms' ? (m.cmp as unknown as { controlValue(k: string): unknown }).controlValue('vehicleYear') : m.cmp.values()['vehicleYear'];
    expect(cleared).toBe(lib === 'reactive-forms' ? null : '');
  });

  it('(f) hydration from stored values; pristine and no errors shown on entry', async () => {
    const m = await mount(impl, { stored: { vehicleYear: 2020, birthDate: '1990-05-01', make: 'marca-b', plate: 'ABCD12', acceptsOffers: true } });
    expect(m.cmp.values()).toEqual({ birthDate: '1990-05-01', make: 'marca-b', vehicleYear: '2020', licenseIssueDate: '', plate: 'ABCD12', acceptsOffers: true });
    expect(m.el('vehicleYear').value).toBe('2020');
    expect(m.el<HTMLSelectElement>('make').value).toBe('marca-b');
    expect(m.el('acceptsOffers').checked).toBe(true);
    expect(m.el('plate').value).toBe('ABCD12');
    expect(m.cmp.isValid()).toBe(true);
    expect(m.cmp.touched('vehicleYear')).toBe(false);
    expect(m.alerts()).toBe(0);
  });

  it('(f) hydration with a stored value no longer valid (option removed): value kept, form invalid', async () => {
    const m = await mount(impl, { stored: { make: 'marca-zzz', birthDate: '1990-05-01', vehicleYear: 2020 } });
    expect(m.cmp.isValid()).toBe(false);
    expect(m.el<HTMLSelectElement>('make').value).toBe('');
  });

  it('(g) stored values of keys no longer configured are dropped; config change rebuilds the form', async () => {
    const m = await mount(impl, { stored: { oldKey: 'x', make: 'marca-a' } });
    expect(Object.keys(m.cmp.values()).sort()).toEqual(fixtureConfigs().map((c) => c.key).sort());
    expect(m.cmp.values()['make']).toBe('marca-a');
    await m.type('plate', 'ABCD12');
    m.fixture.componentRef.setInput('fields', fixtureConfigs().filter((c) => c.key !== 'plate'));
    await m.flush();
    expect(Object.keys(m.cmp.values())).not.toContain('plate');
    expect(m.host.querySelector('#plate')).toBeNull();
  });

  it('(h) errors hidden until touched or a submit attempt', async () => {
    const m = await mount(impl);
    expect(m.alerts()).toBe(0); // invalid form on entry, nothing shown
    await m.type('vehicleYear', '1900'); // dirty, invalid, not touched
    expect(m.cmp.touched('vehicleYear')).toBe(false);
    expect(m.error('vehicleYear')).toBeUndefined();
    await m.blur('vehicleYear');
    expect(m.cmp.touched('vehicleYear')).toBe(true);
    expect(m.error('vehicleYear')).toBeDefined();
    const err = m.host.querySelector('#vehicleYear-error')!;
    expect(err.getAttribute('role')).toBe('alert');
    expect(m.el('vehicleYear').getAttribute('aria-invalid')).toBe('true');
    expect(m.el('vehicleYear').getAttribute('aria-describedby')).toBe('vehicleYear-help vehicleYear-error');
    expect(m.alerts()).toBe(1);
    await m.submit(); // untouched required fields now show errors too
    expect(m.alerts()).toBe(3); // birthDate, make, vehicleYear; optional fields stay quiet
    expect(m.error('birthDate')).toBe('La fecha de nacimiento es obligatoria.');
    expect(m.emitted).toEqual([]);
  });

  it('(i) failed submit focuses the first invalid field in sortOrder, then the next', async () => {
    const m = await mount(impl);
    await m.submit();
    expect(document.activeElement).toBe(m.el('birthDate')); // sortOrder 10, though vehicleYear is declared first in the JSON
    await m.type('birthDate', '1990-05-01'); await m.submit();
    expect(document.activeElement).toBe(m.el('make'));
    await m.type('make', 'marca-a'); await m.submit();
    expect(document.activeElement).toBe(m.el('vehicleYear'));
    expect(m.emitted).toEqual([]);
  });

  it('(j) step 1 output maps empty optionals to null while the model stays non-null', async () => {
    const m = await mount(impl);
    await fillValid(m);
    await m.type('plate', '   ');
    await m.submit();
    expect(m.emitted).toEqual([{
      birthDate: '1990-05-01', make: 'marca-a', vehicleYear: 2020,
      licenseIssueDate: null, plate: null, acceptsOffers: false,
    }]);
    const v = m.cmp.values();
    expect(v['licenseIssueDate']).toBe('');
    expect(v['plate']).toBe('   '); // model keeps what was typed; the output trims
    expect(Object.values(v).every((x) => x !== null && x !== undefined)).toBe(true);
  });
});
