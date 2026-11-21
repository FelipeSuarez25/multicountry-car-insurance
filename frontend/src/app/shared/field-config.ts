import type { FieldConfig, FieldType, SelectOption, ValidationRule } from './field-config.model';

const KEY = /^[a-z][a-zA-Z0-9]*$/;
const TYPES: readonly FieldType[] = ['text', 'number', 'select', 'date', 'checkbox'];
export const FALLBACK_MESSAGE = 'Revisa este campo.';

/** Rule kinds and the field type each one applies to (spec 7.1). */
const APPLIES_TO: Record<string, FieldType> = {
  minLength: 'text',
  maxLength: 'text',
  pattern: 'text',
  rutCheckDigit: 'text',
  min: 'number',
  max: 'number',
  yearRange: 'number',
  minAge: 'date',
};

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isFieldType = (v: unknown): v is FieldType => TYPES.some((t) => t === v);
const isNonEmpty = (v: unknown): v is string => isStr(v) && v.trim() !== '';

/** Numeric sortOrder tolerated as text for fields and options (not used for rule parameters). */
function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (isStr(v) && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
}
/** A rule parameter must be a JSON number (spec 7.5.1): numeric text such as "3" is a wrong type. */
const jsonNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const nonNegativeInt = (v: unknown): number | null => {
  const n = jsonNum(v);
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
};

/** Maps one wire rule (spec 7.5.1) to the logical rule; attributes its kind does not use are ignored. */
function parseRule(raw: unknown, type: FieldType): ValidationRule | null {
  if (!isRec(raw) || !isStr(raw['kind']) || APPLIES_TO[raw['kind']] !== type) return null;
  const message = isNonEmpty(raw['message']) ? raw['message'] : undefined;
  switch (raw['kind']) {
    case 'minLength':
    case 'maxLength': {
      const value = nonNegativeInt(raw['value']);
      return value === null ? null : { kind: raw['kind'], value, message };
    }
    case 'min':
    case 'max': {
      const value = jsonNum(raw['value']);
      return value === null ? null : { kind: raw['kind'], value, message };
    }
    case 'pattern': {
      const source = raw['pattern'];
      if (!isNonEmpty(source)) return null;
      try {
        new RegExp(`^(?:${source})$`);
      } catch {
        return null;
      }
      return { kind: 'pattern', value: source, message };
    }
    case 'minAge': {
      const years = nonNegativeInt(raw['years']);
      return years === null || years === 0 ? null : { kind: 'minAge', years, message };
    }
    case 'yearRange': {
      const maxYearsOld = nonNegativeInt(raw['maxYearsOld']);
      const maxYearsAhead = nonNegativeInt(raw['maxYearsAhead']);
      return maxYearsOld === null || maxYearsAhead === null ? null : { kind: 'yearRange', maxYearsOld, maxYearsAhead, message };
    }
    case 'rutCheckDigit':
      return { kind: 'rutCheckDigit', message };
    default:
      return null;
  }
}

function parseOptions(raw: unknown): SelectOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const options: SelectOption[] = [];
  for (const o of raw) {
    if (!isRec(o) || !isStr(o['value']) || !isNonEmpty(o['label'])) return null;
    const sortOrder = num(o['sortOrder']);
    if (sortOrder === null) return null;
    options.push({ value: o['value'], label: o['label'], sortOrder });
  }
  if (new Set(options.map((o) => o.value)).size !== options.length) return null;
  return options.sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value));
}

/** Parses one item; returns the config or the reason it was dropped. */
function parseItem(raw: unknown): FieldConfig | string {
  if (!isRec(raw)) return 'not an object';
  const key = raw['key'];
  if (!isStr(key) || !KEY.test(key)) return 'invalid key';
  const fieldType = raw['type'];
  if (!isFieldType(fieldType)) return 'unknown type';
  if (!isNonEmpty(raw['label'])) return 'empty label';
  if (typeof raw['isRequired'] !== 'boolean') return 'invalid isRequired';
  const sortOrder = num(raw['sortOrder']);
  if (sortOrder === null) return 'invalid sortOrder';

  const rawRules = Array.isArray(raw['rules']) ? raw['rules'] : [];
  const rules: ValidationRule[] = [];
  for (const r of rawRules) {
    const parsed = parseRule(r, fieldType);
    if (parsed === null) return 'malformed rule';
    rules.push(parsed);
  }

  let options: SelectOption[] | undefined;
  if (fieldType === 'select') {
    const parsed = parseOptions(raw['options']);
    if (parsed === null) return 'invalid options';
    options = parsed;
  }

  let errorMessage = FALLBACK_MESSAGE;
  if (isNonEmpty(raw['errorMessage'])) {
    errorMessage = raw['errorMessage'];
  } else {
    console.warn(`field config: "${key}" has no errorMessage, using the fallback message`);
  }

  return {
    key,
    type: fieldType,
    label: raw['label'],
    helpText: isNonEmpty(raw['helpText']) ? raw['helpText'] : undefined,
    placeholder: isNonEmpty(raw['placeholder']) ? raw['placeholder'] : undefined,
    isRequired: raw['isRequired'],
    sortOrder,
    errorMessage,
    requiredMessage: isNonEmpty(raw['requiredMessage']) ? raw['requiredMessage'] : undefined,
    options,
    rules,
  };
}

/**
 * Boundary validation of the Strapi response (spec 7.1, US-01-AC-14): malformed fields are dropped
 * with a `console.warn` that names the key and the problem, never labels, texts or values.
 * Returns the valid fields sorted by `sortOrder`, ties broken by key; for a repeated key the
 * first one in that order wins.
 */
export function parseFieldConfigs(response: unknown): FieldConfig[] {
  const data = isRec(response) ? response['data'] : null;
  if (!Array.isArray(data)) {
    console.warn('field config: unexpected response shape');
    return [];
  }
  const parsed: FieldConfig[] = [];
  for (const raw of data) {
    const result = parseItem(raw);
    if (typeof result === 'string') {
      const key = isRec(raw) && isStr(raw['key']) ? raw['key'] : '(unreadable)';
      console.warn(`field config: "${key}" dropped (${result})`);
    } else {
      parsed.push(result);
    }
  }
  parsed.sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  const seen = new Set<string>();
  return parsed.filter((f) => {
    if (seen.has(f.key)) {
      console.warn(`field config: "${f.key}" dropped (duplicated key)`);
      return false;
    }
    seen.add(f.key);
    return true;
  });
}
