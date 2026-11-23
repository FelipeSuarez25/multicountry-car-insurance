import { describe, expect, it } from 'vitest';
import { iconForField } from './field-icons';
import type { FieldConfig, FieldType } from './field-config.model';

/**
 * US-04-AC-04 / US-04-BR-04 (US-04-Q-09, ADR-0010 section 7): the field-key to icon map, as a unit test
 * of the table, not of pixels.
 *
 * Contract expected from `shared/field-icons.ts`:
 *   iconForField(config: Pick<FieldConfig, 'key' | 'type'>): Type<unknown> | null
 * The result is a `@lucide/angular` icon component class (its class name is the Lucide name, for
 * example `LucideIdCard`), the default `LucidePencilLine` for any other key of type text, number,
 * select or date, and `null` for a checkbox (no input icon).
 */

const field = (key: string, type: FieldType): Pick<FieldConfig, 'key' | 'type'> => ({ key, type });
const nameOf = (config: Pick<FieldConfig, 'key' | 'type'>): string | null => iconForField(config)?.name ?? null;

describe('US-04-AC-04 field icons by key (the table of the AC, Colombia step 1)', () => {
  const rows: [string, FieldType, string][] = [
    ['documentType', 'select', 'LucideIdCard'],
    ['documentNumber', 'text', 'LucideHash'],
    ['fullName', 'text', 'LucideUser'],
    ['birthDate', 'date', 'LucideCalendar'],
    ['city', 'select', 'LucideMapPin'],
    ['plate', 'text', 'LucideRectangleHorizontal'],
    ['make', 'select', 'LucideCar'],
    ['model', 'text', 'LucideCarFront'],
    ['vehicleYear', 'number', 'LucideCalendarRange'],
  ];

  it.each(rows)('US-04-AC-04 key "%s" (%s) shows %s', (key, type, icon) => {
    expect(nameOf(field(key, type))).toBe(icon);
  });

  it('US-04-AC-04 the nine mapped keys use nine different icons', () => {
    expect(new Set(rows.map(([key, type]) => nameOf(field(key, type)))).size).toBe(9);
  });
});

describe('US-04-AC-04 the default icon and the checkbox', () => {
  it.each(['text', 'number', 'select', 'date'] as FieldType[])('US-04-AC-04 an unknown key of type %s shows the default LucidePencilLine', (type) => {
    expect(nameOf(field('mobilePhone', type))).toBe('LucidePencilLine');
    expect(nameOf(field('mileage', type))).toBe('LucidePencilLine');
  });

  it('US-04-AC-04 the consent checkbox (key dataConsent) shows no input icon, and neither does any other checkbox', () => {
    expect(iconForField(field('dataConsent', 'checkbox'))).toBeNull();
    expect(iconForField(field('newsletter', 'checkbox'))).toBeNull();
  });

  it('US-04-AC-04 the icon follows the key, not the type: a mapped key of an unexpected type still gets its icon', () => {
    expect(nameOf(field('city', 'text'))).toBe('LucideMapPin');
  });

  it('US-04-AC-04 a mapped key typed as checkbox shows none (checkbox fields never show an input icon)', () => {
    expect(iconForField(field('city', 'checkbox'))).toBeNull();
  });

  it('US-04-AC-04 keys of the Chile form that are not in the table (RUT is documentNumber; Patente is plate) resolve like Colombia; an unmapped key is the default', () => {
    expect(nameOf(field('documentNumber', 'text'))).toBe('LucideHash');
    expect(nameOf(field('inspectionDate', 'date'))).toBe('LucidePencilLine');
  });
});
