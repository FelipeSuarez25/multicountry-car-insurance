import { maskDocumentNumber } from './document-mask';
import type { FieldConfig, OutputValue, Step1Output } from './field-config.model';
import { parseIsoDate } from './field-validators';

export interface SummaryRow {
  key: string;
  label: string;
  value: string;
  /** The text a screen reader gets instead of `value` (only the masked document number). */
  accessibleValue?: string;
}

export interface SummaryRows {
  holder: SummaryRow[];
  vehicle: SummaryRow[];
}

/** The reserved step 1 keys that describe the vehicle (US-01-Q-08); every other key is the holder's. */
const VEHICLE_KEYS: readonly string[] = ['plate', 'make', 'model', 'vehicleYear'];
const DOCUMENT_KEY = 'documentNumber';

function longDate(text: string, locale: string): string {
  const parts = parseIsoDate(text);
  if (!parts) return text;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  } catch {
    return text;
  }
}

function displayValue(config: FieldConfig, value: OutputValue, locale: string): string {
  switch (config.type) {
    case 'select':
      return config.options?.find((o) => o.value === String(value))?.label ?? String(value);
    case 'date':
      return longDate(String(value), locale);
    default:
      return String(value);
  }
}

/**
 * The summary rows (US-03-BR-01): one per configured field with a non-empty value, except
 * checkboxes, in sortOrder, split into the holder and the vehicle group. Labels come from this
 * page load's configuration, never from the stored state.
 */
export function buildSummaryRows(configs: readonly FieldConfig[], output: Step1Output, locale: string): SummaryRows {
  const rows: SummaryRows = { holder: [], vehicle: [] };
  const ordered = [...configs].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  for (const config of ordered) {
    if (config.type === 'checkbox') continue;
    const value = output.values[config.key];
    if (value === undefined || value === null || value === '') continue;
    const row: SummaryRow = { key: config.key, label: config.label, value: displayValue(config, value, locale) };
    if (config.key === DOCUMENT_KEY) {
      const masked = maskDocumentNumber(String(value));
      row.value = masked.text;
      row.accessibleValue = masked.accessibleText;
    }
    (VEHICLE_KEYS.includes(config.key) ? rows.vehicle : rows.holder).push(row);
  }
  return rows;
}
