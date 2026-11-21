const BULLET = '•';
const ALNUM = /[\p{L}\p{N}]/u;
const MAX_VISIBLE = 4;

export interface MaskedDocument {
  /** The value with every hidden letter or digit replaced by a bullet. */
  text: string;
  /** What a screen reader gets instead of the masked string. */
  accessibleText: string;
}

/**
 * Partial masking of the document number (US-03-BR-02): with n letters and digits, the last
 * k = min(4, floor(n / 2)) stay visible; every earlier one becomes a bullet; separators stay in
 * place. One rule for every country, no country branch.
 */
export function maskDocumentNumber(value: string): MaskedDocument {
  const chars = Array.from(value);
  const total = chars.filter((c) => ALNUM.test(c)).length;
  const visible = Math.min(MAX_VISIBLE, Math.floor(total / 2));
  const hiddenCount = total - visible;
  let seen = 0;
  let firstVisible = chars.length;
  const masked = chars.map((c, index) => {
    if (!ALNUM.test(c)) return c;
    seen++;
    if (seen <= hiddenCount) return BULLET;
    if (firstVisible === chars.length) firstVisible = index;
    return c;
  });
  const tail = visible > 0 ? chars.slice(firstVisible).join('') : '';
  return {
    text: masked.join(''),
    accessibleText: tail === '' ? 'Número oculto' : `Número oculto, termina en ${tail}`,
  };
}
