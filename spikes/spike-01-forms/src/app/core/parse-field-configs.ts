import { FieldConfig, FieldType, SelectOption, ValidationRule } from './field-config';

const KEY = /^[a-z][a-zA-Z0-9]*$/;
const TYPES: FieldType[] = ['text', 'number', 'select', 'date', 'checkbox'];
const APPLIES: Record<string, FieldType> = {
  minLength: 'text', maxLength: 'text', pattern: 'text', rutCheckDigit: 'text',
  min: 'number', max: 'number', yearRange: 'number', minAge: 'date',
};

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function parseRule(raw: unknown, type: FieldType): ValidationRule | null {
  if (!isRec(raw) || !isStr(raw['kind']) || APPLIES[raw['kind']] !== type) return null;
  const message = isStr(raw['message']) ? raw['message'] : undefined;
  const kind = raw['kind'];
  switch (kind) {
    case 'minLength': case 'maxLength': case 'min': case 'max':
      return isNum(raw['value']) ? { kind, value: raw['value'], message } : null;
    case 'pattern':
      if (!isStr(raw['value'])) return null;
      try { new RegExp(`^(?:${raw['value']})$`); } catch { return null; }
      return { kind, value: raw['value'], message };
    case 'minAge':
      return isNum(raw['years']) ? { kind, years: raw['years'], message } : null;
    case 'yearRange':
      return isNum(raw['maxYearsOld']) && isNum(raw['maxYearsAhead'])
        ? { kind, maxYearsOld: raw['maxYearsOld'], maxYearsAhead: raw['maxYearsAhead'], message } : null;
    case 'rutCheckDigit':
      return { kind, message };
    default:
      return null;
  }
}

function parseOptions(raw: unknown): SelectOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SelectOption[] = [];
  for (const o of raw) {
    if (!isRec(o) || !isStr(o['value']) || !isStr(o['label']) || !isNum(o['sortOrder'])) return null;
    out.push({ value: o['value'], label: o['label'], sortOrder: o['sortOrder'] });
  }
  return new Set(out.map(o => o.value)).size === out.length
    ? out.sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value)) : null;
}

/** Boundary validation: malformed fields are dropped with a warning that carries no user data. */
export function parseFieldConfigs(response: unknown, warn: (msg: string) => void = console.warn): FieldConfig[] {
  const data = isRec(response) ? response['data'] : null;
  if (!Array.isArray(data)) { warn('field config: unexpected response shape'); return []; }
  const seen = new Set<string>();
  const out: FieldConfig[] = [];
  for (const raw of data) {
    if (!isRec(raw) || !isStr(raw['key']) || !KEY.test(raw['key']) || seen.has(raw['key'])
      || !TYPES.includes(raw['type'] as FieldType) || !isStr(raw['label']) || raw['label'].trim() === ''
      || typeof raw['isRequired'] !== 'boolean' || !isNum(raw['sortOrder'])) {
      warn('field config: field dropped (invalid key, type, label or sortOrder)'); continue;
    }
    const type = raw['type'] as FieldType;
    const rawRules = Array.isArray(raw['rules']) ? raw['rules'] : [];
    const rules = rawRules.map(r => parseRule(r, type));
    if (rules.includes(null)) { warn(`field config: ${raw['key']} dropped (malformed rule)`); continue; }
    let options: SelectOption[] | undefined;
    if (type === 'select') {
      const o = parseOptions(raw['options']);
      if (!o) { warn(`field config: ${raw['key']} dropped (invalid options)`); continue; }
      options = o;
    }
    let errorMessage = isStr(raw['errorMessage']) && raw['errorMessage'].trim() ? raw['errorMessage'] : '';
    if (!errorMessage) { warn(`field config: ${raw['key']} has no errorMessage, using fallback`); errorMessage = 'Revisa este campo.'; }
    seen.add(raw['key']);
    out.push({
      key: raw['key'], type, label: raw['label'], isRequired: raw['isRequired'], sortOrder: raw['sortOrder'],
      helpText: isStr(raw['helpText']) ? raw['helpText'] : undefined,
      placeholder: isStr(raw['placeholder']) ? raw['placeholder'] : undefined,
      requiredMessage: isStr(raw['requiredMessage']) ? raw['requiredMessage'] : undefined,
      errorMessage, options, rules: rules as ValidationRule[],
    });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}
