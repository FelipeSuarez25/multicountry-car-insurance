export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

export interface SelectOption { value: string; label: string; sortOrder: number }

export type ValidationRule = { message?: string } & (
  | { kind: 'minLength' | 'maxLength'; value: number }
  | { kind: 'min' | 'max'; value: number }
  | { kind: 'pattern'; value: string }
  | { kind: 'minAge'; years: number }
  | { kind: 'yearRange'; maxYearsOld: number; maxYearsAhead: number }
  | { kind: 'rutCheckDigit' }
);

export interface FieldConfig {
  key: string;
  type: FieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  isRequired: boolean;
  sortOrder: number;
  errorMessage: string;
  requiredMessage?: string;
  options?: SelectOption[];
  rules: ValidationRule[];
}

/** Value held by the form MODEL for a field: never null. */
export type RawValue = string | boolean;
export type RawValues = Record<string, RawValue>;
/** Value emitted by step 1 (spec 7.3). */
export type OutputValue = string | number | boolean | null;
