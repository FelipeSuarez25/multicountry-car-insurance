/**
 * The pure checks behind the design-system static guards (ADR-0010 section 2, ADR-0011
 * "Confirmation", ADR-0013 section 4). They take the text of a file and return what they found,
 * so `design-guards.spec.ts` can run them over the real sources AND over deliberate violations
 * (the sensitivity self-test: a guard that finds nothing must not pass by accident).
 */
import { parseCss, splitTopLevel, stripVars, TokenFile, type Decl } from './css';

export type StyleKind =
  | 'custom-property'
  | 'font-face'
  | 'hex-colour'
  | 'colour-function'
  | 'named-colour'
  | 'font-family'
  | 'length'
  | 'duration'
  | 'easing'
  | 'gradient'
  | 'shadow'
  | 'z-index'
  | 'font-metric'
  | 'primitive-reference'
  | 'breakpoint'
  | 'media-feature';

export interface Violation<K extends string = string> {
  kind: K;
  detail: string;
}

/** Every style kind a fixture must be able to trigger (the sensitivity self-test iterates over this). */
export const STYLE_KINDS: StyleKind[] = [
  'custom-property',
  'font-face',
  'hex-colour',
  'colour-function',
  'named-colour',
  'font-family',
  'length',
  'duration',
  'easing',
  'gradient',
  'shadow',
  'z-index',
  'font-metric',
  'primitive-reference',
  'breakpoint',
  'media-feature',
];

const NAMED_COLOURS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue ' +
    'chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey ' +
    'darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray ' +
    'darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen ' +
    'fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen ' +
    'lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime ' +
    'limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
    'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive ' +
    'olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver ' +
    'skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white ' +
    'whitesmoke yellow yellowgreen'
  ).split(' '),
);

/** Features allowed in a media or container condition besides a `min-width` equal to a breakpoint token (BR-01). */
const FEATURES = /^(prefers-reduced-motion\s*:\s*(reduce|no-preference)|forced-colors\s*:\s*(active|none)|prefers-color-scheme\s*:\s*(dark|light)|hover\s*:\s*hover)$/;

/** The value of a declaration with `var()`, `url()` and quoted strings removed. */
function bare(value: string): string {
  return stripVars(value)
    .replace(/url\([^)]*\)/gi, ' ')
    .replace(/"[^"]*"|'[^']*'/g, ' ');
}

function conditionsOf(prelude: string): string[] {
  const out: string[] = [];
  const re = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prelude)) !== null) out.push(m[1].trim().replace(/\s+/g, ' '));
  return out;
}

/**
 * Violations of "no loose values" (US-04-BR-01, ADR-0010 section 2) in a style file that is NOT
 * `tokens.css`. `breakpoints` are the `--breakpoint-*` values of the token file (for example `37.5em`).
 */
