/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composite, contrastRatio, hexToRgb, relativeLuminance, type RGB } from '../../testing/contrast';
import { TokenFile, coloursOf, parseColour, parseGradientStops, textureDot } from '../../testing/css';

/**
 * US-04-AC-02 / US-04-BR-02: AA contrast of the token pairs, computed from the real files.
 *
 * `frontend/src/styles/contrast-pairs.json` (ADR-0010 section 4) is an array of
 *   { "id": string, "fg": "--token", "bg": ["--token" | "texture-worst", ...], "min": number, "ac": "US-04-AC-02" }
 * where a gradient token on either side stands for every one of its stops, the pseudo-token
 * "texture-worst" is the dotted texture's dot colour composited at its opacity over `--color-bg`,
 * and `fg: "--color-country-accent"` is evaluated once per `[data-country-accent='<key>']` block of
 * `tokens.css` and once with the brand default. The test resolves every name through `var()` chains
 * in `tokens.css` and fails when a name does not resolve, so the list cannot drift from the file.
 */

const STYLES = join(process.cwd(), 'src', 'styles');

interface Pair {
  id: string;
  fg: string;
  bg: string[];
  min: number;
  ac: string;
}

const tokens = (): TokenFile => new TokenFile(readFileSync(join(STYLES, 'tokens.css'), 'utf8'));
const pairs = (): Pair[] => JSON.parse(readFileSync(join(STYLES, 'contrast-pairs.json'), 'utf8')) as Pair[];

/**
 * US-04-AC-27 / ADR-0014 section 4: the texture is painted over the page gradient, so its worst case is composited over the
 * LIGHTEST stop of `--gradient-page` (when the file declares it), not over `--color-bg`.
 */
function textureBase(file: TokenFile): RGB {
  const page = coloursOf(file, '--color-bg')[0].rgb;
  if (!file.names().includes('--gradient-page')) return page;
  const stops = coloursOf(file, '--gradient-page').map((c) => composite(c, page));
  return stops.reduce((lightest, rgb) => (relativeLuminance(rgb) > relativeLuminance(lightest) ? rgb : lightest));
}

function bgColours(file: TokenFile, name: string): { label: string; rgb: RGB }[] {
  const page = coloursOf(file, '--color-bg')[0].rgb;
  // US-04-AC-30 / Q-28: the translucent header composited over the lightest page-gradient stop, and over the lightest thing that can scroll under it
  if (name === 'header-bg-over-page-lightest') return coloursOf(file, '--component-header-bg').map((c) => ({ label: name, rgb: composite(c, textureBase(file)) }));
  if (name === 'header-bg-over-ink-50') return coloursOf(file, '--component-header-bg').map((c) => ({ label: name, rgb: composite(c, hexToRgb(file.resolve('--primitive-ink-50'))) }));
  if (name === 'texture-worst') return [{ label: 'texture-worst', rgb: composite(textureDot(file), textureBase(file)) }];
  return coloursOf(file, name).map((c, i, all) => ({ label: all.length > 1 ? `${name}[stop ${i + 1}]` : name, rgb: composite(c, page) }));
}

interface Result {
  id: string;
  fg: string;
  bg: string;
  accent: string;
  ratio: number;
  min: number;
}

function evaluate(file: TokenFile, rows: Pair[]): Result[] {
  const out: Result[] = [];
  for (const row of rows) {
    const scopes: (string | undefined)[] = row.fg === '--color-country-accent' ? [undefined, ...file.accentKeys()] : [undefined];
    for (const scope of scopes) {
      const fgs = coloursOf(file, row.fg, scope);
      for (const bgName of row.bg) {
        for (const bg of bgColours(file, bgName)) {
          fgs.forEach((fg, i) => {
            const solid = composite(fg, bg.rgb);
            out.push({
              id: row.id,
              fg: fgs.length > 1 ? `${row.fg}[stop ${i + 1}]` : row.fg,
              bg: bg.label,
              accent: scope ?? 'brand',
              ratio: contrastRatio(solid, bg.rgb),
              min: row.min,
            });
          });
        }
      }
    }
  }
  return out;
}

