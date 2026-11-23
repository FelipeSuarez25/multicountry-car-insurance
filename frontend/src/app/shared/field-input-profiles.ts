import type { FieldConfig } from './field-config.model';

/**
 * The input profile of a field (US-04-BR-19, ADR-0014 section 3): which characters can be typed or
 * pasted, the letter case, the fallback maximum length and the keyboard hints. Chosen by the field
 * `key`, then by its `type`, like `field-icons.ts`. It is presentation and keystroke behaviour only:
 * whether a value is valid is still decided by `validateField` on the Strapi rules. Pure functions,
 * no Angular.
 */
export interface FieldInputProfile {
  /** True when this one character may be entered. */
  allows(char: string): boolean;
  transform?: 'uppercase';
  inputMode?: string;
  autocomplete?: string;
  autocapitalize?: string;
  /** The `maxlength` when Strapi has no `maxLength` rule. */
  fallbackMax?: number;
}

const ANY: FieldInputProfile['allows'] = () => true;
const LETTER = /^\p{L}$/u;
const DIGIT = /^[0-9]$/;
const ASCII_LETTER_OR_DIGIT = /^[A-Za-z0-9]$/;

const digits = (char: string): boolean => DIGIT.test(char);

function profileByKey(config: FieldConfig): FieldInputProfile | null {
  switch (config.key) {
    case 'fullName':
      return {
        allows: (c) => LETTER.test(c) || " '-.".includes(c),
        autocomplete: 'name',
        autocapitalize: 'words',
        fallbackMax: 80,
      };
    case 'documentNumber':
      // The RUT variant is chosen by the rule, never by the country (ADR-0014 section 3).
      return config.rules.some((rule) => rule.kind === 'rutCheckDigit')
        ? { allows: (c) => digits(c) || '.-kK'.includes(c), transform: 'uppercase', inputMode: 'text', fallbackMax: 12 }
        : { allows: digits, inputMode: 'numeric', fallbackMax: 10 };
    case 'plate':
      return { allows: (c) => ASCII_LETTER_OR_DIGIT.test(c), transform: 'uppercase', autocomplete: 'off', autocapitalize: 'characters', fallbackMax: 6 };
    case 'model':
      return { allows: (c) => LETTER.test(c) || digits(c) || ' -./'.includes(c), fallbackMax: 40 };
    case 'vehicleYear':
      return { allows: digits, inputMode: 'numeric', fallbackMax: 4 };
    default:
      return null;
  }
}

/** The profile of a field: its key's, else the digits profile for any `number` field, else none (no filter). */
export function inputProfileFor(config: FieldConfig): FieldInputProfile {
  if (config.type === 'text' || config.type === 'number') {
    const byKey = profileByKey(config);
    if (byKey) return byKey;
  }
  if (config.type === 'number') return { allows: digits, inputMode: 'numeric' };
  return { allows: ANY };
}

/**
 * The `maxlength` of a text box: the Strapi `maxLength` rule when there is one (so a new Strapi
 * field gets it), else the profile's fallback, else none.
 */
export function maxLengthFor(config: FieldConfig, profile: FieldInputProfile): number | null {
  const rule = config.rules.find((r) => r.kind === 'maxLength');
  if (rule && rule.kind === 'maxLength') return rule.value;
  return profile.fallbackMax ?? null;
}

/**
 * Drops the characters the profile does not allow and applies its transform. The caret stays right
 * after the same number of kept characters it followed. The maximum length is applied by the
 * directive, not here.
 */
export function sanitizeInput(raw: string, caret: number, profile: FieldInputProfile): { text: string; caret: number } {
  let text = '';
  let newCaret = 0;
  let offset = 0;
  for (const char of raw) {
    const end = offset + char.length;
    if (profile.allows(char)) {
      const kept = profile.transform === 'uppercase' ? char.toUpperCase() : char;
      text += kept;
      if (end <= caret) newCaret = text.length;
    }
    offset = end;
  }
  return { text, caret: newCaret };
}
