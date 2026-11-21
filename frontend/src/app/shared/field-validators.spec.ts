import { describe, expect, it } from 'vitest';
import { validateField, validateForm } from './field-validators';
import type { FieldConfig, ValidationRule } from './field-config.model';
import { day } from '../../testing/clock';
import { CL_VALID_RAW, CO_VALID_RAW, seedField, seedFieldConfigs } from '../../testing/seed-fixtures';

/** The pinned "today" of the spec: 2026-11-20 (vehicle years 2006-2027 are valid). */
const TODAY = day(2026, 11, 20);

function field(overrides: Partial<FieldConfig> & Pick<FieldConfig, 'type'>): FieldConfig {
  return {
    key: 'sample',
    label: 'Campo de prueba',
    isRequired: true,
    sortOrder: 10,
    errorMessage: 'Mensaje del campo.',
    rules: [],
    ...overrides,
  };
}

const withRules = (type: FieldConfig['type'], required: boolean, rules: ValidationRule[], extra: Partial<FieldConfig> = {}): FieldConfig =>
  field({ type, isRequired: required, rules, ...extra });

const valid = (cfg: FieldConfig, value: string | boolean, today: Date = TODAY): boolean => validateField(cfg, value, today) === null;

describe('US-01-AC-05 vehicle year boundaries (US-01-BR-03)', () => {
  const vehicleYear = seedField('CO', 'vehicleYear'); // yearRange maxYearsOld 20, maxYearsAhead 1

  it.each([
    [day(2026, 11, 20), '2027', true],
    [day(2026, 11, 20), '2028', false],
    [day(2026, 11, 20), '2006', true],
    [day(2026, 11, 20), '2005', false],
    [day(2026, 11, 20), '2026', true],
    [day(2027, 1, 1), '2028', true],
    [day(2027, 1, 1), '2006', false],
    [day(2026, 11, 20), '2015.5', false],
  ])('US-01-AC-05 today %s, year %s is valid: %s', (today, year, expected) => {
    expect(valid(vehicleYear, year, today)).toBe(expected);
  });

  it('US-01-AC-05 an invalid year shows the field message', () => {
    expect(validateField(vehicleYear, '2005', TODAY)).toBe('El modelo debe estar entre los últimos 20 años y el próximo año.');
    expect(validateField(vehicleYear, '2015.5', TODAY)).toBe('El modelo debe estar entre los últimos 20 años y el próximo año.');
  });

  it('US-01-AC-05 the limits come from the rule parameters, not from constants', () => {
    const narrow = withRules('number', true, [{ kind: 'yearRange', maxYearsOld: 5, maxYearsAhead: 0 }]);
    expect(valid(narrow, '2021')).toBe(true);
    expect(valid(narrow, '2020')).toBe(false);
    expect(valid(narrow, '2026')).toBe(true);
    expect(valid(narrow, '2027')).toBe(false);
  });

  it('US-01-AC-05 "today" is the injected date, never the real clock', () => {
    const far = day(2100, 6, 1);
    expect(valid(vehicleYear, '2101', far)).toBe(true);
    expect(valid(vehicleYear, '2102', far)).toBe(false);
    expect(valid(vehicleYear, '2080', far)).toBe(true);
    expect(valid(vehicleYear, '2079', far)).toBe(false);
    expect(valid(vehicleYear, '2026', far)).toBe(false);
  });

  it.each(['abc', '2e3', '1e', '--2020', '2020 5'])('US-01-AC-05 / AC-09 the non-numeric text "%s" is invalid', (text) => {
    expect(valid(vehicleYear, text)).toBe(false);
  });
});

