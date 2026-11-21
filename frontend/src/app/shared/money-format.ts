const formatters = new Map<string, Intl.NumberFormat>();

/**
 * A price in the country's currency (US-02-AC-06): `Intl.NumberFormat` currency style with the
 * country's `locale` and `currencyCode`, no fraction digits, grouping always on. Nothing here
 * knows a country; an invalid locale or currency makes `Intl` throw a `RangeError`, which the
 * caller turns into its error state.
 */
export function formatMoney(amount: number, locale: string, currencyCode: string): string {
  const cacheKey = `${locale}|${currencyCode}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    // `useGrouping: 'always'` (ES2023.Intl typings, added to tsconfig `lib`): Spanish
    // locales would otherwise leave four-digit amounts ungrouped.
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: 'always',
    };
    formatter = new Intl.NumberFormat(locale, options);
    formatters.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}
