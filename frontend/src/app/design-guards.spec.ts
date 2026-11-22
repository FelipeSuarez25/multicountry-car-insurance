/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TokenFile, coloursOf, parseCss } from '../testing/css';
import { relativeLuminance } from '../testing/contrast';
import {
  STYLE_KINDS,
  ALLOWED_FAMILIES,
  accentSelectorViolations,
  breakpointValues,
  cdkAnimationUse,
  countryCodeViolations,
  familyTokenViolations,
  flagViolations,
  fontFaces,
  motionViolations,
  reducedMotionTokenViolations,
  styleViolations,
  tokenTierViolations,
  type SourceFile,
  type StyleKind,
} from '../testing/design-guards';

/**
 * The static guards of US-04, as tests that run in the gate (ADR-0010 section 2, ADR-0011
 * "Confirmation", ADR-0013 section 4, ADR-0012 "Confirmation"). They read the production sources of
 * `frontend/src` (test files and `src/testing/` excluded), `angular.json`, `index.html` and
 * `package.json`. Every rule has a sensitivity self-test: the same check, run over a string with a
 * deliberate violation, must report it, so a guard that finds nothing cannot pass by accident.
 *
 * US-04-AC-01 / BR-01   one token file, three tiers, no loose values, no primitive in components,
 *                       breakpoints and media features
 * US-04-AC-03 / BR-03   country codes only in `shared/country-visuals.ts`; accent selectors only in
 *                       `tokens.css`; flag components are hidden and text-free
 * US-04-AC-04 / BR-04   icons imported one by one from `@lucide/angular`
 * US-04-AC-17 / BR-10   reduced motion by construction (styles, tokens, CDK `disableAnimations`)
 * US-04-AC-19 / BR-12   at most two `@font-face` families, WOFF2, swap, same origin
 * US-04-AC-21 / BR-14   exact versions, the accepted dependency list, no animation library
 */

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const TOKENS = join(SRC, 'styles', 'tokens.css');
const COUNTRY_VISUALS = join('shared', 'country-visuals.ts');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const read = (path: string): string => readFileSync(path, 'utf8');
const rel = (path: string): string => path.replace(`${ROOT}/`, '');
const isTestFile = (path: string): boolean => /\.spec\.ts$/.test(path) || path.includes(join('src', 'testing'));

const all = walk(SRC);
const cssFiles = all.filter((p) => p.endsWith('.css'));
const nonTokenCss = cssFiles.filter((p) => p !== TOKENS);
const sources: SourceFile[] = all.filter((p) => /\.(ts|html)$/.test(p) && !isTestFile(p)).map((p) => ({ path: p, text: read(p) }));
const tokensCss = (): string => read(TOKENS);

// ---------------------------------------------------------------------------------------------
// Fixtures for the sensitivity self-tests: one deliberate violation of each kind
// ---------------------------------------------------------------------------------------------

const BREAKPOINTS = ['37.5em', '64em'];

const VIOLATION_FIXTURES: Record<StyleKind, string> = {
  'custom-property': '.a { --x: 1; }',
  'font-face': '@font-face { src: url(/fonts/a.woff2); }',
  'hex-colour': '.a { color: #fff; }',
  'colour-function': '.a { color: rgb(1 2 3); }',
  'named-colour': '.a { border: var(--border-width-hairline) solid red; }',
  'font-family': '.a { font-family: Arial, sans-serif; }',
  length: '.a { margin: 8px; }',
  duration: '.a { transition-duration: 200ms; }',
  easing: '.a { transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }',
  gradient: '.a { background: linear-gradient(180deg, var(--color-bg), var(--color-surface)); }',
  shadow: '.a { box-shadow: 0 1px 2px var(--color-bg); }',
  'z-index': '.a { z-index: 10; }',
  'font-metric': '.a { font-weight: 600; }',
  'primitive-reference': '.a { color: var(--primitive-ink-50); }',
  breakpoint: '@media (min-width: 40em) { .a { margin: 0; } }',
  'media-feature': '@media (max-width: 37.5em) { .a { margin: 0; } }',
};