describe('US-04-AC-02 the WCAG ratio function (reference values)', () => {
  it('US-04-AC-02 black on white is 21:1 and the ratio is symmetric', () => {
    expect(contrastRatio(hexToRgb('#000000'), hexToRgb('#FFFFFF'))).toBeCloseTo(21, 5);
    expect(contrastRatio(hexToRgb('#FFFFFF'), hexToRgb('#000000'))).toBeCloseTo(21, 5);
  });

  it('US-04-AC-02 a colour on itself is 1:1', () => {
    expect(contrastRatio(hexToRgb('#7E7E93'), hexToRgb('#7E7E93'))).toBeCloseTo(1, 5);
  });

  it('US-04-AC-02 #777777 on white is about 4.48 (just under the 4.5 minimum), #767676 on white is about 4.54 (just over)', () => {
    expect(contrastRatio(hexToRgb('#777777'), hexToRgb('#FFFFFF'))).toBeCloseTo(4.48, 2);
    expect(contrastRatio(hexToRgb('#777777'), hexToRgb('#FFFFFF'))).toBeLessThan(4.5);
    expect(contrastRatio(hexToRgb('#767676'), hexToRgb('#FFFFFF'))).toBeGreaterThan(4.5);
  });

  it('US-04-AC-02 the relative luminance of white is 1 and of black is 0', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 6);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
  });

  it('US-04-AC-02 the page text of ADR-0010 (#F6F6FB on #0B0B14) reproduces the documented 18.18', () => {
    expect(contrastRatio(hexToRgb('#F6F6FB'), hexToRgb('#0B0B14'))).toBeCloseTo(18.18, 1);
  });

  it('US-04-AC-02 a translucent colour is composited before the ratio is read (white at 7% over #0B0B14 is about #1C1C24)', () => {
    expect(composite({ rgb: [255, 255, 255], alpha: 0.07 }, hexToRgb('#0B0B14'))).toEqual([28, 28, 36]);
  });
});

describe('US-04-AC-02 the colour reader understands the forms tokens.css may use (and refuses the rest)', () => {
  it('US-04-AC-02 reads #RRGGBB, color-mix(in srgb, #RRGGBB N%, transparent) and linear-gradient stops', () => {
    expect(parseColour('#FFFFFF')).toEqual({ rgb: [255, 255, 255], alpha: 1 });
    expect(parseColour('color-mix(in srgb, #FFFFFF 7%, transparent)')).toEqual({ rgb: [255, 255, 255], alpha: 0.07 });
    expect(parseGradientStops('linear-gradient(180deg, #6427C4 0%, #4F1B9E 45%, #16154D 100%)')?.map((s) => s.rgb)).toEqual([
      hexToRgb('#6427C4'),
      hexToRgb('#4F1B9E'),
      hexToRgb('#16154D'),
    ]);
  });

  it('US-04-AC-02 resolves var() chains, with a fallback, and fails on a name that is not declared (the list cannot drift)', () => {
    const file = new TokenFile(':root { --primitive-a: #112233; --color-x: var(--primitive-a); --color-y: var(--color-x); --color-z: var(--missing, #000000); --color-w: var(--missing); }');
    expect(file.resolve('--color-y')).toBe('#112233');
    expect(file.resolve('--color-z')).toBe('#000000');
    expect(() => file.resolve('--color-w')).toThrow(/--missing/);
    expect(() => coloursOf(file, '--color-nope')).toThrow(/--color-nope/);
  });

  it('US-04-AC-02 evaluates a country accent per [data-country-accent] block and ignores @media overrides when resolving', () => {
    const file = new TokenFile(
      ":root { --color-brand: #AA8FFF; --color-country-accent: var(--color-brand); } [data-country-accent='co'] { --color-country-accent: #FFCD00; } @media (prefers-reduced-motion: reduce) { :root { --color-brand: #000000; } }",
    );
    expect(file.accentKeys()).toEqual(['co']);
    expect(file.resolve('--color-country-accent')).toBe('#AA8FFF');
    expect(file.resolve('--color-country-accent', 'co')).toBe('#FFCD00');
  });
});

