import type { SelectOption } from './field-config.model';

/**
 * The search of a long select (ADR-0012 section 2, US-04-Q-11). Pure functions, no Angular.
 */

/** A field with this many options or more is searchable. */
export const SEARCH_THRESHOLD = 4;

/** Lower case, accents removed, so "CONCE" finds "Concepción". */
export function normaliseForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** The options whose label contains the text, in the order given. Empty text keeps every option. */
export function filterOptions(options: readonly SelectOption[], text: string): SelectOption[] {
  const wanted = normaliseForSearch(text.trim());
  if (wanted === '') return [...options];
  return options.filter((option) => normaliseForSearch(option.label).includes(wanted));
}
