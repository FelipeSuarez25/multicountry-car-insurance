import { FALLBACK_MESSAGE } from './field-config';
import type { FieldConfig, RawValue, RawValues } from './field-config.model';

/**
 * Pure validation core (ADR-0004): no Angular, no forms library. "Today" always comes from the
 * caller (the injectable clock), never from `new Date()`.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const INTEGER = /^-?\d+$/;

export interface YearMonthDay {
  year: number;
  month: number;
  day: number;
}

/** Strict ISO `YYYY-MM-DD` parse: rejects impossible dates such as 2010-02-30. */
export function parseIsoDate(text: string): YearMonthDay | null {
  const m = ISO_DATE.exec(text);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  const real = probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
  return real ? { year, month, day } : null;
}

/** Completed years on the local calendar date of `today`. */
export function ageOn(birth: YearMonthDay, today: Date): number {
  const month = today.getMonth() + 1;
  const birthdayPassed = month > birth.month || (month === birth.month && today.getDate() >= birth.day);
  return today.getFullYear() - birth.year - (birthdayPassed ? 0 : 1);
}

/** Chilean RUT, modulo 11. Dots and dash are accepted, `K` and `k` are equivalent. */
function hasValidRutCheckDigit(text: string): boolean {
  const compact = text.replace(/[.\-\s]/g, '').toUpperCase();
  const m = /^(\d+)([0-9K])$/.exec(compact);
  if (!m) return false;
  let sum = 0;
  let factor = 2;
  for (let i = m[1].length - 1; i >= 0; i--) {
    sum += Number(m[1][i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return m[2] === expected;
}

function usable(message: string | undefined): string {
  return message !== undefined && message.trim() !== '' ? message : FALLBACK_MESSAGE;
}

/** True when the field holds no value (whitespace-only text counts as empty). */
function isEmpty(config: FieldConfig, value: RawValue | undefined): boolean {
  if (config.type === 'checkbox') return value !== true;
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * The message of the first failing check, or `null` when the value is valid. Order: `required`,
 * then the rules in configuration order. An empty optional field skips every rule (US-01-Q-26).
 */
export function validateField(config: FieldConfig, value: RawValue | undefined, today: Date): string | null {
  if (isEmpty(config, value)) {
    return config.isRequired ? usable(config.requiredMessage ?? config.errorMessage) : null;
  }
  if (config.type === 'checkbox') return null;
  const text = typeof value === 'string' ? value.trim() : '';
  const fieldMessage = usable(config.errorMessage);

  if (config.type === 'number' && !INTEGER.test(text)) return fieldMessage;
  if (config.type === 'date' && parseIsoDate(text) === null) return fieldMessage;
  if (config.type === 'select' && !config.options?.some((o) => o.value === text)) return fieldMessage;

  for (const rule of config.rules) {
    const message = usable(rule.message ?? config.errorMessage);
    switch (rule.kind) {
      case 'minLength':
        if (text.length < rule.value) return message;
        break;
      case 'maxLength':
        if (text.length > rule.value) return message;
        break;
      case 'min':
        if (Number(text) < rule.value) return message;
        break;
      case 'max':
        if (Number(text) > rule.value) return message;
        break;
      case 'pattern':
        if (!new RegExp(`^(?:${rule.value})$`).test(text)) return message;
        break;
      case 'minAge': {
        const birth = parseIsoDate(text);
        if (birth === null || ageOn(birth, today) < rule.years) return message;
        break;
      }
      case 'yearRange': {
        const year = today.getFullYear();
        const n = Number(text);
        if (n < year - rule.maxYearsOld || n > year + rule.maxYearsAhead) return message;
        break;
      }
      case 'rutCheckDigit':
        if (!hasValidRutCheckDigit(text)) return message;
        break;
    }
  }
  return null;
}

/** Messages of every invalid field, keyed by field key. A missing value counts as empty. */
export function validateForm(configs: FieldConfig[], values: RawValues | Record<string, unknown>, today: Date): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const config of configs) {
    const raw = values[config.key];
    const value = typeof raw === 'string' || typeof raw === 'boolean' ? raw : undefined;
    const message = validateField(config, value, today);
    if (message !== null) errors[config.key] = message;
  }
  return errors;
}
