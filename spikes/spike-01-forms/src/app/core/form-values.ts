import { FieldConfig, OutputValue, RawValue, RawValues } from './field-config';
import { isEmpty } from './validate-field';

export function initialValue(cfg: FieldConfig): RawValue {
  return cfg.type === 'checkbox' ? false : '';
}

/** Builds model values for the CURRENT config, taking stored values when compatible. Keys not configured are dropped. */
export function hydrate(configs: FieldConfig[], stored: Record<string, unknown> | null | undefined): RawValues {
  const out: RawValues = {};
  for (const cfg of configs) {
    const s = stored?.[cfg.key];
    if (cfg.type === 'checkbox') out[cfg.key] = s === true;
    else if (typeof s === 'string') out[cfg.key] = s;
    else if (typeof s === 'number' && Number.isFinite(s)) out[cfg.key] = String(s);
    else out[cfg.key] = '';
  }
  return out;
}

/** Step 1 output (spec 7.3): trimmed text, integer, option value, ISO date, boolean; empty optional -> null. */
export function toOutput(configs: FieldConfig[], values: RawValues): Record<string, OutputValue> {
  const out: Record<string, OutputValue> = {};
  for (const cfg of configs) {
    const v = values[cfg.key] ?? initialValue(cfg);
    if (cfg.type === 'checkbox') { out[cfg.key] = v === true; continue; }
    if (isEmpty(cfg, v)) { out[cfg.key] = null; continue; }
    const s = (v as string).trim();
    out[cfg.key] = cfg.type === 'number' ? Number(s) : s;
  }
  return out;
}