const CLEAN_FIXTURE = `
.card {
  margin: 0 auto;
  padding: var(--space-4) 0;
  width: 100%;
  min-width: 0;
  flex: 1 1 0;
  line-height: 1;
  z-index: 0;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--space-3);
  color: var(--color-text);
  background: var(--gradient-plan-recommended);
  border: var(--border-width-hairline) solid var(--color-border-control);
  border-radius: var(--radius-card);
  font-family: var(--font-text);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-panel), 0 0 0 var(--focus-ring-width) var(--color-focus);
  outline: none;
  outline-color: transparent;
  fill: currentColor;
  content: "red 12px";
  height: calc(100% - var(--space-4));
}
@media (min-width: 37.5em) { .card { gap: var(--space-5); } }
@media (min-width: 64em) and (hover: hover) { .card:hover { transform: translateY(0); } }
@media (forced-colors: active) { .card { border-color: CanvasText; color: ButtonText; background: Canvas; } }
@media (prefers-color-scheme: dark) { .card { margin: 0; } }
@container (min-width: 37.5em) { .card { gap: var(--space-5); } }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: background-color var(--duration-fast) var(--ease-standard); animation: page-enter var(--duration-base) var(--ease-out); }
}
@keyframes page-enter { from { opacity: 0; } to { opacity: 1; } }
`;

// ---------------------------------------------------------------------------------------------

describe('US-04-AC-01 / US-04-BR-01 tokens in one file, no loose values', () => {
  it('US-04-AC-01 the guard looks at something: style files and production sources are found', () => {
    expect(cssFiles.length).toBeGreaterThanOrEqual(7);
    expect(nonTokenCss.length).toBeGreaterThanOrEqual(6);
    expect(sources.length).toBeGreaterThan(20);
  });

  it('US-04-AC-01 the token file is frontend/src/styles/tokens.css and angular.json lists it first in "styles"', () => {
    expect(existsSync(TOKENS), 'frontend/src/styles/tokens.css').toBe(true);
    const angular = JSON.parse(read(join(ROOT, 'angular.json'))) as { projects: Record<string, { architect: { build: { options: { styles: string[] } } } }> };
    const styles = Object.values(angular.projects)[0].architect.build.options.styles;
    expect(styles[0]).toBe('src/styles/tokens.css');
    expect(styles).toContain('src/styles.css');
  });

  it('US-04-AC-01 only tokens.css declares a custom property or an @font-face', () => {
    const offenders = nonTokenCss.flatMap((file) =>
      styleViolations(read(file), breakpointValues(tokensCss()))
        .filter((v) => v.kind === 'custom-property' || v.kind === 'font-face')
        .map((v) => `${rel(file)}: ${v.kind} ${v.detail}`),
    );
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-01 tokens.css has three tiers with distinct prefixes (primitive, semantic, component) and every category of the story', () => {
    expect(tokenTierViolations(tokensCss())).toEqual([]);
  });

  it('US-04-AC-01 no style file outside tokens.css holds a loose colour, length, font, shadow, gradient, duration, easing, font metric or numeric z-index', () => {
    const loose: StyleKind[] = ['hex-colour', 'colour-function', 'named-colour', 'font-family', 'length', 'duration', 'easing', 'gradient', 'shadow', 'z-index', 'font-metric'];
    const offenders = nonTokenCss.flatMap((file) =>
      styleViolations(read(file), breakpointValues(tokensCss()))
        .filter((v) => loose.includes(v.kind))
        .map((v) => `${rel(file)}: ${v.kind} ${v.detail}`),
    );
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-01 no component style file (nor styles.css) references a primitive token', () => {
    const offenders = nonTokenCss.flatMap((file) =>
      styleViolations(read(file), breakpointValues(tokensCss()))
        .filter((v) => v.kind === 'primitive-reference')
        .map((v) => `${rel(file)}: ${v.detail}`),
    );
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-01 every @media / @container condition is a min-width equal to a --breakpoint-* value, or one of prefers-reduced-motion, forced-colors, prefers-color-scheme, (hover: hover)', () => {
    const offenders = nonTokenCss.flatMap((file) =>
      styleViolations(read(file), breakpointValues(tokensCss()))
        .filter((v) => v.kind === 'breakpoint' || v.kind === 'media-feature')
        .map((v) => `${rel(file)}: ${v.kind} ${v.detail}`),
    );
    expect(offenders).toEqual([]);
  });

  describe('US-04-AC-01 sensitivity self-test: the guard reports a deliberate violation of each kind', () => {
    it.each(STYLE_KINDS)('US-04-AC-01 reports "%s"', (kind) => {
      const kinds = styleViolations(VIOLATION_FIXTURES[kind], BREAKPOINTS).map((v) => v.kind);
      expect(kinds).toContain(kind);
    });

    it('US-04-AC-01 reports every kind when one fixture holds one violation of each', () => {
      const kinds = new Set(styleViolations(Object.values(VIOLATION_FIXTURES).join('\n'), BREAKPOINTS).map((v) => v.kind));
      expect([...kinds].sort()).toEqual([...STYLE_KINDS].sort());
    });

    it('US-04-AC-01 does not report the allowed literals (0, auto, 100%, 1fr, unitless 1, currentColor, transparent, the forced-colors system colours, token breakpoints, (hover: hover))', () => {
      expect(styleViolations(CLEAN_FIXTURE, BREAKPOINTS)).toEqual([]);
    });

    it('US-04-AC-01 the tier check reports a custom property with no tier prefix and a file with a missing tier', () => {
      const kinds = tokenTierViolations(':root { --foo: 1; --primitive-a: #000000; }').map((v) => v.kind);
      expect(kinds).toContain('tier-prefix');
      expect(kinds).toContain('tier-missing');
      expect(kinds).toContain('category-missing');
    });
  });
});

