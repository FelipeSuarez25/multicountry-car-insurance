/**
 * A small CSS reader for the design-system guards and the contrast test (ADR-0010 sections 1, 2
 * and 4). It is not a CSS engine: it understands blocks, declarations, `var()` chains and the few
 * colour forms `tokens.css` is allowed to use (6-digit hex, `color-mix(in srgb, <hex> N%,
 * transparent)`, `linear-gradient(<angle>, <colour> <position>, ...)` and the texture's
 * `radial-gradient`). Pure functions, no Angular, no file access.
 */
import type { RGB, RGBA } from './contrast';
import { hexToRgb } from './contrast';

export interface Decl {
  /** Identifier of the innermost block (see `Block.id`), -1 at the top level. */
  blockId: number;
  /** The preludes of the enclosing blocks, outermost first (`['@media (...)', '.card']`). */
  stack: string[];
  prop: string;
  value: string;
}

export interface Block {
  /** Position of the block in the file, so two blocks with the same prelude stay apart. */
  id: number;
  stack: string[];
  prelude: string;
}

export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Split `text` at top-level commas (outside parentheses and quotes). */
export function splitTopLevel(text: string, separator = ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      current += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

export function parseCss(css: string): { decls: Decl[]; blocks: Block[] } {
  const text = stripComments(css);
  const decls: Decl[] = [];
  const blocks: Block[] = [];
  const stack: string[] = [];
  const ids: number[] = [];
  let buffer = '';
  let paren = 0;
  let quote: string | null = null;

  const flush = (): void => {
    const raw = buffer.trim();
    buffer = '';
    if (raw === '' || raw.startsWith('@')) return;
    const colon = raw.indexOf(':');
    if (colon < 0) return;
    const prop = raw.slice(0, colon).trim();
    const value = raw.slice(colon + 1).replace(/!important\s*$/i, '').trim();
    decls.push({ blockId: ids.length > 0 ? ids[ids.length - 1] : -1, stack: [...stack], prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value });
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      buffer += ch;
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (paren > 0 || ch === '(' || ch === ')') {
      buffer += ch;
      continue;
    }
    if (ch === '{') {
      const prelude = buffer.trim().replace(/\s+/g, ' ');
      const id = blocks.length;
      blocks.push({ id, stack: [...stack], prelude });
      stack.push(prelude);
      ids.push(id);
      buffer = '';
      continue;
    }
    if (ch === '}') {
      flush();
      stack.pop();
      ids.pop();
      continue;
    }
    if (ch === ';') {
      flush();
      continue;
    }
    buffer += ch;
  }
  flush();
  return { decls, blocks };
}

// ---------------------------------------------------------------------------------------------
// var() resolution
// ---------------------------------------------------------------------------------------------

/** Find the index of the `)` that closes the `(` at `open`. */
function closingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced parenthesis in "${text}"`);
}

/** Remove every `var(...)` (balanced) from a value, leaving a space in its place. */
export function stripVars(value: string): string {
  let out = value;
  for (;;) {
    const at = out.search(/\bvar\(/);
    if (at < 0) return out;
    const open = out.indexOf('(', at);
    out = `${out.slice(0, at)} ${out.slice(closingParen(out, open) + 1)}`;
  }
}

export class TokenFile {
  readonly decls: Decl[];
  readonly blocks: Block[];

  constructor(css: string) {
    ({ decls: this.decls, blocks: this.blocks } = parseCss(css));
  }

  /** Names of every custom property declared anywhere in the file. */
  names(): string[] {
    return [...new Set(this.decls.filter((d) => d.prop.startsWith('--')).map((d) => d.prop))];
  }

  /** The accent keys (`co`, `cl`, ...) that have a `[data-country-accent='<key>']` block. */
  accentKeys(): string[] {
    const keys: string[] = [];
    for (const block of this.blocks) {
      const m = /\[data-country-accent\s*=\s*['"]?([a-z0-9-]+)['"]?\]/.exec(block.prelude);
      if (m) keys.push(m[1]);
    }
    return [...new Set(keys)];
  }

  private declared(name: string, accent?: string): string | undefined {
    const conditional = (d: Decl): boolean => d.stack.some((s) => /^@(media|container|supports)/.test(s));
    const accented = (d: Decl): boolean => d.stack.some((s) => /data-country-accent/.test(s));
    const base = (d: Decl): boolean => d.prop === name && !conditional(d) && !accented(d);
    const scoped = (d: Decl): boolean =>
      d.prop === name && !conditional(d) && d.stack.some((s) => new RegExp(`data-country-accent\\s*=\\s*['"]?${accent}['"]?`).test(s));
    if (accent) {
      const hit = [...this.decls].reverse().find(scoped);
      if (hit) return hit.value;
    }
    return [...this.decls].reverse().find(base)?.value;
  }

  /** The declared value of a custom property in the base scope (or in an accent scope), unresolved. */
  rawValue(name: string, accent?: string): string | undefined {
    return this.declared(name, accent);
  }

  /** The value with every `var()` substituted, down to literals. Throws when a name does not resolve. */
  resolve(name: string, accent?: string, depth = 0): string {
    const raw = this.declared(name, accent);
    if (raw === undefined) throw new Error(`The token ${name} is not declared in tokens.css`);
    return this.expand(raw, accent, depth + 1, name);
  }

  private expand(value: string, accent: string | undefined, depth: number, from: string): string {
    if (depth > 20) throw new Error(`Token reference loop through ${from}`);
    let out = value;
    for (;;) {
      const at = out.search(/\bvar\(/);
      if (at < 0) return out.trim();
      const open = out.indexOf('(', at);
      const close = closingParen(out, open);
      const [refName, ...fallback] = splitTopLevel(out.slice(open + 1, close));
      const ref = refName.trim();
      const found = this.declared(ref, accent);
      let replacement: string;
      if (found !== undefined) replacement = this.expand(found, accent, depth + 1, ref);
      else if (fallback.length > 0) replacement = this.expand(fallback.join(',').trim(), accent, depth + 1, from);
      else throw new Error(`The token ${ref} (used by ${from}) is not declared in tokens.css`);
      out = `${out.slice(0, at)}${replacement}${out.slice(close + 1)}`;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------------------------

const COLOR_MIX = /^color-mix\(\s*in\s+srgb\s*,\s*(#[0-9a-fA-F]{6})\s+([\d.]+)%\s*,\s*transparent\s*\)$/i;

/** A resolved colour: `#RRGGBB`, `color-mix(in srgb, #RRGGBB N%, transparent)` or `transparent`. */
export function parseColour(text: string): RGBA {
  const t = text.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return { rgb: hexToRgb(t), alpha: 1 };
  if (t === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  const mix = COLOR_MIX.exec(t);
  if (mix) return { rgb: hexToRgb(mix[1]), alpha: parseFloat(mix[2]) / 100 };
  throw new Error(`Unsupported colour form in tokens.css: "${text}" (allowed: #RRGGBB, color-mix(in srgb, #RRGGBB N%, transparent))`);
}

/** The stops of a resolved `linear-gradient(...)` or `radial-gradient(...)`, or null when it is not a gradient. */
export function parseGradientStops(text: string): RGBA[] | null {
  const m = /^(?:repeating-)?(linear|radial)-gradient\(/.exec(text.trim());
  if (!m) return null;
  const open = text.indexOf('(');
  const args = splitTopLevel(text.slice(open + 1, closingParen(text, open)));
  const colourArgs = args.filter((arg, i) => !(i === 0 && /^\s*(-?[\d.]+(deg|turn|rad|grad)|to\s|circle|ellipse|closest|farthest)/.test(arg)));
  return colourArgs.map((arg) => parseColour(arg.trim().replace(/\s+-?[\d.]+(%|px|rem|em)?\s*$/, '')));
}

/** Every colour a token stands for: one for a plain colour, one per stop for a gradient. */
export function coloursOf(tokens: TokenFile, name: string, accent?: string): RGBA[] {
  const resolved = tokens.resolve(name, accent);
  return parseGradientStops(resolved) ?? [parseColour(resolved)];
}

/**
 * The worst case of the dotted texture: the dot colour at its opacity, composited by the caller
 * over `--color-bg`. Read from the first visible stop of `--texture-dots`.
 */
export function textureDot(tokens: TokenFile): RGBA {
  const stops = parseGradientStops(tokens.resolve('--texture-dots')) ?? [];
  const dot = stops.find((s) => s.alpha > 0);
  if (!dot) throw new Error('--texture-dots has no visible dot colour');
  return dot;
}

export type { RGB, RGBA };
