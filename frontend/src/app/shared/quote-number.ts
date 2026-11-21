const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/**
 * The simulated quote number `COT-<country>-<YYYYMMDD>-<6 digits>` (US-03-AC-10). `today` is the
 * browser's local date, read through the injectable clock by the caller.
 */
export function formatQuoteNumber(countryCode: string, today: Date, digits: number): string {
  const date = `${pad(today.getFullYear(), 4)}${pad(today.getMonth() + 1, 2)}${pad(today.getDate(), 2)}`;
  return `COT-${countryCode.toUpperCase()}-${date}-${pad(digits, 6)}`;
}
