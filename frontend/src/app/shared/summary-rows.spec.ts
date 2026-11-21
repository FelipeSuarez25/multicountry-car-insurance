import { describe, expect, it } from 'vitest';
import type { FieldConfig, Step1Output } from './field-config.model';
import { buildSummaryRows as buildSummaryRowsImpl } from './summary-rows';
import { CO_EXPECTED_OUTPUT, seedFieldConfigs, seedField } from '../../testing/seed-fixtures';

/**
 * US-03-BR-01 / US-03-Q-05: the summary rows are built from the typed step 1 output and this page
 * load's field configuration. One row per configured field with a non-empty value, except
 * checkboxes; the Strapi label and a display value; grouped under "Tus datos" (`holder`) and "Tu
 * vehículo" (`vehicle`, the reserved keys plate, make, model, vehicleYear), each in sortOrder.
 * Display values: select -> option label; date -> long date of the country's `locale` (UTC, no
 * day shift); number -> plain digits; text as entered; `documentNumber` masked (BR-02).
 *
 * Expected API (`frontend/src/app/shared/summary-rows.ts`):
 *   buildSummaryRows(configs: readonly FieldConfig[], output: Step1Output, locale: string):
 *     { holder: SummaryRow[]; vehicle: SummaryRow[] }
 *   interface SummaryRow { key: string; label: string; value: string; accessibleValue?: string }
 * For `documentNumber`, `value` is the masked text and `accessibleValue` the text a screen reader
 * gets ("Número oculto, termina en 5678"); every other row has no `accessibleValue`.
 */

interface SummaryRow {
  key: string;
  label: string;
  value: string;
  accessibleValue?: string;
}
interface SummaryRows {
  holder: SummaryRow[];
  vehicle: SummaryRow[];
}
/** The contract, typed here: when the module exists, this assignment checks the real signature. */
const buildSummaryRows: (configs: readonly FieldConfig[], output: Step1Output, locale: string) => SummaryRows = buildSummaryRowsImpl;

const CL_OUTPUT: Step1Output = {
  country: 'CL',
  values: {
    documentNumber: '12.345.678-5',
    fullName: 'Ana Prueba Ficticia',
    birthDate: '1990-05-15',
    city: 'SCL',
    plate: 'BCDF12',
    make: 'kia',
    model: 'Rio 5',
    vehicleYear: 2022,
    dataConsent: true,
  },
};

const pairs = (rows: { label: string; value: string }[]): [string, string][] => rows.map((r) => [r.label, r.value]);

function withValues(overrides: Record<string, string | number | boolean | null>, base: Step1Output = CO_EXPECTED_OUTPUT): Step1Output {
  return { country: base.country, values: { ...base.values, ...overrides } };
}

const MOBILE_PHONE: FieldConfig = {
  key: 'mobilePhone',
  type: 'text',
  label: 'Teléfono celular',
  isRequired: false,
  sortOrder: 45,
  errorMessage: 'Ingresa un teléfono válido.',
  rules: [],
};