describe('US-01-AC-06 legal age boundaries (US-01-BR-04)', () => {
  const birthDate = seedField('CO', 'birthDate'); // minAge 18

  it.each([
    [day(2026, 11, 20), '2008-11-20', true],
    [day(2026, 11, 20), '2008-11-21', false],
    [day(2026, 11, 20), '1990-01-01', true],
    [day(2026, 11, 20), '2026-11-21', false],
    [day(2026, 2, 28), '2008-02-29', false],
    [day(2026, 3, 1), '2008-02-29', true],
    [day(2028, 2, 29), '2010-02-28', true],
  ])('US-01-AC-06 today %s, born %s is valid: %s', (today, born, expected) => {
    expect(valid(birthDate, born, today)).toBe(expected);
  });

  it('US-01-AC-06 a 29 February birth date counts its anniversary on 29 February in a leap year', () => {
    expect(valid(birthDate, '2008-02-29', day(2028, 2, 29))).toBe(true);
    expect(valid(birthDate, '2010-02-28', day(2028, 2, 27))).toBe(false);
  });

  it.each([
    ['one second before midnight', day(2026, 11, 20, 23, 59, 59)],
    ['at midnight', day(2026, 11, 20, 0, 0, 0)],
  ])('US-01-AC-06 the time of day does not move the 18th birthday (%s)', (_label, today) => {
    expect(valid(birthDate, '2008-11-20', today)).toBe(true);
    expect(valid(birthDate, '2008-11-21', today)).toBe(false);
  });

  it('US-01-AC-06 a future birth date is invalid with the field message', () => {
    expect(validateField(birthDate, '2026-11-21', TODAY)).toBe('Debes ser mayor de edad (18 años o más) para cotizar.');
  });

  it('US-01-AC-06 the age comes from the rule parameter (21 years)', () => {
    const adult21 = withRules('date', true, [{ kind: 'minAge', years: 21 }]);
    expect(valid(adult21, '2005-11-20')).toBe(true);
    expect(valid(adult21, '2005-11-21')).toBe(false);
  });
});

describe('US-01-AC-08 required and optional fields (US-01-BR-01, US-01-Q-26)', () => {
  it.each([
    ['required text minLength 3, "   "', withRules('text', true, [{ kind: 'minLength', value: 3 }]), '   ', false],
    ['required text minLength 3, " Ana "', withRules('text', true, [{ kind: 'minLength', value: 3 }]), ' Ana ', true],
    ['required number yearRange 20/1, empty', withRules('number', true, [{ kind: 'yearRange', maxYearsOld: 20, maxYearsAhead: 1 }]), '', false],
    ['required checkbox, unchecked', withRules('checkbox', true, []), false, false],
    ['required select, no option', withRules('select', true, [], { options: [{ value: 'A', label: 'Uno', sortOrder: 10 }] }), '', false],
    ['required date minAge 18, empty', withRules('date', true, [{ kind: 'minAge', years: 18 }]), '', false],
    ['optional text pattern ^[0-9]{10}$, empty', withRules('text', false, [{ kind: 'pattern', value: '^[0-9]{10}$' }]), '', true],
    ['optional text pattern ^[0-9]{10}$, "123"', withRules('text', false, [{ kind: 'pattern', value: '^[0-9]{10}$' }]), '123', false],
    ['optional checkbox, unchecked', withRules('checkbox', false, []), false, true],
  ])('US-01-AC-08 %s', (_name, cfg, value, expected) => {
    expect(valid(cfg, value as string | boolean)).toBe(expected);
  });

  it('US-01-AC-08 a required checkbox that is checked is valid', () => {
    expect(valid(withRules('checkbox', true, []), true)).toBe(true);
  });

  it('US-01-AC-08 a required select with a chosen value is valid; a required date with a real date is valid', () => {
    expect(valid(withRules('select', true, [], { options: [{ value: 'A', label: 'Uno', sortOrder: 10 }] }), 'A')).toBe(true);
    expect(valid(withRules('date', true, []), '1990-05-15')).toBe(true);
  });

  it.each(['not-a-date', '1990-13-01', '2010-02-30', '15/05/1990'])('US-01-AC-08 a required date holding "%s" is not a valid date', (text) => {
    expect(valid(withRules('date', true, []), text)).toBe(false);
  });

  it('US-01-AC-08 zero is a value: a required number with "0" is present', () => {
    expect(valid(withRules('number', true, []), '0')).toBe(true);
  });

  it('US-01-Q-26 an optional text field that is empty after trimming skips every rule', () => {
    const optional = withRules('text', false, [
      { kind: 'minLength', value: 3 },
      { kind: 'pattern', value: '^[0-9]{10}$' },
    ]);
    expect(valid(optional, '')).toBe(true);
    expect(valid(optional, '    ')).toBe(true);
  });

  it('US-01-Q-26 an optional empty number and an optional empty date skip their rules', () => {
    expect(valid(withRules('number', false, [{ kind: 'min', value: 5 }]), '')).toBe(true);
    expect(valid(withRules('date', false, [{ kind: 'minAge', years: 18 }]), '')).toBe(true);
  });

  it('US-01-Q-26 an optional field that has a value still runs its rules', () => {
    expect(valid(withRules('number', false, [{ kind: 'min', value: 5 }]), '3')).toBe(false);
    expect(valid(withRules('number', false, [{ kind: 'min', value: 5 }]), '5')).toBe(true);
  });
});