export function styleViolations(css: string, breakpoints: string[]): Violation<StyleKind>[] {
  const { decls, blocks } = parseCss(css);
  const found: Violation<StyleKind>[] = [];
  const add = (kind: StyleKind, detail: string): void => {
    found.push({ kind, detail });
  };

  for (const block of blocks) {
    if (block.prelude.startsWith('@font-face')) add('font-face', block.prelude);
    if (/^@(media|container)\b/.test(block.prelude)) {
      for (const condition of conditionsOf(block.prelude)) {
        const min = /^min-width\s*:\s*(.+)$/.exec(condition);
        if (min) {
          if (!breakpoints.includes(min[1].trim())) add('breakpoint', `${block.prelude} (not a --breakpoint-* value)`);
        } else if (!FEATURES.test(condition)) {
          add('media-feature', `${block.prelude} (${condition})`);
        }
      }
    }
  }

  for (const d of decls) {
    const where = `${d.prop}: ${d.value}`;
    if (d.prop.startsWith('--')) {
      add('custom-property', where);
      continue;
    }
    if (/--primitive-/.test(d.value)) add('primitive-reference', where);
    const clean = bare(d.value);
    if (/#[0-9a-f]{3,8}\b/i.test(clean)) add('hex-colour', where);
    if (/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\s*\(/i.test(clean)) add('colour-function', where);
    const words = clean.toLowerCase().match(/[a-z]+/g) ?? [];
    if (words.some((w) => NAMED_COLOURS.has(w))) add('named-colour', where);
    if (d.prop === 'font-family' && !/^(inherit|var\(--[a-z0-9-]+\))$/.test(d.value.trim())) add('font-family', where);
    if (/(?<![\w.-])-?(?:\d+\.?\d*|\.\d+)(px|rem|em|ch|vw|vh)(?![\w-])/i.test(clean)) add('length', where);
    if (/(?<![\w.-])(?:\d+\.?\d*|\.\d+)(ms|s)(?![\w-])/i.test(clean)) add('duration', where);
    if (/cubic-bezier\(|steps\(/i.test(clean)) add('easing', where);
    if (/(linear|radial|conic)-gradient\(/i.test(clean)) add('gradient', where);
    if ((d.prop === 'box-shadow' || d.prop === 'text-shadow') && clean.replace(/[,\s]|\b0\b|\binset\b|\bnone\b|\binherit\b|\binitial\b|\bunset\b/gi, '') !== '') add('shadow', where);
    if (d.prop === 'z-index' && /^-?\d+$/.test(d.value.trim()) && d.value.trim() !== '0') add('z-index', where);
    if (['font-weight', 'line-height', 'letter-spacing', 'font-size'].includes(d.prop)) {
      const numbers = (clean.match(/-?\d*\.?\d+%?/g) ?? []).filter((n) => !n.endsWith('%') && n !== '0' && n !== '1');
      if (numbers.length > 0) add('font-metric', where);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// tokens.css: tiers, categories, reduced-motion tokens, fonts
// ---------------------------------------------------------------------------------------------

export const SEMANTIC_PREFIXES = [
  '--color-',
  '--font-',
  '--text-',
  '--leading-',
  '--tracking-',
  '--weight-',
  '--space-',
  '--size-',
  '--radius-',
  '--border-',
  '--shadow-',
  '--gradient-',
  '--texture-',
  '--duration-',
  '--delay-',
  '--ease-',
  '--motion-',
  '--z-',
  '--breakpoint-',
  '--focus-',
];

/** What the story lists (BR-01): colour, type, spacing, radii, shadows, gradients, durations, easing, z-index (+ breakpoints). */
export const REQUIRED_CATEGORIES = ['--color-', '--font-', '--text-', '--space-', '--radius-', '--shadow-', '--gradient-', '--duration-', '--ease-', '--z-', '--breakpoint-'];

export function tierOf(name: string): 'primitive' | 'semantic' | 'component' | null {
  if (name.startsWith('--primitive-')) return 'primitive';
  if (name.startsWith('--component-')) return 'component';
  if (SEMANTIC_PREFIXES.some((p) => name.startsWith(p))) return 'semantic';
  return null;
}

export function tokenTierViolations(tokensCss: string): Violation<'tier-prefix' | 'tier-missing' | 'category-missing'>[] {
  const names = new TokenFile(tokensCss).names();
  const found: Violation<'tier-prefix' | 'tier-missing' | 'category-missing'>[] = [];
  for (const name of names) if (tierOf(name) === null) found.push({ kind: 'tier-prefix', detail: name });
  for (const tier of ['primitive', 'semantic', 'component'] as const) {
    if (!names.some((n) => tierOf(n) === tier)) found.push({ kind: 'tier-missing', detail: tier });
  }
  for (const prefix of REQUIRED_CATEGORIES) {
    if (!names.some((n) => n.startsWith(prefix))) found.push({ kind: 'category-missing', detail: prefix });
  }
  return found;
}

/** `--breakpoint-*` values of the token file (for example `37.5em`). */
export function breakpointValues(tokensCss: string): string[] {
  const tokens = new TokenFile(tokensCss);
  return tokens
    .names()
    .filter((n) => n.startsWith('--breakpoint-'))
    .map((n) => tokens.resolve(n));
}

/** Under `prefers-reduced-motion: reduce`, every base `--duration-*` and `--delay-*` token must be `0ms` (ADR-0013 section 3). */
export function reducedMotionTokenViolations(tokensCss: string): Violation<'reduce-token'>[] {
  const { decls } = parseCss(tokensCss);
  const timing = (d: Decl): boolean => /^--(duration|delay)-/.test(d.prop);
  const isReduce = (d: Decl): boolean => d.stack.some((s) => /^@media.*prefers-reduced-motion\s*:\s*reduce/.test(s));
  const base = new Set(decls.filter((d) => timing(d) && !d.stack.some((s) => s.startsWith('@media'))).map((d) => d.prop));
  const reduced = new Map(decls.filter((d) => timing(d) && isReduce(d)).map((d) => [d.prop, d.value.trim()]));
  const found: Violation<'reduce-token'>[] = [];
  for (const name of base) {
    if (reduced.get(name) !== '0ms') found.push({ kind: 'reduce-token', detail: `${name} is ${reduced.get(name) ?? 'not set'} under reduce` });
  }
  if (base.size === 0) found.push({ kind: 'reduce-token', detail: 'tokens.css declares no --duration-* or --delay-* token' });
  return found;
}

// ---------------------------------------------------------------------------------------------
// Reduced motion by construction (outside tokens.css)
// ---------------------------------------------------------------------------------------------

export type MotionKind = 'motion-outside-no-preference' | 'motion-token';

export function motionViolations(css: string): Violation<MotionKind>[] {
  const { decls } = parseCss(css);
  const found: Violation<MotionKind>[] = [];
  for (const d of decls) {
    if (!/^(animation|transition)(-[a-z-]+)?$/.test(d.prop)) continue;
    const guarded = d.stack.some((s) => /^@media\b.*prefers-reduced-motion\s*:\s*no-preference/.test(s));
    if (!guarded) found.push({ kind: 'motion-outside-no-preference', detail: `${d.prop}: ${d.value}` });
    for (const ref of d.value.match(/var\(\s*(--[a-z0-9-]+)/g) ?? []) {
      const name = ref.replace(/var\(\s*/, '');
      if (!/^--(duration|delay|ease)-/.test(name)) found.push({ kind: 'motion-token', detail: `${d.prop} uses ${name}` });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// CDK overlays and dialogs must be created with `disableAnimations: true` (ADR-0013 section 3)
// ---------------------------------------------------------------------------------------------

export interface CdkUse {
  calls: number;
  disabled: number;
}

/** The source without `//` and `/* *\/` comments; string literals are kept (and skipped over) so a URL is not read as a comment. */
export function stripComments(source: string): string {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) j += source[j] === '\\' ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j;
    } else if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 1;
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out.replace(/<!--[\s\S]*?-->/g, ' ');
}

export function cdkAnimationUse(rawSource: string): CdkUse {
  const source = stripComments(rawSource);
  const calls = (source.match(/\bcreateOverlayRef\s*\(|\boverlay\w*\s*\.\s*create\s*\(|\bdialog\w*\s*\.\s*open\s*\(|\bcdkConnectedOverlay\b/gi) ?? []).length;
  const disabled = (source.match(/disableAnimations\s*:\s*true|DisableAnimations\]?\s*=\s*"true"/gi) ?? []).length;
  return { calls, disabled };
}

// ---------------------------------------------------------------------------------------------
// Fonts (US-04-BR-12, AC-19)
// ---------------------------------------------------------------------------------------------

export interface FontFace {
  family: string;
  src: string;
  display: string;
  weight: string;
}

export function fontFaces(tokensCss: string): FontFace[] {
  const { decls, blocks } = parseCss(tokensCss);
  const faces: FontFace[] = [];
  for (const block of blocks.filter((b) => b.prelude.startsWith('@font-face'))) {
    const own = decls.filter((d) => d.blockId === block.id);
    const get = (prop: string): string => own.find((d) => d.prop === prop)?.value.trim() ?? '';
    faces.push({ family: get('font-family').replace(/["']/g, ''), src: get('src'), display: get('font-display'), weight: get('font-weight') });
  }
  return faces;
}

/** Family names a `--font-*` token may list: the two families and the local system fallback stack (BR-12). */
export const ALLOWED_FAMILIES = ['archivo', 'atkinson hyperlegible next', 'system-ui', '-apple-system', 'segoe ui', 'roboto', 'sans-serif'];

export function familyTokenViolations(tokensCss: string): Violation<'family'>[] {
  const tokens = new TokenFile(tokensCss);
  const found: Violation<'family'>[] = [];
  for (const name of tokens.names().filter((n) => n.startsWith('--font-') || n === '--font')) {
    const value = tokens.resolve(name);
    for (const part of splitTopLevel(value)) {
      const family = part.trim().replace(/^["']|["']$/g, '').toLowerCase();
      if (family && !ALLOWED_FAMILIES.includes(family)) found.push({ kind: 'family', detail: `${name} lists "${family}"` });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Country codes only in country-visuals.ts (ADR-0011 "Confirmation")
// ---------------------------------------------------------------------------------------------

export interface SourceFile {
  path: string;
  text: string;
}

export function countryCodeLiterals(text: string): string[] {
  return text.match(/(['"])(CO|CL)\1/g) ?? [];
}

/** Production `.ts`/`.html` files with a quoted country code, other than the allowed map file. */
export function countryCodeViolations(files: SourceFile[], allowedSuffix: string): string[] {
  return files.filter((f) => !f.path.endsWith(allowedSuffix) && countryCodeLiterals(f.text).length > 0).map((f) => f.path);
}

/** CSS files other than tokens.css that carry a `data-country-accent` selector. */
export function accentSelectorViolations(files: SourceFile[], allowedSuffix: string): string[] {
  return files.filter((f) => !f.path.endsWith(allowedSuffix) && /data-country-accent/.test(f.text)).map((f) => f.path);
}

/** A flag template must be one svg, `aria-hidden="true"`, `focusable="false"`, with no text node. */
export function flagViolations(template: string): string[] {
  const found: string[] = [];
  const root = /<svg\b[^>]*>/.exec(template)?.[0] ?? '';
  if (!root) found.push('no root svg');
  if (!/aria-hidden="true"/.test(root)) found.push('the root svg has no aria-hidden="true"');
  if (!/focusable="false"/.test(root)) found.push('the root svg has no focusable="false"');
  const text = template.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  if (text !== '') found.push(`text node: "${text.slice(0, 40)}"`);
  if (/<title\b/i.test(template)) found.push('has a <title>');
  return found;
}