describe('US-03-AC-01 / US-03-AC-06 the rows of the summary', () => {
  const co = (output: Step1Output = CO_EXPECTED_OUTPUT, extra: FieldConfig[] = []) =>
    buildSummaryRows([...seedFieldConfigs('CO'), ...extra], output, 'es-CO');

  describe('US-03-AC-01 Colombia, with the seed fields', () => {
    it('US-03-AC-01 "Tus datos" has, in this order: Tipo de documento, Número de documento, Nombre completo, Fecha de nacimiento, Ciudad', () => {
      expect(pairs(co().holder)).toEqual([
        ['Tipo de documento', 'Cédula de ciudadanía'],
        ['Número de documento', '••••••5678'],
        ['Nombre completo', 'Ana Prueba Ficticia'],
        ['Fecha de nacimiento', '15 de mayo de 1990'],
        ['Ciudad', 'Medellín'],
      ]);
    });

    it('US-03-AC-01 "Tu vehículo" has, in this order: Placa, Marca, Línea, Modelo (año)', () => {
      expect(pairs(co().vehicle)).toEqual([
        ['Placa', 'ABC123'],
        ['Marca', 'Mazda'],
        ['Línea', '3 Touring'],
        ['Modelo (año)', '2022'],
      ]);
    });

    it('US-03-AC-01 the consent checkbox is not a row', () => {
      const labels = [...co().holder, ...co().vehicle].map((r) => r.label);
      expect(labels).not.toContain('Autorizo el tratamiento de mis datos personales.');
      expect(labels).toHaveLength(9);
    });

    it('US-03-AC-01 the order follows sortOrder, not the order of the configuration or of the output', () => {
      const shuffled = [...seedFieldConfigs('CO')].reverse();
      const rows = buildSummaryRows(shuffled, CO_EXPECTED_OUTPUT, 'es-CO');
      expect(rows.holder.map((r) => r.label)).toEqual(['Tipo de documento', 'Número de documento', 'Nombre completo', 'Fecha de nacimiento', 'Ciudad']);
      expect(rows.vehicle.map((r) => r.label)).toEqual(['Placa', 'Marca', 'Línea', 'Modelo (año)']);
    });
  });

  describe('US-03-AC-01 Chile, with the seed fields', () => {
    const rows = buildSummaryRows(seedFieldConfigs('CL'), CL_OUTPUT, 'es-CL');

    it('US-03-AC-01 "Tus datos": RUT "••.•••.678-5", Nombre completo, Fecha de nacimiento, Ciudad "Santiago"', () => {
      expect(pairs(rows.holder)).toEqual([
        ['RUT', '••.•••.678-5'],
        ['Nombre completo', 'Ana Prueba Ficticia'],
        ['Fecha de nacimiento', '15 de mayo de 1990'],
        ['Ciudad', 'Santiago'],
      ]);
    });

    it('US-03-AC-01 "Tu vehículo": Patente, Marca "Kia", Modelo "Rio 5", Año "2022"', () => {
      expect(pairs(rows.vehicle)).toEqual([
        ['Patente', 'BCDF12'],
        ['Marca', 'Kia'],
        ['Modelo', 'Rio 5'],
        ['Año', '2022'],
      ]);
    });
  });

  describe('US-03-AC-06 how step 1 values are shown', () => {
    it('US-03-AC-06 documentType "CC" shows the option label "Cédula de ciudadanía", never the code', () => {
      const row = co().holder.find((r) => r.label === 'Tipo de documento');
      expect(row?.value).toBe('Cédula de ciudadanía');
      expect(JSON.stringify(co())).not.toContain('"CC"');
    });

    it('US-03-AC-06 the second option label is shown too: "CE" -> "Cédula de extranjería"', () => {
      const row = co(withValues({ documentType: 'CE' })).holder.find((r) => r.key === 'documentType');
      expect(row?.value).toBe('Cédula de extranjería');
    });

    it('US-03-AC-06 a select shows its label for every kind of select: city "MDE" -> "Medellín", make "mazda" -> "Mazda"', () => {
      expect(co().holder.find((r) => r.key === 'city')?.value).toBe('Medellín');
      expect(co().vehicle.find((r) => r.key === 'make')?.value).toBe('Mazda');
    });

    it('US-03-AC-06 birthDate "1990-05-15" shows "15 de mayo de 1990"', () => {
      expect(co().holder.find((r) => r.key === 'birthDate')?.value).toBe('15 de mayo de 1990');
    });

    it('US-03-AC-06 the long date comes from the locale of the country, not from code: en-US writes "May 15, 1990"', () => {
      const rows = buildSummaryRows(seedFieldConfigs('CO'), CO_EXPECTED_OUTPUT, 'en-US');
      expect(rows.holder.find((r) => r.key === 'birthDate')?.value).toBe('May 15, 1990');
    });

    it('US-03-AC-06 Chile writes the same long Spanish date with its own locale "es-CL"', () => {
      const rows = buildSummaryRows(seedFieldConfigs('CL'), CL_OUTPUT, 'es-CL');
      expect(rows.holder.find((r) => r.key === 'birthDate')?.value).toBe('15 de mayo de 1990');
    });

    it('US-03-AC-06 the date is not shifted by the time zone: the first and the last day of a year keep their day', () => {
      expect(co(withValues({ birthDate: '2000-01-01' })).holder.find((r) => r.key === 'birthDate')?.value).toBe('1 de enero de 2000');
      expect(co(withValues({ birthDate: '1999-12-31' })).holder.find((r) => r.key === 'birthDate')?.value).toBe('31 de diciembre de 1999');
    });

    it('US-03-AC-06 vehicleYear 2022 shows "2022" with no thousands separator', () => {
      expect(co().vehicle.find((r) => r.key === 'vehicleYear')?.value).toBe('2022');
    });

    it('US-03-AC-06 a number is plain digits whatever its size: 1234567 shows "1234567", 0 shows "0" (zero is a value)', () => {
      const odometer: FieldConfig = { key: 'odometer', type: 'number', label: 'Kilometraje', isRequired: false, sortOrder: 95, errorMessage: 'Revisa este campo.', rules: [] };
      const big = co(withValues({ odometer: 1234567 }), [odometer]);
      expect(big.holder.find((r) => r.key === 'odometer')?.value).toBe('1234567');
      const zero = co(withValues({ odometer: 0 }), [odometer]);
      expect(zero.holder.find((r) => r.key === 'odometer')?.value).toBe('0');
    });

    it('US-03-AC-06 model "3 Touring" is under "Tu vehículo", not under "Tus datos"', () => {
      expect(co().vehicle.map((r) => r.key)).toContain('model');
      expect(co().holder.map((r) => r.key)).not.toContain('model');
    });

    it('US-03-AC-06 the vehicle group is exactly the reserved keys plate, make, model, vehicleYear; every other key is a holder row', () => {
      const rows = co();
      expect(rows.vehicle.map((r) => r.key)).toEqual(['plate', 'make', 'model', 'vehicleYear']);
      expect(rows.holder.map((r) => r.key)).toEqual(['documentType', 'documentNumber', 'fullName', 'birthDate', 'city']);
    });

    it('US-03-AC-06 dataConsent true: no row for the consent checkbox', () => {
      const keys = [...co().holder, ...co().vehicle].map((r) => r.key);
      expect(keys).not.toContain('dataConsent');
    });

    it('US-03-AC-06 a checkbox that is false has no row either', () => {
      const keys = [...co(withValues({ dataConsent: false })).holder, ...co(withValues({ dataConsent: false })).vehicle].map((r) => r.key);
      expect(keys).not.toContain('dataConsent');
    });

    it('US-03-AC-06 an editor-added optional field left empty (null) has no row', () => {
      const rows = co(withValues({ mobilePhone: null }), [MOBILE_PHONE]);
      expect([...rows.holder, ...rows.vehicle].map((r) => r.label)).not.toContain('Teléfono celular');
      expect(rows.holder).toHaveLength(5);
    });

    it('US-03-AC-06 an empty string is empty too: no row', () => {
      const rows = co(withValues({ mobilePhone: '' }), [MOBILE_PHONE]);
      expect([...rows.holder, ...rows.vehicle].map((r) => r.label)).not.toContain('Teléfono celular');
    });

    it('US-03-AC-06 an editor-added field with a value, "3001234567", is a "Tus datos" row in sortOrder (between Fecha de nacimiento and Ciudad), unmasked', () => {
      const rows = co(withValues({ mobilePhone: '3001234567' }), [MOBILE_PHONE]);
      expect(rows.holder.map((r) => r.label)).toEqual(['Tipo de documento', 'Número de documento', 'Nombre completo', 'Fecha de nacimiento', 'Teléfono celular', 'Ciudad']);
      const phone = rows.holder.find((r) => r.key === 'mobilePhone');
      expect(phone?.value).toBe('3001234567');
      expect(phone?.accessibleValue).toBeUndefined();
    });

    it('US-03-AC-06 the label of the row is the Strapi label of this page load: a renamed field shows its new label', () => {
      const configs = seedFieldConfigs('CO').map((c) => (c.key === 'fullName' ? { ...c, label: 'Nombre y apellidos' } : c));
      const rows = buildSummaryRows(configs, CO_EXPECTED_OUTPUT, 'es-CO');
      expect(rows.holder.map((r) => r.label)).toContain('Nombre y apellidos');
      expect(rows.holder.map((r) => r.label)).not.toContain('Nombre completo');
    });

    it('US-03-AC-06 a key in the output that is no longer configured has no row (one row per configured field)', () => {
      const rows = co(withValues({ removedField: 'valor huérfano' }));
      expect(JSON.stringify(rows)).not.toContain('valor huérfano');
    });

    it('US-03-AC-06 a select value with no matching option is shown raw: the row is kept with the value as stored', () => {
      const row = co(withValues({ city: 'ZZZ' })).holder.find((r) => r.key === 'city');
      expect(row?.value).toBe('ZZZ');
    });

    it('US-03-AC-06 an invalid date string is shown raw: the row is kept with the value as stored', () => {
      for (const bad of ['no-es-una-fecha', '1990-13-45', '15/05/1990']) {
        const row = co(withValues({ birthDate: bad })).holder.find((r) => r.key === 'birthDate');
        expect(row?.value, bad).toBe(bad);
      }
    });

    it('US-03-AC-06 a configured field with no entry in the output has no row', () => {
      const rest: Step1Output['values'] = { ...CO_EXPECTED_OUTPUT.values };
      delete rest['vehicleYear'];
      const rows = co({ country: 'CO', values: rest });
      expect(rows.vehicle.map((r) => r.key)).toEqual(['plate', 'make', 'model']);
    });
  });

  describe('US-03-BR-01 groups with no rows are empty', () => {
    it('US-03-BR-01 with every vehicle field removed from the configuration, the vehicle group is empty and the holder group stays', () => {
      const holderOnly = seedFieldConfigs('CO').filter((c) => !['plate', 'make', 'model', 'vehicleYear'].includes(c.key));
      const rows = buildSummaryRows(holderOnly, CO_EXPECTED_OUTPUT, 'es-CO');
      expect(rows.vehicle).toEqual([]);
      expect(rows.holder).toHaveLength(5);
    });

    it('US-03-BR-01 with only vehicle fields configured, the holder group is empty', () => {
      const vehicleOnly = seedFieldConfigs('CO').filter((c) => ['plate', 'make', 'model', 'vehicleYear'].includes(c.key));
      const rows = buildSummaryRows(vehicleOnly, CO_EXPECTED_OUTPUT, 'es-CO');
      expect(rows.holder).toEqual([]);
      expect(rows.vehicle).toHaveLength(4);
    });
  });

  describe('US-03-BR-02 only the document number is masked', () => {
    it('US-03-BR-02 the row "Número de documento" has the masked text and the spoken text', () => {
      const row = co().holder.find((r) => r.key === 'documentNumber');
      expect(row?.value).toBe('••••••5678');
      expect(row?.accessibleValue).toBe('Número oculto, termina en 5678');
    });

    it('US-03-BR-02 no row carries the full document number or its hidden digits', () => {
      const serialised = JSON.stringify(co());
      expect(serialised).not.toContain('1012345678');
      expect(serialised).not.toContain('101234');
    });

    it('US-03-BR-02 the RUT row is masked by the same rule, without a country branch: spoken "Número oculto, termina en 678-5"', () => {
      const row = buildSummaryRows(seedFieldConfigs('CL'), CL_OUTPUT, 'es-CL').holder.find((r) => r.key === 'documentNumber');
      expect(row?.value).toBe('••.•••.678-5');
      expect(row?.accessibleValue).toBe('Número oculto, termina en 678-5');
    });

    it('US-03-BR-02 the plate, the name and the other text rows are shown as entered, with no spoken override', () => {
      const rows = co();
      for (const row of [...rows.holder, ...rows.vehicle].filter((r) => r.key !== 'documentNumber')) {
        expect(row.accessibleValue, row.key).toBeUndefined();
      }
      expect(rows.vehicle.find((r) => r.key === 'plate')?.value).toBe('ABC123');
    });
  });

  describe('US-03-AC-01 the function is pure', () => {
    it('US-03-AC-01 it does not change its inputs and gives the same rows twice', () => {
      const configs = seedFieldConfigs('CO');
      const before = JSON.stringify([configs, CO_EXPECTED_OUTPUT]);
      const first = buildSummaryRows(configs, CO_EXPECTED_OUTPUT, 'es-CO');
      const second = buildSummaryRows(configs, CO_EXPECTED_OUTPUT, 'es-CO');
      expect(JSON.stringify([configs, CO_EXPECTED_OUTPUT])).toBe(before);
      expect(second).toEqual(first);
      expect(seedField('CO', 'plate').label).toBe('Placa');
    });
  });
});
