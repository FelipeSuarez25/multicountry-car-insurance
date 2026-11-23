/**
 * WCAG 2.x contrast arithmetic (US-04-AC-02, ADR-0010 section 4). Pure functions, no Angular.
 * The relative luminance and ratio follow https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 * and https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio.
 */

export type RGB = [number, number, number];

/** A colour with an opacity in [0, 1]; the opacity is composited over a background before a ratio is read. */
export interface RGBA {
  rgb: RGB;
  alpha: number;
}

export function hexToRgb(hex: string): RGB {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex colour: "${hex}"`);
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** The opaque colour a translucent one shows as over an opaque background (sRGB, as browsers blend). */
export function composite(over: RGBA, under: RGB): RGB {
  const mix = (o: number, u: number): number => Math.round(o * over.alpha + u * (1 - over.alpha));
  return [mix(over.rgb[0], under[0]), mix(over.rgb[1], under[1]), mix(over.rgb[2], under[2])];
}