describe('US-04-AC-02 the list of pairs is complete and the thresholds are the WCAG ones', () => {
  it('US-04-AC-02 contrast-pairs.json and tokens.css exist, every row has id, fg, bg, min and ac "US-04-AC-02", and ids are unique', () => {
    const rows = pairs();
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const row of rows) {
      expect(row.id, 'id').toEqual(expect.any(String));
      expect(row.fg, `${row.id} fg`).toMatch(/^--[a-z0-9-]+$/);
      expect(Array.isArray(row.bg) && row.bg.length > 0, `${row.id} bg`).toBe(true);
      expect(row.min, `${row.id} min`).toEqual(expect.any(Number));
      expect(row.ac, `${row.id} ac`).toBe('US-04-AC-02');
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('US-04-AC-02 covers every row of the AC table: body, muted and error text (4.5), primary button and recommended card text over every gradient stop (4.5), the display heading gradient (3), focus, input and interactive-card border, and each country accent (3)', () => {
    const rows = pairs();
    const file = tokens();
    const byFg = (name: string): Pair[] => rows.filter((r) => r.fg === name);

    for (const name of ['--color-text', '--color-text-muted', '--color-error']) {
      expect(byFg(name).length, `a row for ${name}`).toBeGreaterThan(0);
      for (const row of byFg(name)) expect(row.min, `${row.id} cannot be below the 4.5 of normal text`).toBeGreaterThanOrEqual(4.5);
    }
    for (const name of ['--color-focus', '--color-border-control', '--color-country-accent']) {
      expect(byFg(name).length, `a row for ${name}`).toBeGreaterThan(0);
      for (const row of byFg(name)) expect(row.min, `${row.id} cannot be below the 3 of UI components`).toBeGreaterThanOrEqual(3);
    }

    // page background, the dotted texture and a card surface for body and muted text
    for (const name of ['--color-text', '--color-text-muted']) {
      const bgs = byFg(name).flatMap((r) => r.bg);
      expect(bgs, name).toContain('--color-bg');
      expect(bgs, name).toContain('texture-worst');
      expect(bgs, name).toContain('--color-surface');
    }
    for (const name of ['--color-focus', '--color-border-control', '--color-country-accent']) {
      const bgs = byFg(name).flatMap((r) => r.bg);
      expect(bgs, name).toContain('--color-bg');
      expect(bgs, name).toContain('--color-surface');
    }
    expect(byFg('--color-country-accent').flatMap((r) => r.bg), 'accent on the header surface').toContain('--color-surface-raised');

    // text on a gradient (primary button, recommended card): at least two rows over a multi-stop background, minimum 4.5
    const onGradient = rows.filter((r) => r.bg.some((b) => b !== 'texture-worst' && !b.startsWith('header-bg-over-') && coloursOf(file, b).length > 1));
    expect(onGradient.length, 'rows over a gradient background').toBeGreaterThanOrEqual(2);
    expect(onGradient.filter((r) => r.min >= 4.5).length, 'text rows over a gradient (primary button, recommended card)').toBeGreaterThanOrEqual(2);

    // display heading: the foreground itself is a gradient, against the page and the texture, minimum 3
    const gradientText = rows.filter((r) => coloursOf(file, r.fg).length > 1);
    expect(gradientText.length, 'a row whose foreground is a gradient (display headings)').toBeGreaterThanOrEqual(1);
    expect(gradientText.flatMap((r) => r.bg)).toContain('texture-worst');
    for (const row of gradientText) expect(row.min).toBeGreaterThanOrEqual(3);
  });

  it('US-04-R1-F07 lists the pairs that are really used: text on the brand colour (the "Seleccionado" badge, the current step marker) at 4.5, and the focus ring over the hover surface (the active option) at 3', () => {
    const rows = pairs();
    const onBrand = rows.filter((r) => r.fg === '--color-text-on-brand' && r.bg.includes('--color-brand'));
    expect(onBrand.length, 'a row --color-text-on-brand on --color-brand').toBeGreaterThan(0);
    for (const row of onBrand) expect(row.min).toBeGreaterThanOrEqual(4.5);
    const focusOnHover = rows.filter((r) => r.fg === '--color-focus' && r.bg.includes('--color-surface-hover'));
    expect(focusOnHover.length, 'a row --color-focus on --color-surface-hover').toBeGreaterThan(0);
    for (const row of focusOnHover) expect(row.min).toBeGreaterThanOrEqual(3);
  });

  it('US-04-R1-F02 the plan radio is drawn from tokens and covered: a ring row and a checked-indicator row (fg names contain "radio") over the plain card surface and over every stop of --gradient-plan-recommended, minimum 3', () => {
    const rows = pairs().filter((r) => /radio/.test(r.fg));
    expect(rows.length, 'rows for the plan radio tokens').toBeGreaterThanOrEqual(2);
    for (const row of rows) expect(row.min, `${row.id} is a UI component boundary`).toBeGreaterThanOrEqual(3);
    const surfaces = rows.flatMap((r) => r.bg);
    expect(surfaces).toContain('--color-surface');
    expect(surfaces).toContain('--gradient-plan-recommended');
    expect(rows.some((r) => !/dot|checked|indicator|mark|fill/.test(r.fg)), 'a ring (unchecked boundary) row').toBe(true);
    expect(rows.some((r) => /dot|checked|indicator|mark|fill/.test(r.fg)), 'a checked indicator row').toBe(true);
    const file = tokens();
    for (const row of rows) expect(() => coloursOf(file, row.fg), row.fg).not.toThrow();
  });

  it('US-04-AC-02 the token file defines a country accent for co and cl, and each is evaluated', () => {
    const file = tokens();
    expect(file.accentKeys().sort()).toEqual(['cl', 'co']);
    const evaluated = evaluate(file, pairs().filter((r) => r.fg === '--color-country-accent'));
    expect(new Set(evaluated.map((r) => r.accent))).toEqual(new Set(['brand', 'co', 'cl']));
  });
});

describe('US-04-AC-02 every pair of contrast-pairs.json meets its minimum at every gradient stop and over the texture', () => {
  it('US-04-AC-02 no row fails: body text, muted text, error text, buttons, recommended card, display heading, focus, borders and country accents', () => {
    const file = tokens();
    const results = evaluate(file, pairs());
    expect(results.length).toBeGreaterThan(30);
    const failing = results
      .filter((r) => r.ratio < r.min)
      .map((r) => `${r.id}: ${r.fg} on ${r.bg}${r.accent === 'brand' ? '' : ` (accent ${r.accent})`} is ${r.ratio.toFixed(2)}:1, needs ${r.min}:1`);
    expect(failing).toEqual([]);
  });

  it('US-04-AC-02 the texture dot colour is a translucent colour, so its worst case is a real composite over the page background', () => {
    const file = tokens();
    const dot = textureDot(file);
    expect(dot.alpha).toBeGreaterThan(0);
    expect(dot.alpha).toBeLessThan(0.2);
    const worst = composite(dot, textureBase(file));
    expect(worst).not.toEqual(textureBase(file));
  });

  it('US-04-AC-02 sensitivity self-test: a pair below its minimum is reported', () => {
    const file = new TokenFile(
      ':root { --color-bg: #000000; --color-text: #111111; --texture-dots: radial-gradient(circle, color-mix(in srgb, #FFFFFF 7%, transparent) 1px, transparent 1.5px); }',
    );
    const [bad] = evaluate(file, [{ id: 'bad', fg: '--color-text', bg: ['--color-bg', 'texture-worst'], min: 4.5, ac: 'US-04-AC-02' }]);
    expect(bad.ratio).toBeLessThan(4.5);
    const dark = new TokenFile(':root { --color-bg: #000000; --color-text: #FFFFFF; --texture-dots: radial-gradient(circle, color-mix(in srgb, #FFFFFF 7%, transparent) 1px, transparent 1.5px); }');
    const ok = evaluate(dark, [{ id: 'ok', fg: '--color-text', bg: ['--color-bg', 'texture-worst'], min: 4.5, ac: 'US-04-AC-02' }]);
    expect(ok.map((r) => r.ratio >= 4.5)).toEqual([true, true]);
  });
});

describe('US-04-AC-27 the page gradient is part of the contrast proof (ADR-0014 section 4)', () => {
  const TEXTURE = '--texture-dots: radial-gradient(circle, color-mix(in srgb, #FFFFFF 7%, transparent) 1px, transparent 1.5px);';

  it('US-04-AC-27 every "page background" pair (a row whose background list has --color-bg) also lists --gradient-page, so every stop of the gradient is checked', () => {
    const rows = pairs().filter((r) => r.bg.includes('--color-bg'));
    expect(rows.length, 'rows over the page background').toBeGreaterThan(0);
    const missing = rows.filter((r) => !r.bg.includes('--gradient-page')).map((r) => r.id);
    expect(missing, 'rows that list --color-bg but not --gradient-page').toEqual([]);
  });

  it('US-04-AC-27 the evaluation of the production file reports one result per stop of --gradient-page for the body text row, and each passes its minimum', () => {
    const file = tokens();
    const stops = coloursOf(file, '--gradient-page').length;
    expect(stops, 'a gradient with at least two stops').toBeGreaterThanOrEqual(2);
    const body = evaluate(file, pairs().filter((r) => r.id === 'body-text'));
    const onGradient = body.filter((r) => r.bg.startsWith('--gradient-page'));
    expect(onGradient).toHaveLength(stops);
    for (const r of onGradient) expect(r.ratio, `${r.bg}`).toBeGreaterThanOrEqual(r.min);
  });

  it('US-04-AC-27 the texture worst case is composited over the lightest stop of --gradient-page: a pair that passes over --color-bg but fails over a lighter gradient stop is reported', () => {
    const file = new TokenFile(
      `:root { --color-bg: #000000; --gradient-page: linear-gradient(180deg, #888888 0%, #000000 100%); --color-text: #BBBBBB; ${TEXTURE} }`,
    );
    const results = evaluate(file, [{ id: 'texture', fg: '--color-text', bg: ['--color-bg', 'texture-worst'], min: 4.5, ac: 'US-04-AC-02' }]);
    const overBg = results.find((r) => r.bg === '--color-bg');
    const overTexture = results.find((r) => r.bg === 'texture-worst');
    expect(overBg?.ratio).toBeGreaterThanOrEqual(4.5);
    expect(overTexture?.ratio, 'texture over the lightest stop #888888').toBeLessThan(4.5);
  });

  it('US-04-AC-27 a gradient listed as a background expands into one result per stop (a failing stop is reported)', () => {
    const file = new TokenFile(
      `:root { --color-bg: #000000; --gradient-page: linear-gradient(180deg, #888888 0%, #000000 100%); --color-text: #BBBBBB; ${TEXTURE} }`,
    );
    const results = evaluate(file, [{ id: 'g', fg: '--color-text', bg: ['--gradient-page'], min: 4.5, ac: 'US-04-AC-02' }]);
    expect(results.map((r) => r.bg)).toEqual(['--gradient-page[stop 1]', '--gradient-page[stop 2]']);
    expect(results[0].ratio).toBeLessThan(4.5);
    expect(results[1].ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('US-04-AC-30 / US-04-Q-28 the header text and focus ring over the three header backdrops', () => {
  const BACKDROPS = ['--component-header-bg-solid', 'header-bg-over-page-lightest', 'header-bg-over-ink-50'];

  /** The colours of the product name: each stop of --gradient-display-text, or --color-brand (BR-22), whichever the header stylesheet uses. */
  function productNameTokens(): string[] {
    const css = readFileSync(join(process.cwd(), 'src', 'app', 'shared', 'site-header.css'), 'utf8');
    const used = ['--gradient-display-text', '--color-brand'].filter((t) => css.includes(`var(${t})`));
    expect(used.length, 'the header stylesheet colours the product name with --gradient-display-text or --color-brand').toBeGreaterThan(0);
    return used;
  }

  function ratios(file: TokenFile, fgToken: string, backdrop: string): number[] {
    const [bg] = bgColours(file, backdrop);
    return coloursOf(file, fgToken).map((fg) => contrastRatio(composite(fg, bg.rgb), bg.rgb));
  }

  it('US-04-AC-30 computed from tokens.css: every colour of the product name and the chip text (--color-text) is at least 4.5:1 on each of the three backdrops', () => {
    const file = tokens();
    const failing: string[] = [];
    for (const fg of [...productNameTokens(), '--color-text']) {
      for (const backdrop of BACKDROPS) {
        ratios(file, fg, backdrop).forEach((ratio, i) => {
          if (ratio < 4.5) failing.push(`${fg}[${i + 1}] on ${backdrop} is ${ratio.toFixed(2)}:1`);
        });
      }
    }
    expect(failing).toEqual([]);
  });

  it('US-04-AC-30 computed from tokens.css: the focus ring (--color-focus) is at least 3:1 on each of the three backdrops', () => {
    const file = tokens();
    const failing = BACKDROPS.flatMap((b) => ratios(file, '--color-focus', b).filter((r) => r < 3).map((r) => `${b} ${r.toFixed(2)}:1`));
    expect(failing).toEqual([]);
  });

  it('US-04-AC-30 the header backdrops are real: the solid one is opaque, the translucent one is composited over a lighter base than the page background', () => {
    const file = tokens();
    expect(coloursOf(file, '--component-header-bg-solid')[0].alpha).toBe(1);
    const [lightest] = bgColours(file, 'header-bg-over-page-lightest');
    const [ink] = bgColours(file, 'header-bg-over-ink-50');
    expect(relativeLuminance(ink.rgb)).toBeGreaterThan(relativeLuminance(lightest.rgb));
  });

  it('US-04-AC-30 contrast-pairs.json has rows (names: --component-header-bg-solid, header-bg-over-page-lightest, header-bg-over-ink-50) for each product-name colour and the chip text at 4.5, and for --color-focus at 3', () => {
    const rows = pairs();
    for (const backdrop of BACKDROPS) {
      const onBackdrop = rows.filter((r) => r.bg.includes(backdrop));
      expect(onBackdrop.length, `rows over ${backdrop}`).toBeGreaterThan(0);
      for (const fg of [...productNameTokens(), '--color-text']) {
        const hit = onBackdrop.filter((r) => r.fg === fg);
        expect(hit.length, `a row ${fg} on ${backdrop}`).toBeGreaterThan(0);
        for (const row of hit) expect(row.min, `${row.id}`).toBeGreaterThanOrEqual(4.5);
      }
      const focus = onBackdrop.filter((r) => r.fg === '--color-focus');
      expect(focus.length, `a focus row on ${backdrop}`).toBeGreaterThan(0);
      for (const row of focus) expect(row.min, `${row.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('US-04-AC-30 every header row of contrast-pairs.json passes at every stop (the same evaluator as AC-02)', () => {
    const file = tokens();
    const rows = pairs().filter((r) => r.bg.some((b) => BACKDROPS.includes(b)));
    expect(rows.length, 'header rows').toBeGreaterThan(0);
    const failing = evaluate(file, rows)
      .filter((r) => r.ratio < r.min)
      .map((r) => `${r.id}: ${r.fg} on ${r.bg} is ${r.ratio.toFixed(2)}:1, needs ${r.min}:1`);
    expect(failing).toEqual([]);
  });

  it('US-04-AC-30 sensitivity: a light stop on a translucent header over --primitive-ink-50 is reported below 4.5', () => {
    const file = new TokenFile(
      ':root { --color-bg: #000000; --primitive-ink-50: #F6F6FB; --gradient-page: linear-gradient(180deg, #231541 0%, #000000 100%); --component-header-bg: color-mix(in srgb, #231541 40%, transparent); --light: #C4B5FD; }',
    );
    const [row] = evaluate(file, [{ id: 'bad', fg: '--light', bg: ['header-bg-over-ink-50'], min: 4.5, ac: 'US-04-AC-30' }]);
    expect(row.ratio).toBeLessThan(4.5);
  });
});