describe('US-01-AC-08 rule semantics (US-01-BR-01, spec 7.1)', () => {
  it('minLength and maxLength are inclusive and count the trimmed text', () => {
    const cfg = withRules('text', true, [
      { kind: 'minLength', value: 3 },
      { kind: 'maxLength', value: 5 },
    ]);
    expect(valid(cfg, 'ab')).toBe(false);
    expect(valid(cfg, 'abc')).toBe(true);
    expect(valid(cfg, 'abcde')).toBe(true);
    expect(valid(cfg, 'abcdef')).toBe(false);
    expect(valid(cfg, '  ab  ')).toBe(false);
    expect(valid(cfg, '  abcde  ')).toBe(true);
  });

  it('the seed "Nombre completo" accepts 3 and 80 characters and rejects 2 and 81 (US-01-AC-02 "Al")', () => {
    const fullName = seedField('CO', 'fullName');
    expect(valid(fullName, 'Al')).toBe(false);
    expect(valid(fullName, 'Ana')).toBe(true);
    expect(valid(fullName, 'a'.repeat(80))).toBe(true);
    expect(valid(fullName, 'a'.repeat(81))).toBe(false);
    expect(validateField(fullName, 'Al', TODAY)).toBe('Ingresa tu nombre completo (entre 3 y 80 caracteres).');
  });

  it('min and max are inclusive numeric bounds, negatives are allowed unless min forbids them', () => {
    const cfg = withRules('number', true, [
      { kind: 'min', value: 1 },
      { kind: 'max', value: 5 },
    ]);
    expect(valid(cfg, '0')).toBe(false);
    expect(valid(cfg, '1')).toBe(true);
    expect(valid(cfg, '5')).toBe(true);
    expect(valid(cfg, '6')).toBe(false);
    expect(valid(withRules('number', true, []), '-3')).toBe(true);
    expect(valid(withRules('number', true, [{ kind: 'min', value: 0 }]), '-3')).toBe(false);
  });

  it('number fields accept integers only (US-01-Q-12): 2020 is valid, 2020.5 and 2e3 are not', () => {
    const cfg = withRules('number', true, []);
    expect(valid(cfg, '2020')).toBe(true);
    expect(valid(cfg, '2020.5')).toBe(false);
    expect(valid(cfg, '2e3')).toBe(false);
    expect(valid(cfg, 'abc')).toBe(false);
  });

  it('pattern is a full match even when the configuration does not anchor it', () => {
    const cfg = withRules('text', true, [{ kind: 'pattern', value: '[a-z]{3}' }]);
    expect(valid(cfg, 'abc')).toBe(true);
    expect(valid(cfg, 'xabcx')).toBe(false);
    expect(valid(cfg, 'abcd')).toBe(false);
  });
});

