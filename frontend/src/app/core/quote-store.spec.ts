import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOCK } from './clock';
import { QuoteStore } from './quote-store';
import type { FieldConfig, SelectOption } from '../shared/field-config.model';
import { SPEC_TODAY, fixedClock } from '../../testing/clock';
import {
  CL_VALID_RAW,
  CO_EXPECTED_OUTPUT,
  CO_VALID_RAW,
  WIZARD_STORAGE_KEY,
  seedFieldConfigs,
  wizardEntry,
} from '../../testing/seed-fixtures';

/** A value that must never show up in a log line or outside the quote-wizard entry. */
const CANARY = 'CANARY-1012345678';

function newStore(): QuoteStore {
  return TestBed.inject(QuoteStore);
}

/** A new page load: a new injector, the same sessionStorage (what a reload keeps). */
function reload(): QuoteStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
  return newStore();
}

function stored(): { version: number; country: string; step1: { values: Record<string, unknown> } } | null {
  const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

function typeAll(store: QuoteStore, values: Record<string, string | boolean>): void {
  for (const [key, value] of Object.entries(values)) store.setValue(key, value);
}

describe('US-01 QuoteStore (ADR-0003, ADR-0001)', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(SPEC_TODAY) }] });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  const loggedText = (): string => warn.mock.calls.map((args: unknown[]) => args.map(String).join(' ')).join('\n');

  describe('US-01-AC-04 keep data when going back (raw editing values)', () => {
    it('US-01-AC-04 starts empty: no country, no values, no typed output', () => {
      const store = newStore();
      expect(store.country()).toBeNull();
      expect(store.values()).toEqual({});
      expect(store.step1Output()).toBeNull();
    });

    it('US-01-AC-04 saves the values and reads them back', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      expect(store.country()).toBe('CO');
      expect(store.values()).toEqual(CO_VALID_RAW);
    });

    it('US-01-BR-08 writes the raw editing values to sessionStorage key "quote-wizard" synchronously on every change', () => {
      const store = newStore();
      store.enterCountry('CO');
      store.setValue('fullName', 'Ana');
      expect(stored()).toMatchObject({ version: 1, country: 'CO', step1: { values: { fullName: 'Ana' } } });
      store.setValue('fullName', 'Ana Prueba Ficticia');
      store.setValue('dataConsent', true);
      expect(stored()?.step1.values).toMatchObject({ fullName: 'Ana Prueba Ficticia', dataConsent: true });
    });

    it('US-01-BR-08 keeps wizard data nowhere else: no localStorage, no cookie', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      expect(localStorage.length).toBe(0);
      expect(document.cookie).toBe('');
    });
  });

  describe('US-01-AC-21 data survives a reload', () => {
    it('US-01-AC-21 a new store instance restores the raw editing values exactly, valid or not', () => {
      const first = newStore();
      first.enterCountry('CL');
      typeAll(first, { fullName: 'Ana', vehicleYear: '2015.5', plate: '', dataConsent: true });

      const afterReload = reload();
      expect(afterReload.country()).toBe('CL');
      expect(afterReload.values()).toEqual({ fullName: 'Ana', vehicleYear: '2015.5', plate: '', dataConsent: true });
    });

    it('US-01-AC-21 the in-progress invalid value "2015.5" is stored as typed, not rounded or cleared', () => {
      const store = newStore();
      store.enterCountry('CL');
      store.setValue('vehicleYear', '2015.5');
      expect(stored()?.step1.values['vehicleYear']).toBe('2015.5');
      expect(reload().values()['vehicleYear']).toBe('2015.5');
    });

    it('US-01-AC-21 the typed output is not restored by a reload: it exists only after a valid "Continuar"', () => {
      const first = newStore();
      first.enterCountry('CO');
      typeAll(first, CO_VALID_RAW);
      expect(first.completeStep1(seedFieldConfigs('CO'))).not.toBeNull();
      const afterReload = reload();
      expect(afterReload.step1Output()).toBeNull();
      expect(afterReload.values()).toEqual(CO_VALID_RAW);
    });
  });

  describe('US-01-AC-18 typed step 1 output only on a valid "Continuar"', () => {
    it('US-01-AC-18 a valid form produces the typed output of spec 7.3 for country "CO"', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      const output = store.completeStep1(seedFieldConfigs('CO'));
      expect(output).toEqual(CO_EXPECTED_OUTPUT);
      expect(store.step1Output()).toEqual(CO_EXPECTED_OUTPUT);
      expect(typeof store.step1Output()?.values['vehicleYear']).toBe('number');
    });

    it('US-01-AC-18 an invalid form (vehicle year 2005) produces no typed output and keeps the raw values', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, { ...CO_VALID_RAW, vehicleYear: '2005' });
      expect(store.step1Output()).toBeNull();
      const output = store.completeStep1(seedFieldConfigs('CO'));
      expect(output).toBeNull();
      expect(store.step1Output()).toBeNull();
      expect(store.values()['vehicleYear']).toBe('2005');
      expect(stored()?.step1.values['vehicleYear']).toBe('2005');
    });

    it('US-01-AC-18 validity depends on the injected clock: the same values are invalid in 2046', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: fixedClock(new Date(2046, 5, 1)) }] });
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      expect(store.completeStep1(seedFieldConfigs('CO'))).toBeNull();
    });

    it('US-01-AC-18 an empty optional field is null and an unchecked optional checkbox is false in the output', () => {
      const extras: FieldConfig[] = [
        { key: 'mobilePhone', type: 'text', label: 'Teléfono celular', isRequired: false, sortOrder: 35, errorMessage: 'Ingresa un número de celular válido.', rules: [{ kind: 'pattern', value: '^[0-9]{10}$' }] },
        { key: 'newsletter', type: 'checkbox', label: 'Quiero recibir novedades.', isRequired: false, sortOrder: 110, errorMessage: 'Revisa este campo.', rules: [] },
      ];
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, { ...CO_VALID_RAW, mobilePhone: '   ', newsletter: false });
      const output = store.completeStep1([...seedFieldConfigs('CO'), ...extras]);
      expect(output?.values['mobilePhone']).toBeNull();
      expect(output?.values['newsletter']).toBe(false);
    });

    it('US-01-AC-18 the output country is the country of the context, as the published code', () => {
      const store = newStore();
      store.enterCountry('CL');
      typeAll(store, CL_VALID_RAW);
      expect(store.completeStep1(seedFieldConfigs('CL'))?.country).toBe('CL');
    });
  });

  describe('US-01-AC-22 data does not cross countries (US-01-Q-02)', () => {
    it('US-01-AC-22 entering another country discards the stored state of the first', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);

      store.enterCountry('CL');
      expect(store.country()).toBe('CL');
      expect(store.values()).toEqual({});
      expect(store.step1Output()).toBeNull();
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').not.toContain('1012345678');

      store.enterCountry('CO');
      expect(store.values()).toEqual({});
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY) ?? '').not.toContain('1012345678');
    });

    it('US-01-AC-22 the first country is empty after returning, also across a reload', () => {
      const first = newStore();
      first.enterCountry('CO');
      typeAll(first, CO_VALID_RAW);
      first.enterCountry('CL');

      const afterReload = reload();
      afterReload.enterCountry('CO');
      expect(afterReload.values()).toEqual({});
    });

    it('US-01-AC-22 entering the same country again keeps its values', () => {
      const first = newStore();
      first.enterCountry('CO');
      typeAll(first, CO_VALID_RAW);
      const afterReload = reload();
      afterReload.enterCountry('CO');
      expect(afterReload.values()).toEqual(CO_VALID_RAW);
    });

    it('US-01-AC-22 holds at most one country: the stored entry never mixes the two', () => {
      const store = newStore();
      store.enterCountry('CO');
      typeAll(store, CO_VALID_RAW);
      store.enterCountry('CL');
      typeAll(store, CL_VALID_RAW);
      expect(stored()?.country).toBe('CL');
      expect(JSON.stringify(stored())).not.toContain('1012345678');
    });
  });

  describe('US-01-AC-23 configuration changed while data is stored', () => {
    it('US-01-AC-23 drops the values of removed fields and clears a select value whose option no longer exists, then writes the pruned state back', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', { ...CO_VALID_RAW, legacyField: 'x' }));
      const store = newStore();
      expect(store.values()['model']).toBe('3 Touring');

      const withoutLine = seedFieldConfigs('CO')
        .filter((f) => f.key !== 'model')
        .map((f) => (f.key === 'city' ? { ...f, options: f.options!.filter((o: SelectOption) => o.value !== 'MDE') } : f));
      store.prune(withoutLine);

      expect(store.values()).not.toHaveProperty('model');
      expect(store.values()).not.toHaveProperty('legacyField');
      expect(store.values()['city']).toBe('');
      expect(store.values()['fullName']).toBe('Ana Prueba Ficticia');

      const written = stored()!.step1.values;
      expect(written).not.toHaveProperty('model');
      expect(written).not.toHaveProperty('legacyField');
      expect(written['city']).toBe('');
      expect(written['plate']).toBe('ABC123');
    });

    it('US-01-AC-23 keeps a select value whose option still exists', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
      const store = newStore();
      store.prune(seedFieldConfigs('CO'));
      expect(store.values()['city']).toBe('MDE');
      expect(store.values()['make']).toBe('mazda');
    });

    it('US-01-AC-23 after pruning, "Continuar" with the stale city is invalid', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
      const store = newStore();
      const configs = seedFieldConfigs('CO').map((f) => (f.key === 'city' ? { ...f, options: f.options!.filter((o: SelectOption) => o.value !== 'MDE') } : f));
      store.prune(configs);
      expect(store.completeStep1(configs)).toBeNull();
    });
  });

  describe('US-01-BR-08 a corrupted or unexpected stored entry is discarded without logging values', () => {
    it.each([
      ['invalid JSON', `{"version":1,"country":"CO","step1":{"values":{"documentNumber":"${CANARY}"`],
      ['a wrong version', JSON.stringify({ version: 2, country: 'CO', step1: { values: { documentNumber: CANARY } } })],
      ['a country that is not an alpha-2 code', JSON.stringify({ version: 1, country: 'colombia', step1: { values: { documentNumber: CANARY } } })],
      ['a lower-case country code', JSON.stringify({ version: 1, country: 'co', step1: { values: { documentNumber: CANARY } } })],
      ['a value of an unexpected type (a number)', JSON.stringify({ version: 1, country: 'CO', step1: { values: { documentNumber: CANARY, vehicleYear: 2022 } } })],
      ['a value of an unexpected type (null)', JSON.stringify({ version: 1, country: 'CO', step1: { values: { documentNumber: CANARY, city: null } } })],
      ['not an object', JSON.stringify([CANARY])],
    ])('US-01-BR-08 %s: the entry is deleted, the store starts empty and the warning has no value', (_name, raw) => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, raw);
      const store = newStore();
      expect(store.country()).toBeNull();
      expect(store.values()).toEqual({});
      expect(sessionStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
      expect(warn).toHaveBeenCalled();
      expect(loggedText()).not.toContain(CANARY);
    });

    it('US-01-BR-08 a valid entry is read without any warning', () => {
      sessionStorage.setItem(WIZARD_STORAGE_KEY, wizardEntry('CO', CO_VALID_RAW));
      const store = newStore();
      expect(store.values()).toEqual(CO_VALID_RAW);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('US-01-BR-08 storage unavailable falls back to memory', () => {
    it('US-01-BR-08 when sessionStorage rejects writes, the wizard keeps working in memory and warns once, without values', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });
      const store = newStore();
      store.enterCountry('CO');
      store.setValue('documentNumber', CANARY);
      store.setValue('fullName', 'Ana');
      expect(store.values()).toMatchObject({ documentNumber: CANARY, fullName: 'Ana' });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(loggedText()).not.toContain(CANARY);
    });

    it('US-01-BR-08 when sessionStorage rejects reads, the store starts empty and still works', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      });
      const store = newStore();
      expect(store.values()).toEqual({});
      store.enterCountry('CL');
      store.setValue('fullName', 'Ana');
      expect(store.values()).toEqual({ fullName: 'Ana' });
    });
  });
});
