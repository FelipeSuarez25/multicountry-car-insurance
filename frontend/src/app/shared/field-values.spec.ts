import { describe, expect, it } from 'vitest';
import { hydrate, toOutput } from './field-values';
import type { FieldConfig } from './field-config.model';
import { CL_VALID_RAW, CO_EXPECTED_OUTPUT, CO_VALID_RAW, seedFieldConfigs } from '../../testing/seed-fixtures';

const optional = (type: FieldConfig['type'], key: string, extra: Partial<FieldConfig> = {}): FieldConfig => ({
  key,
  type,
  label: `Campo ${key}`,
  isRequired: false,
  sortOrder: 500,
  errorMessage: 'Revisa este campo.',
  rules: [],
  ...(type === 'select' ? { options: [{ value: 'A', label: 'Uno', sortOrder: 10 }] } : {}),
  ...extra,
});

describe('US-01-AC-18 typed step 1 output (spec 7.3, ADR-0004 toOutput)', () => {
  it('US-01-AC-18 maps the Colombia values of AC-04 to the typed output of the spec', () => {
    expect(toOutput(seedFieldConfigs('CO'), CO_VALID_RAW)).toEqual(CO_EXPECTED_OUTPUT.values);
  });

  it('US-01-AC-18 the vehicle year is an integer number, not a string', () => {
    const output = toOutput(seedFieldConfigs('CO'), CO_VALID_RAW);
    expect(typeof output['vehicleYear']).toBe('number');
    expect(Number.isInteger(output['vehicleYear'])).toBe(true);
  });

  it('US-01-AC-18 text is trimmed; select keeps the option value; date stays an ISO string', () => {
    const output = toOutput(seedFieldConfigs('CL'), { ...CL_VALID_RAW, fullName: '  Pedro Prueba Ficticio  ' });
    expect(output['fullName']).toBe('Pedro Prueba Ficticio');
    expect(output['city']).toBe('SCL');
    expect(output['birthDate']).toBe('1985-03-20');
  });

  it('US-01-AC-18 an empty optional text, number, select and date field becomes null', () => {
    const configs = [optional('text', 'mobilePhone'), optional('number', 'seats'), optional('select', 'color'), optional('date', 'soldOn')];
    const output = toOutput(configs, { mobilePhone: '', seats: '', color: '', soldOn: '' });
    expect(output).toEqual({ mobilePhone: null, seats: null, color: null, soldOn: null });
  });

  it('US-01-AC-18 an optional text field with only whitespace becomes null', () => {
    expect(toOutput([optional('text', 'mobilePhone')], { mobilePhone: '    ' })).toEqual({ mobilePhone: null });
  });

  it('US-01-AC-18 a checkbox is always a boolean, never null: unchecked optional is false (HC2 decision)', () => {
    const configs = [optional('checkbox', 'newsletter'), optional('checkbox', 'terms', { isRequired: true })];
    expect(toOutput(configs, { newsletter: false, terms: true })).toEqual({ newsletter: false, terms: true });
  });

  it('US-01-AC-18 a filled optional number is an integer and a filled optional text keeps its value', () => {
    const output = toOutput([optional('number', 'seats'), optional('text', 'mobilePhone')], { seats: '5', mobilePhone: ' 3001234567 ' });
    expect(output).toEqual({ seats: 5, mobilePhone: '3001234567' });
  });

  it('US-01-AC-18 does not change the editing values it reads (they are never read back from the output)', () => {
    const values = { ...CO_VALID_RAW, fullName: '  Ana Prueba Ficticia  ' };
    const before = JSON.stringify(values);
    toOutput(seedFieldConfigs('CO'), values);
    expect(JSON.stringify(values)).toBe(before);
  });

  it('US-01-AC-18 only configured keys appear in the output', () => {
    const output = toOutput(seedFieldConfigs('CO'), { ...CO_VALID_RAW, removedField: 'x' });
    expect(Object.keys(output).sort()).toEqual(Object.keys(CO_VALID_RAW).sort());
  });
});

describe('US-01-AC-23 hydration from stored raw values (ADR-0003, ADR-0004 hydrate)', () => {
  it('US-01-AC-04 starts every configured field with its empty editing value when nothing is stored', () => {
    const model = hydrate(seedFieldConfigs('CO'), {});
    expect(model).toEqual({
      documentType: '', documentNumber: '', fullName: '', birthDate: '', city: '',
      plate: '', make: '', model: '', vehicleYear: '', dataConsent: false,
    });
  });

  it('US-01-AC-04 / AC-21 returns the stored raw values exactly, including an in-progress invalid one', () => {
    const model = hydrate(seedFieldConfigs('CL'), { fullName: 'Ana', vehicleYear: '2015.5' });
    expect(model['fullName']).toBe('Ana');
    expect(model['vehicleYear']).toBe('2015.5');
    expect(model['dataConsent']).toBe(false);
  });

  it('US-01-AC-23 drops stored values whose key is no longer configured', () => {
    const configs = seedFieldConfigs('CO').filter((f) => f.key !== 'model');
    const model = hydrate(configs, CO_VALID_RAW);
    expect(model).not.toHaveProperty('model');
    expect(model['fullName']).toBe('Ana Prueba Ficticia');
  });

  it('US-01-AC-23 the model never holds null or undefined', () => {
    const model = hydrate(seedFieldConfigs('CO'), { fullName: null, city: undefined } as unknown as Record<string, unknown>);
    for (const value of Object.values(model)) {
      expect(['string', 'boolean']).toContain(typeof value);
    }
  });

  it('US-01-AC-21 a stored number is shown as text in a number field (the model is string-typed)', () => {
    const model = hydrate(seedFieldConfigs('CO'), { vehicleYear: 2022 });
    expect(model['vehicleYear']).toBe('2022');
  });
});