describe('US-01-AC-09 which error message is shown (US-01-BR-01, US-01-Q-04)', () => {
  const documentNumber = seedField('CO', 'documentNumber');

  it('an empty required field shows the rule-specific message for "required"', () => {
    expect(validateField(documentNumber, '', TODAY)).toBe('Ingresa tu número de documento.');
    expect(validateField(documentNumber, '   ', TODAY)).toBe('Ingresa tu número de documento.');
  });

  it('a value that fails the pattern shows the field-level message', () => {
    expect(validateField(documentNumber, '12.345', TODAY)).toBe(
      'Ingresa un número de documento válido (solo números, de 6 a 10 dígitos).',
    );
  });

  it('a valid value shows no message (null)', () => {
    expect(validateField(documentNumber, '1012345678', TODAY)).toBeNull();
  });

  it('a required field without requiredMessage shows the field-level message when empty', () => {
    const plate = seedField('CO', 'plate');
    expect(plate.requiredMessage).toBeUndefined();
    expect(validateField(plate, '', TODAY)).toBe('Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).');
  });

  it('a failing rule with its own message shows that message instead of the field message', () => {
    const cfg = withRules('text', true, [{ kind: 'minLength', value: 3, message: 'Muy corto.' }], { errorMessage: 'Mensaje del campo.' });
    expect(validateField(cfg, 'ab', TODAY)).toBe('Muy corto.');
  });

  it('when several rules fail, the first one in configuration order wins', () => {
    const lengthFirst = withRules('text', true, [
      { kind: 'minLength', value: 5, message: 'Mensaje de longitud.' },
      { kind: 'pattern', value: '^[0-9]+$', message: 'Mensaje de formato.' },
    ]);
    const patternFirst = withRules('text', true, [
      { kind: 'pattern', value: '^[0-9]+$', message: 'Mensaje de formato.' },
      { kind: 'minLength', value: 5, message: 'Mensaje de longitud.' },
    ]);
    expect(validateField(lengthFirst, 'ab', TODAY)).toBe('Mensaje de longitud.');
    expect(validateField(patternFirst, 'ab', TODAY)).toBe('Mensaje de formato.');
  });

  it('the required check comes before the rules', () => {
    const cfg = withRules('text', true, [{ kind: 'minLength', value: 5, message: 'Mensaje de longitud.' }], {
      requiredMessage: 'Es obligatorio.',
    });
    expect(validateField(cfg, '', TODAY)).toBe('Es obligatorio.');
  });

  it('a number the browser cannot parse reaches the form as empty: the required field shows its message (AC-09 note, ADR-0004)', () => {
    const vehicleYear = seedField('CO', 'vehicleYear'); // no requiredMessage in the seed
    expect(validateField(vehicleYear, '', TODAY)).toBe('El modelo debe estar entre los últimos 20 años y el próximo año.');
  });

  it('a number the browser cannot parse reaches the form as empty: an optional field is valid and nothing is shown (AC-09 note)', () => {
    const optionalNumber = withRules('number', false, [{ kind: 'min', value: 1 }]);
    expect(validateField(optionalNumber, '', TODAY)).toBeNull();
  });

  it('Generic fallback: a field with no usable message shows "Revisa este campo." and no rule name or English text', () => {
    for (const errorMessage of ['', '   ', undefined as unknown as string]) {
      const cfg = withRules('text', true, [{ kind: 'minLength', value: 5 }], { errorMessage });
      const emptyMessage = validateField(cfg, '', TODAY);
      const ruleMessage = validateField(cfg, 'ab', TODAY);
      expect(emptyMessage).toBe('Revisa este campo.');
      expect(ruleMessage).toBe('Revisa este campo.');
      expect(ruleMessage).not.toMatch(/minLength|pattern|required|invalid|error/i);
    }
  });

  it('messages are static: they carry no placeholder substitution', () => {
    const cfg = withRules('text', true, [{ kind: 'minLength', value: 3 }], { errorMessage: 'Usa al menos {min} letras.' });
    expect(validateField(cfg, 'ab', TODAY)).toBe('Usa al menos {min} letras.');
  });
});

describe('US-01-AC-11 country-specific document and plate formats (US-01-BR-05, seed rule values)', () => {
  const coPlate = seedField('CO', 'plate');
  const coDocument = seedField('CO', 'documentNumber');
  const clPlate = seedField('CL', 'plate');
  const clRut = seedField('CL', 'documentNumber');

  it.each([
    ['ABC123', true],
    ['abc123', true],
    ['AB1234', false],
    ['ABC-123', false],
  ])('US-01-AC-11 Colombia Placa "%s" is valid: %s', (value, expected) => {
    expect(valid(coPlate, value)).toBe(expected);
  });

  it.each([
    ['1012345678', true],
    ['12345', false],
    ['10123456789', false],
  ])('US-01-AC-11 Colombia Número de documento "%s" is valid: %s', (value, expected) => {
    expect(valid(coDocument, value)).toBe(expected);
  });

  it.each([
    ['BCDF12', true],
    ['AB1234', true],
    ['ABC123', false],
  ])('US-01-AC-11 Chile Patente "%s" is valid: %s', (value, expected) => {
    expect(valid(clPlate, value)).toBe(expected);
  });

  it.each([
    ['12.345.678-5', true],
    ['12345678-5', true],
    ['123456785', true],
    ['12.345.678', false],
  ])('US-01-AC-11 Chile RUT "%s" is valid: %s', (value, expected) => {
    expect(valid(clRut, value)).toBe(expected);
  });

  it('US-01-AC-11 the seed configurations are what the rows exercise (6 digits is the document minimum, 10 the maximum)', () => {
    expect(valid(coDocument, '123456')).toBe(true);
    expect(valid(coDocument, '1234567890')).toBe(true);
  });
});