describe('US-04-AC-03 / US-04-BR-03 country codes stay in the country-visuals map (ADR-0011)', () => {
  const productionNotMap = sources.filter((s) => !s.path.endsWith(COUNTRY_VISUALS));

  it('US-04-AC-03 shared/country-visuals.ts exists and is the file that holds the quoted codes', () => {
    const map = sources.find((s) => s.path.endsWith(COUNTRY_VISUALS));
    expect(map, 'src/app/shared/country-visuals.ts').toBeDefined();
    expect(map?.text).toMatch(/(['"])CO\1/);
    expect(map?.text).toMatch(/(['"])CL\1/);
  });

  it('US-04-AC-03 a quoted \'CO\', \'CL\', "CO" or "CL" literal appears in no other production .ts or .html file', () => {
    expect(countryCodeViolations(sources, COUNTRY_VISUALS).map(rel)).toEqual([]);
    expect(productionNotMap.length).toBeGreaterThan(20);
  });

  it('US-04-AC-03 a data-country-accent selector appears only in src/styles/tokens.css, which defines the accents of co and cl', () => {
    const css: SourceFile[] = cssFiles.map((p) => ({ path: p, text: read(p) }));
    expect(accentSelectorViolations(css, join('styles', 'tokens.css')).map(rel)).toEqual([]);
    expect(tokensCss()).toMatch(/\[data-country-accent\s*=\s*['"]?co['"]?\]/);
    expect(tokensCss()).toMatch(/\[data-country-accent\s*=\s*['"]?cl['"]?\]/);
  });

  it('US-04-AC-03 every flag component under shared/flags/ has no text node, and its root svg has aria-hidden="true" and focusable="false"', () => {
    const files = sources.filter((s) => s.path.includes(join('shared', 'flags')) && s.path.endsWith('.ts'));
    expect(files.length, 'a flag component for Colombia and one for Chile').toBeGreaterThanOrEqual(2);
    for (const file of files) {
      const inline = /template:\s*(['"`])([\s\S]*?)\1\s*[,}]/.exec(file.text)?.[2];
      const url = /templateUrl:\s*['"]([^'"]+)['"]/.exec(file.text)?.[1];
      const template = inline ?? (url ? read(join(file.path, '..', url)) : '');
      expect(template, `${rel(file.path)} has a template`).not.toBe('');
      expect(flagViolations(template), rel(file.path)).toEqual([]);
    }
  });

  describe('US-04-AC-03 sensitivity self-test', () => {
    it('reports a quoted code outside the map and not inside it; lower-case accent keys are not codes', () => {
      const files: SourceFile[] = [
        { path: join('x', 'shared', 'country-visuals.ts'), text: "const m = { 'CO': 1, \"CL\": 2 };" },
        { path: join('x', 'features', 'a.ts'), text: "if (c === 'CO') {}" },
        { path: join('x', 'features', 'b.html'), text: '<p [x]="c === \'CL\'"></p>' },
        { path: join('x', 'features', 'c.ts'), text: "const accent = 'co'; const name = 'Colombia';" },
      ];
      expect(countryCodeViolations(files, COUNTRY_VISUALS)).toEqual([join('x', 'features', 'a.ts'), join('x', 'features', 'b.html')]);
    });

    it('reports a data-country-accent selector outside tokens.css', () => {
      const files: SourceFile[] = [
        { path: join('x', 'styles', 'tokens.css'), text: "[data-country-accent='co'] { }" },
        { path: join('x', 'header.css'), text: "[data-country-accent='co'] .chip { }" },
      ];
      expect(accentSelectorViolations(files, join('styles', 'tokens.css'))).toEqual([join('x', 'header.css')]);
    });

    it('reports a flag with text, without aria-hidden, without focusable="false", or with a title', () => {
      expect(flagViolations('<svg aria-hidden="true" focusable="false" viewBox="0 0 3 2"><rect width="3" height="2"/></svg>')).toEqual([]);
      expect(flagViolations('<svg focusable="false"><rect/></svg>')).toContain('the root svg has no aria-hidden="true"');
      expect(flagViolations('<svg aria-hidden="true"><rect/></svg>')).toContain('the root svg has no focusable="false"');
      expect(flagViolations('<svg aria-hidden="true" focusable="false"><text>Colombia</text></svg>').join()).toContain('text node');
      expect(flagViolations('<svg aria-hidden="true" focusable="false"><title>x</title></svg>')).toContain('has a <title>');
    });
  });
});

describe('US-04-AC-04 / US-04-BR-04 icons are imported one by one from @lucide/angular', () => {
  it('US-04-AC-04 no namespace import, no icon module, no deprecated or alternative icon package in production code', () => {
    const offenders = sources
      .filter((s) => /import\s+\*\s+as\s+\w+\s+from\s+['"]@lucide\/angular['"]|LucideAngularModule|LucideIcons\b|lucide-angular|lucide-static|@ng-icons|font-awesome|material-icons/.test(s.text))
      .map((s) => rel(s.path));
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-04 a field-icons map exists and imports from @lucide/angular', () => {
    const map = sources.find((s) => s.path.endsWith(join('shared', 'field-icons.ts')));
    expect(map, 'src/app/shared/field-icons.ts').toBeDefined();
    expect(map?.text).toMatch(/from\s+['"]@lucide\/angular['"]/);
  });
});

describe('US-04-R1-F02 the plan radio is drawn from tokens, not by the browser', () => {
  it('US-04-R1-F02 plan-list-page.css gives the radio appearance none and a border and a checked colour from --*radio* tokens', () => {
    const file = cssFiles.find((p) => p.endsWith(join('plan-list', 'plan-list-page.css')));
    expect(file, 'plan-list-page.css').toBeDefined();
    const { decls } = parseCss(read(file as string));
    const radio = decls.filter((d) => d.stack.some((s) => /radio/.test(s)));
    expect(radio.some((d) => d.prop === 'appearance' && d.value.trim() === 'none'), 'appearance: none on the radio').toBe(true);
    expect(radio.some((d) => /^border/.test(d.prop) && /var\(--[a-z-]*radio/.test(d.value)), 'a border drawn from a radio token').toBe(true);
    expect(radio.filter((d) => /var\(--[a-z-]*radio/.test(d.value)).length, 'the checked state also uses radio tokens').toBeGreaterThanOrEqual(2);
  });
});

describe('US-04-AC-17 / US-04-BR-10 reduced motion by construction (ADR-0013 section 4)', () => {
  it('US-04-AC-17 outside tokens.css every animation and transition declaration is inside @media (prefers-reduced-motion: no-preference), and uses only duration, delay and ease tokens', () => {
    const offenders = nonTokenCss.flatMap((file) => motionViolations(read(file)).map((v) => `${rel(file)}: ${v.kind} ${v.detail}`));
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-17 tokens.css sets every --duration-* and --delay-* to 0ms under prefers-reduced-motion: reduce', () => {
    expect(reducedMotionTokenViolations(tokensCss())).toEqual([]);
  });

  it('US-04-AC-17 every CDK overlay and dialog is created with disableAnimations: true (the select panel and the calendar both exist)', () => {
    const uses = sources.map((s) => ({ file: rel(s.path), ...cdkAnimationUse(s.text) })).filter((u) => u.calls > 0);
    expect(uses.reduce((sum, u) => sum + u.calls, 0), 'overlay and dialog call sites found').toBeGreaterThanOrEqual(2);
    expect(uses.filter((u) => u.disabled < u.calls)).toEqual([]);
  });

  describe('US-04-AC-17 sensitivity self-test', () => {
    it('reports a transition outside the no-preference block, and accepts one inside it', () => {
      expect(motionViolations('.a { transition: color var(--duration-fast) var(--ease-standard); }').map((v) => v.kind)).toEqual(['motion-outside-no-preference']);
      expect(motionViolations('@media (prefers-reduced-motion: reduce) { .a { animation: x var(--duration-base); } }').map((v) => v.kind)).toEqual(['motion-outside-no-preference']);
      expect(motionViolations('@media (prefers-reduced-motion: no-preference) { .a { transition: color var(--duration-fast); animation-delay: var(--delay-stagger-2); } }')).toEqual([]);
    });

    it('reports a motion declaration that is not driven by a duration, delay or ease token', () => {
      const css = '@media (prefers-reduced-motion: no-preference) { .a { transition: color var(--space-2); } }';
      expect(motionViolations(css).map((v) => v.kind)).toEqual(['motion-token']);
    });

    it('reports a token file whose reduce block misses a duration, or sets it to something other than 0ms', () => {
      const ok = ':root { --duration-fast: 120ms; --delay-stagger-1: 0ms; } @media (prefers-reduced-motion: reduce) { :root { --duration-fast: 0ms; --delay-stagger-1: 0ms; } }';
      expect(reducedMotionTokenViolations(ok)).toEqual([]);
      const missing = ':root { --duration-fast: 120ms; --duration-base: 200ms; } @media (prefers-reduced-motion: reduce) { :root { --duration-fast: 0ms; } }';
      expect(reducedMotionTokenViolations(missing).map((v) => v.detail)).toEqual(['--duration-base is not set under reduce']);
      const wrong = ':root { --duration-fast: 120ms; } @media (prefers-reduced-motion: reduce) { :root { --duration-fast: 1ms; } }';
      expect(reducedMotionTokenViolations(wrong)).toHaveLength(1);
    });

    it('reports an overlay or dialog call without disableAnimations: true', () => {
      expect(cdkAnimationUse("this.dialog.open(Calendar, { ariaModal: true });")).toEqual({ calls: 1, disabled: 0 });
      expect(cdkAnimationUse('this.dialog.open(Calendar, { disableAnimations: true });')).toEqual({ calls: 1, disabled: 1 });
      expect(cdkAnimationUse('<ng-template cdkConnectedOverlay [cdkConnectedOverlayOpen]="open()">')).toEqual({ calls: 1, disabled: 0 });
      expect(cdkAnimationUse('const ref = createOverlayRef(inj, { disableAnimations: true });')).toEqual({ calls: 1, disabled: 1 });
    });

    it('US-04-R1-F05 ignores comments: a "disableAnimations: true" only in a comment next to a call with "disableAnimations: false" is reported', () => {
      const source = [
        '/** Every overlay is created with `disableAnimations: true` (ADR-0013). */',
        'const ref = createOverlayRef(inj, {',
        '  // disableAnimations: true',
        '  disableAnimations: false,',
        '});',
      ].join('\n');
      const use = cdkAnimationUse(source);
      expect(use.calls).toBe(1);
      expect(use.disabled).toBe(0);
      expect(cdkAnimationUse('const url = "https://x.example/a//b"; this.dialog.open(C, { disableAnimations: true }); // done')).toEqual({ calls: 1, disabled: 1 });
    });
  });
});

describe('US-04-AC-19 / US-04-BR-12 fonts and assets are local', () => {
  it('US-04-AC-19 tokens.css declares at most two @font-face families, Archivo and Atkinson Hyperlegible Next, one family per rule', () => {
    const faces = fontFaces(tokensCss());
    expect(new Set(faces.map((f) => f.family)).size).toBeLessThanOrEqual(2);
    expect(faces.map((f) => f.family).sort()).toEqual(['Archivo', 'Atkinson Hyperlegible Next']);
  });

  it('US-04-AC-19 each @font-face has one WOFF2 src under /fonts/ on the app origin, font-display: swap and the weight range of the scale (Archivo 700 800, Atkinson 400 700)', () => {
    const faces = fontFaces(tokensCss());
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face.src.match(/url\(/g) ?? [], `${face.family} has exactly one url()`).toHaveLength(1);
      expect(face.src, face.family).toMatch(/url\(\s*['"]?\/fonts\/[a-z0-9.-]+\.woff2['"]?\s*\)\s*format\(\s*['"]woff2['"]\s*\)/);
      expect(face.display, face.family).toBe('swap');
    }
    expect(faces.find((f) => f.family === 'Archivo')?.weight.replace(/\s+/g, ' ')).toBe('700 800');
    expect(faces.find((f) => f.family === 'Atkinson Hyperlegible Next')?.weight.replace(/\s+/g, ' ')).toBe('400 700');
  });

  it('US-04-AC-19 the --font-* tokens name only the two families and the local system fallback stack', () => {
    expect(familyTokenViolations(tokensCss())).toEqual([]);
    expect(ALLOWED_FAMILIES).toContain('archivo');
  });

  it('US-04-AC-19 index.html preloads the text face (Atkinson) and not the display face, and loads no third-party stylesheet or font', () => {
    const html = read(join(SRC, 'index.html'));
    expect(html).toMatch(/<link[^>]+rel="preload"[^>]+href="\/fonts\/atkinson-hyperlegible-next[a-z0-9.-]*\.woff2"[^>]+as="font"[^>]+type="font\/woff2"[^>]+crossorigin/);
    expect(html).not.toMatch(/href="\/fonts\/archivo/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('US-04-AC-19 angular.json copies the font files of both packages to /fonts', () => {
    const angular = read(join(ROOT, 'angular.json'));
    expect(angular).toContain('@fontsource-variable/archivo');
    expect(angular).toContain('@fontsource-variable/atkinson-hyperlegible-next');
    expect(angular).toMatch(/"output":\s*"\/?fonts\/?"/);
  });

  it('US-04-AC-19 no style or template requests a third-party origin (no @import, no http(s) URL other than the SVG namespace)', () => {
    const files = [...cssFiles, ...sources.filter((s) => s.path.endsWith('.html')).map((s) => s.path)];
    const offenders = files.filter((f) => /@import|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('US-04-AC-19 sensitivity self-test: the font reader reports each face with its family, src, display and weight', () => {
    const css =
      "@font-face { font-family: 'A'; src: url('/fonts/a.woff2') format('woff2'); font-display: swap; font-weight: 700 800; }" +
      "@font-face { font-family: B; src: url(https://x.example/b.woff) format('woff'); font-display: block; font-weight: 400; }";
    const faces = fontFaces(css);
    expect(faces.map((f) => [f.family, f.display, f.weight])).toEqual([
      ['A', 'swap', '700 800'],
      ['B', 'block', '400'],
    ]);
    expect(faces[1].src).toContain('https://x.example/b.woff');
    expect(familyTokenViolations(":root { --font-text: 'Comic Sans MS', system-ui, sans-serif; }").map((v) => v.kind)).toEqual(['family']);
  });
});

describe('US-04-AC-21 / US-04-BR-14 new dependencies are pinned and licensed (ADR-0010, ADR-0012, ADR-0013)', () => {
  const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };

  const BEFORE_US04 = [
    '@angular/build',
    '@angular/cli',
    '@angular/common',
    '@angular/compiler',
    '@angular/compiler-cli',
    '@angular/core',
    '@angular/forms',
    '@angular/platform-browser',
    '@angular/router',
    '@eslint/js',
    '@playwright/test',
    '@types/node',
    'angular-eslint',
    'eslint',
    'jsdom',
    'prettier',
    'rxjs',
    'tslib',
    'typescript',
    'typescript-eslint',
    'vitest',
  ];
  const ADDED = ['@angular/aria', '@angular/cdk', '@fontsource-variable/archivo', '@fontsource-variable/atkinson-hyperlegible-next', '@lucide/angular'];
  const isExact = (version: string): boolean => /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version);

  it('US-04-AC-21 every version in frontend/package.json is exact (no ^, ~ or range)', () => {
    expect(Object.entries(all).filter(([, v]) => !isExact(v))).toEqual([]);
  });

  it('US-04-AC-21 the dependency names are exactly the pre-US-04 list plus the five accepted additions', () => {
    expect(Object.keys(all).sort()).toEqual([...BEFORE_US04, ...ADDED].sort());
  });

  it('US-04-AC-21 the accepted additions have the versions of the ADRs: @angular/cdk and @angular/aria 22.3.0 (the framework version), @lucide/angular 1.77.0, both font packages 5.3.0', () => {
    expect(all['@angular/cdk']).toBe('22.3.0');
    expect(all['@angular/aria']).toBe('22.3.0');
    expect(all['@lucide/angular']).toBe('1.77.0');
    expect(all['@fontsource-variable/archivo']).toBe('5.3.0');
    expect(all['@fontsource-variable/atkinson-hyperlegible-next']).toBe('5.3.0');
    expect(all['@angular/cdk']).toBe(all['@angular/core']);
  });

  it('US-04-AC-21 no animation library and no icon font or deprecated icon package (ADR-0013, ADR-0010)', () => {
    for (const forbidden of ['motion', 'gsap', '@angular/animations', 'framer-motion', 'lucide-angular', '@ng-icons/core', '@ng-icons/lucide', '@angular/material']) {
      expect(Object.keys(all), forbidden).not.toContain(forbidden);
    }
  });

  it('US-04-AC-21 sensitivity self-test: the exactness check rejects ranges', () => {
    for (const range of ['^1.2.3', '~1.2.3', '>=1.2.3', '1.x', 'latest', '1.2.3 - 1.3.0', '*']) expect(isExact(range), range).toBe(false);
    for (const exact of ['1.2.3', '22.3.0', '5.3.0-rc.1']) expect(isExact(exact), exact).toBe(true);
  });
});

describe('US-04 ADR-0012 confirmation: where the new packages and the pure modules may import from', () => {
  it('US-04-AC-05 (ADR-0012 confirmation) @angular/aria is imported only by shared/custom-select.ts and shared/calendar.ts', () => {
    const importers = sources.filter((s) => /from\s+['"]@angular\/aria/.test(s.text)).map((s) => s.path.split(join('src', 'app') + '/')[1]);
    expect(importers.sort()).toEqual([join('shared', 'calendar.ts'), join('shared', 'custom-select.ts')]);
  });

  it('US-04-AC-08 (ADR-0012 confirmation) field-validators.ts, date-text.ts and calendar-dates.ts import nothing from @angular/*', () => {
    for (const name of ['field-validators.ts', 'date-text.ts', 'calendar-dates.ts', 'select-search.ts']) {
      const file = sources.find((s) => s.path.endsWith(join('shared', name)));
      expect(file, `src/app/shared/${name}`).toBeDefined();
      expect(file?.text, name).not.toMatch(/from\s+['"]@angular\//);
    }
  });

  it('US-04-AC-11 (ADR-0012 section 7) step 1 is lazy-loaded with loadComponent on /:country/datos, and the route file does not import QuoteFormPage statically', () => {
    const routes = read(join(SRC, 'app', 'app.routes.ts'));
    expect(routes).toMatch(/path:\s*'datos'[^}]*loadComponent\s*:/);
    expect(routes).not.toMatch(/import\s*\{[^}]*QuoteFormPage[^}]*\}\s*from/);
  });
});

describe('US-04-AC-27 / US-04-BR-20 the page gradient token (ADR-0014 section 4)', () => {
  const file = (): TokenFile => new TokenFile(tokensCss());

  it('US-04-AC-27 --gradient-page is declared in tokens.css as a semantic token (not a primitive) and is a gradient', () => {
    const names = file().names();
    expect(names, '--gradient-page').toContain('--gradient-page');
    expect('--gradient-page'.startsWith('--primitive-')).toBe(false);
    expect(file().rawValue('--gradient-page') ?? '').toMatch(/^\s*linear-gradient\(/);
  });

  it('US-04-AC-27 every colour stop of --gradient-page is a token (var(--...)), never a literal colour', () => {
    const raw = file().rawValue('--gradient-page') ?? '';
    expect(raw).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    expect((raw.match(/var\(--[a-z0-9-]+\)/g) ?? []).length, 'the number of token stops').toBeGreaterThanOrEqual(2);
    // each referenced token resolves to a colour
    expect(coloursOf(file(), '--gradient-page').length).toBeGreaterThanOrEqual(2);
  });

  it('US-04-AC-27 the lightest stop is lighter than --primitive-ink-950, and no stop is darker than it', () => {
    const tokens = file();
    const floor = relativeLuminance(coloursOf(tokens, '--primitive-ink-950')[0].rgb);
    const stops = coloursOf(tokens, '--gradient-page').map((c) => relativeLuminance(c.rgb));
    expect(Math.max(...stops), 'lightest stop').toBeGreaterThan(floor);
    expect(Math.min(...stops), 'darkest stop').toBeGreaterThanOrEqual(floor);
  });

  it('US-04-AC-27 --color-bg is lighter than --primitive-ink-950 (the base the gradient fades into)', () => {
    const tokens = file();
    expect(relativeLuminance(coloursOf(tokens, '--color-bg')[0].rgb)).toBeGreaterThan(relativeLuminance(coloursOf(tokens, '--primitive-ink-950')[0].rgb));
  });

  it('US-04-AC-27 the body paints the gradient token, over the base colour (styles.css), with no literal gradient', () => {
    const styles = read(join(SRC, 'styles.css'));
    const { decls } = parseCss(styles);
    const body = decls.filter((d) => d.stack.length > 0 && d.stack[d.stack.length - 1].trim() === 'body');
    const paint = body.filter((d) => d.prop === 'background' || d.prop === 'background-image');
    expect(paint.some((d) => /var\(--gradient-page\)/.test(d.value)), 'body background uses var(--gradient-page)').toBe(true);
    expect(body.some((d) => /^background(-color)?$/.test(d.prop) && /var\(--color-bg\)/.test(d.value)), 'body background colour is var(--color-bg)').toBe(true);
    expect(paint.some((d) => /var\(--texture-dots\)/.test(d.value)), 'the dot texture is still painted (on top of the gradient)').toBe(true);
  });

  it('US-04-AC-27 sensitivity self-test: a darker-than-floor stop and a literal stop are both detected by the same checks', () => {
    const dark = new TokenFile(':root { --primitive-ink-950: #0B0B14; --primitive-x: #050508; --gradient-page: linear-gradient(180deg, var(--primitive-x) 0%, var(--primitive-ink-950) 100%); }');
    const floor = relativeLuminance(coloursOf(dark, '--primitive-ink-950')[0].rgb);
    expect(Math.min(...coloursOf(dark, '--gradient-page').map((c) => relativeLuminance(c.rgb)))).toBeLessThan(floor);
    const literal = new TokenFile(':root { --gradient-page: linear-gradient(180deg, #231541 0%, #11101C 100%); }');
    expect(literal.rawValue('--gradient-page')).toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
