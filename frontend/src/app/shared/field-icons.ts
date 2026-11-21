import type { Type } from '@angular/core';
import {
  LucideCalendar,
  LucideCalendarRange,
  LucideCar,
  LucideCarFront,
  LucideHash,
  LucideIdCard,
  LucideMapPin,
  LucidePencilLine,
  LucideRectangleHorizontal,
  LucideUser,
} from '@lucide/angular';
import type { FieldConfig } from './field-config.model';

/**
 * The icon of a step 1 field, chosen by its key (ADR-0010 section 7): a presentation map, no
 * behaviour or copy depends on it. Any other key of a text, number, select or date field gets the
 * default; a checkbox gets none.
 */
const BY_KEY: Record<string, Type<unknown>> = {
  documentType: LucideIdCard,
  documentNumber: LucideHash,
  fullName: LucideUser,
  birthDate: LucideCalendar,
  city: LucideMapPin,
  plate: LucideRectangleHorizontal,
  make: LucideCar,
  model: LucideCarFront,
  vehicleYear: LucideCalendarRange,
};

export function iconForField(config: Pick<FieldConfig, 'key' | 'type'>): Type<unknown> | null {
  if (config.type === 'checkbox') return null;
  return Object.hasOwn(BY_KEY, config.key) ? BY_KEY[config.key] : LucidePencilLine;
}
