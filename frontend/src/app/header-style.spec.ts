/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TokenFile, coloursOf, parseCss } from '../testing/css';
import { breakpointValues, styleViolations, tokenTierViolations } from '../testing/design-guards';

/**
 * US-04-AC-30 / US-04-BR-22 (spec v0.4, HC3 round 2), the static half: the tokens of the header, its
 * stylesheet (translucent surface only under `@supports (backdrop-filter)`, solid under reduced
 * transparency, system colours under forced colors, no animation, no `--color-surface-raised`) and the
 * BR-01 v0.4 additions of the AC-01 guard. The contrast rows are in `shared/contrast.spec.ts`; the
 * rendered result is in `frontend/e2e/us-04-hc3-round2.spec.ts`.
 */

const SRC = join(process.cwd(), 'src');
const read = (path: string): string => readFileSync(join(SRC, path), 'utf8');
const tokensCss = (): string => read(join('styles', 'tokens.css'));
const headerCss = (): string => read(join('app', 'shared', 'site-header.css'));
const tokens = (): TokenFile => new TokenFile(tokensCss());
const BREAKPOINTS = ['37.5em', '64em'];

describe('US-04-AC-30 the tokens of the header (US-04-BR-22)', () => {
  it('US-04-AC-30 --component-header-bg is declared and is a translucent colour (alpha above 0 and below 1)', () => {
    const [colour] = coloursOf(tokens(), '--component-header-bg');
    expect(colour.alpha).toBeGreaterThan(0);
    expect(colour.alpha).toBeLessThan(1);
  });

  it('US-04-AC-30 --component-header-bg is built with color-mix over a token, not a literal colour', () => {
    expect(tokens().rawValue('--component-header-bg')).toMatch(/^color-mix\(\s*in srgb\s*,\s*var\(--primitive-[a-z0-9-]+\)\s+[\d.]+%\s*,\s*transparent\s*\)$/);
  });

  it('US-04-AC-30 --component-header-bg-solid is declared and is opaque (alpha 1)', () => {
    const [colour] = coloursOf(tokens(), '--component-header-bg-solid');
    expect(colour.alpha).toBe(1);
  });

  it('US-04-AC-30 --component-header-backdrop is declared and holds a blur and a saturate', () => {
    const value = tokens().resolve('--component-header-backdrop');
    expect(value).toMatch(/blur\(/);
    expect(value).toMatch(/saturate\(/);
  });

  it('US-04-AC-30 --gradient-header-edge is a left-to-right linear gradient: violet-400, then the country accent, then transparent', () => {
    const raw = tokens().rawValue('--gradient-header-edge') ?? '';
    expect(raw, '--gradient-header-edge is declared').not.toBe('');
    expect(raw).toMatch(/^linear-gradient\(\s*(90deg|to right)/);
    const violet = raw.indexOf('--primitive-violet-400');
    const accent = raw.indexOf('--color-country-accent');
    const fade = raw.lastIndexOf('transparent');
    expect(violet, 'violet-400 stop').toBeGreaterThan(-1);
    expect(accent, 'country accent as the middle stop').toBeGreaterThan(violet);
    expect(fade, 'transparent as the last stop').toBeGreaterThan(accent);
  });

  it('US-04-AC-30 / US-04-R6-F03 --gradient-header-edge and --shadow-chip-glow have identical values in :root and in [data-country-accent]', () => {
    const { decls } = parseCss(tokensCss());
    for (const name of ['--gradient-header-edge', '--shadow-chip-glow']) {
      const own = decls.filter((d) => d.prop === name && !d.stack.some((s) => /^@/.test(s)));
      const root = own.filter((d) => d.stack.some((s) => /^:root$/.test(s.trim())));
      const accent = own.filter((d) => d.stack.some((s) => /^\[data-country-accent\]$/.test(s.trim())));
      expect(root.length, `${name} declared in :root`).toBe(1);
      expect(accent.length, `${name} declared in [data-country-accent]`).toBe(1);
      expect(accent[0].value.replace(/\s+/g, ' ').trim(), name).toBe(root[0].value.replace(/\s+/g, ' ').trim());
    }
  });

  it('US-04-AC-30 --size-brand-mark is declared as 2rem and the header height token is still declared', () => {
    expect(tokens().rawValue('--size-brand-mark')?.trim()).toBe('2rem');
    expect(tokens().rawValue('--size-header-height')).toBeDefined();
  });

  it('US-04-AC-30 the new tokens keep the tiers: component prefix for the header surface tokens, semantic prefix for the edge and the mark size', () => {
    expect(tokenTierViolations(tokensCss())).toEqual([]);
  });
});

describe('US-04-AC-30 the header stylesheet (US-04-BR-22, BR-01 v0.4)', () => {
  const parsed = (): ReturnType<typeof parseCss> => parseCss(headerCss());
  const supportsBackdrop = (stack: string[]): boolean => stack.some((s) => /^@supports/.test(s) && /backdrop-filter/.test(s));
  const reducedTransparency = (stack: string[]): boolean => stack.some((s) => /^@media/.test(s) && /prefers-reduced-transparency\s*:\s*reduce/.test(s));
  const forcedColors = (stack: string[]): boolean => stack.some((s) => /^@media/.test(s) && /forced-colors\s*:\s*active/.test(s));

  it('US-04-AC-30 the stylesheet does not use --color-surface-raised', () => {
    expect(headerCss()).not.toMatch(/--color-surface-raised/);
  });

  it('US-04-AC-30 the stylesheet passes the AC-01 guard: no loose value, and only the allowed media features (prefers-reduced-transparency included)', () => {
    expect(styleViolations(headerCss(), breakpointValues(tokensCss()))).toEqual([]);
  });

  it('US-04-AC-30 outside any @supports or media condition the header background is --component-header-bg-solid (the no-support fallback), never the translucent token', () => {
    const base = parsed().decls.filter((d) => /^background(-color)?$/.test(d.prop) && d.stack.every((s) => !s.startsWith('@')));
    const solid = base.filter((d) => /var\(--component-header-bg-solid\)/.test(d.value));
    expect(solid.length, 'a base background that is the solid token').toBeGreaterThan(0);
    for (const d of base) expect(d.value, `${d.prop}: ${d.value}`).not.toMatch(/var\(--component-header-bg\)/);
  });

  it('US-04-AC-30 the translucent background and the backdrop-filter apply only inside an @supports condition on backdrop-filter', () => {
    const { decls } = parsed();
    const translucent = decls.filter((d) => /var\(--component-header-bg\)/.test(d.value));
    expect(translucent.length, 'a declaration that uses --component-header-bg').toBeGreaterThan(0);
    for (const d of translucent) expect(supportsBackdrop(d.stack), `${d.prop} uses the translucent token outside @supports: ${d.stack.join(' > ')}`).toBe(true);
    const filters = decls.filter((d) => /^(-webkit-)?backdrop-filter$/.test(d.prop) && d.value.trim() !== 'none');
    expect(filters.length, 'a backdrop-filter declaration').toBeGreaterThan(0);
    for (const d of filters) {
      expect(supportsBackdrop(d.stack), `backdrop-filter outside @supports: ${d.stack.join(' > ')}`).toBe(true);
      expect(d.value, 'the value is the token').toMatch(/var\(--component-header-backdrop\)/);
    }
  });

  it('US-04-AC-30 under prefers-reduced-transparency: reduce the header is --component-header-bg-solid with backdrop-filter none', () => {
    const { decls } = parsed();
    const reduced = decls.filter((d) => reducedTransparency(d.stack));
    expect(reduced.some((d) => /^background(-color)?$/.test(d.prop) && /var\(--component-header-bg-solid\)/.test(d.value)), 'solid background').toBe(true);
    expect(reduced.some((d) => d.prop === 'backdrop-filter' && d.value.trim() === 'none'), 'backdrop-filter: none').toBe(true);
  });

  it('US-04-AC-30 under forced-colors: active the header uses Canvas and CanvasText with a solid bottom border', () => {
    const forced = parsed().decls.filter((d) => forcedColors(d.stack));
    expect(forced.some((d) => /^background(-color)?$/.test(d.prop) && /\bCanvas\b/.test(d.value)), 'Canvas background').toBe(true);
    expect(forced.some((d) => d.prop === 'color' && /\bCanvasText\b/.test(d.value)), 'CanvasText text').toBe(true);
    expect(forced.some((d) => /^border-bottom/.test(d.prop) && /solid|CanvasText/.test(d.value)), 'a solid bottom border').toBe(true);
  });

  it('US-04-AC-30 the header has no animation: no @keyframes and no animation property', () => {
    const { decls, blocks } = parsed();
    expect(blocks.filter((b) => /^@keyframes/.test(b.prelude))).toEqual([]);
    expect(decls.filter((d) => /^animation/.test(d.prop))).toEqual([]);
  });

  it('US-04-AC-30 the bottom edge is painted with --gradient-header-edge', () => {
    expect(headerCss()).toMatch(/var\(--gradient-header-edge\)/);
  });

  it('US-04-AC-30 the mark size uses --size-brand-mark', () => {
    expect(headerCss() + read(join('app', 'shared', 'site-header.html'))).toMatch(/--size-brand-mark/);
  });
});

describe('US-04-AC-01 / US-04-AC-30 BR-01 v0.4: the guard allows prefers-reduced-transparency and a literal inside an @supports condition on backdrop-filter, and still reports loose values', () => {
  it('US-04-AC-30 sensitivity: a prefers-reduced-transparency media block and an @supports (backdrop-filter: blur(1px)) block are clean', () => {
    const css = `
      .h { background: var(--component-header-bg-solid); }
      @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
        .h { background: var(--component-header-bg); backdrop-filter: var(--component-header-backdrop); }
      }
      @media (prefers-reduced-transparency: reduce) {
        .h { background: var(--component-header-bg-solid); backdrop-filter: none; }
      }
      @media (forced-colors: active) { .h { background: Canvas; color: CanvasText; border-bottom: var(--border-width-hairline) solid CanvasText; } }
    `;
    expect(styleViolations(css, BREAKPOINTS)).toEqual([]);
  });

  it('US-04-AC-30 sensitivity: a literal backdrop-filter value, a hex background and an unknown media feature are reported', () => {
    expect(styleViolations('.h { backdrop-filter: blur(12px); }', BREAKPOINTS).map((v) => v.kind)).toContain('length');
    expect(styleViolations('.h { background: #231541; }', BREAKPOINTS).map((v) => v.kind)).toContain('hex-colour');
    expect(styleViolations('@media (prefers-contrast: more) { .h { margin: 0; } }', BREAKPOINTS).map((v) => v.kind)).toContain('media-feature');
  });
});