describe('US-01-AC-12 RUT check digit (US-01-BR-05, US-01-Q-09)', () => {
  const rutOnly = withRules('text', true, [{ kind: 'rutCheckDigit' }], { errorMessage: 'Ingresa un RUT válido.' });
  const clRut = seedField('CL', 'documentNumber');

  it.each([
    ['12.345.678-5', true],
    ['12.345.678-9', false],
    ['1.000.005-K', true],
    ['1.000.005-k', true],
    ['1.000.005-1', false],
    ['11.111.111-1', true],
  ])('US-01-AC-12 RUT "%s" is valid: %s (seed field: pattern and check digit)', (rut, expected) => {
    expect(valid(clRut, rut)).toBe(expected);
  });

  it.each([
    ['12.345.678-5', true],
    ['12345678-5', true],
    ['123456785', true],
    ['12.345.678-6', false],
    ['1.000.013-0', true],
    ['1.000.013-K', false],
    ['7.654.321-6', true],
    ['7.654.321-5', false],
    ['1.000.005-K', true],
    ['1.000.005-k', true],
    ['  12.345.678-5  ', true],
  ])('US-01-AC-12 the rule alone: "%s" is valid: %s (dots, dash, K/k, trimmed)', (rut, expected) => {
    expect(valid(rutOnly, rut)).toBe(expected);
  });

  it('US-01-AC-12 a wrong check digit shows the field message', () => {
    expect(validateField(clRut, '12.345.678-9', TODAY)).toBe('Ingresa un RUT válido (por ejemplo, 12.345.678-5).');
  });

  it('US-01-AC-12 an empty required RUT shows the required message; text that is not a RUT is invalid', () => {
    expect(validateField(clRut, '', TODAY)).toBe('Ingresa tu RUT.');
    expect(valid(rutOnly, 'abcdefgh-1')).toBe(false);
  });

  it('US-01-AC-12 an optional field with the rule skips it when empty', () => {
    expect(valid(withRules('text', false, [{ kind: 'rutCheckDigit' }]), '')).toBe(true);
  });
});

describe('US-01-AC-02 / US-01-AC-18 validation of a whole form (the same pure core the guard uses)', () => {
  it('US-01-AC-18 the Colombia values of AC-04 are valid on 2026-11-20', () => {
    expect(validateForm(seedFieldConfigs('CO'), CO_VALID_RAW, TODAY)).toEqual({});
  });

  it('US-01-AC-18 the Chile seed values are valid on 2026-11-20', () => {
    expect(validateForm(seedFieldConfigs('CL'), CL_VALID_RAW, TODAY)).toEqual({});
  });

  it('US-01-AC-02 reports the message of every invalid field, keyed by field key', () => {
    const errors = validateForm(
      seedFieldConfigs('CO'),
      { ...CO_VALID_RAW, vehicleYear: '2005', plate: 'AB12', city: '', dataConsent: false },
      TODAY,
    );
    expect(errors).toEqual({
      vehicleYear: 'El modelo debe estar entre los últimos 20 años y el próximo año.',
      plate: 'Ingresa una placa válida: 3 letras y 3 números (por ejemplo, ABC123).',
      city: 'Selecciona tu ciudad.',
      dataConsent: 'Debes autorizar el tratamiento de tus datos para continuar.',
    });
  });

  it('US-01-AC-02 a missing value counts as empty: nothing is valid by omission', () => {
    const errors = validateForm(seedFieldConfigs('CO'), {}, TODAY);
    expect(Object.keys(errors).sort()).toEqual(seedFieldConfigs('CO').map((f) => f.key).sort());
  });

  it('US-01-AC-02 birth date 2010-03-01 on 2026-11-20 is under age', () => {
    const errors = validateForm(seedFieldConfigs('CO'), { ...CO_VALID_RAW, birthDate: '2010-03-01' }, TODAY);
    expect(errors).toEqual({ birthDate: 'Debes ser mayor de edad (18 años o más) para cotizar.' });
  });

  it('US-01-AC-02 the same values are valid on one date and invalid on another: the clock decides', () => {
    expect(validateForm(seedFieldConfigs('CO'), CO_VALID_RAW, day(2046, 6, 1))).toHaveProperty('vehicleYear');
  });
});
