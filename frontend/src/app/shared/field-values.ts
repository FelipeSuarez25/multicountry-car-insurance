import type { FieldConfig, OutputValue, RawValue, RawValues } from './field-config.model';

export function emptyValue(config: FieldConfig): RawValue {
  return config.type === 'checkbox' ? false : '';
}

/**
 * Builds the editing model for the current configuration from stored raw values (ADR-0004).
 * Keys that are no longer configured are dropped. The model never holds null or undefined.
 */
export function hydrate(configs: FieldConfig[], stored: Record<string, unknown> | null | undefined): RawValues {
  const model: RawValues = {};
  for (const config of configs) {
    const value = stored?.[config.key];
    if (config.type === 'checkbox') model[config.key] = value === true;
    else if (typeof value === 'string') model[config.key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) model[config.key] = String(value);
    else model[config.key] = '';
  }
  return model;
}

/**
 * Typed step 1 output (spec 7.3): trimmed text, integer, option value, ISO date, boolean (never
 * null), and `null` for an empty optional text, number, select or date. The output is never read
 * back into the form.
 */
export function toOutput(configs: FieldConfig[], values: RawValues | Record<string, unknown>): Record<string, OutputValue> {
  const output: Record<string, OutputValue> = {};
  for (const config of configs) {
    const value = values[config.key];
    if (config.type === 'checkbox') {
      output[config.key] = value === true;
      continue;
    }
    const text = typeof value === 'string' ? value.trim() : '';
    if (text === '') output[config.key] = null;
    else output[config.key] = config.type === 'number' ? Number(text) : text;
  }
  return output;
}
