/** Typed field configuration (spec 7.1). Produced at the boundary by `parseFieldConfigs`. */
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox';

export interface SelectOption {
  value: string;
  label: string;
  sortOrder: number;
}

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

/** Value held by the editing model for one field: never null (ADR-0004). */
export type RawValue = string | boolean;
export type RawValues = Record<string, RawValue>;

/** Value of one field in the typed step 1 output (spec 7.3). */
export type OutputValue = string | number | boolean | null;

/** What step 1 hands to later steps (spec 7.3), produced only on a valid "Continuar". */
export interface Step1Output {
  country: string;
  values: Record<string, OutputValue>;
}
